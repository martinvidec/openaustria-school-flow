import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwksClient } from 'jwks-rsa';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const jwt = require('jsonwebtoken') as {
  decode: (token: string, opts: { complete: true }) => { header: { kid?: string }; payload: any } | null;
  verify: (token: string, key: string, opts: any) => any;
};

export interface ImportProgress {
  current: number;
  total: number;
  percent: number;
}

export interface ImportCompletePayload {
  jobId: string;
  status: string;
  totalRows: number;
  importedRows: number;
  skippedRows: number;
  errorRows: number;
}

/**
 * IMPORT-01/IMPORT-02 -- /import Socket.IO namespace for real-time import progress events.
 *
 * School-scoped rooms: each client joins `school:${schoolId}` so progress events
 * are broadcast to all admins watching the same school's import.
 *
 * JWT handshake follows Phase 6 NotificationGateway pattern: token verified on
 * connect via JWKS; schoolId derived from client handshake query param.
 *
 * Transports: websocket + polling for school network proxy fallback.
 */
@WebSocketGateway({
  namespace: 'import',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class ImportEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(ImportEventsGateway.name);
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
        `ImportEventsGateway: connection ${client.id} rejected -- no token`,
      );
      client.disconnect(true);
      return;
    }

    try {
      const decoded = jwt.decode(token, { complete: true }) as any;
      if (!decoded?.header?.kid) throw new Error('jwt header.kid missing');
      const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid);
      const publicKey = signingKey.getPublicKey();
      jwt.verify(token, publicKey, {
        algorithms: ['RS256'],
        issuer: this.issuer,
      });

      // Join school-scoped room from query param
      const schoolId = (client.handshake.query as Record<string, string>)?.schoolId;
      if (schoolId && typeof schoolId === 'string') {
        client.join(`school:${schoolId}`);
        this.logger.debug(
          `ImportEventsGateway: socket ${client.id} joined school:${schoolId}`,
        );
      }
    } catch (err) {
      this.logger.warn(
        `ImportEventsGateway: connection ${client.id} rejected -- ${(err as Error).message}`,
      );
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket): void {
    this.logger.debug(`ImportEventsGateway: socket ${client.id} disconnected`);
  }

  /**
   * Emit import progress to all clients watching the school.
   */
  emitProgress(
    schoolId: string,
    jobId: string,
    progress: ImportProgress,
  ): void {
    this.server
      .to(`school:${schoolId}`)
      .emit('import:progress', { jobId, ...progress });
  }

  /**
   * Emit import completion event.
   */
  emitComplete(
    schoolId: string,
    _jobId: string,
    result: ImportCompletePayload,
  ): void {
    this.server
      .to(`school:${schoolId}`)
      .emit('import:complete', result);
  }

  /**
   * Extract bearer token from handshake auth or Authorization header.
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
