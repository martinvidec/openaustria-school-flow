/* @vitest-environment jsdom */
/**
 * Regression guards for the perspective-list hooks in useTimetable.ts
 * (useClasses + useTeachers + useRooms).
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
 * useRooms background (quick-task `260426-eyf`, 2026-04-26): useRooms is
 * tenant-safe by route shape — `/api/v1/schools/:schoolId/rooms` carries the
 * scope as a URL path segment (Category A SAFE per the audit taxonomy in
 * `.planning/debug/resolved/useteachers-tenant-isolation-leak.md`), so the
 * leak vector that hit useClasses/useTeachers does not apply. The guard here
 * is QUANTITATIVE, not tenant-isolating: the backend `PaginationQueryDto.limit`
 * defaults to 20, so without `?page=1&limit=500` schools with >20 rooms get
 * silently truncated and the Räume dropdown looks incomplete. This file's
 * useRooms block locks the pagination params (and explicitly asserts that
 * `schoolId=` is NOT in the query string, so a future drive-by "consistency"
 * PR cannot accidentally re-route schoolId out of the URL path).
 *
 * These specs lock down the request URLs: all three hooks MUST send the
 * required params on every fetch. Reverting any of the fixes makes the
 * corresponding spec fail loudly.
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

import { useClasses, useRooms, useTeachers } from '../useTimetable';

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

describe('useRooms — pagination params regression guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sends ?page=1&limit=500 on the GET request (and keeps schoolId in the URL path, NOT as a query param)', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        meta: { total: 0, page: 1, limit: 500, totalPages: 0 },
      }),
    });

    const { result } = renderHook(() => useRooms('school-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(apiFetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = apiFetchMock.mock.calls[0][0] as string;
    // Critical: pagination params present. Reverting to the bare
    // `/api/v1/schools/:schoolId/rooms` re-introduces the silent
    // truncation bug for schools with >20 rooms (PaginationQueryDto.limit
    // default = 20 in apps/api/src/common/dto/pagination.dto.ts).
    expect(calledUrl).toMatch(/^\/api\/v1\/schools\/school-1\/rooms\?/);
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).toContain('limit=500');
    // Category A taxonomy guard: schoolId belongs in the URL path for this
    // route. A future "consistency" PR that adds `schoolId=` as a query
    // param would weaken the route's tenant-scope contract — fail loudly
    // here so it's caught in code review, not in production.
    expect(calledUrl).not.toContain('schoolId=');
  });

  it('maps the paginated { data, meta } envelope to EntityOption[]', async () => {
    apiFetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [
          { id: 'r1', name: 'Raum 101' },
          { id: 'r2', name: 'Turnhalle' },
        ],
        meta: { total: 2, page: 1, limit: 500, totalPages: 1 },
      }),
    });

    const { result } = renderHook(() => useRooms('school-1'), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Locks the unwrap+map from commit 1fb7abf — a future revert to
    // `return res.json()` (the original 2026-04-02 bug shape) would fail
    // this expectation.
    expect(result.current.data).toEqual([
      { id: 'r1', name: 'Raum 101' },
      { id: 'r2', name: 'Turnhalle' },
    ]);
  });

  it('does not fire the request when schoolId is undefined', async () => {
    const { result } = renderHook(() => useRooms(undefined), { wrapper });

    // enabled=false → no fetch, no risk of building a URL like
    // `/api/v1/schools/undefined/rooms?page=1&limit=500`.
    expect(result.current.fetchStatus).toBe('idle');
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
