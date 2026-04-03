---
phase: 05-digital-class-book
plan: 06
subsystem: ui
tags: [tanstack-query, socket.io, react, hooks, classbook, grades, excuses, formdata]

# Dependency graph
requires:
  - phase: 05-01
    provides: "Prisma schema (ClassBookEntry, AttendanceRecord, GradeEntry, StudentNote, AbsenceExcuse), classbook REST endpoints, shared types"
  - phase: 04-timetable-viewing-editing-room-management
    provides: "TanStack Query pattern (useTimetable.ts), Socket.IO hook pattern (useSocket.ts), socket factory (socket.ts), apiFetch utility, ClassBookHeader back-link target (/timetable)"
provides:
  - "TanStack Query hooks for all classbook API endpoints (useClassbook.ts, useGrades.ts, useExcuses.ts)"
  - "Query key factories for granular cache invalidation (classbookKeys, gradeKeys, excuseKeys)"
  - "useClassbookEntryByTimetableLesson hook for TimetableLesson ID resolution"
  - "Note CRUD hooks (useNotes, useCreateNote, useUpdateNote, useDeleteNote)"
  - "Socket.IO client for /classbook namespace with 4 event handlers"
  - "ClassBookHeader component with German lesson context display"
  - "FormData-safe apiFetch for file uploads"
affects: [05-07, 05-08, 05-09, 05-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Per-domain Socket.IO namespace pattern: /classbook mirrors /timetable"
    - "Query key factory pattern extended to classbook/grades/excuses"
    - "FormData detection in apiFetch for file upload Content-Type handling"

key-files:
  created:
    - apps/web/src/hooks/useClassbook.ts
    - apps/web/src/hooks/useGrades.ts
    - apps/web/src/hooks/useExcuses.ts
    - apps/web/src/hooks/useClassbookSocket.ts
    - apps/web/src/components/classbook/ClassBookHeader.tsx
  modified:
    - apps/web/src/lib/socket.ts
    - apps/web/src/lib/api.ts

key-decisions:
  - "apiFetch updated to skip Content-Type auto-set for FormData bodies (instanceof check)"
  - "useClassbookSocket mounted at page level (not authenticated layout) since classbook events are page-scoped"

patterns-established:
  - "Classbook query key factory: classbookKeys.all/entry/attendance/notes for hierarchical invalidation"
  - "Grade query key factory: gradeKeys.all/matrix/weights for hierarchical invalidation"
  - "Excuse query key factory: excuseKeys.all/list/detail/statistics for hierarchical invalidation"

requirements-completed: [BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-06]

# Metrics
duration: 5min
completed: 2026-04-03
---

# Phase 05 Plan 06: Frontend Data Layer Summary

**TanStack Query hooks for all classbook endpoints (attendance, grades, excuses, notes) with Socket.IO /classbook namespace client and ClassBookHeader component**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-03T20:48:01Z
- **Completed:** 2026-04-03T20:53:35Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- TanStack Query hooks for all classbook API endpoints with query key factories enabling granular cache invalidation
- useClassbookEntryByTimetableLesson hook resolves TimetableLesson IDs via backend by-timetable-lesson endpoint
- Note CRUD hooks (useNotes, useCreateNote, useUpdateNote, useDeleteNote) with proper cache invalidation
- Socket.IO client for /classbook namespace with 4 event handlers (attendance-updated, grade-added, excuse-updated, entry-updated)
- ClassBookHeader component with German lesson context display per UI-SPEC heading format
- apiFetch updated to handle FormData bodies correctly (skip Content-Type auto-set for file uploads)

## Task Commits

Each task was committed atomically:

1. **Task 1: TanStack Query hooks for classbook, grades, and excuses** - `c70c134` (feat)
2. **Task 2: ClassBook socket client + ClassBookHeader component** - `f863981` (feat)

## Files Created/Modified
- `apps/web/src/hooks/useClassbook.ts` - TanStack Query hooks for classbook entry, attendance, lesson content, notes CRUD with classbookKeys factory
- `apps/web/src/hooks/useGrades.ts` - TanStack Query hooks for grade matrix, grade CRUD, weight config with gradeKeys factory
- `apps/web/src/hooks/useExcuses.ts` - TanStack Query hooks for excuse CRUD, review, file upload, absence statistics with excuseKeys factory
- `apps/web/src/hooks/useClassbookSocket.ts` - Socket.IO event handler for /classbook namespace with TanStack Query cache invalidation
- `apps/web/src/lib/socket.ts` - Added createClassbookSocket/disconnectClassbookSocket for /classbook namespace
- `apps/web/src/lib/api.ts` - FormData instanceof check to skip Content-Type auto-set for file uploads
- `apps/web/src/components/classbook/ClassBookHeader.tsx` - Lesson context header with subject, class, teacher, period, German date, back-link

## Decisions Made
- **apiFetch FormData handling:** Updated apiFetch to detect FormData body via instanceof check and skip Content-Type auto-set. Browser must set multipart boundary for file uploads. This is a Rule 2 deviation (missing critical functionality for file upload correctness).
- **useClassbookSocket page-level mount:** Socket hook is designed for classbook page mount (not authenticated layout) since classbook events are only relevant when viewing classbook pages, unlike timetable socket which is global.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] apiFetch FormData Content-Type handling**
- **Found during:** Task 1 (useExcuses.ts file upload hook)
- **Issue:** apiFetch auto-sets Content-Type: application/json for all bodies, which breaks FormData multipart uploads (browser cannot set correct boundary)
- **Fix:** Added `!(options.body instanceof FormData)` check to skip Content-Type auto-set for FormData bodies
- **Files modified:** apps/web/src/lib/api.ts
- **Verification:** Vite build passes, FormData upload hook works without explicit Content-Type
- **Committed in:** c70c134 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for file upload correctness. No scope creep.

## Issues Encountered
- Pre-existing tsc build errors (import.meta.env type, CSS module import) unrelated to plan changes. Vite build succeeds (tsc errors are Vite-specific types not available to raw tsc). Accepted per plan acceptance criteria.

## Known Stubs
None - all hooks are complete implementations against backend API endpoints.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All classbook data hooks ready for UI component consumption (plans 05-07 through 05-10)
- Socket client ready for real-time classbook updates
- ClassBookHeader component ready for lesson detail page route

## Self-Check: PASSED

All 7 files verified present. Both task commits (c70c134, f863981) verified in git log.

---
*Phase: 05-digital-class-book*
*Completed: 2026-04-03*
