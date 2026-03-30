import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../config/database/prisma.service';
import { SOLVER_QUEUE } from '../../config/queue/queue.constants';
import { SolverClientService } from './solver-client.service';
import { SolveProgressDto } from './dto/solve-progress.dto';
import { SolveResultDto, SolvedLessonDto } from './dto/solve-result.dto';
import { SolveJobData } from './processors/solve.processor';
import { Prisma } from '../../config/database/generated/client.js';

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
