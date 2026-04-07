import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CheckPermissions } from '../../auth/decorators/check-permissions.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/types/authenticated-user';
import { CreateConversationDto } from '../dto/conversation.dto';
import { ConversationService } from './conversation.service';
import { MessageService } from '../message/message.service';
import { PollService } from '../poll/poll.service';

/**
 * Phase 7 Plan 02+03 -- Conversation REST API.
 *
 * Mounted at /api/v1/schools/:schoolId/conversations (global prefix in main.ts).
 * RBAC enforced at service level per scope type.
 *
 * Plan 03: When pollData is present in CreateConversationDto, delegates first
 * message creation to PollService.createWithMessage (inline poll, D-12).
 */
@ApiTags('Communication')
@ApiBearerAuth()
@Controller('schools/:schoolId/conversations')
export class ConversationController {
  constructor(
    private readonly service: ConversationService,
    private readonly messageService: MessageService,
    private readonly pollService: PollService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @CheckPermissions({ action: 'create', subject: 'conversation' })
  @ApiOperation({ summary: 'Create a conversation (COMM-01/02), optionally with inline poll (COMM-06)' })
  @ApiResponse({ status: 201, description: 'Conversation created with scope expansion' })
  @ApiResponse({ status: 400, description: 'Invalid scope or missing required fields' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions for scope' })
  async create(
    @Param('schoolId') schoolId: string,
    @Body() dto: CreateConversationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    // Create the conversation first
    const conversation = await this.service.create(schoolId, user.id, user.roles, dto);

    // If pollData is present, create the first message with an inline poll
    if (dto.pollData) {
      const message = await this.pollService.createWithMessage(
        conversation.id,
        user.id,
        dto.body,
        dto.pollData,
      );
      return { ...conversation, firstMessage: message };
    }

    // Otherwise, send a regular first message
    const message = await this.messageService.send(conversation.id, user.id, {
      body: dto.body,
    });

    return { ...conversation, firstMessage: message };
  }

  @Get()
  @CheckPermissions({ action: 'read', subject: 'conversation' })
  @ApiOperation({ summary: 'List conversations for current user' })
  @ApiResponse({ status: 200, description: 'Array of ConversationDto' })
  async findAll(
    @Param('schoolId') schoolId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(schoolId, user.id, search);
  }

  @Get(':conversationId')
  @CheckPermissions({ action: 'read', subject: 'conversation' })
  @ApiOperation({ summary: 'Get a single conversation' })
  @ApiResponse({ status: 200, description: 'ConversationDto' })
  @ApiResponse({ status: 404, description: 'Not found or not a member' })
  async findOne(
    @Param('conversationId') conversationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.findOne(conversationId, user.id);
  }

  @Delete(':conversationId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @CheckPermissions({ action: 'manage', subject: 'communication' })
  @ApiOperation({ summary: 'Delete a conversation (admin/schulleitung only)' })
  @ApiResponse({ status: 204, description: 'Conversation deleted' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async delete(@Param('conversationId') conversationId: string) {
    await this.service.delete(conversationId);
  }
}
