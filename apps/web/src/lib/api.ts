import { keycloak } from './keycloak';

/**
 * Authenticated fetch wrapper that automatically refreshes Keycloak tokens
 * and sets the Authorization header.
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

  if (
    options?.method &&
    options.method !== 'GET' &&
    !headers.has('Content-Type')
  ) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}
