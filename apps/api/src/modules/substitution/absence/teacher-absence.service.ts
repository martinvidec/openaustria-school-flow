import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { eachDayOfInterval, getDay } from 'date-fns';
import { PrismaService } from '../../../config/database/prisma.service';
import { isWeekCompatible } from '../../timetable/ab-week.util';
import type {
  TeacherAbsenceDto,
  AbsenceReason,
  AbsenceStatus,
} from '@schoolflow/shared';

/**
 * TeacherAbsenceService — SUBST-01 implementation.
 *
 * Responsible for:
 * 1. Creating a TeacherAbsence row (full-day or period-bounded)
 * 2. Range-expanding the absence across calendar days into pending Substitution
 *    rows, one per matched TimetableLesson in the school's active TimetableRun.
 *    The expansion respects:
 *    - Active school days (SchoolDay.isActive)
 *    - A/B week cycles via ab-week.util.isWeekCompatible (Pitfall 1 soft-ref)
 *    - Optional period bounds (periodFrom..periodTo, inclusive)
 * 3. Cancelling an absence while preserving the audit trail (CONFIRMED rows
 *    are kept; only PENDING rows are deleted).
 *
 * Transactional guarantee: the TeacherAbsence + all Substitution rows are
 * created inside a single Prisma $transaction so partial failures roll back
 * cleanly (no orphan rows in either table).
 */

export interface CreateTeacherAbsenceInput {
  schoolId: string;
  teacherId: string;
  dateFrom: Date;
  dateTo: Date;
  periodFrom?: number;
  periodTo?: number;
  reason: AbsenceReason;
  note?: string;
  createdBy: string;
}

export interface CreateTeacherAbsenceResult {
  absence: {
    id: string;
    schoolId: string;
    teacherId: string;
    dateFrom: Date;
    dateTo: Date;
    periodFrom: number | null;
    periodTo: number | null;
    reason: AbsenceReason;
    note: string | null;
    status: AbsenceStatus;
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
  };
  affectedLessonCount: number;
}

export interface ListAbsencesOptions {
  status?: AbsenceStatus;
  limit?: number;
  offset?: number;
}

// Prisma DayOfWeek enum matching schema.prisma (MONDAY..SUNDAY order)
const DAY_OF_WEEK_BY_JS_INDEX = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

@Injectable()
export class TeacherAbsenceService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateTeacherAbsenceInput): Promise<CreateTeacherAbsenceResult> {
    // --- Input validation (fast-fail before opening a transaction) ---
    if (input.dateFrom.getTime() > input.dateTo.getTime()) {
      throw new BadRequestException(
        'Das Enddatum muss nach dem Startdatum liegen.',
      );
    }
    if (input.periodFrom !== undefined && input.periodTo !== undefined) {
      if (input.periodFrom > input.periodTo) {
        throw new BadRequestException(
          'Die End-Stunde muss nach der Anfangs-Stunde liegen.',
        );
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Fetch active TimetableRun (source of lessons to expand against)
      const activeRun = await tx.timetableRun.findFirst({
        where: { schoolId: input.schoolId, isActive: true },
      });
      if (!activeRun) {
        throw new NotFoundException(
          'Kein aktiver Stundenplan für diese Schule. Vertretungen können erst nach Aktivierung eines Stundenplans erfasst werden.',
        );
      }
      const abWeekEnabled: boolean = Boolean(activeRun.abWeekEnabled);

      // 2. Fetch active school days — set of DayOfWeek for O(1) lookup
      const schoolDays = await tx.schoolDay.findMany({
        where: { schoolId: input.schoolId, isActive: true },
      });
      const activeDaySet = new Set<string>(
        schoolDays.map((d: any) => d.dayOfWeek as string),
      );

      // 3. Create the absence row
      const absence = await tx.teacherAbsence.create({
        data: {
          schoolId: input.schoolId,
          teacherId: input.teacherId,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          periodFrom: input.periodFrom ?? null,
          periodTo: input.periodTo ?? null,
          reason: input.reason,
          note: input.note ?? null,
          status: 'ACTIVE',
          createdBy: input.createdBy,
        },
      });

      // 4. Range expansion
      const days = eachDayOfInterval({ start: input.dateFrom, end: input.dateTo });
      const substitutionRows: Array<Record<string, unknown>> = [];

      for (const date of days) {
        const jsDayIdx = getDay(date); // 0..6 (0=Sunday)
        const dayOfWeek = DAY_OF_WEEK_BY_JS_INDEX[jsDayIdx];
        if (!activeDaySet.has(dayOfWeek)) continue;

        const lessons = await tx.timetableLesson.findMany({
          where: {
            runId: activeRun.id,
            teacherId: input.teacherId,
            dayOfWeek,
          },
        });

        for (const lesson of lessons) {
          // A/B week filter (Open Question 3 resolution)
          if (!isWeekCompatible(date, lesson.weekType, abWeekEnabled)) continue;

          // Period bound filter (only when bounds provided)
          if (input.periodFrom !== undefined && input.periodTo !== undefined) {
            if (
              lesson.periodNumber < input.periodFrom ||
              lesson.periodNumber > input.periodTo
            ) {
              continue;
            }
          }

          substitutionRows.push({
            absenceId: absence.id,
            lessonId: lesson.id,
            classSubjectId: lesson.classSubjectId,
            dayOfWeek: lesson.dayOfWeek,
            periodNumber: lesson.periodNumber,
            weekType: lesson.weekType,
            date,
            type: null,
            status: 'PENDING',
            originalTeacherId: input.teacherId,
            createdBy: input.createdBy,
          });
        }
      }

      let affectedLessonCount = 0;
      if (substitutionRows.length > 0) {
        const result = await tx.substitution.createMany({
          data: substitutionRows,
        });
        affectedLessonCount = result.count;
      }

      return { absence, affectedLessonCount };
    });
  }

  async findManyForSchool(
    schoolId: string,
    opts: ListAbsencesOptions = {},
  ): Promise<TeacherAbsenceDto[]> {
    const rows = await this.prisma.teacherAbsence.findMany({
      where: {
        schoolId,
        ...(opts.status ? { status: opts.status } : {}),
      },
      include: {
        teacher: {
          include: { person: { select: { firstName: true, lastName: true } } },
        },
        _count: { select: { substitutions: true } },
      },
      orderBy: [{ dateFrom: 'desc' }, { createdAt: 'desc' }],
      take: opts.limit ?? 50,
      skip: opts.offset ?? 0,
    });

    return rows.map((r: any) => this.toDto(r));
  }

  async findOne(id: string): Promise<TeacherAbsenceDto> {
    const row = await this.prisma.teacherAbsence.findUnique({
      where: { id },
      include: {
        teacher: {
          include: { person: { select: { firstName: true, lastName: true } } },
        },
        _count: { select: { substitutions: true } },
      },
    });
    if (!row) {
      throw new NotFoundException('Abwesenheit nicht gefunden');
    }
    return this.toDto(row);
  }

  /**
   * Cancel an absence. Updates status to CANCELLED and deletes PENDING
   * Substitution rows (CONFIRMED/OFFERED/DECLINED are preserved for the
   * audit trail per Phase 4 TimetableLessonEdit precedent).
   */
  async cancel(id: string, _cancelledBy: string): Promise<void> {
    return this.prisma.$transaction(async (tx: any) => {
      const existing = await tx.teacherAbsence.findUnique({ where: { id } });
      if (!existing) {
        throw new NotFoundException('Abwesenheit nicht gefunden');
      }
      await tx.teacherAbsence.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });
      await tx.substitution.deleteMany({
        where: { absenceId: id, status: 'PENDING' },
      });
    });
  }

  // --- Mapping helpers ---

  private toDto(row: any): TeacherAbsenceDto {
    const firstName = row.teacher?.person?.firstName ?? '';
    const lastName = row.teacher?.person?.lastName ?? '';
    return {
      id: row.id,
      schoolId: row.schoolId,
      teacherId: row.teacherId,
      teacherName: `${firstName} ${lastName}`.trim(),
      dateFrom: row.dateFrom.toISOString(),
      dateTo: row.dateTo.toISOString(),
      periodFrom: row.periodFrom ?? null,
      periodTo: row.periodTo ?? null,
      reason: row.reason,
      note: row.note ?? null,
      status: row.status,
      createdBy: row.createdBy,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      affectedLessonCount: row._count?.substitutions ?? 0,
    };
  }
}
