/**
 * Phase 12 Plan 12-03 — shared student / class API helpers.
 *
 * Mirrors `helpers/teachers.ts` + `helpers/subjects.ts` patterns:
 *   - admin-token-gated seeding via POST /students, /classes
 *   - prefix-isolated cleanup so specs can safely sweep by firstName/name prefix
 *   - constant school id + API base URL with env overrides
 *
 * Naming convention (UI-SPEC §9.3 + 12-03-PLAN.md):
 *   - Student desktop specs: `E2E-STD-<SUFFIX>-<ts>`
 *   - Student mobile specs:  `E2E-STD-MOBILE-<SUFFIX>-<ts>`
 *   - Class desktop specs:   `E2E-CLS-<SUFFIX>-<ts>`
 *   - Class mobile specs:    `E2E-CLS-MOBILE-<SUFFIX>-<ts>`
 *   - Parent search fixture: `E2E-PARENT-EXISTING-<ts>`
 *
 * Each spec uses a distinct <SUFFIX> so parallel workers don't sweep each
 * other's rows (same rationale as Phase 11-03 E2E-TEA-CRUD- / E2E-TEA-ERR-).
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from './login';

export const STUDENT_API =
  process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
export const STUDENT_SCHOOL_ID =
  process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt';

export const STUDENT_PREFIX = 'E2E-STD-';
export const CLASS_PREFIX = 'E2E-CLS-';
export const PARENT_PREFIX = 'E2E-PARENT-';

// ─── Students ─────────────────────────────────────────────────────────────

export async function createStudentViaAPI(
  request: APIRequestContext,
  fields: {
    firstName: string;
    lastName: string;
    classId?: string;
    email?: string;
    studentNumber?: string;
  },
): Promise<{ id: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(`${STUDENT_API}/students`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      schoolId: STUDENT_SCHOOL_ID,
      firstName: fields.firstName,
      lastName: fields.lastName,
      classId: fields.classId,
      email: fields.email,
      studentNumber: fields.studentNumber,
    },
  });
  expect(res.ok(), `POST /students seed (${fields.firstName})`).toBeTruthy();
  const body = (await res.json()) as {
    id?: string;
    student?: { id: string };
  };
  const id = body.student?.id ?? body.id;
  expect(id, 'student id').toBeTruthy();
  return { id: id! };
}

/** Best-effort DELETE every Student whose `person.firstName` starts with the given prefix. */
export async function cleanupE2EStudents(
  request: APIRequestContext,
  prefix: string = STUDENT_PREFIX,
): Promise<void> {
  const token = await getAdminToken(request);
  // Also sweep archived students so restore tests don't leave rows behind.
  for (const archived of ['active', 'archived', 'all']) {
    const listRes = await request.get(
      `${STUDENT_API}/students?schoolId=${STUDENT_SCHOOL_ID}&limit=200&archived=${archived}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!listRes.ok()) continue;
    const body = (await listRes.json()) as {
      data?: Array<{ id: string; person?: { firstName?: string } }>;
    };
    const students = body.data ?? [];
    await Promise.all(
      students
        .filter((s) => (s.person?.firstName ?? '').startsWith(prefix))
        .map((s) =>
          request.delete(`${STUDENT_API}/students/${s.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ),
    );
  }
}

// ─── Classes ──────────────────────────────────────────────────────────────

export async function createClassViaAPI(
  request: APIRequestContext,
  fields: {
    name: string;
    yearLevel?: number;
    schoolYearId?: string;
    klassenvorstandId?: string;
  },
): Promise<{ id: string; schoolYearId: string }> {
  const token = await getAdminToken(request);
  let schoolYearId = fields.schoolYearId;
  if (!schoolYearId) {
    // School years are exposed under the nested /schools/:schoolId/school-years
    // path (not a flat /school-years collection).
    const syRes = await request.get(
      `${STUDENT_API}/schools/${STUDENT_SCHOOL_ID}/school-years`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    expect(syRes.ok(), `GET /schools/:id/school-years`).toBeTruthy();
    const years = (await syRes.json()) as Array<{ id: string; isActive?: boolean }>;
    const active = years.find((y) => y.isActive) ?? years[0];
    schoolYearId = active?.id;
    expect(schoolYearId, 'active school year id').toBeTruthy();
  }
  const res = await request.post(`${STUDENT_API}/classes`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    data: {
      schoolId: STUDENT_SCHOOL_ID,
      name: fields.name,
      yearLevel: fields.yearLevel ?? 5,
      schoolYearId,
      klassenvorstandId: fields.klassenvorstandId,
    },
  });
  if (!res.ok()) {
    const errBody = await res.text().catch(() => '<no body>');
    throw new Error(
      `POST /classes seed (${fields.name}) failed ${res.status()}: ${errBody}`,
    );
  }
  const body = (await res.json()) as { id: string };
  return { id: body.id, schoolYearId: schoolYearId! };
}

/** Best-effort DELETE every Class whose `name` starts with the given prefix. */
export async function cleanupE2EClasses(
  request: APIRequestContext,
  prefix: string = CLASS_PREFIX,
): Promise<void> {
  const token = await getAdminToken(request);
  const listRes = await request.get(
    `${STUDENT_API}/classes?schoolId=${STUDENT_SCHOOL_ID}&limit=200`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok()) return;
  const body = (await listRes.json()) as {
    data?: Array<{ id: string; name: string }>;
  };
  const classes = body.data ?? [];
  // Pre-delete any students attached to the target classes so the class DELETE
  // doesn't 409 on the Orphan-Guard. Fetches active students for each match.
  for (const cls of classes.filter((c) => (c.name ?? '').startsWith(prefix))) {
    const sRes = await request.get(
      `${STUDENT_API}/students?schoolId=${STUDENT_SCHOOL_ID}&classId=${cls.id}&limit=100`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (sRes.ok()) {
      const sBody = (await sRes.json()) as { data?: Array<{ id: string }> };
      for (const s of sBody.data ?? []) {
        await request.delete(`${STUDENT_API}/students/${s.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
    await request.delete(`${STUDENT_API}/classes/${cls.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
}

// ─── Parents ──────────────────────────────────────────────────────────────

/** Best-effort DELETE every Parent whose `person.firstName` starts with the given prefix. */
export async function cleanupE2EParents(
  request: APIRequestContext,
  prefix: string = PARENT_PREFIX,
): Promise<void> {
  const token = await getAdminToken(request);
  const listRes = await request.get(
    `${STUDENT_API}/parents?schoolId=${STUDENT_SCHOOL_ID}&limit=200`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!listRes.ok()) return;
  const body = (await listRes.json()) as {
    data?: Array<{ id: string; person?: { firstName?: string } }>;
  };
  const parents = body.data ?? [];
  await Promise.all(
    parents
      .filter((p) => (p.person?.firstName ?? '').startsWith(prefix))
      .map((p) =>
        request.delete(`${STUDENT_API}/parents/${p.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ),
  );
}
