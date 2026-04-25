/**
 * Phase 14 Plan 14-03 — E2E-SOLVER-10 weights survive solve-run (gated).
 *
 * Surface: /admin/solver-tuning?tab=weights → trigger solve via API →
 *          /admin/timetable-history/$runId.
 * Requirement: SOLVER-03 — saved weight reaches TimetableRun.constraintConfig
 *              after a real Timefold solve cycle (the critical integration
 *              spec for ROADMAP §Phase 14 success criterion #5).
 *
 * Gating: process.env.E2E_RUN_SOLVER === '1' (Phase 10.5-04 precedent). The
 * default `pnpm playwright test` run skips this spec because the Timefold
 * sidecar must be up and a clean seed-school is required for the solve to
 * complete within the 60s poll window.
 *
 * Mitigation T-14-14 DoS: maxSolveSeconds capped at 30 in the solve
 * request DTO; spec polls every 2s up to 30 iterations (60s wall-time).
 */
import { test, expect } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  CONSTRAINT_API,
  CONSTRAINT_SCHOOL_ID,
  cleanupConstraintTemplatesViaAPI,
  cleanupConstraintWeightOverridesViaAPI,
} from './helpers/constraints';

const CONSTRAINT_NAME = 'No same subject doubling';

test.describe('Phase 14 — Solver-Tuning weights survive solve-run', () => {
  test.skip(
    process.env.E2E_RUN_SOLVER !== '1',
    'requires E2E_RUN_SOLVER=1 + Timefold sidecar running',
  );

  test.beforeEach(async ({ page, request }) => {
    await cleanupConstraintTemplatesViaAPI(request);
    await cleanupConstraintWeightOverridesViaAPI(request);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupConstraintTemplatesViaAPI(request);
    await cleanupConstraintWeightOverridesViaAPI(request);
  });

  test('E2E-SOLVER-10: saved weight reaches TimetableRun.constraintConfig after solve', async ({
    page,
    request,
  }) => {
    // 1) Save weight via UI — same flow as E2E-SOLVER-02.
    await page.goto('/admin/solver-tuning?tab=weights');
    const row = page.locator(`[data-constraint-name="${CONSTRAINT_NAME}"]`);
    await row.getByLabel(/^Gewichtung für /).fill('50');
    const putPromise = page.waitForResponse(
      (r) =>
        r.url().includes('/constraint-weights') &&
        r.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page
      .getByRole('button', { name: 'Änderungen speichern' })
      .first()
      .click();
    const putRes = await putPromise;
    expect(putRes.status()).toBe(200);

    // 2) Trigger solve via API to avoid generator-page UI flake. The exact
    //    solve endpoint shape is `POST /api/v1/schools/:schoolId/timetable/solve`
    //    (Phase 9.x precedent + Plan 14-01 D-06 resolution chain).
    const token = await getAdminToken(request);
    const start = await request.post(
      `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/timetable/solve`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        data: { maxSolveSeconds: 30 },
      },
    );
    expect(start.ok(), `POST /timetable/solve → ${start.status()}`).toBeTruthy();
    const startBody = (await start.json()) as { runId?: string; id?: string };
    const runId = startBody.runId ?? startBody.id;
    expect(runId, 'solve response must include runId/id').toBeTruthy();

    // 3) Poll runs/:runId until COMPLETE or FAILED. Max 30 polls × 2s = 60s.
    //    The seed school may not always converge to a feasible solution;
    //    FAILED is acceptable here because the spec is testing the
    //    resolution-chain snapshot (not solver feasibility). The
    //    constraintConfig is written BEFORE the solver returns, so it is
    //    populated on both COMPLETE and FAILED outcomes.
    let run: { status?: string; constraintConfig?: Record<string, number> } = {};
    for (let i = 0; i < 30; i++) {
      const res = await request.get(
        `${CONSTRAINT_API}/schools/${CONSTRAINT_SCHOOL_ID}/timetable/runs/${runId}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (!res.ok()) {
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      run = (await res.json()) as typeof run;
      if (run.status === 'COMPLETE' || run.status === 'FAILED') break;
      await new Promise((r) => setTimeout(r, 2000));
    }
    expect(
      run.status,
      'solve must reach a terminal state (COMPLETE or FAILED) within 60s',
    ).toMatch(/^(COMPLETE|FAILED)$/);

    // 4) The resolved weight map snapshotted into TimetableRun.constraintConfig
    //    MUST contain the saved 50 — proves D-06 resolution chain (defaults <
    //    DB < per-run DTO) wrote the school override into the run snapshot.
    //    This is the actual SOLVER-03 contract; solver feasibility is a
    //    separate Phase 9.x concern.
    expect(run.constraintConfig?.[CONSTRAINT_NAME]).toBe(50);
  });
});
