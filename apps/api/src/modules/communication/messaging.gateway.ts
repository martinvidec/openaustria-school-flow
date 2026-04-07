import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type {
  ConversationDto,
  MessageDto,
  PollOptionDto,
} from '@schoolflow/shared';
import { Server, Socket } from 'socket.io';
import { JwksClient } from 'jwks-rsa';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken') as {
  decode: (token: string, opts: { complete: true }) => { header: { kid?: string }; payload: any } | null;
  verify: (token: string, key: string, opts: any) => any;
};

/**
 * COMM-01/02/03/06 -- /messaging Socket.IO namespace for real-time messaging events.
 *
 * Handshake auth (D-08): JWT is verified on connect; userId is derived from
 * jwt.sub ONLY -- never from a client-supplied field. Failed verification results
 * in immediate disconnect.
 *
 * Per-user rooms: each client joins `user:{keycloakSub}` so events can be routed
 * with `server.to('user:${userId}')`.
 *
 * Transports (Pitfall 6): both websocket and polling are enabled so clients
 * behind restrictive school network proxies can still connect via long-polling.
 *
 * Events emitted:
 *  - message:new     (after send) to all conversation recipients
 *  - message:read    (after markRead) to message sender only
 *  - poll:vote       (after castVote) to all conversation members
 *  - conversation:new (after create) to all conversation members
 */
@WebSocketGateway({
  namespace: 'messaging',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class MessagingGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MessagingGateway.name);
  private readonly jwksClient: JwksClient;
  private readonly issuer: string;

  @WebSocketServer() server!: Server;

  constructor(private readonly config: ConfigService) {
    const keycloakUrl = config.get<string>('KEYCLOAK_URL', 'http://localhost:8080');
    const realm = config.get<string>('KEYCLOAK_REALM', 'schoolflow');
    this.issuer = `${keycloakUrl}/realms/${realm}`;
    this.jwksClient = new JwksClient({
      cache: true,
      rateLimit: true,
      jwksRequestsPerMinute: 5,
      jwksUri: `${this.issuer}/protocol/openid-connect/certs`,
    });
  }

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(
        `MessagingGateway: connection ${client.id} rejected -- no token`,
      );
      client.disconnect(true);
      return;
    }

    try {
      // Decode header to get kid, then fetch the signing key from JWKS
      const decoded = jwt.decode(token, { complete: true }) as any;
      if (!decoded?.header?.kid) throw new Error('jwt header.kid missing');
      const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid);
      const publicKey = signingKey.getPublicKey();
      const payload: any = jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
      });
      const userId = payload?.sub;
      if (!userId || typeof userId !== 'string') {
        throw new Error('jwt.sub missing or not a string');
      }
      client.join(`user:${userId}`);
      this.logger.debug(
        `MessagingGateway: socket ${client.id} joined user:${userId}`,
      );
    } catch (err) {
      this.logger.warn(
        `MessagingGateway: connection ${client.id} rejected -- ${(err as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`MessagingGateway: socket ${client.id} disconnected`);
  }

  /**
   * Emit a newly-sent message to all conversation recipients.
   * Per Pitfall 3: O(N) per recipient -- acceptable for v1 where school-wide is ~500 max.
   */
  emitNewMessage(recipientUserIds: string[], message: MessageDto): void {
    for (const userId of recipientUserIds) {
      this.server.to(`user:${userId}`).emit('message:new', { message });
    }
  }

  /**
   * Emit a read receipt update to the message sender.
   * Only the sender sees read receipt updates for their own messages.
   */
  emitReadReceipt(
    senderUserId: string,
    messageId: string,
    readBy: string,
    readCount: number,
    totalRecipients: number,
  ): void {
    this.server
      .to(`user:${senderUserId}`)
      .emit('message:read', { messageId, readBy, readCount, totalRecipients });
  }

  /**
   * Emit updated poll results after a vote to all conversation members.
   */
  emitPollVote(
    recipientUserIds: string[],
    pollId: string,
    results: PollOptionDto[],
  ): void {
    for (const userId of recipientUserIds) {
      this.server
        .to(`user:${userId}`)
        .emit('poll:vote', { pollId, results });
    }
  }

  /**
   * Emit a newly-created conversation to all its members.
   */
  emitNewConversation(
    memberUserIds: string[],
    conversation: ConversationDto,
  ): void {
    for (const userId of memberUserIds) {
      this.server
        .to(`user:${userId}`)
        .emit('conversation:new', { conversation });
    }
  }

  /**
   * Extract a bearer token from either `handshake.auth.token` or the
   * standard `Authorization: Bearer ...` header. Returns null when absent.
   */
  private extractToken(client: Socket): string | null {
    const auth = (client.handshake as any).auth?.token;
    if (typeof auth === 'string' && auth.length > 0) {
      return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
    }
    const header = (client.handshake.headers as any)?.authorization;
    if (typeof header === 'string' && header.length > 0) {
      return header.startsWith('Bearer ') ? header.slice(7) : header;
    }
    return null;
  }
}
