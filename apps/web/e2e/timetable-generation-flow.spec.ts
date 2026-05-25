/**
 * Issue #60 — End-to-end regression guard for the solver's user-visible output.
 *
 * Migrated to the throwaway-school architecture in #138 wave 3: per-spec
 * School + TimetableRun + lesson are provisioned via `createThrowawaySchool`
 * so the chromium-only-skip race-defense ("flaky on parallel browser
 * projects — see #54 (shared seed-school race)") is GONE.
 *
 * Background (unchanged): the user reported the solver said "Generierung
 * abgeschlossen" but the timetable was nowhere to be found. Root cause was
 * twofold (1) /admin/solver only renders an Aktivieren button via the
 * WS-driven lastResult state; if the solve:complete event was lost the
 * button never appeared, (2) there was no automated test covering "solver
 * run produces user-visible timetable". This spec is the lock for both.
 *
 *   GEN-01 — fast-path: active run + lesson in DB → /timetable renders cells.
 *   GEN-02 — activation-recovery: COMPLETED but inactive run → /admin/solver
 *            shows the new "Letzte Runs" card with Aktivieren button →
 *            click → /timetable now renders the lesson.
 *
 * Why fixture-based, not real solver: a real solve takes ~5 minutes and is
 * non-deterministic on lesson placement. The throwaway provisions a
 * deterministic single-lesson COMPLETED run via Prisma (mirrors what
 * TimetableService.handleCompletion would write). Same shape, no wait,
 * stable assertions.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #60 — solver output reaches /timetable end-to-end (throwaway-school)', () => {
  // Mobile projects render the same data; this guard is desktop-only to
  // avoid mobile-specific selector divergence (DayWeekToggle vs day list,
  // bottom-sheet selectors). The wire-up under test is identical across
  // viewports.
  test.skip(
    ({ isMobile }) => isMobile,
    'Solver output rendering is identical across viewports — desktop only.',
  );
  // No chromium-only-skip: #138 wave 3 migration to throwaway-school
  // eliminates the shared-seed-school race that motivated #54.

  let fixture: ThrowawaySchoolFixture | undefined;

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('GEN-01: active completed run renders at least one lesson cell on /timetable', async ({
    page,
    context,
  }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withTimetableStack: true, // shorthand for { active: true }
      namePrefix: 'E2E-GEN01',
    });
    const stack = fixture.timetable!;

    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
    await page.goto('/timetable');

    // Pick the seeded teacher in the perspective selector so the grid
    // filters down to our seeded lesson. The throwaway fixture exposes the
    // display string as `teacherDisplayName` (`${lastName} ${firstName}`).
    const trigger = page.getByRole('combobox').first();
    await expect(trigger).toBeVisible();
    await trigger.click();
    const dropdown = page.getByRole('listbox');
    await expect(dropdown).toBeVisible();
    await dropdown
      .getByRole('option', { name: stack.teacherDisplayName, exact: true })
      .click();

    // The cell shows `subjectAbbreviation` as line 1 (TimetableCell.tsx:74).
    // The throwaway seeds exactly one lesson, so this label appears exactly
    // once. Assertion fails loudly if the active-run query / lesson join /
    // perspective filter chain breaks anywhere.
    await expect(
      page.getByText(stack.subjectShortName, { exact: true }).first(),
      'lesson cell must render the seeded subject abbreviation',
    ).toBeVisible();
  });

  test('GEN-02: completed-but-inactive run is recoverable from /admin/solver -> Letzte Runs -> Aktivieren -> /timetable shows the lesson', async ({
    page,
    context,
  }) => {
    // The fixture's `active: false` mode is the exact shape of the user's
    // 2026-05-08 incident: handleCompletion wrote 32 rows, status went to
    // COMPLETED, but the WS event was lost so the user never got to click
    // Aktivieren. The "Letzte Runs" card on /admin/solver is the recovery
    // path this test guards.
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withTimetableStack: { active: false },
      namePrefix: 'E2E-GEN02',
    });
    const stack = fixture.timetable!;
    expect(stack.timetableRunActive).toBe(false);

    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);

    // Step 1 — /admin/solver shows the inactive run with an Aktivieren button.
    await page.goto('/admin/solver');
    const recentRuns = page.getByTestId('recent-runs-card');
    await expect(
      recentRuns,
      'Letzte Runs card must render when at least one run exists in DB',
    ).toBeVisible();
    const activateBtn = page.getByTestId(`activate-run-${stack.timetableRunId}`);
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
      .getByRole('option', { name: stack.teacherDisplayName, exact: true })
      .click();

    await expect(
      page.getByText(stack.subjectShortName, { exact: true }).first(),
      'lesson cell must render after Aktivieren-click flipped isActive=true',
    ).toBeVisible();
  });
});
