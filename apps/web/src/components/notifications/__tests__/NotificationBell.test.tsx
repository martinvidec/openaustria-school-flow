import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import React from 'react';

// Hoist mocks — Vitest hoists vi.mock automatically.
vi.mock('@/hooks/useNotifications', () => ({
  useNotifications: vi.fn(),
  useMarkNotificationRead: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useMarkAllNotificationsRead: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  notificationKeys: {
    all: ['notifications'],
    list: () => ['notifications', 'list'],
  },
}));

// Avoid TanStack Router context errors when NotificationList uses useNavigate.
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
}));

import { NotificationBell } from '../NotificationBell';
import { useNotifications } from '@/hooks/useNotifications';

function wrap(children: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('NotificationBell (SUBST-03)', () => {
  const useNotificationsMock = useNotifications as unknown as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a trigger with aria-label="Benachrichtigungen" and Bell icon when unreadCount=0', () => {
    useNotificationsMock.mockReturnValue({
      data: { notifications: [], unreadCount: 0 },
      isLoading: false,
    });
    render(wrap(React.createElement(NotificationBell)));
    const button = screen.getByLabelText('Benachrichtigungen');
    expect(button).toBeInTheDocument();
    // Badge must not render when unreadCount === 0
    expect(screen.queryByTestId('notification-unread-badge')).toBeNull();
  });

  it('renders BellRing + unread count Badge when unreadCount > 0', () => {
    useNotificationsMock.mockReturnValue({
      data: { notifications: [], unreadCount: 5 },
      isLoading: false,
    });
    render(wrap(React.createElement(NotificationBell)));
    expect(screen.getByLabelText('Benachrichtigungen')).toBeInTheDocument();
    expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('5');
  });

  it('renders "99+" when unreadCount exceeds 99', () => {
    useNotificationsMock.mockReturnValue({
      data: { notifications: [], unreadCount: 123 },
      isLoading: false,
    });
    render(wrap(React.createElement(NotificationBell)));
    expect(screen.getByTestId('notification-unread-badge')).toHaveTextContent('99+');
  });

  it('calls useNotifications with { limit: 20 }', () => {
    useNotificationsMock.mockReturnValue({
      data: { notifications: [], unreadCount: 0 },
      isLoading: false,
    });
    render(wrap(React.createElement(NotificationBell)));
    expect(useNotificationsMock).toHaveBeenCalled();
    const firstCall = useNotificationsMock.mock.calls[0]?.[0];
    expect(firstCall).toMatchObject({ limit: 20 });
  });
});
