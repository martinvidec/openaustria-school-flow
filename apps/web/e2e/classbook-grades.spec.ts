/**
 * Issue #81 — Classbook Grade-Matrix create flow.
 *
 * Issue #166 (Phase 3.5/6 Batch B) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own ClassSubject so the GradeMatrix
 * empty-state is automatic and the `cleanupGradesForClassSubject` sweep
 * is no longer needed.
 *
 * Locks the "Noten" tab's create-flow on /classbook/$lessonId:
 *   1. Open the lesson with ?tab=noten → "Noch keine Noten erfasst"
 *      empty state for a fresh ClassSubject.
 *   2. Click "Note hinzufuegen" → GradeEntryDialog opens.
 *   3. Pick first student, leave default category MITARBEIT, click
 *      grade value "2" via GradeValuePicker (aria-label="Note 2").
 *   4. Submit → "Note gespeichert" toast.
 *   5. Dialog closes, GradeMatrix renders the student row with the
 *      grade column AND a weighted average. The average for one
 *      MITARBEIT-2 should display as "2.0".
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #81 — Classbook Grade-Matrix (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'GradeMatrix layout is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context, page }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      withStudents: [
        { firstName: 'Anna', lastName: 'Schueler' },
        { firstName: 'Berta', lastName: 'Schueler' },
        { firstName: 'Carla', lastName: 'Schueler' },
      ],
      namePrefix: 'E2E-CB-GRADE',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('CB-GRADE-01: create grade via dialog → toast → student row + average visible', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const lessonId = fixture.timetable!.timetableLessonId;

    await page.goto(`/classbook/${lessonId}?tab=noten`);

    // Empty state on a fresh ClassSubject (GradeMatrix.tsx:206).
    await expect(
      page.getByRole('heading', { name: 'Noch keine Noten erfasst' }),
      'fresh ClassSubject must render the GradeMatrix empty state',
    ).toBeVisible();

    await page.getByRole('button', { name: 'Note hinzufuegen' }).first().click();

    // Dialog mount: GradeEntryDialog.tsx:125 "Neue Note erfassen".
    await expect(
      page.getByRole('heading', { name: 'Neue Note erfassen', level: 2 }),
    ).toBeVisible();

    // Pick first student. The select is populated from the matrix's
    // studentList → all class members. The actual student doesn't
    // matter for the create-flow lock; deterministic first pick keeps
    // the assertion stable.
    await page.getByRole('combobox', { name: 'Schueler/in' }).click();
    const firstStudentOption = page.getByRole('option').first();
    await expect(firstStudentOption).toBeVisible();
    const pickedStudentName = (await firstStudentOption.textContent())?.trim() ?? '';
    expect(
      pickedStudentName.length,
      'first student option must surface a non-empty name',
    ).toBeGreaterThan(0);
    await firstStudentOption.click();

    // Default category MITARBEIT (GradeEntryDialog.tsx:62) — no extra
    // click needed. Default date is today (initialized in dialog), so
    // both gate inputs are satisfied; the picker is the last input.
    await page.getByRole('radio', { name: 'Note 2', exact: true }).click();

    // Submit. The dialog's submit button is labelled "Note hinzufuegen"
    // in CREATE mode (line 212), same as the action-bar button — scope
    // to the dialog so we don't accidentally hit the action-bar one.
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Note hinzufuegen' })
      .click();

    await expect(
      page.getByText('Note gespeichert'),
      'success toast must appear after the POST commits',
    ).toBeVisible({ timeout: 5_000 });

    // Dialog auto-closes onSave (GradeEntryDialog.tsx:113).
    await expect(
      page.getByRole('heading', { name: 'Neue Note erfassen', level: 2 }),
      'dialog must close after a successful create',
    ).toHaveCount(0);

    // After invalidation, GradeMatrix re-renders with the new column +
    // a row for the picked student. The empty state is gone.
    await expect(
      page.getByRole('heading', { name: 'Noch keine Noten erfasst' }),
      'empty state must be gone once the matrix has at least one grade',
    ).toHaveCount(0);
    await expect(
      page.getByText(pickedStudentName).first(),
      'picked student row must surface in the GradeMatrix',
    ).toBeVisible();

    // Weighted average for ONE MITARBEIT grade of value 2.0 must
    // resolve to "2.0" (one decimal, GradeMatrix.tsx:81). This is the
    // regression-lock for grade-average.util — a bug that miscalculates
    // averages or applies wrong default weights would surface here.
    await expect(
      page.getByText('2.0').first(),
      'weighted average must display "2.0" for one MITARBEIT-2 grade',
    ).toBeVisible();
  });
});
