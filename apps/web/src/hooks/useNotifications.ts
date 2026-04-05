import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { NotificationDto } from '@schoolflow/shared';

/**
 * SUBST-03 — Notification center TanStack Query bindings.
 *
 * Backed by the backend NotificationController at GET /api/v1/me/notifications
 * (scoped to the authenticated user via JWT; no :userId param in the URL).
 */
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (opts?: { unreadOnly?: boolean }) =>
    ['notifications', 'list', opts?.unreadOnly ?? false] as const,
};

export interface NotificationListResponse {
  notifications: NotificationDto[];
  unreadCount: number;
}

export interface UseNotificationsOptions {
  unreadOnly?: boolean;
  limit?: number;
}

/**
 * Fetches the current user's notifications (last N with optional unreadOnly
 * filter). The server returns `{ notifications, unreadCount }` so the bell
 * badge can render off a single query result.
 */
export function useNotifications(opts: UseNotificationsOptions = {}) {
  return useQuery({
    queryKey: notificationKeys.list({ unreadOnly: opts.unreadOnly }),
    queryFn: async (): Promise<NotificationListResponse> => {
      const params = new URLSearchParams();
      if (opts.unreadOnly) params.set('unreadOnly', 'true');
      if (opts.limit !== undefined) params.set('limit', String(opts.limit));
      const qs = params.toString();
      const res = await apiFetch(
        `/api/v1/me/notifications${qs ? `?${qs}` : ''}`,
      );
      if (!res.ok) throw new Error('Benachrichtigungen konnten nicht geladen werden.');
      return res.json();
    },
    staleTime: 30_000,
  });
}

/**
 * Marks a single notification as read (PATCH /me/notifications/:id/read).
 * Invalidates the notifications list query so the badge updates immediately.
 */
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/v1/me/notifications/${id}/read`, {
        method: 'PATCH',
      });
      if (!res.ok) {
        throw new Error('Benachrichtigung konnte nicht als gelesen markiert werden.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Marks all notifications as read (POST /me/notifications/mark-all-read).
 */
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await apiFetch(`/api/v1/me/notifications/mark-all-read`, {
        method: 'POST',
      });
      if (!res.ok) {
        throw new Error('Benachrichtigungen konnten nicht als gelesen markiert werden.');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
