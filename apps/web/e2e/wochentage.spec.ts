/**
 * Phase 10.2 — Wochentage toggle (desktop)
 *
 * Why this file exists:
 *   Phase 10.1 UAT feedback verbatim: "nicht erkennbar wie Wochentage
 *   angelegt/verwendet werden" (project_phase10_new_findings.md). Plan
 *   10.2-02 Task 1 resolved the discoverability gap with a small
 *   TimeGridTab label/hint promotion (see wochentage-decision.md). This
 *   spec locks in the behavioural contract so the Saturday toggle round-
 *   trip (click → Speichern → persisted in DB) can never silently regress.
 *
 * Scope:
 *   WOCH-01  — desktop admin sees all 6 weekday toggles (Mo-Sa), can
 *              toggle Saturday, Speichern persists, GET /schools/:id
 *              confirms SATURDAY landed in the schoolDays relation,
 *              cleanup restores original state.
 *
 * Persistence check — via API, not UI reload:
 *   GET /api/v1/schools/:schoolId/time-grid is NOT implemented (returns
 *   404; `useTimeGrid` hook tolerates this by keeping data=null and never
 *   hydrating the form). A page reload therefore cannot read the
 *   persisted schoolDays back into the UI — aria-pressed resets to false
 *   on every fresh mount regardless of DB state. The canonical persistence
 *   proof is GET /api/v1/schools/:id which embeds the schoolDays relation
 *   (school.service.ts fullInclude). This is the same API-persistence
 *   pattern ZEIT-01 adopted (see STATE.md Phase 10.2-01 decision).
 *
 * Prerequisites (same as zeitraster.spec.ts):
 *   - docker compose up -d postgres redis keycloak
 *   - API on :3000, Vite on :5173
 *   - prisma:seed executed (admin + sample school)
 */
import { expect, test } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';

test.describe('Phase 10.2 — Wochentage toggle (desktop)', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('WOCH-01: toggle Saturday active, save, assert DB persistence via API', async ({
    page,
    request,
  }) => {
    await page.goto('/admin/school/settings?tab=timegrid');

    // Sanity — the improved section heading + toggles are present.
    await expect(page.getByText('Unterrichtstage', { exact: true })).toBeVisible();

    // Mo-Fr toggles must all be visible (SCHOOL_DAYS ⊇ {MON..FRI} always).
    for (const day of ['Mo', 'Di', 'Mi', 'Do', 'Fr']) {
      await expect(
        page.getByRole('button', { name: `Unterrichtstag ${day}` }),
      ).toBeVisible();
    }

    // Saturday toggle also renders (SCHOOL_DAYS includes SATURDAY).
    const saButton = page.getByRole('button', { name: 'Unterrichtstag Sa' });
    await expect(saButton).toBeVisible();

    // TimeGridSchema requires ≥1 Periode AND ≥1 Unterrichtstag — otherwise
    // Save short-circuits on the client-side validator ("Mindestens eine
    // Periode erforderlich" / "Mindestens ein Unterrichtstag erforderlich")
    // and the PUT never fires. Because GET /time-grid is 404 in this
    // codebase, the TimeGridTab form mounts in an empty state; we must
    // bootstrap a minimum-valid state before the Saturday test can exercise
    // the save flow in isolation. PUT overwrites periods/schoolDays in
    // full (tx.deleteMany + createMany), so we drive the bootstrap through
    // the UI to exercise the real PeriodsEditor + Toggle path.
    const removeButtons = page.getByRole('button', { name: 'Periode entfernen' });
    const moToggle = page.getByRole('button', { name: 'Unterrichtstag Mo' });
    const needsPeriod = (await removeButtons.count()) === 0;
    const needsMo = (await moToggle.getAttribute('aria-pressed')) !== 'true';
    if (needsPeriod) {
      await page.getByRole('button', { name: /Periode hinzufuegen/ }).click();
    }
    if (needsMo) {
      await moToggle.click();
    }
    if (needsPeriod || needsMo) {
      const bootstrapResponse = page.waitForResponse(
        (r) => r.url().includes('/time-grid') && r.request().method() === 'PUT',
      );
      await page.getByRole('button', { name: 'Speichern' }).first().click();
      const bootstrapRes = await bootstrapResponse;
      expect(bootstrapRes.status(), 'bootstrap PUT status').toBe(200);
    }

    // Look up the schoolId now so we can both (a) read initial persisted
    // state from the API and (b) assert the save round-trip landed.
    const token = await getAdminToken(request);
    const schoolsRes = await request.get('http://localhost:3000/api/v1/schools', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(schoolsRes.ok(), 'schools list').toBeTruthy();
    const schools = (await schoolsRes.json()) as Array<{ id: string }>;
    expect(schools.length).toBeGreaterThan(0);
    const schoolId = schools[0].id;

    const readSchoolDays = async (): Promise<string[]> => {
      const r = await request.get(`http://localhost:3000/api/v1/schools/${schoolId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      expect(r.ok(), 'school detail').toBeTruthy();
      const body = (await r.json()) as {
        schoolDays: Array<{ dayOfWeek: string }>;
      };
      return body.schoolDays.map((d) => d.dayOfWeek);
    };

    const before = await readSchoolDays();
    const initiallyActive = before.includes('SATURDAY');

    // Align the UI with the persisted state: if DB says Sa is OFF, the UI
    // should show aria-pressed=false for Sa at this point. If DB says Sa
    // is ON, aria-pressed should be true. (After the bootstrap save the
    // local form state and DB are in sync.)
    expect(await saButton.getAttribute('aria-pressed')).toBe(String(initiallyActive));

    // Toggle Sa → click Speichern → wait for PUT response (not toast —
    // the bootstrap save's "Aenderungen gespeichert" toast may still be
    // visible from sonner's queue, which would let getByText short-circuit
    // BEFORE the Sa-save PUT even fires and produce a false-positive
    // persistence check).
    await saButton.click();
    expect(await saButton.getAttribute('aria-pressed')).toBe(String(!initiallyActive));

    const putResponse = page.waitForResponse(
      (r) => r.url().includes('/time-grid') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    const res = await putResponse;
    expect(res.status(), 'Sa-save PUT status').toBe(200);

    // Persistence check — GET /schools/:id and assert SATURDAY flipped.
    const after = await readSchoolDays();
    expect(after.includes('SATURDAY')).toBe(!initiallyActive);

    // Cleanup — toggle Sa back to original state + Save so the spec is
    // idempotent across re-runs. Without this, running WOCH-01 twice in a
    // row could leave Saturday pinned on/off for downstream specs.
    await saButton.click();
    expect(await saButton.getAttribute('aria-pressed')).toBe(String(initiallyActive));
    const cleanupResponse = page.waitForResponse(
      (r) => r.url().includes('/time-grid') && r.request().method() === 'PUT',
    );
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    const cleanupRes = await cleanupResponse;
    expect(cleanupRes.status(), 'cleanup PUT status').toBe(200);

    const restored = await readSchoolDays();
    expect(restored.includes('SATURDAY')).toBe(initiallyActive);
  });
});
