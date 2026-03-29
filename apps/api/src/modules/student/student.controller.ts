import { Controller, Get, Post, Put, Delete, Body, Param, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { StudentService } from './student.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('students')
@ApiBearerAuth()
@Controller('students')
export class StudentController {
  constructor(private studentService: StudentService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'student' })
  @ApiOperation({ summary: 'Create a new student with person record' })
  @ApiResponse({ status: 201, description: 'Student created' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateStudentDto) {
    return this.studentService.create(dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'student' })
  @ApiOperation({ summary: 'List students by school, paginated' })
  @ApiQuery({ name: 'schoolId', required: true, type: String })
  @ApiResponse({ status: 200, description: 'Paginated list of students' })
  async findAll(@Query('schoolId') schoolId: string, @Query() pagination: PaginationQueryDto) {
    return this.studentService.findAll(schoolId, pagination);
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
  @ApiOperation({ summary: 'Delete a student and associated person' })
  @ApiResponse({ status: 204, description: 'Student deleted' })
  @ApiResponse({ status: 404, description: 'Student not found' })
  async remove(@Param('id') id: string) {
    await this.studentService.remove(id);
  }
}
