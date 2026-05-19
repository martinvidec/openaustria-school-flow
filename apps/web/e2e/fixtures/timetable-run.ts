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

import { acquireAdvisoryLock, type AdvisoryLock } from '../helpers/advisory-lock';
import {
  SEED_TEACHER_2_UUID,
  SEED_TEACHER_KC_LEHRER_UUID,
} from './seed-uuids';

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
      deleteMany: (args: { where: { id: string } }) => Promise<unknown>;
    };
    timetableLessonEdit: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; createdAt: Date }>;
      deleteMany: (args: { where: { id: string } }) => Promise<unknown>;
    };
    teacherAbsence: {
      deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>;
    };
    handoverNote: {
      deleteMany: (args: { where: Record<string, unknown> }) => Promise<unknown>;
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
  /**
   * INTERNAL — Issue #112 Phase 2 (refactored in #117). The advisory-lock
   * handle covering the active-TimetableRun-singleton race for this school.
   * Held across the ENTIRE test lifecycle (beforeEach + test body +
   * afterEach) so a parallel spec on the same schoolId blocks until
   * `cleanupTimetableRun()` calls `_lock.release()`.
   *
   * Implementation moved into `helpers/advisory-lock.ts` so the
   * mechanic can be reused by CalendarToken / TimeGrid / Classbook
   * waves without duplicating the connection-lifecycle code.
   */
  _lock: AdvisoryLock;
}

/**
 * Resource-key namespace for the per-school active-TimetableRun lock.
 * Kept colocated with `seedTimetableRun` so future callers / readers
 * can see the exact key shape this fixture uses. Different namespaces
 * MUST NOT collide; we prefix every resource type explicitly
 * (`active-timetable-run:`, `calendar-token:…`, …).
 */
function timetableRunLockKey(schoolId: string): string {
  return `active-timetable-run:${schoolId}`;
}

/**
 * Options for `seedTimetableRun`.
 *
 * Issue #60: when `active: false`, the run is created with isActive=false
 * so a spec can drive the Aktivieren-button flow on /admin/solver. The
 * default stays true to preserve the contract every existing spec relies
 * on.
 */
export interface SeedTimetableRunOptions {
  /** Default true — passes the run straight into "active" state. */
  active?: boolean;
}

/**
 * Seed exactly one TimetableRun (status COMPLETED) and exactly one
 * TimetableLesson at (MONDAY, period 1) for class 1A in the seed school.
 *
 * Picks the FIRST classSubject for class 1A and the FIRST Teacher + FIRST
 * Room of the school. All lookups are deterministic via createdAt asc.
 */
export async function seedTimetableRun(
  schoolId: string,
  options: SeedTimetableRunOptions = {},
): Promise<TimetableRunFixture> {
  const { active = true } = options;

  // ── Issue #112 Phase 2 (refactored #117) — acquire per-school lock ─
  // Held until `cleanupTimetableRun()` calls release() — covers the
  // ENTIRE test lifecycle (seed → test body → cleanup), so a parallel
  // spec on the same schoolId blocks here until we release.
  //
  // Why this addresses the active-TimetableRun-singleton race:
  // before this change, two parallel beforeEach calls could both
  // create active runs within ms of each other; the backend's
  // `findFirst({ schoolId, isActive: true }, orderBy createdAt desc)`
  // returns the LATEST, which is whichever beforeEach committed last
  // — so Spec A could see Spec B's lessons mid-test. Serializing the
  // seed-through-cleanup window eliminates the overlap entirely.
  const lock = await acquireAdvisoryLock(timetableRunLockKey(schoolId));
  // Reuse the lock's held Prisma session for fixture queries so the
  // lock survives ALL of them. A fresh client would not see the lock
  // and a parallel spec could squeeze a write in between our queries.
  const prisma = lock._client as InstanceType<typeof PrismaClient>;

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
        isActive: active,
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
      _lock: lock,
    };
  } catch (err) {
    // If seeding fails, release the lock immediately so we don't leak
    // a connection AND don't block parallel specs.
    await lock.release();
    throw err;
  }
  // NOTE: no `finally { lock.release() }` here — the lock must survive
  // the seed call so that `cleanupTimetableRun()` releases it AFTER
  // the test body has run. See `_lock` JSDoc on the fixture interface.
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
  // Reuse the held Prisma client so the advisory lock stays alive
  // through cleanup queries — a fresh client wouldn't see the lock
  // and pg_advisory_unlock(N) would no-op + warn on release.
  const prisma = fixture._lock._client as InstanceType<typeof PrismaClient>;
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
    // ── Issue #112 Phase 2 (refactored #117) — release the lock ──
    // The pg_advisory_unlock + $disconnect run on the SAME session
    // that acquired the lock — encapsulated in `release()`. Idempotent
    // and best-effort: errors are logged inside the helper but never
    // thrown, so cleanup always completes.
    await fixture._lock.release();
  }
}

// ---------------------------------------------------------------------------
// Second-teacher lesson extension (Issue #85, SUB-LEHRER-INCOMING)
// ---------------------------------------------------------------------------

export interface SecondTeacherLessonFixture {
  /** Echoed back so callers can scope downstream cleanups. */
  runId: string;
  lessonId: string;
  /** Anna Lehrerin (`SEED_TEACHER_2_UUID`). */
  teacherId: string;
  /** Display name in "{firstName} {lastName}" order. */
  teacherFullName: string;
  /** Always MONDAY for now — paired with `seedTimetableRun`'s MONDAY/period-1. */
  dayOfWeek: 'MONDAY';
  /** Always 2 — different from `seedTimetableRun`'s period-1 so kc-lehrer is free to substitute. */
  periodNumber: 2;
}

/**
 * Add a SECOND TimetableLesson to an existing fixture's TimetableRun,
 * taught by Anna Lehrerin (`SEED_TEACHER_2_UUID`) at MONDAY/period-2.
 *
 * Why a second lesson rather than a second run: keeping a single
 * TimetableRun avoids the "multiple active runs" tie-breaker in
 * `TimetableService.getView` and matches the per-school singleton
 * invariant the production code enforces.
 *
 * Why MONDAY/period-2: paired with the existing fixture lesson at
 * MONDAY/period-1 (kc-lehrer). At period-2 kc-lehrer has no lesson,
 * so when Anna is absent the assign-substitute pre-check
 * (`substitution.service.ts:91-108` Pitfall-2 guard) finds kc-lehrer
 * free and accepts the OFFER. At a colliding period the assign would
 * 409.
 *
 * Cleanup: piggy-backs on `cleanupTimetableRun` — the lesson is
 * cascade-deleted via runId FK when the run is dropped. No bespoke
 * cleanup needed unless an OFFERED Substitution survived
 * (cancelAbsenceViaAPI deletes PENDING only). The companion
 * `purgeAbsencesViaPrisma` in `helpers/substitutions.ts` handles that.
 */
export async function seedSecondTeacherLesson(
  parent: TimetableRunFixture,
): Promise<SecondTeacherLessonFixture> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    const teacher = await prisma.teacher.findFirst({
      where: { schoolId: parent.schoolId, id: SEED_TEACHER_2_UUID },
      include: { person: true },
    });
    if (!teacher) {
      throw new Error(
        `Teacher ${SEED_TEACHER_2_UUID} (Anna Lehrerin) not found — re-run prisma:seed`,
      );
    }
    const teacherFullName = teacher.person
      ? `${teacher.person.firstName} ${teacher.person.lastName}`
      : teacher.id;

    const lesson = await prisma.timetableLesson.create({
      data: {
        runId: parent.runId,
        classSubjectId: parent.classSubjectId,
        teacherId: teacher.id,
        roomId: parent.roomId,
        dayOfWeek: 'MONDAY',
        periodNumber: 2,
        weekType: 'BOTH',
      },
    });

    return {
      runId: parent.runId,
      lessonId: lesson.id,
      teacherId: teacher.id,
      teacherFullName,
      dayOfWeek: 'MONDAY',
      periodNumber: 2,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Pre-test sweep for stale handover notes left behind by previously
 * crashed or interrupted `substitutions-handover.spec.ts` runs.
 *
 * Why this is needed even though afterEach calls `cancelAbsenceViaAPI`:
 *   - `cancelAbsenceViaAPI` only marks the absence CANCELLED and
 *     deletes PENDING substitutions for THAT specific absenceId. If a
 *     previous run died between save-note and afterEach (CI timeout,
 *     ctrl-C, OOM kill), the absence stays ACTIVE and the note stays
 *     in DB forever.
 *   - On the next run, `/teacher/substitutions` Section 2 renders BOTH
 *     the stale absence AND the new one, both with "Notiz bearbeiten"
 *     buttons. `.first()` then picks the stale row and the assertion
 *     `toHaveValue(noteContent)` reads the OLD timestamp content —
 *     observed failure on parallel run 2026-05-17.
 *
 * Scoped to the `E2E-SUB-HANDOVER-` content prefix so sibling specs
 * that write handover notes (none today, but defensive) and the
 * production seed data are untouched. Handover notes cascade-delete
 * their attachments via the `HandoverAttachment.handoverNoteId`
 * onDelete: Cascade FK, so attachment rows + on-disk files are
 * collected by `HandoverService.deleteNote` semantics — but here we
 * skip the on-disk unlink because (a) the file path lives only in the
 * Node API service and (b) orphan attachment files in `uploads/` are
 * harmless test residue, mopped up by the standard
 * `pnpm db:e2e:reset` flow.
 */
export async function purgeStaleE2EHandoverNotes(): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    await prisma.handoverNote.deleteMany({
      where: { content: { startsWith: 'E2E-SUB-HANDOVER-' } },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[timetable-run fixture] purgeStaleE2EHandoverNotes failed:', err);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Hard-delete a TeacherAbsence (cascades through Substitution and
 * HandoverNote). Use this when a spec has assigned a substitute and
 * the substitution is OFFERED/CONFIRMED — the public `cancelAbsence`
 * endpoint only marks the absence as CANCELLED and only deletes
 * PENDING substitutions, leaving OFFERED rows in the DB and tripping
 * subsequent spec runs.
 *
 * Idempotent: a no-op if the absence is already gone.
 */
export async function purgeAbsenceViaPrisma(absenceId: string): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    await prisma.teacherAbsence.deleteMany({ where: { id: absenceId } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[timetable-run fixture] purgeAbsenceViaPrisma failed for absenceId=${absenceId}:`,
      err,
    );
  } finally {
    await prisma.$disconnect();
  }
}

export interface TimetableEditFixture {
  /** TimetableLessonEdit row id — used by cleanup to scope the delete. */
  editId: string;
  /** ISO-string of `created_at` so the spec can render the same Berlin-local
   *  "dd.MM.yyyy HH:mm" string the EditHistoryPanel produces via date-fns. */
  createdAtISO: string;
}

/**
 * Seed a single TimetableLessonEdit row of type "move" against an existing
 * TimetableRun + TimetableLesson (use seedTimetableRun() first). The
 * EditHistoryPanel renders the row as:
 *
 *   "${prevDay} ${prevPeriod}. Std. -> ${newDay} ${newPeriod}. Std."
 *
 * (see apps/web/src/components/timetable/EditHistoryPanel.tsx:100). The
 * action badge label is "Verschoben" for `editAction = 'move'` per
 * ACTION_LABELS in the same file.
 *
 * Why Prisma-direct: the backend exposes a PATCH lesson-move endpoint
 * (timetable.controller.ts:184), but driving an actual move via API would
 * require correct CSRF/auth headers AND would mutate the real lesson grid
 * — a wider blast radius than a single edit-history row needs. The
 * `TimetableLessonEdit` row is a pure audit-log entry with no FK
 * cascades back to the lesson it references, so a direct insert is
 * deterministic and self-contained.
 *
 * Fields:
 * - lessonId / runId — passed in from a seedTimetableRun() fixture
 * - editedBy — UUID-shaped string; the page doesn't require a real
 *   User row (no FK) and only renders `editedByName` if present in the
 *   DTO, which the backend leaves undefined.
 * - previousState / newState — minimal {dayOfWeek, periodNumber} so the
 *   description renderer at EditHistoryPanel.tsx:101 has something to
 *   format. The spec asserts on the resulting "MONDAY 1. Std. -> TUESDAY 2. Std."
 *   string.
 */
export async function seedTimetableEdit(
  runId: string,
  lessonId: string,
): Promise<TimetableEditFixture> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    const edit = await prisma.timetableLessonEdit.create({
      data: {
        runId,
        lessonId,
        editedBy: '00000000-0000-4000-8000-00000000e2e1',
        editAction: 'move',
        previousState: { dayOfWeek: 'MONDAY', periodNumber: 1 },
        newState: { dayOfWeek: 'TUESDAY', periodNumber: 2 },
      },
    });
    return {
      editId: edit.id,
      createdAtISO: edit.createdAt.toISOString(),
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Hard-delete a single TimetableLessonEdit row. The TimetableRun cleanup
 * does NOT cascade to TimetableLessonEdit (the FK on `run_id` has no
 * onDelete: Cascade in schema.prisma:799), so specs MUST clean up their
 * own edit rows or they accumulate on the seed school's runs and skew
 * subsequent specs' history-length assertions.
 */
export async function cleanupTimetableEdit(
  fixture: TimetableEditFixture,
): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    await prisma.timetableLessonEdit.deleteMany({ where: { id: fixture.editId } });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[timetable-run fixture] cleanupTimetableEdit failed for editId=${fixture.editId}:`,
      err,
    );
  } finally {
    await prisma.$disconnect();
  }
}
