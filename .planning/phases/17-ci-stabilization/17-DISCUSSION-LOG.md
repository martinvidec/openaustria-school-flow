# Phase 17: CI Stabilization - Discussion Log (Auto Mode)

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the analysis path.

**Date:** 2026-05-02
**Phase:** 17-ci-stabilization
**Mode:** auto (no interactive AskUserQuestion turns — `workflow.discuss_mode=auto`)
**Triggered via:** /gsd:next → /gsd:discuss-phase 17

## Routing rationale

Phase 17 is heavily pre-defined in ROADMAP.md (7 plans A–G with file paths, severity, failure clusters, probable causes, success criteria, and a proposed triage strategy). The 999.1.A–G items in `16-07-SUMMARY.md` §272–279 already lock the WHAT. The genuine gray areas were limited to plan-execution sequencing, triage methodology rigor, and Plan D's scope ambiguity (rendering-bug fix only vs. full DataList migration).

Combined with `workflow.discuss_mode=auto` and the user's explicit memory directives (`feedback_e2e_first_no_uat`, `feedback_phase_branch_discipline`, `feedback_verifier_human_needed_must_be_challenged`), assumption-style capture without interview was the right path.

## Codebase scout findings

| Asset | Status | Implication for Phase 17 |
|---|---|---|
| `apps/web/src/components/shared/DataList.tsx` | exists, tested (`DataList.test.tsx`) | Plan D migrationsziel — proven pattern |
| `apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx` | uses DataList (Phase 16 Plan 05) | Reference template for Plan D's 5 migrations |
| `apps/web/src/components/ui/tabs.tsx:15` | `h-10` confirmed | Plan B fix straightforward (`h-10` → `min-h-11`) |
| `apps/web/e2e/admin-school-settings.mobile.spec.ts:32` | references `md:hidden` selector | Plan F selector drift confirmed (md:→sm: needed) |
| `apps/web/src/components/data-list/` | does NOT exist | DataList lives in `shared/`, not `data-list/` — locks Plan D import path |

## Assumptions surfaced (no user corrections requested due to auto mode)

### Plan-Reihenfolge & Parallelisierung
- **Assumption:** Wave-Struktur (4 waves) statt rein sequenziell; F+G parallel zuerst; A+B+C bundle; D solo; E backend-tranche
- **Why this way:** Plan F has highest leverage (~15 mobile cascade tests potentially unblocked by 2-line selector fix); A/B/C share `apps/web/src/components/ui/` touch-point (single PR overhead); D is largest scope (5 migrations); E needs backend investigation
- **If wrong:** Sub-optimal sequencing — possibly user wants strict sequential to minimize parallel-branch coordination overhead. Mitigation: D-01..D-04 documented explicitly so user can reorder before /gsd:plan-phase
- **Confidence:** Likely

### Triage-Methodik
- **Assumption:** Real-bug-Threshold = lokale 3× Repro mit `--repeat-each=3` desktop project; ≥2/3 fail = real bug
- **Why this way:** Industry-standard flake-detection threshold (Google testing blog, Playwright docs). Anything <2/3 reproduction local = environment factor
- **If wrong:** May classify intermittent-but-real bugs as flake. Mitigation: D-12 says „Pro Failure-Spec eine kurze Investigation (15min Box)" — manual inspection backstop
- **Confidence:** Confident

### Plan D Scope
- **Assumption:** Volle DataList-Migration aller 5 list-pages (Teacher/Student/Class/Subject/User), nicht nur 375px-Bug fix
- **Why this way:** ClassRestrictionsTable already proves the pattern (Phase 16 Plan 05); consistency win + 375px-Bug fällt automatisch raus; ROADMAP severity „high" rechtfertigt full-scope
- **If wrong:** Phase 17 könnte zur „Mega-Refactor-Phase" mutieren — bigger than intended scope creep. Mitigation: D-09 + D-10 break Plan D into 5 sub-tasks in Wave 3, can be re-scoped at /gsd:plan-phase
- **Confidence:** Likely (user has discretion to override at planning)

### CI-Override-Politik (Erfolgsbedingung)
- **Assumption:** Phase 17 done only when smoke-PR (`chore/ci-smoke-noop`) merges without `--admin`
- **Why this way:** ROADMAP success criterion is „Folge-PRs können ohne `--admin`-Override gemerged werden" — testable via empty PR, not assumed via local-green
- **If wrong:** Could declare done with just local CI run if user prefers lighter gate. Mitigation: D-15 makes this explicit, can be overridden at verify-work
- **Confidence:** Confident

## Deferred items captured

- WebKit-Linux-CI setup → Phase 23-Backlog
- Solver-run-dependent integration tests → permanent skip + Phase 999.x
- DataList v2 polish (column resize, sticky headers) → separate phase
- Auth-Helper-Refactor (loginAsRole v2 with cleanup) → Phase 23 if needed

## Auto-mode telemetry

- Interactive questions asked: **0**
- AskUserQuestion calls: **0**
- Assumptions captured as locked decisions: **16** (D-01 through D-16)
- Areas left at Claude's Discretion: **5** (test-file selector deltas, DataList column configs, 422 repro strategy, triage layout, Phase-13-cluster grouping)
- Canonical refs accumulated: **15** (across 5 topic groups)

## Next step

`/gsd:plan-phase 17` — Planner reads CONTEXT.md, generates 5 atomic plans (Wave 1: F+G parallel; Wave 2: A+B+C bundle; Wave 3: D 5×; Wave 4: E triage+fix-or-skip).
