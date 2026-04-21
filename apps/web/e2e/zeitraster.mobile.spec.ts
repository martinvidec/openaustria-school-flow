/**
 * Phase 10.2 — Zeitraster save (mobile 375).
 *
 * Covers the md-breakpoint split for the Zeitraster tab:
 *   - Tab switcher is the Select (not TabsList) at <md.
 *   - PeriodsEditor renders the Card layout (not the <table>).
 *   - Save round-trip works the same as desktop; durationMin is included
 *     in the DTO (Plan 10.2-01 Task 1.5 fix).
 *
 * Prereqs identical to admin-school-settings.mobile.spec.ts:
 *   - docker compose up -d postgres redis keycloak
 *   - API on :3000, Vite on :5173
 *   - prisma:seed executed
 */
import { expect, test } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';

test.describe('Phase 10.2 — Zeitraster save (mobile 375)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('ZEIT-03-MOBILE: Happy-Path via Select tab switcher + Card layout', async ({
    page,
    request,
  }) => {
    await page.goto('/admin/school/settings');

    // Switch to the Zeitraster tab via the mobile Select combobox (pattern
    // borrowed from admin-school-settings.mobile.spec.ts).
    const mobileSelect = page.locator('[role="combobox"]').first();
    await expect(mobileSelect).toBeVisible();
    await mobileSelect.click();
    await page.getByRole('option', { name: 'Zeitraster' }).click();
    await expect(page).toHaveURL(/tab=timegrid/);

    // Card mode assertion: PeriodsEditor mobile container is the
    // `md:hidden.space-y-3` div. Visible at <md.
    const mobileCards = page.locator('div.md\\:hidden.space-y-3');
    await expect(mobileCards).toBeVisible();

    // Ensure Mo is on — same client-side validation gate as desktop.
    const moToggle = page.getByRole('button', { name: 'Unterrichtstag Mo' });
    if ((await moToggle.getAttribute('data-state')) !== 'on') {
      await moToggle.click();
    }

    // Add a new period; tag it with a unique marker label.
    await page.getByRole('button', { name: /Periode hinzufuegen/ }).click();
    const marker = `E2E-MOB-${Date.now().toString().slice(-6)}`;
    // Mobile cards use the same Bezeichnung input — match by placeholder.
    const labelInputs = page.getByPlaceholder('1. Stunde');
    const initial = await labelInputs.count();
    // The newly added card is at index (initial - 1) because the add button
    // appends to the end and we just queried the count AFTER adding.
    await labelInputs.nth(initial - 1).fill(marker);

    // Save via the sticky mobile bar (desktop Speichern is .hidden md:flex).
    // Both buttons share the accessible name "Speichern"; use .last() which
    // targets the sticky-bar button on mobile.
    await page.getByRole('button', { name: 'Speichern' }).last().click();
    await expect(page.getByText(/Aenderungen gespeichert/)).toBeVisible();

    // Persistence check via API (same rationale as ZEIT-01 — GET
    // /time-grid is not implemented; see deferred-items.md).
    const token = await getAdminToken(request);
    const schools = (await (
      await request.get('http://localhost:3000/api/v1/schools', {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as Array<{ id: string }>;
    expect(schools.length).toBeGreaterThan(0);
    const schoolId = schools[0].id;
    const school = (await (
      await request.get(`http://localhost:3000/api/v1/schools/${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    ).json()) as {
      timeGrid: {
        periods: Array<{ label: string | null; durationMin: number; startTime: string; endTime: string }>;
      } | null;
    };
    expect(school.timeGrid, 'timeGrid present').not.toBeNull();
    const saved = school.timeGrid!.periods.find((p) => p.label === marker);
    expect(saved, `period with label ${marker}`).toBeDefined();
    expect(saved!.durationMin).toBe(50);

    // Cleanup — remove only the marker row via direct PUT (idempotent).
    const remainingPeriods = school
      .timeGrid!.periods.filter((p) => p.label !== marker)
      .map((p, i) => ({
        periodNumber: i + 1,
        label: p.label ?? '',
        startTime: p.startTime,
        endTime: p.endTime,
        isBreak: false,
        durationMin: p.durationMin,
      }));
    const cleanupRes = await request.put(
      `http://localhost:3000/api/v1/schools/${schoolId}/time-grid?force=true`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { periods: remainingPeriods },
      },
    );
    expect(cleanupRes.ok(), 'cleanup PUT').toBeTruthy();
  });
});
