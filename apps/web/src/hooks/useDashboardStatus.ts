import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { DashboardStatusDto } from '@/types/dashboard';

/**
 * Query-key factory for the admin dashboard status query. Plan 06 (and other
 * future plans that mutate setup-relevant data) imports `dashboardKeys.status`
 * to invalidate the polling query when something changes — this is the
 * D-07 "hybrid invalidation" key.
 */
export const dashboardKeys = {
  status: ['dashboard-status'] as const,
};

/**
 * Phase 16 Plan 02 (D-07/D-08/D-09) — polling hook for the admin
 * dashboard setup status.
 *
 * Hook signature accepts the WIDEST callable shape `string | null | undefined`
 * so callers can pass `useSchoolContext((s) => s.schoolId)` (which is
 * `string | null` per stores/school-context-store.ts:11) directly without
 * coercion at every call-site. The hook converts null → undefined internally
 * and treats both as "no schoolId yet" (enabled: false).
 *
 * Behavior:
 *  - queryKey: `['dashboard-status']` (singleton — only ever one schoolId in
 *    scope per session, matches D-07 hybrid invalidation key)
 *  - staleTime: 10 seconds (D-09 — avoids re-fetch storms during route
 *    transitions while still keeping the badge fresh)
 *  - refetchInterval: 30 seconds (D-08 — covers async backend changes such
 *    as solver runs writing back results)
 *  - enabled: only when schoolId is a non-empty string
 */
export function useDashboardStatus(schoolId: string | null | undefined) {
  const normalized = schoolId ?? undefined;
  return useQuery({
    queryKey: dashboardKeys.status,
    queryFn: async (): Promise<DashboardStatusDto> => {
      const res = await apiFetch(
        `/api/v1/admin/dashboard/status?schoolId=${normalized}`,
      );
      if (!res.ok) {
        throw new Error('Failed to load dashboard status');
      }
      return res.json();
    },
    enabled: !!normalized,
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}
