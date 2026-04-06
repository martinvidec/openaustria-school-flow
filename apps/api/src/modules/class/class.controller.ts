import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { SchoolPaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('classes')
@ApiBearerAuth()
@Controller('classes')
export class ClassController {
  constructor(private classService: ClassService) {}

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
  @ApiOperation({ summary: 'List classes by school, paginated' })
  @ApiQuery({ name: 'schoolId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of classes' })
  async findAll(@Query() query: SchoolPaginationQueryDto) {
    return this.classService.findAll(query.schoolId!, query);
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
  @ApiOperation({ summary: 'Update a class (name, yearLevel)' })
  @ApiResponse({ status: 200, description: 'Class updated' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'class' })
  @ApiOperation({ summary: 'Delete a class (cascades groups, students get unassigned)' })
  @ApiResponse({ status: 204, description: 'Class deleted' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async remove(@Param('id') id: string) {
    await this.classService.remove(id);
  }

  @Post(':id/students')
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Assign a student to this class (Stammklasse)' })
  @ApiResponse({ status: 200, description: 'Student assigned' })
  @ApiResponse({ status: 404, description: 'Class not found' })
  async assignStudent(@Param('id') classId: string, @Body() body: { studentId: string }) {
    return this.classService.assignStudent(classId, body.studentId);
  }

  @Delete(':id/students/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'update', subject: 'class' })
  @ApiOperation({ summary: 'Remove a student from this class' })
  @ApiResponse({ status: 204, description: 'Student removed from class' })
  @ApiResponse({ status: 404, description: 'Class or student not found' })
  async removeStudent(@Param('id') classId: string, @Param('studentId') studentId: string) {
    await this.classService.removeStudent(classId, studentId);
  }
}
