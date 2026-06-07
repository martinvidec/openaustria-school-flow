import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../config/database/prisma.service';
import { Prisma } from '../../config/database/generated/client.js';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';

/** Cap how many free-slot suggestions we compute/return per conflict. */
const MAX_FREE_SLOT_SUGGESTIONS = 16;

/** Stable Mon→Sun ordering for free-slot suggestion lists. */
const DAY_ORDER = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const DAY_ABBR: Record<string, string> = {
  MONDAY: 'Mo',
  TUESDAY: 'Di',
  WEDNESDAY: 'Mi',
  THURSDAY: 'Do',
  FRIDAY: 'Fr',
  SATURDAY: 'Sa',
  SUNDAY: 'So',
};

interface SlotPlacement {
  teacherId: string;
  roomId: string;
  dayOfWeek: string;
  periodNumber: number;
  weekType: string;
}

/**
 * Issue #177-C — manual resolution of the dropped-lesson conflicts behind a
 * COMPLETED_WITH_CONFLICTS run (see #177-B for how they are recorded).
 *
 * `getSuggestions` surfaces the viable ways out (free qualified teachers /
 * free compatible rooms at the original slot + free slots elsewhere);
 * `resolveConflict` applies the admin's choice atomically and flips the run
 * back to COMPLETED once the last OPEN conflict is gone.
 */
@Injectable()
export class TimetableConflictService {
  private readonly logger = new Logger(TimetableConflictService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Week-type compatibility OR-filter (mirrors timetable-edit.service): a BOTH
   * lesson clashes with A, B and BOTH; an A lesson clashes with A and BOTH.
   */
  private weekTypeFilter(weekType: string): Prisma.TimetableLessonWhereInput['OR'] {
    return [
      { weekType },
      { weekType: 'BOTH' },
      ...(weekType === 'BOTH' ? [{ weekType: 'A' }, { weekType: 'B' }] : []),
    ];
  }

  private weekCompatible(a: string, b: string): boolean {
    return a === 'BOTH' || b === 'BOTH' || a === b;
  }

  /** Load a conflict and assert it belongs to the run (404 otherwise). */
  private async loadConflict(runId: string, conflictId: string) {
    const conflict = await this.prisma.timetableConflict.findUnique({
      where: { id: conflictId },
    });
    if (!conflict || conflict.runId !== runId) {
      throw new NotFoundException('Konflikt nicht gefunden.');
    }
    return conflict;
  }

  /**
   * Suggestions for resolving a single conflict:
   *  - alternativeResources: for a TEACHER conflict, qualified teachers free at
   *    the original slot; for a ROOM conflict, type-compatible rooms free at
   *    the original slot (used by the `reassign-resource` action).
   *  - freeSlots: slots where BOTH the conflict's teacher and room are free
   *    (used by the `move-slot` action).
   */
  async getSuggestions(runId: string, conflictId: string) {
    const conflict = await this.loadConflict(runId, conflictId);
    const run = await this.prisma.timetableRun.findUniqueOrThrow({
      where: { id: runId },
      select: { schoolId: true },
    });
    const schoolId = run.schoolId;

    const cs = await this.prisma.classSubject.findUnique({
      where: { id: conflict.classSubjectId },
      select: {
        subjectId: true,
        subject: { select: { requiredRoomType: true } },
      },
    });

    const alternativeResources: { id: string; label: string }[] = [];

    if (conflict.conflictType === 'TEACHER' && cs) {
      // Teachers qualified for the subject (TeacherSubject) in this school,
      // excluding the already-assigned teacher, that are free at the slot.
      const qualified = await this.prisma.teacherSubject.findMany({
        where: { subjectId: cs.subjectId, teacher: { schoolId } },
        select: {
          teacher: {
            select: {
              id: true,
              person: { select: { lastName: true, firstName: true } },
            },
          },
        },
      });
      for (const q of qualified) {
        const t = q.teacher;
        if (t.id === conflict.teacherId) continue;
        const busy = await this.prisma.timetableLesson.findFirst({
          where: {
            runId,
            teacherId: t.id,
            dayOfWeek: conflict.dayOfWeek,
            periodNumber: conflict.periodNumber,
            OR: this.weekTypeFilter(conflict.weekType),
          },
          select: { id: true },
        });
        if (!busy) {
          alternativeResources.push({
            id: t.id,
            label: `${t.person?.lastName ?? ''} ${t.person?.firstName ?? ''}`.trim(),
          });
        }
      }
    } else if (conflict.conflictType === 'ROOM') {
      const requiredRoomType = cs?.subject?.requiredRoomType ?? null;
      const rooms = await this.prisma.room.findMany({
        where: {
          schoolId,
          ...(requiredRoomType ? { roomType: requiredRoomType } : {}),
        },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      });
      for (const r of rooms) {
        if (r.id === conflict.roomId) continue;
        const busy = await this.prisma.timetableLesson.findFirst({
          where: {
            runId,
            roomId: r.id,
            dayOfWeek: conflict.dayOfWeek,
            periodNumber: conflict.periodNumber,
            OR: this.weekTypeFilter(conflict.weekType),
          },
          select: { id: true },
        });
        if (!busy) alternativeResources.push({ id: r.id, label: r.name });
      }
    }

    const freeSlots = await this.computeFreeSlots(runId, schoolId, conflict);

    return {
      conflictId: conflict.id,
      conflictType: conflict.conflictType,
      alternativeResources,
      freeSlots,
    };
  }

  /**
   * Slots (active SchoolDay × non-break Period) where BOTH the conflict's
   * teacher and room are free (week-type compatible), excluding the original
   * slot. Capped at MAX_FREE_SLOT_SUGGESTIONS.
   */
  private async computeFreeSlots(
    runId: string,
    schoolId: string,
    conflict: { teacherId: string; roomId: string; dayOfWeek: string; periodNumber: number; weekType: string },
  ) {
    const [days, periods, teacherLessons, roomLessons] = await Promise.all([
      this.prisma.schoolDay.findMany({
        where: { schoolId, isActive: true },
        select: { dayOfWeek: true },
      }),
      this.prisma.period.findMany({
        where: { timeGrid: { schoolId }, isBreak: false },
        select: { periodNumber: true },
        orderBy: { periodNumber: 'asc' },
      }),
      this.prisma.timetableLesson.findMany({
        where: { runId, teacherId: conflict.teacherId },
        select: { dayOfWeek: true, periodNumber: true, weekType: true },
      }),
      this.prisma.timetableLesson.findMany({
        where: { runId, roomId: conflict.roomId },
        select: { dayOfWeek: true, periodNumber: true, weekType: true },
      }),
    ]);

    const activeDays = DAY_ORDER.filter((d) =>
      days.some((sd) => sd.dayOfWeek === d),
    );
    // De-duplicate period numbers (one TimeGrid per school, but be defensive).
    const periodNumbers = Array.from(
      new Set(periods.map((p) => p.periodNumber)),
    ).sort((a, b) => a - b);

    const busyAt = (
      lessons: { dayOfWeek: string; periodNumber: number; weekType: string }[],
      day: string,
      period: number,
    ) =>
      lessons.some(
        (l) =>
          l.dayOfWeek === day &&
          l.periodNumber === period &&
          this.weekCompatible(l.weekType, conflict.weekType),
      );

    const slots: {
      dayOfWeek: string;
      periodNumber: number;
      weekType: string;
      label: string;
    }[] = [];
    for (const day of activeDays) {
      for (const period of periodNumbers) {
        if (day === conflict.dayOfWeek && period === conflict.periodNumber) {
          continue;
        }
        if (
          busyAt(teacherLessons, day, period) ||
          busyAt(roomLessons, day, period)
        ) {
          continue;
        }
        slots.push({
          dayOfWeek: day,
          periodNumber: period,
          weekType: conflict.weekType,
          label: `${DAY_ABBR[day] ?? day} ${period}. Stunde`,
        });
        if (slots.length >= MAX_FREE_SLOT_SUGGESTIONS) return slots;
      }
    }
    return slots;
  }

  /**
   * Apply the admin's chosen resolution atomically:
   *  - `cancel`            → no lesson; just mark the conflict RESOLVED.
   *  - `reassign-resource` → create the lesson at its original slot with the
   *                          replacement teacher (TEACHER) or room (ROOM).
   *  - `move-slot`         → create the lesson at a new slot with the original
   *                          teacher + room.
   *
   * Any created lesson is validated against teacher/room/student-group clashes
   * first, then guarded by a P2002 catch inside the transaction. When the last
   * OPEN conflict for the run is resolved, the run flips back to COMPLETED.
   */
  async resolveConflict(
    runId: string,
    conflictId: string,
    dto: ResolveConflictDto,
    userId: string,
  ) {
    const conflict = await this.loadConflict(runId, conflictId);
    if (conflict.status === 'RESOLVED') {
      throw new BadRequestException('Konflikt ist bereits gelöst.');
    }

    let placement: SlotPlacement | null = null;

    if (dto.action === 'cancel') {
      placement = null;
    } else if (dto.action === 'reassign-resource') {
      placement = await this.buildReassignPlacement(conflict, dto);
    } else {
      // move-slot
      if (!dto.dayOfWeek || dto.periodNumber == null) {
        throw new BadRequestException(
          'move-slot erfordert dayOfWeek + periodNumber.',
        );
      }
      placement = {
        teacherId: conflict.teacherId,
        roomId: conflict.roomId,
        dayOfWeek: dto.dayOfWeek,
        periodNumber: dto.periodNumber,
        weekType: dto.weekType ?? conflict.weekType,
      };
    }

    if (placement) {
      await this.assertSlotFree(runId, conflict.classSubjectId, placement);
    }

    let runCompleted = false;
    await this.prisma.$transaction(async (tx) => {
      if (placement) {
        try {
          await tx.timetableLesson.create({
            data: {
              runId,
              classSubjectId: conflict.classSubjectId,
              teacherId: placement.teacherId,
              roomId: placement.roomId,
              dayOfWeek: placement.dayOfWeek as any,
              periodNumber: placement.periodNumber,
              weekType: placement.weekType,
              isManualEdit: true,
              editedBy: userId,
              editedAt: new Date(),
            },
          });
        } catch (err) {
          if (
            err instanceof Prisma.PrismaClientKnownRequestError &&
            err.code === 'P2002'
          ) {
            // Lost a race — another lesson took the slot between validation and
            // insert. Surface as 409 so the UI re-fetches suggestions.
            throw new ConflictException(
              'Der Slot ist nicht mehr frei. Bitte erneut versuchen.',
            );
          }
          throw err;
        }
      }

      await tx.timetableConflict.update({
        where: { id: conflictId },
        data: {
          status: 'RESOLVED',
          resolutionAction: dto.action,
          resolvedBy: userId,
          resolvedAt: new Date(),
        },
      });

      const remaining = await tx.timetableConflict.count({
        where: { runId, status: 'OPEN' },
      });
      if (remaining === 0) {
        await tx.timetableRun.update({
          where: { id: runId },
          data: { status: 'COMPLETED' as any },
        });
        runCompleted = true;
      }
    });

    this.logger.log(
      `Conflict ${conflictId} resolved via ${dto.action} by ${userId}` +
        (runCompleted ? ` — run ${runId} now COMPLETED` : ''),
    );

    return { resolved: true, conflictId, action: dto.action, runCompleted };
  }

  /**
   * Validate + build the placement for a reassign-resource action: a free,
   * qualified replacement teacher (TEACHER conflict) or a free, type-compatible
   * replacement room (ROOM conflict). Throws on a bad/unsuitable target.
   */
  private async buildReassignPlacement(
    conflict: {
      conflictType: string;
      classSubjectId: string;
      teacherId: string;
      roomId: string;
      dayOfWeek: string;
      periodNumber: number;
      weekType: string;
    },
    dto: ResolveConflictDto,
  ): Promise<SlotPlacement> {
    if (conflict.conflictType === 'TEACHER') {
      if (!dto.newTeacherId) {
        throw new BadRequestException(
          'reassign-resource für einen Lehrer-Konflikt erfordert newTeacherId.',
        );
      }
      const cs = await this.prisma.classSubject.findUnique({
        where: { id: conflict.classSubjectId },
        select: { subjectId: true },
      });
      const qualified = await this.prisma.teacherSubject.findFirst({
        where: { teacherId: dto.newTeacherId, subjectId: cs?.subjectId },
        select: { id: true },
      });
      if (!qualified) {
        throw new BadRequestException(
          'Der gewählte Lehrer ist nicht für dieses Fach qualifiziert.',
        );
      }
      return {
        teacherId: dto.newTeacherId,
        roomId: conflict.roomId,
        dayOfWeek: conflict.dayOfWeek,
        periodNumber: conflict.periodNumber,
        weekType: conflict.weekType,
      };
    }

    // ROOM conflict
    if (!dto.newRoomId) {
      throw new BadRequestException(
        'reassign-resource für einen Raum-Konflikt erfordert newRoomId.',
      );
    }
    const cs = await this.prisma.classSubject.findUnique({
      where: { id: conflict.classSubjectId },
      select: { subject: { select: { requiredRoomType: true } } },
    });
    const room = await this.prisma.room.findUnique({
      where: { id: dto.newRoomId },
      select: { roomType: true },
    });
    if (!room) {
      throw new BadRequestException('Der gewählte Raum existiert nicht.');
    }
    const requiredRoomType = cs?.subject?.requiredRoomType ?? null;
    if (requiredRoomType && room.roomType !== requiredRoomType) {
      throw new BadRequestException(
        'Der gewählte Raum hat nicht den für dieses Fach benötigten Raumtyp.',
      );
    }
    return {
      teacherId: conflict.teacherId,
      roomId: dto.newRoomId,
      dayOfWeek: conflict.dayOfWeek,
      periodNumber: conflict.periodNumber,
      weekType: conflict.weekType,
    };
  }

  /**
   * Reject a placement that would clash with an existing lesson in the run:
   * teacher double-book, room double-book, or the class already busy
   * (student-group). Week-type aware. Throws ConflictException (409).
   */
  private async assertSlotFree(
    runId: string,
    classSubjectId: string,
    placement: SlotPlacement,
  ): Promise<void> {
    const weekOr = this.weekTypeFilter(placement.weekType);

    const teacherClash = await this.prisma.timetableLesson.findFirst({
      where: {
        runId,
        teacherId: placement.teacherId,
        dayOfWeek: placement.dayOfWeek as any,
        periodNumber: placement.periodNumber,
        OR: weekOr,
      },
      select: { id: true },
    });
    if (teacherClash) {
      throw new ConflictException(
        'Der Lehrer ist in diesem Slot bereits eingeteilt.',
      );
    }

    const roomClash = await this.prisma.timetableLesson.findFirst({
      where: {
        runId,
        roomId: placement.roomId,
        dayOfWeek: placement.dayOfWeek as any,
        periodNumber: placement.periodNumber,
        OR: weekOr,
      },
      select: { id: true },
    });
    if (roomClash) {
      throw new ConflictException('Der Raum ist in diesem Slot bereits belegt.');
    }

    // Student-group clash: the class must not already have a lesson at the slot.
    const cs = await this.prisma.classSubject.findUnique({
      where: { id: classSubjectId },
      select: { classId: true },
    });
    if (cs) {
      const classCsIds = await this.prisma.classSubject.findMany({
        where: { classId: cs.classId },
        select: { id: true },
      });
      const studentClash = await this.prisma.timetableLesson.findFirst({
        where: {
          runId,
          classSubjectId: { in: classCsIds.map((c) => c.id) },
          dayOfWeek: placement.dayOfWeek as any,
          periodNumber: placement.periodNumber,
          OR: weekOr,
        },
        select: { id: true },
      });
      if (studentClash) {
        throw new ConflictException(
          'Die Klasse hat in diesem Slot bereits Unterricht.',
        );
      }
    }
  }
}
