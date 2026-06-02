#!/usr/bin/env tsx
/**
 * #175 — Regenerate the bulk-user block in docker/keycloak/realm-export.json
 * from `apps/api/prisma/seed-data.ts`.
 *
 * Idempotent: Bulk + parallel-legacy users carry
 *   `attributes.managed_by_seed = ["175"]`
 * so the script removes any prior managed entries before writing fresh
 * ones. The 5 real legacy users (admin-user/lehrer-user/eltern-user/
 * schueler-user/schulleitung-user) and the `service-account-schoolflow-
 * admin-api` entry have no such marker and are preserved untouched.
 *
 * Usage:
 *   pnpm tsx scripts/generate-realm-users.ts          # write
 *   pnpm tsx scripts/generate-realm-users.ts --dry    # print summary only
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildBulkSchoolData,
  DEMO_PASSWORD,
  getBulkSchulleitung,
  getBulkTeachers,
  getParallelLegacyUsers,
} from '../apps/api/prisma/seed-data';

const REPO_ROOT = resolve(__dirname, '..');
const REALM_PATH = resolve(REPO_ROOT, 'docker/keycloak/realm-export.json');

const MANAGED_MARKER_KEY = 'managed_by_seed';
const MANAGED_MARKER_VAL = '175';

interface KcUser {
  id?: string;
  username?: string;
  email?: string;
  enabled?: boolean;
  emailVerified?: boolean;
  firstName?: string;
  lastName?: string;
  credentials?: Array<{ type: string; value: string; temporary?: boolean }>;
  realmRoles?: string[];
  attributes?: Record<string, string[]>;
  serviceAccountClientId?: string;
  clientRoles?: Record<string, string[]>;
}

function isManaged(u: KcUser): boolean {
  return Array.isArray(u.attributes?.[MANAGED_MARKER_KEY])
    && u.attributes![MANAGED_MARKER_KEY].includes(MANAGED_MARKER_VAL);
}

function emailFor(username: string): string {
  return `${username}@demo.schoolflow.dev`;
}

function buildKcUser(args: {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  email?: string;
  realmRole: 'admin' | 'schulleitung' | 'lehrer' | 'eltern' | 'schueler';
}): KcUser {
  return {
    id: args.id,
    username: args.username,
    email: args.email ?? emailFor(args.username),
    enabled: true,
    emailVerified: true,
    firstName: args.firstName,
    lastName: args.lastName,
    credentials: [{ type: 'password', value: DEMO_PASSWORD, temporary: false }],
    realmRoles: [args.realmRole],
    attributes: { [MANAGED_MARKER_KEY]: [MANAGED_MARKER_VAL] },
  };
}

function main(): void {
  const dryRun = process.argv.includes('--dry');

  // 1. Read existing realm-export.json
  const raw = readFileSync(REALM_PATH, 'utf-8');
  const realm = JSON.parse(raw) as { users?: KcUser[] };
  if (!Array.isArray(realm.users)) {
    throw new Error('realm-export.json has no users[] array');
  }

  // 2. Filter out managed users (will be regenerated)
  const preserved = realm.users.filter((u) => !isManaged(u));
  const removed = realm.users.length - preserved.length;

  // 3. Build fresh bulk + parallel-legacy users from seed-data
  const fresh: KcUser[] = [];

  // 3a. 5 parallel kc-* legacy mirrors
  for (const u of getParallelLegacyUsers()) {
    fresh.push(buildKcUser({
      id: u.kcUuid,
      username: u.kcUsername,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      realmRole: u.role,
    }));
  }

  // 3b. 1 schulleitung-01
  const sl = getBulkSchulleitung();
  fresh.push(buildKcUser({
    id: sl.kcUuid,
    username: sl.kcUsername,
    firstName: sl.firstName,
    lastName: sl.lastName,
    realmRole: 'schulleitung',
  }));

  // 3c. 32 bulk teachers
  for (const t of getBulkTeachers()) {
    fresh.push(buildKcUser({
      id: t.kcUuid,
      username: t.kcUsername,
      firstName: t.firstName,
      lastName: t.lastName,
      realmRole: 'lehrer',
    }));
  }

  // 3d. 336 students + 622 parents
  const { students, families } = buildBulkSchoolData();
  for (const s of students) {
    fresh.push(buildKcUser({
      id: s.kcUuid,
      username: s.kcUsername,
      firstName: s.firstName,
      lastName: s.lastName,
      realmRole: 'schueler',
    }));
  }
  for (const f of families) {
    fresh.push(buildKcUser({
      id: f.mother.kcUuid,
      username: f.mother.kcUsername,
      firstName: f.mother.firstName,
      lastName: f.mother.lastName,
      realmRole: 'eltern',
    }));
    fresh.push(buildKcUser({
      id: f.father.kcUuid,
      username: f.father.kcUsername,
      firstName: f.father.firstName,
      lastName: f.father.lastName,
      realmRole: 'eltern',
    }));
  }

  // 4. Compose final user list: preserved + fresh
  realm.users = [...preserved, ...fresh];

  // 5. Summary
  const summary = {
    realmPath: REALM_PATH,
    preserved: preserved.length,
    removed,
    fresh: fresh.length,
    total: realm.users.length,
    breakdown: {
      parallelLegacy: getParallelLegacyUsers().length,
      schulleitung: 1,
      teachers: getBulkTeachers().length,
      students: students.length,
      parents: families.length * 2,
    },
  };
  console.log('Realm-export users:');
  console.log(JSON.stringify(summary, null, 2));

  if (dryRun) {
    console.log('\n--dry: not writing file.');
    return;
  }

  // 6. Write back with stable formatting (2-space indent matches existing file)
  writeFileSync(REALM_PATH, JSON.stringify(realm, null, 2) + '\n', 'utf-8');
  console.log(`\nWrote ${REALM_PATH}`);
}

main();
