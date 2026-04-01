---
phase: 04-timetable-viewing-editing-room-management
plan: 11
subsystem: api, ui
tags: [class-validator, dto, dnd-kit, error-handling, defensive-coding]

# Dependency graph
requires:
  - phase: 04-timetable-viewing-editing-room-management
    provides: DnD editing infrastructure (Plan 06), constraint validation hook (Plan 07)
provides:
  - Relaxed DTO validation accepting any non-empty string IDs (not just UUIDs)
  - Graceful error handling for failed validate-move responses
  - Defensive null checks preventing TypeError crashes on validationResult
affects: [timetable-editing, uat-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [defensive-optional-chaining, fallback-validation-response, res-ok-guard]

key-files:
  created: []
  modified:
    - apps/api/src/modules/timetable/dto/validate-move.dto.ts
    - apps/api/src/modules/timetable/dto/move-lesson.dto.ts
    - apps/web/src/hooks/useDragConstraints.ts
    - apps/web/src/routes/_authenticated/admin/timetable-edit.tsx

key-decisions:
  - "@IsString @IsNotEmpty replaces @IsUUID for lessonId -- Prisma findUnique handles invalid IDs gracefully"
  - "Fallback MoveValidation objects with hardViolations instead of null on error -- prevents downstream TypeError"

patterns-established:
  - "res.ok guard pattern: always check response status before parsing JSON from apiFetch"
  - "Fallback validation objects: return typed error results instead of null/undefined for constraint validation"

requirements-completed: [TIME-08, VIEW-04]

# Metrics
duration: 2min
completed: 2026-04-02
---

# Phase 04 Plan 11: Fix DnD Move Crash Summary

**Fixed three cascading bugs in drag-and-drop lesson move: relaxed @IsUUID DTO validation, added res.ok error handling, and defensive null checks on validationResult**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-01T21:59:53Z
- **Completed:** 2026-04-01T22:01:27Z
- **Tasks:** 1
- **Files modified:** 4

## Accomplishments
- Backend DTOs now accept any non-empty string as lessonId/targetRoomId (not just strict UUIDs), preventing 422 rejections on seed data
- Frontend useDragConstraints hook gracefully handles non-200 responses with typed fallback MoveValidation objects showing German-language error descriptions
- timetable-edit.tsx uses defensive optional chaining on hardViolations/softWarnings, eliminating TypeError crashes when validationResult has unexpected shape

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix backend DTO validation and frontend error handling for validate-move** - `979a638` (fix)

## Files Created/Modified
- `apps/api/src/modules/timetable/dto/validate-move.dto.ts` - Replaced @IsUUID with @IsString/@IsNotEmpty on lessonId, @IsString on targetRoomId
- `apps/api/src/modules/timetable/dto/move-lesson.dto.ts` - Replaced @IsUUID with @IsString on targetRoomId
- `apps/web/src/hooks/useDragConstraints.ts` - Added res.ok check, server_error fallback, network_error fallback (no more null on failure)
- `apps/web/src/routes/_authenticated/admin/timetable-edit.tsx` - Defensive null checks on hardViolations/softWarnings in handleDragEnd and ConstraintFeedback rendering

## Decisions Made
- Replaced @IsUUID with @IsString + @IsNotEmpty for lessonId because seed data and manual inserts may use non-UUID string IDs; Prisma findUnique returns null for invalid IDs which the service already handles
- Used typed fallback MoveValidation objects (with hardViolations array) instead of null for error cases, ensuring downstream code always has a consistent shape to work with

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- DnD lesson move flow is now crash-free for UAT testing
- validate-move endpoint accepts seed-generated string IDs without rejection
- Error states display German-language feedback to users instead of silent failures

---
*Phase: 04-timetable-viewing-editing-room-management*
*Completed: 2026-04-02*
