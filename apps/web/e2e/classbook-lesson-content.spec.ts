/**
 * Issue #81 — Classbook Lesson-Content E2E coverage.
 *
 * Second sub-spec for the Klassenbuch surface (after #89 attendance).
 * Locks the auto-save flow on the "Inhalt" tab of /classbook/$lessonId:
 *   1. Open the lesson page with ?tab=inhalt.
 *   2. Fill the Thema textarea, blur (debounced 1 s PATCH /content).
 *   3. Wait for the per-field "Gespeichert" indicator (the only stable
 *      signal that the mutation committed — without it a reload would
 *      race the debounce).
 *   4. Reload → assert the value persists.
 *
 * Why this slice: it exercises the LessonContentForm blur-save loop, the
 * PATCH /classbook/:entryId/content endpoint, and the by-timetable-lesson
 * resolver chain (TimetableLesson → ClassBookEntry auto-create).
 * Lehrstoff + Hausaufgabe share the exact same hook + endpoint, so locking
 * one field locks all three at the wire level; field-specific UI quirks
 * (e.g. Thema character counter at >50 chars) can be added in a follow-up
 * spec when they become regression-prone.
 *
 * Chromium-only-skip per the race-family precedent — every spec on this
 * surface mutates the SAME seeded ClassBookEntry. Same pattern as
 * classbook-attendance.spec.ts.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  CLASSBOOK_SCHOOL_ID,
  resetLessonContent,
  resolveEntryByTimetableLesson,
} from './helpers/classbook';
import {
  cleanupTimetableRun,
  seedTimetableRun,
  type TimetableRunFixture,
} from './fixtures/timetable-run';

test.describe('Issue #81 — Classbook Lesson-Content (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Content form is identical across viewports — desktop only for the first lock.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates the shared seed ClassBookEntry — parallel projects race.',
  );

  // Per-test seeding — describe-level test.skip does NOT gate beforeAll
  // (CI lesson from #81 attendance run). Per-test hooks ARE gated.
  let fixture: TimetableRunFixture | undefined;

  test.beforeEach(async ({ page }) => {
    fixture = await seedTimetableRun(CLASSBOOK_SCHOOL_ID);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    if (!fixture) return;
    // Reset content fields BEFORE cascade-deleting the run. The
    // ClassBookEntry is NOT FK-linked to TimetableRun (it's keyed on
    // classSubjectId + date + period + weekType — schema.prisma:950), so
    // the run's cascade-delete does not remove the entry. Without this
    // reset, the next test would auto-resolve to an entry pre-populated
    // with this test's Thema content.
    const entry = await resolveEntryByTimetableLesson(
      request,
      CLASSBOOK_SCHOOL_ID,
      fixture.lessonId,
    );
    await resetLessonContent(request, CLASSBOOK_SCHOOL_ID, entry.id);
    await cleanupTimetableRun(fixture);
    fixture = undefined;
  });

  test('CB-CONTENT-01: fill Thema → blur → "Gespeichert" → reload persists', async ({
    page,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');

    // API-side baseline: clear content fields. A previously killed run
    // could otherwise leave a Thema value in the row, and the reload
    // assertion below would pass against state we didn't put there.
    const entry = await resolveEntryByTimetableLesson(
      request,
      CLASSBOOK_SCHOOL_ID,
      fixture.lessonId,
    );
    await resetLessonContent(request, CLASSBOOK_SCHOOL_ID, entry.id);

    await page.goto(`/classbook/${fixture.lessonId}?tab=inhalt`);

    const themaField = page.getByLabel('Thema', { exact: true });
    await expect(themaField).toBeVisible();
    await expect(
      themaField,
      'Thema must start empty — reset wiped any prior content',
    ).toHaveValue('');

    // Timestamped value guards against the (unlikely) case that a sibling
    // spec writes a fixed-string Thema between our PATCH-reset and the
    // page reload. If we asserted on a literal like "Photosynthese" and
    // a parallel test wrote the same, the persistence check would pass
    // against state we didn't produce.
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
