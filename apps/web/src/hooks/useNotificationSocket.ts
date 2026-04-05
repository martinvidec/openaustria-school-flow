import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import {
  createNotificationSocket,
  disconnectNotificationSocket,
} from '@/lib/socket';
import { notificationKeys } from './useNotifications';
import type {
  NotificationNewEvent,
  NotificationBadgeEvent,
} from '@schoolflow/shared';

/**
 * SUBST-03 — Real-time notification Socket.IO client hook.
 *
 * Connects to the `/notifications` namespace using the caller-supplied JWT in
 * the handshake.auth.token payload (NOT the query string — Pitfall 6 in
 * 06-RESEARCH.md). Listens for two server events:
 *
 *  - `notification:new`  → Toast + invalidate ['notifications'] so the bell
 *    badge + dropdown list update immediately.
 *  - `notification:badge` → Invalidate the list so the badge count matches
 *    server state without a toast (used for read-state sync across tabs).
 *
 * Per the Phase 6 RESEARCH Pattern 4 anti-pattern note, this hook MUST be
 * mounted once at the `_authenticated` layout level — never in child
 * components. Multiple mounts would open concurrent sockets and duplicate
 * every notification.
 *
 * @param jwt - The Keycloak access token. Pass `null` to disable the socket
 *              (e.g. while the user is still authenticating).
 */
export function useNotificationSocket(jwt: string | null) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!jwt) return;

    const socket = createNotificationSocket(jwt);
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      setIsConnected(false);
      toast.warning(
        'Live-Updates nicht verfuegbar - Seite manuell aktualisieren',
        { id: 'notif-offline' },
      );
    });

    socket.on('notification:new', (event: NotificationNewEvent) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      if (event?.notification) {
        toast.info(event.notification.title, {
          description: event.notification.body,
        });
      }
    });

    socket.on('notification:badge', (_event: NotificationBadgeEvent) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    });

    return () => {
      disconnectNotificationSocket(socketRef.current);
      socketRef.current = null;
    };
  }, [jwt, queryClient]);

  return { isConnected };
}
