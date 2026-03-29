import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DataExportService } from './data-export.service';
import { RequestExportDto } from './dto/request-export.dto';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';

@ApiTags('dsgvo/export')
@ApiBearerAuth()
@Controller('dsgvo/export')
export class DataExportController {
  constructor(private dataExportService: DataExportService) {}

  @Post()
  @CheckPermissions({ action: 'read', subject: 'export' })
  @ApiOperation({ summary: 'Request data export for a person (Art. 15/20)' })
  @ApiResponse({ status: 201, description: 'Export job queued' })
  @ApiResponse({ status: 409, description: 'Export already in progress' })
  @ApiResponse({ status: 404, description: 'Person not found' })
  async requestExport(@Body() dto: RequestExportDto) {
    return this.dataExportService.requestExport(dto);
  }

  @Get(':id')
  @CheckPermissions({ action: 'read', subject: 'export' })
  @ApiOperation({ summary: 'Get export job status' })
  @ApiResponse({ status: 200, description: 'Export job status' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getStatus(@Param('id') id: string) {
    return this.dataExportService.getStatus(id);
  }

  @Get(':id/download')
  @CheckPermissions({ action: 'read', subject: 'export' })
  @ApiOperation({ summary: 'Download export data (JSON + PDF) for completed job' })
  @ApiResponse({ status: 200, description: 'Export data' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  @ApiResponse({ status: 409, description: 'Export not yet completed' })
  async getExportData(@Param('id') id: string) {
    return this.dataExportService.getExportData(id);
  }

  @Get('person/:personId')
  @CheckPermissions({ action: 'read', subject: 'export' })
  @ApiOperation({ summary: 'List export jobs for a person' })
  @ApiResponse({ status: 200, description: 'List of export jobs' })
  async getExportsByPerson(@Param('personId') personId: string) {
    return this.dataExportService.getExportsByPerson(personId);
  }
}
