import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

/**
 * Phase 15-05 hook: VVZ entry CRUD for /admin/dsgvo dsfa-vvz tab (VVZ sub-tab).
 *
 * VVZ-CRUD is co-located with DSFA in the SAME NestJS controller per D-27
 * (apps/api/src/modules/dsgvo/dsfa/dsfa.controller.ts) — there is NO
 * separate vvz.controller.ts. Backend route paths:
 *   POST   /api/v1/dsgvo/dsfa/vvz                — create
 *   GET    /api/v1/dsgvo/dsfa/vvz/school/:schoolId — list per school
 *   PUT    /api/v1/dsgvo/dsfa/vvz/:id            — update
 *   DELETE /api/v1/dsgvo/dsfa/vvz/:id            — remove
 *
 * Mutation invariants per D-20 + Phase 10.2-04: toast.error onError,
 * toast.success + invalidateQueries onSuccess.
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

export interface VvzEntryDto {
  id: string;
  schoolId: string;
  activityName: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  affectedPersons: string[];
  retentionPeriod?: string | null;
  technicalMeasures?: string | null;
  organizationalMeasures?: string | null;
}

export interface CreateVvzInput {
  schoolId: string;
  activityName: string;
  purpose: string;
  legalBasis: string;
  dataCategories: string[];
  affectedPersons: string[];
  retentionPeriod?: string;
  technicalMeasures?: string;
  organizationalMeasures?: string;
}

export interface UpdateVvzInput {
  id: string;
  activityName?: string;
  purpose?: string;
  legalBasis?: string;
  dataCategories?: string[];
  affectedPersons?: string[];
  retentionPeriod?: string;
  technicalMeasures?: string;
  organizationalMeasures?: string;
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys

export const vvzKeys = {
  all: ['vvz'] as const,
  list: (schoolId: string) => [...vvzKeys.all, schoolId] as const,
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

export function useVvzEntries(schoolId: string) {
  return useQuery({
    queryKey: vvzKeys.list(schoolId),
    queryFn: async (): Promise<VvzEntryDto[]> => {
      const res = await apiFetch(
        `/api/v1/dsgvo/dsfa/vvz/school/${encodeURIComponent(schoolId)}`,
      );
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'Failed to load VVZ entries');
      }
      const json = await res.json();
      return Array.isArray(json) ? json : (json.data ?? []);
    },
    enabled: !!schoolId,
    staleTime: 30_000,
  });
}

export function useCreateVvz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateVvzInput): Promise<VvzEntryDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/dsfa/vvz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'VVZ-Eintrag konnte nicht angelegt werden');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('VVZ-Eintrag angelegt');
      qc.invalidateQueries({ queryKey: vvzKeys.all });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}

export function useUpdateVvz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...patch
    }: UpdateVvzInput): Promise<VvzEntryDto> => {
      // Backend uses PUT — verified at dsfa.controller.ts:68 (@Put('vvz/:id')).
      const res = await apiFetch(`/api/v1/dsgvo/dsfa/vvz/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'VVZ-Eintrag konnte nicht aktualisiert werden');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('VVZ-Eintrag aktualisiert');
      qc.invalidateQueries({ queryKey: vvzKeys.all });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}

export function useDeleteVvz() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // Body-less DELETE — no Content-Type per memory
      // project_apifetch_bodyless_delete_resolved.
      const res = await apiFetch(`/api/v1/dsgvo/dsfa/vvz/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok && res.status !== 204) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'VVZ-Eintrag konnte nicht gelöscht werden');
      }
    },
    onSuccess: () => {
      toast.success('VVZ-Eintrag gelöscht');
      qc.invalidateQueries({ queryKey: vvzKeys.all });
    },
    onError: (e: Error) =>
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.'),
  });
}
