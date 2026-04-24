import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import {
  type PermissionOverride,
  UserApiError,
  readProblemDetail,
} from '../types';

/**
 * Phase 13-02 USER-03 — create per-user ACL override.
 *
 * Hits `POST /api/v1/admin/permission-overrides`. Backend translates a
 * P2002 unique-violation into RFC 9457 409
 * `schoolflow://errors/override-duplicate` — surfaced as the canonical
 * `Override existiert bereits` toast (UI-SPEC §213).
 */
export function useCreatePermissionOverride(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      userId: string;
      action: string;
      subject: string;
      granted: boolean;
      conditions: Record<string, unknown> | null;
      reason: string;
    }): Promise<PermissionOverride> => {
      const res = await apiFetch('/api/v1/admin/permission-overrides', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      toast.success('Override gespeichert');
      qc.invalidateQueries({ queryKey: ['permission-overrides', userId] });
      qc.invalidateQueries({ queryKey: ['effective-permissions', userId] });
    },
    onError: (err: UserApiError | Error) => {
      // Silent-4XX-Invariante.
      if (
        err instanceof UserApiError &&
        err.status === 409 &&
        err.problem.type === 'schoolflow://errors/override-duplicate'
      ) {
        toast.error('Override existiert bereits', {
          description:
            'Für diese Kombination aus Aktion und Ressource existiert bereits ein Override. Bearbeiten Sie den bestehenden Override statt einen neuen anzulegen.',
        });
        return;
      }
      const status = err instanceof UserApiError ? err.status : undefined;
      const title = err instanceof UserApiError ? err.problem.title : undefined;
      const detail = err instanceof UserApiError ? err.problem.detail : err.message;
      toast.error(title ?? 'Aktion nicht möglich', {
        description:
          detail ?? `Der Server hat die Anfrage abgelehnt (Status ${status ?? 'unknown'}).`,
      });
    },
  });
}
