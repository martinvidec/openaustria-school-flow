import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
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
  ApiQuery,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { TimetableService } from './timetable.service';
import { TimetableExportService } from './timetable-export.service';
import { TimetableGateway } from './timetable.gateway';
import { StartSolveDto } from './dto/solve-request.dto';
import { SolveProgressDto } from './dto/solve-progress.dto';
import { SolveResultDto } from './dto/solve-result.dto';
import { TimetableViewQueryDto, TimetableViewResponseDto } from './dto/timetable-view.dto';
import { ValidateMoveDto, MoveValidationResponseDto } from './dto/validate-move.dto';
import { MoveLessonDto } from './dto/move-lesson.dto';
import { TimetableEditService } from './timetable-edit.service';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { Public } from '../auth/decorators/public.decorator';

/**
 * Admin-facing endpoints for timetable solve operations.
 * Protected by JWT auth + timetable permissions.
 */
@ApiTags('timetable')
@ApiBearerAuth()
@Controller('schools/:schoolId/timetable')
export class TimetableController {
  constructor(
    private timetableService: TimetableService,
    private timetableEditService: TimetableEditService,
    private timetableExportService: TimetableExportService,
  ) {}

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

  /**
   * GET /api/v1/schools/:schoolId/timetable/runs/:runId/violations
   * Returns grouped constraint violations for a completed/stopped run (D-10, TIME-07).
   * When hard constraints remain (hardScore < 0), this explains WHY the
   * timetable is infeasible and which constraints conflict.
   *
   * Response: ViolationGroupDto[]
   * Each group contains:
   *   - type: constraint name (e.g., "Teacher conflict", "Room double-booking")
   *   - count: number of violations
   *   - examples: human-readable entity references
   */
  @Get('runs/:runId/violations')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Get grouped constraint violations for a solve run' })
  @ApiResponse({ status: 200, description: 'Violation groups' })
  @ApiResponse({ status: 404, description: 'Run not found' })
  async getViolations(@Param('runId') runId: string) {
    return this.timetableService.getViolations(runId);
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

  @Get('view')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Get timetable view with joined subject/teacher/room data' })
  @ApiQuery({ name: 'perspective', enum: ['teacher', 'class', 'room'] })
  @ApiQuery({ name: 'perspectiveId', type: String })
  @ApiQuery({ name: 'weekType', enum: ['A', 'B', 'BOTH'], required: false })
  @ApiResponse({ status: 200, description: 'Timetable view', type: TimetableViewResponseDto })
  async getView(
    @Param('schoolId') schoolId: string,
    @Query() query: TimetableViewQueryDto,
  ): Promise<TimetableViewResponseDto> {
    return this.timetableService.getView(schoolId, query);
  }

  @Post('validate-move')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'timetable' })
  @ApiOperation({ summary: 'Validate a lesson move against constraints without modifying data' })
  @ApiResponse({ status: 200, description: 'Validation result', type: MoveValidationResponseDto })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async validateMove(
    @Param('schoolId') schoolId: string,
    @Body() dto: ValidateMoveDto,
  ): Promise<MoveValidationResponseDto> {
    return this.timetableEditService.validateMove(schoolId, dto);
  }

  @Patch('lessons/:lessonId/move')
  @CheckPermissions({ action: 'update', subject: 'timetable' })
  @ApiOperation({ summary: 'Move a lesson to a new time slot (with constraint validation)' })
  @ApiResponse({ status: 200, description: 'Lesson moved successfully' })
  @ApiResponse({ status: 400, description: 'Move violates hard constraints' })
  @ApiResponse({ status: 404, description: 'Lesson not found' })
  async moveLesson(
    @Param('schoolId') schoolId: string,
    @Param('lessonId') lessonId: string,
    @Body() dto: MoveLessonDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timetableEditService.moveLesson(schoolId, lessonId, dto, user.id);
  }

  @Get('runs/:runId/edit-history')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Get edit history for a timetable run' })
  @ApiResponse({ status: 200, description: 'Edit history entries' })
  async getEditHistory(@Param('runId') runId: string) {
    return this.timetableEditService.getEditHistory(runId);
  }

  @Post('runs/:runId/revert/:editId')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'timetable' })
  @ApiOperation({ summary: 'Revert timetable to a specific edit point' })
  @ApiResponse({ status: 200, description: 'Revert successful' })
  @ApiResponse({ status: 404, description: 'Edit record not found' })
  async revertToEdit(
    @Param('runId') runId: string,
    @Param('editId') editId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.timetableEditService.revertToEdit(runId, editId, user.id);
    return { reverted: true, runId, revertedToEditId: editId };
  }

  @Get('export/pdf')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Export timetable as PDF' })
  @ApiQuery({ name: 'perspective', enum: ['teacher', 'class', 'room'] })
  @ApiQuery({ name: 'perspectiveId', type: String })
  @ApiQuery({ name: 'weekType', enum: ['A', 'B', 'BOTH'], required: false })
  @ApiResponse({ status: 200, description: 'PDF file download' })
  async exportPdf(
    @Param('schoolId') schoolId: string,
    @Query('perspective') perspective: string,
    @Query('perspectiveId') perspectiveId: string,
    @Query('weekType') weekType: string | undefined,
    @Res() res: { header: (key: string, value: string) => void; send: (data: unknown) => void },
  ) {
    const buffer = await this.timetableExportService.exportPdf(
      schoolId,
      perspective,
      perspectiveId,
      weekType,
    );
    const filename = `stundenplan-${perspective}-${new Date().toISOString().split('T')[0]}.pdf`;
    res.header('Content-Type', 'application/pdf');
    res.header('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  @Get('export/ical')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Export timetable as iCal (.ics)' })
  @ApiQuery({ name: 'perspective', enum: ['teacher', 'class', 'room'] })
  @ApiQuery({ name: 'perspectiveId', type: String })
  @ApiQuery({ name: 'weekType', enum: ['A', 'B', 'BOTH'], required: false })
  @ApiResponse({ status: 200, description: 'iCal file download' })
  async exportIcal(
    @Param('schoolId') schoolId: string,
    @Query('perspective') perspective: string,
    @Query('perspectiveId') perspectiveId: string,
    @Query('weekType') weekType: string | undefined,
    @Res() res: { header: (key: string, value: string) => void; send: (data: unknown) => void },
  ) {
    const icalString = await this.timetableExportService.exportIcal(
      schoolId,
      perspective,
      perspectiveId,
      weekType,
    );
    res.header('Content-Type', 'text/calendar; charset=utf-8');
    res.header('Content-Disposition', 'attachment; filename="stundenplan.ics"');
    res.send(icalString);
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
