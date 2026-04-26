---
phase: 260426-fwb
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx
  - apps/web/e2e/rooms-filter.spec.ts
autonomous: true
requirements:
  - regression-guard-room-type-enum
  - regression-guard-filter-aware-empty-state
must_haves:
  truths:
    - "Reverting ROOM_TYPES to English values (REGULAR, COMPUTER_LAB, ...) makes the component spec fail."
    - "Removing the filter-aware empty-state branch (or flipping the title/body strings) makes the component spec fail."
    - "Reverting ROOM_TYPE_LABELS keys to English makes the component spec fail (KLASSENZIMMER label asserted)."
    - "Selecting Raumtyp=Klassenzimmer in the running app fires GET /api/v1/schools/:schoolId/rooms/availability with `roomType=KLASSENZIMMER` in the query string."
    - "Selecting a Raumtyp that has no matching rooms shows the filter-aware empty-state copy in the running app, not the no-rooms-yet copy."
  artifacts:
    - path: apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx
      provides: "Vitest component spec covering ROOM_TYPES enum + ROOM_TYPE_LABELS + hasActiveFilters empty-state branching"
      contains: "describe.*RoomsPage"
    - path: apps/web/e2e/rooms-filter.spec.ts
      provides: "Playwright desktop spec asserting roomType query param + filter-aware empty-state UI"
      contains: "roomType=KLASSENZIMMER"
  key_links:
    - from: apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx
      to: apps/web/src/routes/_authenticated/rooms/index.tsx
      via: "import { Route } from '../index'; render Route.options.component"
      pattern: "Route\\.options\\.component|RoomsPage"
    - from: apps/web/e2e/rooms-filter.spec.ts
      to: /api/v1/schools/:schoolId/rooms/availability?...&roomType=KLASSENZIMMER
      via: "page.waitForRequest with regex match on URL"
      pattern: "roomType=KLASSENZIMMER"
---

<objective>
Lock down the rooms-filter behavior shipped in commit 5378ec0 (2026-04-02) so future regressions fail loudly. Two regression guards: (1) a Vitest component spec that mounts RoomsPage and asserts the German RoomType enum contract + filter-aware empty-state branch hold together at the page-file level; (2) a Playwright E2E spec that proves the filter actually works in the running app — both as a network-level assertion (the request URL carries `roomType=KLASSENZIMMER`) and as a UI-level assertion (filter-aware empty-state copy renders when zero rooms match).

Purpose: closes 2 of the 3 deferred items from `.planning/debug/resolved/room-filter-not-working.md` (per E2E-first user directive). The third item (extract RoomType to packages/shared) stays gated on a second consumer per the debug session's hardening note.

Output: two atomic test files. NO source code changes — the fix is canonical.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@./CLAUDE.md
@.planning/STATE.md
@.planning/debug/resolved/room-filter-not-working.md
@apps/web/src/routes/_authenticated/rooms/index.tsx
@apps/web/src/components/rooms/RoomAvailabilityGrid.tsx
@apps/web/src/hooks/useRoomAvailability.ts
@apps/web/src/hooks/__tests__/useTimetable.spec.ts
@apps/web/src/test/setup.ts
@apps/web/vitest.config.ts
@apps/web/e2e/admin-timetable-edit-perspective.spec.ts
@apps/web/e2e/rooms-booking.spec.ts
@apps/web/e2e/fixtures/timetable-run.ts
@apps/web/e2e/helpers/login.ts
@apps/web/playwright.config.ts
@apps/api/prisma/seed.ts

<interfaces>
<!-- Key contracts the executor needs. Extracted from the source files. -->

From apps/web/src/routes/_authenticated/rooms/index.tsx (THE FIX UNDER TEST — DO NOT EDIT):
```typescript
// L24-26 — TanStack file route export. The component is reachable via
// `Route.options.component` so the spec can render it without re-declaring
// or re-importing a private symbol. NOTE: `RoomsPage` itself is NOT exported.
export const Route = createFileRoute('/_authenticated/rooms/')({
  component: RoomsPage,
});

// L37-46 — the German RoomType enum that MUST hold (this is the regression target).
const ROOM_TYPES = [
  { value: '', label: 'Alle Raumtypen' },
  { value: 'KLASSENZIMMER', label: 'Klassenzimmer' },
  { value: 'EDV_RAUM', label: 'EDV-Raum' },
  { value: 'LABOR', label: 'Labor' },
  { value: 'TURNSAAL', label: 'Turnsaal' },
  { value: 'MUSIKRAUM', label: 'Musikraum' },
  { value: 'WERKRAUM', label: 'Werkraum' },
] as const;

// L162-164 — derived state under test
const hasRooms = slots.length > 0;
const hasActiveFilters = roomType !== '__all__' || minCapacity !== '' || equipment !== '';

// L269-284 — branch the spec asserts
{!isLoading && !isError && !hasRooms && (
  <Card>
    <CardHeader>
      <CardTitle>
        {hasActiveFilters ? 'Keine passenden Raeume' : 'Keine Raeume angelegt'}
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p>{hasActiveFilters
        ? 'Keine Raeume entsprechen den aktuellen Filterkriterien. Passen Sie die Filter an oder setzen Sie sie zurueck.'
        : 'Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen.'}</p>
    </CardContent>
  </Card>
)}
```

From apps/web/src/components/rooms/RoomAvailabilityGrid.tsx (only relevant for label-fallback assertion):
```typescript
// L49-56 — German keys, German labels. The `?? roomType` fallback at L173 means
// reverting to English keys would render raw values like "KLASSENZIMMER" instead
// of "Klasse" in the row label. The component spec asserts the German display
// label so reverting these keys fails the spec.
const ROOM_TYPE_LABELS: Record<string, string> = {
  KLASSENZIMMER: 'Klasse',
  EDV_RAUM: 'EDV',
  LABOR: 'Labor',
  TURNSAAL: 'Turnsaal',
  MUSIKRAUM: 'Musik',
  WERKRAUM: 'Werkstatt',
};
```

From apps/web/src/hooks/useRoomAvailability.ts (the hook that builds the URL the E2E asserts):
```typescript
// L34-44 — the URL shape. The Vitest spec mocks this module so it doesn't fire
// network. The Playwright spec asserts the URL via page.waitForRequest.
const params = new URLSearchParams({ dayOfWeek });
if (filters?.roomType) params.set('roomType', filters.roomType);
// → GET /api/v1/schools/:schoolId/rooms/availability?dayOfWeek=...&roomType=KLASSENZIMMER
```

From apps/web/src/stores/school-context-store (used by RoomsPage):
```typescript
// useSchoolContext is a Zustand selector. The Vitest spec must mock this
// module so RoomsPage gets a stable schoolId without bootstrapping the
// real auth/userContext machinery.
export function useSchoolContext<T>(selector: (s: { schoolId: string | undefined }) => T): T;
```

From apps/web/e2e/fixtures/timetable-run.ts (existing fixture — DO NOT MODIFY):
```typescript
// seedTimetableRun() self-provisions a Room with roomType: 'KLASSENZIMMER'
// (L242-249) when the seed school has no rooms. This is the contract we
// rely on for the E2E spec.
export interface TimetableRunFixture {
  schoolId: string;
  roomId: string;            // ← the self-provisioned (or pre-existing) room
  fixtureRoomId: string|null;// ← only set when fixture had to create one
  // ...
}
```

From apps/web/e2e/helpers/login.ts:
```typescript
export async function loginAsAdmin(page: Page): Promise<void>;
export async function getAdminToken(request: APIRequestContext): Promise<string>;
```

From apps/web/playwright.config.ts:
- Project name: `desktop` (not `desktop-chromium`).
- Naming: files matching `*.spec.ts` (no `mobile` infix) route to the desktop project automatically — see L37-42.
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Component spec — RoomsPage German enum contract + filter-aware empty-state branching</name>
  <files>apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx</files>
  <behavior>
    Mount RoomsPage with mocked dependencies and assert the regression contract from commit 5378ec0:
    - Test 1 ("Raumtyp Select renders the 6 German enum labels and no orphan English labels"):
        * Open the Raumtyp combobox.
        * Assert `getByRole('option', { name: 'Klassenzimmer' })`, `'EDV-Raum'`, `'Labor'`, `'Turnsaal'`, `'Musikraum'`, `'Werkraum'`, and `'Alle Raumtypen'` are all visible inside the open listbox.
        * Assert `queryByRole('option', { name: 'Regulaer' })` is null AND `queryByRole('option', { name: 'Computer Lab' })` is null AND `queryByRole('option', { name: 'Kunstraum' })` is null. (Catches a revert to the pre-5378ec0 English enum AND the orphan ART/Kunstraum entry.)
    - Test 2 ("Empty state without filters shows the no-rooms-yet copy"):
        * Mock useRoomAvailability to return `{ data: [], isLoading: false, isError: false }`.
        * Render with default filter state (roomType='__all__', minCapacity='', equipment='').
        * Assert `getByText('Keine Raeume angelegt')` is visible.
        * Assert `getByText(/Legen Sie Raeume an/)` is visible.
        * Assert `queryByText('Keine passenden Raeume')` is null.
    - Test 3 ("Empty state with active Raumtyp filter shows the filter-aware copy"):
        * Same hook mock as Test 2 (empty data).
        * Open the Raumtyp combobox, click the `'Klassenzimmer'` option (sets roomType='KLASSENZIMMER' → hasActiveFilters=true).
        * Assert `getByText('Keine passenden Raeume')` is visible.
        * Assert `getByText(/Keine Raeume entsprechen den aktuellen Filterkriterien/)` is visible.
        * Assert `queryByText('Keine Raeume angelegt')` is null.
  </behavior>
  <action>
    Create `apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx` (new directory `__tests__`). File header `/* @vitest-environment jsdom */`.

    Imports + setup pattern (mirror apps/web/src/hooks/__tests__/useTimetable.spec.ts):
    - `import React from 'react'`, `import { render, screen, waitFor, within } from '@testing-library/react'`, `import userEvent from '@testing-library/user-event'`, `import { QueryClient, QueryClientProvider } from '@tanstack/react-query'`, `import { describe, it, expect, beforeEach, vi } from 'vitest'`.
    - Hoist mocks via `vi.hoisted(() => ({ useRoomAvailabilityMock: vi.fn(), bookRoomMock: vi.fn(), cancelBookingMock: vi.fn(), useSchoolContextMock: vi.fn() }))`.
    - `vi.mock('@/hooks/useRoomAvailability', () => ({ useRoomAvailability: (...args: unknown[]) => useRoomAvailabilityMock(...args), useBookRoom: () => bookRoomMock(), useCancelBooking: () => cancelBookingMock() }))`.
    - `vi.mock('@/stores/school-context-store', () => ({ useSchoolContext: (selector: (s: { schoolId: string|undefined }) => unknown) => selector({ schoolId: 'school-1' }) }))`.
    - In `beforeEach`: `vi.clearAllMocks()`; set `bookRoomMock.mockReturnValue({ mutate: vi.fn(), isPending: false })`, `cancelBookingMock.mockReturnValue({ mutate: vi.fn(), isPending: false })`, default `useRoomAvailabilityMock.mockReturnValue({ data: [], isLoading: false, isError: false })`.

    Render helper:
    ```ts
    import { Route } from '../index';
    function renderRoomsPage() {
      const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const Component = Route.options.component as React.ComponentType;
      return render(
        React.createElement(QueryClientProvider, { client: qc },
          React.createElement(Component, {}))
      );
    }
    ```
    Rationale: `RoomsPage` is not exported; access it via `Route.options.component`. This is cleaner than re-importing a private symbol AND keeps the spec aligned with the real route declaration so a future refactor that splits the component out still benefits from this guard.

    Test 1 — Raumtyp options: open the Raumtyp combobox. There are TWO comboboxes on the page (Tag = first, Raumtyp = second). Use `screen.getAllByRole('combobox')[1]` and click. Then within `screen.getByRole('listbox')`, assert each of the 7 German option names is visible (`'Alle Raumtypen'`, `'Klassenzimmer'`, `'EDV-Raum'`, `'Labor'`, `'Turnsaal'`, `'Musikraum'`, `'Werkraum'`). Then assert the orphan English/pre-fix labels are absent: `'Regulaer'`, `'Computer Lab'`, `'Kunstraum'` via `queryByRole('option', { name: ... })` returning null.

    Test 2 — default empty state: render with the default mock (data=[]). Assert `'Keine Raeume angelegt'` and the body copy `/Legen Sie Raeume an/` are visible, and `'Keine passenden Raeume'` is NOT in the document.

    Test 3 — filter-active empty state: render with the default mock (data=[]). Open Raumtyp combobox via `userEvent.click(screen.getAllByRole('combobox')[1])`, then `userEvent.click(screen.getByRole('option', { name: 'Klassenzimmer' }))`. Wait for the listbox to close, then assert `'Keine passenden Raeume'` and `/Keine Raeume entsprechen den aktuellen Filterkriterien/` are visible, and `'Keine Raeume angelegt'` is NOT in the document.

    Why this strategy (over the alternatives): rendering the route component with mocked hooks is the lowest-friction option that catches enum drift in the page file specifically. Extracting `ROOM_TYPES` to a unit-testable module would require source changes (forbidden by the constraints). A full TanStack Router test setup is overkill — RoomsPage uses no router APIs internally (no `useNavigate`, no `useParams`). The existing `apps/web/src/test/setup.ts` already stubs ResizeObserver + matchMedia for Radix Select primitives, so the Raumtyp dropdown opens correctly under jsdom (same primitives are battle-tested by the screenshots/perspective specs).

    Do NOT modify rooms/index.tsx, RoomAvailabilityGrid.tsx, or any source file. The fix is canonical.

    Commit message (atomic, single commit for this task):
    `test(web): component test for rooms-filter German enum + filter-aware empty state`
  </action>
  <verify>
    <automated>cd apps/web && pnpm exec vitest run src/routes/_authenticated/rooms/__tests__/index.spec.tsx</automated>
  </verify>
  <done>
    All 3 tests pass. Reverting any of the following in source code (then re-running the spec) makes the spec fail loudly:
    - Renaming a single `ROOM_TYPES[].value` from German to English (e.g., `'REGULAR'` instead of `'KLASSENZIMMER'`)
    - Re-introducing the orphan `'ART'`/`'Kunstraum'` entry
    - Replacing `hasActiveFilters ? 'Keine passenden Raeume' : 'Keine Raeume angelegt'` with the un-branched legacy `'Keine Raeume angelegt'`
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: E2E spec — rooms-filter network-level + UI-level regression guard</name>
  <files>apps/web/e2e/rooms-filter.spec.ts</files>
  <behavior>
    Drive the running RoomsPage as admin and prove the filter wires correctly end-to-end:
    - Test 1 ("Selecting Raumtyp=Klassenzimmer fires GET availability with roomType=KLASSENZIMMER"):
        * Wait for the initial availability request to settle.
        * Set up `page.waitForRequest` matching `/api/v1/schools/.+/rooms/availability\?.*roomType=KLASSENZIMMER/`.
        * Click the Raumtyp combobox (second combobox on page), pick the `'Klassenzimmer'` option.
        * Await the request promise — assertion: a GET to the availability endpoint with `roomType=KLASSENZIMMER` in the query string was sent.
        * Belt-and-braces: read `request.url()` and assert it does NOT contain any of the legacy English values (`REGULAR`, `COMPUTER_LAB`, `SCIENCE_LAB`, `MUSIC`, `ART`, `WORKSHOP`, `GYM`).
    - Test 2 ("Filter that yields zero matches shows the filter-aware empty-state copy"):
        * Use a deterministic UI-level fixture: pick a `roomType` value that the seed/fixture provably has no rooms for. The seedTimetableRun fixture self-provisions a `KLASSENZIMMER` room (timetable-run.ts:242-249), so `EDV_RAUM` is guaranteed to yield zero matches in a clean test DB.
        * Click Raumtyp combobox, select `'EDV-Raum'`.
        * Assert `page.getByText('Keine passenden Raeume')` is visible.
        * Assert `page.getByText(/Keine Raeume entsprechen den aktuellen Filterkriterien/)` is visible.
        * Silent-4xx invariant: assert `page.getByText('Keine Raeume angelegt')` is NOT visible (`{ timeout: 2000 }`). Reverting hasActiveFilters branching would surface the no-rooms-yet copy here and fail this assertion.
  </behavior>
  <action>
    Create `apps/web/e2e/rooms-filter.spec.ts` (desktop project — no `mobile` infix per playwright.config.ts:42).

    Imports + structure (mirror apps/web/e2e/admin-timetable-edit-perspective.spec.ts and rooms-booking.spec.ts):
    - `import { test, expect } from '@playwright/test'`
    - `import { loginAsAdmin } from './helpers/login'`
    - `import { seedTimetableRun, cleanupTimetableRun, type TimetableRunFixture } from './fixtures/timetable-run'`
    - `const SCHOOL_ID = process.env.E2E_SCHOOL_ID ?? 'seed-school-bgbrg-musterstadt'`

    Fixture choice — REUSE `seedTimetableRun` (do NOT create a new fixture). Justification:
    - The fixture's existing contract guarantees: (a) at least one Room exists for `SCHOOL_ID`, (b) that room is type `KLASSENZIMMER` when the fixture self-provisions it (timetable-run.ts:242-249, `roomType: 'KLASSENZIMMER'`), and (c) MON–FRI school days are active so the availability grid renders.
    - For Test 2 we need a roomType that yields ZERO matches. `EDV_RAUM` is the safest pick — the seedTimetableRun fixture only ever creates KLASSENZIMMER rooms, and the standard prisma:seed creates ZERO rooms (verified). If a future seed adds EDV_RAUM rooms, this spec will start failing — that is the correct behavior; flip the assertion to a different empty type (`MUSIKRAUM`, `WERKRAUM`) at that point.
    - The constraint allows creating a small new fixture file IF a NEW fixture is needed. Here it's not — reusing the existing one is strictly less work AND aligns with the perspective spec's pattern.

    `test.describe('Rooms-filter regression — German enum + filter-aware empty state (desktop)', ...)`:
    - `test.skip(({ isMobile }) => isMobile, 'Filter behavior is identical across viewports — desktop only.')` (mirror admin-timetable-edit-perspective.spec.ts:81-84)
    - `let fixture: TimetableRunFixture` at describe scope
    - `beforeEach`: `fixture = await seedTimetableRun(SCHOOL_ID); await loginAsAdmin(page); await page.goto('/rooms');`
      - After goto, await the grid OR the empty-state Card (`Promise.race` not needed — wait for the filter combobox: `await expect(page.getByRole('combobox').nth(1)).toBeVisible()` — Raumtyp is the SECOND combobox on the page; Tag is first per rooms/index.tsx L177-189 vs L193-210).
    - `afterEach`: `if (fixture) { await cleanupTimetableRun(fixture); }`

    Test 1 — network-level assertion:
    ```ts
    test('selecting Raumtyp=Klassenzimmer fires availability request with roomType=KLASSENZIMMER', async ({ page }) => {
      // Wait for the page to settle so the initial availability request has fired.
      await page.waitForLoadState('networkidle');

      const requestPromise = page.waitForRequest(
        (req) =>
          req.method() === 'GET' &&
          /\/api\/v1\/schools\/[^/]+\/rooms\/availability\?.*roomType=KLASSENZIMMER/.test(req.url()),
        { timeout: 10_000 },
      );

      // Open Raumtyp combobox (second combobox; Tag is first).
      await page.getByRole('combobox').nth(1).click();
      await page.getByRole('option', { name: 'Klassenzimmer', exact: true }).click();

      const req = await requestPromise;
      const url = req.url();
      // Belt-and-braces: legacy English enum values must NEVER appear in the
      // outgoing query string. Reverting to the pre-5378ec0 enum would
      // produce e.g. `roomType=REGULAR` and fail loudly here too.
      for (const legacy of ['REGULAR', 'COMPUTER_LAB', 'SCIENCE_LAB', 'MUSIC', 'ART', 'WORKSHOP', 'GYM']) {
        expect(url, `legacy English enum "${legacy}" must not appear in the request URL`).not.toContain(`roomType=${legacy}`);
      }
    });
    ```

    Test 2 — UI-level assertion (filter-aware empty state):
    ```ts
    test('filter that yields zero matches shows the filter-aware empty-state copy, not the no-rooms-yet copy', async ({ page }) => {
      await page.waitForLoadState('networkidle');

      // Pick EDV-Raum — guaranteed zero matches because seedTimetableRun's
      // self-provisioned room is KLASSENZIMMER and prisma:seed creates zero
      // rooms. Day filter stays at the default (today's weekday or MONDAY).
      await page.getByRole('combobox').nth(1).click();
      await page.getByRole('option', { name: 'EDV-Raum', exact: true }).click();

      // Filter-aware copy (the regression target):
      await expect(page.getByText('Keine passenden Raeume')).toBeVisible();
      await expect(
        page.getByText(/Keine Raeume entsprechen den aktuellen Filterkriterien/),
      ).toBeVisible();

      // Silent-regression guard — the un-branched legacy copy must NOT render.
      await expect(page.getByText('Keine Raeume angelegt')).not.toBeVisible({ timeout: 2000 });
    });
    ```

    Spec authoring rules:
    - Selectors: `getByRole('combobox').nth(1)` for Raumtyp (Tag is first). `getByRole('option', { name: ..., exact: true })` for Select options. `getByText` for empty-state copy. NO test-ids needed; the existing markup is selector-friendly.
    - Day default: do NOT pin a day. The test must work whether `getTodayDayOfWeek()` returns MON/TUE/.../FRI — all five are activated by the fixture.
    - Use `await page.waitForLoadState('networkidle')` before opening the Select so the initial useRoomAvailability call doesn't race the test's `waitForRequest`.

    Do NOT modify the seedTimetableRun fixture's contract. Do NOT add a new fixture file (the existing one suffices — see fixture-choice rationale above).

    Commit message (atomic, single commit for this task):
    `test(web): add rooms-filter E2E regression spec`
  </action>
  <verify>
    <automated>cd apps/web && pnpm exec playwright test rooms-filter.spec.ts --project=desktop</automated>
  </verify>
  <done>
    Both tests pass against the running stack (docker compose up -d postgres redis keycloak; API on :3000; Vite on :5173; prisma:seed run). Reverting any of the following in source then re-running the spec makes it fail:
    - `ROOM_TYPES.value` for KLASSENZIMMER → any English value (Test 1 fails: request URL no longer contains `roomType=KLASSENZIMMER`)
    - The `hasActiveFilters` branching in the empty-state Card → the legacy un-branched copy (Test 2 fails: 'Keine passenden Raeume' missing AND 'Keine Raeume angelegt' visible when it shouldn't be)
  </done>
</task>

</tasks>

<verification>
- Component spec: `cd apps/web && pnpm exec vitest run src/routes/_authenticated/rooms/__tests__/index.spec.tsx` — green.
- E2E spec: `cd apps/web && pnpm exec playwright test rooms-filter.spec.ts --project=desktop` — green (requires docker stack + API + Vite + prisma:seed per playwright.config.ts:7-10).
- No source-code edits. `git diff -- apps/web/src/routes/_authenticated/rooms/index.tsx apps/web/src/components/rooms/RoomAvailabilityGrid.tsx apps/web/e2e/fixtures/timetable-run.ts` returns empty.
- Atomic commits: exactly two new test commits land on the branch, in order:
  1. `test(web): component test for rooms-filter German enum + filter-aware empty state`
  2. `test(web): add rooms-filter E2E regression spec`
</verification>

<success_criteria>
- `apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx` exists and passes (3 tests).
- `apps/web/e2e/rooms-filter.spec.ts` exists and passes against the running stack (2 tests, desktop project only).
- No source files modified — only the two new test files are added.
- Reverting `ROOM_TYPES` to English causes BOTH the component spec AND the E2E spec to fail loudly (proven by manual revert-and-rerun before commit, OR by inspection of the assertions).
- Reverting `hasActiveFilters` empty-state branching causes BOTH specs to fail loudly.
- Two atomic commits land on `main` (or the working branch), each with the exact commit messages above.
- Quick task SUMMARY references the two files and notes that backlog items #2 + #3 from `room-filter-not-working.md` are now closed; item #1 (extract RoomType to packages/shared) remains deferred per the original debug session's hardening note.
</success_criteria>

<output>
After completion, create `.planning/quick/260426-fwb-lock-down-rooms-filter-behavior-with-com/260426-fwb-SUMMARY.md` summarising:
- Files added (component spec + E2E spec)
- Which backlog items closed (2 of 3 from room-filter-not-working.md)
- Which backlog item remains deferred (RoomType in packages/shared — gated on second consumer)
- Atomic commit shas
</output>
