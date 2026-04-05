import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ReactNode } from 'react';
import React from 'react';

// Mock the socket factory BEFORE importing the hook so vi.mock hoists correctly.
vi.mock('@/lib/socket', () => {
  const socketMock = {
    on: vi.fn(),
    off: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
    connected: false,
  };
  return {
    createNotificationSocket: vi.fn(() => socketMock),
    disconnectNotificationSocket: vi.fn(),
    __socketMock: socketMock,
  };
});

// Mock sonner to prevent toast side-effects in jsdom.
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

import { useNotificationSocket } from '../useNotificationSocket';
import * as socketModule from '@/lib/socket';

type SocketMockShape = {
  on: ReturnType<typeof vi.fn>;
  off: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  removeAllListeners: ReturnType<typeof vi.fn>;
  connected: boolean;
};

function getSocketMock(): SocketMockShape {
  // createNotificationSocket returns the mock — read it back from the last call
  const create = socketModule.createNotificationSocket as unknown as ReturnType<typeof vi.fn>;
  if (create.mock.results.length === 0) {
    // Return a default no-op shape so consumers that need handles before the hook runs don't crash
    return {
      on: vi.fn(),
      off: vi.fn(),
      disconnect: vi.fn(),
      removeAllListeners: vi.fn(),
      connected: false,
    };
  }
  return create.mock.results[create.mock.results.length - 1].value as SocketMockShape;
}

describe('useNotificationSocket (SUBST-03)', () => {
  let queryClient: QueryClient;
  let wrapper: ({ children }: { children: ReactNode }) => React.ReactElement;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    wrapper = ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children);
  });

  it('does not connect when jwt is null', () => {
    renderHook(() => useNotificationSocket(null), { wrapper });
    expect(socketModule.createNotificationSocket).not.toHaveBeenCalled();
  });

  it('connects to /notifications namespace with the provided jwt in handshake.auth.token', () => {
    renderHook(() => useNotificationSocket('fake.jwt.token'), { wrapper });
    expect(socketModule.createNotificationSocket).toHaveBeenCalledWith('fake.jwt.token');
  });

  it('listens for notification:new event and invalidates the notifications query cache', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useNotificationSocket('fake.jwt.token'), { wrapper });
    const socket = getSocketMock();
    await waitFor(() => {
      expect(socket.on).toHaveBeenCalledWith('notification:new', expect.any(Function));
    });
    const call = socket.on.mock.calls.find((c) => c[0] === 'notification:new');
    const handler = call?.[1] as ((payload: unknown) => void) | undefined;
    expect(handler).toBeTypeOf('function');
    handler?.({
      notification: {
        id: 'n1',
        title: 'Neue Vertretungsanfrage',
        body: 'Mathematik / 1A am 05.04.',
        type: 'SUBSTITUTION_OFFER',
        readAt: null,
        createdAt: new Date().toISOString(),
        userId: 'u1',
        payload: null,
      },
      unreadCount: 1,
    });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('listens for notification:badge event and invalidates the cache', async () => {
    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');
    renderHook(() => useNotificationSocket('fake.jwt.token'), { wrapper });
    const socket = getSocketMock();
    await waitFor(() => {
      expect(socket.on).toHaveBeenCalledWith('notification:badge', expect.any(Function));
    });
    const call = socket.on.mock.calls.find((c) => c[0] === 'notification:badge');
    const handler = call?.[1] as ((payload: unknown) => void) | undefined;
    handler?.({ unreadCount: 7 });
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] });
  });

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() => useNotificationSocket('fake.jwt.token'), {
      wrapper,
    });
    unmount();
    expect(socketModule.disconnectNotificationSocket).toHaveBeenCalled();
  });
});
