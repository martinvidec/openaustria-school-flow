import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { TeacherAbsenceDto, AbsenceStatus, AbsenceReason } from '@schoolflow/shared';

/**
 * Query key factory for absence cache invalidation (SUBST-01).
 *
 * Follows the hierarchical pattern established in Phase 4/5 (timetableKeys,
 * classbookKeys): a single `all` array root, then scoped sub-keys. All
 * substitution-related mutations that side-effect on absences invalidate
 * `absenceKeys.all` to keep the cache consistent.
 */
export const absenceKeys = {
  all: (schoolId: string) => ['absences', schoolId] as const,
  list: (schoolId: string, status?: AbsenceStatus) =>
    ['absences', schoolId, 'list', status ?? 'ALL'] as const,
  detail: (schoolId: string, id: string) =>
    ['absences', schoolId, 'detail', id] as const,
};

export interface CreateTeacherAbsencePayload {
  teacherId: string;
  dateFrom: string; // YYYY-MM-DD
  dateTo: string;
  periodFrom?: number;
  periodTo?: number;
  reason: AbsenceReason;
  note?: string;
}

export interface CreateTeacherAbsenceResponse {
  absence: TeacherAbsenceDto;
  affectedLessonCount: number;
}

/**
 * Lists teacher absences for a school with optional status filter.
 * Disabled when schoolId is missing.
 */
export function useAbsences(
  schoolId: string | undefined,
  opts: { status?: AbsenceStatus } = {},
) {
  return useQuery({
    queryKey: absenceKeys.list(schoolId ?? '', opts.status),
    queryFn: async (): Promise<TeacherAbsenceDto[]> => {
      const qs = opts.status ? `?status=${opts.status}` : '';
      const res = await apiFetch(`/api/v1/schools/${schoolId}/absences${qs}`);
      if (!res.ok) throw new Error('Failed to load absences');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });
}

/**
 * Creates a teacher absence. Server fans out pending Substitution rows
 * via range expansion (D-02) and returns the affected lesson count so the
 * UI can surface it to the admin in the success toast.
 *
 * Invalidates absence queries AND substitution queries on success because
 * range expansion creates new pending substitutions.
 */
export function useCreateAbsence(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      payload: CreateTeacherAbsencePayload,
    ): Promise<CreateTeacherAbsenceResponse> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/absences`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await res
          .json()
          .then((b) => b?.message ?? 'Abwesenheit konnte nicht erfasst werden.')
          .catch(() => 'Abwesenheit konnte nicht erfasst werden.');
        throw new Error(
          Array.isArray(message) ? message.join(', ') : String(message),
        );
      }
      return res.json();
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({ queryKey: ['absences', schoolId] });
        queryClient.invalidateQueries({
          queryKey: ['substitutions', schoolId],
        });
      }
    },
  });
}

/**
 * Cancels an absence (server soft-deletes PENDING substitutions and
 * preserves CONFIRMED ones for audit trail).
 */
export function useCancelAbsence(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (absenceId: string): Promise<void> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/absences/${absenceId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Abwesenheit konnte nicht storniert werden.');
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({ queryKey: ['absences', schoolId] });
        queryClient.invalidateQueries({
          queryKey: ['substitutions', schoolId],
        });
      }
    },
  });
}
