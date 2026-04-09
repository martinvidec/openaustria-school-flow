---
status: diagnosed
trigger: "Investigate why the room type filter and equipment filter don't work on the room availability grid"
created: 2026-04-02T00:00:00Z
updated: 2026-04-02T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - Two distinct root causes found
test: Traced filter values from frontend through API to backend Prisma queries
expecting: N/A - investigation complete
next_action: Return diagnosis

## Symptoms

expected: Room type filter should filter rooms by type when a type is selected; Equipment filter should filter rooms by equipment
actual: Room type filter does not filter rooms; Equipment filter shows wrong empty-state message "Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen." (suggesting no rooms exist, but rooms ARE visible in the grid)
errors: No error messages - filters just don't work correctly. Equipment filter shows misleading empty state.
reproduction: Open room availability grid, try room type filter and equipment filter. Day filter and capacity filter work correctly.
started: Unknown

## Eliminated

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

## Resolution

root_cause: |
  TWO ROOT CAUSES:

  1. **Room Type Filter (Bug 1):** Complete enum value mismatch between frontend and backend.
     Frontend ROOM_TYPES uses English values (REGULAR, COMPUTER_LAB, SCIENCE_LAB, GYM, MUSIC, ART, WORKSHOP).
     Backend RoomTypeDto/Prisma enum uses German values (KLASSENZIMMER, TURNSAAL, EDV_RAUM, WERKRAUM, LABOR, MUSIKRAUM).
     When a room type is selected, the frontend sends e.g. roomType=REGULAR to the API.
     The backend @IsEnum(RoomTypeDto) validation rejects it because REGULAR is not in RoomTypeDto.
     This causes a 422 validation error, breaking the grid entirely.
     Additionally, the grid component's ROOM_TYPE_LABELS map (also using English keys) won't match the German values coming from the database.

  2. **Equipment Filter (Bug 2):** The empty-state message does not distinguish between "no rooms exist" and "no rooms match current filters."
     When equipment filter produces 0 results (rooms exist but none match), the page shows
     "Legen Sie Raeume an, um die Raumbelegung verwalten zu koennen." which misleadingly suggests no rooms exist.
     The condition on line 271 (!isLoading && !isError && !hasRooms) treats "zero results from filter" identically to "no rooms in the system."

fix:
verification:
files_changed: []
