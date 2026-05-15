/**
 * Substitutions E2E helpers — #85.
 *
 * Phase 6 absence + substitution REST contract:
 *   - POST   /schools/:schoolId/absences          — admin creates a teacher absence
 *                                                    backend auto-generates substitutions
 *                                                    for every TimetableLesson in range
 *   - DELETE /schools/:schoolId/absences/:id      — cascade-cancels substitutions
 *
 * Specs lean on this helper to seed an absence directly via the API
 * (faster + deterministic) and let the UI render the resulting
 * substitution rows. The Compose-via-UI flow for the AbsenceForm is
 * deliberately deferred to a follow-up sub-spec; this slice focuses on
 * the admin's "Offene Vertretungen" panel rendering its data correctly.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
import { SEED_SCHOOL_UUID } from '../fixtures/seed-uuids';

export const SUBSTITUTIONS_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const SUBSTITUTIONS_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;

export interface CreateAbsenceInput {
  teacherId: string;
  dateFrom: string;
  dateTo: string;
  reason?: string;
  note?: string;
}

export interface CreatedAbsence {
  id: string;
  affectedLessonCount: number;
}

/**
 * POST /absences as admin. Returns the new absence id so afterEach can
 * cancel it (cascade-deletes any auto-generated substitutions).
 */
export async function createAbsenceViaAPI(
  request: APIRequestContext,
  input: CreateAbsenceInput,
): Promise<CreatedAbsence> {
  const token = await getAdminToken(request);
  const res = await request.post(
    `${SUBSTITUTIONS_API}/schools/${SUBSTITUTIONS_SCHOOL_ID}/absences`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: {
        teacherId: input.teacherId,
        dateFrom: input.dateFrom,
        dateTo: input.dateTo,
        reason: input.reason ?? 'KRANK',
        note: input.note,
      },
    },
  );
  expect(
    res.ok(),
    `POST /absences seed → ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  // Response shape: `{ absence: { id, ... }, affectedLessonCount }`
  // (teacher-absence.service.ts:192). The `id` is nested under `absence`,
  // not at the top level — a previous version of this helper read it
  // from the root and silently leaked uncancellable absences.
  const body = (await res.json()) as {
    absence: { id: string };
    affectedLessonCount: number;
  };
  return {
    id: body.absence.id,
    affectedLessonCount: body.affectedLessonCount,
  };
}

/**
 * Cancel an absence via DELETE. Soft-fails on 404 (already gone) so a
 * second cleanup call from a flaky retry doesn't crash the suite.
 */
export async function cancelAbsenceViaAPI(
  request: APIRequestContext,
  absenceId: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const res = await request.delete(
    `${SUBSTITUTIONS_API}/schools/${SUBSTITUTIONS_SCHOOL_ID}/absences/${absenceId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok() && res.status() !== 404) {
    // eslint-disable-next-line no-console
    console.warn(
      `[substitutions] cancelAbsence soft-failed (${res.status()}); continuing`,
    );
  }
}

/**
 * Compute the YYYY-MM-DD string for the next MONDAY at-or-after the
 * given anchor date (defaults to today). Used to align test absences
 * with the seedTimetableRun fixture's MONDAY/period-1 lesson so the
 * absence-expansion algorithm produces exactly one substitution row.
 */
export function nextMondayISODate(anchor: Date = new Date()): string {
  const d = new Date(anchor);
  // getDay(): 0=Sun, 1=Mon, …, 6=Sat. We want the upcoming Monday; if
  // today is Monday, use today (zero-day offset).
  const jsDay = d.getDay();
  const offset = jsDay === 1 ? 0 : (8 - jsDay) % 7;
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}
