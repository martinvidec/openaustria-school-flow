---
phase: 10-schulstammdaten-zeitraster
plan: 04
status: complete
completed: 2026-04-20
author: orchestrator-inline
---

# Plan 10-04 Summary — Zeitraster tab + destructive-edit flow

## Outcome

Full UI-SPEC §4 Zeitraster tab: 6 Schultage toggles (Mo–Sa) + responsive PeriodsEditor (dense table on desktop, stacked Cards on mobile, both under one `SortableContext` for DnD reorder) + Save flow with the D-13 destructive-edit 3-button dialog + template reload confirmation.

## Files

- `SortablePeriodRow.tsx` — desktop `<tr>` with 8 columns (handle / # / label / start / end / duration / break switch / trash)
- `SortablePeriodCard.tsx` — mobile Card variant, 44px hit targets throughout (`h-11 w-11` on trash + switch, `h-11` on inputs)
- `PeriodsEditor.tsx` — composes both, owns `DndContext`/`SortableContext`, exports `renumber()` + `durationFor()` for test isolation
- `DestructiveEditDialog.tsx` — AlertTriangle + N-aware plural + 3 buttons (Abbrechen / Nur speichern / Speichern + Solver neu starten)
- `TemplateReloadDialog.tsx` — destructive confirm before wiping periods
- `TimeGridTab.tsx` — orchestrator (replaces the Plan 10-03a placeholder)

## Key design decisions

**State model = plain `useState`, not RHF.** The form is a dynamic array of periods that DnD reorders and `+`/trash mutate. RHF's `useFieldArray` adds overhead without benefit for this shape — particularly around re-keying after `arrayMove`. Documented as the intentional v1 choice.

**`isDirty` via JSON stringify diff.** `serverSnapshot` holds the last known-good state; `isDirty = JSON.stringify({periods, schoolDays}) !== JSON.stringify(serverSnapshot)`. After a successful save the snapshot re-seals — same Dirty-Reset Discipline that RHF's `form.reset(response)` provides for the Stammdaten tab.

**Save both in one PUT.** `buildDto()` builds `{ periods, schoolDays }` and the Plan 10-02 service atomically applies both inside one `$transaction` — D-14 single-save contract honoured.

**409 handling flows through a typed subclass.** `updateMut.mutateAsync` throws `TimeGridConflictError(impactedRunsCount)`; the catch opens the dialog with the number. Both dialog retry paths (`handleSaveOnly`, `handleSaveAndRerun`) call `doSave(true)` → `{ force: true }` → backend skips impact-check.

**Solver rerun endpoint.** `POST /api/v1/schools/:schoolId/timetable/solve` with empty body `{}`. Backend `StartSolveDto` uses defaults for `maxSolveSeconds` and `constraintWeights`. Confirmed 202 on success; toast shows "Stundenplan-Lauf gestartet." Any non-OK response fires "Solver-Rerun konnte nicht gestartet werden." toast.

**Template fetch endpoint.** `GET /api/v1/schools/templates?type={schoolType}`. Response is `{ periods: [...], schoolDays: [...] }`. The executor gracefully degrades: empty periods / missing schoolDays fall back to defaults on each period (`08:00`/`08:50`/`isBreak=false`) or leave `schoolDays` untouched.

**DnD a11y strings are all German** (UI-SPEC §12.2 hard requirement):
- `screenReaderInstructions.draggable`: "Zum Verschieben Leertaste druecken. Pfeiltasten zum Bewegen. Leertaste zum Ablegen. Escape zum Abbrechen."
- `announcements.onDragStart/Over/End/Cancel`: German phrasings.
- Drag handle button: `aria-label="Periode verschieben"`.

## Side fix — 10-03a spec

Plan 10-04 replaces the Plan 10-03a placeholder TimeGridTab with the real implementation, which pulls in `useTimeGrid` (TanStack Query). The `?tab=timegrid` case of the route-shell spec (`school.settings.spec.tsx`) now also mocks `@/hooks/useTimeGrid` + `TimeGridConflictError` so no QueryClient is required to run the shell tests.

## Test-harness gotcha (documented for future specs)

Two infinite-loop traps hit during spec authoring, both related to hydration `useEffect` identity:

1. **Fresh-object mock data.** `useTimeGrid: () => ({ data: {…} })` returns a new object every call. The hydration effect (`useEffect(…, [tgQuery.data])`) sees a new ref every render → re-hydrates → re-renders → loop. **Fix:** declare the fixture INSIDE the `vi.mock` factory and return the same reference on every call.
2. **Top-level mock refs inside `vi.mock` factory.** `vi.mock` is hoisted above all module code, so top-level `const x = vi.fn()` is undefined when the factory runs. **Fix:** wrap shared mocks in `vi.hoisted(() => ({ ... }))` and destructure from that result.

Both are captured in the commit body + this SUMMARY so the next plan author won't retrace them.

## Commits

- `4feb685` — test(10-04): specs for PeriodsEditor + TimeGridTab + D-13 conflict flow (RED)
- `(following GREEN commit)` — feat(10-04): Zeitraster tab with PeriodsEditor + DnD + D-13 conflict flow (GREEN)

## Verification

| Must-have | Status | Evidence |
|-----------|--------|----------|
| 6 SchoolDay toggles (Mo-Sa) above periods | ✓ | `TimeGridTab.tsx` Unterrichtstage section |
| Dense table md+; cards <md; same SortableContext | ✓ | `PeriodsEditor.tsx` renders both simultaneously |
| DnD updates periodNumber on save via renumber | ✓ | `PeriodsEditor.spec.tsx` renumber + remove tests |
| Time inputs use type="time" | ✓ | `SortablePeriodRow.tsx` + `SortablePeriodCard.tsx` |
| Dauer column = differenceInMinutes(endTime, startTime) | ✓ | `durationFor` helper, spec Test 4 |
| + Periode hinzufuegen appends with periodNumber = max+1 | ✓ | `PeriodsEditor.spec.tsx` Test 2 |
| Aus Template neu laden opens TemplateReloadDialog | ✓ | `TimeGridTab.spec.tsx` Test 6 |
| 409 → DestructiveEditDialog with 3 options | ✓ | `TimeGridTab.spec.tsx` Test 3 |
| Nur speichern retries with ?force=true | ✓ | `TimeGridTab.spec.tsx` Test 4 |
| Speichern + Solver neu starten issues both calls | ✓ | `TimeGridTab.spec.tsx` Test 5 |
| Single Save persists both schoolDays + periods | ✓ | `buildDto()` + Plan 10-02 transactional PUT |
| tsc --noEmit clean | ✓ | exit 0 |
| All Vitest specs green | ✓ | 39 passed \| 36 todo \| 0 regressions |

## Notes for Wave 6

- Playwright E2E can drive `?tab=timegrid` directly thanks to the `validateSearch` on the route (Plan 10-03a).
- The force=true UAT happens by first seeding an active TimetableRun with a lesson using a specific periodNumber (via the Prisma-direct fixture Plan 10-06 already plans for SCHOOL-05), then removing that period in the UI and clicking Save.
- `Speichern + Solver neu starten` relies on the solver sidecar being up. If UAT runs without the sidecar, the `/timetable/solve` POST will return 500 and surface the "Solver-Rerun konnte nicht gestartet werden." toast — Plan 10-06 should either seed a fake solver or assert the toast rather than a completed run.
