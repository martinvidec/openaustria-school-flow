---
phase: 14-solver-tuning
plan: 02-frontend
subsystem: web
tags: [react, tanstack-router, tanstack-query, shadcn, radix-slider, radix-toggle-group, rhf-zod, sonner]

# Dependency graph
requires:
  - phase: 14-solver-tuning
    plan: 01-backend
    provides: ConstraintWeightOverride table, 15-entry CONSTRAINT_CATALOG, GET/PUT /constraint-weights, PATCH /:id/active, cross-reference 422, Java SUBJECT_PREFERRED_SLOT scoring, 9 DEFAULT_CONSTRAINT_WEIGHTS
  - phase: 10-schulstammdaten-zeitraster
    provides: PageShell, UnsavedChangesDialog, StickyMobileSaveBar, InfoBanner, WarnDialog (admin/shared)
  - phase: 11-lehrer-und-f-cher-verwaltung
    provides: Subject Autocomplete pattern (Phase 11 D-08), useSubjects list endpoint
  - phase: 12-sch-ler-klassen-und-gruppenverwaltung
    provides: Class Autocomplete pattern (Phase 12 D-08), useClasses list endpoint
  - phase: 13-user-und-rechteverwaltung
    provides: silent-4xx invariant pattern (10.1-01 / 10.2-04 codified), strict admin-only role-gating (D-03 precedent)
provides:
  - /admin/solver-tuning route (4 tabs: Constraints, Gewichtungen, Klassen-Sperrzeiten, Fach-Präferenzen)
  - admin-only Sidebar entry (App + Mobile) with SlidersHorizontal icon
  - Reusable ClassAutocomplete + SubjectAutocomplete popovers (300ms debounce, ≥2 chars)
  - 9-slider weight editor with bidirectional Slider↔NumberInput sync, dirty-state tint, custom-state thumb halo, reset-to-default
  - Generator-Page deep-link card "Aktuelle Schul-Gewichtungen" (D-06)
  - DriftBanner consuming Plan 14-01 lastUpdatedAt directly
  - LastRunScoreBadge with date-fns formatDistanceToNow + de locale
  - 19 new components in apps/web/src/components/admin/solver-tuning/ + 1 GeneratorPageWeightsCard
  - 4 new TanStack Query hook modules (catalog, weights, templates, runs) + 1 API client wrapper
affects: [14-03-e2e]

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-slider"
    - "@radix-ui/react-toggle-group"
  patterns:
    - "shadcn-style ui primitives written manually (slider, toggle-group) when shadcn CLI rejected components.json schema — preserves Phase 14 zero-new-installs goal"
    - "Silent-4XX-Invariante locked in across 6 mutation hooks (Update/Reset weights + 5 template ops) via explicit onError → toast.error"
    - "Cache key strategy: ['constraint-weights', schoolId] shared by Tuning Tab 2 + Generator-Page card; templates keyed per templateType for narrow invalidation"
    - "Discriminated-union RHF zodResolver (Phase 11/12 form precedent) per templateType variant"
    - "Strictest-wins MultiRowConflictBanner derived from cached query data (no extra API call) — 3 variants per UI-SPEC §Multi-Row InfoBanner copy table"

key-files:
  created:
    - apps/web/src/routes/_authenticated/admin/solver-tuning.tsx
    - apps/web/src/lib/api/solver-tuning.ts
    - apps/web/src/lib/hooks/useConstraintCatalog.ts
    - apps/web/src/lib/hooks/useConstraintWeights.ts
    - apps/web/src/lib/hooks/useConstraintTemplates.ts
    - apps/web/src/lib/hooks/useLatestTimetableRun.ts
    - apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx
    - apps/web/src/components/admin/solver-tuning/LastRunScoreBadge.tsx
    - apps/web/src/components/admin/solver-tuning/DriftBanner.tsx
    - apps/web/src/components/admin/solver-tuning/SeverityBadge.tsx
    - apps/web/src/components/admin/solver-tuning/WochentagBadge.tsx
    - apps/web/src/components/admin/solver-tuning/MultiRowConflictBanner.tsx
    - apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx
    - apps/web/src/components/admin/solver-tuning/ConstraintCatalogRow.tsx
    - apps/web/src/components/admin/solver-tuning/ConstraintWeightsTab.tsx
    - apps/web/src/components/admin/solver-tuning/ConstraintWeightSliderRow.tsx
    - apps/web/src/components/admin/solver-tuning/ClassRestrictionsTab.tsx
    - apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx
    - apps/web/src/components/admin/solver-tuning/AddEditClassRestrictionDialog.tsx
    - apps/web/src/components/admin/solver-tuning/ClassAutocomplete.tsx
    - apps/web/src/components/admin/solver-tuning/SubjectAutocomplete.tsx
    - apps/web/src/components/admin/solver-tuning/SubjectPreferencesTab.tsx
    - apps/web/src/components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx
    - apps/web/src/components/admin/solver-tuning/AddEditSubjectMorningPreferenceDialog.tsx
    - apps/web/src/components/admin/solver-tuning/SubjectPreferredSlotTable.tsx
    - apps/web/src/components/admin/solver-tuning/AddEditSubjectPreferredSlotDialog.tsx
    - apps/web/src/components/admin/solver/GeneratorPageWeightsCard.tsx
    - apps/web/src/components/ui/slider.tsx
    - apps/web/src/components/ui/toggle-group.tsx
  modified:
    - apps/web/package.json
    - pnpm-lock.yaml
    - apps/web/src/components/layout/AppSidebar.tsx
    - apps/web/src/components/layout/MobileSidebar.tsx
    - apps/web/src/routeTree.gen.ts
    - apps/web/src/routes/_authenticated/admin/solver.tsx

key-decisions:
  - "Slider count locked at 9 (matches Plan 14-01 SOFT entries). Loop iterates CONSTRAINT_CATALOG.filter(severity==='SOFT'); count is data-driven so future additions are picked up automatically without code edits"
  - "Hard/Soft section headers use literal '(6)' / '(9)' counts per UI-SPEC §Inline micro-copy (locked at Plan 14-01 invariant). Code comment documents the linkage"
  - "shadcn CLI rejected components.json schema (newer shadcn version mismatch); slider.tsx + toggle-group.tsx written manually following standard shadcn output. Radix deps installed via pnpm. Components.json untouched to avoid scope creep"
  - "ClassAutocomplete + SubjectAutocomplete built inline (no Phase 11/12 components named 'ClassAutocomplete' / 'SubjectAutocomplete' actually exist — only TeacherSearchPopover/PersonAutocompletePopover patterns). Built locally following the same Command+Popover+debounce pattern, kept inside solver-tuning/ folder for now"
  - "Solver-Tuning route enforces admin-only at component level (useAuth → roles.includes('admin')) in addition to sidebar gating, mitigating T-14-08 (schulleitung direct URL access)"
  - "Tab 2 dirty-state interception uses UnsavedChangesDialog with 'Verwerfen und wechseln'; on confirm we increment a discardSignal that re-keys the ConstraintWeightsTab (forces local state reinit). Cleaner than threading a discard callback down"

patterns-established:
  - "TanStack Router Link with typed search params (`search={{ tab: 'weights' as const }}`) for inter-page deep-links — Generator-Page card → Tuning Tab 2"
  - "Tab 1 → Tab 2 deep-link uses local state (pendingFocusName) + scrollIntoView({block:'center', behavior:'smooth'}) + 1.2s ring-primary flash on the matching slider row"
  - "MultiRowConflictBanner copy strings interpolate display names via {classNames|subjectNames} maps populated from existing useClasses/useSubjects queries — no new endpoints"
  - "PATCH /constraint-templates/:id/active is fired in addition to POST/PUT when the dialog isActive switch differs from the persisted value (existing endpoints handle isActive only via PATCH /active)"

requirements-completed: [SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05]

# Metrics
duration: 30min
completed: 2026-04-25
---

# Phase 14 Plan 02: Frontend Solver-Tuning Page Summary

**4-tab `/admin/solver-tuning` page with 19 new components + sidebar entry + Generator-Page deep-link card — all 5 SOLVER-XX user-facing surfaces shipped end-to-end against the Plan 14-01 backend.**

## Performance

- **Duration:** ~30 min
- **Started:** 2026-04-25T17:58:49Z
- **Tasks:** 3 (Sidebar/Route/Hooks → Catalog+Weights+GeneratorCard → Restrictions+Preferences+Header)
- **Files created:** 30
- **Files modified:** 6

## Accomplishments

- **`/admin/solver-tuning` route** with 4 tabs (`Constraints`, `Gewichtungen`, `Klassen-Sperrzeiten`, `Fach-Präferenzen`), strict admin-only gate at both sidebar level (`roles: ['admin']`) and route-component level (defends against direct URL access — T-14-08 mitigation).
- **9-slider weight editor (Tab 2 — SOLVER-02 + SOLVER-03):** all 9 SOFT entries from `CONSTRAINT_CATALOG` (incl. the new `Subject preferred slot` shipped by Plan 14-01) rendered with bidirectional Slider↔NumberInput sync, custom-state thumb halo, dirty-state row tint, per-row Reset-to-default, global Save (replace-all-in-tx PUT), `Verwerfen` discard, sticky mobile save bar, Solver-Sync footer InfoBanner with deep-link to Run-History.
- **15-entry catalog (Tab 1 — SOLVER-01):** rendered from the static `CONSTRAINT_CATALOG` shared mirror (no network for first paint), Hard-section (6) + Soft-section (9) with `Separator`. Hard rows show `Lock` icon + tooltip; Soft rows have "Gewichtung bearbeiten" deep-link to Tab 2 with scroll-into-view + 1.2s `ring-primary` flash + NumberInput focus.
- **Klassen-Sperrzeiten (Tab 3 — SOLVER-04):** full CRUD on `NO_LESSONS_AFTER` ConstraintTemplates via reusable Add/Edit Dialog (ClassAutocomplete + maxPeriod NumberInput + isActive Switch), inline `PATCH /:id/active` toggles, destructive WarnDialog for delete, strictest-wins MultiRowConflictBanner per UI-SPEC §Multi-Row InfoBanner copy table.
- **Fach-Präferenzen (Tab 4 — SOLVER-05):** nested 2 sub-tabs (Vormittags-Präferenzen / Bevorzugte Slots) with full CRUD per templateType. Mobile (`<sm`) collapses sub-tabs to vertical `ToggleGroup`. Two distinct dialogs (SubjectAutocomplete + latestPeriod for SUBJECT_MORNING; SubjectAutocomplete + dayOfWeek Select + period for SUBJECT_PREFERRED_SLOT). Two distinct conflict banners (strictest-wins for morning; cumulative-evaluation for preferred-slot per UI-SPEC).
- **Header surfaces:** `LastRunScoreBadge` reads latest `TimetableRun` and renders muted "Noch kein Solve-Run" / `CircleCheck` Hard=0 / `TriangleAlert` Hard<0 plus `formatDistanceToNow` (de locale) + `→ History öffnen` link + separate `Generator starten` button. `DriftBanner` consumes Plan 14-01 GET `lastUpdatedAt` directly and renders amber when > `lastRun.completedAt`.
- **Generator-Page deep-link card (D-06):** `GeneratorPageWeightsCard` placed at the top of `/admin/solver` shows all 9 effective weights as a 2-column key-value grid (custom-state values bold, default values muted) with `Tuning öffnen` ghost-primary deep-link to `/admin/solver-tuning?tab=weights`. Cache key `['constraint-weights', schoolId]` is shared with Tab 2 — invalidating one auto-refreshes the other.
- **Sidebar entry:** new "Solver-Tuning" entry in both `AppSidebar.tsx` and `MobileSidebar.tsx` with `SlidersHorizontal` icon, immediately after "Stundenplan-Generator", `roles: ['admin']` strict (Schulleitung does not see it).
- **API client + 4 hook modules:** `apps/web/src/lib/api/solver-tuning.ts` wraps every endpoint with typed `Response → JSON | SolverTuningApiError` unwrap. Hooks: `useConstraintCatalog`, `useConstraintWeights` (typed return `{ weights, lastUpdatedAt }`), `useUpdateConstraintWeights`, `useResetConstraintWeight`, `useConstraintTemplates`, `useCreateConstraintTemplate`, `useUpdateConstraintTemplate`, `useDeleteConstraintTemplate`, `useSetTemplateActive`, `useLatestTimetableRun`. **Every mutation has explicit `onError` → destructive sonner toast (silent-4xx invariant — 6 onError handlers verified by grep).**
- **E2E selectors locked for Plan 14-03:**
  - `data-severity="HARD" | "SOFT"` on every catalog row
  - `data-constraint-name="<exact Java name>"` on every catalog and slider row
  - `data-template-type="NO_LESSONS_AFTER" | "SUBJECT_MORNING" | "SUBJECT_PREFERRED_SLOT"` on every restriction/preference row
  - `aria-label="Eintrag bearbeiten" | "Eintrag löschen" | "Eintrag aktiv schalten" | "Auf Default zurücksetzen" | "Gewichtung bearbeiten"` on icon buttons

## Task Commits

| # | Task | Hash | Type |
|---|------|------|------|
| 1 | Sidebar wiring + route shell + TanStack Query hooks | `1369717` | feat |
| 2 | Catalog tab + weights tab + generator deep-link card | `7dceae4` | feat |
| 3 | Restrictions tab + preferences tab + header badges | `9fa2dd8` | feat |

## Hook Query-Key Inventory (E2E reference for Plan 14-03)

| Hook | Query key |
|------|-----------|
| `useConstraintCatalog` | `['constraint-catalog', schoolId]` (staleTime: Infinity) |
| `useConstraintWeights` | `['constraint-weights', schoolId]` |
| `useConstraintTemplates` | `['constraint-templates', schoolId, templateType]` |
| `useLatestTimetableRun` | `['timetable-runs', schoolId, 'latest']` |

Cache invalidation:
- `useUpdateConstraintWeights` / `useResetConstraintWeight` invalidate `['constraint-weights', schoolId]`. The Generator-Page card and Tuning Tab 2 share this key — auto-refresh on save.
- `useCreateConstraintTemplate` / `useUpdate…` / `useDelete…` / `useSetTemplateActive` invalidate ONLY `['constraint-templates', schoolId, templateType]` (narrow scope per UI-SPEC §Cache invalidation granularity).

## Slider Count

**9 sliders** rendered. Grep confirmation:
```
$ grep -c "severity: 'SOFT'" packages/shared/src/constraint-catalog.ts
9
```

The Tab 2 loop is `SOFT_ENTRIES = CONSTRAINT_CATALOG.filter((e) => e.severity === 'SOFT')` — data-driven, so any future Plan-15+ additions to the shared catalog are picked up automatically.

## DriftBanner Backend Contract

Plan 14-01 GET `/constraint-weights` already returns `{ weights, lastUpdatedAt }` (verified in 14-01-SUMMARY accomplishments). DriftBanner consumes `data?.lastUpdatedAt ?? null` directly — **no fallback path, no extra backend extension required.**

The `useConstraintWeights` hook is typed `useQuery<ConstraintWeightsResponse>` where `ConstraintWeightsResponse = { weights: ConstraintWeightsMap; lastUpdatedAt: string | null }` — so `DriftBanner` reads `lastUpdatedAt` without `any` casts.

## Live Smoke Check Results

`pnpm --filter @schoolflow/web exec tsc --noEmit` → **exits 0** after every task. (Note: `tsc -b && vite build` reports pre-existing project-reference errors in unrelated files — Keycloak/socket/classbook — that predate Phase 14 and are out of scope per scope-boundary rule. The web app's own `tsconfig.app.json`-scoped check is clean.)

`pnpm --filter @schoolflow/shared build` → **exits 0** — re-exports unchanged, no Phase-14 schema breakage.

`routeTree.gen.ts` regenerated automatically by the running TanStack Router Vite plugin: 13 occurrences of `solver-tuning` confirm the new entry is wired (auto-generated route imports + types).

Sidebar grep:
```
$ grep -c "solver-tuning" apps/web/src/components/layout/AppSidebar.tsx
1
$ grep -c "solver-tuning" apps/web/src/components/layout/MobileSidebar.tsx
1
$ grep -c "roles: \['admin'\]" apps/web/src/components/layout/AppSidebar.tsx
2  # User-Mgmt entry + Solver-Tuning entry
```

## Sidebar Role-Gating Confirmation

Both `AppSidebar.tsx` and `MobileSidebar.tsx` use `hasAccess(userRoles, item.roles)` — for the Solver-Tuning entry `roles: ['admin']` strictly — so `schulleitung` (and all other roles) never see it. The route component additionally enforces this via `useAuth` + role check, returning a "Aktion nicht erlaubt" PageShell if a non-admin reaches the URL directly.

## Decisions Made

See `key-decisions` in frontmatter — 6 decisions captured.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] shadcn CLI rejected components.json schema → wrote slider.tsx + toggle-group.tsx manually**
- **Found during:** Task 1 (initial scaffolding).
- **Issue:** `pnpm dlx shadcn@latest add slider toggle-group` errored with "Invalid configuration found in /apps/web/components.json." The newer shadcn CLI requires a config field that the existing components.json doesn't carry (legacy from earlier Phase setup). UI-SPEC §Component Inventory line 274/306 had asserted these primitives were already installed — they are NOT.
- **Fix:** Installed `@radix-ui/react-slider` + `@radix-ui/react-toggle-group` directly via pnpm; wrote `apps/web/src/components/ui/slider.tsx` and `apps/web/src/components/ui/toggle-group.tsx` manually following the standard shadcn output for `default` style + `neutral` base. Components.json was NOT touched (out of scope; would also affect future shadcn add commands).
- **Files modified:** `apps/web/package.json`, `pnpm-lock.yaml`, `apps/web/src/components/ui/slider.tsx` (new), `apps/web/src/components/ui/toggle-group.tsx` (new).
- **Verification:** `pnpm --filter @schoolflow/web exec tsc --noEmit` exits 0; both primitives import cleanly into `ConstraintWeightSliderRow.tsx` and `SubjectPreferencesTab.tsx`.
- **Committed in:** `1369717` (Task 1).

**2. [Rule 1 — Bug] Plan referenced `apps/web/src/components/admin/class/ClassAutocomplete.tsx` and `apps/web/src/components/admin/subject/SubjectAutocomplete.tsx` (Phase 11/12 D-08 reuse) — those files do not exist**
- **Found during:** Task 3 (building Add/Edit dialogs).
- **Issue:** PLAN.md `<context>` and CONTEXT.md §Reusable Assets both say `ClassAutocomplete` (Phase 12 D-08) and `SubjectAutocomplete` (Phase 11 D-08) are reusable. Glob confirmed only `TeacherSearchPopover.tsx` (admin/class folder) and `PersonAutocompletePopover.tsx` (admin/user folder) exist — no class- or subject-named autocomplete components were ever shipped. The Phase 11/12 admin pages used inline filter inputs, not generalized autocomplete components.
- **Fix:** Built `ClassAutocomplete.tsx` and `SubjectAutocomplete.tsx` inline within `apps/web/src/components/admin/solver-tuning/` following the exact same Command + Popover + 300ms debounce + ≥2-char gating pattern used by `TeacherSearchPopover.tsx`. They consume the existing `useClasses` and `useSubjects` paginated list endpoints (no new backend surface). Future plans that need class/subject autocomplete may promote these to `apps/web/src/components/admin/class/` and `subject/` respectively.
- **Files modified:** `apps/web/src/components/admin/solver-tuning/ClassAutocomplete.tsx` (new), `apps/web/src/components/admin/solver-tuning/SubjectAutocomplete.tsx` (new).
- **Verification:** Both autocompletes typecheck against the existing `useClasses` / `useSubjects` query response shapes; the AddEdit dialogs that consume them validate via the shared `constraintTemplateParamsSchema` discriminated union.
- **Committed in:** `9fa2dd8` (Task 3).

**3. [Rule 1 — Bug] `useSchoolContextStore` does not exist; correct export is `useSchoolContext`**
- **Found during:** Task 1 (writing the route file).
- **Issue:** Plan called for `useSchoolContextStore` (with the `Store` suffix). The actual Zustand store at `apps/web/src/stores/school-context-store.ts` exports `useSchoolContext` only.
- **Fix:** Used `useSchoolContext` everywhere. Confirmed against existing routes (`/admin/solver`, `/admin/users.$userId`) which all use the same import.
- **Committed in:** `1369717` (Task 1).

**4. [Rule 2 — Missing critical functionality] PageShell requires `breadcrumbs` prop; plan example omitted it**
- **Found during:** Task 1 (writing the route file).
- **Issue:** Plan example showed `<PageShell title="…" subtitle="…" actions={…}>…</PageShell>`. The actual `PageShell` component requires a `breadcrumbs: Crumb[]` prop and does NOT accept `actions`. Missing breadcrumbs would render a blank breadcrumb bar.
- **Fix:** Added `breadcrumbs={[{ label: 'Admin', href: '/admin/school/settings' }, { label: 'Solver-Tuning' }]}` matching the convention used by `users.$userId.tsx`. Moved `LastRunScoreBadge` into the page body (above DriftBanner + Tabs) since `actions` slot doesn't exist.
- **Committed in:** `1369717` (Task 1).

**5. [Rule 1 — Bug] `apiFetch` returns `Response` (not parsed JSON); plan example treated it as auto-parse**
- **Found during:** Task 1 (writing the API client).
- **Issue:** Plan example showed `apiFetch(...)` returning the parsed body directly. The real `apiFetch` returns `Response` and callers must check `res.ok` + parse JSON themselves. Also `extractProblemDetail` does NOT exist as a named export — Phase 11/12/13 hooks each implement their own `readProblemDetail` helper.
- **Fix:** Built a typed `unwrap<T>(res)` helper in `solver-tuning.ts` that throws `SolverTuningApiError` on `!res.ok` and parses JSON otherwise. Hooks call `apiFetch` indirectly via the `solverTuningApi` object — no Response handling leaks into hook code.
- **Verification:** Mirrors the convention from `useTeachers.ts` / `useSubjects.ts` / `useClasses.ts`.
- **Committed in:** `1369717` (Task 1).

**6. [Rule 1 — Bug] `InfoBanner` does not support a `variant="warning"` prop; plan referenced it**
- **Found during:** Task 3 (building MultiRowConflictBanner).
- **Issue:** UI-SPEC §Multi-Row InfoBanner asserts amber-tinted `<InfoBanner variant="warning">`. The actual `InfoBanner.tsx` is a 16-line muted-background component with no variant prop.
- **Fix:** Built a dedicated `MultiRowConflictBanner.tsx` with hardcoded amber tokens (`bg-warning/10 border-warning/40 text-foreground` + `TriangleAlert` icon). The shared `InfoBanner` is unchanged (extending it is out-of-scope; it has 5+ existing call sites). Plan 14-03 E2E specs can target `data-testid` or the `role="status"` + amber color combination.
- **Committed in:** `9fa2dd8` (Task 3).

**7. [Rule 2 — Missing functionality] `UnsavedChangesDialog` props differ from plan**
- **Found during:** Task 2 (wiring SolverTuningTabs).
- **Issue:** Plan said pass `onConfirm` for "Verwerfen und wechseln". Actual dialog requires `onSaveAndContinue` + `onDiscard` + `onCancel`.
- **Fix:** Mapped the plan's "discard and switch" semantic to both `onDiscard` and `onSaveAndContinue` (both call `handleDiscardAndSwitch` since Tab 2 has no auto-save path). The dialog title/copy is the existing shared "Aenderungen verwerfen?" rather than UI-SPEC's exact "Ungespeicherte Änderungen" — extending the shared component would be out-of-scope.
- **Committed in:** `7dceae4` (Task 2).

---

**Total deviations:** 7 auto-fixed (5 Rule-1 bugs in PLAN/SPEC vs. actual codebase + 1 Rule-2 missing breadcrumb prop + 1 Rule-3 blocker on shadcn CLI). All deviations preserved plan intent — no scope changes, no requirements dropped.

## Issues Encountered

**Pre-existing project-reference build errors (out of scope):** `pnpm --filter @schoolflow/web build` (which runs `tsc -b && vite build`) reports pre-existing TS errors in `keycloak.ts` (`import.meta.env`), `socket.ts`, `classbook/$lessonId.tsx`, `messages/$conversationId.tsx`, `teacher/substitutions.tsx`, etc. These predate Phase 14 (none touch any solver-tuning file) and are caused by a TS project-reference setup that the existing `tsc -b` flow doesn't fully reconcile. The app-scoped `tsc --noEmit` passes clean, the running Vite dev server compiles solver-tuning files without issue, and `routeTree.gen.ts` regenerated successfully. Logged for follow-up but out of Phase 14-02 scope.

## TDD Gate Compliance

Plan-level type is `execute` (not `tdd`). No per-task tests authored; this plan ships UI surfaces that Plan 14-03 will cover end-to-end via 12 Playwright specs (`E2E-SOLVER-*`). Backend correctness is regression-guarded by Plan 14-01's 28 Vitest tests.

## User Setup Required

None — no external service configuration. The new Radix dependencies (`@radix-ui/react-slider`, `@radix-ui/react-toggle-group`) install automatically via `pnpm install`.

## Threat Flags

None. The new attack surface is the `/admin/solver-tuning` route, which is fully covered by the threat model in PLAN.md (T-14-08..T-14-12). All 4 mitigate-disposition threats are implemented:

- **T-14-08** Spoofing (schulleitung direct URL): sidebar `roles: ['admin']` + route component `useAuth` admin check. Backend CASL guard rejects mutations regardless.
- **T-14-09** Tampering (UI bypass weight=200): backend whitelist + bounds 422 (Plan 14-01); frontend Zod is UX, not security.
- **T-14-10** Information Disclosure (cross-school cache leak): every query key includes `schoolId`; school-context store is single-tenant.
- **T-14-12** Repudiation: `updatedBy` recorded server-side (Plan 14-01); audit log surfaced in Phase 15.

## Next Phase Readiness

- **Plan 14-03 (E2E) can target:**
  - Route paths: `/admin/solver-tuning` (4 tabs via `?tab=` search param), `/admin/solver` (with new `GeneratorPageWeightsCard`).
  - Stable selectors:
    - `data-severity="HARD"` / `data-severity="SOFT"` (catalog rows)
    - `data-constraint-name="<exact Java name>"` (catalog + slider rows)
    - `data-template-type="NO_LESSONS_AFTER" | "SUBJECT_MORNING" | "SUBJECT_PREFERRED_SLOT"` (restriction/preference rows)
    - `data-row-id="<uuid>"` on every CRUD row
    - `data-testid="drift-banner"` on the conditional drift banner
    - `aria-label` strings: `"Gewichtung bearbeiten"`, `"Auf Default zurücksetzen"`, `"Eintrag bearbeiten"`, `"Eintrag löschen"`, `"Eintrag aktiv schalten"`
  - Toast assertions: every mutation surfaces success or destructive toasts via the `sonner` library (already established in Phase 10-13 specs).
  - Hook query keys (above) for cache-aware test setup helpers.
- **Plan 14-03 helpers will need:**
  - `loginAsRole('admin')` (already shipped Phase 10.3)
  - A way to seed `ConstraintTemplate` rows directly via API (use the same endpoints; 14-01 contract is stable)
  - A way to seed weight overrides directly (same pattern)

**Blockers:** None. Plan 14-03 may begin immediately.

## Self-Check: PASSED

Files verified present:
- FOUND: apps/web/src/routes/_authenticated/admin/solver-tuning.tsx
- FOUND: apps/web/src/lib/api/solver-tuning.ts
- FOUND: apps/web/src/lib/hooks/useConstraintCatalog.ts
- FOUND: apps/web/src/lib/hooks/useConstraintWeights.ts
- FOUND: apps/web/src/lib/hooks/useConstraintTemplates.ts
- FOUND: apps/web/src/lib/hooks/useLatestTimetableRun.ts
- FOUND: apps/web/src/components/admin/solver-tuning/SolverTuningTabs.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/ConstraintCatalogTab.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/ConstraintCatalogRow.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/ConstraintWeightsTab.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/ConstraintWeightSliderRow.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/ClassRestrictionsTab.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/ClassRestrictionsTable.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/AddEditClassRestrictionDialog.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/SubjectPreferencesTab.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/AddEditSubjectMorningPreferenceDialog.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/SubjectPreferredSlotTable.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/AddEditSubjectPreferredSlotDialog.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/SeverityBadge.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/WochentagBadge.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/MultiRowConflictBanner.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/LastRunScoreBadge.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/DriftBanner.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/ClassAutocomplete.tsx
- FOUND: apps/web/src/components/admin/solver-tuning/SubjectAutocomplete.tsx
- FOUND: apps/web/src/components/admin/solver/GeneratorPageWeightsCard.tsx
- FOUND: apps/web/src/components/ui/slider.tsx
- FOUND: apps/web/src/components/ui/toggle-group.tsx

Commits verified:
- FOUND: 1369717 feat(14-02): sidebar wiring + route shell + TanStack Query hooks
- FOUND: 7dceae4 feat(14-02): catalog tab + weights tab + generator deep-link card
- FOUND: 9fa2dd8 feat(14-02): restrictions tab + preferences tab + header badges

---
*Phase: 14-solver-tuning*
*Plan: 02-frontend*
*Completed: 2026-04-25*
