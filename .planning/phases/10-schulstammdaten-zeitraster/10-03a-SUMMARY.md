---
phase: 10-schulstammdaten-zeitraster
plan: 03a
status: complete
completed: 2026-04-20
author: orchestrator-inline
---

# Plan 10-03a Summary — Route shell + shared admin components

## Outcome

The `/admin/school/settings` route shell, 5 reusable shared admin components, 4 placeholder tab files, the Zustand store extension, and sidebar entries for both `AppSidebar` + `MobileSidebar` are live. Plans 10-03b, 10-04, and 10-05 can now mount their implementations into the placeholder tabs without touching the route shell.

## Route live

```
/admin/school/settings[?tab=details|timegrid|years|options]
```

- Desktop: `TabsList` with 4 `TabsTrigger`s (Stammdaten / Zeitraster / Schuljahre / Optionen)
- Mobile (<md): `Select` dropdown with the same 4 options
- Tabs 2–4 render `disabled` + `aria-disabled="true"` when `schoolId` is null (empty flow); Stammdaten stays enabled as the empty-flow entry point
- `TabsContent` for tabs 2–4 is conditionally rendered — `{schoolId && <TimeGridTab />}` — so URL manipulation (`?tab=timegrid`) to a disabled tab produces an empty panel, never a crashed mount
- `useBlocker({ shouldBlockFn: () => isAnyDirty, withResolver: true })` arms on dirty state; fires `UnsavedChangesDialog` on sidebar click, back button, or cross-tab navigation

## 5 reusable shared admin components

Under `apps/web/src/components/admin/shared/` — Phases 11–16 will import these without copy-paste:

| File | Purpose |
|------|---------|
| `PageShell.tsx` | Breadcrumb + title + subtitle page header (UI-SPEC §1.1–§1.4) |
| `UnsavedChangesDialog.tsx` | 3-action dialog — Verwerfen / Abbrechen / Speichern & Weiter (UI-SPEC §8 verbatim) |
| `StickyMobileSaveBar.tsx` | `md:hidden fixed bottom-0` save bar with `env(safe-area-inset-bottom)` (UI-SPEC §1.6) |
| `InfoBanner.tsx` | `role="status"` banner with Info icon (UI-SPEC §5.6) |
| `WarnDialog.tsx` | Generic amber warn dialog accepting N `Action`s — Plan 10-04's `DestructiveEditDialog` composes this |

## Sidebar entry

Both `AppSidebar.tsx` and `MobileSidebar.tsx` carry:

```ts
{
  label: 'Schulverwaltung',
  href: '/admin/school/settings',
  icon: Building2,
  roles: ['admin', 'schulleitung'],
}
```

Positioned between Datenimport and Raeume. Role gate (admin + schulleitung) applied by the existing `navItems.filter` in each sidebar. Other roles never see the entry.

## Zustand store extension

`school-context-store.ts` is additive — no existing field renamed or removed:

```ts
// New state fields
activeSchoolYearId: string | null;  // default null
abWeekEnabled: boolean;             // default false

// setContext now accepts them optionally
activeSchoolYearId?: string | null;  // applied with ?? null
abWeekEnabled?: boolean;             // applied with ?? false
```

Plan 10-03b will pre-populate both fields from the `/api/v1/schools/:id/school-years` response. Plan 10-05 OptionsTab reads `abWeekEnabled` to pre-check the A/B switch.

## Placeholder tabs

| File | Replaced by |
|------|-------------|
| `school-settings/SchoolDetailsTab.tsx` | Plan 10-03b (full SCHOOL-01 implementation) |
| `school-settings/TimeGridTab.tsx` | Plan 10-04 (Schultage toggles + PeriodsEditor) |
| `school-settings/SchoolYearsTab.tsx` | Plan 10-05 (list + dialogs + nested Holidays/AutonomousDays) |
| `school-settings/OptionsTab.tsx` | Plan 10-05 (A/B switch + status line) |

Each renders `"<entity> — Plan XX implementiert."` so the route compiles and manual testing can see the placeholder without errors.

## Save-and-Continue wiring (v1)

The `onSaveAndContinue` callback in the route currently just calls `blocker.proceed?.()`. A multi-tab submit dispatcher was deferred — once Plans 10-03b/10-04/10-05 expose their mutation hooks, a follow-up PR can wire a shared submit event (custom DOM event or context) so "Speichern & Weiter" actually saves the active tab before navigating. The UnsavedChangesDialog already accepts an `isSaving` prop and swaps the primary label to `"Wird gespeichert..."` so the follow-up wiring is API-complete today.

## useBlocker observations

- Fires for router navigation (sidebar click, back button, breadcrumb). Good.
- Does NOT fire for intra-route `setTab()` calls — those use `navigate({ search })` which mutates search params without a path change. This matches the plan's intent (tab-to-tab switch goes through the dialog via the parent Tabs `onValueChange` only when the new route plans wire the check explicitly).
- `blocker.status === 'blocked'` opens the dialog; `blocker.proceed()` completes the pending navigation; `blocker.reset()` cancels it.

## Commits

- `b5a2fbe` — test(10-03a): specs for route shell + UnsavedChangesDialog (RED)
- `b064baa`/`(preceding GREEN commit)` — feat(10-03a): route shell + 5 shared admin components + sidebar entry (GREEN)
- `b064baa` — chore(10-03a): regenerate TanStack Router tree

## Verification

| Must-have | Status | Evidence |
|-----------|--------|----------|
| Route `/admin/school/settings` exists + compiles | ✓ | `routeTree.gen.ts` includes the new route; tsc --noEmit clean |
| 4 TabsTrigger + mobile Select | ✓ | `school.settings.spec.tsx` Test 1 |
| Tabs 2–4 disabled when `schoolId` null | ✓ | `school.settings.spec.tsx` Test 2 |
| `?tab=timegrid` activates Zeitraster on load | ✓ | `school.settings.spec.tsx` Test 3 |
| UnsavedChangesDialog 3 actions + German copy | ✓ | `UnsavedChangesDialog.spec.tsx` 5/5 |
| Sidebar entry in both sidebars | ✓ | grep returns 1 for each file |
| Zustand store extended additively | ✓ | grep: 4 matches for `activeSchoolYearId`, 4 for `abWeekEnabled` |
| 5 shared components + 4 placeholder tabs exist | ✓ | ls counts 5 + 4 |
| apps/web tsc --noEmit: clean | ✓ | exit 0 |
| apps/web vitest: no regressions | ✓ | 22 passed | 36 todo (+8 new, 0 broken) |
