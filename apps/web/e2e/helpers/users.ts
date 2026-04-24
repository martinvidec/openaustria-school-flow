/**
 * Phase 13 Plan 13-03 — shared user / override / person-link API helpers.
 *
 * Extracted into a non-spec helper so Phase 13 E2E specs can reuse the
 * seeding + cleanup primitives without violating Playwright's
 * "spec files should not import each other" guard.
 *
 * Prefix isolation (matches Phase 11 E2E-TEA-CRUD- pattern):
 *   - Override reasons seeded by E2E rows use prefix `E2E-USR-`
 *   - cleanupE2EOverrides(request, userId, prefix) deletes rows whose reason
 *     startsWith the given prefix
 *
 * Public REST only — no Prisma imports. This keeps the helper portable and
 * matches Phase 11/12 E2E philosophy (drive the system through its public
 * contract).
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';

export const USER_API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const USER_PREFIX = 'E2E-USR-';

type SeedRole = 'admin' | 'schulleitung' | 'lehrer' | 'eltern' | 'schueler';

/**
 * Seed credential username -> role mapping.
 * Mirrors apps/api/prisma/seed.ts + docker/keycloak/realm-export.json.
 */
const SEED_USERNAME: Record<SeedRole, string> = {
  admin: 'admin-user',
  schulleitung: 'schulleitung-user',
  lehrer: 'lehrer-user',
  eltern: 'eltern-user',
  schueler: 'schueler-user',
};

type UserDirectorySummary = {
  id: string;
  email: string;
  username: string;
  enabled: boolean;
  firstName: string;
  lastName: string;
  roles: string[];
  personLink: {
    id: string;
    personType: string;
    firstName: string;
    lastName: string;
  } | null;
};

type PermissionOverrideRow = {
  id: string;
  userId: string;
  action: string;
  subject: string;
  granted: boolean;
  conditions: Record<string, unknown> | null;
  reason: string | null;
};

/**
 * Resolve a seed user's Keycloak sub by username via GET /admin/users.
 * Filters the response by exact username match — KC search is substring,
 * so we narrow client-side.
 */
export async function getSeedUserId(
  request: APIRequestContext,
  role: SeedRole,
): Promise<string> {
  const token = await getAdminToken(request);
  const username = SEED_USERNAME[role];
  const res = await request.get(
    `${USER_API}/admin/users?search=${encodeURIComponent(username)}&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(res.ok(), `GET /admin/users (search=${username})`).toBeTruthy();
  const body = (await res.json()) as { data?: UserDirectorySummary[] };
  const match = (body.data ?? []).find((u) => u.username === username);
  expect(
    match,
    `seed user with username=${username} not found via /admin/users — was prisma:seed run?`,
  ).toBeTruthy();
  return match!.id;
}

/** GET /admin/users/:userId/roles → string[] */
export async function getUserRoles(
  request: APIRequestContext,
  userId: string,
): Promise<string[]> {
  const token = await getAdminToken(request);
  const res = await request.get(`${USER_API}/admin/users/${userId}/roles`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET /admin/users/${userId}/roles`).toBeTruthy();
  const body = (await res.json()) as { roles?: string[] };
  return body.roles ?? [];
}

/**
 * PUT /admin/users/:userId/roles. Returns the raw response wrapper —
 * non-2xx responses do NOT throw so error-path specs can inspect status/body.
 */
export async function setUserRoles(
  request: APIRequestContext,
  userId: string,
  roleNames: string[],
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const token = await getAdminToken(request);
  const res = await request.put(`${USER_API}/admin/users/${userId}/roles`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: { roleNames },
  });
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty body on 204 etc. */
  }
  return { ok: res.ok(), status: res.status(), body };
}

/** Helper: ensure userId still has admin role (e.g. afterEach restoration). */
export async function ensureUserIsAdmin(
  request: APIRequestContext,
  userId: string,
): Promise<void> {
  const current = await getUserRoles(request, userId).catch(() => [] as string[]);
  if (current.includes('admin')) return;
  await setUserRoles(request, userId, [...current, 'admin']);
}

/** POST /admin/permission-overrides — asserts ok(); returns { id }. */
export async function createPermissionOverrideViaAPI(
  request: APIRequestContext,
  input: {
    userId: string;
    action: string;
    subject: string;
    granted: boolean;
    conditions?: Record<string, unknown> | null;
    reason: string;
  },
): Promise<{ id: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(`${USER_API}/admin/permission-overrides`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      userId: input.userId,
      action: input.action,
      subject: input.subject,
      granted: input.granted,
      conditions: input.conditions ?? null,
      reason: input.reason,
    },
  });
  if (!res.ok()) {
    const errBody = await res.text().catch(() => '<no body>');
    throw new Error(
      `POST /admin/permission-overrides seed failed ${res.status()}: ${errBody}`,
    );
  }
  const body = (await res.json()) as { id?: string };
  expect(body.id, 'override id').toBeTruthy();
  return { id: body.id! };
}

/** GET /admin/permission-overrides?userId= → array of overrides for the user. */
export async function getPermissionOverrides(
  request: APIRequestContext,
  userId: string,
): Promise<PermissionOverrideRow[]> {
  const token = await getAdminToken(request);
  const res = await request.get(
    `${USER_API}/admin/permission-overrides?userId=${userId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok()) return [];
  const body = (await res.json()) as PermissionOverrideRow[] | { data?: PermissionOverrideRow[] };
  if (Array.isArray(body)) return body;
  return body.data ?? [];
}

/** DELETE /admin/permission-overrides/:id — idempotent (404 OK). */
export async function deletePermissionOverrideViaAPI(
  request: APIRequestContext,
  overrideId: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const res = await request.delete(
    `${USER_API}/admin/permission-overrides/${overrideId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  // Accept 200/204 OR 404 (idempotent cleanup).
  expect(
    res.ok() || res.status() === 404,
    `DELETE /admin/permission-overrides/${overrideId} (status=${res.status()})`,
  ).toBeTruthy();
}

/**
 * Sweep every override for `userId` whose `reason` startsWith `prefix`.
 * Leaves non-E2E rows untouched.
 */
export async function cleanupE2EOverrides(
  request: APIRequestContext,
  userId: string,
  prefix: string = USER_PREFIX,
): Promise<void> {
  const overrides = await getPermissionOverrides(request, userId);
  for (const o of overrides) {
    if ((o.reason ?? '').startsWith(prefix)) {
      await deletePermissionOverrideViaAPI(request, o.id).catch(() => {});
    }
  }
}

/** POST /admin/users/:userId/link-person — returns ok/status (specs check both). */
export async function linkPersonViaAPI(
  request: APIRequestContext,
  userId: string,
  personType: 'TEACHER' | 'STUDENT' | 'PARENT',
  personId: string,
): Promise<{ ok: boolean; status: number; body: unknown }> {
  const token = await getAdminToken(request);
  const res = await request.post(
    `${USER_API}/admin/users/${userId}/link-person`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { personType, personId },
    },
  );
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* empty */
  }
  return { ok: res.ok(), status: res.status(), body };
}

/** DELETE /admin/users/:userId/link-person — idempotent (204 or 404 OK). */
export async function unlinkPersonViaAPI(
  request: APIRequestContext,
  userId: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const res = await request.delete(
    `${USER_API}/admin/users/${userId}/link-person`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(
    res.ok() || res.status() === 404,
    `DELETE /admin/users/${userId}/link-person (status=${res.status()})`,
  ).toBeTruthy();
}

/**
 * Find the first Teacher whose `person.keycloakUserId` is null.
 * Throws if none — caller is expected to fall back to createTeacherViaAPI.
 *
 * Uses the canonical /teachers controller (NOT /admin/teachers) — the
 * teachers module mounts under a flat path; see helpers/teachers.ts.
 */
export async function findUnlinkedTeacher(
  request: APIRequestContext,
): Promise<{ id: string; firstName: string; lastName: string }> {
  const token = await getAdminToken(request);
  const schoolId = process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';
  const res = await request.get(
    `${USER_API}/teachers?schoolId=${schoolId}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(res.ok(), 'GET /teachers').toBeTruthy();
  const body = (await res.json()) as {
    data?: Array<{
      id: string;
      person?: {
        keycloakUserId?: string | null;
        firstName?: string;
        lastName?: string;
      };
    }>;
  };
  const teachers = body.data ?? [];
  const unlinked = teachers.find(
    (t) => t.person && (t.person.keycloakUserId == null || t.person.keycloakUserId === ''),
  );
  if (!unlinked) {
    throw new Error('findUnlinkedTeacher: no teacher with null keycloakUserId in seed');
  }
  return {
    id: unlinked.id,
    firstName: unlinked.person?.firstName ?? '',
    lastName: unlinked.person?.lastName ?? '',
  };
}
