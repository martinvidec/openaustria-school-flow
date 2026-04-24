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
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ParentService } from './parent.service';
import { CreateParentDto } from './dto/create-parent.dto';
import { UpdateParentDto } from './dto/update-parent.dto';
import { ParentListQueryDto } from './dto/parent-list-query.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';

@ApiTags('parents')
@ApiBearerAuth()
@Controller('parents')
export class ParentController {
  constructor(private service: ParentService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'parent' })
  @ApiOperation({ summary: 'Create a new parent with person record (personType=PARENT)' })
  @ApiResponse({ status: 201, description: 'Parent created' })
  async create(@Body() dto: CreateParentDto) {
    return this.service.create(dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'parent' })
  @ApiOperation({ summary: 'List parents by school with optional email/name filter' })
  async findAll(@Query() query: ParentListQueryDto) {
    return this.service.findAll(query);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'parent' })
  @ApiOperation({ summary: 'Get a parent by ID with nested children students' })
  async findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'parent' })
  @ApiOperation({ summary: 'Update parent stammdaten (via nested Person update)' })
  async update(@Param('id') id: string, @Body() dto: UpdateParentDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'parent' })
  @ApiOperation({ summary: 'Delete a parent (Orphan-Guard if linked to students)' })
  @ApiResponse({ status: 409, description: 'Parent is linked to one or more students' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
  }
}
