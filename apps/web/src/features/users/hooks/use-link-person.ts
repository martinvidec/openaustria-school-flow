import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';
import {
  type PersonType,
  UserApiError,
  readProblemDetail,
} from '../types';
import { usersKeys } from './use-users';

/**
 * Phase 13-02 USER-05 — link a Keycloak user to a Person record.
 *
 * Hits `POST /api/v1/admin/users/:userId/link-person`. The backend
 * may return RFC 9457 409 `schoolflow://errors/person-link-conflict`
 * (D-14) — the hook does NOT toast that specific error; the UI surfaces
 * it via `ReLinkConflictDialog` after catching the throw. All other
 * 4xx surface a destructive toast (Silent-4XX-Invariante).
 */
export function useLinkPerson(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      personType: PersonType;
      personId: string;
    }): Promise<{ person: { id: string; firstName: string; lastName: string; personType: string } }> => {
      const res = await apiFetch(`/api/v1/admin/users/${userId}/link-person`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new UserApiError(res.status, await readProblemDetail(res));
      return res.json();
    },
    onSuccess: () => {
      toast.success('Verknüpfung aktualisiert');
      qc.invalidateQueries({ queryKey: usersKeys.detail(userId) });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: UserApiError | Error) => {
      // Silent-4XX-Invariante. 409 link-conflict → caller (ReLinkConflictDialog)
      // re-throws to render the conflict resolution dialog.
      if (
        err instanceof UserApiError &&
        err.status === 409 &&
        err.problem.type === 'schoolflow://errors/person-link-conflict'
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
