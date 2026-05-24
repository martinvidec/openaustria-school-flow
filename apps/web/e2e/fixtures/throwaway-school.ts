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
type SeedRole = 'lehrer' | 'schulleitung' | 'schueler' | 'eltern';
const ROLE_TO_PERSON_TYPE: Record<SeedRole, 'TEACHER' | 'STUDENT' | 'PARENT'> = {
  lehrer: 'TEACHER',
  schulleitung: 'TEACHER',
  schueler: 'STUDENT',
  eltern: 'PARENT',
};

export interface ThrowawaySchoolOptions {
  /** Seed-KC roles that should receive a Person row in the throwaway school. */
  roles?: Partial<Record<SeedRole, boolean>>;
  /** Number of SchoolClasses to seed (default 1). */
  withClasses?: number;
  /** Prefix for the school's name + class names — keeps cross-spec greps trivial. */
  namePrefix?: string;
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
  } = options;

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
          name: `${namePrefix}-K${i + 1}`,
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

    const cleanup = async () => {
      const p = buildPrisma();
      try {
        // School.delete cascades to every per-school row via the FK chain
        // (post-#136 audit closes the 5 remaining gaps).
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
