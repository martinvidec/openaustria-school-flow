/* @vitest-environment jsdom */
// Plan 10.1-01 Task 2 — silent-4xx-toast regression guard for useSchoolYears hooks.
// Locks down the invariant: when mutationFn throws (backend 4xx, NOT a typed 409),
// toast.success must NEVER fire. Pairs with the Task 1 audit.
//
// Note: SchoolYearOrphanError (409 on delete) has its own typed UX in onError and
// is NOT tested here — we target useCreateSchoolYear with a plain non-typed 4xx.

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

import { useCreateSchoolYear } from '../useSchoolYears';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useCreateSchoolYear — silent-4xx-toast regression (Plan 10.1-01)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does NOT call toast.success when backend returns 400', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Bad input' }),
    });

    const { result } = renderHook(() => useCreateSchoolYear('school-1'), { wrapper });
    result.current.mutate({
      name: '2026/27',
      startDate: '2026-09-01',
      semesterBreak: '2027-02-01',
      endDate: '2027-07-04',
    } as any);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(toastSuccess).not.toHaveBeenCalled();
    expect(toastError).toHaveBeenCalledTimes(1);
    expect(toastError).toHaveBeenCalledWith('Schuljahr konnte nicht angelegt werden');
  });
});
