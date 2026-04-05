import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import {
  CreateTeacherAbsenceDto,
  ListAbsencesQueryDto,
} from '../dto/teacher-absence.dto';
import { TeacherAbsenceService } from './teacher-absence.service';

/**
 * Teacher absence REST API — SUBST-01.
 *
 * Mounted under the project's established school-scoped URL pattern
 * `/schools/:schoolId/absences` (matches classbook/excuses, rooms, etc.).
 * The controller itself uses NON-prefixed @Controller because the global
 * prefix is configured once in main.ts as `api/v1`.
 */
@ApiTags('Substitution')
@ApiBearerAuth()
@Controller('schools/:schoolId/absences')
export class TeacherAbsenceController {
  constructor(private readonly service: TeacherAbsenceService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckPermissions({ action: 'manage', subject: 'substitution' })
  @ApiOperation({ summary: 'Create a teacher absence and fan out pending substitutions (SUBST-01)' })
  @ApiResponse({ status: 201, description: 'Absence created with affectedLessonCount populated' })
  @ApiResponse({ status: 400, description: 'Invalid date range or period bounds' })
  @ApiResponse({ status: 404, description: 'No active timetable run for school' })
  async create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateTeacherAbsenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.create({
      schoolId,
      teacherId: dto.teacherId,
      dateFrom: new Date(dto.dateFrom),
      dateTo: new Date(dto.dateTo),
      periodFrom: dto.periodFrom,
      periodTo: dto.periodTo,
      reason: dto.reason,
      note: dto.note,
      createdBy: user.id,
    });
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'substitution' })
  @ApiOperation({ summary: 'List absences for a school (SUBST-01)' })
  async list(
    @Param('schoolId') schoolId: string,
    @Query() query: ListAbsencesQueryDto,
  ) {
    return this.service.findManyForSchool(schoolId, {
      status: query.status,
      limit: query.limit,
      offset: query.offset,
    });
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'substitution' })
  @ApiOperation({ summary: 'Get a single absence by id' })
  async getOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'manage', subject: 'substitution' })
  @ApiOperation({ summary: 'Cancel an absence (status=CANCELLED, PENDING substitutions deleted, CONFIRMED kept for audit trail)' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.cancel(id, user.id);
  }
}
