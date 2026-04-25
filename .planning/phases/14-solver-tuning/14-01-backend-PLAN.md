---
phase: 14-solver-tuning
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/api/prisma/schema.prisma
  - apps/api/prisma/migrations/*_add_constraint_weight_overrides/migration.sql
  - apps/api/src/modules/timetable/constraint-catalog.ts
  - apps/api/src/modules/timetable/constraint-weight-override.service.ts
  - apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts
  - apps/api/src/modules/timetable/constraint-weight-override.controller.ts
  - apps/api/src/modules/timetable/constraint-template.service.ts
  - apps/api/src/modules/timetable/constraint-template.service.spec.ts
  - apps/api/src/modules/timetable/constraint-template.controller.ts
  - apps/api/src/modules/timetable/solver-input.service.ts
  - apps/api/src/modules/timetable/solver-input.service.spec.ts
  - apps/api/src/modules/timetable/timetable.service.ts
  - apps/api/src/modules/timetable/timetable.service.spec.ts
  - apps/api/src/modules/timetable/timetable.controller.ts
  - apps/api/src/modules/timetable/timetable.module.ts
  - apps/api/src/modules/timetable/dto/constraint-weight.dto.ts
  - apps/api/src/modules/auth/casl-ability.factory.ts
  - apps/api/prisma/seed.ts
  - apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java
  - apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java
  - apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java
  - apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java
  - packages/shared/src/constraint-catalog.ts
  - packages/shared/src/validation/constraint-template.ts
  - packages/shared/src/validation/constraint-weight.ts
  - packages/shared/src/index.ts
autonomous: true
requirements: [SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05]
requirements_addressed: [SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05]
user_setup: []

must_haves:
  truths:
    - "ConstraintWeightOverride table exists in PostgreSQL and is reachable via Prisma Client (SOLVER-02)"
    - "GET /api/v1/timetable/constraint-catalog returns 15 entries (6 HARD + 9 SOFT) with verbatim Java names (SOLVER-01)"
    - "GET /api/v1/schools/:schoolId/constraint-weights returns the merged weight map AND lastUpdatedAt timestamp (SOLVER-02)"
    - "PUT /api/v1/schools/:schoolId/constraint-weights atomically replaces the school's overrides in a Prisma transaction and returns 200 (SOLVER-02)"
    - "POST/PUT /api/v1/schools/:schoolId/constraint-templates with foreign classId/subjectId or maxPeriod>school.maxPeriodNumber returns 422 RFC 9457 problem+json (SOLVER-04, SOLVER-05)"
    - "PATCH /api/v1/schools/:schoolId/constraint-templates/:id/active toggles isActive only and returns 200 (SOLVER-04, SOLVER-05)"
    - "TimetableService.startSolve loads ConstraintWeightOverride rows BEFORE buildSolverInput and merges DB > per-run DTO > DEFAULT_CONSTRAINT_WEIGHTS, snapshots the resolved map into TimetableRun.constraintConfig (SOLVER-03)"
    - "SolverInputService.processConstraintTemplates handles SUBJECT_PREFERRED_SLOT (was missing) and dedupes NO_LESSONS_AFTER + SUBJECT_MORNING by min-value-wins (SOLVER-04, SOLVER-05)"
    - "Java sidecar exposes a SubjectPreferredSlot domain class + constraint stream registered under a NEW @ConstraintWeight 'Subject preferred slot' (the 9th SOFT constraint) so SUBJECT_PREFERRED_SLOT entries actually influence the score (SOLVER-05 end-to-end correctness)"
    - "CONFIGURABLE_CONSTRAINT_NAMES + DEFAULT_CONSTRAINT_WEIGHTS export 9 entries (8 existing + new 'Subject preferred slot'); DEFAULT_CONSTRAINT_WEIGHTS is re-exported from @schoolflow/shared"
    - "Admin role has manage permission for constraint-weight-override subject; reuses existing 'manage timetable' for constraint-template"
    - "ConstraintWeightOverrideController @CheckPermissions decorator subject is exactly 'constraint-weight-override' (grep-verifiable in controller file)"
  artifacts:
    - path: "apps/api/prisma/migrations/*_add_constraint_weight_overrides/migration.sql"
      provides: "ConstraintWeightOverride table + unique index + FK + cascade"
      contains: "CREATE TABLE \"constraint_weight_overrides\""
    - path: "apps/api/src/modules/timetable/constraint-catalog.ts"
      provides: "Static CONSTRAINT_CATALOG[] (15 entries: 6 HARD + 9 SOFT) + GET endpoint inside TimetableController"
      exports: ["CONSTRAINT_CATALOG", "ConstraintCatalogEntry"]
    - path: "apps/api/src/modules/timetable/constraint-weight-override.service.ts"
      provides: "findBySchool / findOverridesOnly / findLastUpdatedAt / bulkReplace / resetOne service methods"
      exports: ["ConstraintWeightOverrideService"]
    - path: "apps/api/src/modules/timetable/constraint-weight-override.controller.ts"
      provides: "GET (returns { weights, lastUpdatedAt }) + PUT + DELETE endpoints under /schools/:schoolId/constraint-weights"
      exports: ["ConstraintWeightOverrideController"]
    - path: "packages/shared/src/constraint-catalog.ts"
      provides: "Frontend-importable mirror of CONSTRAINT_CATALOG (15 entries)"
      exports: ["CONSTRAINT_CATALOG", "ConstraintCatalogEntry"]
    - path: "packages/shared/src/validation/constraint-template.ts"
      provides: "Discriminated-union Zod schema for constraint template params"
      exports: ["constraintTemplateParamsSchema", "createConstraintTemplateSchema"]
    - path: "packages/shared/src/validation/constraint-weight.ts"
      provides: "Zod record schema for bulk weight PUT + DEFAULT_CONSTRAINT_WEIGHTS re-export"
      exports: ["constraintWeightsSchema", "bulkConstraintWeightsSchema", "DEFAULT_CONSTRAINT_WEIGHTS"]
    - path: "apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java"
      provides: "Java domain object for SUBJECT_PREFERRED_SLOT solver fact"
      contains: "public class SubjectPreferredSlot"
  key_links:
    - from: "apps/api/src/modules/timetable/timetable.service.ts:startSolve"
      to: "ConstraintWeightOverrideService.findBySchool"
      via: "DB lookup before buildSolverInput call"
      pattern: "constraintWeightOverrideService\\.findBySchool"
    - from: "apps/api/src/modules/timetable/solver-input.service.ts:processConstraintTemplates"
      to: "SUBJECT_PREFERRED_SLOT switch case + dedupe step"
      via: "case 'SUBJECT_PREFERRED_SLOT' branch"
      pattern: "case ['\"]SUBJECT_PREFERRED_SLOT['\"]"
    - from: "apps/api/src/modules/timetable/constraint-template.service.ts:create/update"
      to: "validateCrossReference helper"
      via: "method call before prisma write"
      pattern: "validateCrossReference\\("
    - from: "apps/api/src/modules/timetable/timetable.module.ts"
      to: "ConstraintWeightOverrideController + ConstraintWeightOverrideService"
      via: "controllers[] + providers[] + exports[] arrays"
      pattern: "ConstraintWeightOverrideController.*ConstraintWeightOverrideService"
    - from: "apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java"
      to: "subjectPreferredSlot constraint stream"
      via: "new method added to defineConstraints[] returning Constraint[]"
      pattern: "subjectPreferredSlot\\(constraintFactory\\)"
---

<objective>
Deliver the complete backend foundation for Phase 14 Solver-Tuning per CONTEXT.md decisions D-05 through D-15.

This plan ships:
1. New Prisma model `ConstraintWeightOverride` (D-05) via a hand-authored migration that obeys CLAUDE.md's "no `db push`" hard rule.
2. Static `CONSTRAINT_CATALOG` (D-10) sourced from the canonical Java `TimetableConstraintProvider.java` (NOT from the 14-UI-SPEC translation table — that table contains incorrect Java names; see Task 0). The catalog ships **15 entries** (6 HARD + 9 SOFT) — the 9th SOFT being the new `Subject preferred slot` constraint added in Task 5.
3. `ConstraintWeightOverrideService` + controller with bulk-replace transaction, whitelisted-name validation, RFC 9457 422 for unknown names (D-07). GET endpoint returns `{ weights, lastUpdatedAt }` so the frontend `DriftBanner` can detect "weights changed after last solve" without extra round-trips.
4. Cross-reference validation in `ConstraintTemplateService.create/update` (D-13): classId/subjectId in school + maxPeriod ≤ school.maxPeriodNumber + 422 RFC 9457.
5. Resolution chain in `TimetableService.startSolve` (D-06): DB overrides > per-run DTO > defaults; resolved map snapshotted into existing `TimetableRun.constraintConfig`.
6. `SolverInputService.processConstraintTemplates` extension: add the missing `SUBJECT_PREFERRED_SLOT` case + dedupe (min-wins) for NO_LESSONS_AFTER and SUBJECT_MORNING (D-14).
7. Java sidecar gap-fix (Task 5): `SubjectPreferredSlot` domain class + constraint stream + `SchoolTimetable` field + new `@ConstraintWeight("Subject preferred slot")` field on `TimetableConstraintConfiguration`. RESEARCH.md Open Question #1 (RESOLVED) confirmed by direct codebase read in Task 0: `SubjectTimePreference.java` only carries SUBJECT_MORNING semantics; the existing `Subject time preference` constraint penalizes `lesson.period > pref.latestPeriod`. Without this Java work, SUBJECT_PREFERRED_SLOT entries from Tab 4 Sub-Tab b would be **silently ignored by the solver**, breaking SOLVER-05.
8. PATCH `/active` endpoint on ConstraintTemplateController for inline isActive toggles (UI-SPEC §Restriction CRUD §7) — distinct audit action vs full PUT.
9. Permission seed: admin role gains `manage constraint-weight-override`.
10. `CONFIGURABLE_CONSTRAINT_NAMES` and `DEFAULT_CONSTRAINT_WEIGHTS` are extended from 8 to **9** entries (the new `Subject preferred slot` is configurable). `DEFAULT_CONSTRAINT_WEIGHTS` is re-exported from `@schoolflow/shared` so the frontend Weights tab can render 9 sliders without a second source-of-truth.

**Slider count is locked at 9.** This is the deterministic decision required by the revision: a NEW `@ConstraintWeight("Subject preferred slot")` field is added to `TimetableConstraintConfiguration.java` and the Java constraint stream uses `.asConstraint("Subject preferred slot")` (a NEW constraint name, NOT a duplicate of `Subject time preference`). This avoids the `IllegalStateException` Timefold/OptaPlanner throws on shared constraint names.

Purpose: Provide an end-to-end, score-affecting backend so Plan 14-02 (frontend) and Plan 14-03 (E2E) can ship without scope reduction.
Output: 14 production files (TS + Java + Prisma + SQL) + 3 test specs.
</objective>

<execution_context>
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/workflows/execute-plan.md
@/Users/vid/Documents/GitHub/agentic-research/openaustria-school-flow/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/14-solver-tuning/14-CONTEXT.md
@.planning/phases/14-solver-tuning/14-RESEARCH.md
@.planning/phases/14-solver-tuning/14-UI-SPEC.md

<interfaces>
<!-- Canonical interfaces extracted from the live codebase. Do NOT explore further; use these verbatim. -->

The 14 EXISTING Java constraint names (verbatim from `TimetableConstraintProvider.java:42-59` — these go into CONSTRAINT_CATALOG `name` field). Plan 14-01 Task 5 adds a **15th** constraint `Subject preferred slot` (SOFT, 9th in the SOFT block):

```
HARD (6): "Teacher conflict", "Room conflict", "Teacher availability",
          "Student group conflict", "Room type requirement", "Class timeslot restriction"

SOFT (8 existing + 1 NEW = 9):
          "No same subject doubling", "Balanced weekly distribution",
          "Max lessons per day", "Prefer double period", "Home room preference",
          "Minimize room changes", "Prefer morning for main subjects",
          "Subject time preference",
          "Subject preferred slot"  ← NEW in Phase 14 Task 5
```

> NOTE for executor: 14-UI-SPEC.md §Deutsche-Constraint-Übersetzungen contains 6 incorrect Java names (e.g. "Subject morning preference", "Even distribution across week", "Avoid empty periods", "Teacher consecutive periods", "Room stability per class", "Subject preferred slot", "Subject time preference (hard)"). Use ONLY the Java names above; for German `displayName`/`description` you MAY adapt the UI-SPEC translations to the correct Java names (e.g., "Subject time preference" → `Vormittags-Präferenz` since that is what the Java implementation does — see TimetableConstraintProvider.java method `subjectTimePreference`). The new 9th SOFT constraint `Subject preferred slot` SHOULD be translated as `Bevorzugter Slot` (German UI label) to match the Tab 4 Sub-Tab b name "Bevorzugte Slots".

Existing Prisma model `ConstraintTemplate` (apps/api/prisma/schema.prisma:839-849) — DO NOT modify, only consume:

```prisma
model ConstraintTemplate {
  id           String   @id @default(uuid())
  schoolId     String   @map("school_id")
  school       School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  templateType String   @map("template_type")  // 'BLOCK_TIMESLOT' | 'SUBJECT_MORNING' | 'NO_LESSONS_AFTER' | 'SUBJECT_PREFERRED_SLOT'
  params       Json
  isActive     Boolean  @default(true) @map("is_active")
  createdAt    DateTime @default(now()) @map("created_at")
  @@map("constraint_templates")
}
```

Existing School model (apps/api/prisma/schema.prisma:39-86) — adds new relation `constraintWeightOverrides ConstraintWeightOverride[]` in this plan.

Existing `mergeWeightOverrides` (apps/api/src/modules/timetable/dto/constraint-weight.dto.ts:87-94):
```typescript
export function mergeWeightOverrides(overrides?: Record<string, number>): Record<string, number> {
  return { ...DEFAULT_CONSTRAINT_WEIGHTS, ...(overrides ?? {}) };
}
```
Will be extended in Task 4 with `mergeWithSchoolDefaults(dbWeights, perRunOverride)` per D-06.

Existing `TimetableModule` (apps/api/src/modules/timetable/timetable.module.ts:14-29) — controllers/providers/exports arrays must include the new ConstraintWeightOverride classes.

`TimeGrid.maxPeriodNumber` source: there is NO column with that name. Compute it via `prisma.timeGrid.findUnique({ where: { schoolId }, include: { periods: true } })` then `Math.max(...periods.map(p => p.periodNumber))`. Period.periodNumber column confirmed in schema.prisma:103.

Existing `SchoolTimetable.java` (apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java:38-46) currently exposes via `@ProblemFactCollectionProperty`:
- `List<TeacherAvailability> blockedSlots`
- `List<ClassTimeslotRestriction> classTimeslotRestrictions`
- `List<SubjectTimePreference> subjectTimePreferences`
This plan adds `List<SubjectPreferredSlot> subjectPreferredSlots` as a 4th `@ProblemFactCollectionProperty` (Task 5).

Existing API health endpoint (`apps/api/src/modules/health/health.controller.ts`): `GET /api/v1/health` returns 200 when API is up. Used by Task 1 post-migration liveness verification.

Existing Java request DTO (read in Task 0): `apps/solver/src/main/java/at/schoolflow/solver/api/TimetableSolveRequest.java` (or wherever the solve request body shape lives — Task 0 confirms the path). The Java sidecar receives the SchoolTimetable payload through this DTO; SUBJECT_PREFERRED_SLOT entries must traverse this same path. Field name for the new `subjectPreferredSlots` collection MUST match between TS (`solver-input.service.ts` payload), Java DTO, and `SchoolTimetable.java` field.
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 0: Wave 0 — verify Java solver source-of-truth + create test scaffolds</name>
  <files>
    apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts,
    apps/api/src/modules/timetable/solver-input.service.spec.ts
  </files>
  <read_first>
    apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectTimePreference.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java,
    apps/solver/src/main/java/at/schoolflow/solver/api/TimetableSolveRequest.java,
    apps/api/src/modules/timetable/timetable.service.spec.ts,
    apps/api/src/modules/timetable/constraint-template.service.spec.ts,
    .planning/phases/14-solver-tuning/14-RESEARCH.md
  </read_first>
  <action>
    1. Open `apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java` and copy the EXACT 14 constraint names from `defineConstraints()` (lines 42-59). Record them in a code comment at the top of the file you create in Task 1 — these are the canonical names. Verify they match the 14 listed in <interfaces> above. (The 15th name `Subject preferred slot` is added by Task 5; Task 0 only confirms the existing 14.)

    2. Open `apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java` lines 22-46 and confirm: there are exactly 3 `@ProblemFactCollectionProperty` lists (`blockedSlots`, `classTimeslotRestrictions`, `subjectTimePreferences`). There is NO `subjectPreferredSlots` field. This confirms RESEARCH.md Open Question #1: SUBJECT_PREFERRED_SLOT requires Java work in Task 5.

    3. Open `apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectTimePreference.java` and confirm it exposes only `subjectId` + `latestPeriod` (lines 12-13). This is SUBJECT_MORNING semantics. SUBJECT_PREFERRED_SLOT needs day+period and a separate Java class (Task 5 will create `SubjectPreferredSlot.java`).

    4. **NEW (per RESEARCH.md Pitfall #1 + Open Question #1 RESOLVED):** Open `apps/solver/src/main/java/at/schoolflow/solver/api/TimetableSolveRequest.java` (or whichever Java file actually models the inbound `SchoolTimetable` solve-request payload — if path differs, executor confirms via `find apps/solver/src/main/java -name "*.java" | xargs grep -l "SchoolTimetable\|solverequest\|SolveRequest" -i`). Confirm:
       - The current field name(s) for the existing 3 `@ProblemFactCollectionProperty` collections (likely matches `SchoolTimetable.java` field names verbatim).
       - There is NO existing field for `subjectPreferredSlots` on the request DTO.
       - Document the EXACT field name your Task 4 + Task 5 will introduce — by convention this should be `subjectPreferredSlots` (camelCase, plural) to mirror `SchoolTimetable.java` field name.
       Document this in your task summary so Task 4 (TS payload extension) and Task 5 (Java DTO extension) use the SAME field name verbatim — mismatched names will cause Jackson to silently drop the field.

    5. Create test scaffold `apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts` (skeleton only, will be filled in Task 2):
       ```typescript
       import { Test, TestingModule } from '@nestjs/testing';
       import { ConstraintWeightOverrideService } from './constraint-weight-override.service';
       import { PrismaService } from '../../config/database/prisma.service';

       describe('ConstraintWeightOverrideService', () => {
         it.todo('findBySchool returns Record<string, number>');
         it.todo('findOverridesOnly returns persisted overrides without defaults');
         it.todo('findLastUpdatedAt returns MAX(updatedAt) across school overrides');
         it.todo('bulkReplace deletes + creates in a single transaction');
         it.todo('bulkReplace rejects unknown constraint names with UnprocessableEntityException');
         it.todo('bulkReplace rejects weights outside 0..100 with UnprocessableEntityException');
         it.todo('resetOne removes a single row by [schoolId, constraintName]');
       });
       ```

    6. Create test scaffold `apps/api/src/modules/timetable/solver-input.service.spec.ts` (skeleton only, will be filled in Task 4):
       ```typescript
       import { Test } from '@nestjs/testing';
       import { SolverInputService } from './solver-input.service';

       describe('SolverInputService.processConstraintTemplates', () => {
         it.todo('handles NO_LESSONS_AFTER → classTimeslotRestrictions');
         it.todo('handles SUBJECT_MORNING → subjectTimePreferences');
         it.todo('handles SUBJECT_PREFERRED_SLOT → subjectPreferredSlots (NEW)');
         it.todo('dedupes NO_LESSONS_AFTER per classId, keeps min(maxPeriod)');
         it.todo('dedupes SUBJECT_MORNING per subjectId, keeps min(latestPeriod)');
       });
       ```

    7. Open `apps/api/src/modules/timetable/constraint-template.service.spec.ts` and append `it.todo` entries for Task 3:
       ```typescript
       describe('validateCrossReference', () => {
         it.todo('throws 422 cross-reference-missing when classId not in school');
         it.todo('throws 422 cross-reference-missing when subjectId not in school');
         it.todo('throws 422 period-out-of-range when maxPeriod > school.maxPeriodNumber');
         it.todo('passes when classId + maxPeriod are valid');
       });
       ```

    8. Append `it.todo` entries to `apps/api/src/modules/timetable/timetable.service.spec.ts` for Task 4:
       ```typescript
       describe('startSolve resolution chain (D-06)', () => {
         it.todo('Step 0: loads ConstraintWeightOverride.findBySchool before buildSolverInput');
         it.todo('Step 1: per-run DTO weights override DB weights');
         it.todo('Step 2: defaults fill missing constraint names');
         it.todo('snapshots resolved map into TimetableRun.constraintConfig');
       });
       ```
  </action>
  <verify>
    <automated>
      test -f apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts &amp;&amp;
      test -f apps/api/src/modules/timetable/solver-input.service.spec.ts &amp;&amp;
      grep -c "it.todo" apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts | xargs -I{} test {} -ge 7 &amp;&amp;
      grep -q "validateCrossReference" apps/api/src/modules/timetable/constraint-template.service.spec.ts &amp;&amp;
      grep -q "startSolve resolution chain" apps/api/src/modules/timetable/timetable.service.spec.ts
    </automated>
  </verify>
  <acceptance_criteria>
    - File `apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts` exists and contains ≥7 `it.todo(` entries (added findOverridesOnly + findLastUpdatedAt scaffolds)
    - File `apps/api/src/modules/timetable/solver-input.service.spec.ts` exists and contains ≥5 `it.todo(` entries
    - File `apps/api/src/modules/timetable/constraint-template.service.spec.ts` contains string `validateCrossReference` (grep match)
    - File `apps/api/src/modules/timetable/timetable.service.spec.ts` contains string `startSolve resolution chain` (grep match)
    - Java verification documented in your task summary: list the 14 exact Java constraint names + confirmation that SchoolTimetable.java has 3 (NOT 4) @ProblemFactCollectionProperty lists + confirmation that SubjectTimePreference.java has only `subjectId` + `latestPeriod`
    - **TimetableSolveRequest.java field name for SUBJECT_PREFERRED_SLOT entries confirmed and documented in task summary** (full path of the Java request DTO, the existing 3 collection field names, and the agreed-upon NEW field name `subjectPreferredSlots` — used verbatim by Tasks 4 + 5)
  </acceptance_criteria>
  <done>Test scaffolds in place; Java source-of-truth confirmed and documented; the solve-request payload field name is locked; Tasks 1-5 can proceed without re-reading the Java sidecar.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 1: Prisma migration + ConstraintCatalog static module + shared mirror (15 entries) + post-migration health check</name>
  <files>
    apps/api/prisma/schema.prisma,
    apps/api/prisma/migrations/*_add_constraint_weight_overrides/migration.sql,
    apps/api/src/modules/timetable/constraint-catalog.ts,
    apps/api/src/modules/timetable/timetable.controller.ts,
    packages/shared/src/constraint-catalog.ts,
    packages/shared/src/index.ts,
    packages/shared/src/validation/constraint-template.ts,
    packages/shared/src/validation/constraint-weight.ts
  </files>
  <read_first>
    apps/api/prisma/schema.prisma,
    apps/api/prisma/migrations/20260424120000_add_override_updated_at_and_reason/migration.sql,
    apps/api/src/modules/timetable/timetable.controller.ts,
    apps/api/src/modules/timetable/dto/constraint-weight.dto.ts,
    apps/api/src/modules/health/health.controller.ts,
    packages/shared/src/index.ts,
    packages/shared/src/schemas/school-class.schema.ts,
    apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java,
    CLAUDE.md
  </read_first>
  <behavior>
    - GET /api/v1/timetable/constraint-catalog returns 200 with array of 15 entries; each entry has `{ name, displayName, description, severity, source }`
    - Severity counts: exactly 6 entries with `severity: 'HARD'` and 9 with `severity: 'SOFT'`
    - All 14 existing `name` values match the Java `TimetableConstraintProvider.java` constraint names verbatim; the 15th SOFT entry has `name: 'Subject preferred slot'` (will be wired into Java in Task 5)
    - Migration creates `constraint_weight_overrides` table with `id`, `school_id`, `constraint_name`, `weight`, `updated_at`, `updated_by` columns; `@@unique([schoolId, constraintName])` enforced; CASCADE on school delete
    - `prisma migrate status` exits 0 after migration
    - After API restart, `curl -sf http://localhost:3000/api/v1/health` returns 200 (post-migration liveness)
    - `packages/shared` re-exports `CONSTRAINT_CATALOG`, `constraintTemplateParamsSchema`, `constraintWeightsSchema`, `bulkConstraintWeightsSchema`, AND `DEFAULT_CONSTRAINT_WEIGHTS` (9 entries)
  </behavior>
  <action>
    Sub-task A — Prisma schema + migration (CLAUDE.md hard rule: NO `db push`):

    1. Edit `apps/api/prisma/schema.prisma`:
       - Add to `model School` (after line 67 `constraintTemplates ConstraintTemplate[]`):
         ```prisma
         constraintWeightOverrides ConstraintWeightOverride[]
         ```
       - Append after `model ConstraintTemplate` (after line 849):
         ```prisma
         // --- ConstraintWeightOverride (Phase 14 D-05) ---
         model ConstraintWeightOverride {
           id             String   @id @default(uuid())
           schoolId       String   @map("school_id")
           school         School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
           constraintName String   @map("constraint_name")
           weight         Int
           updatedAt      DateTime @updatedAt @map("updated_at")
           updatedBy      String?  @map("updated_by")

           @@unique([schoolId, constraintName])
           @@index([schoolId])
           @@map("constraint_weight_overrides")
         }
         ```

    2. Run from repo root:
       ```bash
       pnpm --filter @schoolflow/api exec prisma migrate dev --name add_constraint_weight_overrides
       ```
       This creates `apps/api/prisma/migrations/{TIMESTAMP}_add_constraint_weight_overrides/migration.sql` and runs it.

    3. Open the generated `migration.sql` and confirm it contains:
       ```sql
       CREATE TABLE "constraint_weight_overrides" (
         "id" TEXT NOT NULL,
         "school_id" TEXT NOT NULL,
         "constraint_name" TEXT NOT NULL,
         "weight" INTEGER NOT NULL,
         "updated_at" TIMESTAMP(3) NOT NULL,
         "updated_by" TEXT,
         CONSTRAINT "constraint_weight_overrides_pkey" PRIMARY KEY ("id")
       );
       CREATE UNIQUE INDEX "constraint_weight_overrides_school_id_constraint_name_key" ON "constraint_weight_overrides"("school_id", "constraint_name");
       CREATE INDEX "constraint_weight_overrides_school_id_idx" ON "constraint_weight_overrides"("school_id");
       ALTER TABLE "constraint_weight_overrides" ADD CONSTRAINT "constraint_weight_overrides_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
       ```

    4. Per `feedback_restart_api_after_migration.md`: Restart the API process and run post-process for shared dist `.js` extensions BEFORE continuing to subsequent tasks. Document the exact restart command in the task summary. Recommended sequence:
       ```bash
       # Stop the running API (Ctrl+C in its terminal, or kill the dev process)
       pnpm --filter @schoolflow/api build
       # post-process shared dist .js extensions per feedback_restart_api_after_migration.md
       pnpm --filter @schoolflow/api start:dev
       # Wait for "Nest application successfully started" log line
       ```

    5. **Post-migration liveness verification (NEW per revision):**
       ```bash
       curl -sf http://localhost:3000/api/v1/health > /dev/null && echo "API healthy" || echo "API NOT healthy — investigate before proceeding"
       ```
       This MUST pass before continuing to Sub-task B. If it fails, check the API process logs for Prisma client mismatch or shared dist `.js` extension errors.

    Sub-task B — Backend constraint-catalog module:

    6. Create `apps/api/src/modules/timetable/constraint-catalog.ts` with this exact structure (note: 15 entries, 6 HARD + 9 SOFT, with the new 9th SOFT entry `Subject preferred slot` ahead of Task 5's Java wiring):
       ```typescript
       /**
        * Static catalog of all 15 solver constraints (6 HARD + 9 SOFT).
        * SYNC: apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java
        * SYNC: packages/shared/src/constraint-catalog.ts (frontend mirror)
        *
        * Constraint `name` values MUST match the Java @Constraint name() argument verbatim
        * (TimetableConstraintProvider.java:defineConstraints). The 9th SOFT entry
        * `Subject preferred slot` is added in Phase 14 Task 5 (NEW Java constraint stream).
        */

       export type ConstraintSeverity = 'HARD' | 'SOFT';

       export interface ConstraintCatalogEntry {
         name: string;            // EXACT Java constraint name
         displayName: string;     // German UI label
         description: string;     // German tooltip text
         severity: ConstraintSeverity;
         source: string;          // 'TimetableConstraintProvider.java#methodName'
       }

       export const CONSTRAINT_CATALOG: ConstraintCatalogEntry[] = [
         // === HARD (6) ===
         { name: 'Teacher conflict',          displayName: 'Lehrkraft-Konflikt',           description: 'Eine Lehrkraft darf nicht zwei Stunden gleichzeitig unterrichten.',                                              severity: 'HARD', source: 'TimetableConstraintProvider.java#teacherConflict' },
         { name: 'Room conflict',             displayName: 'Raum-Konflikt',                description: 'Zwei Stunden dürfen nicht gleichzeitig im selben Raum stattfinden.',                                              severity: 'HARD', source: 'TimetableConstraintProvider.java#roomConflict' },
         { name: 'Teacher availability',      displayName: 'Lehrkraft-Verfügbarkeit',      description: 'Eine Lehrkraft darf nicht in einer als gesperrt markierten Periode unterrichten.',                              severity: 'HARD', source: 'TimetableConstraintProvider.java#teacherAvailability' },
         { name: 'Student group conflict',    displayName: 'Klassen-/Gruppen-Konflikt',    description: 'Eine Klasse oder Gruppe darf nicht zwei sich überlappende Stunden gleichzeitig haben.',                          severity: 'HARD', source: 'TimetableConstraintProvider.java#studentGroupConflict' },
         { name: 'Room type requirement',     displayName: 'Raumtyp-Anforderung',          description: 'Stunden mit speziellem Raumbedarf (z. B. Turnsaal, Chemie-Saal) müssen in einem passenden Raum liegen.',          severity: 'HARD', source: 'TimetableConstraintProvider.java#roomTypeRequirement' },
         { name: 'Class timeslot restriction', displayName: 'Klassen-Sperrzeit',           description: 'Klassen dürfen nicht in gesperrten Perioden unterrichtet werden (siehe Tab Klassen-Sperrzeiten).',               severity: 'HARD', source: 'TimetableConstraintProvider.java#classTimeslotRestriction' },
         // === SOFT (9 — 8 existing + 1 NEW for Phase 14 Task 5) ===
         { name: 'No same subject doubling',          displayName: 'Kein Doppel-Fach hintereinander',  description: 'Vermeidet, dass dasselbe Fach in derselben Klasse direkt aufeinanderfolgend liegt.',                  severity: 'SOFT', source: 'TimetableConstraintProvider.java#noSameSubjectDoubling' },
         { name: 'Balanced weekly distribution',      displayName: 'Gleichmäßige Wochenverteilung',    description: 'Verteilt Fachstunden möglichst gleichmäßig über die Schultage.',                                       severity: 'SOFT', source: 'TimetableConstraintProvider.java#balancedWeeklyDistribution' },
         { name: 'Max lessons per day',               displayName: 'Maximale Stunden pro Tag',         description: 'Reduziert übermäßig viele Stunden pro Klasse pro Tag.',                                                severity: 'SOFT', source: 'TimetableConstraintProvider.java#maxLessonsPerDay' },
         { name: 'Prefer double period',              displayName: 'Doppelstunden bevorzugen',         description: 'Bevorzugt zusammenhängende Doppelstunden für entsprechend markierte Fächer.',                          severity: 'SOFT', source: 'TimetableConstraintProvider.java#preferDoublePeriod' },
         { name: 'Home room preference',              displayName: 'Stammraum-Präferenz',              description: 'Bevorzugt das Halten einer Klasse in ihrem Stammraum.',                                                severity: 'SOFT', source: 'TimetableConstraintProvider.java#homeRoomPreference' },
         { name: 'Minimize room changes',             displayName: 'Raumwechsel minimieren',           description: 'Reduziert unnötige Raumwechsel innerhalb eines Schultages.',                                          severity: 'SOFT', source: 'TimetableConstraintProvider.java#minimizeRoomChanges' },
         { name: 'Prefer morning for main subjects',  displayName: 'Hauptfächer am Vormittag',         description: 'Bevorzugt das Legen der Hauptfächer auf die Vormittagsperioden.',                                     severity: 'SOFT', source: 'TimetableConstraintProvider.java#preferMorningForMainSubjects' },
         { name: 'Subject time preference',           displayName: 'Vormittags-Präferenz pro Fach',     description: 'Bevorzugt für ein Fach ein konfigurierbares spätestes Periode (siehe Tab Fach-Präferenzen → Vormittags-Präferenzen).',                  severity: 'SOFT', source: 'TimetableConstraintProvider.java#subjectTimePreference' },
         { name: 'Subject preferred slot',            displayName: 'Bevorzugter Slot pro Fach',         description: 'Belohnt Stunden, die einem konfigurierten (Fach, Wochentag, Periode)-Slot entsprechen (siehe Tab Fach-Präferenzen → Bevorzugte Slots).',     severity: 'SOFT', source: 'TimetableConstraintProvider.java#subjectPreferredSlot' },
       ];
       ```

    7. Add a GET endpoint inside the existing `TimetableController` (apps/api/src/modules/timetable/timetable.controller.ts). Add this method after the existing class body opening:
       ```typescript
       @Get('constraint-catalog')
       @CheckPermissions({ action: 'read', subject: 'timetable' })
       @ApiOperation({ summary: 'Get the static catalog of all 15 solver constraints (6 HARD + 9 SOFT)' })
       @ApiResponse({ status: 200, description: 'Constraint catalog' })
       getConstraintCatalog() {
         return CONSTRAINT_CATALOG;
       }
       ```
       Add `import { CONSTRAINT_CATALOG } from './constraint-catalog';` near the top.

       NOTE on route: `TimetableController` is mounted at `schools/:schoolId/timetable` so this resolves to `GET /api/v1/schools/:schoolId/timetable/constraint-catalog`. The catalog is school-agnostic but returning it from this scoped route is acceptable for v1.1 (frontend always knows the schoolId). If executor prefers, create a dedicated `ConstraintCatalogController` mounted at `Controller('timetable')` (no schoolId) — either form is acceptable as long as the route is documented in the SUMMARY and Plan 14-02's hook matches.

    Sub-task C — Shared package mirror:

    8. Create `packages/shared/src/constraint-catalog.ts` as a verbatim copy of step 6's content with the source comment updated to point at `apps/api/src/modules/timetable/constraint-catalog.ts` as the upstream within TS (and Java as the ultimate source). This file is the frontend import target.

    9. Create `packages/shared/src/validation/constraint-template.ts`:
       ```typescript
       import { z } from 'zod';

       export const dayOfWeekEnum = z.enum(['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']);

       export const constraintTemplateParamsSchema = z.discriminatedUnion('templateType', [
         z.object({
           templateType: z.literal('NO_LESSONS_AFTER'),
           classId: z.string().min(1),
           maxPeriod: z.number().int().min(1).max(12),
         }),
         z.object({
           templateType: z.literal('SUBJECT_MORNING'),
           subjectId: z.string().min(1),
           latestPeriod: z.number().int().min(1).max(12),
         }),
         z.object({
           templateType: z.literal('SUBJECT_PREFERRED_SLOT'),
           subjectId: z.string().min(1),
           dayOfWeek: dayOfWeekEnum,
           period: z.number().int().min(1).max(12),
         }),
         z.object({
           templateType: z.literal('BLOCK_TIMESLOT'),
           teacherId: z.string().min(1),
           dayOfWeek: dayOfWeekEnum,
           periods: z.array(z.number().int().min(1).max(12)).min(1),
         }),
       ]);

       export const createConstraintTemplateSchema = z.object({
         params: constraintTemplateParamsSchema,
         isActive: z.boolean().optional().default(true),
       });

       export type ConstraintTemplateParams = z.infer<typeof constraintTemplateParamsSchema>;
       ```

       NOTE: Phase 12 D-08 / Plan 12-03 fix: shared Zod uses `.min(1)` not `.uuid()` because seed school IDs are not RFC-4122 UUIDs.

    10. Create `packages/shared/src/validation/constraint-weight.ts` with the schema AND the **9-entry** DEFAULT_CONSTRAINT_WEIGHTS re-export so the frontend has a single source-of-truth import:
        ```typescript
        import { z } from 'zod';

        export const constraintWeightsSchema = z.record(
          z.string().min(1),
          z.number().int().min(0).max(100),
        );

        export const bulkConstraintWeightsSchema = z.object({
          weights: constraintWeightsSchema,
        });

        export type ConstraintWeightsMap = z.infer<typeof constraintWeightsSchema>;

        /**
         * Phase 14: 9 configurable SOFT constraints (8 existing + 'Subject preferred slot').
         * MUST stay in sync with apps/api/src/modules/timetable/dto/constraint-weight.dto.ts
         * DEFAULT_CONSTRAINT_WEIGHTS (the canonical Java mirror lives there).
         * Frontend Plan 14-02 imports this constant verbatim to render 9 sliders.
         */
        export const DEFAULT_CONSTRAINT_WEIGHTS: Record<string, number> = {
          'No same subject doubling': 10,
          'Balanced weekly distribution': 5,
          'Max lessons per day': 5,
          'Prefer double period': 3,
          'Home room preference': 3,
          'Minimize room changes': 2,
          'Prefer morning for main subjects': 4,
          'Subject time preference': 4,
          'Subject preferred slot': 5,
        };
        ```
        NOTE: Executor MUST cross-check the 8 EXISTING default values against the canonical `apps/api/src/modules/timetable/dto/constraint-weight.dto.ts` `DEFAULT_CONSTRAINT_WEIGHTS` constant — if any number differs, fix the SHARED file to match the API file, since the API is authoritative for the existing 8. The 9th entry (`Subject preferred slot: 5`) is NEW and is added to BOTH files in Task 2 (and Task 5 wires the matching `@ConstraintWeight` on the Java side).

    11. Append re-exports to `packages/shared/src/index.ts`:
        ```typescript
        export * from './constraint-catalog';
        export * from './validation/constraint-template';
        export * from './validation/constraint-weight';
        ```
  </action>
  <verify>
    <automated>
      pnpm --filter @schoolflow/api exec prisma migrate status &amp;&amp;
      ls apps/api/prisma/migrations/ | grep -q "_add_constraint_weight_overrides$" &amp;&amp;
      ls apps/api/prisma/migrations/*_add_constraint_weight_overrides/migration.sql 2&gt;/dev/null | head -1 &amp;&amp;
      grep -q "CREATE TABLE \"constraint_weight_overrides\"" apps/api/prisma/migrations/*_add_constraint_weight_overrides/migration.sql &amp;&amp;
      grep -q "constraintWeightOverrides ConstraintWeightOverride\[\]" apps/api/prisma/schema.prisma &amp;&amp;
      grep -q "model ConstraintWeightOverride" apps/api/prisma/schema.prisma &amp;&amp;
      grep -c "severity: 'HARD'" apps/api/src/modules/timetable/constraint-catalog.ts | xargs -I{} test {} -eq 6 &amp;&amp;
      grep -c "severity: 'SOFT'" apps/api/src/modules/timetable/constraint-catalog.ts | xargs -I{} test {} -eq 9 &amp;&amp;
      grep -q "'Subject preferred slot'" apps/api/src/modules/timetable/constraint-catalog.ts &amp;&amp;
      grep -q "constraint-catalog" apps/api/src/modules/timetable/timetable.controller.ts &amp;&amp;
      test -f packages/shared/src/constraint-catalog.ts &amp;&amp;
      test -f packages/shared/src/validation/constraint-template.ts &amp;&amp;
      test -f packages/shared/src/validation/constraint-weight.ts &amp;&amp;
      grep -q "constraintTemplateParamsSchema" packages/shared/src/index.ts &amp;&amp;
      grep -q "export const DEFAULT_CONSTRAINT_WEIGHTS" packages/shared/src/validation/constraint-weight.ts &amp;&amp;
      grep -q "'Subject preferred slot'" packages/shared/src/validation/constraint-weight.ts &amp;&amp;
      pnpm --filter @schoolflow/shared build &amp;&amp;
      curl -sf http://localhost:3000/api/v1/health &gt; /dev/null
    </automated>
  </verify>
  <acceptance_criteria>
    - `apps/api/prisma/migrations/*_add_constraint_weight_overrides/migration.sql` exists (verify with `ls apps/api/prisma/migrations/*_add_constraint_weight_overrides/migration.sql 2>/dev/null | head -1` returning a path; or `compgen -G "apps/api/prisma/migrations/*_add_constraint_weight_overrides/migration.sql" > /dev/null` exits 0) and contains the literal substring `CREATE TABLE "constraint_weight_overrides"` (verify via `grep -q "CREATE TABLE" apps/api/prisma/migrations/*_add_constraint_weight_overrides/migration.sql`)
    - `ls apps/api/prisma/migrations/ | grep -q "_add_constraint_weight_overrides$"` exits 0 (the trailing `$` anchor ensures we match the directory name end, not a partial)
    - `pnpm --filter @schoolflow/api exec prisma migrate status` exits 0
    - `apps/api/prisma/schema.prisma` contains substring `model ConstraintWeightOverride` AND substring `constraintWeightOverrides ConstraintWeightOverride[]`
    - `apps/api/src/modules/timetable/constraint-catalog.ts` exists, exports `CONSTRAINT_CATALOG` and `ConstraintCatalogEntry`, contains exactly 6 occurrences of `severity: 'HARD'` and **9** of `severity: 'SOFT'` (15 total)
    - `apps/api/src/modules/timetable/constraint-catalog.ts` contains the literal string `'Subject preferred slot'` (the 9th SOFT entry name)
    - All 15 entries' `name` values match the canonical Java list documented in Task 0 acceptance + the new `Subject preferred slot` (verify by visual inspection of file contents)
    - `apps/api/src/modules/timetable/timetable.controller.ts` contains substring `constraint-catalog`
    - `packages/shared/src/constraint-catalog.ts` exists with the same 15 entries
    - `packages/shared/src/validation/constraint-template.ts` exists and exports `constraintTemplateParamsSchema` (discriminated union with 4 variants)
    - `packages/shared/src/validation/constraint-weight.ts` exists and exports `constraintWeightsSchema`, `bulkConstraintWeightsSchema`, AND `DEFAULT_CONSTRAINT_WEIGHTS` (verifiable via `grep -q "export const DEFAULT_CONSTRAINT_WEIGHTS" packages/shared/src/validation/constraint-weight.ts` AND `grep -q "'Subject preferred slot'" packages/shared/src/validation/constraint-weight.ts`)
    - `packages/shared/src/index.ts` re-exports the new modules (verify via `grep -q "constraintTemplateParamsSchema" packages/shared/src/index.ts`)
    - `pnpm --filter @schoolflow/shared build` exits 0 (TypeScript compiles cleanly)
    - **Post-migration liveness:** `curl -sf http://localhost:3000/api/v1/health > /dev/null` exits 0 — confirms API restart + post-process worked. If this fails, re-run the restart sequence and re-check shared dist `.js` extensions per `feedback_restart_api_after_migration.md`.
    - API restart + post-process shared dist `.js` extensions documented in task summary per `feedback_restart_api_after_migration.md`
  </acceptance_criteria>
  <done>Database has the new table; static catalog endpoint returns 15 entries; shared package re-exports schemas + DEFAULT_CONSTRAINT_WEIGHTS (9 entries); API liveness verified post-migration; downstream tasks can import from `@schoolflow/shared`.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: ConstraintWeightOverrideService + Controller (with lastUpdatedAt) + module wiring + permission seed</name>
  <files>
    apps/api/src/modules/timetable/constraint-weight-override.service.ts,
    apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts,
    apps/api/src/modules/timetable/constraint-weight-override.controller.ts,
    apps/api/src/modules/timetable/dto/constraint-weight.dto.ts,
    apps/api/src/modules/timetable/timetable.module.ts,
    apps/api/src/modules/auth/casl-ability.factory.ts,
    apps/api/prisma/seed.ts
  </files>
  <read_first>
    apps/api/src/modules/timetable/constraint-template.service.ts,
    apps/api/src/modules/timetable/constraint-template.controller.ts,
    apps/api/src/modules/timetable/timetable.module.ts,
    apps/api/src/modules/timetable/dto/constraint-weight.dto.ts,
    apps/api/src/modules/auth/casl-ability.factory.ts,
    apps/api/src/modules/auth/decorators/check-permissions.decorator.ts,
    apps/api/prisma/seed.ts,
    apps/api/src/config/database/prisma.service.ts
  </read_first>
  <behavior>
    - `service.findBySchool(schoolId)` returns `Record<string, number>` with persisted overrides merged on top of `DEFAULT_CONSTRAINT_WEIGHTS` (now 9 entries)
    - `service.findOverridesOnly(schoolId)` returns ONLY persisted overrides (no defaults) — used by TimetableService Task 4
    - `service.findLastUpdatedAt(schoolId)` returns `MAX(updatedAt)` across the school's `ConstraintWeightOverride` rows, or `null` if no rows exist
    - `service.bulkReplace(schoolId, weights, userId)` runs `prisma.$transaction([deleteMany, createMany])`; throws 422 if any constraintName ∉ `CONFIGURABLE_CONSTRAINT_NAMES` (now 9 entries); throws 422 if any weight is not integer 0..100
    - `service.resetOne(schoolId, constraintName)` deletes the single row by composite unique key; idempotent (no error if row absent)
    - GET /api/v1/schools/:schoolId/constraint-weights returns `{ weights: Record<string,number>, lastUpdatedAt: string | null }` (200) — `lastUpdatedAt` is ISO-8601 or null
    - PUT /api/v1/schools/:schoolId/constraint-weights body `{ weights }` returns `{ weights, lastUpdatedAt }` (200) and replaces the school's set
    - DELETE /api/v1/schools/:schoolId/constraint-weights/:constraintName returns 204
    - Admin role gains `manage` on subject `constraint-weight-override`
    - **Controller @CheckPermissions decorator subject is exactly the literal string `'constraint-weight-override'`** (no abbreviations / typos) — grep-verifiable
    - Whitelist violation returns RFC 9457 422 with `type: 'schoolflow://errors/unknown-constraint-name'`
  </behavior>
  <action>
    Sub-task A — DTO extensions (apps/api/src/modules/timetable/dto/constraint-weight.dto.ts):

    1. **First, extend the existing DEFAULT_CONSTRAINT_WEIGHTS and CONFIGURABLE_CONSTRAINT_NAMES from 8 to 9 entries:**
       Add `'Subject preferred slot': 5` to `DEFAULT_CONSTRAINT_WEIGHTS` and `'Subject preferred slot'` to `CONFIGURABLE_CONSTRAINT_NAMES`. Keep these in sync with the SHARED file from Task 1 step 10. The Java side is wired in Task 5 with a matching `@ConstraintWeight("Subject preferred slot")` field. Default value `5` is Claude's discretion (matches the umbrella `Subject time preference` weight philosophy).

    2. Append to the file (do NOT remove existing exports):
       ```typescript
       import { IsInt, IsObject, ValidateNested } from 'class-validator';
       import { Type } from 'class-transformer';

       /**
        * DTO for the bulk-replace PUT endpoint of school-scoped weight overrides (D-07).
        */
       export class BulkConstraintWeightsDto {
         @IsObject()
         @ApiProperty({
           description: 'Map of constraint name -> integer weight (0..100). Constraint names MUST be in CONFIGURABLE_CONSTRAINT_NAMES (9 entries as of Phase 14).',
           example: { 'No same subject doubling': 50, 'Balanced weekly distribution': 5, 'Subject preferred slot': 8 },
         })
         weights!: Record<string, number>;
       }

       /**
        * Resolution-chain helper (D-06): merge DB > per-run DTO > defaults.
        * Used by TimetableService.startSolve.
        */
       export function mergeWithSchoolDefaults(
         schoolWeights: Record<string, number>,
         perRunOverride?: Record<string, number>,
       ): Record<string, number> {
         return {
           ...DEFAULT_CONSTRAINT_WEIGHTS,
           ...schoolWeights,
           ...(perRunOverride ?? {}),
         };
       }
       ```
       (The existing `IsNumber` import already exists; ensure `IsInt`, `IsObject`, `Type`, `ValidateNested`, `ApiProperty` are imported.)

    Sub-task B — Service (apps/api/src/modules/timetable/constraint-weight-override.service.ts):

    3. Create the service:
       ```typescript
       import { Injectable, UnprocessableEntityException, Logger } from '@nestjs/common';
       import { PrismaService } from '../../config/database/prisma.service';
       import {
         DEFAULT_CONSTRAINT_WEIGHTS,
         CONFIGURABLE_CONSTRAINT_NAMES,
       } from './dto/constraint-weight.dto';

       @Injectable()
       export class ConstraintWeightOverrideService {
         private readonly logger = new Logger(ConstraintWeightOverrideService.name);

         constructor(private prisma: PrismaService) {}

         /**
          * Returns the merged weight map for a school: DB overrides on top of DEFAULT_CONSTRAINT_WEIGHTS (9 entries).
          */
         async findBySchool(schoolId: string): Promise<Record<string, number>> {
           const rows = await this.prisma.constraintWeightOverride.findMany({
             where: { schoolId },
           });
           const overrides: Record<string, number> = {};
           for (const row of rows) {
             overrides[row.constraintName] = row.weight;
           }
           return { ...DEFAULT_CONSTRAINT_WEIGHTS, ...overrides };
         }

         /**
          * Returns ONLY the persisted overrides (without defaults) — used by TimetableService resolution chain.
          */
         async findOverridesOnly(schoolId: string): Promise<Record<string, number>> {
           const rows = await this.prisma.constraintWeightOverride.findMany({
             where: { schoolId },
           });
           const overrides: Record<string, number> = {};
           for (const row of rows) {
             overrides[row.constraintName] = row.weight;
           }
           return overrides;
         }

         /**
          * Returns MAX(updatedAt) across this school's overrides, or null if none exist.
          * Used by GET /constraint-weights response and the frontend DriftBanner (Plan 14-02).
          */
         async findLastUpdatedAt(schoolId: string): Promise<Date | null> {
           const result = await this.prisma.constraintWeightOverride.aggregate({
             where: { schoolId },
             _max: { updatedAt: true },
           });
           return result._max.updatedAt ?? null;
         }

         /**
          * Atomic replace-all (D-07). Validates whitelist + bounds before touching DB.
          */
         async bulkReplace(
           schoolId: string,
           weights: Record<string, number>,
           userId?: string,
         ): Promise<Record<string, number>> {
           // Whitelist check
           for (const name of Object.keys(weights)) {
             if (!CONFIGURABLE_CONSTRAINT_NAMES.includes(name)) {
               throw new UnprocessableEntityException({
                 type: 'schoolflow://errors/unknown-constraint-name',
                 title: 'Unbekannte Constraint-Bezeichnung',
                 status: 422,
                 detail: `Constraint '${name}' ist nicht editierbar. Erlaubte Werte: ${CONFIGURABLE_CONSTRAINT_NAMES.join(', ')}`,
                 constraintName: name,
               });
             }
           }
           // Bounds check
           for (const [name, weight] of Object.entries(weights)) {
             if (!Number.isInteger(weight) || weight < 0 || weight > 100) {
               throw new UnprocessableEntityException({
                 type: 'schoolflow://errors/weight-out-of-range',
                 title: 'Ungültige Gewichtung',
                 status: 422,
                 detail: `Gewichtung für '${name}' (${weight}) liegt nicht im erlaubten Bereich 0..100.`,
                 constraintName: name,
                 weight,
               });
             }
           }

           // Atomic transaction: delete + create
           await this.prisma.$transaction([
             this.prisma.constraintWeightOverride.deleteMany({ where: { schoolId } }),
             this.prisma.constraintWeightOverride.createMany({
               data: Object.entries(weights).map(([constraintName, weight]) => ({
                 schoolId,
                 constraintName,
                 weight,
                 updatedBy: userId ?? null,
               })),
             }),
           ]);

           return this.findBySchool(schoolId);
         }

         /**
          * Reset a single override row (D-07 reset-icon).
          * Idempotent — does not error if row is absent.
          */
         async resetOne(schoolId: string, constraintName: string): Promise<void> {
           await this.prisma.constraintWeightOverride.deleteMany({
             where: { schoolId, constraintName },
           });
         }
       }
       ```

    Sub-task C — Controller (apps/api/src/modules/timetable/constraint-weight-override.controller.ts):

    4. Create the controller. **CRITICAL:** Every `@CheckPermissions` decorator below MUST use the EXACT literal string `'constraint-weight-override'` for the subject — no abbreviations, no typos. This is grep-verified by the audit E2E spec (Plan 14-03).
       ```typescript
       import {
         Controller, Get, Put, Delete, Body, Param,
         HttpCode, HttpStatus,
       } from '@nestjs/common';
       import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
       import { ConstraintWeightOverrideService } from './constraint-weight-override.service';
       import { BulkConstraintWeightsDto } from './dto/constraint-weight.dto';
       import { CheckPermissions } from '../auth/decorators/check-permissions.decorator';
       import { CurrentUser } from '../auth/decorators/current-user.decorator';
       import { AuthenticatedUser } from '../auth/types/authenticated-user';

       @ApiTags('constraint-weight-overrides')
       @ApiBearerAuth()
       @Controller('schools/:schoolId/constraint-weights')
       export class ConstraintWeightOverrideController {
         constructor(private readonly service: ConstraintWeightOverrideService) {}

         @Get()
         @CheckPermissions({ action: 'read', subject: 'constraint-weight-override' })
         @ApiOperation({ summary: 'Get the merged weight map (DB overrides + defaults) plus lastUpdatedAt for a school' })
         @ApiResponse({ status: 200, description: 'Merged weight map + last updated timestamp' })
         async findBySchool(@Param('schoolId') schoolId: string) {
           const [weights, lastUpdatedAt] = await Promise.all([
             this.service.findBySchool(schoolId),
             this.service.findLastUpdatedAt(schoolId),
           ]);
           return { weights, lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null };
         }

         @Put()
         @CheckPermissions({ action: 'manage', subject: 'constraint-weight-override' })
         @ApiOperation({ summary: 'Bulk-replace all weight overrides for a school (atomic)' })
         @ApiResponse({ status: 200, description: 'Updated weight map + lastUpdatedAt' })
         @ApiResponse({ status: 422, description: 'Unknown constraint name or weight out of range (RFC 9457)' })
         async bulkReplace(
           @Param('schoolId') schoolId: string,
           @Body() dto: BulkConstraintWeightsDto,
           @CurrentUser() user: AuthenticatedUser,
         ) {
           const weights = await this.service.bulkReplace(schoolId, dto.weights, user?.userId);
           const lastUpdatedAt = await this.service.findLastUpdatedAt(schoolId);
           return { weights, lastUpdatedAt: lastUpdatedAt?.toISOString() ?? null };
         }

         @Delete(':constraintName')
         @HttpCode(HttpStatus.NO_CONTENT)
         @CheckPermissions({ action: 'manage', subject: 'constraint-weight-override' })
         @ApiOperation({ summary: 'Reset a single weight override to default (deletes row)' })
         @ApiResponse({ status: 204, description: 'Override reset' })
         async resetOne(
           @Param('schoolId') schoolId: string,
           @Param('constraintName') constraintName: string,
         ) {
           await this.service.resetOne(schoolId, decodeURIComponent(constraintName));
         }
       }
       ```

    Sub-task D — Module wiring (apps/api/src/modules/timetable/timetable.module.ts):

    5. Edit the module to add the new controller + service to all three arrays:
       ```typescript
       import { ConstraintWeightOverrideController } from './constraint-weight-override.controller';
       import { ConstraintWeightOverrideService } from './constraint-weight-override.service';

       @Module({
         controllers: [
           TimetableController,
           SolverCallbackController,
           ConstraintTemplateController,
           ConstraintWeightOverrideController,  // NEW
         ],
         providers: [
           TimetableService,
           TimetableEditService,
           TimetableExportService,
           TimetableGateway,
           TimetableEventsGateway,
           SolverInputService,
           SolverClientService,
           SolveProcessor,
           ConstraintTemplateService,
           ConstraintWeightOverrideService,  // NEW
         ],
         exports: [
           TimetableService,
           TimetableEditService,
           TimetableExportService,
           TimetableGateway,
           TimetableEventsGateway,
           ConstraintTemplateService,
           ConstraintWeightOverrideService,  // NEW — needed by TimetableService Task 4
         ],
       })
       export class TimetableModule {}
       ```

    Sub-task E — CASL permission registration (apps/api/src/modules/auth/casl-ability.factory.ts):

    6. Open the factory and locate the admin-role permission block. Add `'constraint-weight-override'` to the admin's `manage` subjects list. The existing pattern (Phase 13 USER subject) is the precedent. Read the file first to find the exact insertion point, then add:
       - To the admin role's manage-everything block: ensure `'constraint-weight-override'` is included in the union of subjects the admin can `manage`.
       - To the schulleitung role: do NOT add (D-03 strictness — only admin).
       - To the teacher/parent/student roles: do NOT add.

       If the factory uses `'all'` for admin (CASL-style), no edit is needed. If it enumerates subjects explicitly (Phase 13 PermissionOverride pattern), add the new subject string.

    Sub-task F — Permission seed (apps/api/prisma/seed.ts):

    7. Locate the section that seeds RolePermission rows for the admin role. Add a row:
       ```typescript
       { roleId: <admin-role-id>, action: 'manage', subject: 'constraint-weight-override', conditions: null }
       ```
       Follow the existing seed pattern (Phase 13 added `manage permission-override` analogously). If the seed uses an upsert helper, follow that.

    Sub-task G — Fill the test scaffold from Task 0:

    8. Open `apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts` and replace each `it.todo` with a real Vitest test using `Test.createTestingModule` + a Prisma mock. Cover:
       - `findBySchool` returns DEFAULT_CONSTRAINT_WEIGHTS (9 entries) when no rows exist
       - `findBySchool` overlays DB rows on top of defaults
       - `findOverridesOnly` returns only persisted overrides (no defaults merged)
       - `findLastUpdatedAt` returns ISO Date when rows exist, null when none exist
       - `bulkReplace` calls `prisma.$transaction` with deleteMany + createMany
       - `bulkReplace` throws 422 with `type: 'schoolflow://errors/unknown-constraint-name'` for unknown names
       - `bulkReplace` throws 422 with `type: 'schoolflow://errors/weight-out-of-range'` for weight=200
       - `resetOne` calls `deleteMany` with composite where clause
  </action>
  <verify>
    <automated>
      pnpm --filter @schoolflow/api exec tsc --noEmit -p apps/api/tsconfig.json &amp;&amp;
      grep -q "ConstraintWeightOverrideController" apps/api/src/modules/timetable/timetable.module.ts &amp;&amp;
      grep -q "ConstraintWeightOverrideService" apps/api/src/modules/timetable/timetable.module.ts &amp;&amp;
      grep -q "exports.*ConstraintWeightOverrideService" apps/api/src/modules/timetable/timetable.module.ts &amp;&amp;
      grep -q "constraint-weight-override" apps/api/prisma/seed.ts &amp;&amp;
      grep -q "subject: 'constraint-weight-override'" apps/api/src/modules/timetable/constraint-weight-override.controller.ts &amp;&amp;
      grep -q "findLastUpdatedAt" apps/api/src/modules/timetable/constraint-weight-override.service.ts &amp;&amp;
      grep -q "lastUpdatedAt" apps/api/src/modules/timetable/constraint-weight-override.controller.ts &amp;&amp;
      grep -q "'Subject preferred slot'" apps/api/src/modules/timetable/dto/constraint-weight.dto.ts &amp;&amp;
      pnpm --filter @schoolflow/api test -- --run constraint-weight-override.service.spec.ts
    </automated>
  </verify>
  <acceptance_criteria>
    - `apps/api/src/modules/timetable/constraint-weight-override.service.ts` exists; exports class `ConstraintWeightOverrideService` with methods `findBySchool`, `findOverridesOnly`, `findLastUpdatedAt`, `bulkReplace`, `resetOne`
    - `apps/api/src/modules/timetable/constraint-weight-override.controller.ts` exists; mounts at `schools/:schoolId/constraint-weights`; declares `Get`, `Put`, `Delete` decorators
    - **Controller subject literal:** `grep -q "subject: 'constraint-weight-override'" apps/api/src/modules/timetable/constraint-weight-override.controller.ts` exits 0 (proves the @CheckPermissions decorator subject is exactly the documented string — required by E2E-SOLVER-11)
    - **GET response shape:** `grep -q "lastUpdatedAt" apps/api/src/modules/timetable/constraint-weight-override.controller.ts` exits 0 AND the controller GET method returns an object with both `weights` and `lastUpdatedAt` keys (verifiable via visual inspection)
    - **Service method:** `grep -q "findLastUpdatedAt" apps/api/src/modules/timetable/constraint-weight-override.service.ts` exits 0
    - Service `bulkReplace` uses `prisma.$transaction([deleteMany, createMany])` (verifiable via grep `\$transaction\(\[`)
    - Service throws `UnprocessableEntityException` with `type: 'schoolflow://errors/unknown-constraint-name'` for invalid names (verifiable via grep)
    - **9-entry whitelist:** `grep -q "'Subject preferred slot'" apps/api/src/modules/timetable/dto/constraint-weight.dto.ts` exits 0 (the new 9th SOFT constraint is in BOTH `DEFAULT_CONSTRAINT_WEIGHTS` and `CONFIGURABLE_CONSTRAINT_NAMES`)
    - `apps/api/src/modules/timetable/timetable.module.ts` lists `ConstraintWeightOverrideController` in `controllers[]` AND `ConstraintWeightOverrideService` in both `providers[]` and `exports[]`
    - `apps/api/prisma/seed.ts` contains substring `constraint-weight-override` (admin role permission seed)
    - `pnpm --filter @schoolflow/api exec tsc --noEmit -p apps/api/tsconfig.json` exits 0
    - `pnpm --filter @schoolflow/api test -- --run constraint-weight-override.service.spec.ts` exits 0 with all 8+ tests passing
    - Live curl smoke check (manual, document in summary): `curl -H "Authorization: Bearer $ADMIN_TOKEN" http://localhost:3000/api/v1/schools/seed-school-bgbrg-musterstadt/constraint-weights` returns 200 with `{ weights: { ... 9 entries ... }, lastUpdatedAt: null }` (or ISO string after the first PUT)
  </acceptance_criteria>
  <done>Backend exposes constraint-weight-override CRUD with `lastUpdatedAt` in GET response; controller subject string locked at `'constraint-weight-override'` for audit/E2E; permission system grants admin access; service tests pass; module wiring complete.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 3: Cross-reference validation in ConstraintTemplateService + PATCH /active endpoint</name>
  <files>
    apps/api/src/modules/timetable/constraint-template.service.ts,
    apps/api/src/modules/timetable/constraint-template.service.spec.ts,
    apps/api/src/modules/timetable/constraint-template.controller.ts
  </files>
  <read_first>
    apps/api/src/modules/timetable/constraint-template.service.ts,
    apps/api/src/modules/timetable/constraint-template.service.spec.ts,
    apps/api/src/modules/timetable/constraint-template.controller.ts,
    apps/api/src/modules/timetable/dto/constraint-template.dto.ts,
    apps/api/prisma/schema.prisma
  </read_first>
  <behavior>
    - `service.create(schoolId, dto)` calls `validateCrossReference(schoolId, dto.templateType, dto.params)` BEFORE `prisma.create`
    - `service.update(id, dto)` loads the existing row, then calls `validateCrossReference(template.schoolId, template.templateType, mergedParams)` BEFORE `prisma.update` if `dto.params` is set
    - `validateCrossReference` checks: classId/teacherId/subjectId belongs to schoolId; maxPeriod/period/latestPeriod ≤ school.maxPeriodNumber (computed from TimeGrid.periods)
    - Foreign-key violations → 422 RFC 9457 `type: 'schoolflow://errors/cross-reference-missing'`
    - Period overflow → 422 RFC 9457 `type: 'schoolflow://errors/period-out-of-range'`
    - PATCH /:id/active body `{ isActive: boolean }` toggles only that field; returns 200; granular audit
  </behavior>
  <action>
    Sub-task A — Service extension (apps/api/src/modules/timetable/constraint-template.service.ts):

    1. Add at the top of the file:
       ```typescript
       import { UnprocessableEntityException } from '@nestjs/common';
       ```

    2. Add private helper inside the class:
       ```typescript
       /**
        * Cross-reference validation for constraint template params (D-13).
        * Verifies that classId/teacherId/subjectId belong to the same school
        * and that maxPeriod/period/latestPeriod ≤ school.maxPeriodNumber.
        */
       private async validateCrossReference(
         schoolId: string,
         templateType: string,
         params: Record<string, any>,
       ): Promise<void> {
         // 1. Compute school's max period number from TimeGrid
         const timeGrid = await this.prisma.timeGrid.findUnique({
           where: { schoolId },
           include: { periods: true },
         });
         const maxPeriodNumber = timeGrid?.periods?.length
           ? Math.max(...timeGrid.periods.map((p) => p.periodNumber))
           : 0;

         // 2. Check foreign-key membership in the school
         if (params.classId) {
           const cls = await this.prisma.schoolClass.findFirst({
             where: { id: params.classId, schoolId },
             select: { id: true, name: true },
           });
           if (!cls) {
             throw new UnprocessableEntityException({
               type: 'schoolflow://errors/cross-reference-missing',
               title: 'Eintrag passt nicht zur Schule',
               status: 422,
               detail: `Klasse ${params.classId} gehört nicht zu dieser Schule.`,
               field: 'classId',
               value: params.classId,
             });
           }
         }
         if (params.subjectId) {
           const subj = await this.prisma.subject.findFirst({
             where: { id: params.subjectId, schoolId },
             select: { id: true, name: true },
           });
           if (!subj) {
             throw new UnprocessableEntityException({
               type: 'schoolflow://errors/cross-reference-missing',
               title: 'Eintrag passt nicht zur Schule',
               status: 422,
               detail: `Fach ${params.subjectId} gehört nicht zu dieser Schule.`,
               field: 'subjectId',
               value: params.subjectId,
             });
           }
         }
         if (params.teacherId) {
           const teacher = await this.prisma.teacher.findFirst({
             where: { id: params.teacherId, schoolId },
             select: { id: true },
           });
           if (!teacher) {
             throw new UnprocessableEntityException({
               type: 'schoolflow://errors/cross-reference-missing',
               title: 'Eintrag passt nicht zur Schule',
               status: 422,
               detail: `Lehrkraft ${params.teacherId} gehört nicht zu dieser Schule.`,
               field: 'teacherId',
               value: params.teacherId,
             });
           }
         }

         // 3. Check period bounds against school's maxPeriodNumber
         const periodFields: Array<{ field: string; value: number | undefined }> = [
           { field: 'maxPeriod', value: params.maxPeriod },
           { field: 'latestPeriod', value: params.latestPeriod },
           { field: 'period', value: params.period },
         ];
         for (const { field, value } of periodFields) {
           if (typeof value === 'number' && maxPeriodNumber > 0 && value > maxPeriodNumber) {
             throw new UnprocessableEntityException({
               type: 'schoolflow://errors/period-out-of-range',
               title: 'Periode außerhalb des Zeitrasters',
               status: 422,
               detail: `${field}=${value} überschreitet das Schul-Maximum (${maxPeriodNumber}).`,
               field,
               value,
               maxPeriodNumber,
             });
           }
         }

         // 4. Also validate periods[] for BLOCK_TIMESLOT
         if (Array.isArray(params.periods) && maxPeriodNumber > 0) {
           const overflow = params.periods.find((p: number) => p > maxPeriodNumber);
           if (overflow !== undefined) {
             throw new UnprocessableEntityException({
               type: 'schoolflow://errors/period-out-of-range',
               title: 'Periode außerhalb des Zeitrasters',
               status: 422,
               detail: `Periode ${overflow} überschreitet das Schul-Maximum (${maxPeriodNumber}).`,
               field: 'periods',
               value: overflow,
               maxPeriodNumber,
             });
           }
         }
       }
       ```

    3. Modify `create()` to call validation BEFORE write:
       ```typescript
       async create(schoolId: string, dto: CreateConstraintTemplateDto) {
         await this.validateCrossReference(schoolId, dto.templateType, dto.params as Record<string, any>);
         return this.prisma.constraintTemplate.create({
           data: { schoolId, templateType: dto.templateType, params: dto.params as any, isActive: dto.isActive ?? true },
         });
       }
       ```

    4. Modify `update()` to validate when params are changed:
       ```typescript
       async update(id: string, dto: UpdateConstraintTemplateDto) {
         const existing = await this.findOne(id);
         if (dto.params !== undefined) {
           await this.validateCrossReference(
             existing.schoolId,
             existing.templateType,
             dto.params as Record<string, any>,
           );
         }
         return this.prisma.constraintTemplate.update({
           where: { id },
           data: {
             ...(dto.params !== undefined && { params: dto.params as any }),
             ...(dto.isActive !== undefined && { isActive: dto.isActive }),
           },
         });
       }
       ```

    5. Add a focused isActive-only update method for the new PATCH endpoint:
       ```typescript
       async setActive(id: string, isActive: boolean) {
         await this.findOne(id); // 404 guard
         return this.prisma.constraintTemplate.update({
           where: { id },
           data: { isActive },
         });
       }
       ```

    Sub-task B — Controller PATCH endpoint (apps/api/src/modules/timetable/constraint-template.controller.ts):

    6. Add to the imports: `import { Patch } from '@nestjs/common';` and `import { IsBoolean } from 'class-validator';`

    7. Add a small DTO at top of the controller file (or in dto/constraint-template.dto.ts — executor's choice, prefer dto file for consistency):
       ```typescript
       export class SetActiveDto {
         @IsBoolean()
         isActive!: boolean;
       }
       ```

    8. Append to the controller class:
       ```typescript
       @Patch(':id/active')
       @CheckPermissions({ action: 'update', subject: 'timetable' })
       @ApiOperation({ summary: 'Toggle isActive flag on a constraint template (granular audit)' })
       @ApiResponse({ status: 200, description: 'isActive updated' })
       @ApiResponse({ status: 404, description: 'Constraint template not found' })
       async setActive(
         @Param('id') id: string,
         @Body() dto: SetActiveDto,
       ) {
         return this.constraintTemplateService.setActive(id, dto.isActive);
       }
       ```

    Sub-task C — Fill the cross-reference test scaffold from Task 0:

    9. Open `apps/api/src/modules/timetable/constraint-template.service.spec.ts` and replace the `validateCrossReference` `it.todo` entries with real tests using a Prisma mock. Cover all 4 cases listed in Task 0 step 7.
  </action>
  <verify>
    <automated>
      pnpm --filter @schoolflow/api exec tsc --noEmit -p apps/api/tsconfig.json &amp;&amp;
      grep -q "validateCrossReference" apps/api/src/modules/timetable/constraint-template.service.ts &amp;&amp;
      grep -q "schoolflow://errors/cross-reference-missing" apps/api/src/modules/timetable/constraint-template.service.ts &amp;&amp;
      grep -q "schoolflow://errors/period-out-of-range" apps/api/src/modules/timetable/constraint-template.service.ts &amp;&amp;
      grep -q "@Patch(':id/active')" apps/api/src/modules/timetable/constraint-template.controller.ts &amp;&amp;
      pnpm --filter @schoolflow/api test -- --run constraint-template.service.spec.ts
    </automated>
  </verify>
  <acceptance_criteria>
    - `apps/api/src/modules/timetable/constraint-template.service.ts` contains private method `validateCrossReference`
    - `create()` and `update()` both call `validateCrossReference` before any prisma write (verifiable via grep + visual inspection)
    - File contains both error type URIs `schoolflow://errors/cross-reference-missing` and `schoolflow://errors/period-out-of-range`
    - `apps/api/src/modules/timetable/constraint-template.controller.ts` contains `@Patch(':id/active')` decorator
    - `pnpm --filter @schoolflow/api exec tsc --noEmit -p apps/api/tsconfig.json` exits 0
    - `pnpm --filter @schoolflow/api test -- --run constraint-template.service.spec.ts` exits 0; new validateCrossReference describe block has ≥4 passing tests
    - Live curl smoke check (document in summary): POST a NO_LESSONS_AFTER template with `params.maxPeriod=99` to a school whose grid has 8 periods → response status 422 with `type: "schoolflow://errors/period-out-of-range"`
  </acceptance_criteria>
  <done>Cross-reference validation enforced; PATCH /active endpoint live; granular audit possible for inline isActive toggle.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 4: SolverInputService dedup + SUBJECT_PREFERRED_SLOT case + TimetableService resolution chain</name>
  <files>
    apps/api/src/modules/timetable/solver-input.service.ts,
    apps/api/src/modules/timetable/solver-input.service.spec.ts,
    apps/api/src/modules/timetable/timetable.service.ts,
    apps/api/src/modules/timetable/timetable.service.spec.ts,
    apps/api/src/modules/timetable/processors/solve.processor.ts
  </files>
  <read_first>
    apps/api/src/modules/timetable/solver-input.service.ts,
    apps/api/src/modules/timetable/timetable.service.ts,
    apps/api/src/modules/timetable/timetable.service.spec.ts,
    apps/api/src/modules/timetable/dto/constraint-weight.dto.ts,
    apps/api/src/modules/timetable/processors/solve.processor.ts,
    apps/api/src/modules/timetable/dto/solve-request.dto.ts
  </read_first>
  <behavior>
    - `processConstraintTemplates` returns a 4th list `subjectPreferredSlots: SubjectPreferredSlotInput[]` populated from SUBJECT_PREFERRED_SLOT rows
    - For NO_LESSONS_AFTER: groups by classId, keeps min(maxPeriod) — exactly one entry per classId in the output
    - For SUBJECT_MORNING: groups by subjectId, keeps min(latestPeriod) — exactly one entry per subjectId in the output
    - For SUBJECT_PREFERRED_SLOT: ALL entries kept (cumulative semantics per D-14 last paragraph)
    - `TimetableService.startSolve` calls `constraintWeightOverrideService.findOverridesOnly(schoolId)` BEFORE building the solver payload
    - Resolution order is `mergeWithSchoolDefaults(dbWeights, perRunOverride)` — DB layered on defaults, per-run on top
    - The resolved map is passed to `buildSolverInput()` AND snapshotted into `TimetableRun.constraintConfig`
    - `SolverPayload` (or equivalent) interface gains `subjectPreferredSlots` field (using the field name confirmed in Task 0); the BullMQ job + Java HTTP call carry the new field
  </behavior>
  <action>
    Sub-task A — Extend SolverInputService (apps/api/src/modules/timetable/solver-input.service.ts):

    1. Add to the file (near top, with other type defs):
       ```typescript
       interface SubjectPreferredSlotInput {
         subjectId: string;
         dayOfWeek: string;  // 'MONDAY' | ... | 'FRIDAY'
         period: number;
       }
       ```

    2. Modify `processConstraintTemplates` return type to include the new list:
       ```typescript
       private async processConstraintTemplates(schoolId: string): Promise<{
         additionalBlockedSlots: TeacherBlockedSlot[];
         classTimeslotRestrictions: ClassTimeslotRestriction[];
         subjectTimePreferences: SubjectTimePreference[];
         subjectPreferredSlots: SubjectPreferredSlotInput[];  // NEW (field name per Task 0 confirmation)
       }>
       ```

    3. Inside the for-loop, ADD the missing case (replace the `default:` block with a final fallback):
       ```typescript
       case 'SUBJECT_PREFERRED_SLOT': {
         // params: { subjectId, dayOfWeek, period }
         subjectPreferredSlotsRaw.push({
           subjectId: params.subjectId,
           dayOfWeek: params.dayOfWeek,
           period: params.period,
         });
         break;
       }

       default:
         this.logger.warn(
           `Unknown constraint template type: ${template.templateType} (id: ${template.id})`,
         );
       ```
       (Declare `const subjectPreferredSlotsRaw: SubjectPreferredSlotInput[] = [];` near the existing local arrays.)

    4. After the for-loop, add a dedupe block that replaces the raw collected lists with deduped versions:
       ```typescript
       // Dedupe NO_LESSONS_AFTER per classId, keep min(maxPeriod) — D-14 strictest-wins
       const classRestrictionsByClassId = new Map<string, ClassTimeslotRestriction>();
       for (const r of classTimeslotRestrictionsRaw) {
         const existing = classRestrictionsByClassId.get(r.classId);
         if (!existing || r.maxPeriod < existing.maxPeriod) {
           classRestrictionsByClassId.set(r.classId, r);
         }
       }
       const classTimeslotRestrictions = Array.from(classRestrictionsByClassId.values());

       // Dedupe SUBJECT_MORNING per subjectId, keep min(latestPeriod) — D-14
       const subjectPreferencesBySubjectId = new Map<string, SubjectTimePreference>();
       for (const p of subjectTimePreferencesRaw) {
         const existing = subjectPreferencesBySubjectId.get(p.subjectId);
         if (!existing || p.latestPeriod < existing.latestPeriod) {
           subjectPreferencesBySubjectId.set(p.subjectId, p);
         }
       }
       const subjectTimePreferences = Array.from(subjectPreferencesBySubjectId.values());

       // SUBJECT_PREFERRED_SLOT: cumulative (no dedupe) per D-14
       const subjectPreferredSlots = subjectPreferredSlotsRaw;
       ```
       (Rename existing `classTimeslotRestrictions` and `subjectTimePreferences` local arrays to `*Raw` so the new const names don't collide.)

    5. Update the function's return statement to include `subjectPreferredSlots`.

    6. Locate the caller of `processConstraintTemplates` inside `buildSolverInput`. Wire `subjectPreferredSlots` into the SolverPayload (the existing payload object — extend it with a new property `subjectPreferredSlots: result.subjectPreferredSlots`). Use the EXACT field name agreed in Task 0 (default: `subjectPreferredSlots`).

    Sub-task B — Update solve processor + Java HTTP client (apps/api/src/modules/timetable/solver-client.service.ts) — IF the payload typed interface lives there:

    7. Read `solver-client.service.ts` and update the request body type to include `subjectPreferredSlots`. The Java side (Task 5) consumes this from the `SchoolTimetable` payload.

    Sub-task C — TimetableService resolution chain (apps/api/src/modules/timetable/timetable.service.ts):

    8. Inject `ConstraintWeightOverrideService` in the constructor:
       ```typescript
       import { ConstraintWeightOverrideService } from './constraint-weight-override.service';
       import { mergeWithSchoolDefaults } from './dto/constraint-weight.dto';

       constructor(
         private prisma: PrismaService,
         private solverClient: SolverClientService,
         @InjectQueue(SOLVER_QUEUE) private solverQueue: Queue,
         private constraintWeightOverrideService: ConstraintWeightOverrideService,  // NEW
       ) {}
       ```

    9. Modify `startSolve` to apply the resolution chain BEFORE creating the run:
       ```typescript
       async startSolve(
         schoolId: string,
         maxSolveSeconds = 300,
         constraintWeights?: Record<string, number>,
       ) {
         // School existence check (existing)
         const school = await this.prisma.school.findUniqueOrThrow({ where: { id: schoolId } });

         // D-06 Resolution chain: DB > per-run DTO > defaults
         const dbWeights = await this.constraintWeightOverrideService.findOverridesOnly(schoolId);
         const resolvedWeights = mergeWithSchoolDefaults(dbWeights, constraintWeights);

         // Create TimetableRun with the RESOLVED snapshot (not the per-run DTO)
         const run = await this.prisma.timetableRun.create({
           data: {
             schoolId,
             status: 'QUEUED',
             maxSolveSeconds,
             abWeekEnabled: school.abWeekEnabled ?? false,
             constraintConfig: resolvedWeights as unknown as Prisma.InputJsonValue,
           },
         });

         // Pass the RESOLVED map to the BullMQ job (not the raw per-run DTO)
         const jobData: SolveJobData = {
           schoolId,
           runId: run.id,
           maxSolveSeconds,
           constraintWeights: resolvedWeights,
         };

         await this.solverQueue.add('solve', jobData, { removeOnComplete: true, removeOnFail: 100 });
         this.logger.log(`Solve run ${run.id} queued for school ${schoolId}`);
         await this.enforceRunLimit(schoolId);
         return run;
       }
       ```

    10. Verify `processors/solve.processor.ts` consumes `jobData.constraintWeights` and forwards it to `buildSolverInput` / the solver HTTP call. If not, wire it through.

    Sub-task D — Fill solver-input + timetable test scaffolds:

    11. Replace `it.todo` entries in `apps/api/src/modules/timetable/solver-input.service.spec.ts` with real tests covering all 5 cases from Task 0 step 6. Use a Prisma mock for `constraintTemplate.findMany`.

    12. Replace `it.todo` entries in `apps/api/src/modules/timetable/timetable.service.spec.ts` for the new "startSolve resolution chain (D-06)" describe block. Cover all 4 cases from Task 0 step 8.
  </action>
  <verify>
    <automated>
      pnpm --filter @schoolflow/api exec tsc --noEmit -p apps/api/tsconfig.json &amp;&amp;
      grep -q "case 'SUBJECT_PREFERRED_SLOT'" apps/api/src/modules/timetable/solver-input.service.ts &amp;&amp;
      grep -q "subjectPreferredSlots" apps/api/src/modules/timetable/solver-input.service.ts &amp;&amp;
      grep -q "classRestrictionsByClassId" apps/api/src/modules/timetable/solver-input.service.ts &amp;&amp;
      grep -q "constraintWeightOverrideService" apps/api/src/modules/timetable/timetable.service.ts &amp;&amp;
      grep -q "mergeWithSchoolDefaults" apps/api/src/modules/timetable/timetable.service.ts &amp;&amp;
      pnpm --filter @schoolflow/api test -- --run solver-input.service.spec.ts &amp;&amp;
      pnpm --filter @schoolflow/api test -- --run timetable.service.spec.ts
    </automated>
  </verify>
  <acceptance_criteria>
    - `apps/api/src/modules/timetable/solver-input.service.ts` contains literal `case 'SUBJECT_PREFERRED_SLOT'`
    - File contains substring `subjectPreferredSlots` AND `classRestrictionsByClassId` (dedup map)
    - `apps/api/src/modules/timetable/timetable.service.ts` injects `ConstraintWeightOverrideService` and calls `mergeWithSchoolDefaults`
    - `pnpm --filter @schoolflow/api exec tsc --noEmit -p apps/api/tsconfig.json` exits 0
    - `pnpm --filter @schoolflow/api test -- --run solver-input.service.spec.ts` exits 0 with all 5 tests passing (incl. SUBJECT_PREFERRED_SLOT case + dedup tests)
    - `pnpm --filter @schoolflow/api test -- --run timetable.service.spec.ts` exits 0 with all 4 resolution-chain tests passing
    - The BullMQ job data carries the RESOLVED weights (not the raw per-run DTO) — verifiable in the new timetable.service test
    - `TimetableRun.constraintConfig` equals the resolved map — verifiable in the new test
  </acceptance_criteria>
  <done>SolverInputService handles all 4 templateTypes correctly with dedup; TimetableService resolution chain is DB > DTO > defaults; both flows have unit-test coverage.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 5: Java sidecar — SubjectPreferredSlot domain class + NEW @ConstraintWeight + constraint stream + SchoolTimetable wiring</name>
  <files>
    apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java,
    apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java
  </files>
  <read_first>
    apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectTimePreference.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java,
    apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/Lesson.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/SolverTimeslot.java,
    apps/solver/src/main/java/at/schoolflow/solver/domain/ClassTimeslotRestriction.java
  </read_first>
  <behavior>
    - New Java class `SubjectPreferredSlot` with `subjectId`, `dayOfWeek`, `period` fields + Jackson defaults
    - `SchoolTimetable` exposes a 4th `@ProblemFactCollectionProperty List<SubjectPreferredSlot> subjectPreferredSlots` with no-arg + getter/setter following the existing pattern (lines 38-46, 108-114, 142-148). Field name matches the Task 0-confirmed name (default: `subjectPreferredSlots`)
    - The Maven build (`./mvnw -pl apps/solver -am compile` or `mvn -f apps/solver/pom.xml compile`) succeeds
    - The 8 existing soft constraint names remain unchanged in `TimetableConstraintProvider.defineConstraints()`
    - **A NEW 9th SOFT constraint method `subjectPreferredSlot(constraintFactory)` is added; it uses `.asConstraint("Subject preferred slot")` (a NEW name, NOT a duplicate of `Subject time preference`).** This avoids the Timefold/OptaPlanner `IllegalStateException` on shared constraint names.
    - **A NEW `@ConstraintWeight("Subject preferred slot")` field is added to `TimetableConstraintConfiguration.java`** with a default `HardSoftScore.ofSoft(5)` (matches the TS-side `DEFAULT_CONSTRAINT_WEIGHTS['Subject preferred slot'] = 5` from Tasks 1-2).
    - `defineConstraints()` array ends up with 15 entries total (6 HARD + 9 SOFT), matching the catalog from Task 1.
  </behavior>
  <action>
    1. Create `apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java` mirroring the structure of `SubjectTimePreference.java`:
       ```java
       package at.schoolflow.solver.domain;

       /**
        * Represents a SUBJECT_PREFERRED_SLOT constraint template:
        * a subject is preferred at a specific (dayOfWeek, period) slot.
        *
        * Lessons matching the triple (subjectId, dayOfWeek, period) are rewarded.
        * Multiple preferred slots per subject are allowed (cumulative reward).
        *
        * Added in Phase 14 (D-12 Sub-Tab b "Bevorzugte Slots").
        * Mirrors NestJS-side type SubjectPreferredSlotInput in solver-input.service.ts.
        */
       public class SubjectPreferredSlot {

           private String subjectId;
           private String dayOfWeek;  // 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY'
           private int period;

           public SubjectPreferredSlot() {}

           public SubjectPreferredSlot(String subjectId, String dayOfWeek, int period) {
               this.subjectId = subjectId;
               this.dayOfWeek = dayOfWeek;
               this.period = period;
           }

           public String getSubjectId() { return subjectId; }
           public void setSubjectId(String subjectId) { this.subjectId = subjectId; }
           public String getDayOfWeek() { return dayOfWeek; }
           public void setDayOfWeek(String dayOfWeek) { this.dayOfWeek = dayOfWeek; }
           public int getPeriod() { return period; }
           public void setPeriod(int period) { this.period = period; }

           @Override
           public String toString() {
               return "SubjectPreferredSlot{subjectId='" + subjectId + "', dayOfWeek='" + dayOfWeek + "', period=" + period + "}";
           }
       }
       ```

    2. Modify `apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java`:
       - After line 41-42 (`subjectTimePreferences` field), add (using the EXACT field name confirmed in Task 0 — default `subjectPreferredSlots`):
         ```java
         @ProblemFactCollectionProperty
         private List<SubjectPreferredSlot> subjectPreferredSlots;
         ```
       - In every constructor that initializes `subjectTimePreferences`, also initialize `subjectPreferredSlots = new ArrayList<>()`.
       - In the all-args constructor (line 74-88), add the new param at the end (BEFORE `constraintConfiguration`) and assign with null-safe coalescing.
       - Add getter + setter following the existing pattern.

    3. **NEW: Modify `apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java`** to add the 9th `@ConstraintWeight` field. Follow the existing pattern of the other `@ConstraintWeight` fields:
       ```java
       @ConstraintWeight("Subject preferred slot")
       private HardSoftScore subjectPreferredSlot = HardSoftScore.ofSoft(5);

       public HardSoftScore getSubjectPreferredSlot() { return subjectPreferredSlot; }
       public void setSubjectPreferredSlot(HardSoftScore subjectPreferredSlot) { this.subjectPreferredSlot = subjectPreferredSlot; }
       ```
       Default `HardSoftScore.ofSoft(5)` matches `DEFAULT_CONSTRAINT_WEIGHTS['Subject preferred slot'] = 5` from Tasks 1-2 (TS-side mirror).

    4. Modify `apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java`:
       - Add import: `import at.schoolflow.solver.domain.SubjectPreferredSlot;`
       - Inside `defineConstraints()` (lines 42-59), append `subjectPreferredSlot(constraintFactory)` AFTER the existing `subjectTimePreference(constraintFactory)` line (so the array has 15 constraints total). Update the array literal accordingly.
       - Add the constraint method (place near existing `subjectTimePreference`). **CRITICAL:** Use `.asConstraint("Subject preferred slot")` — a NEW unique constraint name, NOT a duplicate of `Subject time preference`. Timefold/OptaPlanner throws `IllegalStateException` when two constraint streams share the same name. The new `@ConstraintWeight("Subject preferred slot")` field in `TimetableConstraintConfiguration.java` (step 3 above) provides the configurable weight.
         ```java
         /**
          * Reward lessons that match a SUBJECT_PREFERRED_SLOT preference triple.
          * Phase 14 D-12: admins specify preferred (subject, day, period) triples;
          * solver gives positive reward to matching assignments.
          *
          * Weight is NEW (not shared with "Subject time preference") — registered as
          * the 9th configurable @ConstraintWeight in TimetableConstraintConfiguration.java.
          * CONFIGURABLE_CONSTRAINT_NAMES (constraint-weight.dto.ts) exposes both as
          * separate sliders so admins can tune morning preferences and preferred slots
          * independently.
          */
         public Constraint subjectPreferredSlot(ConstraintFactory constraintFactory) {
             return constraintFactory
                     .forEach(Lesson.class)
                     .join(SubjectPreferredSlot.class,
                             Joiners.equal(Lesson::getSubjectId, SubjectPreferredSlot::getSubjectId),
                             Joiners.equal(
                                     lesson -> lesson.getTimeslot().getDayOfWeek(),
                                     SubjectPreferredSlot::getDayOfWeek),
                             Joiners.equal(
                                     lesson -> lesson.getTimeslot().getPeriodNumber(),
                                     SubjectPreferredSlot::getPeriod))
                     .rewardConfigurable()
                     .asConstraint("Subject preferred slot");  // NEW name, NEW @ConstraintWeight
         }
         ```

    5. Compile the solver:
       ```bash
       cd apps/solver && ./mvnw compile -q
       # OR if mvnw not present: mvn -f apps/solver/pom.xml compile
       ```
       (Executor MAY use `pnpm` workspace script if one exists — check `apps/solver/package.json` first.)

    6. **Sanity-check**: Verify `defineConstraints()` returns exactly 15 constraints by reading the array literal post-edit. The TS-side catalog (Task 1) MUST agree (15 entries: 6 HARD + 9 SOFT, with `Subject preferred slot` as the 9th SOFT).
  </action>
  <verify>
    <automated>
      test -f apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java &amp;&amp;
      grep -q "public class SubjectPreferredSlot" apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java &amp;&amp;
      grep -q "List<SubjectPreferredSlot> subjectPreferredSlots" apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java &amp;&amp;
      grep -q "subjectPreferredSlot(constraintFactory)" apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java &amp;&amp;
      grep -q "@ConstraintWeight(\"Subject preferred slot\")" apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java &amp;&amp;
      grep -q "asConstraint(\"Subject preferred slot\")" apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java &amp;&amp;
      ( cd apps/solver &amp;&amp; (test -x ./mvnw &amp;&amp; ./mvnw compile -q || mvn -f pom.xml compile -q) )
    </automated>
  </verify>
  <acceptance_criteria>
    - File `apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java` exists; contains `public class SubjectPreferredSlot` with fields `subjectId`, `dayOfWeek`, `period`
    - `apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java` declares `List<SubjectPreferredSlot> subjectPreferredSlots` as a `@ProblemFactCollectionProperty` field with getter+setter
    - `apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java` defines a method `subjectPreferredSlot(ConstraintFactory constraintFactory)` and includes it in `defineConstraints()`
    - **NEW: `apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java` declares `@ConstraintWeight("Subject preferred slot")` field** (verifiable via grep)
    - **NEW: `apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java` calls `.asConstraint("Subject preferred slot")`** (the NEW unique constraint name — verifiable via grep)
    - Maven `compile` succeeds (any of: `./mvnw compile`, `mvn compile`, or pnpm workspace equivalent) — executor documents the exact command they used
    - `defineConstraints()` array literal has exactly 15 entries (6 HARD + 9 SOFT) — verifiable by reading the array source post-edit
  </acceptance_criteria>
  <done>Java sidecar consumes SUBJECT_PREFERRED_SLOT entries and produces a score signal via a dedicated 9th SOFT constraint with its own configurable weight; SOLVER-05 is end-to-end correct; TS+Java constraint counts agree at 15 (6 HARD + 9 SOFT).</done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| Browser → API | Admin Tab 2/3/4 UI submits weights + constraint templates; untrusted input crosses here |
| API → Solver sidecar | NestJS forwards resolved weight map + 4 constraint lists as JSON body to Java HTTP endpoint |
| API → PostgreSQL | Prisma writes constraint_weight_overrides + constraint_templates rows scoped by schoolId |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-14-01 | Tampering | `PUT /constraint-weights` body | mitigate | `BulkConstraintWeightsDto` + service whitelist check against `CONFIGURABLE_CONSTRAINT_NAMES` (now 9 entries) (Task 2); RFC 9457 422 on unknown name. Bounds 0..100 enforced server-side. |
| T-14-02 | Information Disclosure | Cross-school read of constraint-weight rows | mitigate | All controller endpoints scope by `:schoolId` route param (Task 2). CASL `read constraint-weight-override` permission required. School-FK + cascade on delete. |
| T-14-03 | Tampering | `POST /constraint-templates` with foreign classId/subjectId | mitigate | `validateCrossReference` in service (Task 3) verifies entity belongs to schoolId before write; 422 RFC 9457 on miss. |
| T-14-04 | Elevation of Privilege | Schulleitung tries to write constraint-weight-override | mitigate | CASL `manage constraint-weight-override` granted ONLY to admin (Task 2 sub-task E). Schulleitung receives 403 from `CheckPermissions` guard. |
| T-14-05 | Denial of Service | Bulk PUT with 10⁶ weight entries | accept | NestJS body-parser limit (default ~100KB) blocks oversized payloads at HTTP layer. Whitelist + Prisma transaction will reject with 422 in milliseconds. Low-value attack target (admin-only surface). |
| T-14-06 | Repudiation | Admin denies changing weights | mitigate | `ConstraintWeightOverride.updatedBy` column captures `currentUser.userId`. AuditInterceptor (Phase 1 D-07) logs every CRUD action on subject `constraint-weight-override` automatically. |
| T-14-07 | Tampering | Forged Java sidecar payload bypassing TS dedup | accept | Sidecar is intra-network, only reachable from NestJS pod. Network-level isolation (existing v1.0 deployment topology). No public surface. |

</threat_model>

<verification>
1. `pnpm --filter @schoolflow/api exec prisma migrate status` exits 0; constraint_weight_overrides table exists.
2. `pnpm --filter @schoolflow/api test -- --run` exits 0 (full API unit suite green).
3. `pnpm --filter @schoolflow/shared build` exits 0 (shared package types compile).
4. `( cd apps/solver && ./mvnw compile -q )` exits 0 (Java sidecar compiles).
5. `curl -sf http://localhost:3000/api/v1/health > /dev/null` exits 0 after the API restart in Task 1.
6. Live curl smoke checks (document in summary):
   - `GET /api/v1/schools/seed-school-bgbrg-musterstadt/timetable/constraint-catalog` returns 200 with **15 entries** (6 HARD + 9 SOFT)
   - `GET /api/v1/schools/seed-school-bgbrg-musterstadt/constraint-weights` returns `{ weights: {...9 entries...}, lastUpdatedAt: null }` with default values
   - `PUT /api/v1/schools/seed-school-bgbrg-musterstadt/constraint-weights` body `{ weights: { "No same subject doubling": 50 } }` returns 200 with `lastUpdatedAt` populated; subsequent GET shows the override + updated timestamp
   - `PUT /api/v1/schools/seed-school-bgbrg-musterstadt/constraint-weights` body `{ weights: { "Bogus name": 10 } }` returns 422 with `type: "schoolflow://errors/unknown-constraint-name"`
   - `POST /api/v1/schools/seed-school-bgbrg-musterstadt/constraint-templates` with foreign classId returns 422 cross-reference-missing
</verification>

<success_criteria>
- All 5 tasks complete; 5 unit tests files green (constraint-weight-override.service.spec, constraint-template.service.spec, solver-input.service.spec, timetable.service.spec, plus existing tests still pass)
- Java sidecar compiles cleanly; constraint count locked at 15 (6 HARD + 9 SOFT)
- Migration committed with the same PR as the schema edit (CLAUDE.md hard rule + `scripts/check-migration-hygiene.sh` passes)
- All 5 SOLVER-XX requirements have a concrete artifact backing them (see must_haves.truths)
- Plan 14-02 (frontend) can consume `@schoolflow/shared` exports (including 9-entry DEFAULT_CONSTRAINT_WEIGHTS) without further backend work
- Post-migration API liveness verified via `curl -sf /api/v1/health`
</success_criteria>

<output>
After completion, create `.planning/phases/14-solver-tuning/14-01-SUMMARY.md` with:
- Confirmed 14 existing Java constraint names list (Task 0 verification) + the new 15th `Subject preferred slot`
- TimetableSolveRequest.java field name confirmation (Task 0) — full path + agreed-upon `subjectPreferredSlots` field name
- Resolution-chain test results (DB/DTO/defaults precedence proven)
- Sidecar compile output excerpt — specifically confirming `defineConstraints()` returns 15 constraints
- Final slider count: **9 SOFT sliders** (locked) — Plan 14-02 renders 9
- Live curl smoke check results (catalog returns 15, GET /constraint-weights returns `{ weights, lastUpdatedAt }`, post-migration `/health` returns 200)
- Permission seed migration confirmation (admin can manage constraint-weight-override)
- Controller subject string verification: `subject: 'constraint-weight-override'` literal grep confirmation
</output>
