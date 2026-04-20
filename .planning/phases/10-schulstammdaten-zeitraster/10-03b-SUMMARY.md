---
phase: 10-schulstammdaten-zeitraster
plan: 03b
status: complete
completed: 2026-04-20
author: orchestrator-inline
---

# Plan 10-03b Summary — TanStack hooks + Stammdaten tab

## Outcome

Four TanStack Query hook bundles + the full SCHOOL-01 Stammdaten tab land on top of the Plan 10-03a route shell. Plans 10-04 and 10-05 can now import these hooks without further wiring. The empty-flow bootstrap (no school in DB) promotes to edit mode atomically after a successful create — tabs 2–4 enable on the next render because `setContext` fires before the form resets.

## Hooks (apps/web/src/hooks/)

| File | Exports |
|------|---------|
| `useSchool.ts` | `schoolKeys`, `useSchool`, `useFirstSchool`, `useCreateSchool`, `useUpdateSchool` |
| `useTimeGrid.ts` | `timeGridKeys`, `useTimeGrid`, `useUpdateTimeGrid`, `TimeGridConflictError` |
| `useSchoolYears.ts` | `schoolYearKeys`, `useSchoolYears`, `useCreateSchoolYear`, `useUpdateSchoolYear`, `useActivateSchoolYear`, `useDeleteSchoolYear`, `SchoolYearOrphanError`, plus `useCreateHoliday`/`useDeleteHoliday`/`useCreateAutonomousDay`/`useDeleteAutonomousDay` (D-08 nested sub-UI) |
| `useActiveTimetableRun.ts` | `useActiveTimetableRun`, `ActiveRunDto` |

All mutations use specific-key invalidation (`schoolKeys.one(id)`, `schoolYearKeys.all(schoolId)`) per UI-SPEC §14.2 query-key discipline — no broad `['schools']` invalidations that flush unrelated caches.

## 409 handling

Two typed Error subclasses so dialogs can pattern-match:

- `TimeGridConflictError(impactedRunsCount)` — raised by `useUpdateTimeGrid` when the backend sees an active run using a removed period. Plan 10-04's DestructiveEditDialog catches it, renders the N-aware confirm, and retries with `?force=true`.
- `SchoolYearOrphanError(referenceCount)` — raised by `useDeleteSchoolYear` when SchoolClass + TeachingReduction rows still reference the year. Plan 10-05's DeleteSchoolYearDialog reads `referenceCount` to render the German toast body.

Both classes extract the numeric field from the 409 body with `?? 0` fall-back so a malformed body still yields a usable error message.

## useActiveTimetableRun endpoint

Hits `/api/v1/schools/:schoolId/timetable/runs` and filters client-side for `r.isActive === true`. The backend's current controller returns an array directly; an `{ runs: [...] }` wrapper is also accepted for future-proofing. Returns `{ id, abWeekEnabled, status }` for downstream OptionsTab consumption (Plan 10-05).

## SchoolDetailsTab

- Empty flow: `useFirstSchool` → null → renders hero `Building2 + "Noch keine Schule angelegt"` + inline form with `Schule anlegen` primary.
- Edit flow: form pre-fills from `useSchool(schoolId)`; Save is disabled until `isDirty`. `form.reset(serverResponse)` after a successful save so `isDirty` returns to false (Dirty-Reset Discipline).
- 7 Schultyp Select options wired through `react-hook-form` `Controller` (shadcn Select needs controlled wiring — plain `register` doesn't work with Radix Select's non-native API).
- RHF + `zodResolver(SchoolDetailsSchema)` validates on submit; `aria-describedby` points at the error node on each invalid input.
- Desktop button: `hidden md:flex`. Mobile: `StickyMobileSaveBar` with 44px touch target (`h-11 md:h-10`) per UI-SPEC §10.5.
- On successful create: `setContext({schoolId, abWeekEnabled})` fires BEFORE `form.reset(serverResponse)`. The Zustand store sees `schoolId !== null` on the next render, tabs 2–4 enable, and the parent's `useBlocker` gets a false reading because `isDirty` is now false. Without the pre-reset `setContext` call, the disabled tabs would flicker (RESEARCH §8 pitfall).

## `school.settings.tsx` infinite-loop guard

The original Plan 10-03a route wrote inline lambdas for every tab's `onDirtyChange`. Once the Plan 10-03b SchoolDetailsTab replaced the placeholder, the child's `useEffect(() => onDirtyChange?.(isDirty), [isDirty, onDirtyChange])` ran every parent render (fresh lambda identity), producing "Maximum update depth exceeded." The route now wraps each `set{Tab}Dirty` in `useCallback` with `[]` deps so child effects only re-fire when `isDirty` genuinely changes.

## Schultyp enum drift (flagged for follow-up)

The UI contract declares 7 Schultypen (`VS / NMS / AHS / BHS / BMS / PTS / ASO`) — UI-SPEC §3.2, locked by CONTEXT.md D-15. The Prisma `SchoolType` enum (set in Phase 2) currently has 5 different values (`VS / MS / AHS_UNTER / AHS_OBER / BHS`). Only `VS` and `BHS` overlap.

**Impact:** creating a school via the new Stammdaten tab with (e.g.) `NMS` will hit a Prisma enum validation error at the API.

**Fix:** a follow-up decimal phase should generate a Prisma migration that expands the enum to match the UI-SPEC values. Do NOT reach for `db push` — the new Plan 10-01a migration-hygiene guardrail (CLAUDE.md §Conventions + `scripts/check-migration-hygiene.sh`) will fail CI.

Suggested migration (author as `prisma migrate dev --name expand_school_type_enum_for_phase_10`):

```sql
-- apps/api/prisma/schema.prisma: update enum
enum SchoolType { VS MS AHS_UNTER AHS_OBER BHS NMS AHS BMS PTS ASO }

-- Generated migration will be:
ALTER TYPE "SchoolType" ADD VALUE 'NMS';
ALTER TYPE "SchoolType" ADD VALUE 'AHS';
ALTER TYPE "SchoolType" ADD VALUE 'BMS';
ALTER TYPE "SchoolType" ADD VALUE 'PTS';
ALTER TYPE "SchoolType" ADD VALUE 'ASO';
```

(Postgres can't remove enum values easily. `MS / AHS_UNTER / AHS_OBER` can stay unused and the UI simply never emits them. If a later phase wants to retire them, generate a separate migration with an explicit `UPDATE schools SET school_type = ...` backfill step.)

## Shared package rebuild dependency

`@schoolflow/shared/dist` is gitignored. `apps/web` vitest + tsc resolve imports through `dist/index.js`. After editing anything under `packages/shared/src`, run:

```bash
pnpm --filter @schoolflow/shared build
```

Without this, apps/web tests fail with "Cannot use 'in' operator to search for '_def' in undefined" (zodResolver sees `undefined` because the schema re-export is stale). Add this to the pre-test developer checklist or wire a turbo task for it.

## Commits

- `fdb7065` — test(10-03b): failing specs for SchoolDetailsTab empty-flow + edit + validation (RED)
- `(following GREEN commit)` — feat(10-03b): TanStack Query hooks bundle + SchoolDetailsTab (GREEN)

## Verification

| Must-have | Status | Evidence |
|-----------|--------|----------|
| 4 hook bundles export query-key factory + read + mutations | ✓ | files present + grep acceptance (9 greps pass) |
| `useSchoolYears` additionally exports Holiday + AutonomousDay CRUD | ✓ | 4 matches for the hook names |
| SchoolDetailsTab implements UI-SPEC §3 verbatim | ✓ | hero copy + 7 Schultyp labels + RHF + Controller + Save disabled until isDirty |
| Empty-flow bootstrap promotes to edit mode after create | ✓ | `setContext` fires before `reset` — spec Test 5 |
| Vitest: all new specs pass | ✓ | 5/5 Stammdaten + 3/3 route-shell (fixed regression from 10-03a) |
| apps/web `tsc --noEmit`: clean | ✓ | exit 0 |
| No regressions in existing tests | ✓ | 27 passed | 36 todo | 7 skipped |

## Notes for downstream plans

- **Plan 10-04** (Zeitraster tab) imports `useTimeGrid` + `useUpdateTimeGrid` + `TimeGridConflictError`.
- **Plan 10-05** (Schuljahre tab) imports `useSchoolYears`, activation/delete mutations, `SchoolYearOrphanError`, plus Holiday/AutonomousDay mutations for the nested sub-lists.
- **Plan 10-05** (Optionen tab) imports `useActiveTimetableRun` + `useUpdateSchool` (for the abWeekEnabled PUT).
- **Schultyp enum fix** is mandatory before end-to-end UAT (Plan 10-06) can exercise the Schultyp dropdown with any value beyond VS or BHS. File a follow-up decimal phase or include it in Wave 6 scope.
