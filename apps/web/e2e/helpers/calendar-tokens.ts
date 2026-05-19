/**
 * Calendar-Token E2E helpers — Issue #88.
 *
 * Three responsibilities:
 *  1. Map test-persona role names → SchoolFlow Person UUIDs (fixed
 *     seed constants from `fixtures/seed-uuids.ts`). The CalendarToken
 *     row uses `userId = Person.keycloakUserId`, but the Keycloak
 *     user UUIDs are GENERATED at realm-import time and differ across
 *     environments. We resolve them at runtime via the Person table
 *     (Person.keycloakUserId column) so the helper is portable
 *     across dev / CI / fresh-import scenarios.
 *  2. A Prisma-direct purge of `calendar_tokens` rows for the test
 *     personas. The CalendarToken table allows MULTIPLE rows per
 *     (userId, schoolId) — there is no @@unique constraint on that
 *     tuple, only on `token` (calendar.service.ts:32 does an
 *     unconditional INSERT and the schema declares only a unique
 *     index on `token`). A leftover token from a prior failed test
 *     therefore both (a) prevents the empty-state assertion AND (b)
 *     leaks into the next spec's "URL must differ" assertion (the
 *     newly-generated URL is fine but the GET returns the OLDEST
 *     row via findFirst). Specs MUST purge in beforeEach AND
 *     afterEach to be deterministic.
 *  3. An `apiBaseFromE2eEnv()` helper that resolves the bare API
 *     host (e.g. http://localhost:3000) from the existing
 *     `E2E_API_URL` convention (which points to .../api/v1 by
 *     default). Specs that fetch the public ICS endpoint need just
 *     the host because `calendarUrl` already includes the
 *     /api/v1/calendar/<token>.ics suffix.
 *
 * Why Prisma-direct cleanup (not API DELETE): the API DELETE
 * endpoint is `revokeAndRegenerate` — it deletes AND immediately
 * creates a new token (calendar.controller.ts:99). That's not
 * cleanup, that's churn. The Prisma-direct deleteMany leaves the
 * user in the "no token yet" state which is what beforeEach
 * needs.
 */
import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  SEED_PERSON_KC_ADMIN_UUID,
  SEED_PERSON_KC_ELTERN_UUID,
  SEED_PERSON_KC_LEHRER_UUID,
  SEED_PERSON_KC_SCHUELER_UUID,
  SEED_PERSON_KC_SCHULLEITUNG_UUID,
} from '../fixtures/seed-uuids';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenvConfig({ path: path.resolve(__dirname, '../../../../.env') });

const require = createRequire(import.meta.url);

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('../../../api/dist/config/database/generated/client.js') as {
  PrismaClient: new (opts?: { adapter?: unknown }) => {
    person: {
      findMany: (args: {
        where: Record<string, unknown>;
        select: Record<string, unknown>;
      }) => Promise<Array<{ id: string; keycloakUserId: string | null }>>;
    };
    calendarToken: {
      deleteMany: (args: { where: Record<string, unknown> }) => Promise<{ count: number }>;
    };
    $disconnect: () => Promise<void>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaPg } = require('../../../api/node_modules/@prisma/adapter-pg') as {
  PrismaPg: new (opts: { connectionString: string }) => unknown;
};

/**
 * Role → Person UUID lookup. The Person row links a SchoolFlow domain
 * record to a Keycloak user via `keycloakUserId`. We start from the
 * fixed Person UUIDs (defined in apps/api/prisma/seed.ts) because the
 * Keycloak user UUIDs are NON-fixed: they're generated at realm-import
 * time and differ across environments (observed locally: lehrer-user =
 * `230711d2-...`, not the `00000000-0000-0000-0000-000000000002` that
 * docker/keycloak/realm-export.json declares).
 */
const PERSON_UUID_BY_ROLE = {
  admin: SEED_PERSON_KC_ADMIN_UUID,
  lehrer: SEED_PERSON_KC_LEHRER_UUID,
  eltern: SEED_PERSON_KC_ELTERN_UUID,
  schueler: SEED_PERSON_KC_SCHUELER_UUID,
  schulleitung: SEED_PERSON_KC_SCHULLEITUNG_UUID,
} as const;

export type CalendarTestRole = keyof typeof PERSON_UUID_BY_ROLE;

/**
 * Resolve the bare API host (e.g. http://localhost:3000) for use by
 * `request.get('<host>/api/v1/calendar/<token>.ics')`. The existing
 * convention is `E2E_API_URL = http://localhost:3000/api/v1` —
 * strip the trailing `/api/v1` to get the host.
 *
 * The public ICS endpoint is mounted at `/api/v1/calendar/:token.ics`
 * (calendar.controller.ts after the #88 fix) and `calendarUrl` in
 * the React settings component is the relative path
 * `/api/v1/calendar/...ics` (calendar.controller.ts:87).
 * Prepending the host produces the absolute URL the iCal
 * subscription client would use.
 */
export function apiBaseFromE2eEnv(): string {
  const apiUrl = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

/**
 * Resolve Keycloak user UUIDs from the Person table for the given
 * roles. Returns only the userIds that have a non-null
 * keycloakUserId — defensive against a seed run that skipped
 * Keycloak linking (e.g. when Keycloak was unreachable and seed
 * fell back to default UUIDs).
 */
async function resolveKeycloakUserIds(
  roles: ReadonlyArray<CalendarTestRole>,
): Promise<string[]> {
  const personIds = roles.map((r) => PERSON_UUID_BY_ROLE[r]);
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    const rows = await prisma.person.findMany({
      where: { id: { in: personIds } },
      select: { id: true, keycloakUserId: true },
    });
    return rows
      .map((p) => p.keycloakUserId)
      .filter((id): id is string => id != null && id.length > 0);
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Hard-delete every CalendarToken row for the given roles on the
 * seed school. Used in beforeEach and afterEach so each spec starts
 * with a deterministic empty-state and leaves no residue.
 *
 * Implementation note: the helper resolves keycloakUserId via the
 * Person table at call time rather than hard-coding UUIDs, because
 * Keycloak generates fresh user UUIDs per realm-import and the
 * realm-export.json IDs do NOT survive a re-import. Hard-coding
 * would silently no-op against a re-imported realm.
 */
export async function purgeCalendarTokensForRoles(
  schoolId: string,
  roles: ReadonlyArray<CalendarTestRole>,
): Promise<void> {
  const userIds = await resolveKeycloakUserIds(roles);
  if (userIds.length === 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[calendar-tokens helper] no Keycloak userId resolved for roles=${roles.join(',')} — nothing to purge`,
    );
    return;
  }
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? '' }),
  });
  try {
    await prisma.calendarToken.deleteMany({
      where: { schoolId, userId: { in: userIds } },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `[calendar-tokens helper] purgeCalendarTokensForRoles failed for roles=${roles.join(',')}:`,
      err,
    );
  } finally {
    await prisma.$disconnect();
  }
}
