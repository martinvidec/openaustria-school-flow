/**
 * Issue #86 — Stundenplan-Sicht Lehrer.
 *
 * /timetable wird vom Lehrer täglich geöffnet und ist heute nur durch
 * `roles-smoke.spec.ts` abgedeckt (das nur prüft, dass die Seite ohne
 * Crash rendert). Tenant-Leaks an dieser Stelle wären maximal-schmerzhaft
 * — exakt die Pattern-Familie aus `project_useTeachers_tenant_leak.md` /
 * `project_useClasses_missing_schoolId.md`.
 *
 * Test-Strategie — zwei Schichten:
 *
 *   1. URL-Param-Lock: der ausgehende `GET /api/v1/schools/.../timetable/view`
 *      MUSS `perspective=teacher` + `perspectiveId=<own teacherId>` haben.
 *      Wenn das /timetable jemals einen anderen Slice abfragt
 *      (Cross-Tenant via stale state / falscher Hook-Input / silent-
 *      permissiveness), fällt dieser Test um.
 *
 *   2. Cell-Content-Lock: JEDE gerenderte Cell (role=gridcell) MUSS einen
 *      aria-label enthalten, der "bei Mueller" referenziert. Wäre die
 *      Backend-Response cross-tenant kontaminiert (z.B. weil ein Service
 *      `where: { teacherId: undefined }` baut → "kein Filter"), erschienen
 *      Cells mit fremden Lehrernamen und der Test fiele um.
 *
 * Fixture: `seedTimetableRun()` seedet kc-lehrer (Maria Mueller) als
 * einzigen Lehrer auf MONDAY/period-1 → die Cell-Content-Assertion ist
 * deterministisch.
 *
 * CI/local divergence note: das Standard-`prisma:seed` erzeugt KEINE
 * TimetableLesson-Rows (die kommen aus Solver-Runs, die in CI nicht
 * laufen). Ohne Fixture wäre der /timetable empty-state und der
 * Cell-Content-Lock würde im CI nie greifen. Memory:
 * `feedback_seed_no_timetable_lessons.md`.
 *
 * Race-Family-Achtung: per-test seeding (beforeEach + afterEach), nicht
 * beforeAll — `test.skip(condition, ...)` auf describe-Level gated NICHT
 * `beforeAll` (würde in firefox/mobile-Projects `cleanupTimetableRun(undefined)`
 * → TypeError). Chromium-only-skip + per-test Fixture matchen
 * `admin-timetable-edit-dnd.spec.ts` und das non-admin-views-Original.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const SEED_TEACHER_KC_LEHRER_UUID = '10000000-0000-4000-8000-000000000001';

/**
 * Awaits the first outgoing `GET /api/v1/schools/.../timetable/view?...`
 * request that fires after the wrapped action and returns the parsed
 * URL. Used to assert which slice is requested.
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

test.describe('Issue #86 — Timetable Lehrer view (desktop)', () => {
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

  test('TT-VIEW-LEHRER-PARAM: lehrer-user lands on perspective=teacher with own teacherId', async ({
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

    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
  });

  test('TT-VIEW-LEHRER-CELLS: every rendered gridcell is one of Mueller\'s own lessons (tenant-leak guard)', async ({
    page,
  }) => {
    await loginAsRole(page, 'lehrer');
    await page.goto('/timetable');

    // Wait for the grid to mount. The fixture seeded exactly one lesson at
    // MONDAY/period-1 for kc-lehrer, so at least one gridcell with the
    // expected aria-label must appear once the view loads.
    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    await expect(grid).toBeVisible();

    // Tenant-leak guard: every rendered cell aria-label MUST contain
    // "bei Mueller". The aria-label format is:
    //   "${subjectName} bei ${teacherSurname} in ${roomName}, ${dayLabel} ${period}. Stunde"
    // (see apps/web/src/components/timetable/TimetableCell.tsx:6).
    //
    // If the backend ever returns a cross-tenant slice (e.g. by ignoring the
    // perspective filter), foreign teachers' surnames would land in the
    // aria-label and this assertion would fail loudly.
    const cells = grid.getByRole('gridcell');
    await expect(cells.first()).toBeVisible();
    const labels = await cells.evaluateAll((nodes) =>
      nodes.map((n) => n.getAttribute('aria-label') ?? ''),
    );
    expect(
      labels.length,
      'lehrer-user fixture seeds MONDAY/period-1 — at least one gridcell must render',
    ).toBeGreaterThan(0);
    for (const label of labels) {
      expect(
        label,
        `gridcell aria-label must reference Mueller (the logged-in lehrer); leaked label: ${label}`,
      ).toMatch(/bei Mueller\b/);
    }
  });
});
