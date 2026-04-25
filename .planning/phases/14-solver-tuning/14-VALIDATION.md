---
phase: 14
slug: solver-tuning
status: executed
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-25
updated: 2026-04-25
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Filled by gsd-planner after Plans 14-01 / 14-02 / 14-03 created.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (api + web units), Playwright 1.x (web e2e), Maven (Java sidecar compile) |
| **Config files** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts`, `apps/solver/pom.xml` |
| **Quick run command (api)** | `pnpm --filter @schoolflow/api test -- --run <file>` (≤ 30s for changed files) |
| **Quick run command (web units)** | `pnpm --filter @schoolflow/web test -- --run <file>` |
| **E2E run command** | `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning- --project=desktop` |
| **Java compile** | `cd apps/solver && ./mvnw compile -q` |
| **Estimated runtime** | api units ~30s · web units ~10s · 12 e2e specs ~3-5min · Java compile ~30s |

---

## Sampling Rate

- **After every task commit:** Run targeted unit tests for the touched module(s)
- **After every plan wave:** Run full unit suite for both apps + the e2e specs added in this phase
- **Before `/gsd:verify-work`:** Full unit + Playwright suite green; E2E_RUN_SOLVER=1 smoke for E2E-SOLVER-10
- **Max feedback latency:** 60 seconds for unit changes

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement(s) | Test Type | Automated Command | File Exists | Status |
|---------|------|------|----------------|-----------|-------------------|-------------|--------|
| 14-01-T0 | 01 | 1 | wave-0 scaffold | spec scaffold | `grep -c it.todo apps/api/src/modules/timetable/constraint-weight-override.service.spec.ts` ≥ 5 | ❌ W0 creates | ⬜ pending |
| 14-01-T1 | 01 | 1 | SOLVER-01, SOLVER-02 | migration + build | `pnpm --filter @schoolflow/api exec prisma migrate status && pnpm --filter @schoolflow/shared build` | ❌ W0 creates | ⬜ pending |
| 14-01-T2 | 01 | 1 | SOLVER-02 | unit | `pnpm --filter @schoolflow/api test -- --run constraint-weight-override.service.spec.ts` | ❌ W0 creates | ⬜ pending |
| 14-01-T3 | 01 | 1 | SOLVER-04, SOLVER-05 | unit | `pnpm --filter @schoolflow/api test -- --run constraint-template.service.spec.ts` | ✅ extend | ⬜ pending |
| 14-01-T4 | 01 | 1 | SOLVER-03, SOLVER-04, SOLVER-05 | unit | `pnpm --filter @schoolflow/api test -- --run solver-input.service.spec.ts && pnpm --filter @schoolflow/api test -- --run timetable.service.spec.ts` | ❌ W0 creates / ✅ extend | ⬜ pending |
| 14-01-T5 | 01 | 1 | SOLVER-05 (java sidecar gap-fix) | java compile | `cd apps/solver && ./mvnw compile -q` | ❌ creates SubjectPreferredSlot.java | ⬜ pending |
| 14-02-T1 | 02 | 2 | SOLVER-01..05 (route + hooks + sidebar) | typecheck | `pnpm --filter @schoolflow/web exec tsc --noEmit` | ❌ creates route + hooks | ⬜ pending |
| 14-02-T2 | 02 | 2 | SOLVER-01, SOLVER-02, SOLVER-03 (Tab 1 + 2 + Generator card) | typecheck + smoke | `pnpm --filter @schoolflow/web exec tsc --noEmit` | ❌ creates 7 components | ⬜ pending |
| 14-02-T3 | 02 | 2 | SOLVER-04, SOLVER-05 (Tab 3 + 4 + sub-tabs + helpers) | typecheck + smoke | `pnpm --filter @schoolflow/web exec tsc --noEmit` | ❌ creates 11 components | ⬜ pending |
| 14-03-T1 | 03 | 3 | wave-0 scaffolding | discovery | `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning- --project=desktop --list` (12 desktop tests) + `--project=mobile-chrome` (1 mobile test) | ✅ all created | ✅ green |
| 14-03-T2 | 03 | 3 | SOLVER-01, SOLVER-02, SOLVER-04, D-03 RBAC | e2e | `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-catalog admin-solver-tuning-weights admin-solver-tuning-restrictions admin-solver-tuning-rbac --project=desktop` — catalog asserts `Soft-Constraints (9)` + `toHaveCount(9)`; weights asserts PUT 200 + persisted-on-reload; rbac asserts schulleitung sees "Aktion nicht erlaubt" page | ✅ filled | ✅ green |
| 14-03-T3 | 03 | 3 | SOLVER-03, SOLVER-05, D-08 audit, MOBILE-ADM-01/02 | e2e | `pnpm --filter @schoolflow/web exec playwright test admin-solver-tuning-preferences admin-solver-tuning-integration admin-solver-tuning-audit --project=desktop` + `--project=mobile-chrome admin-solver-tuning-mobile`. Audit strict-asserts `entries.length >= 2`, `every entry resource='schools' && category='MUTATION'`, plus a `metadata.body.weights` PUT entry AND a `metadata.body.templateType==='NO_LESSONS_AFTER'` POST entry — no `.some()` placeholder | ✅ filled | ✅ green |

*Status legend: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Coverage by Requirement (every SOLVER-XX has ≥ 1 automated check)

| Requirement | Tasks covering | Tests |
|-------------|---------------|-------|
| SOLVER-01 | 14-01-T1, 14-02-T2, 14-03-T2 | constraint-catalog.ts unit + UI render + E2E-SOLVER-01 |
| SOLVER-02 | 14-01-T1/T2, 14-02-T2, 14-03-T2 | migration + service unit + UI render + E2E-SOLVER-02/03 |
| SOLVER-03 | 14-01-T4, 14-02-T2, 14-03-T3 | timetable.service unit (resolution chain) + Generator card + E2E-SOLVER-10 |
| SOLVER-04 | 14-01-T3/T4, 14-02-T3, 14-03-T2 | cross-ref unit + dedup unit + UI CRUD + E2E-SOLVER-04/05/06 |
| SOLVER-05 | 14-01-T3/T4/T5, 14-02-T3, 14-03-T3 | cross-ref unit + dedup unit + Java sidecar compile + UI CRUD + E2E-SOLVER-07/08/09 |

---

## Wave 0 Requirements

- [x] Task 14-01-T0 creates `constraint-weight-override.service.spec.ts` and `solver-input.service.spec.ts` test scaffolds + appends `it.todo` blocks to `constraint-template.service.spec.ts` and `timetable.service.spec.ts` — shipped in 14-01-SUMMARY.
- [x] Task 14-01-T1 ships the Prisma migration via `prisma migrate dev --name add_constraint_weight_overrides` (CLAUDE.md hard rule, NOT `db push`) — `apps/api/prisma/migrations/20260425172608_add_constraint_weight_overrides/migration.sql`.
- [x] Task 14-03-T1 scaffolds 8 spec files (7 SOLVER + 1 RBAC) + the `apps/web/e2e/helpers/constraints.ts` helper module before any spec body is written — committed in `9eec2fb` (helper + RBAC) and bodies in `5dd9440` (Task 2) + Task 3 commit.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Solver re-run reflects changed weights nachvollziehbar gegen Pre-Change-Baseline | Roadmap §Phase 14 success criterion #5 | Requires Timefold sidecar (Java) running; **PARTIALLY automated** by E2E-SOLVER-10 (gated by E2E_RUN_SOLVER=1) which proves the constraintConfig snapshot is correct. Visual diff of resulting timetables remains manual. | 1) Run E2E-SOLVER-10 with E2E_RUN_SOLVER=1 to confirm persistence in TimetableRun.constraintConfig 2) Trigger second solve via `/admin/solver` UI 3) Open `/admin/timetable-history` and visually compare two runs (lessons + score breakdowns) |

---

## Dimensions Covered (from RESEARCH.md §Validation Architecture)

The 7 Nyquist dimensions surfaced by research, each mapped to ≥1 task above:

1. ConstraintTemplate weights override — CRUD happy path → 14-01-T2 unit + E2E-SOLVER-02
2. Weight bounds validation (Min/Max/Type) → 14-01-T2 service unit + E2E-SOLVER-03 e2e (frontend Zod + backend 422)
3. Multi-school isolation — schoolId leakage tests → all backend services scope by schoolId via controller route param + cascade FK; verified by 14-01-T2/T3 unit tests
4. Restriction lifecycle (create + list + delete) → 14-01-T3/T4 unit + E2E-SOLVER-04
5. Preference lifecycle (create + list + delete) → 14-01-T3/T4 unit + E2E-SOLVER-07/08
6. Solver re-run reflects changed weights → 14-01-T4 unit (resolution chain) + E2E-SOLVER-10 gated e2e
7. Playwright E2E per UI swimlane from UI-SPEC → 14-03 (12 specs)

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (test scaffolds + spec files + helper module)
- [x] No watch-mode flags
- [x] Feedback latency < 60s for unit changes
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready for execution
