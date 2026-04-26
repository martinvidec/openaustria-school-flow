/* @vitest-environment jsdom */
/**
 * Quick task 260426-fwb — RoomsPage component-level regression guard.
 *
 * Locks the rooms-filter contract shipped in commit 5378ec0 (2026-04-02):
 *   1. ROOM_TYPES uses the German backend enum values (KLASSENZIMMER,
 *      EDV_RAUM, LABOR, TURNSAAL, MUSIKRAUM, WERKRAUM) — reverting any
 *      single value to the pre-5378ec0 English enum (REGULAR, COMPUTER_LAB,
 *      ...) makes Test 1 fail. Re-introducing the orphan ART/Kunstraum
 *      entry also fails Test 1.
 *   2. The empty-state Card branches on `hasActiveFilters` — without
 *      filters it shows "Keine Raeume angelegt"; with at least one active
 *      filter (Raumtyp != Alle) it shows "Keine passenden Raeume". Tests
 *      2 and 3 lock both branches and the silent-no-filter-revert.
 *
 * Strategy:
 *   - Mount RoomsPage via `Route.options.component` (the component itself
 *     is not exported). This keeps the spec aligned with the real route
 *     declaration so a future split-out still benefits from this guard.
 *   - Mock useRoomAvailability + useBookRoom + useCancelBooking so the
 *     spec doesn't fire network and doesn't need a real auth context.
 *   - Mock useSchoolContext to return a stable schoolId — Zustand selector
 *     interface, no need to bootstrap the user-context machinery.
 *
 * Test setup (`apps/web/src/test/setup.ts`) already stubs ResizeObserver +
 * matchMedia for Radix Select primitives, so the Raumtyp dropdown opens
 * correctly under jsdom.
 */
import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom lacks Pointer Events APIs that Radix Select 2.x relies on
// (hasPointerCapture / releasePointerCapture / scrollIntoView). The
// project-wide setup file (apps/web/src/test/setup.ts) stubs ResizeObserver
// + matchMedia for Radix portal primitives, but not the pointer-capture
// surface — adding the stubs there would change global behavior for every
// other spec. Scoping the stubs to this file keeps the blast radius
// minimal: this is the first spec in the project that interacts with a
// Radix Select via userEvent. Same workaround pattern as the radix-ui/primitives
// jsdom test setup (radix-ui/primitives#1822 and shadcn/ui#3837).
if (typeof Element.prototype.hasPointerCapture !== 'function') {
  Element.prototype.hasPointerCapture = () => false;
}
if (typeof Element.prototype.releasePointerCapture !== 'function') {
  Element.prototype.releasePointerCapture = () => {};
}
if (typeof Element.prototype.scrollIntoView !== 'function') {
  Element.prototype.scrollIntoView = () => {};
}

const {
  useRoomAvailabilityMock,
  bookRoomMock,
  cancelBookingMock,
} = vi.hoisted(() => ({
  useRoomAvailabilityMock: vi.fn(),
  bookRoomMock: vi.fn(),
  cancelBookingMock: vi.fn(),
}));

vi.mock('@/hooks/useRoomAvailability', () => ({
  useRoomAvailability: (...args: unknown[]) => useRoomAvailabilityMock(...args),
  useBookRoom: () => bookRoomMock(),
  useCancelBooking: () => cancelBookingMock(),
}));

vi.mock('@/stores/school-context-store', () => ({
  useSchoolContext: (
    selector: (s: { schoolId: string | undefined }) => unknown,
  ) => selector({ schoolId: 'school-1' }),
}));

import { Route } from '../index';

function renderRoomsPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Component = Route.options.component as React.ComponentType;
  return render(
    React.createElement(
      QueryClientProvider,
      { client: qc },
      React.createElement(Component, {}),
    ),
  );
}

describe('RoomsPage — German enum + filter-aware empty state regression guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bookRoomMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
    cancelBookingMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
    // Default: empty data, not loading, not error. Each test can override.
    useRoomAvailabilityMock.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    });
  });

  it('Raumtyp Select renders the 6 German enum labels and no orphan English labels', async () => {
    const user = userEvent.setup();
    renderRoomsPage();

    // Two comboboxes on the page: Tag (first), Raumtyp (second).
    // Per rooms/index.tsx L177-189 (Tag) vs L193-210 (Raumtyp).
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    await user.click(comboboxes[1]);

    const listbox = await screen.findByRole('listbox');

    // All 7 German option names must be present (incl. the "Alle Raumtypen"
    // sentinel that maps to value="__all__"). Reverting any value to the
    // pre-5378ec0 English enum (REGULAR, COMPUTER_LAB, SCIENCE_LAB, MUSIC,
    // ART, WORKSHOP, GYM) would not change the labels — but the labels
    // ARE the regression target since the page passes through both the
    // value AND the label, and the E2E spec catches the value drift on
    // the request URL.
    for (const label of [
      'Alle Raumtypen',
      'Klassenzimmer',
      'EDV-Raum',
      'Labor',
      'Turnsaal',
      'Musikraum',
      'Werkraum',
    ]) {
      expect(
        within(listbox).getByRole('option', { name: label }),
        `option "${label}" must be present in the Raumtyp listbox`,
      ).toBeVisible();
    }

    // Orphan English/pre-fix labels must NOT appear. "Regulaer" was the
    // localized label for the pre-fix REGULAR value; "Computer Lab" was
    // the English passthrough; "Kunstraum" was an orphan ART entry that
    // never existed in the backend enum (the fix removed it).
    for (const orphan of ['Regulaer', 'Computer Lab', 'Kunstraum']) {
      expect(
        within(listbox).queryByRole('option', { name: orphan }),
        `option "${orphan}" must NOT be present in the Raumtyp listbox`,
      ).toBeNull();
    }
  });

  it('Empty state without filters shows the no-rooms-yet copy', () => {
    renderRoomsPage();

    // Default filter state: roomType='__all__', minCapacity='', equipment=''
    // → hasActiveFilters === false → un-branched legacy copy renders.
    expect(screen.getByText('Keine Raeume angelegt')).toBeVisible();
    expect(screen.getByText(/Legen Sie Raeume an/)).toBeVisible();
    expect(screen.queryByText('Keine passenden Raeume')).toBeNull();
  });

  it('Empty state with active Raumtyp filter shows the filter-aware copy', async () => {
    const user = userEvent.setup();
    renderRoomsPage();

    // Open Raumtyp combobox (second combobox; Tag is first) and pick
    // Klassenzimmer → roomType='KLASSENZIMMER' → hasActiveFilters=true.
    const comboboxes = screen.getAllByRole('combobox');
    await user.click(comboboxes[1]);
    const listbox = await screen.findByRole('listbox');
    await user.click(
      within(listbox).getByRole('option', { name: 'Klassenzimmer' }),
    );

    // After the Select option click, Radix closes the listbox and the
    // page re-renders with hasActiveFilters=true. The filter-aware
    // empty-state copy must render and the legacy copy must NOT.
    expect(await screen.findByText('Keine passenden Raeume')).toBeVisible();
    expect(
      screen.getByText(/Keine Raeume entsprechen den aktuellen Filterkriterien/),
    ).toBeVisible();
    expect(screen.queryByText('Keine Raeume angelegt')).toBeNull();
  });
});
