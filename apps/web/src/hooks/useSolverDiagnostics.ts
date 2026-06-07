import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Issue #177-D — solver diagnostics hooks.
 *
 * `useFeasibility` powers the pre-solve dimensioning warning; `useSolveReport`
 * powers the post-run utilization overview. Both are read-only and tolerate a
 * missing schoolId/runId by staying disabled.
 */

export interface FeasibilityWarning {
  type: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface FeasibilityReport {
  feasible: boolean;
  gridSlots: number;
  totalLessons: number;
  roomCount: number;
  classCount: number;
  teacherCount: number;
  warnings: FeasibilityWarning[];
}

export interface SolveReport {
  runId: string;
  status: string;
  hardScore: number | null;
  softScore: number | null;
  gridSlots: number;
  lessonCount: number;
  teacherUtilization: {
    teacherId: string;
    label: string;
    lessons: number;
    pct: number;
  }[];
  roomUtilization: {
    roomId: string;
    label: string;
    lessons: number;
    pct: number;
  }[];
  classDistribution: { classId: string; label: string; lessons: number }[];
  topConstraints: { type: string; count: number }[];
}

export function useFeasibility(schoolId: string | null | undefined) {
  return useQuery({
    queryKey: ['timetable-feasibility', schoolId ?? ''],
    queryFn: async (): Promise<FeasibilityReport | null> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/feasibility`,
      );
      if (!res.ok) return null;
      return (await res.json()) as FeasibilityReport;
    },
    enabled: !!schoolId,
  });
}

export function useSolveReport(
  schoolId: string | null | undefined,
  runId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['timetable-report', schoolId ?? '', runId ?? ''],
    queryFn: async (): Promise<SolveReport | null> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/runs/${runId}/report`,
      );
      if (!res.ok) return null;
      return (await res.json()) as SolveReport;
    },
    enabled: !!schoolId && !!runId,
  });
}
