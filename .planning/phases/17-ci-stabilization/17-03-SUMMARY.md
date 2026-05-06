---
phase: 17-ci-stabilization
plan: 03
subsystem: ui
tags: [ui, accessibility, touch-target, primitive-lift, shadcn, tailwind, mobile-first, breadcrumb, tabs, radio-group]

triage_ref: .planning/phases/17-ci-stabilization/17-TRIAGE.md
decisions_addressed: [D-01, D-03, D-06, D-07]

# Dependency graph
requires:
  - phase: 16-admin-dashboard-mobile-h-rtung
    provides: "ClassRestrictionsTable.tsx (Pattern S1 — `min-h-11` analog) + sm:-breakpoint convention establishing the 44px Phase-16 floor"
  - phase: 17-ci-stabilization
    provides: "17-01 (sm: breakpoint propagation in source + spec files), 17-02 (WebKit-darwin env-classification narrative)"
provides:
  - "Three shadcn / shared UI primitives lifted to the 44px iOS HIG / Material 3 touch-target floor: PageShell breadcrumb anchor (10 admin routes), TabsList (subjects + timetable-edit), RadioGroupItem (LinkPersonDialog)"
  - "Three new accessibility-lift rows in 17-TRIAGE.md + a new `accessibility-lift` classification entry in the legend"
  - "deferred-items.md tracking pre-existing TS errors in DashboardChecklist.test.tsx (out-of-scope for 17-03)"
affects:
  - "17-04 (Plan D — DataList migration of 5 ListTable+MobileCards pairs) — primitives are already 44px-compliant; DataList's own mobile-card buttons stay at min-h-11"
  - "17-05 (Plan E — pre-existing regressions) — may pick up the deferred DashboardChecklist.test.tsx fixes"
  - "Phase 18+ — every breadcrumb-using admin route now ships with 44px-compliant breadcrumb anchors out-of-the-box"

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pattern S1 (44px tap-target floor via `min-h-11`) extended to: PageShell breadcrumb Link, shadcn Tabs primitive (TabsList)"
    - "Pattern S2 (mobile-first responsive lift via `h-11 w-11 sm:h-4 sm:w-4`) applied inline to RadioGroupItem (Path A — primitive-wide responsive lift, single-consumer scoped)"

key-files:
  created:
    - .planning/phases/17-ci-stabilization/17-03-SUMMARY.md
    - .planning/phases/17-ci-stabilization/deferred-items.md
  modified:
    - apps/web/src/components/admin/shared/PageShell.tsx
    - apps/web/src/components/ui/tabs.tsx
    - apps/web/src/components/ui/radio-group.tsx
    - .planning/phases/17-ci-stabilization/17-TRIAGE.md

key-decisions:
  - "Path A chosen for Plan C (RadioGroupItem primitive-wide responsive lift `h-11 w-11 sm:h-4 sm:w-4`) over Path B (descendant-selector on consumer LinkPersonDialog) — single consumer means identical blast radius and Path A is simpler / matches Plans A+B convention"
  - "PageShell breadcrumb lift uses `min-h-11 inline-flex items-center px-1` (not just `min-h-11`) — `inline-flex items-center` is required because the chevron icon sibling makes the default block layout collapse to text-line height; `px-1` keeps the breadcrumb compact while widening the tap-zone"
  - "TabsList uses `min-h-11` (not `h-11`) per 17-PATTERNS.md Plan B note — wider TabsList content (e.g. /admin/timetable-edit's multi-tab strip) could push beyond a fixed 44px and clip"
  - "Pre-existing TS errors in DashboardChecklist.test.tsx are out-of-scope per executor SCOPE BOUNDARY rule and logged to deferred-items.md (not fixed)"

patterns-established:
  - "Primitive-lift commit-stream: 3 primitives, 3 atomic commits, single docs commit appending TRIAGE rows. 17-04 should follow the same shape per CONTEXT D-03."
  - "Single-consumer primitive lift: prefer Path A (inline lift on the primitive) when grep proves only one consumer exists; reserve Path B (descendant-selector on consumer) for primitives with broad consumer surface where desktop visual regression is a real risk."

requirements-completed: []

# Metrics
duration: 13min
completed: 2026-05-02
---

# Phase 17 Plan 03: Primitive Touch-Target Lift Tranche (Plans A+B+C bundled) Summary

**Three shadcn/shared UI primitives (PageShell breadcrumb, Tabs, RadioGroup) lifted to the 44px Phase-16 touch-target floor in a bundled commit stream — closes ~3 surfaces of accessibility-related E2E failures from PR #1.**

## Performance

- **Duration:** ~13 min
- **Started:** 2026-05-02T10:43:14Z
- **Completed:** 2026-05-02T10:56:02Z
- **Tasks:** 3
- **Files modified:** 4 (3 source + 1 triage doc)

## Accomplishments

- **Plan A (PageShell breadcrumb):** Linked breadcrumb crumbs across all 10 admin routes now render at `min-h-11` (44px) on mobile via `inline-flex items-center min-h-11 px-1`. The non-clickable current-page span stays as-is (no tap-target needed).
- **Plan B (TabsList):** shadcn `<TabsList>` className `h-10` -> `min-h-11`. Affects `/admin/subjects` + `/admin/timetable-edit`; `min-h-` form chosen so wider tab strips do not clip.
- **Plan C (RadioGroupItem):** shadcn `<RadioGroupItem>` className `h-4 w-4` -> `h-11 w-11 sm:h-4 sm:w-4`. Mobile gets the 44px tap-target; desktop reverts to the 16px circle. Sole consumer (`LinkPersonDialog` at `/admin/users`) confirmed via grep.
- **17-TRIAGE.md extended:** 3 new accessibility-lift rows (one per A/B/C) + a new `accessibility-lift` classification entry in the legend (4 occurrences total: 3 rows + 1 legend).

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-worktree mode):

1. **Task 1: Lift breadcrumb anchors (Plan A) + TabsList (Plan B)** — `4723310` (feat)
2. **Task 2: Lift RadioGroupItem (Plan C, Path A primitive-wide responsive)** — `fc3376e` (feat)
3. **Task 3: Append Plan-A/B/C rows + accessibility-lift legend to 17-TRIAGE.md** — `a43e764` (docs)

_Note: Plans A+B were bundled into Task 1's single commit per CONTEXT D-03 (same touch-point — `apps/web/src/components/{admin/shared, ui}` — same test surface). Plan C shipped in its own commit because it carries an additional Path-A-vs-Path-B decision._

## Files Created/Modified

### Source files (lifted to 44px floor)
- `apps/web/src/components/admin/shared/PageShell.tsx` — Breadcrumb `<Link>` className extended with `inline-flex items-center min-h-11 px-1` (Plan A).
- `apps/web/src/components/ui/tabs.tsx` — TabsList className `h-10` -> `min-h-11` (Plan B).
- `apps/web/src/components/ui/radio-group.tsx` — RadioGroupItem className `h-4 w-4` -> `h-11 w-11 sm:h-4 sm:w-4` (Plan C, Path A).

### Documentation
- `.planning/phases/17-ci-stabilization/17-TRIAGE.md` — 3 accessibility-lift rows + 1 legend entry appended.
- `.planning/phases/17-ci-stabilization/deferred-items.md` — created; tracks out-of-scope DashboardChecklist.test.tsx pre-existing TS errors.
- `.planning/phases/17-ci-stabilization/17-03-SUMMARY.md` — this file.

## Decisions Made

### D-1: Plan C Path-A primitive-wide vs Path-B descendant-selector

**Chosen:** Path A — primitive-wide responsive lift `h-11 w-11 sm:h-4 sm:w-4` directly on `RadioGroupItem`'s className.

**Rationale:**
- `grep -RIn "from '@/components/ui/radio-group'" apps/web/src` returned exactly ONE consumer: `LinkPersonDialog.tsx`. Single-consumer means Path A and Path B have identical blast radius — Path A is simpler and matches the convention Plans A and B established (lift the primitive directly).
- The existing `RadioGroupPrimitive.Indicator` wrapper already carries `flex items-center justify-center` (line 37). The inner Circle indicator (`h-3 w-3`) therefore stays visually centered inside the new 44px outer container on mobile without needing any further changes.
- Recorded verbatim in the 17-TRIAGE.md Plan C row for future reference.

### D-2: TabsList `min-h-11` (not `h-11`)

**Chosen:** `min-h-11` (allows the element to grow taller).

**Rationale:** PATTERNS.md Plan B note explicitly warns that some TabsList consumers (notably `/admin/timetable-edit` with multiple tab strips) ship wider content that could push beyond a fixed 44px; `min-h-11` prevents clipping while still meeting the floor.

### D-3: PageShell breadcrumb `inline-flex items-center` requirement

**Chosen:** Full className `text-muted-foreground hover:text-foreground inline-flex items-center min-h-11 px-1`.

**Rationale:** A bare `min-h-11` on a default-block `<a>` collapses to text-line height when sitting next to an SVG icon (the ChevronRight). `inline-flex items-center` is mandatory to actually honour the 44px height. `px-1` keeps the visual width compact while widening the tap-zone slightly beyond the text bounding box.

### D-4: Out-of-scope TS errors deferred (not fixed)

**Chosen:** Log `DashboardChecklist.test.tsx` pre-existing TS2345 errors to `deferred-items.md` and continue execution.

**Rationale:** SCOPE BOUNDARY rule — the errors are pre-existing (verified via `git stash` + re-run, both passes show identical errors) and not caused by Plan 17-03's three-file touch. Fixing them would expand the diff outside the plan's declared `files_modified` field. They are appropriately owned by Plan 17-05 (Plan E — pre-existing regressions) or a follow-up types harmonization task.

## Deviations from Plan

None - plan executed exactly as written. The only "deviation-shaped" event was the discovery of pre-existing TS errors in `DashboardChecklist.test.tsx` during TypeScript verification. Per the executor SCOPE BOUNDARY rule, those are NOT deviations of this plan — they are pre-existing failures owned by a different plan and were correctly logged to `deferred-items.md` instead of being auto-fixed (Rule 1/2/3 do not apply because the issues are NOT directly caused by this task's changes).

## Issues Encountered

- **Pre-existing TS errors in `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx`** (lines 175, 192, 209, 224) surfaced during the Task 1 TypeScript verification step. Confirmed pre-existing via `git stash` + re-run — the errors are present before any 17-03 change. Logged to `.planning/phases/17-ci-stabilization/deferred-items.md` for ownership by Plan 17-05.
- **Worktree-base reset:** The agent's worktree HEAD was at `7249ebc` (the post-PR-merge main commit) instead of the expected base `d081047`. The `<worktree_branch_check>` step caught this and `git reset --hard d081047` brought the worktree to the expected base before any task work began. No commits were lost — the original branch's full chain (4723310 -> fc3376e -> a43e764) starts cleanly from `d081047`.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- **17-04 (Wave 3, Plan D — DataList migration of 5 ListTable+MobileCards pairs):** All three primitives consumed by Plan D are now 44px-compliant. DataList's own mobile-card buttons already use `min-h-11` (per `ClassRestrictionsTable.tsx:131-148`), so no follow-up touch-target work is needed in 17-04.
- **17-05 (Wave 4, Plan E — pre-existing regressions):** May pick up the deferred `DashboardChecklist.test.tsx` TS errors logged to `deferred-items.md`.
- **Phase 18+:** Every breadcrumb-using admin route, every Tabs consumer, and every RadioGroup consumer now ships with the 44px tap-target floor by default — no per-consumer override needed.

## Self-Check: PASSED

Verified before returning:

- File `apps/web/src/components/admin/shared/PageShell.tsx`: FOUND, contains `min-h-11` on the breadcrumb Link (1 occurrence).
- File `apps/web/src/components/ui/tabs.tsx`: FOUND, contains `min-h-11` on TabsList (1 occurrence); `inline-flex h-10 items-center` removed (zero matches).
- File `apps/web/src/components/ui/radio-group.tsx`: FOUND, contains `h-11 w-11 sm:h-4 sm:w-4` on RadioGroupItem.
- File `.planning/phases/17-ci-stabilization/17-TRIAGE.md`: contains Plan A row (1), Plan B row (1), Plan C row (1), accessibility-lift legend + row mentions (4 total).
- File `.planning/phases/17-ci-stabilization/deferred-items.md`: FOUND, documents out-of-scope DashboardChecklist.test.tsx errors.
- Commit `4723310` (Task 1, Plans A+B): FOUND in `git log --oneline d081047..HEAD`.
- Commit `fc3376e` (Task 2, Plan C): FOUND.
- Commit `a43e764` (Task 3, TRIAGE): FOUND.
- TypeScript build for the web app: no new errors in any of the 3 touched files (verified via grep on tsc output).
- `git diff d081047..HEAD --stat` confirms changes are exactly: 3 source files + 17-TRIAGE.md (+ deferred-items.md, + this SUMMARY committed in the next step).

---
*Phase: 17-ci-stabilization*
*Completed: 2026-05-02*
