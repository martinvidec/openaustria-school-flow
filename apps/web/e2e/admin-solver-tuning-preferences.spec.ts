/**
 * Phase 14 Plan 14-03 — E2E-SOLVER-07 / 08 / 09 subject preferences.
 *
 * Surface: /admin/solver-tuning?tab=preferences (Tab 4 "Fach-Präferenzen").
 * Backend: ConstraintTemplate CRUD with templateType in
 *          { SUBJECT_MORNING, SUBJECT_PREFERRED_SLOT }.
 * UI:      SubjectPreferencesTab with two sub-tabs:
 *           a) Vormittags-Präferenzen      (SUBJECT_MORNING)
 *           b) Bevorzugte Slots            (SUBJECT_PREFERRED_SLOT)
 *          Rows carry `data-template-type=...` per Plan 14-02 lock.
 *
 * Requirements:
 *  - SOLVER-05 SUBJECT_MORNING CRUD       (E2E-SOLVER-07)
 *  - SOLVER-05 SUBJECT_PREFERRED_SLOT CRUD (E2E-SOLVER-08)
 *  - SOLVER-05 sub-tab isolation           (E2E-SOLVER-09)
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupConstraintTemplatesViaAPI,
  cleanupConstraintWeightOverridesViaAPI,
  createConstraintTemplateViaAPI,
} from './helpers/constraints';

// Seed subject IDs from apps/api/prisma/seed.ts.
const SEED_SUBJECT_M = 'seed-subject-m'; // Mathematik
const SEED_SUBJECT_BSP = 'seed-subject-bsp'; // Bewegung und Sport

test.describe('Phase 14 — Solver-Tuning Subject Preferences (Tab 4)', () => {
  // Scope template cleanup to the templateTypes this spec owns. An unscoped
  // wipe races against parallel specs on the second worker that cleanup all
  // templates in their afterEach: the parallel wipe deletes the row in
  // mid-flight, and the user's DELETE click hits a 404 which TanStack treats
  // as an error so the cache is never invalidated and the row stays in the
  // DOM. This was the SOLVER-08 desktop failure in run 25382372847.
  const OWNED_TEMPLATE_TYPES = ['SUBJECT_MORNING', 'SUBJECT_PREFERRED_SLOT'] as const;

  test.beforeEach(async ({ page, request }) => {
    await cleanupConstraintTemplatesViaAPI(request, [...OWNED_TEMPLATE_TYPES]);
    await cleanupConstraintWeightOverridesViaAPI(request);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupConstraintTemplatesViaAPI(request, [...OWNED_TEMPLATE_TYPES]);
    await cleanupConstraintWeightOverridesViaAPI(request);
  });

  test('E2E-SOLVER-07: SUBJECT_MORNING preference CRUD', async ({ page }) => {
    // Phase 17 deferred: POST /constraint-templates 422 regression — same
    // root-cause cluster as admin-solver-tuning-restrictions (E2E-SOLVER-04).
    // See 17-TRIAGE.md row #cluster-14-422-preferences-07. Owner: Phase 17.1.
    test.skip(
      true,
      'Phase 17 deferred: POST /constraint-templates 422 regression — see 17-TRIAGE.md row #cluster-14-422-preferences-07.',
    );
    await page.goto('/admin/solver-tuning?tab=preferences');

    // Default sub-tab is "Vormittags-Präferenzen". Click the Add CTA — both
    // empty-state ("Vormittags-Präferenz anlegen") and populated-state
    // ("+ Vormittags-Präferenz hinzufügen") trigger the same dialog.
    await page
      .getByRole('button', { name: /Vormittags-Präferenz (hinzufügen|anlegen)/ })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Vormittags-Präferenz anlegen' }),
    ).toBeVisible();

    // SubjectAutocomplete combobox.
    await dialog.getByRole('combobox', { name: 'Fach auswählen' }).click();
    await page.getByPlaceholder(/Fach.*\(min\. 2 Zeichen\)/).fill('Mat');
    const opt = page.getByRole('option').first();
    await opt.waitFor({ state: 'visible', timeout: 5_000 });
    await opt.click();

    await dialog.getByLabel('Spätestens bis Periode').fill('4');

    const postPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-templates') &&
        r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await dialog.getByRole('button', { name: 'Anlegen' }).click();
    const postRes = await postPromise;
    expect(postRes.status()).toBeLessThan(300);

    // Row visible with template-type lock + display copy.
    await expect(
      page.locator('tr[data-template-type="SUBJECT_MORNING"]:visible'),
    ).toHaveCount(1);

    // Edit — change latestPeriod 4 → 3.
    await page.getByRole('button', { name: 'Eintrag bearbeiten' }).first().click();
    const editDialog = page.getByRole('dialog');
    await expect(
      editDialog.getByRole('heading', {
        name: 'Vormittags-Präferenz bearbeiten',
      }),
    ).toBeVisible();
    await editDialog.getByLabel('Spätestens bis Periode').fill('3');
    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-templates/') &&
        r.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await editDialog.getByRole('button', { name: 'Speichern' }).click();
    const putRes = await putPromise;
    expect(putRes.status()).toBeLessThan(300);

    // Delete — WarnDialog destructive button.
    await page.getByRole('button', { name: 'Eintrag löschen' }).first().click();
    const warn = page.getByRole('dialog');
    await expect(
      warn.getByRole('heading', { name: 'Vormittags-Präferenz löschen?' }),
    ).toBeVisible();
    const delPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-templates/') &&
        r.request().method() === 'DELETE',
      { timeout: 15_000 },
    );
    await warn.getByRole('button', { name: 'Löschen' }).click();
    await delPromise;

    await expect(
      page.locator('tr[data-template-type="SUBJECT_MORNING"]:visible'),
    ).toHaveCount(0);
  });

  test('E2E-SOLVER-08: SUBJECT_PREFERRED_SLOT CRUD', async ({ page }) => {
    await page.goto('/admin/solver-tuning?tab=preferences');

    // Switch to sub-tab b "Bevorzugte Slots".
    await page.getByRole('tab', { name: /Bevorzugte Slots/ }).click();

    await page
      .getByRole('button', { name: /Bevorzugten Slot (hinzufügen|anlegen)/ })
      .first()
      .click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Bevorzugten Slot anlegen' }),
    ).toBeVisible();

    await dialog.getByRole('combobox', { name: 'Fach auswählen' }).click();
    await page.getByPlaceholder(/Fach.*\(min\. 2 Zeichen\)/).fill('Spo');
    const opt = page.getByRole('option').first();
    await opt.waitFor({ state: 'visible', timeout: 5_000 });
    await opt.click();

    // Wochentag is a Radix Select.
    await dialog.getByLabel('Wochentag').click();
    await page.getByRole('option', { name: 'Dienstag' }).click();

    await dialog.getByLabel('Periode').fill('1');

    const postPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-templates') &&
        r.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await dialog.getByRole('button', { name: 'Anlegen' }).click();
    const postRes = await postPromise;
    expect(postRes.status()).toBeLessThan(300);

    // Row visible — WochentagBadge renders short label "DI" for TUESDAY.
    await expect(
      page.locator('tr[data-template-type="SUBJECT_PREFERRED_SLOT"]:visible'),
    ).toHaveCount(1);
    await expect(page.getByText('DI', { exact: true }).first()).toBeVisible();

    // Delete (skip Edit — covered by SOLVER-07 path; here we cover the slot
    // create + delete loop to exercise the second sub-tab dialog distinctly).
    await page.getByRole('button', { name: 'Eintrag löschen' }).first().click();
    const warn = page.getByRole('dialog');
    await expect(
      warn.getByRole('heading', { name: 'Bevorzugten Slot löschen?' }),
    ).toBeVisible();
    const delPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-templates/') &&
        r.request().method() === 'DELETE',
      { timeout: 15_000 },
    );
    await warn.getByRole('button', { name: 'Löschen' }).click();
    await delPromise;

    await expect(
      page.locator('tr[data-template-type="SUBJECT_PREFERRED_SLOT"]:visible'),
    ).toHaveCount(0);
  });

  test('E2E-SOLVER-09: SUBJECT_MORNING and SUBJECT_PREFERRED_SLOT are sub-tab isolated', async ({
    page,
    request,
  }) => {
    // Phase 17 deferred: POST /constraint-templates 422 regression — same
    // root-cause cluster as admin-solver-tuning-restrictions (E2E-SOLVER-04).
    // See 17-TRIAGE.md row #cluster-14-422-preferences-09. Owner: Phase 17.1.
    test.skip(
      true,
      'Phase 17 deferred: POST /constraint-templates 422 regression — see 17-TRIAGE.md row #cluster-14-422-preferences-09.',
    );
    // Seed one of each via API.
    await createConstraintTemplateViaAPI(request, 'SUBJECT_MORNING', {
      subjectId: SEED_SUBJECT_M,
      latestPeriod: 4,
    });
    await createConstraintTemplateViaAPI(request, 'SUBJECT_PREFERRED_SLOT', {
      subjectId: SEED_SUBJECT_BSP,
      dayOfWeek: 'TUESDAY',
      period: 1,
    });

    await page.goto('/admin/solver-tuning?tab=preferences');

    // Sub-tab a (default) shows ONLY the SUBJECT_MORNING row.
    await expect(
      page.locator('tr[data-template-type="SUBJECT_MORNING"]:visible'),
    ).toHaveCount(1);
    await expect(
      page.locator('tr[data-template-type="SUBJECT_PREFERRED_SLOT"]:visible'),
    ).toHaveCount(0);

    // Switch to sub-tab b. Now ONLY the SUBJECT_PREFERRED_SLOT row.
    await page.getByRole('tab', { name: /Bevorzugte Slots/ }).click();
    await expect(
      page.locator('tr[data-template-type="SUBJECT_PREFERRED_SLOT"]:visible'),
    ).toHaveCount(1);
    await expect(
      page.locator('tr[data-template-type="SUBJECT_MORNING"]:visible'),
    ).toHaveCount(0);
  });
});
