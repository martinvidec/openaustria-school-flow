/**
 * Phase 15-10 Plan 15-10 Task 4 — DSGVO-ADM-04 E2E coverage.
 *
 * Surface: /admin/dsgvo?tab=dsfa-vvz&sub=vvz
 * Requirement DSGVO-ADM-04: Admin can CRUD VVZ entries (Art. 30 DSGVO).
 *
 * Mirrors `admin-dsgvo-dsfa.spec.ts` shape — only the surface,
 * selectors, and copy strings differ.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { seedVvzEntry, cleanupAll } from './helpers/dsgvo';

test.describe.configure({ mode: 'serial' });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe('DSGVO-ADM-04 — VVZ-Einträge CRUD', () => {
  const SCHOOL_ID =
    process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';
  const SCHOOL_IS_UUID = UUID_RE.test(SCHOOL_ID);
  const PRESEED_ACTIVITY = 'e2e-15-PRESEED-VVZ';

  test.beforeAll(async ({ request }) => {
    if (SCHOOL_IS_UUID) {
      await seedVvzEntry(request, {
        schoolId: SCHOOL_ID,
        activityName: PRESEED_ACTIVITY,
        purpose: 'e2e seed purpose',
        legalBasis: 'Art. 6 Abs. 1 lit. e DSGVO',
        dataCategories: ['stammdaten'],
        affectedPersons: ['Schüler'],
      });
    }
  });

  test.afterAll(async ({ request }) => {
    if (SCHOOL_IS_UUID) await cleanupAll(request, SCHOOL_ID);
  });

  test('DSGVO-ADM-04: navigates to VVZ sub-tab via URL deep-link', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=dsfa-vvz&sub=vvz');
    await expect(page).toHaveURL(/sub=vvz/);
    await expect(
      page.getByRole('button', { name: 'VVZ-Eintrag anlegen' }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('DSGVO-ADM-04: create + success toast', async ({ page }) => {
    if (!SCHOOL_IS_UUID) {
      test.skip(
        true,
        'E2E_SCHOOL_ID is not a UUID — CreateVvzEntryDto rejects POST. See Deferred Issues.',
      );
    }
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=dsfa-vvz&sub=vvz');

    await page
      .getByRole('button', { name: 'VVZ-Eintrag anlegen' })
      .first()
      .click();
    await page
      .getByLabel('Verarbeitungstätigkeit')
      .fill('e2e-15-CREATE-VVZ');
    await page.getByLabel('Zweck').fill('e2e create flow');
    await page
      .getByLabel('Rechtsgrundlage')
      .fill('Art. 6 Abs. 1 lit. e DSGVO');
    await page
      .getByLabel('Datenkategorien (kommagetrennt)')
      .fill('stammdaten, kontaktdaten');
    await page
      .getByLabel('Betroffene Personen (kommagetrennt)')
      .fill('Schüler, Eltern');
    await page.getByRole('button', { name: 'Anlegen' }).click();

    await expect(page.getByText('VVZ-Eintrag angelegt')).toBeVisible({
      timeout: 5_000,
    });
  });

  test('DSGVO-ADM-04: delete-confirm copy + success toast', async ({
    page,
  }) => {
    if (!SCHOOL_IS_UUID) test.skip();
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=dsfa-vvz&sub=vvz');

    const rows = page.locator('[data-vvz-id]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    await rows.first().getByRole('button', { name: 'Löschen' }).click();

    // Verbatim copy from VvzTable.tsx.
    await expect(
      page.getByText('VVZ-Eintrag wirklich löschen?'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Löschen' }).last().click();
    await expect(page.getByText('VVZ-Eintrag gelöscht')).toBeVisible({
      timeout: 5_000,
    });
  });
});
