import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { ClassApiError, classKeys, type GroupDerivationRuleDto } from './useClasses';

/**
 * GroupDerivationRule hooks + Apply-Rules flow — Phase 12-02 CLASS-05 / D-12.
 *
 * Silent-4xx invariant: every mutation wires explicit onError.
 */

export const ruleKeys = {
  all: (classId: string) => ['derivation-rules', classId] as const,
  preview: (classId: string) => ['apply-rules', 'preview', classId] as const,
};

async function readProblem(res: Response) {
  try {
    return await res.json();
  } catch {
    return { status: res.status, detail: `HTTP ${res.status}` };
  }
}

export interface CreateRulePayload {
  groupType: 'RELIGION' | 'WAHLPFLICHT' | 'LEISTUNG' | 'LANGUAGE' | 'CUSTOM';
  groupName: string;
  level?: string;
  studentIds?: string[];
}

export function useGroupDerivationRules(classId: string | undefined) {
  return useQuery({
    queryKey: ruleKeys.all(classId ?? ''),
    queryFn: async (): Promise<GroupDerivationRuleDto[]> => {
      const res = await apiFetch(`/api/v1/classes/${classId}/derivation-rules`);
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    enabled: !!classId,
  });
}

export function useCreateRule(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dto: CreateRulePayload) => {
      const res = await apiFetch(`/api/v1/classes/${classId}/derivation-rules`, {
        method: 'POST',
        body: JSON.stringify(dto),
      });
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ruleKeys.all(classId) });
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Regel konnte nicht gespeichert werden.');
    },
  });
}

export function useUpdateRule(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ruleId,
      dto,
    }: {
      ruleId: string;
      dto: Partial<CreateRulePayload>;
    }) => {
      const res = await apiFetch(
        `/api/v1/classes/${classId}/derivation-rules/${ruleId}`,
        { method: 'PUT', body: JSON.stringify(dto) },
      );
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ruleKeys.all(classId) });
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Regel konnte nicht aktualisiert werden.');
    },
  });
}

export function useDeleteRule(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ruleId: string) => {
      const res = await apiFetch(
        `/api/v1/classes/${classId}/derivation-rules/${ruleId}`,
        { method: 'DELETE' },
      );
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ruleKeys.all(classId) });
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Regel konnte nicht gelöscht werden.');
    },
  });
}

export interface ApplyRulesPreview {
  newGroups: Array<{ name: string; groupType: string; level?: string }>;
  newMemberships: Array<{ studentId: string; groupName: string }>;
  conflicts: Array<{
    studentId: string;
    groupName: string;
    reason: 'MANUAL_ASSIGNMENT_EXISTS';
  }>;
}

export function useApplyRulesPreview(classId: string | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ruleKeys.preview(classId ?? ''),
    queryFn: async (): Promise<ApplyRulesPreview> => {
      const res = await apiFetch(`/api/v1/classes/${classId}/apply-rules/preview`);
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    enabled: !!classId && enabled,
    staleTime: 0,
  });
}

export function useApplyRules(classId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await apiFetch(`/api/v1/groups/apply-rules/${classId}`, {
        method: 'POST',
        body: JSON.stringify([]), // empty body → defaults to DB-stored rules
      });
      if (!res.ok) throw new ClassApiError(res.status, await readProblem(res));
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: classKeys.detail(classId) });
      qc.invalidateQueries({ queryKey: ruleKeys.preview(classId) });
      toast.success('Regeln angewendet.');
    },
    onError: (err: ClassApiError | Error) => {
      const detail =
        err instanceof ClassApiError ? err.problem.detail ?? err.problem.title : err.message;
      toast.error(detail ?? 'Regel-Anwendung fehlgeschlagen.');
    },
  });
}
