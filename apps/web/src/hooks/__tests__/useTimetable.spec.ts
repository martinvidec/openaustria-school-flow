/* @vitest-environment jsdom */
/**
 * Regression guards for the perspective-list hooks in useTimetable.ts
 * (useClasses + useTeachers).
 *
 * useClasses background: previously called `/api/v1/classes` with no query
 * string, which the API rejects with HTTP 404 (ClassService.findAll throws
 * NotFoundException when query.schoolId is undefined). The TanStack Query
 * error was swallowed visually because the consumer destructured
 * `{ data: classes = [] }`, and PerspectiveSelector silently omits the
 * Klassen SelectGroup when `classes.length === 0` — admins lost the entire
 * class perspective with no error toast. Fixed in d76b5a3.
 *
 * useTeachers background (debug session `useteachers-tenant-isolation-leak`,
 * 2026-04-26): the SAME structural bug existed in useTeachers, but
 * TeacherService.findAll did NOT validate schoolId — so instead of a loud 404,
 * Prisma silently dropped the `where: { schoolId: undefined }` filter and
 * returned teachers from EVERY school. A cross-tenant data leak hidden behind
 * a normal-looking populated UI. Backend now rejects (mirrors ClassService);
 * this hook now sends `?schoolId=...` (defense in depth).
 *
 * These specs lock down the request URLs: both hooks MUST send schoolId on
 * every fetch. Reverting either fix makes the corresponding spec fail loudly.
 *
 * useRooms is NOT covered — its endpoint uses `:schoolId` as a URL path
 * segment (`/api/v1/schools/:schoolId/rooms`), so the route itself enforces
 * the scope and the leak vector does not apply.
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

import { useClasses, useTeachers } from '../useTimetable';

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

describe('useTeachers — schoolId query param tenant-isolation guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends ?schoolId=<id> on the GET request (tenant-isolation guard)', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: { total: 0, page: 1, limit: 500, totalPages: 0 },
      }),
    });

    const { result } = renderHook(() => useTeachers('school-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = apiFetchMock.mock.calls[0][0] as string;
    // Critical: must contain `?schoolId=...`. Reverting to bare
    // `/api/v1/teachers` re-opens the cross-tenant leak.
    expect(calledUrl).toMatch(/^\/api\/v1\/teachers\?/);
    expect(calledUrl).toContain('schoolId=school-1');
  });

  it('maps the paginated { data, meta } envelope to EntityOption[] with "Lastname Firstname" naming', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          {
            id: 't1',
            person: { firstName: 'Maria', lastName: 'Huber' },
          },
          {
            id: 't2',
            person: { firstName: 'Hans', lastName: 'Mayr' },
          },
        ],
        meta: { total: 2, page: 1, limit: 500, totalPages: 1 },
      }),
    });

    const { result } = renderHook(() => useTeachers('school-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual([
      { id: 't1', name: 'Huber Maria' },
      { id: 't2', name: 'Mayr Hans' },
    ]);
  });

  it('does not fire the request when schoolId is undefined', async () => {
    const { result } = renderHook(() => useTeachers(undefined), { wrapper });

    // enabled=false → no fetch, no risk of accidentally hitting the bare
    // /api/v1/teachers endpoint with empty schoolId.
    expect(result.current.fetchStatus).toBe('idle');
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
