import { keycloak } from './keycloak';
import { useSchoolContext } from '@/stores/school-context-store';

/**
 * Authenticated fetch wrapper that automatically refreshes Keycloak tokens
 * and sets the Authorization header.
 *
 * Issue #135 (ADR `docs/adr/0001-current-school-context.md`):
 * Also injects the current school context as an `X-School-Id` header for
 * every authenticated request. The header is read from
 * `useSchoolContext.getState().currentSchoolId` — populated from
 * `/api/v1/users/me` on session start. Backend `CurrentSchoolInterceptor`
 * validates the header against the user's Person memberships and 403s on
 * mismatch.
 */
export async function apiFetch(
  path: string,
  options?: RequestInit,
): Promise<Response> {
  // Ensure token is fresh (refresh if expiring within 30 seconds)
  await keycloak.updateToken(30);

  const url = path.startsWith('/api') ? path : `/api${path}`;

  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${keycloak.token}`);

  // Inject current school context on every request that doesn't already
  // carry one (caller-supplied wins so admin tooling can target other
  // schools explicitly).
  if (!headers.has('X-School-Id')) {
    const currentSchoolId = useSchoolContext.getState().currentSchoolId;
    if (currentSchoolId) {
      headers.set('X-School-Id', currentSchoolId);
    }
  }

  // Auto-set Content-Type for JSON bodies. Skip for FormData -- the browser
  // must set the multipart boundary automatically (file upload support).
  if (options?.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
