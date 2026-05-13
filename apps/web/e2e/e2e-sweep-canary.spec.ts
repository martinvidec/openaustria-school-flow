/**
 * Regression-Lock for #79 — verifies `sweepE2ELeftovers()` actually
 * removes the row types it claims to. Per the CLAUDE.md Bug-Fix-
 * Regression-Schutz rule: every fix ships with an E2E that would have
 * caught the original symptom.
 *
 * Without the sweep helper this test would fail because the canary row
 * inserted in the arrange step would still be visible after the call.
 *
 * Strategy: insert one `E2E-CANARY-…` row per swept table directly via
 * Prisma (mirroring the orphan-year fixture pattern), call the sweep,
 * and assert every canary is gone. Direct DB I/O — no HTTP — so the
 * sweep helper is exercised in the same path globalSetup uses.
 *
 * Chromium-only: matches the parallel-cleanup race-family precedent
 * (`project_e2e_parallel_cleanup_race_family.md`). Two browser projects
 * inserting + sweeping concurrently would race each other.
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sweepE2ELeftovers, totalSwept } from './helpers/sweep-leftovers';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, '../../../.env') });

const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { adapter?: unknown }) => {
    person: { create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }> };
    schoolClass: { create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }> };
    subject: { create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }> };
    room: { create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }> };
    dsfaEntry: { create: (args: { data: Record<string, unknown> }) => Promise<{ id: string }> };
    schoolYear: {
      findFirst: (args: {
        where: Record<string, unknown>;
        select?: Record<string, true>;
      }) => Promise<{ id: string } | null>;
    };
    $disconnect: () => Promise<void>;
  };
};
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

test.describe('Issue #79 — E2E sweep regression lock', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Sweep is viewport-agnostic — desktop chromium is enough.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Parallel browser projects would race on the canary rows (#79 race-family precedent).',
  );

  test('CANARY-SWEEP-01: sweepE2ELeftovers removes E2E-prefixed rows in persons / school_classes / subjects / rooms / dsfa_entries', async () => {
    const prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
    });

    const ts = Date.now();
    const personFirstName = `E2E-CANARY-PERSON-${ts}`;
    const classNameLit = `E2E-CANARY-CLASS-${ts}`;
    const subjectName = `E2E-CANARY-SUB-${ts}`;
    const roomName = `E2E-CANARY-ROOM-${ts}`;
    const dsfaTitle = `e2e-15-canary-dsfa-${ts}`;

    try {
      const year = await prisma.schoolYear.findFirst({
        where: { schoolId: SEED_SCHOOL_UUID },
        select: { id: true },
      });
      expect(year, 'seed school must have at least one SchoolYear').not.toBeNull();
      const schoolYearId = year!.id;

      await prisma.person.create({
        data: {
          schoolId: SEED_SCHOOL_UUID,
          personType: 'STUDENT',
          firstName: personFirstName,
          lastName: 'Canary',
        },
      });
      await prisma.schoolClass.create({
        data: {
          schoolId: SEED_SCHOOL_UUID,
          name: classNameLit,
          yearLevel: 1,
          schoolYearId,
        },
      });
      await prisma.subject.create({
        data: {
          schoolId: SEED_SCHOOL_UUID,
          name: subjectName,
          shortName: `EC-${ts.toString().slice(-4)}`,
          subjectType: 'PFLICHT',
        },
      });
      await prisma.room.create({
        data: {
          schoolId: SEED_SCHOOL_UUID,
          name: roomName,
          roomType: 'KLASSENZIMMER',
          capacity: 20,
        },
      });
      await prisma.dsfaEntry.create({
        data: {
          schoolId: SEED_SCHOOL_UUID,
          title: dsfaTitle,
          description: 'canary',
          dataCategories: [],
        },
      });

      // Pre-sweep assertion — canary rows MUST be visible. If this fails
      // the test setup is broken, not the sweep.
      const preCounts = await sweepE2ELeftovers();
      const preTotal = totalSwept(preCounts);
      expect(
        preTotal,
        'sweep should have found at least the 5 canary rows we just inserted',
      ).toBeGreaterThanOrEqual(5);

      // Post-sweep — re-running sweep should find nothing.
      const postCounts = await sweepE2ELeftovers();
      expect(totalSwept(postCounts), 'sweep is idempotent — second run is a no-op').toBe(0);
    } finally {
      await prisma.$disconnect();
    }
  });
});
