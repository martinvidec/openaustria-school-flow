import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { SubstitutionDto } from '@schoolflow/shared';

/**
 * SUBST-03 — Lehrer "Meine Vertretungen" view bindings.
 *
 * The backend endpoint `GET /api/v1/schools/:schoolId/substitutions` returns
 * ALL pending/offered/declined rows for the school (admin view). For the
 * Lehrer view we filter client-side to the subset where
 * `substituteTeacherId === current user's teacherId` AND `status === 'OFFERED'`.
 *
 * This avoids a backend change: the existing school-scoped endpoint + CASL
 * read:substitution permission is already wired, and the per-teacher filter
 * is a cheap O(n) operation on a list that is bounded by the number of open
 * substitutions for the whole school (typically <50).
 *
 * If the result set grows, a dedicated `?mine=true` query param can be added
 * to the backend without changing the frontend hook signature.
 */
export const offeredSubstitutionKeys = {
  all: (schoolId: string, teacherId: string) =>
    ['substitutions', schoolId, 'offered', teacherId] as const,
};

export function useOfferedSubstitutions(
  schoolId: string | null,
  teacherId: string | null,
) {
  return useQuery({
    queryKey: offeredSubstitutionKeys.all(schoolId ?? '', teacherId ?? ''),
    queryFn: async (): Promise<SubstitutionDto[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/substitutions`,
      );
      if (!res.ok) {
        throw new Error('Vertretungen konnten nicht geladen werden.');
      }
      const all = (await res.json()) as SubstitutionDto[];
      return all.filter(
        (s) => s.status === 'OFFERED' && s.substituteTeacherId === teacherId,
      );
    },
    enabled: !!schoolId && !!teacherId,
    staleTime: 15_000,
  });
}

export interface RespondToOfferVariables {
  schoolId: string;
  substitutionId: string;
  accept: boolean;
  declineReason?: string;
}

/**
 * Substitute responds to an offer — PATCH /substitutions/:id/respond.
 * On success, invalidates both the offered-list query and the
 * admin-facing pending list so both tabs stay consistent.
 */
export function useRespondToOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      schoolId,
      substitutionId,
      accept,
      declineReason,
    }: RespondToOfferVariables): Promise<SubstitutionDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/substitutions/${substitutionId}/respond`,
        {
          method: 'PATCH',
          body: JSON.stringify({ accept, declineReason }),
        },
      );
      if (!res.ok) {
        throw new Error('Antwort konnte nicht gesendet werden.');
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({
        queryKey: ['substitutions', vars.schoolId],
      });
    },
  });
}
