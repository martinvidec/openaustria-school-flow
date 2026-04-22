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
import { getAdminToken, loginAsAdmin } from './helpers/login';

test.describe('Phase 10 — Admin School Settings (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    // 10.3-01: loginAsRole no longer navigates to /admin/school/settings;
    // specs own their own post-login routing. This beforeEach restores the
    // pre-10.3 behavior for the admin-school-settings.spec shell.
    await page.goto('/admin/school/settings');
  });

  // 10.4-02: throwaway cleanup for SCHOOL-03 E2E-SCHOOL03-* rows.
  // Prevents DB leak across spec runs + parallel-worker accumulation on
  // the shared seed school. Best-effort: guards against stack-down via
  // yearsRes.ok() checks. The activate-seed-then-delete-throwaway order
  // is essential because SchoolYearService.remove throws ConflictException
  // on active years (see school-year.service.spec.ts Test 4b).
  test.afterEach(async ({ request }) => {
    const token = await getAdminToken(request);
    const schoolsRes = await request.get('http://localhost:3000/api/v1/schools', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!schoolsRes.ok()) return;
    const schools = (await schoolsRes.json()) as Array<{ id: string }>;
    if (schools.length === 0) return;
    const schoolId = schools[0].id;
    const yearsRes = await request.get(
      `http://localhost:3000/api/v1/schools/${schoolId}/school-years`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!yearsRes.ok()) return;
    const years = (await yearsRes.json()) as Array<{
      id: string;
      name: string;
      isActive: boolean;
    }>;
    const throwaways = years.filter((y) => y.name.startsWith('E2E-SCHOOL03-'));
    // Find a non-throwaway non-orphan-fixture seed year to re-activate if any
    // throwaway is currently active.
    const seedYear = years.find(
      (y) =>
        !y.name.startsWith('E2E-SCHOOL03-') && !y.name.startsWith('ORPHAN-TEST-YEAR-'),
    );
    for (const t of throwaways) {
      if (t.isActive && seedYear) {
        // Re-activate seed year BEFORE deleting throwaway — demotes throwaway
        // atomically via SchoolYearService.activate().
        await request.post(
          `http://localhost:3000/api/v1/schools/${schoolId}/school-years/${seedYear.id}/activate`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
      }
      await request.delete(
        `http://localhost:3000/api/v1/schools/${schoolId}/school-years/${t.id}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
    }
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

    // 10.4-01 Rule-1 auto-fix: TimeGridSchema requires >=1 Periode AND >=1
    // Unterrichtstag — otherwise handleSave short-circuits on the client-side
    // validator and the success toast never appears. Before adding a new
    // period, ensure at least Mo is toggled on (idempotent — no-op if already
    // pressed). Same minimum-valid-state bootstrap WOCH-01 documents at L61-87.
    const moToggle = page.getByRole('button', { name: 'Unterrichtstag Mo' });
    if ((await moToggle.getAttribute('aria-pressed')) !== 'true') {
      await moToggle.click();
    }
    await page.getByRole('button', { name: /Periode hinzufuegen/ }).click();
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    await expect(page.getByText(/Aenderungen gespeichert/)).toBeVisible();
  });

  test('SCHOOL-03: create + activate school year + Info Banner', async ({
    page,
    request,
  }) => {
    // 10.4-02: parameterize year name to avoid multi-worker collision
    // (seed school is shared across all admin-school-settings workers).
    const yearName = `E2E-SCHOOL03-${Date.now()}`;
    await page.goto('/admin/school/settings?tab=years');
    await page.getByRole('button', { name: /Neues Schuljahr anlegen/ }).click();
    // Dialog open — 5 fields.
    await page.getByLabel('Name').fill(yearName);
    await page.getByLabel('Start').fill('2026-09-02');
    await page.getByLabel('Semesterwechsel').fill('2027-02-04');
    await page.getByLabel('Ende').fill('2027-07-09');
    await page.getByLabel('Als aktives Schuljahr setzen').click();
    await page.getByRole('button', { name: 'Anlegen' }).click();
    await expect(page.getByText(/Schuljahr angelegt/)).toBeVisible();
    await expect(page.getByText(yearName).first()).toBeVisible();
    // Info Banner confirms activation.
    await expect(page.getByText(/ist aktiv seit/)).toBeVisible();

    // 10.4-02: Post-toast API invariant check — canonical source of truth.
    // Proves atomic-demote landed: exactly ONE active year for this school,
    // and it is the one we just created. Same pattern as 10.2 WOCH-01 +
    // ZEIT-01 (API read, not UI reload).
    const token = await getAdminToken(request);
    const schoolsRes = await request.get('http://localhost:3000/api/v1/schools', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(schoolsRes.ok(), 'schools list').toBeTruthy();
    const schools = (await schoolsRes.json()) as Array<{ id: string }>;
    const schoolId = schools[0].id;

    const yearsRes = await request.get(
      `http://localhost:3000/api/v1/schools/${schoolId}/school-years`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(yearsRes.ok(), 'school-years list').toBeTruthy();
    const years = (await yearsRes.json()) as Array<{
      id: string;
      name: string;
      isActive: boolean;
    }>;

    // single-active invariant
    const activeYears = years.filter((y) => y.isActive);
    expect(activeYears, 'exactly one active year').toHaveLength(1);
    // The active year is the one we just created
    expect(activeYears[0].name).toBe(yearName);
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
