/**
 * Issue #85 — Admin "Offene Vertretungen" panel.
 *
 * Issue #165 (Phase 3.5/6 Batch A) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone for this spec; each invocation owns its own throwaway School so
 * the substitution-list panel renders only rows this spec created. The
 * `.first()` race-defense on the panel match is therefore no longer needed
 * either — replaced with a strict-mode assertion.
 *
 *   1. Seed an active TimetableRun with one lesson at MONDAY/period-1
 *      for the throwaway class, taught by kc-lehrer.
 *   2. POST an absence for the throwaway teacher covering the upcoming
 *      Monday → backend auto-expands to one Substitution row.
 *   3. Admin opens /admin/substitutions?tab=open → OpenSubstitutionsPanel
 *      surfaces the row with the absent teacher's name.
 *
 * Why this slice first: it exercises three load-bearing layers in one
 * test — backend absence-to-substitution expansion (4 .createMany
 * branch in teacher-absence.service.ts), useSubstitutions list fetch,
 * and OpenSubstitutionsPanel rendering.
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
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #85 — Admin Offene Vertretungen (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Panel rendering is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;
  let absence: CreatedAbsence | undefined;

  test.beforeEach(async ({ context, page }) => {
    // roles: admin (drives /admin/substitutions) + lehrer (the absent
    // teacher must be tied to a Person row; the throwaway timetable stack
    // binds the lone Teacher to the lehrer Person when roles.lehrer is on,
    // so the absence has a teacher to belong to and the panel has a name
    // to render).
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-SUB-LIST',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Belt-and-braces cancel: the throwaway-school cleanup cascades
    // through TeacherAbsence + Substitution rows, but explicit cancel
    // protects against a half-applied cleanup if a later edit re-orders
    // teardown.
    if (absence && fixture) {
      await cancelAbsenceViaAPI(request, absence.id, fixture.schoolId);
      absence = undefined;
    }
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('SUB-ADMIN-01: absence for the throwaway teacher surfaces a substitution row in OpenSubstitutionsPanel', async ({
    page,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const stack = fixture.timetable!;

    // Throwaway teacher Person was created as
    // `firstName = '<namePrefix>-lehrer'`, `lastName = '<suffix>'`. The
    // perspective format `${lastName} ${firstName}` is exposed via
    // `teacherDisplayName`; split it for the substitution panel which
    // renders `${firstName} ${lastName}` (substitution.service.ts:455).
    const [tLast, tFirst] = stack.teacherDisplayName.split(' ');

    // Absence covering the upcoming Monday — aligns with the throwaway
    // lesson's day-of-week so the expansion algorithm produces one
    // substitution row.
    const monday = nextMondayISODate();
    absence = await createAbsenceViaAPI(
      request,
      {
        teacherId: stack.teacherId,
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

    await page.goto('/admin/substitutions?tab=open');
    await expect(
      page.getByRole('heading', { name: 'Vertretungsplanung' }),
    ).toBeVisible();

    // Empty-state card "Keine offenen Vertretungen" must NOT appear —
    // the absence we just created should have populated the panel.
    await expect(page.getByText('Keine offenen Vertretungen')).toHaveCount(0);

    // Per-school isolation: the panel ONLY shows this throwaway school's
    // substitutions, so a strict (non-`.first()`) match is now safe. The
    // shared-tenant race that motivated `.first()` is gone.
    await expect(
      page.getByText(
        new RegExp(`Vertretung fuer:\\s*${tFirst}\\s+${tLast}`),
      ),
      'panel must show the absent teacher name on the substitution row',
    ).toBeVisible();
  });
});
