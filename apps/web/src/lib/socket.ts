import { io, Socket } from 'socket.io-client';
import { keycloak } from './keycloak';

const API_URL = import.meta.env.VITE_API_URL || '';

let timetableSocket: Socket | null = null;

/**
 * Creates (or reconnects) a Socket.IO client for the /timetable namespace.
 * Uses school-scoped rooms so events are broadcast only to the relevant school.
 *
 * Per Pitfall 2 in RESEARCH.md: connects to /timetable namespace (NOT /solver).
 * Per Pitfall 7: allows polling fallback for school networks behind proxies.
 */
export function createTimetableSocket(schoolId: string): Socket {
  if (timetableSocket) {
    timetableSocket.disconnect();
  }

  timetableSocket = io(`${API_URL}/timetable`, {
    query: { schoolId },
    auth: { token: keycloak.token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  return timetableSocket;
}

/**
 * Returns the current timetable socket instance, or null if not connected.
 */
export function getTimetableSocket(): Socket | null {
  return timetableSocket;
}

/**
 * Disconnects and cleans up the timetable socket.
 */
export function disconnectTimetableSocket(): void {
  if (timetableSocket) {
    timetableSocket.disconnect();
    timetableSocket = null;
  }
}
