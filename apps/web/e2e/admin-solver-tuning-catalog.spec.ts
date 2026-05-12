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

test.describe('Phase 14 — Solver-Tuning Catalog (Tab 1)', () => {
  // No template/weight cleanup: this spec is read-only on the catalog tab
  // and doesn't create templates OR modify weights. The weight cleanup is a
  // bulk-PUT-with-empty-map that wipes ALL overrides for the school —
  // unscoped because the school is shared. Calling it here would race
  // against admin-solver-tuning-weights.spec.ts mid-test (E2E-SOLVER-02
  // saves 50, reloads, asserts 50; if our cleanup fires between the save
  // and the reload, the 50 gets wiped → reload reads 10 → assertion fails).
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('E2E-SOLVER-01: catalog read-only with Hard/Soft sections', async ({
    page,
  }) => {
    await page.goto('/admin/solver-tuning?tab=constraints');

    // Section headers — locked at 7 HARD + 9 SOFT in CONSTRAINT_CATALOG
    // (Plan 14-01 baseline + Issue #72 weekTypeCompatibility hard).
    await expect(
      page.getByRole('heading', { name: 'Hard-Constraints (7)' }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Soft-Constraints (9)' }),
    ).toBeVisible();

    // Row count via the locked Plan 14-02 selector `data-severity`.
    await expect(page.locator('[data-severity="HARD"]')).toHaveCount(7);
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
