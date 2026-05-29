/**
 * Issue #86 — Stundenplan-Sicht Eltern.
 *
 * Issue #167 (Phase 3.5/6 Batch C) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school. kc-eltern is bound to a
 * Parent row + ParentStudent link to a throwaway Student in classIds[0]
 * via `roles.eltern` + `withParentLinks.eltern`.
 *
 * Test-Strategie — zwei Schichten:
 *
 *   1. URL-Param-Lock: der ausgehende `GET /api/v1/schools/.../timetable/view`
 *      MUSS `perspective=class` + `perspectiveId=<throwaway-class>` haben.
 *      Eine silent-permissiveness Variante im Backend würde hier auch den
 *      eigenen personId durchlassen oder einen anderen Klassen-Slice abrufen.
 *
 *   2. Cell-Render-Lock: die seeded MONDAY/period-1 Cell ist sichtbar.
 *      Verifiziert dass der Eltern-Persona tatsächlich Daten bekommt und
 *      nicht in einem "kein Stundenplan vorhanden" empty-state hängt
 *      (z.B. weil childClassId nicht aufgelöst wurde).
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

test.describe('Issue #86 — Timetable Eltern view (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Perspective routing is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context }) => {
    // roles.lehrer for the timetable stack (which auto-creates a Teacher
    // bound to the lehrer-Person); roles.eltern + withParentLinks binds
    // kc-eltern to a Parent → ParentStudent → Student → classIds[0].
    fixture = await createThrowawaySchool({
      roles: { lehrer: true, eltern: true },
      withClasses: 1,
      withTimetableStack: true,
      withStudents: [{ firstName: 'Kind', lastName: 'Eltern' }],
      withParentLinks: { eltern: { studentIndexes: [0] } },
      namePrefix: 'E2E-TT-ELTERN',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test("TT-VIEW-ELTERN-PARAM: eltern-user lands on perspective=class for the child's class", async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const expectedClassId = fixture.classIds[0];

    await loginAsRole(page, 'eltern');
    const url = await captureTimetableViewRequest(page, async () => {
      await page.goto('/timetable');
    });

    expect(url.searchParams.get('perspective')).toBe('class');
    expect(
      url.searchParams.get('perspectiveId'),
      "eltern-user must request the CHILD's class slice — never their own personId or another class",
    ).toBe(expectedClassId);

    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
  });

  test("TT-VIEW-ELTERN-CELLS: seeded MONDAY/period-1 lesson is visible in the child's class grid", async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    await loginAsRole(page, 'eltern');
    await page.goto('/timetable');

    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    await expect(grid).toBeVisible();

    // The fixture seeds exactly ONE lesson at MONDAY/period-1 in the
    // throwaway class (the child's class via withParentLinks). If
    // childClassId resolution silently breaks — a class of bug aligned
    // with the silent-omission family in
    // `project_useClasses_missing_schoolId.md` — this assertion goes red.
    const seededCell = grid.getByRole('gridcell', {
      name: /Montag 1\. Stunde$/,
    });
    await expect(
      seededCell,
      "eltern-user must see the seeded MONDAY/period-1 lesson in the child's class view",
    ).toBeVisible();
  });
});
