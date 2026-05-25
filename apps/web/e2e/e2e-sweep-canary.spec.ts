/**
 * Regression-Lock for #79 — verifies `sweepE2ELeftovers()` actually
 * removes the row types it claims to. Per the CLAUDE.md Bug-Fix-
 * Regression-Schutz rule: every fix ships with an E2E that would have
 * caught the original symptom.
 *
 * Without the sweep helper this test would fail because the canary row
 * inserted in the arrange step would still be visible after the call.
 *
 * Strategy: spin up a throwaway school (#136 / D4-primary), insert one
 * `E2E-CANARY-…` row per swept table into it directly via Prisma, then
 * call the now-scopable `sweepE2ELeftovers({ schoolId })` (#156) and
 * assert every canary is gone. Direct DB I/O — no HTTP — so the sweep
 * helper is exercised in the same path globalSetup uses.
 *
 * Issue #156 — runs cross-browser. The scoped sweep variant introduced
 * here only touches rows in the throwaway school, so a parallel-project
 * worker running an unrelated CRUD spec on the seed school can no longer
 * collide with our destructive call.
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { test, expect } from '@playwright/test';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sweepE2ELeftovers, totalSwept } from './helpers/sweep-leftovers';
import { createThrowawaySchool } from './fixtures/throwaway-school';

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
    'Sweep is viewport-agnostic — desktop is enough.',
  );

  test('CANARY-SWEEP-01: scoped sweepE2ELeftovers removes E2E-prefixed rows in persons / school_classes / subjects / rooms / dsfa_entries', async () => {
    // Isolate the test to a freshly-created school. The scoped sweep
    // helper (#156) only touches rows in this school, so parallel
    // workers on the seed school never collide with our destructive call.
    const throwaway = await createThrowawaySchool({
      roles: {},
      withClasses: 0,
      namePrefix: 'E2E-SWEEP-CANARY',
    });
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
      await prisma.person.create({
        data: {
          schoolId: throwaway.schoolId,
          personType: 'STUDENT',
          firstName: personFirstName,
          lastName: 'Canary',
        },
      });
      await prisma.schoolClass.create({
        data: {
          schoolId: throwaway.schoolId,
          name: classNameLit,
          yearLevel: 1,
          schoolYearId: throwaway.schoolYearId,
        },
      });
      await prisma.subject.create({
        data: {
          schoolId: throwaway.schoolId,
          name: subjectName,
          shortName: `EC-${ts.toString().slice(-4)}`,
          subjectType: 'PFLICHT',
        },
      });
      await prisma.room.create({
        data: {
          schoolId: throwaway.schoolId,
          name: roomName,
          roomType: 'KLASSENZIMMER',
          capacity: 20,
        },
      });
      await prisma.dsfaEntry.create({
        data: {
          schoolId: throwaway.schoolId,
          title: dsfaTitle,
          description: 'canary',
          dataCategories: [],
        },
      });

      // Pre-sweep assertion — the scoped sweep must find exactly our 5
      // canary rows (no other E2E-prefixed rows exist in this freshly-
      // created school).
      const preCounts = await sweepE2ELeftovers({ schoolId: throwaway.schoolId });
      expect(
        totalSwept(preCounts),
        'scoped sweep must find exactly the 5 canary rows inserted into the throwaway school',
      ).toBe(5);

      // Post-sweep — re-running scoped sweep should find nothing.
      const postCounts = await sweepE2ELeftovers({ schoolId: throwaway.schoolId });
      expect(totalSwept(postCounts), 'scoped sweep is idempotent — second run is a no-op').toBe(0);
    } finally {
      await prisma.$disconnect();
      await throwaway.cleanup();
    }
  });
});
