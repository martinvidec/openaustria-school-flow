/**
 * Issue #86 — Stundenplan-Sicht Schüler.
 *
 * Issue #167 (Phase 3.5/6 Batch C) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school. The kc-schueler KC user
 * is bound to a Student row in `classIds[0]` via the new
 * `withSchuelerEnrollment` option (Issue #167 fixture extension) — so
 * `/users/me` resolves `classId` for the logged-in schueler and the
 * frontend picks the class perspective automatically.
 *
 * Test-Strategie — zwei Schichten:
 *
 *   1. URL-Param-Lock: der ausgehende `GET /api/v1/schools/.../timetable/view`
 *      MUSS `perspective=class` + `perspectiveId=<throwaway-class>` haben.
 *      Wenn das /timetable jemals einen anderen Klassen-Slice abfragt
 *      (z.B. weil useUserContext einen Sibling-Pointer misst), fällt
 *      dieser Test um.
 *
 *   2. Cell-Render-Lock: die seeded MONDAY/period-1 Cell ist sichtbar.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

async function captureTimetableViewRequest(
  page: import('@playwright/test').Page,
  action: () => Promise<void>,
): Promise<URL> {
  const reqPromise = page.waitForRequest((req) => {
    const u = req.url();
    return u.includes('/api/v1/schools/') && u.includes('/timetable/view');
  });
  await action();
  const req = await reqPromise;
  return new URL(req.url());
}

test.describe('Issue #86 — Timetable Schüler view (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Perspective routing is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context }) => {
    fixture = await createThrowawaySchool({
      roles: { lehrer: true, schueler: true },
      withClasses: 1,
      withTimetableStack: true,
      withSchuelerEnrollment: true,
      namePrefix: 'E2E-TT-SCH',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('TT-VIEW-SCHUELER-PARAM: schueler-user lands on perspective=class for their own class', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const expectedClassId = fixture.classIds[0];

    await loginAsRole(page, 'schueler');
    const url = await captureTimetableViewRequest(page, async () => {
      await page.goto('/timetable');
    });

    expect(url.searchParams.get('perspective')).toBe('class');
    expect(
      url.searchParams.get('perspectiveId'),
      'schueler-user must request the slice for their own class — never a sibling class or another tenant',
    ).toBe(expectedClassId);

    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
  });

  test('TT-VIEW-SCHUELER-CELLS: seeded MONDAY/period-1 lesson renders inside the grid', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    await loginAsRole(page, 'schueler');
    await page.goto('/timetable');

    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    await expect(grid).toBeVisible();

    // The fixture seeds exactly ONE lesson at MONDAY/period-1 for the
    // throwaway lehrer in the schueler's class. The presence +
    // "Montag 1. Stunde" pin is the deterministic regression-lock.
    const seededCell = grid.getByRole('gridcell', {
      name: /Montag 1\. Stunde$/,
    });
    await expect(
      seededCell,
      'schueler-user must see the seeded MONDAY/period-1 lesson in their class view',
    ).toBeVisible();
  });
});
