import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { NotificationDto } from '@schoolflow/shared';
import { Server, Socket } from 'socket.io';

/**
 * SUBST-03 -- /notifications Socket.IO namespace for real-time in-app notifications.
 *
 * Handshake auth (Pitfall 3): JWT is verified on connect; userId is derived from
 * jwt.sub ONLY -- never from a client-supplied field. Failed verification results
 * in immediate disconnect.
 *
 * Per-user rooms: each client joins `user:{keycloakSub}` so events can be routed
 * with `server.to('user:${userId}')`.
 *
 * Transports (Pitfall 6): both websocket and polling are enabled so clients
 * behind restrictive school network proxies can still connect via long-polling.
 */
@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer() server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      this.logger.warn(
        `NotificationGateway: connection ${client.id} rejected -- no token`,
      );
      client.disconnect(true);
      return;
    }

    try {
      const payload: any = await this.jwtService.verifyAsync(token);
      const userId = payload?.sub;
      if (!userId || typeof userId !== 'string') {
        throw new Error('jwt.sub missing or not a string');
      }
      client.join(`user:${userId}`);
      this.logger.debug(
        `NotificationGateway: socket ${client.id} joined user:${userId}`,
      );
    } catch (err) {
      this.logger.warn(
        `NotificationGateway: connection ${client.id} rejected -- ${(err as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`NotificationGateway: socket ${client.id} disconnected`);
  }

  /**
   * Emit a newly-created notification to the target user's room and refresh
   * their unread badge count in the same pass.
   */
  emitNewNotification(
    userId: string,
    dto: NotificationDto,
    unreadCount: number,
  ): void {
    this.server.to(`user:${userId}`).emit('notification:new', dto);
    this.server.to(`user:${userId}`).emit('notification:badge', { unreadCount });
  }

  /**
   * Emit a badge-only update (used after markRead/markAllRead) without
   * re-delivering the notification payload.
   */
  emitBadgeUpdate(userId: string, unreadCount: number): void {
    this.server.to(`user:${userId}`).emit('notification:badge', { unreadCount });
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
