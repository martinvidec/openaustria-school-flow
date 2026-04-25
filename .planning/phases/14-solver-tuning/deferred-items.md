# Phase 14 Deferred Items

Pre-existing issues found during execution but unrelated to Phase 14 scope.

## Out-of-scope test failure: school-year-multi-active.spec.ts

**Found:** Plan 14-01 Task 2, while running full Vitest suite.

**Failure:**
```
prisma/__tests__/school-year-multi-active.spec.ts:158
  > backfill invariant — all existing rows after migration are isActive=true
  AssertionError: expected 1 to be 2
```

**Cause:** Pre-existing drift between seed data and the Phase 10 migration `20260419202052_10_school_year_multi_active`. The test asserts that all existing SchoolYear rows are isActive=true post-migration; the seed currently has 1 active row out of 2 (one school has an inactive prior year). This predates Phase 14 — no Phase 14 file touches `school_years` schema or seed data.

**Action:** Out of Phase 14 scope. Do NOT fix. Track for a future Phase 10 hotfix or seed-cleanup plan.

**Phase 14 spec status:** All 13 tests in `constraint-weight-override.service.spec.ts` pass green when run in isolation; full suite shows 619 passed / 78 todo / 1 failed (the unrelated school-year test).
