---
phase: 14-solver-tuning
plan: 03
type: execute
wave: 3
depends_on: [14-01, 14-02]
files_modified:
  - apps/web/e2e/helpers/constraints.ts
  - apps/web/e2e/admin-solver-tuning-catalog.spec.ts
  - apps/web/e2e/admin-solver-tuning-weights.spec.ts
  - apps/web/e2e/admin-solver-tuning-restrictions.spec.ts
  - apps/web/e2e/admin-solver-tuning-preferences.spec.ts
  - apps/web/e2e/admin-solver-tuning-integration.spec.ts
  - apps/web/e2e/admin-solver-tuning-audit.spec.ts
  - apps/web/e2e/admin-solver-tuning-mobile.spec.ts
  - apps/web/e2e/admin-solver-tuning-rbac.spec.ts
  - .planning/E2E-COVERAGE-MATRIX.md
  - .planning/phases/14-solver-tuning/14-VALIDATION.md
autonomous: true
requirements: [SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05]
requirements_addressed: [SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05]
user_setup: []

must_haves:
  truths:
    - "13 Playwright specs exist under apps/web/e2e/ with prefix E2E-SOLVER- (12 SOLVER + 1 RBAC)"
    - "All specs run via `pnpm --filter @schoolflow/web exec playwright test --project=desktop` and exit 0"
    - "E2E-SOLVER-01 proves the catalog tab shows 15 rows with Hard/Soft sections — 6 HARD + 9 SOFT (SOLVER-01)"
    - "E2E-SOLVER-RBAC-01 proves schulleitung is blocked from /admin/solver-tuning and the sidebar entry is hidden for that role (D-03)"
    - "E2E-SOLVER-02 proves weights save + reload + reset cycle (SOLVER-02)"
    - "E2E-SOLVER-03 proves bounds validation surfaces a destructive toast (SOLVER-02 silent-4xx-invariante)"
    - "E2E-SOLVER-04..06 prove ClassRestriction CRUD + cross-reference 422 + multi-row banner (SOLVER-04)"
    - "E2E-SOLVER-07..09 prove SubjectMorning + SubjectPreferredSlot CRUD + sub-tab isolation (SOLVER-05)"
    - "E2E-SOLVER-10 proves a saved weight reaches TimetableRun.constraintConfig after a real solve (SOLVER-03)"
    - "E2E-SOLVER-11 proves audit-log entries are emitted for weight + template mutations (D-08)"
    - "E2E-SOLVER-MOBILE-01 proves the mobile 375px viewport works (D-04 + MOBILE-ADM-01/02)"
    - "Helpers `createConstraintWeightOverrideViaAPI` + `createConstraintTemplateViaAPI` + `cleanupE2EConstraints` extracted into apps/web/e2e/helpers/constraints.ts and reused by all specs"
    - "E2E-COVERAGE-MATRIX.md updated with the new E2E-SOLVER-* family"
  artifacts:
    - path: "apps/web/e2e/helpers/constraints.ts"
      provides: "Setup + cleanup API helpers for Phase 14 E2E"
      exports: ["createConstraintWeightOverrideViaAPI", "createConstraintTemplateViaAPI", "cleanupConstraintTemplatesViaAPI", "cleanupConstraintWeightOverridesViaAPI", "CONSTRAINT_PREFIX"]
    - path: "apps/web/e2e/admin-solver-tuning-catalog.spec.ts"
      provides: "E2E-SOLVER-01"
    - path: "apps/web/e2e/admin-solver-tuning-weights.spec.ts"
      provides: "E2E-SOLVER-02 + E2E-SOLVER-03"
    - path: "apps/web/e2e/admin-solver-tuning-restrictions.spec.ts"
      provides: "E2E-SOLVER-04 + E2E-SOLVER-05 + E2E-SOLVER-06"
    - path: "apps/web/e2e/admin-solver-tuning-preferences.spec.ts"
      provides: "E2E-SOLVER-07 + E2E-SOLVER-08 + E2E-SOLVER-09"
    - path: "apps/web/e2e/admin-solver-tuning-integration.spec.ts"
      provides: "E2E-SOLVER-10 (gated by E2E_RUN_SOLVER=1)"
    - path: "apps/web/e2e/admin-solver-tuning-audit.spec.ts"
      provides: "E2E-SOLVER-11"
    - path: "apps/web/e2e/admin-solver-tuning-mobile.spec.ts"
      provides: "E2E-SOLVER-MOBILE-01"
    - path: "apps/web/e2e/admin-solver-tuning-rbac.spec.ts"
      provides: "E2E-SOLVER-RBAC-01 (schulleitung negative case for D-03)"
  key_links:
    - from: "apps/web/e2e/helpers/constraints.ts"
      to: "Plan 14-01 backend endpoints"
      via: "POST /constraint-templates + PUT /constraint-weights via apiFetch"
      pattern: "constraint-templates|constraint-weights"
    - from: "apps/web/e2e/admin-solver-tuning-integration.spec.ts"
      to: "Phase 9.x solve-run harness"
      via: "wait for solve:complete via API polling on /timetable/runs/:runId"
      pattern: "solve.*complete|status.*COMPLETE"
---

<objective>
Ship the 12 Playwright specs covering Phase 14 per CONTEXT.md D-16 (USER-OVERRIDE on recommended 8-9). These specs codify the SOLVER-01..05 requirements as automated regression guards, satisfy `feedback_e2e_first_no_uat.md`, and enforce the silent-4xx invariant for every Phase 14 mutation.

Purpose: Lock the surface so future refactors don't regress; produce CI-grade evidence that all 5 admin requirements work end-to-end.
Output: 8 spec files (13 logical specs grouped by feature: 12 SOLVER + 1 RBAC) + 1 helper file + matrix update + validation table fill.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/14-solver-tuning/14-CONTEXT.md
@.planning/phases/14-solver-tuning/14-RESEARCH.md
@.planning/phases/14-solver-tuning/14-UI-SPEC.md
@.planning/phases/14-solver-tuning/14-01-SUMMARY.md
@.planning/phases/14-solver-tuning/14-02-SUMMARY.md
@.planning/E2E-COVERAGE-MATRIX.md

<interfaces>
<!-- Existing E2E harness (read these patterns; do NOT redesign): -->

import { loginAsAdmin, getAdminToken } from './helpers/login';
import { getByCardTitle } from './helpers/card';

Existing helpers patterns:
  - apps/web/e2e/helpers/subjects.ts (createSubjectViaAPI + cleanupE2ESubjects + SUBJECT_API + SUBJECT_PREFIX)
  - apps/web/e2e/helpers/teachers.ts (createTeacherViaAPI ...)
  - apps/web/e2e/helpers/students.ts (createStudentViaAPI ...)
  - apps/web/e2e/helpers/users.ts

Existing specs to mirror in style:
  - apps/web/e2e/admin-classes-crud.spec.ts (Phase 12-03 reference — closest match for tab+CRUD+dialog+autocomplete)
  - apps/web/e2e/admin-school-settings.spec.ts (Phase 10 — tab+save patterns)

Phase 14-01 backend endpoints (from Plan 14-01 SUMMARY):
  GET    /api/v1/schools/:schoolId/timetable/constraint-catalog
  GET    /api/v1/schools/:schoolId/constraint-weights
  PUT    /api/v1/schools/:schoolId/constraint-weights
  DELETE /api/v1/schools/:schoolId/constraint-weights/:constraintName
  POST   /api/v1/schools/:schoolId/constraint-templates
  PUT    /api/v1/schools/:schoolId/constraint-templates/:id
  PATCH  /api/v1/schools/:schoolId/constraint-templates/:id/active
  DELETE /api/v1/schools/:schoolId/constraint-templates/:id
  GET    /api/v1/schools/:schoolId/timetable/runs?limit=1&order=desc

Seed school ID:
  E2E_SCHOOL_ID env var (default: 'seed-school-bgbrg-musterstadt')

Audit-log endpoint (Phase 1 + Phase 15 backbone):
  GET /api/v1/audit-log?subject=constraint-weight-override
  GET /api/v1/audit-log?subject=constraint-template
  (Confirm exact endpoint by reading apps/api/src/modules/audit/audit.controller.ts in Task 0 — if path differs, document and update spec accordingly.)

Solver-run E2E gating (from Phase 10.5-04 precedent):
  process.env.E2E_RUN_SOLVER === '1' guards integration spec; otherwise it.skip().
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Wave 0 — Helper module + audit endpoint verification + matrix scaffolding</name>
  <files>
    apps/web/e2e/helpers/constraints.ts,
    apps/web/e2e/admin-solver-tuning-catalog.spec.ts,
    apps/web/e2e/admin-solver-tuning-weights.spec.ts,
    apps/web/e2e/admin-solver-tuning-restrictions.spec.ts,
    apps/web/e2e/admin-solver-tuning-preferences.spec.ts,
    apps/web/e2e/admin-solver-tuning-integration.spec.ts,
    apps/web/e2e/admin-solver-tuning-audit.spec.ts,
    apps/web/e2e/admin-solver-tuning-mobile.spec.ts,
    .planning/E2E-COVERAGE-MATRIX.md
  </files>
  <read_first>
    apps/web/e2e/helpers/login.ts,
    apps/web/e2e/helpers/subjects.ts,
    apps/web/e2e/helpers/teachers.ts,
    apps/web/e2e/admin-classes-crud.spec.ts,
    apps/api/src/modules/audit/audit.controller.ts,
    apps/api/src/modules/audit/audit.service.ts,
    .planning/E2E-COVERAGE-MATRIX.md,
    .planning/phases/14-solver-tuning/14-VALIDATION.md
  </read_first>
  <action>
    Sub-task A — Helper module (apps/web/e2e/helpers/constraints.ts):

    1. Create the helper, mirroring the structure of `apps/web/e2e/helpers/subjects.ts`:
       ```typescript
       /**
        * Phase 14 Plan 14-03 — shared constraint API helpers.
        * Provides setup + cleanup for ConstraintWeightOverride + ConstraintTemplate
        * fixtures. Uses caller-supplied prefix for traceability + per-spec cleanup
        * isolation (Phase 10.5-02 precedent).
        */
       import { expect, type APIRequestContext } from '@playwright/test';
       import { getAdminToken } from './login';

       export const CONSTRAINT_API =
         process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
       export const CONSTRAINT_SCHOOL_ID =
         process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';
       export const CONSTRAINT_PREFIX = 'E2E-SOLVER-';

       export async function createConstraintWeightOverrideViaAPI(
         request: APIRequestContext,
         constraintName: string,
         weight: number,
       ): Promise<void> {
         const token = await getAdminToken(request);
         // Bulk-replace endpoint replaces the whole set; build the partial map first.
         const current = await request.get(
           `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-weights`,
           { headers: { Authorization: `Bearer ${token}` } },
         );
         const body = (await current.json()) as { weights: Record<string, number> };
         const next = { ...body.weights, [constraintName]: weight };
         const res = await request.put(
           `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-weights`,
           {
             headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
             data: { weights: next },
           },
         );
         expect(res.ok(), `PUT /constraint-weights seed (${constraintName}=${weight})`).toBeTruthy();
       }

       export async function createConstraintTemplateViaAPI(
         request: APIRequestContext,
         templateType: 'NO_LESSONS_AFTER' | 'SUBJECT_MORNING' | 'SUBJECT_PREFERRED_SLOT',
         params: Record<string, unknown>,
         isActive = true,
       ): Promise<{ id: string }> {
         const token = await getAdminToken(request);
         const res = await request.post(
           `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-templates`,
           {
             headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
             data: { templateType, params, isActive },
           },
         );
         expect(res.ok(), `POST /constraint-templates seed (${templateType})`).toBeTruthy();
         return (await res.json()) as { id: string };
       }

       /**
        * Cleanup: delete every constraint-template whose params reference an entity
        * with name starting with CONSTRAINT_PREFIX, OR delete every template the
        * test suite created (best-effort; swallows errors for partial state).
        */
       export async function cleanupConstraintTemplatesViaAPI(
         request: APIRequestContext,
         templateType?: string,
       ): Promise<void> {
         const token = await getAdminToken(request);
         const listRes = await request.get(
           `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-templates`,
           { headers: { Authorization: `Bearer ${token}` } },
         );
         if (!listRes.ok()) return;
         const all = (await listRes.json()) as Array<{ id: string; templateType: string }>;
         const filtered = templateType ? all.filter((t) => t.templateType === templateType) : all;
         await Promise.all(
           filtered.map((t) =>
             request.delete(
               `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-templates/${t.id}`,
               { headers: { Authorization: `Bearer ${token}` } },
             ).catch(() => undefined),
           ),
         );
       }

       /**
        * Reset all weight overrides for the seed school back to defaults.
        * Uses the bulk PUT with an empty map.
        */
       export async function cleanupConstraintWeightOverridesViaAPI(
         request: APIRequestContext,
       ): Promise<void> {
         const token = await getAdminToken(request);
         await request.put(
           `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-weights`,
           {
             headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
             data: { weights: {} },
           },
         ).catch(() => undefined);
       }
       ```

    Sub-task B — Confirm audit endpoint shape (RESEARCH.md Open Question #4):

    2. Read `apps/api/src/modules/audit/audit.controller.ts` and confirm:
       - Exact endpoint path (e.g. `GET /api/v1/audit-log?subject=...&limit=...`)
       - Response shape (array vs paginated `{ data: [...] }`)
       - Whether `subject` filter accepts the new strings `constraint-weight-override` + `constraint-template`
       Document the findings as a code comment at the top of `admin-solver-tuning-audit.spec.ts` so the spec uses the correct shape.

    Sub-task C — Spec-file scaffolding (skeleton-only, fill in Tasks 2-3):

    3. Create each of the 8 spec files (7 SOLVER spec files + 1 RBAC spec file `admin-solver-tuning-rbac.spec.ts`) with this skeleton (replace `<X>` with the spec ID):
       ```typescript
       import { test, expect } from '@playwright/test';
       import { loginAsAdmin } from './helpers/login';
       import { cleanupConstraintTemplatesViaAPI, cleanupConstraintWeightOverridesViaAPI } from './helpers/constraints';

       test.describe('Phase 14 — <feature>', () => {
         test.beforeEach(async ({ page, request }) => {
           await cleanupConstraintTemplatesViaAPI(request);
           await cleanupConstraintWeightOverridesViaAPI(request);
           await loginAsAdmin(page);
         });

         test.afterEach(async ({ request }) => {
           await cleanupConstraintTemplatesViaAPI(request);
           await cleanupConstraintWeightOverridesViaAPI(request);
         });

         test('E2E-SOLVER-<X>: <name>', async ({ page }) => {
           // TODO Task 2/3
           test.skip(true, 'placeholder');
         });
       });
       ```

       For `admin-solver-tuning-integration.spec.ts`, the test body MUST be guarded by `test.skip(process.env.E2E_RUN_SOLVER !== '1', 'requires E2E_RUN_SOLVER=1')` per Phase 10.5-04 precedent.

       For `admin-solver-tuning-mobile.spec.ts`, configure the test to run only in `chromium-375` project per Phase 10.4-03 precedent (mobile-WebKit/iPhone13 Bus-Error-10 acceptable to skip):
       ```typescript
       test.use({ viewport: { width: 375, height: 812 } });
       test.skip(({ browserName }) => browserName === 'webkit', 'Mobile WebKit Bus-Error-10 (Phase 10.4-03 precedent)');
       ```

    Sub-task D — Update E2E-COVERAGE-MATRIX.md:

    4. Read the matrix file. Append a new section at the appropriate location (likely after the SOLVER-* / OPS-* sections):
       ```markdown
       ### E2E-SOLVER-* — Phase 14 Solver-Tuning

       | Spec ID | File | Requirement | Status |
       |---------|------|-------------|--------|
       | E2E-SOLVER-01 | admin-solver-tuning-catalog.spec.ts | SOLVER-01 | implemented |
       | E2E-SOLVER-02 | admin-solver-tuning-weights.spec.ts | SOLVER-02 | implemented |
       | E2E-SOLVER-03 | admin-solver-tuning-weights.spec.ts | SOLVER-02 (silent-4xx) | implemented |
       | E2E-SOLVER-04 | admin-solver-tuning-restrictions.spec.ts | SOLVER-04 | implemented |
       | E2E-SOLVER-05 | admin-solver-tuning-restrictions.spec.ts | SOLVER-04 (cross-ref 422) | implemented |
       | E2E-SOLVER-06 | admin-solver-tuning-restrictions.spec.ts | SOLVER-04 (multi-row banner) | implemented |
       | E2E-SOLVER-07 | admin-solver-tuning-preferences.spec.ts | SOLVER-05 (SUBJECT_MORNING) | implemented |
       | E2E-SOLVER-08 | admin-solver-tuning-preferences.spec.ts | SOLVER-05 (SUBJECT_PREFERRED_SLOT) | implemented |
       | E2E-SOLVER-09 | admin-solver-tuning-preferences.spec.ts | SOLVER-05 (sub-tab isolation) | implemented |
       | E2E-SOLVER-10 | admin-solver-tuning-integration.spec.ts | SOLVER-03 (gated E2E_RUN_SOLVER=1) | implemented |
       | E2E-SOLVER-11 | admin-solver-tuning-audit.spec.ts | D-08 audit trail | implemented |
       | E2E-SOLVER-MOBILE-01 | admin-solver-tuning-mobile.spec.ts | D-04 + MOBILE-ADM-01/02 | implemented |
       ```
       (Status will become "implemented" after Task 2/3; for Task 1 it is acceptable to mark `scaffolded`.)

    Sub-task E — Smoke test the helpers + scaffolding:

    5. Run `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning- --project=desktop --list`. All 13 tests (12 SOLVER + 1 RBAC) should be DISCOVERED (even if skipped). If discovery fails, fix imports.
  </action>
  <verify>
    <automated>
      test -f apps/web/e2e/helpers/constraints.ts &amp;&amp;
      grep -q "createConstraintWeightOverrideViaAPI" apps/web/e2e/helpers/constraints.ts &amp;&amp;
      grep -q "createConstraintTemplateViaAPI" apps/web/e2e/helpers/constraints.ts &amp;&amp;
      grep -q "cleanupConstraintTemplatesViaAPI" apps/web/e2e/helpers/constraints.ts &amp;&amp;
      test -f apps/web/e2e/admin-solver-tuning-catalog.spec.ts &amp;&amp;
      test -f apps/web/e2e/admin-solver-tuning-weights.spec.ts &amp;&amp;
      test -f apps/web/e2e/admin-solver-tuning-restrictions.spec.ts &amp;&amp;
      test -f apps/web/e2e/admin-solver-tuning-preferences.spec.ts &amp;&amp;
      test -f apps/web/e2e/admin-solver-tuning-integration.spec.ts &amp;&amp;
      test -f apps/web/e2e/admin-solver-tuning-audit.spec.ts &amp;&amp;
      test -f apps/web/e2e/admin-solver-tuning-mobile.spec.ts &amp;&amp;
      grep -q "E2E-SOLVER-" .planning/E2E-COVERAGE-MATRIX.md &amp;&amp;
      pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning- --project=desktop --list
    </automated>
  </verify>
  <acceptance_criteria>
    - `apps/web/e2e/helpers/constraints.ts` exports `createConstraintWeightOverrideViaAPI`, `createConstraintTemplateViaAPI`, `cleanupConstraintTemplatesViaAPI`, `cleanupConstraintWeightOverridesViaAPI`, `CONSTRAINT_PREFIX`
    - All 8 spec files exist with test discovery working (`playwright test --list` shows ≥13 tests: 12 SOLVER + 1 RBAC) — verify `apps/web/e2e/admin-solver-tuning-rbac.spec.ts` exists
    - `.planning/E2E-COVERAGE-MATRIX.md` contains 12 new rows in an `E2E-SOLVER-*` section
    - `apps/web/e2e/admin-solver-tuning-mobile.spec.ts` contains `viewport: { width: 375` AND a WebKit skip clause
    - `apps/web/e2e/admin-solver-tuning-integration.spec.ts` contains `E2E_RUN_SOLVER` guard
    - Audit endpoint exact path documented at top of `admin-solver-tuning-audit.spec.ts` (comment)
  </acceptance_criteria>
  <done>Helpers + scaffolding ready; Tasks 2-3 implement the actual test bodies.</done>
</task>

<task type="auto">
  <name>Task 2: Implement E2E-SOLVER-01 through 06 (catalog + weights + restrictions)</name>
  <files>
    apps/web/e2e/admin-solver-tuning-catalog.spec.ts,
    apps/web/e2e/admin-solver-tuning-weights.spec.ts,
    apps/web/e2e/admin-solver-tuning-restrictions.spec.ts
  </files>
  <read_first>
    apps/web/e2e/admin-solver-tuning-catalog.spec.ts,
    apps/web/e2e/admin-solver-tuning-weights.spec.ts,
    apps/web/e2e/admin-solver-tuning-restrictions.spec.ts,
    apps/web/e2e/admin-classes-crud.spec.ts,
    apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx,
    apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx,
    apps/web/src/components/admin/solver-tuning/ConstraintWeightsTab.tsx,
    apps/web/src/components/admin/solver-tuning/ClassRestrictionsTab.tsx,
    apps/web/src/components/admin/solver-tuning/AddEditClassRestrictionDialog.tsx,
    .planning/phases/14-solver-tuning/14-UI-SPEC.md
  </read_first>
  <action>
    Implement each spec body. Use `loginAsAdmin` + `getByRole`/`getByText`/`getByLabel` selectors that target stable Phase 14 UI strings (per UI-SPEC §Inline micro-copy verbatim). Reuse `createConstraintTemplateViaAPI` for setup; rely on `afterEach` cleanup.

    --- E2E-SOLVER-01: catalog-readonly ---

    Spec: `admin-solver-tuning-catalog.spec.ts`
    ```typescript
    test('E2E-SOLVER-01: catalog read-only with Hard/Soft sections', async ({ page }) => {
      await page.goto('/admin/solver-tuning?tab=constraints');
      // Section headers
      await expect(page.getByRole('heading', { name: 'Hard-Constraints (6)' })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Soft-Constraints (9)' })).toBeVisible();
      // Total catalog row count = 15 (6 HARD + 9 SOFT, including the new "Subject preferred slot")
      const hardBadges = page.getByText('HARD', { exact: true });
      const softBadges = page.getByText('SOFT', { exact: true });
      await expect(hardBadges).toHaveCount(6);
      await expect(softBadges).toHaveCount(9);
      // Hard rows do NOT have edit button
      const firstHardRow = page.locator('[data-severity="HARD"]').first();
      await expect(firstHardRow.getByRole('button', { name: 'Gewichtung bearbeiten' })).toHaveCount(0);
      // Soft row deep-link works
      const firstSoftRow = page.locator('[data-severity="SOFT"]').first();
      await firstSoftRow.getByRole('button', { name: 'Gewichtung bearbeiten' }).click();
      // Tab 2 should be active now
      await expect(page.getByRole('tab', { name: 'Gewichtungen', selected: true })).toBeVisible();
    });
    ```
    NOTE: Plan 14-02-T2 already adds `data-severity` attributes to ConstraintCatalogRow (per its acceptance criteria). If executor used a different selector strategy (e.g. `data-testid`), adapt the spec.

    --- E2E-SOLVER-RBAC-01: schulleitung negative case ---

    Spec: `admin-solver-tuning-rbac.spec.ts`
    ```typescript
    import { test, expect } from '@playwright/test';
    import { loginAsSchulleitung } from './helpers/login';

    test.describe('Phase 14 — Solver-Tuning RBAC', () => {
      test('E2E-SOLVER-RBAC-01: schulleitung cannot see entry or access route', async ({ page }) => {
        await loginAsSchulleitung(page);
        // Sidebar must NOT contain Solver-Tuning entry
        await page.goto('/admin');
        await expect(page.getByRole('link', { name: /Solver-Tuning/i })).toHaveCount(0);
        // Direct navigation must redirect or 403
        await page.goto('/admin/solver-tuning');
        await expect(page).not.toHaveURL(/\/admin\/solver-tuning(\?|$)/);
        // Optional: assert friendly redirect target (e.g. /admin or /)
      });
    });
    ```
    NOTE: If `loginAsSchulleitung` does not exist in `helpers/login.ts`, the executor adds it as part of Wave 0 (T1 sub-task A) following the same shape as `loginAsAdmin` but with the schulleitung Keycloak user from the seed.

    --- E2E-SOLVER-02: weights-edit-save-reset ---

    Spec: `admin-solver-tuning-weights.spec.ts`
    ```typescript
    test('E2E-SOLVER-02: weights edit + save + reset cycle', async ({ page, request }) => {
      await page.goto('/admin/solver-tuning?tab=weights');
      // Find the slider for "Kein Doppel-Fach hintereinander" (default 10)
      const row = page.locator('[data-constraint-name="No same subject doubling"]');
      await expect(row).toBeVisible();
      const numberInput = row.getByLabel(/Gewichtung für Kein Doppel-Fach/i);
      await numberInput.fill('50');
      // Save
      const saveButton = page.getByRole('button', { name: 'Änderungen speichern' });
      const putPromise = page.waitForResponse(r => r.url().includes('/constraint-weights') && r.request().method() === 'PUT');
      await saveButton.click();
      const res = await putPromise;
      expect(res.status()).toBe(200);
      await expect(page.getByText('Gewichtungen gespeichert.')).toBeVisible();
      // DriftBanner: weight just saved → lastUpdatedAt > any prior solve completedAt → banner visible.
      // (E2E uses an unseeded school-state with no prior solve, so completedAt is null
      // and any non-null lastUpdatedAt triggers the banner per Plan 14-02-T3 DriftBanner contract.)
      await expect(page.getByText(/Gewichtungen wurden.*geändert.*Stundenplan/i)).toBeVisible();
      // Reload and verify persistence
      await page.reload();
      await expect(numberInput).toHaveValue('50');
      // Reset to default
      const resetBtn = row.getByRole('button', { name: 'Auf Default zurücksetzen' });
      await resetBtn.click();
      // Local now = 10 (default), button to save reappears
      await expect(numberInput).toHaveValue('10');
      await page.getByRole('button', { name: 'Änderungen speichern' }).click();
      await expect(page.getByText('Gewichtungen gespeichert.')).toBeVisible();
    });
    ```

    --- E2E-SOLVER-03: weights-validation-bounds (silent-4xx invariant) ---

    Same spec file:
    ```typescript
    test('E2E-SOLVER-03: weight bounds validation surfaces destructive toast', async ({ page, request }) => {
      // Frontend bounds (Zod) — UI prevents invalid submission
      await page.goto('/admin/solver-tuning?tab=weights');
      const row = page.locator('[data-constraint-name="No same subject doubling"]');
      const numberInput = row.getByLabel(/Gewichtung für/i);
      await numberInput.fill('150');
      // Save button should be disabled OR show inline error
      // (executor's choice — both are acceptable; assert at least one)
      const saveButton = page.getByRole('button', { name: 'Änderungen speichern' });
      const inlineError = page.getByText(/Gewichtungen müssen zwischen 0 und 100/i);
      await expect(async () => {
        const disabled = await saveButton.isDisabled().catch(() => false);
        const errorVisible = await inlineError.isVisible().catch(() => false);
        expect(disabled || errorVisible).toBe(true);
      }).toPass({ timeout: 2000 });

      // Server-direct call: bypass UI Zod and assert backend 422
      const token = await (await import('./helpers/login')).getAdminToken(request);
      const direct = await request.put(
        `http://localhost:3000/api/v1/schools/seed-school-bgbrg-musterstadt/constraint-weights`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { weights: { 'No same subject doubling': 200 } },
        },
      );
      expect(direct.status()).toBe(422);
      const body = await direct.json();
      expect(body.type).toBe('schoolflow://errors/weight-out-of-range');
    });
    ```

    --- E2E-SOLVER-04: class-restriction-CRUD-happy ---

    Spec: `admin-solver-tuning-restrictions.spec.ts`
    ```typescript
    test('E2E-SOLVER-04: class restriction CRUD happy path', async ({ page }) => {
      await page.goto('/admin/solver-tuning?tab=restrictions');
      await expect(page.getByRole('button', { name: '+ Sperrzeit hinzufügen' })).toBeVisible();
      // Add
      await page.getByRole('button', { name: '+ Sperrzeit hinzufügen' }).click();
      await page.getByLabel('Klasse').click();
      await page.getByPlaceholder('Klassen-Name (min. 2 Zeichen) …').fill('1A');
      await page.getByRole('option').first().click();
      await page.getByLabel('Sperrt ab Periode').fill('5');
      const postPromise = page.waitForResponse(r => r.url().includes('/constraint-templates') && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Anlegen' }).click();
      await postPromise;
      await expect(page.getByText(/Bis Periode 5 erlaubt/)).toBeVisible();
      // Edit
      await page.getByRole('button', { name: 'Eintrag bearbeiten' }).first().click();
      await page.getByLabel('Sperrt ab Periode').fill('4');
      const putPromise = page.waitForResponse(r => r.url().includes('/constraint-templates') && r.request().method() === 'PUT');
      await page.getByRole('button', { name: 'Speichern' }).click();
      await putPromise;
      await expect(page.getByText(/Bis Periode 4 erlaubt/)).toBeVisible();
      // Delete
      await page.getByRole('button', { name: 'Eintrag löschen' }).first().click();
      const delPromise = page.waitForResponse(r => r.url().includes('/constraint-templates') && r.request().method() === 'DELETE');
      await page.getByRole('button', { name: 'Löschen' }).click();
      await delPromise;
      await expect(page.getByText(/Bis Periode 4 erlaubt/)).not.toBeVisible();
    });
    ```

    --- E2E-SOLVER-05: cross-reference-422 ---

    Same spec file (server-direct call):
    ```typescript
    test('E2E-SOLVER-05: cross-reference 422 surfaces correct problem+json', async ({ request }) => {
      const token = await (await import('./helpers/login')).getAdminToken(request);
      // period out of range
      const r1 = await request.post(
        `http://localhost:3000/api/v1/schools/seed-school-bgbrg-musterstadt/constraint-templates`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { templateType: 'NO_LESSONS_AFTER', params: { classId: 'seed-class-1a', maxPeriod: 99 } },
        },
      );
      expect(r1.status()).toBe(422);
      expect((await r1.json()).type).toBe('schoolflow://errors/period-out-of-range');
      // foreign classId
      const r2 = await request.post(
        `http://localhost:3000/api/v1/schools/seed-school-bgbrg-musterstadt/constraint-templates`,
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { templateType: 'NO_LESSONS_AFTER', params: { classId: '00000000-0000-0000-0000-000000000000', maxPeriod: 5 } },
        },
      );
      expect(r2.status()).toBe(422);
      expect((await r2.json()).type).toBe('schoolflow://errors/cross-reference-missing');
    });
    ```
    NOTE: confirm the seed class ID `seed-class-1a` exists by reading `apps/api/prisma/seed.ts` first; if different, update the spec.

    --- E2E-SOLVER-06: duplicate-warn-banner ---

    Same spec file:
    ```typescript
    test('E2E-SOLVER-06: duplicate restrictions show strictest-wins banner', async ({ page, request }) => {
      // Setup via API: 2 restrictions on same class
      const { createConstraintTemplateViaAPI } = await import('./helpers/constraints');
      await createConstraintTemplateViaAPI(request, 'NO_LESSONS_AFTER', { classId: 'seed-class-1a', maxPeriod: 5 });
      await createConstraintTemplateViaAPI(request, 'NO_LESSONS_AFTER', { classId: 'seed-class-1a', maxPeriod: 4 });
      await page.goto('/admin/solver-tuning?tab=restrictions');
      await expect(page.getByText(/Mehrfache Einträge für/)).toBeVisible();
      await expect(page.getByText(/strengste Sperrzeit \(Periode 4\)/)).toBeVisible();
    });
    ```
  </action>
  <verify>
    <automated>
      pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-catalog admin-solver-tuning-weights admin-solver-tuning-restrictions --project=desktop
    </automated>
  </verify>
  <acceptance_criteria>
    - `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-catalog admin-solver-tuning-weights admin-solver-tuning-restrictions --project=desktop` exits 0
    - Each spec file contains exactly the spec IDs assigned (`E2E-SOLVER-01`, `02`, `03`, `04`, `05`, `06`)
    - The `--list` output shows 6 tests with the expected IDs
    - All 6 tests pass against a running stack (api+web+keycloak+postgres + applied Plan 14-01 migration)
    - No `test.skip(true)` placeholders remain in these 3 files
  </acceptance_criteria>
  <done>SOLVER-01, SOLVER-02, SOLVER-04 covered with green E2E specs; silent-4xx invariant verified.</done>
</task>

<task type="auto">
  <name>Task 3: Implement E2E-SOLVER-07 through 11 + MOBILE-01 + finalize matrix</name>
  <files>
    apps/web/e2e/admin-solver-tuning-preferences.spec.ts,
    apps/web/e2e/admin-solver-tuning-integration.spec.ts,
    apps/web/e2e/admin-solver-tuning-audit.spec.ts,
    apps/web/e2e/admin-solver-tuning-mobile.spec.ts,
    .planning/E2E-COVERAGE-MATRIX.md,
    .planning/phases/14-solver-tuning/14-VALIDATION.md
  </files>
  <read_first>
    apps/web/e2e/admin-solver-tuning-preferences.spec.ts,
    apps/web/e2e/admin-solver-tuning-integration.spec.ts,
    apps/web/e2e/admin-solver-tuning-audit.spec.ts,
    apps/web/e2e/admin-solver-tuning-mobile.spec.ts,
    apps/web/src/components/admin/solver-tuning/SubjectPreferencesTab.tsx,
    apps/web/src/components/admin/solver-tuning/AddEditSubjectMorningPreferenceDialog.tsx,
    apps/web/src/components/admin/solver-tuning/AddEditSubjectPreferredSlotDialog.tsx,
    apps/api/src/modules/audit/audit.controller.ts,
    apps/api/prisma/seed.ts,
    .planning/phases/14-solver-tuning/14-VALIDATION.md
  </read_first>
  <action>
    --- E2E-SOLVER-07: subject-pref-morning-CRUD ---

    Spec: `admin-solver-tuning-preferences.spec.ts`
    ```typescript
    test('E2E-SOLVER-07: SUBJECT_MORNING preference CRUD', async ({ page }) => {
      await page.goto('/admin/solver-tuning?tab=preferences');
      // Default sub-tab is "Vormittags-Präferenzen"
      await page.getByRole('button', { name: '+ Vormittags-Präferenz hinzufügen' }).click();
      await page.getByLabel('Fach').click();
      await page.getByPlaceholder('Fach-Name (min. 2 Zeichen) …').fill('Math');
      await page.getByRole('option').first().click();
      await page.getByLabel('Spätestens bis Periode').fill('4');
      await page.getByRole('button', { name: 'Anlegen' }).click();
      await expect(page.getByText(/Bis Periode 4/)).toBeVisible();
      // Edit + Delete (mirrors E2E-SOLVER-04 structure)
      // ...
    });
    ```

    --- E2E-SOLVER-08: subject-pref-preferred-slot-CRUD ---

    Same spec file:
    ```typescript
    test('E2E-SOLVER-08: SUBJECT_PREFERRED_SLOT CRUD', async ({ page }) => {
      await page.goto('/admin/solver-tuning?tab=preferences');
      // Switch to sub-tab b
      await page.getByRole('tab', { name: 'Bevorzugte Slots' }).click();
      await page.getByRole('button', { name: '+ Bevorzugten Slot hinzufügen' }).click();
      await page.getByLabel('Fach').click();
      await page.getByPlaceholder('Fach-Name (min. 2 Zeichen) …').fill('Sport');
      await page.getByRole('option').first().click();
      await page.getByLabel('Wochentag').click();
      await page.getByRole('option', { name: 'Dienstag' }).click();
      await page.getByLabel('Periode').fill('1');
      await page.getByRole('button', { name: 'Anlegen' }).click();
      // Row appears with WochentagBadge "DI" and Periode 1
      await expect(page.getByText('DI', { exact: true })).toBeVisible();
    });
    ```

    --- E2E-SOLVER-09: sub-tab-isolation ---

    Same spec file:
    ```typescript
    test('E2E-SOLVER-09: SUBJECT_MORNING does not appear in Bevorzugte-Slots and vice versa', async ({ page, request }) => {
      const { createConstraintTemplateViaAPI } = await import('./helpers/constraints');
      await createConstraintTemplateViaAPI(request, 'SUBJECT_MORNING', { subjectId: 'seed-subject-mathematik', latestPeriod: 4 });
      await createConstraintTemplateViaAPI(request, 'SUBJECT_PREFERRED_SLOT', { subjectId: 'seed-subject-sport', dayOfWeek: 'TUESDAY', period: 1 });
      await page.goto('/admin/solver-tuning?tab=preferences');
      // Sub-tab a shows only the SUBJECT_MORNING row
      const morningRows = page.locator('[data-template-type="SUBJECT_MORNING"]');
      await expect(morningRows).toHaveCount(1);
      // Switch to sub-tab b, only SUBJECT_PREFERRED_SLOT row visible
      await page.getByRole('tab', { name: 'Bevorzugte Slots' }).click();
      const slotRows = page.locator('[data-template-type="SUBJECT_PREFERRED_SLOT"]');
      await expect(slotRows).toHaveCount(1);
      await expect(page.locator('[data-template-type="SUBJECT_MORNING"]')).toHaveCount(0);
    });
    ```
    NOTE: Plan 14-02-T3 already adds `data-template-type` attributes to row elements (per its acceptance criteria). If executor used different attrs, adapt.

    --- E2E-SOLVER-10: weights-survive-solve-run ---

    Spec: `admin-solver-tuning-integration.spec.ts`
    ```typescript
    import { test, expect } from '@playwright/test';
    import { loginAsAdmin, getAdminToken } from './helpers/login';

    test.skip(process.env.E2E_RUN_SOLVER !== '1', 'requires E2E_RUN_SOLVER=1 + Java sidecar running');

    test('E2E-SOLVER-10: saved weight reaches TimetableRun.constraintConfig after solve', async ({ page, request }) => {
      await loginAsAdmin(page);
      // 1. Save weight via UI
      await page.goto('/admin/solver-tuning?tab=weights');
      const row = page.locator('[data-constraint-name="No same subject doubling"]');
      await row.getByLabel(/Gewichtung für/i).fill('50');
      const putPromise = page.waitForResponse(r => r.url().includes('/constraint-weights') && r.request().method() === 'PUT');
      await page.getByRole('button', { name: 'Änderungen speichern' }).click();
      await putPromise;
      // 2. Trigger solve via API (avoids generator-page UI flake)
      const token = await getAdminToken(request);
      const start = await request.post(
        'http://localhost:3000/api/v1/schools/seed-school-bgbrg-musterstadt/timetable/solve',
        {
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          data: { maxSolveSeconds: 30 },
        },
      );
      expect(start.ok()).toBeTruthy();
      const { runId } = await start.json();
      // 3. Poll until run completes (Phase 9.x precedent: poll runs/:id every 2s, max 60s)
      let run: any;
      for (let i = 0; i < 30; i++) {
        const res = await request.get(
          `http://localhost:3000/api/v1/schools/seed-school-bgbrg-musterstadt/timetable/runs/${runId}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        run = await res.json();
        if (run.status === 'COMPLETE' || run.status === 'FAILED') break;
        await new Promise(r => setTimeout(r, 2000));
      }
      expect(run.status).toBe('COMPLETE');
      // 4. Assert constraintConfig snapshot contains the saved weight
      expect(run.constraintConfig?.['No same subject doubling']).toBe(50);
    });
    ```

    --- E2E-SOLVER-11: audit-trail ---

    Spec: `admin-solver-tuning-audit.spec.ts`
    ```typescript
    test('E2E-SOLVER-11: audit-log entries emitted for weight + template mutations', async ({ page, request }) => {
      await loginAsAdmin(page);
      // Weight change
      await page.goto('/admin/solver-tuning?tab=weights');
      const row = page.locator('[data-constraint-name="No same subject doubling"]');
      await row.getByLabel(/Gewichtung für/i).fill('42');
      await page.getByRole('button', { name: 'Änderungen speichern' }).click();
      await expect(page.getByText('Gewichtungen gespeichert.')).toBeVisible();
      // Template change
      const { createConstraintTemplateViaAPI } = await import('./helpers/constraints');
      await createConstraintTemplateViaAPI(request, 'NO_LESSONS_AFTER', { classId: 'seed-class-1a', maxPeriod: 5 });
      // Fetch audit log (path confirmed in Task 1 sub-task B)
      const token = await getAdminToken(request);
      const audit = await request.get(
        'http://localhost:3000/api/v1/audit-log?subject=constraint-weight-override&limit=10',
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(audit.ok()).toBeTruthy();
      const body = await audit.json();
      // Accept either { data: [...] } or [...] response shape
      const entries = Array.isArray(body) ? body : body.data ?? [];
      // Strict assertions per checker B6 — no `.some()` (would pass with 0 relevant entries
      // if list is non-empty from prior test state). Plan 14-01-T2 wires
      // @CheckPermissions({ subject: 'constraint-weight-override' }) and the audit interceptor
      // logs entries newest-first, so the most recent PUT just performed is at index 0.
      expect(entries.length).toBeGreaterThan(0);
      expect(entries[0].subject).toBe('constraint-weight-override');
      expect(entries[0].action).toBe('update');
      // Same for constraint-template — strict assertion on most recent CREATE
      const audit2 = await request.get(
        'http://localhost:3000/api/v1/audit-log?subject=constraint-template&limit=10',
        { headers: { Authorization: `Bearer ${token}` } },
      );
      const body2 = await audit2.json();
      const entries2 = Array.isArray(body2) ? body2 : body2.data ?? [];
      expect(entries2.length).toBeGreaterThan(0);
      expect(entries2[0].subject).toBe('constraint-template');
      expect(entries2[0].action).toBe('create');
    });
    ```

    --- E2E-SOLVER-MOBILE-01 ---

    Spec: `admin-solver-tuning-mobile.spec.ts`
    ```typescript
    test.use({ viewport: { width: 375, height: 812 } });
    test.skip(({ browserName }) => browserName === 'webkit', 'Mobile WebKit Bus-Error-10 (Phase 10.4-03 precedent)');

    test('E2E-SOLVER-MOBILE-01: mobile 375 tab-bar + slider + dialog', async ({ page }) => {
      await loginAsAdmin(page);
      await page.goto('/admin/solver-tuning?tab=weights');
      // Tab-bar is horizontally scrollable
      const tabList = page.getByRole('tablist').first();
      await expect(tabList).toBeVisible();
      const overflow = await tabList.evaluate(el => getComputedStyle(el).overflowX);
      expect(['auto', 'scroll']).toContain(overflow);
      // Slider thumb tap-zone ≥ 44px
      const thumb = page.locator('[role="slider"]').first();
      const box = await thumb.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      // StickyMobileSaveBar appears when dirty
      const row = page.locator('[data-constraint-name="No same subject doubling"]');
      await row.getByLabel(/Gewichtung für/i).fill('50');
      await expect(page.locator('[data-mobile-save-bar]')).toBeVisible();  // sticky bar selector — Phase 10 convention
      // Sub-Tabs in Tab 4 collapse to ToggleGroup on mobile
      await page.getByRole('tab', { name: 'Fach-Präferenzen' }).click();
      // Per UI-SPEC mobile sub-tabs use ToggleGroup, role="radiogroup"
      await expect(page.getByRole('radiogroup')).toBeVisible();
    });
    ```
    NOTE: `[data-mobile-save-bar]` may not exist as Phase 10 selector — read `apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx` first to find the actual stable selector and adapt.

    --- Update matrix + validation ---

    1. Update `.planning/E2E-COVERAGE-MATRIX.md` rows from `scaffolded` → `green` for all 13 specs (12 SOLVER + 1 RBAC, post-task-3 confirmation).

    2. Fill `.planning/phases/14-solver-tuning/14-VALIDATION.md` per-task table:
       ```markdown
       | Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
       |---------|------|------|-------------|-----------|-------------------|-------------|--------|
       | 14-03-T2 | 03 | 3 | SOLVER-01 | e2e | pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-catalog --project=desktop | ✅ | ✅ green |
       | 14-03-T2 | 03 | 3 | SOLVER-02 | e2e | pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-weights --project=desktop | ✅ | ✅ green |
       | 14-03-T2 | 03 | 3 | SOLVER-04 | e2e | pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-restrictions --project=desktop | ✅ | ✅ green |
       | 14-03-T3 | 03 | 3 | SOLVER-05 | e2e | pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-preferences --project=desktop | ✅ | ✅ green |
       | 14-03-T3 | 03 | 3 | SOLVER-03 | e2e (gated) | E2E_RUN_SOLVER=1 pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-integration --project=desktop | ✅ | ✅ green |
       | 14-03-T3 | 03 | 3 | D-08 audit | e2e | pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-audit --project=desktop | ✅ | ✅ green |
       | 14-03-T3 | 03 | 3 | MOBILE-ADM-01/02 | e2e | pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-mobile --project=desktop | ✅ | ✅ green |
       ```

    3. Set `nyquist_compliant: true` in `.planning/phases/14-solver-tuning/14-VALIDATION.md` frontmatter and `wave_0_complete: true`.

    4. Run the full Phase 14 suite to confirm all 13 specs green:
       ```bash
       pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning- --project=desktop
       ```
  </action>
  <verify>
    <automated>
      pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning- --project=desktop
    </automated>
  </verify>
  <acceptance_criteria>
    - `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning- --project=desktop` exits 0 with all 13 spec tests run (E2E-SOLVER-10 may show as `skipped` unless `E2E_RUN_SOLVER=1`)
    - With `E2E_RUN_SOLVER=1` set: integration spec passes (run separately and document in summary)
    - `.planning/E2E-COVERAGE-MATRIX.md` shows 12 `E2E-SOLVER-*` rows with status `green`
    - `.planning/phases/14-solver-tuning/14-VALIDATION.md` per-task table is filled with concrete commands per requirement; `nyquist_compliant: true` in frontmatter
    - All specs use `loginAsAdmin` from existing harness (no duplicate login flows)
    - All specs use `cleanupConstraintTemplatesViaAPI` + `cleanupConstraintWeightOverridesViaAPI` in afterEach
    - No `test.skip(true)` placeholders remain
  </acceptance_criteria>
  <done>All 13 specs green; coverage matrix updated; validation table reflects reality; UAT-ban (per `feedback_e2e_first_no_uat.md`) is satisfied for Phase 14.</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Test runner → API | Playwright drives both browser actions and direct apiFetch; needs admin Keycloak token |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-14-13 | Tampering | E2E test data leaks into production | accept | Tests run against local dev or CI ephemeral DB; cleanup helpers in afterEach. Seed school is well-known and isolated. No prod risk. |
| T-14-14 | DoS | E2E-SOLVER-10 spawns long-running solve | mitigate | `maxSolveSeconds: 30` cap in spec; gated behind `E2E_RUN_SOLVER=1` so default CI run skips it. |

</threat_model>

<verification>
1. `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning- --project=desktop` exits 0
2. `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning- --project=desktop --list` shows 13 tests (12 SOLVER + 1 RBAC)
3. With local stack running (api+web+keycloak+postgres+sidecar): all 12 green (E2E-SOLVER-10 needs E2E_RUN_SOLVER=1)
4. `.planning/E2E-COVERAGE-MATRIX.md` updated
5. `.planning/phases/14-solver-tuning/14-VALIDATION.md` complete
</verification>

<success_criteria>
- 12 Playwright specs codify all SOLVER-01..05 requirements with grep-verifiable acceptance
- Silent-4xx invariant verified for every Phase 14 mutation
- Coverage matrix reflects new family
- Validation table fully filled
- UAT ban satisfied for Phase 14 per `feedback_e2e_first_no_uat.md`
</success_criteria>

<output>
After completion, create `.planning/phases/14-solver-tuning/14-03-SUMMARY.md` with:
- Final spec count + pass/fail per spec
- Live `playwright test --reporter=list` output excerpt (12 lines)
- E2E_RUN_SOLVER=1 result for E2E-SOLVER-10 (separate run)
- Audit endpoint exact path used (Task 1 sub-task B finding)
- E2E-COVERAGE-MATRIX.md diff summary
- Phase-14 closure recommendation: "Ready for /gsd-verify-work" or list of remaining gaps
</output>
