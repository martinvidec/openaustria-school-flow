import { useUser } from './use-user';
import type { UserDirectoryDetail } from '../types';

/**
 * Phase 13-02 USER-05 — derived hook returning the current Person link
 * for a user. There is NO separate backend endpoint — the link travels
 * inline on `GET /admin/users/:userId` (see UserDirectoryService.findOne).
 *
 * Kept as a separate hook so `<PersonLinkSection>` can subscribe without
 * depending on the full user payload — the React Query cache shares the
 * underlying query, so this is free.
 */
export function useUserPersonLink(userId: string | undefined): {
  data: UserDirectoryDetail['personLink'] | undefined;
  isLoading: boolean;
} {
  const userQuery = useUser(userId);
  return {
    data: userQuery.data?.personLink,
    isLoading: userQuery.isLoading,
  };
}
