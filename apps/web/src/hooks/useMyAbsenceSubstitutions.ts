import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { SubstitutionDto } from '@schoolflow/shared';

export type MyAbsenceSubstitution = SubstitutionDto & {
  hasHandoverNote?: boolean;
};

export function useMyAbsenceSubstitutions(schoolId: string | null | undefined) {
  return useQuery({
    queryKey: ['substitutions', schoolId, 'my-absences'],
    queryFn: async (): Promise<MyAbsenceSubstitution[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/substitutions/my-absences`,
      );
      if (!res.ok) throw new Error('Failed to load my absence substitutions');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });
}
