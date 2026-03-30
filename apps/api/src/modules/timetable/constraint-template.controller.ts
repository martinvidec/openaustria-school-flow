import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConstraintTemplateService } from './constraint-template.service';
import { CreateConstraintTemplateDto } from './dto/constraint-template.dto';
import { UpdateConstraintTemplateDto } from './dto/constraint-template.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

@ApiTags('constraint-templates')
@ApiBearerAuth()
@Controller('api/v1/schools/:schoolId/constraint-templates')
export class ConstraintTemplateController {
  constructor(private constraintTemplateService: ConstraintTemplateService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'timetable' })
  @ApiOperation({ summary: 'Create a new constraint template for a school' })
  @ApiResponse({ status: 201, description: 'Constraint template created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateConstraintTemplateDto,
  ) {
    return this.constraintTemplateService.create(schoolId, dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'List all constraint templates for a school' })
  @ApiResponse({ status: 200, description: 'List of constraint templates' })
  async findAll(@Param('schoolId') schoolId: string) {
    return this.constraintTemplateService.findAll(schoolId);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'timetable' })
  @ApiOperation({ summary: 'Get a constraint template by ID' })
  @ApiResponse({ status: 200, description: 'Constraint template found' })
  @ApiResponse({ status: 404, description: 'Constraint template not found' })
  async findOne(@Param('id') id: string) {
    return this.constraintTemplateService.findOne(id);
  }

  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'timetable' })
  @ApiOperation({ summary: 'Update a constraint template' })
  @ApiResponse({ status: 200, description: 'Constraint template updated' })
  @ApiResponse({ status: 404, description: 'Constraint template not found' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateConstraintTemplateDto,
  ) {
    return this.constraintTemplateService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'timetable' })
  @ApiOperation({ summary: 'Delete a constraint template' })
  @ApiResponse({ status: 204, description: 'Constraint template deleted' })
  @ApiResponse({ status: 404, description: 'Constraint template not found' })
  async remove(@Param('id') id: string) {
    await this.constraintTemplateService.remove(id);
  }
}
