import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { ClassApiError, classKeys, type ClassSubjectDto } from './useClasses';

/**
 * ClassSubject hooks — Phase 12-02 CLASS-03 / SUBJECT-04.
 *
 * Silent-4xx invariant: every mutation wires explicit onError.
 */

export const classSubjectKeys = {
  all: (classId: string) => ['class-subjects', classId] as const,
};

async function readProblem(res: Response) {
  try {
    return await res.json();
  } catch {
    return { status: res.status, detail: `HTTP ${res.status}` };
  }
}

export function useClassSubjects(classId: string | undefined) {
  return useQuery({
    queryKey: classSubjectKeys.all(classId ?? ''),
    queryFn: async (): Promise<ClassSubjectDto[]> => {
      const res = await apiFetch(`/api/v1/classes/${classId}/subjects`);
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    enabled: !!classId,
  });
}

export function useApplyStundentafel(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ schoolType }: { schoolType: string }) => {
      const res = await apiFetch(`/api/v1/classes/${classId}/apply-stundentafel`, {
        method: 'POST',
        body: JSON.stringify({ schoolType }),
      });
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classSubjectKeys.all(classId) });
      qc.invalidateQueries({ queryKey: classKeys.detail(classId) });
      toast.success('Stundentafel übernommen.');
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Stundentafel konnte nicht übernommen werden.');
    },
  });
}

export interface UpdateClassSubjectsPayload {
  rows: Array<{
    id?: string;
    subjectId: string;
    weeklyHours: number;
    preferDoublePeriod?: boolean;
  }>;
}

export function useUpdateClassSubjects(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: UpdateClassSubjectsPayload) => {
      const res = await apiFetch(`/api/v1/classes/${classId}/subjects`, {
        method: 'PUT',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classSubjectKeys.all(classId) });
      qc.invalidateQueries({ queryKey: classKeys.detail(classId) });
      toast.success('Stundentafel gespeichert.');
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Speichern fehlgeschlagen.');
    },
  });
}

export function useResetStundentafel(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ schoolType }: { schoolType: string }) => {
      const res = await apiFetch(`/api/v1/classes/${classId}/reset-stundentafel`, {
        method: 'POST',
        body: JSON.stringify({ schoolType }),
      });
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classSubjectKeys.all(classId) });
      qc.invalidateQueries({ queryKey: classKeys.detail(classId) });
      toast.success('Stundentafel zurückgesetzt.');
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Zurücksetzen fehlgeschlagen.');
    },
  });
}
