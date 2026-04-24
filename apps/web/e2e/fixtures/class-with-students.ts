/**
 * Phase 12 Plan 12-03 — fixture for CLASS-02 Orphan-Guard 409.
 *
 * Creates a Class + N active Students with classId set → DELETE /classes/:id
 * returns 409 with extensions.affectedEntities.activeStudentCount >= N.
 *
 * Plan 12-02 ClassService.remove counts active Students + ClassSubject +
 * Group + GroupMembership + TimetableLesson + GroupDerivationRule. Active
 * students alone are sufficient to flip the guard to BLOCKED.
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from '../helpers/login';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

export interface ClassWithStudentsFixture {
  classId: string;
  className: string;
  studentIds: string[];
  schoolYearId: string;
  cleanup: () => Promise<void>;
}

/**
 * Seed a Class + `count` active Students with classId set. Returns IDs
 * for assertions + a cleanup hook that deletes students first, then
 * the class (order matters — DELETE /classes/:id would 409 otherwise).
 *
 * @param schoolId — the seed school UUID (`seed-school-bgbrg-musterstadt`
 *                   by default).
 * @param count   — number of students to attach (default 2). Orphan-Guard
 *                   only needs ≥1 but 2 verifies the count display.
 */
export async function seedClassWithActiveStudents(
  request: APIRequestContext,
  schoolId: string,
  count = 2,
): Promise<ClassWithStudentsFixture> {
  const token = await getAdminToken(request);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const ts = Date.now();

  // 1. Find the active school year — the class POST requires one.
  const syRes = await request.get(
    `${API}/school-years?schoolId=${schoolId}&isActive=true`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(syRes.ok(), `GET /school-years?isActive=true`).toBeTruthy();
  const syBody = (await syRes.json()) as { data?: Array<{ id: string }> };
  const schoolYearId = syBody.data?.[0]?.id;
  expect(schoolYearId, 'active school year id').toBeTruthy();

  // 2. Create the Class. Phase 12-02 class.controller accepts
  //    { schoolId, name, yearLevel, schoolYearId }.
  const className = `E2E-CLS-WITH-STUDENTS-${ts}`;
  const classRes = await request.post(`${API}/classes`, {
    headers,
    data: {
      schoolId,
      name: className,
      yearLevel: 5,
      schoolYearId,
    },
  });
  expect(classRes.ok(), `POST /classes seed (${className})`).toBeTruthy();
  const classBody = (await classRes.json()) as { id?: string };
  const classId = classBody.id;
  expect(classId, 'class id').toBeTruthy();

  // 3. Create N students and link to the class via classId field.
  const studentIds: string[] = [];
  for (let i = 0; i < count; i++) {
    const sRes = await request.post(`${API}/students`, {
      headers,
      data: {
        schoolId,
        firstName: `E2E-CLS-STUDENT-${i}-${ts}`,
        lastName: `${ts}`,
        classId,
      },
    });
    expect(sRes.ok(), `POST /students #${i}`).toBeTruthy();
    const sBody = (await sRes.json()) as { id?: string; student?: { id: string } };
    const sid = sBody.student?.id ?? sBody.id;
    expect(sid, `student ${i} id`).toBeTruthy();
    studentIds.push(sid!);
  }

  const cleanup = async () => {
    // Delete students first so the Class DELETE can succeed.
    for (const sid of studentIds) {
      await request.delete(`${API}/students/${sid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
    await request.delete(`${API}/classes/${classId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return {
    classId: classId!,
    className,
    studentIds,
    schoolYearId: schoolYearId!,
    cleanup,
  };
}

/** Cleanup helper when spec does not keep the full fixture object. */
export async function cleanupClassWithStudents(
  request: APIRequestContext,
  refs: { classId: string; studentIds: string[] },
): Promise<void> {
  const token = await getAdminToken(request);
  for (const sid of refs.studentIds) {
    await request.delete(`${API}/students/${sid}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }
  await request.delete(`${API}/classes/${refs.classId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
