import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { NotificationGateway } from './notification.gateway';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * SUBST-03 -- NotificationGateway handshake-auth + per-user rooms tests.
 *
 * The gateway now uses direct jsonwebtoken + JwksClient + ConfigService instead
 * of NestJS JwtService. We mock the internal jwt reference and JwksClient on
 * the gateway instance after construction.
 *
 * Pitfall 3: JWT validated on connect, userId derived from jwt.sub (NOT client-supplied).
 * Pitfall 6: transports include both websocket and polling for school network proxies.
 */

/**
 * Import the same jsonwebtoken module that the gateway captured at load time
 * and spy on its `decode` and `verify` methods.
 */
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

describe('NotificationGateway (SUBST-03)', () => {
  let gateway: NotificationGateway;
  let serverMock: { to: ReturnType<typeof vi.fn> };
  let emitMock: ReturnType<typeof vi.fn>;
  let jwksClientMock: { getSigningKey: ReturnType<typeof vi.fn> };
  let jwtDecodeSpy: ReturnType<typeof vi.spyOn>;
  let jwtVerifySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.restoreAllMocks();
    jwtDecodeSpy = vi.spyOn(jwt, 'decode');
    jwtVerifySpy = vi.spyOn(jwt, 'verify');

    const configMock = {
      get: vi.fn((key: string, defaultVal?: string) => {
        if (key === 'KEYCLOAK_URL') return 'http://localhost:8080';
        if (key === 'KEYCLOAK_REALM') return 'schoolflow';
        return defaultVal;
      }),
    };

    emitMock = vi.fn();
    serverMock = { to: vi.fn(() => ({ emit: emitMock })) };
    gateway = new NotificationGateway(configMock as unknown as ConfigService);
    (gateway as any).server = serverMock;

    // Replace the internally-constructed JwksClient with our mock
    jwksClientMock = {
      getSigningKey: vi.fn().mockResolvedValue({
        getPublicKey: () => 'mock-public-key',
      }),
    };
    (gateway as any).jwksClient = jwksClientMock;
  });

  it('accepts connection with valid JWT in handshake.auth.token and joins user:{sub} room', async () => {
    jwtDecodeSpy.mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    jwtVerifySpy.mockReturnValue({ sub: 'user-123' });
    const client: any = {
      id: 'socket-1',
      handshake: { auth: { token: 'valid.jwt.token' }, headers: {} },
      join: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client);

    expect(jwtDecodeSpy).toHaveBeenCalledWith('valid.jwt.token', { complete: true });
    expect(jwksClientMock.getSigningKey).toHaveBeenCalledWith('key-1');
    expect(jwtVerifySpy).toHaveBeenCalledWith('valid.jwt.token', 'mock-public-key', {
      algorithms: ['RS256'],
      issuer: 'http://localhost:8080/realms/schoolflow',
    });
    expect(client.join).toHaveBeenCalledWith('user:user-123');
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('rejects connection with missing Authorization (no-token path disconnects)', async () => {
    const client: any = {
      id: 'socket-2',
      handshake: { auth: {}, headers: {} },
      join: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    expect(jwtDecodeSpy).not.toHaveBeenCalled();
  });

  it('rejects connection with invalid/expired JWT', async () => {
    jwtDecodeSpy.mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    jwtVerifySpy.mockImplementation(() => { throw new Error('jwt expired'); });
    const client: any = {
      id: 'socket-3',
      handshake: { auth: { token: 'bad.jwt' }, headers: {} },
      join: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('joins client to user:{payload.sub} room -- never a client-supplied userId (Pitfall 3)', async () => {
    jwtDecodeSpy.mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    jwtVerifySpy.mockReturnValue({ sub: 'real-sub-from-token' });
    const client: any = {
      id: 'socket-4',
      handshake: {
        auth: { token: 'valid.jwt', userId: 'attacker-wanted-id' },
        headers: {},
      },
      join: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client);

    expect(client.join).toHaveBeenCalledWith('user:real-sub-from-token');
    expect(client.join).not.toHaveBeenCalledWith('user:attacker-wanted-id');
  });

  it('rejects connection when jwt.sub is missing even if verify succeeds', async () => {
    jwtDecodeSpy.mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    jwtVerifySpy.mockReturnValue({ other: 'claim' });
    const client: any = {
      id: 'socket-5',
      handshake: { auth: { token: 'weird.jwt' }, headers: {} },
      join: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('emitNewNotification delivers notification:new to user:{userId} room only', () => {
    const dto: any = { id: 'n1', userId: 'user-123', type: 'SUBSTITUTION_OFFER' };
    gateway.emitNewNotification('user-123', dto, 5);

    expect(serverMock.to).toHaveBeenCalledWith('user:user-123');
    expect(emitMock).toHaveBeenCalledWith('notification:new', { notification: dto, unreadCount: 5 });
  });

  it('emitNewNotification also pushes a badge update with fresh unreadCount', () => {
    const dto: any = { id: 'n1', userId: 'user-123' };
    gateway.emitNewNotification('user-123', dto, 7);
    // server.to called for both notification:new and notification:badge
    const calls = serverMock.to.mock.calls.map((c: any[]) => c[0]);
    expect(calls.filter((c) => c === 'user:user-123').length).toBeGreaterThanOrEqual(2);
    expect(emitMock).toHaveBeenCalledWith('notification:badge', { unreadCount: 7 });
  });

  it('emitBadgeUpdate sends only a notification:badge event to the user room', () => {
    gateway.emitBadgeUpdate('user-42', 0);
    expect(serverMock.to).toHaveBeenCalledWith('user:user-42');
    expect(emitMock).toHaveBeenCalledWith('notification:badge', { unreadCount: 0 });
  });

  it('configures transports: [websocket, polling] for school network proxy fallback (Pitfall 6)', () => {
    // Verify source file declares both transports literally (Pitfall 6)
    const source = readFileSync(
      join(__dirname, 'notification.gateway.ts'),
      'utf8',
    );
    expect(source).toMatch(/transports:\s*\[\s*['"]websocket['"]\s*,\s*['"]polling['"]\s*\]/);
    expect(source).toMatch(/namespace:\s*['"]notifications['"]/);
  });
});
