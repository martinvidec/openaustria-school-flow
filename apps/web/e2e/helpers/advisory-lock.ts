/**
 * Generic Postgres advisory-lock helper for Playwright E2E specs.
 *
 * Pattern established by Issue #112 Phase 2 (commit 9991e74) for
 * `seedTimetableRun` and extracted in Phase 2.5a (Issue #117) so the
 * CalendarToken + TimeGrid + Classbook + Messaging waves can reuse it
 * without copy-pasting the connection-lifecycle machinery.
 *
 * What it solves
 * --------------
 * Several E2E specs mutate per-school singleton/shared resources where
 * Prisma alone cannot serialize parallel callers: the @@unique
 * constraint covers schema-level invariants but says nothing about
 * "only one spec at a time may purge-then-recreate this row". With
 * Playwright running 2+ workers (and cross-project chromium ↔ firefox
 * on top), two `beforeEach` blocks routinely overlap on the same
 * resource and race.
 *
 * `pg_advisory_lock(N)` is a process-wide mutex keyed by a bigint. We
 * key it deterministically off the resource identity (e.g. schoolId,
 * userId, classId, …) via a 32-bit FNV-1a hash + namespace prefix,
 * acquire it on a held Prisma connection, run the danger-zone work,
 * and release it on the SAME connection at the end of the test.
 *
 * Why a held connection
 * ---------------------
 * The lock is session-scoped, not transaction-scoped — we deliberately
 * use `pg_advisory_lock` (not `pg_advisory_xact_lock`) because the
 * fixture seed + the test body + the cleanup span MULTIPLE separate
 * Prisma calls, each of which would commit and release a xact_lock.
 * The only way to keep the lock alive across those calls is to keep
 * the underlying connection alive. We expose it on the returned
 * AdvisoryLock handle so cleanup can close it; callers that need to
 * run their own Prisma queries on the SAME session can reach for
 * `lock._client` (deliberately marked private-by-convention).
 *
 * Why FNV-1a + 32-bit namespace
 * -----------------------------
 * Postgres advisory locks take a bigint. We pick a 32-bit hash on
 * purpose: lock keys are reserved per-test-suite and any spec that
 * collides with another resource's hash would block both. FNV-1a is
 * trivially deterministic, fast, and the collision rate at 32 bits is
 * acceptable for the small (~dozens) lock-key population in this
 * codebase. The namespace prefix is concatenated INTO the string
 * before hashing, so `time-grid:${schoolId}` and `calendar-token:lehrer:${schoolId}`
 * have orthogonal probability spaces.
 *
 * Multi-key acquisition order
 * ---------------------------
 * `acquireAdvisoryLock(['a', 'b'])` sorts the keys before acquisition
 * so two callers that overlap on a subset cannot deadlock — the
 * classic ABBA pattern is impossible when every caller agrees on
 * sort order. Sort is on the RESOURCE STRINGS (pre-hash), so behaviour
 * is independent of hash collisions or platform locale (`localeCompare`
 * is NOT used — we sort by code-unit order so identical inputs always
 * sort identically regardless of system locale).
 *
 * Connection-cost analysis
 * ------------------------
 * Playwright runs ~4 workers; each holds 1 fixture-bound connection
 * while its test is in flight; plus the regular API connection pool.
 * Postgres default max_connections=100 → plenty of headroom even when
 * multiple specs hold multiple locks each.
 *
 * Crash-safety
 * ------------
 * If a test process is killed mid-test without calling `release()`,
 * Postgres releases the lock when TCP keepalive eventually detects the
 * dead connection (~minutes). Acceptable for E2E.
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
    $executeRawUnsafe: (sql: string) => Promise<number>;
    $disconnect: () => Promise<void>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

/**
 * Handle returned by `acquireAdvisoryLock`. Always call `release()`
 * in a `finally` block — Postgres only frees the lock when the
 * underlying TCP connection disconnects, so leaking handles would
 * pin Postgres connections for the lifetime of the process.
 */
export interface AdvisoryLock {
  /**
   * Release every lock this handle holds (in REVERSE acquisition
   * order, so the last-acquired is unlocked first — defensive
   * mirroring of mutex lock-order even though Postgres advisory
   * locks themselves have no required release order).
   *
   * Then disconnects the Prisma client. Idempotent — repeated calls
   * are no-ops with a warning. Best-effort: errors are logged but
   * not thrown so cleanup can finish.
   */
  release(): Promise<void>;
  /**
   * INTERNAL — the Prisma client that holds the lock(s). Exposed so
   * specialised helpers (`seedTimetableRun`, `seedCalendarTokenContext`,
   * …) can run their own queries on the same session and keep the lock
   * alive throughout. Treat as readonly; never call `$disconnect()`
   * yourself — `release()` owns the connection lifecycle.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  readonly _client: any;
  /** Resource-key strings, sorted, for debug + logging. */
  readonly resourceKeys: ReadonlyArray<string>;
}

/**
 * 32-bit FNV-1a returned as a non-negative decimal string suitable
 * for interpolation into `pg_advisory_lock(<digits>)` calls.
 *
 * We use decimal-string + $executeRawUnsafe instead of the templated
 * $executeRaw bigint path because Prisma 7 driver-adapter has been
 * finicky with bigints across the pg-adapter boundary; the Unsafe
 * variant + decimal-string is simpler and just as safe because the
 * key is derived from a controlled string via FNV-1a, not from user
 * input.
 */
function fnv1a32(input: string): string {
  let h = 2166136261; // FNV offset basis (32-bit)
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619); // FNV prime, kept in 32-bit
  }
  return (h >>> 0).toString();
}

/**
 * Acquire one or more session-scoped Postgres advisory locks on a
 * single held Prisma connection. Returns an `AdvisoryLock` handle
 * whose `release()` MUST be called in a `finally` block.
 *
 * For multi-key acquisition, the keys are sorted by code-unit order
 * BEFORE hashing + locking so two callers that overlap on a subset
 * cannot deadlock (every caller agrees on order). Duplicate keys
 * in the input array are deduplicated.
 *
 * Best-effort cleanup: if acquisition fails mid-way (e.g. lock #3 of
 * 5 throws), the locks already acquired on this session are released
 * via `release()` semantics before the error propagates, so partial
 * state cannot leak.
 */
export async function acquireAdvisoryLock(
  resourceKeys: string | ReadonlyArray<string>,
): Promise<AdvisoryLock> {
  const inputs = typeof resourceKeys === 'string' ? [resourceKeys] : Array.from(resourceKeys);
  if (inputs.length === 0) {
    throw new Error('acquireAdvisoryLock requires at least one resource key');
  }
  const sortedKeys = [...new Set(inputs)].sort();

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });

  const acquiredHashes: string[] = [];
  try {
    for (const key of sortedKeys) {
      const hashed = fnv1a32(key);
      await prisma.$executeRawUnsafe(`SELECT pg_advisory_lock(${hashed})`);
      acquiredHashes.push(hashed);
    }
  } catch (err) {
    // Release whatever we managed to acquire on this session, then
    // disconnect — same shape as release() to keep the lifecycle
    // symmetric.
    for (const hashed of [...acquiredHashes].reverse()) {
      try {
        await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(${hashed})`);
      } catch {
        /* best-effort */
      }
    }
    await prisma.$disconnect();
    throw err;
  }

  let released = false;
  return {
    _client: prisma,
    resourceKeys: sortedKeys,
    release: async (): Promise<void> => {
      if (released) return;
      released = true;
      for (const hashed of [...acquiredHashes].reverse()) {
        try {
          await prisma.$executeRawUnsafe(`SELECT pg_advisory_unlock(${hashed})`);
        } catch (err) {
          // eslint-disable-next-line no-console
          console.warn(
            `[advisory-lock] pg_advisory_unlock(${hashed}) failed:`,
            err,
          );
        }
      }
      await prisma.$disconnect();
    },
  };
}
