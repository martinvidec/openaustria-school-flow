import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
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
import { ConstraintWeightOverrideService } from './constraint-weight-override.service';
import { mergeWithSchoolDefaults } from './dto/constraint-weight.dto';

/** Maximum number of solve runs kept per school (D-11) */
const MAX_RUNS_PER_SCHOOL = 3;

@Injectable()
export class TimetableService {
  private readonly logger = new Logger(TimetableService.name);

  constructor(
    private prisma: PrismaService,
    private solverClient: SolverClientService,
    @InjectQueue(SOLVER_QUEUE) private solverQueue: Queue,
    private constraintWeightOverrideService: ConstraintWeightOverrideService,
  ) {}

  /**
   * Start a new solve run.
   *
   * Phase 14 D-06 resolution chain:
   *   defaults < school overrides (DB) < per-run override (DTO).
   *
   * The resolved map is what gets passed to the BullMQ worker AND snapshotted
   * into TimetableRun.constraintConfig — so /admin/timetable-history shows
   * the EXACT weights that influenced the solve, not the per-run delta.
   *
   * Creates a TimetableRun record, enqueues BullMQ job, enforces D-11 (max 3 runs).
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

    // #51 defensive pre-check: Lesson has TWO @PlanningVariables in the
    // sidecar (timeslot + room). With zero rooms the Construction
    // Heuristic cannot initialize the room field and Local Search crashes
    // with "uninitialized entities". Refuse the run upfront with a clear
    // error so the UI can render a helpful FAILED card instead of a
    // generic "watchdog timeout" 60+ seconds later.
    const roomCount = await this.prisma.room.count({ where: { schoolId } });
    if (roomCount === 0) {
      throw new BadRequestException(
        'Stundenplan-Generierung nicht möglich: Diese Schule hat noch keine Räume. ' +
          'Bitte mindestens einen Raum unter „Räume“ anlegen, dann erneut versuchen.',
      );
    }

    // D-06 Step 0: load school-scoped DB overrides BEFORE building the payload
    const dbWeights = await this.constraintWeightOverrideService.findOverridesOnly(schoolId);
    // D-06 Steps 1-2: layer per-run DTO on top, fill gaps with DEFAULT_CONSTRAINT_WEIGHTS
    const resolvedWeights = mergeWithSchoolDefaults(dbWeights, constraintWeights);

    // Create TimetableRun with the RESOLVED snapshot (not the per-run delta)
    const run = await this.prisma.timetableRun.create({
      data: {
        schoolId,
        status: 'QUEUED',
        maxSolveSeconds,
        abWeekEnabled: school.abWeekEnabled ?? false,
        constraintConfig: resolvedWeights as unknown as Prisma.InputJsonValue,
      },
    });

    // Pass the RESOLVED map to the BullMQ job (not the raw per-run DTO)
    const jobData: SolveJobData = {
      schoolId,
      runId: run.id,
      maxSolveSeconds,
      constraintWeights: resolvedWeights,
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

    // Persist lesson assignments.
    //
    // The lessonId carries the source ClassSubject id plus an index and the
    // weekType variant:
    //
    //   `${classSubjectId}-${i}-${weekType}`
    //
    // where weekType ∈ {BOTH, A, B}. The legacy parser (Phase 14) called
    // `lastIndexOf('-')` and dropped only the index suffix, which broke when
    // Issue #72 introduced the trailing `-${weekType}` segment — the prefix
    // produced was `${classSubjectId}-${i}` and the FK-less classSubjectId
    // column got polluted with non-existent ids. The regex below pins the
    // expected suffix shape explicitly.
    //
    // Issue #71 follow-up: also fetch the assigned teacherId from the
    // ClassSubject record so persisted TimetableLessons carry a real
    // teacher reference instead of the legacy hardcoded ''. The solver
    // already respects the assignment for conflict + availability; this
    // line is what surfaces it in the /timetable UI.
    if (result.lessons && result.lessons.length > 0) {
      const lessonIdRegex = /^(.+)-(\d+)-(BOTH|A|B)$/;
      const parsed = result.lessons
        .map((lesson: SolvedLessonDto) => {
          const match = lesson.lessonId.match(lessonIdRegex);
          if (!match) {
            this.logger.error(
              `Unparseable lessonId from solver, skipping: ${lesson.lessonId}`,
            );
            return null;
          }
          return {
            lesson,
            classSubjectId: match[1],
          };
        })
        .filter(
          (
            entry,
          ): entry is { lesson: SolvedLessonDto; classSubjectId: string } =>
            entry !== null,
        );

      if (parsed.length < result.lessons.length) {
        this.logger.warn(
          `Skipped ${
            result.lessons.length - parsed.length
          } lessons with unparseable ids (run ${runId})`,
        );
      }

      // Resolve teacherIds in a single query keyed by the parsed
      // classSubjectIds. Subjects without an assigned teacher fall back to
      // '' so the NOT-NULL teacher_id column stays satisfied (legacy
      // behaviour pre-#71/#72).
      const csIds = Array.from(new Set(parsed.map((p) => p.classSubjectId)));
      const csRows = await this.prisma.classSubject.findMany({
        where: { id: { in: csIds } },
        select: { id: true, teacherId: true },
      });
      const teacherByCs = new Map(
        csRows.map((cs) => [cs.id, cs.teacherId ?? '']),
      );

      const lessonRecords = parsed.map(({ lesson, classSubjectId }) => ({
        runId,
        classSubjectId,
        teacherId: teacherByCs.get(classSubjectId) ?? '',
        roomId: lesson.roomId,
        dayOfWeek: lesson.dayOfWeek as any,
        periodNumber: lesson.periodNumber,
        weekType: lesson.weekType,
      }));

      if (lessonRecords.length > 0) {
        try {
          await this.prisma.timetableLesson.createMany({
            data: lessonRecords,
          });
        } catch (err) {
          this.logger.error(
            `createMany failed for run ${runId} (${lessonRecords.length} records): ${(err as Error).message}`,
            (err as Error).stack,
          );
          throw err;
        }
      }

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
    // Find active run for this school. Multiple isActive=true rows for a
    // single school are an inconsistent state the production `activateRun`
    // transaction prevents, but parallel E2E fixtures can still produce it
    // briefly. Pick the NEWEST so the active run is deterministic — matches
    // the implicit expectation in the UI ("the run I just activated wins").
    const activeRun = await this.prisma.timetableRun.findFirst({
      where: { schoolId, isActive: true },
      orderBy: { createdAt: 'desc' },
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
          absence: true,
        },
      });

      // Batch-resolve denormalized IDs (no Prisma relations on substituteTeacherId/substituteRoomId)
      const subTeacherIds = [...new Set(subs.map((s: any) => s.substituteTeacherId).filter(Boolean))];
      const absentTeacherIds = [...new Set(subs.map((s: any) => s.absence?.teacherId).filter(Boolean))];
      const allTeacherIds = [...new Set([...subTeacherIds, ...absentTeacherIds])];
      const subRoomIds = [...new Set(subs.map((s: any) => s.substituteRoomId).filter(Boolean))];

      const [overlayTeachers, overlayRooms] = await Promise.all([
        allTeacherIds.length > 0
          ? this.prisma.teacher.findMany({
              where: { id: { in: allTeacherIds } },
              select: { id: true, person: { select: { firstName: true, lastName: true } } },
            })
          : [],
        subRoomIds.length > 0
          ? this.prisma.room.findMany({
              where: { id: { in: subRoomIds } },
              select: { id: true, name: true },
            })
          : [],
      ]);

      const overlayTeacherMap = new Map(overlayTeachers.map((t: any) => [t.id, t]));
      const overlayRoomMap = new Map(overlayRooms.map((r: any) => [r.id, r]));

      overlays = new Map();
      for (const sub of subs as any[]) {
        const subDate =
          sub.date instanceof Date ? sub.date : new Date(sub.date);
        if (!isWeekCompatible(subDate, 'BOTH', abWeekEnabled)) continue;
        // Attach resolved data for the overlay application step
        sub._substituteTeacher = overlayTeacherMap.get(sub.substituteTeacherId);
        sub._absentTeacher = overlayTeacherMap.get(sub.absence?.teacherId);
        sub._substituteRoom = overlayRoomMap.get(sub.substituteRoomId);
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
          overlay._absentTeacher?.person?.lastName ?? '';
        const substituteLastName: string =
          overlay._substituteTeacher?.person?.lastName ?? '';

        if (overlay.type === 'SUBSTITUTED') {
          dto.changeType = 'substitution';
          dto.originalTeacherSurname = absentLastName;
          if (overlay.substituteTeacherId) {
            dto.teacherId = overlay.substituteTeacherId;
            dto.teacherSurname = substituteLastName;
          }
          if (overlay.substituteRoomId && overlay._substituteRoom) {
            dto.originalRoomName = dto.roomName;
            dto.roomId = overlay.substituteRoomId;
            dto.roomName = overlay._substituteRoom.name ?? '';
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
