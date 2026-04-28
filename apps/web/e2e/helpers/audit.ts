/**
 * Phase 15-11 Wave-0 helper — audit-entry seeders for the AUDIT-VIEW E2E suite.
 *
 * AUDIT-VIEW-02 (drawer Vorzustand) has TWO branches that the spec must
 * exercise independently:
 *   1. Legacy entry (`before = NULL`) — the muted-banner copy from UI-SPEC.
 *      We trigger this via a SENSITIVE_READ on a mapped resource, which the
 *      AuditInterceptor logs WITHOUT a before-snapshot (reads never mutate,
 *      so there's no pre-state to capture — see audit.interceptor.ts).
 *   2. New entry (`before` populated) — the JsonTree branch. We trigger this
 *      via a PUT on a mapped resource (retention policy is in plan 15-01's
 *      RESOURCE_MODEL_MAP), which routes through AuditInterceptor's
 *      switchMap(captureBeforeState → handler) pipeline.
 *
 * Both helpers go through the live HTTP API so the recorded audit row is
 * indistinguishable from a real production write — direct Prisma writes
 * would bypass the interceptor and falsify the test contract.
 */
import type { APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';

const API_BASE = process.env.E2E_API_BASE ?? 'http://localhost:3000/api/v1';

async function authReq(
  request: APIRequestContext,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
) {
  const token = await getAdminToken(request);
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };
  const url = `${API_BASE}${path}`;
  const init = body !== undefined
    ? { headers: { ...headers, 'Content-Type': 'application/json' }, data: body }
    : { headers };

  let res;
  switch (method) {
    case 'GET':
      res = await request.get(url, init);
      break;
    case 'POST':
      res = await request.post(url, init);
      break;
    case 'PUT':
      res = await request.put(url, init);
      break;
    case 'DELETE':
      res = await request.delete(url, init);
      break;
  }
  if (!res.ok() && res.status() !== 404 && res.status() !== 409) {
    throw new Error(
      `${method} ${path} failed: ${res.status()} ${await res.text()}`,
    );
  }
  return res;
}

/**
 * Trigger a SENSITIVE_READ on a mapped resource (consent) so the
 * AuditInterceptor logs an entry WITHOUT a before-snapshot. Reads never
 * populate `before` (no pre-state to capture for a non-mutation), so this
 * is the cleanest way to produce a "legacy-style" row whose drawer renders
 * the muted banner copy from UI-SPEC § Empty states.
 *
 * Returns the id of the freshly-created audit entry so the spec can deep-
 * link the drawer via `[data-audit-id="${id}"]`.
 */
export async function seedAuditEntryLegacy(
  request: APIRequestContext,
  personId: string,
): Promise<{ id: string }> {
  // Capture the createdAt of the LAST existing read-on-consent row (if any)
  // so we can correlate the entry produced by THIS request. Polling for the
  // most-recent row is unreliable when the seed DB already has read entries.
  const before = await authReq(
    request,
    'GET',
    `/audit?action=read&resource=consent&limit=1`,
  );
  const beforeJson = await before.json();
  const beforeLatestId: string | undefined = beforeJson?.data?.[0]?.id;

  // Fire the SENSITIVE_READ — interceptor logs `action=read,resource=consent`.
  await authReq(request, 'GET', `/dsgvo/consent/person/${personId}`);

  // Poll the audit list until a NEW row appears (interceptor writes are
  // async — the read returns before the audit row hits Postgres in some
  // CI runs). Bounded retry — 5 attempts × 200ms = 1s ceiling.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await authReq(
      request,
      'GET',
      `/audit?action=read&resource=consent&limit=1`,
    );
    const json = await res.json();
    const row = json?.data?.[0];
    if (row && row.id !== beforeLatestId) {
      return { id: row.id as string };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    'seedAuditEntryLegacy: no NEW audit row produced — ' +
      'AuditInterceptor SENSITIVE_READ branch may not be wired for `consent`',
  );
}

/**
 * Trigger a PUT on a mapped resource (retention policy) so the
 * AuditInterceptor (plan 15-01) captures pre-state into `audit_entries.before`.
 *
 * Pre-condition: `params.retentionPolicyId` must exist for `params.schoolId`.
 * The retention controller's PUT signature is `{ retentionDays: number }`.
 *
 * Throws a clear error if the resulting audit row has `before = NULL` —
 * that means plan 15-01's interceptor refactor is not deployed in the test
 * environment, and the spec would otherwise produce a false-pass.
 */
export async function seedAuditEntryWithBefore(
  request: APIRequestContext,
  params: { schoolId: string; retentionPolicyId: string },
): Promise<{ id: string }> {
  // Capture the latest update-on-retention id (if any) for correlation.
  const before = await authReq(
    request,
    'GET',
    `/audit?action=update&resource=retention&limit=1`,
  );
  const beforeJson = await before.json();
  const beforeLatestId: string | undefined = beforeJson?.data?.[0]?.id;

  // Trigger the mutation — interceptor pipes through captureBeforeState.
  // Use a varying retentionDays so the row is materially different from
  // any previous run (avoids no-op writes that some ORMs short-circuit).
  const newRetentionDays = 100 + Math.floor(Math.random() * 900);
  await authReq(
    request,
    'PUT',
    `/dsgvo/retention/${params.retentionPolicyId}`,
    { retentionDays: newRetentionDays },
  );

  // Poll for the new audit row.
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await authReq(
      request,
      'GET',
      `/audit?action=update&resource=retention&limit=1`,
    );
    const json = await res.json();
    const row = json?.data?.[0];
    if (row && row.id !== beforeLatestId) {
      if (!row.before) {
        throw new Error(
          'seedAuditEntryWithBefore: row created but before is NULL — ' +
            'plan 15-01 interceptor refactor not deployed in this environment',
        );
      }
      return { id: row.id as string };
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(
    'seedAuditEntryWithBefore: no NEW audit row produced — ' +
      'AuditInterceptor mutation pipeline may not be wired for `retention`',
  );
}

/**
 * Inline retention-policy seeder for plan 15-11's detail spec when the
 * sibling `helpers/dsgvo.ts` (plan 15-10) hasn't landed in the worktree yet.
 *
 * Idempotent: GET-by-school first, returns the existing policy if the
 * dataCategory matches; otherwise POSTs a new one.
 */
export async function ensureRetentionPolicyForAudit(
  request: APIRequestContext,
  input: { schoolId: string; dataCategory: string; retentionDays: number },
): Promise<{ id: string; dataCategory: string; retentionDays: number }> {
  const list = await authReq(
    request,
    'GET',
    `/dsgvo/retention/school/${input.schoolId}`,
  );
  const existing = ((await list.json()) as Array<{
    id: string;
    dataCategory: string;
    retentionDays: number;
  }>).find((p) => p.dataCategory === input.dataCategory);
  if (existing) return existing;
  const created = await authReq(request, 'POST', `/dsgvo/retention`, input);
  return (await created.json()) as {
    id: string;
    dataCategory: string;
    retentionDays: number;
  };
}
