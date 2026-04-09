import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * MOBILE-02 -- PushService web-push + Prisma tests.
 *
 * Covers subscribe/unsubscribe CRUD, web-push send logic with per-subscription
 * error isolation, auto-cleanup on HTTP 410 (Gone) / 404 (Not Found) responses
 * per D-08, and the public VAPID key accessor used by the GET /push/vapid-key
 * endpoint.
 *
 * We mock the `web-push` module at the top so importing PushService does not
 * fail when the real library is asked to validate VAPID keys against real
 * environment variables.
 */

// Hoist the web-push mock so it is installed before PushService imports it.
// vi.hoisted() lets us share the mock object with individual tests while
// still allowing vi.mock()'s hoisting semantics to work.
const webpushMock = vi.hoisted(() => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock('web-push', () => ({
  default: webpushMock,
  ...webpushMock,
}));

import { PushService } from './push.service';
import { PrismaService } from '../../config/database/prisma.service';
import type { ConfigService } from '@nestjs/config';

function createService() {
  const prismaMock: any = {
    pushSubscription: {
      upsert: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  const configMock: Partial<ConfigService> = {
    getOrThrow: vi.fn((key: string) => {
      if (key === 'VAPID_PUBLIC_KEY')
        return 'BPublicKeyStubBPublicKeyStubBPublicKeyStubBPublicKeyStubBPublicKeyStub';
      if (key === 'VAPID_PRIVATE_KEY') return 'PrivateKeyStubPrivateKeyStubPrivateKeyStub';
      throw new Error(`Unexpected config key: ${key}`);
    }) as any,
    get: vi.fn((key: string, fallback?: string) => {
      if (key === 'VAPID_SUBJECT') return fallback ?? 'mailto:admin@schoolflow.example';
      return fallback;
    }) as any,
  };

  const service = new PushService(
    prismaMock as PrismaService,
    configMock as ConfigService,
  );
  return { service, prismaMock, configMock };
}

beforeEach(() => {
  webpushMock.setVapidDetails.mockReset();
  webpushMock.sendNotification.mockReset();
});

describe('PushService (MOBILE-02)', () => {
  // -------------------------------------------------------------------------
  // Wave 0 — behavior it.todo stubs. Each behavior below is also implemented
  // as a full test afterward. Keeping the .todo stubs next to the behaviours
  // makes the RED phase auditable against the plan's <behavior> list.
  // -------------------------------------------------------------------------
  it.todo('subscribe() creates a PushSubscription row with userId, endpoint, p256dh, auth');
  it.todo('subscribe() with existing endpoint upserts (updates userId/keys, does not duplicate)');
  it.todo('unsubscribe() deletes subscription by endpoint');
  it.todo('sendToUser() sends push to all user subscriptions via web-push');
  it.todo('sendToUser() deletes subscription on 410 response (auto-cleanup per D-08)');
  it.todo('sendToUser() deletes subscription on 404 response');
  it.todo('sendToUser() ignores non-410/404 errors (network transient)');
  it.todo('getVapidPublicKey() returns VAPID_PUBLIC_KEY from config');

  it('subscribe() upserts a PushSubscription row with userId, endpoint, p256dh, auth', async () => {
    const { service, prismaMock } = createService();
    prismaMock.pushSubscription.upsert.mockResolvedValue({
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://push.example/abc',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.subscribe('user-1', {
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    });

    expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledOnce();
    const arg = prismaMock.pushSubscription.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ endpoint: 'https://push.example/abc' });
    expect(arg.create).toMatchObject({
      userId: 'user-1',
      endpoint: 'https://push.example/abc',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    });
    expect(arg.update).toMatchObject({
      userId: 'user-1',
      p256dh: 'p256dh-key',
      auth: 'auth-key',
    });
  });

  it('subscribe() on existing endpoint updates userId/keys without creating a duplicate row', async () => {
    const { service, prismaMock } = createService();
    // Upsert is a single call by design; we assert it uses the endpoint as
    // the unique key so Prisma routes to UPDATE not INSERT.
    prismaMock.pushSubscription.upsert.mockResolvedValue({
      id: 'sub-existing',
      userId: 'user-2',
      endpoint: 'https://push.example/abc',
      p256dh: 'new-p256dh',
      auth: 'new-auth',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await service.subscribe('user-2', {
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'new-p256dh', auth: 'new-auth' },
    });

    expect(prismaMock.pushSubscription.upsert).toHaveBeenCalledOnce();
    const arg = prismaMock.pushSubscription.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ endpoint: 'https://push.example/abc' });
    // Update branch carries the new owner + refreshed keys
    expect(arg.update.userId).toBe('user-2');
    expect(arg.update.p256dh).toBe('new-p256dh');
    expect(arg.update.auth).toBe('new-auth');
  });

  it('unsubscribe() deletes the subscription by endpoint', async () => {
    const { service, prismaMock } = createService();
    prismaMock.pushSubscription.delete.mockResolvedValue({
      id: 'sub-1',
      endpoint: 'https://push.example/abc',
    });

    await service.unsubscribe('https://push.example/abc');

    expect(prismaMock.pushSubscription.delete).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example/abc' },
    });
  });

  it('unsubscribe() swallows P2025 (record not found) so duplicate unsubscribes are idempotent', async () => {
    const { service, prismaMock } = createService();
    const err: any = new Error('Not found');
    err.code = 'P2025';
    prismaMock.pushSubscription.delete.mockRejectedValue(err);

    await expect(
      service.unsubscribe('https://push.example/missing'),
    ).resolves.toBeUndefined();
  });

  it('sendToUser() sends push to every user subscription via web-push', async () => {
    const { service, prismaMock } = createService();
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://push.example/a',
        p256dh: 'p1',
        auth: 'a1',
      },
      {
        id: 'sub-2',
        userId: 'user-1',
        endpoint: 'https://push.example/b',
        p256dh: 'p2',
        auth: 'a2',
      },
    ]);
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 });

    await service.sendToUser('user-1', {
      title: 'Stundenplanaenderung',
      body: 'Morgen Mathematik faellt aus',
      url: '/timetable',
      tag: 'timetable-change-2026-04-07',
    });

    expect(prismaMock.pushSubscription.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(webpushMock.sendNotification).toHaveBeenCalledTimes(2);

    // Verify payload + TTL option on the first call
    const firstCall = webpushMock.sendNotification.mock.calls[0];
    const [subscription, payloadJson, options] = firstCall;
    expect(subscription).toEqual({
      endpoint: 'https://push.example/a',
      keys: { p256dh: 'p1', auth: 'a1' },
    });
    const payload = JSON.parse(payloadJson as string);
    expect(payload.title).toBe('Stundenplanaenderung');
    expect(payload.body).toBe('Morgen Mathematik faellt aus');
    expect(payload.url).toBe('/timetable');
    expect(payload.tag).toBe('timetable-change-2026-04-07');
    expect(options).toMatchObject({ TTL: 86400 });
  });

  it('sendToUser() keeps payload under the 3KB safe envelope (D-08)', async () => {
    const { service, prismaMock } = createService();
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-1',
        userId: 'user-1',
        endpoint: 'https://push.example/a',
        p256dh: 'p1',
        auth: 'a1',
      },
    ]);
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 });

    await service.sendToUser('user-1', {
      title: 'T',
      body: 'B'.repeat(100),
    });

    const payloadJson = webpushMock.sendNotification.mock.calls[0][1] as string;
    // 3KB budget per 09-RESEARCH (leaves headroom under the 4KB Web Push spec
    // limit for encryption overhead).
    expect(Buffer.byteLength(payloadJson, 'utf8')).toBeLessThan(3 * 1024);
  });

  it('sendToUser() deletes subscription on 410 Gone response (auto-cleanup per D-08)', async () => {
    const { service, prismaMock } = createService();
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-stale',
        userId: 'user-1',
        endpoint: 'https://push.example/stale',
        p256dh: 'p',
        auth: 'a',
      },
    ]);
    const err: any = new Error('Gone');
    err.statusCode = 410;
    webpushMock.sendNotification.mockRejectedValue(err);
    prismaMock.pushSubscription.delete.mockResolvedValue({});

    await service.sendToUser('user-1', { title: 't', body: 'b' });

    expect(prismaMock.pushSubscription.delete).toHaveBeenCalledWith({
      where: { id: 'sub-stale' },
    });
  });

  it('sendToUser() deletes subscription on 404 Not Found response', async () => {
    const { service, prismaMock } = createService();
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-dead',
        userId: 'user-1',
        endpoint: 'https://push.example/dead',
        p256dh: 'p',
        auth: 'a',
      },
    ]);
    const err: any = new Error('Not found');
    err.statusCode = 404;
    webpushMock.sendNotification.mockRejectedValue(err);
    prismaMock.pushSubscription.delete.mockResolvedValue({});

    await service.sendToUser('user-1', { title: 't', body: 'b' });

    expect(prismaMock.pushSubscription.delete).toHaveBeenCalledWith({
      where: { id: 'sub-dead' },
    });
  });

  it('sendToUser() ignores transient (non-410/404) errors without deleting subscriptions', async () => {
    const { service, prismaMock } = createService();
    prismaMock.pushSubscription.findMany.mockResolvedValue([
      {
        id: 'sub-ok',
        userId: 'user-1',
        endpoint: 'https://push.example/ok',
        p256dh: 'p',
        auth: 'a',
      },
    ]);
    const err: any = new Error('Bad gateway');
    err.statusCode = 502;
    webpushMock.sendNotification.mockRejectedValue(err);

    // Should not throw; transient error stays on the stack for the BullMQ
    // layer to decide retry semantics (we log + continue in-service).
    await expect(
      service.sendToUser('user-1', { title: 't', body: 'b' }),
    ).resolves.toBeUndefined();

    expect(prismaMock.pushSubscription.delete).not.toHaveBeenCalled();
  });

  it('getVapidPublicKey() returns VAPID_PUBLIC_KEY from config', () => {
    const { service } = createService();
    expect(service.getVapidPublicKey()).toBe(
      'BPublicKeyStubBPublicKeyStubBPublicKeyStubBPublicKeyStubBPublicKeyStub',
    );
  });

  it('constructor registers VAPID details on the web-push client', () => {
    createService();
    expect(webpushMock.setVapidDetails).toHaveBeenCalledOnce();
    const [subject, publicKey, privateKey] = webpushMock.setVapidDetails.mock.calls[0];
    expect(subject).toBe('mailto:admin@schoolflow.example');
    expect(publicKey).toBe(
      'BPublicKeyStubBPublicKeyStubBPublicKeyStubBPublicKeyStubBPublicKeyStub',
    );
    expect(privateKey).toBe('PrivateKeyStubPrivateKeyStubPrivateKeyStub');
  });
});
