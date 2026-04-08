import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { toast } from 'sonner';
import type { CalendarTokenDto } from '@schoolflow/shared';

/**
 * Query key factory for calendar token cache.
 */
export const calendarTokenKeys = {
  all: (schoolId: string) => ['calendar-token', schoolId] as const,
};

/**
 * Fetch the current user's calendar token for a school.
 * Returns null if no token exists yet.
 */
export function useCalendarToken(schoolId: string) {
  return useQuery({
    queryKey: calendarTokenKeys.all(schoolId),
    queryFn: async (): Promise<CalendarTokenDto | null> => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/calendar/token`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('Failed to load calendar token');
      return res.json();
    },
    enabled: !!schoolId,
    staleTime: 60_000,
  });
}

/**
 * Generate a new calendar subscription token.
 * Invalidates the calendar-token cache on success.
 */
export function useGenerateCalendarToken(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<CalendarTokenDto> => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/calendar/token`,
        { method: 'POST' },
      );
      if (!res.ok) throw new Error('Failed to generate calendar token');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: calendarTokenKeys.all(schoolId),
      });
      toast.success('Kalender-URL erstellt');
    },
    onError: () => {
      toast.error('Kalender-URL konnte nicht erstellt werden.');
    },
  });
}

/**
 * Revoke and regenerate the calendar subscription token.
 * Invalidates the calendar-token cache on success.
 */
export function useRevokeCalendarToken(schoolId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/calendar/token`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new Error('Failed to revoke calendar token');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: calendarTokenKeys.all(schoolId),
      });
      toast.success(
        'Neues Token erstellt. Bitte aktualisieren Sie die URL in Ihren Kalender-Apps.',
      );
    },
    onError: () => {
      toast.error('Token konnte nicht erneuert werden.');
    },
  });
}
