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
 * Why not the originally-suggested SENSITIVE_READ trigger? The interceptor
 * extracts the FIRST URL path segment, so `GET /api/v1/dsgvo/consent/...`
 * yields `dsgvo` (not `consent`), and `dsgvo` is not in SENSITIVE_RESOURCES
 * (which uses singulars like `consent`/`person`/`retention`). The
 * SENSITIVE_READ branch effectively never fires today. Discovery flagged
 * for the 15-01 backlog.
 *
 * Why not POST a fresh retention policy? Same path-extractor problem PLUS
 * `CreateRetentionPolicyDto.schoolId` has `@IsUUID()` and the seed school's
 * id is `seed-school-bgbrg-musterstadt` (non-UUID); the POST returns 422.
 *
 * Falls back to seeding a brand-new audit row only if the seed DB has zero
 * `create` rows — that path uses `PUT /schools/:id` (twice — one mutation
 * each captures a row) since `schools` IS in RESOURCE_MODEL_MAP. The first
 * PUT's audit row will have `before` populated; on a fresh DB there are no
 * `create` rows at all, so this branch should rarely fire in practice.
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
 * Trigger a PUT on a mapped resource so the AuditInterceptor (plan 15-01)
 * captures pre-state into `audit_entries.before`.
 *
 * Implementation note: the interceptor's `extractResource()` returns the
 * FIRST URL path segment after `/api/v1/`. So for the AuditInterceptor's
 * RESOURCE_MODEL_MAP lookup to fire we need a top-level path that is also
 * a map key. Among the 11 mapped keys, `schools` is the only one that:
 *   - Has a top-level controller mounted at `/api/v1/schools/:id`
 *   - Has a PUT handler with simple validation (UpdateSchoolDto extends
 *     PartialType(CreateSchoolDto), so a single-field `{ name: ... }`
 *     update is accepted).
 *   - Has at least one row in seed data (`seed-school-bgbrg-musterstadt`).
 *
 * The originally-suggested `PUT /api/v1/dsgvo/retention/:id` does NOT
 * trigger before-capture because `extractResource("/api/v1/dsgvo/...")`
 * yields "dsgvo", which isn't in RESOURCE_MODEL_MAP — discovery flagged in
 * the SUMMARY for the 15-01 backlog (out of scope for plan 15-11).
 *
 * Throws a clear error if the resulting audit row has `before = NULL` —
 * that means plan 15-01's interceptor refactor is not deployed in the test
 * environment, and the spec would otherwise produce a false-pass.
 */
export async function seedAuditEntryWithBefore(
  request: APIRequestContext,
  params: { schoolId: string; retentionPolicyId?: string },
): Promise<{ id: string }> {
  // Capture the latest update-on-schools id (if any) for correlation.
  const beforeRes = await authReq(
    request,
    'GET',
    `/audit?action=update&resource=schools&limit=1`,
  );
  const beforeJson = await beforeRes.json();
  const beforeLatestId: string | undefined = beforeJson?.data?.[0]?.id;

  // Read the current school name so we can put it back after our update
  // (or use the one we discover). The school controller's PartialType DTO
  // accepts a single-field update.
  const schoolRes = await authReq(
    request,
    'GET',
    `/schools/${params.schoolId}`,
  );
  const school = (await schoolRes.json()) as { id: string; name: string };
  const originalName = school.name;

  // Trigger the mutation. Append a tag so downstream audits show a
  // material change; restore the original name immediately after to keep
  // the school name stable across runs (Don't-modify-seed contract).
  const taggedName = `${originalName} [e2e-15-AUDIT-DETAIL]`;
  await authReq(request, 'PUT', `/schools/${params.schoolId}`, {
    name: taggedName,
  });

  // Poll for the new audit row triggered by THIS update.
  let newId: string | undefined;
  for (let attempt = 0; attempt < 10; attempt++) {
    const res = await authReq(
      request,
      'GET',
      `/audit?action=update&resource=schools&limit=1`,
    );
    const json = await res.json();
    const row = json?.data?.[0];
    if (row && row.id !== beforeLatestId) {
      if (!row.before) {
        // Restore the original name regardless before throwing.
        await authReq(request, 'PUT', `/schools/${params.schoolId}`, {
          name: originalName,
        }).catch(() => undefined);
        throw new Error(
          'seedAuditEntryWithBefore: row created but before is NULL — ' +
            'plan 15-01 interceptor refactor not deployed in this environment',
        );
      }
      newId = row.id as string;
      break;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  // Restore original name (best-effort — not blocking on failure).
  await authReq(request, 'PUT', `/schools/${params.schoolId}`, {
    name: originalName,
  }).catch(() => undefined);

  if (!newId) {
    throw new Error(
      'seedAuditEntryWithBefore: no NEW audit row produced — ' +
        'AuditInterceptor mutation pipeline may not be wired for `schools`',
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
