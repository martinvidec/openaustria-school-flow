---
phase: 03-timetable-solver-engine
plan: 05
subsystem: api
tags: [nestjs, bullmq, timefold, solver, timetable, prisma, websocket]

requires:
  - phase: 03-01
    provides: "Prisma schema (Room, TimetableRun, TimetableLesson, ConstraintTemplate), BullMQ SOLVER_QUEUE"
  - phase: 03-02
    provides: "Timefold sidecar REST API (POST /solve, GET /status, DELETE /terminate)"
  - phase: 03-04
    provides: "ConstraintTemplateService with findActive, constraint weight DTOs"
provides:
  - "TimetableService for full solve run lifecycle management"
  - "SolverInputService for Prisma data aggregation into solver payload"
  - "SolverClientService HTTP client for Timefold sidecar communication"
  - "SolveProcessor BullMQ worker for async solve job processing"
  - "REST API for solve operations (start, list runs, stop, activate)"
  - "Internal callback endpoints for sidecar progress/completion updates"
affects: [03-06, 04-timetable-ui]

tech-stack:
  added: []
  patterns:
    - "BullMQ SolveProcessor extending WorkerHost for async solve jobs"
    - "Dual controller pattern: admin-facing (JWT) + internal callbacks (shared secret)"
    - "SolverPayload interface as contract between NestJS and Timefold sidecar"
    - "Constraint template translation in SolverInputService (BLOCK_TIMESLOT, NO_LESSONS_AFTER, SUBJECT_MORNING)"

key-files:
  created:
    - "apps/api/src/modules/timetable/solver-input.service.ts"
    - "apps/api/src/modules/timetable/solver-client.service.ts"
    - "apps/api/src/modules/timetable/timetable.service.ts"
    - "apps/api/src/modules/timetable/timetable.controller.ts"
    - "apps/api/src/modules/timetable/processors/solve.processor.ts"
    - "apps/api/src/modules/timetable/dto/solve-progress.dto.ts"
    - "apps/api/src/modules/timetable/dto/solve-result.dto.ts"
    - "apps/api/src/modules/timetable/dto/solve-request.dto.ts"
    - "apps/api/src/modules/timetable/dto/timetable-run-response.dto.ts"
    - "apps/api/src/modules/timetable/timetable.service.spec.ts"
  modified:
    - "apps/api/src/modules/timetable/timetable.module.ts"

key-decisions:
  - "Dual controller pattern: TimetableController (JWT-protected admin) + SolverCallbackController (@Public with X-Solver-Secret)"
  - "Prisma.InputJsonValue cast pattern for JSON fields (consistent with existing DSGVO services)"
  - "SolvedLessonDto includes dayOfWeek/periodNumber/weekType directly from sidecar (not parsed from timeslotId)"
  - "ClassSubject teacherId not yet in schema - lessons use empty teacherId placeholder for solver prototype"

patterns-established:
  - "SolverPayload interface as the single source of truth for NestJS-to-sidecar communication"
  - "Internal callback endpoints pattern: @Public() + shared secret header validation"
  - "Run limit enforcement via post-creation cleanup (D-11: max 3 runs per school)"

requirements-completed: [TIME-06]

duration: 6min
completed: 2026-03-30
---

# Phase 03 Plan 05: NestJS Solver Orchestration Summary

**NestJS orchestration layer bridging admin solve requests to Timefold sidecar via BullMQ, with input aggregation, lifecycle management, and internal callback endpoints**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-30T18:14:08Z
- **Completed:** 2026-03-30T18:20:39Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- SolverInputService aggregates all Prisma entities (Teachers, Classes, Subjects, Rooms, TimeGrid, AvailabilityRules, ConstraintTemplates) into a single SolverPayload for the Timefold sidecar
- TimetableService manages full run lifecycle (QUEUED -> SOLVING -> COMPLETED/STOPPED/FAILED) with D-11 enforcement (max 3 runs per school)
- BullMQ SolveProcessor dispatches solve jobs asynchronously to the Timefold sidecar with callback URL
- Internal callback endpoints (@Public with shared secret) receive progress updates and completion results from sidecar

## Task Commits

Each task was committed atomically:

1. **Task 1: Create solver input aggregation, HTTP client, and DTOs** - `5fe21b5` (feat)
2. **Task 2: Create BullMQ processor, TimetableService, controller, and tests** - `b5332c6` (feat)

## Files Created/Modified
- `apps/api/src/modules/timetable/solver-input.service.ts` - Aggregates all Prisma entities into SolverPayload; handles A/B week duplication and constraint template translation
- `apps/api/src/modules/timetable/solver-client.service.ts` - HTTP client for Timefold sidecar (submit, status, terminate) with X-Solver-Secret auth
- `apps/api/src/modules/timetable/timetable.service.ts` - Solve run lifecycle: start, progress, completion, stop, activate, 3-run limit
- `apps/api/src/modules/timetable/timetable.controller.ts` - Admin endpoints (solve, runs, stop, activate) + internal callback controller
- `apps/api/src/modules/timetable/processors/solve.processor.ts` - BullMQ processor extending WorkerHost for SOLVER_QUEUE
- `apps/api/src/modules/timetable/dto/solve-progress.dto.ts` - ViolationGroupDto, ScoreHistoryEntryDto, SolveProgressDto
- `apps/api/src/modules/timetable/dto/solve-result.dto.ts` - SolvedLessonDto, SolveResultDto
- `apps/api/src/modules/timetable/dto/solve-request.dto.ts` - StartSolveDto with maxSolveSeconds and constraintWeights
- `apps/api/src/modules/timetable/dto/timetable-run-response.dto.ts` - TimetableRunResponseDto for API responses
- `apps/api/src/modules/timetable/timetable.service.spec.ts` - 11 unit tests covering all service methods
- `apps/api/src/modules/timetable/timetable.module.ts` - Updated with all new providers and controllers

## Decisions Made
- Dual controller pattern: TimetableController for admin (JWT-protected) and SolverCallbackController for sidecar callbacks (@Public with X-Solver-Secret header validation)
- SolvedLessonDto includes dayOfWeek, periodNumber, weekType directly from sidecar response (rather than parsing from timeslotId)
- Prisma.InputJsonValue cast pattern for JSON fields, consistent with existing DSGVO service codebase patterns
- ClassSubject does not have a direct teacherId field in schema -- solver lessons use empty string as placeholder until teacher assignment is added

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed InputJsonValue import from Prisma 7 generated client**
- **Found during:** Task 2 (TimetableService creation)
- **Issue:** Plan referenced `InputJsonValue` as a direct export from generated client, but Prisma 7 exports it as `Prisma.InputJsonValue` namespace member
- **Fix:** Changed import to `import { Prisma } from '../../config/database/generated/client.js'` and used `Prisma.InputJsonValue`, consistent with existing codebase pattern
- **Files modified:** apps/api/src/modules/timetable/timetable.service.ts
- **Verification:** tsc --noEmit passes
- **Committed in:** b5332c6 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor import fix. No scope creep.

## Issues Encountered
None beyond the Prisma import deviation.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- TimetableService is exported from TimetableModule, ready for Plan 06's WebSocket gateway to inject and broadcast progress
- Internal callback endpoints are the integration point for sidecar -> NestJS data flow
- SolverPayload interface defines the contract for data sent to the Timefold sidecar

---
*Phase: 03-timetable-solver-engine*
*Completed: 2026-03-30*
