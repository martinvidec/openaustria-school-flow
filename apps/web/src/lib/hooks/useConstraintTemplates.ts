import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  solverTuningApi,
  SolverTuningApiError,
  type ConstraintTemplate,
  type ConstraintTemplateType,
} from '@/lib/api/solver-tuning';
import type { ConstraintTemplateParams } from '@schoolflow/shared';

/**
 * Phase 14-02: ConstraintTemplate CRUD hooks per templateType.
 *
 * Cache key strategy: `['constraint-templates', schoolId, templateType]`.
 * Each mutation invalidates ONLY the affected templateType for tighter
 * cache scope (per UI-SPEC §Cache invalidation granularity).
 *
 * Silent-4xx invariant: every mutation surfaces RFC 9457 problem+json
 * via destructive sonner toast.
 */

function describeError(err: unknown): { title?: string; detail?: string; status?: number } {
  if (err instanceof SolverTuningApiError) {
    return {
      title: err.problem.title,
      detail: err.problem.detail,
      status: err.status,
    };
  }
  if (err instanceof Error) return { detail: err.message };
  return {};
}

function fallbackToast(err: unknown, fallbackTitle: string) {
  const { title, detail, status } = describeError(err);
  toast.error(title ?? fallbackTitle, {
    description:
      detail ?? `Der Server hat die Anfrage abgelehnt (Status ${status ?? 'unknown'}).`,
  });
}

export function useConstraintTemplates(
  schoolId: string,
  templateType: ConstraintTemplateType,
) {
  return useQuery<ConstraintTemplate[]>({
    queryKey: ['constraint-templates', schoolId, templateType],
    queryFn: () => solverTuningApi.listTemplates(schoolId, templateType),
    enabled: !!schoolId,
  });
}

export function useCreateConstraintTemplate(
  schoolId: string,
  templateType: ConstraintTemplateType,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: ConstraintTemplateParams) =>
      solverTuningApi.createTemplate(schoolId, params, true),
    onSuccess: () => {
      toast.success('Eintrag angelegt.');
      qc.invalidateQueries({ queryKey: ['constraint-templates', schoolId, templateType] });
    },
    onError: (err: unknown) => fallbackToast(err, 'Eintrag nicht gespeichert'),
  });
}

export function useUpdateConstraintTemplate(
  schoolId: string,
  templateType: ConstraintTemplateType,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, params }: { id: string; params: ConstraintTemplateParams }) =>
      solverTuningApi.updateTemplate(schoolId, id, params),
    onSuccess: () => {
      toast.success('Änderungen gespeichert.');
      qc.invalidateQueries({ queryKey: ['constraint-templates', schoolId, templateType] });
    },
    onError: (err: unknown) => fallbackToast(err, 'Speichern nicht möglich'),
  });
}

export function useDeleteConstraintTemplate(
  schoolId: string,
  templateType: ConstraintTemplateType,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => solverTuningApi.deleteTemplate(schoolId, id),
    onSuccess: () => {
      toast.success('Eintrag gelöscht.');
      qc.invalidateQueries({ queryKey: ['constraint-templates', schoolId, templateType] });
    },
    onError: (err: unknown) => fallbackToast(err, 'Löschen nicht möglich'),
  });
}

/**
 * Inline isActive toggle. Per UI-SPEC §Restriction CRUD §7 the success
 * path is silent (no toast); only the error path surfaces a destructive
 * toast (silent-4xx invariant).
 */
export function useSetTemplateActive(
  schoolId: string,
  templateType: ConstraintTemplateType,
) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      solverTuningApi.setTemplateActive(schoolId, id, isActive),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['constraint-templates', schoolId, templateType] });
    },
    onError: (err: unknown) => fallbackToast(err, 'Aktion nicht möglich'),
  });
}
