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
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new () => {
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

export interface OrphanFixture {
  yearId: string;
  classId: string;
}

export async function seedOrphanYear(schoolId: string): Promise<OrphanFixture> {
  const prisma = new PrismaClient();
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
  const prisma = new PrismaClient();
  try {
    await prisma.schoolClass.deleteMany({ where: { id: fixture.classId } });
    await prisma.schoolYear.deleteMany({ where: { id: fixture.yearId } });
  } finally {
    await prisma.$disconnect();
  }
}
