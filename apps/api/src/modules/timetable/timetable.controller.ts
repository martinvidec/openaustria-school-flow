import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Headers,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiHeader,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { TimetableService } from './timetable.service';
import { TimetableGateway } from './timetable.gateway';
import { StartSolveDto } from './dto/solve-request.dto';
import { SolveProgressDto } from './dto/solve-progress.dto';
import { SolveResultDto } from './dto/solve-result.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Admin-facing endpoints for timetable solve operations.
 * Protected by JWT auth + timetable permissions.
 */
@ApiTags('timetable')
@ApiBearerAuth()
@Controller('api/v1/schools/:schoolId/timetable')
export class TimetableController {
  constructor(private timetableService: TimetableService) {}

  @Post('solve')
  @HttpCode(HttpStatus.ACCEPTED)
  @CheckPermissions({ action: 'create', subject: 'timetable' })
  @ApiOperation({ summary: 'Start a new timetable solve run' })
  @ApiResponse({ status: 202, description: 'Solve run queued' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async startSolve(
    @Param('schoolId') schoolId: string,
    @Body() dto: StartSolveDto,
  ) {
    const run = await this.timetableService.startSolve(
      schoolId,
      dto.maxSolveSeconds,
      dto.constraintWeights,
    );
    return { runId: run.id, status: 'QUEUED' };
  }

  @Get('runs')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'List solve runs for a school (max 3, newest first)' })
  @ApiResponse({ status: 200, description: 'List of solve runs' })
  async findRuns(@Param('schoolId') schoolId: string) {
    return this.timetableService.findRuns(schoolId);
  }

  @Get('runs/:runId')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Get a single solve run with lessons' })
  @ApiResponse({ status: 200, description: 'Solve run details' })
  @ApiResponse({ status: 404, description: 'Run not found' })
  async findRun(@Param('runId') runId: string) {
    return this.timetableService.findRun(runId);
  }

  @Delete('runs/:runId/stop')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'timetable' })
  @ApiOperation({ summary: 'Stop a solve run early (use best-so-far)' })
  @ApiResponse({ status: 200, description: 'Solve stopped' })
  @ApiResponse({ status: 404, description: 'Run not found' })
  async stopSolve(@Param('runId') runId: string) {
    await this.timetableService.stopSolve(runId);
    return { runId, status: 'STOPPED' };
  }

  @Post('runs/:runId/activate')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'timetable' })
  @ApiOperation({ summary: 'Activate a completed solve run as the current timetable' })
  @ApiResponse({ status: 200, description: 'Run activated' })
  @ApiResponse({ status: 404, description: 'Run not found' })
  async activateRun(@Param('runId') runId: string) {
    await this.timetableService.activateRun(runId);
    return { runId, activated: true };
  }
}

/**
 * Internal callback endpoints for the Timefold sidecar.
 * Protected by shared secret (X-Solver-Secret header), NOT JWT.
 * These endpoints are @Public() to skip the global JwtAuthGuard.
 */
@ApiTags('solver-internal')
@Controller('api/internal/solver')
export class SolverCallbackController {
  private readonly solverSecret: string;

  constructor(
    private timetableService: TimetableService,
    private timetableGateway: TimetableGateway,
    private configService: ConfigService,
  ) {
    this.solverSecret = this.configService.get<string>('SOLVER_SHARED_SECRET', 'dev-secret');
  }

  /**
   * Validate the X-Solver-Secret header for internal auth.
   * Throws ForbiddenException if the secret doesn't match.
   */
  private validateSolverSecret(secret: string | undefined): void {
    if (!secret || secret !== this.solverSecret) {
      throw new ForbiddenException('Invalid solver secret');
    }
  }

  @Post('progress/:runId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Solver-Secret', description: 'Shared secret for internal sidecar auth' })
  @ApiOperation({ summary: 'Receive progress update from solver sidecar (internal)' })
  @ApiResponse({ status: 200, description: 'Progress received' })
  @ApiResponse({ status: 403, description: 'Invalid solver secret' })
  async handleProgress(
    @Param('runId') runId: string,
    @Body() progress: SolveProgressDto,
    @Headers('x-solver-secret') secret: string,
  ) {
    this.validateSolverSecret(secret);
    await this.timetableService.handleProgress(runId, progress);

    // Broadcast progress to connected WebSocket clients (D-08, TIME-06)
    const run = await this.timetableService.findRun(runId);
    this.timetableGateway.emitProgress(run.schoolId, progress);

    return { received: true };
  }

  @Post('complete/:runId')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiHeader({ name: 'X-Solver-Secret', description: 'Shared secret for internal sidecar auth' })
  @ApiOperation({ summary: 'Receive completion result from solver sidecar (internal)' })
  @ApiResponse({ status: 200, description: 'Completion received' })
  @ApiResponse({ status: 403, description: 'Invalid solver secret' })
  async handleCompletion(
    @Param('runId') runId: string,
    @Body() result: SolveResultDto,
    @Headers('x-solver-secret') secret: string,
  ) {
    this.validateSolverSecret(secret);
    await this.timetableService.handleCompletion(runId, result);

    // Broadcast completion to connected WebSocket clients (D-08, TIME-06)
    // NOTE: Only send lightweight summary -- full lesson list fetched via REST
    const run = await this.timetableService.findRun(runId);
    this.timetableGateway.emitComplete(run.schoolId, {
      runId: result.runId,
      status: result.status,
      hardScore: result.hardScore,
      softScore: result.softScore,
      elapsedSeconds: result.elapsedSeconds,
    });

    return { received: true };
  }
}
