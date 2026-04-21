/**
 * Phase 10.2 — Zeitraster save (desktop)
 *
 * Why this file exists:
 *   admin-school-settings.spec.ts (SCHOOL-02) only exercises the render +
 *   empty-save happy-path of the Zeitraster tab. The real PUT /time-grid
 *   round-trip with an actual period edit was never asserted — which is
 *   why the UAT 500 regression slipped through in Phase 10. These two
 *   specs add the missing coverage:
 *     ZEIT-01  — happy-path add-period + save + reload + assert persistence
 *     ZEIT-02  — error-path mocked 422 → red toast, NEVER green toast
 *
 * Prerequisites (same as admin-school-settings.spec.ts):
 *   - docker compose up -d postgres redis keycloak
 *   - API on :3000, Vite on :5173
 *   - prisma:seed executed (admin + sample school)
 *   - DATABASE_URL exported in the runner shell
 */
import { expect, test } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';

test.describe('Phase 10.2 — Zeitraster save (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('ZEIT-01: Happy-Path — add period, save, assert DB persistence via API', async ({
    page,
    request,
  }) => {
    await page.goto('/admin/school/settings?tab=timegrid');
    // Sanity: PeriodsEditor + Speichern present.
    await expect(page.getByText('Unterrichtstage', { exact: true })).toBeVisible();

    // TimeGridSchema requires at least one Unterrichtstag. Ensure Mo is
    // active (no-op if already pressed) so the client-side validator in
    // TimeGridTab doesn't short-circuit before the PUT is issued.
    const moToggle = page.getByRole('button', { name: 'Unterrichtstag Mo' });
    if ((await moToggle.getAttribute('data-state')) !== 'on') {
      await moToggle.click();
    }

    // Count existing period rows via the remove-button role (one per row).
    const removeButtons = page.getByRole('button', { name: 'Periode entfernen' });
    const initialCount = await removeButtons.count();

    // Add a new period — PeriodsEditor appends { startTime:'08:00', endTime:'08:50' }.
    await page.getByRole('button', { name: /Periode hinzufuegen/ }).click();

    // Tag the new row with a unique label so we can find it in the DB
    // post-save. Desktop layout is a <table>; all label inputs share the
    // placeholder "1. Stunde".
    const marker = `E2E-${Date.now().toString().slice(-6)}`;
    const labelInputs = page.getByPlaceholder('1. Stunde');
    // The newly added row is at index `initialCount`.
    await labelInputs.nth(initialCount).fill(marker);

    // Trigger save. Speichern button lives in the Zeitraster card (`.first()`
    // — StickyMobileSaveBar also renders a Speichern but is hidden at desktop).
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    await expect(page.getByText(/Aenderungen gespeichert/)).toBeVisible();

    // Persistence check — hit the API directly. The GET /time-grid endpoint
    // is not implemented (pre-existing gap logged in deferred-items.md),
    // but `GET /schools/:id` embeds the timeGrid sub-object with periods.
    // This is the canonical proof that the PUT actually landed in the DB
    // and closes the UAT 500-regression surface:
    //   1. Fix 1 (commit 23d09bc) ensures the client sends durationMin.
    //   2. This API-layer assertion proves the server persisted the row.
    const token = await getAdminToken(request);
    const schoolsRes = await request.get('http://localhost:3000/api/v1/schools', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(schoolsRes.ok(), 'schools list').toBeTruthy();
    const schools = (await schoolsRes.json()) as Array<{ id: string }>;
    expect(schools.length).toBeGreaterThan(0);
    const schoolId = schools[0].id;
    const schoolRes = await request.get(
      `http://localhost:3000/api/v1/schools/${schoolId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(schoolRes.ok(), 'school detail').toBeTruthy();
    const school = (await schoolRes.json()) as {
      timeGrid: {
        periods: Array<{
          label: string | null;
          durationMin: number;
          startTime: string;
          endTime: string;
        }>;
      } | null;
    };
    expect(school.timeGrid, 'timeGrid present').not.toBeNull();
    const saved = school.timeGrid!.periods.find((p) => p.label === marker);
    expect(saved, `period with label ${marker}`).toBeDefined();
    // Regression guard: durationMin must be stored (==50 for 08:00-08:50).
    // Before the Task 1.5 fix this assertion would fail because the PUT
    // rejected with 422 and the row never landed.
    expect(saved!.durationMin).toBe(50);

    // Cleanup — delete the marker period via direct PUT so the spec is
    // idempotent. We filter out only the marker row and replay everything
    // else with durationMin re-derived. (Can't use the UI delete button
    // because the UI doesn't hydrate from the missing GET.)
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

  test('ZEIT-02: Error-Path — mocked 422 triggers red toast, no green toast', async ({
    page,
  }) => {
    await page.goto('/admin/school/settings?tab=timegrid');
    await expect(page.getByText('Unterrichtstage', { exact: true })).toBeVisible();

    // Ensure Mo is on so TimeGridSchema passes client-side validation and
    // the PUT actually fires — otherwise our mock never gets hit.
    const moToggle = page.getByRole('button', { name: 'Unterrichtstag Mo' });
    if ((await moToggle.getAttribute('data-state')) !== 'on') {
      await moToggle.click();
    }

    // Force a 4xx on the PUT so we can deterministically assert the
    // silent-4xx guard from Phase 10.1 (red toast fires, green toast never
    // appears). Intercept the PUT — leave GET untouched so the tab still
    // hydrates.
    await page.route('**/api/v1/schools/*/time-grid**', (route) => {
      if (route.request().method() === 'PUT') {
        return route.fulfill({
          status: 422,
          contentType: 'application/json',
          body: JSON.stringify({
            statusCode: 422,
            message: 'Endzeit muss nach Startzeit liegen',
          }),
        });
      }
      return route.continue();
    });

    // Dirty the form so Save is enabled, then click.
    await page.getByRole('button', { name: /Periode hinzufuegen/ }).click();
    await page.getByRole('button', { name: 'Speichern' }).first().click();

    // Red error toast from useUpdateTimeGrid.onError — toast.error(e.message)
    // where e.message === 'Zeitraster konnte nicht gespeichert werden'.
    await expect(
      page.getByText(/Zeitraster konnte nicht gespeichert/),
    ).toBeVisible();

    // Critical silent-4xx guard: green toast must NEVER fire on a failed PUT.
    await expect(page.getByText('Aenderungen gespeichert.')).not.toBeVisible({
      timeout: 3000,
    });
  });
});
