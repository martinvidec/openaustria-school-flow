/**
 * Phase 10.2 + Issue #112 Phase 2.5b — TimeGrid (Periods + Unterrichtstage) save.
 *
 * Consolidated from the formerly-separate `zeitraster.spec.ts` and
 * `wochentage.spec.ts`. Both files PUT the same `/api/v1/schools/:id/time-grid`
 * endpoint, which is implemented as a `deleteMany + createMany` over the
 * full TimeGrid (school-time-grid.service.ts:82-104). Running them in
 * parallel — even within the same chromium project on different workers —
 * produces this race:
 *
 *   Worker A (was zeitraster): PUT { periods:[P1, P2_marker_A], schoolDays:[MO] }
 *   Worker B (was wochentage): PUT { periods:[P1], schoolDays:[MO, SA] }
 *   tx_B commits LAST → DB has [P1] (no marker) → Worker A API readback
 *   fails: "period with label E2E-NNNNNN .toBeDefined()" → flake.
 *
 * Originally surfaced in PR #109 CI (2026-05-18; ZEIT-01 red on the
 * issue #87 PR even though that PR didn't touch the time-grid surface).
 * Phase 1 (PR #114) merged the two files under `describe.serial` and
 * pinned chromium-only as a pragmatic intra-chromium fix.
 *
 * Phase 2.5b (Issue #118, this PR) replaces those workarounds with a
 * per-schoolId Postgres advisory lock from `helpers/advisory-lock.ts`
 * (extracted in Issue #117). The lock serializes parallel runs across
 * workers AND across projects (chromium ↔ firefox ↔ mobile), so:
 *   - `describe.serial` removed — the lock is a stronger guarantee that
 *     doesn't pin all tests to a single worker.
 *   - `chromium-only-skip` removed — WOCH-01 is back on cross-browser.
 *
 * Tests:
 *   ZEIT-01 — happy-path add-period + save + API readback persistence
 *   ZEIT-02 — error-path mocked 422 → red toast, no green toast (silent-4xx guard)
 *   WOCH-01 — toggle SATURDAY active, save, API readback persistence; cleanup
 *
 * Prerequisites:
 *   - docker compose up -d postgres redis keycloak
 *   - API on :3000, Vite on :5173
 *   - prisma:seed executed (admin + sample school)
 *   - DATABASE_URL exported in the runner shell
 */
import { expect, test } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import { acquireAdvisoryLock, type AdvisoryLock } from './helpers/advisory-lock';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

test.describe('TimeGrid save (Periods + Unterrichtstage) — Phase 10.2 / Issue #112 Phase 2.5b', () => {
  // Per-schoolId advisory lock. The TimeGrid PUT-replace-all on
  // school-time-grid.service.ts:82-104 mutates one row-set per school;
  // serializing every spec that touches the seed school is enough to
  // remove the race and lets chromium + firefox run in parallel.
  let lock: AdvisoryLock | undefined;

  test.beforeEach(async ({ page }) => {
    lock = await acquireAdvisoryLock(`time-grid:${SEED_SCHOOL_UUID}`);
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    if (lock) {
      await lock.release();
      lock = undefined;
    }
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
