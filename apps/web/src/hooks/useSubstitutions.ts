import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { SubstitutionDto } from '@schoolflow/shared';

/**
 * Query key factory for substitution cache invalidation
 * (SUBST-02, SUBST-03, SUBST-05).
 *
 * Note: endpoint is school-scoped so keys carry schoolId. Lifecycle
 * mutations (assign/entfall/stillarbeit) invalidate the pending list
 * plus the individual detail and ranked-candidates cache entries.
 */
export const substitutionKeys = {
  all: (schoolId: string) => ['substitutions', schoolId] as const,
  pending: (schoolId: string) => ['substitutions', schoolId, 'pending'] as const,
  detail: (schoolId: string, id: string) =>
    ['substitutions', schoolId, 'detail', id] as const,
};

/**
 * Structured error thrown on 409 Conflict so callers can detect the
 * stale-candidate race condition (Pitfall 2) and surface the exact
 * German toast specified in 06-UI-SPEC.md.
 */
export class SubstitutionConflictError extends Error {
  status = 409;
  constructor(message = 'Substitution conflict') {
    super(message);
    this.name = 'SubstitutionConflictError';
  }
}

export function usePendingSubstitutions(schoolId: string | undefined) {
  return useQuery({
    queryKey: substitutionKeys.pending(schoolId ?? ''),
    queryFn: async (): Promise<SubstitutionDto[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/substitutions`,
      );
      if (!res.ok) throw new Error('Failed to load substitutions');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 15_000,
  });
}

export interface AssignSubstituteVariables {
  substitutionId: string;
  candidateTeacherId: string;
}

/**
 * Assigns a candidate as substitute, moving the row PENDING → OFFERED.
 * On 409 Conflict (candidate no longer available, Pitfall 2) throws
 * a SubstitutionConflictError so the UI can trigger a candidate refetch.
 */
export function useAssignSubstitute(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      substitutionId,
      candidateTeacherId,
    }: AssignSubstituteVariables): Promise<SubstitutionDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/substitutions/${substitutionId}/assign`,
        {
          method: 'POST',
          body: JSON.stringify({ candidateTeacherId }),
        },
      );
      if (res.status === 409) {
        throw new SubstitutionConflictError(
          'Candidate no longer available',
        );
      }
      if (!res.ok) throw new Error('Failed to assign substitute');
      return res.json();
    },
    onSuccess: (_data, variables) => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: substitutionKeys.all(schoolId),
        });
        queryClient.invalidateQueries({
          queryKey: ['ranked-candidates', variables.substitutionId],
        });
      }
    },
  });
}

export function useSetEntfall(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (substitutionId: string): Promise<SubstitutionDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/substitutions/${substitutionId}/entfall`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error('Failed to set entfall');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: substitutionKeys.all(schoolId),
        });
      }
    },
  });
}

export interface SetStillarbeitVariables {
  substitutionId: string;
  supervisorTeacherId?: string;
}

export function useSetStillarbeit(schoolId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      substitutionId,
      supervisorTeacherId,
    }: SetStillarbeitVariables): Promise<SubstitutionDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/substitutions/${substitutionId}/stillarbeit`,
        {
          method: 'POST',
          body: JSON.stringify({ supervisorTeacherId }),
        },
      );
      if (!res.ok) throw new Error('Failed to set stillarbeit');
      return res.json();
    },
    onSuccess: () => {
      if (schoolId) {
        queryClient.invalidateQueries({
          queryKey: substitutionKeys.all(schoolId),
        });
      }
    },
  });
}
