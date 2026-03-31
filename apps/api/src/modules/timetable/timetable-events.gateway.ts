import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

/**
 * Socket.IO WebSocket gateway for real-time timetable change events (D-12, VIEW-04, ROOM-05).
 *
 * Separate from the /solver namespace (which handles solve progress/completion).
 * This gateway broadcasts timetable changes, cancellations, room swaps, and
 * substitutions to all connected clients for a school.
 *
 * Namespace: /timetable
 * Events emitted:
 * - 'timetable:changed'       -- Lesson moved, time/room/teacher changed
 * - 'timetable:cancelled'     -- Lesson cancelled ("Entfall")
 * - 'timetable:room-swap'     -- Room changed (including ad-hoc booking changes)
 * - 'timetable:substitution'  -- Teacher substitution
 *
 * Transport: Both 'websocket' and 'polling' for school network proxy fallback (Pitfall 7).
 */
@WebSocketGateway({
  namespace: 'timetable',
  cors: {
    origin: '*', // Tighten in production via env var
  },
  transports: ['websocket', 'polling'], // MUST allow polling fallback for school networks behind proxies
})
export class TimetableEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TimetableEventsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const schoolId = client.handshake.query.schoolId as string;
    if (schoolId) {
      client.join(`school:${schoolId}`);
      this.logger.debug(`Client ${client.id} joined timetable room school:${schoolId}`);
    }
  }

  handleDisconnect(_client: Socket) {
    // Socket.IO auto-removes client from all rooms on disconnect
  }

  /**
   * Emit a timetable change event to all clients watching a school.
   * Used for lesson moves, edits, cancellations, and substitutions.
   */
  emitTimetableChanged(
    schoolId: string,
    payload: {
      changeType: 'changed' | 'cancelled' | 'room-swap' | 'substitution';
      lessonId: string;
      changeCount: number;
    },
  ): void {
    this.server
      .to(`school:${schoolId}`)
      .emit(`timetable:${payload.changeType}`, payload);
    this.logger.debug(
      `Emitted timetable:${payload.changeType} to school:${schoolId} (${payload.changeCount} changes)`,
    );
  }

  /**
   * Emit a room booking change event (D-16).
   * Triggered when a room is booked or a booking is cancelled.
   * Propagates to all timetable views instantly via WebSocket.
   */
  emitRoomBookingChanged(
    schoolId: string,
    payload: {
      action: 'booked' | 'cancelled';
      roomId: string;
      roomName: string;
      dayOfWeek: string;
      periodNumber: number;
    },
  ): void {
    this.server.to(`school:${schoolId}`).emit('timetable:room-swap', payload);
    this.logger.debug(
      `Emitted timetable:room-swap (${payload.action}) for room ${payload.roomName} to school:${schoolId}`,
    );
  }
}
