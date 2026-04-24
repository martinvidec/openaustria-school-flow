import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { UserApiError, readProblemDetail } from '../types';

/**
 * Phase 13-02 USER-03 — delete a per-user ACL override.
 * Hits `DELETE /api/v1/admin/permission-overrides/:id`.
 */
export function useDeletePermissionOverride(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const res = await apiFetch(`/api/v1/admin/permission-overrides/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
    },
    onSuccess: () => {
      toast.success('Override gelöscht');
      qc.invalidateQueries({ queryKey: ['permission-overrides', userId] });
      qc.invalidateQueries({ queryKey: ['effective-permissions', userId] });
    },
    onError: (err: UserApiError | Error) => {
      // Silent-4XX-Invariante.
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
