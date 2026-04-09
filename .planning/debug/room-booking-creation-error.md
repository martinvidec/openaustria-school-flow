---
status: diagnosed
trigger: "Investigate why room booking creation fails with an error when clicking 'Buchen'"
created: 2026-04-02T12:00:00Z
updated: 2026-04-02T12:30:00Z
---

## Current Focus

hypothesis: Multiple code-level issues combine to cause booking creation failure
test: Traced full request chain from frontend click to backend Prisma create
expecting: Identify mismatch between frontend payload and backend expectations
next_action: Report diagnosis

## Symptoms

expected: Clicking "Raum buchen" in the booking dialog creates an ad-hoc room booking
actual: An error is triggered when clicking the book button
errors: Unknown exact error message -- diagnosed from code analysis
reproduction: Open room booking dialog on free slot -> fill optional purpose -> click "Raum buchen"
started: Unknown

## Eliminated

- hypothesis: Route mismatch (POST not matching controller)
  evidence: Double-prefix proxy rewrite matches the controller's double-prefix route pattern; GET availability uses same pattern and works
  timestamp: 2026-04-02

- hypothesis: Auth/permissions blocking the request
  evidence: Seed data includes create:room-booking for admin, schulleitung, lehrer roles; if GET availability works, JWT auth is functional
  timestamp: 2026-04-02

- hypothesis: Missing database table (room_bookings)
  evidence: Availability endpoint queries room_bookings successfully (grid renders); table must exist via prisma db push
  timestamp: 2026-04-02

- hypothesis: JSON body not forwarded through Vite proxy
  evidence: Vite proxy (http-proxy) forwards POST bodies by default; no body-consuming middleware in dev server
  timestamp: 2026-04-02

- hypothesis: Malformed cancel route (@Delete missing slash)
  evidence: Actually verified @Delete('bookings/:bookingId') has correct slash; cancel is separate from create anyway
  timestamp: 2026-04-02

- hypothesis: Content-Type not set for POST
  evidence: apiFetch explicitly sets Content-Type: application/json for non-GET requests
  timestamp: 2026-04-02

- hypothesis: periodNumber type issue (string vs number)
  evidence: JSON.parse produces number; class-transformer with enableImplicitConversion preserves number; @IsInt() passes for integer values
  timestamp: 2026-04-02

## Evidence

- timestamp: 2026-04-02
  checked: Frontend RoomBookingDialog.tsx handleSubmit
  found: Sends {roomId, dayOfWeek, periodNumber, purpose} to onBook callback
  implication: Frontend payload matches CreateRoomBookingRequest type

- timestamp: 2026-04-02
  checked: useRoomAvailability.ts useBookRoom mutation
  found: POSTs to /api/v1/schools/${schoolId}/rooms/bookings with JSON body; error handler reads error.detail from ProblemDetail response
  implication: API call construction is correct

- timestamp: 2026-04-02
  checked: Vite proxy config (vite.config.ts)
  found: Proxy rewrites /api/v1/schools/UUID/(rooms|...) to /api/v1/api/v1/... to compensate for double-prefix bug in Phase 3/4 controllers
  implication: Routing works for both GET and POST through proxy

- timestamp: 2026-04-02
  checked: RoomController @Post('bookings') endpoint
  found: Uses @CheckPermissions({action:'create', subject:'room-booking'}), @Body() CreateRoomBookingDto, @CurrentUser() user
  implication: Endpoint is correctly defined

- timestamp: 2026-04-02
  checked: CreateRoomBookingDto validation decorators
  found: @IsUUID() roomId, @IsEnum(DayOfWeekDto) dayOfWeek, @IsInt() @Min(1) periodNumber, @IsOptional @IsString weekType, @IsOptional @IsString @MaxLength(255) purpose
  implication: Validation should pass for well-formed requests

- timestamp: 2026-04-02
  checked: RoomService.bookRoom() method
  found: Verifies room belongs to school, checks booking conflicts, checks lesson conflicts, creates booking via Prisma, emits WebSocket event
  implication: Service logic is sound

- timestamp: 2026-04-02
  checked: Cancel booking handler in rooms/index.tsx
  found: handleCancelBooking sends composite key (roomId-dayOfWeek-periodNumber) instead of booking UUID as bookingId
  implication: Cancel endpoint would get 404 (separate bug)

- timestamp: 2026-04-02
  checked: Room type enums
  found: Frontend uses REGULAR/COMPUTER_LAB/GYM/etc; Backend CreateRoomDto uses KLASSENZIMMER/TURNSAAL/EDV_RAUM/etc; RoomAvailabilityQueryDto validates against backend enum
  implication: Room type filter causes 422 validation error when any specific type is selected (separate bug)

- timestamp: 2026-04-02
  checked: Double API prefix
  found: Controller @Controller('api/v1/schools/:schoolId/rooms') + global prefix api/v1 = double prefix; works in dev via proxy workaround
  implication: Would break in production without proxy

- timestamp: 2026-04-02
  checked: Prisma schema room_bookings
  found: @@unique([roomId, dayOfWeek, periodNumber, weekType]) constraint exists; weekType defaults to 'BOTH'
  implication: Duplicate bookings correctly prevented at DB level

## Resolution

root_cause: |
  After exhaustive code analysis, the booking creation flow is logically correct in isolation.
  The most probable causes for runtime failure are:

  1. PERMISSION CHECK FAILURE: If the database permissions were not freshly seeded after Phase 4
     additions, the 'create:room-booking' permission may not exist in the permissions table,
     causing PermissionsGuard to throw 403 Forbidden.

  2. ROOM TYPE ENUM MISMATCH: If the room type filter is active (not "Alle Raumtypen"), the
     frontend sends values like "REGULAR" which fail @IsEnum(RoomTypeDto) validation. While
     this affects availability, not booking directly, a 422 error on the availability reload
     after booking could appear as the "booking error."

  3. CANCEL ENDPOINT BUG (composite key vs UUID): The cancel handler sends a composite
     key "roomId-dayOfWeek-periodNumber" where the backend expects a UUID bookingId. This
     is a definite bug but for cancellation, not creation.

fix: See detailed fix list in files_changed
verification: Requires runtime testing
files_changed:
  - apps/api/src/modules/room/room.controller.ts (double prefix)
  - apps/web/src/routes/_authenticated/rooms/index.tsx (cancel composite key bug)
  - apps/web/src/components/rooms/RoomAvailabilityGrid.tsx (room type labels)
  - apps/web/src/routes/_authenticated/rooms/index.tsx (room type filter values)
  - apps/api/src/modules/room/dto/create-room.dto.ts (room type enum)
  - apps/api/prisma/seed.ts (ensure Phase 4 permissions seeded)
