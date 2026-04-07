import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { MessageAttachmentDto, MessageDto } from '@schoolflow/shared';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../../config/database/prisma.service';
import { ConversationService } from '../conversation/conversation.service';
import { NotificationService } from '../../substitution/notification/notification.service';
import { ExcuseService } from '../../classbook/excuse.service';
import { MessagingGateway } from '../messaging.gateway';
import { SendMessageDto, ReportAbsenceDto } from '../dto/message.dto';

export interface RecipientDetailDto {
  userId: string;
  firstName: string;
  lastName: string;
  readAt: string | null;
}

/** Allowed MIME types for message attachments (COMM-04) */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];

/** Magic byte signatures for file type validation */
const MAGIC_BYTES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47]],
  'application/msword': [[0xd0, 0xcf, 0x11, 0xe0]], // OLE compound
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [
    [0x50, 0x4b, 0x03, 0x04], // ZIP/DOCX
  ],
};

/** Maximum file size: 5MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Phase 7 Plan 02+03 -- MessageService.
 *
 * Responsibilities:
 *  - Send message with MessageRecipient expansion + unreadCount increment
 *  - Cursor-based pagination for message list
 *  - Read receipt marking (COMM-03) with unreadCount reset
 *  - Recipient detail for read receipt Popover (COMM-03)
 *  - MESSAGE_RECEIVED notifications via NotificationService (D-04)
 *  - Message deletion
 *  - File attachment upload/download (COMM-04)
 *  - Absence reporting via messaging (COMM-05)
 */
@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly conversationService: ConversationService,
    private readonly notificationService: NotificationService,
    private readonly excuseService: ExcuseService,
    private readonly messagingGateway: MessagingGateway,
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

    const messageDto: MessageDto = {
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

    // Post-transaction Socket.IO emission (D-08, Pitfall: emit AFTER commit)
    this.messagingGateway.emitNewMessage(recipientIds, messageDto);

    return messageDto;
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
      select: { id: true, messageId: true },
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

    // Post-transaction: emit read receipts per message to each sender
    const uniqueMessageIds = [...new Set(unreadRecipients.map((r: any) => r.messageId))];
    for (const messageId of uniqueMessageIds) {
      const message = await this.prisma.message.findUnique({
        where: { id: messageId },
        select: { senderId: true },
      });
      if (!message) continue;

      // Compute read stats for this message
      const recipients = await this.prisma.messageRecipient.findMany({
        where: { messageId },
        select: { readAt: true },
      });
      const totalRecipients = recipients.length;
      const readCount = recipients.filter((r: any) => r.readAt !== null).length;

      this.messagingGateway.emitReadReceipt(
        message.senderId,
        messageId,
        userId,
        readCount,
        totalRecipients,
      );
    }
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

  // =====================================================================
  // COMM-04: File Attachments
  // =====================================================================

  /**
   * Upload a file attachment to an existing message (COMM-04).
   *
   * Validates: sender ownership, file size <= 5MB, MIME whitelist, magic byte check.
   * Stores file at uploads/{schoolId}/messages/{messageId}/{sanitizedFilename}.
   */
  async uploadAttachment(
    schoolId: string,
    messageId: string,
    userId: string,
    file: { filename: string; mimetype: string; buffer: Buffer },
  ): Promise<MessageAttachmentDto> {
    // Verify user is the sender of the message
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      select: { senderId: true, conversationId: true },
    });
    if (!message) {
      throw new NotFoundException('Nachricht nicht gefunden');
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException('Nur der Absender kann Anhaenge hinzufuegen');
    }

    const sizeBytes = file.buffer.length;

    // Validate file size <= 5MB
    if (sizeBytes > MAX_FILE_SIZE) {
      throw new BadRequestException(
        `Datei zu gross: ${sizeBytes} Bytes. Maximal ${MAX_FILE_SIZE} Bytes (5MB) erlaubt.`,
      );
    }

    // Validate MIME type against whitelist
    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Ungueltiger Dateityp: ${file.mimetype}. Erlaubt: ${ALLOWED_MIME_TYPES.join(', ')}`,
      );
    }

    // Magic byte validation
    const expectedSignatures = MAGIC_BYTES[file.mimetype];
    if (expectedSignatures) {
      const matches = expectedSignatures.some((sig) => {
        const fileMagic = Array.from(file.buffer.subarray(0, sig.length));
        return sig.every((byte, i) => fileMagic[i] === byte);
      });
      if (!matches) {
        throw new BadRequestException(
          'Dateiinhalt stimmt nicht mit dem angegebenen MIME-Typ ueberein',
        );
      }
    }

    // Sanitize filename: keep only alphanumeric, dots, hyphens, underscores
    const sanitizedFilename = file.filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    // Storage path
    const storagePath = join('uploads', schoolId, 'messages', messageId, sanitizedFilename);
    const fullPath = join(process.cwd(), storagePath);

    // Create directory if needed
    const dir = join(process.cwd(), 'uploads', schoolId, 'messages', messageId);
    await mkdir(dir, { recursive: true });

    // Write file to disk
    await writeFile(fullPath, file.buffer);

    // Create database record
    const attachment = await this.prisma.messageAttachment.create({
      data: {
        messageId,
        filename: sanitizedFilename,
        storagePath,
        mimeType: file.mimetype,
        sizeBytes,
      },
    });

    return {
      id: attachment.id,
      filename: attachment.filename,
      mimeType: attachment.mimeType,
      sizeBytes: attachment.sizeBytes,
    };
  }

  /**
   * Download a file attachment (COMM-04).
   *
   * Verifies user is a ConversationMember before allowing download.
   * Returns path, filename, mimeType for controller to stream.
   */
  async downloadAttachment(
    attachmentId: string,
    userId: string,
  ): Promise<{ path: string; filename: string; mimeType: string }> {
    const attachment = await this.prisma.messageAttachment.findUnique({
      where: { id: attachmentId },
      include: {
        message: {
          include: {
            conversation: {
              include: {
                conversationMembers: {
                  where: { userId },
                },
              },
            },
          },
        },
      },
    });

    if (!attachment) {
      throw new NotFoundException('Anhang nicht gefunden');
    }

    // Verify user is a conversation member
    const isMember = attachment.message.conversation.conversationMembers.length > 0;
    if (!isMember) {
      throw new ForbiddenException('Kein Zugriff auf diesen Anhang');
    }

    return {
      path: join(process.cwd(), attachment.storagePath),
      filename: attachment.filename,
      mimeType: attachment.mimeType,
    };
  }

  // =====================================================================
  // COMM-05: Absence Reporting via Messaging
  // =====================================================================

  /**
   * Report absence via messaging (COMM-05).
   *
   * 1. Creates AbsenceExcuse via ExcuseService (D-13).
   * 2. Resolves the student's Klassenvorstand.
   * 3. Finds or creates a DIRECT conversation between parent and KV.
   * 4. Posts a SYSTEM message with absence details (D-15).
   * 5. Creates MESSAGE_RECEIVED notification for KV.
   */
  async reportAbsence(
    schoolId: string,
    parentUserId: string,
    dto: ReportAbsenceDto,
  ): Promise<void> {
    // 1. Create AbsenceExcuse via ExcuseService
    await this.excuseService.createExcuse(schoolId, parentUserId, {
      studentId: dto.studentId,
      startDate: dto.dateFrom,
      endDate: dto.dateTo,
      reason: dto.reason,
      note: dto.note,
    });

    // 2. Resolve student and their Klassenvorstand
    const student = await this.prisma.student.findUniqueOrThrow({
      where: { id: dto.studentId },
      include: {
        person: { select: { firstName: true, lastName: true } },
        schoolClass: {
          include: {
            klassenvorstand: {
              include: {
                person: { select: { keycloakUserId: true, firstName: true, lastName: true } },
              },
            },
          },
        },
      },
    });

    const kvKeycloakId = student.schoolClass?.klassenvorstand?.person?.keycloakUserId;
    if (!kvKeycloakId) {
      // No Klassenvorstand assigned -- excuse is created, but no messaging
      return;
    }

    const studentName = `${student.person.firstName} ${student.person.lastName}`;

    // 3. Find or create DIRECT conversation between parent and KV
    const directPairKey = [parentUserId, kvKeycloakId].sort().join(':');
    let conversation = await this.prisma.conversation.findUnique({
      where: { directPairKey },
    });

    if (!conversation) {
      conversation = await this.prisma.conversation.create({
        data: {
          schoolId,
          scope: 'DIRECT',
          directPairKey,
          createdBy: parentUserId,
          conversationMembers: {
            createMany: {
              data: [
                { userId: parentUserId },
                { userId: kvKeycloakId },
              ],
            },
          },
        },
      });
    }

    // 4. Create SYSTEM message with absence details
    const systemBody = `Abwesenheit gemeldet: ${studentName}, ${dto.dateFrom} - ${dto.dateTo}, Grund: ${dto.reason}`;

    const message = await this.prisma.$transaction(async (tx) => {
      const msg = await tx.message.create({
        data: {
          conversationId: conversation!.id,
          senderId: parentUserId,
          body: systemBody,
          type: 'SYSTEM',
        },
      });

      // Create MessageRecipient for KV
      await tx.messageRecipient.create({
        data: {
          messageId: msg.id,
          userId: kvKeycloakId!,
          deliveredAt: new Date(),
        },
      });

      // Increment unreadCount for KV
      await tx.conversationMember.updateMany({
        where: {
          conversationId: conversation!.id,
          userId: kvKeycloakId!,
        },
        data: {
          unreadCount: { increment: 1 },
        },
      });

      // Update conversation updatedAt
      await tx.conversation.update({
        where: { id: conversation!.id },
        data: { updatedAt: new Date() },
      });

      return msg;
    });

    // 5. Create MESSAGE_RECEIVED notification for KV
    try {
      await this.notificationService.create({
        userId: kvKeycloakId,
        type: 'MESSAGE_RECEIVED',
        title: 'Abwesenheitsmeldung',
        body: systemBody.substring(0, 100),
        payload: { conversationId: conversation.id, messageId: message.id },
      });
    } catch {
      // Non-critical: notification failure should not fail absence report
    }
  }
}
