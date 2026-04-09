---
phase: 04-timetable-viewing-editing-room-management
plan: 12
subsystem: auth, api
tags: [casl, permissions, socket.io, fastify, websocket, seed-data]

# Dependency graph
requires:
  - phase: 01-project-scaffolding-auth
    provides: CASL permission system with DB-persisted permissions
  - phase: 03-timetable-solver-engine
    provides: Room model, room-booking model, Socket.IO gateways
provides:
  - Lehrer role can access room availability and booking endpoints without 403
  - Schulleitung role has full room/resource management permissions
  - Schueler and Eltern roles can read room data in timetable views
  - Socket.IO IoAdapter configured for Fastify HTTP server binding
affects: [04-timetable-viewing-editing-room-management]

# Tech tracking
tech-stack:
  added: []
  patterns: [IoAdapter explicit registration for Fastify+Socket.IO]

key-files:
  created: []
  modified:
    - apps/api/prisma/seed.ts
    - apps/api/src/main.ts

key-decisions:
  - "IoAdapter from @nestjs/platform-socket.io explicitly registered for Fastify compatibility"
  - "Lehrer gets read room + create/delete room-booking + read resource (no room CRUD)"
  - "Schulleitung gets manage-all for room, room-booking, and resource"
  - "Schueler and Eltern get read-only room permission for timetable display"

patterns-established:
  - "Phase 4 permission pattern: add role permissions to seed.ts arrays with phase comments"

requirements-completed: [ROOM-03, ROOM-04, ROOM-05, VIEW-04, VIEW-05, VIEW-06]

# Metrics
duration: 2min
completed: 2026-04-01
---

# Phase 04 Plan 12: Fix Room Booking Permissions and Socket.IO Fastify Adapter Summary

**Lehrer room-booking CASL permissions in seed data and Socket.IO IoAdapter for Fastify WebSocket binding**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T21:59:58Z
- **Completed:** 2026-04-01T22:01:44Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added room, room-booking, and resource permissions for Lehrer, Schulleitung, Eltern, and Schueler roles in seed data
- Configured Socket.IO IoAdapter explicitly for NestJS Fastify compatibility, enabling WebSocket gateway binding

## Task Commits

Each task was committed atomically:

1. **Task 1: Add room and resource permissions for Lehrer and Schulleitung roles in seed data** - `5d67c10` (feat)
2. **Task 2: Configure Socket.IO IoAdapter for NestJS Fastify compatibility** - `5f978f9` (feat)

## Files Created/Modified
- `apps/api/prisma/seed.ts` - Added Phase 4 room/room-booking/resource permissions for schulleitung (manage), lehrer (read/create/delete), eltern (read), schueler (read)
- `apps/api/src/main.ts` - Added IoAdapter import and useWebSocketAdapter call after enableCors, before useGlobalPipes

## Decisions Made
- Lehrer gets read on room (view availability), create/delete on room-booking (book/cancel own), read on resource -- no room CRUD authority
- Schulleitung gets manage-all on room, room-booking, and resource (full administrative control)
- Schueler and Eltern get read-only room permission for timetable room info display
- IoAdapter registered between enableCors and useGlobalPipes in bootstrap sequence for correct Fastify HTTP upgrade interception

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Pre-existing TypeScript error in timetable-export.service.ts (ICalWeekday type mismatch) -- not related to this plan's changes, out of scope

## User Setup Required

None - no external service configuration required. After re-running `pnpm prisma db seed`, the new permissions take effect.

## Next Phase Readiness
- Lehrer users can now access room availability and booking endpoints without 403
- Socket.IO WebSocket connections will bind correctly through Fastify for real-time timetable/room change propagation
- UAT Test 4 (real-time room booking) should now pass

## Self-Check: PASSED

- All modified files exist on disk
- Both task commits verified in git log
- SUMMARY.md created successfully

---
*Phase: 04-timetable-viewing-editing-room-management*
*Completed: 2026-04-01*
