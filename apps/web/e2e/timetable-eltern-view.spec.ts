/**
 * Issue #86 — Stundenplan-Sicht Eltern.
 *
 * /timetable wird vom Eltern-User täglich geöffnet und ist heute nur durch
 * `roles-smoke.spec.ts` abgedeckt (das nur prüft, dass die Seite ohne
 * Crash rendert). Cross-Child- oder Cross-Tenant-Leaks an dieser Stelle
 * wären maximal-schmerzhaft — exakt die Pattern-Familie aus
 * `project_useTeachers_tenant_leak.md` /
 * `project_useClasses_missing_schoolId.md`.
 *
 * Test-Strategie — zwei Schichten:
 *
 *   1. URL-Param-Lock: der ausgehende `GET /api/v1/schools/.../timetable/view`
 *      MUSS `perspective=class` + `perspectiveId=seed-class-1a` (die Klasse
 *      von Lisa Huber, dem KIND von Franz Huber). KRITISCH: nicht den
 *      Eltern-personId, nicht eine andere Klasse. Eine silent-permissiveness
 *      Variante im Backend (`where: { x: undefined }` → kein Filter) würde
 *      hier auch den eigenen personId durchlassen.
 *
 *   2. Cell-Render-Lock: die seeded MONDAY/period-1 Cell ist sichtbar.
 *      Verifiziert dass der Eltern-Persona tatsächlich Daten bekommt und
 *      nicht in einem "kein Stundenplan vorhanden" empty-state hängt
 *      (z.B. weil childClassId nicht aufgelöst wurde).
 *
 * Fixture: `seedTimetableRun()` seedet eine Lesson für class 1A (Lisa Hubers
 * Klasse laut seed.ts — Lisa ist Tochter von Franz, dem eltern-user).
 *
 * CI/local divergence note: das Standard-`prisma:seed` erzeugt KEINE
 * TimetableLesson-Rows. Ohne Fixture wäre der /timetable empty-state.
 * Memory: `feedback_seed_no_timetable_lessons.md`.
 *
 * Race-Family-Achtung: per-test seeding + chromium-only-skip (siehe
 * lehrer-view.spec.ts für die ausführliche Begründung). Active-
 * TimetableRun-Singleton-Race ist seit `project_active_timetable_run_race.md`
 * via Backend `orderBy createdAt desc` entschärft.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const SEED_CLASS_1A_ID = 'seed-class-1a';

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
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates active TimetableRun on shared seed school — chromium is the sole writer.',
  );

  let fixture: TimetableRunFixture | undefined;

  test.beforeEach(async () => {
    fixture = await seedTimetableRun(SEED_SCHOOL_UUID);
  });

  test.afterEach(async () => {
    if (!fixture) return;
    await cleanupTimetableRun(fixture);
    fixture = undefined;
  });

  test("TT-VIEW-ELTERN-PARAM: eltern-user lands on perspective=class for the child's class 1A", async ({
    page,
  }) => {
    await loginAsRole(page, 'eltern');
    const url = await captureTimetableViewRequest(page, async () => {
      await page.goto('/timetable');
    });

    expect(url.searchParams.get('perspective')).toBe('class');
    expect(
      url.searchParams.get('perspectiveId'),
      'eltern-user (Franz Huber → Lisa Huber) must request the CHILD\'s class slice — never their own personId or another class',
    ).toBe(SEED_CLASS_1A_ID);

    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
  });

  test('TT-VIEW-ELTERN-CELLS: seeded MONDAY/period-1 lesson is visible in the child\'s class grid', async ({
    page,
  }) => {
    await loginAsRole(page, 'eltern');
    await page.goto('/timetable');

    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    await expect(grid).toBeVisible();

    // The fixture seeds exactly ONE lesson at MONDAY/period-1 in class 1A
    // (Lisa Huber's class). If childClassId resolution silently breaks —
    // a class of bug aligned with the silent-omission family in
    // `project_useClasses_missing_schoolId.md` — this assertion goes red.
    const seededCell = grid.getByRole('gridcell', {
      name: /Montag 1\. Stunde$/,
    });
    await expect(
      seededCell,
      "eltern-user must see the seeded MONDAY/period-1 lesson in Lisa Huber's class 1A view",
    ).toBeVisible();
  });
});
