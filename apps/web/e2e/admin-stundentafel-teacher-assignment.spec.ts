/**
 * Issue #71 — Stundentafel teacher assignment.
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
 * Scoped to desktop + chromium-only per the parallel-cleanup race family
 * — same pattern as admin-classes-home-room.spec.ts (#67) and
 * admin-subjects-required-room-type.spec.ts (#69).
 */
import { expect, test } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  cleanupE2EClasses,
  createClassViaAPI,
} from './helpers/students';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const PREFIX = 'E2E-TA-';
const API = 'http://localhost:3000/api/v1';

interface TeacherSummary {
  id: string;
  firstName: string;
  lastName: string;
}

interface ClassSubjectRow {
  id: string;
  subjectId: string;
  teacherId: string | null;
  subject: { id: string; shortName: string };
  teacher?: { id: string; person: { firstName: string; lastName: string } } | null;
}

async function listTeachers(
  request: import('@playwright/test').APIRequestContext,
): Promise<TeacherSummary[]> {
  const token = await getAdminToken(request);
  const res = await request.get(
    `${API}/teachers?schoolId=${SEED_SCHOOL_UUID}&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(res.ok(), 'GET /teachers').toBeTruthy();
  const body = (await res.json()) as {
    data?: Array<{ id: string; person?: { firstName?: string; lastName?: string } }>;
  };
  return (body.data ?? [])
    .filter((t) => t.person)
    .map((t) => ({
      id: t.id,
      firstName: t.person!.firstName ?? '',
      lastName: t.person!.lastName ?? '',
    }));
}

async function listClassSubjects(
  request: import('@playwright/test').APIRequestContext,
  classId: string,
): Promise<ClassSubjectRow[]> {
  const token = await getAdminToken(request);
  const res = await request.get(`${API}/classes/${classId}/subjects`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET /classes/${classId}/subjects`).toBeTruthy();
  return (await res.json()) as ClassSubjectRow[];
}

async function applyStundentafel(
  request: import('@playwright/test').APIRequestContext,
  classId: string,
  schoolType: string,
): Promise<void> {
  const token = await getAdminToken(request);
  const res = await request.post(
    `${API}/classes/${classId}/apply-stundentafel`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
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

test.describe('Issue #71 — Stundentafel Teacher-Zuweisung (desktop)', () => {
  test.skip(
    ({ isMobile }) => isMobile,
    'Stundentafel teacher picker uses identical Select on mobile — desktop is enough.',
  );
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'flaky on parallel browser projects — shared seed-school race.',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EClasses(request, PREFIX);
  });

  test('E2E-CLS-TEACHER-ASSIGN: pick teacher → save → PUT body + persist', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const cls = await createClassViaAPI(request, {
      name: `${PREFIX}A-${ts}`,
      yearLevel: 1,
    });
    // Apply the AHS_UNTER year-1 Stundentafel so the new class has rows
    // (4 seeded subjects).
    await applyStundentafel(request, cls.id, 'AHS_UNTER');

    const rowsBefore = await listClassSubjects(request, cls.id);
    expect(
      rowsBefore.length,
      'Stundentafel applied → at least one row',
    ).toBeGreaterThan(0);
    expect(
      rowsBefore.every((r) => r.teacherId === null),
      'all rows start unassigned',
    ).toBe(true);

    const teachers = await listTeachers(request);
    const target = teachers[0];
    expect(target, 'at least one seeded teacher').toBeTruthy();

    // Pick a row deterministically — Deutsch ("D") is in every AHS_UNTER
    // year-1 Stundentafel.
    const targetRow = rowsBefore.find((r) => r.subject.shortName === 'D');
    expect(targetRow, 'D row exists').toBeTruthy();
    if (!targetRow) return;

    await page.goto(`/admin/classes/${cls.id}?tab=stundentafel`);

    // Open the teacher Select for D, pick the target teacher.
    const trigger = page.getByTestId('stundentafel-teacher-D');
    await trigger.click();
    await page
      .getByRole('option', { name: `${target.lastName} ${target.firstName}` })
      .click();

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
    const rowsAfter = await listClassSubjects(request, cls.id);
    const persisted = rowsAfter.find((r) => r.subject.shortName === 'D');
    expect(persisted?.teacherId).toBe(target.id);
  });

  test('E2E-CLS-TEACHER-CLEAR: switch teacher → Nicht zugewiesen → PUT body null', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const cls = await createClassViaAPI(request, {
      name: `${PREFIX}C-${ts}`,
      yearLevel: 1,
    });
    await applyStundentafel(request, cls.id, 'AHS_UNTER');

    const teachers = await listTeachers(request);
    const target = teachers[0];
    expect(target, 'at least one seeded teacher').toBeTruthy();

    // Pre-assign the D row via the PUT endpoint so the clear flow has
    // something to clear.
    const rowsBefore = await listClassSubjects(request, cls.id);
    const dRow = rowsBefore.find((r) => r.subject.shortName === 'D');
    expect(dRow, 'D row exists').toBeTruthy();
    if (!dRow) return;
    const token = await getAdminToken(request);
    await request.put(`${API}/classes/${cls.id}/subjects`, {
      headers: {
        Authorization: `Bearer ${token}`,
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

    const verifySeed = await listClassSubjects(request, cls.id);
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

    const rowsAfter = await listClassSubjects(request, cls.id);
    expect(
      rowsAfter.find((r) => r.subject.shortName === 'D')?.teacherId,
    ).toBeNull();
  });
});
