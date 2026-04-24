import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PersonSummaryDto } from './useStudents';

/**
 * Phase 13-02 USER-05 — Student search hook (mirror of useTeacherSearch).
 *
 * Backs `PersonAutocompletePopover` when personType === 'STUDENT'.
 * Consumers should pass debounced `search` input; hook is gated on
 * ≥ 2 chars + `enabled` to avoid noisy lookups.
 */

export interface StudentSearchResultDto {
  id: string;
  personId: string;
  classId?: string | null;
  isArchived?: boolean;
  person: PersonSummaryDto;
  /**
   * Phase 11/12 D-08 already-linked enrichment surfaced in the search
   * response when the result already has a Keycloak-User binding.
   */
  alreadyLinkedToPersonId?: string | null;
  alreadyLinkedUserEmail?: string | null;
  schoolClass?: { id: string; name: string } | null;
}

export function useStudentSearch({
  schoolId,
  search,
  enabled = true,
}: {
  schoolId: string | undefined;
  search: string;
  enabled?: boolean;
}) {
  return useQuery({
    queryKey: ['student-search', schoolId, search] as const,
    queryFn: async (): Promise<StudentSearchResultDto[]> => {
      const params = new URLSearchParams();
      params.set('schoolId', schoolId!);
      params.set('search', search);
      params.set('limit', '20');
      const res = await apiFetch(`/api/v1/students?${params.toString()}`);
      if (!res.ok) return [];
      const body = await res.json();
      return (body.data ?? []) as StudentSearchResultDto[];
    },
    enabled: enabled && !!schoolId && search.length >= 2,
    staleTime: 30_000,
  });
}
