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
