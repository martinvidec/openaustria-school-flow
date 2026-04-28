/**
 * Phase 15-10 Plan 15-10 Task 4 — DSGVO-ADM-03 E2E coverage.
 *
 * Surface: /admin/dsgvo?tab=dsfa-vvz&sub=dsfa
 * Requirement DSGVO-ADM-03: Admin can CRUD DSFA entries (Art. 35 DSGVO)
 * with verbatim copy assertions per UI-SPEC.
 *
 * Tests:
 *  1. URL deep-link — `?tab=dsfa-vvz&sub=dsfa` round-trips and the DSFA
 *     sub-tab body renders.
 *  2. Create — open dialog, fill required fields (Titel +
 *     Beschreibung der Verarbeitung + Datenkategorien), submit, assert
 *     "DSFA angelegt" toast.
 *  3. Delete-confirm — verbatim copy "DSFA-Eintrag wirklich löschen?",
 *     confirm, "DSFA gelöscht" toast.
 *
 * Pre-seed: one DSFA entry with `title='e2e-15-PRESEED-DSFA'` for the
 * delete test. afterAll sweeps every `e2e-15-`-prefixed retention/dsfa/vvz
 * entity.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { seedDsfaEntry, cleanupAll } from './helpers/dsgvo';

test.describe.configure({ mode: 'serial' });

test.describe('DSGVO-ADM-03 — DSFA-Einträge CRUD', () => {
  const SCHOOL_ID =
    process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';
  const PRESEED_TITLE = 'e2e-15-PRESEED-DSFA';

  test.beforeAll(async ({ request }) => {
    if (!SCHOOL_ID) test.skip(true, 'E2E_SCHOOL_ID not set');
    await seedDsfaEntry(request, {
      schoolId: SCHOOL_ID,
      title: PRESEED_TITLE,
      description: 'e2e seed verarbeitung',
      dataCategories: ['stammdaten'],
    });
  });

  test.afterAll(async ({ request }) => {
    if (SCHOOL_ID) await cleanupAll(request, SCHOOL_ID);
  });

  test('DSGVO-ADM-03: navigates to DSFA sub-tab via URL deep-link', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=dsfa-vvz&sub=dsfa');
    await expect(page).toHaveURL(/sub=dsfa/);

    // The DSFA sub-tab body has a primary CTA "DSFA anlegen" that doubles
    // as the empty-state CTA — at least one is always present.
    await expect(
      page.getByRole('button', { name: 'DSFA anlegen' }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('DSGVO-ADM-03: create + success toast', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=dsfa-vvz&sub=dsfa');

    await page.getByRole('button', { name: 'DSFA anlegen' }).first().click();

    await page.getByLabel('Titel').fill('e2e-15-CREATE-DSFA');
    await page
      .getByLabel('Beschreibung der Verarbeitung')
      .fill('e2e create flow');
    await page
      .getByLabel('Datenkategorien (kommagetrennt)')
      .fill('stammdaten, kontaktdaten');
    await page.getByRole('button', { name: 'Anlegen' }).click();

    await expect(page.getByText('DSFA angelegt')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('DSGVO-ADM-03: delete-confirm copy + success toast', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=dsfa-vvz&sub=dsfa');

    const rows = page.locator('[data-dsfa-id]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    // Click "Löschen" on the first row.
    await rows.first().getByRole('button', { name: 'Löschen' }).click();

    // Verbatim copy from DsfaTable.tsx.
    await expect(
      page.getByText('DSFA-Eintrag wirklich löschen?'),
    ).toBeVisible();

    // Confirm via the dialog footer Löschen button (.last() — row + dialog both render it).
    await page.getByRole('button', { name: 'Löschen' }).last().click();

    await expect(page.getByText('DSFA gelöscht')).toBeVisible({
      timeout: 5_000,
    });
  });
});
