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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CreateSchoolYearDto } from './dto/create-school-year.dto';
import { UpdateSchoolYearDto } from './dto/update-school-year.dto';
import { SchoolYearService } from './school-year.service';

@ApiTags('school-years')
@ApiBearerAuth()
@Controller('schools/:schoolId/school-years')
export class SchoolYearController {
  constructor(private schoolYearService: SchoolYearService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'school-year' })
  @ApiOperation({ summary: 'Create a school year scoped to the school (D-07 plural years).' })
  @ApiResponse({ status: 201, description: 'School year created' })
  async create(@Param('schoolId') schoolId: string, @Body() dto: CreateSchoolYearDto) {
    return this.schoolYearService.create(schoolId, dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'school-year' })
  @ApiOperation({ summary: 'List all school years for a school (ordered by startDate desc).' })
  @ApiResponse({ status: 200, description: 'List of school years' })
  async findAll(@Param('schoolId') schoolId: string) {
    return this.schoolYearService.findAll(schoolId);
  }

  @Patch(':yearId')
  @CheckPermissions({ action: 'update', subject: 'school-year' })
  @ApiOperation({ summary: 'Update a school year (partial update).' })
  @ApiResponse({ status: 200, description: 'School year updated' })
  @ApiResponse({ status: 404, description: 'School year not found' })
  async update(
    @Param('schoolId') _schoolId: string,
    @Param('yearId') yearId: string,
    @Body() dto: UpdateSchoolYearDto,
  ) {
    return this.schoolYearService.update(yearId, dto);
  }

  @Post(':yearId/activate')
  @HttpCode(HttpStatus.OK)
  @CheckPermissions({ action: 'activate', subject: 'school-year' })
  @ApiOperation({ summary: 'Activate the target school year (atomic swap via $transaction, D-07).' })
  @ApiResponse({ status: 200, description: 'Target year activated; previous active year (if any) flipped to inactive' })
  async activate(@Param('schoolId') schoolId: string, @Param('yearId') yearId: string) {
    return this.schoolYearService.activate(schoolId, yearId);
  }

  @Delete(':yearId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'school-year' })
  @ApiOperation({ summary: 'Delete a school year (D-10 orphan-guard).' })
  @ApiResponse({ status: 204, description: 'School year deleted' })
  @ApiResponse({ status: 404, description: 'School year not found' })
  @ApiResponse({ status: 409, description: 'Year is active or has referencing rows — body carries referenceCount' })
  async remove(@Param('schoolId') _schoolId: string, @Param('yearId') yearId: string) {
    await this.schoolYearService.remove(yearId);
  }
}
