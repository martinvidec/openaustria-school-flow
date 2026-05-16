/**
 * Classbook E2E helpers — #81.
 *
 * The classbook surface is anchored on a `TimetableLesson` ID: clicking a
 * timetable cell navigates to `/classbook/<timetableLessonId>` and the
 * backend resolves it to (or creates) a `ClassBookEntry`. Specs use the
 * existing `fixtures/timetable-run.ts:seedTimetableRun()` helper to
 * deterministically seed one such lesson in `beforeAll` (the standard
 * prisma:seed creates ZERO TimetableLesson rows — they're produced by
 * solver runs, which only happens in local dev).
 *
 * This module covers the API-side state plumbing tests need on top of
 * the lesson fixture:
 *   - `resolveEntryByTimetableLesson` mirrors the UI's lesson→entry
 *     resolve endpoint so tests can mix UI actions with API state setup
 *   - `resetAttendanceForEntry` puts a ClassBookEntry back into the
 *     canonical "alle anwesend" state for use in afterEach hooks
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
import { SEED_SCHOOL_UUID } from '../fixtures/seed-uuids';

export const CLASSBOOK_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const CLASSBOOK_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;

/**
 * Resolve a TimetableLesson ID to its ClassBookEntry via the same endpoint
 * the UI uses. Returns the entry ID for downstream API calls (attendance,
 * content, etc.) so tests can mix UI actions with API state setup.
 */
export async function resolveEntryByTimetableLesson(
  request: APIRequestContext,
  schoolId: string,
  timetableLessonId: string,
): Promise<{ id: string }> {
  const token = await getAdminToken(request);
  const res = await request.get(
    `${CLASSBOOK_API}/schools/${schoolId}/classbook/by-timetable-lesson/${timetableLessonId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(res.ok(), 'classbook resolve by-timetable-lesson').toBeTruthy();
  return (await res.json()) as { id: string };
}

/**
 * Sweep all student notes attached to a ClassBookEntry. Used in afterEach
 * to keep the next test's "Keine Notizen vorhanden" empty-state assertion
 * deterministic — `cleanupTimetableRun()` does NOT cascade to
 * ClassBookEntry (no FK), so notes survive run-cleanup and leak into the
 * next test's view of the same lesson.
 *
 * Best-effort: swallows individual DELETE failures so a half-applied
 * fixture from a previously killed run doesn't block this run's cleanup.
 */
export async function cleanupNotesForEntry(
  request: APIRequestContext,
  schoolId: string,
  entryId: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const listRes = await request.get(
    `${CLASSBOOK_API}/schools/${schoolId}/classbook/${entryId}/notes`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok()) {
    // 404 ⇒ entry already gone (parallel cleanup). Nothing to sweep.
    return;
  }
  const notes = (await listRes.json()) as Array<{ id: string }>;
  for (const note of notes) {
    const delRes = await request.delete(
      `${CLASSBOOK_API}/schools/${schoolId}/classbook/notes/${note.id}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!delRes.ok() && delRes.status() !== 404) {
      // eslint-disable-next-line no-console
      console.warn(
        `[classbook] cleanupNotesForEntry delete ${note.id} soft-failed (${delRes.status()}); continuing`,
      );
    }
  }
}

/**
 * Put a ClassBookEntry's attendance back into the canonical "alle anwesend"
 * state so the next test starts deterministic. Used in afterEach hooks.
 */
export async function resetAttendanceForEntry(
  request: APIRequestContext,
  schoolId: string,
  entryId: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const res = await request.post(
    `${CLASSBOOK_API}/schools/${schoolId}/classbook/${entryId}/attendance/all-present`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  // Soft-fail: cleanup must not abort the test. 404 means the entry was
  // already removed by a parallel run; either way the desired end-state
  // (no E2E-flavoured attendance) is satisfied.
  if (!res.ok() && res.status() !== 404) {
    // eslint-disable-next-line no-console
    console.warn(
      `[classbook] resetAttendance soft-failed (${res.status()}); continuing`,
    );
  }
}
