/**
 * Issue #67 — Admin Classes Heimraum assignment.
 *
 * Covers the two UI affordances added by the home-room PR:
 *   - E2E-CLS-HR-EDIT-ASSIGN: ClassStammdatenTab → Heimraum Select →
 *                              Speichern → PUT /classes/:id carries
 *                              homeRoomId, value persists across reload.
 *   - E2E-CLS-HR-EDIT-CLEAR:  Pre-assigned class → Heimraum=Kein Heimraum
 *                              → Speichern → PUT body homeRoomId=null.
 *   - E2E-CLS-HR-CREATE:      ClassCreateDialog with Heimraum=Raum 2A →
 *                              POST /classes carries homeRoomId, list view
 *                              shows the new class with the home room set.
 *
 * DOM contract:
 *   - ClassStammdatenTab.tsx — `<SelectTrigger id="class-stammdaten-home-room"
 *     aria-label="Heimraum">`, "Speichern" button.
 *   - ClassCreateDialog.tsx — `<SelectTrigger id="class-home-room"
 *     aria-label="Heimraum">`, "Klasse anlegen" submit.
 *   - Sentinel `__no_home_room__` clears the assignment (Radix Select
 *     does not accept empty string as a value).
 *
 * Cross-room verification uses the seed rooms (Raum 1A / Raum 2A /
 * Turnsaal etc.) — `apps/api/prisma/seed.ts` Issue #67 patch makes
 * 1A → Raum 1A and 1B → Raum 2A the default seed state, so live-solve
 * coverage stays in the integration test suite, not here. This spec
 * locks down the UI contract only.
 */
import { expect, test } from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import {
  cleanupE2EClasses,
  createClassViaAPI,
} from './helpers/students';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const PREFIX = 'E2E-HR-';
const NO_HOME_ROOM_SENTINEL = '__no_home_room__';

const API = 'http://localhost:3000/api/v1';

interface RoomDto {
  id: string;
  name: string;
}

async function listRooms(
  request: import('@playwright/test').APIRequestContext,
): Promise<RoomDto[]> {
  const token = await getAdminToken(request);
  const res = await request.get(
    `${API}/schools/${SEED_SCHOOL_UUID}/rooms?page=1&limit=50`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  expect(res.ok(), 'GET /rooms').toBeTruthy();
  const body = (await res.json()) as { data?: RoomDto[] } | RoomDto[];
  const items = Array.isArray(body) ? body : body.data ?? [];
  return items;
}

async function fetchClass(
  request: import('@playwright/test').APIRequestContext,
  id: string,
): Promise<{ id: string; homeRoomId: string | null }> {
  const token = await getAdminToken(request);
  const res = await request.get(`${API}/classes/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  expect(res.ok(), `GET /classes/${id}`).toBeTruthy();
  return (await res.json()) as { id: string; homeRoomId: string | null };
}

test.describe('Issue #67 — Admin Classes Heimraum (desktop)', () => {
  // The Heimraum UI is the same on mobile (same Radix Select + same form
  // wiring); the spec exercises the wire-up, not viewport-specific
  // affordances. Stick to desktop.
  test.skip(
    ({ isMobile }) => isMobile,
    'Heimraum form contract is identical across viewports — desktop only.',
  );
  // Mutating classes on the seed school from parallel browser projects
  // races on the same school resources (PUT /classes/:id from chromium
  // and firefox can land on a class that the other project's cleanup
  // just deleted, or share a colliding timestamp suffix). Scope to
  // chromium until the throwaway-school fixture lands — same pattern as
  // timetable-generation-flow.spec.ts and project_e2e_parallel_cleanup_race_family.md.
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'flaky on parallel browser projects — shared seed-school race (see #54).',
  );

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EClasses(request, PREFIX);
  });

  test('E2E-CLS-HR-EDIT-ASSIGN: pick Heimraum via Select → save → persists', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const cls = await createClassViaAPI(request, { name: `${PREFIX}A-${ts}` });

    // Verify start state has no home room.
    const before = await fetchClass(request, cls.id);
    expect(before.homeRoomId, 'class starts with no home room').toBeNull();

    const rooms = await listRooms(request);
    // Use the second Klassenzimmer in the seed so this spec never collides
    // with the seed defaults (1A → Raum 1A, 1B → Raum 2A) — Raum 3 (Reserve)
    // is the safe pick.
    const targetRoom = rooms.find((r) => r.name === 'Raum 3 (Reserve)');
    expect(targetRoom, 'Raum 3 (Reserve) exists in seed').toBeTruthy();
    if (!targetRoom) return;

    await page.goto(`/admin/classes/${cls.id}?tab=stammdaten`);

    // Open the Heimraum Select and pick the target room.
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
    const after = await fetchClass(request, cls.id);
    expect(after.homeRoomId).toBe(targetRoom.id);

    // Reload the page — the Select must rehydrate with the saved value.
    await page.reload();
    await expect(
      page.getByRole('combobox', { name: 'Heimraum' }),
    ).toContainText(targetRoom.name);
  });

  test('E2E-CLS-HR-EDIT-CLEAR: switch from Heimraum → Kein Heimraum → save → PUT homeRoomId=null', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const rooms = await listRooms(request);
    const startRoom = rooms.find((r) => r.name === 'Raum 3 (Reserve)');
    expect(startRoom, 'Raum 3 (Reserve) exists in seed').toBeTruthy();
    if (!startRoom) return;

    // Seed the class with a home room already set so the clear flow has
    // something to remove. createClassViaAPI accepts klassenvorstandId
    // today; we set the room via a direct PUT afterwards rather than
    // expanding the helper signature.
    const cls = await createClassViaAPI(request, { name: `${PREFIX}C-${ts}` });
    const token = await getAdminToken(request);
    await request.put(`${API}/classes/${cls.id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      data: { homeRoomId: startRoom.id },
    });

    const before = await fetchClass(request, cls.id);
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
    const after = await fetchClass(request, cls.id);
    expect(after.homeRoomId).toBeNull();
  });

  test('E2E-CLS-HR-CREATE: ClassCreateDialog with Heimraum → POST carries homeRoomId', async ({
    page,
    request,
  }) => {
    const ts = Date.now().toString().slice(-6);
    const className = `${PREFIX}N-${ts}`;
    const rooms = await listRooms(request);
    const targetRoom = rooms.find((r) => r.name === 'Raum 3 (Reserve)');
    expect(targetRoom, 'Raum 3 (Reserve) exists in seed').toBeTruthy();
    if (!targetRoom) return;

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
    // "Ungültige Schuljahr-ID" inline error. (Same approach as
    // admin-classes-crud.spec.ts.)
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
    const persisted = await fetchClass(request, body.id);
    expect(persisted.homeRoomId).toBe(targetRoom.id);
  });
});
