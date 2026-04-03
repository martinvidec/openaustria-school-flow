import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import type {
  ClassBookAttendanceUpdatedEvent,
  ClassBookGradeAddedEvent,
  ClassBookExcuseUpdatedEvent,
  ClassBookEntryUpdatedEvent,
} from '@schoolflow/shared';

/**
 * Socket.IO WebSocket gateway for real-time classbook events (BOOK-01, BOOK-03, BOOK-06).
 *
 * Namespace: /classbook
 * Events emitted:
 * - 'classbook:attendance-updated'  -- Attendance records changed (bulk save or "Alle anwesend")
 * - 'classbook:grade-added'         -- New grade entry added
 * - 'classbook:excuse-updated'      -- Excuse reviewed (accepted/rejected)
 * - 'classbook:entry-updated'       -- ClassBookEntry content updated (thema/lehrstoff/hausaufgabe)
 *
 * Transport: Both 'websocket' and 'polling' for school network proxy fallback.
 */
@WebSocketGateway({
  namespace: 'classbook',
  cors: {
    origin: '*', // Tighten in production via env var
  },
  transports: ['websocket', 'polling'],
})
export class ClassBookEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(ClassBookEventsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const schoolId = client.handshake.query.schoolId as string;
    if (schoolId) {
      client.join(`school:${schoolId}`);
      this.logger.debug(`Client ${client.id} joined classbook room school:${schoolId}`);
    }
  }

  handleDisconnect(_client: Socket) {
    // Socket.IO auto-removes client from all rooms on disconnect
  }

  /**
   * Emit attendance-updated event after bulk save or "Alle anwesend".
   */
  emitAttendanceUpdated(schoolId: string, payload: ClassBookAttendanceUpdatedEvent): void {
    this.server.to(`school:${schoolId}`).emit('classbook:attendance-updated', payload);
    this.logger.debug(`Emitted classbook:attendance-updated to school:${schoolId}`);
  }

  /**
   * Emit grade-added event after a new grade entry is created.
   */
  emitGradeAdded(schoolId: string, payload: ClassBookGradeAddedEvent): void {
    this.server.to(`school:${schoolId}`).emit('classbook:grade-added', payload);
    this.logger.debug(`Emitted classbook:grade-added to school:${schoolId}`);
  }

  /**
   * Emit excuse-updated event after an excuse is reviewed (accepted/rejected).
   */
  emitExcuseUpdated(schoolId: string, payload: ClassBookExcuseUpdatedEvent): void {
    this.server.to(`school:${schoolId}`).emit('classbook:excuse-updated', payload);
    this.logger.debug(`Emitted classbook:excuse-updated to school:${schoolId}`);
  }

  /**
   * Emit entry-updated event after ClassBookEntry content is modified.
   */
  emitEntryUpdated(schoolId: string, payload: ClassBookEntryUpdatedEvent): void {
    this.server.to(`school:${schoolId}`).emit('classbook:entry-updated', payload);
    this.logger.debug(`Emitted classbook:entry-updated to school:${schoolId}`);
  }
}
