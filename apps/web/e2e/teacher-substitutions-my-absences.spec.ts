/**
 * Issue #85 — Teacher "Meine Abwesenheiten" view.
 *
 * Second sub-spec of the Substitutions coverage gap. Locks the absent-
 * teacher's view of their auto-generated substitution rows on
 * /teacher/substitutions:
 *
 *   1. Seed an active TimetableRun with one lesson at MONDAY/period-1
 *      for class 1A, taught by kc-lehrer (Maria Mueller).
 *   2. POST an absence for kc-lehrer covering the upcoming Monday →
 *      backend auto-expands to one Substitution row with
 *      originalTeacherId = kc-lehrer.teacher.id.
 *   3. kc-lehrer logs in → /teacher/substitutions → Section 2
 *      ("Meine Abwesenheiten") surfaces the row with subject + class +
 *      period + a PENDING status badge.
 *
 * Why this slice: it exercises GET /substitutions/my-absences
 * (substitution.controller.ts:43) and the SubstitutionDto join chain
 * (subjectAbbreviation, className, periodNumber), plus the
 * useMyAbsenceSubstitutions hook + the page's Section-2 render
 * branch. Section 1 ("Offene Anfragen" / OFFERED to me) is deferred to
 * a follow-up sub-spec — that requires a second teacher with their own
 * lesson + an admin assigning kc-lehrer as substitute, which is
 * out-of-scope for this PR's seed surface.
 *
 * Chromium-only-skip per the race-family precedent — shared seed-school
 * mutating specs collide on parallel browser projects.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
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

test.describe('Issue #85 — Teacher Meine Abwesenheiten (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Section-2 rendering is identical across viewports — desktop only for the first lock.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Race-family: mutates the shared seed-school TimetableRun + substitutions.',
  );

  // Per-test seed; describe-level test.skip does NOT gate beforeAll/afterAll
  // (lesson from #86 / #81). Per-test hooks ARE gated; the if-guard belts-and-
  // braces against half-applied state from a failed seed.
  let fixture: TimetableRunFixture | undefined;
  let absence: CreatedAbsence | undefined;

  test.beforeEach(async ({ page, request }) => {
    fixture = await seedTimetableRun(SEED_SCHOOL_UUID);

    // Seed the absence BEFORE the lehrer logs in — the admin token comes
    // from request.context (helpers/login.getAdminToken) and is independent
    // of the page's Keycloak session. Doing this in beforeEach keeps the
    // test body focused on the rendered UI.
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

    await loginAsRole(page, 'lehrer');
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

  test('SUB-LEHRER-01: kc-lehrer sees own absence with auto-generated substitution + PENDING badge in Section 2', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    await page.goto('/teacher/substitutions');

    // Page heading mounts (Section-1 h1).
    await expect(
      page.getByRole('heading', { name: 'Meine Vertretungen' }),
    ).toBeVisible();

    // Section-2 heading (apps/web/src/routes/_authenticated/teacher/
    // substitutions.tsx:66).
    await expect(
      page.getByRole('heading', { name: 'Meine Abwesenheiten' }),
    ).toBeVisible();

    // The Section-2 empty state must NOT appear — our admin-created
    // absence for kc-lehrer should populate this section. (Section-1
    // empty state "Keine offenen Vertretungsanfragen" may legitimately
    // still appear because no admin has assigned kc-lehrer as a
    // substitute in this spec — that's the SUB-LEHRER-02 slice.)
    await expect(
      page.getByText('Keine aktiven Abwesenheiten'),
      'Section-2 empty state must not appear when the absent teacher has at least one substitution row',
    ).toHaveCount(0);

    // Substitution row data — assert on the period + subject from the
    // seedTimetableRun fixture. The "X. Stunde" rendering is on
    // substitutions.tsx:93; subjectAbbreviation comes from the join in
    // findByAbsentUser (substitution.service.ts) and surfaces as
    // SubstitutionDto.subjectAbbreviation.
    await expect(
      page
        .getByText(/1\.\s*Stunde/)
        .first(),
      'fixture seeds MONDAY/period-1 — the row must render "1. Stunde"',
    ).toBeVisible();
    await expect(
      page
        .getByText(new RegExp(`${fixture.subjectAbbreviation}\\s*·\\s*1A`))
        .first(),
      'row must render "<subjectAbbreviation> · <className>" from the join',
    ).toBeVisible();

    // PENDING badge — the freshly-auto-generated substitution has no
    // candidateTeacherId yet (admin hasn't assigned anyone), so status
    // stays at PENDING. Badge text comes from SubstitutionDto.status
    // verbatim (substitutions.tsx:98).
    await expect(
      page.getByText('PENDING').first(),
      'newly-generated substitution must render the PENDING status badge in Section 2',
    ).toBeVisible();

    // "Uebergabenotiz" button — when no handover note exists yet, the
    // button label is the German default (substitutions.tsx:111). This
    // both locks the no-note state AND verifies the button is reachable
    // from this view (SUB-LEHRER-HANDOVER follow-up spec drives the
    // editor open and asserts the saved note round-trips).
    await expect(
      page.getByRole('button', { name: 'Uebergabenotiz' }).first(),
      'no-handover-note button label must be "Uebergabenotiz" by default',
    ).toBeVisible();
  });
});
