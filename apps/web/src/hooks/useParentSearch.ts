import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PersonSummaryDto } from './useClasses';

/**
 * Phase 13-02 USER-05 — Parent search hook (mirror of useTeacherSearch).
 *
 * Backs `PersonAutocompletePopover` when personType === 'PARENT'.
 * Consumers should pass debounced `search` input; hook is gated on
 * ≥ 2 chars + `enabled` to avoid noisy lookups.
 */

export interface ParentSearchResultDto {
  id: string;
  personId: string;
  schoolId: string;
  person: PersonSummaryDto;
  alreadyLinkedToPersonId?: string | null;
  alreadyLinkedUserEmail?: string | null;
}

export function useParentSearch({
  schoolId,
  search,
  enabled = true,
}: {
  schoolId: string | undefined;
  search: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['parent-search', schoolId, search] as const,
    queryFn: async (): Promise<ParentSearchResultDto[]> => {
      const params = new URLSearchParams();
      params.set('schoolId', schoolId!);
      params.set('search', search);
      params.set('limit', '20');
      const res = await apiFetch(`/api/v1/parents?${params.toString()}`);
      if (!res.ok) return [];
      const body = await res.json();
      return (body.data ?? []) as ParentSearchResultDto[];
    },
    enabled: enabled && !!schoolId && search.length >= 2,
    staleTime: 30_000,
  });
}
