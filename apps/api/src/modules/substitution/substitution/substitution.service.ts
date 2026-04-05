import {
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../config/database/prisma.service';
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
 * Plan 06-03 injects RankingService + NotificationService into this class
 * later. For Plan 06-02 the hard-filter re-check is inlined to avoid a
 * placeholder dependency — the minimal conflict query is enough to satisfy
 * Pitfall 2 and is exactly what RankingService.passesHardFilters will call
 * when it lands.
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
  constructor(private readonly prisma: PrismaService) {}

  // ---------------------------------------------------------------------------
  // assignSubstitute — PENDING/DECLINED → OFFERED (Pitfall 2 guard)
  // ---------------------------------------------------------------------------
  async assignSubstitute(input: AssignSubstituteInput): Promise<SubstitutionDto> {
    return this.prisma.$transaction(
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

        return this.toDto(updated);
      },
      { isolationLevel: 'Serializable' },
    );
  }

  // ---------------------------------------------------------------------------
  // respondToOffer — OFFERED → CONFIRMED or DECLINED (D-14 ClassBookEntry)
  // ---------------------------------------------------------------------------
  async respondToOffer(input: RespondToOfferInput): Promise<SubstitutionDto> {
    return this.prisma.$transaction(async (tx: any) => {
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
      if (input.accept && updated.type === 'SUBSTITUTED') {
        await this.upsertClassBookEntryForSubstitution(tx, updated);
      }

      return this.toDto(updated);
    });
  }

  // ---------------------------------------------------------------------------
  // setEntfall — PENDING/... → CONFIRMED (type=ENTFALL), no ClassBookEntry
  // ---------------------------------------------------------------------------
  async setEntfall(input: SetEntfallInput): Promise<SubstitutionDto> {
    return this.prisma.$transaction(async (tx: any) => {
      const sub = await tx.substitution.findUniqueOrThrow({
        where: { id: input.substitutionId },
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

      return this.toDto(updated);
    });
  }

  // ---------------------------------------------------------------------------
  // setStillarbeit — PENDING/... → CONFIRMED (type=STILLARBEIT, thema='Stillarbeit')
  // ---------------------------------------------------------------------------
  async setStillarbeit(input: SetStillarbeitInput): Promise<SubstitutionDto> {
    return this.prisma.$transaction(async (tx: any) => {
      const sub = await tx.substitution.findUniqueOrThrow({
        where: { id: input.substitutionId },
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
      await this.upsertStillarbeitClassBookEntry(tx, updated, teacherIdForEntry);

      return this.toDto(updated);
    });
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
    return rows.map((r: any) => this.toDto(r));
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
   */
  private async upsertClassBookEntryForSubstitution(tx: any, sub: any) {
    // The schoolId for the ClassBookEntry must come from the absence (which
    // carries the authoritative schoolId for this substitution chain).
    const absence = await tx.teacherAbsence.findUniqueOrThrow({
      where: { id: sub.absenceId },
      select: { schoolId: true },
    });

    return tx.classBookEntry.upsert({
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
  ) {
    const absence = await tx.teacherAbsence.findUniqueOrThrow({
      where: { id: sub.absenceId },
      select: { schoolId: true },
    });

    return tx.classBookEntry.upsert({
      where: { substitutionId: sub.id },
      create: {
        classSubjectId: sub.classSubjectId,
        dayOfWeek: sub.dayOfWeek,
        periodNumber: sub.periodNumber,
        weekType: sub.weekType,
        date: sub.date,
        teacherId: teacherIdForEntry,
        schoolId: absence.schoolId,
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
  private toDto(row: any): SubstitutionDto {
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
      // Fields below are filled by Plan 04 view-layer joins.
      originalTeacherName: '',
      substituteTeacherId: row.substituteTeacherId ?? null,
      substituteTeacherName: null,
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
      subjectAbbreviation: '',
      subjectName: '',
      className: '',
    };
  }
}
