import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { MessageDto } from '@schoolflow/shared';

// --- Query key factory ---

export const messageKeys = {
  all: ['messages'] as const,
  list: (conversationId: string) => ['messages', conversationId] as const,
};

// --- Response types ---

export interface MessageListResponse {
  messages: MessageDto[];
  nextCursor: string | null;
}

// --- Hooks ---

/**
 * Fetches messages for a conversation with cursor-based pagination.
 * Socket.IO drives real-time updates via cache invalidation (staleTime 30s).
 */
export function useMessages(schoolId: string, conversationId: string | null) {
  return useInfiniteQuery({
    queryKey: messageKeys.list(conversationId ?? ''),
    queryFn: async ({
      pageParam,
    }: {
      pageParam?: string;
    }): Promise<MessageListResponse> => {
      const params = new URLSearchParams();
      if (pageParam) params.set('cursor', pageParam);
      params.set('limit', '20');
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/conversations/${conversationId}/messages?${params}`,
      );
      if (!res.ok)
        throw new Error('Nachrichten konnten nicht geladen werden.');
      return res.json();
    },
    getNextPageParam: (lastPage: MessageListResponse) =>
      lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!conversationId,
    staleTime: 30_000,
  });
}

/**
 * Sends a message to a conversation.
 * Invalidates messages + conversations on success (updates last message preview).
 */
export function useSendMessage(schoolId: string, conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: string): Promise<MessageDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/conversations/${conversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body }),
        },
      );
      if (!res.ok) throw new Error('Nachricht konnte nicht gesendet werden.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: messageKeys.list(conversationId),
      });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/**
 * Marks a conversation as read for the current user.
 * Invalidates conversations to update unread count badges.
 */
export function useMarkRead(schoolId: string, conversationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/conversations/${conversationId}/read`,
        { method: 'PATCH' },
      );
      if (!res.ok)
        throw new Error('Konnte nicht als gelesen markiert werden.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}
