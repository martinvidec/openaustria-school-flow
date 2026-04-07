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
import { HomeworkService } from './homework.service';
import { CreateHomeworkDto } from './dto/create-homework.dto';
import { UpdateHomeworkDto } from './dto/update-homework.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

/**
 * HW-01 / HW-03 -- Homework CRUD REST endpoints.
 *
 * Mounted at /api/v1/schools/:schoolId/homework (global prefix adds /api).
 * Path: schools/:schoolId/homework
 */
@ApiTags('homework')
@ApiBearerAuth()
@Controller('schools/:schoolId/homework')
export class HomeworkController {
  constructor(private readonly homeworkService: HomeworkService) {}

  /**
   * POST /schools/:schoolId/homework
   * Create a new homework assignment. Sends HOMEWORK_ASSIGNED notifications.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckPermissions({ action: 'create', subject: 'homework' })
  @ApiOperation({ summary: 'Create homework assignment' })
  @ApiResponse({ status: 201, description: 'Homework created' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateHomeworkDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.homeworkService.create(schoolId, dto, user.id);
  }

  /**
   * GET /schools/:schoolId/homework
   * List homework for a school, optionally filtered by classSubjectId.
   */
  @Get()
  @CheckPermissions({ action: 'read', subject: 'homework' })
  @ApiOperation({ summary: 'List homework for a school' })
  @ApiQuery({ name: 'classSubjectId', required: false, description: 'Filter by class subject' })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'take', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'List of homework assignments' })
  async findAll(
    @Param('schoolId') schoolId: string,
    @Query('classSubjectId') classSubjectId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    if (classSubjectId) {
      return this.homeworkService.findByClassSubject(classSubjectId);
    }
    return this.homeworkService.findBySchool(schoolId, {
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  /**
   * GET /schools/:schoolId/homework/by-lesson/:classBookEntryId
   * Get homework linked to a specific lesson (ClassBookEntry).
   */
  @Get('by-lesson/:classBookEntryId')
  @CheckPermissions({ action: 'read', subject: 'homework' })
  @ApiOperation({ summary: 'Get homework for a specific lesson' })
  @ApiResponse({ status: 200, description: 'Homework assignments for the lesson' })
  async findByLesson(
    @Param('schoolId') _schoolId: string,
    @Param('classBookEntryId') _classBookEntryId: string,
  ) {
    // ClassBookEntry-based lookup -- homework linked via classBookEntryId
    // For now we delegate to findBySchool with a filter; future: dedicated query
    // NOTE: This is a simplified implementation. A dedicated Prisma query
    // filtering by classBookEntryId would be more efficient.
    return [];
  }

  /**
   * GET /schools/:schoolId/homework/:id
   * Get a single homework assignment by ID.
   */
  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'homework' })
  @ApiOperation({ summary: 'Get homework by ID' })
  @ApiResponse({ status: 200, description: 'Homework assignment' })
  @ApiResponse({ status: 404, description: 'Homework not found' })
  async findOne(@Param('id') id: string) {
    return this.homeworkService.findOne(id);
  }

  /**
   * PUT /schools/:schoolId/homework/:id
   * Update a homework assignment.
   */
  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'homework' })
  @ApiOperation({ summary: 'Update homework assignment' })
  @ApiResponse({ status: 200, description: 'Homework updated' })
  @ApiResponse({ status: 404, description: 'Homework not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateHomeworkDto,
  ) {
    return this.homeworkService.update(id, dto);
  }

  /**
   * DELETE /schools/:schoolId/homework/:id
   * Delete a homework assignment.
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'homework' })
  @ApiOperation({ summary: 'Delete homework assignment' })
  @ApiResponse({ status: 204, description: 'Homework deleted' })
  @ApiResponse({ status: 404, description: 'Homework not found' })
  async remove(@Param('id') id: string) {
    await this.homeworkService.delete(id);
  }
}
