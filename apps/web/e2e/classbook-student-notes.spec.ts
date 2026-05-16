/**
 * Issue #81 — Classbook Student-Notes E2E coverage.
 *
 * Third sub-spec for the Klassenbuch surface (after #89 attendance +
 * Inhalt-tab content). Locks the "Notizen" tab's create-flow on
 * /classbook/$lessonId:
 *   1. Open the lesson with ?tab=notizen → "Keine Notizen vorhanden".
 *   2. Click "Notiz hinzufuegen" → inline StudentNoteForm appears.
 *   3. Pick a student, type a timestamped content, click submit.
 *   4. Wait for "Notiz gespeichert" toast (the on-screen wire-success
 *      signal — without it the next assertion races the mutation).
 *   5. Empty-state must be gone + the note content appears under the
 *      student's section header.
 *
 * Why this slice: it exercises POST /classbook/:entryId/notes + the
 * useCreateNote mutation invalidation + the GET /notes refetch + the
 * grouped-by-student rendering in StudentNoteList. Edit + delete +
 * private-flag visibility are deferred to follow-up sub-specs once the
 * create-loop is regression-locked.
 *
 * Chromium-only-skip per the race-family precedent — every spec on this
 * surface mutates the SAME seeded ClassBookEntry. Same pattern as
 * classbook-attendance and classbook-lesson-content.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  CLASSBOOK_SCHOOL_ID,
  cleanupNotesForEntry,
  resolveEntryByTimetableLesson,
} from './helpers/classbook';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';

test.describe('Issue #81 — Classbook Student-Notes (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Note-create flow is identical across viewports — desktop only for the first lock.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates the shared seed ClassBookEntry — parallel projects race.',
  );

  // Per-test seeding — describe-level test.skip does NOT gate beforeAll
  // (CI lesson from #81 attendance). Per-test hooks ARE gated.
  let fixture: TimetableRunFixture | undefined;

  test.beforeEach(async ({ page }) => {
    fixture = await seedTimetableRun(CLASSBOOK_SCHOOL_ID);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    if (!fixture) return;
    // Sweep notes BEFORE cascade-deleting the run. ClassBookEntry has no
    // FK back to TimetableRun (it's keyed on classSubjectId + date +
    // period + weekType — schema.prisma:950), so cleanupTimetableRun does
    // NOT cascade to it. Notes attached to the entry would leak into the
    // next test's "Keine Notizen vorhanden" empty-state assertion.
    const entry = await resolveEntryByTimetableLesson(
      request,
      CLASSBOOK_SCHOOL_ID,
      fixture.lessonId,
    );
    await cleanupNotesForEntry(request, CLASSBOOK_SCHOOL_ID, entry.id);
    await cleanupTimetableRun(fixture);
    fixture = undefined;
  });

  test('CB-NOTES-01: create note via inline form → toast → row visible in grouped list', async ({
    page,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    // API-side baseline: clear any leftover notes from a previously
    // killed run on this same entry. Without it the "Keine Notizen
    // vorhanden" empty-state check below could legitimately fail before
    // the test does anything wrong.
    const entry = await resolveEntryByTimetableLesson(
      request,
      CLASSBOOK_SCHOOL_ID,
      fixture.lessonId,
    );
    await cleanupNotesForEntry(request, CLASSBOOK_SCHOOL_ID, entry.id);

    await page.goto(`/classbook/${fixture.lessonId}?tab=notizen`);

    // Empty state must show on a freshly-cleared entry. The
    // StudentNoteList renders this verbatim (StudentNoteList.tsx:151).
    await expect(
      page.getByText('Keine Notizen vorhanden'),
      'fresh entry must render the StudentNoteList empty state',
    ).toBeVisible();

    await page.getByRole('button', { name: 'Notiz hinzufuegen' }).click();

    // Student select — the form pulls students from useAttendance which
    // returns all class-1A members. Picking ANY student is sufficient
    // for this regression lock (the create-flow itself is what we test;
    // which student doesn't matter). Take the first option for
    // determinism.
    await page.getByRole('combobox', { name: 'Schueler/in' }).click();
    const firstOption = page.getByRole('option').first();
    await expect(
      firstOption,
      'student select must surface at least one option from the 1A roster',
    ).toBeVisible();
    const pickedStudentName = (await firstOption.textContent())?.trim() ?? '';
    expect(
      pickedStudentName.length,
      'first option must expose a non-empty student name',
    ).toBeGreaterThan(0);
    await firstOption.click();

    // Timestamped content guards against the (unlikely) case that a
    // sibling spec writes a fixed string Notiz between our sweep and
    // the page reload. The full content is asserted on screen below
    // (NoteCard renders the content verbatim).
    const noteContent = `E2E Notiz ${Date.now()}`;
    await page.getByLabel('Notiz', { exact: true }).fill(noteContent);

    // Submit. The form's submit button has the label "Notiz hinzufuegen"
    // in CREATE mode, same as the action-bar button — we scope by the
    // surrounding card region to disambiguate.
    await page
      .getByRole('button', { name: 'Notiz hinzufuegen' })
      .last()
      .click();

    // Success toast is the wire-confirmed signal that the POST committed.
    await expect(
      page.getByText('Notiz gespeichert'),
      'success toast must appear after the create mutation commits',
    ).toBeVisible({ timeout: 5_000 });

    // After the toast, useCreateNote invalidates useNotes → refetch lands
    // → empty state replaced by a section header for the picked student
    // + a NoteCard with the content we just wrote.
    await expect(
      page.getByText('Keine Notizen vorhanden'),
      'empty state must be gone after a successful create',
    ).toHaveCount(0);
    await expect(
      page.getByText(noteContent).first(),
      'newly-created note content must surface in the StudentNoteList',
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { name: pickedStudentName, level: 4 }),
      'note must be grouped under the picked student\'s section header',
    ).toBeVisible();
  });
});
