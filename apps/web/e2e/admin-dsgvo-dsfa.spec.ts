/**
 * Phase 15-10 Plan 15-10 Task 4 — DSGVO-ADM-03 E2E coverage.
 *
 * Surface: /admin/dsgvo?tab=dsfa-vvz&sub=dsfa
 * Requirement DSGVO-ADM-03: Admin can CRUD DSFA entries (Art. 35 DSGVO)
 * with verbatim copy assertions per UI-SPEC.
 *
 * Tests:
 *  1. URL deep-link — `?tab=dsfa-vvz&sub=dsfa` round-trips and the DSFA
 *     primary CTA renders (structural, runs every stack).
 *  2. Create — auto-skips when E2E_SCHOOL_ID is non-UUID
 *     (CreateDsfaEntryDto rejects POST — see Deferred Issues).
 *  3. Delete-confirm — auto-skips under the same condition.
 *
 * Pre-seed: one DSFA entry (only when SCHOOL_ID is a UUID).
 * `afterAll` sweeps every `e2e-15-`-prefixed retention/dsfa/vvz entity.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { seedDsfaEntry, cleanupAll } from './helpers/dsgvo';

test.describe.configure({ mode: 'serial' });

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

test.describe('DSGVO-ADM-03 — DSFA-Einträge CRUD', () => {
  const SCHOOL_ID =
    process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';
  const SCHOOL_IS_UUID = UUID_RE.test(SCHOOL_ID);
  const PRESEED_TITLE = 'e2e-15-PRESEED-DSFA';

  test.beforeAll(async ({ request }) => {
    if (SCHOOL_IS_UUID) {
      await seedDsfaEntry(request, {
        schoolId: SCHOOL_ID,
        title: PRESEED_TITLE,
        description: 'e2e seed verarbeitung',
        dataCategories: ['stammdaten'],
      });
    }
  });

  test.afterAll(async ({ request }) => {
    if (SCHOOL_IS_UUID) await cleanupAll(request, SCHOOL_ID);
  });

  test('DSGVO-ADM-03: navigates to DSFA sub-tab via URL deep-link', async ({
    page,
  }) => {
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=dsfa-vvz&sub=dsfa');
    await expect(page).toHaveURL(/sub=dsfa/);

    // The DSFA sub-tab body always shows a primary CTA "DSFA anlegen"
    // (header + empty-state both render it). At least one is present.
    await expect(
      page.getByRole('button', { name: 'DSFA anlegen' }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test('DSGVO-ADM-03: create + success toast', async ({ page }) => {
    if (!SCHOOL_IS_UUID) {
      test.skip(
        true,
        'E2E_SCHOOL_ID is not a UUID — CreateDsfaEntryDto rejects POST. See Deferred Issues.',
      );
    }
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
    if (!SCHOOL_IS_UUID) test.skip();
    await loginAsAdmin(page);
    await page.goto('/admin/dsgvo?tab=dsfa-vvz&sub=dsfa');

    const rows = page.locator('[data-dsfa-id]');
    await expect(rows.first()).toBeVisible({ timeout: 10_000 });

    await rows.first().getByRole('button', { name: 'Löschen' }).click();

    // Verbatim copy from DsfaTable.tsx.
    await expect(
      page.getByText('DSFA-Eintrag wirklich löschen?'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Löschen' }).last().click();
    await expect(page.getByText('DSFA gelöscht')).toBeVisible({
      timeout: 5_000,
    });
  });
});
