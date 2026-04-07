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
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { SendMessageDto } from '../dto/message.dto';
import { MessageService } from './message.service';

/**
 * Phase 7 Plan 02 -- Message REST API.
 *
 * Handles message send, list, read receipts, recipient detail, and delete.
 * Includes PATCH /read for marking all conversation messages as read (COMM-03).
 */
@ApiTags('Communication')
@ApiBearerAuth()
@Controller('schools/:schoolId/conversations/:conversationId/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
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

  @Delete(':messageId')
  @HttpCode(HttpStatus.NO_CONTENT)
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
  @ApiOperation({ summary: 'Mark all messages in conversation as read (COMM-03)' })
  @ApiResponse({ status: 204, description: 'Messages marked as read' })
  async markRead(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    await this.messageService.markRead(conversationId, user.id);
  }
}
