import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import {
  type PermissionOverride,
  UserApiError,
  readProblemDetail,
} from '../types';

/**
 * Phase 13-02 USER-03 — list per-user permission overrides.
 * Hits `GET /api/v1/admin/permission-overrides?userId=`.
 */
export function usePermissionOverrides(userId: string | undefined) {
  return useQuery({
    queryKey: ['permission-overrides', userId],
    queryFn: async (): Promise<PermissionOverride[]> => {
      const res = await apiFetch(
        `/api/v1/admin/permission-overrides?userId=${encodeURIComponent(userId ?? '')}`,
      );
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!userId,
  });
}
