---
phase: 14-solver-tuning
verified: 2026-04-25T19:30:00Z
status: passed
score: 14/14 must-haves verified
overrides_applied: 0
gaps: []
deferred: []
human_verification: []
---

# Phase 14: Solver-Tuning Verification Report

**Phase Goal:** Admin kann Constraint-Templates, Gewichtungen und Zeit-/Fach-Restriktionen UI-gestützt pflegen, ohne den Backend-Code oder die DB direkt anzufassen.
**Verified:** 2026-04-25T19:30:00Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin sees Constraint-Template-Liste with Hard/Soft distinction (SOLVER-01) | VERIFIED | `ConstraintCatalogTab.tsx` filters `CONSTRAINT_CATALOG` into 6 HARD + 9 SOFT sections; `Hard-Constraints (6)` + `Soft-Constraints (9)` headings in source; E2E-SOLVER-01 passes |
| 2 | `/admin/solver-tuning` loads 4-tab page (Constraints / Gewichtungen / Klassen-Sperrzeiten / Fach-Präferenzen) | VERIFIED | Route registered in `routeTree.gen.ts` at `/admin/solver-tuning`; `SolverTuningTabs.tsx` renders all 4 tabs |
| 3 | Admin kann ConstraintWeightOverrides pro Schule setzen mit sofortiger Validierung (SOLVER-02 + SOLVER-03) | VERIFIED | `ConstraintWeightsTab.tsx` uses `useUpdateConstraintWeights`; backend `constraint-weight-override.service.ts` has `bulkReplace` + `resetOne`; E2E-SOLVER-02 + 03 pass |
| 4 | Admin kann ClassTimeslotRestrictions anlegen und löschen (SOLVER-04) | VERIFIED | `ClassRestrictionsTab.tsx` + `AddEditClassRestrictionDialog.tsx` exist; `ClassRestrictionsTable.tsx` has CRUD wiring; E2E-SOLVER-04/05/06 pass |
| 5 | Admin kann SubjectTimePreferences anlegen und löschen (SOLVER-05) | VERIFIED | `SubjectPreferencesTab.tsx` nests morning/preferred-slot sub-tabs; all Add/Edit/Delete dialogs exist; E2E-SOLVER-07/08/09 pass |
| 6 | Erneute Stundenplan-Generierung reflektiert geänderte Weights in TimetableRun.constraintConfig (SOLVER-03) | VERIFIED | E2E-SOLVER-10 (gated, verified with E2E_RUN_SOLVER=1): TimetableRun.constraintConfig['No same subject doubling'] === 50 confirmed |
| 7 | Sidebar entry `Solver-Tuning` is admin-only (D-03) | VERIFIED | `AppSidebar.tsx` line 106-108: `roles: ['admin']`; `SlidersHorizontal` icon; E2E-SOLVER-RBAC-01 passes |
| 8 | ConstraintWeightOverride model exists in Prisma with real migration (not db push) | VERIFIED | Migration `20260425172608_add_constraint_weight_overrides/migration.sql` has `CREATE TABLE "constraint_weight_overrides"` |
| 9 | CONSTRAINT_CATALOG has exactly 6 HARD + 9 SOFT = 15 entries including `Subject preferred slot` | VERIFIED | `packages/shared/src/constraint-catalog.ts` has 6 HARD entries + 9 SOFT entries (last: `Subject preferred slot`) |
| 10 | DriftBanner shows when weights.lastUpdatedAt > lastRun.completedAt | VERIFIED | `DriftBanner.tsx` consumes `lastUpdatedAt` from `useConstraintWeights` query result; conditional logic guards correct |
| 11 | E2E selectors (`data-severity`, `data-constraint-name`, `data-template-type`) present on row containers | VERIFIED | All 5 table/row components carry the required data attributes at the row container level |
| 12 | Every mutation hook surfaces 4xx via destructive toast (Phase 10.2-04 invariant) | VERIFIED | `useConstraintWeights.ts` + `useConstraintTemplates.ts` each have `onError` with `toast.error` (≥3 + ≥4 calls respectively) |
| 13 | Generator-Page (/admin/solver) shows GeneratorPageWeightsCard with deep-link (D-06) | VERIFIED | `solver.tsx` imports + renders `GeneratorPageWeightsCard`; card has `Link to="/admin/solver-tuning"` |
| 14 | Mobile: ToggleGroup sub-tabs + ≥44px slider tap-zone + StickyMobileSaveBar (D-04 + MOBILE-ADM-01/02) | VERIFIED | `SubjectPreferencesTab.tsx` has `ToggleGroup` mobile fallback; `ConstraintWeightSliderRow.tsx` has `[&_[role=slider]]:h-11 [&_[role=slider]]:w-11 sm:` override; E2E-SOLVER-MOBILE-01 passes |

**Score:** 14/14 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/src/modules/timetable/constraint-weight-override.service.ts` | CRUD for ConstraintWeightOverride | VERIFIED | Has `findBySchool`, `findOverridesOnly`, `findLastUpdatedAt`, `bulkReplace`, `resetOne` |
| `apps/api/src/modules/timetable/constraint-template.service.ts` | PATCH /active route | VERIFIED | Has `setActive` at line 196 |
| `apps/api/prisma/schema.prisma` | ConstraintWeightOverride model | VERIFIED | Model at line 854 |
| `apps/api/prisma/migrations/20260425172608_add_constraint_weight_overrides/migration.sql` | Real migration file | VERIFIED | `CREATE TABLE "constraint_weight_overrides"` present |
| `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` | TanStack Router route | VERIFIED | Registered in routeTree.gen.ts at `/admin/solver-tuning` |
| `apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx` | 4-tab container | VERIFIED | All 4 tabs + UnsavedChangesDialog dirty-state interception |
| `apps/web/src/lib/hooks/useConstraintWeights.ts` | Query + mutation hooks | VERIFIED | `useConstraintWeights`, `useUpdateConstraintWeights`, `useResetConstraintWeight` exported |
| `apps/web/src/lib/hooks/useConstraintTemplates.ts` | CRUD hooks per templateType | VERIFIED | Create/update/delete/setActive all have explicit `onError` |
| `apps/web/src/components/admin/solver/GeneratorPageWeightsCard.tsx` | Deep-link card | VERIFIED | Wired to `solver.tsx`; deep-link to `/admin/solver-tuning?tab=weights` |
| `apps/web/e2e/admin-solver-tuning-catalog.spec.ts` | E2E-SOLVER-01 | VERIFIED | Green on desktop |
| `apps/web/e2e/admin-solver-tuning-weights.spec.ts` | E2E-SOLVER-02 + 03 | VERIFIED | Green on desktop |
| `apps/web/e2e/admin-solver-tuning-restrictions.spec.ts` | E2E-SOLVER-04 + 05 + 06 | VERIFIED | Green on desktop |
| `apps/web/e2e/admin-solver-tuning-preferences.spec.ts` | E2E-SOLVER-07 + 08 + 09 | VERIFIED | Green on desktop |
| `apps/web/e2e/admin-solver-tuning-integration.spec.ts` | E2E-SOLVER-10 (gated) | VERIFIED | Green with E2E_RUN_SOLVER=1 (skipped in default run) |
| `apps/web/e2e/admin-solver-tuning-audit.spec.ts` | E2E-SOLVER-11 | VERIFIED | Green on desktop |
| `apps/web/e2e/admin-solver-tuning-mobile.spec.ts` | E2E-SOLVER-MOBILE-01 | VERIFIED | Green on mobile-chrome; WebKit skip accepted (Bus-Error-10 Phase 10.4-03) |
| `apps/web/e2e/admin-solver-tuning-rbac.spec.ts` | E2E-SOLVER-RBAC-01 | VERIFIED | Green on desktop |
| `apps/web/e2e/helpers/constraints.ts` | Setup + cleanup helpers | VERIFIED | Exports createConstraintWeightOverrideViaAPI, createConstraintTemplateViaAPI, cleanup helpers |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `AppSidebar.tsx` | `/admin/solver-tuning` route | `roles: ['admin']` entry at line 106-108 | WIRED | `SlidersHorizontal` icon; admin-only confirmed |
| `useConstraintWeights.ts` | `GET/PUT /api/v1/schools/:schoolId/constraint-weights` | `apiFetch` in `solver-tuning.ts` | WIRED | Full URL with schoolId; PUT returns `{weights, lastUpdatedAt}` |
| `ConstraintCatalogTab.tsx` | `@schoolflow/shared` CONSTRAINT_CATALOG | `import { CONSTRAINT_CATALOG } from '@schoolflow/shared'` | WIRED | Static, no network call |
| `solver.tsx` | `GeneratorPageWeightsCard` | JSX at line 108 | WIRED | `{schoolId && <GeneratorPageWeightsCard schoolId={schoolId} />}` |
| `DriftBanner.tsx` | `useConstraintWeights` `lastUpdatedAt` | Query result destructure | WIRED | `weights?.lastUpdatedAt ?? null` consumed correctly |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `ConstraintWeightsTab.tsx` | `SOFT_ENTRIES.map` + `local` weights | `useConstraintWeights` → `GET /constraint-weights` → `constraint-weight-override.service.ts#findBySchool` → Prisma `constraint_weight_overrides` | Yes — merged DB overrides + defaults; 9 sliders rendered from real query | FLOWING |
| `ClassRestrictionsTab.tsx` | `templates` | `useConstraintTemplates` → `GET /constraint-templates` → `constraint-template.service.ts` → Prisma | Yes | FLOWING |
| `SubjectPreferencesTab.tsx` | `morning`/`preferred-slot` templates | Same hook chain as above filtered by templateType | Yes | FLOWING |
| `GeneratorPageWeightsCard.tsx` | weights key-value rows | `useConstraintWeights` (shared cache key with Tab 2) | Yes | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 11 desktop E2E specs pass (E2E-SOLVER-01..09, 11, RBAC-01) | `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-catalog admin-solver-tuning-weights admin-solver-tuning-restrictions admin-solver-tuning-preferences admin-solver-tuning-audit admin-solver-tuning-rbac --project=desktop --reporter=line --workers=1` | `11 passed (25.5s)` | PASS |
| Mobile spec passes in mobile-chrome | `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-mobile --project=mobile-chrome --reporter=line --workers=1` | `1 passed (32.7s)` | PASS |
| Integration spec (E2E-SOLVER-10) separately verified | `E2E_RUN_SOLVER=1` run documented in 14-03-SUMMARY.md | `1 passed (5.1s)` — `constraintConfig['No same subject doubling'] === 50` | PASS |
| CONSTRAINT_CATALOG has 6 HARD + 9 SOFT entries | File inspection of `packages/shared/src/constraint-catalog.ts` | Exactly 6 HARD + 9 SOFT including `Subject preferred slot` | PASS |
| Migration is a real SQL file (not db push) | `ls apps/api/prisma/migrations/20260425172608_add_constraint_weight_overrides/migration.sql` | `CREATE TABLE "constraint_weight_overrides"` present | PASS |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| SOLVER-01 | 14-01, 14-02, 14-03 | Admin sieht Constraint-Template-Liste mit Hard/Soft-Unterscheidung | SATISFIED | ConstraintCatalogTab with 6+9 sections; E2E-SOLVER-01 green |
| SOLVER-02 | 14-01, 14-02, 14-03 | Admin kann Constraint-Templates editieren (Gewicht, Parameter) | SATISFIED | ConstraintWeightsTab with 9 sliders, save/reset; E2E-SOLVER-02+03 green |
| SOLVER-03 | 14-01, 14-02, 14-03 | Admin kann ConstraintWeightOverrides pro Schule setzen | SATISFIED | ConstraintWeightOverride model + PUT endpoint + UI; E2E-SOLVER-10 gated-verified |
| SOLVER-04 | 14-01, 14-02, 14-03 | Admin kann ClassTimeslotRestrictions (Klassen-Zeitsperren) pflegen | SATISFIED | ClassRestrictionsTab full CRUD; E2E-SOLVER-04/05/06 green |
| SOLVER-05 | 14-01, 14-02, 14-03 | Admin kann SubjectTimePreferences (Fach-Zeitfenster-Präferenzen) pflegen | SATISFIED | SubjectPreferencesTab with 2 sub-tabs; E2E-SOLVER-07/08/09 green |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `DriftBanner.tsx` | 30, 34 | `return null` | Info | Intentional: conditional render guards (no prior run or no drift — correct behavior, not a stub) |

No blockers or warnings found. The `return null` in DriftBanner is valid conditional logic, not a stub.

### Human Verification Required

None. All phase 14 success criteria are verifiable programmatically via E2E specs. The `feedback_e2e_first_no_uat.md` directive is satisfied — no UAT required.

The following items are observable by a human but not blocking closure:

1. **Visual polish of German copy** — Aria labels, German toast messages, and InfoBanner copy match the UI-SPEC verbatim (verified in E2E specs via `getByText` assertions). No human review needed for closure.
2. **DriftBanner visual appearance** — The banner only shows when a real solve run has previously completed AND weights were changed after it. E2E-SOLVER-10 (gated) proves the backend pipeline; the banner's visual styling is covered by the component's `InfoBanner variant="warning"` usage.

### Gaps Summary

No gaps. All 5 SOLVER requirements (SOLVER-01 through SOLVER-05) are fully implemented with:
- Backend: Prisma model, migration, controller, service
- Frontend: Route, 4-tab page, hooks, API client
- Tests: 12 E2E specs (11 desktop green + 1 mobile-chrome green; E2E-SOLVER-10 gated + separately verified)

One accepted caveat: E2E-SOLVER-10 (integration spec) requires `E2E_RUN_SOLVER=1` + Java sidecar. It was separately verified and passes. The seed school returns `status=FAILED` (feasibility issue out of Phase 14 scope), but `TimetableRun.constraintConfig` correctly captures the saved override.

Pre-existing issue not caused by Phase 14: `prisma/__tests__/school-year-multi-active.spec.ts` "backfill invariant" DB state drift — does not affect Phase 14 closure.

---

_Verified: 2026-04-25T19:30:00Z_
_Verifier: Claude (gsd-verifier)_
