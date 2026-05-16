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
 * sees blank inputs. The ClassBookEntry row is NOT linked to the
 * TimetableRun fixture (its primary key chain is classSubjectId + date +
 * period + weekType — see schema.prisma:950) so `cleanupTimetableRun()`
 * does NOT cascade to it. Without this reset the spec's "Thema persists
 * after reload" lock would mask a later test that silently inherits the
 * E2E-flavoured content.
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
