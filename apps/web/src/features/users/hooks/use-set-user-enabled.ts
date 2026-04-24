import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import {
  type UserDirectoryDetail,
  UserApiError,
  readProblemDetail,
} from '../types';
import { usersKeys } from './use-users';

/**
 * Phase 13-02 USER-04 — toggle Keycloak `enabled` flag.
 * Surfaces the canonical `User gesperrt` / `User reaktivieren` toast on
 * success per UI-SPEC §550.
 */
export function useSetUserEnabled(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { enabled: boolean }): Promise<UserDirectoryDetail> => {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/enabled`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.enabled ? 'User reaktiviert' : 'User gesperrt');
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: usersKeys.detail(userId) });
    },
    onError: (err: UserApiError | Error) => {
      // Silent-4XX-Invariante — every mutation surfaces an explicit toast.
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
