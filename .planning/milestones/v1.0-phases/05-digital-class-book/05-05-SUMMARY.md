---
phase: 05-digital-class-book
plan: 05
subsystem: api
tags: [casl, websocket, socket.io, permissions, real-time, nestjs]

# Dependency graph
requires:
  - phase: 05-02
    provides: "AttendanceService with bulkUpdateAttendance and setAllPresent methods"
  - phase: 05-03
    provides: "GradeService for grade domain, shared classbook types"
  - phase: 05-04
    provides: "ExcuseService with reviewExcuse method, excuse workflow"
provides:
  - "CASL permission seeds for classbook, grade, student-note, excuse subjects across all 5 roles"
  - "ClassBookEventsGateway with 4 real-time event emitters on /classbook namespace"
  - "AttendanceService emits classbook:attendance-updated on bulk save and setAllPresent"
  - "ExcuseService emits classbook:excuse-updated after review"
affects: [05-06, 05-07, 05-08, 05-09, 05-10]

# Tech tracking
tech-stack:
  added: []
  patterns: ["WebSocket gateway per domain namespace (classbook, timetable)"]

key-files:
  created:
    - "apps/api/src/modules/classbook/classbook-events.gateway.ts"
  modified:
    - "apps/api/prisma/seed.ts"
    - "apps/api/src/modules/classbook/classbook.module.ts"
    - "apps/api/src/modules/classbook/attendance.service.ts"
    - "apps/api/src/modules/classbook/excuse.service.ts"

key-decisions:
  - "Admin manage:all already covers classbook subjects -- no explicit admin entries needed"
  - "Teacher name resolved via Person lookup for WebSocket event payloads"

patterns-established:
  - "Per-domain WebSocket namespace pattern: /classbook mirrors /timetable gateway structure"
  - "Gateway injected via DI into services that emit events after mutations"

requirements-completed: [BOOK-01, BOOK-03, BOOK-04, BOOK-06]

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 5 Plan 05: CASL Permissions & WebSocket Gateway Summary

**CASL permission seeds for 4 classbook subjects across 5 roles + ClassBookEventsGateway with real-time Socket.IO events for attendance, grades, excuses, and entry updates**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T20:40:58Z
- **Completed:** 2026-04-03T20:46:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- CASL permission seeds added for grade, student-note, and excuse subjects across schulleitung, lehrer, eltern, and schueler roles with appropriate conditions
- ClassBookEventsGateway created with /classbook WebSocket namespace and 4 event emitters (attendance-updated, grade-added, excuse-updated, entry-updated)
- AttendanceService integrated with gateway -- emits after bulkUpdateAttendance and setAllPresent with teacher name and change count
- ExcuseService integrated with gateway -- emits after reviewExcuse with excuse status for parent notification

## Task Commits

Each task was committed atomically:

1. **Task 1: CASL permission seeds for classbook domain** - `3374b5a` (feat)
2. **Task 2: ClassBookEventsGateway + service integration** - `0c6c85a` (feat)

## Files Created/Modified
- `apps/api/prisma/seed.ts` - Added Phase 5 CASL permissions for grade, student-note, excuse subjects to 4 roles
- `apps/api/src/modules/classbook/classbook-events.gateway.ts` - New Socket.IO gateway for /classbook namespace with 4 event emitters
- `apps/api/src/modules/classbook/classbook.module.ts` - Registered ClassBookEventsGateway as provider and export
- `apps/api/src/modules/classbook/attendance.service.ts` - Injected gateway, emits attendance-updated after bulk save and setAllPresent
- `apps/api/src/modules/classbook/excuse.service.ts` - Injected gateway, emits excuse-updated after review

## Decisions Made
- Admin role already has `manage:all` which covers all subjects -- no explicit classbook permissions added for admin
- Teacher name resolved from Person table via keycloakUserId lookup for WebSocket event payload (consistent with getOrCreateEntryByTimetableLesson pattern)
- Gateway exported from ClassBookModule for potential cross-module consumption

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all gateway methods are fully wired to service mutations.

## Next Phase Readiness
- Backend integration layer complete: CASL permissions enforce role-based access, WebSocket events push real-time updates
- Frontend can now consume classbook APIs with proper authorization and receive live updates
- Ready for Plan 06+ frontend implementation of classbook UI

---
*Phase: 05-digital-class-book*
*Completed: 2026-04-03*
