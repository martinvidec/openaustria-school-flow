/**
 * Issue #86 — Stundenplan-Sicht Lehrer.
 *
 * Issue #167 (Phase 3.5/6 Batch C) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school. The lehrer-Person is
 * bound to the kc-lehrer KC user via `roles.lehrer`, and the timetable
 * stack pins the lone Teacher row to that Person.
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
 *      aria-label enthalten, der "bei <eigener Nachname>" referenziert.
 *      Wäre die Backend-Response cross-tenant kontaminiert (z.B. weil ein
 *      Service `where: { teacherId: undefined }` baut → "kein Filter"),
 *      erschienen Cells mit fremden Lehrernamen und der Test fiele um.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

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

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context }) => {
    fixture = await createThrowawaySchool({
      roles: { lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-TT-LEHRER',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('TT-VIEW-LEHRER-PARAM: lehrer-user lands on perspective=teacher with own teacherId', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const stack = fixture.timetable!;

    await loginAsRole(page, 'lehrer');
    const url = await captureTimetableViewRequest(page, async () => {
      await page.goto('/timetable');
    });

    expect(url.searchParams.get('perspective')).toBe('teacher');
    expect(
      url.searchParams.get('perspectiveId'),
      "lehrer-user must request their OWN teacherId — never another teacher's",
    ).toBe(stack.teacherId);

    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
  });

  test('TT-VIEW-LEHRER-CELLS: every rendered gridcell references the throwaway lehrer (tenant-leak guard)', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const stack = fixture.timetable!;
    // teacherDisplayName is `${lastName} ${firstName}`; lastName is the
    // suffix used in the cell aria-label "bei <surname>".
    const [tLast] = stack.teacherDisplayName.split(' ');
    const surnamePattern = new RegExp(`bei ${tLast}\\b`);

    await loginAsRole(page, 'lehrer');
    await page.goto('/timetable');

    // Wait for the grid to mount. The fixture seeded exactly one lesson at
    // MONDAY/period-1 for the throwaway lehrer.
    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    await expect(grid).toBeVisible();

    // Tenant-leak guard: every rendered cell aria-label MUST contain
    // "bei <throwaway-surname>". The aria-label format is:
    //   "${subjectName} bei ${teacherSurname} in ${roomName}, ${dayLabel} ${period}. Stunde"
    // (see apps/web/src/components/timetable/TimetableCell.tsx:6).
    //
    // If the backend ever returns a cross-tenant slice (e.g. by ignoring the
    // perspective filter), a foreign teacher's surname would land in the
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
        `gridcell aria-label must reference the throwaway lehrer surname; leaked label: ${label}`,
      ).toMatch(surnamePattern);
    }
  });
});
