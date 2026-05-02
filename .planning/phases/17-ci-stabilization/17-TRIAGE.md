# Phase 17: CI Stabilization — Master Triage Document

**Created:** 2026-05-02 (Plan 17-01)
**Reference CI run:** [GitHub Actions run 25065085891](https://github.com/martinvidec/openaustria-school-flow/actions/runs/25065085891) (PR #1 phase-15 baseline)
**Real-bug threshold (D-05):** ≥2/3 fail on `pnpm --filter @schoolflow/web exec playwright test <spec> --project=desktop --repeat-each=3`
**Owning plans:** 17-01 (Plan F), 17-02 (Plan G), 17-03 (Plans A+B+C), 17-04 (Plan D), 17-05 (Plan E)

## Triage Table

Sorted by Phase-Cluster: Phase 13 → Phase 14 → Phase 15 → Phase 10.5 → Mobile-375.

| Spec | CI-State | Local-Repro | Classification | Owning Plan | Resolution |
|------|----------|-------------|----------------|-------------|------------|
<!-- Plan-G rows appended by 17-02. -->
<!-- Plans-A/B/C rows appended by 17-03. -->
<!-- Plan-D regression-candidate rows appended by 17-04. -->
<!-- Plan-E rows appended by 17-05. -->
| `apps/web/e2e/admin-school-settings.mobile.spec.ts:35` (MOBILE-ADM-02 + D-12) | red on PR #1 mobile-chrome (run 25065085891) — `div.md\:hidden.space-y-3` selector resolved to wrong DOM after Phase-16 sm: convention realignment was missed on this surface | n/a — live mobile-chrome run deferred to wave-merge verification (parallel-worktree environment, API on :3000 not running; Playwright list-mode green: 4 tests in 2 files load on mobile-chrome project) | selector-drift | F | `md\:hidden` → `sm:hidden` — fixed in commits `88f6806` (Rule-2 source migration of `PeriodsEditor.tsx` + `school.settings.tsx` + `PeriodsEditor.spec.tsx`) and `d47e93d` (spec selector + narrative swap) |
| `apps/web/e2e/zeitraster.mobile.spec.ts:41` (ZEIT-03-MOBILE) | red on PR #1 mobile-chrome (run 25065085891) — same `div.md\:hidden.space-y-3` selector | n/a — live mobile-chrome run deferred to wave-merge verification (same reason as row 1) | selector-drift | F | `md\:hidden` → `sm:hidden` — fixed in commits `88f6806` (source migration) and `d47e93d` (spec selector + narrative swap) |

## Classifications (legend)

- **real-bug** — Local repro ≥2/3 on desktop. Must be fixed in-plan or skipped with reason.
- **selector-drift** — Test uses outdated DOM selector after a refactor; mechanical update.
- **CI-env** — 0/3 fail locally + fail in CI. Flake / fixture / timing.
- **missing-fixture** — Test depends on env (e.g. `E2E_RUN_SOLVER`) or seed not present in default CI run.
- **regression-candidate** — May be a side-effect of an in-Phase-17 refactor (e.g. Plan D); re-evaluate after wave completes.

## Deferred items

(Populated by 17-05 when a Plan-E spec exhausts the 30-min fix budget — links to `.planning/deferred-items.md`.)
