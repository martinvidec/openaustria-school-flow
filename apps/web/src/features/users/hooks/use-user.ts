import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import {
  type UserDirectoryDetail,
  UserApiError,
  readProblemDetail,
} from '../types';
import { usersKeys } from './use-users';

/**
 * Phase 13-02 USER-01 — single-user detail.
 * Hits `GET /api/v1/admin/users/:userId`.
 */
export function useUser(userId: string | undefined) {
  return useQuery({
    queryKey: usersKeys.detail(userId ?? ''),
    queryFn: async (): Promise<UserDirectoryDetail> => {
      const res = await apiFetch(`/api/v1/admin/users/${userId}`);
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!userId,
  });
}
