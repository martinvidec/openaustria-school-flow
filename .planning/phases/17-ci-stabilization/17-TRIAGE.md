# Phase 17: CI Stabilization — Master Triage Document

**Created:** 2026-05-02 (Plan 17-01)
**Reference CI run:** [GitHub Actions run 25065085891](https://github.com/martinvidec/openaustria-school-flow/actions/runs/25065085891) (PR #1 phase-15 baseline)
**Real-bug threshold (D-05):** ≥2/3 fail on `pnpm --filter @schoolflow/web exec playwright test <spec> --project=desktop --repeat-each=3`
**Owning plans:** 17-01 (Plan F), 17-02 (Plan G), 17-03 (Plans A+B+C), 17-04 (Plan D), 17-05 (Plan E)

## Triage Table

Sorted by Phase-Cluster: Phase 13 → Phase 14 → Phase 15 → Phase 10.5 → Mobile-375.

| Spec | CI-State | Local-Repro | Classification | Owning Plan | Resolution |
|------|----------|-------------|----------------|-------------|------------|
<!-- Plan-F rows appended in Task 3 of this plan. -->
<!-- Plan-G rows appended by 17-02. -->
<!-- Plans-A/B/C rows appended by 17-03. -->
<!-- Plan-D regression-candidate rows appended by 17-04. -->
<!-- Plan-E rows appended by 17-05. -->

## Classifications (legend)

- **real-bug** — Local repro ≥2/3 on desktop. Must be fixed in-plan or skipped with reason.
- **selector-drift** — Test uses outdated DOM selector after a refactor; mechanical update.
- **CI-env** — 0/3 fail locally + fail in CI. Flake / fixture / timing.
- **missing-fixture** — Test depends on env (e.g. `E2E_RUN_SOLVER`) or seed not present in default CI run.
- **regression-candidate** — May be a side-effect of an in-Phase-17 refactor (e.g. Plan D); re-evaluate after wave completes.

## Deferred items

(Populated by 17-05 when a Plan-E spec exhausts the 30-min fix budget — links to `.planning/deferred-items.md`.)
