import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ExamService } from './exam.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

/**
 * HW-02 / HW-03 -- Exam CRUD REST endpoints with collision detection.
 *
 * Mounted at /api/v1/schools/:schoolId/exams (global prefix adds /api).
 * Path: schools/:schoolId/exams
 *
 * D-03: collision-check endpoint returns soft warning (not hard block).
 * POST returns { exam, collision } so frontend can show inline warning.
 */
@ApiTags('exams')
@ApiBearerAuth()
@Controller('schools/:schoolId/exams')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  /**
   * POST /schools/:schoolId/exams
   * Create a new exam. Returns exam + collision info for inline warning.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckPermissions({ action: 'create', subject: 'exam' })
  @ApiOperation({ summary: 'Create exam with collision detection (D-03 soft warning)' })
  @ApiResponse({ status: 201, description: 'Exam created with optional collision info' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateExamDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.examService.create(schoolId, dto, user.id);
  }

  /**
   * GET /schools/:schoolId/exams
   * List exams, optionally filtered by classId.
   */
  @Get()
  @CheckPermissions({ action: 'read', subject: 'exam' })
  @ApiOperation({ summary: 'List exams for a school' })
  @ApiQuery({ name: 'classId', required: false, description: 'Filter by class' })
  @ApiQuery({ name: 'classSubjectId', required: false, description: 'Filter by class subject' })
  @ApiResponse({ status: 200, description: 'List of exams' })
  async findAll(
    @Query('classId') classId?: string,
    @Query('classSubjectId') classSubjectId?: string,
  ) {
    if (classId) {
      return this.examService.findByClass(classId);
    }
    if (classSubjectId) {
      return this.examService.findByClassSubject(classSubjectId);
    }
    // Without filters, return empty -- callers should provide a filter
    return [];
  }

  /**
   * GET /schools/:schoolId/exams/collision-check
   * Check for exam collisions on a given date for a class.
   * Returns { hasCollision, existingExam? }.
   */
  @Get('collision-check')
  @CheckPermissions({ action: 'read', subject: 'exam' })
  @ApiOperation({ summary: 'Check exam collision for a class on a date (D-03)' })
  @ApiQuery({ name: 'classId', required: true })
  @ApiQuery({ name: 'date', required: true, description: 'ISO date string' })
  @ApiQuery({ name: 'excludeId', required: false, description: 'Exam ID to exclude from check' })
  @ApiResponse({ status: 200, description: 'Collision check result' })
  async checkCollision(
    @Query('classId') classId: string,
    @Query('date') date: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.examService.checkCollision(classId, date, excludeId);
  }

  /**
   * GET /schools/:schoolId/exams/:id
   * Get a single exam by ID.
   */
  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'exam' })
  @ApiOperation({ summary: 'Get exam by ID' })
  @ApiResponse({ status: 200, description: 'Exam details' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async findOne(@Param('id') id: string) {
    return this.examService.findOne(id);
  }

  /**
   * PUT /schools/:schoolId/exams/:id
   * Update an exam. Re-checks collision if date changed.
   */
  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'exam' })
  @ApiOperation({ summary: 'Update exam (re-checks collision on date change)' })
  @ApiResponse({ status: 200, description: 'Exam updated with optional collision info' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateExamDto,
  ) {
    return this.examService.update(id, dto);
  }

  /**
   * DELETE /schools/:schoolId/exams/:id
   * Delete an exam.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'exam' })
  @ApiOperation({ summary: 'Delete exam' })
  @ApiResponse({ status: 204, description: 'Exam deleted' })
  @ApiResponse({ status: 404, description: 'Exam not found' })
  async remove(@Param('id') id: string) {
    await this.examService.delete(id);
  }
}
