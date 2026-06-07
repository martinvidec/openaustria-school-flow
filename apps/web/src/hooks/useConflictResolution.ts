import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Issue #177-C — resolution suggestions + the resolve mutation for a single
 * TimetableConflict. The suggestions back the resolution dialog's dropdowns;
 * the mutation applies the chosen action and (on the last conflict) flips the
 * run back to COMPLETED.
 */

export interface ConflictSuggestionsDto {
  conflictId: string;
  conflictType: 'TEACHER' | 'ROOM';
  /** Free qualified teachers (TEACHER) or free compatible rooms (ROOM). */
  alternativeResources: { id: string; label: string }[];
  /** Slots free for both the conflict's teacher and room (for move-slot). */
  freeSlots: {
    dayOfWeek: string;
    periodNumber: number;
    weekType: string;
    label: string;
  }[];
}

export interface ResolveConflictPayload {
  action: 'reassign-resource' | 'move-slot' | 'cancel';
  newTeacherId?: string;
  newRoomId?: string;
  dayOfWeek?: string;
  periodNumber?: number;
  weekType?: string;
}

export function useConflictSuggestions(
  schoolId: string | null | undefined,
  runId: string | null | undefined,
  conflictId: string | null | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: [
      'timetable-conflict-suggestions',
      schoolId ?? '',
      runId ?? '',
      conflictId ?? '',
    ],
    queryFn: async (): Promise<ConflictSuggestionsDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/runs/${runId}/conflicts/${conflictId}/suggestions`,
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as ConflictSuggestionsDto;
    },
    enabled: enabled && !!schoolId && !!runId && !!conflictId,
  });
}

export function useResolveConflict(
  schoolId: string | null | undefined,
  runId: string | null | undefined,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      conflictId: string;
      payload: ResolveConflictPayload;
    }) => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/runs/${runId}/conflicts/${vars.conflictId}/resolve`,
        { method: 'POST', body: JSON.stringify(vars.payload) },
      );
      if (!res.ok) {
        let message = `HTTP ${res.status}`;
        try {
          const body = (await res.json()) as { message?: string | string[] };
          if (body?.message) {
            message = Array.isArray(body.message)
              ? body.message.join(', ')
              : body.message;
          }
        } catch {
          /* keep the HTTP fallback */
        }
        throw new Error(message);
      }
      return (await res.json()) as {
        resolved: boolean;
        conflictId: string;
        action: string;
        runCompleted: boolean;
      };
    },
    onSuccess: () => {
      // Refresh the conflict list, the recent-runs list (status may have
      // flipped to COMPLETED), and the active timetable view.
      void queryClient.invalidateQueries({
        queryKey: ['timetable-conflicts', schoolId ?? '', runId ?? ''],
      });
      void queryClient.invalidateQueries({
        queryKey: ['timetable-runs:recent'],
      });
      void queryClient.invalidateQueries({ queryKey: ['timetable-view'] });
    },
  });
}
