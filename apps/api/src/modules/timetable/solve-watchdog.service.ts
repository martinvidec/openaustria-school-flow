import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../config/database/prisma.service';
import { TimetableGateway } from './timetable.gateway';

/**
 * Watchdog for hung TimetableRuns (issue #53, Schicht 2).
 *
 * If the sidecar's final callback never arrives (Crash, Network-Fail,
 * 403 from auth-header bug), a run sits in SOLVING forever — BullMQ job
 * already done, DB record stuck. This cron flips any SOLVING run that
 * exceeded its budget by more than 30s into FAILED with a recorded reason
 * so the UI can render a red error card and the user can retry.
 *
 * Runs every 60s. Cheap query — `status='SOLVING'` index hits the
 * @@index([schoolId, createdAt]) covering filter-then-sort path.
 */
@Injectable()
export class SolveWatchdogService {
  private readonly logger = new Logger(SolveWatchdogService.name);

  /** Grace period beyond maxSolveSeconds before declaring a run dead. */
  private static readonly GRACE_SECONDS = 30;

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: TimetableGateway,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { name: 'solve-watchdog' })
  async sweep(): Promise<void> {
    const stuck = await this.prisma.timetableRun.findMany({
      where: { status: 'SOLVING' },
      select: {
        id: true,
        schoolId: true,
        maxSolveSeconds: true,
        updatedAt: true,
      },
    });

    if (stuck.length === 0) return;

    const now = Date.now();
    const expired = stuck.filter((run) => {
      const ageSeconds = (now - run.updatedAt.getTime()) / 1000;
      return ageSeconds > run.maxSolveSeconds + SolveWatchdogService.GRACE_SECONDS;
    });

    if (expired.length === 0) return;

    for (const run of expired) {
      const reason =
        'Watchdog-Timeout: Solver-Sidecar hat keine Antwort innerhalb des Zeitbudgets gesendet. ' +
        'Möglicher Solver-Crash oder unterbrochene Verbindung — Lauf erneut starten.';
      await this.prisma.timetableRun.update({
        where: { id: run.id },
        data: { status: 'FAILED', errorReason: reason },
      });
      this.logger.warn(
        `Watchdog: marked run ${run.id} (school ${run.schoolId}) FAILED — ` +
          `last update ${Math.round((now - run.updatedAt.getTime()) / 1000)}s ago, ` +
          `budget ${run.maxSolveSeconds}s + grace ${SolveWatchdogService.GRACE_SECONDS}s`,
      );
      // Push a synthetic completion event so any open /admin/solver page
      // unblocks immediately instead of waiting for the next polling tick.
      this.gateway.emitComplete(run.schoolId, {
        runId: run.id,
        status: 'FAILED',
        hardScore: 0,
        softScore: 0,
        elapsedSeconds: run.maxSolveSeconds,
      });
    }
  }
}
