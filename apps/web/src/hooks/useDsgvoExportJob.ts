import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import {
  isTerminal,
  dsgvoJobsKeys,
  type DsgvoJobStatus,
} from './useDsgvoJobs';

/**
 * Phase 15-08 Task 2 (export half): per-id polling + trigger mutation for
 * Art. 15 / 20 data exports.
 *
 * - `useDsgvoExportJob(jobId)` polls `GET /api/v1/dsgvo/export/:id` every
 *   2 seconds until the job hits a terminal state (COMPLETED / FAILED) per
 *   UI-SPEC § BullMQ polling (D-13/D-14).
 * - `useRequestExport()` POSTs `/api/v1/dsgvo/export` with the backend's
 *   required `{ personId, schoolId }` shape. The plan prose listed only
 *   `personId` — verified at execution-time the DTO REQUIRES schoolId
 *   (`apps/api/src/modules/dsgvo/export/dto/request-export.dto.ts` —
 *   `@IsUUID() schoolId!`). Omitting schoolId would raise a 422.
 *
 * Mutation invariants (D-20, Phase 10.2-04 silent-4xx invariant):
 *  - onError → toast.error(<backend message> ?? fallback)
 *  - onSuccess → toast.success('Datenexport angestoßen') + invalidate jobs list
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

/**
 * Mirrors backend `ExportStatusResponseDto`
 * (apps/api/src/modules/dsgvo/export/dto/export-status-response.dto.ts).
 */
export interface DsgvoExportJobDto {
  id: string;
  personId: string | null;
  jobType: string;
  status: DsgvoJobStatus;
  resultData?: unknown;
  errorMessage?: string | null;
  createdAt: string;
}

/**
 * Backend `RequestExportDto` requires both personId and schoolId
 * (`@IsUUID() schoolId!`). Frontend MUST pass both.
 */
export interface RequestExportInput {
  personId: string;
  schoolId: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys

export const exportJobKeys = {
  all: ['dsgvo', 'export'] as const,
  job: (id: string) => [...exportJobKeys.all, id] as const,
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers

async function readErrorMessage(res: Response): Promise<string | null> {
  try {
    const err = await res.json();
    if (err && typeof err === 'object' && 'message' in err) {
      const m = (err as { message: unknown }).message;
      if (typeof m === 'string') return m;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// Hooks

/**
 * Live status polling for a single export job. Stops once the job reaches a
 * terminal state. NO toast on transient polling failures — UI-SPEC § Error
 * states demands inline `<InfoBanner variant=warn>` instead, rendered by the
 * caller via `query.isError`.
 */
export function useDsgvoExportJob(jobId: string | null) {
  return useQuery({
    queryKey: exportJobKeys.job(jobId ?? ''),
    queryFn: async (): Promise<DsgvoExportJobDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/export/${jobId}`);
      if (!res.ok) throw new Error('Failed to load export job');
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (q) =>
      isTerminal(q.state.data?.status) ? false : 2000,
    staleTime: 1_000,
  });
}

/**
 * POST /api/v1/dsgvo/export — kick off a BullMQ job.
 *
 * On success the dialog typically closes immediately and the user watches
 * progress in the JobsTab; the trigger does NOT optimistically render
 * anything (the BullMQ job is async and could fail).
 */
export function useRequestExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: RequestExportInput,
    ): Promise<DsgvoExportJobDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'Datenexport konnte nicht angestoßen werden');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Datenexport angestoßen');
      qc.invalidateQueries({ queryKey: dsgvoJobsKeys.all });
      qc.invalidateQueries({ queryKey: exportJobKeys.job(data.id) });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}
