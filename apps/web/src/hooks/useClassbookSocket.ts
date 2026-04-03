import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { createClassbookSocket, disconnectClassbookSocket } from '@/lib/socket';
import { classbookKeys } from './useClassbook';
import { excuseKeys } from './useExcuses';
import { gradeKeys } from './useGrades';
import type {
  ClassBookAttendanceUpdatedEvent,
  ClassBookGradeAddedEvent,
  ClassBookExcuseUpdatedEvent,
  ClassBookEntryUpdatedEvent,
} from '@schoolflow/shared';

/**
 * Centralized Socket.IO event handler for the /classbook namespace.
 * Connects to the WebSocket, listens for classbook change events,
 * and invalidates TanStack Query caches for automatic UI refresh.
 *
 * Per RESEARCH.md anti-pattern guidance: all socket event handling is
 * centralized in this single hook. Do NOT scatter listeners in child components.
 *
 * Should be mounted at the classbook lesson page level (not authenticated layout)
 * since classbook events are only relevant when viewing classbook pages.
 *
 * @param schoolId - The current school ID. Socket connects when non-null.
 * @returns isConnected - Whether the WebSocket is currently connected.
 */
export function useClassbookSocket(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!schoolId) return;

    const socket = createClassbookSocket(schoolId);

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Attendance update from another teacher (per UI-SPEC interaction contract)
    socket.on('classbook:attendance-updated', (data: ClassBookAttendanceUpdatedEvent) => {
      queryClient.invalidateQueries({
        queryKey: classbookKeys.attendance(schoolId, data.classBookEntryId),
      });
      // Toast only if a different teacher made the change
      if (data.teacherName) {
        toast.info(
          `Anwesenheit wurde von ${data.teacherName} geaendert. Seite wird aktualisiert.`,
          { duration: 3000 },
        );
      }
    });

    // Grade added -- invalidate grade matrix
    socket.on('classbook:grade-added', (data: ClassBookGradeAddedEvent) => {
      queryClient.invalidateQueries({
        queryKey: gradeKeys.all(schoolId),
      });
    });

    // Excuse status changed -- for parent notification
    socket.on('classbook:excuse-updated', (data: ClassBookExcuseUpdatedEvent) => {
      queryClient.invalidateQueries({
        queryKey: excuseKeys.all(schoolId),
      });
      const statusText = data.status === 'ACCEPTED' ? 'akzeptiert' : 'abgelehnt';
      toast.info(`Ihre Entschuldigung wurde ${statusText}`, { duration: 3000 });
    });

    // Entry content updated -- co-teacher sync
    socket.on('classbook:entry-updated', (data: ClassBookEntryUpdatedEvent) => {
      queryClient.invalidateQueries({
        queryKey: classbookKeys.entry(schoolId, data.classBookEntryId),
      });
    });

    return () => {
      disconnectClassbookSocket();
    };
  }, [schoolId, queryClient]);

  return { isConnected };
}
