import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import {
  isTerminal,
  dsgvoJobsKeys,
  type DsgvoJobStatus,
} from './useDsgvoJobs';

/**
 * Phase 15-08 Task 2 (deletion half): per-id polling + trigger mutation for
 * Art. 17 anonymization / deletion.
 *
 * - `useDsgvoDeletionJob(jobId)` polls `GET /api/v1/dsgvo/deletion/:id` every
 *   2 seconds until the job hits a terminal state (COMPLETED / FAILED) per
 *   UI-SPEC § BullMQ polling (D-13/D-14).
 * - `useRequestDeletion()` POSTs `/api/v1/dsgvo/deletion` with the backend's
 *   required `{ personId, schoolId }` shape. The plan prose listed only
 *   `personId` — verified at execution-time the DTO REQUIRES schoolId
 *   (`apps/api/src/modules/dsgvo/deletion/dto/request-deletion.dto.ts`).
 *
 * Mutation invariants (D-20):
 *  - onError → toast.error(<backend message> ?? fallback)
 *  - onSuccess → toast.success('Löschauftrag angestoßen') + invalidate jobs list
 *
 * Token-validation lives in `RequestDeletionDialog.tsx` (Task 4) — it is
 * NOT enforced here so that the trigger hook stays a thin transport layer.
 * Backend additionally requires admin role + valid personId via Person
 * tenant guards.
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

/**
 * Mirrors backend `DeletionStatusResponseDto`
 * (apps/api/src/modules/dsgvo/deletion/dto/deletion-status-response.dto.ts).
 */
export interface DsgvoDeletionJobDto {
  id: string;
  personId: string | null;
  jobType: string;
  status: DsgvoJobStatus;
  errorMessage?: string | null;
  createdAt: string;
}

/**
 * Backend `RequestDeletionDto` requires both personId and schoolId.
 * `reason` is NOT part of the current DTO — documented as deferred in
 * 15-08 SUMMARY (form field for it would be silently dropped by NestJS
 * `whitelist: true` or trip a 422).
 */
export interface RequestDeletionInput {
  personId: string;
  schoolId: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys

export const deletionJobKeys = {
  all: ['dsgvo', 'deletion'] as const,
  job: (id: string) => [...deletionJobKeys.all, id] as const,
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
 * Live status polling for a single deletion job. Stops once the job reaches
 * a terminal state. NO toast on transient polling failures — caller renders
 * an inline warn banner via `query.isError` per UI-SPEC § Error states.
 */
export function useDsgvoDeletionJob(jobId: string | null) {
  return useQuery({
    queryKey: deletionJobKeys.job(jobId ?? ''),
    queryFn: async (): Promise<DsgvoDeletionJobDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/deletion/${jobId}`);
      if (!res.ok) throw new Error('Failed to load deletion job');
      return res.json();
    },
    enabled: !!jobId,
    refetchInterval: (q) =>
      isTerminal(q.state.data?.status) ? false : 2000,
    staleTime: 1_000,
  });
}

/**
 * POST /api/v1/dsgvo/deletion — kick off a BullMQ anonymization job.
 *
 * IRREVERSIBLE — the dialog (Task 4) gates this call behind a 2-step
 * confirmation with email-token strict-equal (UI-SPEC § Destructive
 * confirmations Art. 17 row, D-19). Do NOT call this hook from anywhere
 * other than `RequestDeletionDialog.tsx`.
 */
export function useRequestDeletion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: RequestDeletionInput,
    ): Promise<DsgvoDeletionJobDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/deletion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'Löschauftrag konnte nicht angestoßen werden');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Löschauftrag angestoßen');
      qc.invalidateQueries({ queryKey: dsgvoJobsKeys.all });
      qc.invalidateQueries({ queryKey: deletionJobKeys.job(data.id) });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}
