import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import {
  type PaginatedResponse,
  type UserDirectoryQuery,
  type UserDirectorySummary,
  UserApiError,
  readProblemDetail,
} from '../types';

/**
 * Phase 13-02 USER-01 — paginated, filtered user directory list.
 *
 * Hits `GET /api/v1/admin/users?page=&limit=&search=&role=&linked=&enabled=`.
 * Multi-value `role` is sent as a comma-separated string per the
 * backend DTO (UserDirectoryQueryDto.role is parsed via Transform).
 */

function buildSearchParams(query: UserDirectoryQuery): string {
  const params = new URLSearchParams();
  params.set('page', String(query.page ?? 1));
  params.set('limit', String(query.limit ?? 25));
  if (query.search) params.set('search', query.search);
  if (query.role && query.role.length > 0) params.set('role', query.role.join(','));
  if (query.linked && query.linked !== 'all') params.set('linked', query.linked);
  if (query.enabled && query.enabled !== 'all') params.set('enabled', query.enabled);
  return params.toString();
}

export const usersKeys = {
  list: (query: UserDirectoryQuery) => ['users', query] as const,
  detail: (userId: string) => ['user', userId] as const,
};

export function useUsers(query: UserDirectoryQuery) {
  return useQuery({
    queryKey: usersKeys.list(query),
    queryFn: async (): Promise<PaginatedResponse<UserDirectorySummary>> => {
      const res = await apiFetch(`/api/v1/admin/users?${buildSearchParams(query)}`);
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    staleTime: 10_000,
  });
}
