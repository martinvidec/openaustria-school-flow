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
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

test.describe.configure({ mode: 'serial' });

test.describe('DSGVO-ADM-03 — DSFA-Einträge CRUD', () => {
  // Phase 15.1: SEED_SCHOOL_UUID is a valid UUID, so CreateDsfaEntryDto
  // accepts the seed school. UUID skip-guards removed.
  const SCHOOL_ID = process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;
  const PRESEED_TITLE = 'e2e-15-PRESEED-DSFA';

  test.beforeAll(async ({ request }) => {
    await seedDsfaEntry(request, {
      schoolId: SCHOOL_ID,
      title: PRESEED_TITLE,
      description: 'e2e seed verarbeitung',
      dataCategories: ['stammdaten'],
    });
  });

  test.afterAll(async ({ request }) => {
    // Scope cleanup to this spec's own entity type — sweeping vvz/retention
    // here would race against the parallel admin-dsgvo-vvz / admin-dsgvo-
    // retention spec on the second worker (manifests as 404 on the other
    // spec's in-flight DELETE).
    await cleanupAll(request, SCHOOL_ID, { entities: ['dsfa'] });
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
