import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Per-user read status returned by GET /:messageId/recipients endpoint (Plan 02).
 */
export interface RecipientReadStatus {
  userId: string;
  firstName: string;
  lastName: string;
  readAt: string | null;
}

/**
 * TanStack Query hook fetching per-recipient read status from the backend.
 *
 * API: GET /api/v1/schools/:schoolId/conversations/:conversationId/messages/:messageId/recipients
 * Response: RecipientReadStatus[]
 *
 * Only fetches when `enabled` is true (Popover is open) to avoid unnecessary requests.
 * staleTime of 10s allows socket-driven invalidation to refresh data.
 */
export function useReadReceipts(
  schoolId: string,
  conversationId: string,
  messageId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['readReceipts', messageId],
    queryFn: async (): Promise<RecipientReadStatus[]> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/conversations/${conversationId}/messages/${messageId}/recipients`,
      );
      if (!res.ok) throw new Error('Lesebestaetigungen konnten nicht geladen werden.');
      return res.json();
    },
    enabled,
    staleTime: 10_000,
  });
}
