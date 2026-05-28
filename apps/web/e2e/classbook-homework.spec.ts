/**
 * Issue #82 — Classbook Homework create flow.
 *
 * Issue #166 (Phase 3.5/6 Batch B) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own ClassSubject so the
 * "Hausaufgaben" empty-state is automatic on first load and the
 * `cleanupE2EHomework` prefix-sweep is no longer needed (the throwaway
 * cascade-delete takes the Homework rows with the school).
 *
 * Locks the create-flow on the "Aufgaben" tab of /classbook/$lessonId:
 *   1. Open the lesson with ?tab=aufgaben → "Hausaufgaben" tab shows the
 *      empty state for a fresh ClassSubject.
 *   2. Click "Hausaufgabe erstellen" → HomeworkDialog opens.
 *   3. Fill a timestamped title (`E2E-HW-...`), optional description,
 *      tomorrow's due date, submit.
 *   4. Dialog closes → useCreateHomework invalidates useHomework →
 *      refetch surfaces the new row in the list.
 *
 * Exercises POST /homework + the HomeworkDialog form + the
 * HomeworkExamList Hausaufgaben-tab render.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  HOMEWORK_TITLE_PREFIX,
  isoDaysFromNow,
} from './helpers/homework';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #82 — Classbook Homework create (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Dialog layout is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context, page }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-CB-HW',
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

  test('CB-HW-01: create homework via dialog → row visible in Hausaufgaben tab', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const lessonId = fixture.timetable!.timetableLessonId;

    await page.goto(`/classbook/${lessonId}?tab=aufgaben`);

    // The empty state is rendered when homework.length === 0
    // (HomeworkExamList.tsx:61). Throwaway guarantees an empty
    // ClassSubject on every test.
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

    // Timestamped title doubles as a regression-friendly discriminator
    // even though throwaway-school isolation makes the prefix-sweep no
    // longer necessary.
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
