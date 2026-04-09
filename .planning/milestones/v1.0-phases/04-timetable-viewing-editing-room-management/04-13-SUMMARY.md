---
phase: 04-timetable-viewing-editing-room-management
plan: 13
subsystem: ui
tags: [react, dnd-kit, fetch, api, drag-and-drop, fastify, tanstack-query]

# Dependency graph
requires:
  - phase: 04-timetable-viewing-editing-room-management
    provides: "DnD infrastructure (DraggableLesson, DroppableSlot, DragOverlay), timetable hooks, apiFetch"
provides:
  - "Working drag-and-drop lesson moves (3 root causes fixed)"
  - "Working resource/booking DELETE without Fastify 400 error"
  - "Room perspective selector showing Raeume group"
affects: [04-UAT, timetable-editing, room-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "apiFetch Content-Type conditional on body presence (not method)"
    - "Paginated API response unwrap pattern: json.data ?? json"
    - "pointerWithin collision detection for DnD (not closestCenter)"
    - "DraggableLesson opacity-only style (no CSS.Translate transform)"

key-files:
  created: []
  modified:
    - apps/web/src/lib/api.ts
    - apps/web/src/hooks/useTimetable.ts
    - apps/web/src/hooks/useTimetableEdit.ts
    - apps/web/src/routes/_authenticated/admin/timetable-edit.tsx
    - apps/web/src/components/dnd/DraggableLesson.tsx

key-decisions:
  - "Content-Type set only when body present, not on all non-GET methods"
  - "pointerWithin over closestCenter for pointer-accurate DnD collision detection"
  - "Remove CSS.Translate from DraggableLesson to prevent collision geometry confusion"

patterns-established:
  - "apiFetch body-conditional Content-Type: prevents Fastify FST_ERR_CTP_EMPTY_JSON_BODY on body-less DELETE/POST"
  - "Destructure URL params from request body: const { lessonId, ...moveBody } = dto for DTO whitelisting compatibility"

requirements-completed: [VIEW-01, VIEW-03, ROOM-04, ROOM-05, TIME-08]

# Metrics
duration: 1min
completed: 2026-04-02
---

# Phase 04 Plan 13: UAT Gap Closure Summary

**Fixed 5 frontend bugs blocking DnD lesson moves, resource DELETE, and room perspective selector**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-02T11:34:27Z
- **Completed:** 2026-04-02T11:35:30Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Fixed apiFetch setting Content-Type: application/json on body-less DELETE requests causing Fastify 400 errors
- Fixed useRooms returning raw paginated response instead of EntityOption[], restoring Raeume in admin perspective selector
- Fixed 3 DnD root causes: lessonId in PATCH body (422), closestCenter collision detection (wrong cell highlight), CSS.Translate transform (geometry confusion)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix apiFetch Content-Type and useRooms pagination unwrap** - `1fb7abf` (fix)
2. **Task 2: Fix drag-and-drop 3 root causes** - `de9ee2b` (fix)

## Files Created/Modified
- `apps/web/src/lib/api.ts` - Content-Type only set when body is present
- `apps/web/src/hooks/useTimetable.ts` - useRooms unwraps paginated response and maps to EntityOption[]
- `apps/web/src/hooks/useTimetableEdit.ts` - useMoveLesson destructures lessonId from body
- `apps/web/src/routes/_authenticated/admin/timetable-edit.tsx` - pointerWithin collision detection replaces closestCenter
- `apps/web/src/components/dnd/DraggableLesson.tsx` - Removed CSS.Translate transform, CSS import, and transform destructuring

## Decisions Made
- Content-Type set only when body present (not on all non-GET methods) -- prevents Fastify FST_ERR_CTP_EMPTY_JSON_BODY
- pointerWithin chosen over closestCenter -- uses pointer position directly instead of center-of-dragged-element math
- CSS.Translate transform completely removed from DraggableLesson -- DragOverlay provides the visual drag ghost

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all changes are bug fixes on existing functionality with no new stubs.

## Next Phase Readiness
- DnD lesson moves should now work end-to-end (unblocks 8+ UAT tests)
- Resource delete and room booking cancel no longer trigger Fastify 400 errors
- Room perspective selector now shows Raeume group in admin dropdown

## Self-Check: PASSED

All 5 modified files verified present. Both task commits (1fb7abf, de9ee2b) verified in git log.

---
*Phase: 04-timetable-viewing-editing-room-management*
*Completed: 2026-04-02*
