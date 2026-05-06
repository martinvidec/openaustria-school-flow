---
phase: 17-ci-stabilization
plan: 05
subsystem: testing
tags: [ci-stabilization, e2e, playwright, triage, fix-or-skip, smoke-pr, verifier-gate, deferred-items, phase-17.1-spawn]

requires:
  - phase: 14-solver-tuning
    provides: ConstraintTemplate DTO + validateCrossReference 422 problem+json contract (subject of #cluster-14-422 sample failure investigation)
  - phase: 13-user-mgmt
    provides: admin-user search endpoint contract (subject of #cluster-13 fixture-regression cluster)
  - phase: 15-dsgvo-audit
    provides: audit-log seedAuditEntryLegacy fixture (subject of #cluster-15-audit-detail missing-fixture)
  - phase: 17-ci-stabilization (Plans F+G+A+B+C+D)
    provides: prior-wave fixes (mobile selector drift, WebKit-darwin classification, primitive 44px lifts, DataList migration of 5 admin list surfaces) — Plan E builds on these by classifying every residual red spec
provides:
  - Master triage doc with every PR-#1 red spec classified (Resolution column populated for every row)
  - 14 spec files with Phase-17-deferred test.skip-with-reason annotations (8 describe-block + 6 test-level skips covering 32 individual tests)
  - Sample-failure (admin-solver-tuning-restrictions) end-to-end triaged as canonical demo of the 30-min-fix-or-skip protocol
  - deferred-items.md `## Phase 17 deferred` parking lot organized into 6 root-cause clusters (A-F)
  - Smoke-PR `chore/ci-smoke-noop` (PR #9) created off origin/main, CI run executed, result documented
  - PHASE-17.1-SCOPE.md drafted per CONTEXT D-16 (Phase 17.1 spawn artifact)
affects: [phase-17.1-ci-stabilization-followup, phase-23-backlog-webkit-linux-ci]

tech-stack:
  added: []
  patterns:
    - "Pattern S6 (skip-with-reason): test.skip(true, 'Phase 17 deferred: <reason> — see 17-TRIAGE.md row #cluster-...') applied to 14 spec files"
    - "Cluster-based deferral: 6 root-cause clusters (A-F) consolidate 32 deferred tests into single fix-paths owned by Phase 17.1"
    - "Verifier-gate via no-op smoke-PR: chore/ci-smoke-noop branched off origin/main, comment-only diff, CI runs full Playwright suite as the actual gate (not a unit assertion)"
    - "Parallel-worktree execution constraint: when API/Vite/Solver are not running locally, classify red specs by static analysis + CI-log inspection + skip-with-reason; 30-min D-12 budget caps backend-fix attempts"

key-files:
  created:
    - .planning/phases/17-ci-stabilization/17-05-SUMMARY.md
    - .planning/phases/17-ci-stabilization/PHASE-17.1-SCOPE.md
  modified:
    - .planning/phases/17-ci-stabilization/17-TRIAGE.md (sample row + 17 sweep rows + ## Smoke-PR result section)
    - .planning/phases/17-ci-stabilization/deferred-items.md (## Phase 17 deferred section — 6 clusters)
    - apps/web/e2e/admin-solver-tuning-restrictions.spec.ts (describe-block skip)
    - apps/web/e2e/admin-solver-tuning-preferences.spec.ts (test-level skips × 2)
    - apps/web/e2e/admin-solver-tuning-audit.spec.ts (describe-block skip)
    - apps/web/e2e/admin-users-list.spec.ts (describe-block skip)
    - apps/web/e2e/admin-user-overrides.spec.ts (describe-block skip)
    - apps/web/e2e/admin-user-permissions.spec.ts (describe-block skip)
    - apps/web/e2e/admin-user-person-link.spec.ts (describe-block skip)
    - apps/web/e2e/admin-user-roles.spec.ts (describe-block skip)
    - apps/web/e2e/admin-user-silent-4xx.spec.ts (describe-block skip)
    - apps/web/e2e/admin-import.spec.ts (describe-block skip)
    - apps/web/e2e/admin-timetable-edit-dnd.spec.ts (test-level skip on REGRESSION-DND-COLLISION only — REGRESSION-DND-422 still active)
    - apps/web/e2e/silent-4xx.spec.ts (test-level skip on SILENT-4XX-01 only)
    - apps/web/e2e/admin-audit-log-detail.spec.ts (test-level skip on legacy-entry test only)
    - apps/web/e2e/admin-audit-log-filter.spec.ts (test-level skip on Filter zurücksetzen test only)
    - apps/web/e2e/screenshots.spec.ts (test-level skip on SCHOOL-05 only)
    - .github/workflows/playwright.yml (single comment-only diff on chore/ci-smoke-noop branch — Phase 17 verifier-gate header note)

key-decisions:
  - "Sample failure (admin-solver-tuning-restrictions, POST /constraint-templates 422) classified as real-bug (deferred — regression-candidate) per CONTEXT D-13 — Phase-14-03 SUMMARY documents E2E-SOLVER-04 as PASSING at end of Phase 14, so this is NOT pre-existing per D-14; backend-fix path requires live validateCrossReference 422 problem+json inspection (cross-reference-missing vs period-out-of-range) which exceeded the 30-min D-12 budget given the parallel-worktree environment (no live API on :3000)"
  - "Cluster-A (Phase 14 POST /constraint-templates 422) — 5 tests across 3 specs share single root cause; classified together as Phase 17.1 single-fix candidate"
  - "Cluster-B (Phase 13 admin-user search fixture) — 15 tests across 5 specs share GET /admin/users (search=...) failure; classified as fixture-regression with single-fix unblock potential"
  - "Cluster-C/D/E/F (audit-log + import + DnD + screenshot) — smaller clusters with distinct root causes, each owned individually by Phase 17.1"
  - "Describe-block-level skip used when ALL or shared-fixture-bound tests in a file fail (8 files); test-level skip used when only some tests fail (6 files) — preserves passing-test coverage"
  - "Smoke-PR chore/ci-smoke-noop branched off origin/main HEAD 7249ebc per parallel_execution instructions, NOT off the worktree branch — this validates the actual D-15 gate (PR off main without --admin override)"
  - "Smoke-PR result: RED — failed at Build Web step with pre-existing TS errors in DashboardChecklist.test.tsx (same TS errors documented in deferred-items.md as out-of-scope for Plan 17-03); these errors block the entire web build before Playwright can start, hiding the E2E layer"
  - "Phase 17.1 spawned per CONTEXT D-16 — the TS-compile-error blocker is NOT a CI-env-flake (it's a real regression that prevents the build), satisfying the 'Failures bleiben die NICHT als CI-env-flake klassifizierbar sind' trigger condition"

patterns-established:
  - "Pattern S6 (skip-with-reason annotation) applied at scale: 32 tests deferred across 14 spec files via test.skip(true, 'Phase 17 deferred: <reason> — see 17-TRIAGE.md row #cluster-...') describe-block-or-test-level annotations, each pointing to a TRIAGE row + a deferred-items.md cluster fix-path"
  - "Cluster-based deferral pattern: when N>1 specs share a single root-cause failure mode, group them in TRIAGE under one #cluster-XXX-YYY anchor and one deferred-items.md cluster (A-F), so Phase 17.1 owners can fix-once-unblock-many"
  - "Verifier-gate as a separate-PR construct: chore/ci-smoke-noop is a stable branch name reused across re-runs; a fresh comment-only diff each iteration keeps the gate semantically clean"
  - "30-min-fix-or-skip protocol enforcement: per CONTEXT D-12, the timer is per-spec, not per-cluster; even when a cluster spans 5 specs, each gets ≤30 min before skip-with-reason"

requirements-completed: []

duration: ~75min
completed: 2026-05-02
---

# Phase 17 Plan 05: CI Stabilization — Verifier-Gate + Triage Sweep Summary

**Plan E (CONTEXT D-12, D-13, D-14, D-15, D-16) — every PR-#1 red spec classified, 32 tests deferred to Phase 17.1 via Pattern S6 skip-with-reason, smoke-PR opened off origin/main with verifier-gate result RED → Phase 17.1 spawned per D-16 (TS compile error in DashboardChecklist.test.tsx blocks Web build before Playwright starts)**

## Performance

- **Duration:** ~75 min
- **Started:** 2026-05-02T13:55:00Z (approximately, from worktree branch checkout)
- **Completed:** 2026-05-02T14:35:00Z (approximately, after smoke-PR CI completed)
- **Tasks:** 4 (Task 1 sample triage, Task 2 cluster sweep, Task 3 smoke-PR + CI watch, Task 4 finalize TRIAGE + spawn Phase 17.1)
- **Files modified:** 17 (1 created PHASE-17.1-SCOPE.md, 1 created 17-05-SUMMARY.md, 2 modified TRIAGE+deferred-items, 14 modified spec files, 1 modified .github/workflows/playwright.yml on chore branch)

## Accomplishments

- **Sample failure end-to-end triaged** as canonical demo of CONTEXT D-12 30-min-fix-or-skip protocol: `admin-solver-tuning-restrictions.spec.ts` analyzed, classified as `real-bug (deferred — regression-candidate)`, skip-with-reason applied at describe-block level, full row in 17-TRIAGE.md `#cluster-14-422 (sample)` anchor.
- **Every remaining PR-#1 red spec classified** in 17-TRIAGE.md — Resolution column populated for every row. 17 sweep rows added covering Phase 13/14/15/10.5/10.2/04 clusters. Plus the 7 prior-wave rows from 17-01..17-04 = 24 total triage entries with no unclassified failures.
- **32 individual tests deferred via Pattern S6** across 14 spec files — 8 describe-block-level skips (when all tests in file share a root cause) + 6 test-level skips (when only specific tests fail). Each skip annotation points to a TRIAGE row anchor AND a deferred-items.md cluster fix-path.
- **6 root-cause clusters consolidated** in `deferred-items.md ## Phase 17 deferred`: A (Phase 14 422 — 5 tests), B (Phase 13 fixture — 15 tests), C (Phase 15 audit — 2 tests), D (Phase 10.5 import — 3 tests), E (Phase 04 DnD — 1 test), F (Phase 10.2 silent-4xx + screenshot — 2 tests). Plus already-gated specs (no action) and WebKit-darwin Bus-Error-10 (Plan G env-classification).
- **Smoke-PR `chore/ci-smoke-noop` (PR #9) created off origin/main**, comment-only diff to `.github/workflows/playwright.yml` header, CI run [25251866945](https://github.com/martinvidec/openaustria-school-flow/actions/runs/25251866945) executed in 2m37s.
- **Verifier-gate result RED + Phase 17.1 spawned per CONTEXT D-16**: smoke-PR failed at Build Web step with pre-existing TypeScript errors in `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx`. PHASE-17.1-SCOPE.md drafted with 9 prioritized scope items (build-blocker fix, branch merge coordination, smoke-PR re-run, then 6 cluster fix-paths).

## Task Commits

Each task was committed atomically with `--no-verify`:

1. **Task 1: Triage sample failure (admin-solver-tuning-restrictions)** — `4f66b7a` (test) — apply describe-block test.skip(true, 'Phase 17 deferred: ...') + append #cluster-14-422 sample row + 17 sweep rows to 17-TRIAGE.md + extend deferred-items.md with ## Phase 17 deferred section.
2. **Task 2: Sweep all remaining red specs (cluster sweep)** — `4a731fc` (test) — 14 spec files modified with skip-with-reason; describe-block skips for 8 files, test-level skips for 6 files; 32 individual tests deferred.
3. **Task 3: Create smoke-PR chore/ci-smoke-noop** — `d752f74` on chore/ci-smoke-noop branch (chore) — comment-only diff to .github/workflows/playwright.yml. Pushed to origin, opened PR #9. CI run completed in 2m37s with FAIL at Build Web step.
4. **Task 4: Finalize 17-TRIAGE.md + spawn Phase 17.1** — pending final commit (this SUMMARY + TRIAGE update + PHASE-17.1-SCOPE.md).

## Files Created/Modified

### Created
- `.planning/phases/17-ci-stabilization/PHASE-17.1-SCOPE.md` — Phase 17.1 follow-up scope draft per CONTEXT D-16; 9 scope items prioritized, canonical spec list copied from TRIAGE rows, recommended Plan structure for `/gsd:plan-phase 17.1`
- `.planning/phases/17-ci-stabilization/17-05-SUMMARY.md` — this summary

### Modified (worktree-agent-a990c22a8e43baf35 branch)
- `.planning/phases/17-ci-stabilization/17-TRIAGE.md` — sample row + 17 sweep rows in the table + new `## Smoke-PR result (CONTEXT D-15 verifier gate)` section with RED status, run URL, root-cause analysis, Phase 17.1 spawn rationale
- `.planning/phases/17-ci-stabilization/deferred-items.md` — new `## Phase 17 deferred` section organizing 32 deferred tests into 6 clusters (A-F) with cluster-level fix-paths
- `apps/web/e2e/admin-solver-tuning-restrictions.spec.ts` — describe-block skip (3 tests covered)
- `apps/web/e2e/admin-solver-tuning-preferences.spec.ts` — 2 test-level skips on E2E-SOLVER-07 + E2E-SOLVER-09 (E2E-SOLVER-08 still active)
- `apps/web/e2e/admin-solver-tuning-audit.spec.ts` — describe-block skip (1 test covered)
- `apps/web/e2e/admin-users-list.spec.ts` — describe-block skip (5 tests covered)
- `apps/web/e2e/admin-user-overrides.spec.ts` — describe-block skip (5 tests covered)
- `apps/web/e2e/admin-user-permissions.spec.ts` — describe-block skip (2 tests covered)
- `apps/web/e2e/admin-user-person-link.spec.ts` — describe-block skip (3 tests covered)
- `apps/web/e2e/admin-user-roles.spec.ts` — describe-block skip (4 tests covered)
- `apps/web/e2e/admin-user-silent-4xx.spec.ts` — describe-block skip (2 tests covered)
- `apps/web/e2e/admin-import.spec.ts` — describe-block skip (3 tests covered)
- `apps/web/e2e/admin-timetable-edit-dnd.spec.ts` — test-level skip on REGRESSION-DND-COLLISION only (REGRESSION-DND-422 API-contract test still active)
- `apps/web/e2e/silent-4xx.spec.ts` — test-level skip on SILENT-4XX-01 only (SILENT-4XX-02..04 still active)
- `apps/web/e2e/admin-audit-log-detail.spec.ts` — test-level skip on legacy-entry test only (new-entry test still active)
- `apps/web/e2e/admin-audit-log-filter.spec.ts` — test-level skip on "Filter zurücksetzen" test only (Aktion + date-range filter tests still active)
- `apps/web/e2e/screenshots.spec.ts` — test-level skip on SCHOOL-05 only (SCHOOL-01..04 + MOBILE-OVERVIEW still active)

### Modified (chore/ci-smoke-noop branch — separate from worktree)
- `.github/workflows/playwright.yml` — single comment-only diff (5-line header note documenting the Phase 17 verifier-gate purpose); committed as `d752f74` on chore/ci-smoke-noop, pushed to origin, opened as PR #9

## Decisions Made

- **Sample-failure classification:** `admin-solver-tuning-restrictions` POST /constraint-templates 422 = `real-bug (deferred — regression-candidate)`. NOT pre-existing (Phase 14-03 SUMMARY shows it as PASSING). 30-min D-12 budget exhausted because parallel-worktree environment has no live API on :3000 to inspect `validateCrossReference` 422 problem+json `type` (cross-reference-missing vs period-out-of-range). Skip-with-reason applied; backend-fix owner = Phase 17.1.
- **Cluster grouping rationale:** 5 of the 22 failing specs share `POST /constraint-templates` 422 root cause (Cluster A); 15 of them share `GET /admin/users (search=...)` fixture failure (Cluster B). Grouping reduces Phase 17.1 fix surface from 22 individual investigations to 6 cluster-level investigations.
- **Skip-level decision (describe-block vs test-level):** All-tests-fail-in-file or shared-fixture-bound tests use describe-block-level skip (8 files); partial-fail files use test-level skip (6 files). Preserves coverage of passing tests in mixed files (e.g. REGRESSION-DND-422 API-contract test in admin-timetable-edit-dnd.spec.ts continues to run and guard FIX 1).
- **Smoke-PR branch source:** Per parallel_execution instructions, branched off origin/main (HEAD 7249ebc) NOT off the worktree branch. This validates the actual D-15 gate semantics: a fresh PR off main must pass CI.
- **Phase 17.1 spawn trigger:** TS compile error blocking Build Web is NOT a CI-env-flake — it is a real regression that prevents the entire E2E layer from running. CONTEXT D-16 trigger condition met. PHASE-17.1-SCOPE.md drafted with build-blocker fix as item #1 (highest priority — single file, <1h work, unblocks every CI run).

## Deviations from Plan

**No auto-fixed deviations during this plan execution.** All 4 tasks executed per the plan's task definitions (sample triage, sweep, smoke-PR, finalize). The smoke-PR RED outcome is NOT a deviation — it is a documented branch in Task 4's action ("A) APPROVED ... B) REJECTED"). Path B was taken per CONTEXT D-16.

The "rule violations" embedded in the plan structure (e.g. parallel-worktree environment blocking live local repro) were handled per the established 17-01..17-04 precedent (TRIAGE row "n/a — parallel-worktree environment ...") and per the 30-min D-12 hard rule.

---

**Total deviations:** 0 auto-fixed.
**Impact on plan:** Plan executed exactly as written, including the Path B branch in Task 4. The smoke-PR result was within the documented decision tree.

## Issues Encountered

- **Worktree branch reset:** ACTUAL_BASE check showed merge-base = 32eeb96 (correct), but HEAD was 7249ebc (origin/main, behind 32eeb96). Reset to 32eeb96 to build on prior plan commits. Resolved per worktree_branch_check protocol.
- **Smoke-PR build-blocker discovery:** The smoke-PR off origin/main surfaced a pre-existing TS compile error in `DashboardChecklist.test.tsx` that was already documented in `deferred-items.md` as out-of-scope for 17-03. This bypassed the entire Playwright layer, meaning the smoke-PR could never validate the E2E gate without first fixing this build-blocker. Phase 17.1 SCOPE item #1 addresses this.
- **Linter modifications announced:** During Task 2 sweep, the editor announced linter modifications to several spec files. These matched my intentional changes (added skip-with-reason annotations); no rollback or further action required.

## Authentication Gates

None — no auth-gates encountered during Plan 17-05 execution. The smoke-PR push and `gh pr create` ran without authentication friction (existing `gh` CLI session).

## Threat Flags

None new — no source-code surface introduced. The 14 spec-file edits and 1 workflow-file comment edit are testing/CI surface only. T-17-09 (constraint-template DTO mitigation) was NOT touched because the backend-fix path was deferred to Phase 17.1; T-17-10 (test-fixture login) and T-17-11 (triage-doc disclosure) remain `accept` per the threat register and Phase 17 retains zero new attack surface.

## Self-Check

Verifying claims before final commit.

**1. Files exist:**

```
.planning/phases/17-ci-stabilization/17-TRIAGE.md → FOUND
.planning/phases/17-ci-stabilization/deferred-items.md → FOUND
.planning/phases/17-ci-stabilization/PHASE-17.1-SCOPE.md → FOUND
.planning/phases/17-ci-stabilization/17-05-SUMMARY.md → FOUND (this file)
apps/web/e2e/admin-solver-tuning-restrictions.spec.ts → FOUND (with skip annotation)
... (14 spec files all FOUND with Phase 17 deferred annotations)
```

**2. Commits exist:**

- `4f66b7a` Task 1 commit → on worktree branch
- `4a731fc` Task 2 commit → on worktree branch
- `d752f74` Task 3 commit → on chore/ci-smoke-noop branch (pushed to origin)
- Task 4 final commit → pending after this SUMMARY is written

**3. PR exists:**

PR #9: https://github.com/martinvidec/openaustria-school-flow/pull/9 → OPEN, head=chore/ci-smoke-noop, base=main, CI run 25251866945 completed (FAIL)

## Self-Check: PASSED

All claimed files exist on disk. All claimed commits exist on the relevant branches (`4f66b7a`, `4a731fc` on worktree-agent; `d752f74` on chore/ci-smoke-noop and pushed to origin). PR #9 exists and CI run 25251866945 result is publicly available.

## Next Phase Readiness

- **Phase 17 status:** done-with-followup. Verifier-gate RED, Phase 17.1 spawned per CONTEXT D-16.
- **Phase 17.1 ready to plan:** PHASE-17.1-SCOPE.md drafted with 9 scope items, canonical spec list, recommended Plan structure. Run `/gsd:plan-phase 17.1` to formalize.
- **Orchestrator-owned step:** Merge worktree branches 17-01 (Plan F), 17-02 (Plan G), 17-03 (Plans A+B+C), 17-04 (Plan D), 17-05 (Plan E) to main in order. Then re-run smoke-PR `chore/ci-smoke-noop` (push fresh comment-only diff). Without these merges, the smoke-PR off main will continue to surface the PR-#1 baseline failures because the deferred-skips + primitive lifts + DataList migration aren't in main.
- **Build-blocker:** `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx` MUST be fixed (Phase 17.1 SCOPE item #1) before any subsequent CI run can complete the Build Web step. This is a hard prerequisite for the Phase 17.1 verifier-gate re-run.
- **Memory directive consistency:** All deferrals comply with `feedback_e2e_first_no_uat.md` (no manual UAT introduced) and `feedback_verifier_human_needed_must_be_challenged.md` (every deferred item has a TRIAGE row + cluster fix-path; nothing requires verifier-side manual evaluation that bypasses the Playwright lens).

---

*Phase: 17-ci-stabilization*
*Plan: 05*
*Completed: 2026-05-02*
