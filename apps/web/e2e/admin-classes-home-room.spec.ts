/**
 * Issue #67 — Admin Classes Heimraum assignment.
 *
 * Issue #152 (Phase 3.5/5) — migrated to throwaway-school per CLAUDE.md D4.
 * The `admin-classes-home-room:` and `e2e-rows-on-seed-school:` advisory
 * locks are gone; each spec owns its own throwaway School so the
 * cleanup-by-prefix race can no longer fire.
 *
 * Covers the two UI affordances added by the home-room PR:
 *   - E2E-CLS-HR-EDIT-ASSIGN: ClassStammdatenTab → Heimraum Select →
 *                              Speichern → PUT /classes/:id carries
 *                              homeRoomId, value persists across reload.
 *   - E2E-CLS-HR-EDIT-CLEAR:  Pre-assigned class → Heimraum=Kein Heimraum
 *                              → Speichern → PUT body homeRoomId=null.
 *   - E2E-CLS-HR-CREATE:      ClassCreateDialog with Heimraum=throwaway room
 *                              → POST /classes carries homeRoomId.
 *
 * DOM contract:
 *   - ClassStammdatenTab.tsx — `<SelectTrigger id="class-stammdaten-home-room"
 *     aria-label="Heimraum">`, "Speichern" button.
 *   - ClassCreateDialog.tsx — `<SelectTrigger id="class-home-room"
 *     aria-label="Heimraum">`, "Klasse anlegen" submit.
 *   - Sentinel `__no_home_room__` clears the assignment (Radix Select
 *     does not accept empty string as a value).
 *
 * Throwaway provides exactly one Room (`fixture.timetable.roomName`) — the
 * spec picks it as the home room. Empty-state UX ("Kein Heimraum") is
 * still exercised by the CLEAR test.
 */
import { expect, test, type APIRequestContext } from '@playwright/test';
import { getAdminToken, loginAsRole } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

const PREFIX = 'E2E-HR-';
const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';

async function createClass(
  request: APIRequestContext,
  schoolId: string,
  schoolYearId: string,
  fields: { name: string; yearLevel?: number },
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
      yearLevel: fields.yearLevel ?? 5,
    },
  });
  expect(res.ok(), `POST /classes (${fields.name})`).toBeTruthy();
  return (await res.json()) as { id: string; name: string };
}

async function fetchClass(
  request: APIRequestContext,
  id: string,
  schoolId: string,
): Promise<{ id: string; homeRoomId: string | null }> {
  const token = await getAdminToken(request);
  const res = await request.get(`${API}/classes/${id}`, {
    headers: { Authorization: `Bearer ${token}`, 'X-School-Id': schoolId },
  });
  expect(res.ok(), `GET /classes/${id}`).toBeTruthy();
  return (await res.json()) as { id: string; homeRoomId: string | null };
}

test.describe('Issue #67 — Admin Classes Heimraum (throwaway-school, #152)', () => {
  // The Heimraum UI is the same on mobile (same Radix Select + same form
  // wiring); the spec exercises the wire-up, not viewport-specific
  // affordances. Stick to desktop.
  test.skip(
    ({ isMobile }) => isMobile,
    'Heimraum form contract is identical across viewports — desktop only.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async () => {
    fixture = await createThrowawaySchool({
      roles: { admin: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-HR',
    });
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('E2E-CLS-HR-EDIT-ASSIGN: pick Heimraum via Select → save → persists', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    const targetRoom = {
      id: fixture.timetable!.roomId,
      name: fixture.timetable!.roomName,
    };

    const ts = Date.now().toString().slice(-6);
    const cls = await createClass(
      request,
      fixture.schoolId,
      fixture.schoolYearId,
      { name: `${PREFIX}A-${ts}` },
    );

    // Verify start state has no home room.
    const before = await fetchClass(request, cls.id, fixture.schoolId);
    expect(before.homeRoomId, 'class starts with no home room').toBeNull();

    await page.goto(`/admin/classes/${cls.id}?tab=stammdaten`);

    // Open the Heimraum Select and pick the throwaway's room.
    await page.getByRole('combobox', { name: 'Heimraum' }).click();
    await page.getByRole('option', { name: targetRoom.name }).click();

    // Save and capture the PUT.
    const putPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/classes/${cls.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    const putRes = await putPromise;
    expect(putRes.ok(), 'PUT must succeed').toBeTruthy();
    const reqBody = JSON.parse(putRes.request().postData() ?? '{}');
    expect(
      reqBody.homeRoomId,
      'PUT body carries the picked homeRoomId',
    ).toBe(targetRoom.id);

    // Persistence — fetch class via API and verify the new value sticks.
    const after = await fetchClass(request, cls.id, fixture.schoolId);
    expect(after.homeRoomId).toBe(targetRoom.id);

    // Reload the page — the Select must rehydrate with the saved value.
    await page.reload();
    await expect(
      page.getByRole('combobox', { name: 'Heimraum' }),
    ).toContainText(targetRoom.name);
  });

  test('E2E-CLS-HR-EDIT-CLEAR: switch from Heimraum → Kein Heimraum → save → PUT homeRoomId=null', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    const startRoom = {
      id: fixture.timetable!.roomId,
      name: fixture.timetable!.roomName,
    };

    const ts = Date.now().toString().slice(-6);

    // Seed the class with a home room already set so the clear flow has
    // something to remove.
    const cls = await createClass(
      request,
      fixture.schoolId,
      fixture.schoolYearId,
      { name: `${PREFIX}C-${ts}` },
    );
    const token = await getAdminToken(request);
    await request.put(`${API}/classes/${cls.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-School-Id': fixture.schoolId,
        'Content-Type': 'application/json',
      },
      data: { homeRoomId: startRoom.id },
    });

    const before = await fetchClass(request, cls.id, fixture.schoolId);
    expect(before.homeRoomId).toBe(startRoom.id);

    await page.goto(`/admin/classes/${cls.id}?tab=stammdaten`);

    // Open Heimraum Select and pick "Kein Heimraum".
    await page.getByRole('combobox', { name: 'Heimraum' }).click();
    await page.getByRole('option', { name: 'Kein Heimraum' }).click();

    // Save and capture the PUT — body.homeRoomId must be exactly null.
    const putPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith(`/classes/${cls.id}`) &&
        res.request().method() === 'PUT',
      { timeout: 15_000 },
    );
    await page.getByRole('button', { name: 'Speichern' }).first().click();
    const putRes = await putPromise;
    expect(putRes.ok(), 'PUT must succeed').toBeTruthy();
    const reqBody = JSON.parse(putRes.request().postData() ?? '{}');
    expect(reqBody.homeRoomId, 'PUT body homeRoomId is null').toBeNull();

    // Verify clear took effect.
    const after = await fetchClass(request, cls.id, fixture.schoolId);
    expect(after.homeRoomId).toBeNull();
  });

  test('E2E-CLS-HR-CREATE: ClassCreateDialog with Heimraum → POST carries homeRoomId', async ({
    page,
    context,
    request,
  }) => {
    if (!fixture) throw new Error('fixture not seeded');
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsRole(page, 'admin');

    const targetRoom = {
      id: fixture.timetable!.roomId,
      name: fixture.timetable!.roomName,
    };

    const ts = Date.now().toString().slice(-6);
    const className = `${PREFIX}N-${ts}`;

    await page.goto('/admin/classes');

    // Open the create dialog — "Klasse anlegen" CTA.
    await page.getByRole('button', { name: 'Klasse anlegen' }).first().click();

    const dialog = page.getByRole('dialog');
    await expect(
      dialog.getByRole('heading', { name: 'Klasse anlegen' }),
    ).toBeVisible();

    await dialog.getByLabel('Name').fill(className);

    // Schuljahr — must be picked explicitly. The dialog's defaultSchoolYearId
    // only populates when the school-context-store has activeSchoolYearId;
    // in a fresh E2E session that field may not be hydrated, surfacing an
    // "Ungültige Schuljahr-ID" inline error. Throwaway provisions exactly
    // one SchoolYear so picking `.first()` is deterministic.
    await dialog.getByLabel('Schuljahr').click();
    await page.getByRole('option').first().click();

    // Heimraum picker inside the dialog.
    await dialog.getByRole('combobox', { name: 'Heimraum' }).click();
    await page.getByRole('option', { name: targetRoom.name }).click();

    // Capture the POST — the only "Klasse anlegen" button inside the
    // dialog is the submit; the outer CTA that opened it is outside this
    // scope.
    const postPromise = page.waitForResponse(
      (res) =>
        res.url().endsWith('/classes') && res.request().method() === 'POST',
      { timeout: 15_000 },
    );
    await dialog.getByRole('button', { name: 'Klasse anlegen' }).click();
    const postRes = await postPromise;
    expect(postRes.ok(), 'POST must succeed').toBeTruthy();
    const reqBody = JSON.parse(postRes.request().postData() ?? '{}');
    expect(reqBody.homeRoomId, 'POST body carries homeRoomId').toBe(
      targetRoom.id,
    );

    // Defence-in-depth: fetch the created class via API and confirm the
    // value landed in the DB, not just in the request body.
    const body = (await postRes.json()) as { id: string };
    const persisted = await fetchClass(request, body.id, fixture.schoolId);
    expect(persisted.homeRoomId).toBe(targetRoom.id);
  });
});
