import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { Socket } from 'socket.io-client';
import { createSolverSocket, disconnectSolverSocket } from '@/lib/socket';
import { apiFetch } from '@/lib/api';

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
 * Active-run snapshot exposed to /admin/solver while a solve is in flight.
 * Issue #53 Schicht 1: surfaces QUEUED + SOLVING-without-progress states
 * (which the websocket-only path silently dropped) and FAILED + errorReason
 * (so the user sees a real reason instead of a stuck spinner).
 *
 * Built from two sources, in this priority order:
 *   1. The POST /solve response  -> QUEUED + runId, instantly.
 *   2. The REST polling fallback -> latest server-side status + errorReason.
 *   3. The 'solve:complete' WS event  -> mirrored into here so a single
 *      consumer (the page) can drive its state machine off `activeRun`.
 */
export interface ActiveRunState {
  runId: string;
  status: 'QUEUED' | 'SOLVING' | 'COMPLETED' | 'FAILED' | 'STOPPED';
  errorReason: string | null;
}

/** Terminal statuses — polling stops once a run reaches one of these. */
const TERMINAL_STATUSES = new Set(['COMPLETED', 'FAILED', 'STOPPED']);

/** Wait this long after starting a run before assuming WS is silent. */
const POLL_GRACE_MS = 10_000;
/** Polling cadence after the grace period. */
const POLL_INTERVAL_MS = 5_000;

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
  const [activeRun, setActiveRun] = useState<ActiveRunState | null>(null);

  // Polling-fallback bookkeeping (#53 Schicht 1). Refs, not state, so polling
  // restarts don't cause renders.
  const pollingRunIdRef = useRef<string | null>(null);
  const pollingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressSeenRef = useRef(false);

  const stopPolling = useCallback(() => {
    if (pollingTimerRef.current) {
      clearTimeout(pollingTimerRef.current);
      pollingTimerRef.current = null;
    }
    pollingRunIdRef.current = null;
  }, []);

  /** Background fetch of the run's authoritative state, then re-arm or stop. */
  const pollOnce = useCallback(async () => {
    const runId = pollingRunIdRef.current;
    if (!runId || !schoolId) return;
    try {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/runs/${runId}`,
      );
      if (res.ok) {
        const run = (await res.json()) as {
          id: string;
          status: ActiveRunState['status'];
          errorReason: string | null;
        };
        setActiveRun({
          runId: run.id,
          status: run.status,
          errorReason: run.errorReason,
        });
        if (TERMINAL_STATUSES.has(run.status)) {
          stopPolling();
          // FAILED / STOPPED never produce a 'solve:complete' WS event when
          // the watchdog flips a hung run, so make sure the UI surfaces it.
          if (run.status === 'FAILED' && !lastResult) {
            toast.error('Stundenplan-Generierung fehlgeschlagen', {
              description: run.errorReason ?? 'Unbekannter Fehler',
            });
          }
          return;
        }
      }
    } catch {
      // Swallow — next poll re-tries; the watchdog will eventually flip the
      // run to FAILED on the server side anyway.
    }
    // Re-arm.
    pollingTimerRef.current = setTimeout(pollOnce, POLL_INTERVAL_MS);
  }, [schoolId, stopPolling, lastResult]);

  /**
   * Mark a freshly POSTed run as active and arm the polling fallback.
   * The page calls this right after `POST /solve` returns 202 so the UI
   * shows "QUEUED + Run-ID" *immediately*, then arms a 10s grace timer
   * that flips into REST-polling mode if no `solve:progress` event arrives.
   */
  const trackRun = useCallback(
    (runId: string) => {
      // Reset any prior tracking — start fresh.
      stopPolling();
      progressSeenRef.current = false;
      setActiveRun({ runId, status: 'QUEUED', errorReason: null });
      pollingRunIdRef.current = runId;
      pollingTimerRef.current = setTimeout(() => {
        // If a websocket progress event already arrived, skip polling — the
        // socket path is richer (scoreHistory, violations) and authoritative
        // while the run is live. Otherwise start the REST poll loop.
        if (progressSeenRef.current) return;
        pollOnce();
      }, POLL_GRACE_MS);
    },
    [stopPolling, pollOnce],
  );

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
      progressSeenRef.current = true;
      // WS is alive — kill the REST polling fallback to save round-trips.
      if (pollingRunIdRef.current === event.runId) {
        stopPolling();
      }
      // Reflect the SOLVING transition in activeRun so the page can drop
      // the "wird in Warteschlange aufgenommen" copy.
      setActiveRun((prev) =>
        prev && prev.runId === event.runId
          ? { ...prev, status: 'SOLVING' }
          : prev,
      );
    });

    socket.on('solve:complete', (event: SolveCompleteEvent) => {
      setLastResult(event);
      setProgress(null);
      // Mirror terminal status into activeRun so the page can render the
      // FAILED-card from a single source of truth.
      setActiveRun((prev) =>
        prev && prev.runId === event.runId
          ? {
              ...prev,
              status: event.status as ActiveRunState['status'],
            }
          : prev,
      );
      stopPolling();
      // Invalidate timetable + runs caches so the admin page reflects the
      // freshly generated plan without a manual refresh.
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
      queryClient.invalidateQueries({ queryKey: ['timetable-runs'] });
      if (event.status === 'FAILED') {
        toast.error('Stundenplan-Generierung fehlgeschlagen', {
          description: 'Details siehe rote Fehler-Karte.',
        });
      } else {
        toast.success('Stundenplan-Generierung abgeschlossen', {
          description: `Status: ${event.status} | Hard: ${event.hardScore} | Soft: ${event.softScore}`,
        });
      }
    });

    return () => {
      disconnectSolverSocket(socketRef.current);
      socketRef.current = null;
      stopPolling();
    };
  }, [schoolId, queryClient, stopPolling]);

  return { isConnected, progress, lastResult, activeRun, trackRun };
}
