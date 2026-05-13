/**
 * Classbook E2E helpers — #81.
 *
 * The classbook surface is anchored on a `TimetableLesson` ID: clicking a
 * timetable cell navigates to `/classbook/<timetableLessonId>` and the
 * backend resolves it to (or creates) a `ClassBookEntry`. To test the
 * surface deterministically we need a stable lesson ID from the seed.
 *
 * `getSeedClassbookLesson()` performs a DB lookup via the Prisma client
 * the API ships with (same pattern as `fixtures/orphan-year.ts`) and
 * returns the FIRST 1A Monday lesson — that row is created by
 * `apps/api/prisma/seed.ts` and is therefore reproducible across runs.
 *
 * Cleanup helpers:
 *   - `resetAttendanceForEntry(request, schoolId, entryId)` calls the
 *     `POST /attendance/all-present` endpoint to put the shared seed
 *     entry back into a known-good state after each test.
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
import { SEED_SCHOOL_UUID } from '../fixtures/seed-uuids';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, '../../../../.env') });

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { adapter?: unknown }) => {
    timetableLesson: {
      findFirst: (args: {
        where: Record<string, unknown>;
        orderBy?: Record<string, 'asc' | 'desc'>;
        select?: Record<string, true>;
      }) => Promise<{ id: string } | null>;
    };
    $disconnect: () => Promise<void>;
  };
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

export const CLASSBOOK_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const CLASSBOOK_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;

/**
 * Find the first MONDAY period-1 lesson for class 1A in the seed timetable.
 *
 * This is the lesson that `apps/api/prisma/seed.ts` creates as part of the
 * baseline schedule (Max Mustermann teaches Deutsch). Stable across runs
 * because the seed is deterministic.
 */
export async function getSeedClassbookLesson(): Promise<{ id: string }> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('getSeedClassbookLesson: DATABASE_URL is not set');
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  try {
    const lesson = await prisma.timetableLesson.findFirst({
      where: { dayOfWeek: 'MONDAY', periodNumber: 1 },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
    if (!lesson) {
      throw new Error(
        'Seed lookup failed — no MONDAY period-1 lesson. Run `pnpm dev:up` to re-seed.',
      );
    }
    return lesson;
  } finally {
    await prisma.$disconnect();
  }
}

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
