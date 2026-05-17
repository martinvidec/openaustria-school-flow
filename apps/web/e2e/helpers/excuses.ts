/**
 * Excuses E2E helpers — #83.
 *
 * Phase 6 AbsenceExcuse REST contract:
 *   - POST   /schools/:schoolId/classbook/excuses          — parent submits
 *   - GET    /schools/:schoolId/classbook/excuses          — list (role-scoped)
 *   - PATCH  /schools/:schoolId/classbook/excuses/:id/review — Klassenvorstand reviews
 *
 * There is NO DELETE endpoint on the excuses API (parents cannot withdraw
 * a submitted excuse; teachers can only review). For test cleanup we go
 * direct-to-Prisma, mirroring the `fixtures/timetable-run.ts` CommonJS-
 * bridge pattern. The sweep is scoped to a note-prefix every spec stamps
 * onto its excuse — that way two specs running in parallel can each
 * clean up only their own rows.
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, '../../../../.env') });

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { adapter?: unknown }) => {
    absenceExcuse: {
      deleteMany: (args: {
        where: Record<string, unknown>;
      }) => Promise<{ count: number }>;
    };
    $disconnect: () => Promise<void>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

/**
 * Prefix every E2E-generated excuse note with this string so the cleanup
 * sweep can find them. Two parallel specs CAN safely use the same
 * prefix — `deleteMany` is idempotent and the per-row write is the only
 * shared state.
 */
export const EXCUSES_NOTE_PREFIX = 'E2E-EXC-';

/**
 * Delete every AbsenceExcuse whose `note` field starts with the supplied
 * prefix. Best-effort: swallows errors so a half-applied fixture from a
 * previously killed run doesn't block the next test's setup.
 *
 * The `excuse_attachments` table cascade-deletes via the FK
 * (schema.prisma) so explicit attachment cleanup is not needed.
 */
export async function cleanupE2EExcuses(
  prefix: string = EXCUSES_NOTE_PREFIX,
): Promise<void> {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    await prisma.absenceExcuse.deleteMany({
      where: { note: { startsWith: prefix } },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[excuses] cleanupE2EExcuses soft-failed:`,
      err,
    );
  } finally {
    await prisma.$disconnect();
  }
}
