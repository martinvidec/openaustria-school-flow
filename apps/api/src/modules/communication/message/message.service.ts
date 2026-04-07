import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MessageDto } from '@schoolflow/shared';
import { PrismaService } from '../../../config/database/prisma.service';
import { ConversationService } from '../conversation/conversation.service';
import { NotificationService } from '../../substitution/notification/notification.service';
import { SendMessageDto } from '../dto/message.dto';

export interface RecipientDetailDto {
  userId: string;
  firstName: string;
  lastName: string;
  readAt: string | null;
}

/**
 * Phase 7 Plan 02 -- MessageService.
 *
 * Responsibilities:
 *  - Send message with MessageRecipient expansion + unreadCount increment
 *  - Cursor-based pagination for message list
 *  - Read receipt marking (COMM-03) with unreadCount reset
 *  - Recipient detail for read receipt Popover (COMM-03)
 *  - MESSAGE_RECEIVED notifications via NotificationService (D-04)
 *  - Message deletion
 */
@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
    private readonly notificationService: NotificationService,
  ) {}

  /**
   * Send a message to a conversation.
   *
   * Creates Message + MessageRecipient rows for all members except sender.
   * Increments ConversationMember.unreadCount for recipients.
   * Sends MESSAGE_RECEIVED notifications.
   */
  async send(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ): Promise<MessageDto> {
    // Verify sender is a member
    const isMember = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId: senderId,
        },
      },
    });
    if (!isMember) {
      throw new ForbiddenException('Not a member of this conversation');
    }

    // Resolve sender name
    const senderPerson = await this.prisma.person.findFirst({
      where: { keycloakUserId: senderId },
      select: { firstName: true, lastName: true },
    });
    const senderName = senderPerson
      ? `${senderPerson.firstName} ${senderPerson.lastName}`
      : 'Unknown';

    // Get all member userIds
    const memberIds = await this.conversationService.getMemberUserIds(conversationId);
    const recipientIds = memberIds.filter((id) => id !== senderId);

    // Create message + recipients in transaction
    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId,
          senderId,
          body: dto.body,
          type: 'TEXT',
        },
      });

      // Create MessageRecipient rows for all members except sender
      if (recipientIds.length > 0) {
        await tx.messageRecipient.createMany({
          data: recipientIds.map((userId) => ({
            messageId: msg.id,
            userId,
            deliveredAt: new Date(),
          })),
        });

        // Increment unreadCount for all recipients
        await tx.conversationMember.updateMany({
          where: {
            conversationId,
            userId: { in: recipientIds },
          },
          data: {
            unreadCount: { increment: 1 },
          },
        });
      }

      // Update conversation updatedAt
      await tx.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      return msg;
    });

    // Send MESSAGE_RECEIVED notifications (outside transaction)
    // Per Pitfall 2: batch if recipients > 50
    const truncatedBody =
      dto.body.length > 100 ? dto.body.substring(0, 100) + '...' : dto.body;

    for (const recipientId of recipientIds) {
      try {
        await this.notificationService.create({
          userId: recipientId,
          type: 'MESSAGE_RECEIVED',
          title: `Neue Nachricht von ${senderName}`,
          body: truncatedBody,
          payload: { conversationId, messageId: message.id },
        });
      } catch {
        // Non-critical: notification failure should not fail message send
      }
    }

    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      senderName,
      body: message.body,
      type: message.type as MessageDto['type'],
      createdAt: message.createdAt.toISOString(),
      attachments: [],
      poll: null,
      readCount: 0,
      totalRecipients: recipientIds.length,
    };
  }

  /**
   * List messages with cursor-based pagination.
   */
  async findAll(
    conversationId: string,
    userId: string,
    cursor?: string,
    limit: number = 20,
  ): Promise<{ messages: MessageDto[]; nextCursor: string | null }> {
    // Verify membership
    const isMember = await this.prisma.conversationMember.findUnique({
      where: {
        conversationId_userId: {
          conversationId,
          userId,
        },
      },
    });
    if (!isMember) {
      throw new ForbiddenException('Not a member of this conversation');
    }

    const where: any = { conversationId };
    if (cursor) {
      const cursorMessage = await this.prisma.message.findUnique({
        where: { id: cursor },
        select: { createdAt: true },
      });
      if (cursorMessage) {
        where.createdAt = { lt: cursorMessage.createdAt };
      }
    }

    const messages = await this.prisma.message.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
      include: {
        recipients: true,
        attachments: true,
        poll: {
          include: {
            options: {
              include: { votes: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    let nextCursor: string | null = null;
    if (messages.length > limit) {
      const last = messages.pop()!;
      nextCursor = last.id;
    }

    const dtos = await Promise.all(
      messages.map(async (msg: any) => {
        const senderPerson = await this.prisma.person.findFirst({
          where: { keycloakUserId: msg.senderId },
          select: { firstName: true, lastName: true },
        });
        const senderName = senderPerson
          ? `${senderPerson.firstName} ${senderPerson.lastName}`
          : 'Unknown';

        const isSender = msg.senderId === userId;
        let readCount: number | undefined;
        let totalRecipients: number | undefined;

        if (isSender) {
          totalRecipients = msg.recipients.length;
          readCount = msg.recipients.filter(
            (r: any) => r.readAt !== null,
          ).length;
        }

        return {
          id: msg.id,
          conversationId: msg.conversationId,
          senderId: msg.senderId,
          senderName,
          body: msg.body,
          type: msg.type as MessageDto['type'],
          createdAt: msg.createdAt.toISOString(),
          attachments: msg.attachments.map((a: any) => ({
            id: a.id,
            filename: a.filename,
            mimeType: a.mimeType,
            sizeBytes: a.sizeBytes,
          })),
          poll: msg.poll
            ? {
                id: msg.poll.id,
                question: msg.poll.question,
                type: msg.poll.type,
                deadline: msg.poll.deadline?.toISOString() ?? null,
                isClosed: msg.poll.isClosed,
                options: msg.poll.options.map((o: any) => ({
                  id: o.id,
                  text: o.text,
                  voteCount: o.votes.length,
                  voters: o.votes.map((v: any) => ({
                    userId: v.userId,
                    name: '',
                  })),
                })),
                userVoteOptionIds: msg.poll.options
                  .filter((o: any) =>
                    o.votes.some((v: any) => v.userId === userId),
                  )
                  .map((o: any) => o.id),
              }
            : null,
          ...(readCount !== undefined ? { readCount } : {}),
          ...(totalRecipients !== undefined ? { totalRecipients } : {}),
        } satisfies MessageDto;
      }),
    );

    return { messages: dtos, nextCursor };
  }

  /**
   * Mark all unread messages in a conversation as read for a user (COMM-03).
   *
   * Sets readAt on all MessageRecipient rows for this user+conversation.
   * Resets ConversationMember.unreadCount to 0.
   */
  async markRead(conversationId: string, userId: string): Promise<void> {
    // Find all unread message recipients for this user in this conversation
    const unreadRecipients = await this.prisma.messageRecipient.findMany({
      where: {
        message: { conversationId },
        userId,
        readAt: null,
      },
      select: { id: true },
    });

    if (unreadRecipients.length === 0) return;

    await this.prisma.$transaction(async (tx) => {
      // Set readAt on all unread MessageRecipient rows
      await tx.messageRecipient.updateMany({
        where: {
          id: { in: unreadRecipients.map((r: any) => r.id) },
        },
        data: { readAt: new Date() },
      });

      // Reset unreadCount to 0
      await tx.conversationMember.updateMany({
        where: {
          conversationId,
          userId,
        },
        data: { unreadCount: 0 },
      });
    });
  }

  /**
   * Get per-user read status for a message (COMM-03 read receipt detail).
   *
   * Only the message sender or admin/schulleitung can see per-recipient read status.
   * Returns recipients sorted: read first (by readAt DESC), then unread alphabetically.
   */
  async getRecipients(
    conversationId: string,
    messageId: string,
    userId: string,
    userRoles: string[],
  ): Promise<RecipientDetailDto[]> {
    // Get the message and verify it belongs to this conversation
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true },
    });

    if (!message || message.conversationId !== conversationId) {
      throw new NotFoundException('Message not found');
    }

    // Only sender or admin/schulleitung can see recipient detail
    const isAdmin = userRoles.includes('admin');
    const isSchulleitung = userRoles.includes('schulleitung');
    if (message.senderId !== userId && !isAdmin && !isSchulleitung) {
      throw new ForbiddenException(
        'Only the message sender or admin can view recipient details',
      );
    }

    const recipients = await this.prisma.messageRecipient.findMany({
      where: { messageId },
    });

    // Resolve person names for each recipient
    const details: RecipientDetailDto[] = await Promise.all(
      recipients.map(async (r: any) => {
        const person = await this.prisma.person.findFirst({
          where: { keycloakUserId: r.userId },
          select: { firstName: true, lastName: true },
        });
        return {
          userId: r.userId,
          firstName: person?.firstName ?? 'Unknown',
          lastName: person?.lastName ?? '',
          readAt: r.readAt ? r.readAt.toISOString() : null,
        };
      }),
    );

    // Sort: read first (by readAt DESC), then unread alphabetically by lastName
    return details.sort((a, b) => {
      if (a.readAt && !b.readAt) return -1;
      if (!a.readAt && b.readAt) return 1;
      if (a.readAt && b.readAt) {
        return new Date(b.readAt).getTime() - new Date(a.readAt).getTime();
      }
      return a.lastName.localeCompare(b.lastName);
    });
  }

  /**
   * Delete a message. Only sender or admin can delete.
   */
  async delete(messageId: string, userId: string, userRoles: string[]): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
    });
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const isAdmin = userRoles.includes('admin');
    if (message.senderId !== userId && !isAdmin) {
      throw new ForbiddenException('Only the sender or admin can delete a message');
    }

    await this.prisma.message.delete({
      where: { id: messageId },
    });
  }
}
