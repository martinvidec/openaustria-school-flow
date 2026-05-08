/**
 * Issue #60 — End-to-end regression guard for the solver's user-visible output.
 *
 * The user reported that the solver said "Generierung abgeschlossen" but the
 * timetable was nowhere to be found. Diagnosis (live DB inspection):
 *   - 2 runs in status COMPLETED with 64 persisted timetable_lessons rows
 *   - All 3 runs had isActive=false → /timetable was empty
 *
 * Root cause is twofold:
 *   1. The /admin/solver page only renders an Aktivieren button via the
 *      WS-driven `lastResult` state. If the solve:complete event was lost
 *      (watchdog flipped first, page was mid-reconnect, browser tab not
 *      focused while the run completed), the button never appears and the
 *      COMPLETED run is invisible to the user.
 *   2. There was no automated test covering "solver run produces
 *      user-visible timetable" — only constraint correctness + DB
 *      persistence were tested. The activation step fell off the contract.
 *
 * Two specs:
 *   GEN-01 — fast-path:
 *     Active run with lessons already in DB → /timetable renders cells.
 *     Catches /timetable rendering regressions independent of activation.
 *
 *   GEN-02 — activation-recovery:
 *     COMPLETED but inactive run in DB → /admin/solver shows the new
 *     "Letzte Runs" card with Aktivieren button → click it → /timetable
 *     now renders the lesson. Catches the exact #60 user bug — without
 *     this, removing the run-history card would silently break recovery.
 *
 * Why fixture-based, not real solver: a real solve takes ~5 minutes and is
 * non-deterministic on lesson placement. The fixture inserts a
 * deterministic single-lesson COMPLETED run via Prisma (mirrors what
 * TimetableService.handleCompletion would write). Same shape, no wait,
 * stable assertions.
 */
import { expect, test } from '@playwright/test';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';
import { loginAsAdmin } from './helpers/login';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';

const SCHOOL_ID = process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;

test.describe('Issue #60 — solver output reaches /timetable end-to-end', () => {
  // Mobile projects render the same data; this guard is desktop-only to
  // avoid mobile-specific selector divergence (DayWeekToggle vs day list,
  // bottom-sheet selectors). The wire-up under test is identical across
  // viewports.
  test.skip(
    ({ isMobile }) => isMobile,
    'Solver output rendering is identical across viewports — desktop only.',
  );
  // Mutating the seed school's timetable runs from parallel browser
  // projects races on the same school resources (see #54). Limit to
  // chromium until the throwaway-school refactor lands.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'flaky on parallel browser projects — see #54 (shared seed-school race).',
  );

  let fixture: TimetableRunFixture;

  test.afterEach(async () => {
    if (fixture) {
      await cleanupTimetableRun(fixture);
    }
  });

  test('GEN-01: active completed run renders at least one lesson cell on /timetable', async ({
    page,
  }) => {
    fixture = await seedTimetableRun(SCHOOL_ID);
    await loginAsAdmin(page);
    await page.goto('/timetable');

    // Pick the seeded teacher in the perspective selector so the grid
    // filters down to our seeded lesson. The seed teacher is Maria Mueller
    // (kc-lehrer), pinned by SEED_TEACHER_KC_LEHRER_UUID — the fixture
    // exposes the display string as `teacherDisplayName` ("Mueller Maria").
    const trigger = page.getByRole('combobox').first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const dropdown = page.getByRole('listbox');
    await expect(dropdown).toBeVisible();
    await dropdown
      .getByRole('option', { name: fixture.teacherDisplayName, exact: true })
      .click();

    // The cell shows `subjectAbbreviation` as line 1 (TimetableCell.tsx:74).
    // The fixture seeds exactly one lesson, so this label appears exactly
    // once. Assertion fails loudly if the active-run query / lesson join /
    // perspective filter chain breaks anywhere.
    await expect(
      page.getByText(fixture.subjectAbbreviation, { exact: true }).first(),
      'lesson cell must render the seeded subject abbreviation',
    ).toBeVisible();
  });

  test('GEN-02: completed-but-inactive run is recoverable from /admin/solver -> Letzte Runs -> Aktivieren -> /timetable shows the lesson', async ({
    page,
  }) => {
    // The fixture's `active: false` mode is the exact shape of the user's
    // 2026-05-08 incident: handleCompletion wrote 32 rows, status went to
    // COMPLETED, but the WS event was lost so the user never got to click
    // Aktivieren. The "Letzte Runs" card on /admin/solver is the recovery
    // path this test guards.
    fixture = await seedTimetableRun(SCHOOL_ID, { active: false });
    await loginAsAdmin(page);

    // Step 1 — /admin/solver shows the inactive run with an Aktivieren button.
    await page.goto('/admin/solver');
    const recentRuns = page.getByTestId('recent-runs-card');
    await expect(
      recentRuns,
      'Letzte Runs card must render when at least one run exists in DB',
    ).toBeVisible();
    const activateBtn = page.getByTestId(`activate-run-${fixture.runId}`);
    await expect(
      activateBtn,
      'Aktivieren button must be available for COMPLETED+!isActive runs',
    ).toBeVisible();

    // Step 2 — click Aktivieren. The page navigates to /timetable on success.
    await activateBtn.click();
    await page.waitForURL('**/timetable', { timeout: 10_000 });

    // Step 3 — same lesson assertion as GEN-01. If activation didn't flip
    // isActive=true on the run, the timetable view's `findFirst({ isActive
    // })` returns null and the grid renders empty.
    const trigger = page.getByRole('combobox').first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const dropdown = page.getByRole('listbox');
    await expect(dropdown).toBeVisible();
    await dropdown
      .getByRole('option', { name: fixture.teacherDisplayName, exact: true })
      .click();

    await expect(
      page.getByText(fixture.subjectAbbreviation, { exact: true }).first(),
      'lesson cell must render after Aktivieren-click flipped isActive=true',
    ).toBeVisible();
  });
});
