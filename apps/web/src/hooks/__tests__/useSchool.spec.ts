/* @vitest-environment jsdom */
// Plan 10.1-01 Task 2 — silent-4xx-toast regression guard for useSchool hooks.
// Locks down the invariant: when mutationFn throws (backend 4xx), toast.success
// must NEVER fire. Pairs with the Task 1 audit.

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

import { useUpdateSchool } from '../useSchool';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useUpdateSchool — silent-4xx-toast regression (Plan 10.1-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT call toast.success when backend returns 422', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 422,
      json: async () => ({ message: 'Validation failed' }),
    });

    const { result } = renderHook(() => useUpdateSchool('school-1'), { wrapper });
    result.current.mutate({ schoolType: 'AHS' } as any);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('Aenderungen konnten nicht gespeichert werden');
  });
});
