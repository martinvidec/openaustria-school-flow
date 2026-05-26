/**
 * Issue #69 — Subject Pflicht-Raumtyp assignment.
 *
 * Issue #152 (Phase 3.5/5) — migrated to throwaway-school per CLAUDE.md D4.
 * The `admin-subjects-required-room-type:` and `e2e-rows-on-seed-school:`
 * advisory locks are gone; each spec owns its own throwaway School so
 * parallel cleanup-by-prefix sweeps can no longer collide.
 *
 * Covers the UI affordance shipped in the requiredRoomType PR:
 *   - E2E-SUB-RRT-CREATE: SubjectFormDialog create-mode with
 *                          Pflicht-Raumtyp = Turnsaal → POST /subjects
 *                          carries requiredRoomType=TURNSAAL.
 *   - E2E-SUB-RRT-EDIT-ASSIGN: open edit dialog on a subject without
 *                              requiredRoomType, pick Turnsaal, save →
 *                              PUT body carries TURNSAAL, value persists.
 *   - E2E-SUB-RRT-EDIT-CLEAR:  open edit dialog on a subject WITH
 *                              requiredRoomType=TURNSAAL, switch to
 *                              "Kein Pflichtraum", save → PUT body
 *                              requiredRoomType=null.
 *
 * DOM contract:
 *   - SubjectFormDialog.tsx — `<SelectTrigger id="subject-required-room-type"
 *     aria-label="Pflicht-Raumtyp">` (data-testid same).
 *   - Sentinel `__no_required_room__` clears the assignment (Radix Select
 *     does not accept empty string as a value).
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { getAdminToken, loginAsRole } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const PREFIX = 'E2E-RRT-';

async function fetchSubject(
  request: APIRequestContext,
  id: string,
  schoolId: string,
): Promise<{ id: string; requiredRoomType: string | null }> {
  const token = await getAdminToken(request);
  const res = await request.get(`${API}/subjects/${id}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-School-Id': schoolId },
  });
  expect(res.ok(), `GET /subjects/${id}`).toBeTruthy();
  return (await res.json()) as { id: string; requiredRoomType: string | null };
}

async function createSubject(
  request: APIRequestContext,
  schoolId: string,
  fields: { name: string; shortName: string },
): Promise<{ id: string; name: string; shortName: string }> {
  const token = await getAdminToken(request);
  const res = await request.post(`${API}/subjects`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-School-Id': schoolId,
      'Content-Type': 'application/json',
    },
    data: {
      schoolId,
      name: fields.name,
      shortName: fields.shortName,
      subjectType: 'PFLICHT',
    },
  });
  expect(res.ok(), `POST /subjects (${fields.name})`).toBeTruthy();
  return (await res.json()) as { id: string; name: string; shortName: string };
}

async function setSubjectRequiredRoomType(
  request: APIRequestContext,
  id: string,
  schoolId: string,
  value: string | null,
): Promise<void> {
  const token = await getAdminToken(request);
  const res = await request.put(`${API}/subjects/${id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'X-School-Id': schoolId,
      'Content-Type': 'application/json',
    },
    data: { requiredRoomType: value },
  });
  expect(res.ok(), `PUT /subjects/${id} requiredRoomType=${value}`).toBeTruthy();
}

test.describe('Issue #69 — Subject Pflicht-Raumtyp (throwaway-school, #152)', () => {
  // Mobile renders the same SubjectFormDialog with the same Select;
  // the contract is identical, no viewport-specific affordance to test.
  test.skip(
    ({ isMobile }) => isMobile,
    'Pflicht-Raumtyp form contract is identical across viewports — desktop only.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-RRT',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('E2E-SUB-RRT-CREATE: dialog with Pflicht-Raumtyp=Turnsaal → POST carries TURNSAAL', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    const ts = Date.now().toString().slice(-6);
    const subjectName = `${PREFIX}Sport-${ts}`;
    // Keep Kürzel short (max 8). Combine a stable prefix with the last
    // 4 timestamp digits — well under the limit.
    const shortName = `T${ts.slice(-4)}`;

    await page.goto('/admin/subjects');

    // Open create dialog — empty-state and populated-state both expose
    // a "Fach anlegen" CTA.
    await page.getByRole('button', { name: 'Fach anlegen' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Fach anlegen' }),
    ).toBeVisible();

    await dialog.getByTestId('subject-name-input').fill(subjectName);
    await dialog.getByTestId('subject-shortname-input').fill(shortName);

    // Pflicht-Raumtyp = Turnsaal.
    await dialog.getByRole('combobox', { name: 'Pflicht-Raumtyp' }).click();
    await page.getByRole('option', { name: 'Turnsaal' }).click();

    // Submit.
    const postPromise = page.waitForResponse(
      (res) => res.url().endsWith('/subjects') && res.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await dialog.getByTestId('subject-submit').click();
    const postRes = await postPromise;
    expect(postRes.ok(), 'POST must succeed').toBeTruthy();
    const reqBody = JSON.parse(postRes.request().postData() ?? '{}');
    expect(
      reqBody.requiredRoomType,
      'POST body carries requiredRoomType=TURNSAAL',
    ).toBe('TURNSAAL');

    // DB persistence verification.
    const body = (await postRes.json()) as { id: string };
    const persisted = await fetchSubject(request, body.id, fixture.schoolId);
    expect(persisted.requiredRoomType).toBe('TURNSAAL');
  });

  test('E2E-SUB-RRT-EDIT-ASSIGN: pick Turnsaal → save → PUT body + DB persist', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    const ts = Date.now().toString().slice(-6);
    const subject = await createSubject(request, fixture.schoolId, {
      name: `${PREFIX}A-${ts}`,
      shortName: `A${ts.slice(-4)}`,
    });

    // Start state — no requiredRoomType.
    const before = await fetchSubject(request, subject.id, fixture.schoolId);
    expect(before.requiredRoomType).toBeNull();

    await page.goto('/admin/subjects');

    // SubjectList rows carry data-testid="subject-row-${shortName}"
    // (SubjectList.tsx Pattern S4) on both desktop <tr> and mobile card;
    // clicking the row opens the edit dialog (onRowClick=onEdit).
    await page.getByTestId(`subject-row-${subject.shortName}`).first().click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Fach bearbeiten' }),
    ).toBeVisible();

    await dialog.getByRole('combobox', { name: 'Pflicht-Raumtyp' }).click();
    await page.getByRole('option', { name: 'Turnsaal' }).click();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/subjects/${subject.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await dialog.getByTestId('subject-submit').click();
    const putRes = await putPromise;
    expect(putRes.ok(), 'PUT must succeed').toBeTruthy();
    const reqBody = JSON.parse(putRes.request().postData() ?? '{}');
    expect(reqBody.requiredRoomType, 'PUT body sets TURNSAAL').toBe('TURNSAAL');

    const after = await fetchSubject(request, subject.id, fixture.schoolId);
    expect(after.requiredRoomType).toBe('TURNSAAL');
  });

  test('E2E-SUB-RRT-EDIT-CLEAR: switch from Turnsaal → Kein Pflichtraum → PUT body null', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    const ts = Date.now().toString().slice(-6);
    const subject = await createSubject(request, fixture.schoolId, {
      name: `${PREFIX}C-${ts}`,
      shortName: `C${ts.slice(-4)}`,
    });

    // Seed-state: pre-set requiredRoomType so the clear flow has something
    // to remove.
    await setSubjectRequiredRoomType(request, subject.id, fixture.schoolId, 'TURNSAAL');
    const before = await fetchSubject(request, subject.id, fixture.schoolId);
    expect(before.requiredRoomType).toBe('TURNSAAL');

    await page.goto('/admin/subjects');

    await page.getByTestId(`subject-row-${subject.shortName}`).first().click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Fach bearbeiten' }),
    ).toBeVisible();

    await dialog.getByRole('combobox', { name: 'Pflicht-Raumtyp' }).click();
    await page.getByRole('option', { name: 'Kein Pflichtraum' }).click();

    const putPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/subjects/${subject.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await dialog.getByTestId('subject-submit').click();
    const putRes = await putPromise;
    expect(putRes.ok(), 'PUT must succeed').toBeTruthy();
    const reqBody = JSON.parse(putRes.request().postData() ?? '{}');
    expect(reqBody.requiredRoomType, 'PUT body sets null').toBeNull();

    const after = await fetchSubject(request, subject.id, fixture.schoolId);
    expect(after.requiredRoomType).toBeNull();
  });
});
