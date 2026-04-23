import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

/**
 * Subject hooks — Phase 11 Plan 11-02 admin surface for Fächer CRUD
 * (SUBJECT-01, SUBJECT-02, SUBJECT-05) + Stundentafel-Vorlagen section.
 *
 * Every mutation wires explicit onError — Silent-4xx invariant locked in
 * by Phase 10.1-01 / 10.2-04 and reused from Plan 11-01 patterns.
 * 409 Kürzel-uniqueness surfaces as an inline form error (setError) —
 * not a toast — because it is a per-field validation message, not a
 * cross-cutting failure. All other 4xx become red sonner toasts.
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

export interface SubjectDto {
  id: string;
  schoolId: string;
  name: string;
  shortName: string;
  subjectType: string;
  lehrverpflichtungsgruppe?: string | null;
  werteinheitenFactor?: number | null;
  classSubjects?: Array<{
    id: string;
    classId: string;
    schoolClass?: { id: string; name: string } | null;
  }>;
  teacherSubjects?: Array<{
    id: string;
    teacherId: string;
  }>;
  _count?: {
    classSubjects?: number;
    teacherSubjects?: number;
  };
}

export interface SubjectListFilters {
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

export const subjectKeys = {
  all: (schoolId: string) => ['subjects', schoolId] as const,
  list: (schoolId: string, filters?: SubjectListFilters) =>
    ['subjects', schoolId, filters ?? {}] as const,
  detail: (id: string) => ['subjects', 'detail', id] as const,
  affectedEntities: (id: string) =>
    ['subjects', 'affected-entities', id] as const,
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

class SubjectApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;
  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Queries

export function useSubjects(
  schoolId: string | undefined,
  filters: SubjectListFilters = {},
) {
  return useQuery({
    queryKey: subjectKeys.list(schoolId ?? '', filters),
    queryFn: async (): Promise<{
      data: SubjectDto[];
      meta: { total: number; page: number; limit: number; totalPages: number };
    }> => {
      const params = new URLSearchParams();
      if (schoolId) params.set('schoolId', schoolId);
      params.set('page', String(filters.page ?? 1));
      params.set('limit', String(filters.limit ?? 200));
      const res = await apiFetch(`/api/v1/subjects?${params.toString()}`);
      if (!res.ok) {
        throw new SubjectApiError(res.status, await readProblemDetail(res));
      }
      return res.json();
    },
    enabled: !!schoolId,
  });
}

export function useSubject(id: string | undefined) {
  return useQuery({
    queryKey: subjectKeys.detail(id ?? ''),
    queryFn: async (): Promise<SubjectDto> => {
      const res = await apiFetch(`/api/v1/subjects/${id}`);
      if (!res.ok) {
        throw new SubjectApiError(res.status, await readProblemDetail(res));
      }
      return res.json();
    },
    enabled: !!id,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Mutations

export interface CreateSubjectPayload {
  schoolId: string;
  name: string;
  shortName: string;
  subjectType?: string;
  lehrverpflichtungsgruppe?: string;
  werteinheitenFactor?: number;
}

export function useCreateSubject(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateSubjectPayload): Promise<SubjectDto> => {
      const res = await apiFetch('/api/v1/subjects', {
        method: 'POST',
        body: JSON.stringify({
          ...dto,
          subjectType: dto.subjectType ?? 'PFLICHT',
        }),
      });
      if (!res.ok) {
        throw new SubjectApiError(res.status, await readProblemDetail(res));
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subjectKeys.all(schoolId) });
      toast.success('Fach angelegt.');
    },
    onError: (err: SubjectApiError | Error) => {
      // 409 Kürzel-uniqueness: inline form-field error (setError in the
      // calling component via SubjectApiError instance check), NOT a toast.
      if (err instanceof SubjectApiError && err.status === 409) {
        // Caller inspects `err` and renders inline — no toast to avoid
        // double-reporting.
        return;
      }
      const detail =
        err instanceof SubjectApiError
          ? err.problem.detail ?? err.problem.title
          : err.message;
      toast.error(
        detail ?? 'Speichern fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.',
      );
    },
  });
}

export function useUpdateSubject(schoolId: string, id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      dto: Partial<CreateSubjectPayload> & Record<string, unknown>,
    ): Promise<SubjectDto> => {
      const res = await apiFetch(`/api/v1/subjects/${id}`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      if (!res.ok) {
        throw new SubjectApiError(res.status, await readProblemDetail(res));
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subjectKeys.all(schoolId) });
      qc.invalidateQueries({ queryKey: subjectKeys.detail(id) });
      toast.success('Fach aktualisiert.');
    },
    onError: (err: SubjectApiError | Error) => {
      if (err instanceof SubjectApiError && err.status === 409) {
        return; // inline-handled by caller
      }
      const detail =
        err instanceof SubjectApiError
          ? err.problem.detail ?? err.problem.title
          : err.message;
      toast.error(
        detail ?? 'Speichern fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.',
      );
    },
  });
}

export function useDeleteSubject(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/v1/subjects/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        throw new SubjectApiError(res.status, await readProblemDetail(res));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: subjectKeys.all(schoolId) });
      toast.success('Fach gelöscht.');
    },
    onError: (err: SubjectApiError | Error) => {
      if (err instanceof SubjectApiError && err.status === 409) {
        // DeleteSubjectDialog transitions to blocked-state + also fires
        // its own toast (UI-SPEC §4.3). No double-toast here.
        return;
      }
      const detail =
        err instanceof SubjectApiError
          ? err.problem.detail ?? err.problem.title
          : err.message;
      toast.error(detail ?? 'Löschen fehlgeschlagen.');
    },
  });
}

export { SubjectApiError };
