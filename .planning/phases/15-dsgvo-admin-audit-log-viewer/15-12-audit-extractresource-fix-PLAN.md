---
phase: 15
plan: 12
type: execute
wave: 4
depends_on: []
gap_closure: true
files_modified:
  - apps/api/src/modules/audit/audit.interceptor.ts
  - apps/api/src/modules/audit/audit.interceptor.spec.ts
  - apps/api/src/modules/audit/audit.service.ts
  - apps/web/e2e/helpers/audit.ts
  - apps/web/e2e/admin-audit-log-detail.spec.ts
autonomous: true
requirements:
  - AUDIT-VIEW-01
  - AUDIT-VIEW-02
requirements_addressed:
  - AUDIT-VIEW-01
  - AUDIT-VIEW-02
tags: [phase-15, audit, dsgvo, interceptor, gap-closure, e2e]

must_haves:
  truths:
    - "AuditInterceptor.extractResource() returns the SUB-resource (consent | retention | dsfa | vvz | export | deletion | jobs) for any /api/v1/dsgvo/<sub>/... URL — never the literal string 'dsgvo'"
    - "AuditInterceptor.extractResource() still returns the first segment for non-DSGVO routes (e.g. /api/v1/schools/:id → 'schools', /api/v1/audit → 'audit') — the DSGVO branch must NOT regress existing routes"
    - "RESOURCE_MODEL_MAP['retention'|'consent'|'dsfa'|'vvz'] is hit when the matching DSGVO mutation lands, so AuditEntry.before is populated for every PUT/PATCH/DELETE on a mapped DSGVO resource (closes the AUDIT-VIEW-02 Vorzustand-for-DSGVO gap)"
    - "SENSITIVE_RESOURCES contains every DSGVO sub-resource that should produce SENSITIVE_READ rows: existing entries (consent, export, person, retention) PLUS the additions dsfa, vvz, deletion"
    - "audit.interceptor.spec.ts asserts at least one URL per DSGVO sub-resource AND at least two non-DSGVO regression cases — extending (not replacing) the existing 7-case suite"
    - "apps/web/e2e/helpers/audit.ts seedAuditEntryWithBefore is reverted from the PUT /schools/:id workaround back to PUT /api/v1/dsgvo/retention/:id, and the comments referencing the extractResource limitation are removed (workaround landed in commits 5100d47 + f0b6a0d)"
    - "apps/web/e2e/admin-audit-log-detail.spec.ts 'new entry with before populated shows JSON tree' navigates with `?action=update&resource=retention` (not &resource=schools), and the comment block referencing the extractResource workaround is removed"
    - "Re-running the audit-log E2E suite (admin-audit-log-detail.spec.ts) against the live stack produces a fresh row visible at /admin/audit-log with resource='retention' and a JsonTree-rendered Vorzustand panel — NO muted 'Vorzustand wurde nicht erfasst' banner"
  artifacts:
    - path: apps/api/src/modules/audit/audit.interceptor.ts
      provides: "Patched extractResource() that detects /api/v1/dsgvo/<sub>/... and returns <sub>"
      contains: "/api/v1/dsgvo/"
    - path: apps/api/src/modules/audit/audit.interceptor.spec.ts
      provides: "URL parsing test cases for each DSGVO sub-resource + non-DSGVO regression cases"
      contains: "extractResource"
    - path: apps/api/src/modules/audit/audit.service.ts
      provides: "SENSITIVE_RESOURCES extended with dsfa, vvz, deletion"
      contains: "'dsfa'"
    - path: apps/web/e2e/helpers/audit.ts
      provides: "seedAuditEntryWithBefore reverted to PUT /api/v1/dsgvo/retention/:id"
      contains: "/dsgvo/retention/"
    - path: apps/web/e2e/admin-audit-log-detail.spec.ts
      provides: "Detail spec navigates to ?action=update&resource=retention for the before-populated branch"
      contains: "resource=retention"
  key_links:
    - from: apps/api/src/modules/audit/audit.interceptor.ts (extractResource)
      to: apps/api/src/modules/audit/audit.interceptor.ts (RESOURCE_MODEL_MAP)
      via: "extractResource('/api/v1/dsgvo/retention/:id') === 'retention' is a key in RESOURCE_MODEL_MAP → captureBeforeState() reads prisma.retentionPolicy.findUnique()"
      pattern: "RESOURCE_MODEL_MAP\\[resource\\]"
    - from: apps/api/src/modules/audit/audit.interceptor.ts (intercept)
      to: apps/api/src/modules/audit/audit.service.ts (SENSITIVE_RESOURCES)
      via: "SENSITIVE_RESOURCES.includes(resource as any) gates SENSITIVE_READ logging — must include the new sub-resource names so DSGVO reads produce audit rows"
      pattern: "SENSITIVE_RESOURCES\\.includes"
    - from: apps/web/e2e/helpers/audit.ts (seedAuditEntryWithBefore)
      to: apps/api/src/modules/dsgvo/retention (PUT /dsgvo/retention/:id)
      via: "Helper PUTs the live retention endpoint; interceptor now resolves resource='retention' (not 'dsgvo') so before-snapshot is captured"
      pattern: "PUT.*\\/dsgvo\\/retention\\/"
---

<objective>
Close the single blocking gap from `15-VERIFICATION.md` (Truth #5 ✗ FAILED): `AuditInterceptor.extractResource()` (apps/api/src/modules/audit/audit.interceptor.ts:165-173) returns the literal `'dsgvo'` for every `/api/v1/dsgvo/<sub>/...` URL. This structurally bypasses pre-state capture (D-10) for the entire DSGVO mutation class, hides DSGVO reads from SENSITIVE_READ logging, and breaks the Subject filter axis of AUDIT-VIEW-01 (admin filter by `resource=consent|retention|dsfa|vvz` returns zero rows).

Purpose: AUDIT-VIEW-02 (Before/After diff) and the Subject portion of AUDIT-VIEW-01 must work for DSGVO mutations — they were the highest-leverage requirements of Phase 15 and the most security-relevant. The fix is a 5-line patch in `extractResource()` plus a SENSITIVE_RESOURCES extension plus reverting the 15-11 helper workaround so the round-trip is proven by the existing E2E spec.

Output:
1. Patched `extractResource()` that walks past `/dsgvo/` for known sub-resources.
2. Extended `audit.interceptor.spec.ts` covering each DSGVO sub-resource URL + non-DSGVO regression cases.
3. `SENSITIVE_RESOURCES` extended with the missing sub-resources (dsfa, vvz, deletion).
4. `seedAuditEntryWithBefore` reverted to the original `PUT /api/v1/dsgvo/retention/:id` target so the AUDIT-VIEW-02 detail spec proves the DSGVO round-trip.
5. `admin-audit-log-detail.spec.ts` updated to filter by `resource=retention` (not `resource=schools`) for the before-populated branch.

Out of scope (deferred per VERIFICATION.md):
- Seed-data UUID alignment (DSGVO `@IsUUID` DTOs vs. seed-school-bgbrg-musterstadt). Defer to Phase 16 / dedicated cleanup.
- Stale JSDoc comments in DsgvoTabs.tsx:13 + ConsentsTab.tsx:38.
- Backfill of historical audit rows currently labeled `resource='dsgvo'` (compliance reporting can correlate forward-only — out of scope for this hotfix).
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@.planning/ROADMAP.md
@.planning/REQUIREMENTS.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-RESEARCH.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-VERIFICATION.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-VALIDATION.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-01-SUMMARY.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-11-SUMMARY.md
@CLAUDE.md

<interfaces>
<!-- Authoritative current shape of touched files. Executor uses these directly — no codebase exploration needed. -->

CURRENT — `apps/api/src/modules/audit/audit.interceptor.ts` lines 161-173 (the bug):
```typescript
/**
 * Extract resource name from URL path.
 * Expects format: /api/v1/{resource}/... or /{resource}/...
 */
private extractResource(url: string): string {
  // Try /api/v1/{resource} first
  const apiMatch = url.match(/\/api\/v1\/([^/?]+)/);
  if (apiMatch) return apiMatch[1];

  // Fallback: first path segment after leading slash
  const segments = url.split('?')[0].split('/').filter(Boolean);
  return segments[0] || 'unknown';
}
```

CURRENT — `apps/api/src/modules/audit/audit.interceptor.ts` lines 25-37 (the map this method feeds):
```typescript
const RESOURCE_MODEL_MAP: Record<string, string> = {
  consent: 'consentRecord',
  retention: 'retentionPolicy',
  dsfa: 'dsfaEntry',
  vvz: 'vvzEntry',
  schools: 'school',
  students: 'student',
  teachers: 'teacher',
  classes: 'schoolClass',
  subjects: 'subject',
  rooms: 'room',
  resources: 'resource',
};
```

CURRENT — `apps/api/src/modules/audit/audit.service.ts` lines 7-10 (SENSITIVE_RESOURCES — note dsfa, vvz, deletion are MISSING):
```typescript
export const SENSITIVE_RESOURCES = [
  'grades', 'student', 'teacher', 'user',
  'consent', 'export', 'person', 'retention',
] as const;
```

CURRENT — `apps/web/e2e/helpers/audit.ts` lines 141-211 (seedAuditEntryWithBefore — workaround using /schools/:id, MUST be reverted to /dsgvo/retention/:id):
```typescript
export async function seedAuditEntryWithBefore(
  request: APIRequestContext,
  params: { schoolId: string; retentionPolicyId?: string },
): Promise<{ id: string }> {
  // ...captures latest update-on-schools row, GETs the school, PUTs a tagged name,
  // polls /audit?action=update&resource=schools&limit=1 for the new row,
  // restores the original name. Comments reference the extractResource bug.
}
```

CURRENT — `apps/web/e2e/admin-audit-log-detail.spec.ts` lines 71-105 (uses resource=schools as workaround — MUST become resource=retention):
```typescript
test('new entry with before populated shows JSON tree', async ({ page, request }) => {
  const { id } = await seedAuditEntryWithBefore(request, { schoolId: SCHOOL_ID });
  await loginAsAdmin(page);
  await page.goto('/admin/audit-log?action=update&resource=schools'); // <-- becomes resource=retention
  // ... drawer assertions ...
});
```

CURRENT — `apps/web/e2e/helpers/audit.ts` lines 220-242 (existing inline retention-policy seeder — REUSE, do not duplicate):
```typescript
export async function ensureRetentionPolicyForAudit(
  request: APIRequestContext,
  input: { schoolId: string; dataCategory: string; retentionDays: number },
): Promise<{ id: string; dataCategory: string; retentionDays: number }>;
```
</interfaces>

<gap_summary>
From `15-VERIFICATION.md` Truth #5 (✗ FAILED) and `gaps[0].missing`:

The interceptor's `extractResource(url)` (audit.interceptor.ts lines 165-173) walks the FIRST segment after `/api/v1/`. For namespaced DSGVO routes (`/api/v1/dsgvo/consent/*`, `/api/v1/dsgvo/retention/*`, `/api/v1/dsgvo/dsfa/*`, `/api/v1/dsgvo/vvz/*`, `/api/v1/dsgvo/export`, `/api/v1/dsgvo/deletion/*`, `/api/v1/dsgvo/jobs`) this returns `'dsgvo'`.

Three concrete consequences this gap-closure plan eliminates:
1. `RESOURCE_MODEL_MAP['dsgvo']` is undefined → `before` snapshot NEVER captured for DSGVO mutations (defeats plan 15-01 D-10 for the largest mutation class in Phase 15).
2. `'dsgvo'` is not in `SENSITIVE_RESOURCES` → SENSITIVE_READ rows never produced for DSGVO reads.
3. Admin Subject filter (`?resource=consent|retention|dsfa|vvz`) returns ZERO rows (every DSGVO row is bucketed under `resource='dsgvo'`).

Direct evidence: plan 15-11's `seedAuditEntryWithBefore` had to reroute from `PUT /api/v1/dsgvo/retention/:id` to `PUT /api/v1/schools/:id` to populate `before` (commits 5100d47 + f0b6a0d). That workaround is reverted by Task 4.
</gap_summary>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Patch AuditInterceptor.extractResource() to walk past /dsgvo/ for known sub-resources</name>
  <files>apps/api/src/modules/audit/audit.interceptor.ts</files>

  <read_first>
    - apps/api/src/modules/audit/audit.interceptor.ts (lines 1-194 — ALL — the file is small enough to read once; pay particular attention to lines 25-37 RESOURCE_MODEL_MAP and lines 161-173 extractResource)
    - apps/api/src/modules/audit/audit.service.ts lines 1-30 (to confirm exported SENSITIVE_RESOURCES shape — also touched in Task 3)
    - apps/api/src/modules/dsgvo/dsgvo.module.ts (to confirm the @Controller('dsgvo/<sub>') prefix pattern; the @Controller('dsgvo/jobs') is at line 21 of dsgvo-jobs.controller.ts per VERIFICATION.md)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-VERIFICATION.md (frontmatter `gaps[0].missing` — the prescriptive list)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md (D-10 — pre-state capture intent)
  </read_first>

  <behavior>
    - Test 1: `extractResource('/api/v1/dsgvo/consent/grant')` → `'consent'` (NOT `'dsgvo'`)
    - Test 2: `extractResource('/api/v1/dsgvo/retention/uuid-123')` → `'retention'`
    - Test 3: `extractResource('/api/v1/dsgvo/dsfa/uuid-123')` → `'dsfa'`
    - Test 4: `extractResource('/api/v1/dsgvo/vvz/uuid-123')` → `'vvz'`
    - Test 5: `extractResource('/api/v1/dsgvo/export')` → `'export'`
    - Test 6: `extractResource('/api/v1/dsgvo/export/uuid-123')` → `'export'`
    - Test 7: `extractResource('/api/v1/dsgvo/deletion/uuid-123')` → `'deletion'`
    - Test 8: `extractResource('/api/v1/dsgvo/jobs')` → `'jobs'`
    - Test 9 (regression): `extractResource('/api/v1/schools/uuid-123')` → `'schools'`
    - Test 10 (regression): `extractResource('/api/v1/audit')` → `'audit'`
    - Test 11 (regression): `extractResource('/api/v1/dsgvo')` → `'dsgvo'` (no sub-segment, fall through to current behavior — this defends the only remaining "bare /dsgvo" call)
    - Test 12 (regression): `extractResource('/api/v1/dsgvo/something-unknown/x')` → `'dsgvo'` (unknown sub-resource is NOT auto-promoted; only the 7 known sub-resource names are walked past — this prevents accidental new-route silent-misclassification)
  </behavior>

  <action>
Patch `apps/api/src/modules/audit/audit.interceptor.ts`. Replace the entire `extractResource(url: string): string` method (current location lines 161-173) with the implementation below. Place a `const DSGVO_SUB_RESOURCES` set ABOVE the class definition (next to `RESOURCE_MODEL_MAP` at line 25), so it stays grouped with the other URL-routing constants.

1. Add this constant directly under the existing `RESOURCE_MODEL_MAP` definition (after line 37 in the current file):

```typescript
/**
 * Known DSGVO sub-resources mounted under `/api/v1/dsgvo/<sub>/...`.
 *
 * `extractResource()` walks past the `dsgvo` prefix when (and only when) the
 * second segment matches one of these names. Unknown second segments fall
 * back to `'dsgvo'` so a brand-new sub-resource route is NEVER silently
 * misclassified into the wrong RESOURCE_MODEL_MAP entry — when a new sub
 * lands, add it here AND to RESOURCE_MODEL_MAP/SENSITIVE_RESOURCES as
 * appropriate (see audit.service.ts).
 *
 * Phase 15 gap-closure (15-12) — fixes VERIFICATION.md Truth #5:
 * before this set existed, every /api/v1/dsgvo/<sub>/... URL resolved to
 * `'dsgvo'`, which is NOT in RESOURCE_MODEL_MAP, so AuditEntry.before was
 * never captured for DSGVO mutations.
 */
const DSGVO_SUB_RESOURCES = new Set<string>([
  'consent',
  'retention',
  'dsfa',
  'vvz',
  'export',
  'deletion',
  'jobs',
]);
```

2. Replace the `extractResource` method (current lines 161-173) with:

```typescript
/**
 * Extract resource name from URL path.
 *
 * Recognised shapes:
 *   /api/v1/dsgvo/<sub>/...   → <sub>   (when <sub> is in DSGVO_SUB_RESOURCES)
 *   /api/v1/dsgvo             → 'dsgvo' (no sub-segment)
 *   /api/v1/dsgvo/<unknown>/… → 'dsgvo' (unknown sub — defensive fallback)
 *   /api/v1/{resource}/...    → {resource}
 *   /{resource}/...           → {resource}
 *   (empty)                   → 'unknown'
 *
 * The DSGVO branch fires BEFORE the generic /api/v1/<segment> branch so
 * namespaced sub-resources (consent / retention / dsfa / vvz / export /
 * deletion / jobs) resolve to their concrete names, not the literal
 * 'dsgvo' bucket.
 */
private extractResource(url: string): string {
  // DSGVO sub-resource walk — handles `/api/v1/dsgvo/<sub>/...` BEFORE the
  // generic first-segment match (15-12 gap-closure).
  const dsgvoMatch = url.match(/\/api\/v1\/dsgvo\/([^/?]+)/);
  if (dsgvoMatch && DSGVO_SUB_RESOURCES.has(dsgvoMatch[1])) {
    return dsgvoMatch[1];
  }

  // Generic /api/v1/{resource} branch (covers /api/v1/dsgvo as resource='dsgvo'
  // when no recognised sub-segment is present, plus all non-DSGVO routes).
  const apiMatch = url.match(/\/api\/v1\/([^/?]+)/);
  if (apiMatch) return apiMatch[1];

  // Fallback: first path segment after leading slash.
  const segments = url.split('?')[0].split('/').filter(Boolean);
  return segments[0] || 'unknown';
}
```

3. Do NOT change anything else in the file. Imports stay as-is. RESOURCE_MODEL_MAP stays as-is. The `intercept()` method, `captureBeforeState()`, and `sanitizeBody()` are unchanged.

4. Hard rule (CLAUDE.md): NO Prisma schema changes in this plan. NO migration files. The only DB-touching code (`captureBeforeState`) was already shipped in plan 15-01 — this plan only changes URL parsing.
  </action>

  <verify>
    <automated>cd apps/api && pnpm exec vitest run src/modules/audit/audit.interceptor.spec.ts</automated>
  </verify>

  <acceptance_criteria>
    - `grep -n "DSGVO_SUB_RESOURCES" apps/api/src/modules/audit/audit.interceptor.ts` returns at least 2 hits (the const declaration + the `.has(...)` use)
    - `grep -n "/api/v1/dsgvo/" apps/api/src/modules/audit/audit.interceptor.ts` returns at least 1 hit (the regex literal in extractResource)
    - `grep -cE "'consent'|'retention'|'dsfa'|'vvz'|'export'|'deletion'|'jobs'" apps/api/src/modules/audit/audit.interceptor.ts` returns at least 7 (the 7 sub-resources are listed in the new set; pre-existing RESOURCE_MODEL_MAP also references some of them — count is allowed to be higher)
    - `grep -cE "^ *(import|const|class|@Injectable)" apps/api/src/modules/audit/audit.interceptor.ts` shows the file still compiles syntactically (rough sanity)
    - File diff vs. HEAD touches ONLY `apps/api/src/modules/audit/audit.interceptor.ts` (no schema.prisma, no migration) — verify with `git diff --name-only HEAD apps/api/src/modules/audit/audit.interceptor.ts` lists exactly that file
    - Existing 7 vitest cases in `audit.interceptor.spec.ts` continue to pass after the patch (regression — these were green pre-fix because the existing tests exercise `/api/v1/retention/r1` and `/api/v1/consent/c1`, NOT the namespaced `/api/v1/dsgvo/...` paths the bug affects). Run command in `<verify>`.
  </acceptance_criteria>

  <done>
    Patched `extractResource()` resolves all 7 DSGVO sub-resources via the new DSGVO_SUB_RESOURCES set; existing 7 spec cases still pass; no other file modified in this task.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Extend audit.interceptor.spec.ts with DSGVO sub-resource URL parsing cases + non-DSGVO regression cases</name>
  <files>apps/api/src/modules/audit/audit.interceptor.spec.ts</files>

  <read_first>
    - apps/api/src/modules/audit/audit.interceptor.spec.ts (lines 1-162 — ALL — file is 162 lines, single read)
    - apps/api/src/modules/audit/audit.interceptor.ts (specifically the AFTER-Task-1 shape: extractResource + DSGVO_SUB_RESOURCES)
    - apps/api/src/modules/audit/audit.service.ts lines 7-10 (to know which sub-resources are in SENSITIVE_RESOURCES post-Task-3)
  </read_first>

  <behavior>
    Add a new `describe('extractResource URL parsing — DSGVO sub-resource walk', () => { ... })` block to the existing spec file (do NOT replace any existing tests). The block contains 12 `it(...)` cases. Each invokes the interceptor against a synthetic context and asserts the `resource` field passed to `auditService.log()` (for mutation cases) or asserts via a small lookup helper that calls `extractResource` directly through a typed accessor.

    Because `extractResource` is a `private` method, drive it through the public `intercept()` path: feed a PUT request with `params: { id: 'x1' }`, capture the `auditService.log` call argument, and assert `arg.resource`. For the GET-only / non-mutation regression cases, use a method=`GET` request on a sub-resource that IS sensitive post-Task-3 (e.g. `/api/v1/dsgvo/retention/x` is sensitive once 'retention' stays in SENSITIVE_RESOURCES) — those will produce a SENSITIVE_READ row whose `resource` field can be asserted.

    For non-mutation, non-sensitive cases (e.g. /api/v1/audit reads), the interceptor logs nothing — for those, expose a tiny test-only accessor by casting: `(interceptor as any).extractResource('/api/v1/audit')`. The cast is acceptable in a vitest spec — the goal is contract testing, not API design.

    Required test cases (each a separate `it(...)`):

    - Test 1 — DSGVO consent: PUT /api/v1/dsgvo/consent/grant with id=grant → log.resource === 'consent'
    - Test 2 — DSGVO retention: PUT /api/v1/dsgvo/retention/uuid-123 with id='uuid-123' → log.resource === 'retention' AND prisma.retentionPolicy.findUnique called with { where: { id: 'uuid-123' } }
    - Test 3 — DSGVO dsfa: PUT /api/v1/dsgvo/dsfa/uuid-123 with id='uuid-123' → log.resource === 'dsfa'
    - Test 4 — DSGVO vvz: PUT /api/v1/dsgvo/vvz/uuid-123 with id='uuid-123' → log.resource === 'vvz'
    - Test 5 — DSGVO export (POST, no id): POST /api/v1/dsgvo/export → log.resource === 'export'
    - Test 6 — DSGVO export with id (POST): POST /api/v1/dsgvo/export/uuid-123 → log.resource === 'export'
    - Test 7 — DSGVO deletion: POST /api/v1/dsgvo/deletion/uuid-123 → log.resource === 'deletion'
    - Test 8 — DSGVO jobs read: via cast `(interceptor as any).extractResource('/api/v1/dsgvo/jobs') === 'jobs'` (GETting jobs would produce a SENSITIVE_READ row only if 'jobs' is in SENSITIVE_RESOURCES — Task 3 explicitly does NOT add 'jobs', so use the cast accessor)
    - Test 9 — Non-DSGVO regression: via cast `(interceptor as any).extractResource('/api/v1/schools/uuid-123') === 'schools'`
    - Test 10 — Non-DSGVO regression: via cast `(interceptor as any).extractResource('/api/v1/audit') === 'audit'`
    - Test 11 — Bare DSGVO regression: via cast `(interceptor as any).extractResource('/api/v1/dsgvo') === 'dsgvo'` (no sub-segment)
    - Test 12 — Unknown DSGVO sub: via cast `(interceptor as any).extractResource('/api/v1/dsgvo/foo/x') === 'dsgvo'` (defensive fallback — unknown subs are NOT auto-promoted)
  </behavior>

  <action>
Edit `apps/api/src/modules/audit/audit.interceptor.spec.ts`.

1. KEEP all 7 existing `it(...)` cases unchanged (lines 40-162). Do NOT remove the existing top-level `describe('AuditInterceptor', () => { ... })` or `beforeEach`.

2. INSIDE the existing top-level `describe`, AFTER the last existing `it(...)` (i.e. after the `'preserves metadata.body shape for POST and skips DB lookup'` case at line 143), add a NEW nested `describe` block. Mirror the existing `prisma` setup (it already mocks `retentionPolicy.findUnique` and `consentRecord.findUnique`); extend the `beforeEach` mocks if a new test needs additional mocks (specifically, add `dsfaEntry.findUnique` and `vvzEntry.findUnique` for Tests 3 and 4):

```typescript
describe('extractResource URL parsing — DSGVO sub-resource walk (15-12)', () => {
  beforeEach(() => {
    // Extend the per-test prisma mock with DSGVO sub-resource delegates that
    // the existing top-level beforeEach does not cover.
    prisma.dsfaEntry = { findUnique: vi.fn().mockResolvedValue(null) };
    prisma.vvzEntry = { findUnique: vi.fn().mockResolvedValue(null) };
  });

  it('walks past dsgvo for /api/v1/dsgvo/consent/grant → resource=consent', async () => {
    prisma.consentRecord.findUnique.mockResolvedValue({ id: 'grant', granted: false });
    await firstValueFrom(
      interceptor.intercept(
        ctx('PUT', '/api/v1/dsgvo/consent/grant', { id: 'grant' }, { granted: true }),
        { handle: () => of({ id: 'grant' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'consent' }),
    );
  });

  it('walks past dsgvo for /api/v1/dsgvo/retention/:id → resource=retention + prisma.retentionPolicy.findUnique fired', async () => {
    prisma.retentionPolicy.findUnique.mockResolvedValue({ id: 'uuid-123', dataCategory: 'X', retentionDays: 365 });
    await firstValueFrom(
      interceptor.intercept(
        ctx('PUT', '/api/v1/dsgvo/retention/uuid-123', { id: 'uuid-123' }, { retentionDays: 730 }),
        { handle: () => of({ id: 'uuid-123' }) },
      ),
    );
    expect(prisma.retentionPolicy.findUnique).toHaveBeenCalledWith({ where: { id: 'uuid-123' } });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'retention', resourceId: 'uuid-123' }),
    );
  });

  it('walks past dsgvo for /api/v1/dsgvo/dsfa/:id → resource=dsfa', async () => {
    await firstValueFrom(
      interceptor.intercept(
        ctx('PUT', '/api/v1/dsgvo/dsfa/uuid-123', { id: 'uuid-123' }, { name: 'X' }),
        { handle: () => of({ id: 'uuid-123' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'dsfa' }),
    );
  });

  it('walks past dsgvo for /api/v1/dsgvo/vvz/:id → resource=vvz', async () => {
    await firstValueFrom(
      interceptor.intercept(
        ctx('PUT', '/api/v1/dsgvo/vvz/uuid-123', { id: 'uuid-123' }, { name: 'X' }),
        { handle: () => of({ id: 'uuid-123' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'vvz' }),
    );
  });

  it('walks past dsgvo for POST /api/v1/dsgvo/export → resource=export', async () => {
    await firstValueFrom(
      interceptor.intercept(
        ctx('POST', '/api/v1/dsgvo/export', undefined, { personId: 'p1', schoolId: 's1' }),
        { handle: () => of({ id: 'job-1' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'export', action: 'create' }),
    );
  });

  it('walks past dsgvo for POST /api/v1/dsgvo/export/:id → resource=export', async () => {
    await firstValueFrom(
      interceptor.intercept(
        ctx('POST', '/api/v1/dsgvo/export/uuid-123', undefined, { foo: 1 }),
        { handle: () => of({ id: 'job-2' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'export' }),
    );
  });

  it('walks past dsgvo for POST /api/v1/dsgvo/deletion/:id → resource=deletion', async () => {
    await firstValueFrom(
      interceptor.intercept(
        ctx('POST', '/api/v1/dsgvo/deletion/uuid-123', undefined, { confirmation: 'X' }),
        { handle: () => of({ id: 'job-3' }) },
      ),
    );
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ resource: 'deletion' }),
    );
  });

  it('extractResource(/api/v1/dsgvo/jobs) === "jobs"', () => {
    expect((interceptor as any).extractResource('/api/v1/dsgvo/jobs')).toBe('jobs');
  });

  it('non-DSGVO regression: extractResource(/api/v1/schools/uuid-123) === "schools"', () => {
    expect((interceptor as any).extractResource('/api/v1/schools/uuid-123')).toBe('schools');
  });

  it('non-DSGVO regression: extractResource(/api/v1/audit) === "audit"', () => {
    expect((interceptor as any).extractResource('/api/v1/audit')).toBe('audit');
  });

  it('bare /api/v1/dsgvo (no sub-segment) → resource=dsgvo (defensive fallback)', () => {
    expect((interceptor as any).extractResource('/api/v1/dsgvo')).toBe('dsgvo');
  });

  it('unknown DSGVO sub-resource → resource=dsgvo (NOT auto-promoted)', () => {
    expect((interceptor as any).extractResource('/api/v1/dsgvo/foo/x')).toBe('dsgvo');
  });
});
```

3. Note: vitest's `describe` blocks nest cleanly inside the existing `describe('AuditInterceptor', ...)`. The shared `interceptor`, `prisma`, `auditService`, and `ctx(...)` from the outer `beforeEach` (line 12-22) are in scope.

4. Do NOT add `expect.assertions(...)` or `--coverage`-only assertions. Keep the style identical to the existing 7 cases (`expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({...}))`).
  </action>

  <verify>
    <automated>cd apps/api && pnpm exec vitest run src/modules/audit/audit.interceptor.spec.ts</automated>
  </verify>

  <acceptance_criteria>
    - `pnpm exec vitest run apps/api/src/modules/audit/audit.interceptor.spec.ts --reporter=basic` reports at least 19 passing tests (7 original + 12 new) and 0 failures
    - `grep -c "it('" apps/api/src/modules/audit/audit.interceptor.spec.ts` returns at least 19 (existing 7 + 12 new)
    - `grep -c "DSGVO sub-resource walk" apps/api/src/modules/audit/audit.interceptor.spec.ts` returns 1 (the new nested describe block)
    - All 12 expected URLs literally appear in the spec file: `grep -c "/api/v1/dsgvo/consent/grant\|/api/v1/dsgvo/retention/uuid-123\|/api/v1/dsgvo/dsfa/uuid-123\|/api/v1/dsgvo/vvz/uuid-123\|/api/v1/dsgvo/export\|/api/v1/dsgvo/deletion/uuid-123\|/api/v1/dsgvo/jobs\|/api/v1/dsgvo/foo/x\|/api/v1/schools/uuid-123\|/api/v1/audit\b" apps/api/src/modules/audit/audit.interceptor.spec.ts` returns at least 10 (the URLs are quoted strings, not all 12 distinct because some appear multiple times)
    - File diff vs. HEAD touches ONLY `apps/api/src/modules/audit/audit.interceptor.spec.ts`
  </acceptance_criteria>

  <done>
    All 19+ vitest cases pass on `apps/api/src/modules/audit/audit.interceptor.spec.ts`. The 12 new cases prove the DSGVO sub-resource walk works and that non-DSGVO routes do NOT regress.
  </done>
</task>

<task type="auto">
  <name>Task 3: Extend SENSITIVE_RESOURCES in audit.service.ts with dsfa, vvz, deletion</name>
  <files>apps/api/src/modules/audit/audit.service.ts</files>

  <read_first>
    - apps/api/src/modules/audit/audit.service.ts lines 1-30 (the SENSITIVE_RESOURCES export at line 7-10 — before Task 3 it lists: 'grades', 'student', 'teacher', 'user', 'consent', 'export', 'person', 'retention'. Missing: 'dsfa', 'vvz', 'deletion'.)
    - apps/api/src/modules/audit/audit.interceptor.ts lines 25-37 (RESOURCE_MODEL_MAP — confirms dsfa/vvz are mapped; deletion is NOT mapped because it has no Prisma model — that is intentional because deletion is a job, not a row)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-CONTEXT.md (D-10 — pre-state capture intent for sensitive resources)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-VERIFICATION.md (frontmatter `gaps[0].missing` — confirms the SENSITIVE_RESOURCES extension is part of the gap)
  </read_first>

  <action>
1. Open `apps/api/src/modules/audit/audit.service.ts`.

2. Replace the `SENSITIVE_RESOURCES` constant (lines 7-10 in the current file) with the version below — adds `'dsfa'`, `'vvz'`, `'deletion'` to the existing list. Do NOT remove or reorder existing entries; APPEND only. The comment is updated to reflect the addition.

CURRENT (DO NOT KEEP — lines 7-10):
```typescript
// Sensitive resources that trigger read logging (D-05)
// Phase 2 additions: consent, export, person, retention (DSGVO-sensitive data)
export const SENSITIVE_RESOURCES = [
  'grades', 'student', 'teacher', 'user',
  'consent', 'export', 'person', 'retention',
] as const;
```

NEW (REPLACE WITH):
```typescript
// Sensitive resources that trigger SENSITIVE_READ logging (D-05).
// Phase 2 additions:  consent, export, person, retention.
// Phase 15-12 additions: dsfa, vvz, deletion (matches the DSGVO sub-resources
// resolved by AuditInterceptor.extractResource via DSGVO_SUB_RESOURCES set).
//
// 'jobs' is INTENTIONALLY OMITTED — the Jobs tab GETs are admin-list reads
// of opaque job metadata and do not warrant a per-fetch SENSITIVE_READ row.
export const SENSITIVE_RESOURCES = [
  'grades', 'student', 'teacher', 'user',
  'consent', 'export', 'person', 'retention',
  'dsfa', 'vvz', 'deletion',
] as const;
```

3. Do NOT modify any other line in `audit.service.ts`. Do NOT modify the type derived from `as const` — it widens automatically.

4. Verify there is no other consumer that switches on the literal union of `SENSITIVE_RESOURCES`. Run `grep -rn "SENSITIVE_RESOURCES" apps/api/src` — if any consumer pattern-matches against `typeof SENSITIVE_RESOURCES[number]` and would silently break on the wider type, surface that as a blocker. (Plan author has audited at planning time: only `audit.interceptor.ts:115` uses `SENSITIVE_RESOURCES.includes(resource as any)` — `as any` cast tolerates the wider literal type.)
  </action>

  <verify>
    <automated>cd apps/api && pnpm exec vitest run src/modules/audit/</automated>
  </verify>

  <acceptance_criteria>
    - `grep -E "'dsfa'|'vvz'|'deletion'" apps/api/src/modules/audit/audit.service.ts | wc -l` returns at least 3 (the three new entries)
    - `grep -A 3 "export const SENSITIVE_RESOURCES" apps/api/src/modules/audit/audit.service.ts | grep -cE "'dsfa'|'vvz'|'deletion'"` returns at least 3 (the additions are inside the SENSITIVE_RESOURCES literal, not somewhere else in the file)
    - All 64+ existing audit-module vitest tests still pass (regression — `pnpm exec vitest run apps/api/src/modules/audit/` reports 0 failures)
    - File diff vs. HEAD touches ONLY `apps/api/src/modules/audit/audit.service.ts`
    - `grep -rn "SENSITIVE_RESOURCES" apps/api/src` shows the only consumer is `audit.interceptor.ts` (`SENSITIVE_RESOURCES.includes(resource as any)`) — confirms no type-narrowing consumer was broken
  </acceptance_criteria>

  <done>
    SENSITIVE_RESOURCES contains 'dsfa', 'vvz', 'deletion' on top of the existing 8 entries; all audit-module vitest tests still pass; no other consumer broke.
  </done>
</task>

<task type="auto">
  <name>Task 4: Revert seedAuditEntryWithBefore to PUT /api/v1/dsgvo/retention/:id and update admin-audit-log-detail.spec.ts to filter by resource=retention</name>
  <files>apps/web/e2e/helpers/audit.ts, apps/web/e2e/admin-audit-log-detail.spec.ts</files>

  <read_first>
    - apps/web/e2e/helpers/audit.ts (lines 1-243 — ALL — file is 243 lines, single read; pay attention to the block that PUTs /schools/:id and the docstring referencing the extractResource bug)
    - apps/web/e2e/admin-audit-log-detail.spec.ts (lines 1-107 — ALL — file is 107 lines, single read)
    - apps/web/e2e/helpers/login.ts (to confirm getAdminToken signature)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-11-SUMMARY.md (to understand WHY the workaround was introduced — the root cause is now fixed by Tasks 1-3)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-VERIFICATION.md (gaps[0].missing item 4)
    - apps/api/src/modules/dsgvo/retention/retention.controller.ts (to confirm the live PUT path is `/dsgvo/retention/:id` — the controller mounts at /dsgvo/retention via the dsgvo.module.ts wiring)
    - Recent commits: `git log --oneline -5 apps/web/e2e/helpers/audit.ts apps/web/e2e/admin-audit-log-detail.spec.ts` (commits 5100d47 and f0b6a0d are the workaround landings — the diff shows what to invert)
  </read_first>

  <action>
This task has TWO file edits. Both are reverts of the workaround introduced in commits `5100d47` and `f0b6a0d`.

### Edit A — `apps/web/e2e/helpers/audit.ts`

Replace the entire `seedAuditEntryWithBefore` function (currently lines 118-212) with the version below. The new helper:
- Takes `{ schoolId, retentionPolicyId? }` (signature unchanged — backwards compatible)
- Uses `ensureRetentionPolicyForAudit` (already exported from this file, lines 220-242) to guarantee a retention policy row exists
- Issues `PUT /api/v1/dsgvo/retention/:id` with a small `{ retentionDays: <new value> }` payload
- Polls `/audit?action=update&resource=retention&limit=1` for the new row
- Restores the original `retentionDays` after capture (idempotency contract)
- Throws if the new audit row's `before` is NULL — defensive guard for any future regression of Task 1

REPLACE the full block from line 118 (the JSDoc `/** Trigger a PUT on a mapped resource so the AuditInterceptor (plan 15-01) ...`) through line 212 (the closing brace of `seedAuditEntryWithBefore`) WITH:

```typescript
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
```

Leave `seedAuditEntryLegacy` (lines 94-116) and `ensureRetentionPolicyForAudit` (lines 220-242) UNCHANGED. Leave `authReq` (lines 24-60) UNCHANGED.

Also UPDATE the comment block in `seedAuditEntryLegacy` (lines 73-92) — it currently references the extractResource bug that is now fixed. Replace the paragraph starting "Why not the originally-suggested SENSITIVE_READ trigger? ..." with:

```typescript
 * Why not the originally-suggested SENSITIVE_READ trigger? A SENSITIVE_READ
 * row is logged with `before = NULL` (reads have no pre-state), but the
 * spec wants a row whose `before` is structurally NULL — `action=create`
 * achieves that with no environment dependencies. Either path produces a
 * valid legacy-banner row.
```

(The original text referenced "the interceptor extracts the FIRST URL path segment, so /api/v1/dsgvo/consent/... yields 'dsgvo'" — that's no longer true post-15-12; remove that paragraph.)

### Edit B — `apps/web/e2e/admin-audit-log-detail.spec.ts`

In `apps/web/e2e/admin-audit-log-detail.spec.ts`, change the second test (lines 71-105 — `'new entry with before populated shows JSON tree'`) to navigate to `/admin/audit-log?action=update&resource=retention` instead of `?action=update&resource=schools`. ALSO update the comment block (lines 75-83) to remove the workaround explanation.

REPLACE the test body (current lines 71-105) with:

```typescript
  test('new entry with before populated shows JSON tree', async ({
    page,
    request,
  }) => {
    // PUT a retention policy's retentionDays so the interceptor's
    // RESOURCE_MODEL_MAP (`retention` → `retentionPolicy`) captures
    // pre-state into audit_entries.before. The helper restores the
    // original value automatically (15-12 round-trip — was rerouted to
    // /schools/:id pre-15-12 due to the extractResource bug).
    const { id } = await seedAuditEntryWithBefore(request, {
      schoolId: SCHOOL_ID,
    });

    await loginAsAdmin(page);
    await page.goto('/admin/audit-log?action=update&resource=retention');

    const row = page.locator(`[data-audit-id="${id}"]`);
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole('button', { name: 'Detail öffnen' }).click();

    // Vorzustand section renders a JsonTree (`.font-mono` node) — the muted
    // banner MUST NOT appear for a before-populated row.
    await expect(
      page.getByRole('heading', { name: 'Vorzustand' }),
    ).toBeVisible();
    await expect(page.getByText(LEGACY_BANNER_COPY)).not.toBeVisible();

    // The JsonTree primitive renders nodes with `font-mono text-xs`. Scope to
    // the dialog so we don't accidentally match other font-mono text on the
    // page (e.g. resource-id column in the table behind the drawer overlay).
    const drawer = page.getByRole('dialog');
    await expect(drawer.locator('.font-mono').first()).toBeVisible();
  });
```

Leave the first test (`'legacy entry (before=NULL) shows muted banner verbatim'`) UNCHANGED — it tests the legacy branch, which is independent of the extractResource fix.

NOTE on env: the new helper requires a UUID `schoolId` because `CreateRetentionPolicyDto.schoolId` has `@IsUUID()`. The seed-default `seed-school-bgbrg-musterstadt` will fail validation. The spec already documents this with `process.env.E2E_SCHOOL_ID` override at line 33 — keep that contract. If the live stack still has the seed-default, the spec will throw in the helper's `ensureRetentionPolicyForAudit` POST with 422 — that is the EXPECTED behavior per VERIFICATION.md deferred-item #1 (seed-data UUID alignment is Phase 16 / dedicated cleanup). The spec author should set `E2E_SCHOOL_ID` to a UUID-keyed school in CI; until then, this spec joins the 12/20 soft-skip family flagged in plan 15-10.
  </action>

  <verify>
    <automated>cd apps/web && pnpm exec tsc --noEmit -p tsconfig.json</automated>
  </verify>

  <acceptance_criteria>
    - `grep -c "/dsgvo/retention/" apps/web/e2e/helpers/audit.ts` returns at least 3 (the new PUT calls and the GET-list call in the helper)
    - `grep -c "/schools/" apps/web/e2e/helpers/audit.ts` returns 0 inside the `seedAuditEntryWithBefore` body — `git grep -n "/schools/" apps/web/e2e/helpers/audit.ts` shows zero matches (no remaining workaround references). NOTE: ensureRetentionPolicyForAudit uses `/dsgvo/retention/school/${schoolId}` — that's a DIFFERENT path (it's `/school/<id>` under retention, not `/schools/<id>`); the absence check is for the bare `/schools/` prefix.
    - `grep -c "extractResource" apps/web/e2e/helpers/audit.ts` returns at most 1 (the new helper docstring may reference the fix; the OLD references explaining the bug are removed)
    - `grep -c "resource=retention" apps/web/e2e/admin-audit-log-detail.spec.ts` returns at least 1 (the new navigate URL)
    - `grep -c "resource=schools" apps/web/e2e/admin-audit-log-detail.spec.ts` returns 0 (the workaround URL is removed)
    - `pnpm exec tsc --noEmit -p apps/web/tsconfig.json` exits 0 (no TS errors introduced)
    - Optional live-stack verification (manual): with `E2E_SCHOOL_ID` set to a UUID school, `pnpm --filter @schoolflow/web exec playwright test admin-audit-log-detail.spec.ts --workers=1` passes both branches; the second test's drawer Vorzustand panel renders a JsonTree node, NOT the muted banner. (NOT required for task completion — Phase 16 / seed-UUID fix unblocks routine CI execution.)
    - File diff vs. HEAD touches ONLY `apps/web/e2e/helpers/audit.ts` and `apps/web/e2e/admin-audit-log-detail.spec.ts` — `git diff --name-only HEAD apps/web/e2e/` lists exactly those two files
  </acceptance_criteria>

  <done>
    `seedAuditEntryWithBefore` PUTs `/api/v1/dsgvo/retention/:id` (not /schools/:id); detail spec filters by `resource=retention` (not resource=schools); both files typecheck clean. The DSGVO mutation round-trip is now provable end-to-end by the existing detail spec when `E2E_SCHOOL_ID` is a UUID — closing the AUDIT-VIEW-02 contract for the DSGVO half of mutations.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| client → /api/v1/dsgvo/* | Authenticated admin requests cross into the audit-logging path. The interceptor MUST NOT misclassify any DSGVO sub-resource (the gap being closed). |
| AuditInterceptor → PrismaService | Pre-state capture reads ANY mapped Prisma model without tenant scoping (D-24 — admin-only audit log). Misclassification of `resource` was previously masking which model was read; the fix tightens this binding. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-12-01 | I (Information disclosure) | extractResource → SENSITIVE_RESOURCES bypass | mitigate | Pre-fix: DSGVO reads NEVER produced SENSITIVE_READ rows because resource resolved to 'dsgvo' which is not in SENSITIVE_RESOURCES. Post-fix: every DSGVO sub-resource resolves correctly AND dsfa/vvz/deletion are added to SENSITIVE_RESOURCES (Task 3). Read-tracking is restored. |
| T-15-12-02 | R (Repudiation) | extractResource → before-snapshot bypass | mitigate | Pre-fix: PUT/PATCH/DELETE on DSGVO resources had `before=NULL` because RESOURCE_MODEL_MAP['dsgvo'] is undefined → admins could deny "what was the value before this update?" Post-fix: extractResource resolves to the concrete sub-resource, RESOURCE_MODEL_MAP hits the right Prisma delegate, before-snapshot is captured. Forensic chain restored. |
| T-15-12-03 | T (Tampering) | extractResource regex on attacker-controlled URL | accept | URL is fully controlled by NestJS routing — the regex operates on `request.url` which is already path-normalised by Fastify. The new regex `^/api/v1/dsgvo/([^/?]+)` cannot be subverted by a different prefix; double-slash injection is collapsed by Fastify's URL normaliser. The defensive `DSGVO_SUB_RESOURCES.has()` check rejects any non-allowlisted second segment, preventing a future malicious sub-route from auto-promoting. |
| T-15-12-04 | E (Elevation of privilege) | New SENSITIVE_RESOURCES entries | accept | Adding 'dsfa', 'vvz', 'deletion' to SENSITIVE_RESOURCES only ADDS log rows (more visibility); it does NOT widen who can read or mutate those resources. The audit table's role-scoped `findAll` (D-24) continues to gate visibility downstream. No EOP risk. |
| T-15-12-05 | D (Denial of service) | Extra audit log rows for DSGVO reads | accept | Pre-state capture is fail-soft (existing `try/catch` in captureBeforeState — see audit.interceptor.ts lines 149-158). Adding 3 sub-resources to SENSITIVE_RESOURCES means more `auditService.log` calls per request, but each log is a fire-and-forget `tap()` inside RxJS — handler latency is unaffected. No DoS risk introduced. |
</threat_model>

<verification>
## Phase-Level Verification Commands

After all 4 tasks land:

1. **Audit-module unit tests** — proves Tasks 1-3 land cleanly without regression:
   ```bash
   cd apps/api && pnpm exec vitest run src/modules/audit/
   ```
   Expected: 64+ tests passing (was 64 pre-15-12; Task 2 adds 12 more for ~76+ total). Zero failures.

2. **Web typecheck** — proves Task 4's edits typecheck:
   ```bash
   cd apps/web && pnpm exec tsc --noEmit -p tsconfig.json
   ```
   Expected: exit 0.

3. **Optional live-stack proof** (gated on `E2E_SCHOOL_ID` set to a UUID school):
   ```bash
   cd apps/web && E2E_SCHOOL_ID=<uuid> pnpm exec playwright test admin-audit-log-detail.spec.ts --workers=1
   ```
   Expected: both branches pass; second branch's drawer Vorzustand panel renders a JsonTree (NOT the muted banner). If `E2E_SCHOOL_ID` is the seed default, the spec soft-skips per the Phase 16 deferred item (NOT a blocker for this plan).

4. **Spot-check DSGVO mutation in dev stack** (manual, only if a dev stack is up):
   - Trigger any DSGVO mutation via the admin UI (e.g. edit a retention policy retentionDays).
   - SQL-introspect: `SELECT id, resource, action, before IS NOT NULL AS has_before FROM audit_entries ORDER BY created_at DESC LIMIT 5;`
   - Expected: top row shows `resource='retention'` (NOT `'dsgvo'`) and `has_before=true`.

## Goal-backward verification

- AUDIT-VIEW-01 Subject filter: filtering `/admin/audit-log?resource=retention` returns the new retention audit rows (PASS).
- AUDIT-VIEW-02 Vorzustand for DSGVO: opening a fresh DSGVO mutation row's Detail-Drawer renders a JsonTree, NOT the muted "Vorzustand wurde nicht erfasst" banner (PASS via E2E spec — Task 4).
</verification>

<success_criteria>
- All 4 tasks committed with focused per-task commit messages (`fix(15-12): ...` or `test(15-12): ...`).
- `apps/api/src/modules/audit/audit.interceptor.ts` `extractResource('/api/v1/dsgvo/<sub>/...')` returns `<sub>` for the 7 known sub-resources (consent, retention, dsfa, vvz, export, deletion, jobs).
- `apps/api/src/modules/audit/audit.interceptor.spec.ts` has 12 new test cases AND all existing 7 + new 12 = 19 tests pass.
- `apps/api/src/modules/audit/audit.service.ts` `SENSITIVE_RESOURCES` contains 'dsfa', 'vvz', 'deletion' on top of the existing 8 entries.
- `apps/web/e2e/helpers/audit.ts` `seedAuditEntryWithBefore` PUTs `/api/v1/dsgvo/retention/:id` (NOT /schools/:id) and includes a defensive `before=NULL → throw` guard.
- `apps/web/e2e/admin-audit-log-detail.spec.ts` second test navigates to `?action=update&resource=retention` (NOT resource=schools).
- No Prisma schema change. No migration file. No frontend code change beyond the e2e files. No edits to plans 15-01 through 15-11.
- No deferred items pulled in: this plan does NOT touch seed.ts, NOT relax DSGVO `@IsUUID` DTOs, NOT edit DsgvoTabs.tsx or ConsentsTab.tsx JSDoc.
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-12-SUMMARY.md` documenting:
- The 5-line patch in extractResource (paste the new regex + DSGVO_SUB_RESOURCES set)
- SENSITIVE_RESOURCES additions (dsfa, vvz, deletion)
- Test count delta (7 → 19 in interceptor.spec.ts)
- Helper revert (PUT /schools/:id → PUT /dsgvo/retention/:id)
- Detail-spec navigation update (resource=schools → resource=retention)
- Confirmation that VERIFICATION.md Truth #5 (✗ FAILED) is now structurally satisfiable; live-stack confirmation requires `E2E_SCHOOL_ID` set to a UUID school per Phase 16 / seed-UUID deferred work.
</output>
