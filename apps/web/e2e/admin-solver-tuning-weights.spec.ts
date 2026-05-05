/**
 * Phase 14 Plan 14-03 — E2E-SOLVER-02 + E2E-SOLVER-03 weights edit/save/reset.
 *
 * Surface: /admin/solver-tuning?tab=weights (Tab 2 "Gewichtungen").
 * Backend: PUT /api/v1/schools/:schoolId/constraint-weights (replace-all-in-tx).
 *          DELETE /api/v1/schools/:schoolId/constraint-weights/:constraintName
 * UI:      ConstraintWeightsTab + ConstraintWeightSliderRow with
 *          `data-constraint-name` row selector and `aria-label` for the
 *          number input + reset button (Plan 14-02 locked).
 *
 * Requirements:
 *  - SOLVER-02 — happy path (E2E-SOLVER-02)
 *  - SOLVER-02 silent-4xx-invariante / SOLVER-03 — bounds validation surfaces
 *    inline error AND backend 422 with type URI weight-out-of-range
 *    (E2E-SOLVER-03).
 *
 * The DriftBanner (`data-testid="drift-banner"`) requires both a non-null
 * `lastUpdatedAt` AND a non-null latest-run `completedAt`. The seed school
 * may not have a prior solve, so we do NOT assert the banner here — it is
 * proven separately by E2E-SOLVER-10 (integration spec, gated on
 * E2E_RUN_SOLVER=1). Instead we verify the success toast + persisted value.
 */
import { test, expect } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  CONSTRAINT_API,
  CONSTRAINT_SCHOOL_ID,
  cleanupConstraintWeightOverridesViaAPI,
} from './helpers/constraints';

const CONSTRAINT_NAME = 'No same subject doubling';

test.describe('Phase 14 — Solver-Tuning Weights (Tab 2)', () => {
  // No template cleanup: this spec works on weights, not templates. An
  // unscoped template wipe would race against parallel template-creating
  // specs (see admin-solver-tuning-preferences.spec.ts SOLVER-08 desktop).
  test.beforeEach(async ({ page, request }) => {
    await cleanupConstraintWeightOverridesViaAPI(request);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupConstraintWeightOverridesViaAPI(request);
  });

  test('E2E-SOLVER-02: weights edit + save + reset cycle', async ({ page }) => {
    await page.goto('/admin/solver-tuning?tab=weights');

    const row = page.locator(`[data-constraint-name="${CONSTRAINT_NAME}"]`);
    await expect(row).toBeVisible();

    // Aria-label exposed by ConstraintWeightSliderRow:
    //   `Gewichtung für ${entry.displayName}` ("Kein Doppel-Fach hintereinander").
    const numberInput = row.getByLabel(/^Gewichtung für /);
    await numberInput.fill('50');

    // Save — global PUT /constraint-weights replace-all-in-tx.
    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-weights') &&
        r.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    const saveButton = page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first();
    await saveButton.click();
    const putRes = await putPromise;
    expect(putRes.status(), 'PUT should succeed (200)').toBe(200);

    // Reload and verify persistence.
    await page.reload();
    const reloadedRow = page.locator(
      `[data-constraint-name="${CONSTRAINT_NAME}"]`,
    );
    const reloadedInput = reloadedRow.getByLabel(/^Gewichtung für /);
    await expect(reloadedInput).toHaveValue('50');

    // Reset to default via the icon-only Reset button on the same row.
    const resetBtn = reloadedRow.getByRole('button', {
      name: 'Auf Default zurücksetzen',
    });
    await resetBtn.click();
    // Default for "No same subject doubling" is 10 (per
    // packages/shared/src/validation/constraint-weight.ts DEFAULT_CONSTRAINT_WEIGHTS).
    await expect(reloadedInput).toHaveValue('10');

    // Save the reset and confirm 200.
    const putPromise2 = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-weights') &&
        r.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first()
      .click();
    const putRes2 = await putPromise2;
    expect(putRes2.status(), 'PUT (reset) should succeed (200)').toBe(200);
  });

  test('E2E-SOLVER-03: weight bounds validation — UI inline error AND backend 422', async ({
    page,
    request,
  }) => {
    // 1) UI front-end Zod gating: out-of-range value produces an inline error
    //    AND/OR disables the save button. Both are acceptable per UI-SPEC §Tab 2.
    await page.goto('/admin/solver-tuning?tab=weights');

    const row = page.locator(`[data-constraint-name="${CONSTRAINT_NAME}"]`);
    const numberInput = row.getByLabel(/^Gewichtung für /);
    await numberInput.fill('150');

    const saveButton = page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first();
    const inlineError = page.getByText(
      /Gewichtungen müssen zwischen 0 und 100 liegen/,
    );

    // Either visible inline error OR disabled Save button — both prevent submit.
    await expect
      .poll(
        async () => {
          const disabled = await saveButton.isDisabled().catch(() => false);
          const errorVisible = await inlineError
            .first()
            .isVisible()
            .catch(() => false);
          return disabled || errorVisible;
        },
        { timeout: 3000, message: 'frontend bounds gate must trigger' },
      )
      .toBe(true);

    // 2) Server-direct 422 with type URI `weight-out-of-range` — silent-4xx
    //    invariant guarantees the backend rejects bypassed UI input. This is
    //    the codified RFC 9457 Plan 14-01 contract.
    const token = await getAdminToken(request);
    const direct = await request.put(
      `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/constraint-weights`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { weights: { [CONSTRAINT_NAME]: 200 } },
      },
    );
    expect(
      direct.status(),
      'backend must return 422 for weight=200',
    ).toBe(422);
    const body = (await direct.json()) as { type?: string };
    expect(body.type).toContain('weight-out-of-range');
  });
});
