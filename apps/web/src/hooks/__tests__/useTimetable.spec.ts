/* @vitest-environment jsdom */
/**
 * Regression guard for the useClasses() hook in useTimetable.ts.
 *
 * Background: useClasses previously called `/api/v1/classes` with no query
 * string, which the API rejects with HTTP 404 (ClassService.findAll throws
 * NotFoundException when query.schoolId is undefined). The TanStack Query
 * error was swallowed visually because the consumer destructured
 * `{ data: classes = [] }`, and PerspectiveSelector silently omits the
 * Klassen SelectGroup when `classes.length === 0` — admins lost the entire
 * class perspective with no error toast.
 *
 * This spec locks down the request URL: useClasses MUST send `?schoolId=...`
 * on every fetch. Reverting the fix (dropping the query param) makes this
 * spec fail loudly.
 *
 * Sister hooks useTeachers/useRooms in the same file are NOT covered here —
 * the strict-scope directive limited this debug session to the one symptom.
 * useTeachers shares the same structural bug (no schoolId on the request)
 * but the API silently returns cross-tenant data instead of 404; that is a
 * separate tenant-isolation bug logged as a follow-up.
 */
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

import { useClasses } from '../useTimetable';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return React.createElement(QueryClientProvider, { client: qc }, children);
}

describe('useClasses — schoolId query param regression guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends ?schoolId=<id> on the GET request', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [], meta: { total: 0, page: 1, limit: 500, totalPages: 0 } }),
    });

    const { result } = renderHook(() => useClasses('school-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = apiFetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toMatch(/^\/api\/v1\/classes\?/);
    expect(calledUrl).toContain('schoolId=school-1');
  });

  it('maps the paginated { data, meta } envelope to EntityOption[]', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'c1', name: '1A', schoolId: 'school-1', yearLevel: 1 },
          { id: 'c2', name: '2B', schoolId: 'school-1', yearLevel: 2 },
        ],
        meta: { total: 2, page: 1, limit: 500, totalPages: 1 },
      }),
    });

    const { result } = renderHook(() => useClasses('school-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: 'c1', name: '1A' },
      { id: 'c2', name: '2B' },
    ]);
  });

  it('does not fire the request when schoolId is undefined', async () => {
    const { result } = renderHook(() => useClasses(undefined), { wrapper });

    // enabled=false → query stays in `pending`/`idle`-ish state, no fetch
    expect(result.current.fetchStatus).toBe('idle');
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
