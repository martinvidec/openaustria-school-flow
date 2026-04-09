---
phase: 08-homework-exams-data-import
plan: 02
subsystem: api, testing
tags: [nestjs, prisma, vitest, homework, exam, notification, collision-detection, crud]

# Dependency graph
requires:
  - phase: 08-homework-exams-data-import
    plan: 01
    provides: "Homework/Exam Prisma models, shared DTOs, Wave 0 test stubs"
  - phase: 06-substitution-planning
    provides: "NotificationService, SubstitutionModule exports"
provides:
  - "HomeworkService with CRUD + HOMEWORK_ASSIGNED notification side-effect"
  - "ExamService with CRUD + collision detection (D-03 soft warning) + EXAM_SCHEDULED notifications"
  - "HomeworkController at /schools/:schoolId/homework"
  - "ExamController at /schools/:schoolId/exams with collision-check endpoint"
  - "HomeworkModule registered in AppModule, exports HomeworkService + ExamService"
  - "7 DTOs: CreateHomework, UpdateHomework, CreateExam, UpdateExam, HomeworkResponse, ExamResponse, ExamCollisionResponse"
affects: [08-04, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [TDD RED-GREEN for service implementation, post-create notification side-effect, soft collision warning at API level]

key-files:
  created:
    - apps/api/src/modules/homework/homework.service.ts
    - apps/api/src/modules/homework/exam.service.ts
    - apps/api/src/modules/homework/homework.controller.ts
    - apps/api/src/modules/homework/exam.controller.ts
    - apps/api/src/modules/homework/homework.module.ts
    - apps/api/src/modules/homework/dto/create-homework.dto.ts
    - apps/api/src/modules/homework/dto/update-homework.dto.ts
    - apps/api/src/modules/homework/dto/create-exam.dto.ts
    - apps/api/src/modules/homework/dto/update-exam.dto.ts
    - apps/api/src/modules/homework/dto/homework-response.dto.ts
    - apps/api/src/modules/homework/dto/exam-response.dto.ts
    - apps/api/src/modules/homework/dto/exam-collision.dto.ts
  modified:
    - apps/api/src/modules/homework/__tests__/homework.service.spec.ts
    - apps/api/src/modules/homework/__tests__/exam.service.spec.ts
    - apps/api/src/app.module.ts
    - packages/shared/src/types/notification.ts

key-decisions:
  - "Shared NotificationType union extended with HOMEWORK_ASSIGNED and EXAM_SCHEDULED to match Prisma enum (Rule 3 auto-fix)"

patterns-established:
  - "Post-create notification side-effect: resolve class students + parents via Student/ParentStudent, exclude creating user, fire-and-forget"
  - "Exam collision as soft warning: checkCollision() before create, exam always created regardless, collision info returned alongside exam in response"

requirements-completed: [HW-01, HW-02, HW-03]

# Metrics
duration: 9min
completed: 2026-04-07
---

# Phase 8 Plan 02: Homework & Exam Backend Summary

**HomeworkService and ExamService with CRUD, exam collision detection (D-03 soft warning), HOMEWORK_ASSIGNED/EXAM_SCHEDULED notifications to class students and parents, and 20 passing tests**

## Performance

- **Duration:** 9 min
- **Started:** 2026-04-07T17:27:32Z
- **Completed:** 2026-04-07T17:36:32Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Implemented HomeworkService with full CRUD and HOMEWORK_ASSIGNED notification side-effect for class students and parents, with self-notification prevention for creating teacher
- Implemented ExamService with full CRUD, collision detection returning soft warning (D-03), and EXAM_SCHEDULED notifications to class members
- Created HomeworkController and ExamController with CheckPermissions CASL guards at /schools/:schoolId/homework and /schools/:schoolId/exams
- Registered HomeworkModule in AppModule with SubstitutionModule import for NotificationService, exports for CalendarService (Plan 04)
- Converted all 20 Wave 0 it.todo() test stubs to real passing tests covering CRUD, collision, and notification behavior

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): Failing tests + DTOs** - `7a7473a` (test)
2. **Task 1 (TDD GREEN): HomeworkService + ExamService** - `b081a35` (feat)
3. **Task 2: Controllers + Module + AppModule** - `b141421` (feat)

## Files Created/Modified
- `apps/api/src/modules/homework/homework.service.ts` - Homework CRUD with HOMEWORK_ASSIGNED notification side-effect
- `apps/api/src/modules/homework/exam.service.ts` - Exam CRUD with collision detection and EXAM_SCHEDULED notifications
- `apps/api/src/modules/homework/homework.controller.ts` - REST endpoints for homework CRUD with CheckPermissions
- `apps/api/src/modules/homework/exam.controller.ts` - REST endpoints for exam CRUD with collision-check endpoint
- `apps/api/src/modules/homework/homework.module.ts` - Module importing SubstitutionModule, exporting services
- `apps/api/src/modules/homework/dto/create-homework.dto.ts` - CreateHomeworkDto with class-validator
- `apps/api/src/modules/homework/dto/update-homework.dto.ts` - UpdateHomeworkDto (all optional)
- `apps/api/src/modules/homework/dto/create-exam.dto.ts` - CreateExamDto with forceCreate D-03 field
- `apps/api/src/modules/homework/dto/update-exam.dto.ts` - UpdateExamDto (all optional)
- `apps/api/src/modules/homework/dto/homework-response.dto.ts` - Response DTO matching HomeworkDto
- `apps/api/src/modules/homework/dto/exam-response.dto.ts` - Response DTO matching ExamDto
- `apps/api/src/modules/homework/dto/exam-collision.dto.ts` - ExamCollisionResponseDto
- `apps/api/src/modules/homework/__tests__/homework.service.spec.ts` - 9 real tests (converted from it.todo stubs)
- `apps/api/src/modules/homework/__tests__/exam.service.spec.ts` - 11 real tests (converted from it.todo stubs)
- `apps/api/src/app.module.ts` - HomeworkModule added to imports
- `packages/shared/src/types/notification.ts` - Added HOMEWORK_ASSIGNED and EXAM_SCHEDULED to NotificationType union

## Decisions Made
- Shared NotificationType union extended with HOMEWORK_ASSIGNED and EXAM_SCHEDULED to match Prisma enum (was missing from Plan 01, blocking build)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added HOMEWORK_ASSIGNED and EXAM_SCHEDULED to shared NotificationType union**
- **Found during:** Task 2 (build verification)
- **Issue:** `packages/shared/src/types/notification.ts` NotificationType union was missing HOMEWORK_ASSIGNED and EXAM_SCHEDULED variants added to Prisma enum in Plan 01. NestJS build failed with type error.
- **Fix:** Added both variants to the NotificationType union and rebuilt shared package.
- **Files modified:** packages/shared/src/types/notification.ts
- **Verification:** `pnpm nest build` exits 0 with 0 issues
- **Committed in:** b141421 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 3 blocking)
**Impact on plan:** Essential for correct TypeScript compilation. No scope creep.

## Known Stubs
None -- all it.todo() stubs converted to real passing tests.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- HomeworkService and ExamService exported from HomeworkModule for CalendarService consumption in Plan 04
- Exam collision-check endpoint available for frontend integration in Plan 06
- All 20 homework/exam tests passing, establishing test patterns for Plans 03-06
- Notification integration proven -- same pattern can be reused for import notifications

## Self-Check: PASSED

All 13 created files verified present. All 3 commits (7a7473a, b081a35, b141421) verified in git log.

---
*Phase: 08-homework-exams-data-import*
*Completed: 2026-04-07*
