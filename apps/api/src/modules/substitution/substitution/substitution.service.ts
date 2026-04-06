import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../config/database/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { TimetableEventsGateway } from '../../timetable/timetable-events.gateway';
import type { SubstitutionDto } from '@schoolflow/shared';

/**
 * SubstitutionService — SUBST-03 / SUBST-05 / D-04 / D-14.
 *
 * Owns the Substitution row lifecycle:
 *
 *   PENDING ──assignSubstitute──▶ OFFERED ──respondToOffer(accept=true)──▶ CONFIRMED
 *                                         └─respondToOffer(accept=false)─▶ DECLINED
 *   PENDING ──setEntfall────────▶ CONFIRMED  (type=ENTFALL, no ClassBookEntry)
 *   PENDING ──setStillarbeit────▶ CONFIRMED  (type=STILLARBEIT, thema='Stillarbeit')
 *
 * Pitfall 2 (06-RESEARCH.md): assignSubstitute re-runs the minimal hard filter
 * inside a Serializable transaction. Two admins racing to assign the same
 * candidate will get one success and one 409 Conflict.
 *
 * Plan 06-04: wires NotificationService + TimetableEventsGateway so every
 * successful lifecycle transition produces the correct real-time events AND
 * persisted in-app notifications for the relevant recipient cohort (D-11).
 */

export interface AssignSubstituteInput {
  substitutionId: string;
  candidateTeacherId: string;
  assignedBy: string;
}

export interface RespondToOfferInput {
  substitutionId: string;
  userId: string;
  accept: boolean;
  declineReason?: string;
}

export interface SetEntfallInput {
  substitutionId: string;
  actorUserId: string;
}

export interface SetStillarbeitInput {
  substitutionId: string;
  supervisorTeacherId?: string;
  actorUserId: string;
}

@Injectable()
export class SubstitutionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService,
    private readonly timetableGateway: TimetableEventsGateway,
  ) {}

  // ---------------------------------------------------------------------------
  // assignSubstitute — PENDING/DECLINED → OFFERED (Pitfall 2 guard)
  // ---------------------------------------------------------------------------
  async assignSubstitute(input: AssignSubstituteInput): Promise<SubstitutionDto> {
    const { dto, schoolId, updated } = await this.prisma.$transaction(
      async (tx: any) => {
        const sub = await tx.substitution.findUniqueOrThrow({
          where: { id: input.substitutionId },
        });

        if (sub.status !== 'PENDING' && sub.status !== 'DECLINED') {
          throw new ConflictException(
            'Diese Vertretung kann im aktuellen Zustand nicht neu vergeben werden.',
          );
        }

        // --- Pitfall 2 re-check: is the candidate still free at this slot? ---
        // Look up the school's active TimetableRun via the absence FK.
        const absence = await tx.teacherAbsence.findUniqueOrThrow({
          where: { id: sub.absenceId },
        });
        const activeRuns = await tx.timetableRun.findMany({
          where: { schoolId: absence.schoolId, isActive: true },
          select: { id: true },
        });
        const activeRunIds = activeRuns.map((r: { id: string }) => r.id);

        // (a) Does the candidate already teach a lesson at this slot in the
        // active run?
        const conflictingLesson =
          activeRunIds.length > 0
            ? await tx.timetableLesson.findFirst({
                where: {
                  teacherId: input.candidateTeacherId,
                  dayOfWeek: sub.dayOfWeek,
                  periodNumber: sub.periodNumber,
                  runId: { in: activeRunIds },
                },
              })
            : null;

        // (b) Is the candidate already assigned to a different substitution at
        // the same calendar date + period?
        const conflictingSubstitution = await tx.substitution.findFirst({
          where: {
            substituteTeacherId: input.candidateTeacherId,
            date: sub.date,
            periodNumber: sub.periodNumber,
            status: { in: ['OFFERED', 'CONFIRMED'] },
            id: { not: sub.id },
          },
        });

        if (conflictingLesson || conflictingSubstitution) {
          throw new ConflictException(
            'Vertretung kann nicht vergeben werden: Lehrkraft ist nicht mehr verfügbar.',
          );
        }

        const updated = await tx.substitution.update({
          where: { id: sub.id },
          data: {
            substituteTeacherId: input.candidateTeacherId,
            type: 'SUBSTITUTED',
            status: 'OFFERED',
            offeredAt: new Date(),
          },
        });

        return {
          dto: this.toDto(updated),
          schoolId: absence.schoolId,
          updated,
        };
      },
      { isolationLevel: 'Serializable' },
    );

    // --- Plan 06-04 wiring: notifications + real-time event ---
    // (Runs AFTER the Serializable transaction commits so clients don't see
    // events for a rollback.)
    try {
      const substitute = await this.prisma.teacher.findUniqueOrThrow({
        where: { id: input.candidateTeacherId },
        include: { person: { select: { keycloakUserId: true } } },
      });
      const kcId = (substitute as any).person?.keycloakUserId;
      if (kcId) {
        await this.notifications.create({
          userId: kcId,
          type: 'SUBSTITUTION_OFFER',
          title: 'Neue Vertretungsanfrage',
          body: `Vertretung am ${this.formatDate(updated.date)}`,
          payload: {
            substitutionId: updated.id,
            lessonId: updated.lessonId,
            date: this.isoDate(updated.date),
          },
        });
      }
    } catch {
      // Notification failure must not roll back an already-committed
      // assignment. Logged implicitly via NotificationService.
    }

    this.timetableGateway.emitSubstitutionCreated(schoolId, {
      substitutionId: updated.id,
      lessonId: updated.lessonId,
      date: this.isoDate(updated.date),
      changeType: 'substitution',
    });

    return dto;
  }

  // ---------------------------------------------------------------------------
  // respondToOffer — OFFERED → CONFIRMED or DECLINED (D-14 ClassBookEntry)
  // ---------------------------------------------------------------------------
  async respondToOffer(input: RespondToOfferInput): Promise<SubstitutionDto> {
    const { dto, schoolId, updated, accepted } = await this.prisma.$transaction(
      async (tx: any) => {
        const sub = await tx.substitution.findUniqueOrThrow({
          where: { id: input.substitutionId },
        });

        if (sub.status !== 'OFFERED') {
          throw new ConflictException(
            'Vertretung ist nicht in einem Status, der beantwortet werden kann.',
          );
        }
        if (!sub.substituteTeacherId) {
          // Defensive — an OFFERED row must have a substitute assigned.
          throw new ConflictException(
            'Vertretung hat keinen zugewiesenen Vertretungslehrer.',
          );
        }

        // Verify the responding user actually IS the assigned substitute.
        const substitute = await tx.teacher.findUniqueOrThrow({
          where: { id: sub.substituteTeacherId },
          include: { person: { select: { keycloakUserId: true } } },
        });

        if (substitute.person?.keycloakUserId !== input.userId) {
          throw new ForbiddenException(
            'Nur der zugewiesene Vertretungslehrer kann auf dieses Angebot antworten.',
          );
        }

        const newStatus = input.accept ? 'CONFIRMED' : 'DECLINED';
        const updated = await tx.substitution.update({
          where: { id: sub.id },
          data: {
            status: newStatus,
            respondedAt: new Date(),
          },
        });

        // D-14: On accept of a SUBSTITUTED type, create/update the ClassBookEntry
        // with teacherId pointing to the substitute and the substitutionId FK.
        let schoolIdResolved: string | null = null;
        if (input.accept && updated.type === 'SUBSTITUTED') {
          schoolIdResolved = await this.upsertClassBookEntryForSubstitution(
            tx,
            updated,
          );
        }

        return {
          dto: this.toDto(updated),
          schoolId: schoolIdResolved,
          updated,
          accepted: input.accept,
        };
      },
    );

    // --- Plan 06-04 wiring: notifications + real-time events ---
    const eventType = accepted ? 'SUBSTITUTION_CONFIRMED' : 'SUBSTITUTION_DECLINED';
    try {
      const recipients =
        await this.notifications.resolveRecipientsForSubstitutionEvent(
          updated.id,
          eventType,
          input.userId, // exclude the responding teacher from their own notification
        );
      for (const userId of recipients) {
        await this.notifications.create({
          userId,
          type: eventType as any,
          title: accepted ? 'Vertretung bestätigt' : 'Vertretung abgelehnt',
          body: accepted
            ? `Vertretung am ${this.formatDate(updated.date)} wurde bestätigt`
            : `Vertretung am ${this.formatDate(updated.date)} wurde abgelehnt`,
          payload: {
            substitutionId: updated.id,
            declineReason: input.declineReason ?? null,
          },
        });
      }
    } catch {
      // swallow — notification failure must not block the committed response
    }

    if (accepted && schoolId) {
      this.timetableGateway.emitSubstitutionCreated(schoolId, {
        substitutionId: updated.id,
        lessonId: updated.lessonId,
        date: this.isoDate(updated.date),
        changeType: 'substitution',
      });
    }

    return dto;
  }

  // ---------------------------------------------------------------------------
  // setEntfall — PENDING/... → CONFIRMED (type=ENTFALL), no ClassBookEntry
  // ---------------------------------------------------------------------------
  async setEntfall(input: SetEntfallInput): Promise<SubstitutionDto> {
    const { dto, schoolId, updated } = await this.prisma.$transaction(
      async (tx: any) => {
        const sub = await tx.substitution.findUniqueOrThrow({
          where: { id: input.substitutionId },
        });

        const absence = await tx.teacherAbsence.findUniqueOrThrow({
          where: { id: sub.absenceId },
          select: { schoolId: true },
        });

        const updated = await tx.substitution.update({
          where: { id: sub.id },
          data: {
            type: 'ENTFALL',
            status: 'CONFIRMED',
            respondedAt: new Date(),
          },
        });

        // D-14: ENTFALL produces no ClassBookEntry. If one existed from a
        // previous transition (e.g. we flipped STILLARBEIT → ENTFALL), clean it
        // up to avoid a dangling audit record.
        await tx.classBookEntry.deleteMany({ where: { substitutionId: sub.id } });

        return { dto: this.toDto(updated), schoolId: absence.schoolId, updated };
      },
    );

    // --- Plan 06-04 wiring ---
    this.timetableGateway.emitSubstitutionCancelled(schoolId, {
      substitutionId: updated.id,
      lessonId: updated.lessonId,
      date: this.isoDate(updated.date),
    });

    try {
      const recipients =
        await this.notifications.resolveRecipientsForSubstitutionEvent(
          updated.id,
          'LESSON_CANCELLED',
        );
      for (const userId of recipients) {
        await this.notifications.create({
          userId,
          type: 'LESSON_CANCELLED',
          title: 'Stunde fällt aus',
          body: `Stunde am ${this.formatDate(updated.date)} wurde als Entfall markiert`,
          payload: { substitutionId: updated.id },
        });
      }
    } catch {
      // notification failures are non-fatal
    }

    return dto;
  }

  // ---------------------------------------------------------------------------
  // setStillarbeit — PENDING/... → CONFIRMED (type=STILLARBEIT, thema='Stillarbeit')
  // ---------------------------------------------------------------------------
  async setStillarbeit(input: SetStillarbeitInput): Promise<SubstitutionDto> {
    const { dto, schoolId, updated } = await this.prisma.$transaction(
      async (tx: any) => {
        const sub = await tx.substitution.findUniqueOrThrow({
          where: { id: input.substitutionId },
        });

        const absence = await tx.teacherAbsence.findUniqueOrThrow({
          where: { id: sub.absenceId },
          select: { schoolId: true },
        });

        const updated = await tx.substitution.update({
          where: { id: sub.id },
          data: {
            type: 'STILLARBEIT',
            status: 'CONFIRMED',
            substituteTeacherId: input.supervisorTeacherId ?? null,
            respondedAt: new Date(),
          },
        });

        // D-14 + Open Question 4 resolution: thema='Stillarbeit', lehrstoff=null.
        // ClassBookEntry.teacherId is required (not nullable in schema), so when
        // no supervisor is supplied we fall back to the originalTeacherId of
        // this substitution. This keeps the FK valid and the audit trail honest:
        // the "owning" teacher for record-keeping is still the originally
        // scheduled one, just with a Stillarbeit marker.
        const teacherIdForEntry = input.supervisorTeacherId ?? sub.originalTeacherId;
        await this.upsertStillarbeitClassBookEntry(
          tx,
          updated,
          teacherIdForEntry,
          absence.schoolId,
        );

        return { dto: this.toDto(updated), schoolId: absence.schoolId, updated };
      },
    );

    // --- Plan 06-04 wiring ---
    this.timetableGateway.emitSubstitutionCreated(schoolId, {
      substitutionId: updated.id,
      lessonId: updated.lessonId,
      date: this.isoDate(updated.date),
      changeType: 'stillarbeit',
    });

    try {
      const recipients =
        await this.notifications.resolveRecipientsForSubstitutionEvent(
          updated.id,
          'STILLARBEIT_ASSIGNED',
        );
      for (const userId of recipients) {
        await this.notifications.create({
          userId,
          type: 'STILLARBEIT_ASSIGNED',
          title: 'Stillarbeit eingerichtet',
          body: `Stillarbeit am ${this.formatDate(updated.date)}`,
          payload: { substitutionId: updated.id },
        });
      }
    } catch {
      // notification failures are non-fatal
    }

    return dto;
  }

  // ---------------------------------------------------------------------------
  // Reads
  // ---------------------------------------------------------------------------
  async findManyPending(schoolId: string): Promise<SubstitutionDto[]> {
    const rows = await this.prisma.substitution.findMany({
      where: {
        status: { in: ['PENDING', 'OFFERED', 'DECLINED'] },
        absence: { schoolId },
      },
      orderBy: [{ date: 'asc' }, { periodNumber: 'asc' }],
    });

    // Batch-resolve denormalized IDs to display names
    const teacherIds = [
      ...new Set(
        rows.flatMap((r: any) =>
          [r.originalTeacherId, r.substituteTeacherId].filter(Boolean),
        ),
      ),
    ];
    const csIds = [...new Set(rows.map((r: any) => r.classSubjectId))];

    const [teachers, classSubjects] = await Promise.all([
      teacherIds.length > 0
        ? this.prisma.teacher.findMany({
            where: { id: { in: teacherIds } },
            select: { id: true, person: { select: { firstName: true, lastName: true } } },
          })
        : [],
      csIds.length > 0
        ? this.prisma.classSubject.findMany({
            where: { id: { in: csIds } },
            select: {
              id: true,
              subject: { select: { shortName: true, name: true } },
              schoolClass: { select: { name: true } },
            },
          })
        : [],
    ]);

    const teacherMap = new Map(
      teachers.map((t: any) => [t.id, `${t.person.firstName} ${t.person.lastName}`]),
    );
    const csMap = new Map(
      classSubjects.map((cs: any) => [
        cs.id,
        {
          shortName: cs.subject?.shortName ?? '',
          name: cs.subject?.name ?? '',
          className: cs.schoolClass?.name ?? '',
        },
      ]),
    );

    return rows.map((r: any) => this.toDto(r, teacherMap, csMap));
  }

  async findByAbsentUser(schoolId: string, keycloakUserId: string): Promise<SubstitutionDto[]> {
    // Find the teacher record linked to this Keycloak user
    const person = await this.prisma.person.findFirst({
      where: { keycloakUserId, schoolId },
      select: { teacher: { select: { id: true } } },
    });
    const teacherId = (person as any)?.teacher?.id;
    if (!teacherId) return [];

    const rows = await this.prisma.substitution.findMany({
      where: {
        originalTeacherId: teacherId,
        status: { in: ['PENDING', 'OFFERED', 'CONFIRMED'] },
        absence: { schoolId },
      },
      include: { handoverNote: true },
      orderBy: [{ date: 'asc' }, { periodNumber: 'asc' }],
    });

    // Reuse batch-resolve pattern from findManyPending
    const allTeacherIds = [...new Set(
      rows.flatMap((r: any) => [r.originalTeacherId, r.substituteTeacherId].filter(Boolean)),
    )];
    const csIds = [...new Set(rows.map((r: any) => r.classSubjectId))];

    const [teachers, classSubjects] = await Promise.all([
      allTeacherIds.length > 0
        ? this.prisma.teacher.findMany({
            where: { id: { in: allTeacherIds } },
            select: { id: true, person: { select: { firstName: true, lastName: true } } },
          })
        : [],
      csIds.length > 0
        ? this.prisma.classSubject.findMany({
            where: { id: { in: csIds } },
            select: {
              id: true,
              subject: { select: { shortName: true, name: true } },
              schoolClass: { select: { name: true } },
            },
          })
        : [],
    ]);

    const teacherMap = new Map(
      teachers.map((t: any) => [t.id, `${t.person.firstName} ${t.person.lastName}`]),
    );
    const csMap = new Map(
      classSubjects.map((cs: any) => [
        cs.id,
        { shortName: cs.subject?.shortName ?? '', name: cs.subject?.name ?? '', className: cs.schoolClass?.name ?? '' },
      ]),
    );

    return rows.map((r: any) => ({
      ...this.toDto(r, teacherMap, csMap),
      hasHandoverNote: !!r.handoverNote,
    }));
  }

  async findOne(id: string): Promise<SubstitutionDto> {
    const row = await this.prisma.substitution.findUniqueOrThrow({
      where: { id },
    });
    return this.toDto(row);
  }

  // ---------------------------------------------------------------------------
  // ClassBookEntry linkage helpers (D-14)
  // ---------------------------------------------------------------------------

  /**
   * Upsert a ClassBookEntry for a SUBSTITUTED + CONFIRMED substitution.
   * The entry's teacherId points to the substitute; thema/lehrstoff are left
   * empty because the substitute fills them in during the lesson via the
   * normal classbook UI.
   *
   * Returns the schoolId resolved via the absence relation so the caller can
   * reuse it for post-transaction event emission without a second lookup.
   */
  private async upsertClassBookEntryForSubstitution(
    tx: any,
    sub: any,
  ): Promise<string> {
    // The schoolId for the ClassBookEntry must come from the absence (which
    // carries the authoritative schoolId for this substitution chain).
    const absence = await tx.teacherAbsence.findUniqueOrThrow({
      where: { id: sub.absenceId },
      select: { schoolId: true },
    });

    await tx.classBookEntry.upsert({
      where: { substitutionId: sub.id },
      create: {
        classSubjectId: sub.classSubjectId,
        dayOfWeek: sub.dayOfWeek,
        periodNumber: sub.periodNumber,
        weekType: sub.weekType,
        date: sub.date,
        teacherId: sub.substituteTeacherId,
        schoolId: absence.schoolId,
        substitutionId: sub.id,
      },
      update: {
        teacherId: sub.substituteTeacherId,
      },
    });
    return absence.schoolId;
  }

  /**
   * Upsert a ClassBookEntry for a STILLARBEIT + CONFIRMED substitution.
   * thema is hard-coded to "Stillarbeit" (Open Question 4 resolution), and
   * teacherId falls back to originalTeacherId when no supervisor is set.
   */
  private async upsertStillarbeitClassBookEntry(
    tx: any,
    sub: any,
    teacherIdForEntry: string,
    schoolId: string,
  ) {
    return tx.classBookEntry.upsert({
      where: { substitutionId: sub.id },
      create: {
        classSubjectId: sub.classSubjectId,
        dayOfWeek: sub.dayOfWeek,
        periodNumber: sub.periodNumber,
        weekType: sub.weekType,
        date: sub.date,
        teacherId: teacherIdForEntry,
        schoolId,
        substitutionId: sub.id,
        thema: 'Stillarbeit',
        lehrstoff: null,
      },
      update: {
        teacherId: teacherIdForEntry,
        thema: 'Stillarbeit',
      },
    });
  }

  // ---------------------------------------------------------------------------
  // DTO mapping
  // ---------------------------------------------------------------------------
  private toDto(
    row: any,
    teacherMap?: Map<string, string>,
    csMap?: Map<string, { shortName: string; name: string; className: string }>,
  ): SubstitutionDto {
    const cs = csMap?.get(row.classSubjectId);
    return {
      id: row.id,
      absenceId: row.absenceId,
      lessonId: row.lessonId,
      classSubjectId: row.classSubjectId,
      dayOfWeek: row.dayOfWeek,
      periodNumber: row.periodNumber,
      weekType: row.weekType,
      date: row.date instanceof Date ? row.date.toISOString() : row.date,
      type: row.type,
      status: row.status,
      originalTeacherId: row.originalTeacherId,
      originalTeacherName: teacherMap?.get(row.originalTeacherId) ?? '',
      substituteTeacherId: row.substituteTeacherId ?? null,
      substituteTeacherName: row.substituteTeacherId
        ? (teacherMap?.get(row.substituteTeacherId) ?? null)
        : null,
      substituteRoomId: row.substituteRoomId ?? null,
      offeredAt:
        row.offeredAt instanceof Date
          ? row.offeredAt.toISOString()
          : (row.offeredAt ?? null),
      respondedAt:
        row.respondedAt instanceof Date
          ? row.respondedAt.toISOString()
          : (row.respondedAt ?? null),
      createdAt:
        row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt,
      updatedAt:
        row.updatedAt instanceof Date ? row.updatedAt.toISOString() : row.updatedAt,
      subjectAbbreviation: cs?.shortName ?? '',
      subjectName: cs?.name ?? '',
      className: cs?.className ?? '',
    };
  }

  private isoDate(d: Date | string): string {
    if (d instanceof Date) return d.toISOString();
    return d;
  }

  private formatDate(d: Date | string): string {
    const iso = this.isoDate(d);
    return iso.slice(0, 10);
  }
}
