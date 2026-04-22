import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Single Keycloak user entry (matches backend KeycloakUserResponseDto).
 */
export interface KeycloakUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  enabled: boolean;
  alreadyLinkedToPersonId?: string;
  alreadyLinkedToPersonName?: string;
}

/**
 * Debounced Keycloak user search by email fragment.
 *
 * The caller is expected to pass an already-debounced email string (300ms
 * per UI-SPEC §2.6.2). Query is disabled until ≥3 chars so we don't
 * spam the admin token-cache on every keystroke. Results cache for 30s
 * to keep repeat searches snappy.
 */
export function useKeycloakUsers({ email }: { email: string }) {
  return useQuery({
    queryKey: ['keycloak-users', email],
    enabled: email.length >= 3,
    staleTime: 30_000,
    queryFn: async (): Promise<KeycloakUser[]> => {
      const res = await apiFetch(
        `/api/v1/admin/keycloak/users?email=${encodeURIComponent(email)}`,
      );
      if (res.status === 404) return [];
      if (!res.ok) throw new Error('Keycloak-Suche fehlgeschlagen');
      return res.json();
    },
  });
}
