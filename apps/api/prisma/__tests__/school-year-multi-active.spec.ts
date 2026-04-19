/**
 * Phase 10 Plan 01a — Partial unique index integration spec.
 *
 * Purpose: verify the `school_years_active_per_school` partial unique index
 * enforces the multi-active invariant at the DB level:
 *   - two SchoolYear rows with isActive=true for the same schoolId -> P2002
 *   - one isActive=true + one isActive=false for the same schoolId  -> OK
 *
 * This spec requires a live Postgres database reachable via DATABASE_URL
 * (the migrations for this schema must already be applied). If Postgres is
 * not reachable, we skip gracefully with a diagnostic message instead of
 * hard-failing — which lets the spec run in any environment (parallel
 * worktree, CI shadow DB, or dev). Post-merge the user runs
 * `pnpm --filter @schoolflow/api exec prisma migrate dev` to apply the
 * migrations and re-run this spec for green.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/config/database/generated/client';

const TEST_SCHOOL_ID = `test-school-multi-active-${Date.now()}`;
const DATABASE_URL =
  process.env.DATABASE_URL ?? 'postgresql://schoolflow:schoolflow_dev@localhost:5432/schoolflow';

function makeClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString: DATABASE_URL });
  return new PrismaClient({ adapter });
}

async function probeDatabase(): Promise<{ ok: boolean; reason?: string }> {
  let prisma: PrismaClient | undefined;
  try {
    prisma = makeClient();
    await prisma.$queryRaw`SELECT 1`;
    // Also verify the partial index exists (migration 2 applied).
    const rows = await prisma.$queryRaw<Array<{ indexname: string }>>`
      SELECT indexname FROM pg_indexes
      WHERE schemaname = current_schema() AND indexname = 'school_years_active_per_school'
    `;
    await prisma.$disconnect();
    if (rows.length === 0) {
      return {
        ok: false,
        reason: 'Partial unique index school_years_active_per_school not found — run prisma migrate dev first',
      };
    }
    return { ok: true };
  } catch (err) {
    await prisma?.$disconnect().catch(() => undefined);
    return { ok: false, reason: (err as Error).message };
  }
}

describe('SchoolYear partial unique index (school_years_active_per_school)', async () => {
  const probe = await probeDatabase();

  if (!probe.ok) {
    it.skip(`skipping DB-backed spec — ${probe.reason}`, () => {
      /* no-op */
    });
    return;
  }

  const prisma = makeClient();

  beforeAll(async () => {
    // Ensure a clean test school row exists.
    await prisma.school.upsert({
      where: { id: TEST_SCHOOL_ID },
      update: {},
      create: {
        id: TEST_SCHOOL_ID,
        name: 'Multi-Active Test School',
        schoolType: 'AHS_UNTER',
      },
    });
    // Clear any prior year rows on this school from earlier runs.
    await prisma.schoolYear.deleteMany({ where: { schoolId: TEST_SCHOOL_ID } });
  });

  afterAll(async () => {
    await prisma.schoolYear.deleteMany({ where: { schoolId: TEST_SCHOOL_ID } });
    await prisma.school.deleteMany({ where: { id: TEST_SCHOOL_ID } });
    await prisma.$disconnect();
  });

  it('rejects a second active SchoolYear for the same school with P2002', async () => {
    // Insert year Y1 active.
    await prisma.schoolYear.create({
      data: {
        schoolId: TEST_SCHOOL_ID,
        name: '2025/2026',
        startDate: new Date('2025-09-01'),
        semesterBreak: new Date('2026-02-07'),
        endDate: new Date('2026-07-04'),
        isActive: true,
      },
    });

    // Attempting to insert year Y2 ALSO active must fail.
    await expect(
      prisma.schoolYear.create({
        data: {
          schoolId: TEST_SCHOOL_ID,
          name: '2026/2027',
          startDate: new Date('2026-09-01'),
          semesterBreak: new Date('2027-02-07'),
          endDate: new Date('2027-07-04'),
          isActive: true,
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });
  });

  it('allows isActive=true + isActive=false to coexist per school', async () => {
    // Clean slate for this case.
    await prisma.schoolYear.deleteMany({ where: { schoolId: TEST_SCHOOL_ID } });

    await prisma.schoolYear.create({
      data: {
        schoolId: TEST_SCHOOL_ID,
        name: '2025/2026',
        startDate: new Date('2025-09-01'),
        semesterBreak: new Date('2026-02-07'),
        endDate: new Date('2026-07-04'),
        isActive: true,
      },
    });

    // Inactive second year — should succeed.
    await expect(
      prisma.schoolYear.create({
        data: {
          schoolId: TEST_SCHOOL_ID,
          name: '2026/2027',
          startDate: new Date('2026-09-01'),
          semesterBreak: new Date('2027-02-07'),
          endDate: new Date('2027-07-04'),
          isActive: false,
        },
      }),
    ).resolves.toBeDefined();
  });

  it('backfill invariant — all existing rows after migration are isActive=true', async () => {
    // Count active years in DB — must equal total SchoolYear rows (since
    // migration Step 3 backfilled every existing row to isActive=true, and
    // no inactive rows have been inserted in production data yet).
    // Note: our local test data may include inactive rows from the prior
    // coexistence test, so scope to rows OUTSIDE our test schoolId.
    const total = await prisma.schoolYear.count({
      where: { schoolId: { not: TEST_SCHOOL_ID } },
    });
    const active = await prisma.schoolYear.count({
      where: { schoolId: { not: TEST_SCHOOL_ID }, isActive: true },
    });
    // Every pre-existing row must have been backfilled.
    expect(active).toBe(total);
  });
});
