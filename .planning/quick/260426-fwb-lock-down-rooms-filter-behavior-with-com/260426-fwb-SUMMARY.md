---
phase: 260426-fwb
plan: 01
type: quick
subsystem: web/rooms
tags: [test, regression-guard, rooms-filter, e2e, vitest, playwright]
requires:
  - apps/web/src/routes/_authenticated/rooms/index.tsx (RoomsPage with German ROOM_TYPES enum + hasActiveFilters branch)
  - apps/web/src/components/rooms/RoomAvailabilityGrid.tsx (German ROOM_TYPE_LABELS keys)
  - apps/web/src/hooks/useRoomAvailability.ts (URL-builder under test)
  - apps/web/e2e/fixtures/timetable-run.ts (seedTimetableRun — self-provisions KLASSENZIMMER room)
  - apps/web/e2e/helpers/login.ts (loginAsAdmin)
provides:
  - Component-level regression guard for ROOM_TYPES enum + filter-aware empty state
  - E2E network-level guard for roomType=KLASSENZIMMER query param
  - E2E UI-level guard for hasActiveFilters branching in the empty-state Card
affects:
  - apps/web/vitest.config.ts (no edit; new spec auto-discovered via include glob)
  - apps/web/playwright.config.ts (no edit; *.spec.ts auto-routes to desktop project)
tech-stack:
  added: []
  patterns:
    - Mount route component via Route.options.component when the component itself isn't exported
    - Local jsdom polyfill for Element.prototype.hasPointerCapture / releasePointerCapture / scrollIntoView (Radix Select 2.x dependency)
key-files:
  created:
    - apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx
    - apps/web/e2e/rooms-filter.spec.ts
  modified: []
decisions:
  - Mount via Route.options.component (RoomsPage is not exported) — keeps the spec aligned with the real route declaration so a future split-out still benefits from this guard
  - Scope the jsdom pointer-capture polyfill to this single spec instead of pushing it into apps/web/src/test/setup.ts — first project spec to interact with a Radix Select via userEvent; minimal blast radius
  - Reuse seedTimetableRun fixture for the E2E (no new fixture file) — same contract used by admin-timetable-edit-perspective.spec.ts; the fixture's self-provisioned KLASSENZIMMER room satisfies both Test 1 (klassenzimmer match exists) and Test 2 (only klassenzimmer exists, so EDV-Raum yields zero matches)
  - Pick EDV_RAUM for the zero-matches assertion — most defensive against drive-by seed changes (seedTimetableRun explicitly creates only KLASSENZIMMER); flip to MUSIKRAUM/WERKRAUM if a future seed adds an EDV_RAUM room
metrics:
  duration: 6min
  completed: 2026-04-26
---

# Quick Task 260426-fwb: Lock down rooms-filter behavior with component + E2E regression specs

## One-liner

Added two regression specs (Vitest component + Playwright desktop E2E) that lock the rooms-filter contract from commit 5378ec0 (German RoomType enum + filter-aware empty state) — no source code changes.

## Files Added

| File | Purpose |
| ---- | ------- |
| `apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx` | Vitest spec: 3 tests covering ROOM_TYPES German enum labels, the no-rooms-yet empty state, and the filter-aware empty state |
| `apps/web/e2e/rooms-filter.spec.ts` | Playwright desktop spec: 2 tests covering the network-level `roomType=KLASSENZIMMER` query param + the UI-level filter-aware empty state |

## Backlog Items Closed

From `.planning/debug/resolved/room-filter-not-working.md`:

- **Item 2 — component-level regression guard** for the 5378ec0 fix. **CLOSED** by the Vitest spec.
- **Item 3 — E2E regression guard** for the live-app filter wiring + filter-aware empty state. **CLOSED** by the Playwright spec.

## Backlog Item Still Deferred

- **Item 1 — extract `RoomType` to `packages/shared`.** **STILL DEFERRED** per the original debug session's hardening note: gated on a second consumer (e.g., the mobile app's room picker). Until then the per-page const-as-enum pattern with the cross-reference comment to backend `RoomTypeDto` is the architectural target.

## Atomic Commits

| Task | Commit | Message |
| ---- | ------ | ------- |
| 1 | `98bcae3` | `test(web): component test for rooms-filter German enum + filter-aware empty state` |
| 2 | `c3036ab` | `test(web): add rooms-filter E2E regression spec` |

## Verification

- **Vitest:** `pnpm exec vitest run src/routes/_authenticated/rooms/__tests__/index.spec.tsx` — 3 passed (1.07s).
- **Vitest related:** `pnpm exec vitest run src/hooks/__tests__/useTimetable.spec.ts` — 9 passed (existing useRooms guard still green).
- **Playwright (run 1):** `pnpm exec playwright test rooms-filter --project=desktop` — 2 passed (5.7s).
- **Playwright (run 2 — determinism):** same command — 2 passed (5.0s).
- **No source files modified:** `git diff HEAD~2 HEAD -- apps/web/src/routes/_authenticated/rooms/index.tsx apps/web/src/components/rooms/RoomAvailabilityGrid.tsx apps/web/e2e/fixtures/timetable-run.ts apps/api/prisma/seed.ts` returned empty.
- **Files changed across the plan:** exactly the two new test files (verified via `git diff HEAD~2 HEAD --name-only`).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking issue] Stub jsdom-missing pointer-capture APIs locally in the component spec**

- **Found during:** Task 1 first run (Vitest)
- **Issue:** Radix Select 2.x calls `target.hasPointerCapture(...)` on click; jsdom 26 does not implement Pointer Events APIs. Tests 1 and 3 (which open the Raumtyp combobox via `userEvent.click`) failed with `TypeError: target.hasPointerCapture is not a function`. Two unhandled exceptions surfaced even when assertions passed.
- **Fix:** Added a small no-op polyfill block at the top of the spec for `Element.prototype.hasPointerCapture`, `releasePointerCapture`, and `scrollIntoView`. Scoped to this single spec (NOT pushed into `apps/web/src/test/setup.ts`) because (a) this is the first spec in the project that interacts with a Radix Select via userEvent, and (b) modifying global setup would expand blast radius into every other spec without need.
- **Files modified:** Only the new spec file `apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx` (no source/setup edits).
- **Commit:** `98bcae3` (folded into Task 1's commit; not a separate fix commit).

**Plan executed otherwise as written.** No deviations from the file paths, the test counts, the commit messages, or the fixture choice.

## Authentication Gates

None. Stack was already partially up (Docker stack + Vite). API was started by the executor using the documented startup procedure (`node dist/main.js` with `DATABASE_URL` env). No human credentials needed beyond the seed admin user that the loginAsAdmin helper logs in with automatically.

## Self-Check: PASSED

- File `apps/web/src/routes/_authenticated/rooms/__tests__/index.spec.tsx` — FOUND
- File `apps/web/e2e/rooms-filter.spec.ts` — FOUND
- Commit `98bcae3` — FOUND in `git log --oneline --all`
- Commit `c3036ab` — FOUND in `git log --oneline --all`
- No source files modified — verified via `git diff HEAD~2 HEAD --name-only` (only the two new test files appear)
