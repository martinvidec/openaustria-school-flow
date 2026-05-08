import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { SolveProgressDto } from './dto/solve-progress.dto';

/**
 * Socket.IO WebSocket gateway for real-time solve progress broadcasting (D-08, TIME-06).
 *
 * Clients connect with ?schoolId=<id> query param and are placed in a school-scoped room.
 * The internal callback flow (SolverCallbackController) calls emitProgress/emitComplete
 * to push updates to all connected clients for that school.
 *
 * Events emitted:
 * - 'solve:progress' -- SolveProgressDto (score, violations, improvement rate)
 * - 'solve:complete' -- Lightweight completion summary (runId, status, scores, elapsed)
 *   NOTE: Full lesson list is NOT sent via WebSocket (too large). Client fetches via REST.
 *
 * Transport: Both 'websocket' and 'polling' enabled for school network compatibility (Pitfall 7).
 */
@WebSocketGateway({
  namespace: 'solver',
  cors: {
    origin: '*', // Tighten in production via env var
  },
  transports: ['websocket', 'polling'], // MUST allow polling fallback for school networks behind proxies
})
export class TimetableGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TimetableGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const schoolId = client.handshake.query.schoolId as string;
    if (schoolId) {
      client.join(`school:${schoolId}`);
      this.logger.debug(`Client ${client.id} joined school:${schoolId}`);
    }
  }

  handleDisconnect(_client: Socket) {
    // Socket.IO auto-removes client from all rooms on disconnect
  }

  /**
   * Broadcast solve progress to all clients watching this school.
   * Called by the SolverCallbackController when sidecar sends progress.
   * Emits 'solve:progress' event with SolveProgressDto payload.
   */
  emitProgress(schoolId: string, progress: SolveProgressDto): void {
    this.server.to(`school:${schoolId}`).emit('solve:progress', progress);
  }

  /**
   * Broadcast solve completion to all clients watching this school.
   * Called by the SolverCallbackController when sidecar sends final result.
   * Emits 'solve:complete' event with run status and score.
   * NOTE: Does NOT send the full lesson list via WebSocket (too large).
   * Client fetches full result via REST GET /runs/:runId after receiving this event.
   */
  emitComplete(
    schoolId: string,
    result: {
      runId: string;
      status: string;
      hardScore: number;
      softScore: number;
      elapsedSeconds: number;
      // Issue #58: watchdog-driven FAILED events carry the German timeout
      // message; normal completions pass null. Frontend mirrors this into
      // activeRun so the red FAILED card shows the real reason instead of
      // "Unbekannter Fehler".
      errorReason?: string | null;
    },
  ): void {
    this.server.to(`school:${schoolId}`).emit('solve:complete', result);
  }
}
