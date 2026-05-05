/**
 * Phase 14 Plan 14-03 — E2E-SOLVER-01 catalog read-only.
 *
 * Surface: /admin/solver-tuning?tab=constraints (Tab 1 "Constraints").
 * Backend: GET /api/v1/schools/:schoolId/timetable/constraint-catalog (15 entries).
 * UI:      ConstraintCatalogTab + ConstraintCatalogRow with `data-severity` selectors.
 *
 * Requirement: SOLVER-01 (Hard/Soft transparency, deep-link to Tab 2 for Soft rows).
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { cleanupConstraintWeightOverridesViaAPI } from './helpers/constraints';

test.describe('Phase 14 — Solver-Tuning Catalog (Tab 1)', () => {
  // No template cleanup: this spec doesn't create constraint-templates and
  // an unscoped wipe would race against parallel template-creating specs
  // on the second worker (see admin-solver-tuning-preferences.spec.ts for
  // the SOLVER-08 desktop failure pattern).
  test.beforeEach(async ({ page, request }) => {
    await cleanupConstraintWeightOverridesViaAPI(request);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupConstraintWeightOverridesViaAPI(request);
  });

  test('E2E-SOLVER-01: catalog read-only with Hard/Soft sections', async ({
    page,
  }) => {
    await page.goto('/admin/solver-tuning?tab=constraints');

    // Section headers — locked at 6 HARD + 9 SOFT in CONSTRAINT_CATALOG (Plan 14-01 invariant).
    await expect(
      page.getByRole('heading', { name: 'Hard-Constraints (6)' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Soft-Constraints (9)' }),
    ).toBeVisible();

    // Row count via the locked Plan 14-02 selector `data-severity`.
    await expect(page.locator('[data-severity="HARD"]')).toHaveCount(6);
    await expect(page.locator('[data-severity="SOFT"]')).toHaveCount(9);

    // Hard rows do NOT have an "Gewichtung bearbeiten" edit button.
    const firstHardRow = page.locator('[data-severity="HARD"]').first();
    await expect(
      firstHardRow.getByRole('button', { name: 'Gewichtung bearbeiten' }),
    ).toHaveCount(0);

    // Soft row deep-link → Tab 2 "Gewichtungen".
    const firstSoftRow = page.locator('[data-severity="SOFT"]').first();
    await firstSoftRow
      .getByRole('button', { name: 'Gewichtung bearbeiten' })
      .click();

    await expect(
      page.getByRole('tab', { name: 'Gewichtungen', selected: true }),
    ).toBeVisible();
  });
});
