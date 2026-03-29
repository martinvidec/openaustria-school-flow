import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DataDeletionService } from './data-deletion.service';
import { RequestDeletionDto } from './dto/request-deletion.dto';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';

@ApiTags('dsgvo/deletion')
@ApiBearerAuth()
@Controller('dsgvo/deletion')
export class DataDeletionController {
  constructor(private dataDeletionService: DataDeletionService) {}

  @Post()
  @CheckPermissions({ action: 'delete', subject: 'person' })
  @ApiOperation({ summary: 'Request data deletion (anonymization) for a person' })
  @ApiResponse({ status: 201, description: 'Deletion job queued' })
  @ApiResponse({ status: 409, description: 'Person already anonymized or deletion in progress' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async requestDeletion(@Body() dto: RequestDeletionDto) {
    return this.dataDeletionService.requestDeletion(dto);
  }

  @Get(':id')
  @CheckPermissions({ action: 'delete', subject: 'person' })
  @ApiOperation({ summary: 'Get deletion job status' })
  @ApiResponse({ status: 200, description: 'Deletion job status' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getStatus(@Param('id') id: string) {
    return this.dataDeletionService.getStatus(id);
  }

  @Get('person/:personId')
  @CheckPermissions({ action: 'delete', subject: 'person' })
  @ApiOperation({ summary: 'List deletion jobs for a person' })
  @ApiResponse({ status: 200, description: 'List of deletion jobs' })
  async getDeletionsByPerson(@Param('personId') personId: string) {
    return this.dataDeletionService.getDeletionsByPerson(personId);
  }
}
