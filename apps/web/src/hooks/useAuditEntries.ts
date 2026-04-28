import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Phase 15-09 hook: paginated query against `GET /api/v1/audit?…`
 * (Wave-1 backend extension shipped by plan 15-01 added the `action` filter
 * + `before` column; pagination + role-scoping pre-existed).
 *
 * Admin gate is enforced at the `/admin/audit-log` route level (D-22 / D-03);
 * the hook itself is non-gated so non-admin Schulleitung/Lehrer can also
 * use it through their own role-scoped result set in future surfaces.
 */

export type AuditAction = 'create' | 'update' | 'delete' | 'read';
export type AuditCategory = 'MUTATION' | 'SENSITIVE_READ';

export interface AuditEntryDto {
  id: string;
  userId: string;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  category: AuditCategory;
  metadata?: Record<string, unknown> | null;
  before?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  // Optional Person/User join — backend MAY include this in a follow-up
  // enrichment patch. The table renderer falls back to `userId` if absent.
  actor?: { id: string; email: string; username: string; roles: string[] };
}

export interface AuditFilters {
  startDate?: string; // YYYY-MM-DD (native <input type="date">) or ISO datetime
  endDate?: string;
  action?: AuditAction;
  resource?: string;
  userId?: string;
  category?: AuditCategory;
  page?: number;
  limit?: number;
}

export interface PaginatedAuditEntries {
  data: AuditEntryDto[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const auditKeys = {
  all: ['audit'] as const,
  list: (f: AuditFilters) => [...auditKeys.all, 'list', f] as const,
};

/**
 * Build the URL search-string for both `/audit` and `/audit/export.csv`.
 * Only emits keys whose values are defined — backend treats missing as
 * "no filter" rather than "match empty string".
 */
export function buildAuditQueryString(f: AuditFilters): string {
  const p = new URLSearchParams();
  if (f.startDate) p.set('startDate', f.startDate);
  if (f.endDate) p.set('endDate', f.endDate);
  if (f.action) p.set('action', f.action);
  if (f.resource) p.set('resource', f.resource);
  if (f.userId) p.set('userId', f.userId);
  if (f.category) p.set('category', f.category);
  if (f.page) p.set('page', String(f.page));
  if (f.limit) p.set('limit', String(f.limit));
  return p.toString();
}

export function useAuditEntries(filters: AuditFilters) {
  return useQuery({
    queryKey: auditKeys.list(filters),
    queryFn: async (): Promise<PaginatedAuditEntries> => {
      const qs = buildAuditQueryString({ limit: 25, ...filters });
      const res = await apiFetch(`/api/v1/audit?${qs}`);
      if (!res.ok) throw new Error('Failed to load audit entries');
      return res.json();
    },
    staleTime: 5_000,
  });
}
