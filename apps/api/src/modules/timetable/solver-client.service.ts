import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SolverPayload } from './solver-input.service';

/**
 * HTTP client for communicating with the Timefold solver sidecar.
 * Uses built-in Node.js fetch (available in Node 24).
 */
@Injectable()
export class SolverClientService {
  private readonly logger = new Logger(SolverClientService.name);
  private readonly solverUrl: string;
  private readonly solverSecret: string;

  constructor(private configService: ConfigService) {
    this.solverUrl = this.configService.get<string>('SOLVER_URL', 'http://localhost:8081');
    this.solverSecret = this.configService.get<string>('SOLVER_SHARED_SECRET', 'dev-secret');
  }

  /**
   * Submit a solve request to the Timefold sidecar.
   * The sidecar will call back NestJS with progress and completion updates.
   *
   * @returns 202 response body with { runId, status }
   */
  async submitSolve(
    runId: string,
    payload: SolverPayload,
    callbackBaseUrl: string,
    maxSolveSeconds: number,
  ): Promise<{ runId: string; status: string }> {
    const url = `${this.solverUrl}/solve`;
    const body = {
      runId,
      callbackUrl: callbackBaseUrl,
      problem: payload,
      maxSolveSeconds,
    };

    try {
      this.logger.log(`Submitting solve request for run ${runId} to ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Solver-Secret': this.solverSecret,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        throw new HttpException(
          `Solver sidecar returned ${response.status}: ${errorText}`,
          response.status >= 500 ? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_REQUEST,
        );
      }

      const result = await response.json() as { runId: string; status: string };
      this.logger.log(`Solve request accepted for run ${runId}: status=${result.status}`);
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `Failed to reach solver sidecar at ${url}: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Solver sidecar is unreachable. Ensure the Timefold service is running.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Get the current status of a solve run from the sidecar.
   */
  async getStatus(runId: string): Promise<{ status: string; score?: { hard: number; soft: number } }> {
    const url = `${this.solverUrl}/solve/${runId}/status`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Solver-Secret': this.solverSecret,
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'No response body');
        throw new HttpException(
          `Solver status check failed (${response.status}): ${errorText}`,
          response.status >= 500 ? HttpStatus.BAD_GATEWAY : HttpStatus.BAD_REQUEST,
        );
      }

      return await response.json() as { status: string; score?: { hard: number; soft: number } };
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `Failed to check solver status for run ${runId}: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Solver sidecar is unreachable. Ensure the Timefold service is running.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  /**
   * Terminate a solve run early via the sidecar.
   * The sidecar will still send a completion callback with the best-so-far solution.
   */
  async terminateEarly(runId: string): Promise<void> {
    const url = `${this.solverUrl}/solve/${runId}`;

    try {
      this.logger.log(`Requesting early termination for run ${runId}`);

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'X-Solver-Secret': this.solverSecret,
        },
      });

      if (!response.ok && response.status !== 204) {
        const errorText = await response.text().catch(() => 'No response body');
        this.logger.warn(
          `Terminate request returned ${response.status} for run ${runId}: ${errorText}`,
        );
      }

      this.logger.log(`Termination request sent for run ${runId}`);
    } catch (error) {
      if (error instanceof HttpException) throw error;

      this.logger.error(
        `Failed to terminate run ${runId}: ${(error as Error).message}`,
      );
      throw new HttpException(
        'Solver sidecar is unreachable. Cannot terminate solve.',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }
}
