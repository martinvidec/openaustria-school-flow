import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ImportService } from './import.service';
import { StartImportDto } from './dto/start-import.dto';
import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * IMPORT-01/IMPORT-02 -- Data import endpoints for school administration.
 *
 * Flow:
 * 1. POST /upload -- upload file, get parsed preview (entity counts for Untis, headers+rows for CSV)
 * 2. POST /dry-run -- queue dry-run job to validate without DB writes
 * 3. POST /:importJobId/commit -- trigger real import as background job
 * 4. GET / -- import history (D-08 audit trail)
 * 5. GET /:importJobId -- single import job status and results
 * 6. DELETE /:importJobId -- delete import record (admin cleanup)
 *
 * All endpoints admin-only via CheckPermissions (D-08).
 */
@ApiTags('import')
@ApiBearerAuth()
@Controller('schools/:schoolId/import')
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * Upload a file and get a parsed preview.
   * Accepts .xml, .csv, .txt files up to 10 MB.
   * Uses raw Fastify request for multipart file handling.
   */
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload import file and get parsed preview (admin-only)' })
  @ApiResponse({ status: 201, description: 'File parsed, preview returned' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @CheckPermissions({ action: 'manage', subject: 'import' })
  async upload(
    @Param('schoolId') schoolId: string,
    @Req() req: any,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const file = await req.file();
    if (!file) {
      throw new BadRequestException('Keine Datei hochgeladen');
    }

    // Read file to string
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    if (buffer.length > MAX_FILE_SIZE) {
      throw new BadRequestException('Datei zu gross (max 10 MB)');
    }

    // Validate file extension
    const filename: string = file.filename ?? '';
    const ext = filename.split('.').pop()?.toLowerCase();
    if (!['xml', 'csv', 'txt'].includes(ext ?? '')) {
      throw new BadRequestException('Unterstuetztes Format: .xml, .csv, .txt');
    }

    const content = buffer.toString('utf-8');
    return this.importService.uploadAndParse(
      schoolId,
      { filename, content },
      user.id,
    );
  }

  /**
   * Queue a dry-run import job for validation without DB writes.
   */
  @Post('dry-run')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start dry-run import for validation (admin-only)' })
  @ApiResponse({ status: 200, description: 'Dry-run queued' })
  @ApiResponse({ status: 404, description: 'Import job not found' })
  @CheckPermissions({ action: 'manage', subject: 'import' })
  async startDryRun(
    @Param('schoolId') schoolId: string,
    @Body() dto: StartImportDto,
  ) {
    // Body must include an importJobId reference (from upload step)
    const importJobId = (dto as any).importJobId;
    if (!importJobId) {
      throw new BadRequestException('importJobId required');
    }

    return this.importService.startDryRun(schoolId, importJobId, {
      entityType: dto.entityType,
      conflictMode: dto.conflictMode,
      columnMapping: dto.columnMapping,
    });
  }

  /**
   * Commit a previously validated import -- triggers real DB writes.
   */
  @Post(':importJobId/commit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Commit import (admin-only, triggers background job)' })
  @ApiResponse({ status: 200, description: 'Import queued for processing' })
  @ApiResponse({ status: 404, description: 'Import job not found' })
  @CheckPermissions({ action: 'manage', subject: 'import' })
  async commitImport(@Param('importJobId') importJobId: string) {
    return this.importService.commitImport(importJobId);
  }

  /**
   * Get import history for a school (D-08 audit trail).
   */
  @Get()
  @ApiOperation({ summary: 'List import history for school (admin-only, D-08)' })
  @ApiResponse({ status: 200, description: 'Import history list' })
  @CheckPermissions({ action: 'manage', subject: 'import' })
  async getHistory(@Param('schoolId') schoolId: string) {
    return this.importService.getHistory(schoolId);
  }

  /**
   * Get single import job status and results.
   */
  @Get(':importJobId')
  @ApiOperation({ summary: 'Get import job details (admin-only)' })
  @ApiResponse({ status: 200, description: 'Import job details' })
  @ApiResponse({ status: 404, description: 'Import job not found' })
  @CheckPermissions({ action: 'manage', subject: 'import' })
  async getJob(@Param('importJobId') importJobId: string) {
    return this.importService.getJob(importJobId);
  }

  /**
   * Delete an import job record (admin cleanup).
   */
  @Delete(':importJobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete import job record (admin-only)' })
  @ApiResponse({ status: 204, description: 'Import job deleted' })
  @ApiResponse({ status: 404, description: 'Import job not found' })
  @CheckPermissions({ action: 'manage', subject: 'import' })
  async deleteJob(@Param('importJobId') importJobId: string) {
    await this.importService.deleteJob(importJobId);
  }
}
