/**
 * Phase 10 Admin Schulverwaltung — Desktop E2E.
 *
 * Prerequisites:
 *   - docker compose up -d postgres redis keycloak
 *   - API running on its configured port (see apps/api/.env)
 *   - Vite dev server on http://localhost:5173
 *   - prisma:seed executed so an admin user + sample school exist
 *   - DATABASE_URL exported in the test-runner shell (source apps/api/.env)
 */
import { expect, test } from '@playwright/test';
import {
  cleanupOrphanYear,
  seedOrphanYear,
  type OrphanFixture,
} from './fixtures/orphan-year';

test.describe('Phase 10 — Admin School Settings (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/school/settings');
    // Dev stack auto-logs in via Keycloak dev mode or a pre-seeded session.
    // If a login form shows up (Keycloak fallback), the tester fills:
    //   await page.fill('input[name="username"]', 'admin@schoolflow.dev');
    //   await page.fill('input[name="password"]', 'admin');
    //   await page.click('button[type="submit"]');
    // Kept as a comment rather than code so tests don't silently rely on
    // credentials not present in every dev environment.
  });

  test('SCHOOL-01: empty-flow create OR edit-mode pre-fill + tabs enable', async ({
    page,
  }) => {
    await expect(page.getByRole('heading', { name: 'Schulverwaltung' })).toBeVisible();

    const emptyHero = page.getByText('Noch keine Schule angelegt');
    if (await emptyHero.isVisible()) {
      await page.getByLabel('Schulname *').fill('Test Schule Phase 10');
      await page.getByLabel('Schultyp *').click();
      await page.getByRole('option', { name: /Allgemeinbildende hoehere/ }).click();
      await page.getByLabel('Strasse *').fill('Rahlgasse 4');
      await page.getByLabel('PLZ *').fill('1060');
      await page.getByLabel('Ort *').fill('Wien');
      await page.getByRole('button', { name: 'Schule anlegen' }).first().click();
      await expect(page.getByText(/Schule angelegt/)).toBeVisible();
    }

    // After create (or on seeded DB), tabs 2-4 are enabled.
    await expect(page.getByRole('tab', { name: 'Zeitraster' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.getByRole('tab', { name: 'Schuljahre' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
    await expect(page.getByRole('tab', { name: 'Optionen' })).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  test('SCHOOL-02: time grid tab renders toggles + periods + Save', async ({ page }) => {
    await page.goto('/admin/school/settings?tab=timegrid');
    await expect(page.getByText('Unterrichtstage')).toBeVisible();

    // At least Mo-Fr toggles visible.
    for (const day of ['Mo', 'Di', 'Mi', 'Do', 'Fr']) {
      await expect(page.getByRole('button', { name: `Unterrichtstag ${day}` })).toBeVisible();
    }

    await page.getByRole('button', { name: /Periode hinzufuegen/ }).click();
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    await expect(page.getByText(/Aenderungen gespeichert/)).toBeVisible();
  });

  test('SCHOOL-03: create + activate school year + Info Banner', async ({ page }) => {
    await page.goto('/admin/school/settings?tab=years');
    await page.getByRole('button', { name: /Neues Schuljahr anlegen/ }).click();
    // Dialog open — 5 fields.
    await page.getByLabel('Name').fill('2026/2027');
    await page.getByLabel('Start').fill('2026-09-02');
    await page.getByLabel('Semesterwechsel').fill('2027-02-04');
    await page.getByLabel('Ende').fill('2027-07-09');
    await page.getByLabel('Als aktives Schuljahr setzen').click();
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(page.getByText(/Schuljahr angelegt/)).toBeVisible();
    await expect(page.getByText('2026/2027').first()).toBeVisible();
    // Info Banner confirms activation.
    await expect(page.getByText(/ist aktiv seit/)).toBeVisible();
  });

  test('SCHOOL-04: A/B toggle persists across reload + toast "Option gespeichert."', async ({
    page,
  }) => {
    await page.goto('/admin/school/settings?tab=options');
    const toggle = page.getByLabel('A/B-Wochen-Modus aktivieren');
    const initiallyChecked = await toggle.isChecked();
    await toggle.click();
    await expect(page.getByText('Option gespeichert.')).toBeVisible();
    await page.reload();
    await expect(page.getByLabel('A/B-Wochen-Modus aktivieren')).toBeChecked({
      checked: !initiallyChecked,
    });
  });

  test('SCHOOL-05: orphan-guard delete shows German error toast', async ({
    page,
    request,
  }) => {
    const schoolsRes = await request.get('/api/v1/schools');
    expect(schoolsRes.ok()).toBeTruthy();
    const schools = (await schoolsRes.json()) as Array<{ id: string }>;
    expect(schools.length).toBeGreaterThan(0);
    const schoolId = schools[0].id;

    const fixture: OrphanFixture = await seedOrphanYear(schoolId);
    try {
      await page.goto('/admin/school/settings?tab=years');
      const yearLabel = page.getByText(/^ORPHAN-TEST-YEAR-/);
      await expect(yearLabel).toBeVisible();
      const card = yearLabel.locator(
        'xpath=ancestor::*[@data-slot="card" or contains(@class,"card")][1]',
      );
      await card
        .getByRole('button', { name: /Schuljahr ORPHAN-TEST-YEAR-.* loeschen/ })
        .click();
      // Confirm inside the destructive dialog — use the destructive button's name.
      await page.getByRole('button', { name: 'Loeschen' }).last().click();
      await expect(
        page.getByText(/wird noch von .* Eintraegen verwendet/),
      ).toBeVisible();
    } finally {
      await cleanupOrphanYear(fixture);
    }
  });
});
