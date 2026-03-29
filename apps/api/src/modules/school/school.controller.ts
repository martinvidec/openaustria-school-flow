import { Controller, Get, Post, Put, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SchoolService } from './school.service';
import { CreateSchoolDto } from './dto/create-school.dto';
import { UpdateSchoolDto } from './dto/update-school.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

@ApiTags('schools')
@ApiBearerAuth()
@Controller('schools')
export class SchoolController {
  constructor(private schoolService: SchoolService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'school' })
  @ApiOperation({ summary: 'Create a new school profile' })
  @ApiResponse({ status: 201, description: 'School created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateSchoolDto) {
    return this.schoolService.create(dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'school' })
  @ApiOperation({ summary: 'List all schools' })
  @ApiResponse({ status: 200, description: 'List of schools' })
  async findAll() {
    return this.schoolService.findAll();
  }

  @Get('templates')
  @CheckPermissions({ action: 'read', subject: 'school' })
  @ApiOperation({ summary: 'Get predefined Austrian school type templates' })
  @ApiResponse({ status: 200, description: 'List of templates' })
  async getTemplates() {
    return this.schoolService.getTemplates();
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'school' })
  @ApiOperation({ summary: 'Get a school by ID' })
  @ApiResponse({ status: 200, description: 'School found' })
  @ApiResponse({ status: 404, description: 'School not found' })
  async findOne(@Param('id') id: string) {
    return this.schoolService.findOne(id);
  }

  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'school' })
  @ApiOperation({ summary: 'Update a school profile' })
  @ApiResponse({ status: 200, description: 'School updated' })
  @ApiResponse({ status: 404, description: 'School not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.schoolService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'school' })
  @ApiOperation({ summary: 'Delete a school profile' })
  @ApiResponse({ status: 204, description: 'School deleted' })
  @ApiResponse({ status: 404, description: 'School not found' })
  async remove(@Param('id') id: string) {
    await this.schoolService.remove(id);
  }
}
