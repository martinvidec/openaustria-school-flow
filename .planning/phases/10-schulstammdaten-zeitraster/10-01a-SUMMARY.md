---
phase: 10-schulstammdaten-zeitraster
plan: 01a
status: complete
completed: 2026-04-20
author: gsd-executor (recovered after stream idle timeout)
---

# Plan 10-01a Summary — DB schema & migrations

## Outcome

Schema and migrations for **SCHOOL-03 (plural SchoolYears with aktiv-Markierung)** and **SCHOOL-04 (A/B-Wochen Default via `School.abWeekEnabled`)** delivered as Prisma migration artifacts. Downstream API/UI plans (10-02+) can now rely on the new columns and the partial-unique `school_years_active_per_school` index.

## Key changes

1. **Schema (`apps/api/prisma/schema.prisma`)**
   - `School` gains `abWeekEnabled: Boolean @default(false) @map("ab_week_enabled")` (D-04 default for new TimetableRuns).
   - `School ↔ SchoolYear` becomes one-to-many: `schoolYears: SchoolYear[]` (the previous `@unique` on `SchoolYear.schoolId` is dropped).
   - `SchoolYear` gains `isActive: Boolean @default(false) @map("is_active")` and a regular `@@index([schoolId])` for lookup.

2. **Migrations (`apps/api/prisma/migrations/`)**
   - `20260419202051_10_add_school_ab_week_enabled/migration.sql` — `ALTER TABLE schools ADD COLUMN ab_week_enabled BOOLEAN NOT NULL DEFAULT false`.
   - `20260419202052_10_school_year_multi_active/migration.sql` — hand-authored:
     - Drop the `@unique` constraint/index on `school_years.school_id`.
     - Add `is_active BOOLEAN NOT NULL DEFAULT false`.
     - Backfill existing rows to `is_active = true` (safe because pre-migration `schoolId` was unique).
     - Add regular `@@index(school_id)` for lookup.
     - Declare partial unique index `CREATE UNIQUE INDEX school_years_active_per_school ON school_years (school_id) WHERE is_active = true` (Prisma 7 schema cannot express WHERE clauses — raw SQL required).

3. **Runtime wiring (Rule 3 auto-fix)**
   - `apps/api/prisma/seed.ts` — `findUnique({ schoolId })` → `findFirst({ schoolId, isActive: true })`; new `isActive: true` on SchoolYear create.
   - `apps/api/src/modules/school/school.service.ts` — nested create key `schoolYear: { ... }` → `schoolYears: { ... }` with `isActive: true` on the seeded initial year; `fullInclude()` key renamed identically (broke `@prisma/client 7` runtime contract otherwise).
   - `apps/api/src/modules/import/import.service.ts` — `findUnique({ schoolId })` → `findFirst({ schoolId, isActive: true })`; error message updated to `No active SchoolYear configured for this school`.

4. **Tests (TDD RED → GREEN)**
   - `apps/api/prisma/__tests__/migration.spec.ts` — asserts both Phase 10 migration folders exist; asserts multi-active migration contains the partial unique index DDL + `WHERE is_active` clause.
   - `apps/api/prisma/__tests__/school-year-multi-active.spec.ts` — integration spec for `school_years_active_per_school`; probes the DB first and skips gracefully if Postgres is unreachable (parallel worktree safety).
   - `apps/api/vitest.config.ts` — include pattern extended to pick up `prisma/__tests__/**/*.spec.ts`.

## Commits

- `aaa3672` — test(10-01a): add failing specs for Phase 10 migrations (RED)
- `26781b0` — feat(10-01a): migrate schema for School.abWeekEnabled + SchoolYear multi-active
- `5e4cfc2` — feat(10-01a): add Phase 10 Prisma migrations for abWeekEnabled + multi-active
- `99152dc` — feat(10-01a): update seed + import service for multi-active SchoolYear (Rule 3 auto-fix)

## Verification vs. must_haves

| Must-have | Status | Evidence |
|-----------|--------|----------|
| `School.ab_week_enabled` column, default false | ✓ | Migration `20260419202051_10_add_school_ab_week_enabled` |
| `SchoolYear.is_active` column + partial unique index `school_years_active_per_school` | ✓ | Migration `20260419202052_10_school_year_multi_active` (raw SQL `CREATE UNIQUE INDEX ... WHERE is_active = true`) |
| Existing rows backfilled `is_active=true` | ✓ | Migration has `UPDATE school_years SET is_active = true` step |
| `seed.ts` uses `findFirst({schoolId, isActive:true})` | ✓ | `prisma/seed.ts:340-345` |
| Prisma client regenerated (types include `School.abWeekEnabled`, `SchoolYear.isActive`) | ✓ | `npx prisma generate` run post-merge; `apps/api/src/config/database/generated/` contains `abWeekEnabled` |

## Checkpoint (for human)

**DB migration files are artifacts — applying them to the running dev Postgres is a post-merge step.**

```bash
# From repo root
pnpm --filter @schoolflow/api exec prisma migrate dev
# This will apply 20260419202051 and 20260419202052 to the local DB.
# Expected output: "The following migration(s) have been applied"
```

If the existing local DB already has `SchoolYear` rows, they will be backfilled with `is_active = true` as part of `20260419202052`.

## Notes for downstream plans (10-02, 10-03b, 10-04, 10-05)

- Any new `SchoolYear` lookup by school MUST use `findFirst({ schoolId, isActive: true })` (or the array form `findMany({ schoolId })` then filter). `findUnique({ schoolId })` no longer compiles.
- `School.schoolYears[]` is the array relation — code paths that assumed a single `school.schoolYear?` must be updated to iterate or select the active one.
- Creating a new SchoolYear with `isActive: true` when another active year exists will violate `school_years_active_per_school` — the API layer (Plan 10-02) must transactionally flip the old active year to `isActive: false` before activating a new one.

## Recovery note

This SUMMARY was authored by the orchestrator after the original executor agent hit a stream idle timeout at the metadata commit step. All four code commits had already landed on `main` (spot-check verified: files present, Prisma client regenerates cleanly with the new types). The orchestrator committed the final Rule-3 auto-fix diff that the executor had left uncommitted in its working tree.
