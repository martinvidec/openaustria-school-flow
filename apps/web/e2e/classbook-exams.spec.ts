/**
 * Issue #82 — Classbook Exam create + collision override flow.
 *
 * Second sub-spec of the Hausaufgaben/Klausuren coverage gap (after
 * PR #99 classbook-homework). Locks the headline regression-risk
 * surface called out in the issue body: the ExamCollisionWarning
 * banner + the "Trotzdem eintragen" override path.
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
 *
 * Exercises POST /exams + GET /exams/collision-check + the
 * ExamDialog's forceCreate gate + the ExamCollisionWarning render.
 *
 * Chromium-only-skip per the race-family precedent — every spec on
 * this surface writes Exam rows on the same seed class. Cleanup
 * sweeps by title-prefix so parallel specs only delete their own.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { CLASSBOOK_SCHOOL_ID } from './helpers/classbook';
import {
  EXAMS_TITLE_PREFIX,
  cleanupE2EExams,
  isoDaysFromNow,
} from './helpers/exams';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';

test.describe('Issue #82 — Classbook Exam create + collision (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Dialog + collision-warning layout is identical across viewports — desktop only for the first lock.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates Exam rows on the shared seed class — chromium is the sole writer.',
  );

  let fixture: TimetableRunFixture | undefined;

  test.beforeEach(async ({ page }) => {
    fixture = await seedTimetableRun(CLASSBOOK_SCHOOL_ID);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Sweep ALL E2E-EX- rows. No FK to TimetableRun, so
    // cleanupTimetableRun does NOT cascade to Exam rows; they
    // accumulate across specs without this explicit sweep.
    await cleanupE2EExams(request, `${EXAMS_TITLE_PREFIX}CREATE-`);
    if (fixture) {
      await cleanupTimetableRun(fixture);
      fixture = undefined;
    }
  });

  test('CB-EX-01: create exam, then second exam same day → collision warning → override → both visible', async ({
    page,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    // API-side baseline so the empty-state check below is honest.
    await cleanupE2EExams(request, `${EXAMS_TITLE_PREFIX}CREATE-`);

    await page.goto(`/classbook/${fixture.lessonId}?tab=aufgaben`);

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
    // The negative-presence check guards against a backend mis-scope
    // that flags ANY existing exam as a collision (would have flagged
    // a parallel spec's row).
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
