---
phase: 17-ci-stabilization
plan: 02
subsystem: testing
tags: [ci-stabilization, mobile-375, webkit, env-classification, docs-only, triage]

# Dependency graph
requires:
  - phase: 17-ci-stabilization
    provides: "17-TRIAGE.md base document created by Plan 17-01 (Plan F rows + Classifications legend + Deferred items section)"
provides:
  - "Permanent CI-env classification row for the WebKit-darwin Bus-Error-10 cluster (mobile-375 project, ~15+ tests) in 17-TRIAGE.md"
  - "Narrative section documenting the 5-phase precedent chain (10.4-03 -> 10.5-02 -> 11-03 -> 14-03 -> 16-07)"
  - "Phase-23-Backlog placeholder for the WebKit-Linux-CI playbook (out-of-scope per CONTEXT D-04)"
  - "Confirmation that mobile-chrome (Pixel 5 / Chromium emulation, 375x812) is the darwin verification surface"
affects: [17-03, 17-04, 17-05, phase-23-backlog]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CI-env classification row pattern: triage-table entry whose Resolution column reads 'docs-only: env-classification permanent. <reference-surface>. <future-work> deferred to <phase>.' for crashes that originate in browser-binary, not test logic. Re-usable for any Bus-Error-style failure (WebKit-darwin, future Chromium GPU-driver crashes, etc.)."

key-files:
  created:
    - ".planning/phases/17-ci-stabilization/17-02-SUMMARY.md"
  modified:
    - ".planning/phases/17-ci-stabilization/17-TRIAGE.md"

key-decisions:
  - "Plan G remains documentation-only — no code changes to playwright.config.ts. The existing precedent in playwright.config.ts:67-82 (Phase 11 Plan 11-03 comment) is sufficient code-side evidence; Phase 17 surfaces it in the master triage doc to stop repeated re-investigation."
  - "WebKit-Linux-CI verification deferred to Phase 23 backlog per CONTEXT D-04. The mobile-375 project still runs in the playwright.yml workflow (Linux CI), but whether it crashes there too is a separate investigation — Plan G classifies the darwin failure as permanent env, NOT Linux-CI-fix-on-spec."
  - "Triage row uses pattern 'apps/web/e2e/*.mobile.spec.ts (entire mobile-375 project, ~15+ tests)' instead of listing every spec individually — the cluster is a single root-cause class (WebKit-binary crash), so one classification row covers all current and future *.mobile.spec.ts files routed to mobile-375."

patterns-established:
  - "Pattern P-G1 — CI-env-classification triage row: when a failure cluster is browser-binary (not test logic), record one row per cluster, not per spec. Resolution column points to a permanent reference surface (e.g. mobile-chrome) and defers any actual environment fix to a backlog phase. Stops downstream agents from re-investigating each spec from scratch."

triage_ref: .planning/phases/17-ci-stabilization/17-TRIAGE.md

requirements-completed: []  # Plan G is docs-only — no requirement IDs in plan frontmatter.

decisions_addressed: [D-01, D-04, D-06, D-07]

# Metrics
duration: ~7 min
completed: 2026-05-02
---

# Phase 17 Plan 02: WebKit-darwin Bus-Error-10 CI-env Classification Summary

**17-TRIAGE.md extended with permanent CI-env classification for the entire mobile-375 (WebKit / iPhone 13) failure cluster — mobile-chrome confirmed as the darwin reference surface, WebKit-Linux-CI playbook deferred to Phase 23 backlog. Zero code changes.**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-05-02T10:30:27Z
- **Completed:** 2026-05-02T10:38:24Z
- **Tasks:** 1 (completed)
- **Files modified:** 1 (.planning/phases/17-ci-stabilization/17-TRIAGE.md)

## Accomplishments

- Surfaced the 5-phase WebKit-darwin Bus-Error-10 precedent (10.4-03 -> 10.5-02 -> 11-03 -> 14-03 -> 16-07) as a single permanent CI-env classification entry in the master triage doc, stopping repeated re-investigation.
- Documented mobile-chrome (Pixel 5 / Chromium emulation, same 375x812 viewport, touch enabled) as the darwin reference surface, with explicit pointer to playwright.config.ts:75-82.
- Deferred the WebKit-Linux-CI playbook to Phase 23 backlog per CONTEXT D-04 — Plan G remains strictly docs-only.
- Validated read-only that playwright.config.ts already encodes the precedent in lines 67-82 (Phase 11 Plan 11-03 comment block) — no edit required, no risk of code regression.

## Task Commits

Each task was committed atomically:

1. **Task 1: Append WebKit-darwin Bus-Error-10 narrative + table row to 17-TRIAGE.md** — `32fea96` (docs) — One narrative section (`## WebKit-darwin Bus-Error-10 (permanent env-classification)`) inserted between Classifications legend and Deferred items; one triage-table row classifying the entire mobile-375 project as `CI-env (WebKit-darwin Bus-Error-10)` with owning plan `G`.

**Plan metadata commit:** to be added by execute-plan workflow alongside this SUMMARY.

## Files Created/Modified

### Created
- `.planning/phases/17-ci-stabilization/17-02-SUMMARY.md` — This summary doc.

### Modified
- `.planning/phases/17-ci-stabilization/17-TRIAGE.md` — Added Plan-G narrative section + 1 triage-table row. The doc now contains:
  - Plan-F rows (from 17-01): 2 rows (admin-school-settings + zeitraster mobile selector-drift)
  - Plan-G row (this plan): 1 row (mobile-375 WebKit-darwin Bus-Error-10 cluster, ~15+ tests)
  - 5 Classification legend entries
  - New `## WebKit-darwin Bus-Error-10 (permanent env-classification)` narrative section
  - Deferred items section (still placeholder for 17-05 to populate)

## Decisions Made

- **D-01 (acknowledged):** Plan 17-02 runs in Wave 1 parallel with 17-01 — wave-merge handles ordering. Plan G's docs-only nature meant zero contention with Plan F's source/spec migration.
- **D-04 (executed):** Phase 17 is docs-only for the WebKit-darwin Bus-Error-10 cluster. The actual WebKit-Linux-CI setup is parked in Phase 23 backlog — Plan G's narrative section explicitly references this deferral and the .planning/ROADMAP.md "Backlog" section.
- **D-06 (executed):** Single Master-Triage-Doc 17-TRIAGE.md extended (NOT recreated). The doc was created by 17-01; Plan G appended both a narrative section and a single table row.
- **D-07 (executed):** Triage-Tabelle Format Spec/CI-State/Local-Repro/Classification/Owning-Plan/Resolution — Plan G's row mirrors the established format from Plan F's two rows. Cluster-level row uses `apps/web/e2e/*.mobile.spec.ts` glob pattern in the Spec column to cover all current and future *.mobile.spec.ts files in the mobile-375 cluster.

## Deviations from Plan

None — plan executed exactly as written. Two pieces (narrative + table row) inserted at the exact locations specified in the plan's `<action>` block. Verification greps returned the expected counts (`WebKit-darwin Bus-Error-10` x2, `mobile-chrome is darwin reference` x1, `Phase 23` x1). Git diff scoped to a single file (.planning/phases/17-ci-stabilization/17-TRIAGE.md). No source code touched, no test files touched, playwright.config.ts read-only verified per CONTEXT D-04.

## Issues Encountered

- **Worktree branch base mismatch:** Initial check showed merge-base at `7249ebc` instead of expected `e0875b6`. Resolved per the plan-prompt's `<worktree_branch_check>` block via `git reset --hard e0875b6`. After reset, 17-TRIAGE.md correctly contained the Plan-F rows from 17-01, allowing the append (not recreate) operation to succeed. No data loss — the worktree had no work-in-progress at the time of reset.

## TDD Gate Compliance

Plan 17-02 frontmatter is `type: execute` (not `type: tdd`), so the strict RED → GREEN → REFACTOR commit-sequence verification does not apply. The single task lands as a single `docs(17-02)` commit, which is the conventional commit type for docs-only plans (per the commit-protocol type table: `docs` = "Documentation only").

## E2E-First gate verification

Plan G is docs-only — no executable code changed, so no E2E coverage delta. The narrative explicitly points downstream agents to mobile-chrome as the darwin verification surface for any *.mobile.spec.ts assertion, preserving the project-wide E2E-first invariant.

## Self-Check: PASSED

- [x] `.planning/phases/17-ci-stabilization/17-TRIAGE.md` exists and contains the new section
  - Verified: `grep -c "WebKit-darwin Bus-Error-10" 17-TRIAGE.md` returns `2` (heading + Resolution column)
  - Verified: `grep -c "mobile-chrome is darwin reference" 17-TRIAGE.md` returns `1`
  - Verified: `grep -c "Phase 23" 17-TRIAGE.md` returns `1` (in the deferred-backlog narrative paragraph)
- [x] Task 1 commit `32fea96` exists in `git log --oneline`
  - Verified: `git rev-parse --short HEAD` returned `32fea96` immediately after commit
- [x] No apps/* files touched: `git diff --name-only HEAD~1 HEAD` shows ONLY `.planning/phases/17-ci-stabilization/17-TRIAGE.md`
- [x] No deletions in the commit: `git diff --diff-filter=D --name-only HEAD~1 HEAD` returns empty
- [x] No untracked files generated by this plan

## Next Phase Readiness

- Wave-1 docs-only deliverable complete; ready for wave-merge with 17-01 (Plan F).
- 17-TRIAGE.md is ready for 17-03 (Plans A+B+C primitive lifts) to append further classification rows under the existing 6-column format.
- Phase-23 backlog item placeholder is in place — when ROADMAP.md is touched by the orchestrator, the "Backlog" section can pick up the WebKit-Linux-CI playbook as a discrete item.

---
*Phase: 17-ci-stabilization*
*Completed: 2026-05-02*
