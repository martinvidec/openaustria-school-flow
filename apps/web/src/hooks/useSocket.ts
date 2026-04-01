import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createTimetableSocket, disconnectTimetableSocket } from '@/lib/socket';
import { timetableKeys } from './useTimetable';
import type { TimetableChangedEvent } from '@schoolflow/shared';

/**
 * Centralized Socket.IO event handler for the /timetable namespace.
 * Connects to the WebSocket, listens for timetable change events,
 * and invalidates TanStack Query caches for automatic UI refresh.
 *
 * Per RESEARCH.md anti-pattern guidance: all socket event handling is
 * centralized in this single hook. Do NOT scatter listeners in child components.
 *
 * Must be mounted at the _authenticated layout level (not page-specific)
 * so that ROOM-05 room change events propagate to /rooms pages too.
 *
 * @param schoolId - The current school ID. Socket connects when non-null.
 * @returns isConnected - Whether the WebSocket is currently connected.
 */
export function useTimetableSocket(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);
  const reconnectToastId = useRef<string | number | null>(null);

  useEffect(() => {
    if (!schoolId) return;

    const socket = createTimetableSocket(schoolId);

    socket.on('connect', () => {
      setIsConnected(true);
      // Dismiss reconnection toast if it was showing
      if (reconnectToastId.current) {
        toast.dismiss(reconnectToastId.current);
        reconnectToastId.current = null;
      }
      // Silent background refetch on reconnect
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      if (!reconnectToastId.current) {
        reconnectToastId.current = toast.loading(
          'Verbindung unterbrochen. Versuche erneut zu verbinden...',
          { duration: Infinity },
        );
      }
    });

    // Timetable change events (D-12, VIEW-04)
    socket.on('timetable:changed', (data: TimetableChangedEvent) => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
      toast.info(
        `Stundenplan aktualisiert: ${data.changeCount} Aenderungen`,
        { duration: 3000 },
      );
    });

    socket.on('timetable:cancelled', (data: TimetableChangedEvent) => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
      toast.info(
        `Stundenplan aktualisiert: ${data.changeCount} Aenderungen`,
        { duration: 3000 },
      );
    });

    // Room swap event (ROOM-05, D-16): invalidate both timetable and room availability
    socket.on('timetable:room-swap', () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
      queryClient.invalidateQueries({
        queryKey: ['rooms', schoolId, 'availability'],
      });
      toast.info('Raumaenderung durchgefuehrt', { duration: 3000 });
    });

    socket.on('timetable:substitution', (data: TimetableChangedEvent) => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
      toast.info(
        `Stundenplan aktualisiert: ${data.changeCount} Aenderungen`,
        { duration: 3000 },
      );
    });

    return () => {
      disconnectTimetableSocket();
    };
  }, [schoolId, queryClient]);

  return { isConnected };
}
