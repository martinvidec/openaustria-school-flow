/**
 * Phase 11 Plan 11-03 — shared teacher API helpers.
 *
 * Extracted into a non-spec helper so sibling teacher specs can reuse the
 * `createTeacherViaAPI` seeding + `cleanupE2ETeachers` prefix-based cleanup
 * without Playwright's "spec files should not import each other" guard.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
import { SEED_SCHOOL_UUID } from './seed-ids';

export const TEACHER_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const TEACHER_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;
export const TEACHER_PREFIX = 'E2E-TEA-';

export async function createTeacherViaAPI(
  request: APIRequestContext,
  fields: {
    firstName: string;
    lastName: string;
    email: string;
    werteinheitenTarget?: number;
  },
): Promise<{ id: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(`${TEACHER_API}/teachers`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      schoolId: TEACHER_SCHOOL_ID,
      firstName: fields.firstName,
      lastName: fields.lastName,
      email: fields.email,
      ...(fields.werteinheitenTarget !== undefined
        ? { werteinheitenTarget: fields.werteinheitenTarget }
        : {}),
    },
  });
  expect(res.ok(), `POST /teachers seed (${fields.firstName})`).toBeTruthy();
  // Backend returns Person with nested teacher — unwrap (matches the web
  // hook's behaviour in useTeachers.ts:220-221).
  const body = (await res.json()) as {
    id?: string;
    teacher?: { id: string };
  };
  const id = body.teacher?.id ?? body.id;
  expect(id, 'teacher id').toBeTruthy();
  return { id: id! };
}

/**
 * Best-effort API-level cleanup — iterates GET /teachers and deletes every
 * row whose `person.firstName` starts with the given prefix (default
 * `E2E-TEA-`). Leaves pre-existing seed data untouched.
 */
export async function cleanupE2ETeachers(
  request: APIRequestContext,
  prefix: string = TEACHER_PREFIX,
): Promise<void> {
  const token = await getAdminToken(request);
  const listRes = await request.get(
    `${TEACHER_API}/teachers?schoolId=${TEACHER_SCHOOL_ID}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok()) return;
  const body = (await listRes.json()) as {
    data?: Array<{ id: string; person?: { firstName?: string } }>;
  };
  const teachers = body.data ?? [];
  await Promise.all(
    teachers
      .filter((t) => (t.person?.firstName ?? '').startsWith(prefix))
      .map((t) =>
        request.delete(`${TEACHER_API}/teachers/${t.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
  );
}
