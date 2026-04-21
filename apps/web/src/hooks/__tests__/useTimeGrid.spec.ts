/* @vitest-environment jsdom */
// Plan 10.1-01 Task 2 — silent-4xx-toast regression guard for useUpdateTimeGrid.
// 409 path is tested separately — here we verify non-typed errors also toast error
// (not a silent green success) and NEVER fire toast.success on a rejection.

import React, { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, toastSuccess, toastError } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { success: toastSuccess, error: toastError },
}));

vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { useUpdateTimeGrid } from '../useTimeGrid';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useUpdateTimeGrid — silent-4xx-toast regression (Plan 10.1-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 409 path is tested separately — here we verify non-typed errors also toast
  it('does NOT call toast.success when backend returns 500 (non-409 path)', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'Internal error' }),
    });

    const { result } = renderHook(() => useUpdateTimeGrid('school-1'), { wrapper });
    result.current.mutate({ dto: { periods: [] } as any });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('Zeitraster konnte nicht gespeichert werden');
  });
});
