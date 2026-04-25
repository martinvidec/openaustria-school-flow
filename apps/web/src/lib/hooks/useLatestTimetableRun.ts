import { useQuery } from '@tanstack/react-query';
import {
  solverTuningApi,
  type TimetableRunSummary,
} from '@/lib/api/solver-tuning';

/**
 * Phase 14-02: latest timetable-run summary for the Tuning-Page header.
 *
 * Drives `LastRunScoreBadge` (Hard/Soft scores + relative time) and
 * `DriftBanner` (compares lastRun.completedAt against the constraint-
 * weights `lastUpdatedAt`).
 */
export function useLatestTimetableRun(schoolId: string) {
  return useQuery<TimetableRunSummary | null>({
    queryKey: ['timetable-runs', schoolId, 'latest'],
    queryFn: () => solverTuningApi.getLatestRun(schoolId),
    enabled: !!schoolId,
  });
}
