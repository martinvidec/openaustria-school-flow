/**
 * Issue #85 — Admin "Offene Vertretungen" panel.
 *
 * First sub-spec of the Substitutions coverage gap. Locks the admin-side
 * view of auto-generated substitutions:
 *
 *   1. Seed an active TimetableRun with one lesson at MONDAY/period-1
 *      for class 1A, taught by kc-lehrer (Maria Mueller).
 *   2. POST an absence for kc-lehrer covering the upcoming Monday →
 *      backend auto-expands to one Substitution row.
 *   3. Admin opens /admin/substitutions?tab=open → OpenSubstitutionsPanel
 *      surfaces the row with the absent teacher's name.
 *
 * Why this slice first: it exercises three load-bearing layers in one
 * test — backend absence-to-substitution expansion (4 .createMany
 * branch in teacher-absence.service.ts), useSubstitutions list fetch,
 * and OpenSubstitutionsPanel rendering. The UI-driven AbsenceForm
 * flow and the "assign substitute" / Entfall / Stillarbeit actions are
 * deferred to follow-up sub-specs.
 *
 * Chromium-only-skip per the race-family precedent — shared seed-school
 * mutating specs collide on parallel browser projects (TimetableRun is
 * the canonical race surface).
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  cancelAbsenceViaAPI,
  createAbsenceViaAPI,
  nextMondayISODate,
  type CreatedAbsence,
} from './helpers/substitutions';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

test.describe('Issue #85 — Admin Offene Vertretungen (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Panel rendering is identical across viewports — desktop only for the first lock.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Race-family: mutates the shared seed-school TimetableRun.',
  );

  // Per-test seeding — describe-level test.skip does NOT gate
  // beforeAll/afterAll (CI lesson from #81/#86). Per-test hooks ARE
  // gated and the `if (!x)` guards belt-and-brace the cleanup against
  // any half-applied state.
  let fixture: TimetableRunFixture | undefined;
  let absence: CreatedAbsence | undefined;

  test.beforeEach(async ({ page }) => {
    fixture = await seedTimetableRun(SEED_SCHOOL_UUID);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    if (absence) {
      await cancelAbsenceViaAPI(request, absence.id);
      absence = undefined;
    }
    if (fixture) {
      await cleanupTimetableRun(fixture);
      fixture = undefined;
    }
  });

  test('SUB-ADMIN-01: absence for kc-lehrer surfaces a substitution row in OpenSubstitutionsPanel', async ({
    page,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    // Absence covering the upcoming Monday — aligns with the seed
    // lesson's day-of-week so the expansion algorithm produces one
    // substitution row (teacher-absence.service.ts:138 eachDayOfInterval
    // → filter by activeDaySet → match lesson by runId+teacherId+
    // dayOfWeek).
    const monday = nextMondayISODate();
    absence = await createAbsenceViaAPI(request, {
      teacherId: fixture.teacherId,
      dateFrom: monday,
      dateTo: monday,
      reason: 'KRANK',
    });
    expect(
      absence.affectedLessonCount ?? 0,
      'absence-expansion must create at least one substitution row',
    ).toBeGreaterThan(0);

    await page.goto('/admin/substitutions?tab=open');
    await expect(
      page.getByRole('heading', { name: 'Vertretungsplanung' }),
    ).toBeVisible();

    // Empty-state card "Keine offenen Vertretungen" must NOT appear —
    // the absence we just created should have populated the panel.
    await expect(page.getByText('Keine offenen Vertretungen')).toHaveCount(0);

    // The OpenSubstitutionsPanel renders "Vertretung fuer: <originalTeacherName>"
    // (apps/web/src/components/substitution/OpenSubstitutionsPanel.tsx:125).
    // kc-lehrer's Person record is Maria Mueller (apps/api/prisma/seed.ts).
    //
    // `.first()` guards against the race-family pattern: sibling specs in
    // the #85 cluster (notably teacher-substitutions-my-absences.spec.ts)
    // also seed kc-lehrer absences on the same Monday, producing extra rows
    // in this admin panel and tripping Playwright's strict-mode locator
    // resolution. The assertion's intent — "panel shows the absent
    // teacher's name on at least one row" — is preserved.
    await expect(
      page.getByText(/Vertretung fuer:\s*Maria Mueller/).first(),
      'panel must show the absent teacher name on at least one substitution row',
    ).toBeVisible();
  });
});
