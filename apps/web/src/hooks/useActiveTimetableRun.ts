import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

export interface ActiveRunDto {
  id: string;
  abWeekEnabled: boolean;
  status: string;
}

export function useActiveTimetableRun(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['timetable-run:active', schoolId ?? ''],
    queryFn: async (): Promise<ActiveRunDto | null> => {
      if (!schoolId) return null;
      const res = await apiFetch(`/api/v1/schools/${schoolId}/timetable/runs`);
      if (!res.ok) return null;
      const body: unknown = await res.json();
      // Backend returns an array directly (see TimetableController.findRuns).
      // Schema confirms TimetableRun.isActive: boolean (Phase 10-01a). Filter
      // client-side rather than hitting a query param the endpoint doesn't
      // currently support.
      const arr: Array<{ id: string; abWeekEnabled?: boolean; status?: string; isActive?: boolean }> =
        Array.isArray(body)
          ? (body as any[])
          : Array.isArray((body as { runs?: unknown[] })?.runs)
            ? ((body as { runs: any[] }).runs as any[])
            : [];
      const active = arr.find((r) => r.isActive === true) ?? null;
      if (!active) return null;
      return {
        id: active.id,
        abWeekEnabled: !!active.abWeekEnabled,
        status: String(active.status ?? ''),
      };
    },
    enabled: !!schoolId,
  });
}
