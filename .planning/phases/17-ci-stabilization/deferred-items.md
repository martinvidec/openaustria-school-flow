# Phase 17 Deferred Items

Discovered during Phase 17 execution but out-of-scope for this phase. Each item is logged with file/line, the discovery context, and a recommended owner phase.

## Out-of-scope TS errors (discovered during 17-03 verification)

**File:** `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx`
**Lines affected:** 175, 192, 209, 224
**Discovered during:** 17-03 Task 1 TypeScript verification (`pnpm --filter @schoolflow/web exec tsc -p tsconfig.app.json --noEmit`)
**Symptom:** `error TS2345: Argument of type '{...; status: Q["status"]; ...}' is not assignable to parameter of type 'Partial<Q>'. Types of property 'status' are incompatible.`
**Reproducibility:** Errors present BEFORE Plan 17-03 changes (verified via `git stash` + re-run). Pre-existing.
**Why deferred:** Out of Plan 17-03 scope (touch-target lifts only — PageShell.tsx, tabs.tsx, radio-group.tsx). Touching the test file would expand the diff outside the plan's `files_modified` declaration.
**Recommended owner:** Phase 17-05 (Plan E — pre-existing regressions) or a future test-types harmonization task.
