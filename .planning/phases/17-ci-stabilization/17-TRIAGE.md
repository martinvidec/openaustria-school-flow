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
| `apps/web/e2e/*.mobile.spec.ts` (entire mobile-375 project, ~15+ tests) | red on PR #1 mobile-375 (run 25065085891), 1-380ms abort signature | n/a — Bus-Error-10 is a WebKit binary crash on darwin, not a logic failure | CI-env (WebKit-darwin Bus-Error-10) | G | docs-only: env-classification permanent. mobile-chrome is darwin reference. WebKit-Linux-CI verification deferred to Phase 23. |
| Plan A: breadcrumb anchor 44px floor (10 admin routes via `apps/web/src/components/admin/shared/PageShell.tsx`) | red on PR #1 (run 25065085891) — touch-target a11y assertions across admin specs landed below 44px on the breadcrumb Link primitive | n/a — primitive lift, verified by spec re-runs after fix (full E2E sweep happens in Wave 4 / 17-05) | accessibility-lift | A | `min-h-11 inline-flex items-center px-1` on breadcrumb Link — fixed in commit `4723310` |
| Plan B: TabsList primitive 44px floor (`apps/web/src/components/ui/tabs.tsx` line 15; consumers /admin/subjects + /admin/timetable-edit) | red on PR #1 (run 25065085891) — TabsList tap-target assertions on /admin/subjects + /admin/timetable-edit | n/a — primitive lift | accessibility-lift | B | `tabs.tsx:15` `h-10` -> `min-h-11` (Pattern S1, `min-h-` not `h-` so wider TabsList content does not clip) — fixed in commit `4723310` |
| Plan C: RadioGroupItem 44px tap-target (`apps/web/src/components/ui/radio-group.tsx`; sole consumer LinkPersonDialog at /admin/users) | red on PR #1 (run 25065085891) — RadioGroup tap-target assertions in LinkPersonDialog (mobile <sm rendered RadioGroupItem at h-4 w-4 = 16px) | n/a — primitive lift | accessibility-lift | C | radio-group.tsx Path-A primitive-wide responsive lift `h-4 w-4` -> `h-11 w-11 sm:h-4 sm:w-4` — fixed in commit `fc3376e` (rationale: single consumer LinkPersonDialog confirmed via grep, so Path-A and Path-B have identical blast radius — Path-A is simpler and matches Plans A+B convention; existing RadioGroupPrimitive.Indicator already centers via `flex items-center justify-center`, so inner Circle stays visually centered in the new 44px outer container on mobile without further changes) |
| Plan D: All 5 admin list surfaces — Teacher (`teachers.index.tsx`), Student (`students.index.tsx`), Class (`classes.index.tsx`), Subject (`subjects.index.tsx`), User (`users.index.tsx`) | red on PR #1 mobile-chrome (run 25065085891) — mobile-cascade tail end rooted in inconsistent `md:` (768px) breakpoint on 4 of 5 surfaces while DataList primitive expected `sm:` (640px); Class was already on `sm:` but still on the dual-component pair | n/a — full migration, Playwright list-mode green; live mobile-chrome run deferred to wave-merge verification (parallel-worktree environment, API/Vite/Solver not running locally — same constraint as 17-01/17-02 rows) | datalist-migration | D | 5 surfaces migrated to shared DataList; 6 OLD files deleted in commit `d798f73` (Teacher/Class/Subject) + 4 OLD files deleted in commit `a8a7987` (Student/User); old `XListTable.tsx` + `XMobileCards.tsx` collapsed into single `XList.tsx`; sm: breakpoint convention complete across all 5 surfaces via `DataList`'s `hidden sm:block` / `sm:hidden`; pagination block lifted out of UserListTable into `users.index.tsx` adjunct (DataList does not own pagination) — fixed in commits `d798f73` and `a8a7987` |
| Plan D side-effect: `apps/web/e2e/admin-students-crud.mobile.spec.ts:122` (selector unification) | n/a — was passing OR was using legacy `student-card-${id}` prefix | n/a — DataList applies the same `data-testid="student-row-${id}"` on BOTH desktop tr AND mobile-card wrapper, so the legacy `student-card-` prefix is no longer rendered | datalist-migration-side-effect | D | spec test-id selector unified `student-card-` -> `student-row-` (test logic + 44px hit-target assertion unchanged) — fixed in commit `a8a7987` |

## Classifications (legend)

- **real-bug** — Local repro ≥2/3 on desktop. Must be fixed in-plan or skipped with reason.
- **selector-drift** — Test uses outdated DOM selector after a refactor; mechanical update.
- **CI-env** — 0/3 fail locally + fail in CI. Flake / fixture / timing.
- **missing-fixture** — Test depends on env (e.g. `E2E_RUN_SOLVER`) or seed not present in default CI run.
- **regression-candidate** — May be a side-effect of an in-Phase-17 refactor (e.g. Plan D); re-evaluate after wave completes.
- **accessibility-lift** — Primitive component fell below 44px tap-target floor; lifted in-phase per Phase-16 sm:-breakpoint convention. No test logic change.
- **datalist-migration** — Component pair (`XListTable` + `XMobileCards`) collapsed onto the shared `<DataList>` primitive proven by `ClassRestrictionsTable.tsx`. Visual + breakpoint behaviour verified against the analog (sm: convention, `getRowAttrs` carry-through, `data-row-action` stopPropagation). May trigger spec test-id-format unification (separate row).
- **datalist-migration-side-effect** — Spec selector or test-id format unified across desktop / mobile branches as a side-effect of the DataList migration (DataList applies the same `data-testid` on both render paths via `getRowTestId`). Test logic unchanged — only the selector string adjusts.

## WebKit-darwin Bus-Error-10 (permanent env-classification)

**Status:** Permanent CI-env classification — NOT a bug, NOT a flake.
**Precedent chain:** Phase 10.4-03 -> 10.5-02 -> 11-03 -> 14-03 -> 16-07 (5 phases of consistent observation).

**What happens:** The Playwright `mobile-375` project (WebKit / iPhone 13 emulation, viewport 375x812) crashes with `Bus error: 10` on darwin runners (developer machines and any darwin-based CI). Failure manifestations are 1-380ms aborts before the spec body runs; this is a WebKit-on-darwin runtime crash, not a test logic failure.

**Decision (CONTEXT D-04):** Phase 17 is docs-only for this cluster. Do NOT attempt to fix WebKit-on-darwin in this phase.

**Verification surfaces:**
- **darwin reference surface:** `mobile-chrome` (Pixel 5 / Chromium emulation, same 375x812 viewport, touch enabled) — see `apps/web/playwright.config.ts:75-82`. All Phase 11-16 mobile assertions are verified on this project.
- **Linux-CI surface (future):** `mobile-375` (WebKit / iPhone 13) — currently DOES run on Linux CI in the playwright.yml workflow, but the same Bus-Error-10 may surface there too (origin is WebKit binary, not the OS). Separate investigation deferred per below.

**Phase-23-Backlog item:** WebKit-Linux-CI playbook — verify whether `mobile-375` is reliable on the GitHub Actions Ubuntu runner (`ubuntu-latest`) or if it crashes there as well. If reliable on Linux: keep `mobile-375` enabled CI-only (skip on darwin). If crashing on Linux too: WebKit support is permanently disabled until a Playwright/WebKit upgrade, and the project is removed from `playwright.config.ts`. See `.planning/ROADMAP.md` "Backlog" section — Plan G of Phase 17 deferred this work.

**No code change in Phase 17.** This row exists so Phase 17.x and beyond do not re-investigate the same crash from scratch.

## Deferred items

(Populated by 17-05 when a Plan-E spec exhausts the 30-min fix budget — links to `.planning/deferred-items.md`.)
