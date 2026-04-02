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
 */
export function useTeachers(schoolId: string | undefined) {
  return useQuery<EntityOption[]>({
    queryKey: ['teachers', schoolId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/teachers`);
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
 */
export function useClasses(schoolId: string | undefined) {
  return useQuery<EntityOption[]>({
    queryKey: ['classes', schoolId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/classes`);
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
 */
export function useRooms(schoolId: string | undefined) {
  return useQuery<EntityOption[]>({
    queryKey: ['rooms', schoolId],
    queryFn: async () => {
      const res = await apiFetch(`/api/v1/schools/${schoolId}/rooms`);
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

