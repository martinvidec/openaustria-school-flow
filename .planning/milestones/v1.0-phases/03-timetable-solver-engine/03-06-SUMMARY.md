---
phase: 03-timetable-solver-engine
plan: 06
subsystem: solver, api, websocket
tags: [socket.io, websocket, nestjs, timefold, score-analysis, real-time, constraint-violations]

# Dependency graph
requires:
  - phase: 03-02
    provides: "Timefold solver sidecar with SolverResource, SolutionManager, callback flow"
  - phase: 03-04
    provides: "TimetableConstraintConfiguration, configurable constraint weights"
  - phase: 03-05
    provides: "TimetableService, TimetableController, SolverCallbackController with internal callback endpoints"
provides:
  - "Socket.IO WebSocket gateway for real-time solve progress broadcasting"
  - "School-scoped WebSocket rooms via ?schoolId query param"
  - "GET /runs/:runId/violations endpoint for constraint conflict explanation"
  - "Human-readable entity reference examples in ViolationGroup"
  - "ScoreAnalysis tests validating teacher conflict, room conflict, and feasibility detection"
affects: [04-timetable-ui, frontend-websocket-integration]

# Tech tracking
tech-stack:
  added: ["@nestjs/websockets", "@nestjs/platform-socket.io", "socket.io"]
  patterns:
    - "Socket.IO namespace 'solver' with school-scoped rooms for multi-tenant broadcasting"
    - "Lightweight WebSocket completion event (scores only) with REST fetch for full data"
    - "SolutionManager.analyze() for constraint violation grouping with entity references"
    - "penalizeConfigurable() for all constraints (hard + soft) when @ConstraintConfiguration present"

key-files:
  created:
    - apps/api/src/modules/timetable/timetable.gateway.ts
    - apps/api/src/modules/timetable/timetable.gateway.spec.ts
    - apps/solver/src/test/java/at/schoolflow/solver/ScoreExplanationTest.java
  modified:
    - apps/api/src/modules/timetable/timetable.controller.ts
    - apps/api/src/modules/timetable/timetable.service.ts
    - apps/api/src/modules/timetable/timetable.module.ts
    - apps/api/package.json
    - apps/solver/src/main/java/at/schoolflow/solver/rest/SolverResource.java
    - apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java
    - apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java

key-decisions:
  - "Socket.IO with both websocket and polling transports for school network proxy compatibility (Pitfall 7)"
  - "Lightweight WebSocket completion event excludes lesson list (too large) -- client fetches via REST"
  - "Hard constraints registered in @ConstraintConfiguration with ONE_HARD weight for Timefold 1.32.0 compatibility"
  - "All constraints (hard + soft) now use penalizeConfigurable() with weights from @ConstraintConfiguration"

patterns-established:
  - "TimetableGateway as NestJS provider: inject into controllers, call emitProgress/emitComplete for broadcasting"
  - "School-scoped Socket.IO rooms: client connects with ?schoolId, joined to 'school:{id}' room"
  - "ViolationGroup examples populated from ScoreAnalysis match justifications (capped at 5 per constraint)"

requirements-completed: [TIME-06, TIME-07]

# Metrics
duration: 8min
completed: 2026-03-30
---

# Phase 3 Plan 6: WebSocket Progress Broadcasting and Conflict Explanation Summary

**Socket.IO gateway for real-time solve progress with school-scoped rooms, conflict explanation endpoint with grouped violations and entity references, and ScoreAnalysis tests for teacher/room conflicts**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-30T18:22:58Z
- **Completed:** 2026-03-30T18:30:58Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Created Socket.IO WebSocket gateway broadcasting solve progress and completion events to school-scoped rooms
- Added GET /runs/:runId/violations endpoint returning grouped constraint violations with human-readable entity references
- Created 3 ScoreExplanation JVM tests validating teacher conflict, room conflict, and feasibility detection via SolutionManager.analyze()
- Fixed pre-existing ConstraintConfiguration bug where hard constraints were not registered, causing all 30 existing solver tests to fail

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Socket.IO WebSocket gateway and wire into callback flow** - `fb96147` (feat)
2. **Task 2: Add conflict explanation endpoint and JVM-side ScoreAnalysis test** - `66cb463` (feat)

## Files Created/Modified
- `apps/api/src/modules/timetable/timetable.gateway.ts` - Socket.IO gateway with school-scoped rooms, emitProgress/emitComplete methods
- `apps/api/src/modules/timetable/timetable.gateway.spec.ts` - 5 unit tests for gateway connection, progress, completion, disconnect
- `apps/api/src/modules/timetable/timetable.controller.ts` - Added violations endpoint, injected gateway into SolverCallbackController
- `apps/api/src/modules/timetable/timetable.service.ts` - Added getViolations() reading JSON violations from TimetableRun
- `apps/api/src/modules/timetable/timetable.module.ts` - Added TimetableGateway to providers and exports
- `apps/api/package.json` - Added @nestjs/websockets, @nestjs/platform-socket.io, socket.io
- `apps/solver/src/main/java/.../rest/SolverResource.java` - Enhanced buildViolationGroups with entity reference examples
- `apps/solver/src/main/java/.../domain/TimetableConstraintConfiguration.java` - Added 6 hard constraint @ConstraintWeight entries
- `apps/solver/src/main/java/.../constraints/TimetableConstraintProvider.java` - Migrated hard constraints to penalizeConfigurable()
- `apps/solver/src/test/java/.../ScoreExplanationTest.java` - 3 tests for ScoreAnalysis violation detection

## Decisions Made
- **Socket.IO with websocket + polling transports**: School networks behind proxies frequently block WebSocket upgrades (Pitfall 7 from research). The polling fallback ensures connectivity in restricted environments.
- **Lightweight WebSocket completion event**: The solve:complete event only sends runId, status, scores, and elapsed time. The full lesson list (potentially thousands of records) is fetched via REST GET /runs/:runId to avoid oversized WebSocket frames.
- **Hard constraints in @ConstraintConfiguration**: Timefold 1.32.0 requires ALL constraints defined in ConstraintProvider to have a @ConstraintWeight entry when @ConstraintConfiguration is present. Registered hard constraints with ONE_HARD weight and migrated to penalizeConfigurable().

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed pre-existing ConstraintConfiguration missing hard constraint registrations**
- **Found during:** Task 2 (running ScoreExplanationTest)
- **Issue:** TimetableConstraintConfiguration (from Plan 03-04) only registered 8 soft constraints but Timefold 1.32.0 requires ALL constraints (including 6 hard ones) to have @ConstraintWeight entries when @ConstraintConfiguration is present. All 30 existing solver tests and all 3 new tests failed with "constraintConfigurationClass does not support the following constraints".
- **Fix:** Added 6 hard constraint @ConstraintWeight entries (Teacher conflict, Room conflict, Teacher availability, Student group conflict, Room type requirement, Class timeslot restriction) with ONE_HARD weight. Migrated hard constraints from penalize(HardSoftScore.ONE_HARD) to penalizeConfigurable() for consistency.
- **Files modified:** TimetableConstraintConfiguration.java, TimetableConstraintProvider.java
- **Verification:** All 53 solver tests pass (30 pre-existing + 23 ConstraintTest + 3 new ScoreExplanation)
- **Committed in:** 66cb463 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Fix was essential for correctness -- without it, no solver tests could pass. The hard constraint weights remain fixed at ONE_HARD so solver behavior is unchanged.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 3 (timetable-solver-engine) is now complete with all 6 plans executed
- WebSocket gateway ready for frontend integration in Phase 4 (timetable UI)
- Constraint conflict explanation endpoint ready for admin UI display
- All solver constraints, weights, and analysis tested and working

## Self-Check: PASSED

All 4 created files verified present. Both task commits (fb96147, 66cb463) verified in git log.

---
*Phase: 03-timetable-solver-engine*
*Completed: 2026-03-30*
