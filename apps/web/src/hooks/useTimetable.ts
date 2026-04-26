import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import type { TimetableViewResponse } from '@schoolflow/shared';

/**
 * Query key factory for hierarchical timetable cache invalidation.
 * Structure enables granular or broad invalidation:
 * - timetableKeys.all(schoolId) invalidates everything for a school
 * - timetableKeys.view(...) invalidates a specific perspective/week combo
 */
export const timetableKeys = {
  all: (schoolId: string) => ['timetable', schoolId] as const,
  view: (
    schoolId: string,
    perspective: string,
    perspectiveId: string,
    weekType: string,
  ) =>
    ['timetable', schoolId, 'view', perspective, perspectiveId, weekType] as const,
  editHistory: (schoolId: string, runId: string) =>
    ['timetable', schoolId, 'edit-history', runId] as const,
};

/**
 * Fetches the timetable view for a specific perspective (teacher, class, or room).
 * Disabled when schoolId or perspectiveId is missing.
 */
export function useTimetableView(
  schoolId: string | undefined,
  perspective: string,
  perspectiveId: string | null,
  weekType: string,
) {
  return useQuery({
    queryKey: timetableKeys.view(
      schoolId ?? '',
      perspective,
      perspectiveId ?? '',
      weekType,
    ),
    queryFn: async (): Promise<TimetableViewResponse> => {
      const params = new URLSearchParams({
        perspective,
        perspectiveId: perspectiveId ?? '',
        weekType,
        date: new Date().toISOString().slice(0, 10),
      });
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/timetable/view?${params}`,
      );
      if (!res.ok) throw new Error('Failed to load timetable');
      return res.json();
    },
    enabled: !!schoolId && !!perspectiveId,
    staleTime: 30_000,
  });
}

/** Minimal entity reference for perspective selector lists */
interface EntityOption {
  id: string;
  name: string;
}

/**
 * Fetches the list of teachers for a school (for PerspectiveSelector).
 *
 * The /api/v1/teachers endpoint silently leaked teachers across ALL tenants
 * when called without `?schoolId=` (TeacherService.findAll built
 * `where: { schoolId: undefined }` which Prisma treats as "no filter"). Until
 * 2026-04-26 this hook fetched `/api/v1/teachers` with no query string,
 * exposing every school's teachers to anyone with `subject: teacher / read`.
 *
 * Backend now rejects schoolId-less requests with 404 (mirrors ClassService),
 * AND this hook now sends `schoolId + page=1 + limit=500` — defense in depth.
 * Mirrors the useClasses pattern fixed in d76b5a3.
 */
export function useTeachers(schoolId: string | undefined) {
  return useQuery<EntityOption[]>({
    queryKey: ['teachers', schoolId],
    queryFn: async () => {
      const params = new URLSearchParams({
        schoolId: schoolId ?? '',
        page: '1',
        limit: '500',
      });
      const res = await apiFetch(`/api/v1/teachers?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load teachers');
      const json = await res.json();
      const items = json.data ?? json;
      return items.map((t: { id: string; person?: { lastName?: string; firstName?: string } }) => ({
        id: t.id,
        name: t.person ? `${t.person.lastName} ${t.person.firstName}` : t.id,
      }));
    },
    enabled: !!schoolId,
  });
}

/**
 * Fetches the list of classes for a school (for PerspectiveSelector).
 *
 * The /api/v1/classes endpoint REQUIRES `?schoolId=...` — ClassService.findAll
 * throws NotFoundException without it (apps/api/src/modules/class/class.service.ts).
 * Without the param the request 404s, useQuery surfaces the error, and the
 * consumer's `data: classes = []` default silently hides the Klassen group in
 * PerspectiveSelector (the SelectGroup is wrapped in `{classes.length > 0 && ...}`).
 * Using `limit=500` matches the "one page of everything" expectation for
 * tenant-scoped admin pickers (see SchoolPaginationQueryDto, raised in Phase 12).
 */
export function useClasses(schoolId: string | undefined) {
  return useQuery<EntityOption[]>({
    queryKey: ['classes', schoolId],
    queryFn: async () => {
      const params = new URLSearchParams({
        schoolId: schoolId ?? '',
        page: '1',
        limit: '500',
      });
      const res = await apiFetch(`/api/v1/classes?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to load classes');
      const json = await res.json();
      const items = json.data ?? json;
      return items.map((c: { id: string; name: string }) => ({
        id: c.id,
        name: c.name,
      }));
    },
    enabled: !!schoolId,
  });
}

/**
 * Fetches the list of rooms for a school (for PerspectiveSelector).
 *
 * Route shape — Category A SAFE per the audit taxonomy in
 * `.planning/debug/resolved/useteachers-tenant-isolation-leak.md`:
 * `/api/v1/schools/:schoolId/rooms` carries the tenant scope as a URL path
 * segment, so Nest's routing layer enforces it (cannot be undefined when the
 * route matches). Unlike useClasses/useTeachers — which previously sent the
 * scope as `?schoolId=...` and were vulnerable to silent filter-drop —
 * useRooms does NOT need a defense-in-depth schoolId query param, and adding
 * one would weaken the route's contract by signaling that the path-segment
 * scope is somehow optional.
 *
 * Pagination params (`?page=1&limit=500`) are sent for a different reason:
 * the backend `PaginationQueryDto.limit` defaults to 20
 * (apps/api/src/common/dto/pagination.dto.ts), so without an explicit limit a
 * school with >20 rooms gets silently truncated and the Räume dropdown looks
 * incomplete to the admin (there is no error toast, no console warning — the
 * 20-row response is structurally identical to a complete one). The
 * unit-test regression guard in useTimetable.spec.ts ("useRooms — pagination
 * params regression guard") locks both `page=1` AND `limit=500` so reverting
 * to the bare path fails CI loudly.
 *
 * History:
 *   - 2026-04-02 (commit 1fb7abf): unwrap+map fix — original Räume-perspective
 *     bug where useRooms returned the raw paginated envelope as
 *     `EntityOption[]`, breaking PerspectiveSelector's iteration. The
 *     `json.data ?? json` + `.map(...)` block below is the canonical fix and
 *     MUST remain unchanged (the unit test deep-equals the mapped output).
 *   - 2026-04-26 (this hardening pass): pagination params + unit + E2E
 *     regression guards. Closes deferred items 1-3 from
 *     `.planning/debug/resolved/missing-raeume-perspective.md`.
 */
export function useRooms(schoolId: string | undefined) {
  return useQuery<EntityOption[]>({
    queryKey: ['rooms', schoolId],
    queryFn: async () => {
      const params = new URLSearchParams({ page: '1', limit: '500' });
      const res = await apiFetch(
        `/api/v1/schools/${schoolId}/rooms?${params.toString()}`,
      );
      if (!res.ok) throw new Error('Failed to load rooms');
      const json = await res.json();
      const items = json.data ?? json;
      return items.map((r: { id: string; name: string }) => ({
        id: r.id,
        name: r.name,
      }));
    },
    enabled: !!schoolId,
  });
}

