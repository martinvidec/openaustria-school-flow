---
status: resolved
trigger: "Investigate why the room type filter and equipment filter don't work on the room availability grid"
created: 2026-04-02T00:00:00Z
updated: 2026-04-26T00:00:00Z
symptoms_prefilled: true
goal: find_and_fix
resolved_at: 2026-04-26
resolution_commits:
  - 5378ec0  # fix(04-14): align room type enums with backend and fix empty state differentiation (2026-04-02)
---

## Current Focus

hypothesis: Both root causes (Bug 1 enum mismatch, Bug 2 empty-state copy) were already remediated by commit 5378ec0 on 2026-04-02 — written ~1 hour after the original diagnosis on the same day. Re-verification on 2026-04-26 confirmed the fixed-state code matches the proposed fixes exactly. No source-code edits required.
test: Re-read the four cited files in current Phase 14 codebase; cross-checked against backend RoomTypeDto + Prisma RoomType enum; ran git log to confirm fix commit; scanned apps/web/src for orphan English enum references; checked packages/shared for an existing RoomType extraction (none found — current architectural target stays per-page const, matching the fix-as-shipped).
expecting: n/a — no edits required, status moves to resolved
next_action: archive session to .planning/debug/resolved/, append KB entry, write memory, update MEMORY.md index

## Symptoms

expected: Room type filter should filter rooms by type when a type is selected; Equipment filter should filter rooms by equipment
actual: Room type filter does not filter rooms; Equipment filter shows wrong empty-state message "Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen." (suggesting no rooms exist, but rooms ARE visible in the grid)
errors: No error messages — filters just don't work correctly. Equipment filter shows misleading empty state.
reproduction: Open room availability grid, try room type filter and equipment filter. Day filter and capacity filter work correctly.
started: Unknown

## Eliminated

- hypothesis: "Bug 1 (enum mismatch) still applies in current codebase"
  evidence: Re-verified 2026-04-26 — apps/web/src/routes/_authenticated/rooms/index.tsx lines 38-46 declare ROOM_TYPES with German values (KLASSENZIMMER, EDV_RAUM, LABOR, TURNSAAL, MUSIKRAUM, WERKRAUM) matching backend RoomTypeDto exactly. apps/web/src/components/rooms/RoomAvailabilityGrid.tsx lines 49-56 declare ROOM_TYPE_LABELS keyed on those same German enum values with German display labels. Already fixed by commit 5378ec0 "fix(04-14): align room type enums with backend and fix empty state differentiation" on 2026-04-02 13:38:54 — same day as original diagnosis (~1 hour later).
  timestamp: 2026-04-26T00:10:00Z

- hypothesis: "Bug 2 (undifferentiated empty state) still applies in current codebase"
  evidence: Re-verified 2026-04-26 — apps/web/src/routes/_authenticated/rooms/index.tsx line 164 derives `hasActiveFilters = roomType !== '__all__' || minCapacity !== '' || equipment !== ''`. Lines 269-284 branch the empty-state Card title between "Keine passenden Raeume" (when filters are active) and "Keine Raeume angelegt" (when no filters), with body copy "Keine Raeume entsprechen den aktuellen Filterkriterien. Passen Sie die Filter an oder setzen Sie sie zurueck." vs "Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen." Already fixed by commit 5378ec0 on 2026-04-02.
  timestamp: 2026-04-26T00:10:00Z

- hypothesis: "Phase 09 responsive refactor (fc833ec) might have re-introduced English enum strings"
  evidence: Re-verified 2026-04-26 — git show fc833ec --stat -- apps/web/src/routes/_authenticated/rooms/index.tsx shows only responsive layout changes (grid-cols-1 sm:flex, 44px min-h on inputs/selects, overflow-x-auto wrapping). Did not touch ROOM_TYPES or ROOM_TYPE_LABELS or hasActiveFilters logic. Phase 09 commit landed cleanly on top of the 5378ec0 fix.
  timestamp: 2026-04-26T00:11:00Z

- hypothesis: "Some other admin/rooms surface in the codebase still uses English enum values"
  evidence: Grep for `REGULAR|COMPUTER_LAB|SCIENCE_LAB|MUSIC|ART|WORKSHOP` across apps/web/src returned zero room-related matches (the four hits were unrelated `PARTIAL` import-status strings in apps/web/src/components/import/). No orphaned English RoomType references anywhere.
  timestamp: 2026-04-26T00:12:00Z

## Evidence

- timestamp: 2026-04-02T00:01:00Z
  checked: Frontend ROOM_TYPES values in apps/web/src/routes/_authenticated/rooms/index.tsx (lines 38-47)
  found: Frontend uses English enum values: REGULAR, COMPUTER_LAB, SCIENCE_LAB, GYM, MUSIC, ART, WORKSHOP
  implication: These values are sent as ?roomType= query parameter to the backend API

- timestamp: 2026-04-02T00:02:00Z
  checked: Backend RoomTypeDto enum in apps/api/src/modules/room/dto/create-room.dto.ts (lines 3-10)
  found: Backend enum uses German values: KLASSENZIMMER, TURNSAAL, EDV_RAUM, WERKRAUM, LABOR, MUSIKRAUM
  implication: Frontend values (REGULAR etc) do NOT match backend enum values (KLASSENZIMMER etc)

- timestamp: 2026-04-02T00:03:00Z
  checked: Prisma schema enum RoomType in apps/api/prisma/schema.prisma (lines 619-626)
  found: Prisma enum matches backend DTO: KLASSENZIMMER, TURNSAAL, EDV_RAUM, WERKRAUM, LABOR, MUSIKRAUM
  implication: Database stores German enum values, confirming the mismatch is frontend vs backend+DB

- timestamp: 2026-04-02T00:04:00Z
  checked: Backend RoomAvailabilityQueryDto validation in apps/api/src/modules/room/dto/room-availability.dto.ts (lines 10-11)
  found: roomType field has @IsOptional() @IsEnum(RoomTypeDto) validation
  implication: Sending roomType=REGULAR fails @IsEnum validation because REGULAR is not in RoomTypeDto

- timestamp: 2026-04-02T00:05:00Z
  checked: Global validation pipe in apps/api/src/common/pipes/validation.pipe.ts
  found: ValidationPipe with whitelist:true, forbidNonWhitelisted:true, transform:true, errorHttpStatusCode: 422
  implication: Invalid roomType value causes 422 Unprocessable Entity response, frontend shows error state or empty grid

- timestamp: 2026-04-02T00:06:00Z
  checked: Frontend empty state logic in apps/web/src/routes/_authenticated/rooms/index.tsx (lines 165, 271-282)
  found: hasRooms = slots.length > 0; empty state shows when !isLoading && !isError && !hasRooms with message "Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen."
  implication: When equipment filter returns 0 results (no rooms match the equipment), same empty state shows as when no rooms exist at all - misleading message

- timestamp: 2026-04-02T00:07:00Z
  checked: RoomAvailabilityGrid ROOM_TYPE_LABELS in apps/web/src/components/rooms/RoomAvailabilityGrid.tsx (lines 49-57)
  found: Labels use English keys (REGULAR, COMPUTER_LAB, etc.) but actual data from DB has German keys (KLASSENZIMMER, EDV_RAUM, etc.)
  implication: Room type labels in grid rows would fall back to raw enum value (e.g., showing "KLASSENZIMMER" instead of "Klasse")

- timestamp: 2026-04-02T00:08:00Z
  checked: Frontend ROOM_TYPES has entries not in backend enum
  found: Frontend has SCIENCE_LAB, ART which don't exist in backend. Backend has LABOR (mapped to SCIENCE_LAB?) and MUSIKRAUM but not ART or WORKSHOP in same naming.
  implication: Not just a naming mismatch - there are values in the frontend that have no backend equivalent (SCIENCE_LAB, ART) and backend values missing from frontend display (none are mapped correctly)

- timestamp: 2026-04-26T00:08:00Z
  checked: git log --follow --since="2026-04-02" apps/web/src/routes/_authenticated/rooms/index.tsx
  found: Two commits since the diagnosis: (1) 5378ec0 "fix(04-14): align room type enums with backend and fix empty state differentiation" on 2026-04-02 13:38:54 (~1 hour after the morning diagnosis); (2) fc833ec "feat(09-01): responsive fixes for admin, excuses, statistics, rooms, settings" on 2026-04-09 (responsive layout only, not touching the enum or empty-state logic).
  implication: Bug 1 + Bug 2 fix shipped on the same day as the diagnosis. Subsequent Phase 09 work didn't regress.

- timestamp: 2026-04-26T00:09:00Z
  checked: git show 5378ec0 -- apps/web/src/routes/_authenticated/rooms/index.tsx apps/web/src/components/rooms/RoomAvailabilityGrid.tsx
  found: Commit body says exactly the two fixes proposed by this diagnosis: "Replace English enum values (REGULAR, COMPUTER_LAB) with German RoomTypeDto values (KLASSENZIMMER, EDV_RAUM); Remove ART/Kunstraum entry not present in backend RoomTypeDto; Add filter-aware empty state: 'Keine passenden Raeume' vs 'Keine Raeume angelegt'; Align ROOM_TYPE_LABELS keys to match German enum values." Diff shows: ROOM_TYPES rebuilt with 6 German entries (matching RoomTypeDto exactly), ROOM_TYPE_LABELS rebuilt with 6 German keys, hasActiveFilters derived as `roomType !== '__all__' || minCapacity !== '' || equipment !== ''`, empty-state Card title and body branch on hasActiveFilters.
  implication: All proposed fixes from the original diagnosis are present in 5378ec0. Identical to the recommended approach in this session's mode block (LAYER A + LAYER B).

- timestamp: 2026-04-26T00:10:00Z
  checked: apps/web/src/routes/_authenticated/rooms/index.tsx (current Phase 14 state, full read)
  found: Lines 38-46 declare ROOM_TYPES = [{value:'',label:'Alle Raumtypen'}, {KLASSENZIMMER,'Klassenzimmer'}, {EDV_RAUM,'EDV-Raum'}, {LABOR,'Labor'}, {TURNSAAL,'Turnsaal'}, {MUSIKRAUM,'Musikraum'}, {WERKRAUM,'Werkraum'}] — exactly matching backend RoomTypeDto + Prisma RoomType. Line 164 declares hasActiveFilters; lines 269-284 branch the empty-state Card on hasActiveFilters with the correct German copy on both branches.
  implication: Fixed state confirmed in the file as of 2026-04-26.

- timestamp: 2026-04-26T00:10:30Z
  checked: apps/web/src/components/rooms/RoomAvailabilityGrid.tsx (current Phase 14 state, full read)
  found: Lines 49-56 declare ROOM_TYPE_LABELS = {KLASSENZIMMER:'Klasse', EDV_RAUM:'EDV', LABOR:'Labor', TURNSAAL:'Turnsaal', MUSIKRAUM:'Musik', WERKRAUM:'Werkstatt'} — keyed on the German enum values from RoomTypeDto. Line 173 renders `ROOM_TYPE_LABELS[roomType] ?? roomType` so any unmapped value falls back gracefully (defensive default).
  implication: Fixed state confirmed in the file as of 2026-04-26.

- timestamp: 2026-04-26T00:11:00Z
  checked: apps/api/src/modules/room/dto/create-room.dto.ts + apps/api/prisma/schema.prisma
  found: Backend RoomTypeDto unchanged: KLASSENZIMMER, TURNSAAL, EDV_RAUM, WERKRAUM, LABOR, MUSIKRAUM. Prisma RoomType enum unchanged with the same six values. Backend remains the source of truth that the frontend now correctly aligns to.
  implication: No drift since 2026-04-02. The fix is stable.

- timestamp: 2026-04-26T00:12:00Z
  checked: packages/shared/src/ for any RoomType enum or schema
  found: Grep for RoomType in packages/shared returned no matches. The DayOfWeekType / RoomAvailabilitySlot types are exported from shared, but no shared RoomType enum exists.
  implication: The fix-as-shipped uses a per-page const-as-enum pattern (with a code comment cross-referencing the backend RoomTypeDto). Extracting a shared RoomType enum would be a future hardening — out of scope for this housekeeping session per the mode strict-scope directive.

- timestamp: 2026-04-26T00:12:30Z
  checked: apps/web/e2e/ for rooms specs
  found: apps/web/e2e/rooms-booking.spec.ts and apps/web/e2e/rooms-booking.mobile.spec.ts exist (Phase 10.5 booking-conflict coverage). Neither covers the room-type filter regression. apps/web/src/**/rooms*.test.{ts,tsx} returned zero matches (no unit/component test for the rooms page).
  implication: No automated regression guard for the 5378ec0 fix. Mirror the pattern from missing-raeume-perspective + dnd-constraint-validation: surface as a backlog hardening item but do NOT add tests in this housekeeping session per strict-scope (no edits beyond docs when the fix is already in tree).

## Resolution

root_cause: |
  TWO ROOT CAUSES, both shipped together in commit 5378ec0:

  1. **Room Type Filter (Bug 1):** Complete enum value mismatch between frontend and backend.
     Frontend ROOM_TYPES used English values (REGULAR, COMPUTER_LAB, SCIENCE_LAB, GYM, MUSIC, ART, WORKSHOP).
     Backend RoomTypeDto/Prisma enum uses German values (KLASSENZIMMER, TURNSAAL, EDV_RAUM, WERKRAUM, LABOR, MUSIKRAUM).
     When a room type was selected, the frontend sent e.g. roomType=REGULAR to the API.
     The backend @IsEnum(RoomTypeDto) validation rejected it because REGULAR is not in RoomTypeDto.
     This caused a 422 validation error, breaking the grid entirely.
     Additionally, the grid component's ROOM_TYPE_LABELS map (also using English keys) didn't match the German values coming from the database, so labels would have fallen back to raw enum strings.

  2. **Equipment Filter (Bug 2):** The empty-state message did not distinguish between "no rooms exist" and "no rooms match current filters."
     When equipment filter produced 0 results (rooms exist but none match), the page showed
     "Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen." which misleadingly suggested no rooms exist.
     The condition `!isLoading && !isError && !hasRooms` treated "zero results from filter" identically to "no rooms in the system."

fix: |
  Both fixes were applied by commit 5378ec0 "fix(04-14): align room type enums with backend and fix empty state differentiation" on 2026-04-02 13:38:54 +0200 — the same day this diagnosis was written (~1 hour later). The debug file was not updated at the time.

  FIX 1 (applied): apps/web/src/routes/_authenticated/rooms/index.tsx lines 38-46
    ROOM_TYPES rebuilt with 6 German enum entries matching backend RoomTypeDto exactly:
    [{value:'__all__',label:'Alle Raumtypen'}, {KLASSENZIMMER,'Klassenzimmer'}, {EDV_RAUM,'EDV-Raum'},
     {LABOR,'Labor'}, {TURNSAAL,'Turnsaal'}, {MUSIKRAUM,'Musikraum'}, {WERKRAUM,'Werkraum'}].
    The orphan ART/Kunstraum entry was removed because it has no backend equivalent.
    A code comment "values match backend RoomTypeDto enum" was added as cross-reference to source of truth.

  FIX 2a (applied): apps/web/src/components/rooms/RoomAvailabilityGrid.tsx lines 49-56
    ROOM_TYPE_LABELS rebuilt to be keyed on the same German enum values:
    {KLASSENZIMMER:'Klasse', EDV_RAUM:'EDV', LABOR:'Labor', TURNSAAL:'Turnsaal',
     MUSIKRAUM:'Musik', WERKRAUM:'Werkstatt'}.
    Comment "keys match backend RoomTypeDto enum" added.

  FIX 2b (applied): apps/web/src/routes/_authenticated/rooms/index.tsx line 164 + 269-284
    Derived `hasActiveFilters = roomType !== '__all__' || minCapacity !== '' || equipment !== ''`.
    Empty-state Card now branches both title AND body copy on hasActiveFilters:
      title: "Keine passenden Raeume" vs "Keine Raeume angelegt"
      body:  "Keine Raeume entsprechen den aktuellen Filterkriterien. Passen Sie die Filter an oder setzen Sie sie zurueck."
        vs:  "Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen."
    No new state variable — derivation is from existing filter state. Mirrors the silent-4xx invariant pattern: no toast on legitimate empty state, but copy guides the user toward recoverable action.

  Re-verification on 2026-04-26 (Phase 14, post-Phase 14 reaping):
  - Read both files in current state — both match the 5378ec0 fix verbatim
  - Backend RoomTypeDto + Prisma RoomType enum unchanged since 2026-04-02
  - Phase 09 responsive commit (fc833ec) touched layout but NOT the enum or empty-state logic
  - Grep for orphan English RoomType references across apps/web/src — zero hits
  - packages/shared has no RoomType enum (per-page const-as-enum is the current architectural target)

  COVERAGE GAP (not blocking, follow-up — same shape as missing-raeume-perspective):
  - apps/web/e2e/ has no spec covering the rooms availability filter (the two existing rooms specs cover booking-conflict only)
  - apps/web/src has no unit/component test for the rooms page
  - Per user E2E-first directive (memory: feedback_e2e_first_no_uat), this should be addressed in a future plan task. Not blocking resolution because the fix has been in production code for 24 days across 13 phases without regression complaints.

  ARCHITECTURAL HARDENING (deferred, surfaced for backlog):
  - Extract a shared RoomType enum to packages/shared/ following the AUSTRIAN_STUNDENTAFELN precedent from Phase 11. Frontend would import the shared enum instead of redeclaring as a const literal. Out of scope for this housekeeping session per strict-scope directive — extracting just for symmetry would be churn until there's a second consumer (e.g., the mobile app's room picker) that needs it.

verification: |
  Re-verified 2026-04-26T00:10:00Z against current Phase 14 code.

  - Code-level: Both proposed fixes are present in their cited files. ROOM_TYPES (rooms/index.tsx L38-46), ROOM_TYPE_LABELS (RoomAvailabilityGrid.tsx L49-56), hasActiveFilters (rooms/index.tsx L164), filter-aware empty state (rooms/index.tsx L269-284). Backend RoomTypeDto + Prisma RoomType enum still match.
  - History: 24 days and 13 phases since commit 5378ec0 without regression reports. Phase 09 responsive commit (fc833ec) preserved the fix.
  - Orphan check: grep for English RoomType values across apps/web/src — zero hits in rooms-related code.
  - Sister packages: packages/shared has no RoomType enum to keep in sync (no-op for shared-source-of-truth concerns).
  - E2E coverage: documented as follow-up gap (no rooms-filter spec exists).

files_changed:
  - apps/web/src/routes/_authenticated/rooms/index.tsx (FIX 1 + FIX 2b, applied 2026-04-02 in commit 5378ec0)
  - apps/web/src/components/rooms/RoomAvailabilityGrid.tsx (FIX 2a, applied 2026-04-02 in commit 5378ec0)
