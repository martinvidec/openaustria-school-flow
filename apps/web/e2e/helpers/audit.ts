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
 * Return the id of an existing audit entry with `before = NULL` so the
 * drawer renders the muted-banner copy from UI-SPEC § Empty states.
 *
 * Strategy (D-09 / pragmatic choice): query for the latest
 * `action=create` row in the seed DB. POSTs by definition have no
 * pre-state (nothing to capture before the row was created), so every
 * `create` row stores `before = NULL`. We don't need to seed a new row
 * for the legacy branch — any existing create entry exercises the
 * same render path.
 *
 * Why not the originally-suggested SENSITIVE_READ trigger? A SENSITIVE_READ
 * row is logged with `before = NULL` (reads have no pre-state), but the
 * spec wants a row whose `before` is structurally NULL — `action=create`
 * achieves that with no environment dependencies. Either path produces a
 * valid legacy-banner row.
 *
 * `_personId` is accepted for backward-compat with the plan's call
 * signature and ignored — kept as a parameter so spec call sites stay
 * readable when the plan body is referenced.
 */
export async function seedAuditEntryLegacy(
  request: APIRequestContext,
  _personId: string,
): Promise<{ id: string }> {
  // Prefer an existing `create` row — POSTs have `before = NULL` by design.
  const res = await authReq(
    request,
    'GET',
    `/audit?action=create&limit=10`,
  );
  const json = await res.json();
  const rows: Array<{ id: string; before: unknown }> = json?.data ?? [];
  const legacyRow = rows.find((r) => !r.before);
  if (legacyRow) {
    return { id: legacyRow.id };
  }

  throw new Error(
    'seedAuditEntryLegacy: seed DB has zero `action=create` audit rows. ' +
      'Run prisma seed or trigger any school/teacher/student create through ' +
      'the UI before running this spec.',
  );
}

/**
 * Trigger a PUT on a mapped DSGVO resource so the AuditInterceptor
 * (plan 15-01 + 15-12 extractResource fix) captures pre-state into
 * `audit_entries.before`. Targets `PUT /api/v1/dsgvo/retention/:id`
 * because the retention controller has the simplest update DTO
 * (`{ retentionDays: number }`) and `retention` is in
 * RESOURCE_MODEL_MAP.
 *
 * Pre-15-12 history: this helper was rerouted to `PUT /schools/:id` as
 * a workaround for the extractResource bug (commits 5100d47 + f0b6a0d).
 * 15-12 fixed the root cause; this helper is now back on its proper
 * target so the round-trip proves the DSGVO mutation class works.
 *
 * Idempotency: ensures a retention policy row exists, captures its
 * current retentionDays, PUTs a different value, polls for the audit
 * row, then restores the original retentionDays in a best-effort
 * try/catch. The seed DB is unchanged across runs.
 *
 * `retentionPolicyId` is accepted for backwards-compat with plan-15-11
 * call signatures (currently NULL because admin-audit-log-detail.spec.ts
 * passes only `{ schoolId }`); when provided, that policy is used
 * instead of the ensure-helper.
 *
 * Throws if the resulting audit row has `before = NULL` — that means
 * the 15-12 extractResource fix is not deployed.
 */
export async function seedAuditEntryWithBefore(
  request: APIRequestContext,
  params: { schoolId: string; retentionPolicyId?: string },
): Promise<{ id: string }> {
  // Ensure a retention policy row to mutate.
  const policy = params.retentionPolicyId
    ? await (async () => {
        const r = await authReq(
          request,
          'GET',
          `/dsgvo/retention/school/${params.schoolId}`,
        );
        const rows = (await r.json()) as Array<{
          id: string;
          dataCategory: string;
          retentionDays: number;
        }>;
        const found = rows.find((p) => p.id === params.retentionPolicyId);
        if (!found) {
          throw new Error(
            `seedAuditEntryWithBefore: retentionPolicyId=${params.retentionPolicyId} not found for school=${params.schoolId}`,
          );
        }
        return found;
      })()
    : await ensureRetentionPolicyForAudit(request, {
        schoolId: params.schoolId,
        dataCategory: 'AUDIT_E2E',
        retentionDays: 365,
      });

  const originalRetentionDays = policy.retentionDays;
  const newRetentionDays =
    originalRetentionDays === 730 ? 1095 : 730;

  // Capture the latest update-on-retention id (if any) for correlation.
  const beforeRes = await authReq(
    request,
    'GET',
    `/audit?action=update&resource=retention&limit=1`,
  );
  const beforeJson = await beforeRes.json();
  const beforeLatestId: string | undefined = beforeJson?.data?.[0]?.id;

  // Trigger the mutation.
  await authReq(request, 'PUT', `/dsgvo/retention/${policy.id}`, {
    retentionDays: newRetentionDays,
  });

  // Poll for the new audit row triggered by THIS update.
  let newId: string | undefined;
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await authReq(
      request,
      'GET',
      `/audit?action=update&resource=retention&limit=1`,
    );
    const json = await res.json();
    const row = json?.data?.[0];
    if (row && row.id !== beforeLatestId) {
      if (!row.before) {
        // Restore the original retentionDays regardless before throwing.
        await authReq(request, 'PUT', `/dsgvo/retention/${policy.id}`, {
          retentionDays: originalRetentionDays,
        }).catch(() => undefined);
        throw new Error(
          'seedAuditEntryWithBefore: row created but before is NULL — ' +
            'plan 15-12 extractResource fix not deployed in this environment',
        );
      }
      newId = row.id as string;
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // Restore original retentionDays (best-effort — not blocking on failure).
  await authReq(request, 'PUT', `/dsgvo/retention/${policy.id}`, {
    retentionDays: originalRetentionDays,
  }).catch(() => undefined);

  if (!newId) {
    throw new Error(
      'seedAuditEntryWithBefore: no NEW audit row produced — ' +
        'AuditInterceptor mutation pipeline may not be wired for `retention` ' +
        '(check 15-12 DSGVO_SUB_RESOURCES set in audit.interceptor.ts)',
    );
  }
  return { id: newId };
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
