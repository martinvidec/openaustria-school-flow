/**
 * Phase 10.5 Plan 04 — Solver workflow E2E (D-13)
 *
 * SOLVER-01: happy path — trigger solve (real Timefold sidecar, 30s cap) →
 * wait for WS-complete via "Letztes Ergebnis" CardTitle (Pattern 6) → click
 * Aktivieren → assert green toast + navigation to /timetable + grid visible.
 *
 * SOLVER-02: activate error — trigger a real solve for setup, then mock
 * POST /activate to return 500 → click Aktivieren → assert red toast stem
 * 'Aktivierung fehlgeschlagen' (Pitfall 8: regex match decouples from HTTP
 * status suffix) + silent-4xx-guard (no green toast) + button stays enabled
 * for retry + no redirect off /admin/solver.
 *
 * Requires:
 *   - docker compose up -d postgres redis keycloak solver
 *   - pnpm --filter @schoolflow/api dev (:3000)
 *   - pnpm --filter @schoolflow/web dev (:5173)
 *   - globalSetup precheck on :8081/health (see helpers/global-setup.ts)
 *   - E2E_RUN_SOLVER=1 env to opt in (gate below)
 *
 * Opt-in gate — why this spec is E2E_RUN_SOLVER=1 guarded:
 *   The current Timefold sidecar image (apps/solver) has two pre-existing
 *   bugs that prevent a solve from completing on the default dev stack,
 *   surfaced by Plan 10.5-04 Task 4 run (2026-04-22):
 *     1) `application.properties` sets `move-thread-count=AUTO` which
 *        requires Timefold Enterprise Edition (commercial). Community
 *        Edition throws IllegalStateException at solver boot.
 *        Workaround at runtime: set env QUARKUS_TIMEFOLD_SOLVER_MOVE_THREAD_COUNT=NONE
 *     2) Solver domain input has duplicate SolverTimeslot planningIds
 *        (Mo P1 and Tue P1 share the same UUID), so Timefold rejects the
 *        working-solution with "Working objects must be unique".
 *   Both are production-code bugs outside 10.5-04's allowed path set. See
 *   .planning/phases/10.5-e2e-admin-ops-operations/deferred-items.md §6-§7.
 *   Run manually once the sidecar is fixed:
 *       E2E_RUN_SOLVER=1 QUARKUS_TIMEFOLD_SOLVER_MOVE_THREAD_COUNT=NONE \
 *         pnpm --filter @schoolflow/web exec playwright test \
 *         apps/web/e2e/admin-solver.spec.ts --project=desktop --workers=1
 *
 * Execute with --workers=1 to prevent parallel-solve races on the single
 * seed school (RESEARCH.md Pitfall 5 + 10.4 precedent).
 */
import { expect, test } from '@playwright/test';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import { getByCardTitle } from './helpers/card';

const API = process.env.E2E_API_URL_BASE ?? 'http://localhost:3000/api/v1';
const SCHOOL = SEED_SCHOOL_UUID;
const RUN_SOLVER = process.env.E2E_RUN_SOLVER === '1';

test.describe('Phase 10.5 — Admin Solver Workflow (desktop)', () => {
  test.skip(
    !RUN_SOLVER,
    'Set E2E_RUN_SOLVER=1 to run. Blocked by pre-existing sidecar bugs: ' +
      'Timefold Enterprise thread-count + duplicate SolverTimeslot planningIds. ' +
      'See .planning/phases/10.5-e2e-admin-ops-operations/deferred-items.md §6-§7.',
  );
  test('SOLVER-01: trigger → WS complete → Aktivieren → redirect', async ({
    page,
    request,
  }) => {
    // 30s solve + WS + activate + nav buffer (RESEARCH Pitfall 7).
    test.setTimeout(90_000);

    await loginAsAdmin(page);
    await page.goto('/admin/solver');

    // Trigger solve via APIRequestContext with maxSolveSeconds=30 (DTO Min).
    // Default body {} from the UI button would queue a 300s solve, way above
    // our test budget. Fire the request ourselves so the cap is honoured.
    const token = await getAdminToken(request);
    const solveRes = await request.post(
      `${API}/schools/${SCHOOL}/timetable/solve`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { maxSolveSeconds: 30 },
      },
    );
    expect(solveRes.ok(), 'POST /timetable/solve must return 202').toBeTruthy();

    // Pattern 6 (RESEARCH.md) — CardTitle-based WS-complete detection.
    // The "Letztes Ergebnis" Card is only rendered by solver.tsx when
    // useSolverSocket.lastResult is truthy, which happens on solve:complete.
    // Toast-based waits race sonner's queue (10.2-02 WOCH-01 lesson).
    await expect(getByCardTitle(page, 'Letztes Ergebnis')).toBeVisible({
      timeout: 60_000,
    });

    // Publish via the new Aktivieren button (D-12).
    await page.getByRole('button', { name: 'Aktivieren' }).click();

    // Green toast — verbatim from solver.tsx handleActivate.
    await expect(page.getByText('Stundenplan aktiviert')).toBeVisible();

    // Navigation to /timetable + grid visible (smoke shape from 10.3-02).
    await expect(page).toHaveURL(/\/timetable/);
    await expect(page.getByRole('grid')).toBeVisible();
  });

  test('SOLVER-02: activate error path — mocked 500 on POST /activate', async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);

    await loginAsAdmin(page);
    await page.goto('/admin/solver');

    // Seed a real solve so the Aktivieren button renders (requires lastResult
    // via useSolverSocket; the button is conditionally rendered).
    const token = await getAdminToken(request);
    const solveRes = await request.post(
      `${API}/schools/${SCHOOL}/timetable/solve`,
      {
        headers: { Authorization: `Bearer ${token}` },
        data: { maxSolveSeconds: 30 },
      },
    );
    expect(solveRes.ok(), 'POST /timetable/solve must return 202').toBeTruthy();
    await expect(getByCardTitle(page, 'Letztes Ergebnis')).toBeVisible({
      timeout: 60_000,
    });

    // Mock ONLY the activate endpoint to return 500. Leaving solve/callbacks
    // untouched is intentional: the preceding real solve is what populates
    // lastResult, which is what makes the button exist in the first place.
    await page.route(
      '**/api/v1/schools/*/timetable/runs/*/activate',
      async (route) => {
        if (route.request().method() === 'POST') {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              statusCode: 500,
              message: 'internal error',
            }),
          });
          return;
        }
        await route.continue();
      },
    );

    await page.getByRole('button', { name: 'Aktivieren' }).click();

    // Red toast stem — Pitfall 8: regex match on stem 'Aktivierung fehlgeschlagen'
    // decouples from the `(HTTP 500)` description suffix embedded via
    // handleActivate's new Error(`HTTP ${res.status}`) template literal.
    await expect(
      page.getByText(/Aktivierung fehlgeschlagen/),
    ).toBeVisible();

    // Silent-4xx-guard (10.2 precedent): the green toast MUST NOT appear on
    // a failed activate. If it does, we have an error-handling regression.
    await expect(page.getByText('Stundenplan aktiviert')).not.toBeVisible({
      timeout: 3000,
    });

    // Button remains enabled for retry (CONTEXT.md D-12: 'Button bleibt für
    // Retry verfügbar').
    await expect(page.getByRole('button', { name: 'Aktivieren' })).toBeEnabled();

    // No redirect away from /admin/solver on error.
    await expect(page).toHaveURL(/\/admin\/solver/);
  });
});
