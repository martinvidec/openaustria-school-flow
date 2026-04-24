import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PersonSummaryDto } from './useClasses';

/**
 * Teacher search hook — Phase 12-02 D-08 / RESEARCH A2 gap-fix.
 *
 * Backs the Klassenvorstand-Picker (TeacherSearchPopover). Consumers should
 * pass debounced `search` input; hook is gated on ≥ 2 chars + `enabled`
 * to avoid noisy lookups.
 */

export interface TeacherSearchResultDto {
  id: string;
  personId: string;
  person: PersonSummaryDto;
}

export function useTeacherSearch({
  schoolId,
  search,
  enabled = true,
}: {
  schoolId: string | undefined;
  search: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['teacher-search', schoolId, search] as const,
    queryFn: async (): Promise<TeacherSearchResultDto[]> => {
      const params = new URLSearchParams();
      params.set('schoolId', schoolId!);
      params.set('search', search);
      params.set('limit', '20');
      const res = await apiFetch(`/api/v1/teachers?${params.toString()}`);
      if (!res.ok) return [];
      const body = await res.json();
      return (body.data ?? []) as TeacherSearchResultDto[];
    },
    enabled: enabled && !!schoolId && search.length >= 2,
    staleTime: 30_000,
  });
}
