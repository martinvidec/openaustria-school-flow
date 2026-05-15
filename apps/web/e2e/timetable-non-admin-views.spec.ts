/**
 * Issue #86 — Stundenplan-Sicht für non-admin Rollen.
 *
 * /timetable wird von Lehrer, Schüler, Eltern täglich geöffnet und ist
 * heute nur durch `roles-smoke.spec.ts` abgedeckt (das nur prüft, dass die
 * Seite ohne Crash rendert). Tenant-Leaks an dieser Stelle wären
 * maximal-schmerzhaft — exakt die Pattern-Familie aus
 * `project_useTeachers_tenant_leak.md` /
 * `project_useClasses_missing_schoolId.md`.
 *
 * Test-Strategie: jeder Role logged in, navigiert zu /timetable, und der
 * Test schnappt sich den outgoing API-Request `/timetable/view`. Die
 * Assertion verifiziert die `perspective` + `perspectiveId` URL-Params
 * GENAU — wenn die /timetable-Page jemals den falschen Slice abfragt
 * (Cross-Tenant-Leak via stale state, falscher Hook-Input, etc.), fällt
 * dieser Test um.
 *
 * CI/local divergence note (2026-05-15): the standard prisma:seed
 * creates ZERO TimetableLesson rows (those come from solver runs which
 * only happen in local dev). The empty-state assertion was therefore
 * red on CI but green locally. Fixed by seeding one MONDAY/period-1
 * lesson via the existing `seedTimetableRun()` fixture in `beforeAll`
 * — the same approach the DnD / perspective / generation-flow specs
 * use. As a bonus, the seeded lesson points to kc-lehrer (Maria
 * Mueller), so the lehrer test now asserts a NON-empty timetable as
 * well, which is tighter coverage than the original empty-state lock.
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
const SEED_TEACHER_KC_LEHRER_UUID = '10000000-0000-4000-8000-000000000001';

/**
 * Awaits the first outgoing `GET /api/v1/schools/.../timetable/view?...`
 * request that fires after the wrapped action and returns the parsed
 * URL. Used by every spec below to assert which slice is requested.
 */
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

test.describe('Issue #86 — Timetable non-admin perspectives (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Perspective routing is identical across viewports — desktop only for the first lock.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Three roles sharing one Keycloak realm — sequential chromium run is the cleanest signal.',
  );

  let fixture: TimetableRunFixture;

  test.beforeAll(async () => {
    fixture = await seedTimetableRun(SEED_SCHOOL_UUID);
  });

  test.afterAll(async () => {
    await cleanupTimetableRun(fixture);
  });

  test('TT-VIEW-SCHUELER: schueler-user lands on perspective=class for 1A and lessons render', async ({
    page,
  }) => {
    await loginAsRole(page, 'schueler');
    const url = await captureTimetableViewRequest(page, async () => {
      await page.goto('/timetable');
    });

    expect(url.searchParams.get('perspective')).toBe('class');
    expect(
      url.searchParams.get('perspectiveId'),
      'schueler-user (Max Huber) must request the slice for class 1A, not another tenant or sibling',
    ).toBe(SEED_CLASS_1A_ID);

    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
    // With the fixture-seeded run, class 1A has at least one lesson.
    // The "Kein Stundenplan vorhanden" empty-state card must NOT appear.
    await expect(page.getByText('Kein Stundenplan vorhanden')).toHaveCount(0);
  });

  test('TT-VIEW-ELTERN: eltern-user lands on perspective=class for the child\'s class 1A', async ({
    page,
  }) => {
    await loginAsRole(page, 'eltern');
    const url = await captureTimetableViewRequest(page, async () => {
      await page.goto('/timetable');
    });

    expect(url.searchParams.get('perspective')).toBe('class');
    expect(
      url.searchParams.get('perspectiveId'),
      'eltern-user (Franz Huber → Lisa Huber) must request Lisa\'s class slice, not their own person ID',
    ).toBe(SEED_CLASS_1A_ID);

    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
    await expect(page.getByText('Kein Stundenplan vorhanden')).toHaveCount(0);
  });

  test('TT-VIEW-LEHRER: lehrer-user lands on perspective=teacher for their own teacherId, lessons render', async ({
    page,
  }) => {
    await loginAsRole(page, 'lehrer');
    const url = await captureTimetableViewRequest(page, async () => {
      await page.goto('/timetable');
    });

    expect(url.searchParams.get('perspective')).toBe('teacher');
    expect(
      url.searchParams.get('perspectiveId'),
      'lehrer-user must request their OWN teacherId — never another teacher\'s',
    ).toBe(SEED_TEACHER_KC_LEHRER_UUID);

    // The fixture pins the seeded lesson to kc-lehrer (Maria Mueller),
    // so the teacher perspective must surface at least one lesson — the
    // empty-state card must NOT render.
    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
    await expect(page.getByText('Kein Stundenplan vorhanden')).toHaveCount(0);
  });
});
