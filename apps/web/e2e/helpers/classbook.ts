/**
 * Classbook E2E helpers — #81.
 *
 * The classbook surface is anchored on a `TimetableLesson` ID: clicking a
 * timetable cell navigates to `/classbook/<timetableLessonId>` and the
 * backend resolves it to (or creates) a `ClassBookEntry`. Specs seed
 * exactly one such lesson via `createThrowawaySchool({ withTimetableStack: true })`
 * (`fixtures/throwaway-school.ts`). The standard prisma:seed creates
 * ZERO TimetableLesson rows — they're produced by solver runs, which
 * only happens in local dev.
 *
 * This module covers the API-side state plumbing tests need on top of
 * the lesson fixture:
 *   - `resolveEntryByTimetableLesson` mirrors the UI's lesson→entry
 *     resolve endpoint so tests can mix UI actions with API state setup
 *   - `resetAttendanceForEntry` puts a ClassBookEntry back into the
 *     canonical "alle anwesend" state for use in afterEach hooks
 *
 * Note: After Phase 3.5 migrations (#147), the Batch B classbook specs
 * rely on the throwaway-school cascade for cleanup and no longer call
 * the reset/cleanup helpers in this module. The helpers stay available
 * for any future spec that mixes UI + API state inside a single throwaway.
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
 * Sweep all student notes attached to a ClassBookEntry. Legacy helper —
 * kept for any spec that explicitly reuses a ClassBookEntry between
 * tests. Throwaway-school specs (Batch B, #166) no longer need this
 * because the per-spec School cascade-deletes the entry and its notes.
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

/**
 * Clear thema/lehrstoff/hausaufgabe on a ClassBookEntry so the next test
 * sees blank inputs. Legacy helper — Batch B specs (#166) rely on the
 * throwaway-school cascade instead.
 *
 * UpdateLessonContentDto enforces `@IsString()` on each field, so we send
 * empty strings (not `null`) — the service-side spread guards on
 * `!== undefined` so empty strings get written through to Prisma verbatim
 * (lesson-content.service.ts:28).
 */
export async function resetLessonContent(
  request: APIRequestContext,
  schoolId: string,
  entryId: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const res = await request.patch(
    `${CLASSBOOK_API}/schools/${schoolId}/classbook/${entryId}/content`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { thema: '', lehrstoff: '', hausaufgabe: '' },
    },
  );
  if (!res.ok() && res.status() !== 404) {
    // eslint-disable-next-line no-console
    console.warn(
      `[classbook] resetLessonContent soft-failed (${res.status()}); continuing`,
    );
  }
}
