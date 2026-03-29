import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { RetentionService } from './retention.service';
import { CreateRetentionPolicyDto } from './dto/create-retention-policy.dto';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';

@ApiTags('dsgvo-retention')
@ApiBearerAuth()
@Controller('dsgvo/retention')
export class RetentionController {
  constructor(private retentionService: RetentionService) {}

  @Post()
  @CheckPermissions({ action: 'create', subject: 'retention' })
  @ApiOperation({ summary: 'Create a retention policy override for a school' })
  @ApiResponse({ status: 201, description: 'Retention policy created' })
  @ApiResponse({ status: 409, description: 'Duplicate retention policy for category' })
  async create(@Body() dto: CreateRetentionPolicyDto) {
    return this.retentionService.create(dto);
  }

  @Get('school/:schoolId')
  @CheckPermissions({ action: 'read', subject: 'retention' })
  @ApiOperation({ summary: 'List all retention policies for a school' })
  @ApiResponse({ status: 200, description: 'Retention policies returned' })
  async findBySchool(@Param('schoolId') schoolId: string) {
    return this.retentionService.findBySchool(schoolId);
  }

  @Put(':id')
  @CheckPermissions({ action: 'update', subject: 'retention' })
  @ApiOperation({ summary: 'Update retention period for a policy' })
  @ApiResponse({ status: 200, description: 'Retention policy updated' })
  @ApiResponse({ status: 404, description: 'Retention policy not found' })
  async update(@Param('id') id: string, @Body('retentionDays') retentionDays: number) {
    return this.retentionService.update(id, retentionDays);
  }

  @Delete(':id')
  @CheckPermissions({ action: 'delete', subject: 'retention' })
  @ApiOperation({ summary: 'Remove a retention policy override (reverts to system default)' })
  @ApiResponse({ status: 200, description: 'Retention policy removed' })
  @ApiResponse({ status: 404, description: 'Retention policy not found' })
  async remove(@Param('id') id: string) {
    return this.retentionService.remove(id);
  }

  @Get('school/:schoolId/check')
  @CheckPermissions({ action: 'read', subject: 'retention' })
  @ApiOperation({ summary: 'Check for expired records based on retention policies' })
  @ApiResponse({ status: 200, description: 'Expired record info returned' })
  async checkExpired(@Param('schoolId') schoolId: string) {
    return this.retentionService.checkExpiredRecords(schoolId);
  }
}
