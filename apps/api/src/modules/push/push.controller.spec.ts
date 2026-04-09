import { describe, it, expect, vi } from 'vitest';
import { PushController } from './push.controller';
import { PushService } from './push.service';
import type { AuthenticatedUser } from '../auth/types/authenticated-user';

/**
 * MOBILE-02 -- PushController HTTP handler tests.
 *
 * The controller is a thin adapter around PushService. These tests verify
 * that the correct service methods are called with the authenticated user
 * id and request body, and that the public VAPID key endpoint returns the
 * key in the expected shape.
 */

function createController() {
  const pushServiceMock = {
    subscribe: vi.fn().mockResolvedValue(undefined),
    unsubscribe: vi.fn().mockResolvedValue(undefined),
    getVapidPublicKey: vi
      .fn()
      .mockReturnValue(
        'BPublicKeyStubBPublicKeyStubBPublicKeyStubBPublicKeyStub',
      ),
  };
  const controller = new PushController(
    pushServiceMock as unknown as PushService,
  );
  const user: AuthenticatedUser = {
    id: 'keycloak-user-1',
    email: 'teacher@example.org',
    username: 'teacher',
    roles: ['Lehrer'],
  };
  return { controller, pushServiceMock, user };
}

describe('PushController (MOBILE-02)', () => {
  // Wave 0 — it.todo stubs from plan behavior list
  it.todo('POST /push-subscriptions creates subscription for authenticated user');
  it.todo('DELETE /push-subscriptions removes subscription by endpoint');
  it.todo('GET /push/vapid-key returns public key (public endpoint)');

  it('subscribe() calls pushService.subscribe with user.id and request body', async () => {
    const { controller, pushServiceMock, user } = createController();

    const body = {
      endpoint: 'https://push.example/abc',
      keys: { p256dh: 'p1', auth: 'a1' },
    };
    const result = await controller.subscribe(body as any, user);

    expect(pushServiceMock.subscribe).toHaveBeenCalledOnce();
    expect(pushServiceMock.subscribe).toHaveBeenCalledWith(
      'keycloak-user-1',
      body,
    );
    expect(result).toEqual({ ok: true });
  });

  it('unsubscribe() calls pushService.unsubscribe with the endpoint from body', async () => {
    const { controller, pushServiceMock } = createController();

    const result = await controller.unsubscribe({
      endpoint: 'https://push.example/abc',
    } as any);

    expect(pushServiceMock.unsubscribe).toHaveBeenCalledOnce();
    expect(pushServiceMock.unsubscribe).toHaveBeenCalledWith(
      'https://push.example/abc',
    );
    expect(result).toBeUndefined();
  });

  it('getVapidKey() returns { publicKey } from PushService', () => {
    const { controller, pushServiceMock } = createController();

    const result = controller.getVapidKey();

    expect(pushServiceMock.getVapidPublicKey).toHaveBeenCalledOnce();
    expect(result).toEqual({
      publicKey: 'BPublicKeyStubBPublicKeyStubBPublicKeyStubBPublicKeyStub',
    });
  });
});
