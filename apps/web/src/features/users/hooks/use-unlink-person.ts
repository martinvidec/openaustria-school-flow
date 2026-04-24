import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import { UserApiError, readProblemDetail } from '../types';
import { usersKeys } from './use-users';

/**
 * Phase 13-02 USER-05 — unlink a Keycloak user from its Person record.
 * Hits `DELETE /api/v1/admin/users/:userId/link-person`. Idempotent.
 */
export function useUnlinkPerson(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/link-person`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
    },
    onSuccess: () => {
      toast.success('Verknüpfung entfernt');
      qc.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      qc.invalidateQueries({ queryKey: ['users'] });
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
