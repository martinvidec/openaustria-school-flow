import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { SOLVER_QUEUE } from '../../../config/queue/queue.constants';
import { SolverInputService } from '../solver-input.service';
import { SolverClientService } from '../solver-client.service';
import { TimetableService } from '../timetable.service';

export interface SolveJobData {
  schoolId: string;
  runId: string;
  maxSolveSeconds: number;
  constraintWeights?: Record<string, number>;
}

@Processor(SOLVER_QUEUE)
export class SolveProcessor extends WorkerHost {
  private readonly logger = new Logger(SolveProcessor.name);

  constructor(
    private solverInputService: SolverInputService,
    private solverClient: SolverClientService,
    private timetableService: TimetableService,
  ) {
    super();
  }

  async process(job: Job<SolveJobData>) {
    const { schoolId, runId, maxSolveSeconds, constraintWeights } = job.data;

    this.logger.log(`Processing solve job for run ${runId} (school: ${schoolId})`);

    try {
      // 1. Update run status to SOLVING
      await this.timetableService.updateRunStatus(runId, 'SOLVING');

      // 2. Aggregate solver input from Prisma
      const solverPayload = await this.solverInputService.buildSolverInput(
        schoolId,
        constraintWeights,
      );

      // 3. Determine callback URL (from env or config)
      // The sidecar appends `/progress/<runId>` and `/complete/<runId>` to this
      // base, so it must already include the SolverCallbackController prefix
      // (`api/v1/api/internal/solver`). See issue #50 Bug 4.
      const apiBase = process.env.API_INTERNAL_URL || 'http://localhost:3000';
      const callbackBaseUrl = `${apiBase}/api/v1/api/internal/solver`;

      // 4. Submit to sidecar (non-blocking, sidecar calls back)
      await this.solverClient.submitSolve(runId, solverPayload, callbackBaseUrl, maxSolveSeconds);

      this.logger.log(`Solve job submitted for run ${runId}`);

      // 5. Return immediately -- sidecar will callback on progress/completion
      return { submitted: true, runId };
    } catch (error) {
      this.logger.error(
        `Solve job failed for run ${runId}: ${(error as Error).message}`,
      );
      await this.timetableService.updateRunStatus(runId, 'FAILED');
      throw error;
    }
  }
}
