import { z } from 'zod';

/**
 * Phase 13-01 USER-01 — GET /admin/users query parameters.
 *
 * Drives the hybrid KC+DB user directory listing in UserDirectoryService.
 * `role`/`linked`/`enabled` are applied in-memory AFTER the KC pagination
 * window because Keycloak's search API does not support these filters
 * natively; `meta.totalIsApproximate` is set to true when any of them
 * narrow the result set (RESEARCH Pitfall 5).
 *
 * `z.coerce.number()` is used so URL query strings (`?page=2&limit=50`)
 * parse cleanly without a custom transformer — the client can pass either
 * number or numeric-string and the schema normalises to number.
 */
export const keycloakUserQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(25),
  search: z.string().optional(),
  role: z.array(z.string()).optional(),
  linked: z.enum(['all', 'linked', 'unlinked']).default('all'),
  enabled: z.enum(['all', 'active', 'disabled']).default('all'),
});

export type KeycloakUserQueryInput = z.infer<typeof keycloakUserQuerySchema>;
