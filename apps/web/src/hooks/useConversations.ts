import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { ConversationDto, ConversationScope, MessageDto } from '@schoolflow/shared';

/**
 * Backend POST /conversations returns the conversation with the firstMessage embedded.
 * This extended type reflects that response shape for attachment upload after creation.
 */
export type CreateConversationResponse = ConversationDto & {
  firstMessage?: MessageDto;
};

// --- Query key factory ---

export const conversationKeys = {
  all: ['conversations'] as const,
  list: (schoolId: string, search?: string) =>
    ['conversations', schoolId, search ?? ''] as const,
};

// --- Input types ---

export interface CreateConversationInput {
  scope: ConversationScope;
  scopeId?: string | null;
  subject: string;
  body: string;
  recipientUserIds?: string[];
  poll?: {
    question: string;
    type: 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
    options: string[];
    deadline?: string;
  };
}

// --- Hooks ---

/**
 * Fetches conversations for the current school.
 * Socket.IO drives updates via cache invalidation (staleTime 30s per Pitfall 4).
 */
export function useConversations(schoolId: string, search?: string) {
  return useQuery({
    queryKey: conversationKeys.list(schoolId, search),
    queryFn: async (): Promise<ConversationDto[]> => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const qs = params.toString();
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/conversations${qs ? `?${qs}` : ''}`,
      );
      if (!res.ok) throw new Error('Unterhaltungen konnten nicht geladen werden.');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });
}

/**
 * Creates a new conversation (broadcast or direct).
 * Invalidates the conversations list on success.
 */
export function useCreateConversation(schoolId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateConversationInput): Promise<CreateConversationResponse> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/conversations`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(dto),
        },
      );
      if (!res.ok) throw new Error('Unterhaltung konnte nicht erstellt werden.');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.all });
    },
  });
}

/**
 * Returns the total unread count across all conversations for sidebar badge.
 * Derives from the conversations list query to avoid an extra API call.
 */
export function useUnreadCount(schoolId: string): number {
  const { data } = useConversations(schoolId);
  return data?.reduce((sum, c) => sum + c.unreadCount, 0) ?? 0;
}
