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
import { TimetableConflictService } from './timetable-conflict.service';
import { TimetableDiagnosticsService } from './timetable-diagnostics.service';
import { ResolveConflictDto } from './dto/resolve-conflict.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { Public } from '../auth/decorators/public.decorator';
import { CONSTRAINT_CATALOG } from './constraint-catalog';

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
    private timetableConflictService: TimetableConflictService,
    private timetableDiagnosticsService: TimetableDiagnosticsService,
  ) {}

  /**
   * GET /api/v1/schools/:schoolId/timetable/feasibility
   * Issue #177-D: pre-solve dimensioning check — compares demanded weekly
   * lesson hours against time-grid / teacher / room capacity and returns
   * warnings (so the admin sees over-dimensioning before starting the solver).
   */
  @Get('feasibility')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Pre-solve feasibility / dimensioning check' })
  @ApiResponse({ status: 200, description: 'Feasibility report' })
  async getFeasibility(@Param('schoolId') schoolId: string) {
    return this.timetableDiagnosticsService.getFeasibility(schoolId);
  }

  /**
   * GET /api/v1/schools/:schoolId/timetable/runs/:runId/report
   * Issue #177-D: post-run overview — teacher/room utilization, per-class
   * lesson distribution, and the hardest remaining constraints.
   */
  @Get('runs/:runId/report')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Post-run solve report (utilization + distribution)' })
  @ApiResponse({ status: 200, description: 'Solve report' })
  @ApiResponse({ status: 404, description: 'Run not found' })
  async getReport(@Param('runId') runId: string) {
    return this.timetableDiagnosticsService.getReport(runId);
  }

  @Get('constraint-catalog')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Get the static catalog of all 16 solver constraints (7 HARD + 9 SOFT)' })
  @ApiResponse({ status: 200, description: 'Constraint catalog' })
  getConstraintCatalog() {
    return CONSTRAINT_CATALOG;
  }

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

  /**
   * GET /api/v1/schools/:schoolId/timetable/runs/:runId/conflicts
   * Issue #177-B: lists the lessons dropped during persistence because they
   * would break the teacher/room slot-uniqueness (the actionable conflicts
   * behind a COMPLETED_WITH_CONFLICTS run). Foundation for the manual
   * resolution UX (#177-C).
   *
   * Response: TimetableConflict[] (denormalized labels included).
   */
  @Get('runs/:runId/conflicts')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Get unpersistable slot conflicts for a solve run' })
  @ApiResponse({ status: 200, description: 'Timetable conflicts' })
  @ApiResponse({ status: 404, description: 'Run not found' })
  async getConflicts(@Param('runId') runId: string) {
    return this.timetableService.getConflicts(runId);
  }

  /**
   * GET /api/v1/schools/:schoolId/timetable/runs/:runId/conflicts/:conflictId/suggestions
   * Issue #177-C: resolution options for one conflict — free qualified
   * teachers / free compatible rooms at the original slot, plus free slots
   * elsewhere. Drives the resolution dialog.
   */
  @Get('runs/:runId/conflicts/:conflictId/suggestions')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Get resolution suggestions for a timetable conflict' })
  @ApiResponse({ status: 200, description: 'Suggestions (resources + free slots)' })
  @ApiResponse({ status: 404, description: 'Conflict not found' })
  async getConflictSuggestions(
    @Param('runId') runId: string,
    @Param('conflictId') conflictId: string,
  ) {
    return this.timetableConflictService.getSuggestions(runId, conflictId);
  }

  /**
   * POST /api/v1/schools/:schoolId/timetable/runs/:runId/conflicts/:conflictId/resolve
   * Issue #177-C: apply a resolution (cancel / reassign-resource / move-slot)
   * atomically. Flips the run back to COMPLETED once the last OPEN conflict is
   * resolved.
   */
  @Post('runs/:runId/conflicts/:conflictId/resolve')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'timetable' })
  @ApiOperation({ summary: 'Resolve a timetable conflict' })
  @ApiResponse({ status: 200, description: 'Conflict resolved' })
  @ApiResponse({ status: 400, description: 'Invalid resolution payload' })
  @ApiResponse({ status: 404, description: 'Conflict not found' })
  @ApiResponse({ status: 409, description: 'Target slot/resource is no longer free' })
  async resolveConflict(
    @Param('runId') runId: string,
    @Param('conflictId') conflictId: string,
    @Body() dto: ResolveConflictDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.timetableConflictService.resolveConflict(
      runId,
      conflictId,
      dto,
      user.id,
    );
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
