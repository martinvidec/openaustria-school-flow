/**
 * Issue #71 — Stundentafel teacher assignment.
 *
 * Issue #152 (Phase 3.5/5) — migrated to throwaway-school per CLAUDE.md D4.
 * The `admin-stundentafel-teacher-assignment:` and
 * `e2e-rows-on-seed-school:` advisory locks are gone; each spec owns its
 * own throwaway School so the cleanup-by-prefix race can no longer fire.
 *
 * Covers the per-ClassSubject teacher picker shipped in the teacherId PR:
 *   - E2E-CLS-TEACHER-ASSIGN: open Stundentafel tab, pick a teacher for
 *     the first row, save → PUT body carries the chosen teacherId for
 *     that row, value persists across reload.
 *   - E2E-CLS-TEACHER-CLEAR:  pre-assigned row → "Nicht zugewiesen" →
 *     save → PUT body teacherId=null, DB reflects clear.
 *
 * DOM contract:
 *   - StundentafelEditorTable.tsx — per row a `<SelectTrigger
 *     data-testid="stundentafel-teacher-${shortName}" aria-label="…">`.
 *   - Sentinel `__no_teacher__` clears the assignment (Radix Select
 *     does not accept empty string as a value).
 *
 * Throwaway-school provides exactly ONE Teacher (via `withTimetableStack`).
 * The spec picks that lone teacher as the target — the dropdown will
 * show two options ("Nicht zugewiesen" + the fixture Teacher) which is
 * sufficient to exercise both assign and clear flows.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { getAdminToken, loginAsRole } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

const PREFIX = 'E2E-TA-';
const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

interface ClassSubjectRow {
  id: string;
  subjectId: string;
  teacherId: string | null;
  subject: { id: string; shortName: string };
  teacher?: { id: string; person: { firstName: string; lastName: string } } | null;
}

async function createClass(
  request: APIRequestContext,
  schoolId: string,
  schoolYearId: string,
  fields: { name: string; yearLevel: number },
): Promise<{ id: string; name: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(`${API}/classes`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-School-Id': schoolId,
      'Content-Type': 'application/json',
    },
    data: {
      schoolId,
      schoolYearId,
      name: fields.name,
      yearLevel: fields.yearLevel,
    },
  });
  expect(res.ok(), `POST /classes (${fields.name})`).toBeTruthy();
  return (await res.json()) as { id: string; name: string };
}

async function listClassSubjects(
  request: APIRequestContext,
  classId: string,
  schoolId: string,
): Promise<ClassSubjectRow[]> {
  const token = await getAdminToken(request);
  const res = await request.get(`${API}/classes/${classId}/subjects`, {
    headers: { Authorization: `Bearer ${token}`, 'X-School-Id': schoolId },
  });
  expect(res.ok(), `GET /classes/${classId}/subjects`).toBeTruthy();
  return (await res.json()) as ClassSubjectRow[];
}

async function applyStundentafel(
  request: APIRequestContext,
  classId: string,
  schoolId: string,
  schoolType: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const res = await request.post(
    `${API}/classes/${classId}/apply-stundentafel`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-School-Id': schoolId,
        'Content-Type': 'application/json',
      },
      data: { schoolType },
    },
  );
  expect(
    res.ok(),
    `POST apply-stundentafel must succeed, got ${res.status()}`,
  ).toBeTruthy();
}

test.describe('Issue #71 — Stundentafel Teacher-Zuweisung (throwaway-school, #152)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Stundentafel teacher picker uses identical Select on mobile — desktop is enough.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withClasses: 1,
      withTimetableStack: true, // provisions the lone Teacher the picker selects
      namePrefix: 'E2E-TA',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('E2E-CLS-TEACHER-ASSIGN: pick teacher → save → PUT body + persist', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    const target = {
      id: fixture.timetable!.teacherId,
      displayName: fixture.timetable!.teacherDisplayName,
    };

    const ts = Date.now().toString().slice(-6);
    const cls = await createClass(
      request,
      fixture.schoolId,
      fixture.schoolYearId,
      { name: `${PREFIX}A-${ts}`, yearLevel: 1 },
    );
    // Apply the AHS_UNTER year-1 Stundentafel so the new class has rows
    // (subjects auto-created from the template). Template name is
    // independent of the school's own schoolType (the throwaway is 'AHS').
    await applyStundentafel(request, cls.id, fixture.schoolId, 'AHS_UNTER');

    const rowsBefore = await listClassSubjects(request, cls.id, fixture.schoolId);
    expect(
      rowsBefore.length,
      'Stundentafel applied → at least one row',
    ).toBeGreaterThan(0);
    expect(
      rowsBefore.every((r) => r.teacherId === null),
      'all rows start unassigned',
    ).toBe(true);

    // Pick a row deterministically — Deutsch ("D") is in every AHS_UNTER
    // year-1 Stundentafel.
    const targetRow = rowsBefore.find((r) => r.subject.shortName === 'D');
    expect(targetRow, 'D row exists').toBeTruthy();
    if (!targetRow) return;

    await page.goto(`/admin/classes/${cls.id}?tab=stundentafel`);

    // Open the teacher Select for D, pick the throwaway's fixture teacher.
    const trigger = page.getByTestId('stundentafel-teacher-D');
    await trigger.click();
    await page.getByRole('option', { name: target.displayName }).click();

    // Save and capture the PUT.
    const putPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/classes/${cls.id}/subjects`) &&
        res.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    const putRes = await putPromise;
    expect(putRes.ok(), 'PUT must succeed').toBeTruthy();
    const reqBody = JSON.parse(putRes.request().postData() ?? '{}') as {
      rows: Array<{ subjectId: string; teacherId: string | null }>;
    };
    const dRow = reqBody.rows.find((r) => r.subjectId === targetRow.subjectId);
    expect(
      dRow?.teacherId,
      'PUT body carries the picked teacherId for the D row',
    ).toBe(target.id);

    // DB persistence.
    const rowsAfter = await listClassSubjects(request, cls.id, fixture.schoolId);
    const persisted = rowsAfter.find((r) => r.subject.shortName === 'D');
    expect(persisted?.teacherId).toBe(target.id);
  });

  test('E2E-CLS-TEACHER-CLEAR: switch teacher → Nicht zugewiesen → PUT body null', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    const target = {
      id: fixture.timetable!.teacherId,
      displayName: fixture.timetable!.teacherDisplayName,
    };

    const ts = Date.now().toString().slice(-6);
    const cls = await createClass(
      request,
      fixture.schoolId,
      fixture.schoolYearId,
      { name: `${PREFIX}C-${ts}`, yearLevel: 1 },
    );
    await applyStundentafel(request, cls.id, fixture.schoolId, 'AHS_UNTER');

    // Pre-assign the D row via the PUT endpoint so the clear flow has
    // something to clear.
    const rowsBefore = await listClassSubjects(request, cls.id, fixture.schoolId);
    const dRow = rowsBefore.find((r) => r.subject.shortName === 'D');
    expect(dRow, 'D row exists').toBeTruthy();
    if (!dRow) return;
    const token = await getAdminToken(request);
    await request.put(`${API}/classes/${cls.id}/subjects`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-School-Id': fixture.schoolId,
        'Content-Type': 'application/json',
      },
      data: {
        rows: rowsBefore.map((r) => ({
          id: r.id,
          subjectId: r.subjectId,
          weeklyHours: 4,
          teacherId: r.subjectId === dRow.subjectId ? target.id : null,
        })),
      },
    });

    const verifySeed = await listClassSubjects(request, cls.id, fixture.schoolId);
    expect(
      verifySeed.find((r) => r.subject.shortName === 'D')?.teacherId,
    ).toBe(target.id);

    await page.goto(`/admin/classes/${cls.id}?tab=stundentafel`);

    // Open the teacher Select for D, pick "Nicht zugewiesen".
    await page.getByTestId('stundentafel-teacher-D').click();
    await page.getByRole('option', { name: 'Nicht zugewiesen' }).click();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/classes/${cls.id}/subjects`) &&
        res.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    const putRes = await putPromise;
    expect(putRes.ok(), 'PUT must succeed').toBeTruthy();
    const reqBody = JSON.parse(putRes.request().postData() ?? '{}') as {
      rows: Array<{ subjectId: string; teacherId: string | null }>;
    };
    const clearedRow = reqBody.rows.find(
      (r) => r.subjectId === dRow.subjectId,
    );
    expect(
      clearedRow?.teacherId,
      'PUT body sets teacherId=null for the D row',
    ).toBeNull();

    const rowsAfter = await listClassSubjects(request, cls.id, fixture.schoolId);
    expect(
      rowsAfter.find((r) => r.subject.shortName === 'D')?.teacherId,
    ).toBeNull();
  });
});
