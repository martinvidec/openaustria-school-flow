import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ClassService } from './class.service';
import { ClassSubjectService } from './class-subject.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassListQueryDto } from './dto/class-list-query.dto';
import { ApplyStundentafelDto } from './dto/apply-stundentafel.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassController {
  constructor(
    private classService: ClassService,
    private classSubjectService: ClassSubjectService,
  ) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'class' })
  @ApiOperation({ summary: 'Create a new school class (Stammklasse)' })
  @ApiResponse({ status: 201, description: 'Class created' })
  @ApiResponse({ status: 409, description: 'Class name already exists for this school year' })
  async create(@Body() dto: CreateClassDto) {
    return this.classService.create(dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'class' })
  @ApiOperation({
    summary:
      'List classes filtered by school, schoolYearId, yearLevels, name substring (Phase 12-02 filters).',
  })
  @ApiQuery({ name: 'schoolId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of classes' })
  async findAll(@Query() query: ClassListQueryDto) {
    return this.classService.findAll(query);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'class' })
  @ApiOperation({ summary: 'Get a class with full details (students, groups, subjects)' })
  @ApiResponse({ status: 200, description: 'Class found' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async findOne(@Param('id') id: string) {
    return this.classService.findOne(id);
  }

  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Update a class (name, yearLevel, klassenvorstandId)' })
  @ApiResponse({ status: 200, description: 'Class updated' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'class' })
  @ApiOperation({
    summary:
      'Delete a class. Refuses 409 when dependencies exist (RFC 9457 extensions.affectedEntities — D-13.4).',
  })
  @ApiResponse({ status: 204, description: 'Class deleted' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  @ApiResponse({
    status: 409,
    description:
      'Class has dependents (active students, groups, subjects, lessons, derivation rules)',
  })
  async remove(@Param('id') id: string) {
    await this.classService.remove(id);
  }

  @Post(':id/students')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Assign a student to this class (Stammklasse)' })
  @ApiResponse({ status: 200, description: 'Student assigned' })
  async assignStudent(@Param('id') classId: string, @Body() body: { studentId: string }) {
    return this.classService.assignStudent(classId, body.studentId);
  }

  @Delete(':id/students/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Remove a student from this class' })
  async removeStudent(
    @Param('id') classId: string,
    @Param('studentId') studentId: string,
  ) {
    await this.classService.removeStudent(classId, studentId);
  }

  @Post(':id/apply-stundentafel')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({
    summary:
      'Apply an Austrian Stundentafel template to this class (CLASS-03, D-09).',
  })
  @ApiResponse({ status: 200, description: 'Stundentafel applied (ClassSubject rows created)' })
  @ApiResponse({ status: 409, description: 'Stundentafel already exists for this class' })
  async applyStundentafel(
    @Param('id') id: string,
    @Body() dto: ApplyStundentafelDto,
  ) {
    return this.classSubjectService.applyStundentafel(id, dto.schoolType);
  }

  @Post(':id/reset-stundentafel')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({
    summary:
      'Reset Stundentafel — delete all ClassSubject rows then re-apply template atomically (CLASS-03, D-09).',
  })
  @ApiResponse({ status: 200, description: 'Stundentafel reset' })
  async resetStundentafel(
    @Param('id') id: string,
    @Body() dto: ApplyStundentafelDto,
  ) {
    return this.classSubjectService.resetStundentafel(id, dto.schoolType);
  }
}
