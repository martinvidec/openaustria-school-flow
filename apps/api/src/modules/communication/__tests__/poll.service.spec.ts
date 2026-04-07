import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { PollService } from '../poll/poll.service';
import { NotificationService } from '../../substitution/notification/notification.service';
import { MessagingGateway } from '../messaging.gateway';
import { PrismaService } from '../../../config/database/prisma.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

// --- Mock factories ---

function createMockPrisma() {
  return {
    conversationMember: {
      findUnique: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      updateMany: vi.fn(),
    },
    person: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    messageRecipient: {
      createMany: vi.fn(),
    },
    conversation: {
      update: vi.fn(),
    },
    poll: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    pollOption: {
      create: vi.fn(),
    },
    pollVote: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn(),
  };
}

function createMockNotificationService() {
  return {
    create: vi.fn().mockResolvedValue({
      id: 'notif-1',
      type: 'MESSAGE_RECEIVED',
    }),
  };
}

describe('PollService', () => {
  let service: PollService;
  let prisma: ReturnType<typeof createMockPrisma>;
  let notificationService: ReturnType<typeof createMockNotificationService>;

  beforeEach(async () => {
    prisma = createMockPrisma();
    notificationService = createMockNotificationService();

    const module = await Test.createTestingModule({
      providers: [
        PollService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationService, useValue: notificationService },
        { provide: MessagingGateway, useValue: {
          emitNewMessage: vi.fn(),
          emitReadReceipt: vi.fn(),
          emitPollVote: vi.fn(),
          emitNewConversation: vi.fn(),
        }},
      ],
    }).compile();

    service = module.get(PollService);
  });

  // COMM-06: Create poll with message

  it('creates Poll with SINGLE_CHOICE type and 2-10 PollOption rows', async () => {
    // User is a member
    prisma.conversationMember.findUnique.mockResolvedValue({
      id: 'cm-1',
      conversationId: 'conv-1',
      userId: 'user-sender',
    });

    // Resolve sender name
    prisma.person.findFirst.mockResolvedValue({
      firstName: 'Max',
      lastName: 'Mustermann',
    });

    // Get all members
    prisma.conversationMember.findMany.mockResolvedValue([
      { userId: 'user-sender' },
      { userId: 'user-r1' },
      { userId: 'user-r2' },
    ]);

    // Mock transaction: simulates creating message + poll + options
    const mockMsg = {
      id: 'msg-poll-1',
      conversationId: 'conv-1',
      senderId: 'user-sender',
      body: 'Was soll es zum Mittagessen geben?',
      type: 'POLL',
      createdAt: new Date('2026-04-07T12:00:00Z'),
    };
    const mockPoll = {
      id: 'poll-1',
      messageId: 'msg-poll-1',
      question: 'Mittagessen?',
      type: 'SINGLE_CHOICE',
      deadline: null,
      isClosed: false,
    };
    const mockOptions = [
      { id: 'opt-1', pollId: 'poll-1', text: 'Pizza', order: 0 },
      { id: 'opt-2', pollId: 'poll-1', text: 'Pasta', order: 1 },
      { id: 'opt-3', pollId: 'poll-1', text: 'Salat', order: 2 },
    ];

    prisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        message: { create: vi.fn().mockResolvedValue(mockMsg) },
        poll: { create: vi.fn().mockResolvedValue(mockPoll) },
        pollOption: {
          create: vi.fn()
            .mockResolvedValueOnce(mockOptions[0])
            .mockResolvedValueOnce(mockOptions[1])
            .mockResolvedValueOnce(mockOptions[2]),
        },
        messageRecipient: { createMany: vi.fn().mockResolvedValue({ count: 2 }) },
        conversationMember: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) },
        conversation: { update: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await service.createWithMessage(
      'conv-1',
      'user-sender',
      'Was soll es zum Mittagessen geben?',
      {
        question: 'Mittagessen?',
        type: 'SINGLE_CHOICE',
        options: ['Pizza', 'Pasta', 'Salat'],
      },
    );

    expect(result.type).toBe('POLL');
    expect(result.poll).not.toBeNull();
    expect(result.poll!.type).toBe('SINGLE_CHOICE');
    expect(result.poll!.question).toBe('Mittagessen?');
    expect(result.poll!.options).toHaveLength(3);
    expect(result.poll!.options[0].text).toBe('Pizza');
    expect(result.poll!.options[1].text).toBe('Pasta');
    expect(result.poll!.options[2].text).toBe('Salat');
    expect(result.poll!.isClosed).toBe(false);
    expect(result.senderName).toBe('Max Mustermann');
    expect(result.totalRecipients).toBe(2);

    // Verify $transaction was called
    expect(prisma.$transaction).toHaveBeenCalled();

    // Verify notifications sent to recipients
    expect(notificationService.create).toHaveBeenCalledTimes(2);
    expect(notificationService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-r1',
        type: 'MESSAGE_RECEIVED',
        title: expect.stringContaining('Umfrage'),
      }),
    );
  });

  it('creates Poll with MULTIPLE_CHOICE type', async () => {
    prisma.conversationMember.findUnique.mockResolvedValue({
      id: 'cm-1',
      conversationId: 'conv-1',
      userId: 'user-sender',
    });
    prisma.person.findFirst.mockResolvedValue({ firstName: 'Anna', lastName: 'Berger' });
    prisma.conversationMember.findMany.mockResolvedValue([
      { userId: 'user-sender' },
      { userId: 'user-r1' },
    ]);

    prisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        message: {
          create: vi.fn().mockResolvedValue({
            id: 'msg-2',
            conversationId: 'conv-1',
            senderId: 'user-sender',
            body: 'Welche Tage passen?',
            type: 'POLL',
            createdAt: new Date(),
          }),
        },
        poll: {
          create: vi.fn().mockResolvedValue({
            id: 'poll-2',
            question: 'Welche Tage?',
            type: 'MULTIPLE_CHOICE',
            deadline: null,
            isClosed: false,
          }),
        },
        pollOption: {
          create: vi.fn()
            .mockResolvedValueOnce({ id: 'opt-a', text: 'Montag', order: 0 })
            .mockResolvedValueOnce({ id: 'opt-b', text: 'Dienstag', order: 1 }),
        },
        messageRecipient: { createMany: vi.fn().mockResolvedValue({ count: 1 }) },
        conversationMember: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        conversation: { update: vi.fn().mockResolvedValue({}) },
      };
      return fn(tx);
    });

    const result = await service.createWithMessage(
      'conv-1',
      'user-sender',
      'Welche Tage passen?',
      {
        question: 'Welche Tage?',
        type: 'MULTIPLE_CHOICE',
        options: ['Montag', 'Dienstag'],
      },
    );

    expect(result.poll!.type).toBe('MULTIPLE_CHOICE');
    expect(result.poll!.options).toHaveLength(2);
  });

  // COMM-06: Cast vote

  it('casts a vote creating PollVote row (single choice replaces previous vote)', async () => {
    prisma.poll.findUnique.mockResolvedValue({
      id: 'poll-1',
      type: 'SINGLE_CHOICE',
      isClosed: false,
      deadline: null,
      message: {
        conversationId: 'conv-1',
        senderId: 'user-sender',
        conversation: {
          conversationMembers: [{ userId: 'user-voter' }],
        },
      },
      options: [
        { id: 'opt-1', text: 'Pizza', order: 0, votes: [] },
        { id: 'opt-2', text: 'Pasta', order: 1, votes: [{ userId: 'user-voter' }] },
      ],
    });

    // Transaction: delete old votes, create new
    prisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        pollVote: {
          deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
          create: vi.fn().mockResolvedValue({ id: 'pv-1' }),
        },
      };
      return fn(tx);
    });

    // Mock getResults for the return value
    // After casting, need to re-fetch poll
    const getResultsSpy = vi.spyOn(service, 'getResults').mockResolvedValue({
      id: 'poll-1',
      question: 'Mittagessen?',
      type: 'SINGLE_CHOICE',
      deadline: null,
      isClosed: false,
      options: [
        { id: 'opt-1', text: 'Pizza', voteCount: 1 },
        { id: 'opt-2', text: 'Pasta', voteCount: 0 },
      ],
      userVoteOptionIds: ['opt-1'],
    });

    const result = await service.castVote('poll-1', 'user-voter', {
      optionIds: ['opt-1'],
    });

    expect(result.userVoteOptionIds).toEqual(['opt-1']);
    expect(result.options[0].voteCount).toBe(1);
    expect(prisma.$transaction).toHaveBeenCalled();

    getResultsSpy.mockRestore();
  });

  it('casts multiple votes for MULTIPLE_CHOICE poll', async () => {
    prisma.poll.findUnique.mockResolvedValue({
      id: 'poll-2',
      type: 'MULTIPLE_CHOICE',
      isClosed: false,
      deadline: null,
      message: {
        conversationId: 'conv-1',
        senderId: 'user-sender',
        conversation: {
          conversationMembers: [{ userId: 'user-voter' }],
        },
      },
      options: [
        { id: 'opt-a', text: 'Montag', order: 0, votes: [] },
        { id: 'opt-b', text: 'Dienstag', order: 1, votes: [] },
        { id: 'opt-c', text: 'Mittwoch', order: 2, votes: [] },
      ],
    });

    prisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        pollVote: {
          deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          create: vi.fn().mockResolvedValue({ id: 'pv-new' }),
        },
      };
      return fn(tx);
    });

    const getResultsSpy = vi.spyOn(service, 'getResults').mockResolvedValue({
      id: 'poll-2',
      question: 'Welche Tage?',
      type: 'MULTIPLE_CHOICE',
      deadline: null,
      isClosed: false,
      options: [
        { id: 'opt-a', text: 'Montag', voteCount: 1 },
        { id: 'opt-b', text: 'Dienstag', voteCount: 1 },
        { id: 'opt-c', text: 'Mittwoch', voteCount: 0 },
      ],
      userVoteOptionIds: ['opt-a', 'opt-b'],
    });

    const result = await service.castVote('poll-2', 'user-voter', {
      optionIds: ['opt-a', 'opt-b'],
    });

    expect(result.userVoteOptionIds).toEqual(['opt-a', 'opt-b']);
    expect(result.options[0].voteCount).toBe(1);
    expect(result.options[1].voteCount).toBe(1);
    expect(result.options[2].voteCount).toBe(0);

    getResultsSpy.mockRestore();
  });

  // COMM-06: Deadline and closed poll

  it('rejects vote on closed poll or past deadline', async () => {
    // Test 1: closed poll
    prisma.poll.findUnique.mockResolvedValue({
      id: 'poll-closed',
      type: 'SINGLE_CHOICE',
      isClosed: true,
      deadline: null,
      message: {
        conversationId: 'conv-1',
        senderId: 'user-sender',
        conversation: {
          conversationMembers: [{ userId: 'user-voter' }],
        },
      },
      options: [
        { id: 'opt-1', text: 'A', order: 0, votes: [] },
        { id: 'opt-2', text: 'B', order: 1, votes: [] },
      ],
    });

    await expect(
      service.castVote('poll-closed', 'user-voter', { optionIds: ['opt-1'] }),
    ).rejects.toThrow(BadRequestException);

    // Test 2: past deadline (auto-close)
    const pastDate = new Date('2020-01-01');
    prisma.poll.findUnique.mockResolvedValue({
      id: 'poll-expired',
      type: 'SINGLE_CHOICE',
      isClosed: false,
      deadline: pastDate,
      message: {
        conversationId: 'conv-1',
        senderId: 'user-sender',
        conversation: {
          conversationMembers: [{ userId: 'user-voter' }],
        },
      },
      options: [
        { id: 'opt-1', text: 'A', order: 0, votes: [] },
      ],
    });

    prisma.poll.update.mockResolvedValue({});

    await expect(
      service.castVote('poll-expired', 'user-voter', { optionIds: ['opt-1'] }),
    ).rejects.toThrow(BadRequestException);

    // Verify the poll was auto-closed
    expect(prisma.poll.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'poll-expired' },
        data: { isClosed: true },
      }),
    );
  });

  // COMM-06: Close poll

  it('closes poll via closePoll and sets isClosed=true', async () => {
    prisma.poll.findUnique.mockResolvedValue({
      id: 'poll-1',
      isClosed: false,
      message: { senderId: 'user-sender' },
    });

    prisma.poll.update.mockResolvedValue({});

    // Mock getResults for the return value
    const getResultsSpy = vi.spyOn(service, 'getResults').mockResolvedValue({
      id: 'poll-1',
      question: 'Test?',
      type: 'SINGLE_CHOICE',
      deadline: null,
      isClosed: true,
      options: [],
      userVoteOptionIds: [],
    });

    const result = await service.closePoll('poll-1', 'user-sender', ['lehrer']);

    expect(result.isClosed).toBe(true);
    expect(prisma.poll.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'poll-1' },
        data: { isClosed: true },
      }),
    );

    getResultsSpy.mockRestore();
  });

  // COMM-06: Results visibility (D-10)

  it('returns named voters for sender/admin, anonymous aggregated counts for others (D-10)', async () => {
    // Setup: poll with 2 votes on option 1
    prisma.poll.findUnique.mockResolvedValue({
      id: 'poll-1',
      question: 'Mittagessen?',
      type: 'SINGLE_CHOICE',
      deadline: null,
      isClosed: false,
      message: { senderId: 'user-sender' },
      options: [
        {
          id: 'opt-1',
          text: 'Pizza',
          order: 0,
          votes: [
            { userId: 'user-r1', createdAt: new Date() },
            { userId: 'user-r2', createdAt: new Date() },
          ],
        },
        {
          id: 'opt-2',
          text: 'Pasta',
          order: 1,
          votes: [],
        },
      ],
    });

    // Resolve voter names
    prisma.person.findMany.mockResolvedValue([
      { keycloakUserId: 'user-r1', firstName: 'Anna', lastName: 'Berger' },
      { keycloakUserId: 'user-r2', firstName: 'Karl', lastName: 'Weber' },
    ]);

    // Test 1: Sender gets named voters
    const senderResult = await service.getResults('poll-1', 'user-sender', ['lehrer']);

    expect(senderResult.options[0].voteCount).toBe(2);
    expect(senderResult.options[0].voters).toBeDefined();
    expect(senderResult.options[0].voters).toHaveLength(2);
    expect(senderResult.options[0].voters![0].name).toBe('Anna Berger');
    expect(senderResult.options[0].voters![1].name).toBe('Karl Weber');

    // Test 2: Non-sender gets anonymous counts
    const otherResult = await service.getResults('poll-1', 'user-other', ['lehrer']);

    expect(otherResult.options[0].voteCount).toBe(2);
    expect(otherResult.options[0].voters).toBeUndefined();

    // Test 3: Admin gets named voters even if not sender
    prisma.person.findMany.mockResolvedValue([
      { keycloakUserId: 'user-r1', firstName: 'Anna', lastName: 'Berger' },
      { keycloakUserId: 'user-r2', firstName: 'Karl', lastName: 'Weber' },
    ]);

    const adminResult = await service.getResults('poll-1', 'user-admin', ['admin']);

    expect(adminResult.options[0].voters).toBeDefined();
    expect(adminResult.options[0].voters).toHaveLength(2);
  });
});
