import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { ClassApiError, classKeys, type ClassGroupDto } from './useClasses';

/**
 * Class-group hooks — Phase 12-02 CLASS-04 / D-11.
 *
 * Silent-4xx invariant: every mutation wires explicit onError.
 */

export const classGroupKeys = {
  all: (classId: string) => ['class-groups', classId] as const,
};

async function readProblem(res: Response) {
  try {
    return await res.json();
  } catch {
    return { status: res.status, detail: `HTTP ${res.status}` };
  }
}

export function useClassGroups(classId: string | undefined) {
  return useQuery({
    queryKey: classGroupKeys.all(classId ?? ''),
    queryFn: async (): Promise<ClassGroupDto[]> => {
      const res = await apiFetch(`/api/v1/groups/by-class/${classId}`);
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    enabled: !!classId,
  });
}

export function useAddGroupMember(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ groupId, studentId }: { groupId: string; studentId: string }) => {
      const res = await apiFetch(`/api/v1/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify({ studentId, isAutoAssigned: false }),
      });
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classGroupKeys.all(classId) });
      qc.invalidateQueries({ queryKey: classKeys.detail(classId) });
      toast.success('Mitglied hinzugefügt.');
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Mitglied konnte nicht hinzugefügt werden.');
    },
  });
}

export function useRemoveGroupMember(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      groupId,
      studentId,
      wasAutoAssigned,
    }: {
      groupId: string;
      studentId: string;
      wasAutoAssigned: boolean;
    }) => {
      const res = await apiFetch(`/api/v1/groups/${groupId}/members/${studentId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return { wasAutoAssigned };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: classGroupKeys.all(classId) });
      qc.invalidateQueries({ queryKey: classKeys.detail(classId) });
      if (result.wasAutoAssigned) {
        toast.info('Wird bei nächster Regel-Anwendung wieder hinzugefügt.');
      } else {
        toast.success('Mitglied entfernt.');
      }
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Mitglied konnte nicht entfernt werden.');
    },
  });
}
