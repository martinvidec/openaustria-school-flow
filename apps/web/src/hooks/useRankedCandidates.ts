import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { RankedCandidateDto } from '@schoolflow/shared';

/**
 * Query key factory for ranked candidates (SUBST-02).
 *
 * Backed by GET /api/v1/schools/:schoolId/substitutions/:id/candidates
 * which returns RankingService output through RankingController.
 */
export const rankedCandidatesKeys = {
  all: ['ranked-candidates'] as const,
  bySubstitution: (schoolId: string, substitutionId: string) =>
    ['ranked-candidates', schoolId, substitutionId] as const,
};

/**
 * Fetches ranked substitute candidates for an open substitution.
 * Disabled until both schoolId and substitutionId are present — ensures
 * no wasted fetches when the admin has not yet expanded a row.
 */
export function useRankedCandidates(
  schoolId: string | undefined,
  substitutionId: string | null,
) {
  return useQuery({
    queryKey: rankedCandidatesKeys.bySubstitution(
      schoolId ?? '',
      substitutionId ?? '',
    ),
    queryFn: async (): Promise<RankedCandidateDto[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/substitutions/${substitutionId}/candidates`,
      );
      if (!res.ok) throw new Error('Failed to load candidates');
      return res.json();
    },
    enabled: !!schoolId && !!substitutionId,
    staleTime: 10_000,
  });
}
