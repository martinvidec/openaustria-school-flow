/* @vitest-environment jsdom */
// Phase 16 Plan 06 Task 2 — useTeachers regression tests for cross-mutation
// dashboard invalidation (D-07 hybrid live-update fan-out).
//
// Locks the contract that EVERY admin teacher mutation invalidates the
// shared `dashboardKeys.status` (`['dashboard-status']`) query alongside
// its own keys, so the admin dashboard refetches without waiting for the
// 30s polling fallback.
//
// Representative coverage for Task 1a (Phase 10–13 hooks): tests
// useCreateTeacher / useUpdateTeacher / useDeleteTeacher.

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

// Silence the sonner toast during tests — we don't assert on it here, but
// importing the real module would attach a DOM listener.
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { dashboardKeys } from './useDashboardStatus';
import {
  useCreateTeacher,
  useDeleteTeacher,
  useUpdateTeacher,
} from './useTeachers';

const SCHOOL_ID = 'school-1';
const TEACHER_ID = 'teacher-42';

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

describe('useTeachers — Phase 16 Plan 06 Task 2 dashboard fan-out', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('useCreateTeacher onSuccess invalidates teacherKeys.all AND dashboardKeys.status', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        teacher: {
          id: TEACHER_ID,
          schoolId: SCHOOL_ID,
          personId: 'p1',
          employmentPercentage: 100,
          werteinheitenTarget: 0,
          person: { id: 'p1', firstName: 'Anna', lastName: 'Berger' },
        },
      }),
    });
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useCreateTeacher(SCHOOL_ID), { wrapper });

    await result.current.mutateAsync({
      schoolId: SCHOOL_ID,
      firstName: 'Anna',
      lastName: 'Berger',
    });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: dashboardKeys.status,
      }),
    );
    // Existing invariant: own-key invalidation must still fire.
    expect(invalidateSpy).toHaveBeenCalledWith({
      queryKey: ['teachers', SCHOOL_ID],
    });
  });

  it('useUpdateTeacher onSuccess invalidates dashboardKeys.status', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        id: TEACHER_ID,
        schoolId: SCHOOL_ID,
        personId: 'p1',
        employmentPercentage: 80,
        werteinheitenTarget: 0,
        person: { id: 'p1', firstName: 'Anna', lastName: 'Berger' },
      }),
    });
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(
      () => useUpdateTeacher(SCHOOL_ID, TEACHER_ID),
      { wrapper },
    );

    await result.current.mutateAsync({ employmentPercentage: 80 });

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: dashboardKeys.status,
      }),
    );
  });

  it('useDeleteTeacher onSuccess invalidates dashboardKeys.status', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });
    const { wrapper, invalidateSpy } = makeWrapper();
    const { result } = renderHook(() => useDeleteTeacher(SCHOOL_ID), { wrapper });

    await result.current.mutateAsync(TEACHER_ID);

    await waitFor(() =>
      expect(invalidateSpy).toHaveBeenCalledWith({
        queryKey: dashboardKeys.status,
      }),
    );
  });
});
