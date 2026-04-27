# Phase 15 Deferred Items

Out-of-scope discoveries surfaced during plan execution. Tracked here per the executor's scope-boundary rule.

## 2026-04-27 — Plan 15-03 execution

### DEFERRED-15-03-01: prisma/__tests__/school-year-multi-active.spec.ts pre-existing DB-state failure

**Source:** Running `pnpm --filter @schoolflow/api test` (full suite) during 15-03 verification.

**Failing test:** `prisma/__tests__/school-year-multi-active.spec.ts > SchoolYear partial unique index (school_years_active_per_school) > backfill invariant — all existing rows after migration are isActive=true`

**Failure:**
```
AssertionError: expected 1 to be 2
expect(active).toBe(total);   // active=1, total=2
```

**Why deferred:** This test depends on live Postgres rows seeded by an unrelated migration. The assertion compares `active` (count of `isActive=true` rows) vs `total` (all rows in `school_years`). The current dev DB has 2 rows but only 1 has `isActive=true` — meaning the post-migration backfill data drifted, or a later seed/test mutated state. Plan 15-03 touches only `dsgvo/consent` modules — zero overlap with `school_years`.

**Verification it's unrelated:**
- Running `pnpm --filter @schoolflow/api exec vitest run src/modules/dsgvo/consent/consent.service.spec.ts` in isolation passes 10/10.
- The failing test file (`prisma/__tests__/school-year-multi-active.spec.ts`) has not been modified in this branch.
- All other 62 test files / 643 tests pass.

**Action:** Hand off to a follow-up "Phase 15 backend test-DB hygiene" task or a Phase 16 (Schulstammdaten/Zeitraster) test cleanup chunk — Phase 16 owns the `school_years` surface.

## 2026-04-27 — Plan 15-05 execution

### DEFERRED-15-05-01: Pre-existing rolldown build error in useStudents.ts:352

**Source:** Running `pnpm --filter @schoolflow/web build` (`vite build` → rolldown) during 15-05 Task 3 build verification.

**Symptom:**
```
[ILLEGAL_REASSIGNMENT] Error: Unexpected re-assignment of const variable `failed`
  at apps/web/src/hooks/useStudents.ts:352
```

**Root cause:** `const failed = null as unknown as {...}` (line 352) followed by `(failed as any) = {...}` (line 364) inside `useReassignStudents` mutationFn. TypeScript permits this via the `as any` cast, but Rolldown (Vite 8's new bundler) rejects const reassignment statically.

**Owning phase:** Phase 12-01 (introduced 2026-04-24 in commit `2577860`).

**Why deferred:** Plan 15-05 surface is `apps/web/src/components/admin/dsgvo/`, `apps/web/src/routes/_authenticated/admin/{dsgvo,audit-log}.tsx`, `apps/web/src/components/layout/AppSidebar.tsx`, `apps/web/src/hooks/use{Consents,Retention,Dsfa,Vvz}.ts` — zero overlap with `apps/web/src/hooks/useStudents.ts`. Pre-existing on the branch and per scope-boundary rule, executor only auto-fixes issues directly caused by the current task's changes.

**Mitigation during 15-05:** TanStackRouterVite plugin runs BEFORE rolldown bundling, so `routeTree.gen.ts` is regenerated successfully and the new `/admin/dsgvo` + `/admin/audit-log` routes are picked up. Verified via:
- Route tree contains `AuthenticatedAdminDsgvoRouteImport` after attempted build.
- `tsc -b 2>&1 | grep "error TS" | wc -l` returns 13 (baseline, unchanged from before plan execution).
- `diff baseline_ts_errors.txt new_ts_errors.txt` is empty.
- Dev mode (`vite dev`) is unaffected (different transform pipeline).

**Recommended fix:** Convert `const failed` to `let failed: ... | null` at line 352. Trivial single-file fix. Hand off to a Phase 16 (or backlog) frontend bundler-hygiene chunk.
