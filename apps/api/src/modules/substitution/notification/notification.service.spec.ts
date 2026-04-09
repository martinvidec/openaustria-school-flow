import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Queue } from 'bullmq';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { PrismaService } from '../../../config/database/prisma.service';

/**
 * SUBST-03 -- NotificationService CRUD + dedup + recipient resolution tests.
 *
 * Covers:
 *  - create() persists + emits via gateway
 *  - markRead()/markAllRead() updates DB + emits badge
 *  - listForUser() pagination + sorting
 *  - Dedup upsert for SUBSTITUTION_OFFER (Pitfall 8)
 *  - resolveRecipientsForSubstitutionEvent returns correct role cohort per event type
 */

function createService() {
  const prismaMock: any = {
    notification: {
      create: vi.fn(),
      findFirst: vi.fn().mockResolvedValue(null),
      update: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      count: vi.fn().mockResolvedValue(0),
      findUniqueOrThrow: vi.fn(),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    substitution: {
      findUniqueOrThrow: vi.fn(),
    },
    teacher: {
      findUnique: vi.fn(),
    },
    classSubject: {
      findUnique: vi.fn(),
    },
    person: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  const gatewayMock: any = {
    emitNewNotification: vi.fn(),
    emitBadgeUpdate: vi.fn(),
  };

  const pushQueueMock = {
    add: vi.fn().mockResolvedValue({ id: 'bull-job-1' }),
  };

  const service = new NotificationService(
    prismaMock as PrismaService,
    gatewayMock as NotificationGateway,
    pushQueueMock as unknown as Queue,
  );
  return { service, prismaMock, gatewayMock, pushQueueMock };
}

describe('NotificationService (SUBST-03)', () => {
  it('create() persists Notification row with userId, type, title, body, payload', async () => {
    const { service, prismaMock } = createService();
    const row = {
      id: 'n-1',
      userId: 'user-1',
      type: 'ABSENCE_RECORDED',
      title: 'Abwesenheit erfasst',
      body: 'Krankheit ab 2026-04-20',
      payload: { absenceId: 'abs-1' },
      readAt: null,
      createdAt: new Date('2026-04-05T09:00:00Z'),
    };
    prismaMock.notification.create.mockResolvedValue(row);

    await service.create({
      userId: 'user-1',
      type: 'ABSENCE_RECORDED',
      title: 'Abwesenheit erfasst',
      body: 'Krankheit ab 2026-04-20',
      payload: { absenceId: 'abs-1' },
    });

    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
    const arg = prismaMock.notification.create.mock.calls[0][0];
    expect(arg.data.userId).toBe('user-1');
    expect(arg.data.type).toBe('ABSENCE_RECORDED');
    expect(arg.data.title).toBe('Abwesenheit erfasst');
    expect(arg.data.body).toBe('Krankheit ab 2026-04-20');
    expect(arg.data.payload).toEqual({ absenceId: 'abs-1' });
  });

  it('create() emits notification:new via NotificationGateway with fresh unreadCount', async () => {
    const { service, prismaMock, gatewayMock } = createService();
    prismaMock.notification.create.mockResolvedValue({
      id: 'n-1',
      userId: 'user-1',
      type: 'ABSENCE_RECORDED',
      title: 't',
      body: 'b',
      payload: null,
      readAt: null,
      createdAt: new Date(),
    });
    prismaMock.notification.count.mockResolvedValue(3);

    await service.create({
      userId: 'user-1',
      type: 'ABSENCE_RECORDED',
      title: 't',
      body: 'b',
    });

    expect(gatewayMock.emitNewNotification).toHaveBeenCalledOnce();
    const [userId, dto, unreadCount] = gatewayMock.emitNewNotification.mock.calls[0];
    expect(userId).toBe('user-1');
    expect(dto.id).toBe('n-1');
    expect(unreadCount).toBe(3);
  });

  it('markRead() sets readAt timestamp and re-emits badge with updated unreadCount', async () => {
    const { service, prismaMock, gatewayMock } = createService();
    prismaMock.notification.findUniqueOrThrow.mockResolvedValue({
      id: 'n-1',
      userId: 'user-1',
      readAt: null,
    });
    prismaMock.notification.update.mockResolvedValue({});
    prismaMock.notification.count.mockResolvedValue(2);

    await service.markRead('n-1', 'user-1');

    expect(prismaMock.notification.update).toHaveBeenCalledWith({
      where: { id: 'n-1' },
      data: expect.objectContaining({ readAt: expect.any(Date) }),
    });
    expect(gatewayMock.emitBadgeUpdate).toHaveBeenCalledWith('user-1', 2);
  });

  it('markAllRead() sets readAt on all unread rows for user and emits badge with unreadCount=0', async () => {
    const { service, prismaMock, gatewayMock } = createService();
    prismaMock.notification.updateMany.mockResolvedValue({ count: 4 });

    await service.markAllRead('user-1');

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', readAt: null },
      data: expect.objectContaining({ readAt: expect.any(Date) }),
    });
    expect(gatewayMock.emitBadgeUpdate).toHaveBeenCalledWith('user-1', 0);
  });

  it('listForUser() returns notifications sorted by createdAt desc with pagination and unreadCount', async () => {
    const { service, prismaMock } = createService();
    const rows = [
      {
        id: 'n-1',
        userId: 'u',
        type: 'ABSENCE_RECORDED',
        title: 't',
        body: 'b',
        payload: null,
        readAt: null,
        createdAt: new Date('2026-04-05'),
      },
    ];
    prismaMock.notification.findMany.mockResolvedValue(rows);
    prismaMock.notification.count.mockResolvedValue(1);

    const result = await service.listForUser('u', { limit: 10, offset: 0 });

    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 0,
      }),
    );
    expect(result.notifications).toHaveLength(1);
    expect(result.unreadCount).toBe(1);
  });

  it('dedup: SUBSTITUTION_OFFER upserts on existing unread offer for same substitutionId (Pitfall 8)', async () => {
    const { service, prismaMock, gatewayMock } = createService();
    prismaMock.notification.findFirst.mockResolvedValue({
      id: 'existing-n',
      userId: 'user-1',
      type: 'SUBSTITUTION_OFFER',
      payload: { substitutionId: 'sub-1' },
      readAt: null,
    });
    prismaMock.notification.update.mockResolvedValue({
      id: 'existing-n',
      userId: 'user-1',
      type: 'SUBSTITUTION_OFFER',
      title: 'Neues Vertretungsangebot',
      body: 'Updated body',
      payload: { substitutionId: 'sub-1' },
      readAt: null,
      createdAt: new Date(),
    });
    prismaMock.notification.count.mockResolvedValue(1);

    await service.create({
      userId: 'user-1',
      type: 'SUBSTITUTION_OFFER',
      title: 'Neues Vertretungsangebot',
      body: 'Updated body',
      payload: { substitutionId: 'sub-1' },
    });

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(prismaMock.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'existing-n' } }),
    );
    expect(gatewayMock.emitNewNotification).toHaveBeenCalled();
  });

  it('resolveRecipientsForSubstitutionEvent returns substitute, absent teacher, KV, and creator for SUBSTITUTION_CONFIRMED', async () => {
    const { service, prismaMock } = createService();

    prismaMock.substitution.findUniqueOrThrow.mockResolvedValue({
      id: 'sub-1',
      substituteTeacherId: 'teacher-sub',
      classSubjectId: 'cs-1',
      createdBy: 'kc-admin',
      absence: {
        schoolId: 'school-1',
        teacherId: 'teacher-absent',
        teacher: { person: { keycloakUserId: 'kc-absent' } },
      },
    });
    prismaMock.teacher.findUnique.mockResolvedValue({
      person: { keycloakUserId: 'kc-substitute' },
    });
    prismaMock.classSubject.findUnique.mockResolvedValue({
      schoolClass: {
        klassenvorstand: { person: { keycloakUserId: 'kc-kv' } },
      },
    });

    const recipients = await service.resolveRecipientsForSubstitutionEvent(
      'sub-1',
      'SUBSTITUTION_CONFIRMED',
    );

    expect(recipients).toContain('kc-substitute');
    expect(recipients).toContain('kc-absent');
    expect(recipients).toContain('kc-kv');
    expect(recipients).toContain('kc-admin');
    // person.findMany is no longer used for admin resolution
    expect(prismaMock.person.findMany).not.toHaveBeenCalled();
  });

  it('create() queues a push-notification job on PUSH_QUEUE after persisting the row (D-06)', async () => {
    const { service, prismaMock, pushQueueMock } = createService();
    prismaMock.notification.create.mockResolvedValue({
      id: 'n-1',
      userId: 'user-1',
      type: 'MESSAGE_RECEIVED',
      title: 'Neue Nachricht',
      body: 'Hr. Mueller hat Ihnen geschrieben',
      payload: { conversationId: 'conv-1' },
      readAt: null,
      createdAt: new Date(),
    });
    prismaMock.notification.count.mockResolvedValue(1);

    await service.create({
      userId: 'user-1',
      type: 'MESSAGE_RECEIVED',
      title: 'Neue Nachricht',
      body: 'Hr. Mueller hat Ihnen geschrieben',
      payload: { conversationId: 'conv-1' },
    });

    expect(pushQueueMock.add).toHaveBeenCalledOnce();
    const [jobName, jobData] = pushQueueMock.add.mock.calls[0];
    expect(jobName).toBe('push-notification');
    expect(jobData.userId).toBe('user-1');
    expect(jobData.payload.title).toBe('Neue Nachricht');
    expect(jobData.payload.body).toBe('Hr. Mueller hat Ihnen geschrieben');
    // MESSAGE_RECEIVED with conversationId routes to /messages/:id
    expect(jobData.payload.url).toBe('/messages/conv-1');
    // Tag starts with lowercased type
    expect(jobData.payload.tag).toMatch(/^message_received-\d+$/);
  });

  it('create() routes notification URLs per type (SUBSTITUTION_OFFER -> /teacher/substitutions, HOMEWORK_ASSIGNED -> /timetable)', async () => {
    const { service, prismaMock, pushQueueMock } = createService();
    prismaMock.notification.create.mockResolvedValue({
      id: 'n-2',
      userId: 'user-1',
      type: 'HOMEWORK_ASSIGNED',
      title: 'Neue Hausaufgabe',
      body: 'Mathematik: Aufgabe 5',
      payload: null,
      readAt: null,
      createdAt: new Date(),
    });
    prismaMock.notification.count.mockResolvedValue(1);

    await service.create({
      userId: 'user-1',
      type: 'HOMEWORK_ASSIGNED',
      title: 'Neue Hausaufgabe',
      body: 'Mathematik: Aufgabe 5',
    });

    const jobData = pushQueueMock.add.mock.calls[0][1];
    expect(jobData.payload.url).toBe('/timetable');
  });

  it('create() does not rethrow if push queue add fails (push must never block notification creation)', async () => {
    const { service, prismaMock, pushQueueMock, gatewayMock } = createService();
    prismaMock.notification.create.mockResolvedValue({
      id: 'n-3',
      userId: 'user-1',
      type: 'ABSENCE_RECORDED',
      title: 't',
      body: 'b',
      payload: null,
      readAt: null,
      createdAt: new Date(),
    });
    prismaMock.notification.count.mockResolvedValue(1);
    pushQueueMock.add.mockRejectedValueOnce(new Error('redis down'));

    // Should still resolve normally — gateway emit already happened, the
    // push channel is a best-effort side effect.
    await expect(
      service.create({
        userId: 'user-1',
        type: 'ABSENCE_RECORDED',
        title: 't',
        body: 'b',
      }),
    ).resolves.toBeDefined();
    expect(gatewayMock.emitNewNotification).toHaveBeenCalled();
  });

  it('resolveRecipientsForSubstitutionEvent omits admin for SUBSTITUTION_OFFER (substitute-only scope)', async () => {
    const { service, prismaMock } = createService();

    prismaMock.substitution.findUniqueOrThrow.mockResolvedValue({
      id: 'sub-1',
      substituteTeacherId: 'teacher-sub',
      classSubjectId: 'cs-1',
      absence: {
        schoolId: 'school-1',
        teacher: { person: { keycloakUserId: 'kc-absent' } },
      },
    });
    prismaMock.teacher.findUnique.mockResolvedValue({
      person: { keycloakUserId: 'kc-substitute' },
    });
    prismaMock.classSubject.findUnique.mockResolvedValue({
      schoolClass: { klassenvorstand: null },
    });

    const recipients = await service.resolveRecipientsForSubstitutionEvent(
      'sub-1',
      'SUBSTITUTION_OFFER',
    );

    expect(recipients).toContain('kc-substitute');
    // admin cohort only loaded for CONFIRMED/DECLINED
    expect(prismaMock.person.findMany).not.toHaveBeenCalled();
  });
});
