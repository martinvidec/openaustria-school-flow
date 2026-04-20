import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { TimeGridDto, TimeGridInput } from '@schoolflow/shared';
import { apiFetch } from '@/lib/api';

export const timeGridKeys = {
  one: (schoolId: string) => ['time-grid', schoolId] as const,
};

export function useTimeGrid(schoolId: string | undefined) {
  return useQuery({
    queryKey: timeGridKeys.one(schoolId ?? ''),
    queryFn: async (): Promise<TimeGridDto | null> => {
      if (!schoolId) return null;
      const res = await apiFetch(`/api/v1/schools/${schoolId}/time-grid`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Zeitraster konnte nicht geladen werden');
      return res.json();
    },
    enabled: !!schoolId,
  });
}

// Thrown by useUpdateTimeGrid when the backend returns 409
// (impactedRunsCount > 0 && force !== true). Plan 10-04's
// DestructiveEditDialog catches this to render the N-aware confirm flow.
export class TimeGridConflictError extends Error {
  constructor(public impactedRunsCount: number) {
    super(`${impactedRunsCount} aktiver Stundenplan verwendet dieses Zeitraster.`);
    this.name = 'TimeGridConflictError';
  }
}

export function useUpdateTimeGrid(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      dto,
      force,
    }: {
      dto: TimeGridInput;
      force?: boolean;
    }): Promise<TimeGridDto> => {
      const url = `/api/v1/schools/${schoolId}/time-grid${force ? '?force=true' : ''}`;
      const res = await apiFetch(url, { method: 'PUT', body: JSON.stringify(dto) });
      if (res.status === 409) {
        const body = await res.json().catch(() => ({}));
        throw new TimeGridConflictError(body.impactedRunsCount ?? 0);
      }
      if (!res.ok) throw new Error('Zeitraster konnte nicht gespeichert werden');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: timeGridKeys.one(schoolId) });
      toast.success('Aenderungen gespeichert.');
    },
    onError: (e: Error) => {
      // Conflicts are handled by Plan 10-04's dialog — no toast.
      if (!(e instanceof TimeGridConflictError)) toast.error(e.message);
    },
  });
}
