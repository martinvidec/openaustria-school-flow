/**
 * Quick task 260425-u72 — fixture for the admin timetable-edit DnD regression spec.
 *
 * Seeds the MINIMUM data the timetable-edit page needs to render exactly one
 * draggable lesson on top of an otherwise empty grid:
 *   - one TimetableRun (status COMPLETED, isActive true) for the seed school
 *   - one TimetableLesson at (MONDAY, period 1) bound to:
 *       * the FIRST ClassSubject of seed-class-1a (deterministic, createdAt asc)
 *       * the FIRST Teacher of the seed school (deterministic, createdAt asc)
 *       * the FIRST Room of the seed school (deterministic, createdAt asc)
 *
 * Why exactly one lesson: the spec needs a single draggable to grab and many
 * empty cells to drop into. Multiple lessons would risk teacher/room
 * uniqueness collisions on drop targets and add no coverage for the three
 * regression FIXes from commit de9ee2b.
 *
 * Why Prisma-direct (not solver-trigger): the standard seed has zero
 * TimetableRun rows, the timetable-edit page short-circuits to the
 * "Kein Stundenplan vorhanden" empty state when lessons.length === 0, and
 * there is no HTTP path that creates a deterministic single-lesson run
 * (StartSolveDto only takes constraint weights). Triggering the solver in
 * a test would also be flaky (5–30s) and non-deterministic on lesson
 * placement. Direct insert is the only path that yields a stable,
 * deterministic, fast fixture.
 *
 * Module-loading pattern is copied verbatim from `orphan-year.ts` —
 * `createRequire` to bridge the SWC-emitted CJS Prisma 7 client into the ESM
 * Playwright runner, plus belt-and-braces dotenv loading the repo-root .env
 * (Playwright workers run with CWD=apps/web).
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// Belt-and-braces dotenv. `import 'dotenv/config'` above loads from CWD (fine
// when the runner is invoked from the repo root). Playwright workers run with
// CWD=apps/web however, so we ALSO load the repo-root .env via an explicit
// path resolved relative to this file. First loader wins — repeated loads are
// safe no-ops.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, '../../../../.env') });

const require = createRequire(import.meta.url);

// Prisma 7 driver-adapter pattern (see orphan-year.ts for migration notes).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { adapter?: unknown }) => {
    classSubject: {
      findFirst: (args: {
        where: Record<string, unknown>;
        orderBy?: Record<string, unknown>;
        select?: Record<string, unknown>;
      }) => Promise<
        | {
            id: string;
            subjectId: string;
            classId: string;
            subject: { id: string; shortName: string };
          }
        | null
      >;
    };
    teacher: {
      findFirst: (args: {
        where: Record<string, unknown>;
        orderBy?: Record<string, unknown>;
      }) => Promise<{ id: string } | null>;
    };
    room: {
      findFirst: (args: {
        where: Record<string, unknown>;
        orderBy?: Record<string, unknown>;
      }) => Promise<{ id: string } | null>;
    };
    timetableRun: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      deleteMany: (args: { where: { id: string } }) => Promise<unknown>;
    };
    timetableLesson: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
    };
    $disconnect: () => Promise<void>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

export interface TimetableRunFixture {
  runId: string;
  /** The lesson seeded at (MONDAY, period 1) for class 1A. */
  lessonId: string;
  /** Echoed back for spec ergonomics ('seed-class-1a'). */
  classId: string;
  sourceDay: 'MONDAY';
  sourcePeriod: 1;
  classSubjectId: string;
  teacherId: string;
  roomId: string;
  /**
   * Subject.shortName for the seeded ClassSubject. The timetable-view API
   * surfaces this verbatim as TimetableViewLesson.subjectAbbreviation
   * (apps/api/src/modules/timetable/timetable.service.ts:447), which is the
   * visible label inside the rendered TimetableCell. The spec uses this to
   * locate the source lesson in the grid before drag start (no other stable
   * selector exists on the lesson cell prior to dragging).
   */
  subjectAbbreviation: string;
}

/**
 * Seed exactly one TimetableRun (status COMPLETED, isActive true) and exactly
 * one TimetableLesson at (MONDAY, period 1) for class 1A in the seed school.
 *
 * Picks the FIRST classSubject for class 1A and the FIRST Teacher + FIRST
 * Room of the school. All lookups are deterministic via createdAt asc.
 */
export async function seedTimetableRun(schoolId: string): Promise<TimetableRunFixture> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    // 1. ClassSubject for seed-class-1a — deterministic FIRST entry by
    //    createdAt asc, joined with Subject for the shortName the timetable
    //    view surfaces as `subjectAbbreviation`.
    const classSubject = await prisma.classSubject.findFirst({
      where: { classId: 'seed-class-1a' },
      orderBy: { id: 'asc' },
      select: {
        id: true,
        classId: true,
        subjectId: true,
        subject: { select: { id: true, shortName: true } },
      },
    });
    if (!classSubject) {
      throw new Error(
        'seed-class-1a has no ClassSubject — re-run `pnpm --filter @schoolflow/api prisma:seed`',
      );
    }

    // 2. Teacher — TimetableLesson.teacherId references Teacher.id directly
    //    (NOT User.id). Pick the FIRST teacher for this school.
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'asc' },
    });
    if (!teacher) {
      throw new Error(
        `No Teacher found for schoolId=${schoolId} — re-run prisma:seed`,
      );
    }

    // 3. Room — FIRST room for this school.
    const room = await prisma.room.findFirst({
      where: { schoolId },
      orderBy: { createdAt: 'asc' },
    });
    if (!room) {
      throw new Error(
        `No Room found for schoolId=${schoolId} — re-run prisma:seed (Phase 03 should have created at least one room)`,
      );
    }

    // 4. TimetableRun — status COMPLETED so the timetable-view query treats
    //    it as the active run. isActive=true so useTimetableView picks it up
    //    as the canonical run for the school.
    //    Note: the SolveStatus enum value is COMPLETED (schema.prisma:689),
    //    NOT "COMPLETE" — the plan's literal was wrong; corrected here.
    const run = await prisma.timetableRun.create({
      data: {
        schoolId,
        status: 'COMPLETED',
        isActive: true,
        maxSolveSeconds: 300,
        abWeekEnabled: false,
        hardScore: 0,
        softScore: 0,
        elapsedSeconds: 1,
      },
    });

    // 5. TimetableLesson — exactly one, at (MONDAY, period 1). period 1 is
    //    a non-break period (seed periods 3 + 7 are breaks).
    const lesson = await prisma.timetableLesson.create({
      data: {
        runId: run.id,
        classSubjectId: classSubject.id,
        teacherId: teacher.id,
        roomId: room.id,
        dayOfWeek: 'MONDAY',
        periodNumber: 1,
        weekType: 'BOTH',
      },
    });

    return {
      runId: run.id,
      lessonId: lesson.id,
      classId: classSubject.classId,
      sourceDay: 'MONDAY',
      sourcePeriod: 1,
      classSubjectId: classSubject.id,
      teacherId: teacher.id,
      roomId: room.id,
      subjectAbbreviation: classSubject.subject.shortName,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Cascade-delete the seeded TimetableRun. TimetableLesson rows cascade via
 * onDelete: Cascade on the runId FK (schema.prisma:746).
 *
 * Best-effort: swallows errors so a half-applied fixture from a previously
 * failed test cannot block the next test's setup. Mirrors the cleanup
 * ergonomics of orphan-year.ts.
 */
export async function cleanupTimetableRun(fixture: TimetableRunFixture): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    await prisma.timetableRun.deleteMany({ where: { id: fixture.runId } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[timetable-run fixture] cleanup failed for runId=${fixture.runId}:`,
      err,
    );
  } finally {
    await prisma.$disconnect();
  }
}
