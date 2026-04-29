/* @vitest-environment jsdom */
// Phase 16 Plan 02 Task 1 — useDashboardStatus contract test (TDD RED).
// Locks the queryKey, staleTime, refetchInterval, enabled-gating, and
// queryFn behavior. Test 2b is the WARNING W3 fix: the hook must accept
// `null` (the school-context-store initial state) without coercion at
// the call-site and must keep the query disabled.

import React, { type ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
}));

vi.mock('@/lib/api', () => ({
  apiFetch: (...args: unknown[]) => apiFetchMock(...args),
}));

import { dashboardKeys, useDashboardStatus } from './useDashboardStatus';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return {
    qc,
    wrapper: ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children),
  };
}

describe('useDashboardStatus (Phase 16 Plan 02 Task 1)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: dashboardKeys.status equals ["dashboard-status"]', () => {
    expect(dashboardKeys.status).toEqual(['dashboard-status']);
  });

  it('Test 2a: query is disabled when schoolId is undefined', () => {
    const { wrapper, qc } = makeWrapper();
    renderHook(() => useDashboardStatus(undefined), { wrapper });

    const observers = qc.getQueryCache().getAll();
    const status = observers.find((o) =>
      JSON.stringify(o.queryKey) === JSON.stringify(dashboardKeys.status),
    );
    // When enabled is false the query never fetches.
    expect(apiFetchMock).not.toHaveBeenCalled();
    // The observer may not even register when disabled — both states are
    // acceptable; what matters is no fetch occurred.
    expect(status?.state.fetchStatus ?? 'idle').toBe('idle');
  });

  it('Test 2b: query is disabled when schoolId is null (school-context initial state)', () => {
    const { wrapper } = makeWrapper();
    renderHook(() => useDashboardStatus(null), { wrapper });
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it('Test 2c: query fetches when schoolId is a non-empty string', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        schoolId: 'school-1',
        generatedAt: '2026-04-29T10:00:00Z',
        categories: [],
      }),
    });
    const { wrapper } = makeWrapper();
    renderHook(() => useDashboardStatus('school-1'), { wrapper });

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledTimes(1));
  });

  it('Test 3: queryFn calls /api/v1/admin/dashboard/status?schoolId={id}', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        schoolId: 'school-1',
        generatedAt: '2026-04-29T10:00:00Z',
        categories: [],
      }),
    });
    const { wrapper, qc } = makeWrapper();
    const { result } = renderHook(() => useDashboardStatus('school-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchMock).toHaveBeenCalledWith(
      '/api/v1/admin/dashboard/status?schoolId=school-1',
    );
    expect(result.current.data?.schoolId).toBe('school-1');

    // Verify staleTime + refetchInterval are configured per D-08/D-09.
    const observers = qc.getQueryCache().getAll();
    const observer = observers.find(
      (o) => JSON.stringify(o.queryKey) === JSON.stringify(dashboardKeys.status),
    );
    expect(observer).toBeDefined();
    const opts = observer!.observers[0]?.options;
    expect(opts?.staleTime).toBe(10_000);
    expect(opts?.refetchInterval).toBe(30_000);
  });

  it('Test 4: queryFn throws on non-OK response', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ message: 'boom' }),
    });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useDashboardStatus('school-1'), {
      wrapper,
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});
