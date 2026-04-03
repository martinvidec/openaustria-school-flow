---
phase: 05-digital-class-book
plan: 01
subsystem: database
tags: [prisma, typescript, classbook, attendance, grades, excuse]

# Dependency graph
requires:
  - phase: 02-school-data-model-dsgvo
    provides: "Person, Teacher, Student, Parent, SchoolClass, ClassSubject models"
  - phase: 04-timetable-viewing-editing-room-management
    provides: "TimetableLesson model, Wave 0 test stub pattern"
provides:
  - "7 new Prisma models for digital class book domain"
  - "4 new enums: AttendanceStatus, GradeCategory, ExcuseStatus, ExcuseReason"
  - "klassenvorstandId FK on SchoolClass for excuse review workflow"
  - "Shared TypeScript types for classbook DTOs and WebSocket events"
  - "Wave 0 test stubs for BOOK-01 through BOOK-07"
affects: [05-02, 05-03, 05-04, 05-05, 05-06, 05-07, 05-08, 05-09, 05-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "ClassBookEntry keyed by classSubjectId+date+periodNumber+weekType (stable across re-solves)"
    - "No FK from ClassBookEntry to TimetableLesson (decoupled from solver lifecycle)"
    - "GradeWeight hierarchy: school default (classSubjectId=null) vs teacher override"
    - "Wave 0 it.todo() stubs for all BOOK requirements"

key-files:
  created:
    - packages/shared/src/types/classbook.ts
    - apps/api/src/modules/classbook/__tests__/attendance.service.spec.ts
    - apps/api/src/modules/classbook/__tests__/grade.service.spec.ts
    - apps/api/src/modules/classbook/__tests__/grade-average.util.spec.ts
    - apps/api/src/modules/classbook/__tests__/excuse.service.spec.ts
    - apps/api/src/modules/classbook/__tests__/statistics.service.spec.ts
    - apps/web/src/components/classbook/__tests__/AttendanceGrid.test.tsx
    - apps/web/src/components/classbook/__tests__/ExcuseForm.test.tsx
  modified:
    - apps/api/prisma/schema.prisma
    - packages/shared/src/index.ts

key-decisions:
  - "ClassBookEntry uses classSubjectId without FK to avoid cascade issues with timetable re-solves"
  - "klassenvorstandId on SchoolClass enables Klassenvorstand-based excuse review workflow"
  - "GradeWeight unique constraint on [schoolId, classSubjectId] supports school defaults and teacher overrides"

patterns-established:
  - "Classbook models decoupled from TimetableLesson -- identified by classSubjectId+date+period"
  - "Wave 0 test stubs cover all BOOK requirements before implementation"

requirements-completed: [BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06]

# Metrics
duration: 2min
completed: 2026-04-03
---

# Phase 5 Plan 1: Schema & Types Foundation Summary

**Prisma schema with 7 classbook models (attendance, grades, excuses, notes), shared TypeScript DTOs, and Wave 0 test stubs for all BOOK requirements**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-03T08:41:19Z
- **Completed:** 2026-04-03T08:44:14Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Extended Prisma schema with ClassBookEntry, AttendanceRecord, GradeEntry, GradeWeight, StudentNote, AbsenceExcuse, ExcuseAttachment models
- Added klassenvorstandId FK on SchoolClass for Austrian school hierarchy (excuse review by Klassenvorstand)
- Created comprehensive shared TypeScript types for all classbook DTOs, WebSocket events, and utility types
- Established Wave 0 test coverage with 7 test stub files covering BOOK-01 through BOOK-07

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema extension -- 7 new models, 4 enums, klassenvorstandId FK** - `e6767fb` (feat)
2. **Task 2: Shared TypeScript types for classbook domain + Wave 0 test stubs** - `3bbfd12` (feat)

## Files Created/Modified
- `apps/api/prisma/schema.prisma` - 7 new models, 4 new enums, SchoolClass+Teacher modifications
- `packages/shared/src/types/classbook.ts` - All classbook DTOs, enum types, WebSocket event interfaces
- `packages/shared/src/index.ts` - Added classbook export barrel
- `apps/api/src/modules/classbook/__tests__/attendance.service.spec.ts` - 7 todo stubs for BOOK-01
- `apps/api/src/modules/classbook/__tests__/grade.service.spec.ts` - 9 todo stubs for BOOK-03
- `apps/api/src/modules/classbook/__tests__/grade-average.util.spec.ts` - 8 todo stubs for grade formatting
- `apps/api/src/modules/classbook/__tests__/excuse.service.spec.ts` - 8 todo stubs for BOOK-06
- `apps/api/src/modules/classbook/__tests__/statistics.service.spec.ts` - 5 todo stubs for BOOK-05
- `apps/web/src/components/classbook/__tests__/AttendanceGrid.test.tsx` - 5 todo stubs for BOOK-01/07
- `apps/web/src/components/classbook/__tests__/ExcuseForm.test.tsx` - 5 todo stubs for BOOK-06

## Decisions Made
- ClassBookEntry uses classSubjectId without FK to avoid cascade issues with timetable re-solves (Pitfall 1 from RESEARCH.md)
- klassenvorstandId on SchoolClass enables Klassenvorstand-based excuse review workflow (Pattern 7 from RESEARCH.md)
- GradeWeight unique constraint on [schoolId, classSubjectId] supports school defaults (null classSubjectId) and per-subject teacher overrides

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - this plan intentionally creates Wave 0 test stubs (it.todo pattern). All stubs are test scaffolding, not application code stubs.

## Next Phase Readiness
- Schema foundation ready for all Phase 5 plans (02-10)
- Shared types available for frontend and backend consumption
- Wave 0 test stubs ready to be implemented as services are built
- klassenvorstandId FK ready for excuse review workflow in Plan 06

## Self-Check: PASSED

All 10 created files verified on disk. Both commit hashes (e6767fb, 3bbfd12) verified in git log.

---
*Phase: 05-digital-class-book*
*Completed: 2026-04-03*
