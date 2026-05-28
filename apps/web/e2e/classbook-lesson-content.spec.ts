/**
 * Issue #81 — Classbook Lesson-Content E2E coverage.
 *
 * Issue #166 (Phase 3.5/6 Batch B) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own ClassBookEntry (resolved on first
 * GET), so the API-side reset before the test body is no longer needed.
 *
 * Locks the auto-save flow on the "Inhalt" tab of /classbook/$lessonId:
 *   1. Open the lesson page with ?tab=inhalt.
 *   2. Fill the Thema textarea, blur (debounced 1 s PATCH /content).
 *   3. Wait for the per-field "Gespeichert" indicator (the only stable
 *      signal that the mutation committed — without it a reload would
 *      race the debounce).
 *   4. Reload → assert the value persists.
 *
 * Exercises the LessonContentForm blur-save loop, PATCH
 * /classbook/:entryId/content, and the by-timetable-lesson resolver
 * chain (TimetableLesson → ClassBookEntry auto-create).
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Issue #81 — Classbook Lesson-Content (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Content form is identical across viewports — desktop only for the first lock.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context, page }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-CB-CONTENT',
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

  test('CB-CONTENT-01: fill Thema → blur → "Gespeichert" → reload persists', async ({
    page,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    const lessonId = fixture.timetable!.timetableLessonId;

    await page.goto(`/classbook/${lessonId}?tab=inhalt`);

    const themaField = page.getByLabel('Thema', { exact: true });
    await expect(themaField).toBeVisible();
    await expect(
      themaField,
      'Thema must start empty — fresh throwaway entry has no content',
    ).toHaveValue('');

    // Timestamped value keeps the assertion specific to this run even
    // though the per-spec throwaway school already isolates state.
    const themaValue = `E2E Thema ${Date.now()}`;
    await themaField.fill(themaValue);

    // Trigger blur — the LessonContentForm's onBlur handler debounces
    // 1 s before firing the PATCH (LessonContentForm.tsx:73). Clicking
    // the Lehrstoff label moves focus off Thema reliably.
    await page.getByLabel('Lehrstoff', { exact: true }).click();

    // "Gespeichert" inline indicator fades after 2 s — assert while it's
    // still up (LessonContentForm.tsx:93). The indicator is the only
    // wire-confirmed signal that the PATCH succeeded; without it the
    // reload below would race the 1 s debounce.
    await expect(
      page.getByText('Gespeichert').first(),
      'per-field "Gespeichert" indicator must appear after blur-save commits',
    ).toBeVisible({ timeout: 5_000 });

    await page.reload();

    // After reload, the page re-resolves entry → reads back the persisted
    // thema → initial state populates the textarea (route file uses
    // entry.thema as initialData — $lessonId.tsx:144).
    await expect(
      page.getByLabel('Thema', { exact: true }),
      'Thema value must persist across a reload — proves PATCH committed and entry.thema is round-tripped',
    ).toHaveValue(themaValue);
  });
});
