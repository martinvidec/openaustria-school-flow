/* @vitest-environment jsdom */
// Phase 16 Plan 06 Task 2 — useDsfa regression tests for cross-mutation
// dashboard invalidation (D-07 hybrid live-update fan-out).
//
// Representative coverage for Task 1b (Phase 14–15 DSGVO hooks): tests
// useCreateDsfa / useUpdateDsfa / useDeleteDsfa each invalidate the
// shared `dashboardKeys.status` query alongside dsfaKeys.all.

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

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { dashboardKeys } from './useDashboardStatus';
import {
  dsfaKeys,
  useCreateDsfa,
  useDeleteDsfa,
  useUpdateDsfa,
} from './useDsfa';

const SCHOOL_ID = 'school-1';
const DSFA_ID = 'dsfa-1';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(qc, 'invalidateQueries');
  return {
    qc,
    invalidateSpy,
    wrapper: ({ children }: { children: ReactNode }) =>
      React.createElement(QueryClientProvider, { client: qc }, children),
  };
}

describe('useDsfa — Phase 16 Plan 06 Task 2 dashboard fan-out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useCreateDsfa onSuccess invalidates dsfaKeys.all AND dashboardKeys.status', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: DSFA_ID,
        schoolId: SCHOOL_ID,
        title: 'DSFA-Eintrag',
        description: 'Beschreibung',
        dataCategories: ['stammdaten'],
      }),
    });
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useCreateDsfa(), { wrapper });

    await result.current.mutateAsync({
      schoolId: SCHOOL_ID,
      title: 'DSFA-Eintrag',
      description: 'Beschreibung',
      dataCategories: ['stammdaten'],
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: dashboardKeys.status,
      }),
    );
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: dsfaKeys.all });
  });

  it('useUpdateDsfa onSuccess invalidates dashboardKeys.status', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: DSFA_ID,
        schoolId: SCHOOL_ID,
        title: 'DSFA-Eintrag (geändert)',
        description: 'Beschreibung',
        dataCategories: ['stammdaten'],
      }),
    });
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useUpdateDsfa(), { wrapper });

    await result.current.mutateAsync({
      id: DSFA_ID,
      title: 'DSFA-Eintrag (geändert)',
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: dashboardKeys.status,
      }),
    );
  });

  it('useDeleteDsfa onSuccess invalidates dashboardKeys.status', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    });
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useDeleteDsfa(), { wrapper });

    await result.current.mutateAsync(DSFA_ID);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: dashboardKeys.status,
      }),
    );
  });
});
