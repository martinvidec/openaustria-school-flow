/**
 * Phase 11 Plan 11-03 — shared subject API helpers.
 *
 * Extracted so subject specs can reuse the seed + prefix-based cleanup
 * without Playwright's "spec files should not import each other" guard.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';
import { SEED_SCHOOL_UUID } from './seed-ids';

export const SUBJECT_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const SUBJECT_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? SEED_SCHOOL_UUID;
export const SUBJECT_PREFIX = 'E2E-SUB-';

/**
 * Seed a Subject with a unique Name + Kürzel via POST /subjects. Returns
 * the created id. Uses the caller-supplied prefix for traceability +
 * per-spec cleanup isolation.
 */
export async function createSubjectViaAPI(
  request: APIRequestContext,
  fields: { name: string; shortName: string },
): Promise<{ id: string; name: string; shortName: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(`${SUBJECT_API}/subjects`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      schoolId: SUBJECT_SCHOOL_ID,
      name: fields.name,
      shortName: fields.shortName,
      subjectType: 'PFLICHT',
    },
  });
  expect(res.ok(), `POST /subjects seed (${fields.name})`).toBeTruthy();
  const body = (await res.json()) as {
    id: string;
    name: string;
    shortName: string;
  };
  return body;
}

/**
 * Best-effort API-level cleanup — iterates GET /subjects and deletes every
 * row whose `name` starts with the given prefix (default `E2E-SUB-`).
 * Leaves pre-existing seed subjects untouched. Swallows 409s (a Subject may
 * still be attached to a ClassSubject from a concurrent test — worst case
 * is a row left behind until the next-run cleanup).
 */
export async function cleanupE2ESubjects(
  request: APIRequestContext,
  prefix: string = SUBJECT_PREFIX,
): Promise<void> {
  const token = await getAdminToken(request);
  const listRes = await request.get(
    `${SUBJECT_API}/subjects?schoolId=${SUBJECT_SCHOOL_ID}&limit=100`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok()) return;
  const body = (await listRes.json()) as {
    data?: Array<{ id: string; name: string }>;
  };
  const subjects = body.data ?? [];
  await Promise.all(
    subjects
      .filter((s) => (s.name ?? '').startsWith(prefix))
      .map((s) =>
        request.delete(`${SUBJECT_API}/subjects/${s.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
  );
}
