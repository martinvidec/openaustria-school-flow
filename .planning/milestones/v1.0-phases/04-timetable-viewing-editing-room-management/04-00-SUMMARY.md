---
phase: 04-timetable-viewing-editing-room-management
plan: 00
subsystem: testing
tags: [vitest, testing-library, jest-dom, jsdom, test-stubs, nyquist]

# Dependency graph
requires:
  - phase: 03-timetable-solver-engine
    provides: "API vitest config pattern, existing timetable.service.spec.ts, room module"
provides:
  - "Vitest configuration for web workspace (jsdom, Testing Library)"
  - "8 test stub files covering VIEW-01 through VIEW-06, TIME-08, ROOM-03, ROOM-04, ROOM-05"
  - "Wave 0 test infrastructure for behavioral sampling in all Phase 4 plans"
affects: [04-01, 04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 04-08]

# Tech tracking
tech-stack:
  added: [vitest (web), "@testing-library/react", "@testing-library/jest-dom", "@testing-library/user-event", "@vitest/coverage-v8", jsdom]
  patterns: ["it.todo() stubs for Wave 0 Nyquist sampling", "setupFiles with jest-dom/vitest matchers and cleanup"]

key-files:
  created:
    - apps/web/vitest.config.ts
    - apps/web/src/test/setup.ts
    - apps/web/package.json
    - apps/web/tsconfig.json
    - apps/web/src/components/timetable/TimetableGrid.test.tsx
    - apps/web/src/components/timetable/PerspectiveSelector.test.tsx
    - apps/web/src/hooks/useSocket.test.ts
    - apps/web/src/lib/colors.test.ts
    - apps/api/src/modules/timetable/timetable-export.service.spec.ts
    - apps/api/src/modules/room/room-booking.service.spec.ts
    - apps/api/src/modules/resource/resource.service.spec.ts
  modified:
    - apps/api/src/modules/timetable/timetable.service.spec.ts

key-decisions:
  - "Minimal package.json for web workspace since Plan 04-02 (SPA scaffolding) may run in parallel"
  - "react and react-dom installed as devDependencies in web for Testing Library peer deps"
  - "validateMove stubs appended to existing timetable.service.spec.ts rather than creating a new file"

patterns-established:
  - "Wave 0 it.todo() pattern: every requirement gets test stubs before implementation"
  - "Test file naming: *.test.tsx for web components, *.spec.ts for API services"
  - "setupFiles with afterEach(cleanup) for React Testing Library"

requirements-completed: [VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, TIME-08, ROOM-03, ROOM-04, ROOM-05]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 4 Plan 00: Nyquist Wave 0 Test Infrastructure Summary

**Vitest web workspace config with Testing Library setup and 8 test stub files covering all 10 Phase 4 requirements for behavioral sampling**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T14:18:23Z
- **Completed:** 2026-03-31T14:21:30Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Vitest configured for web workspace with jsdom environment, Testing Library jest-dom matchers, and afterEach cleanup
- 8 test stub files created (4 web, 4 API) with 43 todo tests covering VIEW-01 through VIEW-06, TIME-08, ROOM-03, ROOM-04, ROOM-05
- Existing timetable.service.spec.ts extended with TIME-08 validateMove stubs without breaking 177 existing passing tests
- Both web and API workspaces run Vitest successfully with all stubs reported as pending/todo

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Vitest config and Testing Library setup** - `10f76b1` (test)
2. **Task 2: Create all Nyquist test stub files** - `fda662f` (test)

**Plan metadata:** pending

## Files Created/Modified
- `apps/web/vitest.config.ts` - Vitest config with jsdom, setupFiles, @/ alias, v8 coverage
- `apps/web/src/test/setup.ts` - Testing Library jest-dom/vitest matchers and afterEach cleanup
- `apps/web/package.json` - Minimal web workspace with test dependencies
- `apps/web/tsconfig.json` - TypeScript config with React JSX, bundler resolution, @/ paths
- `apps/web/src/components/timetable/TimetableGrid.test.tsx` - VIEW-01/VIEW-02 test stubs (6 todos)
- `apps/web/src/components/timetable/PerspectiveSelector.test.tsx` - VIEW-03 test stubs (5 todos)
- `apps/web/src/hooks/useSocket.test.ts` - VIEW-04/ROOM-05 test stubs (6 todos)
- `apps/web/src/lib/colors.test.ts` - VIEW-05 test stubs (4 todos)
- `apps/api/src/modules/timetable/timetable.service.spec.ts` - TIME-08 validateMove stubs appended (5 todos)
- `apps/api/src/modules/timetable/timetable-export.service.spec.ts` - VIEW-06 PDF/iCal stubs (7 todos)
- `apps/api/src/modules/room/room-booking.service.spec.ts` - ROOM-03 booking stubs (5 todos)
- `apps/api/src/modules/resource/resource.service.spec.ts` - ROOM-04 resource stubs (5 todos)

## Decisions Made
- Created minimal apps/web/package.json since Plan 04-02 (SPA scaffolding) runs in parallel and will extend it
- Installed react and react-dom as devDependencies for Testing Library peer deps (04-02 will promote to dependencies)
- Appended TIME-08 validateMove stubs to existing timetable.service.spec.ts rather than creating a separate file, preserving all 177 passing tests
- Used ignoreDeprecations "6.0" in tsconfig.json consistent with Phase 1 decision

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All Wave 0 test stubs are in place for Plans 04-01 through 04-08 to reference in their verify blocks
- Web Vitest config works independently of Vite dev config (04-02 SPA scaffolding)
- API test stubs integrate cleanly with existing Phase 3 test infrastructure
- VALIDATION.md wave_0_complete can be set to true

## Self-Check: PASSED

All 11 created files verified on disk. Both commit hashes (10f76b1, fda662f) found in git log.

---
*Phase: 04-timetable-viewing-editing-room-management*
*Completed: 2026-03-31*
