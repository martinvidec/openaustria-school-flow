/**
 * Deterministic seed for SCHOOL-05 orphan-guard E2E test.
 *
 * Why Prisma-direct: TimetableRun has NO schoolYearId column and StartSolveDto
 * only accepts {maxSolveSeconds?, constraintWeights?} — there is no HTTP path
 * to create a TimetableRun bound to a specific SchoolYear. SchoolClass is the
 * canonical referencing entity counted by the orphan-guard.
 *
 * The generated Prisma client (apps/api/dist/config/database/generated) is a
 * CommonJS module emitted by SWC with getter-based named exports. Playwright's
 * test runner loads fixtures via Node's ESM loader, which doesn't surface CJS
 * getter exports as named imports. We bridge that with `createRequire` — the
 * resulting CJS module exposes `PrismaClient` on the returned object normally.
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

// Prisma 7 note on datasources:
//   Prisma 6 used `new PrismaClient({ datasources: { db: { url } } })`.
//   Prisma 7 removed that option in favour of driver adapters:
//     `new PrismaClient({ adapter: new PrismaPg({ connectionString }) })`
//   (see apps/api/src/config/database/prisma.service.ts for the canonical
//   in-repo pattern). The old `datasources:` shape throws
//   `PrismaClientConstructorValidationError: Unknown property datasources`
//   against the 7.x generated client, which is why this fixture injects the
//   URL via the adapter instead of the legacy datasources option.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { datasources?: { db?: { url?: string } }; adapter?: unknown }) => {
    schoolYear: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      deleteMany: (args: { where: { id: string } }) => Promise<unknown>;
    };
    schoolClass: {
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }>;
      deleteMany: (args: { where: { id: string } }) => Promise<unknown>;
    };
    $disconnect: () => Promise<void>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

export interface OrphanFixture {
  yearId: string;
  classId: string;
}

/**
 * Why dotenv + explicit datasources / adapter.connectionString:
 *   dotenv/config populates process.env.DATABASE_URL from apps/api/.env or
 *   repo-root .env when the Playwright runner shell didn't `source` it
 *   (macOS worker-subprocess env drops observed in 10.3-01). Explicit
 *   connection-string injection makes the dependency visible at the
 *   construction site so missing-env fails loud, not as a silent Prisma
 *   connect error deep in worker logs.
 *
 *   Prisma 7 migration note: the legacy Prisma 6 shape
 *     datasources: { db: { url: process.env.DATABASE_URL } }
 *   is no longer accepted. The Prisma 7 equivalent is
 *     adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL })
 *   which we use here. Same env var, same datasources target, new syntax.
 *   Deferred-items §1c, 10.4 D-3.
 */
export async function seedOrphanYear(schoolId: string): Promise<OrphanFixture> {
  // Prisma 7 adapter injection (equivalent of legacy datasources: { db: { url } }).
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    const year = await prisma.schoolYear.create({
      data: {
        schoolId,
        name: `ORPHAN-TEST-YEAR-${Date.now()}`,
        startDate: new Date('2099-09-01'),
        semesterBreak: new Date('2100-02-01'),
        endDate: new Date('2100-06-30'),
        isActive: false,
      },
    });
    const klass = await prisma.schoolClass.create({
      data: {
        schoolId,
        name: `ORPHAN-TEST-CLASS-${Date.now()}`,
        yearLevel: 1,
        schoolYearId: year.id,
      },
    });
    return { yearId: year.id, classId: klass.id };
  } finally {
    await prisma.$disconnect();
  }
}

export async function cleanupOrphanYear(fixture: OrphanFixture): Promise<void> {
  // Prisma 7 adapter injection (equivalent of legacy datasources: { db: { url } }).
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    await prisma.schoolClass.deleteMany({ where: { id: fixture.classId } });
    await prisma.schoolYear.deleteMany({ where: { id: fixture.yearId } });
  } finally {
    await prisma.$disconnect();
  }
}
