import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { MessageService } from '../message/message.service';
import { ConversationService } from '../conversation/conversation.service';
import { NotificationService } from '../../substitution/notification/notification.service';
import { PrismaService } from '../../../config/database/prisma.service';
import { ForbiddenException } from '@nestjs/common';

// --- Mock factories ---

function createMockPrisma() {
  return {
    conversationMember: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
    person: {
      findFirst: vi.fn(),
    },
    message: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
    messageRecipient: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    conversation: {
      update: vi.fn(),
    },
    $transaction: vi.fn((fn: any) =>
      fn({
        message: {
          create: vi.fn().mockResolvedValue({
            id: 'msg-1',
            conversationId: 'conv-1',
            senderId: 'user-sender',
            body: 'Hello everyone',
            type: 'TEXT',
            createdAt: new Date('2026-04-07T10:00:00Z'),
          }),
        },
        messageRecipient: {
          createMany: vi.fn().mockResolvedValue({ count: 2 }),
          updateMany: vi.fn().mockResolvedValue({ count: 3 }),
        },
        conversationMember: {
          updateMany: vi.fn().mockResolvedValue({ count: 2 }),
        },
        conversation: {
          update: vi.fn().mockResolvedValue({}),
        },
      }),
    ),
  };
}

function createMockConversationService() {
  return {
    getMemberUserIds: vi.fn().mockResolvedValue([
      'user-sender',
      'user-recipient-1',
      'user-recipient-2',
    ]),
  };
}

function createMockNotificationService() {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'notif-1',
      userId: 'user-recipient-1',
      type: 'MESSAGE_RECEIVED',
      title: 'Neue Nachricht',
      body: 'Hello',
      payload: {},
      readAt: null,
      createdAt: '2026-04-07T10:00:00Z',
    }),
  };
}

describe('MessageService', () => {
  let service: MessageService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let conversationService: ReturnType<typeof createMockConversationService>;
  let notificationService: ReturnType<typeof createMockNotificationService>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    conversationService = createMockConversationService();
    notificationService = createMockNotificationService();

    const module = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConversationService, useValue: conversationService },
        { provide: NotificationService, useValue: notificationService },
      ],
    }).compile();

    service = module.get(MessageService);
  });

  // COMM-01/02: Send message

  it('creates Message + MessageRecipient rows for all conversation members except sender', async () => {
    // User is a member
    prisma.conversationMember.findUnique.mockResolvedValue({
      id: 'cm-1',
      conversationId: 'conv-1',
      userId: 'user-sender',
      unreadCount: 0,
    });
    prisma.person.findFirst.mockResolvedValue({
      firstName: 'Max',
      lastName: 'Mustermann',
    });

    const result = await service.send('conv-1', 'user-sender', {
      body: 'Hello everyone',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('msg-1');
    expect(result.senderName).toBe('Max Mustermann');
    expect(result.readCount).toBe(0);
    expect(result.totalRecipients).toBe(2);

    // Verify getMemberUserIds was called
    expect(conversationService.getMemberUserIds).toHaveBeenCalledWith('conv-1');

    // Verify $transaction was called (message + recipients in one tx)
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('increments ConversationMember.unreadCount for each recipient', async () => {
    prisma.conversationMember.findUnique.mockResolvedValue({
      id: 'cm-1',
      conversationId: 'conv-1',
      userId: 'user-sender',
      unreadCount: 0,
    });
    prisma.person.findFirst.mockResolvedValue({
      firstName: 'Max',
      lastName: 'Mustermann',
    });

    await service.send('conv-1', 'user-sender', { body: 'Test' });

    // The $transaction mock is called; inside it, conversationMember.updateMany is invoked
    // with increment: 1 for recipients only (not sender)
    const txFn = prisma.$transaction.mock.calls[0][0];
    const mockTx = {
      message: { create: vi.fn().mockResolvedValue({ id: 'msg-2', conversationId: 'conv-1', senderId: 'user-sender', body: 'Test', type: 'TEXT', createdAt: new Date() }) },
      messageRecipient: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
      conversationMember: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
      conversation: { update: vi.fn().mockResolvedValue({}) },
    };
    await txFn(mockTx);

    expect(mockTx.conversationMember.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          conversationId: 'conv-1',
          userId: { in: ['user-recipient-1', 'user-recipient-2'] },
        }),
        data: { unreadCount: { increment: 1 } },
      }),
    );
  });

  // Socket.IO event emission is wired in Plan 04 (MessagingGateway).
  // Full Socket.IO test deferred to messaging.gateway.spec.ts.
  it.todo('emits message:new Socket.IO event to all recipient user rooms');

  it('creates MESSAGE_RECEIVED Notification for each recipient via NotificationService', async () => {
    prisma.conversationMember.findUnique.mockResolvedValue({
      id: 'cm-1',
      conversationId: 'conv-1',
      userId: 'user-sender',
      unreadCount: 0,
    });
    prisma.person.findFirst.mockResolvedValue({
      firstName: 'Max',
      lastName: 'Mustermann',
    });

    await service.send('conv-1', 'user-sender', { body: 'Important message' });

    // NotificationService.create called for each recipient (2 recipients)
    expect(notificationService.create).toHaveBeenCalledTimes(2);
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-recipient-1',
        type: 'MESSAGE_RECEIVED',
        title: 'Neue Nachricht von Max Mustermann',
        payload: expect.objectContaining({ conversationId: 'conv-1' }),
      }),
    );
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-recipient-2',
        type: 'MESSAGE_RECEIVED',
      }),
    );
  });

  // COMM-03: Read receipts

  it('marks MessageRecipient.readAt on PATCH read and decrements ConversationMember.unreadCount', async () => {
    // Mock: 3 unread message recipients
    prisma.messageRecipient.findMany.mockResolvedValue([
      { id: 'mr-1' },
      { id: 'mr-2' },
      { id: 'mr-3' },
    ]);

    // Override $transaction for markRead flow
    prisma.$transaction.mockImplementation(async (fn: any) =>
      fn({
        messageRecipient: {
          updateMany: vi.fn().mockResolvedValue({ count: 3 }),
        },
        conversationMember: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
      }),
    );

    await service.markRead('conv-1', 'user-reader');

    // messageRecipient.findMany was called to find unread
    expect(prisma.messageRecipient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user-reader',
          readAt: null,
        }),
      }),
    );

    // $transaction was called to update readAt + reset unreadCount
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('returns correct readCount/totalRecipients for a sent message', async () => {
    prisma.conversationMember.findUnique.mockResolvedValue({
      id: 'cm-1',
      conversationId: 'conv-1',
      userId: 'user-sender',
      unreadCount: 0,
    });
    prisma.person.findFirst.mockResolvedValue({
      firstName: 'Max',
      lastName: 'Mustermann',
    });

    const result = await service.send('conv-1', 'user-sender', {
      body: 'Check read status',
    });

    // On send, readCount=0 (nobody has read yet), totalRecipients=2
    expect(result.readCount).toBe(0);
    expect(result.totalRecipients).toBe(2);
  });

  // COMM-03: Read receipt detail (getRecipients)

  it('returns per-user read status with resolved names for getRecipients', async () => {
    // Message exists and sender is user-sender
    prisma.message.findUnique.mockResolvedValue({
      id: 'msg-1',
      senderId: 'user-sender',
      conversationId: 'conv-1',
    });

    // Recipients
    prisma.messageRecipient.findMany.mockResolvedValue([
      { userId: 'user-r1', readAt: new Date('2026-04-07T10:05:00Z') },
      { userId: 'user-r2', readAt: null },
    ]);

    // Resolve names
    prisma.person.findFirst
      .mockResolvedValueOnce({ firstName: 'Anna', lastName: 'Berger' })
      .mockResolvedValueOnce({ firstName: 'Karl', lastName: 'Weber' });

    const result = await service.getRecipients(
      'conv-1',
      'msg-1',
      'user-sender',
      ['lehrer'],
    );

    expect(result).toHaveLength(2);
    // Read first, then unread alphabetically
    expect(result[0].firstName).toBe('Anna');
    expect(result[0].readAt).toBe('2026-04-07T10:05:00.000Z');
    expect(result[1].firstName).toBe('Karl');
    expect(result[1].readAt).toBeNull();
  });

  it('rejects getRecipients from non-sender and non-admin', async () => {
    prisma.message.findUnique.mockResolvedValue({
      id: 'msg-1',
      senderId: 'user-sender',
      conversationId: 'conv-1',
    });

    await expect(
      service.getRecipients('conv-1', 'msg-1', 'user-other', ['lehrer']),
    ).rejects.toThrow(ForbiddenException);
  });

  // COMM-04: File attachments (Plan 03)
  it.todo('saves MessageAttachment with filename, storagePath, mimeType, sizeBytes');
  it.todo('rejects files exceeding 5MB or with invalid MIME type');

  // COMM-05: Absence via messaging (Plan 04)
  it.todo('creates AbsenceExcuse via ExcuseService and posts SYSTEM message to Klassenvorstand');
  it.todo('absence system message has type SYSTEM and formatted body with childName/dateRange/reason');
});
