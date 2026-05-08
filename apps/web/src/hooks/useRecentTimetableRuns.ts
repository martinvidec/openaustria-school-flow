import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * One row from `GET /api/v1/schools/:schoolId/timetable/runs`.
 * Mirrors `TimetableRunResponseDto` on the API side, only with the
 * fields /admin/solver renders.
 */
export interface RecentRunDto {
  id: string;
  status: 'QUEUED' | 'SOLVING' | 'COMPLETED' | 'FAILED' | 'STOPPED';
  hardScore: number | null;
  softScore: number | null;
  elapsedSeconds: number | null;
  isActive: boolean;
  errorReason: string | null;
  createdAt: string;
}

/**
 * Issue #60 — REST-driven listing of the last 3 runs per school.
 *
 * Sibling to `useActiveTimetableRun` (which returns the single active
 * run for /timetable). This one returns the whole short list so
 * /admin/solver can show a "Letzte Runs" card with an Aktivieren button
 * per row, even when the WebSocket `solve:complete` event was lost
 * (watchdog flipped first, page mid-reconnect, etc.) and the WS-driven
 * `lastResult` state never populated.
 *
 * Backend caps the list at 3 (D-11), so this is cheap to refetch.
 */
export function useRecentTimetableRuns(schoolId: string | null | undefined) {
  return useQuery({
    queryKey: ['timetable-runs:recent', schoolId ?? ''],
    queryFn: async (): Promise<RecentRunDto[]> => {
      if (!schoolId) return [];
      const res = await apiFetch(`/api/v1/schools/${schoolId}/timetable/runs`);
      if (!res.ok) return [];
      const body: unknown = await res.json();
      // The API returns an array directly (TimetableController.findRuns).
      const arr = Array.isArray(body)
        ? (body as Array<Partial<RecentRunDto>>)
        : Array.isArray((body as { runs?: unknown[] })?.runs)
          ? ((body as { runs: Array<Partial<RecentRunDto>> }).runs)
          : [];
      return arr.map((r) => ({
        id: String(r.id),
        status: (r.status ?? 'QUEUED') as RecentRunDto['status'],
        hardScore: r.hardScore ?? null,
        softScore: r.softScore ?? null,
        elapsedSeconds: r.elapsedSeconds ?? null,
        isActive: !!r.isActive,
        errorReason: r.errorReason ?? null,
        createdAt: String(r.createdAt ?? ''),
      }));
    },
    enabled: !!schoolId,
    // Refetch when the page regains focus so a run that just completed in
    // a different tab / device shows up without a manual reload.
    refetchOnWindowFocus: true,
  });
}
