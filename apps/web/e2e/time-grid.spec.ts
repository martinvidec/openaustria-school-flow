/**
 * Phase 10.2 + Issue #112 Phase 2.5b — TimeGrid (Periods + Unterrichtstage) save.
 *
 * Issue #148 (Phase 3.5/2) — migrated to throwaway-school per CLAUDE.md D4.
 * The advisory-lock workaround for the seed-school PUT-replace-all race is
 * gone; each spec now mutates its own throwaway School's TimeGrid in
 * isolation, so chromium + firefox + repeated workers can run in parallel
 * without coordination.
 *
 * Consolidated from the formerly-separate `zeitraster.spec.ts` and
 * `wochentage.spec.ts`. Both files PUT the same
 * `/api/v1/schools/:id/time-grid` endpoint, which is implemented as a
 * `deleteMany + createMany` over the full TimeGrid
 * (school-time-grid.service.ts:82-104). Pre-#148 they raced on the seed
 * school; post-#148 each spec owns its school so the race is gone by
 * construction.
 *
 * Tests:
 *   ZEIT-01 — happy-path add-period + save + API readback persistence
 *   ZEIT-02 — error-path mocked 422 → red toast, no green toast (silent-4xx guard)
 *   WOCH-01 — toggle SATURDAY active, save, API readback persistence; cleanup
 */
import { expect, test } from '@playwright/test';
import { loginAsRole, getAdminToken } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

test.describe('TimeGrid save (Periods + Unterrichtstage) — throwaway-school (#148)', () => {
  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    // `withTimetableStack: true` provisions: TimeGrid w/ period 1 (08:00-08:50,
    // durationMin=50), SchoolDays MON-FRI all isActive=true, plus a Teacher +
    // ClassSubject + Room + Run + Lesson the spec doesn't strictly need but
    // which come bundled. The Run/Lesson rows are harmless residue here and
    // cascade-clean via fixture.cleanup(). No standalone `withTimeGrid` option
    // exists today — the #147 tracker explicitly endorsed reusing
    // withTimetableStack for time-grid-only specs.
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-TG',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('ZEIT-01: Happy-Path — add period, save, assert DB persistence via API', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    await page.goto('/admin/school/settings?tab=timegrid');
    // Sanity: PeriodsEditor + Speichern present.
    await expect(page.getByText('Unterrichtstage', { exact: true })).toBeVisible();

    // TimeGridSchema requires at least one Unterrichtstag. Ensure Mo is
    // active (no-op on throwaway since fixture seeds MON-FRI active) so the
    // client-side validator in TimeGridTab doesn't short-circuit before the
    // PUT is issued.
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

    // Persistence check — hit the API directly with the throwaway schoolId.
    // The GET /time-grid endpoint is not implemented (pre-existing gap), but
    // `GET /schools/:id` embeds the timeGrid sub-object with periods.
    const token = await getAdminToken(request);
    const schoolRes = await request.get(`${API}/schools/${fixture.schoolId}`, {
      headers: { Authorization: `Bearer ${token}`, 'X-School-Id': fixture.schoolId },
    });
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
    expect(saved!.durationMin).toBe(50);

    // No spec-internal API cleanup needed — fixture.cleanup() cascade-drops
    // the entire School including its TimeGrid + periods. The pre-migration
    // cleanup PUT existed only because the spec mutated the seed school.
  });

  test('ZEIT-02: Error-Path — mocked 422 triggers red toast, no green toast', async ({
    page,
    context,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    await page.goto('/admin/school/settings?tab=timegrid');
    await expect(page.getByText('Unterrichtstage', { exact: true })).toBeVisible();

    // Mo is active by default on the throwaway (fixture seeds MON-FRI), but
    // belt-and-braces in case the fixture seeding changes.
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

  test('WOCH-01: toggle Saturday active, save, assert DB persistence via API', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

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

    // On throwaway the fixture has already provisioned MON-FRI + a TimeGrid
    // with one period, so the bootstrap branch from the seed-school era
    // (needsPeriod / needsMo) is a no-op here. Kept defensively in case
    // future fixture changes drop the seeded state — the spec asserts on
    // the post-bootstrap form, not on the pre-bootstrap empty-state UI.
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

    // Read initial persisted state from the API directly with the throwaway
    // schoolId. The legacy `GET /schools` listing + `[0].id` lookup is gone —
    // we own the schoolId from the fixture.
    const token = await getAdminToken(request);

    const readSchoolDays = async (): Promise<string[]> => {
      const r = await request.get(`${API}/schools/${fixture!.schoolId}`, {
        headers: { Authorization: `Bearer ${token}`, 'X-School-Id': fixture!.schoolId },
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
    // is ON, aria-pressed should be true.
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

    // No idempotency cleanup needed — fixture.cleanup() drops the school.
    // The pre-migration "toggle Sa back" + save was only there because the
    // spec mutated the shared seed school.
  });
});
