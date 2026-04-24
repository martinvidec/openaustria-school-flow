import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { type Role, UserApiError, readProblemDetail } from '../types';

/**
 * Phase 13-02 USER-02 — list of all seeded roles.
 * Hits `GET /api/v1/admin/roles`.
 */
export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: async (): Promise<Role[]> => {
      const res = await apiFetch('/api/v1/admin/roles');
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    staleTime: 5 * 60_000,
  });
}
