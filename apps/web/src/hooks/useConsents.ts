import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiFetch } from '@/lib/api';

/**
 * Phase 15-05 hook: admin-filter list + grant/withdraw mutations for consents.
 *
 * Consumes the plan 15-03 backend endpoint `GET /api/v1/dsgvo/consent/admin`
 * which is admin-gated server-side (403 for non-admin) and tenant-scoped
 * via required schoolId. The DTO field names match the URL search params,
 * so frontend filters round-trip cleanly.
 *
 * Mutation invariants (D-20, Phase 10.2-04 silent-4xx invariant):
 *  - onError → toast.error(<backend message> ?? fallback)
 *  - onSuccess → toast.success(<verb-specific copy>) + invalidateQueries
 */

// ──────────────────────────────────────────────────────────────────────────
// Types

export type ConsentStatus = 'granted' | 'withdrawn' | 'expired';

/**
 * Mirrors backend Prisma `ProcessingPurpose` enum
 * (apps/api/prisma/schema.prisma) and `PROCESSING_PURPOSES` const in
 * apps/api/src/modules/dsgvo/consent/dto/create-consent.dto.ts:4-12.
 * DO NOT add fictional purposes (NEWSLETTER, KLASSENFOTO, …) — the real
 * values are German-cased and tied to school-context use cases.
 */
export type ProcessingPurpose =
  | 'STUNDENPLANERSTELLUNG'
  | 'KOMMUNIKATION'
  | 'NOTENVERARBEITUNG'
  | 'FOTOFREIGABE'
  | 'KONTAKTDATEN_WEITERGABE'
  | 'LERNPLATTFORM'
  | 'STATISTIK';

export interface PersonSummaryDto {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
}

export interface ConsentRecordDto {
  id: string;
  personId: string;
  purpose: ProcessingPurpose;
  granted: boolean;
  grantedAt?: string | null;
  withdrawnAt?: string | null;
  person?: PersonSummaryDto;
}

export interface ConsentAdminQuery {
  schoolId: string;
  purpose?: ProcessingPurpose;
  status?: ConsentStatus;
  personSearch?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedConsents {
  data: ConsentRecordDto[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface GrantConsentInput {
  personId: string;
  purpose: ProcessingPurpose;
  granted?: boolean;
  legalBasis?:
    | 'consent'
    | 'legal_obligation'
    | 'legitimate_interest'
    | 'contract'
    | 'vital_interest'
    | 'public_interest';
  version?: number;
}

export interface WithdrawConsentInput {
  personId: string;
  purpose: ProcessingPurpose;
}

// ──────────────────────────────────────────────────────────────────────────
// Query keys

export const consentKeys = {
  all: ['consents'] as const,
  admin: (q: ConsentAdminQuery) => [...consentKeys.all, 'admin', q] as const,
};

// ──────────────────────────────────────────────────────────────────────────
// Helpers

function buildQueryString(q: ConsentAdminQuery): string {
  const params = new URLSearchParams();
  params.set('schoolId', q.schoolId);
  if (q.purpose) params.set('purpose', q.purpose);
  if (q.status) params.set('status', q.status);
  if (q.personSearch) params.set('personSearch', q.personSearch);
  if (q.page) params.set('page', String(q.page));
  if (q.limit) params.set('limit', String(q.limit));
  return params.toString();
}

async function readErrorMessage(res: Response): Promise<string | null> {
  try {
    const err = await res.json();
    if (err && typeof err === 'object' && 'message' in err) {
      const m = (err as { message: unknown }).message;
      if (typeof m === 'string') return m;
    }
  } catch {
    /* not JSON */
  }
  return null;
}

// ──────────────────────────────────────────────────────────────────────────
// Hooks

/** Admin-only paginated consent list filtered by purpose / status / personSearch. */
export function useConsentsAdmin(filters: ConsentAdminQuery) {
  return useQuery({
    queryKey: consentKeys.admin(filters),
    queryFn: async (): Promise<PaginatedConsents> => {
      const qs = buildQueryString(filters);
      const res = await apiFetch(`/api/v1/dsgvo/consent/admin?${qs}`);
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'Failed to load consents');
      }
      return res.json();
    },
    enabled: !!filters.schoolId,
    staleTime: 5_000,
  });
}

/** Grant consent for a person + purpose (POST /api/v1/dsgvo/consent). */
export function useGrantConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: GrantConsentInput): Promise<ConsentRecordDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/consent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ granted: true, ...input }),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'Einwilligung konnte nicht erteilt werden');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Einwilligung erteilt');
      qc.invalidateQueries({ queryKey: consentKeys.all });
    },
    onError: (e: Error) => {
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.');
    },
  });
}

/** Withdraw consent for a person + purpose (POST /api/v1/dsgvo/consent/withdraw). */
export function useWithdrawConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (
      input: WithdrawConsentInput,
    ): Promise<ConsentRecordDto> => {
      const res = await apiFetch(`/api/v1/dsgvo/consent/withdraw`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) {
        const msg = await readErrorMessage(res);
        throw new Error(msg ?? 'Einwilligung konnte nicht widerrufen werden');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Einwilligung widerrufen');
      qc.invalidateQueries({ queryKey: consentKeys.all });
    },
    onError: (e: Error) => {
      toast.error(e.message ?? 'Aktion fehlgeschlagen. Bitte erneut versuchen.');
    },
  });
}
