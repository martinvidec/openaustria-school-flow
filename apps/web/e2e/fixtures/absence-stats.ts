/**
 * Fixture for the absence-statistics E2E spec — Issue #87.
 *
 * Seeds one ClassBookEntry on a deterministic date with three
 * AttendanceRecord rows that exercise each of the four
 * `AttendanceStatus` values that the statistics aggregator surfaces
 * differently:
 *
 *   - Lisa Huber   → PRESENT                  → 0.0%  Fehlquote
 *   - Felix Bauer  → ABSENT                   → 100.0% Fehlquote (unentschuldigt)
 *   - Sophie Wagner→ LATE, lateMinutes=20     → counted as 1 Verspaetet +
 *                                                 1 Verspaetet>15Min,
 *                                                 100.0% Fehlquote
 *                                                 (D-04 Schulunterrichtsgesetz)
 *
 * Why Prisma-direct: the backend has POST/PATCH endpoints for
 * AttendanceRecord but the path to create a ClassBookEntry from scratch
 * requires resolving a TimetableLesson first (`/classbook/by-timetable-
 * lesson/:id` upserts the entry). Driving that through the live API
 * would require seeding a TimetableLesson with a matching date, then
 * resolving the entry, then POSTing attendance per student — three
 * round-trips on every test setup. Direct insert is deterministic and
 * self-contained, and the data shape required by `statistics.service.ts`
 * is just (classSubjectId, date, periodNumber, weekType, teacherId,
 * schoolId) for the entry plus (classBookEntryId, studentId, status,
 * lateMinutes) for each record.
 *
 * Date isolation: the fixture writes to a single calendar date that the
 * spec then pins via the date-range filter inputs on /statistics/absence.
 * This way the test asserts on exactly its own three rows even if other
 * specs leave attendance noise in class 1A on different dates.
 *
 * Module-loading pattern: same `createRequire` + dotenv belt-and-braces
 * bridge that `fixtures/throwaway-school.ts` uses to load the API's
 * SWC-emitted CJS Prisma client into the ESM Playwright runner.
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, '../../../../.env') });

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { adapter?: unknown }) => {
    classSubject: {
      findFirst: (args: {
        where: Record<string, unknown>;
        orderBy?: Record<string, unknown>;
        select?: Record<string, unknown>;
      }) => Promise<{ id: string; subjectId: string } | null>;
    };
    student: {
      findMany: (args: {
        where: Record<string, unknown>;
        include?: Record<string, unknown>;
        orderBy?: Record<string, unknown>;
      }) => Promise<
        Array<{
          id: string;
          person?: { firstName: string; lastName: string } | null;
        }>
      >;
    };
    classBookEntry: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      deleteMany: (args: { where: { id: string } }) => Promise<unknown>;
    };
    attendanceRecord: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
    $disconnect: () => Promise<void>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

import { SEED_TEACHER_KC_LEHRER_UUID } from './seed-uuids';

/**
 * Fixed date used by both the fixture and the spec. Must lie inside
 * an Austrian school semester so the page's default date-range
 * doesn't filter our entry out before the spec overrides the inputs.
 *
 * 2026-03-15 (Sunday, semester 2 = Feb-Jun 2026). Sunday is fine for
 * the data model — `ClassBookEntry.dayOfWeek` is a separate enum
 * from the calendar date and the statistics aggregator does not
 * cross-check the two. Picking a Sunday keeps us safely outside any
 * date that a "today"-anchored spec might compute.
 */
export const STATS_FIXTURE_DATE = '2026-03-15';

/** Spec sets this period on the fixture to avoid colliding with the
 *  period=1 used by the throwaway timetable stack's singleton lesson. */
export const STATS_FIXTURE_PERIOD = 5;

export interface AbsenceStatsFixture {
  /** The ClassBookEntry row id — used by cleanup to scope the delete. */
  entryId: string;
  /** classSubjectId the entry was bound to (echoed back for assertions). */
  classSubjectId: string;
  /** Resolved student person IDs for the three seeded attendance rows. */
  students: {
    lisaId: string;
    felixId: string;
    sophieId: string;
  };
}

const SEED_CLASS_1A_ID = 'seed-class-1a';

const STUDENT_NAMES = {
  lisa: { firstName: 'Lisa', lastName: 'Huber' },
  felix: { firstName: 'Felix', lastName: 'Bauer' },
  sophie: { firstName: 'Sophie', lastName: 'Wagner' },
} as const;

type PrismaClientShape = InstanceType<typeof PrismaClient>;

/**
 * Resolves student row IDs by firstName+lastName for class 1A. The
 * statistics service joins Student → Person and renders
 * `${firstName} ${lastName}` — we match by the same key.
 */
async function findThreeSeedStudents(
  prisma: PrismaClientShape,
): Promise<AbsenceStatsFixture['students']> {
  const students = await prisma.student.findMany({
    where: { classId: SEED_CLASS_1A_ID, isArchived: false },
    include: { person: true },
  });

  function findId(target: { firstName: string; lastName: string }): string {
    const hit = students.find(
      (s) =>
        s.person?.firstName === target.firstName &&
        s.person?.lastName === target.lastName,
    );
    if (!hit) {
      throw new Error(
        `[absence-stats fixture] seed student ${target.firstName} ${target.lastName} not found in class 1A — re-run prisma:seed`,
      );
    }
    return hit.id;
  }

  return {
    lisaId: findId(STUDENT_NAMES.lisa),
    felixId: findId(STUDENT_NAMES.felix),
    sophieId: findId(STUDENT_NAMES.sophie),
  };
}

/**
 * Seeds one ClassBookEntry on STATS_FIXTURE_DATE/STATS_FIXTURE_PERIOD
 * for the first ClassSubject of class 1A, plus three AttendanceRecord
 * rows (one per Huber/Bauer/Wagner). Returns the fixture handle so
 * `cleanupAbsenceStats()` can hard-delete the entry (cascade removes
 * the attendance records via the AttendanceRecord.classBookEntry FK
 * with onDelete: Cascade, schema.prisma:961).
 *
 * Uniqueness: ClassBookEntry has @@unique([classSubjectId, date,
 * periodNumber, weekType]). Pinning periodNumber = STATS_FIXTURE_PERIOD
 * (5) keeps us clear of the period=1 lesson the throwaway timetable
 * stack plants and of any other classbook-related fixture using period=1 or 2.
 */
export async function seedAbsenceStats(
  schoolId: string,
): Promise<AbsenceStatsFixture> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    const classSubject = await prisma.classSubject.findFirst({
      where: { classId: SEED_CLASS_1A_ID },
      orderBy: { id: 'asc' },
      select: { id: true, subjectId: true },
    });
    if (!classSubject) {
      throw new Error(
        '[absence-stats fixture] seed-class-1a has no ClassSubject — re-run `pnpm --filter @schoolflow/api prisma:seed`',
      );
    }

    const students = await findThreeSeedStudents(prisma);

    const entry = await prisma.classBookEntry.create({
      data: {
        classSubjectId: classSubject.id,
        dayOfWeek: 'FRIDAY',
        periodNumber: STATS_FIXTURE_PERIOD,
        weekType: 'BOTH',
        // Store exactly at UTC midnight so it matches the API's date-filter
        // bounds. The statistics service parses `startDate`/`endDate` query
        // params with `new Date('2026-03-15')` (statistics.service.ts:53)
        // which the JS spec resolves to midnight UTC for an
        // ISO-date-only string. A non-midnight value would silently fall
        // OUT of `gte/lte` when the spec sets startDate == endDate ==
        // fixture date (observed 2026-05-18: storing 12:00:00 produced
        // an empty result set despite the entry existing).
        date: new Date(`${STATS_FIXTURE_DATE}T00:00:00Z`),
        teacherId: SEED_TEACHER_KC_LEHRER_UUID,
        schoolId,
        thema: null,
        lehrstoff: null,
        hausaufgabe: null,
      },
    });

    await prisma.attendanceRecord.create({
      data: {
        classBookEntryId: entry.id,
        studentId: students.lisaId,
        status: 'PRESENT',
        recordedBy: SEED_TEACHER_KC_LEHRER_UUID,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        classBookEntryId: entry.id,
        studentId: students.felixId,
        status: 'ABSENT',
        recordedBy: SEED_TEACHER_KC_LEHRER_UUID,
      },
    });
    await prisma.attendanceRecord.create({
      data: {
        classBookEntryId: entry.id,
        studentId: students.sophieId,
        status: 'LATE',
        lateMinutes: 20,
        recordedBy: SEED_TEACHER_KC_LEHRER_UUID,
      },
    });

    return {
      entryId: entry.id,
      classSubjectId: classSubject.id,
      students,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Hard-delete the ClassBookEntry. AttendanceRecord rows cascade via
 * AttendanceRecord.classBookEntry { onDelete: Cascade } (schema.prisma:961).
 *
 * Best-effort: swallows errors so a half-applied fixture from a
 * previously killed test can't block the next setup.
 */
export async function cleanupAbsenceStats(
  fixture: AbsenceStatsFixture,
): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    await prisma.classBookEntry.deleteMany({ where: { id: fixture.entryId } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[absence-stats fixture] cleanupAbsenceStats failed for entryId=${fixture.entryId}:`,
      err,
    );
  } finally {
    await prisma.$disconnect();
  }
}
