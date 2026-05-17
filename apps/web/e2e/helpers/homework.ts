/**
 * Homework / Exams E2E helpers — #82.
 *
 * The homework API ships full CRUD (POST/GET/DELETE) so cleanup goes
 * through the REST endpoint — no Prisma-direct bridge needed (the
 * excuses helper has the Prisma bridge for that gap).
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
import { SEED_SCHOOL_UUID } from '../fixtures/seed-uuids';

export const HOMEWORK_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const HOMEWORK_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;

/**
 * Prefix every E2E-generated homework title with this string so the
 * cleanup sweep can find them. Two parallel specs CAN safely use the
 * same prefix — DELETE is idempotent and per-row.
 */
export const HOMEWORK_TITLE_PREFIX = 'E2E-HW-';

/**
 * Sweep all Homework rows on the seed school whose title starts with
 * the supplied prefix. Best-effort: 404 per row is fine (parallel sweep
 * may have already deleted it).
 */
export async function cleanupE2EHomework(
  request: APIRequestContext,
  prefix: string = HOMEWORK_TITLE_PREFIX,
): Promise<void> {
  const token = await getAdminToken(request);
  // GET /homework returns all homework for the school (filtered server-side
  // by RBAC; admin gets the full list).
  const listRes = await request.get(
    `${HOMEWORK_API}/schools/${HOMEWORK_SCHOOL_ID}/homework`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok()) return;
  const list = (await listRes.json()) as Array<{ id: string; title: string }>;
  await Promise.all(
    list
      .filter((hw) => hw.title.startsWith(prefix))
      .map((hw) =>
        request
          .delete(
            `${HOMEWORK_API}/schools/${HOMEWORK_SCHOOL_ID}/homework/${hw.id}`,
            { headers: { Authorization: `Bearer ${token}` } },
          )
          .catch(() => undefined),
      ),
  );
}

export interface CreateHomeworkInput {
  title: string;
  description?: string;
  dueDate: string; // YYYY-MM-DD
  classSubjectId: string;
}

export interface CreatedHomework {
  id: string;
}

/**
 * Seed a Homework row via the REST endpoint (admin auth). Returns the
 * new homework id. Used by specs that need the cell-badge surface
 * state without driving the HomeworkDialog UI.
 */
export async function createHomeworkViaAPI(
  request: APIRequestContext,
  input: CreateHomeworkInput,
): Promise<CreatedHomework> {
  const token = await getAdminToken(request);
  const res = await request.post(
    `${HOMEWORK_API}/schools/${HOMEWORK_SCHOOL_ID}/homework`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: input,
    },
  );
  expect(
    res.ok(),
    `POST /homework seed → ${res.status()} ${await res.text()}`,
  ).toBeTruthy();
  return (await res.json()) as CreatedHomework;
}

/**
 * YYYY-MM-DD for `daysFromNow` from today. HomeworkDialog requires
 * `dueDate >= today` (HomeworkDialog.tsx:54) — default `daysFromNow=1`
 * gives the form a tomorrow due-date which always passes.
 */
export function isoDaysFromNow(daysFromNow: number = 1): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
