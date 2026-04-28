/**
 * Phase 15-10 Plan 15-10 Task 3 — DSGVO-ADM-02 E2E coverage.
 *
 * Surface: /admin/dsgvo?tab=retention
 * Requirement DSGVO-ADM-02: Admin can CRUD retention policies per
 * data category (verbatim copy assertions per UI-SPEC §
 * Destructive confirmations).
 *
 * Tests:
 *  1. Create — open dialog, fill `Datenkategorie` + `Aufbewahrung
 *     (Tage)`, submit, assert the row renders via
 *     `[data-retention-category]`.
 *  2. Edit — bump retentionDays on the pre-seeded row, assert the
 *     "Aufbewahrungsrichtlinie aktualisiert" toast.
 *  3. Delete-confirm — open dialog, assert verbatim copy
 *     "Aufbewahrungsrichtlinie wirklich löschen?", confirm,
 *     assert "Aufbewahrungsrichtlinie gelöscht" toast.
 *
 * Pre-seed: one policy with `dataCategory='e2e-15-PRESEED'` for the
 * edit + delete tests; the create test uses a separate
 * `e2e-15-CREATE` category.
 *
 * `afterAll` calls `cleanupAll(request, schoolId)` — the helper
 * sweeps every retention/dsfa/vvz entity prefixed `e2e-15-` so a
 * partial failure mid-spec doesn't poison subsequent runs.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { seedRetentionPolicy, cleanupAll } from './helpers/dsgvo';

test.describe.configure({ mode: 'serial' });

test.describe('DSGVO-ADM-02 — Aufbewahrungsrichtlinien CRUD', () => {
  const SCHOOL_ID =
    process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';
  const PRESEED_CATEGORY = 'e2e-15-PRESEED';
  const CREATE_CATEGORY = 'e2e-15-CREATE';

  test.beforeAll(async ({ request }) => {
    if (!SCHOOL_ID) test.skip(true, 'E2E_SCHOOL_ID not set');
    await seedRetentionPolicy(request, {
      schoolId: SCHOOL_ID,
      dataCategory: PRESEED_CATEGORY,
      retentionDays: 365,
    });
  });

  test.afterAll(async ({ request }) => {
    if (SCHOOL_ID) await cleanupAll(request, SCHOOL_ID);
  });

  test('DSGVO-ADM-02: create + table refresh', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=retention');

    // The "Neue Richtlinie" CTA may appear twice when the empty-state
    // banner shows (header + banner). `.first()` covers both shapes.
    await page.getByRole('button', { name: 'Neue Richtlinie' }).first().click();

    await page.getByLabel('Datenkategorie').fill(CREATE_CATEGORY);
    await page.getByLabel('Aufbewahrung (Tage)').fill('730');
    await page.getByRole('button', { name: 'Anlegen' }).click();

    // Hook fires `toast.success('Aufbewahrungsrichtlinie angelegt')`.
    await expect(
      page.getByText('Aufbewahrungsrichtlinie angelegt'),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.locator(`[data-retention-category="${CREATE_CATEGORY}"]`),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('DSGVO-ADM-02: edit retentionDays', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=retention');

    const row = page.locator(
      `[data-retention-category="${PRESEED_CATEGORY}"]`,
    );
    await expect(row).toBeVisible({ timeout: 10_000 });
    await row.getByRole('button', { name: 'Bearbeiten' }).click();

    // Datenkategorie input is disabled in edit mode (per RetentionEditDialog).
    await page.getByLabel('Aufbewahrung (Tage)').fill('1000');
    await page.getByRole('button', { name: 'Speichern' }).click();

    await expect(
      page.getByText('Aufbewahrungsrichtlinie aktualisiert'),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('DSGVO-ADM-02: delete-confirm copy + confirm fires success toast', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=retention');

    // Create a throwaway row to delete (avoids interfering with the
    // PRESEED row used by the edit test).
    const TARGET = `e2e-15-DELETE-${Date.now()}`;
    await page.getByRole('button', { name: 'Neue Richtlinie' }).first().click();
    await page.getByLabel('Datenkategorie').fill(TARGET);
    await page.getByLabel('Aufbewahrung (Tage)').fill('100');
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(
      page.locator(`[data-retention-category="${TARGET}"]`),
    ).toBeVisible({ timeout: 5_000 });

    const row = page.locator(`[data-retention-category="${TARGET}"]`);
    await row.getByRole('button', { name: 'Löschen' }).click();

    // Verbatim copy from RetentionTab.tsx (UI-SPEC § Destructive confirmations).
    await expect(
      page.getByText('Aufbewahrungsrichtlinie wirklich löschen?'),
    ).toBeVisible();

    // Confirm — there are two "Löschen" buttons on screen now (row + dialog).
    // The dialog footer one is the most recent, hence .last().
    await page.getByRole('button', { name: 'Löschen' }).last().click();

    await expect(
      page.getByText('Aufbewahrungsrichtlinie gelöscht'),
    ).toBeVisible({ timeout: 5_000 });
  });
});
