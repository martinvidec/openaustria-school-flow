---
phase: 16-admin-dashboard-mobile-h-rtung
plan: 04
subsystem: ui

tags: [shadcn-ui, tailwind, accessibility, touch-targets, wcag, mobile, primitives, button, input, select, vitest, rtl]

# Dependency graph
requires:
  - phase: 04-timetable-viewing-editing-room-management
    provides: shadcn/ui + Tailwind CSS 4 primitives baseline (Button/Input/Select/Textarea)
provides:
  - "Button primitive with responsive 44px floor (min-h-11) on <sm; desktop heights preserved (h-9/h-10) via sm:min-h-{n}"
  - "Input primitive with responsive min-h-11 sm:min-h-10"
  - "Select trigger primitive with responsive min-h-11 sm:min-h-10"
  - "icon-Button extends floor on width axis too (min-w-11 sm:min-w-10)"
  - "8 unit tests asserting class output for both viewports (button.test.tsx 5, input.test.tsx 2, select.test.tsx 1)"
  - "Pitfall #4 sweep findings documented: command.tsx, toggle.tsx, tabs.tsx still carry sub-44px heights — Plan 05/07 follow-ups"
  - "D-17 mandate enforced: NO new mobile-named variant; lift on existing primitives propagates to 100+ Button + dozens of Input/Select call-sites without per-form patches"
affects: [16-05-mobile-form-overflow-sweep, 16-07-e2e-mobile-touch-target-sweep, 16-06-admin-dashboard-mobile-shell, all future v1.1 admin forms]

# Tech tracking
tech-stack:
  added: []  # No new libraries — pure Tailwind utility-class lift on existing primitives
  patterns:
    - "Responsive touch-target floor: combine declared `h-{n}` (legacy desktop dense) WITH prepended `min-h-11 sm:min-h-{n}` (mobile floor + desktop preserve via Tailwind sm: breakpoint)"
    - "Primitive-level WCAG 2.1 AAA enforcement — fix once at the cva variant / default className layer, never patch per call-site"
    - "Audit-then-edit textarea pattern: when current value already meets the floor (min-h-[80px] > 44px), document the audit in SUMMARY but make NO source change"

key-files:
  created:
    - apps/web/src/components/ui/button.test.tsx
    - apps/web/src/components/ui/input.test.tsx
    - apps/web/src/components/ui/select.test.tsx
  modified:
    - apps/web/src/components/ui/button.tsx
    - apps/web/src/components/ui/input.tsx
    - apps/web/src/components/ui/select.tsx

key-decisions:
  - "D-17 implementation: lift on existing primitives via responsive `min-h-11 sm:min-h-{n}` — NO new mobile-named variant. Single primitive edit covers 100+ call-sites; prevents drift when new forms ship."
  - "icon-Button gets BOTH min-h-11 AND min-w-11 (icon buttons are square hit-targets — height-only would leave 40×44 on <sm, failing WCAG 2.1 AAA)."
  - "Textarea audit found min-h-[80px] already > 44px — NO edit per Pitfall #4 / `<action> step 4`. Textarea touch target is the textarea body itself, not a fixed-height row."
  - "Caller `className` (e.g. `<Button className=\"h-12\">`) wins on the `h-{n}` axis via tailwind-merge precedence; min-h-11 floor survives because it lives on a different utility family. Locked by 2 dedicated tests (button override, input override)."
  - "Pitfall #7 verified at unit-test layer (sm:min-h-9 / sm:min-h-10 present in class output). Visual desktop regression deferred to Plan 07 E2E desktop project sweep — appropriate per plan output spec."

patterns-established:
  - "Responsive floor pattern for any future shadcn primitive that has a sub-44px height: `<existing-height> min-h-11 sm:min-h-<existing-height>`"
  - "Two-axis floor for square interactive primitives (icon-buttons): apply both min-h-11 and min-w-11 with sm: variants"
  - "Test-class-output, not pixel-output: assert `toHaveClass('h-10', 'min-h-11', 'sm:min-h-10')` rather than computed heights — pixel rendering is verified by Playwright in Plan 07"

requirements-completed: [MOBILE-ADM-02]

# Metrics
duration: 2min
completed: 2026-04-28
---

# Phase 16 Plan 04: Touch-Target Floor Hardening Summary

**Lifted shadcn/ui Button (3 sizes), Input, and SelectTrigger primitives to a 44px WCAG 2.1 AAA touch-target floor on `<sm` viewports while preserving existing desktop dense heights (h-9/h-10) via the Tailwind `sm:min-h-{n}` responsive escape hatch — single primitive-level edit covers 100+ Button and dozens of Input/Select call-sites with zero call-site changes.**

## Performance

- **Duration:** ~2 min (compute) + setup/verification overhead — well under typical TDD lift
- **Started:** 2026-04-28T23:42:43Z
- **Completed:** 2026-04-28T23:45:09Z
- **Tasks:** 1 (TDD: RED + GREEN; REFACTOR not needed — implementation minimal)
- **Files created:** 3 (button.test.tsx, input.test.tsx, select.test.tsx)
- **Files modified:** 3 (button.tsx, input.tsx, select.tsx) + 1 audited unchanged (textarea.tsx)

## Accomplishments

- **Button** — `cva` size variants `default`/`sm`/`icon` got `min-h-11 sm:min-h-{n}`; icon variant additionally got `min-w-11 sm:min-w-10`; `lg` left unchanged (already h-11)
- **Input** — default class string lifted: `flex h-10 min-h-11 sm:min-h-10 w-full rounded-md ...`
- **SelectTrigger** — default class string lifted: `flex h-10 min-h-11 sm:min-h-10 w-full items-center ...`
- **Textarea** — audited; current `min-h-[80px]` already exceeds 44px, no edit needed (recorded in plan output spec)
- **8 unit tests** lock the class-output contract at both viewports (5 Button + 2 Input + 1 Select); all pass; tsc clean
- **D-17 invariant enforced**: no new `mobile`-named variant introduced — Pitfall #7 (desktop regression) is structurally impossible because every variant retains its `sm:min-h-{original}` desktop floor

## Final Class Outputs (for quick reference by Plan 05/07)

| Primitive            | Final class output                                                       |
| -------------------- | ------------------------------------------------------------------------ |
| Button default       | `h-10 px-4 py-2 min-h-11 sm:min-h-10`                                    |
| Button sm            | `h-9 rounded-md px-3 min-h-11 sm:min-h-9`                                |
| Button lg            | `h-11 rounded-md px-8` (unchanged — already 44px)                        |
| Button icon          | `h-10 w-10 min-h-11 min-w-11 sm:min-h-10 sm:min-w-10`                    |
| Input default        | `flex h-10 min-h-11 sm:min-h-10 w-full ...` (full string in input.tsx:13)|
| SelectTrigger default| `flex h-10 min-h-11 sm:min-h-10 w-full items-center ...` (select.tsx:22) |
| Textarea             | `flex min-h-[80px] w-full ...` (unchanged — audit confirmed >44px)       |

## Task Commits

Plan 04 has a single TDD task split across the canonical RED → GREEN gates:

1. **RED — Failing touch-target floor tests** — `8fffd68` (test)
   - `apps/web/src/components/ui/button.test.tsx`
   - `apps/web/src/components/ui/input.test.tsx`
   - `apps/web/src/components/ui/select.test.tsx`
   - 7 of 8 tests fail as expected; the size=lg test passes pre-implementation (acceptable per plan: "no `min-h-11` duplication needed but acceptable")

2. **GREEN — Lift primitives** — `9b101fb` (feat)
   - `apps/web/src/components/ui/button.tsx`
   - `apps/web/src/components/ui/input.tsx`
   - `apps/web/src/components/ui/select.tsx`
   - All 8 tests pass; `tsc --noEmit` exits 0

REFACTOR step skipped — final implementation is the minimal correct form (a 5-line `cva` size object + two `cn()` className-string edits); no cleanup possible without regression risk.

## Files Created/Modified

### Created (3 unit-test files)
- `apps/web/src/components/ui/button.test.tsx` — 5 tests covering default/sm/lg/icon size variants + caller-className-override merge
- `apps/web/src/components/ui/input.test.tsx` — 2 tests covering default render + caller-h-14 override
- `apps/web/src/components/ui/select.test.tsx` — 1 test covering SelectTrigger default render via `[role="combobox"]` selector

### Modified (3 primitive files)
- `apps/web/src/components/ui/button.tsx` — `cva` `size` object: 3 of 4 variants get the floor
- `apps/web/src/components/ui/input.tsx` — `cn()` default class string: floor inserted after `h-10`
- `apps/web/src/components/ui/select.tsx` — `cn()` SelectTrigger className: floor inserted after `h-10`

### Audited unchanged
- `apps/web/src/components/ui/textarea.tsx` — current `min-h-[80px]` already exceeds 44px floor; no edit per plan `<action>` step 4

## Decisions Made

- **Why `min-h-11 sm:min-h-{n}` not `h-11`?** The plan / RESEARCH Open Question #4 resolved that the legacy `h-{n}` value MUST stay (some tooling and visual contexts read it directly). Adding `min-h-11` as a separate utility lets Tailwind merge cleanly without dropping the explicit height; the `sm:min-h-{n}` re-asserts desktop preserve so dense Phase 14 SubjectPreferencesTab and audit-log filter-bar layouts remain at `h-9` / `h-10`.
- **Why ship Test 5 (caller-override survival)?** Multiple call-sites in apps/web pass `className="h-12"` (or similar) to the Button, e.g. wide CTAs in Phase 13/14 admin panels. Without this regression test, a future tailwind-merge upgrade or `cn()` rewrite could silently drop the floor. The test asserts the invariant: caller `h-{n}` wins on its axis, but `min-h-11` floor survives.
- **Why no REFACTOR commit?** No structural cleanup to extract. The lift IS the entire change.

## Deviations from Plan

None — plan executed exactly as written. RED → GREEN gate sequence as specified. All 7 acceptance criteria satisfied.

## Pitfall #4 Sweep Output (other primitives still sub-44px — Plan 05/07 follow-ups)

Per the plan's `<output>` spec, this sweep documents OTHER UI primitive files that still carry sub-44px heights so Plans 05/07 can address them. Sweep command: `grep -rnE "h-(9|10)\b" apps/web/src/components/ui/*.tsx | grep -v ".test.tsx"`.

| File                                          | Line | Pattern observed                            | Disposition |
| --------------------------------------------- | ---- | ------------------------------------------- | ----------- |
| `apps/web/src/components/ui/command.tsx`      | 42   | `flex h-10 w-full ...` (CommandInput)       | **Plan 05/07 follow-up** — CommandInput is interactive (cmdk popover); same surface as Input → same lift pattern applies (`min-h-11 sm:min-h-10` after `h-10`). Out of Plan 04 scope per `<files_modified>` allowlist. |
| `apps/web/src/components/ui/toggle.tsx`       | 17   | `default: "h-10 px-3 min-w-10"` (cva)       | **Plan 05/07 follow-up** — Toggle is interactive (button-like). Apply the same `cva` size lift as Button: `default: "h-10 px-3 min-w-10 min-h-11 sm:min-h-10"`. |
| `apps/web/src/components/ui/toggle.tsx`       | 18   | `sm: "h-9 px-2.5 min-w-9"` (cva)            | **Plan 05/07 follow-up** — same fix as Button.sm: append `min-h-11 sm:min-h-9`. |
| `apps/web/src/components/ui/tabs.tsx`         | 15   | `inline-flex h-10 ...` (TabsList container) | **Different concern** — TabsList is a CONTAINER, not an interactive trigger. Individual TabsTrigger heights are what matter for touch targets; need a follow-up audit of the Trigger className specifically. Flagged for Plan 05 to inspect. |

These are NOT bugs in Plan 04 — they are out-of-scope per the plan's explicit `files_modified` allowlist (button/input/select/textarea only). Per the deviation rules SCOPE BOUNDARY, they are documented here for the Plan 05/07 author rather than auto-fixed.

## Pitfall #7 (Desktop Regression) Verification Approach

Plan 04 verifies Pitfall #7 at TWO layers:

1. **Class-output layer (this plan):** Every changed variant retains its `sm:min-h-{original}` rule, asserted by 4 of 5 button.test.tsx tests + 1 of 2 input.test.tsx tests + the 1 select.test.tsx test. If any variant ever loses its desktop preserve, the unit tests fail at next CI run.
2. **Pixel-rendering layer (deferred to Plan 07):** Per UI-SPEC § Spacing § Touch-target floors and the plan `<verification>` block, Playwright desktop project sweeps in Plan 07 will visually verify dense Phase 14 SubjectPreferencesTab and audit-log filter-bar tables render unchanged at sm+. This split is appropriate — pixel verification needs a real browser; class verification doesn't, and is faster.

## Issues Encountered

- **Sibling-worktree files in working tree.** During GREEN-stage `git status`, three files from a parallel-wave sibling worktree (Plan 16-02) appeared in the index: `apps/web/src/hooks/useDashboardStatus.test.ts`, `apps/web/src/hooks/useIsMobile.test.ts`, `apps/web/src/types/dashboard.ts`. These were unstaged via `git restore --staged ...` (NOT `git clean` per the `destructive_git_prohibition` rule) so they remain on disk for the orchestrator to merge from the sibling worktree. No data loss.
- **STATE.md auto-modified by orchestrator.** STATE.md showed pending changes from before agent start; left untouched per `<parallel_execution>` instructions. Orchestrator owns those writes.

## Threat Flags

None — Plan 04 is a pure CSS-class lift on existing primitives. T-16-11 (accessibility / non-STRIDE WCAG 2.1 AAA touch-target) was the only entry in the threat register and is mitigated by the lift itself; pixel verification deferred to Plan 05/07.

## TDD Gate Compliance

- RED gate: `8fffd68` — `test(16-04): add failing touch-target floor tests for Button/Input/Select primitives` (7 of 8 fail as expected; lg=already-h-11 passes pre-impl, acceptable per plan)
- GREEN gate: `9b101fb` — `feat(16-04): lift touch-target floor on Button/Input/Select primitives to 44px on <sm` (8 of 8 pass)
- REFACTOR gate: skipped (implementation already minimal — no cleanup possible without regression)

Gate sequence verified in `git log --oneline HEAD~2..HEAD`.

## Next Phase Readiness

- **Plan 05 (mobile-form-overflow-sweep)** can rely on the lifted primitives — every form input/button it touches now satisfies the 44px floor on `<sm` automatically; Plan 05's job becomes overflow + label-stacking, not target-size patching.
- **Plan 07 (e2e-mobile-touch-target-sweep)** has the unit-test contract as the floor; its Playwright assertions can target specific call-sites with confidence that the primitive layer is correct.
- **Plan 16-06 (admin-dashboard-mobile-shell)** can ship every Button/Input/Select without per-component touch-target work.
- **Open follow-ups for Plan 05/07:** CommandInput (`command.tsx:42`), Toggle (`toggle.tsx:17,18`), TabsTrigger (audit needed inside `tabs.tsx`).

## Self-Check

Verifying claimed artifacts and commits exist on disk and in git history.

```
[ -f apps/web/src/components/ui/button.tsx     ] FOUND
[ -f apps/web/src/components/ui/input.tsx      ] FOUND
[ -f apps/web/src/components/ui/select.tsx     ] FOUND
[ -f apps/web/src/components/ui/textarea.tsx   ] FOUND (unchanged — audit only)
[ -f apps/web/src/components/ui/button.test.tsx] FOUND
[ -f apps/web/src/components/ui/input.test.tsx ] FOUND
[ -f apps/web/src/components/ui/select.test.tsx] FOUND

git log: 8fffd68 RED test commit FOUND
git log: 9b101fb GREEN feat commit FOUND
```

Tests final state: `pnpm --filter @schoolflow/web test --run src/components/ui/button.test.tsx src/components/ui/input.test.tsx src/components/ui/select.test.tsx` → 8 passed (3 files); `tsc --noEmit` → exit 0.

## Self-Check: PASSED

---
*Phase: 16-admin-dashboard-mobile-h-rtung*
*Plan: 04*
*Completed: 2026-04-28*
