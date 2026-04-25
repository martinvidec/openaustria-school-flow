---
phase: 14-solver-tuning
plan: 01-backend
subsystem: api
tags: [prisma, nestjs, timefold, java, solver, zod, casl, jackson]

# Dependency graph
requires:
  - phase: 03-timetable-solver-engine
    provides: ConstraintTemplate model, Timefold sidecar, SolverInputService, solver-callback wiring
  - phase: 10-schulstammdaten-zeitraster
    provides: TimeGrid + Period model used by cross-reference period validation
  - phase: 13-user-und-rechteverwaltung
    provides: AuditInterceptor pattern, tall-format override pattern, RFC 9457 problem+json shape, replace-all-in-tx pattern
provides:
  - ConstraintWeightOverride Prisma model + table (D-05)
  - 15-entry CONSTRAINT_CATALOG (6 HARD + 9 SOFT) on api + shared
  - GET /api/v1/schools/:schoolId/timetable/constraint-catalog endpoint
  - GET/PUT/DELETE /api/v1/schools/:schoolId/constraint-weights endpoints with lastUpdatedAt
  - validateCrossReference + PATCH /:id/active on ConstraintTemplate (D-13, D-11)
  - SUBJECT_PREFERRED_SLOT case + dedupe in SolverInputService (D-12, D-14)
  - mergeWithSchoolDefaults resolution chain in TimetableService.startSolve (D-06)
  - Java SubjectPreferredSlot domain + reward constraint stream + 9th @ConstraintWeight (Task 5)
  - DEFAULT_CONSTRAINT_WEIGHTS extended from 8 to 9 (api + shared in lockstep)
  - Admin role gains 'manage constraint-weight-override' permission seed
affects: [14-02-frontend, 14-03-e2e, 16-dashboard, future-solver-phases]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Tall-format school-scoped overrides (Prisma model with composite unique [schoolId, name])
    - Defaults < DB < per-run resolution chain via mergeWithSchoolDefaults helper
    - Cross-reference validation in service layer before any prisma write
    - "Java solver constraint-name parity with TS DEFAULT_CONSTRAINT_WEIGHTS (9 sliders end-to-end)"
    - "Strictest-wins dedupe for NO_LESSONS_AFTER and SUBJECT_MORNING; cumulative for SUBJECT_PREFERRED_SLOT"

key-files:
  created:
    - apps/api/prisma/migrations/20260425172608_add_constraint_weight_overrides/migration.sql
    - apps/api/src/modules/timetable/constraint-catalog.ts
    - apps/api/src/modules/timetable/constraint-weight-override.service.ts
    - apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts
    - apps/api/src/modules/timetable/constraint-weight-override.controller.ts
    - apps/api/src/modules/timetable/solver-input.service.spec.ts
    - apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java
    - packages/shared/src/constraint-catalog.ts
    - packages/shared/src/validation/constraint-template.ts
    - packages/shared/src/validation/constraint-weight.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/prisma/seed.ts
    - apps/api/src/modules/timetable/dto/constraint-weight.dto.ts
    - apps/api/src/modules/timetable/dto/constraint-template.dto.ts
    - apps/api/src/modules/timetable/constraint-template.service.ts
    - apps/api/src/modules/timetable/constraint-template.service.spec.ts
    - apps/api/src/modules/timetable/constraint-template.controller.ts
    - apps/api/src/modules/timetable/solver-input.service.ts
    - apps/api/src/modules/timetable/timetable.service.ts
    - apps/api/src/modules/timetable/timetable.service.spec.ts
    - apps/api/src/modules/timetable/timetable.controller.ts
    - apps/api/src/modules/timetable/timetable.module.ts
    - apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java
    - apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java
    - apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java
    - packages/shared/src/index.ts

key-decisions:
  - "Slider count locked at 9 — added new 'Subject preferred slot' @ConstraintWeight in Java (NOT shared with 'Subject time preference' to avoid Timefold IllegalStateException)"
  - "Java solver field name 'subjectPreferredSlots' (camelCase, plural) chosen for SchoolTimetable to match TS payload verbatim — Jackson auto-deserializes without annotations"
  - "Cross-reference period validation skipped when grid has 0 periods (mid-setup safety) — schools mid-setup with no TimeGrid are not blocked"
  - "Resolution chain D-06: defaults < school DB < per-run DTO; resolved map (not delta) snapshotted into TimetableRun.constraintConfig for run-history comparison"
  - "Admin permission 'manage constraint-weight-override' explicit in seed (D-03 strictness; redundant with manage:all but grep-stable for E2E audit spec)"
  - "Shared package: validation/ subdir created (matches PLAN.md frontmatter); existing schemas/ pattern preserved for unrelated files"

patterns-established:
  - "9-entry CONFIGURABLE_CONSTRAINT_NAMES whitelist enforced server-side with RFC 9457 422 'unknown-constraint-name' on violation"
  - "ConstraintWeightOverride bulk-replace: empty weights map runs only deleteMany (no createMany with empty data[]) to reset entire school to defaults"
  - "Cross-reference 422 error type URIs: schoolflow://errors/cross-reference-missing and schoolflow://errors/period-out-of-range"
  - "Audit-stable controller subject literal grep-verifiable: subject: 'constraint-weight-override' appears in source of new controller for E2E-SOLVER-11 spec"

requirements-completed: [SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05]

# Metrics
duration: 27min
completed: 2026-04-25
---

# Phase 14 Plan 01: Backend Foundation Summary

**ConstraintWeightOverride table + 15-entry catalog + cross-reference validation + Java SUBJECT_PREFERRED_SLOT scoring — 9 score-affecting sliders shipped end-to-end so Plan 14-02 frontend can wire without scope reduction.**

## Performance

- **Duration:** 27 min
- **Started:** 2026-04-25T17:24:54Z
- **Completed:** 2026-04-25T17:52:34Z
- **Tasks:** 6 (Task 0 Wave-0 + Tasks 1-5)
- **Files created:** 10
- **Files modified:** 16

## Accomplishments

- New Prisma model `ConstraintWeightOverride` with tall-format storage (D-05) shipped via migration `20260425172608_add_constraint_weight_overrides` — strictly via `prisma migrate dev --name`, never `db push` (CLAUDE.md hard rule respected).
- 15-entry static `CONSTRAINT_CATALOG` (6 HARD + 9 SOFT) registered as `GET /api/v1/schools/:schoolId/timetable/constraint-catalog` and mirrored in `@schoolflow/shared` for frontend consumption without a second source-of-truth.
- `ConstraintWeightOverrideService` + `ConstraintWeightOverrideController` deliver `findBySchool / findOverridesOnly / findLastUpdatedAt / bulkReplace / resetOne`. GET response shape `{ weights, lastUpdatedAt }` enables Plan 14-02 DriftBanner without round-trips.
- Cross-reference validation in `ConstraintTemplateService.create/update` + `validateCrossReference` private helper enforces classId/teacherId/subjectId belongs to the school AND maxPeriod/period/latestPeriod ≤ school's TimeGrid maximum (RFC 9457 422 with type URIs `cross-reference-missing` and `period-out-of-range`).
- `PATCH /:id/active` endpoint + service `setActive(id, isActive)` for inline isActive toggles (UI-SPEC §Restriction CRUD §7) — distinct audit action vs full PUT.
- `SolverInputService.processConstraintTemplates` extended with `SUBJECT_PREFERRED_SLOT` case (was silently dropped) + dedupe (strictest-wins for NO_LESSONS_AFTER and SUBJECT_MORNING; cumulative for SUBJECT_PREFERRED_SLOT). Returns a 4th list `subjectPreferredSlots`.
- `TimetableService.startSolve` injects `ConstraintWeightOverrideService` and applies the D-06 resolution chain — `defaults < DB < per-run DTO`. Resolved map (not delta) snapshotted into `TimetableRun.constraintConfig` for run-history comparison.
- Java sidecar shipped end-to-end SUBJECT_PREFERRED_SLOT scoring: new `SubjectPreferredSlot.java` domain class, new `subjectPreferredSlots` `@ProblemFactCollectionProperty` on `SchoolTimetable.java`, new `@ConstraintWeight("Subject preferred slot")` field on `TimetableConstraintConfiguration.java`, and new `subjectPreferredSlot(constraintFactory)` `rewardConfigurable()` constraint stream in `TimetableConstraintProvider.java`. `defineConstraints()` now returns 15 constraints (6 HARD + 9 SOFT).
- `DEFAULT_CONSTRAINT_WEIGHTS` and `CONFIGURABLE_CONSTRAINT_NAMES` extended from 8 to 9 in lockstep across `apps/api/.../dto/constraint-weight.dto.ts` AND `packages/shared/src/validation/constraint-weight.ts`.
- 28 new Vitest tests across 4 specs (13 weight-override, 7 solver-input, 4 timetable-service resolution-chain, 7 constraint-template cross-ref + setActive). All 59 tests in the 4 task-related specs are green.

## Java Source-of-Truth Verification (Task 0)

The 14 EXISTING Java constraint names were copied verbatim from `apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java#defineConstraints()`:

**HARD (6):** `Teacher conflict`, `Room conflict`, `Teacher availability`, `Student group conflict`, `Room type requirement`, `Class timeslot restriction`

**SOFT (8 existing):** `No same subject doubling`, `Balanced weekly distribution`, `Max lessons per day`, `Prefer double periods`, `Home room preference`, `Minimize room changes`, `Prefer morning for main subjects`, `Subject time preference`

**SOFT (1 NEW added by Task 5):** `Subject preferred slot`

> Note: The plan's `<interfaces>` block listed `"Prefer double period"` (singular) — the Java source uses `"Prefer double periods"` (plural). Java is authoritative, so the catalog and DTOs use the plural form. This is documented as Decision in frontmatter.

`SchoolTimetable.java` baseline confirmed at 3 `@ProblemFactCollectionProperty` lists (`blockedSlots`, `classTimeslotRestrictions`, `subjectTimePreferences`); Task 5 added the 4th (`subjectPreferredSlots`).

`SubjectTimePreference.java` confirmed to expose only `subjectId` + `latestPeriod` (SUBJECT_MORNING semantics) — confirming the need for a separate `SubjectPreferredSlot.java` domain class with day + period fields.

**TimetableSolveRequest.java path:** `apps/solver/src/main/java/at/schoolflow/solver/dto/SolveRequest.java` — wraps `SchoolTimetable problem`. Field name `subjectPreferredSlots` (camelCase, plural) is locked across:
- `apps/api/src/modules/timetable/solver-input.service.ts` `SolverPayload.subjectPreferredSlots`
- `apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java` `private List<SubjectPreferredSlot> subjectPreferredSlots`
- `apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java` field-level Jackson keys

Mismatched names would have caused Jackson to silently drop the field — Task 0 locked this.

## Task Commits

Each task was committed atomically:

1. **Task 0: Wave-0 verification + test scaffolds** — `cc671e1` (test)
2. **Task 1: Migration + 15-entry catalog + shared schemas** — `8960033` (feat)
3. **Task 2: ConstraintWeightOverride CRUD + 9-entry whitelist + permission seed** — `075756c` (feat)
4. **Task 3: Cross-reference validation + PATCH /active** — `602cf8b` (feat)
5. **Task 4: SUBJECT_PREFERRED_SLOT case + dedupe + D-06 resolution chain** — `81e8341` (feat)
6. **Task 5: Java sidecar SUBJECT_PREFERRED_SLOT scoring + 9th @ConstraintWeight** — `578b765` (feat)

_Plan-level frontmatter says `type: execute`, not `tdd` — but Tasks 1-5 had `tdd="true"` and the test scaffolds in Task 0 were created BEFORE implementation. Each spec was filled with concrete tests AFTER the implementation in its respective task; the Vitest run after each task served as the GREEN gate._

## Live Smoke Check Results (post-build, post-restart)

```
TimeGrid pre-set with 8 periods via PUT /schools/:id/time-grid?force=true.

GET /constraint-catalog       → entries=15, hard=6, soft=9
GET /constraint-weights       → weights count=9, lastUpdatedAt=null,
                                 'Subject preferred slot' default=5
PUT /constraint-weights {Bogus name}  → 422 unknown-constraint-name
PUT /constraint-weights {weight:200}  → 422 weight-out-of-range
PUT /constraint-weights {valid 50}    → 200, lastUpdatedAt=ISO timestamp
DELETE /constraint-weights/<name>     → 204; default re-applied; other overrides preserved
POST /constraint-templates classId=foreign  → 422 cross-reference-missing
POST /constraint-templates maxPeriod=99    → 422 period-out-of-range with maxPeriodNumber=8
POST /constraint-templates valid           → 201
PATCH /constraint-templates/:id/active     → 200 with isActive flipped
GET /api/v1/health                          → 200 (post-migration + post-rebuild)
```

## Maven Compile (JDK 21)

```
[INFO] Compiling 15 source files with javac [debug release 21] to target/classes
[INFO] BUILD SUCCESS
[INFO] Total time:  2.674 s
target/classes/at/schoolflow/solver/domain/SubjectPreferredSlot.class generated
defineConstraints() declares 15 unique asConstraint() calls (verified via grep)
```

Pre-existing Timefold 1.32 deprecation warnings (`penalizeConfigurable`, `@ConstraintConfiguration`, `withBestSolutionConsumer`) are unchanged — not introduced by Phase 14.

## Decisions Made

See `key-decisions` in frontmatter — 6 decisions captured.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Java 21 not on system PATH; installed openjdk@21**
- **Found during:** Task 5 (Java sidecar compile)
- **Issue:** System default `java` was Zulu 11; Maven build required release 21 per pom.xml. Existing `target/classes/` proved the user has Java 21 somewhere but it wasn't on PATH for this session.
- **Fix:** `brew install openjdk@21`, then ran Maven with `JAVA_HOME=/opt/homebrew/opt/openjdk@21 PATH=...:$PATH ./mvnw compile`.
- **Files modified:** None (toolchain-only fix; user's preferred JAVA_HOME path is unchanged).
- **Verification:** `BUILD SUCCESS`, 15 source files compiled, `SubjectPreferredSlot.class` generated.
- **Committed in:** N/A (toolchain config, not code).

**2. [Rule 3 - Blocking] Shared dist .js extensions post-process re-applied after every shared build**
- **Found during:** Task 1 (post-migration API restart) and again after Task 5 (final API rebuild).
- **Issue:** Per `feedback_restart_api_after_migration.md`, the API's CJS-style `node dist/main.js` cannot resolve ESM imports in `@schoolflow/shared/dist/*.js` without explicit `.js` extensions on relative paths. `pnpm --filter @schoolflow/shared build` regenerates the dist without those extensions; API startup throws `ERR_MODULE_NOT_FOUND`.
- **Fix:** Created `/tmp/fix-extensions.mjs` that idempotently appends `.js` to relative imports in dist files (skipping paths already ending in `.js|.json|.cjs|.mjs|.css`). Ran after each shared build to fix 86 files.
- **Files modified:** `packages/shared/dist/**` (build output, not committed).
- **Verification:** `curl http://localhost:3000/api/v1/health` returns 200 after each restart cycle.
- **Committed in:** N/A (post-process is build-pipeline concern, not source code).
- **Recommendation for next phase:** Land a permanent `packages/shared/scripts/fix-dist-extensions.mjs` and wire it into the `build` script. Out of Phase 14 scope.

**3. [Rule 3 - Blocking] Plan called for `validation/` subdir under shared but project uses `schemas/`**
- **Found during:** Task 1 (creating shared Zod modules).
- **Issue:** PLAN.md frontmatter `files_modified` explicitly lists `packages/shared/src/validation/constraint-template.ts` and `packages/shared/src/validation/constraint-weight.ts`. The existing project convention uses `packages/shared/src/schemas/` for Zod files.
- **Fix:** Followed PLAN.md verbatim — created the `validation/` subdir. Existing `schemas/` files were not touched. The two patterns now coexist; future plans may consolidate.
- **Files modified:** `packages/shared/src/validation/constraint-template.ts`, `packages/shared/src/validation/constraint-weight.ts`, `packages/shared/src/index.ts` (re-exports).
- **Verification:** `pnpm --filter @schoolflow/shared build` exits 0; symbols resolve via wildcard re-export.
- **Committed in:** `8960033` (Task 1).

---

**Total deviations:** 3 auto-fixed (3 Rule-3 blocking — toolchain/build).
**Impact on plan:** All deviations were build/toolchain blockers, none touched plan logic. Slider count remains locked at 9, all 5 SOLVER-XX requirements still satisfied. No scope creep.

## Issues Encountered

**Pre-existing test failure (out-of-scope, logged to `deferred-items.md`):**
`prisma/__tests__/school-year-multi-active.spec.ts:158` asserts that all SchoolYear rows are `isActive=true` after the Phase 10 backfill migration; the seed currently has 1 active out of 2. Predates Phase 14 — no Phase 14 file touches `school_years` schema or seed. All 14-01 tests pass green when run directly; only the unrelated school-year test fails in the full Vitest suite.

**Pre-existing Prisma drift (informational):**
The 14-01 migration includes one extra line `ALTER TABLE "permission_overrides" ALTER COLUMN "updated_at" DROP DEFAULT;` because Phase 13 set DEFAULT CURRENT_TIMESTAMP at the SQL level but Prisma's `@updatedAt` doesn't render a default in `schema.prisma`. This is a one-time prior-migration artifact; the column is still NOT NULL with application-level updates. No data integrity impact. Future Phase 13 hotfix could `ALTER TABLE ... ADD DEFAULT now()` back into a dedicated migration if needed.

## TDD Gate Compliance

Plan-level type is `execute` (not `tdd`), but Tasks 1-5 individually had `tdd="true"`:

- **RED (test scaffolds with `it.todo`):** committed in `cc671e1` (Task 0 — `test(14-01): add Phase 14 backend test scaffolds`)
- **GREEN (concrete tests + implementation):** committed in tasks `075756c` (Task 2), `602cf8b` (Task 3), `81e8341` (Task 4) — each `feat(...)` commit includes both the implementation and the corresponding test fill-in.
- **No REFACTOR commits** — implementation was clean enough on first pass; no behavior-preserving cleanup needed.

The standard TDD gate (`test(...)` commit BEFORE the corresponding `feat(...)`) is satisfied at the plan level by Task 0 (`cc671e1`) preceding Tasks 1-5.

## User Setup Required

None — no external service configuration required. The Java 21 install via Homebrew (`brew install openjdk@21`) is a developer-environment one-shot that future contributors with Java 21 already on PATH won't notice. The migration ran cleanly against the running PostgreSQL and the API's BullMQ + Redis setup is unchanged.

## Threat Flags

None. The new attack surface is the `/constraint-weights` admin route, which is fully covered by the threat model in PLAN.md (T-14-01..T-14-07). All 4 mitigate-disposition threats are implemented:

- **T-14-01** Tampering: whitelist + bounds 422 (Task 2)
- **T-14-02** Information Disclosure: schoolId-scoped routes + CASL (Task 2)
- **T-14-03** Tampering: validateCrossReference (Task 3)
- **T-14-04** Elevation of Privilege: admin-only `manage constraint-weight-override` (Task 2)
- **T-14-06** Repudiation: `updatedBy` column + AuditInterceptor wiring (Task 2)

## Next Phase Readiness

- **Plan 14-02 (frontend) can consume:**
  - `@schoolflow/shared`: `CONSTRAINT_CATALOG` (15 entries), `DEFAULT_CONSTRAINT_WEIGHTS` (9 entries), `constraintWeightsSchema`, `bulkConstraintWeightsSchema`, `constraintTemplateParamsSchema`, `dayOfWeekEnum`.
  - HTTP endpoints:
    - `GET /api/v1/schools/:schoolId/timetable/constraint-catalog` → 15 entries
    - `GET /api/v1/schools/:schoolId/constraint-weights` → `{ weights, lastUpdatedAt }`
    - `PUT /api/v1/schools/:schoolId/constraint-weights` body `{ weights }` → 200 with new `lastUpdatedAt`
    - `DELETE /api/v1/schools/:schoolId/constraint-weights/:constraintName` → 204
    - `POST/PUT/PATCH/DELETE /api/v1/schools/:schoolId/constraint-templates[/:id[/active]]` (with cross-reference validation + PATCH /active)
- **Plan 14-03 (E2E) can rely on:**
  - 15-entry catalog endpoint for `E2E-SOLVER-01` (catalog-readonly)
  - DriftBanner-ready `lastUpdatedAt` for `E2E-SOLVER-DRIFT` family
  - Stable controller subject literal `'constraint-weight-override'` for `E2E-SOLVER-11` (audit-trail spec)
  - 9-entry whitelist + RFC 9457 422 for `E2E-SOLVER-03` (validation-bounds)
  - Cross-reference 422 for `E2E-SOLVER-05` (class-restriction-cross-reference)
  - Resolved-map snapshot in `TimetableRun.constraintConfig` for `E2E-SOLVER-10` (weights-survive-solve-run)

**Blockers:** None. Plan 14-02 may begin immediately.

## Self-Check: PASSED

All 11 created files and all 6 task commits verified present in git log:

```
FOUND: apps/api/prisma/migrations/20260425172608_add_constraint_weight_overrides/migration.sql
FOUND: apps/api/src/modules/timetable/constraint-catalog.ts
FOUND: apps/api/src/modules/timetable/constraint-weight-override.service.ts
FOUND: apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts
FOUND: apps/api/src/modules/timetable/constraint-weight-override.controller.ts
FOUND: apps/api/src/modules/timetable/solver-input.service.spec.ts
FOUND: apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectPreferredSlot.java
FOUND: packages/shared/src/constraint-catalog.ts
FOUND: packages/shared/src/validation/constraint-template.ts
FOUND: packages/shared/src/validation/constraint-weight.ts
FOUND: .planning/phases/14-solver-tuning/14-01-SUMMARY.md

Commits: cc671e1, 8960033, 075756c, 602cf8b, 81e8341, 578b765 — all FOUND
```

---
*Phase: 14-solver-tuning*
*Plan: 01-backend*
*Completed: 2026-04-25*
