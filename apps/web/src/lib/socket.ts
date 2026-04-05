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

// --- Classbook namespace ---

let classbookSocket: Socket | null = null;

/**
 * Creates (or reconnects) a Socket.IO client for the /classbook namespace.
 * Uses school-scoped rooms so events are broadcast only to the relevant school.
 *
 * Per Phase 5 decision: per-domain WebSocket namespace pattern mirrors /timetable gateway.
 * Mounted at classbook lesson page level (not authenticated layout) since classbook
 * events are only relevant when actively viewing classbook pages.
 */
export function createClassbookSocket(schoolId: string): Socket {
  if (classbookSocket) {
    classbookSocket.disconnect();
  }

  classbookSocket = io(`${API_URL}/classbook`, {
    query: { schoolId },
    auth: { token: keycloak.token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });

  return classbookSocket;
}

/**
 * Returns the current classbook socket instance, or null if not connected.
 */
export function getClassbookSocket(): Socket | null {
  return classbookSocket;
}

/**
 * Disconnects and cleans up the classbook socket.
 */
export function disconnectClassbookSocket(): void {
  if (classbookSocket) {
    classbookSocket.disconnect();
    classbookSocket = null;
  }
}

// --- Notifications namespace (SUBST-03, D-23) ---

let notificationSocket: Socket | null = null;

/**
 * Creates (or reconnects) a Socket.IO client for the /notifications namespace.
 *
 * Per-user rooms are joined on the server side via the JWT handshake.token
 * (see NotificationGateway.handleConnection). The gateway verifies the
 * Keycloak RS256 token via JwksClient and joins `user:{sub}` rooms.
 *
 * Per Pitfall 6 in 06-RESEARCH.md: transports ['websocket', 'polling'] for
 * school-network proxy fallback. Per the 06-RESEARCH Pattern 4 gateway guide,
 * the JWT is passed via the Socket.IO handshake auth payload (not the query
 * string) so tokens never land in server access logs.
 */
export function createNotificationSocket(jwt: string): Socket {
  if (notificationSocket) {
    notificationSocket.disconnect();
  }

  notificationSocket = io(`${API_URL}/notifications`, {
    auth: { token: `Bearer ${jwt}` },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
  });

  return notificationSocket;
}

/**
 * Returns the current notification socket instance, or null if not connected.
 */
export function getNotificationSocket(): Socket | null {
  return notificationSocket;
}

/**
 * Disconnects and cleans up the notification socket. Accepts an optional
 * socket argument so the hook can dispose the exact instance it captured
 * during mount (avoids race conditions on rapid unmount/remount).
 */
export function disconnectNotificationSocket(socket?: Socket | null): void {
  const target = socket ?? notificationSocket;
  if (target) {
    target.removeAllListeners();
    target.disconnect();
  }
  if (!socket || socket === notificationSocket) {
    notificationSocket = null;
  }
}
