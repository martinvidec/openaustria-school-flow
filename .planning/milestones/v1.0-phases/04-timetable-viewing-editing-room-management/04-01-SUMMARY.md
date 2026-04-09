---
phase: 04-timetable-viewing-editing-room-management
plan: 01
subsystem: database
tags: [prisma, typescript, timetable, room-booking, resources, shared-types]

# Dependency graph
requires:
  - phase: 03-timetable-solver-engine
    provides: "TimetableLesson, TimetableRun, Room models, DayOfWeek enum"
provides:
  - "TimetableLessonEdit model for persistent edit history with revert capability"
  - "RoomBooking model for ad-hoc room bookings with unique constraint"
  - "Resource and ResourceBooking models for independent resource management"
  - "isManualEdit, editedBy, editedAt fields on TimetableLesson"
  - "Shared TypeScript types: TimetableViewLesson, MoveValidation, TimetableLessonEditRecord"
  - "Shared TypeScript types: RoomBookingDto, ResourceDto, RoomAvailabilitySlot"
  - "SUBJECT_PALETTE (15 WCAG AA color pairs) and getSubjectColor hash function"
  - "TimetableChangedEvent WebSocket payload type"
affects: [04-02, 04-03, 04-04, 04-05, 04-06, 04-07, 04-08]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma models without foreign relations for audit/history tables (TimetableLessonEdit stores IDs without FK constraints for flexibility)"
    - "Deterministic color hashing via charCode-based hash modulo palette length"
    - "Shared types mirror Prisma model shapes but use string dates for JSON serialization"

key-files:
  created:
    - packages/shared/src/types/timetable.ts
    - packages/shared/src/types/room.ts
  modified:
    - apps/api/prisma/schema.prisma
    - packages/shared/src/index.ts

key-decisions:
  - "Used db push instead of migrate dev due to existing Phase 3 drift -- consistent with Phase 3 approach"
  - "TimetableLessonEdit stores lessonId and runId without FK constraints for audit flexibility and to avoid cascade deletion of history"
  - "15-color WCAG AA palette (not 10) to provide sufficient distinct colors for school subject counts"

patterns-established:
  - "Shared type files per domain: types/timetable.ts for schedule-related, types/room.ts for room/resource-related"
  - "Const assertion arrays with readonly for compile-time immutable palette data"

requirements-completed: [TIME-08, ROOM-03, ROOM-04, ROOM-05]

# Metrics
duration: 3min
completed: 2026-03-31
---

# Phase 4 Plan 01: Schema & Shared Types Summary

**Extended Prisma schema with 4 new models (TimetableLessonEdit, RoomBooking, Resource, ResourceBooking) and shared TypeScript types for timetable views, room booking, and resource management**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-31T14:18:30Z
- **Completed:** 2026-03-31T14:21:19Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Extended TimetableLesson with isManualEdit, editedBy, editedAt for manual edit tracking (D-09)
- Added TimetableLessonEdit model for persistent edit history with revert capability (D-10)
- Added RoomBooking model with unique constraint on room+day+period+weekType for ad-hoc booking (ROOM-03)
- Added Resource and ResourceBooking models for independent resource management (ROOM-04)
- Created comprehensive shared types: 12 interfaces, 1 type alias, 1 const palette, 1 utility function
- All types importable from @schoolflow/shared by both API and web workspaces

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with TimetableLesson fields and 4 new models** - `d0b0dc6` (feat)
2. **Task 2: Create shared TypeScript types for timetable views, room booking, and resources** - `b4d4216` (feat)

## Files Created/Modified
- `apps/api/prisma/schema.prisma` - Extended TimetableLesson + 4 new models (TimetableLessonEdit, RoomBooking, Resource, ResourceBooking)
- `packages/shared/src/types/timetable.ts` - TimetableViewLesson, MoveValidation, TimetableLessonEditRecord, SubjectColorPair, SUBJECT_PALETTE, getSubjectColor, TimetableChangedEvent
- `packages/shared/src/types/room.ts` - RoomBookingDto, RoomAvailabilitySlot, ResourceDto, ResourceBookingDto, CreateRoomBookingRequest, CreateResourceBookingRequest, UpsertResourceRequest
- `packages/shared/src/index.ts` - Added timetable and room type barrel exports

## Decisions Made
- Used `prisma db push` instead of `prisma migrate dev` due to existing Phase 3 database drift (Phase 3 also used db push, no migration file exists for Phase 3 changes)
- TimetableLessonEdit model stores lessonId and runId as plain strings without foreign key constraints -- this preserves edit history even if the referenced lesson is deleted (audit trail preservation)
- 15 WCAG AA-compliant color pairs in SUBJECT_PALETTE (exceeding the D-06 minimum of 10-15) to ensure sufficient distinct colors for large subject catalogs

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used db push instead of migrate dev for schema sync**
- **Found during:** Task 1 (Prisma migration)
- **Issue:** Database had drift from Phase 3 which applied schema changes via `db push` without migration files. `prisma migrate dev` required a database reset to resolve drift.
- **Fix:** Used `prisma db push` to sync schema (consistent with Phase 3 approach) instead of `prisma migrate dev`
- **Files modified:** Database schema only (no migration file created)
- **Verification:** `prisma validate` and `prisma generate` both succeeded
- **Committed in:** d0b0dc6 (part of task commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Migration file not created in apps/api/prisma/migrations/ as specified in acceptance criteria, but schema is valid and synced. This is consistent with the Phase 3 pattern already established in the project.

## Issues Encountered
None beyond the migration drift documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Schema layer complete -- all 4 new models and TimetableLesson extensions ready for API endpoint implementation (Plan 04-02)
- Shared types exported from @schoolflow/shared -- ready for consumption by both API DTOs (Plan 04-02) and frontend components (Plan 04-03+)
- SUBJECT_PALETTE and getSubjectColor ready for timetable grid rendering (Plan 04-04)

## Self-Check: PASSED

All files verified present, all commits verified in git log.

---
*Phase: 04-timetable-viewing-editing-room-management*
*Completed: 2026-03-31*
