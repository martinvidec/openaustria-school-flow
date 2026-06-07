/**
 * Issue #177-B — regression lock for the COMPLETED_WITH_CONFLICTS workflow.
 *
 * Background: the solver routinely returns a near-optimal plan with a residual
 * hardScore<0 (e.g. one teacher double-booked). Pre-#177 the whole run was
 * flipped to FAILED and the admin was permanently blocked — no plan ever
 * shipped. Post-#177 the non-conflicting lessons ARE persisted, the dropped
 * ones become TimetableConflict rows, and the run is COMPLETED_WITH_CONFLICTS
 * (activatable as a partial plan + a visible conflict surface).
 *
 * This spec would have FAILED without the fix: pre-#177 there was no
 * COMPLETED_WITH_CONFLICTS status, no conflicts endpoint, and no conflict card.
 *
 * Throwaway-school architecture (D4): each spec provisions its own school +
 * timetable stack + one recorded conflict via `withConflict: true`, so there
 * is no shared-resource race and no real ~5-minute solver run needed. The
 * fixture writes exactly the shape `handleCompletion` would persist.
 *
 *   CONFLICT-01 — /admin/solver renders the "N Konflikte zu lösen" card +
 *                 the conflict row + an enabled Aktivieren button.
 *   CONFLICT-02 — activating the COMPLETED_WITH_CONFLICTS run navigates to
 *                 /timetable and renders the persisted partial plan.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #177-B — COMPLETED_WITH_CONFLICTS workflow (throwaway-school)', () => {
  // UI rendering is identical across viewports; desktop-only avoids
  // mobile-selector divergence (mirrors timetable-generation-flow.spec.ts).
  test.skip(
    ({ isMobile }) => isMobile,
    'Conflict surface rendering is identical across viewports — desktop only.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('CONFLICT-01: /admin/solver surfaces the conflict card + enabled Aktivieren', async ({
    page,
    context,
  }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withTimetableStack: { active: false },
      withConflict: true,
      namePrefix: 'E2E-CONFLICT01',
    });
    const stack = fixture.timetable!;
    expect(stack.conflictId, 'fixture must record a conflict id').toBeTruthy();

    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
    await page.goto('/admin/solver');

    // The recent-runs row shows the conflict count badge instead of a raw
    // COMPLETED status.
    const runRow = page.getByTestId(`recent-run-row-${stack.timetableRunId}`);
    await expect(runRow).toBeVisible();
    await expect(runRow).toContainText('Konflikte');

    // The dedicated "N Konflikte zu lösen" card renders the dropped lesson.
    const conflictsCard = page.getByTestId('solver-conflicts-card');
    await expect(
      conflictsCard,
      'conflict card must render for a COMPLETED_WITH_CONFLICTS run',
    ).toBeVisible();
    await expect(conflictsCard).toContainText('Lehrer-Doppelbelegung');
    await expect(
      page.getByTestId(`conflict-row-${stack.conflictId}`),
    ).toBeVisible();

    // A COMPLETED_WITH_CONFLICTS run is still activatable (partial plan).
    await expect(
      page.getByTestId(`activate-run-${stack.timetableRunId}`),
      'Aktivieren must be enabled for COMPLETED_WITH_CONFLICTS + !isActive',
    ).toBeVisible();
  });

  test('CONFLICT-02: activating the partial plan navigates to /timetable and renders the persisted lesson', async ({
    page,
    context,
  }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withTimetableStack: { active: false },
      withConflict: true,
      namePrefix: 'E2E-CONFLICT02',
    });
    const stack = fixture.timetable!;

    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
    await page.goto('/admin/solver');

    const activateBtn = page.getByTestId(
      `activate-run-${stack.timetableRunId}`,
    );
    await expect(activateBtn).toBeVisible();
    await activateBtn.click();

    // Activation publishes the partial plan and navigates to /timetable.
    await page.waitForURL('**/timetable', { timeout: 10_000 });

    // The single conflict-free lesson must render — proves the partial plan is
    // a usable timetable, not an empty one.
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
      'persisted partial-plan lesson must render after activation',
    ).toBeVisible();
  });
});
