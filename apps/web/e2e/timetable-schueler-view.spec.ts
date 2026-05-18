/**
 * Issue #86 — Stundenplan-Sicht Schüler.
 *
 * /timetable wird vom Schüler täglich geöffnet und ist heute nur durch
 * `roles-smoke.spec.ts` abgedeckt (das nur prüft, dass die Seite ohne
 * Crash rendert). Cross-Class- oder Cross-Tenant-Leaks an dieser Stelle
 * wären maximal-schmerzhaft — exakt die Pattern-Familie aus
 * `project_useClasses_missing_schoolId.md`.
 *
 * Test-Strategie — zwei Schichten:
 *
 *   1. URL-Param-Lock: der ausgehende `GET /api/v1/schools/.../timetable/view`
 *      MUSS `perspective=class` + `perspectiveId=seed-class-1a` (Max Hubers
 *      eigene Klasse) haben. Wenn das /timetable jemals einen anderen
 *      Klassen-Slice abfragt (z.B. weil useUserContext einen Sibling-Pointer
 *      misst), fällt dieser Test um.
 *
 *   2. Cell-Render-Lock: die seeded MONDAY/period-1 Cell ist sichtbar.
 *      Eine Cross-Class-Leak würde NICHT zwingend die seeded Cell verstecken,
 *      aber die kombinierte URL+Render-Assertion ist die definitive
 *      Regression-Lock für die "schueler sieht seine Klasse" Anforderung.
 *
 * Fixture: `seedTimetableRun()` seedet eine Lesson für class 1A (Max Hubers
 * Klasse laut seed.ts). Schueler-perspective lehnt sich an `classId` aus
 * useSchoolContext.
 *
 * CI/local divergence note: das Standard-`prisma:seed` erzeugt KEINE
 * TimetableLesson-Rows. Ohne Fixture wäre der /timetable empty-state.
 * Memory: `feedback_seed_no_timetable_lessons.md`.
 *
 * Race-Family-Achtung: per-test seeding + chromium-only-skip (siehe
 * lehrer-view.spec.ts für die ausführliche Begründung).
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

test.describe('Issue #86 — Timetable Schüler view (desktop)', () => {
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

  test('TT-VIEW-SCHUELER-PARAM: schueler-user lands on perspective=class for own class (1A)', async ({
    page,
  }) => {
    await loginAsRole(page, 'schueler');
    const url = await captureTimetableViewRequest(page, async () => {
      await page.goto('/timetable');
    });

    expect(url.searchParams.get('perspective')).toBe('class');
    expect(
      url.searchParams.get('perspectiveId'),
      'schueler-user (Max Huber) must request the slice for class 1A — never a sibling class or another tenant',
    ).toBe(SEED_CLASS_1A_ID);

    await expect(page.getByRole('heading', { name: 'Stundenplan' })).toBeVisible();
  });

  test('TT-VIEW-SCHUELER-CELLS: seeded MONDAY/period-1 lesson renders inside the grid', async ({
    page,
  }) => {
    await loginAsRole(page, 'schueler');
    await page.goto('/timetable');

    const grid = page.getByRole('grid', { name: 'Stundenplan' });
    await expect(grid).toBeVisible();

    // The fixture seeds exactly ONE lesson at MONDAY/period-1 (Mueller).
    // The aria-label format is:
    //   "${subjectName} bei Mueller in ${roomName}, Montag 1. Stunde"
    // (apps/web/src/components/timetable/TimetableCell.tsx:6).
    //
    // We do NOT assert "every cell is Mueller's" here (class perspective
    // may legitimately include lessons from any teacher who teaches 1A —
    // the seed has only one classSubject seeded against kc-lehrer, but
    // we keep this loose so the spec doesn't accidentally lock the seed's
    // teaching-assignment shape). The presence + "Montag 1. Stunde" pin
    // is the deterministic regression-lock.
    const seededCell = grid.getByRole('gridcell', {
      name: /Montag 1\. Stunde$/,
    });
    await expect(
      seededCell,
      'schueler-user must see the seeded MONDAY/period-1 lesson in their class 1A view',
    ).toBeVisible();
  });
});
