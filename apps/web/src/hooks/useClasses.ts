import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { dashboardKeys } from '@/hooks/useDashboardStatus';

/**
 * Class hooks — Phase 12-02 admin surface (CLASS-01..05).
 *
 * Silent-4xx invariant: every useMutation wires explicit onError → sonner.toast.error.
 * 409 Orphan-Guard is surfaced as typed `ClassApiError` so DeleteClassDialog can
 * switch into its blocked state and render AffectedEntitiesList kind='class'.
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

export interface PersonSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

export interface TeacherSummaryDto {
  id: string;
  personId: string;
  person: PersonSummaryDto;
}

export interface ClassListItemDto {
  id: string;
  schoolId: string;
  name: string;
  yearLevel: number;
  schoolYearId: string;
  klassenvorstandId?: string | null;
  klassenvorstand?: TeacherSummaryDto | null;
  homeRoomId?: string | null;
  homeRoom?: { id: string; name: string; roomType?: string } | null;
  _count?: { students: number; classSubjects?: number };
}

export interface ClassGroupMembershipDto {
  id: string;
  groupId: string;
  studentId: string;
  isAutoAssigned: boolean;
  student?: { id: string; person: PersonSummaryDto };
}

export interface ClassGroupDto {
  id: string;
  classId: string;
  name: string;
  groupType: string;
  level?: string | null;
  subjectId?: string | null;
  memberships?: ClassGroupMembershipDto[];
}

export interface ClassStudentDto {
  id: string;
  person: PersonSummaryDto;
  classId?: string | null;
  isArchived?: boolean;
  studentNumber?: string | null;
}

export interface ClassSubjectDto {
  id: string;
  classId: string;
  subjectId: string;
  groupId?: string | null;
  teacherId?: string | null;
  teacher?: {
    id: string;
    person: { firstName: string; lastName: string };
  } | null;
  weeklyHours: number;
  isCustomized: boolean;
  preferDoublePeriod: boolean;
  subject?: { id: string; name: string; shortName: string };
}

export interface GroupDerivationRuleDto {
  id: string;
  classId: string;
  groupType: string;
  groupName: string;
  level?: string | null;
  studentIds?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClassDetailDto extends ClassListItemDto {
  students: ClassStudentDto[];
  groups: ClassGroupDto[];
  classSubjects: ClassSubjectDto[];
  derivationRules: GroupDerivationRuleDto[];
}

export interface ClassListFilters {
  schoolYearId?: string;
  yearLevels?: number[];
  search?: string;
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

async function readProblemDetail(res: Response): Promise<ProblemDetail> {
  try {
    return (await res.json()) as ProblemDetail;
  } catch {
    return { status: res.status, detail: `HTTP ${res.status}` };
  }
}

export class ClassApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;
  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys

export const classKeys = {
  all: (schoolId: string) => ['classes', schoolId] as const,
  list: (schoolId: string, filters?: ClassListFilters) =>
    ['classes', schoolId, filters ?? {}] as const,
  detail: (id: string) => ['classes', 'detail', id] as const,
};

// ──────────────────────────────────────────────────────────────────────────
// Queries

function buildListQuery(schoolId: string, filters: ClassListFilters) {
  const params = new URLSearchParams();
  params.set('schoolId', schoolId);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 50));
  if (filters.search) params.set('search', filters.search);
  if (filters.schoolYearId) params.set('schoolYearId', filters.schoolYearId);
  if (filters.yearLevels && filters.yearLevels.length > 0) {
    params.set('yearLevels', filters.yearLevels.join(','));
  }
  return params;
}

export function useClasses(
  schoolId: string | undefined,
  filters: ClassListFilters = {},
) {
  return useQuery({
    queryKey: classKeys.list(schoolId ?? '', filters),
    queryFn: async (): Promise<{
      data: ClassListItemDto[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }> => {
      const params = buildListQuery(schoolId ?? '', filters);
      const res = await apiFetch(`/api/v1/classes?${params.toString()}`);
      if (!res.ok) throw new ClassApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useClass(id: string | undefined) {
  return useQuery({
    queryKey: classKeys.detail(id ?? ''),
    queryFn: async (): Promise<ClassDetailDto> => {
      const res = await apiFetch(`/api/v1/classes/${id}`);
      if (!res.ok) throw new ClassApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!id,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Mutations — Silent-4xx invariant

export interface CreateClassPayload {
  schoolId: string;
  name: string;
  yearLevel: number;
  schoolYearId: string;
  klassenvorstandId?: string;
  homeRoomId?: string;
}

export function useCreateClass(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateClassPayload): Promise<ClassListItemDto> => {
      const res = await apiFetch('/api/v1/classes', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new ClassApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.all(schoolId) });
      qc.invalidateQueries({ queryKey: dashboardKeys.status });
      toast.success('Klasse angelegt.');
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Klasse anlegen fehlgeschlagen.');
    },
  });
}

export interface UpdateClassPayload {
  name?: string;
  yearLevel?: number;
  klassenvorstandId?: string | null;
  homeRoomId?: string | null;
}

export function useUpdateClass(schoolId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateClassPayload): Promise<ClassDetailDto> => {
      const res = await apiFetch(`/api/v1/classes/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new ClassApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.all(schoolId) });
      qc.invalidateQueries({ queryKey: classKeys.detail(id) });
      qc.invalidateQueries({ queryKey: dashboardKeys.status });
      toast.success('Änderungen gespeichert.');
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Speichern fehlgeschlagen.');
    },
  });
}

export function useDeleteClass(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/v1/classes/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new ClassApiError(res.status, await readProblemDetail(res));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.all(schoolId) });
      qc.invalidateQueries({ queryKey: dashboardKeys.status });
      toast.success('Klasse gelöscht.');
    },
    onError: (err: ClassApiError | Error) => {
      // 409: DeleteClassDialog renders its own blocked-state panel
      if (err instanceof ClassApiError && err.status === 409) {
        return;
      }
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Löschen fehlgeschlagen.');
    },
  });
}
