import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { FairnessStatRow } from '@schoolflow/shared';

export type StatsWindow =
  | 'week'
  | 'month'
  | 'semester'
  | 'schoolYear'
  | 'custom';

/**
 * Query key factory for substitution fairness statistics (SUBST-06).
 */
export const substitutionStatsKeys = {
  all: (schoolId: string) => ['substitution-stats', schoolId] as const,
  window: (
    schoolId: string,
    window: StatsWindow,
    customStart?: string,
    customEnd?: string,
  ) =>
    [
      'substitution-stats',
      schoolId,
      window,
      customStart ?? null,
      customEnd ?? null,
    ] as const,
};

/**
 * Fetches per-teacher fairness statistics for the given window. The default
 * window in the UI is 'semester' per D-18. Custom windows require both
 * customStart and customEnd to be provided as ISO date strings.
 */
export function useSubstitutionStats(
  schoolId: string | undefined,
  window: StatsWindow,
  customStart?: string,
  customEnd?: string,
) {
  return useQuery({
    queryKey: substitutionStatsKeys.window(
      schoolId ?? '',
      window,
      customStart,
      customEnd,
    ),
    queryFn: async (): Promise<FairnessStatRow[]> => {
      const params = new URLSearchParams({ window });
      if (customStart) params.set('customStart', customStart);
      if (customEnd) params.set('customEnd', customEnd);
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/substitution-stats?${params}`,
      );
      if (!res.ok) throw new Error('Failed to load fairness statistics');
      return res.json();
    },
    enabled:
      !!schoolId && (window !== 'custom' || (!!customStart && !!customEnd)),
    staleTime: 60_000,
  });
}
