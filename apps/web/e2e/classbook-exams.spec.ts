/**
 * Issue #82 — Classbook Exam create + collision override flow.
 *
 * Issue #166 (Phase 3.5/6 Batch B) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own ClassSubject so the
 * "Pruefungen" empty-state is automatic on first load and the
 * `cleanupE2EExams` prefix-sweep is no longer needed.
 *
 * Locks the headline regression-risk surface called out in #82: the
 * ExamCollisionWarning banner + the "Trotzdem eintragen" override path.
 *
 * Flow:
 *   1. Open /classbook/$lessonId?tab=aufgaben → "Pruefungen" sub-tab.
 *   2. Empty state visible ("Keine Pruefungen geplant").
 *   3. Click "Pruefung eintragen" → ExamDialog opens.
 *   4. Fill timestamped title #1 + a future date → submit. Dialog
 *      closes, exam #1 row visible in the list.
 *   5. Click "Pruefung eintragen" again → fill title #2 + the SAME
 *      date → backend collision-check fires → ExamCollisionWarning
 *      renders with the "Trotzdem eintragen" override button.
 *   6. Submit is BLOCKED until override is clicked (canSubmit gate at
 *      ExamDialog.tsx:73). Click "Trotzdem eintragen" → submit → exam
 *      #2 row also visible.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  EXAMS_TITLE_PREFIX,
  isoDaysFromNow,
} from './helpers/exams';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #82 — Classbook Exam create + collision (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Dialog + collision-warning layout is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context, page }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-CB-EX',
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

  test('CB-EX-01: create exam, then second exam same day → collision warning → override → both visible', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const lessonId = fixture.timetable!.timetableLessonId;

    await page.goto(`/classbook/${lessonId}?tab=aufgaben`);

    // Switch to the Pruefungen sub-tab. The HomeworkExamList Tabs
    // default to hausaufgaben; we drive the click explicitly so a
    // future default-change doesn't silently shift coverage.
    await page.getByRole('tab', { name: 'Pruefungen' }).click();
    await expect(
      page.getByText('Keine Pruefungen geplant', { exact: true }),
      'fresh class must render the Pruefungen empty state',
    ).toBeVisible();

    // -- Exam 1: simple create, no collision yet -----------------------
    await page
      .getByRole('button', { name: 'Pruefung eintragen' })
      .click();

    await expect(
      page.getByRole('heading', { name: 'Pruefung eintragen', level: 2 }),
    ).toBeVisible();

    const ts = Date.now();
    const title1 = `${EXAMS_TITLE_PREFIX}CREATE-${ts}-A — Mathe Schularbeit`;
    const sharedDate = isoDaysFromNow(2);

    await page.getByLabel('Titel *').fill(title1);
    await page.getByLabel('Datum *').fill(sharedDate);

    // No collision yet — ExamCollisionWarning must NOT render here.
    // Per-school isolation means there's no parallel-spec exam that
    // could trigger a false-positive collision.
    await expect(
      page.getByRole('alert').filter({ hasText: 'Achtung: Am' }),
      'no collision is expected for the FIRST exam on this date — the alert must not render',
    ).toHaveCount(0);

    await page
      .getByRole('button', { name: 'Pruefung eintragen' })
      .last()
      .click();
    await expect(
      page.getByRole('heading', { name: 'Pruefung eintragen', level: 2 }),
      'dialog must close after exam #1 commits',
    ).toHaveCount(0);

    await expect(
      page.getByText(title1),
      'exam #1 must surface in the Pruefungen list after create',
    ).toBeVisible();

    // -- Exam 2: SAME date → collision → override → submit -------------
    await page
      .getByRole('button', { name: 'Pruefung eintragen' })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Pruefung eintragen', level: 2 }),
    ).toBeVisible();

    const title2 = `${EXAMS_TITLE_PREFIX}CREATE-${ts}-B — Mathe Wiederholung`;
    await page.getByLabel('Titel *').fill(title2);
    await page.getByLabel('Datum *').fill(sharedDate);

    // Collision warning must render — the existing exam #1 collides
    // because (classId, date) matches. The banner shows the existing
    // exam's title verbatim (ExamCollisionWarning.tsx:43).
    const warning = page
      .getByRole('alert')
      .filter({ hasText: 'Achtung: Am' });
    await expect(
      warning,
      'collision warning must surface when a second exam is scheduled on the same date for the same class',
    ).toBeVisible();
    await expect(
      warning,
      'warning must name the existing exam (title #1) so the user knows what collides',
    ).toContainText(title1);

    // Submit is gated at the form level — canSubmit goes false while
    // collision is unresolved (ExamDialog.tsx:73). The disabled attribute
    // is the regression-lock for the gate; without the override path the
    // user cannot submit by accident.
    const submitBtn = page
      .getByRole('button', { name: 'Pruefung eintragen' })
      .last();
    await expect(
      submitBtn,
      'submit must be disabled while collision is unresolved (forceCreate=false)',
    ).toBeDisabled();

    // Click the inline "Trotzdem eintragen" override. The warning
    // sub-button has the same label substring as the dialog's submit;
    // we scope to the alert region to avoid the strict-mode trap.
    await warning
      .getByRole('button', { name: 'Trotzdem eintragen' })
      .click();

    // Override flips forceCreate=true → submit re-enables.
    await expect(
      submitBtn,
      'submit must re-enable after the override flips forceCreate=true',
    ).toBeEnabled();
    await submitBtn.click();
    await expect(
      page.getByRole('heading', { name: 'Pruefung eintragen', level: 2 }),
      'dialog must close after collision override + submit',
    ).toHaveCount(0);

    // Both exams visible in the list.
    await expect(
      page.getByText(title1),
      'exam #1 must still be in the list',
    ).toBeVisible();
    await expect(
      page.getByText(title2),
      'overridden exam #2 must also surface in the list',
    ).toBeVisible();
  });
});
