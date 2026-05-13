/**
 * Sweep helper — removes left-over E2E test data from the dev DB.
 *
 * Closes the cleanup gap described in #79: per-spec `afterEach` hooks
 * delete their own rows, but a hard-killed run (Ctrl+C, OOM, CI cancel)
 * skips `afterEach` and leaves E2E-prefixed rows in the live app DB.
 *
 * Hooked from `global-setup.ts` so every Playwright run starts clean
 * regardless of how the previous run ended. Also exposed as a standalone
 * script via `pnpm e2e:sweep`.
 *
 * Prisma-direct (not REST) because:
 *   - Hits all tables in one pass, no per-resource list/delete round-trips.
 *   - Uses FK cascades declared in `apps/api/prisma/schema.prisma`
 *     (Person → Teacher/Student/Parent/GroupMembership/ConsentRecord;
 *      SchoolClass → Group/ClassSubject; Subject → TeacherSubject; etc.)
 *     so each `deleteMany` here implicitly handles its children.
 *   - No admin token, no Keycloak round-trip — faster + works even when
 *     Keycloak is slow to warm up.
 *
 * Mirrors the Prisma 7 adapter pattern from `fixtures/orphan-year.ts`.
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Belt-and-braces dotenv — Playwright workers run with CWD=apps/web.
dotenvConfig({ path: path.resolve(__dirname, '../../../../.env') });

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { adapter?: unknown }) => PrismaLike;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

interface DeleteManyResult {
  count: number;
}
interface PrismaModel {
  deleteMany: (args: { where: Record<string, unknown> }) => Promise<DeleteManyResult>;
}
interface PrismaLike {
  person: PrismaModel;
  schoolClass: PrismaModel;
  group: PrismaModel;
  subject: PrismaModel;
  room: PrismaModel;
  resource: PrismaModel;
  role: PrismaModel;
  dsfaEntry: PrismaModel;
  vvzEntry: PrismaModel;
  retentionPolicy: PrismaModel;
  constraintWeightOverride: PrismaModel;
  permissionOverride: PrismaModel;
  importJob: PrismaModel;
  $disconnect: () => Promise<void>;
}

export type SweepCounts = Record<string, number>;

/**
 * Prefix conventions enforced by `apps/web/e2e/helpers/*.ts`:
 *   - `E2E-…`  (uppercase) — every CRUD-style spec (Persons / Classes /
 *     Groups / Subjects / Rooms / Resources / Roles / etc.).
 *   - `e2e-15-…` (lowercase, Phase 15) — DSGVO admin specs
 *     (`apps/web/e2e/helpers/dsgvo.ts:33`).
 *
 * Top-level entities only: cascade FKs handle the children (see schema
 * `onDelete: Cascade` on Teacher/Student/Parent/Group/GroupMembership/
 * ConsentRecord/ClassSubject/TeacherSubject/RoomBooking/ResourceBooking/
 * Permission/UserRole).
 *
 * Deliberately NOT swept:
 *   - `consent_records` — preserved by design in `dsgvo.ts:21-24` (state
 *     machine: granted → withdrawn). Cascades via `personId` when the
 *     E2E person is removed.
 *   - `constraint_templates` — no name field to filter on; per-spec
 *     cleanup-by-templateType is sufficient (`constraints.ts:121`).
 *   - `audit_entries` — auditable trail; let retention policy handle them.
 */
export async function sweepE2ELeftovers(): Promise<SweepCounts> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      'sweepE2ELeftovers: DATABASE_URL not set. Source .env or apps/api/.env first.',
    );
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });
  const counts: SweepCounts = {};
  try {
    counts['persons'] = (
      await prisma.person.deleteMany({
        where: {
          OR: [
            { firstName: { startsWith: 'E2E-' } },
            { lastName: { startsWith: 'E2E-' } },
            { firstName: { startsWith: 'e2e-15-' } },
            { lastName: { startsWith: 'e2e-15-' } },
          ],
        },
      })
    ).count;

    counts['school_classes'] = (
      await prisma.schoolClass.deleteMany({
        where: { name: { startsWith: 'E2E-' } },
      })
    ).count;

    counts['groups'] = (
      await prisma.group.deleteMany({
        where: { name: { startsWith: 'E2E-' } },
      })
    ).count;

    counts['subjects'] = (
      await prisma.subject.deleteMany({
        where: { name: { startsWith: 'E2E-' } },
      })
    ).count;

    counts['rooms'] = (
      await prisma.room.deleteMany({
        where: { name: { startsWith: 'E2E-' } },
      })
    ).count;

    counts['resources'] = (
      await prisma.resource.deleteMany({
        where: { name: { startsWith: 'E2E-' } },
      })
    ).count;

    counts['roles'] = (
      await prisma.role.deleteMany({
        where: { name: { startsWith: 'E2E-' } },
      })
    ).count;

    counts['dsfa_entries'] = (
      await prisma.dsfaEntry.deleteMany({
        where: { title: { startsWith: 'e2e-15-' } },
      })
    ).count;

    counts['vvz_entries'] = (
      await prisma.vvzEntry.deleteMany({
        where: { activityName: { startsWith: 'e2e-15-' } },
      })
    ).count;

    counts['retention_policies'] = (
      await prisma.retentionPolicy.deleteMany({
        where: { dataCategory: { startsWith: 'e2e-15-' } },
      })
    ).count;

    counts['constraint_weight_overrides'] = (
      await prisma.constraintWeightOverride.deleteMany({
        where: { constraintName: { startsWith: 'E2E-' } },
      })
    ).count;

    counts['permission_overrides'] = (
      await prisma.permissionOverride.deleteMany({
        where: { reason: { startsWith: 'E2E-USR-' } },
      })
    ).count;

    counts['import_jobs'] = (
      await prisma.importJob.deleteMany({
        where: { fileName: { startsWith: 'E2E-' } },
      })
    ).count;

    return counts;
  } finally {
    await prisma.$disconnect();
  }
}

/** Total row count across all swept tables. Used by callers to decide whether to log. */
export function totalSwept(counts: SweepCounts): number {
  return Object.values(counts).reduce((sum, n) => sum + n, 0);
}
