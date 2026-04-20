---
phase: 10-schulstammdaten-zeitraster
plan: 05
status: complete
completed: 2026-04-20
author: orchestrator-inline
---

# Plan 10-05 Summary — Schuljahre + Optionen tabs

## Outcome

Both remaining Plan 10-03a placeholder tabs replaced with full UI-SPEC §5 / §6 implementations. Schuljahre ships a Card-list with Aktiv-Badge, Info Banner, three dialogs, and nested Ferien + schulautonome Tage sub-lists. Optionen ships the A/B-Wochen toggle with a dynamic status line driven by the active TimetableRun, plus an always-on Info Banner.

## Files

### Schuljahre tab (Task 1)

| File | Role |
|------|------|
| `SchoolYearsTab.tsx` | list orchestrator + dialogs + empty-state |
| `SchoolYearCard.tsx` | per-year Card with Badge + actions + Collapsible |
| `CreateSchoolYearDialog.tsx` | RHF/Zod 5-field form with `isActive` Switch |
| `ActivateSchoolYearDialog.tsx` | UI-SPEC §5.5 confirmation copy |
| `DeleteSchoolYearDialog.tsx` | UI-SPEC §7.3 destructive confirm |
| `HolidaysList.tsx` | inline add form + delete rows (useCreateHoliday/useDeleteHoliday) |
| `AutonomousDaysList.tsx` | same shape for AutonomousDay CRUD |

### Optionen tab (Task 2)

| File | Role |
|------|------|
| `OptionsTab.tsx` | A/B toggle + dynamic status line + always-on InfoBanner |

## Step A decision (Holiday / AutonomousDay hooks)

The Plan-02 backend already exposes the four endpoints (Task 3 of Plan 10-02), and Plan 10-03b already shipped the matching hook bundle inside `apps/web/src/hooks/useSchoolYears.ts`:

- `useCreateHoliday`, `useDeleteHoliday`
- `useCreateAutonomousDay`, `useDeleteAutonomousDay`

So this plan imported them directly — no new hooks needed, no `apiFetch` workarounds. Both hooks invalidate `schoolYearKeys.all(schoolId)` on success, so the parent SchoolYearsTab refetches automatically after any nested mutation.

## Server DTO shape observations

The Plan 10-02 controller returns `SchoolYearDto` with `holidays` and `autonomousDays` arrays attached (via the `include: { holidays: true, autonomousDays: true }` in the service's `findAll`). The Card component consumes these nested arrays directly — no extra round-trip required. Dates come across as ISO strings; `date-fns.format(new Date(dateStr), 'dd.MM.yyyy')` renders them as 01.09.2025.

## Key design decisions

**Auto-save model.** Both tabs report `onDirtyChange(false)` unconditionally — every interaction (create year, activate, delete, toggle, add holiday, add autonomous day) round-trips to the server on confirm. The parent route shell's `useBlocker` never arms on these tabs, which matches the UI-SPEC §2.7 contract for "dialog-commit" flows.

**OptionsTab toast uniqueness.** `useUpdateSchool` (Plan 10-03b) toasts `Aenderungen gespeichert.` — the wrong copy for the A/B toggle. OptionsTab therefore defines a dedicated inline `useMutation` that PUTs `/api/v1/schools/:id` with `{ abWeekEnabled }` and toasts `Option gespeichert.` verbatim per UI-SPEC §6.3. `grep -c useUpdateSchool OptionsTab.tsx` → 0. Acceptance-criterion-locked.

**Loeschen-Guard tooltip.** When `year.isActive`, the Card's trash button is `disabled` AND wrapped in a Radix Tooltip with the German reason. Disabled buttons don't receive pointer events by default, so the Tooltip's `TooltipTrigger asChild` wraps a `<span>` around the Button to keep hover detection working.

## Test-harness fixes (reusable)

`src/test/setup.ts` now polyfills:
1. `ResizeObserver` — Radix Dialog/Tooltip/Select all `new ResizeObserver(...)` on mount; jsdom lacks it. No-op stub suffices.
2. `window.matchMedia` — Radix uses it for some responsive helpers. No-op stub.

Both are now available to every test in `apps/web` going forward — future tabs/dialogs don't need to polyfill.

## Commits

- `(RED commit)` — test(10-05): specs for Schuljahre + Optionen tabs (RED)
- `(GREEN commit)` — feat(10-05): Schuljahre + Optionen tabs with nested sub-UI and A/B toggle (GREEN)

## Verification

| Must-have | Status | Evidence |
|-----------|--------|----------|
| SchoolYearsTab renders Aktiv-Badge + InfoBanner + list | ✓ | `SchoolYearsTab.spec.tsx` Tests 1-2 |
| + Neues Schuljahr anlegen opens 5-field dialog | ✓ | Test 3 |
| Aktivieren opens confirmation with year name | ✓ | Test 4 |
| Loeschen disabled on active year with tooltip | ✓ | Test 5 + SchoolYearCard disabled attr |
| 409 SchoolYearOrphanError surfaces toast with count | ✓ | Hook's onError wires referenceCount → toast.error |
| Collapsible reveals Holidays + AutonomousDays sub-UI | ✓ | Test 7 |
| OptionsTab renders A/B toggle + status line + banner | ✓ | Tests 1-6 |
| Toggle PUTs abWeekEnabled + toasts "Option gespeichert." | ✓ | Test 7 (exact method/body/toast literal) |
| useUpdateSchool NOT used in OptionsTab | ✓ | `grep -c useUpdateSchool` → 0 |
| tsc --noEmit clean | ✓ | exit 0 |
| apps/web vitest: no regressions | ✓ | 53 passed \| 36 todo (+14 new, 0 broken) |

## Notes for Wave 6 (E2E + UAT)

- **Create/Activate/Delete happy path** is fully covered by these specs at the unit level. E2E should assert the live DB state transitions after each confirm (one active year at a time, partial-unique index honored).
- **Orphan-guard E2E** (SCHOOL-05 path): Plan 10-06 already plans to seed a referencing row via a Prisma-direct fixture before attempting delete. The UI contract is: 409 with `referenceCount` → toast `Schuljahr kann nicht geloescht werden — wird noch von N Eintraegen verwendet.` Matches `/wird noch von .* Eintraegen verwendet/`.
- **A/B toggle round-trip**: E2E can assert that after toggling, `GET /api/v1/schools/:id` returns `abWeekEnabled: true` and (after a new solver run) the resulting TimetableRun inherits that flag (SCHOOL-04 end-to-end).
- **Holiday / AutonomousDay CRUD**: specs only cover presence of the nested sub-UI trigger. E2E should add + remove at least one entry of each kind to exercise the backend CASL permission check and cascade-delete.
