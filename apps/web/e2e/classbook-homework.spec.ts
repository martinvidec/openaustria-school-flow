/**
 * Issue #82 — Classbook Homework create flow.
 *
 * First sub-spec of the Hausaufgaben/Klausuren coverage gap. Locks the
 * create-flow on the "Aufgaben" tab of /classbook/$lessonId:
 *   1. Open the lesson with ?tab=aufgaben → "Hausaufgaben" tab shows the
 *      empty state for a fresh ClassSubject.
 *   2. Click "Hausaufgabe erstellen" → HomeworkDialog opens.
 *   3. Fill a timestamped title (`E2E-HW-...`), optional description,
 *      tomorrow's due date, submit.
 *   4. Dialog closes → useCreateHomework invalidates useHomework →
 *      refetch surfaces the new row in the list.
 *
 * Exercises POST /homework + the HomeworkDialog form + the
 * HomeworkExamList Hausaufgaben-tab render. Edit + delete + the Exam
 * surface (which has the ExamCollisionWarning regression risk per the
 * issue body) are deferred to follow-up sub-specs.
 *
 * Chromium-only-skip per the race-family precedent — every spec on
 * this surface writes Homework rows on the shared seed ClassSubject.
 * Cleanup sweeps by title-prefix so parallel specs only delete their
 * own rows.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import { CLASSBOOK_SCHOOL_ID } from './helpers/classbook';
import {
  HOMEWORK_TITLE_PREFIX,
  cleanupE2EHomework,
  isoDaysFromNow,
} from './helpers/homework';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';

test.describe('Issue #82 — Classbook Homework create (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Dialog layout is identical across viewports — desktop only for the first lock.',
  );

  let fixture: TimetableRunFixture | undefined;

  test.beforeEach(async ({ page }) => {
    fixture = await seedTimetableRun(CLASSBOOK_SCHOOL_ID);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Sweep ALL E2E-HW- rows on this school. The Homework FK to
    // ClassBookEntry is `onDelete: SetNull` (schema.prisma:1425) and
    // there's no FK to TimetableRun, so cleanupTimetableRun() does NOT
    // cascade to Homework rows; they accumulate across specs without
    // this explicit sweep.
    await cleanupE2EHomework(request, `${HOMEWORK_TITLE_PREFIX}CREATE-`);
    if (fixture) {
      await cleanupTimetableRun(fixture);
      fixture = undefined;
    }
  });

  test('CB-HW-01: create homework via dialog → row visible in Hausaufgaben tab', async ({
    page,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    // Make sure no leftover homework from a killed prior run pollutes
    // the assertions below — the empty-state and the row-visibility
    // checks both depend on a known starting state.
    await cleanupE2EHomework(request, `${HOMEWORK_TITLE_PREFIX}CREATE-`);

    await page.goto(`/classbook/${fixture.lessonId}?tab=aufgaben`);

    // The empty state is rendered when homework.length === 0
    // (HomeworkExamList.tsx:61). A polluted DB or a wrong tab default
    // would fail this loudly.
    await expect(
      page.getByText('Keine Hausaufgaben', { exact: true }),
      'fresh ClassSubject must render the Hausaufgaben empty state',
    ).toBeVisible();

    // Open the dialog. The action-bar button has the same label as the
    // dialog's submit, so we disambiguate by clicking the only one
    // present BEFORE the dialog mounts (the submit appears later).
    await page
      .getByRole('button', { name: 'Hausaufgabe erstellen' })
      .click();

    // Dialog title is the cross-cutting mount signal — without it the
    // form fields below would either not exist or be from a different
    // dialog. (HomeworkDialog.tsx:90)
    await expect(
      page.getByRole('heading', { name: 'Hausaufgabe erstellen', level: 2 }),
    ).toBeVisible();

    // Timestamped title doubles as the cleanup discriminator (the
    // prefix-sweep in afterEach hooks on HOMEWORK_TITLE_PREFIX).
    const title = `${HOMEWORK_TITLE_PREFIX}CREATE-${Date.now()} — Mathe Kapitel 3`;
    await page.getByLabel('Titel *').fill(title);
    await page
      .getByLabel('Beschreibung')
      .fill('Aufgaben 12–18 auf Seite 47');
    await page.getByLabel('Faellig am *').fill(isoDaysFromNow(1));

    // Submit. After the mutation onSuccess, the dialog closes (the
    // `onSuccess: () => onClose()` chain at HomeworkDialog.tsx:70).
    // We then wait for the dialog to disappear before asserting on
    // the list — otherwise the dialog could still mask the list row.
    await page
      .getByRole('button', { name: 'Hausaufgabe erstellen' })
      .last()
      .click();

    await expect(
      page.getByRole('heading', { name: 'Hausaufgabe erstellen', level: 2 }),
      'dialog must close after a successful create',
    ).toHaveCount(0);

    // Refetched list row carries the timestamped title verbatim.
    // HomeworkExamList renders the title as the row heading
    // (HomeworkExamList.tsx:159). The negative-presence check on the
    // empty state guards against the row being rendered ALONGSIDE the
    // empty state (which would mean the conditional render broke).
    await expect(
      page.getByText(title),
      'newly-created homework must surface in the Hausaufgaben tab',
    ).toBeVisible();
    await expect(
      page.getByText('Keine Hausaufgaben', { exact: true }),
      'empty state must be gone once the list has at least one row',
    ).toHaveCount(0);
  });
});
