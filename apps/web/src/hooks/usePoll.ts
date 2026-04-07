import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { PollOptionDto } from '@schoolflow/shared';

/**
 * TanStack Query hooks for poll interactions (COMM-06).
 * - usePollResults: GET poll results with optional voter names
 * - useCastVote: POST vote(s) on a poll
 * - useClosePoll: PATCH close a poll
 */

// --- Query key factory ---

export const pollKeys = {
  all: ['polls'] as const,
  results: (pollId: string) => ['polls', pollId, 'results'] as const,
};

// --- Response types ---

export interface PollResultsResponse {
  options: PollOptionDto[];
  totalVotes: number;
  isClosed: boolean;
}

// --- Hooks ---

/**
 * Fetches poll results for a specific poll.
 * Sender/admin get named voter lists; others get counts only.
 */
export function usePollResults(schoolId: string, pollId: string) {
  return useQuery({
    queryKey: pollKeys.results(pollId),
    queryFn: async (): Promise<PollResultsResponse> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/polls/${pollId}/results`,
      );
      if (!res.ok) throw new Error('Umfrageergebnisse konnten nicht geladen werden.');
      return res.json();
    },
    enabled: !!pollId,
    staleTime: 10_000,
  });
}

/**
 * Casts vote(s) on a poll. Single choice sends one optionId, multi-choice sends array.
 * Invalidates poll results and message list caches on success.
 */
export function useCastVote(schoolId: string, pollId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { optionIds: string[] }): Promise<void> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/polls/${pollId}/votes`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        },
      );
      if (!res.ok) throw new Error('Stimme konnte nicht abgegeben werden.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollKeys.results(pollId) });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}

/**
 * Closes a poll (sender/admin only). Disables further voting.
 * Invalidates poll results and message list caches on success.
 */
export function useClosePoll(schoolId: string, pollId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/polls/${pollId}/close`,
        { method: 'PATCH' },
      );
      if (!res.ok) throw new Error('Umfrage konnte nicht geschlossen werden.');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: pollKeys.results(pollId) });
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });
}
