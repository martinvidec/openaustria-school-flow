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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubjectService } from './subject.service';
import { StundentafelTemplateService } from './stundentafel-template.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { UpdateSubjectDto } from './dto/update-subject.dto';
import { ApplyStundentafelDto } from './dto/apply-stundentafel.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('subjects')
@ApiBearerAuth()
@Controller('subjects')
export class SubjectController {
  constructor(
    private subjectService: SubjectService,
    private stundentafelTemplateService: StundentafelTemplateService,
  ) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'subject' })
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({ status: 201, description: 'Subject created' })
  @ApiResponse({ status: 409, description: 'Duplicate shortName for this school' })
  async create(@Body() dto: CreateSubjectDto) {
    return this.subjectService.create(dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'subject' })
  @ApiOperation({ summary: 'List subjects by school, paginated' })
  @ApiResponse({ status: 200, description: 'Paginated list of subjects' })
  @ApiQuery({ name: 'schoolId', required: true, type: String })
  async findAll(
    @Query('schoolId') schoolId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.subjectService.findAll(schoolId, {
      skip: pagination.skip,
      limit: pagination.limit,
    });
  }

  @Get('templates')
  @CheckPermissions({ action: 'read', subject: 'subject' })
  @ApiOperation({ summary: 'List all available Stundentafel templates' })
  @ApiResponse({ status: 200, description: 'List of Stundentafel templates' })
  getTemplates() {
    return this.stundentafelTemplateService.getTemplates();
  }

  @Get('templates/:schoolType')
  @CheckPermissions({ action: 'read', subject: 'subject' })
  @ApiOperation({ summary: 'Get Stundentafel templates for a specific school type' })
  @ApiResponse({ status: 200, description: 'Templates for school type' })
  getTemplatesBySchoolType(@Param('schoolType') schoolType: string) {
    return this.stundentafelTemplateService.getTemplatesForSchoolType(schoolType);
  }

  @Post('apply-template')
  @CheckPermissions({ action: 'create', subject: 'subject' })
  @ApiOperation({ summary: 'Apply a Stundentafel template to a class' })
  @ApiResponse({ status: 201, description: 'Template applied successfully' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  async applyTemplate(@Body() dto: ApplyStundentafelDto) {
    return this.stundentafelTemplateService.applyTemplate(
      dto.schoolId,
      dto.classId,
      dto.schoolType,
      dto.yearLevel,
    );
  }

  @Get('by-class/:classId')
  @CheckPermissions({ action: 'read', subject: 'subject' })
  @ApiOperation({ summary: 'List all subjects for a class with weekly hours' })
  @ApiResponse({ status: 200, description: 'Subjects for the class' })
  async getClassSubjects(@Param('classId') classId: string) {
    return this.subjectService.getClassSubjects(classId);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'subject' })
  @ApiOperation({ summary: 'Get a subject by ID' })
  @ApiResponse({ status: 200, description: 'Subject found' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async findOne(@Param('id') id: string) {
    return this.subjectService.findOne(id);
  }

  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'subject' })
  @ApiOperation({ summary: 'Update a subject' })
  @ApiResponse({ status: 200, description: 'Subject updated' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateSubjectDto) {
    return this.subjectService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'subject' })
  @ApiOperation({ summary: 'Delete a subject' })
  @ApiResponse({ status: 204, description: 'Subject deleted' })
  @ApiResponse({ status: 404, description: 'Subject not found' })
  async remove(@Param('id') id: string) {
    await this.subjectService.remove(id);
  }

  @Post(':id/classes')
  @CheckPermissions({ action: 'create', subject: 'subject' })
  @ApiOperation({ summary: 'Add a subject to a class with weekly hours' })
  @ApiResponse({ status: 201, description: 'Subject added to class' })
  async addToClass(
    @Param('id') id: string,
    @Body() body: { classId: string; weeklyHours: number; groupId?: string },
  ) {
    return this.subjectService.addToClass(id, body.classId, body.weeklyHours, body.groupId);
  }

  @Delete(':id/classes/:classId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'subject' })
  @ApiOperation({ summary: 'Remove a subject from a class' })
  @ApiResponse({ status: 204, description: 'Subject removed from class' })
  @ApiResponse({ status: 404, description: 'Class-subject assignment not found' })
  async removeFromClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
  ) {
    await this.subjectService.removeFromClass(id, classId);
  }
}
