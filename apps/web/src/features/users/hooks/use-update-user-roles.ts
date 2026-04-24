import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { UserApiError, readProblemDetail } from '../types';
import { usersKeys } from './use-users';

/**
 * Phase 13-02 USER-02 — replace a user's role assignments.
 *
 * Hits `PUT /api/v1/admin/users/:userId/roles`. Backend may respond with
 * RFC 9457 409 `schoolflow://errors/last-admin-guard` when the change
 * would leave the school without an Admin (D-07). The hook does NOT
 * toast that specific error — UI surfaces it via `LastAdminGuardDialog`
 * with the AffectedEntitiesList. All other 4xx surface a destructive
 * toast (Silent-4XX-Invariante).
 */
export function useUpdateUserRoles(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { roleNames: string[] }): Promise<void> => {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/roles`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
    },
    onSuccess: () => {
      toast.success('Rollen aktualisiert');
      qc.invalidateQueries({ queryKey: ['user-roles', userId] });
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      qc.invalidateQueries({ queryKey: ['effective-permissions', userId] });
    },
    onError: (err: UserApiError | Error) => {
      // Silent-4XX-Invariante: explicit onError on every mutation.
      // Last-admin-guard 409 → swallow toast, dialog handles it.
      if (
        err instanceof UserApiError &&
        err.status === 409 &&
        err.problem.type === 'schoolflow://errors/last-admin-guard'
      ) {
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
