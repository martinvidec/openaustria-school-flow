import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { SchoolDetailsInput, SchoolDto } from '@schoolflow/shared';
import { apiFetch } from '@/lib/api';
import { dashboardKeys } from '@/hooks/useDashboardStatus';

export const schoolKeys = {
  one: (schoolId: string) => ['school', schoolId] as const,
  list: () => ['schools'] as const,
};

export function useSchool(schoolId: string | undefined) {
  return useQuery({
    queryKey: schoolKeys.one(schoolId ?? ''),
    queryFn: async (): Promise<SchoolDto | null> => {
      if (!schoolId) return null;
      const res = await apiFetch(`/api/v1/schools/${schoolId}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Schule konnte nicht geladen werden');
      return res.json();
    },
    enabled: schoolId !== undefined,
  });
}

// Returns the FIRST school for the authenticated admin — empty-flow bootstrap.
export function useFirstSchool() {
  return useQuery({
    queryKey: schoolKeys.list(),
    queryFn: async (): Promise<SchoolDto | null> => {
      const res = await apiFetch('/api/v1/schools');
      if (!res.ok) throw new Error('Schulen konnten nicht geladen werden');
      const arr: SchoolDto[] = await res.json();
      return arr[0] ?? null;
    },
  });
}

export function useCreateSchool() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      dto: SchoolDetailsInput & { abWeekEnabled?: boolean },
    ): Promise<SchoolDto> => {
      const res = await apiFetch('/api/v1/schools', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('Schule konnte nicht angelegt werden');
      return res.json();
    },
    onSuccess: (server) => {
      qc.invalidateQueries({ queryKey: schoolKeys.list() });
      qc.setQueryData(schoolKeys.one(server.id), server);
      qc.invalidateQueries({ queryKey: dashboardKeys.status });
      toast.success('Schule angelegt. Sie koennen jetzt Zeitraster und Schuljahr pflegen.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateSchool(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      dto: Partial<SchoolDetailsInput> & { abWeekEnabled?: boolean },
    ): Promise<SchoolDto> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new Error('Aenderungen konnten nicht gespeichert werden');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: schoolKeys.one(schoolId) });
      qc.invalidateQueries({ queryKey: dashboardKeys.status });
      toast.success('Aenderungen gespeichert.');
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
