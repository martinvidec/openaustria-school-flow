/**
 * Phase 15-10 Wave-0 — DSGVO admin E2E seed + cleanup helpers.
 *
 * Five seed helpers + one bulk-cleanup helper that hit the live API via
 * authenticated requests (admin Keycloak token from `getAdminToken`).
 *
 * Naming convention — every entity created by this module prefixes its
 * identifying string with `e2e-15-` so the cleanup helper can sweep by
 * pattern without collateral damage:
 *
 *   - Retention.dataCategory   → `e2e-15-…`
 *   - DSFA.title               → `e2e-15-…`
 *   - VVZ.activityName         → `e2e-15-…`
 *
 * Idempotency: each seed helper checks for an existing match by the
 * unique-by-convention field and returns it if found, so re-runs of a
 * spec don't 409 on the second invocation. The cleanup helper is
 * non-blocking — failures are swallowed so a partially-broken backend
 * never blocks a green spec from proceeding to the next one.
 *
 * Consents are NOT deleted during cleanup — they're a state machine
 * (granted → withdrawn) and the existing consent record is preserved
 * across runs. The `seedConsent` helper therefore does NOT prefix
 * (consent uniqueness is `(personId, purpose)`, both supplied by the
 * caller — the test owner is responsible for picking a throwaway pair).
 */
import type { APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';

export const DSGVO_API =
  process.env.E2E_API_BASE ?? 'http://localhost:3000/api/v1';

export const DSGVO_E2E_PREFIX = 'e2e-15-';

async function authPost(
  request: APIRequestContext,
  path: string,
  body: unknown,
): Promise<unknown> {
  const token = await getAdminToken(request);
  const res = await request.post(`${DSGVO_API}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: body,
  });
  if (!res.ok()) {
    const text = await res.text().catch(() => '<no body>');
    throw new Error(`POST ${path} failed: ${res.status()} ${text}`);
  }
  return res.json();
}

async function authDelete(
  request: APIRequestContext,
  path: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const res = await request.delete(`${DSGVO_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok() && res.status() !== 404) {
    throw new Error(`DELETE ${path} failed: ${res.status()}`);
  }
}

async function authGet<T = unknown>(
  request: APIRequestContext,
  path: string,
): Promise<T> {
  const token = await getAdminToken(request);
  const res = await request.get(`${DSGVO_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok()) {
    throw new Error(`GET ${path} failed: ${res.status()}`);
  }
  return res.json() as Promise<T>;
}

// ── Consents ────────────────────────────────────────────────────────────

/**
 * Grants a consent record. Idempotent at the backend layer: the service
 * either returns the existing record (re-grant flow) or 409s; we treat
 * 409 as success. NOTE — consent records are NEVER deleted by
 * `cleanupAll` (they're state-managed; specs withdraw rather than
 * remove).
 *
 * CONTRACT — `personId` MUST be a UUID per `CreateConsentDto.@IsUUID()`.
 * Since Phase 15.1, seed Persons carry UUIDs (SEED_PERSON_*_UUID), so the
 * spec's `E2E_SEED_PERSON_ID` env var defaults to a valid seed UUID. The
 * non-UUID guard below remains for safety: returns `null` if a custom
 * non-UUID is passed in, so callers can soft-skip rather than 422.
 */
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function seedConsent(
  request: APIRequestContext,
  input: { personId: string; purpose: string },
): Promise<{
  id: string;
  personId: string;
  purpose: string;
  granted: boolean;
} | null> {
  if (!UUID_RE.test(input.personId)) {
    // The DTO `@IsUUID()` will 422 the request — return null so the
    // caller can soft-skip rather than crash. Hits the
    // historical seed-gap (project_seed_gap.md) where seed Persons
    // use stable static IDs instead of UUIDs.
    return null;
  }
  const token = await getAdminToken(request);
  const res = await request.post(`${DSGVO_API}/dsgvo/consent`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    // CreateConsentDto requires `granted: boolean` — default to true
    // (we're seeding a "granted" consent for filter + withdraw tests).
    data: { ...input, granted: true },
  });
  if (res.status() === 409) {
    // Already granted — fetch the existing record by person+purpose.
    const list = await authGet<unknown[]>(
      request,
      `/dsgvo/consent/person/${input.personId}`,
    );
    const found = (list as Array<{ purpose: string }>).find(
      (c) => c.purpose === input.purpose,
    );
    if (!found) {
      throw new Error(
        `seedConsent: 409 from POST /dsgvo/consent but no existing record found for ${input.personId}/${input.purpose}`,
      );
    }
    return found as {
      id: string;
      personId: string;
      purpose: string;
      granted: boolean;
    };
  }
  if (!res.ok()) {
    const text = await res.text().catch(() => '<no body>');
    throw new Error(`POST /dsgvo/consent failed: ${res.status()} ${text}`);
  }
  return (await res.json()) as {
    id: string;
    personId: string;
    purpose: string;
    granted: boolean;
  };
}

/**
 * Phase 15 backend DTOs (`CreateRetentionPolicyDto`, `CreateDsfaEntryDto`,
 * `CreateVvzEntryDto`, `QueryConsentAdminDto`) declare `@IsUUID()` on
 * `schoolId`. Phase 15.1 aligned `apps/api/prisma/seed.ts` to emit UUID
 * school + person IDs (SEED_SCHOOL_UUID etc.), so the historical seed-vs-DTO
 * mismatch is gone. This `isUuid` guard is retained as a defensive belt:
 * if a caller passes a custom non-UUID schoolId (e.g. ad-hoc debug runs),
 * the helper returns null instead of crashing on a 422.
 */
function isUuid(s: string): boolean {
  return UUID_RE.test(s);
}

// ── Retention ───────────────────────────────────────────────────────────

export async function seedRetentionPolicy(
  request: APIRequestContext,
  input: {
    schoolId: string;
    dataCategory: string;
    retentionDays: number;
  },
): Promise<{ id: string; dataCategory: string; retentionDays: number } | null> {
  // GET path-param endpoint accepts non-UUID schoolId (no @IsUUID on @Param).
  const list = await authGet<
    Array<{ id: string; dataCategory: string; retentionDays: number }>
  >(request, `/dsgvo/retention/school/${input.schoolId}`);
  const existing = list.find((p) => p.dataCategory === input.dataCategory);
  if (existing) return existing;
  // POST DTO requires UUID schoolId — soft-skip when the caller's
  // schoolId is the seed string.
  if (!isUuid(input.schoolId)) return null;
  return (await authPost(request, '/dsgvo/retention', input)) as {
    id: string;
    dataCategory: string;
    retentionDays: number;
  };
}

// ── DSFA ────────────────────────────────────────────────────────────────

export async function seedDsfaEntry(
  request: APIRequestContext,
  input: {
    schoolId: string;
    title: string;
    description: string;
    dataCategories: string[];
    riskAssessment?: string;
    mitigationMeasures?: string;
  },
): Promise<{ id: string; title: string } | null> {
  const list = await authGet<Array<{ id: string; title: string }>>(
    request,
    `/dsgvo/dsfa/dsfa/school/${input.schoolId}`,
  );
  const existing = list.find((d) => d.title === input.title);
  if (existing) return existing;
  if (!isUuid(input.schoolId)) return null;
  return (await authPost(request, '/dsgvo/dsfa/dsfa', input)) as {
    id: string;
    title: string;
  };
}

// ── VVZ ─────────────────────────────────────────────────────────────────

export async function seedVvzEntry(
  request: APIRequestContext,
  input: {
    schoolId: string;
    activityName: string;
    purpose: string;
    legalBasis: string;
    dataCategories: string[];
    affectedPersons: string[];
  },
): Promise<{ id: string; activityName: string } | null> {
  const list = await authGet<Array<{ id: string; activityName: string }>>(
    request,
    `/dsgvo/dsfa/vvz/school/${input.schoolId}`,
  );
  const existing = list.find((v) => v.activityName === input.activityName);
  if (existing) return existing;
  if (!isUuid(input.schoolId)) return null;
  return (await authPost(request, '/dsgvo/dsfa/vvz', input)) as {
    id: string;
    activityName: string;
  };
}

// ── Person lookup (for export / deletion specs) ────────────────────────

/**
 * Lookup helper for an existing seed Person by email. The admin DSGVO
 * specs that need a `personId` (export-job, deletion-confirm) accept
 * the UUID via env var (`E2E_SEED_PERSON_ID`); this helper exists for
 * future use when a flexible lookup-by-email pattern is wired.
 *
 * For Phase 15, the spec-friendly path is to provide both env vars
 * directly:
 *   E2E_SEED_PERSON_ID    — UUID of a throwaway seed person
 *   E2E_SEED_PERSON_EMAIL — email of the same person
 *
 * If `E2E_PERSON_LOOKUP_PATH` is set, we attempt a generic
 * /persons-style search; otherwise we throw a guidance error. This keeps
 * the helper future-proof without coupling Phase 15 specs to a route
 * that might not exist on every branch.
 */
export async function lookupPersonByEmail(
  request: APIRequestContext,
  input: { schoolId: string; email: string },
): Promise<{ id: string; email: string } | null> {
  const lookupPath = process.env.E2E_PERSON_LOOKUP_PATH;
  if (!lookupPath) return null;
  try {
    const list = await authGet<{ data?: unknown[] } | unknown[]>(
      request,
      `${lookupPath}?schoolId=${input.schoolId}&search=${encodeURIComponent(input.email)}`,
    );
    const arr = Array.isArray(list)
      ? list
      : ((list as { data?: unknown[] }).data ?? []);
    const found = (arr as Array<{ id: string; email?: string }>).find(
      (p) => p.email?.toLowerCase() === input.email.toLowerCase(),
    );
    return found ? { id: found.id, email: input.email } : null;
  } catch {
    return null;
  }
}

// ── Bulk cleanup ────────────────────────────────────────────────────────

/**
 * Bulk-cleanup helper. Deletes every retention/dsfa/vvz entity in the
 * supplied school whose identifying string starts with the
 * `e2e-15-` prefix. Run from `afterAll` of every spec.
 *
 * Order: retention → dsfa → vvz. No cross-FK dependency between these
 * three exists today, but we keep a deterministic order so partial
 * failures are easier to diagnose.
 *
 * Consents are NOT cleaned up (state-managed by withdraw, not delete).
 */
export async function cleanupAll(
  request: APIRequestContext,
  schoolId: string,
): Promise<void> {
  // Retention
  try {
    const list = await authGet<
      Array<{ id: string; dataCategory: string }>
    >(request, `/dsgvo/retention/school/${schoolId}`);
    for (const p of list) {
      if (
        typeof p.dataCategory === 'string' &&
        p.dataCategory.startsWith(DSGVO_E2E_PREFIX)
      ) {
        await authDelete(request, `/dsgvo/retention/${p.id}`);
      }
    }
  } catch {
    /* non-blocking — best-effort */
  }

  // DSFA
  try {
    const list = await authGet<Array<{ id: string; title: string }>>(
      request,
      `/dsgvo/dsfa/dsfa/school/${schoolId}`,
    );
    for (const d of list) {
      if (
        typeof d.title === 'string' &&
        d.title.startsWith(DSGVO_E2E_PREFIX)
      ) {
        await authDelete(request, `/dsgvo/dsfa/dsfa/${d.id}`);
      }
    }
  } catch {
    /* non-blocking */
  }

  // VVZ
  try {
    const list = await authGet<Array<{ id: string; activityName: string }>>(
      request,
      `/dsgvo/dsfa/vvz/school/${schoolId}`,
    );
    for (const v of list) {
      if (
        typeof v.activityName === 'string' &&
        v.activityName.startsWith(DSGVO_E2E_PREFIX)
      ) {
        await authDelete(request, `/dsgvo/dsfa/vvz/${v.id}`);
      }
    }
  } catch {
    /* non-blocking */
  }
}
