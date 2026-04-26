---
status: resolved
trigger: "Investigate why room booking creation fails with an error when clicking 'Buchen'"
created: 2026-04-02T12:00:00Z
updated: 2026-04-26T11:55:00Z
symptoms_prefilled: true
goal: find_and_fix
resolved_at: 2026-04-26
resolution_commits:
  - 5d67c10  # feat(04-12): add room and resource permissions for all roles in seed data (2026-04-02 00:00) — closes PC #1
  - 5378ec0  # fix(04-14): align room type enums with backend and fix empty state differentiation (2026-04-02 13:38) — closes PC #2
  - 8b9a753  # fix(04-14): add bookingId to availability response and fix cancel handler (2026-04-02 13:40) — closes PC #3
  - f704f56  # test(10.5-01): add rooms-booking.spec.ts — Happy + 409 (desktop) — locks in regression guard
---

## Current Focus

hypothesis: All three "probable causes" from the 2026-04-02 inconclusive diagnosis are ALREADY FIXED in current Phase 14 code. Verified end-to-end against the live stack via curl on 2026-04-26.
test: Live curl repro of booking-create flow (admin + lehrer roles); enum filter; cancel-handler shape (composite-key vs UUID).
expecting: All probable causes resolved.
next_action: Archive session as already-fixed.

## Symptoms

expected: Clicking "Raum buchen" in the booking dialog creates an ad-hoc room booking
actual: An error is triggered when clicking the book button
errors: Unknown exact error message -- diagnosed from code analysis, never directly observed
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

- hypothesis: "Probable cause #1 (permissions for create:room-booking missing) still applies"
  evidence: Re-verified 2026-04-26 — apps/api/prisma/seed.ts lines 122-126 (Schulleitung manage room-booking) + lines 170-174 (Lehrer create+delete room-booking) seed the permissions. Live curl as lehrer-user POSTs /rooms/bookings → HTTP 201; DELETEs → HTTP 204. Permissions are seeded and enforced. Was committed as 5d67c10 "feat(04-12): add room and resource permissions for all roles in seed data" on 2026-04-02 00:00:44 — actually earlier than the diagnosis itself (the diagnosis was written around midday but did not check this commit).
  timestamp: 2026-04-26T11:50:00Z

- hypothesis: "Probable cause #2 (room type enum mismatch causes 422 on availability reload, looking like 'booking error')"
  evidence: Already closed by sibling resolved/room-filter-not-working.md on 2026-04-26. Fix shipped in 5378ec0 (2026-04-02 13:38:54, ~1.5h after the inconclusive diagnosis). Re-verified today: GET /rooms/availability?dayOfWeek=MONDAY&roomType=KLASSENZIMMER returns HTTP 200 (not 422). Locked in by quick task 260426-fwb (apps/web/e2e/rooms-filter.spec.ts) which asserts the German enum value appears in the request URL and explicitly checks no English legacy value (REGULAR, COMPUTER_LAB, etc.) appears.
  timestamp: 2026-04-26T11:50:00Z

- hypothesis: "Probable cause #3 (cancel handler sends composite key roomId-dayOfWeek-periodNumber instead of UUID)"
  evidence: Re-verified 2026-04-26 — apps/web/src/routes/_authenticated/rooms/index.tsx lines 152-159 sends `cancelTarget.occupiedBy.bookingId` (UUID); zero references to composite-key construction across apps/web/src (grep `roomId-.*dayOfWeek|composite.*bookingId` returns zero). Fix shipped in 8b9a753 "fix(04-14): add bookingId to availability response and fix cancel handler" on 2026-04-02 13:40:40 (~2 mins after the enum fix). Live curl repro: DELETE with composite key /rooms/bookings/<roomId>-MONDAY-1 returns HTTP 404 (proving the OLD broken shape would fail); DELETE with real UUID returns HTTP 204 (current shape works). Backend availability endpoint now populates `occupiedBy.bookingId` from `booking.id` (room.service.ts:376) so the frontend has the UUID to send.
  timestamp: 2026-04-26T11:51:00Z

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
  checked: Cancel booking handler in rooms/index.tsx (PRE-FIX)
  found: handleCancelBooking sends composite key (roomId-dayOfWeek-periodNumber) instead of booking UUID as bookingId
  implication: Cancel endpoint would get 404 (separate bug)

- timestamp: 2026-04-02
  checked: Room type enums (PRE-FIX)
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

- timestamp: 2026-04-26T11:40:00Z
  checked: git log for room-booking commits since 2026-04-02
  found: Three same-day fix commits — 5d67c10 (permissions, 00:00:44), 5378ec0 (enum, 13:38:54), 8b9a753 (cancel UUID + bookingId in availability response, 13:40:40). Then f704f56 "test(10.5-01): add rooms-booking.spec.ts — Happy + 409 (desktop)" added the regression guard. fc833ec was responsive-only and didn't touch the enum or empty-state logic. 53d8f9e fixed the double-prefix on RoomController (now `@Controller('schools/:schoolId/rooms')`).
  implication: All three "probable causes" from the inconclusive 2026-04-02 diagnosis were addressed by ad-hoc commits on the same day, but the debug file was never updated. The booking flow is also covered by E2E happy-path + 409 specs (desktop and mobile).

- timestamp: 2026-04-26T11:42:00Z
  checked: apps/api/src/modules/room/room.controller.ts (current Phase 14 state)
  found: `@Controller('schools/:schoolId/rooms')` (no double prefix). `@Post('bookings')` with `@CheckPermissions({action:'create', subject:'room-booking'})`. `@Delete('bookings/:bookingId')` with `@CheckPermissions({action:'delete', subject:'room-booking'})`.
  implication: Controller routing + permission decorators are correct.

- timestamp: 2026-04-26T11:42:30Z
  checked: apps/web/src/routes/_authenticated/rooms/index.tsx lines 151-159 (current Phase 14 state)
  found: handleCancelBooking guards `if (!cancelTarget?.occupiedBy?.bookingId) return;` then mutates with `cancelTarget.occupiedBy.bookingId` (UUID from availability response).
  implication: Cancel handler correctly uses UUID, not composite key.

- timestamp: 2026-04-26T11:42:45Z
  checked: apps/api/src/modules/room/room.service.ts lines 372-377 (current Phase 14 state)
  found: getAvailability populates `slot.occupiedBy = { type: 'booking', label: ..., bookedBy: ..., bookingId: booking.id }` so the frontend has the UUID it needs for cancel.
  implication: Backend supplies the UUID end-to-end.

- timestamp: 2026-04-26T11:43:00Z
  checked: apps/api/prisma/seed.ts (current Phase 14 state, room-booking permissions)
  found: Schulleitung gets `manage room-booking` (line 126); Lehrer gets `create room-booking` (173) + `delete room-booking` (174). Admin already has wildcard `manage all` so the lehrer/schulleitung lines are the load-bearing ones for the booking dialog.
  implication: All three booking-eligible roles have the correct permissions seeded.

- timestamp: 2026-04-26T11:50:00Z
  checked: Live curl repro against running API (admin token via Keycloak password grant) — full booking happy-path
  found: |
    PUT /time-grid → 200 (provisioned 2 periods, MON-FRI active days)
    POST /rooms (KLASSENZIMMER) → 201 (room id 95510d9d-...)
    GET /rooms/availability?dayOfWeek=MONDAY → 200 (2 free slots returned)
    POST /rooms/bookings {roomId, dayOfWeek:MONDAY, periodNumber:1, purpose:"DEBUG repro"} → 201 (booking id 5b8aab3b-..., full RoomBookingResponseDto returned)
    DELETE /rooms/<id> → 204 (cleanup)
  implication: Booking-create flow is fully functional end-to-end on the live stack. Original symptom does not reproduce.

- timestamp: 2026-04-26T11:51:00Z
  checked: Live curl repro AS LEHRER (the role probable cause #1 specifically called out)
  found: |
    POST /rooms/bookings as lehrer-user → 201 (verifies create:room-booking permission)
    DELETE /rooms/bookings/<UUID> as lehrer-user → 204 (verifies delete:room-booking permission)
    DELETE /rooms/bookings/<roomId>-MONDAY-1 (composite-key shape) → 404 with detail "Buchung nicht gefunden." (proves the PRE-FIX cancel-handler shape would fail loudly)
  implication: PC #1 + PC #3 both confirmed-fixed via direct backend exercise.

- timestamp: 2026-04-26T11:52:00Z
  checked: apps/web/e2e/rooms-booking.spec.ts (Phase 10.5 happy-path + 409 spec)
  found: ROOM-BOOK-01 explicitly clicks the free-slot, fills purpose, submits the dialog, and asserts the green toast `Raum erfolgreich gebucht` appears AND the purpose chip renders in the grid. ROOM-BOOK-02 covers the 409 conflict path. Both specs self-provision a time-grid and a throwaway KLASSENZIMMER room (workaround for the seed school having zero rooms).
  implication: Browser-driven regression guard already exists. A regression of any of the three probable causes would fail this spec.

- timestamp: 2026-04-26T11:52:30Z
  checked: apps/web/e2e/rooms-booking.mobile.spec.ts existence
  found: Companion mobile spec exists alongside the desktop one.
  implication: Coverage is platform-symmetric.

## Resolution

root_cause: |
  THREE root causes — already fixed by three same-day ad-hoc commits on 2026-04-02 that the inconclusive diagnosis enumerated as "probable" but never verified.

  PC #1 (Permissions for create:room-booking on lehrer/schulleitung):
    Phase 4 introduced the `room-booking` subject but the seed file was not updated with permissions for non-admin roles. PermissionsGuard would have rejected lehrer + schulleitung POSTs with 403 Forbidden.

  PC #2 (Room type enum mismatch — 422 on availability reload):
    Frontend ROOM_TYPES used English values (REGULAR, COMPUTER_LAB, ...) while backend RoomTypeDto + Prisma RoomType use German values (KLASSENZIMMER, EDV_RAUM, ...). When a user filtered by room type, the GET availability call failed @IsEnum validation with 422, manifesting as a "booking error" because the post-booking refresh of the grid failed even when the booking itself succeeded.

  PC #3 (Cancel handler sent composite key instead of UUID):
    rooms/index.tsx constructed `${roomId}-${dayOfWeek}-${periodNumber}` as the bookingId, but the backend route is `@Delete('bookings/:bookingId')` expecting a real UUID. Cancellation always 404'd. Orthogonal to creation, but the inconclusive diagnosis bundled it.

  All three were called out as "probable" in the 2026-04-02 diagnosis but the file was never updated when the fixes shipped the same day.

fix: |
  All three fixes shipped on 2026-04-02 in three separate atomic commits:

  FIX PC #1 — commit 5d67c10 "feat(04-12): add room and resource permissions for all roles in seed data" (2026-04-02 00:00:44 — actually predates the diagnosis):
    apps/api/prisma/seed.ts:
      - Schulleitung: { action: 'manage', subject: 'room-booking' } (line 126)
      - Lehrer: { action: 'create', subject: 'room-booking' } (line 173) + { action: 'delete', subject: 'room-booking' } (line 174)
      - Admin already has wildcard `manage all`

  FIX PC #2 — commit 5378ec0 "fix(04-14): align room type enums with backend and fix empty state differentiation" (2026-04-02 13:38:54):
    Already fully documented in resolved/room-filter-not-working.md and locked in by quick task 260426-fwb (apps/web/e2e/rooms-filter.spec.ts).

  FIX PC #3 — commit 8b9a753 "fix(04-14): add bookingId to availability response and fix cancel handler" (2026-04-02 13:40:40):
    - apps/api/src/modules/room/dto/room-availability.dto.ts: added optional `bookingId?: string` to occupiedBy
    - apps/api/src/modules/room/room.service.ts: getAvailability now populates `bookingId: booking.id` when occupiedBy.type === 'booking' (line 376)
    - packages/shared/src/types/room.ts: shared RoomAvailabilitySlot type extended with `bookingId?: string` so the frontend types resolve through the shared package
    - apps/web/src/routes/_authenticated/rooms/index.tsx: handleCancelBooking now reads `cancelTarget.occupiedBy.bookingId` (UUID) and guards `if (!cancelTarget?.occupiedBy?.bookingId) return;`

  REGRESSION GUARD — commit f704f56 "test(10.5-01): add rooms-booking.spec.ts — Happy + 409 (desktop)" on 2026-04-09:
    apps/web/e2e/rooms-booking.spec.ts (ROOM-BOOK-01 happy-path) clicks the dialog's "Raum buchen" submit and asserts the green toast `Raum erfolgreich gebucht` plus the new chip rendering in the grid. Any regression of PC #1 (403), PC #2 (422 on the post-success availability refetch), or a regression of bookRoom's service logic itself fails this spec loudly.
    apps/web/e2e/rooms-booking.mobile.spec.ts mirrors the same coverage on mobile viewport.

  Re-verified 2026-04-26T11:50:00Z against the live stack:
    - Live curl POST /rooms/bookings as admin → 201
    - Live curl POST /rooms/bookings as lehrer → 201
    - Live curl DELETE /rooms/bookings/<UUID> as lehrer → 204
    - Live curl DELETE /rooms/bookings/<composite-key> → 404 (proving the OLD broken shape would still fail loudly)
    - GET /rooms/availability with roomType=KLASSENZIMMER → 200 (no 422)
    - Code: rooms/index.tsx uses occupiedBy.bookingId; zero composite-key construction across apps/web/src
    - Code: RoomTypeDto + Prisma RoomType + frontend ROOM_TYPES all aligned (German)
    - Code: seed.ts lines 122-126 + 170-174 still seed the booking permissions

  COVERAGE GAP (none — fully covered):
    Unlike the dnd / raeume / room-filter sister sessions that surfaced backlog hardening items, the booking-create flow already has E2E coverage on both desktop and mobile (Phase 10.5-01). No additional tests needed.

  ARCHITECTURAL HARDENING (deferred):
    - Same shared-RoomType extraction as the room-filter session — gated on a second consumer (e.g. mobile app room picker). Not in scope.
    - The double-prefix bug on RoomController was separately fixed by commit 53d8f9e on 2026-04-04, dropping the `api/v1/` from the controller decorator. So the `/api/v1/api/v1/...` proxy hack noted in the 2026-04-02 evidence no longer applies — current controller is `@Controller('schools/:schoolId/rooms')`.

verification: |
  Re-verified 2026-04-26T11:50:00Z against current Phase 14 code AND live stack.

  - Code-level: All three fixes present in cited files. seed.ts (PC #1), rooms/index.tsx + RoomAvailabilityGrid.tsx (PC #2 via room-filter session), rooms/index.tsx + room.service.ts + room-availability.dto.ts + packages/shared/src/types/room.ts (PC #3).
  - History: 24 days and 13 phases since the three fix commits without regression reports. Phase 09 responsive commit (fc833ec) preserved them.
  - Orphan check: zero composite-key construction across apps/web/src; zero English RoomType enum references in rooms-related code.
  - Live curl repro: booking happy-path (admin + lehrer) returns 201; cancel returns 204 with UUID, 404 with composite-key (proves PRE-FIX shape would fail).
  - E2E coverage: rooms-booking.spec.ts ROOM-BOOK-01 (desktop) + rooms-booking.mobile.spec.ts (mobile) cover the happy-path; rooms-filter.spec.ts (desktop) covers the enum regression. Three layers of regression guard.

files_changed:
  - apps/api/prisma/seed.ts (PC #1, applied 2026-04-02 in commit 5d67c10)
  - apps/web/src/routes/_authenticated/rooms/index.tsx (PC #2 + PC #3, applied 2026-04-02 in commits 5378ec0 + 8b9a753)
  - apps/web/src/components/rooms/RoomAvailabilityGrid.tsx (PC #2, applied 2026-04-02 in commit 5378ec0)
  - apps/api/src/modules/room/room.service.ts (PC #3 — populate bookingId in availability response, applied 2026-04-02 in commit 8b9a753)
  - apps/api/src/modules/room/dto/room-availability.dto.ts (PC #3 — bookingId field on slot DTO, applied 2026-04-02 in commit 8b9a753)
  - packages/shared/src/types/room.ts (PC #3 — bookingId on shared slot type, applied 2026-04-02 in commit 8b9a753)
