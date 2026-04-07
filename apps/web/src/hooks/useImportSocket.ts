import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import { keycloak } from '@/lib/keycloak';
import { importKeys } from './useImport';
import type { ImportProgressEvent } from '@schoolflow/shared';

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * IMPORT-01/02 — Real-time import progress Socket.IO client hook.
 *
 * Connects to the `/import` namespace using the school-scoped room pattern
 * (same as timetable/classbook sockets). Listens for:
 *
 *  - `import:progress` -> Updates local progress state (current/total/percent)
 *  - `import:complete` -> Invalidates import-history cache, triggers onComplete
 *
 * Mounted at the import page level (not layout level) since import events
 * are page-scoped and only relevant to the admin import wizard.
 */
export function useImportSocket(
  schoolId: string,
  onComplete?: () => void,
) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState<ImportProgressEvent | null>(null);

  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  const resetProgress = useCallback(() => {
    setProgress(null);
  }, []);

  useEffect(() => {
    if (!schoolId) return;

    const socket = io(`${API_URL}/import`, {
      query: { schoolId },
      auth: { token: keycloak.token },
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('import:progress', (event: ImportProgressEvent) => {
      setProgress(event);
    });

    socket.on('import:complete', () => {
      queryClient.invalidateQueries({
        queryKey: importKeys.history(schoolId),
      });
      onCompleteRef.current?.();
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, [schoolId, queryClient]);

  return { progress, isConnected, resetProgress };
}
