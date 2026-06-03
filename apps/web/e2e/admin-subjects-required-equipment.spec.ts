/**
 * Issue #73 — Subject "Benötigte Ausstattung" (requiredEquipment) editor.
 *
 * Path B of #73 wired a real data source into the solver-input Lesson DTO's
 * previously-hardcoded `requiredEquipment: []`. The data source is a new
 * Subject.requiredEquipment column (String[]) edited via a chip list in
 * SubjectFormDialog. This spec locks the UI affordance + persistence.
 *
 * Throwaway-school per CLAUDE.md D4 — each test owns its own School so
 * parallel cleanup sweeps can never collide.
 *
 * Covers:
 *   - E2E-SUB-EQUIP-CREATE:    create dialog, add two equipment chips →
 *                              POST /subjects carries requiredEquipment
 *                              ['Beamer','Smartboard'], DB persists.
 *   - E2E-SUB-EQUIP-EDIT-ADD:  edit a subject without equipment, add one
 *                              chip, save → PUT body carries ['Beamer'],
 *                              value persists.
 *   - E2E-SUB-EQUIP-EDIT-CLEAR: edit a subject WITH equipment, remove all
 *                              chips, save → PUT body [], DB persists [].
 *
 * DOM contract (SubjectFormDialog.tsx):
 *   - <Input data-testid="subject-equipment-input">
 *   - add <Button data-testid="subject-equipment-add">
 *   - chip <Badge data-testid="subject-equipment-chip-${value}"> with remove
 *     <button data-testid="subject-equipment-remove-${value}">
 *   Clearing is `[]` (scalar lists can't be null), unlike #69's `__no_required_room__`.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { getAdminToken, loginAsRole } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const PREFIX = 'E2E-EQUIP-';

async function fetchSubject(
  request: APIRequestContext,
  id: string,
  schoolId: string,
): Promise<{ id: string; requiredEquipment: string[] }> {
  const token = await getAdminToken(request);
  const res = await request.get(`${API}/subjects/${id}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-School-Id': schoolId },
  });
  expect(res.ok(), `GET /subjects/${id}`).toBeTruthy();
  return (await res.json()) as { id: string; requiredEquipment: string[] };
}

async function createSubject(
  request: APIRequestContext,
  schoolId: string,
  fields: { name: string; shortName: string; requiredEquipment?: string[] },
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
      ...(fields.requiredEquipment
        ? { requiredEquipment: fields.requiredEquipment }
        : {}),
    },
  });
  expect(res.ok(), `POST /subjects (${fields.name})`).toBeTruthy();
  return (await res.json()) as { id: string; name: string; shortName: string };
}

test.describe('Issue #73 — Subject Benötigte Ausstattung (throwaway-school)', () => {
  // Mobile renders the same SubjectFormDialog with the same chip editor;
  // the contract is identical, no viewport-specific affordance to test.
  test.skip(
    ({ isMobile }) => isMobile,
    'Equipment editor contract is identical across viewports — desktop only.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withClasses: 1,
      namePrefix: 'E2E-EQUIP',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('E2E-SUB-EQUIP-CREATE: add two chips → POST carries requiredEquipment + DB persist', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    const ts = Date.now().toString().slice(-6);
    const subjectName = `${PREFIX}Informatik-${ts}`;
    const shortName = `I${ts.slice(-4)}`;

    await page.goto('/admin/subjects');
    await page.getByRole('button', { name: 'Fach anlegen' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Fach anlegen' }),
    ).toBeVisible();

    await dialog.getByTestId('subject-name-input').fill(subjectName);
    await dialog.getByTestId('subject-shortname-input').fill(shortName);

    // Add two equipment chips.
    await dialog.getByTestId('subject-equipment-input').fill('Beamer');
    await dialog.getByTestId('subject-equipment-add').click();
    await dialog.getByTestId('subject-equipment-input').fill('Smartboard');
    await dialog.getByTestId('subject-equipment-add').click();

    await expect(dialog.getByTestId('subject-equipment-chip-Beamer')).toBeVisible();
    await expect(
      dialog.getByTestId('subject-equipment-chip-Smartboard'),
    ).toBeVisible();

    const postPromise = page.waitForResponse(
      (res) => res.url().endsWith('/subjects') && res.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await dialog.getByTestId('subject-submit').click();
    const postRes = await postPromise;
    expect(postRes.ok(), 'POST must succeed').toBeTruthy();
    const reqBody = JSON.parse(postRes.request().postData() ?? '{}');
    expect(
      reqBody.requiredEquipment,
      'POST body carries the two equipment entries',
    ).toEqual(['Beamer', 'Smartboard']);

    const body = (await postRes.json()) as { id: string };
    const persisted = await fetchSubject(request, body.id, fixture.schoolId);
    expect(persisted.requiredEquipment).toEqual(['Beamer', 'Smartboard']);
  });

  test('E2E-SUB-EQUIP-EDIT-ADD: add one chip → PUT body + DB persist', async ({
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

    const before = await fetchSubject(request, subject.id, fixture.schoolId);
    expect(before.requiredEquipment).toEqual([]);

    await page.goto('/admin/subjects');
    await page.getByTestId(`subject-row-${subject.shortName}`).first().click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Fach bearbeiten' }),
    ).toBeVisible();

    await dialog.getByTestId('subject-equipment-input').fill('Beamer');
    await dialog.getByTestId('subject-equipment-add').click();
    await expect(dialog.getByTestId('subject-equipment-chip-Beamer')).toBeVisible();

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
    expect(reqBody.requiredEquipment, 'PUT body sets [Beamer]').toEqual([
      'Beamer',
    ]);

    const after = await fetchSubject(request, subject.id, fixture.schoolId);
    expect(after.requiredEquipment).toEqual(['Beamer']);
  });

  test('E2E-SUB-EQUIP-EDIT-CLEAR: remove all chips → PUT body [] + DB persist', async ({
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
      requiredEquipment: ['Beamer', 'Smartboard'],
    });

    const before = await fetchSubject(request, subject.id, fixture.schoolId);
    expect(before.requiredEquipment).toEqual(['Beamer', 'Smartboard']);

    await page.goto('/admin/subjects');
    await page.getByTestId(`subject-row-${subject.shortName}`).first().click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Fach bearbeiten' }),
    ).toBeVisible();

    // The pre-set chips must render in the edit dialog, then get removed.
    await expect(dialog.getByTestId('subject-equipment-chip-Beamer')).toBeVisible();
    await dialog.getByTestId('subject-equipment-remove-Beamer').click();
    await dialog.getByTestId('subject-equipment-remove-Smartboard').click();
    await expect(
      dialog.getByTestId('subject-equipment-chip-Beamer'),
    ).toHaveCount(0);

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
    expect(reqBody.requiredEquipment, 'PUT body clears to []').toEqual([]);

    const after = await fetchSubject(request, subject.id, fixture.schoolId);
    expect(after.requiredEquipment).toEqual([]);
  });
});
