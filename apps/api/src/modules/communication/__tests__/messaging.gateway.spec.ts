import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import { MessagingGateway } from '../messaging.gateway';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * D-08 -- MessagingGateway handshake-auth + per-user rooms + event emission tests.
 *
 * Follows the same pattern as notification.gateway.spec.ts:
 * - Mock JwksClient, jwt.decode/verify, server.to().emit()
 * - Verify JWT is validated on connect with userId from jwt.sub (Pitfall 3)
 * - Verify real-time events are emitted to correct user rooms
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken');

describe('MessagingGateway (D-08)', () => {
  let gateway: MessagingGateway;
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
    gateway = new MessagingGateway(configMock as unknown as ConfigService);
    (gateway as any).server = serverMock;

    // Replace the internally-constructed JwksClient with our mock
    jwksClientMock = {
      getSigningKey: vi.fn().mockResolvedValue({
        getPublicKey: () => 'mock-public-key',
      }),
    };
    (gateway as any).jwksClient = jwksClientMock;
  });

  it('accepts connection with valid Keycloak JWT and joins user:{sub} room', async () => {
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

  it('rejects connection with invalid/expired JWT', async () => {
    jwtDecodeSpy.mockReturnValue({ header: { kid: 'key-1' }, payload: {} });
    jwtVerifySpy.mockImplementation(() => {
      throw new Error('jwt expired');
    });
    const client: any = {
      id: 'socket-2',
      handshake: { auth: { token: 'bad.jwt' }, headers: {} },
      join: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
  });

  it('emitNewMessage sends message:new to all recipient user rooms', () => {
    const messageDto: any = {
      id: 'msg-1',
      conversationId: 'conv-1',
      senderId: 'user-1',
      senderName: 'Max Mustermann',
      body: 'Hallo!',
      type: 'TEXT',
      createdAt: '2026-04-07T10:00:00Z',
      attachments: [],
      poll: null,
    };

    gateway.emitNewMessage(['user-2', 'user-3'], messageDto);

    expect(serverMock.to).toHaveBeenCalledWith('user:user-2');
    expect(serverMock.to).toHaveBeenCalledWith('user:user-3');
    expect(emitMock).toHaveBeenCalledWith('message:new', { message: messageDto });
    // Called twice (once per recipient)
    expect(serverMock.to).toHaveBeenCalledTimes(2);
  });

  it('emitReadReceipt sends message:read to sender room only', () => {
    gateway.emitReadReceipt('sender-1', 'msg-1', 'reader-1', 3, 5);

    expect(serverMock.to).toHaveBeenCalledWith('user:sender-1');
    expect(emitMock).toHaveBeenCalledWith('message:read', {
      messageId: 'msg-1',
      readBy: 'reader-1',
      readCount: 3,
      totalRecipients: 5,
    });
  });

  it('emitPollVote sends poll:vote to all conversation member rooms', () => {
    const results: any[] = [
      { id: 'opt-1', text: 'Ja', voteCount: 3 },
      { id: 'opt-2', text: 'Nein', voteCount: 1 },
    ];

    gateway.emitPollVote(['user-1', 'user-2', 'user-3'], 'poll-1', results);

    expect(serverMock.to).toHaveBeenCalledWith('user:user-1');
    expect(serverMock.to).toHaveBeenCalledWith('user:user-2');
    expect(serverMock.to).toHaveBeenCalledWith('user:user-3');
    expect(emitMock).toHaveBeenCalledWith('poll:vote', {
      pollId: 'poll-1',
      results,
    });
    expect(serverMock.to).toHaveBeenCalledTimes(3);
  });

  it('emitNewConversation sends conversation:new to all member rooms', () => {
    const conversationDto: any = {
      id: 'conv-1',
      schoolId: 'school-1',
      scope: 'CLASS',
      subject: 'Elternabend',
      createdBy: 'user-1',
      createdAt: '2026-04-07T10:00:00Z',
      lastMessage: null,
      unreadCount: 0,
      memberCount: 3,
    };

    gateway.emitNewConversation(['user-1', 'user-2', 'user-3'], conversationDto);

    expect(serverMock.to).toHaveBeenCalledWith('user:user-1');
    expect(serverMock.to).toHaveBeenCalledWith('user:user-2');
    expect(serverMock.to).toHaveBeenCalledWith('user:user-3');
    expect(emitMock).toHaveBeenCalledWith('conversation:new', {
      conversation: conversationDto,
    });
  });

  it('rejects connection with missing token (no-token path disconnects)', async () => {
    const client: any = {
      id: 'socket-3',
      handshake: { auth: {}, headers: {} },
      join: vi.fn(),
      disconnect: vi.fn(),
    };

    await gateway.handleConnection(client);

    expect(client.disconnect).toHaveBeenCalledWith(true);
    expect(client.join).not.toHaveBeenCalled();
    expect(jwtDecodeSpy).not.toHaveBeenCalled();
  });

  it('configures transports: [websocket, polling] and namespace: messaging (Pitfall 6)', () => {
    const source = readFileSync(
      join(__dirname, '..', 'messaging.gateway.ts'),
      'utf8',
    );
    expect(source).toMatch(/transports:\s*\[\s*['"]websocket['"]\s*,\s*['"]polling['"]\s*\]/);
    expect(source).toMatch(/namespace:\s*['"]messaging['"]/);
  });
});
