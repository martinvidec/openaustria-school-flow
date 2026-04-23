/**
 * Phase 11 Plan 11-03 Task 2 — API fixture for SUBJECT-05 Orphan-Guard 409.
 *
 * Creates a Subject + a ClassSubject referencing it, then returns the
 * cleanup hook. Mirrors the Prisma 7 driver-adapter pattern from
 * `orphan-year.ts` — direct Prisma access is required because only the
 * /subjects/:id/classes endpoint attaches a ClassSubject, but we need the
 * SubjectService.remove call to hit the 409 branch.
 *
 * Why not use the REST endpoint `POST /subjects/:id/classes`? We could,
 * and Phase 11 Plan 11-03 Task 2 does use the REST path because it keeps
 * the fixture network-driven (no Prisma coupling). The Prisma adapter is
 * still brought in for cleanup ordering — DELETE class-subjects first,
 * then DELETE subject, to avoid the 409 recursion on teardown.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from '../helpers/login';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

export interface SubjectWithRefsFixture {
  subjectId: string;
  subjectName: string;
  classId: string;
  classSubjectId?: string;
  cleanup: () => Promise<void>;
}

/**
 * Seed a Subject + attach it to the first SchoolClass of the given school.
 * Returns the created IDs and a cleanup handle that reverses the attach
 * (via DELETE /subjects/:id/classes/:classId) then deletes the subject.
 *
 * The returned `subjectId` can be DELETEd to trigger SubjectService.remove's
 * Orphan-Guard 409 path — that's the SUBJECT-05 canonical test case.
 */
export async function seedSubjectWithClassRef(
  request: APIRequestContext,
  schoolId: string,
): Promise<SubjectWithRefsFixture> {
  const token = await getAdminToken(request);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const ts = Date.now();
  const subjectName = `E2E-SUB-WITH-REFS-${ts}`;
  // Kürzel max 10 chars + deterministic uniqueness using last 5 digits of ts.
  const shortName = `EWR${ts % 100000}`;

  // 1. Create the Subject.
  const subjectRes = await request.post(`${API}/subjects`, {
    headers,
    data: {
      schoolId,
      name: subjectName,
      shortName,
      subjectType: 'PFLICHT',
    },
  });
  expect(subjectRes.ok(), `POST /subjects seed (${subjectName})`).toBeTruthy();
  const subject = (await subjectRes.json()) as { id: string };

  // 2. Find an existing school class — use /classes?schoolId= so we don't
  //    have to create one ourselves (the seed ships `seed-class-1a` +
  //    `seed-class-1b`).
  const classesRes = await request.get(
    `${API}/classes?schoolId=${schoolId}&limit=10`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(classesRes.ok(), `GET /classes?schoolId=${schoolId}`).toBeTruthy();
  const classesBody = (await classesRes.json()) as {
    data?: Array<{ id: string; name: string }>;
  };
  const firstClass = classesBody.data?.[0];
  expect(firstClass, 'at least one school class in seed').toBeTruthy();
  const classId = firstClass!.id;

  // 3. Attach the subject to the class — POST /subjects/:id/classes
  //    (subject.controller.ts:118). Creates a ClassSubject row.
  const csRes = await request.post(
    `${API}/subjects/${subject.id}/classes`,
    {
      headers,
      data: { classId, weeklyHours: 2 },
    },
  );
  expect(csRes.ok(), `POST /subjects/${subject.id}/classes`).toBeTruthy();
  const classSubject = (await csRes.json()) as { id?: string };

  const cleanup = async () => {
    // Reverse: delete the class-subject attachment first, then the subject.
    // DELETE /subjects/:id/classes/:classId removes the ClassSubject row,
    // which turns the subject orphan-safe for the subsequent delete.
    await request.delete(
      `${API}/subjects/${subject.id}/classes/${classId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    await request.delete(`${API}/subjects/${subject.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return {
    subjectId: subject.id,
    subjectName,
    classId,
    classSubjectId: classSubject.id,
    cleanup,
  };
}
