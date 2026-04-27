---
phase: 15
plan: 11
type: execute
wave: 3
depends_on: [15-09]
files_modified:
  - apps/web/e2e/helpers/audit.ts
  - apps/web/e2e/admin-audit-log-filter.spec.ts
  - apps/web/e2e/admin-audit-log-detail.spec.ts
  - apps/web/e2e/admin-audit-log-csv.spec.ts
autonomous: true
requirements_addressed:
  - AUDIT-VIEW-01
  - AUDIT-VIEW-02
  - AUDIT-VIEW-03
tags: [phase-15, e2e, playwright, audit-log, csv]

must_haves:
  truths:
    - "Wave-0 helper `apps/web/e2e/helpers/audit.ts` exposes `seedAuditEntryLegacy(personId)` (creates a row with `before = NULL` to test AUDIT-VIEW-02 legacy banner) and `seedAuditEntryWithBefore(personId)` (creates a row with `before` populated by triggering an UPDATE on a mapped resource)"
    - "All 3 specs run with `--workers=1`"
    - "Filter spec asserts URL deep-link round-trip across all 6 filter fields (Von/Bis/Aktion/Ressource/Benutzer/Kategorie)"
    - "Detail spec covers BOTH branches: legacy entry shows `Vorzustand wurde für diesen Eintrag nicht erfasst (...)` banner verbatim; new entry shows both Vor- and Nachzustand JSON trees"
    - "CSV spec asserts: download triggers via `page.waitForEvent('download')`, `download.suggestedFilename()` matches `/^audit-log-\\d{4}-\\d{2}-\\d{2}\\.csv$/`, downloaded body's first byte is the UTF-8 BOM (0xEF 0xBB 0xBF), first line is the CSV header, delimiter is semicolon"
    - "All specs use existing `loginAsAdmin(page)` from `helpers/login.ts`"
    - "No production-data risk: read-only specs except for `seedAuditEntryWithBefore` which mutates a throwaway entity in the seed school"
  artifacts:
    - path: apps/web/e2e/helpers/audit.ts
      provides: "Two seed helpers for AUDIT-VIEW-02 branches"
      contains: "seedAuditEntryLegacy"
    - path: apps/web/e2e/admin-audit-log-filter.spec.ts
      provides: "AUDIT-VIEW-01 E2E coverage"
      contains: "AUDIT-VIEW-01"
    - path: apps/web/e2e/admin-audit-log-detail.spec.ts
      provides: "AUDIT-VIEW-02 E2E coverage (both branches)"
      contains: "AUDIT-VIEW-02"
    - path: apps/web/e2e/admin-audit-log-csv.spec.ts
      provides: "AUDIT-VIEW-03 E2E coverage (download + filename + BOM + delimiter)"
      contains: "AUDIT-VIEW-03"
  key_links:
    - from: apps/web/e2e/admin-audit-log-csv.spec.ts
      to: apps/api/src/modules/audit/audit.controller.ts (plan 15-02)
      via: "page.waitForEvent('download') + read blob to assert BOM + semicolon"
      pattern: "waitForEvent\\('download'\\)"
---

<objective>
Ship Playwright E2E coverage for the audit-log viewer surface — 3 spec files plus 1 shared helper. Covers AUDIT-VIEW-01 (filter toolbar deep-link), AUDIT-VIEW-02 (Detail-Drawer with Vorzustand for both legacy NULL-before and new before-populated entries), and AUDIT-VIEW-03 (CSV download contract: filename pattern + UTF-8 BOM + semicolon delimiter).

Purpose:
- AUDIT-VIEW-02 has TWO branches that must both be exercised: the v1 viewer must render a `Vorzustand wurde für diesen Eintrag nicht erfasst …` muted banner for legacy entries (created BEFORE plan 15-01 ships) AND render a JSON tree for entries created AFTER. The seed helper triggers an UPDATE on a mapped resource (e.g. retention) to generate a fresh entry with `before` populated by the new interceptor.
- AUDIT-VIEW-03 requires manual Excel verification (per VALIDATION § Manual-Only Verifications) — but the automated spec covers everything that can be asserted programmatically (filename pattern, BOM, header row, delimiter). The Excel-import-with-DACH-locale check stays manual.

Output: 1 helper + 3 specs.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-VALIDATION.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-UI-SPEC.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-09-audit-log-frontend-PLAN.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-01-audit-schema-interceptor-PLAN.md
@.planning/phases/15-dsgvo-admin-audit-log-viewer/15-02-audit-csv-export-PLAN.md

<interfaces>
From plan 15-09 (audit-log surface selectors):
- `[data-audit-id="…"]`, `[data-audit-action="create|update|delete|read"]`
- Filter labels: `Von`, `Bis`, `Aktion`, `Ressource`, `Benutzer`, `Kategorie`
- CSV button copy: `CSV exportieren`
- Drawer empty-state copy: `Vorzustand wurde für diesen Eintrag nicht erfasst (Eintrag entstand vor dem Interceptor-Refactor in Phase 15).`
- Drawer section headings: `Vorzustand`, `Nachzustand`

From plan 15-02 (CSV export endpoint):
- `Content-Disposition: attachment; filename="audit-log-YYYY-MM-DD.csv"`
- `Content-Type: text/csv; charset=utf-8`
- Body starts with UTF-8 BOM (0xEF 0xBB 0xBF)
- Delimiter: `;` (semicolon — DACH/Excel default)
- RFC-4180-compliant escaping via `Papa.unparse`
- Hard cap: 10,000 rows

From plan 15-01 (interceptor refactor):
- AuditEntry rows created AFTER plan 15-01 ships have `before` populated for UPDATE/DELETE on mapped resources
- AuditEntry rows created BEFORE plan 15-01 ships have `before = NULL`

From `apps/web/e2e/helpers/login.ts`:
- `loginAsAdmin(page)`, `getAdminToken(request)`
</interfaces>
</context>

<tasks>

<task type="auto" tdd="false">
  <name>Task 1: Wave-0 helper apps/web/e2e/helpers/audit.ts</name>
  <read_first>
    - apps/web/e2e/helpers/dsgvo.ts (plan 15-10 sibling — pattern reference)
    - apps/api/src/modules/audit/audit.service.ts (verify a way to seed a legacy entry — typically via direct Prisma write OR a test-only API endpoint)
  </read_first>
  <behavior>
    - `seedAuditEntryLegacy(request, personId)` creates an audit entry with `before = NULL` — this is BAU before plan 15-01's interceptor refactor would normally fire. For the spec, the cleanest approach is to perform a `read` action on a sensitive resource (which has no `before` capture by design — the SENSITIVE_READ branch never sets `before`)
    - `seedAuditEntryWithBefore(request, schoolId)` triggers an UPDATE on a mapped resource (e.g. PUT a retention policy) — that mutation goes through the new AuditInterceptor (plan 15-01) which captures pre-state and writes it to `audit_entries.before`
    - Both helpers return `{ id }` of the created audit entry so the spec can deep-link the drawer
    - Helpers tolerate idempotent re-runs (DELETE before CREATE OR look up most-recent matching row)
  </behavior>
  <action>
    Create `apps/web/e2e/helpers/audit.ts`:
    ```typescript
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
      const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
      if (body) headers['Content-Type'] = 'application/json';
      const res = await request[method.toLowerCase() as 'get'](`${API_BASE}${path}`, {
        headers,
        ...(body ? { data: body } : {}),
      });
      if (!res.ok() && res.status() !== 404 && res.status() !== 409) {
        throw new Error(`${method} ${path} failed: ${res.status()} ${await res.text()}`);
      }
      return res;
    }

    /**
     * Trigger a SENSITIVE_READ to create an audit entry with `before = NULL`
     * (sensitive reads never get a before-snapshot — they're not mutations).
     * This produces a legacy-style row for AUDIT-VIEW-02 banner testing.
     */
    export async function seedAuditEntryLegacy(
      request: APIRequestContext,
      personId: string,
    ): Promise<{ id: string }> {
      // GET on a sensitive resource fires the AuditInterceptor SENSITIVE_READ branch.
      await authReq(request, 'GET', `/dsgvo/consent/person/${personId}`);

      // Look up the latest audit row produced by THIS request via /api/v1/audit?action=read&resource=consent
      const res = await authReq(request, 'GET', `/audit?action=read&resource=consent&limit=1`);
      const json = await res.json();
      const row = json?.data?.[0];
      if (!row) throw new Error('seedAuditEntryLegacy: no audit row produced');
      return { id: row.id };
    }

    /**
     * Trigger an UPDATE on a mapped resource (retention policy) so the
     * AuditInterceptor (plan 15-01) captures pre-state into `before`.
     * Pre-condition: the school has at least one retention policy.
     */
    export async function seedAuditEntryWithBefore(
      request: APIRequestContext,
      params: { schoolId: string; retentionPolicyId: string },
    ): Promise<{ id: string }> {
      // PUT /dsgvo/retention/:id (mapped resource → AuditInterceptor captures before)
      await authReq(request, 'PUT', `/dsgvo/retention/${params.retentionPolicyId}`, {
        retentionDays: 999, // arbitrary value — only the mutation matters
      });

      // Look up the latest audit row for the resource update
      const res = await authReq(
        request,
        'GET',
        `/audit?action=update&resource=retention&limit=1`,
      );
      const json = await res.json();
      const row = json?.data?.[0];
      if (!row) throw new Error('seedAuditEntryWithBefore: no audit row produced');
      if (!row.before) {
        throw new Error(
          'seedAuditEntryWithBefore: row created but before is NULL — ' +
          'plan 15-01 interceptor refactor not deployed in this environment',
        );
      }
      return { id: row.id };
    }
    ```

    DO NOT: Write directly to the audit_entries table via Prisma — that bypasses the interceptor and produces inconsistent test state. Use the live API.
  </action>
  <verify>
    <automated>test -f apps/web/e2e/helpers/audit.ts &amp;&amp; grep -q "seedAuditEntryLegacy" apps/web/e2e/helpers/audit.ts &amp;&amp; grep -q "seedAuditEntryWithBefore" apps/web/e2e/helpers/audit.ts</automated>
  </verify>
  <acceptance_criteria>
    - Both helpers exist and use the live API (no direct DB writes)
    - Either returns `{ id }` of the created audit entry
  </acceptance_criteria>
  <done>The audit Wave-0 helper is in place; specs consume from it.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 2: admin-audit-log-filter.spec.ts (AUDIT-VIEW-01)</name>
  <read_first>
    - apps/web/e2e/admin-dsgvo-consents.spec.ts (plan 15-10 — sibling URL deep-link pattern)
    - apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx (plan 15-09 — labels)
  </read_first>
  <behavior>
    - 3 test cases:
      1. Filter by Aktion via Select — URL gets `?action=update`, table refreshes
      2. Date-range filter via Von + Bis — URL gets `?startDate=…&endDate=…`
      3. `Filter zurücksetzen` clears all 6 filter params
    - Asserts that visible row count is consistent with filter (e.g. all visible rows have `data-audit-action="update"` after filtering)
  </behavior>
  <action>
    Create `apps/web/e2e/admin-audit-log-filter.spec.ts`:
    ```typescript
    import { test, expect } from '@playwright/test';
    import { loginAsAdmin } from './helpers/login';

    test.describe.configure({ mode: 'serial' });

    test.describe('AUDIT-VIEW-01 — Audit-Log filter toolbar URL deep-link', () => {
      test('filter by Aktion=update updates URL and rows', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/audit-log');
        // The visible Aktion select has the 'Alle Aktionen' placeholder by default
        await page.getByLabel('Aktion').click();
        await page.getByRole('option', { name: 'Aktualisieren' }).click();
        await expect(page).toHaveURL(/action=update/);

        // After filter applied, every visible row's data-audit-action is 'update'
        // (or empty state — handle both)
        const rows = page.locator('[data-audit-id]');
        const count = await rows.count();
        if (count > 0) {
          const actions = await rows.evaluateAll((els) =>
            (els as HTMLElement[]).map((e) => e.getAttribute('data-audit-action')),
          );
          expect(actions.every((a) => a === 'update')).toBe(true);
        } else {
          await expect(page.getByText(/Keine Audit-Einträge gefunden|Audit-Log noch leer/)).toBeVisible();
        }
      });

      test('Von+Bis date filter persists in URL', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/audit-log');
        await page.getByLabel('Von').fill('2026-01-01');
        await page.getByLabel('Bis').fill('2026-12-31');
        await expect(page).toHaveURL(/startDate=2026-01-01/);
        await expect(page).toHaveURL(/endDate=2026-12-31/);
      });

      test('Filter zurücksetzen clears all 6 filter params', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/audit-log?action=update&startDate=2026-01-01&endDate=2026-12-31&resource=consent&category=MUTATION');
        await page.getByRole('button', { name: 'Filter zurücksetzen' }).click();
        const url = new URL(page.url());
        expect(url.searchParams.has('action')).toBe(false);
        expect(url.searchParams.has('startDate')).toBe(false);
        expect(url.searchParams.has('endDate')).toBe(false);
        expect(url.searchParams.has('resource')).toBe(false);
        expect(url.searchParams.has('category')).toBe(false);
      });
    });
    ```
  </action>
  <verify>
    <automated>test -f apps/web/e2e/admin-audit-log-filter.spec.ts &amp;&amp; grep -q "AUDIT-VIEW-01" apps/web/e2e/admin-audit-log-filter.spec.ts &amp;&amp; grep -q "Filter zurücksetzen" apps/web/e2e/admin-audit-log-filter.spec.ts &amp;&amp; grep -q "data-audit-action" apps/web/e2e/admin-audit-log-filter.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - 3 test cases covering filter, date-range, reset
    - Uses `data-audit-id` + `data-audit-action` selectors
  </acceptance_criteria>
  <done>AUDIT-VIEW-01 has automated coverage including URL deep-link contract.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 3: admin-audit-log-detail.spec.ts (AUDIT-VIEW-02 — both branches)</name>
  <read_first>
    - apps/web/e2e/helpers/audit.ts (Task 1 output)
    - apps/web/src/components/admin/audit-log/AuditDetailDrawer.tsx (plan 15-09 — copy strings + JsonTree)
  </read_first>
  <behavior>
    - 2 test cases:
      1. Legacy entry (before=NULL): drawer Vorzustand shows the muted banner copy verbatim
      2. New entry (before populated): drawer Vorzustand shows a JSON tree with at least one key
    - Both tests use `seedAuditEntryLegacy` / `seedAuditEntryWithBefore` from Task 1
    - Drawer is opened via `[data-audit-id="${id}"] >> button[aria-label="Detail öffnen"]`
  </behavior>
  <action>
    Create `apps/web/e2e/admin-audit-log-detail.spec.ts`:
    ```typescript
    import { test, expect } from '@playwright/test';
    import { loginAsAdmin } from './helpers/login';
    import { seedAuditEntryLegacy, seedAuditEntryWithBefore } from './helpers/audit';
    import { seedRetentionPolicy } from './helpers/dsgvo';

    test.describe.configure({ mode: 'serial' });

    test.describe('AUDIT-VIEW-02 — Audit detail drawer Vorzustand+Nachzustand', () => {
      const SCHOOL_ID = process.env.E2E_SCHOOL_ID ?? '';
      const PERSON_ID = process.env.E2E_SEED_PERSON_ID ?? '';

      test('legacy entry (before=NULL) shows muted banner', async ({ page, request }) => {
        if (!PERSON_ID) test.skip(true, 'E2E_SEED_PERSON_ID not set');
        const { id } = await seedAuditEntryLegacy(request, PERSON_ID);

        await loginAsAdmin(page);
        await page.goto('/admin/audit-log');
        const row = page.locator(`[data-audit-id="${id}"]`);
        await expect(row).toBeVisible({ timeout: 10_000 });
        await row.getByRole('button', { name: 'Detail öffnen' }).click();

        // Drawer opens with both section headers
        await expect(page.getByText('Vorzustand')).toBeVisible();
        await expect(page.getByText('Nachzustand')).toBeVisible();
        // Vorzustand banner copy verbatim
        await expect(
          page.getByText('Vorzustand wurde für diesen Eintrag nicht erfasst (Eintrag entstand vor dem Interceptor-Refactor in Phase 15).'),
        ).toBeVisible();
      });

      test('new entry with before populated shows JSON tree', async ({ page, request }) => {
        if (!SCHOOL_ID) test.skip(true, 'E2E_SCHOOL_ID not set');

        // Pre-seed a retention policy so seedAuditEntryWithBefore has a target
        const policy = await seedRetentionPolicy(request, {
          schoolId: SCHOOL_ID,
          dataCategory: 'e2e-15-AUDIT-DETAIL',
          retentionDays: 100,
        });
        const { id } = await seedAuditEntryWithBefore(request, {
          schoolId: SCHOOL_ID,
          retentionPolicyId: policy.id,
        });

        await loginAsAdmin(page);
        await page.goto('/admin/audit-log?action=update&resource=retention');
        const row = page.locator(`[data-audit-id="${id}"]`);
        await expect(row).toBeVisible({ timeout: 10_000 });
        await row.getByRole('button', { name: 'Detail öffnen' }).click();

        // Vorzustand renders a JSON tree (font-mono nodes); the muted banner is NOT shown
        await expect(page.getByText('Vorzustand wurde für diesen Eintrag nicht erfasst')).not.toBeVisible();
        // JSON tree contains at least one key from the retention policy
        await expect(page.locator('.font-mono').first()).toBeVisible();
      });
    });
    ```
  </action>
  <verify>
    <automated>test -f apps/web/e2e/admin-audit-log-detail.spec.ts &amp;&amp; grep -q "AUDIT-VIEW-02" apps/web/e2e/admin-audit-log-detail.spec.ts &amp;&amp; grep -q "Vorzustand wurde für diesen Eintrag nicht erfasst" apps/web/e2e/admin-audit-log-detail.spec.ts &amp;&amp; grep -q "seedAuditEntryWithBefore" apps/web/e2e/admin-audit-log-detail.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - Spec covers BOTH branches (legacy NULL-before banner + new entry with JSON tree)
    - Empty-state copy verbatim per UI-SPEC
    - Uses helpers from Task 1
  </acceptance_criteria>
  <done>AUDIT-VIEW-02 has automated coverage for both branches.</done>
</task>

<task type="auto" tdd="false">
  <name>Task 4: admin-audit-log-csv.spec.ts (AUDIT-VIEW-03 — download + filename + BOM + delimiter)</name>
  <read_first>
    - apps/web/src/components/admin/audit-log/AuditFilterToolbar.tsx (plan 15-09 — `CSV exportieren` button)
    - apps/web/src/hooks/useAuditCsvExport.ts (plan 15-09 — blob download path)
    - .planning/phases/15-dsgvo-admin-audit-log-viewer/15-02-audit-csv-export-PLAN.md (Content-Disposition + BOM contract)
  </read_first>
  <behavior>
    - 1 main test case: click `CSV exportieren`, capture the download via `page.waitForEvent('download')`, verify:
      - `download.suggestedFilename()` matches `/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/`
      - `await download.path()` returns a real file path (Playwright stores the blob temporarily)
      - First 3 bytes of the file are 0xEF 0xBB 0xBF (UTF-8 BOM)
      - First line (after BOM) is the CSV header row containing semicolon-separated column names
    - Tests run with `--workers=1` (default in playwright.config.ts)
  </behavior>
  <action>
    Create `apps/web/e2e/admin-audit-log-csv.spec.ts`:
    ```typescript
    import { test, expect } from '@playwright/test';
    import { readFileSync } from 'node:fs';
    import { loginAsAdmin } from './helpers/login';

    test.describe.configure({ mode: 'serial' });

    test.describe('AUDIT-VIEW-03 — CSV-Export contract', () => {
      test('download triggers + filename + BOM + semicolon delimiter', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/audit-log');

        const downloadPromise = page.waitForEvent('download');
        await page.getByRole('button', { name: 'CSV exportieren' }).click();
        const download = await downloadPromise;

        // Filename pattern: audit-log-YYYY-MM-DD.csv
        expect(download.suggestedFilename()).toMatch(/^audit-log-\d{4}-\d{2}-\d{2}\.csv$/);

        // Read the downloaded body and assert UTF-8 BOM + semicolon
        const path = await download.path();
        if (!path) test.fail(true, 'download.path() returned null — Playwright did not save the blob');
        const buf = readFileSync(path!);

        // UTF-8 BOM: 0xEF 0xBB 0xBF
        expect(buf[0]).toBe(0xef);
        expect(buf[1]).toBe(0xbb);
        expect(buf[2]).toBe(0xbf);

        // First line (after BOM) is the header — semicolon-separated
        const text = buf.toString('utf-8').replace(/^﻿/, '');
        const firstLine = text.split('\n')[0];
        expect(firstLine).toContain(';');
        // Header should mention at least one expected column
        expect(firstLine.toLowerCase()).toMatch(/action|aktion|resource|ressource|userid|created/);
      });
    });
    ```

    DO NOT: Try to assert specific header column names verbatim — plan 15-02 leaves column-naming to the executor's discretion. Match flexibly via the regex above.
  </action>
  <verify>
    <automated>test -f apps/web/e2e/admin-audit-log-csv.spec.ts &amp;&amp; grep -q "AUDIT-VIEW-03" apps/web/e2e/admin-audit-log-csv.spec.ts &amp;&amp; grep -q "waitForEvent\\('download'\\)" apps/web/e2e/admin-audit-log-csv.spec.ts &amp;&amp; grep -q "0xef" apps/web/e2e/admin-audit-log-csv.spec.ts</automated>
  </verify>
  <acceptance_criteria>
    - Spec asserts: filename pattern, UTF-8 BOM (3-byte prefix), semicolon delimiter
    - Uses Playwright `waitForEvent('download')` API + `download.path()` for blob inspection
  </acceptance_criteria>
  <done>AUDIT-VIEW-03 has automated coverage for the programmatically-verifiable contract; manual Excel-import verification is documented in VALIDATION § Manual-Only Verifications.</done>
</task>

</tasks>

<threat_model>
## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-15-11-01 | Information Disclosure | CSV download contains sensitive audit data | accept | Test runs against the seed DB only; production data never enters the test environment. The spec asserts schema-level properties (BOM, delimiter, filename) — not data content. |
| T-15-11-02 | Tampering | Spec relies on `data-audit-id` selectors that could be removed by an executor | mitigate | The acceptance gate of plan 15-09 already requires those selectors via grep checks. Plan 15-11 fails fast if 15-09 ships without them. |
| T-15-11-03 | Denial of Service | CSV export of full audit log times out test runner | mitigate | Default Playwright timeout (30s) is sufficient — plan 15-02 caps export at 10,000 rows; the seed DB has < 100 rows; download size is a few KB. |
| T-15-11-04 | Repudiation | seedAuditEntryWithBefore may run against an environment where plan 15-01 isn't deployed yet | mitigate | The helper checks `if (!row.before) throw new Error('plan 15-01 interceptor refactor not deployed')` — fails the spec early with a clear message rather than producing a false-pass. |

</threat_model>

<verification>
- `pnpm --filter @schoolflow/web e2e admin-audit-log --workers=1` runs all 3 specs and exits `0` (or skips with documented seed-data prerequisite)
- `git diff --stat` shows 4 changed files: 1 helper + 3 specs
- VALIDATION.md `## Per-Task Verification Map` rows for AUDIT-VIEW-01/02/03 all flip from ❌ to ✅
- Manual sanity: open the downloaded CSV in Excel/LibreOffice with German locale, verify columns auto-split (no Import Wizard) — captured in 15-11 SUMMARY
</verification>

<success_criteria>
- AUDIT-VIEW-01 has automated E2E coverage for filter URL deep-link contract
- AUDIT-VIEW-02 has automated coverage for BOTH legacy NULL-before banner AND new entry JSON tree branch
- AUDIT-VIEW-03 has automated coverage for download + filename pattern + UTF-8 BOM + semicolon delimiter
- All specs run with `--workers=1`
- VALIDATION.md verification matrix is fully green for the audit-log section
</success_criteria>

<output>
After completion, create `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-11-SUMMARY.md` listing:
- The 4 changed files
- Per-spec pass/fail summary (skipped specs noted with their env-var prerequisite)
- Confirmation that the manual Excel-import verification from VALIDATION.md was performed and passed (or document the deferral)
- Any deviations from the assumed `seedAuditEntryLegacy` route choice (e.g. if SENSITIVE_READ branch is unavailable for the chosen path)
</output>
