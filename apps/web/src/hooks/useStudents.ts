import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

/**
 * Student hooks — Phase 12-01 admin surface (STUDENT-01..04).
 *
 * Every mutation wires explicit onError → sonner.toast.error (Silent-4xx
 * invariant locked in by Phase 10.1-01 / 10.2-04 / 11-01). 409 Orphan-Guard
 * conflicts are surfaced as typed StudentApiError instances so DeleteStudentDialog
 * can switch to its blocked state and render AffectedEntitiesList kind='student'.
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

export interface PersonSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  dateOfBirth?: string | null;
  socialSecurityNumber?: string | null;
}

export interface ParentSummaryDto {
  id: string;
  personId: string;
  schoolId: string;
  person: PersonSummaryDto;
}

export interface ParentStudentLinkDto {
  id: string;
  parentId: string;
  studentId: string;
  parent: ParentSummaryDto;
}

export interface SchoolClassSummaryDto {
  id: string;
  name: string;
  yearLevel?: number;
  schoolYearId?: string;
}

export interface GroupMembershipDto {
  id: string;
  groupId: string;
  studentId: string;
  isAutoAssigned?: boolean;
  group?: {
    id: string;
    name: string;
    groupType: string;
    level?: string | null;
    subjectId?: string | null;
  };
}

export interface StudentDto {
  id: string;
  personId: string;
  schoolId: string;
  classId?: string | null;
  studentNumber?: string | null;
  enrollmentDate?: string | null;
  isArchived: boolean;
  archivedAt?: string | null;
  person: PersonSummaryDto;
  schoolClass?: SchoolClassSummaryDto | null;
  parentStudents?: ParentStudentLinkDto[];
  groupMemberships?: GroupMembershipDto[];
}

export interface StudentListFilters {
  search?: string;
  classId?: string;
  archived?: 'active' | 'archived' | 'all';
  schoolYearId?: string;
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
    const json = (await res.json()) as ProblemDetail;
    return json;
  } catch {
    return { status: res.status, detail: `HTTP ${res.status}` };
  }
}

export class StudentApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;
  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys (UI-SPEC §6.1)

export const studentKeys = {
  all: (schoolId: string) => ['students', schoolId] as const,
  list: (schoolId: string, filters?: StudentListFilters) =>
    ['students', schoolId, filters ?? {}] as const,
  detail: (id: string) => ['students', 'detail', id] as const,
  affected: (id: string) => ['students', 'affected', id] as const,
};

// ──────────────────────────────────────────────────────────────────────────
// Queries

function buildListQuery(schoolId: string, filters: StudentListFilters) {
  const params = new URLSearchParams();
  params.set('schoolId', schoolId);
  params.set('page', String(filters.page ?? 1));
  params.set('limit', String(filters.limit ?? 50));
  if (filters.search) params.set('search', filters.search);
  if (filters.classId) params.set('classId', filters.classId);
  if (filters.archived) params.set('archived', filters.archived);
  if (filters.schoolYearId) params.set('schoolYearId', filters.schoolYearId);
  return params;
}

export function useStudents(
  schoolId: string | undefined,
  filters: StudentListFilters = {},
) {
  return useQuery({
    queryKey: studentKeys.list(schoolId ?? '', filters),
    queryFn: async (): Promise<{
      data: StudentDto[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }> => {
      const params = buildListQuery(schoolId ?? '', filters);
      const res = await apiFetch(`/api/v1/students?${params.toString()}`);
      if (!res.ok) throw new StudentApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useStudent(id: string | undefined) {
  return useQuery({
    queryKey: studentKeys.detail(id ?? ''),
    queryFn: async (): Promise<StudentDto> => {
      const res = await apiFetch(`/api/v1/students/${id}`);
      if (!res.ok) throw new StudentApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: !!id,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Mutations — Silent-4xx invariant: every useMutation wires onError

export interface CreateStudentPayload {
  schoolId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;
  socialSecurityNumber?: string;
  studentNumber?: string;
  classId?: string;
  enrollmentDate?: string;
  parentIds?: string[];
}

export function useCreateStudent(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateStudentPayload): Promise<StudentDto> => {
      const res = await apiFetch('/api/v1/students', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new StudentApiError(res.status, await readProblemDetail(res));
      const body = await res.json();
      return (body.student as StudentDto) ?? (body as StudentDto);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all(schoolId) });
      toast.success('Schüler:in angelegt.');
    },
    onError: (err: StudentApiError | Error) => {
      const detail =
        err instanceof StudentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Speichern fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.');
    },
  });
}

export function useUpdateStudent(schoolId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: Partial<CreateStudentPayload> & Record<string, unknown>): Promise<StudentDto> => {
      const res = await apiFetch(`/api/v1/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new StudentApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all(schoolId) });
      qc.invalidateQueries({ queryKey: studentKeys.detail(id) });
      toast.success('Änderungen gespeichert.');
    },
    onError: (err: StudentApiError | Error) => {
      const detail =
        err instanceof StudentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Speichern fehlgeschlagen.');
    },
  });
}

export function useArchiveStudent(schoolId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/v1/students/${id}/archive`, { method: 'POST' });
      if (!res.ok) throw new StudentApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all(schoolId) });
      qc.invalidateQueries({ queryKey: studentKeys.detail(id) });
      toast.success('Schüler:in archiviert.');
    },
    onError: (err: StudentApiError | Error) => {
      const detail =
        err instanceof StudentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Archivieren fehlgeschlagen.');
    },
  });
}

export function useRestoreStudent(schoolId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/v1/students/${id}/restore`, { method: 'POST' });
      if (!res.ok) throw new StudentApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all(schoolId) });
      qc.invalidateQueries({ queryKey: studentKeys.detail(id) });
      toast.success('Schüler:in reaktiviert.');
    },
    onError: (err: StudentApiError | Error) => {
      const detail =
        err instanceof StudentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Reaktivieren fehlgeschlagen.');
    },
  });
}

export function useDeleteStudent(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/v1/students/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new StudentApiError(res.status, await readProblemDetail(res));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all(schoolId) });
      toast.success('Schüler:in gelöscht.');
    },
    onError: (err: StudentApiError | Error) => {
      // 409: DeleteStudentDialog switches to blocked-state + surfaces its own toast
      // (UI-SPEC §4.3 pattern mirrored from DeleteTeacherDialog/DeleteSubjectDialog).
      if (err instanceof StudentApiError && err.status === 409) {
        return;
      }
      const detail =
        err instanceof StudentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Löschen fehlgeschlagen.');
    },
  });
}

/** Single-row move — thin wrapper around PUT /students/:id with classId only. */
export function useMoveStudent(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentId,
      targetClassId,
    }: {
      studentId: string;
      targetClassId: string;
    }) => {
      const res = await apiFetch(`/api/v1/students/${studentId}`, {
        method: 'PUT',
        body: JSON.stringify({ classId: targetClassId }),
      });
      if (!res.ok) throw new StudentApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.all(schoolId) });
      toast.success('Schüler:in verschoben.');
    },
    onError: (err: StudentApiError | Error) => {
      const detail =
        err instanceof StudentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Verschieben fehlgeschlagen.');
    },
  });
}

/**
 * Bulk move — sequential PUT per row with progress callback. Stops on first
 * error and surfaces a partial-failure toast. No bulk endpoint on the backend;
 * UI orchestrates the multi-request flow (D-05 decision).
 */
export function useBulkMoveStudents(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      studentIds,
      targetClassId,
      onProgress,
    }: {
      studentIds: string[];
      targetClassId: string;
      onProgress?: (done: number, total: number, currentStudentId: string) => void;
    }) => {
      const total = studentIds.length;
      let done = 0;
      let failed: { studentId: string; error: StudentApiError | Error } | null = null;
      for (const studentId of studentIds) {
        onProgress?.(done, total, studentId);
        const res = await apiFetch(`/api/v1/students/${studentId}`, {
          method: 'PUT',
          body: JSON.stringify({ classId: targetClassId }),
        });
        if (!res.ok) {
          const err = new StudentApiError(res.status, await readProblemDetail(res));
          failed = { studentId, error: err };
          throw err;
        }
        done += 1;
      }
      return { done, total, failed };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: studentKeys.all(schoolId) });
      toast.success(`${result.done}/${result.total} Schüler:innen verschoben.`);
    },
    onError: (err: StudentApiError | Error) => {
      const detail =
        err instanceof StudentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Bulk-Verschieben fehlgeschlagen.');
    },
  });
}
