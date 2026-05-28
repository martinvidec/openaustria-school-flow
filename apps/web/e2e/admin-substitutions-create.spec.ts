/**
 * Issue #85 — Admin "Neue Abwesenheit erfassen" UI flow.
 *
 * Issue #165 (Phase 3.5/6 Batch A) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school so the AbsenceList +
 * OpenSubstitutionsPanel render only this spec's rows. `.first()` race
 * guards on the panel matches are no longer needed.
 *
 *   1. Throwaway TimetableRun + one lesson at MONDAY/period-1 for the
 *      throwaway teacher (bound to kc-lehrer Person).
 *   2. Admin opens /admin/substitutions?tab=absences, clicks "Neue
 *      Abwesenheit erfassen", picks the throwaway teacher + Monday +
 *      KRANK reason, submits.
 *   3. Toast "Abwesenheit erfasst. 1 Stunden betroffen." confirms the
 *      backend expansion produced exactly one row, and the AbsenceList
 *      re-renders with the new row.
 *   4. Switch to "Offene Vertretungen" tab — the auto-generated
 *      substitution surfaces.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  nextMondayISODate,
  listSubstitutionsViaAPI,
} from './helpers/substitutions';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #85 — Admin Neue Abwesenheit erfassen UI flow (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'AbsenceForm is desktop-prioritised — mobile flow is a follow-up slice once the form layout is mobile-audited.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context, page }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-SUB-CREATE',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    // The UI flow creates an absence that the throwaway-school cascade
    // covers — TeacherAbsence + Substitution + HandoverNote all go with
    // the School. `purgeAbsenceViaPrisma` (legacy) is no longer needed.
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('SUB-ADMIN-CREATE-01: admin creates an absence via the UI form → toast + AbsenceList + Offene Vertretungen row', async ({
    page,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const stack = fixture.timetable!;

    // Derive the throwaway teacher's name parts from the perspective
    // format (`${lastName} ${firstName}`). The AbsenceForm Select option
    // renders as "{lastName}, {firstName}" (AbsenceForm.tsx:152); the
    // AbsenceList table row and OpenSubstitutionsPanel header both render
    // "{firstName} {lastName}" (teacher-absence.service.ts:268 +
    // substitution.service.ts:455).
    const [tLast, tFirst] = stack.teacherDisplayName.split(' ');
    const selectOptionLabel = `${tLast}, ${tFirst}`;

    const monday = nextMondayISODate();

    await page.goto('/admin/substitutions?tab=absences');
    await expect(
      page.getByRole('heading', { name: 'Vertretungsplanung' }),
    ).toBeVisible();

    // Open the form. Button copy is verbatim from substitutions.tsx:142.
    await page
      .getByRole('button', { name: 'Neue Abwesenheit erfassen' })
      .click();

    await page.getByRole('combobox', { name: 'Lehrer/in' }).click();
    await page
      .getByRole('option', { name: selectOptionLabel })
      .click();

    await page.fill('input#absence-date-from', monday);
    await page.fill('input#absence-date-to', monday);

    // Reason defaults to KRANK already (AbsenceForm.tsx:67) — leaving
    // it as-is intentionally to lock the default for downstream
    // analytics specs.

    await page
      .getByRole('button', { name: 'Abwesenheit erfassen' })
      .click();

    // Submission toast — exact text from AbsenceForm.tsx:115. "1" is
    // load-bearing: it proves the backend treated the absence as
    // covering exactly the one throwaway lesson, not zero (would-fail check
    // below) and not many (which would mean cross-fixture leakage).
    await expect(
      page.getByText('Abwesenheit erfasst. 1 Stunden betroffen.'),
    ).toBeVisible();

    // AbsenceList below the form re-renders with the new row. Strict
    // match (no `.first()`) is now safe — per-school isolation means the
    // only matching row is ours.
    await expect(
      page
        .locator('table')
        .getByText(new RegExp(`${tFirst}\\s+${tLast}`)),
    ).toBeVisible();

    // Resolve the absence id via the admin substitutions API so the
    // assertion below can match it back to the panel row. The throwaway
    // school has exactly one (originalTeacherId, MONDAY, period 1)
    // substitution.
    const subs = await listSubstitutionsViaAPI(request, fixture.schoolId);
    const ours = subs.find(
      (s) =>
        s.originalTeacherId === stack.teacherId &&
        s.dayOfWeek === 'MONDAY' &&
        s.periodNumber === 1 &&
        s.status === 'PENDING',
    );
    expect(
      ours,
      'admin substitutions list must contain the auto-generated row for our absence',
    ).toBeTruthy();

    // Switch tabs and verify the substitution surfaces in
    // OpenSubstitutionsPanel. This validates the end-to-end loop:
    // UI form → POST /absences → backend expansion → useSubstitutions
    // refetch → panel render.
    await page.getByRole('tab', { name: 'Offene Vertretungen' }).click();
    await expect(
      page.getByText(
        new RegExp(`Vertretung fuer:\\s*${tFirst}\\s+${tLast}`),
      ),
      'newly created absence must produce a substitution row in the open panel',
    ).toBeVisible();
  });
});
