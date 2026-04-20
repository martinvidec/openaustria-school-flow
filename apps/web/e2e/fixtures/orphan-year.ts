/**
 * Deterministic seed for SCHOOL-05 orphan-guard E2E test.
 *
 * Why Prisma-direct: TimetableRun has NO schoolYearId column (apps/api/prisma/
 * schema.prisma TimetableRun model), and StartSolveDto only accepts
 * {maxSolveSeconds?, constraintWeights?} — there is no HTTP path to create a
 * TimetableRun bound to a specific SchoolYear. SchoolClass is the canonical
 * referencing entity counted by the orphan-guard (alongside TeachingReduction).
 *
 * The generated Prisma client lives under apps/api/src/config/database/generated
 * per prisma.config.ts. We import via a relative path because the test runner
 * (apps/web) would otherwise need @prisma/client wired, which it doesn't.
 */
import { PrismaClient } from '../../../api/src/config/database/generated/client.js';

export interface OrphanFixture {
  yearId: string;
  classId: string;
}

function makeClient(): InstanceType<typeof PrismaClient> {
  // Uses DATABASE_URL from the runner env — set via e.g. `set -a; source apps/api/.env; set +a`.
  return new PrismaClient();
}

export async function seedOrphanYear(schoolId: string): Promise<OrphanFixture> {
  const prisma = makeClient();
  try {
    const year = await prisma.schoolYear.create({
      data: {
        schoolId,
        name: `ORPHAN-TEST-YEAR-${Date.now()}`,
        startDate: new Date('2099-09-01'),
        // semesterBreak is REQUIRED on SchoolYear — without this Prisma throws at seed time.
        semesterBreak: new Date('2100-02-01'),
        endDate: new Date('2100-06-30'),
        isActive: false,
      },
    });
    // SchoolClass requires schoolId + name + yearLevel + schoolYearId.
    // Unique key: [schoolId, name, schoolYearId] — timestamped name avoids collision.
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
  const prisma = makeClient();
  try {
    // Delete the referencing SchoolClass first so the SchoolYear delete is unblocked.
    await prisma.schoolClass.deleteMany({ where: { id: fixture.classId } });
    await prisma.schoolYear.deleteMany({ where: { id: fixture.yearId } });
  } finally {
    await prisma.$disconnect();
  }
}
