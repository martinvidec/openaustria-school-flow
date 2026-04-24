import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import {
  type EffectivePermissionRow,
  UserApiError,
  readProblemDetail,
} from '../types';

/**
 * Phase 13-02 USER-03 — flat effective-permissions list with source attribution.
 * Hits `GET /api/v1/admin/users/:userId/effective-permissions`.
 */
export function useEffectivePermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['effective-permissions', userId],
    queryFn: async (): Promise<EffectivePermissionRow[]> => {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/effective-permissions`);
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!userId,
    staleTime: 10_000,
  });
}
