import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { StudentListQueryDto } from './dto/student-list-query.dto';
import { AssignParentDto } from './dto/assign-parent.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentController {
  constructor(private studentService: StudentService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'student' })
  @ApiOperation({ summary: 'Create a new student with person record (optional parentIds link)' })
  @ApiResponse({ status: 201, description: 'Student created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateStudentDto) {
    return this.studentService.create(dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'student' })
  @ApiOperation({ summary: 'List students by school with filters + pagination' })
  @ApiQuery({ name: 'schoolId', required: true, type: String })
  @ApiQuery({ name: 'archived', required: false, enum: ['active', 'archived', 'all'] })
  @ApiQuery({ name: 'classId', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'schoolYearId', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of students' })
  async findAll(@Query() query: StudentListQueryDto) {
    return this.studentService.findAll(query);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'student' })
  @ApiOperation({ summary: 'Get a student by ID' })
  @ApiResponse({ status: 200, description: 'Student found' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async findOne(@Param('id') id: string) {
    return this.studentService.findOne(id);
  }

  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'student' })
  @ApiOperation({ summary: 'Update a student' })
  @ApiResponse({ status: 200, description: 'Student updated' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateStudentDto) {
    return this.studentService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'student' })
  @ApiOperation({
    summary:
      'Delete a student (Orphan-Guard refuses when ParentStudent / GroupMembership / AttendanceRecord / GradeEntry / StudentNote / AbsenceExcuse rows reference this student)',
  })
  @ApiResponse({ status: 204, description: 'Student deleted' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  @ApiResponse({ status: 409, description: 'Student has dependents (affectedEntities payload)' })
  async remove(@Param('id') id: string) {
    await this.studentService.remove(id);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'student' })
  @ApiOperation({ summary: 'Archive a student (sets isArchived=true, archivedAt=now)' })
  async archive(@Param('id') id: string) {
    return this.studentService.archive(id);
  }

  @Post(':id/restore')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'student' })
  @ApiOperation({ summary: 'Restore an archived student (clears isArchived + archivedAt)' })
  async restore(@Param('id') id: string) {
    return this.studentService.restore(id);
  }

  @Post(':id/parents')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'student' })
  @ApiOperation({ summary: 'Link an existing Parent to this student (idempotent)' })
  async linkParent(@Param('id') id: string, @Body() dto: AssignParentDto) {
    return this.studentService.linkParent(id, dto.parentId);
  }

  @Delete(':id/parents/:parentId')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'student' })
  @ApiOperation({ summary: 'Unlink a Parent from this student (Parent record preserved)' })
  async unlinkParent(@Param('id') id: string, @Param('parentId') parentId: string) {
    return this.studentService.unlinkParent(id, parentId);
  }

  // ---------------------------------------------------------------------------
  // Phase 13-01 Task 3 (USER-05) — Keycloak link mirror of teacher controller
  // ---------------------------------------------------------------------------

  @Patch(':id/keycloak-link')
  @CheckPermissions({ action: 'update', subject: 'student' })
  @ApiOperation({ summary: 'Link a Keycloak user to this student' })
  @ApiResponse({ status: 200, description: 'Student linked to Keycloak user' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async linkKeycloak(
    @Param('id') id: string,
    @Body() dto: { keycloakUserId: string },
  ) {
    return this.studentService.linkKeycloakUser(id, dto.keycloakUserId);
  }

  @Delete(':id/keycloak-link')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'update', subject: 'student' })
  @ApiOperation({ summary: 'Remove the Keycloak link on this student' })
  @ApiResponse({ status: 204, description: 'Keycloak link removed' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async unlinkKeycloak(@Param('id') id: string) {
    await this.studentService.unlinkKeycloakUser(id);
  }
}
