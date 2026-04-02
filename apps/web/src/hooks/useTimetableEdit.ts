import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { timetableKeys } from './useTimetable';
import { toast } from 'sonner';
import type {
  MoveLessonRequest,
  TimetableLessonEditRecord,
  TimetableViewLesson,
} from '@schoolflow/shared';

/**
 * Mutation hook for moving a lesson to a new slot.
 * Calls PATCH /api/v1/schools/:schoolId/timetable/lessons/:lessonId/move
 * and invalidates all timetable queries on success.
 */
export function useMoveLesson(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: MoveLessonRequest): Promise<TimetableViewLesson> => {
      const { lessonId, ...moveBody } = dto;
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/lessons/${lessonId}/move`,
        { method: 'PATCH', body: JSON.stringify(moveBody) },
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Move failed');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
      toast.success('Stunde verschoben');
    },
    onError: (error: Error) => {
      toast.error(`Verschiebung fehlgeschlagen: ${error.message}`);
    },
  });
}

/**
 * Query hook for fetching edit history for a timetable run.
 * Calls GET /api/v1/schools/:schoolId/timetable/runs/:runId/edit-history
 * Disabled when runId is not available.
 */
export function useEditHistory(schoolId: string, runId: string | undefined) {
  return useQuery({
    queryKey: timetableKeys.editHistory(schoolId, runId ?? ''),
    queryFn: async (): Promise<TimetableLessonEditRecord[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/runs/${runId}/edit-history`,
      );
      if (!res.ok) throw new Error('Failed to load edit history');
      return res.json();
    },
    enabled: !!runId,
  });
}

/**
 * Mutation hook for reverting to a previous edit state.
 * Calls POST /api/v1/schools/:schoolId/timetable/runs/:runId/revert/:editId
 * Invalidates all timetable queries and edit history on success.
 */
export function useRevertEdit(schoolId: string, runId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (editId: string): Promise<void> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/runs/${runId}/revert/${editId}`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error('Revert failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all(schoolId) });
      queryClient.invalidateQueries({
        queryKey: timetableKeys.editHistory(schoolId, runId),
      });
      toast.success('Aenderung rueckgaengig gemacht');
    },
    onError: (error: Error) => {
      toast.error(`Rueckgaengig machen fehlgeschlagen: ${error.message}`);
    },
  });
}
