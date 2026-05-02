/**
 * Phase 10.5-01 — Räume-Booking-Conflict E2E (desktop)
 *
 * Covers Deliverable 1 of Phase 10.5 (CONTEXT.md D-04..D-06, Research Pattern 3):
 *   - ROOM-BOOK-01: Happy-path booking → green toast `Raum erfolgreich gebucht`.
 *   - ROOM-BOOK-02: Real 409 via double-book — the first booking is seeded
 *     over the API, the second is driven through the UI's RoomBookingDialog
 *     with a route-rewrite so the POST collides with the API-seeded slot.
 *     The conflict is a genuine `ConflictException` from RoomService.bookRoom
 *     (room.service.ts:122) — NOT a mocked 4xx. The spec asserts both the
 *     red toast (verbatim `error.detail`) and the silent-4xx invariant
 *     (no green success toast).
 *
 * Why route-rewrite the conflicting POST?
 *   Once a slot is booked, its cell is no longer "free" in the UI — the grid
 *   renders the Ad-hoc chip instead of a clickable free button, so the dialog
 *   cannot be re-opened on the same slot through normal UI interaction. We
 *   preserve the browser-driven nature of the test by opening the dialog on
 *   a still-free cell (period 1) and letting `page.route()` rewrite the
 *   `periodNumber` in the POST body to collide with the API-seeded period 2
 *   booking. Sonner mounts inside the page, so the red toast triggered by
 *   `useBookRoom.onError` is visible via the standard assertion.
 *
 * Prerequisites (same as the other Phase 10.x specs):
 *   - docker compose up -d postgres redis keycloak
 *   - API on :3000, Vite on :5173
 *   - prisma:seed executed (admin user + `seed-school-bgbrg-musterstadt`)
 *
 * Self-provisioning:
 *   The seed school ships zero rooms and an empty time-grid. `beforeAll` seeds
 *   a 2-period MONDAY-FRIDAY time-grid + a throwaway room (name
 *   `E2E-ROOM-BOOK01-<ts>`) via the admin token. `afterAll` deletes the room
 *   which cascades its bookings (Prisma FK). See 10.5-01-DISCOVERY.md §3.
 */
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from '@playwright/test';
import { getAdminToken, loginAsAdmin } from './helpers/login';
import { SEED_SCHOOL_UUID } from './fixtures/seed-uuids';

const API = process.env.E2E_API_URL ?? 'http://localhost:3000/api/v1';
const SCHOOL = SEED_SCHOOL_UUID;

/** Verbatim label text on RoomBookingDialog (10.5-01-DISCOVERY.md §1). */
const PURPOSE_LABEL = 'Zweck (optional)';

/**
 * Verbatim detail string from RoomService.bookRoom ConflictException
 * (apps/api/src/modules/room/room.service.ts:122). Surfaces in the red toast
 * because useBookRoom.mutationFn rethrows as `new Error(error.detail || …)`
 * and onError toasts `error.message` (useRoomAvailability.ts:65-79).
 *
 * Exact match (not regex) per CD-01.
 */
const CONFLICT_TOAST =
  'Dieser Raum ist fuer die gewaehlte Zeit bereits belegt. Bitte waehlen Sie einen anderen Zeitpunkt.';

/** Green toast from useBookRoom.onSuccess (useRoomAvailability.ts:75). */
const SUCCESS_TOAST = 'Raum erfolgreich gebucht';

/**
 * Seed a minimal time-grid on the test school (2 non-break periods,
 * MONDAY-FRIDAY active). Idempotent: PUT replaces the grid atomically.
 *
 * This pays the Pitfall 6 / Open Q #5 debt — the seed DB otherwise has
 * `timeGrid.periods = []` which makes /rooms/availability return [] and
 * the RoomsPage render its "Keine Raeume angelegt" empty state.
 */
async function seedTimeGrid(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  const res = await request.put(`${API}/schools/${SCHOOL}/time-grid`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      periods: [
        {
          periodNumber: 1,
          startTime: '08:00',
          endTime: '08:50',
          isBreak: false,
          durationMin: 50,
          label: '1. Stunde',
        },
        {
          periodNumber: 2,
          startTime: '08:55',
          endTime: '09:45',
          isBreak: false,
          durationMin: 50,
          label: '2. Stunde',
        },
      ],
      schoolDays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    },
  });
  expect(res.ok(), 'PUT /time-grid').toBeTruthy();
}

/** Create a throwaway room, return its id. */
async function createThrowawayRoom(
  request: APIRequestContext,
  token: string,
  name: string,
): Promise<string> {
  const res = await request.post(`${API}/schools/${SCHOOL}/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      name,
      roomType: 'KLASSENZIMMER',
      capacity: 20,
      equipment: [],
    },
  });
  expect(res.ok(), 'POST /rooms').toBeTruthy();
  const body = (await res.json()) as { id: string };
  return body.id;
}

/**
 * Delete the throwaway room. RoomBooking rows cascade on the schema-declared
 * FK. Best-effort — swallow errors so one flaky run doesn't break later runs.
 */
async function deleteThrowawayRoom(
  request: APIRequestContext,
  token: string,
  roomId: string,
): Promise<void> {
  await request
    .delete(`${API}/schools/${SCHOOL}/rooms/${roomId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    .catch(() => undefined);
}

/**
 * Delete any booking on the throwaway room whose purpose starts with
 * `E2E-BOOK-`. Never touches pre-existing seed bookings (there are none on a
 * throwaway room, but belt-and-braces per D-05).
 *
 * The availability endpoint returns slots grouped by (roomId × period); we
 * inspect occupiedBy.bookingId + occupiedBy.label to identify E2E bookings.
 */
async function cleanupE2EBookings(
  request: APIRequestContext,
  token: string,
  roomId: string,
): Promise<void> {
  const res = await request.get(
    `${API}/schools/${SCHOOL}/rooms/availability?dayOfWeek=MONDAY`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok()) return;
  const slots = (await res.json()) as Array<{
    roomId: string;
    occupiedBy?: {
      type: 'lesson' | 'booking';
      bookingId?: string;
      label?: string;
    } | null;
  }>;
  for (const slot of slots) {
    if (slot.roomId !== roomId) continue;
    const occ = slot.occupiedBy;
    if (!occ || occ.type !== 'booking' || !occ.bookingId) continue;
    if (!occ.label || !occ.label.startsWith('E2E-BOOK-')) continue;
    await request
      .delete(`${API}/schools/${SCHOOL}/rooms/bookings/${occ.bookingId}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .catch(() => undefined);
  }
}

/**
 * Click the free-slot cell for the throwaway room at the given period.
 * Uses the aria-label on RoomAvailabilityGrid.tsx:214:
 *   `${roomName}, Stunde ${periodNumber} - Frei`
 * Narrowed by the throwaway room's unique name so seed changes never steal
 * the match.
 */
async function clickFreeSlot(
  page: Page,
  roomName: string,
  periodNumber: number,
): Promise<void> {
  const escapedName = roomName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const slot = page.getByRole('button', {
    name: new RegExp(`${escapedName}, Stunde ${periodNumber} - Frei`),
  });
  await expect(slot).toBeVisible();
  await slot.click();
  await expect(page.getByRole('dialog', { name: 'Raum buchen' })).toBeVisible();
}

/** Force the day filter to MONDAY — matches the seeded availability. */
async function selectMonday(page: Page): Promise<void> {
  // Open the day selector. The day select is the first combobox on the
  // RoomsPage (rooms/index.tsx:177-190), labelled `Tag`.
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Montag' }).click();
}

test.describe('Phase 10.5 — Rooms Booking (desktop)', () => {
  let adminToken: string;
  let roomId: string;
  let roomName: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getAdminToken(request);
    await seedTimeGrid(request, adminToken);
    roomName = `E2E-ROOM-BOOK01-${Date.now()}`;
    roomId = await createThrowawayRoom(request, adminToken, roomName);
  });

  test.afterAll(async ({ request }) => {
    // Best-effort teardown — cleanup bookings first (defensive; room delete
    // cascades anyway), then drop the throwaway room itself.
    await cleanupE2EBookings(request, adminToken, roomId);
    await deleteThrowawayRoom(request, adminToken, roomId);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EBookings(request, adminToken, roomId);
  });

  test('ROOM-BOOK-01: happy-path booking', async ({ page }) => {
    const purpose = `E2E-BOOK-01-${Date.now()}`;

    await page.goto('/rooms');
    await expect(
      page.getByRole('grid', { name: 'Raumbelegung' }),
    ).toBeVisible();

    // Force MONDAY — our seeded periods are MONDAY-active; the page default
    // depends on the JS Date (weekend → MONDAY) but pinning it explicitly
    // keeps the spec deterministic.
    await selectMonday(page);

    await clickFreeSlot(page, roomName, 1);

    // Fill purpose — verbatim label from RoomBookingDialog.tsx:105.
    await page.getByLabel(PURPOSE_LABEL).fill(purpose);

    // Submit — scope to the dialog because the page also has a nearby
    // "Raum buchen" string context.
    await page
      .getByRole('dialog', { name: 'Raum buchen' })
      .getByRole('button', { name: 'Raum buchen' })
      .click();

    // Green toast — verbatim from useRoomAvailability.ts:75.
    await expect(page.getByText(SUCCESS_TOAST)).toBeVisible();

    // Grid reflects the new booking — the ad-hoc cell renders
    // `slot.occupiedBy.label` which is the submitted purpose
    // (RoomAvailabilityGrid.tsx:248).
    await expect(page.getByText(purpose)).toBeVisible();
  });

  test('ROOM-BOOK-02: conflict 409 via real backend ConflictException', async ({
    page,
    request,
  }) => {
    // Different period from ROOM-BOOK-01 to dodge the Pitfall 5 parallel
    // worker race even if both tests end up on the same shard.
    const seedPurpose = `E2E-BOOK-02-SEED-${Date.now()}`;
    const dupPurpose = `E2E-BOOK-02-DUP-${Date.now()}`;

    // Step 1 — seed the first booking via API so period 2 is DB-occupied.
    const seed = await request.post(
      `${API}/schools/${SCHOOL}/rooms/bookings`,
      {
        headers: { Authorization: `Bearer ${adminToken}` },
        data: {
          roomId,
          dayOfWeek: 'MONDAY',
          periodNumber: 2,
          purpose: seedPurpose,
        },
      },
    );
    expect(seed.ok(), 'seed POST /bookings').toBeTruthy();

    // Step 2 — open the dialog on a still-free cell (period 1) and let the
    // route-layer rewrite the POST's periodNumber to 2 so the real backend
    // raises ConflictException. This keeps the 409 a genuine service-layer
    // response (not a client-side fake) while the UI mutation path is still
    // exercised end-to-end.
    await page.route(
      `**/api/v1/schools/${SCHOOL}/rooms/bookings`,
      async (route) => {
        const req = route.request();
        if (req.method() !== 'POST') {
          return route.continue();
        }
        const body = req.postDataJSON() as {
          roomId: string;
          dayOfWeek: string;
          periodNumber: number;
          purpose?: string;
          weekType?: string;
        };
        await route.continue({
          postData: JSON.stringify({ ...body, periodNumber: 2 }),
        });
      },
    );

    await page.goto('/rooms');
    await expect(
      page.getByRole('grid', { name: 'Raumbelegung' }),
    ).toBeVisible();
    await selectMonday(page);

    await clickFreeSlot(page, roomName, 1);
    await page.getByLabel(PURPOSE_LABEL).fill(dupPurpose);
    await page
      .getByRole('dialog', { name: 'Raum buchen' })
      .getByRole('button', { name: 'Raum buchen' })
      .click();

    // Red toast — verbatim error.detail from the 409 problem-detail body.
    await expect(page.getByText(CONFLICT_TOAST)).toBeVisible();

    // Silent-4xx guard — the green success toast must NEVER fire on 409.
    await expect(page.getByText(SUCCESS_TOAST)).not.toBeVisible({
      timeout: 3000,
    });

    // The duplicate purpose must NOT have made it into the grid — only the
    // API-seeded `seedPurpose` is booked on period 2.
    await expect(page.getByText(dupPurpose)).not.toBeVisible();
  });
});
