/**
 * Issue #85 — Teacher "Meine Abwesenheiten" view.
 *
 * Issue #168 (Phase 3.5/6 Batch D) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school. The class name override
 * (`classNames: ['1A']`) keeps the row-text assertion stable since the
 * substitution panel renders `<subjectAbbreviation> · <className>`.
 *
 * Locks the absent-teacher's view of their auto-generated substitution
 * rows on /teacher/substitutions:
 *
 *   1. Throwaway TimetableRun + one lesson at MONDAY/period-1 for the
 *      throwaway lehrer (bound to kc-lehrer's KC user).
 *   2. POST an absence for the throwaway lehrer covering the upcoming
 *      Monday → backend auto-expands to one Substitution row.
 *   3. kc-lehrer logs in → /teacher/substitutions → Section 2 ("Meine
 *      Abwesenheiten") surfaces the row with subject + class + period
 *      + a PENDING status badge.
 *
 * Exercises GET /substitutions/my-absences (substitution.controller.ts:43)
 * and the SubstitutionDto join chain (subjectAbbreviation, className,
 * periodNumber), plus the useMyAbsenceSubstitutions hook + the page's
 * Section-2 render branch.
 */
import { test, expect } from '@playwright/test';
import { loginAsRole } from './helpers/login';
import {
  createAbsenceViaAPI,
  nextMondayISODate,
  type CreatedAbsence,
} from './helpers/substitutions';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #85 — Teacher Meine Abwesenheiten (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Section-2 rendering is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;
  let absence: CreatedAbsence | undefined;

  test.beforeEach(async ({ context, page, request }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      classNames: ['1A'],
      withTimetableStack: true,
      namePrefix: 'E2E-SUB-LEHRER',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);

    // Seed the absence BEFORE the lehrer logs in — the admin token comes
    // from request.context (helpers/login.getAdminToken) and is independent
    // of the page's Keycloak session.
    const monday = nextMondayISODate();
    absence = await createAbsenceViaAPI(
      request,
      {
        teacherId: fixture.timetable!.teacherId,
        dateFrom: monday,
        dateTo: monday,
        reason: 'KRANK',
      },
      fixture.schoolId,
    );
    expect(
      absence.affectedLessonCount ?? 0,
      'absence-expansion must create at least one substitution row',
    ).toBeGreaterThan(0);

    await loginAsRole(page, 'lehrer');
  });

  test.afterEach(async () => {
    // Throwaway-school cleanup cascades through TeacherAbsence +
    // Substitution + HandoverNote rows — no explicit cancel needed.
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
      absence = undefined;
    }
  });

  test('SUB-LEHRER-01: kc-lehrer sees own absence with auto-generated substitution + PENDING badge in Section 2', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const stack = fixture.timetable!;

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
    // absence for the throwaway lehrer should populate this section.
    await expect(
      page.getByText('Keine aktiven Abwesenheiten'),
      'Section-2 empty state must not appear when the absent teacher has at least one substitution row',
    ).toHaveCount(0);

    // Substitution row data — assert on the period + subject from the
    // throwaway timetable stack. The "X. Stunde" rendering is on
    // substitutions.tsx:93; subjectAbbreviation comes from the join in
    // findByAbsentUser (substitution.service.ts) and surfaces as
    // SubstitutionDto.subjectAbbreviation.
    await expect(
      page.getByText(/1\.\s*Stunde/),
      'throwaway seeds MONDAY/period-1 — the row must render "1. Stunde"',
    ).toBeVisible();
    await expect(
      page.getByText(new RegExp(`${stack.subjectAbbreviation}\\s*·\\s*1A`)),
      'row must render "<subjectAbbreviation> · <className>" from the join',
    ).toBeVisible();

    // PENDING badge — the freshly-auto-generated substitution has no
    // candidateTeacherId yet (admin hasn't assigned anyone), so status
    // stays at PENDING. Badge text comes from SubstitutionDto.status
    // verbatim (substitutions.tsx:98).
    await expect(
      page.getByText('PENDING'),
      'newly-generated substitution must render the PENDING status badge in Section 2',
    ).toBeVisible();

    // "Uebergabenotiz" button — when no handover note exists yet, the
    // button label is the German default (substitutions.tsx:111). This
    // both locks the no-note state AND verifies the button is reachable
    // from this view.
    await expect(
      page.getByRole('button', { name: 'Uebergabenotiz' }),
      'no-handover-note button label must be "Uebergabenotiz" by default',
    ).toBeVisible();
  });
});
