import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { studentKeys } from './useStudents';

/**
 * Parent hooks — Phase 12-01 admin surface (STUDENT-02 / D-13.1).
 *
 * ParentSearchPopover uses useParentsByEmail with a 300ms debounce + min
 * 3 characters. InlineCreateParentForm uses useCreateParent. Link/unlink
 * mutations mutate /api/v1/students/:id/parents endpoints.
 */

export interface ParentListDto {
  id: string;
  personId: string;
  schoolId: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string | null;
    phone?: string | null;
  };
  _count?: { children: number };
}

interface ProblemDetail {
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

export class ParentApiError extends Error {
  readonly status: number;
  readonly problem: ProblemDetail;
  constructor(status: number, problem: ProblemDetail) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }
}

export const parentKeys = {
  all: (schoolId: string) => ['parents', schoolId] as const,
  byEmail: (schoolId: string, email: string) => ['parents', schoolId, 'byEmail', email] as const,
  detail: (id: string) => ['parents', 'detail', id] as const,
};

/** Simple debounce hook — 300ms default. */
function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

export function useParentsByEmail(options: {
  schoolId: string | undefined;
  email: string;
  enabled?: boolean;
}) {
  const { schoolId, email, enabled = true } = options;
  const debouncedEmail = useDebouncedValue(email, 300);
  const isEnabled = enabled && !!schoolId && debouncedEmail.length >= 3;

  return useQuery({
    queryKey: parentKeys.byEmail(schoolId ?? '', debouncedEmail),
    queryFn: async (): Promise<{ data: ParentListDto[]; meta: { total: number } }> => {
      const params = new URLSearchParams({
        schoolId: schoolId ?? '',
        email: debouncedEmail,
        limit: '10',
        page: '1',
      });
      const res = await apiFetch(`/api/v1/parents?${params.toString()}`);
      if (!res.ok) throw new ParentApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    enabled: isEnabled,
    staleTime: 30_000,
  });
}

export interface CreateParentPayload {
  schoolId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}

export function useCreateParent(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateParentPayload): Promise<ParentListDto> => {
      const res = await apiFetch('/api/v1/parents', {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new ParentApiError(res.status, await readProblemDetail(res));
      const body = await res.json();
      // API returns Person with nested parent — unwrap to a ParentListDto-shaped row
      return (body.parent
        ? {
            ...body.parent,
            person: {
              id: body.id,
              firstName: body.firstName,
              lastName: body.lastName,
              email: body.email,
              phone: body.phone,
            },
          }
        : body) as ParentListDto;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: parentKeys.all(schoolId) });
      toast.success('Erziehungsberechtigte:r angelegt.');
    },
    onError: (err: ParentApiError | Error) => {
      const detail =
        err instanceof ParentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Anlegen fehlgeschlagen.');
    },
  });
}

export function useLinkParentToStudent(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (parentId: string) => {
      const res = await apiFetch(`/api/v1/students/${studentId}/parents`, {
        method: 'POST',
        body: JSON.stringify({ parentId }),
      });
      if (!res.ok) throw new ParentApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.detail(studentId) });
      toast.success('Verknüpfung angelegt.');
    },
    onError: (err: ParentApiError | Error) => {
      const detail =
        err instanceof ParentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Verknüpfen fehlgeschlagen.');
    },
  });
}

export function useUnlinkParentFromStudent(studentId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (parentId: string) => {
      const res = await apiFetch(`/api/v1/students/${studentId}/parents/${parentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new ParentApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studentKeys.detail(studentId) });
      toast.success('Verknüpfung entfernt.');
    },
    onError: (err: ParentApiError | Error) => {
      const detail =
        err instanceof ParentApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Entfernen fehlgeschlagen.');
    },
  });
}
