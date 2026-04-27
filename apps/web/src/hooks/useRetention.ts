import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

/**
 * Phase 15-05 hook: retention policy CRUD for /admin/dsgvo retention tab.
 *
 * Backend route paths (verified at apps/api/src/modules/dsgvo/retention/
 * retention.controller.ts):
 *   POST   /api/v1/dsgvo/retention                — create
 *   GET    /api/v1/dsgvo/retention/school/:schoolId — list per school
 *   PUT    /api/v1/dsgvo/retention/:id            — update retentionDays
 *   DELETE /api/v1/dsgvo/retention/:id            — remove (reverts to default)
 *
 * Update endpoint reads ONLY `retentionDays` from the body
 * (`@Body('retentionDays')`). Other fields in the patch are silently
 * ignored by the backend.
 *
 * Mutation invariants per D-20 + Phase 10.2-04: toast.error onError,
 * toast.success + invalidateQueries onSuccess.
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

export interface RetentionPolicyDto {
  id: string;
  schoolId: string;
  dataCategory: string;
  retentionDays: number;
}

export interface CreateRetentionPolicyInput {
  schoolId: string;
  dataCategory: string;
  retentionDays: number;
}

export interface UpdateRetentionPolicyInput {
  id: string;
  retentionDays: number;
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys

export const retentionKeys = {
  all: ['retention'] as const,
  list: (schoolId: string) => [...retentionKeys.all, schoolId] as const,
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

export function useRetentionPolicies(schoolId: string) {
  return useQuery({
    queryKey: retentionKeys.list(schoolId),
    queryFn: async (): Promise<RetentionPolicyDto[]> => {
      const res = await apiFetch(
        `/api/v1/dsgvo/retention/school/${encodeURIComponent(schoolId)}`,
      );
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'Failed to load retention policies');
      }
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });
}

export function useCreateRetentionPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: CreateRetentionPolicyInput,
    ): Promise<RetentionPolicyDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/retention`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(
          msg ?? 'Aufbewahrungsrichtlinie konnte nicht angelegt werden',
        );
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Aufbewahrungsrichtlinie angelegt');
      qc.invalidateQueries({ queryKey: retentionKeys.all });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}

export function useUpdateRetentionPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      retentionDays,
    }: UpdateRetentionPolicyInput): Promise<RetentionPolicyDto> => {
      // Backend uses PUT (verified at retention.controller.ts:30) and reads
      // only `retentionDays` from the body via @Body('retentionDays').
      // PATCH would return 405 Method Not Allowed.
      const res = await apiFetch(`/api/v1/dsgvo/retention/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ retentionDays }),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(
          msg ?? 'Aufbewahrungsrichtlinie konnte nicht aktualisiert werden',
        );
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Aufbewahrungsrichtlinie aktualisiert');
      qc.invalidateQueries({ queryKey: retentionKeys.all });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}

export function useDeleteRetentionPolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Body-less DELETE — apiFetch does not auto-set Content-Type when
      // there is no body, so Fastify-5 strict-JSON-parse cannot reject
      // (memory: project_apifetch_bodyless_delete_resolved).
      const res = await apiFetch(`/api/v1/dsgvo/retention/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const msg = await readErrorMessage(res);
        throw new Error(
          msg ?? 'Aufbewahrungsrichtlinie konnte nicht gelöscht werden',
        );
      }
    },
    onSuccess: () => {
      toast.success('Aufbewahrungsrichtlinie gelöscht');
      qc.invalidateQueries({ queryKey: retentionKeys.all });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}
