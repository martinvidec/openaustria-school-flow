/**
 * Issue #177-D — regression lock for the solver diagnostics surfaces.
 *
 *   DIAG-01 — pre-solve feasibility: an over-dimensioned school (a class
 *             demanding 99 weekly hours into a 5-slot grid) shows the
 *             feasibility card with a hard-error warning on /admin/solver.
 *   DIAG-02 — post-run report: a finished run renders the "Auswertung des
 *             letzten Laufs" card with teacher/room utilization.
 *
 * Throwaway-school architecture (D4): each spec provisions its own school so
 * there is no shared-resource race and no real solver run needed.
 */
import { expect, test } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #177-D — solver diagnostics (throwaway-school)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Diagnostics rendering is identical across viewports — desktop only.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('DIAG-01: an over-dimensioned school surfaces a feasibility hard-error before solving', async ({
    page,
    context,
  }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withTimetableStack: { active: false },
      withOverload: true,
      namePrefix: 'E2E-DIAG01',
    });

    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
    await page.goto('/admin/solver');

    const card = page.getByTestId('feasibility-card');
    await expect(card).toBeVisible();
    await expect(card).toHaveAttribute('data-feasible', 'false');
    await expect(
      page.getByTestId('feasibility-warning-error').first(),
    ).toBeVisible();
    // The generate button is NOT blocked — the admin can still start the run.
    await expect(
      page.getByRole('button', { name: 'Stundenplan generieren' }),
    ).toBeEnabled();
  });

  test('DIAG-02: a finished run renders the solve report with utilization', async ({
    page,
    context,
  }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withTimetableStack: { active: true },
      namePrefix: 'E2E-DIAG02',
    });

    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
    await page.goto('/admin/solver');

    const report = page.getByTestId('solve-report-card');
    await expect(report).toBeVisible();
    await expect(report).toContainText('Lehrer-Auslastung');
    await expect(report).toContainText('Raum-Auslastung');
    await expect(report).toContainText('Wochenstunden pro Klasse');
  });
});
