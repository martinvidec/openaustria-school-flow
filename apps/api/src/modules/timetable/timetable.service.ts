import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { endOfWeek, startOfWeek } from 'date-fns';
import { PrismaService } from '../../config/database/prisma.service';
import { SOLVER_QUEUE } from '../../config/queue/queue.constants';
import { SolverClientService } from './solver-client.service';
import { SolveProgressDto, ViolationGroupDto } from './dto/solve-progress.dto';
import { SolveResultDto, SolvedLessonDto } from './dto/solve-result.dto';
import { SolveJobData } from './processors/solve.processor';
import { Prisma } from '../../config/database/generated/client.js';
import {
  TimetableViewQueryDto,
  TimetableViewResponseDto,
  TimetableViewLessonDto,
  PeriodDto,
} from './dto/timetable-view.dto';
import { isWeekCompatible } from './ab-week.util';

/** Maximum number of solve runs kept per school (D-11) */
const MAX_RUNS_PER_SCHOOL = 3;

@Injectable()
export class TimetableService {
  private readonly logger = new Logger(TimetableService.name);

  constructor(
    private prisma: PrismaService,
    private solverClient: SolverClientService,
    @InjectQueue(SOLVER_QUEUE) private solverQueue: Queue,
  ) {}

  /**
   * Start a new solve run.
   * Creates a TimetableRun record, enqueues BullMQ job, and enforces D-11 (max 3 runs).
   */
  async startSolve(
    schoolId: string,
    maxSolveSeconds = 300,
    constraintWeights?: Record<string, number>,
  ) {
    // Check school exists and get abWeekEnabled
    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
    });

    // Create TimetableRun with QUEUED status
    const run = await this.prisma.timetableRun.create({
      data: {
        schoolId,
        status: 'QUEUED',
        maxSolveSeconds,
        abWeekEnabled: (school as any).abWeekEnabled ?? false,
        constraintConfig: constraintWeights
          ? (constraintWeights as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });

    // Enqueue BullMQ job
    const jobData: SolveJobData = {
      schoolId,
      runId: run.id,
      maxSolveSeconds,
      constraintWeights,
    };

    await this.solverQueue.add('solve', jobData, {
      removeOnComplete: true,
      removeOnFail: 100,
    });

    this.logger.log(`Solve run ${run.id} queued for school ${schoolId}`);

    // Enforce D-11: keep only last 3 runs per school
    await this.enforceRunLimit(schoolId);

    return run;
  }

  /**
   * Update a run's status field.
   */
  async updateRunStatus(runId: string, status: string): Promise<void> {
    await this.prisma.timetableRun.update({
      where: { id: runId },
      data: { status: status as any },
    });
  }

  /**
   * Handle progress update from sidecar callback.
   * Updates run with scores and violations. Does NOT store lessons on progress.
   */
  async handleProgress(runId: string, progress: SolveProgressDto): Promise<void> {
    await this.prisma.timetableRun.update({
      where: { id: runId },
      data: {
        hardScore: progress.hardScore,
        softScore: progress.softScore,
        elapsedSeconds: progress.elapsedSeconds,
        violations: progress.remainingViolations as unknown as Prisma.InputJsonValue,
      },
    });
  }

  /**
   * Handle completion callback from sidecar.
   * Updates run status, scores, violations, and persists lesson assignments.
   */
  async handleCompletion(runId: string, result: SolveResultDto): Promise<void> {
    // Update run record
    await this.prisma.timetableRun.update({
      where: { id: runId },
      data: {
        status: result.status as any,
        hardScore: result.hardScore,
        softScore: result.softScore,
        elapsedSeconds: result.elapsedSeconds,
        violations: result.violations as unknown as Prisma.InputJsonValue,
      },
    });

    // Persist lesson assignments
    if (result.lessons && result.lessons.length > 0) {
      const lessonRecords = result.lessons.map((lesson: SolvedLessonDto) => {
        // Parse classSubjectId from lessonId format "classSubjectId-index"
        const lastDash = lesson.lessonId.lastIndexOf('-');
        const classSubjectId = lesson.lessonId.substring(0, lastDash);

        return {
          runId,
          classSubjectId,
          teacherId: '', // Teacher assigned by solver, stored in lessonId context
          roomId: lesson.roomId,
          dayOfWeek: lesson.dayOfWeek as any,
          periodNumber: lesson.periodNumber,
          weekType: lesson.weekType,
        };
      });

      await this.prisma.timetableLesson.createMany({
        data: lessonRecords,
      });

      this.logger.log(
        `Stored ${lessonRecords.length} lesson assignments for run ${runId}`,
      );
    }
  }

  /**
   * Stop a solve run early.
   * Sends terminate request to sidecar and updates status.
   * The sidecar will still send a completion callback with best-so-far.
   */
  async stopSolve(runId: string): Promise<void> {
    const run = await this.findRun(runId);

    if (run.status !== 'SOLVING') {
      this.logger.warn(`Cannot stop run ${runId} in status ${run.status}`);
      return;
    }

    await this.solverClient.terminateEarly(runId);
    await this.updateRunStatus(runId, 'STOPPED');
  }

  /**
   * List solve runs for a school (max 3, newest first per D-11).
   */
  async findRuns(schoolId: string) {
    return this.prisma.timetableRun.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      take: MAX_RUNS_PER_SCHOOL,
    });
  }

  /**
   * Get a single run with its lessons.
   */
  async findRun(runId: string) {
    const run = await this.prisma.timetableRun.findUnique({
      where: { id: runId },
      include: { lessons: true },
    });

    if (!run) {
      throw new NotFoundException('Die angeforderte Ressource wurde nicht gefunden.');
    }

    return run;
  }

  /**
   * Activate a completed run. Sets it as the active timetable for the school.
   * In a transaction: deactivate all runs, then activate the specified one.
   */
  async activateRun(runId: string): Promise<void> {
    const run = await this.findRun(runId);

    await this.prisma.$transaction([
      this.prisma.timetableRun.updateMany({
        where: { schoolId: run.schoolId },
        data: { isActive: false },
      }),
      this.prisma.timetableRun.update({
        where: { id: runId },
        data: { isActive: true },
      }),
    ]);

    this.logger.log(`Run ${runId} activated for school ${run.schoolId}`);
  }

  /**
   * Get grouped constraint violations for a completed/stopped run (D-10, TIME-07).
   * Returns the violations stored as JSON when the solver completed.
   * When hardScore < 0, these explain WHY the timetable is infeasible.
   */
  async getViolations(runId: string): Promise<ViolationGroupDto[]> {
    const run = await this.prisma.timetableRun.findUniqueOrThrow({
      where: { id: runId },
      select: { violations: true, status: true },
    });

    if (!run.violations) {
      return [];
    }

    // violations is stored as JSON array of ViolationGroupDto objects
    const violations = run.violations as unknown as ViolationGroupDto[];
    return Array.isArray(violations) ? violations : [];
  }

  /**
   * Get timetable view with joined subject/teacher/room data, filtered by perspective.
   * Returns the active run's lessons with period and day metadata.
   *
   * VIEW-01: teacher perspective, VIEW-02: class perspective, VIEW-03: room perspective
   * VIEW-05: joined data (subject names, teacher surnames, room names)
   */
  async getView(
    schoolId: string,
    query: TimetableViewQueryDto,
  ): Promise<TimetableViewResponseDto> {
    // Find active run for this school
    const activeRun = await this.prisma.timetableRun.findFirst({
      where: { schoolId, isActive: true },
    });

    // Get school metadata: time grid periods + active school days
    const school = await this.prisma.school.findUniqueOrThrow({
      where: { id: schoolId },
      include: {
        timeGrid: { include: { periods: { orderBy: { periodNumber: 'asc' } } } },
        schoolDays: { where: { isActive: true } },
      },
    });

    const periods: PeriodDto[] = (school.timeGrid?.periods ?? []).map((p) => ({
      periodNumber: p.periodNumber,
      startTime: p.startTime,
      endTime: p.endTime,
      isBreak: p.isBreak,
      label: p.label,
      durationMin: p.durationMin,
    }));

    const activeDays = school.schoolDays.map((d) => d.dayOfWeek);
    const abWeekEnabled = activeRun?.abWeekEnabled ?? false;

    // If no active run, return empty response with metadata
    if (!activeRun) {
      return {
        schoolId,
        runId: '',
        perspective: query.perspective,
        perspectiveId: query.perspectiveId,
        perspectiveName: '',
        abWeekEnabled,
        periods,
        activeDays,
        lessons: [],
      };
    }

    // Get all lessons for the active run
    const lessons = await this.prisma.timetableLesson.findMany({
      where: {
        runId: activeRun.id,
        ...(query.weekType && query.weekType !== 'BOTH'
          ? { weekType: { in: [query.weekType, 'BOTH'] } }
          : {}),
      },
      include: {
        room: true,
      },
    });

    // Collect all unique classSubjectIds and teacherIds for batch lookup
    const classSubjectIds = [...new Set(lessons.map((l) => l.classSubjectId))];
    const teacherIds = [...new Set(lessons.map((l) => l.teacherId))];

    // Batch-load ClassSubject -> Subject -> name/shortName AND ClassSubject -> classId
    const classSubjects = await this.prisma.classSubject.findMany({
      where: { id: { in: classSubjectIds } },
      include: {
        subject: true,
        schoolClass: true,
      },
    });
    const csMap = new Map(classSubjects.map((cs) => [cs.id, cs]));

    // Batch-load Teacher -> Person -> lastName
    const teachers = await this.prisma.teacher.findMany({
      where: { id: { in: teacherIds } },
      include: { person: true },
    });
    const teacherMap = new Map(teachers.map((t) => [t.id, t]));

    // Filter lessons by perspective
    const filteredLessons = lessons.filter((lesson) => {
      const cs = csMap.get(lesson.classSubjectId);
      switch (query.perspective) {
        case 'teacher':
          return lesson.teacherId === query.perspectiveId;
        case 'class':
          return cs?.classId === query.perspectiveId;
        case 'room':
          return lesson.roomId === query.perspectiveId;
        default:
          return false;
      }
    });

    // Resolve perspectiveName
    let perspectiveName = '';
    switch (query.perspective) {
      case 'teacher': {
        const teacher = teacherMap.get(query.perspectiveId);
        perspectiveName = teacher
          ? `${teacher.person.firstName} ${teacher.person.lastName}`
          : '';
        break;
      }
      case 'class': {
        const sc = await this.prisma.schoolClass.findUnique({
          where: { id: query.perspectiveId },
        });
        perspectiveName = sc?.name ?? '';
        break;
      }
      case 'room': {
        const room = await this.prisma.room.findUnique({
          where: { id: query.perspectiveId },
        });
        perspectiveName = room?.name ?? '';
        break;
      }
    }

    // SUBST-05: Overlay-aware dated view. When query.date is provided, fetch
    // Substitution rows for the ISO week of that date and overlay them on top
    // of the recurring plan. Only CONFIRMED + OFFERED statuses apply.
    // When query.date is omitted, behavior is unchanged (backward compatible).
    let overlays: Map<string, any> | null = null;
    if (query.date) {
      const targetDate = new Date(query.date);
      const weekStart = startOfWeek(targetDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(targetDate, { weekStartsOn: 1 });

      const lessonIds = filteredLessons.map((l) => l.id);
      const subs = await this.prisma.substitution.findMany({
        where: {
          lessonId: { in: lessonIds },
          date: { gte: weekStart, lte: weekEnd },
          status: { in: ['CONFIRMED', 'OFFERED'] },
        },
        include: {
          substituteTeacher: { include: { person: true } },
          substituteRoom: true,
          absence: {
            include: { teacher: { include: { person: true } } },
          },
        },
      });

      overlays = new Map();
      for (const sub of subs as any[]) {
        // Filter by ISO-week compatibility of the stored weekType using the
        // same ab-week utility used by Phase 2's range expansion.
        const subDate =
          sub.date instanceof Date ? sub.date : new Date(sub.date);
        // Match the overlay on lessonId alone within the week; each lesson
        // appears only once per weekly view row so the (lessonId) key suffices.
        if (!isWeekCompatible(subDate, 'BOTH', abWeekEnabled)) continue;
        overlays.set(sub.lessonId, sub);
      }
    }

    // Map to DTOs with joined data (and apply overlays if present)
    const lessonDtos: TimetableViewLessonDto[] = filteredLessons.map((lesson) => {
      const cs = csMap.get(lesson.classSubjectId);
      const teacher = teacherMap.get(lesson.teacherId);

      // Base recurring-plan DTO
      const dto: TimetableViewLessonDto = {
        id: lesson.id,
        classSubjectId: lesson.classSubjectId,
        subjectId: cs?.subjectId ?? '',
        subjectAbbreviation: cs?.subject?.shortName ?? '',
        subjectName: cs?.subject?.name ?? '',
        teacherId: lesson.teacherId,
        teacherSurname: teacher?.person?.lastName ?? '',
        roomId: lesson.roomId,
        roomName: lesson.room?.name ?? '',
        dayOfWeek: lesson.dayOfWeek,
        periodNumber: lesson.periodNumber,
        weekType: lesson.weekType,
        isManualEdit: lesson.isManualEdit,
        changeType: (lesson.changeType as TimetableViewLessonDto['changeType']) ?? null,
        originalTeacherSurname: lesson.originalTeacherSurname ?? undefined,
        originalRoomName: lesson.originalRoomName ?? undefined,
      };

      // Apply overlay if one exists for this lesson (SUBST-05)
      const overlay = overlays?.get(lesson.id);
      if (overlay) {
        const absentLastName: string =
          overlay.absence?.teacher?.person?.lastName ?? '';
        const substituteLastName: string =
          overlay.substituteTeacher?.person?.lastName ?? '';

        if (overlay.type === 'SUBSTITUTED') {
          dto.changeType = 'substitution';
          dto.originalTeacherSurname = absentLastName;
          if (overlay.substituteTeacherId) {
            dto.teacherId = overlay.substituteTeacherId;
            dto.teacherSurname = substituteLastName;
          }
          if (overlay.substituteRoomId && overlay.substituteRoom) {
            dto.originalRoomName = dto.roomName;
            dto.roomId = overlay.substituteRoomId;
            dto.roomName = overlay.substituteRoom.name ?? '';
          }
        } else if (overlay.type === 'ENTFALL') {
          dto.changeType = 'cancelled';
          // Leave original teacher/room fields untouched -- the UI renders
          // these as strikethrough per D-13.
        } else if (overlay.type === 'STILLARBEIT') {
          dto.changeType = 'stillarbeit';
          dto.originalTeacherSurname = absentLastName;
          if (overlay.substituteTeacherId) {
            dto.teacherId = overlay.substituteTeacherId;
            dto.teacherSurname = substituteLastName;
          }
        }
      }

      return dto;
    });

    return {
      schoolId,
      runId: activeRun.id,
      perspective: query.perspective,
      perspectiveId: query.perspectiveId,
      perspectiveName,
      abWeekEnabled,
      periods,
      activeDays,
      lessons: lessonDtos,
    };
  }

  /**
   * Enforce D-11: keep only last 3 runs per school.
   * Deletes oldest runs beyond the limit (TimetableLesson records cascade).
   */
  private async enforceRunLimit(schoolId: string): Promise<void> {
    const allRuns = await this.prisma.timetableRun.findMany({
      where: { schoolId },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });

    if (allRuns.length > MAX_RUNS_PER_SCHOOL) {
      const runsToDelete = allRuns.slice(MAX_RUNS_PER_SCHOOL);
      const idsToDelete = runsToDelete.map((r) => r.id);

      await this.prisma.timetableRun.deleteMany({
        where: { id: { in: idsToDelete } },
      });

      this.logger.log(
        `Deleted ${idsToDelete.length} old runs for school ${schoolId} (D-11 limit)`,
      );
    }
  }
}
