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

import { SEED_TEACHER_KC_LEHRER_UUID } from './seed-uuids';

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
        include?: Record<string, unknown>;
      }) => Promise<
        | {
            id: string;
            person?: { firstName: string; lastName: string } | null;
          }
        | null
      >;
    };
    schoolDay: {
      findMany: (args: { where: Record<string, unknown> }) => Promise<
        Array<{ dayOfWeek: string; isActive: boolean }>
      >;
      upsert: (args: {
        where: Record<string, unknown>;
        update: Record<string, unknown>;
        create: Record<string, unknown>;
      }) => Promise<unknown>;
      updateMany: (args: {
        where: Record<string, unknown>;
        data: Record<string, unknown>;
      }) => Promise<unknown>;
    };
    room: {
      findFirst: (args: {
        where: Record<string, unknown>;
        orderBy?: Record<string, unknown>;
      }) => Promise<{ id: string } | null>;
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      deleteMany: (args: { where: { id: string } }) => Promise<unknown>;
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
  /** Echoed back so cleanup can scope its updates to the fixture's school. */
  schoolId: string;
  runId: string;
  /** The lesson seeded at (MONDAY, period 1) for class 1A. */
  lessonId: string;
  /** Echoed back for spec ergonomics ('seed-class-1a'). */
  classId: string;
  sourceDay: 'MONDAY';
  sourcePeriod: 1;
  classSubjectId: string;
  teacherId: string;
  /**
   * Display name for the seeded teacher in the format the
   * PerspectiveSelector renders: `${lastName} ${firstName}` (per
   * apps/web/src/hooks/useTimetable.ts:78). The spec uses this to pick
   * the right "Lehrer" option in the perspective dropdown so the
   * timetable view filters down to our seeded lesson.
   *
   * Note: the underlying useClasses bug (missing ?schoolId on
   * /api/v1/classes → Klassen group never rendered) was fixed in commit
   * d76b5a3. The field is retained here because the 260425-u72 DnD spec
   * still drives via the teacher perspective for unrelated reasons (the
   * three FIXes under test are perspective-agnostic, and switching to
   * the class perspective would conflate two regression guards). The
   * Klassen-perspective render is now covered separately in
   * admin-timetable-edit-perspective.spec.ts.
   */
  teacherDisplayName: string;
  roomId: string;
  /**
   * Set when the fixture had to create its own Room because the seed didn't
   * provide one. cleanupTimetableRun() deletes this room as well so the
   * fixture leaves no residue. (Standard prisma:seed creates ZERO Room
   * rows — Phase 03 rooms are introduced via the Schuladmin Console UI in
   * the live workflow, not the seed script.)
   */
  fixtureRoomId: string | null;
  /**
   * SchoolDays the fixture had to activate from inactive/missing state. The
   * timetable view filters days by `school.schoolDays where isActive: true`
   * (apps/api/src/modules/timetable/timetable.service.ts:272) — if MON–FRI
   * aren't all active in the test DB, the grid won't render those columns
   * and the spec can't drop into them. The fixture defensively turns on
   * MONDAY–FRIDAY and remembers which it had to flip so cleanup can flip
   * them back. Empty array = nothing changed.
   */
  reactivatedDays: string[];
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
    //    (NOT User.id). Pin to the KC seed teacher (Maria Mueller, the
    //    kc-lehrer Keycloak user, created by prisma:seed) so the spec can
    //    deterministically select "Mueller Maria" in the perspective
    //    selector. The KC teacher is created by every prisma:seed run
    //    with a stable UUID, which avoids the createdAt-asc fragility that
    //    breaks if a developer adds new teachers via the Schuladmin UI.
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId, id: SEED_TEACHER_KC_LEHRER_UUID },
      include: { person: true },
    });
    if (!teacher) {
      throw new Error(
        `Teacher ${SEED_TEACHER_KC_LEHRER_UUID} (kc-lehrer Maria Mueller) not found — re-run prisma:seed`,
      );
    }
    const teacherDisplayName = teacher.person
      ? `${teacher.person.lastName} ${teacher.person.firstName}`
      : teacher.id;

    // 3. Room — always self-provision a NEW fixture room per invocation.
    //    The standard prisma:seed creates ZERO Room rows (rooms are introduced
    //    via the Schuladmin Console UI in the live workflow). The timestamp
    //    + random suffix keeps the @@unique([schoolId, name]) constraint clear
    //    of any future seed-defined rooms.
    //
    //    CRITICAL #33: filter on the fixture name prefix so we never co-opt a
    //    room another spec created (rooms-booking.spec.ts creates
    //    `E2E-ROOM-BOOK01-<ts>` then asserts Monday/period-1 is free).
    //
    //    CRITICAL (FK-cleanup race): we used to `findFirst` an existing
    //    fixture-named room and reuse it across parallel fixture invocations.
    //    That created a cleanup race — when spec-A finished first and
    //    cleanupTimetableRun deleted the shared room, spec-B's still-live
    //    TimetableLesson held an FK reference and Postgres rejected the
    //    DELETE with timetable_lessons_room_id_fkey. Each fixture now owns
    //    its own room, so the cascade-delete of the run frees the FK before
    //    the room delete and no other spec's lesson can hold it.
    const ts = Date.now();
    const rand = Math.random().toString(36).slice(2, 8);
    const room = await prisma.room.create({
      data: {
        schoolId,
        name: `e2e-fixture-room-${ts}-${rand}`,
        roomType: 'KLASSENZIMMER',
        capacity: 30,
        equipment: [],
      },
    });
    const fixtureRoomId: string | null = room.id;

    // 4a. SchoolDays — defensively ensure MON–FRI are active. Test DBs in
    //     this repo have been observed with only MONDAY active (other days
    //     deactivated by an earlier admin-school-settings spec run). The
    //     timetable view filters days by `isActive: true`, so a missing
    //     THURSDAY would mean the grid never renders a THURSDAY column and
    //     the spec couldn't drop a lesson into it. We remember which days
    //     we had to flip so cleanup restores them.
    const targetWeekdays = [
      'MONDAY',
      'TUESDAY',
      'WEDNESDAY',
      'THURSDAY',
      'FRIDAY',
    ] as const;
    const existingDays = await prisma.schoolDay.findMany({
      where: { schoolId, dayOfWeek: { in: targetWeekdays as unknown as string[] } },
    });
    const existingDayMap = new Map(existingDays.map((d) => [d.dayOfWeek, d.isActive]));
    const reactivatedDays: string[] = [];
    for (const day of targetWeekdays) {
      const existing = existingDayMap.get(day);
      if (existing === true) continue; // already active — leave alone
      reactivatedDays.push(day);
      await prisma.schoolDay.upsert({
        where: { schoolId_dayOfWeek: { schoolId, dayOfWeek: day } },
        update: { isActive: true },
        create: { schoolId, dayOfWeek: day, isActive: true },
      });
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
      schoolId,
      runId: run.id,
      lessonId: lesson.id,
      classId: classSubject.classId,
      sourceDay: 'MONDAY',
      sourcePeriod: 1,
      classSubjectId: classSubject.id,
      teacherId: teacher.id,
      teacherDisplayName,
      roomId: room.id,
      fixtureRoomId,
      reactivatedDays,
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
    // Delete the run first so the cascade removes TimetableLesson rows and
    // releases the FK on Room.
    await prisma.timetableRun.deleteMany({ where: { id: fixture.runId } });
    if (fixture.fixtureRoomId) {
      await prisma.room.deleteMany({ where: { id: fixture.fixtureRoomId } });
    }
    // Restore school-day activation state. Days the fixture flipped to
    // active were either inactive or missing originally — both states are
    // semantically equivalent to "not part of the school's working week",
    // so we set them to isActive: false. This avoids polluting the test DB
    // with a five-day week if the developer's environment was three-day.
    if (fixture.reactivatedDays.length > 0) {
      await prisma.schoolDay.updateMany({
        where: {
          schoolId: fixture.schoolId,
          dayOfWeek: { in: fixture.reactivatedDays },
        },
        data: { isActive: false },
      });
    }
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
