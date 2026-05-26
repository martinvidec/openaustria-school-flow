/**
 * Issue #136 — Throwaway-school fixture.
 *
 * Provides per-spec isolation via a freshly-created `School` row + minimal
 * stammdaten (active SchoolYear + optional SchoolClasses) + optional Person
 * rows for the seed Keycloak users so a spec can act as `lehrer`, `eltern`,
 * etc. against the throwaway school instead of writing to the shared
 * SEED_SCHOOL.
 *
 * Why "reuse seed KC users + per-school Person rows" (Option B):
 *   - Avoids the operational cost of provisioning fresh Keycloak users via
 *     the admin REST API per spec (admin token + create + set password +
 *     delete on teardown).
 *   - Leverages #135's CurrentSchoolInterceptor + X-School-Id header:
 *     once a Person row exists for a seed KC user in the throwaway school,
 *     `availableSchools` returns both memberships and the spec switches
 *     context by sending `X-School-Id: <throwawayId>` (browser apiFetch
 *     does this automatically once `setCurrentSchool` is called).
 *   - Schema-safe: #133's `@@unique([keycloakUserId, schoolId])` permits
 *     the same KC user to map to multiple Person rows.
 *
 * Cleanup contract: `prisma.school.delete({ where: { id } })` cascades
 * across every per-school table — verified by the #136 cascade audit that
 * closed the 5 remaining gaps (Homework, Exam, ImportJob, CalendarToken,
 * SisApiKey). The cascade chain reaches Person rows automatically, so the
 * seed Person rows on SEED_SCHOOL are NEVER touched.
 *
 * Prisma 7 + dotenv plumbing: copied from `fixtures/orphan-year.ts` so the
 * Playwright runner picks up `DATABASE_URL` from the repo-root .env even
 * when CWD=apps/web. The PrismaPg adapter is the Prisma 7 successor of the
 * legacy `datasources: { db: { url } }` option (deferred-items §1c, 10.4 D-3).
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SEED_SCHOOL_UUID } from './seed-uuids';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, '../../../../.env') });

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { adapter?: unknown }) => {
    person: {
      findFirst: (args: any) => Promise<any>;
      create: (args: any) => Promise<{ id: string; keycloakUserId: string | null; schoolId: string }>;
    };
    student: {
      create: (args: any) => Promise<{ id: string; personId: string }>;
    };
    classBookEntry: {
      create: (args: any) => Promise<{ id: string }>;
    };
    attendanceRecord: {
      create: (args: any) => Promise<{ id: string }>;
    };
    school: {
      create: (args: any) => Promise<{ id: string; name: string }>;
      delete: (args: any) => Promise<unknown>;
      findUnique: (args: any) => Promise<any>;
    };
    schoolYear: {
      create: (args: any) => Promise<{ id: string }>;
    };
    schoolClass: {
      create: (args: any) => Promise<{ id: string; name: string }>;
    };
    teacher: {
      create: (args: any) => Promise<{ id: string; personId: string }>;
    };
    subject: {
      create: (args: any) => Promise<{ id: string; shortName: string }>;
    };
    classSubject: {
      create: (args: any) => Promise<{ id: string; classId: string; subjectId: string }>;
    };
    room: {
      create: (args: any) => Promise<{ id: string; name: string }>;
    };
    schoolDay: {
      create: (args: any) => Promise<unknown>;
    };
    timeGrid: {
      create: (args: any) => Promise<{ id: string }>;
    };
    timetableRun: {
      create: (args: any) => Promise<{ id: string }>;
      deleteMany: (args: any) => Promise<unknown>;
    };
    timetableLesson: {
      create: (args: any) => Promise<{ id: string; dayOfWeek: string; periodNumber: number }>;
    };
    timetableLessonEdit: {
      create: (args: any) => Promise<{ id: string }>;
      deleteMany: (args: any) => Promise<unknown>;
    };
    $disconnect: () => Promise<void>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

const buildPrisma = () =>
  new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });

/** Maps seed-bound Keycloak roles to Prisma `PersonType` enum values. */
type SeedRole = 'lehrer' | 'schulleitung' | 'schueler' | 'eltern' | 'admin';
const ROLE_TO_PERSON_TYPE: Record<SeedRole, 'TEACHER' | 'STUDENT' | 'PARENT'> = {
  lehrer: 'TEACHER',
  schulleitung: 'TEACHER',
  // Issue #138 — admin gets a TEACHER Person row in the throwaway. Admin's
  // tenant identity (the X-School-Id validation in CurrentSchoolInterceptor)
  // is what we actually need; the PersonType is a schema requirement that
  // doesn't drive any authorization (admin's privileges come from KC roles
  // via CASL, not from Person.personType).
  admin: 'TEACHER',
  schueler: 'STUDENT',
  eltern: 'PARENT',
};

export interface ThrowawaySchoolOptions {
  /** Seed-KC roles that should receive a Person row in the throwaway school. */
  roles?: Partial<Record<SeedRole, boolean>>;
  /** Number of SchoolClasses to seed (default 1). */
  withClasses?: number;
  /**
   * Issue #138 — explicit class names that override the default
   * `${namePrefix}-K{i+1}` generation. Must match `withClasses` in length.
   * Useful for UI specs that select a class by name (PerspectiveSelector
   * shows the name not the id) — passing `['1A']` keeps assertions
   * identical to pre-migration seed-school specs.
   */
  classNames?: string[];
  /** Prefix for the school's name + (default) class names — keeps cross-spec greps trivial. */
  namePrefix?: string;
  /**
   * Issue #137 — opt-in timetable stack for UI specs that need a TimetableRun
   * to render against. Provisions: Teacher row (for `roles.lehrer` Person if
   * present, otherwise a generic fixture-only Person), Subject, ClassSubject
   * (joining Class[0] + Subject + Teacher), Room, TimeGrid with period 1
   * (08:00-08:50), SchoolDays MON-FRI active, TimetableRun (active by
   * default), TimetableLesson at MONDAY/period-1.
   *
   * Issue #138 wave 3 — pass `{ active: false }` to seed a COMPLETED but
   * inactive TimetableRun (covers the activation-recovery flow from #60).
   * The boolean shorthand `true` stays equivalent to `{ active: true }`
   * so existing callers keep working unchanged.
   */
  withTimetableStack?: boolean | { active?: boolean };
  /**
   * Issue #138 — list of students to provision in the throwaway. Each entry
   * creates a Person + Student row enrolled in `classIds[0]`. Names show up
   * verbatim in any UI that lists students (e.g. /statistics/absence).
   * Requires `withClasses >= 1`.
   */
  withStudents?: Array<{ firstName: string; lastName: string }>;
  /**
   * Issue #138 — opt-in ClassBookEntry + AttendanceRecord rows for specs
   * that exercise classbook / attendance / statistics surfaces. References
   * the timetable stack's classSubject + teacher (so requires
   * `withTimetableStack: true`) and a contiguous prefix of `withStudents`
   * (so requires `withStudents.length >= attendance.length`).
   */
  withClassbookEntry?: {
    /** YYYY-MM-DD — the calendar date the ClassBookEntry pins to. */
    date: string;
    /** Period number; must NOT collide with `withTimetableStack`'s period-1 lesson. */
    period?: number;
    attendance: Array<{
      /** Index into `withStudents` — `0` = first student, etc. */
      studentIndex: number;
      status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
      lateMinutes?: number;
    }>;
  };
  /**
   * Issue #138 wave 2 — opt-in TimetableLessonEdit audit-log row attached
   * to the timetable stack's lesson. Single "move" edit row; EditHistoryPanel
   * renders the description as
   *   `${previousState.dayOfWeek} ${previousState.periodNumber}. Std. -> ${newState.dayOfWeek} ${newState.periodNumber}. Std.`
   * Requires `withTimetableStack: true`.
   */
  withTimetableEdit?: {
    previousState: { dayOfWeek: string; periodNumber: number };
    newState: { dayOfWeek: string; periodNumber: number };
  };
  /**
   * Issue #149 (Phase 3.5/1) — opt-in second TimetableLesson taught by a
   * DIFFERENT Teacher at MONDAY/period-2, sharing the timetable stack's
   * ClassSubject + Room + Run. Mirrors the legacy `seedSecondTeacherLesson`
   * companion of `seedTimetableRun` — needed by substitution specs that
   * exercise the assign-substitute flow (one teacher absent, a free second
   * teacher available at a non-colliding period).
   *
   * Requires `withTimetableStack: true`. Cleanup piggy-backs on the run
   * cascade — no extra plumbing required. The second Teacher's Person row
   * is created fresh inside the throwaway school, so the School cascade
   * deletes it on `fixture.cleanup()`.
   */
  withSecondTeacherLesson?: boolean;
}

export interface ThrowawayTimetableStack {
  teacherId: string;
  /**
   * Issue #138 wave 3 — Teacher display name in the format the
   * PerspectiveSelector renders: `${lastName} ${firstName}` (per
   * apps/web/src/hooks/useTimetable.ts:78). Specs use this to pick the
   * right "Lehrer" option from the dropdown without depending on the
   * exact internal id of the throwaway teacher.
   */
  teacherDisplayName: string;
  subjectId: string;
  subjectShortName: string;
  /**
   * Issue #149 — alias of `subjectShortName` matching the legacy
   * `TimetableRunFixture.subjectAbbreviation` field name. The timetable-view
   * API exposes this verbatim as `TimetableViewLesson.subjectAbbreviation`
   * (timetable.service.ts:447) and the visible cell label uses it; the
   * alias smooths the consumer-spec migration in #153 (one fewer rename
   * per spec).
   */
  subjectAbbreviation: string;
  classSubjectId: string;
  roomId: string;
  /**
   * Issue #152 — Room.name as stored in DB. Exposed because UI room
   * pickers (e.g. ClassStammdatenTab Heimraum Select, ClassCreateDialog)
   * render rooms by name not id, so a spec that wants to pick "the
   * fixture room" needs the visible label, not just the FK.
   */
  roomName: string;
  timeGridId: string;
  timetableRunId: string;
  /** True when the seeded TimetableRun is `isActive=true` (the default). */
  timetableRunActive: boolean;
  timetableLessonId: string;
  /** The class the ClassSubject is bound to (always classIds[0] today). */
  classId: string;
  /** MONDAY — exposed for clarity in spec assertions. */
  lessonDayOfWeek: 'MONDAY';
  /** 1 — the seeded lesson's period. */
  lessonPeriodNumber: 1;
}

/**
 * Issue #149 — return shape for the optional second TimetableLesson
 * provisioned by `withSecondTeacherLesson: true`. Mirrors the field set
 * of the legacy `SecondTeacherLessonFixture` so consumer migration in
 * #153 is a flat rename rather than a redesign.
 */
export interface ThrowawaySecondTeacherLesson {
  /** Teacher.id of the second teacher (NOT the timetable stack's primary). */
  teacherId: string;
  /**
   * Display name in `${firstName} ${lastName}` order — matches the legacy
   * `SecondTeacherLessonFixture.teacherFullName`. (Primary teacher exposes
   * `teacherDisplayName` in `${lastName} ${firstName}` order; the two are
   * intentionally different because they're consumed in different UI
   * contexts.)
   */
  teacherFullName: string;
  /** Always MONDAY — paired with the primary lesson at MONDAY/period-1. */
  dayOfWeek: 'MONDAY';
  /** Always 2 — non-colliding with the primary lesson's period-1. */
  periodNumber: 2;
  /** TimetableLesson.id of the second lesson. */
  timetableLessonId: string;
}

export interface ThrowawaySchoolFixture {
  schoolId: string;
  schoolName: string;
  schoolYearId: string;
  classIds: string[];
  /** Person row IDs created for each seed-KC role in the throwaway school. */
  personIds: Partial<Record<SeedRole, string>>;
  /** Keycloak user IDs (the seed-bound `sub` claim values) for each seed role used. */
  keycloakUserIds: Partial<Record<SeedRole, string>>;
  /** Populated when `withTimetableStack: true` was passed. */
  timetable?: ThrowawayTimetableStack;
  /** Issue #149 — Populated when `withSecondTeacherLesson: true` was passed. */
  secondTeacher?: ThrowawaySecondTeacherLesson;
  /** Issue #138 — Student.id values matching the `withStudents` indexes. */
  studentIds: string[];
  /** Issue #138 — Populated when `withClassbookEntry` was passed. */
  classBookEntryId?: string;
  /** Issue #138 wave 2 — Populated when `withTimetableEdit` was passed. */
  timetableEditId?: string;
  cleanup: () => Promise<void>;
}

/**
 * Look up the seed-bound Keycloak user IDs by querying the SEED_SCHOOL
 * Person rows. The seed runner (`apps/api/prisma/seed.ts`) resolves the
 * KC `sub` from Keycloak at seed-time and writes it onto exactly one Person
 * per role on SEED_SCHOOL. This avoids re-implementing the Keycloak
 * admin-token + user-list dance in test code.
 */
async function resolveSeedKeycloakIds(
  prisma: ReturnType<typeof buildPrisma>,
  roles: SeedRole[],
): Promise<Partial<Record<SeedRole, string>>> {
  const out: Partial<Record<SeedRole, string>> = {};
  for (const role of roles) {
    // Lehrer + Schulleitung are both TEACHER personType. Disambiguate by
    // joining through Teacher first (KC lehrer is bound to SEED_TEACHER_KC_LEHRER_UUID)
    // — but easier: each KC role binds to a distinct Person.id (seed-uuids.ts
    // SEED_PERSON_KC_*). Query by `id` for unambiguous resolution.
    const personIdByRole: Record<SeedRole, string> = {
      lehrer: 'd0000000-0000-4000-8000-000000000001',
      schulleitung: 'd0000000-0000-4000-8000-000000000002',
      admin: 'd0000000-0000-4000-8000-000000000003',
      schueler: 'd0000000-0000-4000-8000-000000000004',
      eltern: 'd0000000-0000-4000-8000-000000000005',
    };
    const seedPerson = await prisma.person.findFirst({
      where: { id: personIdByRole[role], schoolId: SEED_SCHOOL_UUID },
      // eslint-disable-next-line @typescript-eslint/naming-convention
      select: { keycloakUserId: true },
    });
    if (!seedPerson?.keycloakUserId) {
      throw new Error(
        `Throwaway-school fixture: SEED_PERSON_KC_${role.toUpperCase()} (${personIdByRole[role]}) has no keycloakUserId. Re-run prisma:seed against a live Keycloak realm.`,
      );
    }
    out[role] = seedPerson.keycloakUserId;
  }
  return out;
}

/**
 * Create a fresh, isolated School with optional Persons for seed-KC roles.
 * Caller MUST invoke the returned `cleanup()` in `afterAll` (or rely on
 * Playwright's auto-cleanup via the fixture object lifecycle).
 */
export async function createThrowawaySchool(
  options: ThrowawaySchoolOptions = {},
): Promise<ThrowawaySchoolFixture> {
  const {
    roles = { lehrer: true },
    withClasses = 1,
    namePrefix = 'E2E-TS',
    withTimetableStack = false,
  } = options;
  // Normalize the boolean | object overload into a single shape downstream.
  const timetableStackConfig: false | { active: boolean } =
    withTimetableStack === false
      ? false
      : withTimetableStack === true
        ? { active: true }
        : { active: withTimetableStack.active ?? true };

  if (withTimetableStack && withClasses < 1) {
    throw new Error(
      'createThrowawaySchool: withTimetableStack requires withClasses >= 1 (need a class for the ClassSubject)',
    );
  }
  if (options.withClassbookEntry && !options.withTimetableStack) {
    throw new Error(
      'createThrowawaySchool: withClassbookEntry requires withTimetableStack (need teacherId + classSubjectId)',
    );
  }
  if (options.withClassbookEntry && (!options.withStudents || options.withStudents.length === 0)) {
    throw new Error(
      'createThrowawaySchool: withClassbookEntry requires withStudents (need student rows to attach attendance to)',
    );
  }
  if (options.classNames && options.classNames.length !== withClasses) {
    throw new Error(
      `createThrowawaySchool: classNames.length (${options.classNames.length}) must match withClasses (${withClasses})`,
    );
  }
  if (options.withTimetableEdit && !withTimetableStack) {
    throw new Error(
      'createThrowawaySchool: withTimetableEdit requires withTimetableStack (no lesson to attach the edit to)',
    );
  }
  if (options.withSecondTeacherLesson && !withTimetableStack) {
    throw new Error(
      'createThrowawaySchool: withSecondTeacherLesson requires withTimetableStack (no run + classSubject + room to attach the second lesson to)',
    );
  }

  const prisma = buildPrisma();
  try {
    const ts = Date.now();
    const suffix = ts.toString().slice(-9);

    const school = await prisma.school.create({
      data: {
        name: `${namePrefix}-${suffix}`,
        schoolType: 'AHS',
        abWeekEnabled: false,
      },
    });

    const schoolYear = await prisma.schoolYear.create({
      data: {
        schoolId: school.id,
        name: `${ts}/${ts + 1}`,
        startDate: new Date('2099-09-01'),
        semesterBreak: new Date('2100-02-01'),
        endDate: new Date('2100-06-30'),
        isActive: true,
      },
    });

    const classIds: string[] = [];
    for (let i = 0; i < withClasses; i++) {
      const klass = await prisma.schoolClass.create({
        data: {
          schoolId: school.id,
          name: options.classNames?.[i] ?? `${namePrefix}-K${i + 1}`,
          yearLevel: 5 + i,
          schoolYearId: schoolYear.id,
        },
      });
      classIds.push(klass.id);
    }

    const activeRoles = (Object.keys(roles) as SeedRole[]).filter((r) => roles[r]);
    const keycloakUserIds = await resolveSeedKeycloakIds(prisma, activeRoles);

    const personIds: Partial<Record<SeedRole, string>> = {};
    for (const role of activeRoles) {
      const kcId = keycloakUserIds[role];
      if (!kcId) continue;
      const person = await prisma.person.create({
        data: {
          schoolId: school.id,
          keycloakUserId: kcId,
          personType: ROLE_TO_PERSON_TYPE[role],
          firstName: `${namePrefix}-${role}`,
          lastName: suffix,
        },
      });
      personIds[role] = person.id;
    }

    let timetable: ThrowawayTimetableStack | undefined;
    if (withTimetableStack) {
      const classIdForStack = classIds[0];

      // Teacher row needs a Person row. Prefer the lehrer Person if the
      // caller opted into roles.lehrer (legacy #137 path — kc-lehrer drives
      // the spec); otherwise create a generic fixture-only Person so admin-
      // driven specs (statistics-absence, admin-timetable-history) can still
      // get a teacherId without dragging lehrer into the test.
      let teacherPersonId: string;
      let teacherFirstName: string;
      let teacherLastName: string;
      if (personIds.lehrer) {
        teacherPersonId = personIds.lehrer;
        teacherFirstName = `${namePrefix}-lehrer`;
        teacherLastName = suffix;
      } else {
        teacherFirstName = `${namePrefix}-FixtureTeacher`;
        teacherLastName = suffix;
        const fixtureTeacherPerson = await prisma.person.create({
          data: {
            schoolId: school.id,
            personType: 'TEACHER',
            firstName: teacherFirstName,
            lastName: teacherLastName,
          },
        });
        teacherPersonId = fixtureTeacherPerson.id;
      }
      // PerspectiveSelector renders this exact string (`${lastName} ${firstName}`,
      // useTimetable.ts:78); expose it so specs can pick the right
      // "Lehrer" option from the dropdown.
      const teacherDisplayName = `${teacherLastName} ${teacherFirstName}`;

      // Teacher row for the Person. Teacher.personId is @unique (one
      // Teacher per Person) — the Person was created fresh above, so no
      // collision.
      const teacher = await prisma.teacher.create({
        data: {
          personId: teacherPersonId,
          schoolId: school.id,
        },
      });

      const subject = await prisma.subject.create({
        data: {
          schoolId: school.id,
          name: `${namePrefix}-Math`,
          shortName: `M${suffix.slice(-4)}`, // keep @@unique([schoolId, shortName]) trivially safe
          subjectType: 'PFLICHT',
        },
      });

      const classSubject = await prisma.classSubject.create({
        data: {
          classId: classIdForStack,
          subjectId: subject.id,
          teacherId: teacher.id,
          weeklyHours: 1,
        },
      });

      const room = await prisma.room.create({
        data: {
          schoolId: school.id,
          name: `${namePrefix}-R-${suffix}`,
          roomType: 'KLASSENZIMMER',
          capacity: 30,
          equipment: [],
        },
      });

      // TimeGrid + a single period — the timetable view needs at least one
      // period to render a column slot at periodNumber=1.
      const timeGrid = await prisma.timeGrid.create({
        data: {
          schoolId: school.id,
          periods: {
            create: [
              {
                periodNumber: 1,
                startTime: '08:00',
                endTime: '08:50',
                isBreak: false,
                label: '1. Stunde',
                durationMin: 50,
              },
            ],
          },
        },
      });

      // SchoolDays MON-FRI active — the timetable view filters out inactive
      // days from the grid columns.
      for (const dayOfWeek of ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'] as const) {
        await prisma.schoolDay.create({
          data: { schoolId: school.id, dayOfWeek, isActive: true },
        });
      }

      const runActive = (timetableStackConfig as { active: boolean }).active;
      const run = await prisma.timetableRun.create({
        data: {
          schoolId: school.id,
          status: 'COMPLETED',
          isActive: runActive,
          maxSolveSeconds: 300,
          abWeekEnabled: false,
          hardScore: 0,
          softScore: 0,
          elapsedSeconds: 1,
        },
      });

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

      timetable = {
        teacherId: teacher.id,
        teacherDisplayName,
        subjectId: subject.id,
        subjectShortName: subject.shortName,
        subjectAbbreviation: subject.shortName,
        classSubjectId: classSubject.id,
        roomId: room.id,
        roomName: room.name,
        timeGridId: timeGrid.id,
        timetableRunId: run.id,
        timetableRunActive: runActive,
        timetableLessonId: lesson.id,
        classId: classIdForStack,
        lessonDayOfWeek: 'MONDAY',
        lessonPeriodNumber: 1,
      };
    }

    // Issue #138 — students for admin-driven specs (statistics-absence,
    // classbook surfaces). Each Student needs its own Person row; enroll
    // them in classIds[0].
    const studentIds: string[] = [];
    if (options.withStudents && options.withStudents.length > 0) {
      if (classIds.length === 0) {
        throw new Error('createThrowawaySchool: withStudents requires withClasses >= 1');
      }
      const classForStudents = classIds[0];
      for (const [i, name] of options.withStudents.entries()) {
        const personRow = await prisma.person.create({
          data: {
            schoolId: school.id,
            personType: 'STUDENT',
            firstName: name.firstName,
            lastName: name.lastName,
          },
        });
        const studentRow = await prisma.student.create({
          data: {
            personId: personRow.id,
            schoolId: school.id,
            classId: classForStudents,
            studentNumber: `${namePrefix}-S${i + 1}-${suffix}`,
          },
        });
        studentIds.push(studentRow.id);
      }
    }

    // Issue #138 — single ClassBookEntry + attendance records pinned to a
    // deterministic date. The entry's unique key is (classSubjectId, date,
    // periodNumber, weekType) — caller controls the period to avoid
    // collisions with withTimetableStack's MONDAY/period-1 lesson.
    let classBookEntryId: string | undefined;
    if (options.withClassbookEntry) {
      const cb = options.withClassbookEntry;
      const period = cb.period ?? 5;
      const stack = timetable!; // validated above
      // ClassBookEntry.dayOfWeek mirrors the timetable-lesson's weekday
      // semantically (i.e. "this is the Monday lesson"), independent of
      // the calendar `date` column. Hardcoding MONDAY matches the
      // timetable stack's seeded lesson and avoids the DayOfWeek enum
      // missing SUNDAY trap when the caller passes a weekend date. This
      // mirrors the legacy `fixtures/absence-stats.ts` behavior which
      // hardcoded 'FRIDAY' even though 2026-03-15 is a Sunday.
      const entry = await prisma.classBookEntry.create({
        data: {
          classSubjectId: stack.classSubjectId,
          dayOfWeek: 'MONDAY',
          periodNumber: period,
          weekType: 'BOTH',
          date: new Date(`${cb.date}T00:00:00Z`),
          teacherId: stack.teacherId,
          schoolId: school.id,
        },
      });
      classBookEntryId = entry.id;

      for (const att of cb.attendance) {
        if (att.studentIndex >= studentIds.length) {
          throw new Error(
            `createThrowawaySchool: withClassbookEntry.attendance[].studentIndex=${att.studentIndex} out of range (only ${studentIds.length} students provisioned)`,
          );
        }
        await prisma.attendanceRecord.create({
          data: {
            classBookEntryId: entry.id,
            studentId: studentIds[att.studentIndex],
            status: att.status,
            lateMinutes: att.lateMinutes,
            recordedBy: stack.teacherId,
          },
        });
      }
    }

    // Issue #138 wave 2 — single TimetableLessonEdit audit-log row. No FK
    // on runId/lessonId means we have to delete the row explicitly in
    // cleanup (won't cascade from TimetableRun delete). The editedBy
    // column is a free-form string — fixture uses a deterministic UUID-
    // shaped placeholder so the row is visually distinguishable from
    // production-edited rows in a debugger.
    let timetableEditId: string | undefined;
    if (options.withTimetableEdit) {
      const stack = timetable!; // validated above
      const edit = await prisma.timetableLessonEdit.create({
        data: {
          runId: stack.timetableRunId,
          lessonId: stack.timetableLessonId,
          editedBy: '00000000-0000-4000-8000-00000000e2e1',
          editAction: 'move',
          previousState: options.withTimetableEdit.previousState,
          newState: options.withTimetableEdit.newState,
        },
      });
      timetableEditId = edit.id;
    }

    // Issue #149 (Phase 3.5/1) — second TimetableLesson at MONDAY/period-2,
    // taught by a fresh fixture-only Teacher. Mirrors the legacy
    // `seedSecondTeacherLesson` companion: same Run + ClassSubject + Room,
    // distinct teacher, non-colliding period. Cascade-clean via run delete
    // (lesson) + school delete (teacher + person).
    let secondTeacher: ThrowawaySecondTeacherLesson | undefined;
    if (options.withSecondTeacherLesson) {
      const stack = timetable!; // validated above
      const secondFirstName = `${namePrefix}-Teacher2`;
      const secondLastName = `${suffix}-T2`;
      const secondPerson = await prisma.person.create({
        data: {
          schoolId: school.id,
          personType: 'TEACHER',
          firstName: secondFirstName,
          lastName: secondLastName,
        },
      });
      const secondTeacherRow = await prisma.teacher.create({
        data: {
          personId: secondPerson.id,
          schoolId: school.id,
        },
      });
      const secondLesson = await prisma.timetableLesson.create({
        data: {
          runId: stack.timetableRunId,
          classSubjectId: stack.classSubjectId,
          teacherId: secondTeacherRow.id,
          roomId: stack.roomId,
          dayOfWeek: 'MONDAY',
          periodNumber: 2,
          weekType: 'BOTH',
        },
      });
      secondTeacher = {
        teacherId: secondTeacherRow.id,
        teacherFullName: `${secondFirstName} ${secondLastName}`,
        dayOfWeek: 'MONDAY',
        periodNumber: 2,
        timetableLessonId: secondLesson.id,
      };
    }

    const capturedTimetable = timetable;
    const cleanup = async () => {
      const p = buildPrisma();
      try {
        // Issue #138 wave 2 — TimetableLessonEdit has NO FK on runId or
        // lessonId (Prisma schema omits @relation for both — schema audit
        // confirmed). Cascade from School/Run does NOT reach edit rows;
        // explicit deleteMany scoped to our run keeps them from ghosting
        // future history-length assertions.
        if (capturedTimetable) {
          await p.timetableLessonEdit.deleteMany({
            where: { runId: capturedTimetable.timetableRunId },
          });
        }
        // Issue #137 — `timetable_lessons.room_id` is still RESTRICT (#137
        // intentionally keeps it so admin Room deletes get a 409 instead
        // of silently nuking lessons). For the throwaway cleanup that
        // means we MUST delete the TimetableRun first — its CASCADE on
        // `run_id` removes the lessons, freeing the FK on Room before the
        // School cascade tries to drop the Room.
        if (capturedTimetable) {
          await p.timetableRun.deleteMany({
            where: { id: capturedTimetable.timetableRunId },
          });
        }
        // School.delete cascades to every per-school row via the FK chain
        // (post-#136 + #137 audit closes 8 cascade gaps total). The
        // exam.class_id + exam/homework.class_subject_id CASCADEs added in
        // #137 resolve the diamond-cascade race PG hit when both branches
        // fired concurrently.
        await p.school.delete({ where: { id: school.id } });
      } finally {
        await p.$disconnect();
      }
    };

    return {
      schoolId: school.id,
      schoolName: school.name,
      schoolYearId: schoolYear.id,
      classIds,
      personIds,
      keycloakUserIds,
      timetable,
      secondTeacher,
      studentIds,
      classBookEntryId,
      timetableEditId,
      cleanup,
    };
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Convenience cleanup when a spec stashes just the schoolId (e.g. retrieved
 * from a previous run). Idempotent — silently no-ops on missing schools.
 */
export async function cleanupThrowawaySchool(schoolId: string): Promise<void> {
  const prisma = buildPrisma();
  try {
    const exists = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true } });
    if (!exists) return;
    await prisma.school.delete({ where: { id: schoolId } });
  } finally {
    await prisma.$disconnect();
  }
}
