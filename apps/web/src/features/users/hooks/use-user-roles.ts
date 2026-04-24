import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { UserApiError, readProblemDetail } from '../types';

/**
 * Phase 13-02 USER-02 — list of role names the user currently has.
 * Hits `GET /api/v1/admin/users/:userId/roles`.
 */
export function useUserRoles(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-roles', userId],
    queryFn: async (): Promise<{ roles: string[] }> => {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/roles`);
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!userId,
  });
}
