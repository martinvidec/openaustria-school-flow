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
import { TeacherService } from './teacher.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { UpdateTeacherDto } from './dto/update-teacher.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination.dto';

@ApiTags('teachers')
@ApiBearerAuth()
@Controller('teachers')
export class TeacherController {
  constructor(private teacherService: TeacherService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'teacher' })
  @ApiOperation({ summary: 'Create a new teacher with person record' })
  @ApiResponse({ status: 201, description: 'Teacher created with person record, qualifications, availability rules, and reductions' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateTeacherDto) {
    return this.teacherService.create(dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'teacher' })
  @ApiOperation({ summary: 'List teachers for a school with pagination' })
  @ApiQuery({ name: 'schoolId', required: true, description: 'Filter by school ID' })
  @ApiResponse({ status: 200, description: 'Paginated list of teachers' })
  async findAll(
    @Query('schoolId') schoolId: string,
    @Query() pagination: PaginationQueryDto,
  ) {
    return this.teacherService.findAll(schoolId, pagination);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'teacher' })
  @ApiOperation({ summary: 'Get a teacher by ID' })
  @ApiResponse({ status: 200, description: 'Teacher found' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async findOne(@Param('id') id: string) {
    return this.teacherService.findOne(id);
  }

  @Get(':id/capacity')
  @CheckPermissions({ action: 'read', subject: 'teacher' })
  @ApiOperation({ summary: 'Get teacher effective teaching capacity (Werteinheiten calculation)' })
  @ApiResponse({ status: 200, description: 'Effective capacity with Werteinheiten breakdown' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async getCapacity(@Param('id') id: string) {
    return this.teacherService.getEffectiveCapacity(id);
  }

  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'teacher' })
  @ApiOperation({ summary: 'Update a teacher profile, HR fields, qualifications, availability rules, or reductions' })
  @ApiResponse({ status: 200, description: 'Teacher updated' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateTeacherDto) {
    return this.teacherService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'teacher' })
  @ApiOperation({ summary: 'Delete a teacher and associated person record' })
  @ApiResponse({ status: 204, description: 'Teacher deleted' })
  @ApiResponse({ status: 404, description: 'Teacher not found' })
  async remove(@Param('id') id: string) {
    await this.teacherService.remove(id);
  }
}
