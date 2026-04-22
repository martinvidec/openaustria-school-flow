import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

/**
 * Teacher hooks — mixed legacy + Phase 11 admin surface.
 *
 * LEGACY: `useTeacherOptions(schoolId)` returns a flat TeacherOption[] for
 * dropdown use cases (substitution planner, timetable editor). Previously
 * exported as `useTeachers` — kept under the legacy name for back-compat
 * and re-exported at the bottom of this file.
 *
 * PHASE 11 ADMIN: `useAdminTeachers` / `useTeacher` / `useCreateTeacher` /
 * `useUpdateTeacher` / `useDeleteTeacher` / `useLinkKeycloak` /
 * `useUnlinkKeycloak` drive /admin/teachers admin pages. Every mutation
 * wires an explicit `onError` that surfaces a red sonner toast — Silent-4xx
 * invariant locked in by Phase 10.1-01 / 10.2-04.
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

export interface TeacherOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface RawTeacher {
  id: string;
  person?: { firstName?: string; lastName?: string } | null;
}

interface PaginatedTeachers {
  data: RawTeacher[];
  meta?: unknown;
}

/** Full Teacher row as returned by GET /teachers (paginated) + GET /teachers/:id */
export interface TeacherDto {
  id: string;
  schoolId: string;
  personId: string;
  employmentPercentage: number;
  werteinheitenTarget: number;
  isPermanent?: boolean | null;
  personalNumber?: string | null;
  yearsOfService?: number | null;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
    keycloakUserId?: string | null;
  };
  qualifications?: Array<{
    id: string;
    subjectId: string;
    subject?: { id: string; name: string; abbreviation?: string };
  }>;
  availabilityRules?: Array<{
    id: string;
    ruleType: string;
    dayOfWeek?: string | null;
    periodNumbers: number[];
    maxValue?: number | null;
    dayPart?: string | null;
    isHard: boolean;
  }>;
  reductions?: Array<{
    id: string;
    reductionType: string;
    werteinheiten: number;
    description?: string | null;
    schoolYearId?: string | null;
  }>;
}

export interface TeacherListFilters {
  search?: string;
  fachId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface ProblemDetail {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  extensions?: Record<string, unknown>;
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys (UI-SPEC §6.1)

export const teacherKeys = {
  all: (schoolId: string) => ['teachers', schoolId] as const,
  list: (schoolId: string, filters?: TeacherListFilters) =>
    ['teachers', schoolId, filters ?? {}] as const,
  detail: (id: string) => ['teachers', 'detail', id] as const,
  keycloakUsers: (email: string) => ['keycloak-users', email] as const,
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers

async function readProblemDetail(res: Response): Promise<ProblemDetail> {
  try {
    const json = (await res.json()) as ProblemDetail;
    return json;
  } catch {
    return { status: res.status, detail: `HTTP ${res.status}` };
  }
}

class TeacherApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;
  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// LEGACY: dropdown-friendly flat list

/**
 * LEGACY hook: returns `TeacherOption[]` for substitution/timetable-edit
 * dropdowns. The admin list uses useAdminTeachers() which preserves the
 * full DTO and pagination envelope.
 */
export function useTeacherOptions(schoolId: string | undefined) {
  return useQuery({
    queryKey: ['teachers-options', schoolId ?? ''],
    queryFn: async (): Promise<TeacherOption[]> => {
      const params = new URLSearchParams({ limit: '100', page: '1' });
      if (schoolId) params.set('schoolId', schoolId);
      const res = await apiFetch(`/api/v1/teachers?${params}`);
      if (!res.ok) throw new Error('Failed to load teachers');
      const body: PaginatedTeachers = await res.json();
      return (body.data ?? [])
        .map((t) => ({
          id: t.id,
          firstName: t.person?.firstName ?? '',
          lastName: t.person?.lastName ?? '',
        }))
        .sort((a, b) => a.lastName.localeCompare(b.lastName, 'de'));
    },
    enabled: !!schoolId,
    staleTime: 5 * 60_000,
  });
}

// Preserve the historical name for existing callers (substitutions,
// timetable-edit). NEW code should import useTeacherOptions directly.
export const useTeachers = useTeacherOptions;

// ──────────────────────────────────────────────────────────────────────────
// PHASE 11 ADMIN hooks

/**
 * Fetch the admin teacher list (paginated + filtered). Returns the full
 * Paginated envelope so the UI can render meta.total and page controls.
 */
export function useAdminTeachers(
  schoolId: string | undefined,
  filters: TeacherListFilters = {},
) {
  return useQuery({
    queryKey: teacherKeys.list(schoolId ?? '', filters),
    queryFn: async (): Promise<{ data: TeacherDto[]; meta: { total: number; page: number; limit: number; totalPages: number } }> => {
      const params = new URLSearchParams();
      if (schoolId) params.set('schoolId', schoolId);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 50));
      const res = await apiFetch(`/api/v1/teachers?${params.toString()}`);
      if (!res.ok) throw new TeacherApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useTeacher(id: string | undefined) {
  return useQuery({
    queryKey: teacherKeys.detail(id ?? ''),
    queryFn: async (): Promise<TeacherDto> => {
      const res = await apiFetch(`/api/v1/teachers/${id}`);
      if (!res.ok) throw new TeacherApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!id,
  });
}

export interface CreateTeacherPayload {
  schoolId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  employmentPercentage?: number;
}

export function useCreateTeacher(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateTeacherPayload): Promise<TeacherDto> => {
      const res = await apiFetch('/api/v1/teachers', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new TeacherApiError(res.status, await readProblemDetail(res));
      // Backend returns Person with nested teacher — unwrap
      const body = await res.json();
      return (body.teacher as TeacherDto) ?? (body as TeacherDto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.all(schoolId) });
      toast.success('Lehrperson angelegt.');
    },
    onError: (err: TeacherApiError | Error) => {
      const detail =
        err instanceof TeacherApiError
          ? err.problem.detail ?? err.problem.title
          : err.message;
      toast.error(detail ?? 'Speichern fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.');
    },
  });
}

export function useUpdateTeacher(schoolId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<CreateTeacherPayload> & Record<string, unknown>): Promise<TeacherDto> => {
      const res = await apiFetch(`/api/v1/teachers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new TeacherApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.all(schoolId) });
      qc.invalidateQueries({ queryKey: teacherKeys.detail(id) });
      toast.success('Änderungen gespeichert.');
    },
    onError: (err: TeacherApiError | Error) => {
      const detail =
        err instanceof TeacherApiError
          ? err.problem.detail ?? err.problem.title
          : err.message;
      toast.error(detail ?? 'Speichern fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.');
    },
  });
}

export function useDeleteTeacher(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/v1/teachers/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new TeacherApiError(res.status, await readProblemDetail(res));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.all(schoolId) });
      toast.success('Lehrperson gelöscht.');
    },
    onError: (err: TeacherApiError | Error) => {
      if (err instanceof TeacherApiError && err.status === 409) {
        toast.error(err.problem.title ?? 'Lehrperson kann nicht gelöscht werden');
      } else {
        const detail =
          err instanceof TeacherApiError
            ? err.problem.detail ?? err.problem.title
            : err.message;
        toast.error(detail ?? 'Löschen fehlgeschlagen.');
      }
    },
  });
}

export function useLinkKeycloak(teacherId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (keycloakUserId: string) => {
      const res = await apiFetch(`/api/v1/teachers/${teacherId}/keycloak-link`, {
        method: 'PATCH',
        body: JSON.stringify({ keycloakUserId }),
      });
      if (!res.ok) throw new TeacherApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.detail(teacherId) });
      toast.success('Keycloak-Account verknüpft.');
    },
    onError: (err: TeacherApiError | Error) => {
      const detail =
        err instanceof TeacherApiError
          ? err.problem.detail ?? err.problem.title
          : err.message;
      toast.error(detail ?? 'Verknüpfen fehlgeschlagen.');
    },
  });
}

export function useUnlinkKeycloak(teacherId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/v1/teachers/${teacherId}/keycloak-link`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new TeacherApiError(res.status, await readProblemDetail(res));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: teacherKeys.detail(teacherId) });
      toast.success('Verknüpfung gelöst.');
    },
    onError: (err: TeacherApiError | Error) => {
      const detail =
        err instanceof TeacherApiError
          ? err.problem.detail ?? err.problem.title
          : err.message;
      toast.error(detail ?? 'Lösen fehlgeschlagen.');
    },
  });
}

export { TeacherApiError };
