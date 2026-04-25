import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  solverTuningApi,
  SolverTuningApiError,
  type ConstraintWeightsResponse,
} from '@/lib/api/solver-tuning';
import type { ConstraintWeightsMap } from '@schoolflow/shared';

/**
 * Phase 14-02: GET/PUT /constraint-weights + DELETE one (reset-to-default).
 *
 * Plan 14-01 GET returns the merged map `{ weights, lastUpdatedAt }`. The
 * DriftBanner consumes `lastUpdatedAt` directly — no fallback path.
 *
 * Silent-4xx invariant: every mutation has explicit `onError` that surfaces
 * the RFC 9457 problem+json detail via destructive sonner toast.
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

export function useConstraintWeights(schoolId: string) {
  return useQuery<ConstraintWeightsResponse>({
    queryKey: ['constraint-weights', schoolId],
    queryFn: () => solverTuningApi.getConstraintWeights(schoolId),
    enabled: !!schoolId,
  });
}

export function useUpdateConstraintWeights(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (weights: ConstraintWeightsMap) =>
      solverTuningApi.putConstraintWeights(schoolId, weights),
    onSuccess: () => {
      toast.success('Gewichtungen gespeichert.');
      qc.invalidateQueries({ queryKey: ['constraint-weights', schoolId] });
    },
    onError: (err: unknown) => {
      const { title, detail, status } = describeError(err);
      toast.error(title ?? 'Speichern nicht möglich', {
        description:
          detail ?? `Der Server hat die Anfrage abgelehnt (Status ${status ?? 'unknown'}).`,
      });
    },
  });
}

export function useResetConstraintWeight(schoolId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (constraintName: string) =>
      solverTuningApi.resetConstraintWeight(schoolId, constraintName),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['constraint-weights', schoolId] });
    },
    onError: (err: unknown) => {
      const { title, detail, status } = describeError(err);
      toast.error(title ?? 'Zurücksetzen nicht möglich', {
        description:
          detail ?? `Der Server hat die Anfrage abgelehnt (Status ${status ?? 'unknown'}).`,
      });
    },
  });
}
