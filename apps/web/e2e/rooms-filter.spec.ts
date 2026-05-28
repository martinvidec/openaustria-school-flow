/**
 * Quick task 260426-fwb — Rooms-filter E2E regression guard (desktop).
 *
 * Issue #167 (Phase 3.5/6 Batch C) — migrated to throwaway-school per
 * CLAUDE.md D4. The `active-timetable-run:SEED_SCHOOL_UUID` advisory lock
 * is gone; each invocation owns its own school with exactly one Room
 * (the timetable-stack's fixture room, type KLASSENZIMMER). The filter
 * tests now run against a one-room tenant — Test 1 hits that room as a
 * Klassenzimmer match; Test 2 picks Werkraum and gets the empty state.
 *
 * Drives the running RoomsPage as admin and proves the filter from commit
 * 5378ec0 (2026-04-02) is still wired correctly end-to-end:
 *
 *   Test 1 — network-level guard:
 *     Selecting Raumtyp=Klassenzimmer fires GET
 *       /api/v1/schools/:schoolId/rooms/availability?...&roomType=KLASSENZIMMER
 *     A revert of ROOM_TYPES[].value back to the pre-5378ec0 English enum
 *     would emit `roomType=REGULAR` (or similar) instead — assertion fails
 *     loudly. Belt-and-braces: also assert no legacy English enum value
 *     appears anywhere in the request URL.
 *
 *   Test 2 — UI-level guard for hasActiveFilters branching:
 *     Selecting Raumtyp=Werkraum yields zero matches in the throwaway
 *     school (only the fixture KLASSENZIMMER exists). The empty-state
 *     Card must show the filter-aware copy ("Keine passenden Raeume") and
 *     NOT the legacy un-branched copy ("Keine Raeume angelegt").
 *     Reverting the hasActiveFilters branch in rooms/index.tsx fails this
 *     assertion.
 *
 * Desktop-only via file naming (no `mobile` infix) — playwright.config.ts:42
 * routes `*.spec.ts` files to the desktop project automatically.
 */
import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/login';
import {
  createThrowawaySchool,
  type ThrowawaySchoolFixture,
} from './fixtures/throwaway-school';
import { useThrowawaySchoolHeader } from './helpers/school-context';

test.describe('Rooms-filter regression — German enum + filter-aware empty state (desktop)', () => {
  // Mobile projects run their own viewport-sized specs; this regression
  // guard only needs one platform — the filter behavior is identical
  // across viewports and the filter Card stacks/wraps the same way.
  // Belt-and-braces guard against ad-hoc --project=mobile-*.
  test.skip(
    ({ isMobile }) => isMobile,
    'Rooms-filter behavior is identical across viewports — desktop only.',
  );

  let fixture: ThrowawaySchoolFixture | undefined;

  test.beforeEach(async ({ context, page }) => {
    fixture = await createThrowawaySchool({
      roles: { admin: true, lehrer: true },
      withClasses: 1,
      withTimetableStack: true,
      namePrefix: 'E2E-ROOM-FILT',
    });
    await useThrowawaySchoolHeader(context, fixture.schoolId);
    await loginAsAdmin(page);
    await page.goto('/rooms');
    // Wait for the Raumtyp combobox to be ready before each test interacts
    // with it. Two comboboxes render: Tag (first), Raumtyp (second).
    await expect(page.getByRole('combobox').nth(1)).toBeVisible();
  });

  test.afterEach(async () => {
    if (fixture) {
      await fixture.cleanup();
      fixture = undefined;
    }
  });

  test('selecting Raumtyp=Klassenzimmer fires availability request with roomType=KLASSENZIMMER', async ({
    page,
  }) => {
    // Wait for the page to settle so the initial availability request has
    // fired and won't race the test's waitForRequest assertion.
    await page.waitForLoadState('networkidle');

    const requestPromise = page.waitForRequest(
      (req) =>
        req.method() === 'GET' &&
        /\/api\/v1\/schools\/[^/]+\/rooms\/availability\?.*roomType=KLASSENZIMMER/.test(
          req.url(),
        ),
      { timeout: 10_000 },
    );

    // Open Raumtyp combobox (second combobox; Tag is first).
    await page.getByRole('combobox').nth(1).click();
    await page
      .getByRole('option', { name: 'Klassenzimmer', exact: true })
      .click();

    const req = await requestPromise;
    const url = req.url();

    // Belt-and-braces: legacy English enum values must NEVER appear in the
    // outgoing query string. Reverting to the pre-5378ec0 enum would
    // produce e.g. `roomType=REGULAR` and fail loudly here too.
    for (const legacy of [
      'REGULAR',
      'COMPUTER_LAB',
      'SCIENCE_LAB',
      'MUSIC',
      'ART',
      'WORKSHOP',
      'GYM',
    ]) {
      expect(
        url,
        `legacy English enum "${legacy}" must not appear in the request URL`,
      ).not.toContain(`roomType=${legacy}`);
    }
  });

  test('filter that yields zero matches shows the filter-aware empty-state copy, not the no-rooms-yet copy', async ({
    page,
  }) => {
    await page.waitForLoadState('networkidle');

    // Pick Werkraum — guaranteed zero matches in the throwaway school
    // (the only room is the timetable-stack KLASSENZIMMER).
    await page.getByRole('combobox').nth(1).click();
    await page
      .getByRole('option', { name: 'Werkraum', exact: true })
      .click();

    // Filter-aware copy (the regression target):
    await expect(page.getByText('Keine passenden Raeume')).toBeVisible();
    await expect(
      page.getByText(/Keine Raeume entsprechen den aktuellen Filterkriterien/),
    ).toBeVisible();

    // Silent-regression guard — the un-branched legacy copy must NOT
    // render. Reverting the hasActiveFilters branching in rooms/index.tsx
    // would surface the no-rooms-yet copy here and fail this assertion.
    await expect(page.getByText('Keine Raeume angelegt')).not.toBeVisible({
      timeout: 2000,
    });
  });
});
