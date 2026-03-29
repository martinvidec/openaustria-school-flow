import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DsfaService } from './dsfa.service';
import { CreateDsfaEntryDto } from './dto/create-dsfa-entry.dto';
import { CreateVvzEntryDto } from './dto/create-vvz-entry.dto';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';

@ApiTags('dsgvo-dsfa')
@ApiBearerAuth()
@Controller('dsgvo/dsfa')
export class DsfaController {
  constructor(private dsfaService: DsfaService) {}

  // --- DSFA routes ---

  @Post('dsfa')
  @CheckPermissions({ action: 'create', subject: 'dsfa' })
  @ApiOperation({ summary: 'Create a DSFA entry' })
  @ApiResponse({ status: 201, description: 'DSFA entry created' })
  async createDsfa(@Body() dto: CreateDsfaEntryDto) {
    return this.dsfaService.createDsfaEntry(dto);
  }

  @Get('dsfa/school/:schoolId')
  @CheckPermissions({ action: 'read', subject: 'dsfa' })
  @ApiOperation({ summary: 'List DSFA entries for a school' })
  @ApiResponse({ status: 200, description: 'DSFA entries returned' })
  async findDsfaEntries(@Param('schoolId') schoolId: string) {
    return this.dsfaService.findDsfaEntries(schoolId);
  }

  @Put('dsfa/:id')
  @CheckPermissions({ action: 'update', subject: 'dsfa' })
  @ApiOperation({ summary: 'Update a DSFA entry' })
  @ApiResponse({ status: 200, description: 'DSFA entry updated' })
  @ApiResponse({ status: 404, description: 'DSFA entry not found' })
  async updateDsfa(@Param('id') id: string, @Body() dto: Partial<CreateDsfaEntryDto>) {
    return this.dsfaService.updateDsfaEntry(id, dto);
  }

  @Delete('dsfa/:id')
  @CheckPermissions({ action: 'delete', subject: 'dsfa' })
  @ApiOperation({ summary: 'Delete a DSFA entry' })
  @ApiResponse({ status: 200, description: 'DSFA entry deleted' })
  @ApiResponse({ status: 404, description: 'DSFA entry not found' })
  async removeDsfa(@Param('id') id: string) {
    return this.dsfaService.removeDsfaEntry(id);
  }

  // --- VVZ routes ---

  @Post('vvz')
  @CheckPermissions({ action: 'create', subject: 'dsfa' })
  @ApiOperation({ summary: 'Create a VVZ entry' })
  @ApiResponse({ status: 201, description: 'VVZ entry created' })
  async createVvz(@Body() dto: CreateVvzEntryDto) {
    return this.dsfaService.createVvzEntry(dto);
  }

  @Get('vvz/school/:schoolId')
  @CheckPermissions({ action: 'read', subject: 'dsfa' })
  @ApiOperation({ summary: 'List VVZ entries for a school' })
  @ApiResponse({ status: 200, description: 'VVZ entries returned' })
  async findVvzEntries(@Param('schoolId') schoolId: string) {
    return this.dsfaService.findVvzEntries(schoolId);
  }

  @Put('vvz/:id')
  @CheckPermissions({ action: 'update', subject: 'dsfa' })
  @ApiOperation({ summary: 'Update a VVZ entry' })
  @ApiResponse({ status: 200, description: 'VVZ entry updated' })
  @ApiResponse({ status: 404, description: 'VVZ entry not found' })
  async updateVvz(@Param('id') id: string, @Body() dto: Partial<CreateVvzEntryDto>) {
    return this.dsfaService.updateVvzEntry(id, dto);
  }

  @Delete('vvz/:id')
  @CheckPermissions({ action: 'delete', subject: 'dsfa' })
  @ApiOperation({ summary: 'Delete a VVZ entry' })
  @ApiResponse({ status: 200, description: 'VVZ entry deleted' })
  @ApiResponse({ status: 404, description: 'VVZ entry not found' })
  async removeVvz(@Param('id') id: string) {
    return this.dsfaService.removeVvzEntry(id);
  }

  // --- Export ---

  @Get('export/:schoolId')
  @CheckPermissions({ action: 'read', subject: 'dsfa' })
  @ApiOperation({ summary: 'Export combined DSFA + VVZ data as JSON' })
  @ApiResponse({ status: 200, description: 'Combined DSFA + VVZ export' })
  @ApiResponse({ status: 404, description: 'School not found' })
  async exportCombined(@Param('schoolId') schoolId: string) {
    return this.dsfaService.exportCombinedJson(schoolId);
  }
}
