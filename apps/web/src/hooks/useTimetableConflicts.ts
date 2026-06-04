import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * One conflict row from
 * `GET /api/v1/schools/:schoolId/timetable/runs/:runId/conflicts`.
 *
 * Mirrors the `TimetableConflict` Prisma model (#177-B): a lesson the solver
 * placed but that could not be persisted without double-booking a teacher or
 * room in the same slot. Denormalized labels are resolved at persist time so
 * this renders without re-joining.
 */
export interface TimetableConflictDto {
  id: string;
  runId: string;
  conflictType: 'TEACHER' | 'ROOM';
  classSubjectId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: string;
  periodNumber: number;
  weekType: string;
  conflictsWithClassSubjectId: string | null;
  teacherLabel: string | null;
  subjectLabel: string | null;
  classLabel: string | null;
  roomLabel: string | null;
  conflictsWithLabel: string | null;
  status: 'OPEN' | 'RESOLVED';
  createdAt: string;
}

/**
 * Issue #177-B — load the dropped-lesson conflicts for a single run so
 * /admin/solver can render the "N Konflikte zu lösen" card. Only enabled when
 * a runId is supplied (the page passes the most recent
 * COMPLETED_WITH_CONFLICTS run).
 */
export function useTimetableConflicts(
  schoolId: string | null | undefined,
  runId: string | null | undefined,
) {
  return useQuery({
    queryKey: ['timetable-conflicts', schoolId ?? '', runId ?? ''],
    queryFn: async (): Promise<TimetableConflictDto[]> => {
      if (!schoolId || !runId) return [];
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/runs/${runId}/conflicts`,
      );
      if (!res.ok) return [];
      const body: unknown = await res.json();
      return Array.isArray(body) ? (body as TimetableConflictDto[]) : [];
    },
    enabled: !!schoolId && !!runId,
  });
}
