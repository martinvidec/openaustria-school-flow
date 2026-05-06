/**
 * Phase 10.5-01 — Räume-Booking Happy-Path E2E (mobile 375).
 *
 * Mobile-375 variant of rooms-booking.spec.ts ROOM-BOOK-01. Only the
 * happy-path is covered at mobile — D-04 does not require the 409 conflict
 * to be re-tested at 375px (the desktop spec already proves the
 * backend + silent-4xx-guard contract).
 *
 * Pitfall 6 / Open Q #5 (from 10.5-RESEARCH.md):
 *   The grid has `minWidth: 200 + periodCount * 80` (~360px at 2 periods).
 *   At 375px viewport + small period count, the grid fits without forcing
 *   horizontal scroll. With larger period counts the grid overflows and
 *   cells in high period numbers require scrollIntoViewIfNeeded(). Our
 *   seeded grid has 2 periods so the free-cell button is already within
 *   the viewport on iPhone 13 (device scale factor 3 on a 375px CSS
 *   viewport). `scrollIntoViewIfNeeded()` is belt-and-braces — cheap +
 *   deterministic even when the grid fits.
 *
 * Prerequisites match the desktop spec (docker, API, Vite, prisma seed).
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

const PURPOSE_LABEL = 'Zweck (optional)';
const SUCCESS_TOAST = 'Raum erfolgreich gebucht';

async function seedTimeGrid(
  request: APIRequestContext,
  token: string,
): Promise<void> {
  // Conditional seed — see rooms-booking.spec.ts for the zeitraster race
  // rationale.
  const existing = await request.get(`${API}/schools/${SCHOOL}/time-grid`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (existing.ok()) {
    const grid = (await existing.json()) as {
      periods: Array<{ isBreak?: boolean }>;
    };
    const usable = grid.periods.filter((p) => !p.isBreak).length;
    if (usable >= 2) return;
  }
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

async function createThrowawayRoom(
  request: APIRequestContext,
  token: string,
  name: string,
): Promise<string> {
  const res = await request.post(`${API}/schools/${SCHOOL}/rooms`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { name, roomType: 'KLASSENZIMMER', capacity: 20, equipment: [] },
  });
  expect(res.ok(), 'POST /rooms').toBeTruthy();
  const body = (await res.json()) as { id: string };
  return body.id;
}

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

async function selectMondayMobile(page: Page): Promise<void> {
  // Mobile layout still uses the <Select> combobox — label is "Tag".
  await page.getByRole('combobox').first().click();
  await page.getByRole('option', { name: 'Montag' }).click();
}

test.describe('Phase 10.5 — Rooms Booking (mobile-375)', () => {
  let adminToken: string;
  let roomId: string;
  let roomName: string;

  test.beforeAll(async ({ request }) => {
    adminToken = await getAdminToken(request);
    await seedTimeGrid(request, adminToken);
    roomName = `E2E-ROOM-BOOK01-MOB-${Date.now()}`;
    roomId = await createThrowawayRoom(request, adminToken, roomName);
  });

  test.afterAll(async ({ request }) => {
    await cleanupE2EBookings(request, adminToken, roomId);
    await deleteThrowawayRoom(request, adminToken, roomId);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ request }) => {
    await cleanupE2EBookings(request, adminToken, roomId);
  });

  test('ROOM-BOOK-01.mobile: happy-path at 375px', async ({ page }) => {
    const purpose = `E2E-BOOK-01-MOB-${Date.now()}`;

    await page.goto('/rooms');
    const grid = page.getByRole('grid', { name: 'Raumbelegung' });
    await expect(grid).toBeVisible();

    await selectMondayMobile(page);

    const escapedName = roomName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const freeCell = page.getByRole('button', {
      name: new RegExp(`${escapedName}, Stunde 1 - Frei`),
    });

    // At 375px the grid may force horizontal scroll when periodCount is
    // large. With our 2-period seed the free cell is already in the
    // viewport, but scrollIntoViewIfNeeded() is cheap insurance.
    await freeCell.scrollIntoViewIfNeeded();
    await expect(freeCell).toBeVisible();
    await freeCell.click();

    // Dialog renders full-screen on mobile (h-[100dvh] sm:h-auto — see
    // RoomBookingDialog.tsx:71). The title is still "Raum buchen".
    await expect(page.getByRole('dialog', { name: 'Raum buchen' })).toBeVisible();

    await page.getByLabel(PURPOSE_LABEL).fill(purpose);

    await page
      .getByRole('dialog', { name: 'Raum buchen' })
      .getByRole('button', { name: 'Raum buchen' })
      .click();

    await expect(page.getByText(SUCCESS_TOAST)).toBeVisible();
    await expect(page.getByText(purpose)).toBeVisible();
  });
});
