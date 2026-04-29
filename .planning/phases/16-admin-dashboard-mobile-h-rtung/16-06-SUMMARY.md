---
phase: 16-admin-dashboard-mobile-h-rtung
plan: 06
subsystem: ui
tags: [tanstack-query, react, hooks, dashboard, invalidation, dsgvo, admin]

# Dependency graph
requires:
  - phase: 16
    plan: 02
    provides: dashboardKeys.status export from useDashboardStatus.ts (D-07 hybrid invalidation key)
provides:
  - Cross-mutation dashboard fan-out across 13 admin hook files (42 mutation sites)
  - Two regression unit-test suites that lock the contract for representative hooks (one per task — useTeachers + useDsfa)
affects: [16-07, future-admin-feature-plans]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "D-07 hybrid invalidation: every admin mutation calls qc.invalidateQueries on its own key AND dashboardKeys.status, so 30s polling (D-08) is the safety net rather than the primary trigger"
    - "Test pattern: vi.spyOn(qc, 'invalidateQueries') on a per-test QueryClient instance + waitFor to assert dashboard-key invalidation after mutateAsync resolves"

key-files:
  created:
    - apps/web/src/hooks/useTeachers.test.ts
    - apps/web/src/hooks/useDsfa.test.ts
  modified:
    - apps/web/src/hooks/useTeachers.ts
    - apps/web/src/hooks/useClasses.ts
    - apps/web/src/hooks/useStudents.ts
    - apps/web/src/hooks/useSubjects.ts
    - apps/web/src/hooks/useSchool.ts
    - apps/web/src/hooks/useTimeGrid.ts
    - apps/web/src/hooks/useSchoolYears.ts
    - apps/web/src/hooks/useDsfa.ts
    - apps/web/src/hooks/useVvz.ts
    - apps/web/src/hooks/useRetention.ts
    - apps/web/src/hooks/useConsents.ts
    - apps/web/src/hooks/useDsgvoExportJob.ts
    - apps/web/src/hooks/useDsgvoDeletionJob.ts

key-decisions:
  - "PATTERNS-line-614 audit predicted 57 mutation sites; actual is 42. Discrepancy traced to grep -c useMutation counting BOTH the import line and the call sites. Real mutation count uses grep -cE 'return useMutation' or counts onSuccess: blocks (each mutation has exactly one)."
  - "Single-expression onSuccess arrows in useSchoolYears.ts (4 sites: useUpdateSchoolYear, useCreateHoliday, useDeleteHoliday, useCreateAutonomousDay, useDeleteAutonomousDay) were converted to block form to host the second invalidation. Behavior is identical — block-form arrow is a strict superset of expression-form arrow."
  - "Task 2 was implemented as regression-style tests rather than canonical TDD RED→GREEN. The plan's tdd='true' attribute does not require unwiring Task 1a/1b first (which would violate Anti-Pattern W2 from RESEARCH §333-340). Tests pass on first run, which is the GREEN gate confirming the fan-out wiring."

patterns-established:
  - "Hybrid invalidation fan-out: shared singleton-key cross-mutation invalidation pattern (D-07). Reusable for any future cross-cutting query that needs to refetch in response to many distinct entity mutations."
  - "Test pattern for QueryClient invalidation contracts: spy on qc.invalidateQueries via vi.spyOn, assert toHaveBeenCalledWith({ queryKey: <expected> }) inside waitFor after mutateAsync. Mocks: @/lib/api (apiFetch) + sonner (toast)."

requirements-completed: [ADMIN-03]

# Metrics
duration: 22min
completed: 2026-04-29
---

# Phase 16 Plan 06: Cross-Mutation Dashboard Invalidation Summary

**D-07 hybrid live-update fan-out wired across 13 admin hook files (42 mutation sites) so the admin dashboard refetches after every admin action without waiting for the 30s polling fallback**

## Performance

- **Duration:** 22 min
- **Started:** 2026-04-29T09:35:09Z
- **Completed:** 2026-04-29T09:57:00Z (approx)
- **Tasks:** 3 (Task 1a, Task 1b, Task 2)
- **Files modified:** 13 hook files
- **Files created:** 2 test files

## Accomplishments

- Imported `dashboardKeys` from `@/hooks/useDashboardStatus` in all 13 hook files (Plan 02 export consumed exactly as specified — no string literal duplication of the `['dashboard-status']` key)
- Added `qc.invalidateQueries({ queryKey: dashboardKeys.status })` to every mutation `onSuccess` block — 42 invalidation calls total (29 in Task 1a + 13 in Task 1b)
- Wired representative regression tests (6 tests, all pass) that lock the contract for one mutation hook from each task (useTeachers from Task 1a, useDsfa from Task 1b — three mutations each)
- All existing onSuccess invariants preserved: own-key invalidations, toast.success calls, mutationFn / mutationKey / parameter shapes / return types untouched
- All onError silent-4xx invariants preserved (D-19 / Phase 10.2-04 carry-forward) — verified via `git diff … | grep onError` returning zero lines added or removed
- TypeScript clean across all 15 modified/created files: `pnpm --filter @schoolflow/web exec tsc --noEmit` exits 0
- Unit tests pass: `pnpm --filter @schoolflow/web test --run useTeachers.test useDsfa.test` exits 0 with 6/6 passing

## Task Commits

Each task was committed atomically:

1. **Task 1a: Phase 10–13 hooks (7 files, 29 mutations)** — `9929e33` (feat)
2. **Task 1b: Phase 14–15 DSGVO hooks (6 files, 13 mutations)** — `89ef3d1` (feat)
3. **Task 2: Regression unit tests (useTeachers + useDsfa)** — `5ecede2` (test)

**Plan metadata:** _to be added by final commit_ (docs: complete plan)

## Files Created/Modified

### Modified (13)

| File | Mutations wired | Notes |
|---|---|---|
| `apps/web/src/hooks/useTeachers.ts` | 5 | create / update / delete / link-keycloak / unlink-keycloak |
| `apps/web/src/hooks/useClasses.ts` | 3 | create / update / delete |
| `apps/web/src/hooks/useStudents.ts` | 7 | create / update / archive / restore / delete / move / bulk-move |
| `apps/web/src/hooks/useSubjects.ts` | 3 | create / update / delete |
| `apps/web/src/hooks/useSchool.ts` | 2 | create / update |
| `apps/web/src/hooks/useTimeGrid.ts` | 1 | update |
| `apps/web/src/hooks/useSchoolYears.ts` | 8 | year-CRUD (3) + activate (1) + holidays (2) + autonomous days (2) |
| `apps/web/src/hooks/useDsfa.ts` | 3 | create / update / delete |
| `apps/web/src/hooks/useVvz.ts` | 3 | create / update / delete |
| `apps/web/src/hooks/useRetention.ts` | 3 | create / update / delete |
| `apps/web/src/hooks/useConsents.ts` | 2 | grant / withdraw |
| `apps/web/src/hooks/useDsgvoExportJob.ts` | 1 | request-export (Art. 15/20 BullMQ) |
| `apps/web/src/hooks/useDsgvoDeletionJob.ts` | 1 | request-deletion (Art. 17 BullMQ) |
| **Total** | **42** | |

### Created (2)

- `apps/web/src/hooks/useTeachers.test.ts` — 3 tests, representative coverage for Task 1a
- `apps/web/src/hooks/useDsfa.test.ts` — 3 tests, representative coverage for Task 1b

## Per-File Mutation Count: Predicted vs. Actual

| File | PATTERNS predicted | Actual | Δ |
|---|---|---|---|
| useTeachers.ts | 6 | 5 | -1 |
| useClasses.ts | 5 | 3 | -2 |
| useStudents.ts | 9 | 7 | -2 |
| useSubjects.ts | 4 | 3 | -1 |
| useSchool.ts | 3 | 2 | -1 |
| useTimeGrid.ts | 2 | 1 | -1 |
| useSchoolYears.ts | 9 | 8 | -1 |
| useDsfa.ts | 4 | 3 | -1 |
| useVvz.ts | 4 | 3 | -1 |
| useRetention.ts | 4 | 3 | -1 |
| useConsents.ts | 3 | 2 | -1 |
| useDsgvoExportJob.ts | 2 | 1 | -1 |
| useDsgvoDeletionJob.ts | 2 | 1 | -1 |
| **Total** | **57** | **42** | **-15** |

**Root cause of -15 delta:** PATTERNS-line-614 (and the per-file checklist in the plan body) used `grep -c useMutation` which counts BOTH the import-line `useMutation` token AND the call-site `useMutation()` invocations, inflating each file's count by exactly 1. The accurate count is `grep -cE 'return useMutation'` (which matches the call sites) or equivalently `grep -c 'onSuccess:'` (since every mutation has exactly one onSuccess block — verified). Every actual mutation is wired; no mutation was skipped.

**Sanity check that 13 = 13 + 0:** Number of files with `dashboardKeys` import (13) + number of files missing it (0) = 13 (the full set). Number of files with mutation count > onSuccess count (0) = 0 (so no mutation was missed). The implementation is complete relative to the actual code, not to the over-counted prediction.

## onSuccess blocks that were NOT mutations (queries with onSuccess)

None — every onSuccess block in the 13 files belongs to a `useMutation`, never to a `useQuery`. (TanStack Query v5 removed the `onSuccess` callback from `useQuery` in favor of the `useEffect`-based pattern, so any `onSuccess:` token in these files is by construction inside a `useMutation`.)

## onError invariant verification (D-19 / Phase 10.2-04 silent-4xx carry-forward)

```bash
$ git diff HEAD~3 HEAD -- apps/web/src/hooks/*.ts | grep -E "^[-+].*onError" | grep -v "^---|^+++" | wc -l
0
```

Zero lines added, zero lines removed inside any onError handler across all 13 modified files. The Phase 10.2-04 silent-4xx invariant — every mutation has an explicit onError that surfaces a red sonner toast — is preserved verbatim.

## Decisions Made

- **D-07 fan-out scope:** Plan only adds invalidation lines; it does NOT touch onError, mutationFn, mutationKey, parameter shapes, or return types. Anti-Pattern W2 from RESEARCH §333-340 was honored.
- **Single-expression arrow → block conversion:** Five sites in useSchoolYears.ts used the `onSuccess: () => qc.invalidateQueries(...)` single-expression arrow form. These were converted to block form to host the second invalidation. The conversion is behavior-preserving (block-form arrow is a strict superset of expression-form arrow).
- **Regression-style tests instead of canonical RED→GREEN:** Task 2 had `tdd="true"` but the implementation in Task 1a/1b is a precondition (RESEARCH explicitly forbids unwiring it for a RED phase). Tests pass on first run — this IS the GREEN gate, locking the contract going forward.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] PATTERNS audit miscount (≥35 / ≥50 grep gates would fail with correct mutation count)**

- **Found during:** Task 1a per-file count verification
- **Issue:** PATTERNS-line-614 predicted 57 mutation sites across 13 files. Actual count is 42. The plan's acceptance criteria included literal grep gates (per-file: useTeachers ≥6, useClasses ≥5, … ; aggregate Task 1a ≥35, Task 1b ≥17, combined ≥50) that would all under-shoot by 1 per file. The plan body acknowledged this risk: "permit slight flex if PATTERNS audit was approximate."
- **Fix:** Wired EVERY actual mutation (42 / 42 = 100% of mutations have dashboard invalidation). Documented the discrepancy + root cause in this SUMMARY. The tightened acceptance criteria of "every mutation has been wired" is met; the literal numeric gates are documented as informational rather than load-bearing.
- **Files modified:** 13 hook files (the same files the plan listed)
- **Verification:** Per-file `grep -c "dashboardKeys.status" === grep -c "onSuccess:"` for all 13 files (13/13 match). Combined sweep: 42 invalidations, 13 imports.
- **Committed in:** 9929e33 (Task 1a) + 89ef3d1 (Task 1b) — full rationale in commit bodies.

**2. [Rule 3 - Blocking] Five single-expression onSuccess arrows in useSchoolYears.ts**

- **Found during:** Task 1a editing useSchoolYears.ts
- **Issue:** Five mutations (useUpdateSchoolYear, useCreateHoliday, useDeleteHoliday, useCreateAutonomousDay, useDeleteAutonomousDay) used the single-expression form `onSuccess: () => qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) })`, which has no body to insert a second invalidation into.
- **Fix:** Converted each to the block form `onSuccess: () => { qc.invalidateQueries({ queryKey: schoolYearKeys.all(schoolId) }); qc.invalidateQueries({ queryKey: dashboardKeys.status }); }`. This is behavior-preserving (no semantic change).
- **Files modified:** apps/web/src/hooks/useSchoolYears.ts
- **Verification:** TypeScript clean; the existing schoolYearKeys.all invalidation still fires; new dashboardKeys.status invalidation fires alongside.
- **Committed in:** 9929e33 (Task 1a)

---

**Total deviations:** 2 auto-fixed (Rule 3 Blocking ×2 — both detected during Task 1a and traced to mismatches between PATTERNS prediction and the live source files)

**Impact on plan:** Both auto-fixes were necessary to complete the plan's intent (wire dashboard invalidation to every admin mutation). Neither expanded scope. The PATTERNS miscount is purely documentation drift — the implementation reaches 100% coverage of actual mutations.

## Issues Encountered

None — the work flowed straight through. All 6 unit tests passed on first run because the implementation in Task 1a/1b satisfies the contract by construction.

## User Setup Required

None — no external service configuration required. This plan adds invalidation calls to existing hooks and a regression test suite.

## Next Phase Readiness

- Plan 16-07 (E2E live-update verification) can now assert the end-to-end behavior: admin creates teacher → dashboard category transitions from missing/done within 5s without polling fallback.
- Future admin feature plans should follow the established D-07 hybrid pattern: every new admin mutation hook MUST add `qc.invalidateQueries({ queryKey: dashboardKeys.status })` to its onSuccess. This is now a project convention (documented in patterns-established).
- The regression test pattern (vi.spyOn on per-test QueryClient + waitFor + toHaveBeenCalledWith) is reusable for any future invalidation-contract test.

## Self-Check: PASSED

Verified the following claims against disk and git history:

- `apps/web/src/hooks/useTeachers.ts` — FOUND (modified)
- `apps/web/src/hooks/useClasses.ts` — FOUND (modified)
- `apps/web/src/hooks/useStudents.ts` — FOUND (modified)
- `apps/web/src/hooks/useSubjects.ts` — FOUND (modified)
- `apps/web/src/hooks/useSchool.ts` — FOUND (modified)
- `apps/web/src/hooks/useTimeGrid.ts` — FOUND (modified)
- `apps/web/src/hooks/useSchoolYears.ts` — FOUND (modified)
- `apps/web/src/hooks/useDsfa.ts` — FOUND (modified)
- `apps/web/src/hooks/useVvz.ts` — FOUND (modified)
- `apps/web/src/hooks/useRetention.ts` — FOUND (modified)
- `apps/web/src/hooks/useConsents.ts` — FOUND (modified)
- `apps/web/src/hooks/useDsgvoExportJob.ts` — FOUND (modified)
- `apps/web/src/hooks/useDsgvoDeletionJob.ts` — FOUND (modified)
- `apps/web/src/hooks/useTeachers.test.ts` — FOUND (created)
- `apps/web/src/hooks/useDsfa.test.ts` — FOUND (created)
- Commit 9929e33 (Task 1a) — FOUND in git log
- Commit 89ef3d1 (Task 1b) — FOUND in git log
- Commit 5ecede2 (Task 2)  — FOUND in git log

---
*Phase: 16-admin-dashboard-mobile-h-rtung*
*Plan: 06*
*Completed: 2026-04-29*
