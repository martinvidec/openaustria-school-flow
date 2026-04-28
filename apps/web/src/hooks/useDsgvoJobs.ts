import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';

/**
 * Phase 15-08 Task 1: School-wide DSGVO jobs admin-list hook.
 *
 * Consumes the plan 15-04 backend endpoint `GET /api/v1/dsgvo/jobs` (D-23) —
 * tenant-scoped via required schoolId, admin-gated server-side. The DTO
 * field names match the URL search params (status / jobType / page / limit)
 * so frontend filters round-trip cleanly.
 *
 * Status terminal helper `isTerminal(...)` is the canonical predicate for
 * the BullMQ-polling pattern in plan 15-08 Tasks 2 (per UI-SPEC § BullMQ
 * polling, D-13/D-14): polling stops once status reaches COMPLETED or
 * FAILED. The Prisma DsgvoJobStatus enum has 4 values total — the
 * UI-SPEC's 5-state list with `cancelled` maps to a future enum extension.
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

/** Mirrors Prisma `DsgvoJobStatus` enum (apps/api/prisma/schema.prisma). */
export type DsgvoJobStatus = 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** Mirrors Prisma `DsgvoJobType` enum. */
export type DsgvoJobType =
  | 'DATA_EXPORT'
  | 'DATA_DELETION'
  | 'RETENTION_CLEANUP';

/**
 * Mirrors backend `DsgvoJob` Prisma model + `person` relation projection
 * shipped by plan 15-04's `DsgvoJobsService.findAllForAdmin`.
 */
export interface DsgvoJobWithPerson {
  id: string;
  schoolId: string;
  personId: string | null;
  jobType: DsgvoJobType;
  status: DsgvoJobStatus;
  bullmqJobId?: string | null;
  resultData?: unknown;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  person: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  } | null;
}

export interface DsgvoJobsQuery {
  schoolId: string;
  status?: DsgvoJobStatus;
  jobType?: DsgvoJobType;
  page?: number;
  limit?: number;
}

export interface PaginatedDsgvoJobs {
  data: DsgvoJobWithPerson[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys

export const dsgvoJobsKeys = {
  all: ['dsgvo-jobs'] as const,
  list: (q: DsgvoJobsQuery) => [...dsgvoJobsKeys.all, 'list', q] as const,
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers

function buildQueryString(q: DsgvoJobsQuery): string {
  const p = new URLSearchParams();
  p.set('schoolId', q.schoolId);
  if (q.status) p.set('status', q.status);
  if (q.jobType) p.set('jobType', q.jobType);
  if (q.page) p.set('page', String(q.page));
  if (q.limit) p.set('limit', String(q.limit));
  return p.toString();
}

// ──────────────────────────────────────────────────────────────────────────
// Hooks

/**
 * Admin-only paginated DSGVO-job list filtered by status / jobType.
 *
 * `staleTime: 2_000` keeps the manual `Aktualisieren` toolbar button on
 * JobsTab feeling responsive (refetch within window returns cached data
 * fast); JobsTab itself does NOT poll — only per-id hooks
 * (`useDsgvoExportJob`, `useDsgvoDeletionJob`) poll.
 */
export function useDsgvoJobs(filters: DsgvoJobsQuery) {
  return useQuery({
    queryKey: dsgvoJobsKeys.list(filters),
    queryFn: async (): Promise<PaginatedDsgvoJobs> => {
      const res = await apiFetch(
        `/api/v1/dsgvo/jobs?${buildQueryString(filters)}`,
      );
      if (!res.ok) throw new Error('Failed to load DSGVO jobs');
      return res.json();
    },
    enabled: !!filters.schoolId,
    staleTime: 2_000,
  });
}

/**
 * Terminal-status predicate for the BullMQ polling pattern (UI-SPEC § BullMQ
 * polling, D-13/D-14). Returns true when polling should stop.
 *
 * Terminal statuses: COMPLETED, FAILED. Note the Prisma enum has 4 values —
 * if a future migration adds `CANCELLED`, this helper should be extended.
 */
export function isTerminal(status: DsgvoJobStatus | undefined): boolean {
  return status === 'COMPLETED' || status === 'FAILED';
}
