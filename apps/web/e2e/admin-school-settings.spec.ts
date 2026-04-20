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
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  cleanupOrphanYear,
  seedOrphanYear,
  type OrphanFixture,
} from './fixtures/orphan-year';

const ADMIN_USER = process.env.E2E_ADMIN_USER ?? 'admin-user';
const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? 'admin123';

async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto('/admin/school/settings');
  // The SPA auth gate calls keycloak.login() which redirects to
  // http://localhost:8080/realms/schoolflow/protocol/openid-connect/auth?...
  // Wait for that redirect to complete, then fill the Keycloak login form.
  await page
    .waitForURL(/realms\/schoolflow\/protocol\/openid-connect\/auth/, {
      timeout: 15_000,
    })
    .catch(() => {});

  const userField = page.locator('input[name="username"]').first();
  if (await userField.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await userField.fill(ADMIN_USER);
    await page.locator('input[name="password"]').first().fill(ADMIN_PASS);
    await page
      .locator('input[type="submit"], button[type="submit"], button[name="login"]')
      .first()
      .click();
  }

  // After Keycloak returns us to the SPA, the authenticated layout may show a
  // spinner until useUserContext hydrates. Wait for the sidebar to render,
  // then navigate explicitly to the settings route (the redirect sometimes
  // drops us on '/' instead of the originally-requested href). Finally, click
  // the Schulverwaltung sidebar link as a deterministic path to the page.
  await page.waitForLoadState('domcontentloaded').catch(() => {});
  // Sidebar is the first reliable signal that the authenticated layout is up.
  await page
    .waitForSelector('a[href="/admin/school/settings"]', { timeout: 30_000 })
    .catch(() => {});
  if (!page.url().includes('/admin/school/settings')) {
    await page.getByRole('link', { name: 'Schulverwaltung' }).click();
  }
  // Wait until the tab shell has fully hydrated — schoolContext isLoaded
  // + TabsList rendered.
  await page
    .waitForSelector('[role="tablist"]', { timeout: 30_000 })
    .catch(() => {});
}

async function getAdminToken(request: APIRequestContext): Promise<string> {
  const form = new URLSearchParams({
    grant_type: 'password',
    client_id: 'schoolflow-api',
    username: ADMIN_USER,
    password: ADMIN_PASS,
  });
  const res = await request.post(
    'http://localhost:8080/realms/schoolflow/protocol/openid-connect/token',
    {
      data: form.toString(),
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    },
  );
  expect(res.ok(), 'Keycloak token endpoint').toBeTruthy();
  const body = (await res.json()) as { access_token: string };
  return body.access_token;
}

test.describe('Phase 10 — Admin School Settings (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
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
    // /api/v1/schools is permission-gated; obtain a Keycloak bearer token
    // via direct-access-grant so the API request doesn't 401.
    const token = await getAdminToken(request);
    const schoolsRes = await request.get('http://localhost:3000/api/v1/schools', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(schoolsRes.ok(), 'schools list').toBeTruthy();
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
