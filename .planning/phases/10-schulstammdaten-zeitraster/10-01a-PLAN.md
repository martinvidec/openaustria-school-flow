---
phase: 10-schulstammdaten-zeitraster
plan: 01a
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/seed.ts
  - apps/api/prisma/migrations/<ts>_10_add_school_ab_week_enabled/migration.sql
  - apps/api/prisma/migrations/<ts>_10_school_year_multi_active/migration.sql
  - apps/api/prisma/__tests__/migration.spec.ts
  - apps/api/prisma/__tests__/school-year-multi-active.spec.ts
autonomous: false
requirements:
  - SCHOOL-03
  - SCHOOL-04
user_setup: []
must_haves:
  truths:
    - "School table has ab_week_enabled column with default false"
    - "SchoolYear table has is_active column and partial unique index school_years_active_per_school"
    - "Existing SchoolYear rows are backfilled with is_active=true"
    - "seed.ts uses findFirst({schoolId, isActive:true}) instead of findUnique({schoolId})"
    - "Prisma client regenerated and types include School.abWeekEnabled and SchoolYear.isActive"
  artifacts:
    - path: "apps/api/prisma/schema.prisma"
      contains: "ab_week_enabled"
    - path: "apps/api/prisma/schema.prisma"
      contains: "is_active"
    - path: "apps/api/prisma/migrations"
      provides: "Two new migration folders"
  key_links:
    - from: "apps/api/prisma/schema.prisma"
      to: "PostgreSQL school_years table"
      via: "Prisma migration apply"
      pattern: "CREATE UNIQUE INDEX.*school_years_active_per_school.*WHERE.*is_active"
---

<objective>
Phase 10 backend foundation (split A): schema migrations (D-04 School.abWeekEnabled, D-07 SchoolYear multi-active), seed.ts repair, and Prisma client regeneration. Establishes the data contract every downstream plan in Phase 10 reads from. Runs in parallel with Plan 01b (frontend deps + Zod schemas) since they touch disjoint files.

Purpose: Multi-active SchoolYear requires a partial unique index that Prisma's declarative @@unique cannot express; this plan ships the hand-edited migration plus its safety guarantees (backfill + non-overlap). Without this plan landing first, Plan 02 cannot run @prisma/client typed queries against the new fields.

Output: Two committed Prisma migrations applied to the dev DB; @prisma/client regenerated; updated seed.ts running cleanly (`pnpm --filter @schoolflow/api exec prisma db seed` succeeds); two migration spec files asserting both columns and the partial unique index behavior.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/10-schulstammdaten-zeitraster/10-CONTEXT.md
@.planning/phases/10-schulstammdaten-zeitraster/10-RESEARCH.md
@.planning/phases/10-schulstammdaten-zeitraster/10-PATTERNS.md
@.planning/phases/10-schulstammdaten-zeitraster/10-VALIDATION.md
@apps/api/prisma/schema.prisma
@apps/api/prisma/seed.ts
@CLAUDE.md

<interfaces>
<!-- Existing seed.ts SchoolYear lookup pattern (lines 339-352) MUST change after migration -->

From apps/api/prisma/seed.ts current pattern (BREAKS after migration):
```typescript
const existingYear = await prisma.schoolYear.findUnique({
  where: { schoolId: school.id },
});
```

From apps/api/prisma/schema.prisma current SchoolYear (line ~110-130) — schoolId currently has @unique:
```prisma
model SchoolYear {
  id            String   @id @default(uuid())
  schoolId      String   @unique @map("school_id")   // DROP @unique
  school        School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name          String
  startDate     DateTime @map("start_date")
  semesterBreak DateTime @map("semester_break")
  endDate       DateTime @map("end_date")
  holidays      Holiday[]
  autonomousDays AutonomousDay[]
  @@map("school_years")
}
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true" gate="blocking">
  <name>Task 1: [BLOCKING] Schema migrations + seed repair + Prisma client regen</name>
  <files>apps/api/prisma/schema.prisma, apps/api/prisma/seed.ts, apps/api/prisma/migrations/&lt;ts&gt;_10_add_school_ab_week_enabled/migration.sql, apps/api/prisma/migrations/&lt;ts&gt;_10_school_year_multi_active/migration.sql, apps/api/prisma/__tests__/migration.spec.ts, apps/api/prisma/__tests__/school-year-multi-active.spec.ts</files>
  <blocking_semantics>
    This is a [BLOCKING] task: NO downstream wave (2, 3, 4, 5) may proceed until this task completes successfully. Plan 02 reads `school.abWeekEnabled` and `schoolYear.isActive` as typed Prisma client fields — those fields only exist after this migration applies and `npx prisma generate` regenerates the client. Plan 01b runs in PARALLEL in Wave 1 because it touches frontend-only files (no Prisma dependency); however, all Wave 2+ tasks are gated on this task's completion. The `gate="blocking"` attribute makes this explicit for execute-phase wave tooling.
  </blocking_semantics>
  <read_first>
    - apps/api/prisma/schema.prisma (current School model + SchoolYear model — find @unique on SchoolYear.schoolId)
    - apps/api/prisma/seed.ts (find lines 339-352, the SchoolYear findUnique block; lines 540-565 use schoolYear.id downstream)
    - apps/api/prisma/migrations/20260329172431_phase2_school_data_model_dsgvo/migration.sql (analog migration style — block comments)
    - .planning/phases/10-schulstammdaten-zeitraster/10-RESEARCH.md §1.1, §1.2, §1.3, §7.1
    - .planning/phases/10-schulstammdaten-zeitraster/10-PATTERNS.md "Backend Patterns" / "schema.prisma" + "migration.sql" + "seed.ts" sections
  </read_first>
  <behavior>
    - Test 1 (migration.spec.ts): `pnpm --filter @schoolflow/api exec prisma migrate status` reports two new migrations as applied (10_add_school_ab_week_enabled, 10_school_year_multi_active); Prisma generated client surfaces `school.abWeekEnabled: boolean` and `schoolYear.isActive: boolean` types.
    - Test 2 (school-year-multi-active.spec.ts): inserting two SchoolYear rows with isActive=true for the same schoolId fails (partial unique index violation, Prisma error code P2002); inserting one isActive=true + one isActive=false for the same schoolId succeeds.
    - Test 3 (school-year-multi-active.spec.ts): existing rows after backfill all have isActive=true — query `prisma.schoolYear.findMany({where:{isActive:true}})` returns the seeded school year row count.
  </behavior>
  <action>
    Step A — Update schema.prisma:
    1. Add `abWeekEnabled Boolean @default(false) @map("ab_week_enabled")` to the School model block (insert as the last scalar field before relations).
    2. In SchoolYear model: REMOVE `@unique` from `schoolId String @unique @map("school_id")` so it becomes `schoolId String @map("school_id")`.
    3. Add `isActive Boolean @default(false) @map("is_active")` to SchoolYear (insert as the last scalar field before relations).
    4. Add `@@index([schoolId])` inside the SchoolYear block (above `@@map("school_years")`).

    Step B — Generate migration 1 (auto):
    - Run `cd apps/api &amp;&amp; npx prisma migrate dev --name 10_add_school_ab_week_enabled` to generate + apply the abWeekEnabled migration.
    - Verify the generated migration.sql contains `ALTER TABLE "schools" ADD COLUMN "ab_week_enabled" BOOLEAN NOT NULL DEFAULT false`.
    - This task is `autonomous: false` because `prisma migrate dev` may require an interactive shadow-DB confirmation — pause for user approval before continuing if it prompts.

    Step C — Generate migration 2 (hand-edited):
    - Run `cd apps/api &amp;&amp; npx prisma migrate dev --create-only --name 10_school_year_multi_active`.
    - REPLACE the auto-generated migration.sql contents with this exact SQL (copy verbatim — DO NOT abbreviate):
      ```sql
      -- DropConstraint / DropIndex (existing @unique on school_id)
      ALTER TABLE "school_years" DROP CONSTRAINT IF EXISTS "school_years_school_id_key";
      DROP INDEX IF EXISTS "school_years_school_id_key";

      -- AddColumn isActive
      ALTER TABLE "school_years" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT false;

      -- Backfill: every existing row becomes the active year for its school
      -- (safe because schoolId WAS unique pre-migration, so at most one row per school)
      UPDATE "school_years" SET "is_active" = true;

      -- CreateIndex non-unique lookup
      CREATE INDEX "school_years_school_id_idx" ON "school_years" ("school_id");

      -- CreateIndex partial unique (Prisma 7 schema cannot express WHERE clauses;
      -- raw SQL is the only path — see Phase 10 RESEARCH §1.2)
      CREATE UNIQUE INDEX "school_years_active_per_school"
        ON "school_years" ("school_id") WHERE "is_active" = true;
      ```
    - Apply by running `cd apps/api &amp;&amp; npx prisma migrate dev` (no flags — applies pending).
    - After both migrations apply, run `cd apps/api &amp;&amp; npx prisma generate` to refresh the @prisma/client types.

    Step D — Repair seed.ts (lines ~339-352):
    - REPLACE the existing block:
      ```typescript
      const existingYear = await prisma.schoolYear.findUnique({
        where: { schoolId: school.id },
      });
      ```
      With:
      ```typescript
      const existingYear = await prisma.schoolYear.findFirst({
        where: { schoolId: school.id, isActive: true },
      });
      ```
    - REPLACE the existing block at line ~352 (`findUniqueOrThrow({where:{schoolId}})`) with:
      ```typescript
      const schoolYear = await prisma.schoolYear.findFirstOrThrow({
        where: { schoolId: school.id, isActive: true },
      });
      ```
    - When CREATING a new SchoolYear in seed.ts (the `prisma.schoolYear.create({data:{...}})` call right after the existingYear check), ADD `isActive: true` to the data payload so the seed populates the active row.
    - DO NOT change downstream code that uses `schoolYear.id` (lines 542, 549, 554, 561) — they are unaffected.

    Step E — Write the two test specs:
    - apps/api/prisma/__tests__/migration.spec.ts (Vitest): import `PrismaClient`, call `prisma.school.findFirst()` and assert the returned object's TypeScript type carries `abWeekEnabled: boolean` (compile-time via type-only assertion); call `prisma.schoolYear.findFirst()` and assert `isActive: boolean` exists on the returned shape. Use `expectTypeOf` from `expect-type` if installed, otherwise a static `const _: boolean = (year as any).isActive` line that fails compilation if removed. Runtime: count the existing migrations folder entries and assert both `_10_add_school_ab_week_enabled` and `_10_school_year_multi_active` directories exist.
    - apps/api/prisma/__tests__/school-year-multi-active.spec.ts (Vitest, integration): connects to test DB, creates a fresh school, inserts year Y1 with isActive=true, inserts year Y2 with isActive=true → expect Prisma to reject with code P2002. Then sets Y1 isActive=false, retries Y2 → expect success. Use `prisma.$transaction` for setup/teardown; clean up created rows in `afterEach`. Use the existing test infrastructure pattern from `apps/api/src/modules/school/school.service.spec.ts`.

    Step F — Run migration verification:
    - `cd apps/api &amp;&amp; npx prisma migrate status` — must report all migrations applied, no pending, no drift.
    - `cd apps/api &amp;&amp; pnpm exec prisma db seed` — must succeed (validates seed.ts repair).
  </action>
  <verify>
    <automated>cd /Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/apps/api &amp;&amp; npx prisma migrate status &amp;&amp; pnpm exec vitest run prisma/__tests__/</automated>
  </verify>
  <acceptance_criteria>
    - `grep -n "ab_week_enabled" apps/api/prisma/schema.prisma` returns at least one match in the School model.
    - `grep -n "is_active" apps/api/prisma/schema.prisma` returns at least one match in the SchoolYear model.
    - `grep -n "@unique" apps/api/prisma/schema.prisma` does NOT show `@unique` on SchoolYear.schoolId (the original `schoolId String @unique @map("school_id")` line must no longer have @unique).
    - `ls apps/api/prisma/migrations/ | grep -E "10_(add_school_ab_week_enabled|school_year_multi_active)"` returns exactly 2 directory matches.
    - `grep -F "school_years_active_per_school" apps/api/prisma/migrations/*_10_school_year_multi_active/migration.sql` returns at least one match (verifies partial unique index DDL is present).
    - `grep -F 'WHERE "is_active" = true' apps/api/prisma/migrations/*_10_school_year_multi_active/migration.sql` returns a match (verifies WHERE clause is included).
    - `grep -F "findFirst({" apps/api/prisma/seed.ts` returns at least 1 match for the SchoolYear lookup; `grep -F "findUnique({ where: { schoolId" apps/api/prisma/seed.ts` returns 0 matches.
    - `cd apps/api &amp;&amp; npx prisma migrate status` exits 0 with no "drift" or "pending" output.
    - `cd apps/api &amp;&amp; pnpm exec prisma db seed` exits 0.
    - `cd apps/api &amp;&amp; pnpm exec vitest run prisma/__tests__/migration.spec.ts` passes.
    - `cd apps/api &amp;&amp; pnpm exec vitest run prisma/__tests__/school-year-multi-active.spec.ts` passes (both partial-unique violation and isActive=false coexistence assertions).
  </acceptance_criteria>
  <done>
    Two new Prisma migrations exist on disk and are applied to dev DB; seed.ts runs cleanly; Prisma client typings include School.abWeekEnabled and SchoolYear.isActive; both __tests__ spec files pass; the partial unique index `school_years_active_per_school` is enforced at the DB level. All Wave 2+ work is now unblocked.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Untrusted DB migration source | Migration SQL files are part of the trusted code path (committed by trusted developer); but raw SQL bypasses Prisma's validation, so review gate matters |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-10-01a-01 | Tampering | Migration SQL hand-edit (10_school_year_multi_active) | mitigate | Plan acceptance criteria require exact-string greps for `school_years_active_per_school` and `WHERE "is_active" = true` — verifies no typos / accidental drop of WHERE clause that would silently break the multi-active invariant |
| T-10-01a-02 | Information Disclosure | seed.ts repair (findFirst replacing findUnique) | accept | Seed runs only in dev; no PII leak risk; both queries scope by `schoolId` |
| T-10-01a-03 | Denial of Service | Partial unique index lookup performance | accept | Index is on a small column (`school_id` UUID + 1-byte boolean partial); sub-millisecond lookups even at scale |
| T-10-01a-04 | Elevation of Privilege | Multi-active SchoolYear race | mitigate | Partial unique index enforced at DB level (defense-in-depth) regardless of application-layer logic; concurrent INSERT of two active rows fails atomically with P2002 |
</threat_model>

<verification>
Phase 10 backend foundation checks:
1. Dev DB has both new columns and the partial unique index — verifiable via `cd apps/api &amp;&amp; npx prisma migrate status` and DB introspection.
2. Seed script runs cleanly end-to-end — `cd apps/api &amp;&amp; pnpm exec prisma db seed` exits 0.
3. Wave 2 (Plan 02) can now compile against typed `school.abWeekEnabled` and `schoolYear.isActive` fields without `as any` casts.
</verification>

<success_criteria>
- [ ] Two Prisma migrations exist on disk and are applied (10_add_school_ab_week_enabled, 10_school_year_multi_active)
- [ ] Partial unique index `school_years_active_per_school` enforced at DB level (verified by integration spec)
- [ ] seed.ts uses findFirst / findFirstOrThrow with isActive filter; seed runs cleanly
- [ ] @prisma/client regenerated — School.abWeekEnabled and SchoolYear.isActive surfaced as typed booleans
- [ ] Both Vitest specs pass
</success_criteria>

<output>
After completion, create `.planning/phases/10-schulstammdaten-zeitraster/10-01a-SUMMARY.md` documenting:
- Migration apply order and any prompts encountered (autonomous: false noted)
- Confirmation that downstream waves are unblocked (Prisma generate completed)
</output>
</output>
