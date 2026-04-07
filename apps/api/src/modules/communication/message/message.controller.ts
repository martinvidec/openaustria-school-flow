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
  Query,
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
import { createReadStream } from 'node:fs';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { SendMessageDto, ReportAbsenceDto } from '../dto/message.dto';
import { MessageService } from './message.service';

/**
 * Phase 7 Plan 02+03 -- Message REST API.
 *
 * Handles message send, list, read receipts, recipient detail, delete,
 * file attachments (COMM-04), and absence reporting (COMM-05).
 */
@ApiTags('Communication')
@ApiBearerAuth()
@Controller('schools/:schoolId/conversations/:conversationId/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckPermissions({ action: 'create', subject: 'message' })
  @ApiOperation({ summary: 'Send a message to a conversation (COMM-01/02)' })
  @ApiResponse({ status: 201, description: 'Message sent with recipient expansion' })
  @ApiResponse({ status: 403, description: 'Not a member of the conversation' })
  async send(
    @Param('conversationId') conversationId: string,
    @Body() dto: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messageService.send(conversationId, user.id, dto);
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'message' })
  @ApiOperation({ summary: 'List messages with cursor-based pagination' })
  @ApiResponse({ status: 200, description: 'Paginated messages with nextCursor' })
  async findAll(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('cursor') cursor?: string,
    @Query('limit') limit?: string,
  ) {
    return this.messageService.findAll(
      conversationId,
      user.id,
      cursor,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  @Get(':messageId/recipients')
  @CheckPermissions({ action: 'read', subject: 'message' })
  @ApiOperation({ summary: 'Get per-user read status for read receipt detail (COMM-03)' })
  @ApiResponse({ status: 200, description: 'Array of recipient read status with names' })
  @ApiResponse({ status: 403, description: 'Only sender or admin can view recipients' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async getRecipients(
    @Param('conversationId') conversationId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messageService.getRecipients(
      conversationId,
      messageId,
      user.id,
      user.roles,
    );
  }

  @Post(':messageId/attachments')
  @HttpCode(HttpStatus.CREATED)
  @CheckPermissions({ action: 'create', subject: 'message' })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a file attachment to a message (COMM-04)' })
  @ApiResponse({ status: 201, description: 'Attachment uploaded with metadata' })
  @ApiResponse({ status: 400, description: 'Invalid file type or size exceeded' })
  @ApiResponse({ status: 403, description: 'Only sender can upload attachments' })
  async uploadAttachment(
    @Param('schoolId') schoolId: string,
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Req() request: any,
  ) {
    const data = await request.file();
    if (!data) {
      return { statusCode: 400, message: 'No file provided' };
    }

    // Read file to buffer (same pattern as excuse.controller.ts)
    const chunks: Buffer[] = [];
    for await (const chunk of data.file) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    return this.messageService.uploadAttachment(schoolId, messageId, user.id, {
      filename: data.filename,
      mimetype: data.mimetype,
      buffer,
    });
  }

  @Get(':messageId/attachments/:attachmentId/download')
  @CheckPermissions({ action: 'read', subject: 'message' })
  @ApiOperation({ summary: 'Download a file attachment (COMM-04)' })
  @ApiResponse({ status: 200, description: 'File stream with Content-Disposition' })
  @ApiResponse({ status: 403, description: 'Not a member of the conversation' })
  @ApiResponse({ status: 404, description: 'Attachment not found' })
  async downloadAttachment(
    @Param('attachmentId') attachmentId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Res() reply: any,
  ) {
    const { path, filename, mimeType } =
      await this.messageService.downloadAttachment(attachmentId, user.id);

    reply.header('Content-Type', mimeType);
    reply.header(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(filename)}"`,
    );

    const stream = createReadStream(path);
    return reply.send(stream);
  }

  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'delete', subject: 'message' })
  @ApiOperation({ summary: 'Delete a message (sender or admin only)' })
  @ApiResponse({ status: 204, description: 'Message deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async delete(
    @Param('messageId') messageId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.messageService.delete(messageId, user.id, user.roles);
  }
}

/**
 * Separate controller for the PATCH /read endpoint on the conversation level.
 * Marks all unread messages as read for the current user.
 */
@ApiTags('Communication')
@ApiBearerAuth()
@Controller('schools/:schoolId/conversations/:conversationId')
export class ConversationReadController {
  constructor(private readonly messageService: MessageService) {}

  @Patch('read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'read', subject: 'message' })
  @ApiOperation({ summary: 'Mark all messages in conversation as read (COMM-03)' })
  @ApiResponse({ status: 204, description: 'Messages marked as read' })
  async markRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.messageService.markRead(conversationId, user.id);
  }
}

/**
 * Absence report controller (COMM-05).
 * Restricted to 'eltern' role via RBAC guards.
 */
@ApiTags('Communication')
@ApiBearerAuth()
@Controller('schools/:schoolId/absence-report')
export class AbsenceReportController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckPermissions({ action: 'create', subject: 'message' })
  @ApiOperation({ summary: 'Report student absence via messaging (COMM-05)' })
  @ApiResponse({
    status: 201,
    description: 'Absence reported, ExcuseService record created, SYSTEM message sent to KV',
  })
  async reportAbsence(
    @Param('schoolId') schoolId: string,
    @Body() dto: ReportAbsenceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.messageService.reportAbsence(schoolId, user.id, dto);
    return { message: 'Abwesenheit erfolgreich gemeldet' };
  }
}
