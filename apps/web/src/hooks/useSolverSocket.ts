import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import { createSolverSocket, disconnectSolverSocket } from '@/lib/socket';

/**
 * One entry in the solver's remaining-violation grouping.
 * Mirrors `ViolationGroupDto` in apps/api/.../dto/solve-progress.dto.ts.
 */
export interface SolveViolationGroup {
  /** Constraint type, e.g. "Teacher conflict" */
  type: string;
  /** Number of violations of this type */
  count: number;
  /** Human-readable examples, e.g. "Mueller: Mon P3" */
  examples: string[];
}

/**
 * One entry on the solver's score-over-time chart.
 * Mirrors `ScoreHistoryEntryDto` in apps/api/.../dto/solve-progress.dto.ts.
 */
export interface SolveScoreHistoryEntry {
  /** Milliseconds since solve start */
  timestamp: number;
  /** Hard score (0 = feasible) */
  hard: number;
  /** Soft score (<= 0, higher is better) */
  soft: number;
}

/**
 * Live progress event emitted by `/solver` on every solver tick.
 * Mirrors `SolveProgressDto` in apps/api/.../dto/solve-progress.dto.ts.
 */
export interface SolveProgressEvent {
  runId: string;
  hardScore: number;
  softScore: number;
  elapsedSeconds: number;
  remainingViolations: SolveViolationGroup[];
  improvementRate: 'improving' | 'plateauing' | 'stagnant';
  scoreHistory: SolveScoreHistoryEntry[];
}

/**
 * Lightweight completion summary emitted by `/solver` when the run finishes.
 * Matches the payload constructed in SolverCallbackController.handleCompletion
 * (full lesson list is fetched via REST afterwards, not broadcast here).
 */
export interface SolveCompleteEvent {
  runId: string;
  status: string;
  hardScore: number;
  softScore: number;
  elapsedSeconds: number;
}

/**
 * TIME-06 -- Real-time solver progress Socket.IO hook.
 *
 * Closes v1.0 audit Finding 3: the `/solver` Socket.IO namespace existed on
 * the backend (apps/api/src/modules/timetable/timetable.gateway.ts) but had
 * no frontend consumer. This hook subscribes to both solver events and
 * exposes a clean state machine to the admin solver page:
 *
 *  - `solve:progress` -> updates `progress` state with the latest scores
 *    and violation groups so the UI can render a live score chart.
 *  - `solve:complete` -> stores the final `lastResult`, clears `progress`,
 *    invalidates the timetable and runs caches, and shows a success toast.
 *
 * Scoping: the gateway places clients into `school:{schoolId}` rooms based
 * on the handshake query param, so this hook takes `schoolId` (not a JWT).
 * Progress events are school-scoped, not user-scoped.
 *
 * Mount: use this hook at the admin solver *page* level (NOT at the
 * `_authenticated` layout). Unlike notifications, solver events are only
 * relevant while actively viewing the solver page, and keeping the
 * connection page-scoped matches the `useClassbookSocket` precedent from
 * Phase 5.
 *
 * @param schoolId - The school to subscribe to. Pass `null`/`undefined` to
 *                   disable the socket (e.g. while the school context is
 *                   still being resolved).
 */
export function useSolverSocket(schoolId: string | null | undefined) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [progress, setProgress] = useState<SolveProgressEvent | null>(null);
  const [lastResult, setLastResult] = useState<SolveCompleteEvent | null>(null);

  useEffect(() => {
    if (!schoolId) return;

    const socket = createSolverSocket(schoolId);
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
        { id: 'solver-offline' },
      );
    });

    socket.on('solve:progress', (event: SolveProgressEvent) => {
      setProgress(event);
    });

    socket.on('solve:complete', (event: SolveCompleteEvent) => {
      setLastResult(event);
      setProgress(null);
      // Invalidate timetable + runs caches so the admin page reflects the
      // freshly generated plan without a manual refresh.
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: ['timetable-runs'] });
      toast.success('Stundenplan-Generierung abgeschlossen', {
        description: `Status: ${event.status} | Hard: ${event.hardScore} | Soft: ${event.softScore}`,
      });
    });

    return () => {
      disconnectSolverSocket(socketRef.current);
      socketRef.current = null;
    };
  }, [schoolId, queryClient]);

  return { isConnected, progress, lastResult };
}
