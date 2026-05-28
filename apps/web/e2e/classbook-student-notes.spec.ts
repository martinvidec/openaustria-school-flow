/**
 * Issue #81 — Classbook Student-Notes E2E coverage.
 *
 * Issue #166 (Phase 3.5/6 Batch B) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own ClassBookEntry (no leftover
 * notes from a killed prior run can pollute the empty-state check).
 *
 * Locks the "Notizen" tab's create-flow on /classbook/$lessonId:
 *   1. Open the lesson with ?tab=notizen → "Keine Notizen vorhanden".
 *   2. Click "Notiz hinzufuegen" → inline StudentNoteForm appears.
 *   3. Pick a student, type a timestamped content, click submit.
 *   4. Wait for "Notiz gespeichert" toast.
 *   5. Empty-state must be gone + the note content appears under the
 *      student's section header.
 *
 * Exercises POST /classbook/:entryId/notes + the useCreateNote
 * mutation invalidation + the GET /notes refetch + the grouped-by-
 * student rendering in StudentNoteList.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #81 — Classbook Student-Notes (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Note-create flow is identical across viewports — desktop only for the first lock.',
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
      namePrefix: 'E2E-CB-NOTES',
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

  test('CB-NOTES-01: create note via inline form → toast → row visible in grouped list', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const lessonId = fixture.timetable!.timetableLessonId;

    await page.goto(`/classbook/${lessonId}?tab=notizen`);

    // Empty state must show on a fresh entry. The StudentNoteList
    // renders this verbatim (StudentNoteList.tsx:151).
    await expect(
      page.getByText('Keine Notizen vorhanden'),
      'fresh entry must render the StudentNoteList empty state',
    ).toBeVisible();

    await page.getByRole('button', { name: 'Notiz hinzufuegen' }).click();

    // Student select — the form pulls students from useAttendance which
    // returns all class members. Picking ANY student is sufficient for
    // this regression lock; first option for determinism.
    await page.getByRole('combobox', { name: 'Schueler/in' }).click();
    const firstOption = page.getByRole('option').first();
    await expect(
      firstOption,
      'student select must surface at least one option from the throwaway roster',
    ).toBeVisible();
    const pickedStudentName = (await firstOption.textContent())?.trim() ?? '';
    expect(
      pickedStudentName.length,
      'first option must expose a non-empty student name',
    ).toBeGreaterThan(0);
    await firstOption.click();

    const noteContent = `E2E Notiz ${Date.now()}`;
    await page.getByLabel('Notiz', { exact: true }).fill(noteContent);

    // Submit. The form's submit button has the label "Notiz hinzufuegen"
    // in CREATE mode, same as the action-bar button — we scope to .last()
    // to disambiguate (the form-submit is rendered after the action-bar).
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
