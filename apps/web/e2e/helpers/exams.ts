/**
 * Exams E2E helpers — #82.
 *
 * The exams API ships full CRUD (POST/GET/DELETE), so cleanup goes
 * through the REST endpoint. Companion helper to `helpers/homework.ts`
 * — kept separate so the two PRs landing in #82 don't conflict on
 * helper-file edits while in flight (PR #99 ships homework.ts; this
 * branch ships exams.ts).
 */
import { type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
import { SEED_SCHOOL_UUID } from '../fixtures/seed-uuids';

export const EXAMS_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const EXAMS_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;

/**
 * Prefix every E2E-generated exam title with this string so the
 * cleanup sweep can find them. Two parallel specs CAN safely use the
 * same prefix — DELETE is idempotent and per-row.
 */
export const EXAMS_TITLE_PREFIX = 'E2E-EX-';

/** Seed class IDs the cleanup sweep iterates over — the exams API's
 *  GET endpoint returns [] without a class/classSubject filter
 *  (exam.controller.ts findAll), so we have to scope each sweep call.
 *  Update this list if a future spec writes Exam rows under a
 *  different class.
 */
export const EXAMS_SWEEP_CLASS_IDS = [
  'seed-class-1a',
  'seed-class-1b',
];

/**
 * Sweep all Exam rows on the seed school whose title starts with the
 * supplied prefix. Iterates over EXAMS_SWEEP_CLASS_IDS because the GET
 * endpoint requires a classId or classSubjectId filter (returns [] with
 * no filter — see exam.controller.ts findAll). Best-effort: 404 per row
 * is fine (parallel sweep may have already deleted it).
 */
export async function cleanupE2EExams(
  request: APIRequestContext,
  prefix: string = EXAMS_TITLE_PREFIX,
): Promise<void> {
  const token = await getAdminToken(request);
  const toDelete: Array<{ id: string; title: string }> = [];
  for (const classId of EXAMS_SWEEP_CLASS_IDS) {
    const listRes = await request.get(
      `${EXAMS_API}/schools/${EXAMS_SCHOOL_ID}/exams?classId=${encodeURIComponent(classId)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!listRes.ok()) continue;
    const list = (await listRes.json()) as Array<{ id: string; title: string }>;
    toDelete.push(...list.filter((ex) => ex.title.startsWith(prefix)));
  }
  await Promise.all(
    toDelete.map((ex) =>
      request
        .delete(`${EXAMS_API}/schools/${EXAMS_SCHOOL_ID}/exams/${ex.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .catch(() => undefined),
    ),
  );
}

/**
 * YYYY-MM-DD for `daysFromNow` from today. The ExamDialog requires
 * `date >= today` (ExamDialog.tsx:69). Default `daysFromNow=2` so
 * back-to-back tests don't both pick "tomorrow" and trip an unrelated
 * homework spec's tomorrow-due-date.
 */
export function isoDaysFromNow(daysFromNow: number = 2): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
