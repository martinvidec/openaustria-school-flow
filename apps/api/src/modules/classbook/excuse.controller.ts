import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
} from '@nestjs/swagger';
import { ExcuseService } from './excuse.service';
import { CreateExcuseDto, ReviewExcuseDto, ExcuseListQueryDto } from './dto/excuse.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/authenticated-user';
import { createReadStream, existsSync } from 'node:fs';
import { join } from 'node:path';

@ApiTags('classbook')
@ApiBearerAuth()
@Controller('schools/:schoolId/classbook/excuses')
export class ExcuseController {
  constructor(private readonly excuseService: ExcuseService) {}

  /**
   * POST /schools/:schoolId/classbook/excuses
   * Create a new absence excuse (parent only). BOOK-06, D-11.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create absence excuse (parent only, D-11)' })
  @ApiResponse({ status: 201, description: 'Excuse created with PENDING status' })
  @ApiResponse({ status: 400, description: 'Invalid date range or input' })
  @ApiResponse({ status: 403, description: 'Not a parent or not the student parent' })
  async createExcuse(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateExcuseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.excuseService.createExcuse(schoolId, user.id, dto);
  }

  /**
   * GET /schools/:schoolId/classbook/excuses
   * List excuses. For parents: their excuses. For Klassenvorstand: pending excuses for their classes.
   */
  @Get()
  @ApiOperation({ summary: 'List excuses (filtered by role)' })
  @ApiResponse({ status: 200, description: 'List of excuses' })
  async listExcuses(
    @Param('schoolId') schoolId: string,
    @Query() query: ExcuseListQueryDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Role-based: if parent role, return parent excuses; if teacher, return Klassenvorstand pending
    const isParent = user.roles.includes('eltern');
    const isTeacher = user.roles.includes('lehrer') || user.roles.includes('schulleitung') || user.roles.includes('admin');

    if (isParent) {
      return this.excuseService.getExcusesForParent(user.id);
    }

    if (isTeacher) {
      return this.excuseService.getPendingExcusesForKlassenvorstand(user.id, schoolId);
    }

    return [];
  }

  /**
   * GET /schools/:schoolId/classbook/excuses/:excuseId
   * Get a single excuse with attachments.
   */
  @Get(':excuseId')
  @ApiOperation({ summary: 'Get excuse details with attachments' })
  @ApiResponse({ status: 200, description: 'Excuse details' })
  @ApiResponse({ status: 404, description: 'Excuse not found' })
  async getExcuse(@Param('excuseId') excuseId: string) {
    return this.excuseService.getExcuseById(excuseId);
  }

  /**
   * PATCH /schools/:schoolId/classbook/excuses/:excuseId/review
   * Review an excuse (Klassenvorstand/admin/schulleitung). D-12.
   * Accepted excuses auto-update attendance records to EXCUSED.
   */
  @Patch(':excuseId/review')
  @ApiOperation({ summary: 'Review excuse - accept/reject (Klassenvorstand, D-12)' })
  @ApiResponse({ status: 200, description: 'Excuse reviewed, attendance updated if accepted' })
  @ApiResponse({ status: 400, description: 'Missing review note for rejection' })
  @ApiResponse({ status: 404, description: 'Excuse not found' })
  @ApiResponse({ status: 409, description: 'Excuse already reviewed' })
  async reviewExcuse(
    @Param('excuseId') excuseId: string,
    @Body() dto: ReviewExcuseDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.excuseService.reviewExcuse(excuseId, user.id, dto);
  }

  /**
   * POST /schools/:schoolId/classbook/excuses/:excuseId/attachment
   * Upload a file attachment (PDF/JPG/PNG, max 5MB). D-13.
   * Uses raw Fastify request for multipart file handling.
   */
  @Post(':excuseId/attachment')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload excuse attachment (PDF/JPG/PNG, max 5MB, D-13)' })
  @ApiResponse({ status: 201, description: 'Attachment uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  @ApiResponse({ status: 404, description: 'Excuse not found' })
  async uploadAttachment(
    @Param('excuseId') excuseId: string,
    @Req() req: any,
  ) {
    const file = await req.file();
    if (!file) {
      throw new BadRequestException('Keine Datei hochgeladen');
    }

    // Read file to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return this.excuseService.saveAttachment(
      excuseId,
      file.filename,
      file.mimetype,
      buffer.length,
      buffer,
    );
  }

  /**
   * GET /schools/:schoolId/classbook/excuses/attachments/:attachmentId
   * Serve an attachment file for download.
   */
  @Get('attachments/:attachmentId')
  @ApiOperation({ summary: 'Download excuse attachment' })
  @ApiResponse({ status: 200, description: 'File download' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @Res() reply: any,
  ) {
    const { storagePath, mimeType, filename } = await this.excuseService.getAttachmentPath(attachmentId);
    const fullPath = join(process.cwd(), storagePath);

    if (!existsSync(fullPath)) {
      throw new NotFoundException('Datei nicht gefunden');
    }

    const stream = createReadStream(fullPath);
    reply.header('Content-Type', mimeType);
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(stream);
  }
}
