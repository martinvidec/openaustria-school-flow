/**
 * Issue #81 — Classbook Attendance E2E coverage.
 *
 * Locks the most operationally critical sub-surface of `/classbook/$lessonId`:
 * Lehrer öffnet die Stunde → "Alle anwesend" → cyclet einen Schüler auf
 * ABSENT → speichert (debounced bulk PUT) → reload zeigt den Zustand.
 *
 * Chromium-only-skip because every spec mutates the SAME seed
 * `ClassBookEntry` (the MONDAY-period-1-1A row) — parallel browser
 * projects would race on the same Anwesenheitsliste. Matches the
 * race-family pattern documented in
 * `project_e2e_parallel_cleanup_race_family.md`.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  CLASSBOOK_SCHOOL_ID,
  getSeedClassbookLesson,
  resetAttendanceForEntry,
  resolveEntryByTimetableLesson,
} from './helpers/classbook';

test.describe('Issue #81 — Classbook Attendance (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Attendance contract is identical across viewports — desktop only for the first lock.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Mutates the shared seed ClassBookEntry — parallel projects race.',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    // Restore the canonical alle-anwesend state so the next spec / run
    // starts deterministic. Pure read-only assertions in the test body
    // make this cleanup the single source of mutation-resetting truth.
    const lesson = await getSeedClassbookLesson();
    const entry = await resolveEntryByTimetableLesson(
      request,
      CLASSBOOK_SCHOOL_ID,
      lesson.id,
    );
    await resetAttendanceForEntry(request, CLASSBOOK_SCHOOL_ID, entry.id);
  });

  test('CB-ATTEND-01: cycle first student to ABSENT → reload persists', async ({
    page,
    request,
  }) => {
    const lesson = await getSeedClassbookLesson();

    // Force the API-side baseline before opening the UI. The cycle
    // click below assumes PRESENT → ABSENT after one tap; a previously
    // killed run could otherwise leave a row in LATE or EXCUSED.
    const entry = await resolveEntryByTimetableLesson(
      request,
      CLASSBOOK_SCHOOL_ID,
      lesson.id,
    );
    await resetAttendanceForEntry(request, CLASSBOOK_SCHOOL_ID, entry.id);

    await page.goto(`/classbook/${lesson.id}?tab=anwesenheit`);

    const list = page.getByRole('list', { name: 'Anwesenheitsliste' });
    await expect(list).toBeVisible();
    const rows = list.getByRole('listitem');
    expect(
      await rows.count(),
      'seed class 1A must have students',
    ).toBeGreaterThan(0);

    // Cycle order is PRESENT → ABSENT → LATE → EXCUSED. The API-side
    // baseline above guarantees one click here lands on ABSENT.
    const firstStatus = rows.nth(0).getByRole('button').first();
    await expect(firstStatus).toHaveAccessibleName(/anwesend/i);
    await firstStatus.click();

    // Optimistic UI: aria-label flips immediately before the network
    // round-trip lands.
    await expect(firstStatus).toHaveAccessibleName(/abwesend/i);

    // AttendanceGrid debounces the bulk PUT 2 s after the last
    // interaction (apps/web/src/components/classbook/AttendanceGrid.tsx:74).
    // The success toast is the stable signal that the mutation
    // committed; without it a reload would race the debounce.
    await expect(page.getByText('Anwesenheit gespeichert')).toBeVisible({
      timeout: 8_000,
    });

    await page.reload();
    const firstReloadedStatus = page
      .getByRole('list', { name: 'Anwesenheitsliste' })
      .getByRole('listitem')
      .nth(0)
      .getByRole('button')
      .first();
    await expect(firstReloadedStatus).toHaveAccessibleName(/abwesend/i);
  });
});
