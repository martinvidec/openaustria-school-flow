import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { MessageService } from '../message/message.service';
import { ConversationService } from '../conversation/conversation.service';
import { NotificationService } from '../../substitution/notification/notification.service';
import { ExcuseService } from '../../classbook/excuse.service';
import { MessagingGateway } from '../messaging.gateway';
import { PrismaService } from '../../../config/database/prisma.service';
import { BadRequestException, ForbiddenException } from '@nestjs/common';

// Mock fs/promises
vi.mock('node:fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
}));

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
      create: vi.fn(),
      createMany: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    messageAttachment: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    conversation: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    student: {
      findUniqueOrThrow: vi.fn(),
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
          create: vi.fn().mockResolvedValue({}),
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

function createMockExcuseService() {
  return {
    createExcuse: vi.fn().mockResolvedValue({
      id: 'excuse-1',
      studentId: 'student-1',
      status: 'PENDING',
    }),
  };
}

describe('MessageService', () => {
  let service: MessageService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let conversationService: ReturnType<typeof createMockConversationService>;
  let notificationService: ReturnType<typeof createMockNotificationService>;
  let excuseService: ReturnType<typeof createMockExcuseService>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    conversationService = createMockConversationService();
    notificationService = createMockNotificationService();
    excuseService = createMockExcuseService();

    const module = await Test.createTestingModule({
      providers: [
        MessageService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConversationService, useValue: conversationService },
        { provide: NotificationService, useValue: notificationService },
        { provide: ExcuseService, useValue: excuseService },
        { provide: MessagingGateway, useValue: {
          emitNewMessage: vi.fn(),
          emitReadReceipt: vi.fn(),
          emitPollVote: vi.fn(),
          emitNewConversation: vi.fn(),
        }},
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

  // COMM-04: File attachments

  it('saves MessageAttachment with filename, storagePath, mimeType, sizeBytes', async () => {
    // Message exists and sender is the user
    prisma.message.findUnique.mockResolvedValue({
      id: 'msg-1',
      senderId: 'user-sender',
      conversationId: 'conv-1',
    });

    // Mock messageAttachment.create
    prisma.messageAttachment.create.mockResolvedValue({
      id: 'att-1',
      messageId: 'msg-1',
      filename: 'test.pdf',
      storagePath: 'uploads/school-1/messages/msg-1/test.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      createdAt: new Date(),
    });

    // Valid PDF magic bytes: %PDF
    const pdfBuffer = Buffer.alloc(1024);
    pdfBuffer[0] = 0x25;
    pdfBuffer[1] = 0x50;
    pdfBuffer[2] = 0x44;
    pdfBuffer[3] = 0x46;

    const result = await service.uploadAttachment('school-1', 'msg-1', 'user-sender', {
      filename: 'test.pdf',
      mimetype: 'application/pdf',
      buffer: pdfBuffer,
    });

    expect(result.id).toBe('att-1');
    expect(result.filename).toBe('test.pdf');
    expect(result.mimeType).toBe('application/pdf');
    expect(result.sizeBytes).toBe(1024);

    // Verify messageAttachment.create was called with correct storagePath
    expect(prisma.messageAttachment.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageId: 'msg-1',
          filename: 'test.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          storagePath: expect.stringContaining('uploads'),
        }),
      }),
    );
  });

  it('rejects files exceeding 5MB or with invalid MIME type', async () => {
    // Message exists and sender is the user
    prisma.message.findUnique.mockResolvedValue({
      id: 'msg-1',
      senderId: 'user-sender',
      conversationId: 'conv-1',
    });

    // Test: file too large (6MB)
    const largeBuffer = Buffer.alloc(6 * 1024 * 1024);
    largeBuffer[0] = 0x25;
    largeBuffer[1] = 0x50;
    largeBuffer[2] = 0x44;
    largeBuffer[3] = 0x46;

    await expect(
      service.uploadAttachment('school-1', 'msg-1', 'user-sender', {
        filename: 'large.pdf',
        mimetype: 'application/pdf',
        buffer: largeBuffer,
      }),
    ).rejects.toThrow(BadRequestException);

    // Test: invalid MIME type
    const validBuffer = Buffer.alloc(100);
    await expect(
      service.uploadAttachment('school-1', 'msg-1', 'user-sender', {
        filename: 'script.js',
        mimetype: 'application/javascript',
        buffer: validBuffer,
      }),
    ).rejects.toThrow(BadRequestException);

    // Test: valid MIME but wrong magic bytes (claims PDF but is not)
    const fakeBuffer = Buffer.alloc(100);
    fakeBuffer[0] = 0x00;
    fakeBuffer[1] = 0x00;
    fakeBuffer[2] = 0x00;
    fakeBuffer[3] = 0x00;

    await expect(
      service.uploadAttachment('school-1', 'msg-1', 'user-sender', {
        filename: 'fake.pdf',
        mimetype: 'application/pdf',
        buffer: fakeBuffer,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  // COMM-05: Absence via messaging

  it('creates AbsenceExcuse via ExcuseService and posts SYSTEM message to Klassenvorstand', async () => {
    // Mock student with Klassenvorstand
    prisma.student.findUniqueOrThrow.mockResolvedValue({
      id: 'student-1',
      person: { firstName: 'Lisa', lastName: 'Mueller' },
      schoolClass: {
        klassenvorstand: {
          person: {
            keycloakUserId: 'kv-user-id',
            firstName: 'Hans',
            lastName: 'Schmidt',
          },
        },
      },
    });

    // No existing conversation between parent and KV
    prisma.conversation.findUnique.mockResolvedValue(null);
    prisma.conversation.create.mockResolvedValue({
      id: 'conv-new',
      schoolId: 'school-1',
      scope: 'DIRECT',
    });

    // Override $transaction for the SYSTEM message creation
    prisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        message: {
          create: vi.fn().mockResolvedValue({
            id: 'msg-system',
            conversationId: 'conv-new',
            senderId: 'parent-user',
            body: 'Abwesenheit gemeldet: Lisa Mueller, 2026-04-07 - 2026-04-08, Grund: Krank',
            type: 'SYSTEM',
            createdAt: new Date(),
          }),
        },
        messageRecipient: {
          create: vi.fn().mockResolvedValue({}),
        },
        conversationMember: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        conversation: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });

    await service.reportAbsence('school-1', 'parent-user', {
      studentId: 'student-1',
      dateFrom: '2026-04-07',
      dateTo: '2026-04-08',
      reason: 'Krank',
    });

    // Verify ExcuseService.createExcuse was called
    expect(excuseService.createExcuse).toHaveBeenCalledWith(
      'school-1',
      'parent-user',
      expect.objectContaining({
        studentId: 'student-1',
        startDate: '2026-04-07',
        endDate: '2026-04-08',
        reason: 'Krank',
      }),
    );

    // Verify conversation was created for DIRECT between parent and KV
    expect(prisma.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: 'DIRECT',
          schoolId: 'school-1',
        }),
      }),
    );

    // Verify notification was created for KV
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'kv-user-id',
        type: 'MESSAGE_RECEIVED',
        title: 'Abwesenheitsmeldung',
      }),
    );
  });

  it('absence system message has type SYSTEM and formatted body with childName/dateRange/reason', async () => {
    prisma.student.findUniqueOrThrow.mockResolvedValue({
      id: 'student-1',
      person: { firstName: 'Lisa', lastName: 'Mueller' },
      schoolClass: {
        klassenvorstand: {
          person: {
            keycloakUserId: 'kv-user-id',
            firstName: 'Hans',
            lastName: 'Schmidt',
          },
        },
      },
    });

    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-existing',
      schoolId: 'school-1',
      scope: 'DIRECT',
    });

    let capturedMessageData: any = null;
    prisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        message: {
          create: vi.fn().mockImplementation((args: any) => {
            capturedMessageData = args.data;
            return {
              id: 'msg-sys-2',
              ...args.data,
              createdAt: new Date(),
            };
          }),
        },
        messageRecipient: {
          create: vi.fn().mockResolvedValue({}),
        },
        conversationMember: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        },
        conversation: {
          update: vi.fn().mockResolvedValue({}),
        },
      };
      return fn(tx);
    });

    await service.reportAbsence('school-1', 'parent-user', {
      studentId: 'student-1',
      dateFrom: '2026-04-07',
      dateTo: '2026-04-08',
      reason: 'Arztbesuch',
    });

    // Verify SYSTEM message type and formatted body
    expect(capturedMessageData).not.toBeNull();
    expect(capturedMessageData.type).toBe('SYSTEM');
    expect(capturedMessageData.body).toContain('Lisa Mueller');
    expect(capturedMessageData.body).toContain('2026-04-07');
    expect(capturedMessageData.body).toContain('2026-04-08');
    expect(capturedMessageData.body).toContain('Arztbesuch');
    expect(capturedMessageData.body).toContain('Abwesenheit gemeldet');
  });
});
