import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { CreateHandoverNoteDto } from '../dto/handover.dto';
import { HandoverService } from './handover.service';

/**
 * SUBST-04 -- Handover note REST API.
 *
 * Pitfall 5: JSON and multipart endpoints live on SEPARATE handler methods so
 * @Body() and req.file() never collide. JSON create/update uses @Body() + DTO;
 * multipart attachment upload uses raw req.file() from @fastify/multipart.
 *
 * Global prefix `api/v1` is applied in main.ts -- controller path stays bare.
 */
@ApiTags('Handover')
@ApiBearerAuth()
@Controller('handover-notes')
export class HandoverController {
  constructor(private readonly service: HandoverService) {}

  /**
   * Create or update a handover note for a substitution.
   * Enforced-unique per substitution at the DB layer (D-20).
   */
  @Post('substitutions/:substitutionId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create or update handover note for a substitution (D-20)' })
  @ApiResponse({ status: 201, description: 'Note created or updated' })
  async createOrUpdate(
    @Param('substitutionId') substitutionId: string,
    @Body() dto: CreateHandoverNoteDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.createOrUpdateNote({
      substitutionId,
      authorId: user.id,
      content: dto.content,
    });
  }

  @Get('substitutions/:substitutionId')
  @ApiOperation({ summary: 'Get handover note for a substitution (visibility per D-15)' })
  async getForSubstitution(
    @Param('substitutionId') substitutionId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.getNoteForSubstitution(substitutionId, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete handover note (author-only)' })
  async delete(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    await this.service.deleteNote(id, user.id);
  }

  /**
   * Upload an attachment. Separate endpoint from createOrUpdate() so
   * @fastify/multipart's req.file() and @Body() never collide (Pitfall 5).
   */
  @Post(':noteId/attachments')
  @HttpCode(HttpStatus.CREATED)
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload handover attachment (PDF/JPG/PNG, max 5MB)' })
  @ApiResponse({ status: 201, description: 'Attachment uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid file type, size, or magic bytes' })
  async uploadAttachment(@Param('noteId') noteId: string, @Req() req: any) {
    const file = await req.file();
    if (!file) {
      throw new BadRequestException('Keine Datei hochgeladen');
    }

    const chunks: Buffer[] = [];
    for await (const chunk of file.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return this.service.saveAttachment(noteId, {
      filename: file.filename,
      mimeType: file.mimetype,
      buffer,
    });
  }

  @Get('attachments/:id')
  @ApiOperation({ summary: 'Download a handover attachment (visibility per D-15)' })
  async downloadAttachment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() reply: any,
  ) {
    const { stream, attachment } = await this.service.getAttachmentStream(id, user.id);
    reply.header('Content-Type', attachment.mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${attachment.filename}"`,
    );
    return reply.send(stream);
  }

  @Delete('attachments/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a handover attachment (author-only)' })
  async deleteAttachment(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.service.deleteAttachment(id, user.id);
  }
}
