---
phase: 16-admin-dashboard-mobile-h-rtung
plan: 05
subsystem: ui
tags: [react, playwright, tailwind, datalist, mobile, dsgvo, audit-log, solver-tuning, e2e]

# Dependency graph
requires:
  - phase: 16-admin-dashboard-mobile-h-rtung
    provides: "Plan 02 — DataList<T> shared dual-mode component (apps/web/src/components/shared/DataList.tsx) with desktop <table> + mobile-card stack via Tailwind hidden sm:block / sm:hidden + getRowAttrs (extended in this plan)"
  - phase: 16-admin-dashboard-mobile-h-rtung
    provides: "Plan 04 — Button/Input/Select primitives at min-h-11 floor on <sm (touch-target lift). Three follow-up sweep targets (command/toggle/tabs) flagged for Plan 05/07 — none appeared in migrated tables, deferred to Plan 07."
provides:
  - "DataList getRowAttrs extension — spreads arbitrary HTML attrs (data-*, aria-*) onto BOTH desktop <tr> and mobile-card wrapper. Required for E2E selector preservation when migrating tables that use custom data-* (data-audit-id, data-template-type, etc.) instead of data-testid."
  - "9 of 11 zero-mode admin tables migrated to DataList with mobile-card alternatives (6 Phase 15 + 3 Phase 14 dedicated solver-tuning Tables)"
  - "admin-mobile-sweep.mobile.spec.ts — 16-route audit + regression guard at 375px asserting no horizontal overflow + 44px touch-target floor (per CONTEXT D-16 audit-first ansatz)"
  - "Documented deviation: ConstraintCatalogTab + ConstraintWeightsTab don't have <table> elements (use grid-based row components) so DataList migration was skipped — they already satisfy MOBILE-ADM-01 via Tailwind responsive grid classes"
affects: [16-06 dashboard polling integration, 16-07 final mobile sweep + plan 07 closure of deferred touch-target floor sweeps]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DataList getRowAttrs render-prop: arbitrary HTML attribute factory spread onto both desktop <tr> AND mobile-card wrapper — extends Plan 02's data-testid mirroring pattern (D-14) to support legacy custom data-* selectors used by Phase 14/15 E2E specs"
    - "Migration discipline: replace inline <table> with DataList in-place; preserve toolbar (filter / heading / Aktualisieren / pagination) above and below; keep dialogs (Edit/Delete confirm) untouched"
    - "Audit-first mobile spec: ADMIN_ROUTES array iterates 16 routes serially, asserts both horizontal overflow AND 44px floor per route — failures become fix items for Plan 07"

key-files:
  created:
    - "apps/web/e2e/admin-mobile-sweep.mobile.spec.ts"
  modified:
    - "apps/web/src/components/shared/DataList.tsx"
    - "apps/web/src/components/shared/DataList.test.tsx"
    - "apps/web/src/components/admin/audit-log/AuditTable.tsx"
    - "apps/web/src/components/admin/dsgvo/ConsentsTab.tsx"
    - "apps/web/src/components/admin/dsgvo/DsfaTable.tsx"
    - "apps/web/src/components/admin/dsgvo/JobsTab.tsx"
    - "apps/web/src/components/admin/dsgvo/RetentionTab.tsx"
    - "apps/web/src/components/admin/dsgvo/VvzTable.tsx"
    - "apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx"
    - "apps/web/src/components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx"
    - "apps/web/src/components/admin/solver-tuning/SubjectPreferredSlotTable.tsx"

key-decisions:
  - "Extend DataList with getRowAttrs() instead of forcing every existing E2E selector to migrate to data-testid: Phase 14/15 E2E specs already use semantic data-* attrs (data-audit-id, data-template-type, data-dsgvo-job-id, …) and the spec selectors `tr[data-template-type=...]:visible` would have broken if migration switched to data-testid. The render-prop spreads onto both desktop <tr> AND the mobile-card wrapper so layout-agnostic selectors still work."
  - "Skip ConstraintCatalogTab + ConstraintWeightsTab DataList migration: both surfaces use grid-based row components (ConstraintCatalogRow + ConstraintWeightSliderRow) with explicit responsive Tailwind classes (`grid sm:grid-cols-...`). They contain ZERO <table> elements (verified). Forcing them into a tabular DataList would break the slider density (Pitfall #7) and the catalog row's tooltip+ArrowRight layout. They already satisfy MOBILE-ADM-01 via grid responsiveness — no migration needed."
  - "Migrate the 3 dedicated solver-tuning Tables (ClassRestrictionsTable, SubjectMorningPreferenceTable, SubjectPreferredSlotTable) to DataList even though they ALREADY shipped a `hidden sm:block` desktop-table + `sm:hidden` mobile-card pair. Rationale: consolidate to a single primitive across the admin surface area (RESEARCH § Pattern 4 / D-15). The dual-mode pair is now redundant once DataList exists — moving them ahead now keeps Phase 16 within scope and avoids a follow-up plan."
  - "Phase 11/12/13 dual-component surfaces (Teacher/Student/Class/Subject/User ListTable + MobileCards) explicitly NOT migrated per scope budget; documented in plan."

patterns-established:
  - "getRowAttrs render-prop on shared list primitives — required pattern for any future migration of tables whose existing E2E specs use semantic data-* attrs (vs the cleaner data-testid we'd choose for new code)"

requirements-completed: [MOBILE-ADM-01, MOBILE-ADM-02]

# Metrics
duration: 32min
completed: 2026-04-29
---

# Phase 16 Plan 05: Mobile-sweep + DataList migrations Summary

**16-route Playwright mobile-sweep audit guard at 375px + 9 of 11 zero-mode admin tables migrated to <DataList> with `getRowAttrs` extension preserving Phase 14/15 E2E selectors on both desktop and mobile render paths.**

## Performance

- **Duration:** ~32 min
- **Started:** 2026-04-29T08:48:05Z
- **Completed:** 2026-04-29T09:19:58Z
- **Tasks:** 3 (all completed)
- **Files modified:** 11 (1 new, 10 edited)

## Accomplishments

- Created `apps/web/e2e/admin-mobile-sweep.mobile.spec.ts` covering 16 admin routes, asserting `document.body.scrollWidth - window.innerWidth ≤ 0` (no horizontal overflow) and a 44px floor on every visible interactive — implements MOBILE-ADM-01 + MOBILE-ADM-02 audit-first guard per CONTEXT D-16. Spec is syntactically valid; Playwright lists all 16 tests on `mobile-375` (32 across mobile-375 + mobile-chrome). Initial run was NOT executed against a live stack (gated on Plan 07).
- Extended `DataList<T>` with the `getRowAttrs` render-prop (10 unit tests pass — added 2 new ones: desktop `<tr>` data-* + mobile-card wrapper data-*).
- Migrated 6 Phase 15 zero-mode tables (3 dedicated `*Table.tsx` + 3 inline `*Tab.tsx`) to DataList with mobile-card slots. All existing semantic E2E selectors preserved via `getRowAttrs`.
- Migrated 3 of 5 Phase 14 zero-mode solver-tuning Tables to DataList. The other 2 (ConstraintCatalogTab, ConstraintWeightsTab) intentionally skipped — they don't have `<table>` elements (deviation #1).
- TypeScript clean (`tsc --noEmit` exits 0). Full web vitest suite green (151 passed, 66 todo, 14 skipped).

## Task Commits

1. **Task 1: admin-mobile-sweep spec** — `426601d` (test) — new `apps/web/e2e/admin-mobile-sweep.mobile.spec.ts` covering 16 ADMIN_ROUTES.
2. **Task 2: Phase 15 migrations** — `eedcfb5` (feat) — DataList getRowAttrs extension + 2 new unit tests + AuditTable + ConsentsTab + DsfaTable + JobsTab + RetentionTab + VvzTable migrations.
3. **Task 3: Phase 14 migrations** — `dfa3f1d` (feat) — ClassRestrictionsTable + SubjectMorningPreferenceTable + SubjectPreferredSlotTable migrations.

## Files Created/Modified

### Created

- `apps/web/e2e/admin-mobile-sweep.mobile.spec.ts` — 16-route serial sweep at 375px asserting no overflow + 44px touch-target floor. Routes both `mobile-375` (iPhone 13) and `mobile-chrome` (Pixel 5) projects via `*.mobile.spec.ts` glob.

### Modified

- `apps/web/src/components/shared/DataList.tsx` — added `getRowAttrs?: (row: T) => Record<string, string | number | boolean | undefined>` prop spread onto BOTH desktop `<tr>` and mobile-card wrapper.
- `apps/web/src/components/shared/DataList.test.tsx` — added Test 9 (desktop `<tr>` data-*) + Test 10 (mobile card wrapper data-*); 10/10 pass.

### Phase 15 surfaces migrated

| Surface                 | Type      | Columns mapped                                             | Preserved attrs                               |
|-------------------------|-----------|------------------------------------------------------------|-----------------------------------------------|
| AuditTable.tsx          | dedicated | Aktion / Ressource / Resource-ID / Akteur / Zeitstempel / Aktionen | data-audit-id, data-audit-action              |
| DsfaTable.tsx           | dedicated | Titel / Datenkategorien / Zuletzt aktualisiert / Aktionen  | data-dsfa-id                                  |
| VvzTable.tsx            | dedicated | Verarbeitungstätigkeit / Zweck / Rechtsgrundlage / Aktionen | data-vvz-id                                   |
| RetentionTab.tsx        | inline    | Kategorie / Aufbewahrung (Tage) / Aktionen                 | data-retention-category                       |
| JobsTab.tsx             | inline    | Typ / Status / Person / Erstellt am / Zuletzt aktualisiert | data-dsgvo-job-id, data-dsgvo-job-status      |
| ConsentsTab.tsx         | inline    | Person / Email / Zweck / Status / Erteilt / Widerrufen / Aktionen | data-consent-id, data-consent-status          |

### Phase 14 surfaces migrated

| Surface                              | Type      | Columns mapped                            | Preserved attrs                             |
|--------------------------------------|-----------|-------------------------------------------|---------------------------------------------|
| ClassRestrictionsTable.tsx           | dedicated | Klasse / Sperrt ab Periode / Aktiv / Aktionen | data-template-type=NO_LESSONS_AFTER, data-row-id |
| SubjectMorningPreferenceTable.tsx    | dedicated | Fach / Spätestens bis Periode / Aktiv / Aktionen | data-template-type=SUBJECT_MORNING, data-row-id |
| SubjectPreferredSlotTable.tsx        | dedicated | Fach / Wochentag / Periode / Aktiv / Aktionen | data-template-type=SUBJECT_PREFERRED_SLOT, data-row-id |

### Phase 14 surfaces NOT migrated (deviation — see below)

| Surface                              | Why skipped                                                                                    |
|--------------------------------------|------------------------------------------------------------------------------------------------|
| ConstraintCatalogTab.tsx             | Uses `<ConstraintCatalogRow>` div-grid components — zero `<table>` JSX                          |
| ConstraintWeightsTab.tsx             | Uses `<ConstraintWeightSliderRow>` div-grid components with sliders — zero `<table>` JSX        |

## Decisions Made

See key-decisions in frontmatter. Headlines:

1. Extend DataList with `getRowAttrs` (instead of forcing E2E selector migration to `data-testid`) — preserves Phase 14/15 E2E selectors verbatim on both render paths.
2. Skip ConstraintCatalogTab + ConstraintWeightsTab — they don't have `<table>` elements; the plan claim was based on incorrect codebase analysis.
3. Migrate the 3 already-dual-mode solver-tuning Tables anyway — consolidates to a single primitive (DataList) across admin surface area, avoids a follow-up plan.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 / Rule 2 hybrid] DataList lacked `getRowAttrs` — required for E2E selector preservation**

- **Found during:** Task 2 (Phase 15 migration setup)
- **Issue:** Phase 14/15 E2E specs use semantic data-* attrs (`data-audit-id`, `data-vvz-id`, `data-template-type`, `data-dsgvo-job-id`, …). DataList only supports `data-testid`. Migration without arbitrary attribute support would have broken every Phase 14/15 E2E spec touching the migrated tables.
- **Fix:** Added `getRowAttrs?: (row: T) => Record<string, string | number | boolean | undefined>` to `DataListProps<T>`. Spread onto BOTH desktop `<tr>` and mobile-card wrapper so layout-agnostic selectors keep matching at desktop AND mobile viewports. Added 2 new unit tests (Tests 9 + 10) locking the contract.
- **Files modified:** `apps/web/src/components/shared/DataList.tsx`, `apps/web/src/components/shared/DataList.test.tsx`
- **Verification:** 10/10 DataList tests pass. Spot-checked all 9 migrated surfaces — `getRowAttrs` returns the originally-used semantic attrs.
- **Committed in:** `eedcfb5` (Task 2 commit)

**2. [Rule 1 - Bug] Plan claim about `<table>` in ConstraintCatalogTab + ConstraintWeightsTab was incorrect**

- **Found during:** Task 3 setup (pre-migration audit)
- **Issue:** Plan frontmatter + interfaces block both stated "the `<table>` lives INLINE in this Tab file (no separate `*Table.tsx`)" for ConstraintCatalogTab and ConstraintWeightsTab. Verified via `grep -c "<table" apps/web/src/components/admin/solver-tuning/Constraint{Catalog,Weights}Tab.tsx` → returned 0/0. Both surfaces use div-grid row components (`ConstraintCatalogRow` + `ConstraintWeightSliderRow`) with explicit responsive Tailwind classes (`sm:grid-cols-[2fr_auto_3fr_auto]` / `sm:grid-cols-[2fr_3fr_auto_auto_auto]`).
- **Fix:** Skipped DataList migration for those 2 surfaces. Both already satisfy MOBILE-ADM-01 — `ConstraintCatalogRow` renders as a vertical stack at <sm and a 4-column grid at ≥sm; `ConstraintWeightSliderRow` adapts slider thumb sizes (`[&_[role=slider]]:h-11 [&_[role=slider]]:w-11 sm:[&_[role=slider]]:h-5`) and input widths via responsive utilities. Forcing into a DataList would break the per-row interactive layout (slider + reset icon + input) and regress Pitfall #7 (desktop dense slider rows).
- **Files modified:** None (intentional non-change). Documented in `dfa3f1d` commit message.
- **Verification:** `grep -c "<table" apps/web/src/components/admin/solver-tuning/Constraint{Catalog,Weights}Tab.tsx` returned `0` for both files. `grep -c "ConstraintWeightSliderRow" .../ConstraintWeightsTab.tsx` returned `2` (Pitfall #7 desktop slider density preserved).
- **Committed in:** `dfa3f1d` (Task 3 commit message documents the deviation explicitly)

---

**Total deviations:** 2 auto-fixed (1 missing critical primitive feature, 1 plan factual correction)
**Impact on plan:** Both deviations preserve plan intent (mobile-card alternatives where they were missing, E2E selector preservation, no Pitfall #7 regression) while correcting plan inaccuracies. No scope creep.

## Issues Encountered

- **Plan acceptance criteria grep gates assume single-line `//` comments**: The plan's "no raw `<table>` remains" check uses `grep -E "<table" ... | grep -v '^[^:]*:[[:space:]]*//' | wc -l`. JSDoc multi-line comments (`* ... <table> ...`) and inline backticks (`` `<table>` ``) match the initial grep but aren't filtered. Verified manually with `grep -v "\`<table"` — all remaining matches are documentation prose in JSDoc blocks (e.g., `* Phase 16 Plan 05 (D-15) — migrated to <DataList>`). No raw `<table>` JSX elements remain in any of the 9 migrated files.

## Mobile-sweep spec initial-run output

The spec was NOT executed against a live stack as part of this plan (Plan 07 will close the audit). Per Plan 16-05 instructions: "fail acceptable if Plan 16-07 hasn't landed yet, but spec must be syntactically valid + parseable by Playwright" — verified via `pnpm exec playwright test admin-mobile-sweep.mobile.spec.ts --list` listing 16 tests on `mobile-375` (32 across mobile-375 + mobile-chrome).

Anticipated failure classes (for Plan 07 triage):

- **(a) Primitive lift not yet effective:** Three Plan 16-04 follow-up sweep targets remain at h-9/h-10 — `command.tsx` (CommandInput), `toggle.tsx` (h-10/h-9 cva sizes), `tabs.tsx` (TabsList h-10). None appear in the 9 migrated tables, so they're deferred to Plan 07. Routes that mount autocomplete/toggle/tabs primitives may report sub-44px elements.
- **(b) Phase 11/12/13 dual-component surfaces using legacy `md:` breakpoint:** Teacher/Student/Class/Subject/User ListTable + MobileCards switch at `md:` (768px) instead of `sm:` (640px) per the convention used by DataList. At 375px the mobile-card branch DOES render (md is a max-width threshold here so `md:hidden` matches at 375px) but the desktop `<table>` may still leak interactives below the floor before being hidden.
- **(c) Phase 16 deferred surfaces (out of scope):** `/admin/import`, `/admin/resources`, `/admin/substitutions`, `/admin/timetable-edit`, `/admin/timetable-history` — none migrated this phase; Plan 07 sweep + fix.

## Pitfall #7 verification

ConstraintWeightsTab desktop slider density preserved:

```
$ grep -c "ConstraintWeightSliderRow" apps/web/src/components/admin/solver-tuning/ConstraintWeightsTab.tsx
2
```

`ConstraintWeightSliderRow` is still imported and rendered as the per-row component inside the unchanged `ConstraintWeightsTab.tsx` (no DataList migration applied — see deviation #2).

SubjectPreferencesTab dense layouts preserved:

- `SubjectMorningPreferenceTable.tsx` — desktop columns Fach / Spätestens bis Periode / Aktiv / Actions; tabular-nums on the period column; Switch in the Aktiv column.
- `SubjectPreferredSlotTable.tsx` — desktop columns Fach / Wochentag / Periode / Aktiv / Actions; WochentagBadge in the Wochentag column; tabular-nums on the period column.

Both preserve the pre-existing column structure verbatim — column count + content + Switch placement match the pre-migration `<table>` rendered at `hidden sm:block`.

## Phase 11/12/13 surfaces explicitly deferred

Per plan scope budget, the following dual-component pairs remain untouched (already mobile-functional via `md:` breakpoint pair, not aligned with the new `sm:` convention):

- `teacher/TeacherListTable.tsx` + `TeacherMobileCards.tsx`
- `student/StudentListTable.tsx` + `StudentMobileCards.tsx`
- `class/ClassListTable.tsx` + `ClassMobileCards.tsx`
- `subject/SubjectListTable.tsx` + `SubjectMobileCards.tsx`
- `users/UserListTable.tsx` + `UserMobileCards.tsx`

A future plan can collapse these to DataList for breakpoint consistency.

## Wave 2 follow-up touch-target floor sweeps — status

Plan 16-04 SUMMARY flagged 3 follow-up touch-target lift targets:

- `apps/web/src/components/ui/command.tsx:42` — CommandInput h-10
- `apps/web/src/components/ui/toggle.tsx:17,18` — h-10 / h-9 cva sizes
- `apps/web/src/components/ui/tabs.tsx:15` — TabsList h-10

None of these primitives are used in the 9 migrated table surfaces — verified via `grep -rn "from '@/components/ui/(command|toggle)'" apps/web/src/components/admin/{dsgvo,audit-log,solver-tuning}` (only `solver-tuning/SubjectAutocomplete.tsx` + `solver-tuning/ClassAutocomplete.tsx` use Command, both inside dialogs not tables). Per plan: "Touch the heights only if they appear in the migrated tables/specs" — deferring to Plan 07.

## MobileSidebar admin entries (from Plan 16-03 SUMMARY)

Plan 16-03 SUMMARY noted MobileSidebar still missed two admin entries (Vertretungsplanung, Meine Vertretungen). This plan focuses on table migrations, NOT navigation — deferred to a later plan or Plan 07 if scope permits.

## Threat Flags

None — no new network/auth/file/schema surface introduced. The migration changes UI layout only; Phase 14/15 backend filters by `schoolId` per existing hooks (T-16-2 mitigation unchanged).

## Self-Check: PASSED

- [x] `apps/web/e2e/admin-mobile-sweep.mobile.spec.ts` exists (verified `[ -f ... ]`).
- [x] All 9 migrated component files exist + import DataList (`grep -l "from '@/components/shared/DataList'" ...` returns 9).
- [x] Three commit hashes verified in `git log --oneline -5`: `426601d`, `eedcfb5`, `dfa3f1d`.

## Next Phase Readiness

- DataList primitive now battle-tested across 9 admin surfaces — pattern is mature for Plan 06+ consumers.
- Mobile-sweep spec is committed and parseable; Plan 07 can run it against a live stack and act on the failure list.
- Two solver-tuning surfaces (CatalogTab + WeightsTab) explicitly excluded from migration with documented rationale; no follow-up needed unless a future plan revisits the slider/grid pattern.

---
*Phase: 16-admin-dashboard-mobile-h-rtung*
*Completed: 2026-04-29*
