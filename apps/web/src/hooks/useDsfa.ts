import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

/**
 * Phase 15-05 hook: DSFA entry CRUD for /admin/dsgvo dsfa-vvz tab (DSFA sub-tab).
 *
 * Backend route paths (verified at apps/api/src/modules/dsgvo/dsfa/
 * dsfa.controller.ts — DSFA + VVZ co-located in the SAME controller per D-27):
 *   POST   /api/v1/dsgvo/dsfa/dsfa                — create
 *   GET    /api/v1/dsgvo/dsfa/dsfa/school/:schoolId — list per school
 *   PUT    /api/v1/dsgvo/dsfa/dsfa/:id            — update
 *   DELETE /api/v1/dsgvo/dsfa/dsfa/:id            — remove
 *
 * Mutation invariants per D-20 + Phase 10.2-04: toast.error onError,
 * toast.success + invalidateQueries onSuccess.
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

export interface DsfaEntryDto {
  id: string;
  schoolId: string;
  title: string;
  description: string;
  dataCategories: string[];
  riskAssessment?: string | null;
  mitigationMeasures?: string | null;
}

export interface CreateDsfaInput {
  schoolId: string;
  title: string;
  description: string;
  dataCategories: string[];
  riskAssessment?: string;
  mitigationMeasures?: string;
}

export interface UpdateDsfaInput {
  id: string;
  title?: string;
  description?: string;
  dataCategories?: string[];
  riskAssessment?: string;
  mitigationMeasures?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys

export const dsfaKeys = {
  all: ['dsfa'] as const,
  list: (schoolId: string) => [...dsfaKeys.all, schoolId] as const,
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

export function useDsfaEntries(schoolId: string) {
  return useQuery({
    queryKey: dsfaKeys.list(schoolId),
    queryFn: async (): Promise<DsfaEntryDto[]> => {
      const res = await apiFetch(
        `/api/v1/dsgvo/dsfa/dsfa/school/${encodeURIComponent(schoolId)}`,
      );
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'Failed to load DSFA entries');
      }
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });
}

export function useCreateDsfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDsfaInput): Promise<DsfaEntryDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/dsfa/dsfa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'DSFA konnte nicht angelegt werden');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('DSFA angelegt');
      qc.invalidateQueries({ queryKey: dsfaKeys.all });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}

export function useUpdateDsfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: UpdateDsfaInput): Promise<DsfaEntryDto> => {
      // Backend uses PUT — verified at dsfa.controller.ts:32 (@Put('dsfa/:id')).
      const res = await apiFetch(`/api/v1/dsgvo/dsfa/dsfa/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'DSFA konnte nicht aktualisiert werden');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('DSFA aktualisiert');
      qc.invalidateQueries({ queryKey: dsfaKeys.all });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}

export function useDeleteDsfa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Body-less DELETE — no Content-Type per memory
      // project_apifetch_bodyless_delete_resolved.
      const res = await apiFetch(`/api/v1/dsgvo/dsfa/dsfa/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'DSFA konnte nicht gelöscht werden');
      }
    },
    onSuccess: () => {
      toast.success('DSFA gelöscht');
      qc.invalidateQueries({ queryKey: dsfaKeys.all });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}
