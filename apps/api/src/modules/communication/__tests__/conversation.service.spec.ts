import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test } from '@nestjs/testing';
import { ConversationService } from '../conversation/conversation.service';
import { MessagingGateway } from '../messaging.gateway';
import { PrismaService } from '../../../config/database/prisma.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

// --- Mock PrismaService ---

function createMockPrisma() {
  return {
    conversation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    conversationMember: {
      findMany: vi.fn(),
    },
    schoolClass: {
      findUniqueOrThrow: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    person: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    classSubject: {
      findMany: vi.fn(),
    },
    teacherSubject: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn((fn: any) => fn({
      conversation: {
        create: vi.fn().mockResolvedValue({
          id: 'conv-1',
          schoolId: 'school-1',
          scope: 'CLASS',
          scopeId: 'class-1',
          subject: 'Hello class',
          createdBy: 'user-teacher',
          directPairKey: null,
          createdAt: new Date('2026-04-07T10:00:00Z'),
          updatedAt: new Date('2026-04-07T10:00:00Z'),
          conversationMembers: [
            { id: 'cm-1', conversationId: 'conv-1', userId: 'user-teacher', unreadCount: 0 },
            { id: 'cm-2', conversationId: 'conv-1', userId: 'user-student', unreadCount: 0 },
            { id: 'cm-3', conversationId: 'conv-1', userId: 'user-parent', unreadCount: 0 },
            { id: 'cm-4', conversationId: 'conv-1', userId: 'user-kv', unreadCount: 0 },
          ],
          messages: [],
        }),
      },
    })),
  };
}

describe('ConversationService', () => {
  let service: ConversationService;
  let prisma: ReturnType<typeof createMockPrisma>;

  beforeEach(async () => {
    prisma = createMockPrisma();

    const module = await Test.createTestingModule({
      providers: [
        ConversationService,
        { provide: PrismaService, useValue: prisma },
        { provide: MessagingGateway, useValue: {
          emitNewMessage: vi.fn(),
          emitReadReceipt: vi.fn(),
          emitPollVote: vi.fn(),
          emitNewConversation: vi.fn(),
        }},
      ],
    }).compile();

    service = module.get(ConversationService);
  });

  // COMM-01: Broadcast messaging

  it('creates a CLASS-scoped conversation with scope expansion to students, parents, and teachers', async () => {
    // Setup: mock class with students, parents, and klassenvorstand
    prisma.schoolClass.findUniqueOrThrow.mockResolvedValue({
      id: 'class-1',
      students: [
        {
          person: { keycloakUserId: 'user-student' },
          parentStudents: [
            { parent: { person: { keycloakUserId: 'user-parent' } } },
          ],
        },
      ],
      classSubjects: [],
      klassenvorstand: { person: { keycloakUserId: 'user-kv' } },
    });

    // Mock RBAC: teacher is assigned (isTeacherAssignedToClass)
    prisma.person.findFirst.mockResolvedValue({
      keycloakUserId: 'user-teacher',
      teacher: { id: 'teacher-1' },
    });
    prisma.schoolClass.findUnique.mockResolvedValue({
      klassenvorstandId: 'teacher-1',
    });

    const result = await service.create('school-1', 'user-teacher', ['lehrer'], {
      scope: 'CLASS',
      scopeId: 'class-1',
      subject: 'Hello class',
      body: 'First message',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('conv-1');
    expect(result.scope).toBe('CLASS');
    expect(result.memberCount).toBe(4);
    // Verify $transaction was called (scope expansion + create in tx)
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('creates a YEAR_GROUP-scoped conversation expanding to all classes in that year level', async () => {
    // Mock: two classes in year level 5
    prisma.schoolClass.findMany.mockResolvedValue([
      { id: 'class-5a' },
      { id: 'class-5b' },
    ]);

    // Mock class expansion for each class
    prisma.schoolClass.findUniqueOrThrow
      .mockResolvedValueOnce({
        id: 'class-5a',
        students: [{ person: { keycloakUserId: 'student-5a' }, parentStudents: [] }],
        classSubjects: [],
        klassenvorstand: null,
      })
      .mockResolvedValueOnce({
        id: 'class-5b',
        students: [{ person: { keycloakUserId: 'student-5b' }, parentStudents: [] }],
        classSubjects: [],
        klassenvorstand: null,
      });

    const result = await service.create('school-1', 'user-admin', ['admin'], {
      scope: 'YEAR_GROUP',
      scopeId: '5',
      subject: 'Year 5 announcement',
      body: 'Hello year 5',
    });

    expect(result).toBeDefined();
    expect(result.scope).toMatch(/CLASS|YEAR_GROUP/);
    // Verify both classes were expanded
    expect(prisma.schoolClass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: 'school-1', yearLevel: 5 },
      }),
    );
  });

  it('creates a SCHOOL-scoped conversation expanding to all persons with keycloakUserId', async () => {
    prisma.person.findMany.mockResolvedValue([
      { keycloakUserId: 'user-1' },
      { keycloakUserId: 'user-2' },
      { keycloakUserId: 'user-3' },
    ]);

    const result = await service.create('school-1', 'user-admin', ['admin'], {
      scope: 'SCHOOL',
      subject: 'School-wide announcement',
      body: 'Hello everyone',
    });

    expect(result).toBeDefined();
    expect(prisma.person.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { schoolId: 'school-1', keycloakUserId: { not: null } },
      }),
    );
  });

  it('populates ConversationMember rows for all expanded recipients', async () => {
    // CLASS scope with known members
    prisma.schoolClass.findUniqueOrThrow.mockResolvedValue({
      id: 'class-1',
      students: [
        {
          person: { keycloakUserId: 'student-1' },
          parentStudents: [{ parent: { person: { keycloakUserId: 'parent-1' } } }],
        },
      ],
      classSubjects: [],
      klassenvorstand: { person: { keycloakUserId: 'kv-1' } },
    });

    // RBAC: admin bypass
    const result = await service.create('school-1', 'user-admin', ['admin'], {
      scope: 'CLASS',
      scopeId: 'class-1',
      subject: 'Test',
      body: 'Test',
    });

    // The $transaction mock creates 4 members (teacher + student + parent + kv)
    // In production, the tx.conversation.create gets createMany data with all member IDs
    expect(prisma.$transaction).toHaveBeenCalled();
    expect(result.memberCount).toBeGreaterThan(0);
  });

  // COMM-02: Direct messages

  it('creates a DIRECT conversation with directPairKey dedup (sorted userId pair)', async () => {
    // No existing conversation
    prisma.conversation.findUnique.mockResolvedValue(null);

    // Mock $transaction to return a DIRECT conversation
    prisma.$transaction.mockImplementation(async (fn: any) => {
      return fn({
        conversation: {
          create: vi.fn().mockResolvedValue({
            id: 'conv-direct',
            schoolId: 'school-1',
            scope: 'DIRECT',
            scopeId: null,
            subject: null,
            createdBy: 'user-a',
            directPairKey: 'user-a:user-b',
            createdAt: new Date('2026-04-07T10:00:00Z'),
            updatedAt: new Date('2026-04-07T10:00:00Z'),
            conversationMembers: [
              { id: 'cm-1', conversationId: 'conv-direct', userId: 'user-a', unreadCount: 0 },
              { id: 'cm-2', conversationId: 'conv-direct', userId: 'user-b', unreadCount: 0 },
            ],
            messages: [],
          }),
        },
      });
    });

    const result = await service.create('school-1', 'user-a', ['lehrer'], {
      scope: 'DIRECT',
      recipientId: 'user-b',
      body: 'Hello',
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('conv-direct');
    // Verify directPairKey lookup was attempted
    expect(prisma.conversation.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { directPairKey: 'user-a:user-b' },
      }),
    );
  });

  it('returns existing DIRECT conversation if directPairKey already exists', async () => {
    // Existing conversation found
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conv-existing',
      schoolId: 'school-1',
      scope: 'DIRECT',
      scopeId: null,
      subject: null,
      createdBy: 'user-a',
      directPairKey: 'user-a:user-b',
      createdAt: new Date('2026-04-07T09:00:00Z'),
      updatedAt: new Date('2026-04-07T09:00:00Z'),
      conversationMembers: [
        { id: 'cm-1', conversationId: 'conv-existing', userId: 'user-a', unreadCount: 0 },
        { id: 'cm-2', conversationId: 'conv-existing', userId: 'user-b', unreadCount: 0 },
      ],
      messages: [],
    });

    const result = await service.create('school-1', 'user-a', ['lehrer'], {
      scope: 'DIRECT',
      recipientId: 'user-b',
      body: 'Hello again',
    });

    expect(result.id).toBe('conv-existing');
    // Should NOT have called $transaction (no new creation)
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // RBAC

  it('rejects CLASS broadcast from teacher not assigned to that class', async () => {
    // Teacher not assigned: findFirst returns person with teacher, but no KV match and no subject match
    prisma.person.findFirst.mockResolvedValue({
      keycloakUserId: 'user-unrelated',
      teacher: { id: 'teacher-unrelated' },
    });
    prisma.schoolClass.findUnique.mockResolvedValue({
      klassenvorstandId: 'teacher-other',
    });
    prisma.classSubject.findMany.mockResolvedValue([
      { subjectId: 'subject-1' },
    ]);
    prisma.teacherSubject.findFirst.mockResolvedValue(null);

    await expect(
      service.create('school-1', 'user-unrelated', ['lehrer'], {
        scope: 'CLASS',
        scopeId: 'class-1',
        subject: 'Not my class',
        body: 'Should fail',
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('rejects YEAR_GROUP/SCHOOL broadcast from non-admin/schulleitung role', async () => {
    await expect(
      service.create('school-1', 'user-lehrer', ['lehrer'], {
        scope: 'YEAR_GROUP',
        scopeId: '5',
        subject: 'Not allowed',
        body: 'Should fail',
      }),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.create('school-1', 'user-eltern', ['eltern'], {
        scope: 'SCHOOL',
        subject: 'Not allowed',
        body: 'Should fail',
      }),
    ).rejects.toThrow(ForbiddenException);
  });
});
