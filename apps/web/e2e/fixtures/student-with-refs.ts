/**
 * Phase 12 Plan 12-03 — fixture for STUDENT-02 Orphan-Guard 409.
 *
 * Creates a Student + a ParentStudent link so DELETE /students/:id
 * returns 409 with extensions.affectedEntities.parentLinkCount > 0.
 *
 * Rationale: AttendanceRecord / GradeEntry / StudentNote / AbsenceExcuse
 * are all lesson-scoped and don't have generic create endpoints exposed
 * via REST. The simplest way to trigger the StudentService Orphan-Guard
 * is to attach a Parent via POST /students/:id/parents — that counter
 * flips the guard to BLOCKED. Plan 12-01 StudentService counts all six
 * referrer types; one non-zero counter is sufficient for the 409 path.
 *
 * Convention mirrors Phase 11 subject-with-refs.ts (admin token,
 * prefix-isolated names, deterministic cleanup ordering).
 */
import { expect, type APIRequestContext } from '@playwright/test';
import { getAdminToken } from '../helpers/login';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

export interface StudentWithRefsFixture {
  studentId: string;
  parentId: string;
  studentName: string;
  cleanup: () => Promise<void>;
}

/**
 * Seed a Student + link a fresh Parent via POST /students/:id/parents.
 * The ParentStudent row is one of the six Orphan-Guard counters in
 * StudentService.remove, so DELETE /students/:studentId returns 409.
 *
 * Cleanup order: unlink the ParentStudent first, then delete the
 * Student, then the Parent — otherwise either DELETE also 409s.
 */
export async function seedStudentWithRefs(
  request: APIRequestContext,
  schoolId: string,
): Promise<StudentWithRefsFixture> {
  const token = await getAdminToken(request);
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
  const ts = Date.now();
  const studentName = `E2E-STD-WITH-REFS-${ts}`;

  // 1. Create the Parent first.
  const parentRes = await request.post(`${API}/parents`, {
    headers,
    data: {
      schoolId,
      firstName: 'E2E-STD-WITH-REFS-Parent',
      lastName: `${ts}`,
      email: `e2e-std-refs-${ts}@example.test`,
    },
  });
  expect(parentRes.ok(), `POST /parents seed (${studentName})`).toBeTruthy();
  const parentBody = (await parentRes.json()) as {
    id?: string;
    parent?: { id: string };
  };
  const parentId = parentBody.parent?.id ?? parentBody.id;
  expect(parentId, 'parent id').toBeTruthy();

  // 2. Create the Student — empty parentIds here; link via dedicated
  //    endpoint below so the fixture works regardless of whether the
  //    create endpoint supports inline parent linking.
  const studentRes = await request.post(`${API}/students`, {
    headers,
    data: {
      schoolId,
      firstName: studentName,
      lastName: `${ts}`,
    },
  });
  expect(studentRes.ok(), `POST /students seed (${studentName})`).toBeTruthy();
  const studentBody = (await studentRes.json()) as {
    id?: string;
    student?: { id: string };
  };
  const studentId = studentBody.student?.id ?? studentBody.id;
  expect(studentId, 'student id').toBeTruthy();

  // 3. Link the Parent → creates a ParentStudent row which the
  //    Orphan-Guard counts in `parentLinkCount`.
  const linkRes = await request.post(`${API}/students/${studentId}/parents`, {
    headers,
    data: { parentId },
  });
  expect(linkRes.ok(), `POST /students/${studentId}/parents`).toBeTruthy();

  const cleanup = async () => {
    // Unlink first so the Student DELETE doesn't 409 on its own fixture.
    await request.delete(
      `${API}/students/${studentId}/parents/${parentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    await request.delete(`${API}/students/${studentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    await request.delete(`${API}/parents/${parentId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return {
    studentId: studentId!,
    parentId: parentId!,
    studentName,
    cleanup,
  };
}

/**
 * Alternative cleanup entry point for specs that want to teardown via an
 * explicit refs object (mirrors the subject-with-refs pattern).
 */
export async function cleanupStudentWithRefs(
  request: APIRequestContext,
  refs: { studentId: string; parentId: string },
): Promise<void> {
  const token = await getAdminToken(request);
  await request.delete(
    `${API}/students/${refs.studentId}/parents/${refs.parentId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  await request.delete(`${API}/students/${refs.studentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  await request.delete(`${API}/parents/${refs.parentId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}
