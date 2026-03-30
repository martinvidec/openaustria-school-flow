---
phase: 03-timetable-solver-engine
plan: 02
subsystem: solver
tags: [timefold, quarkus, java, constraint-solver, docker, rest-api, timetabling]

# Dependency graph
requires:
  - phase: 02-school-data-model-dsgvo
    provides: "Teacher availability rules, class/group structure, subject/ClassSubject models"
provides:
  - "Timefold 1.32.0 Quarkus sidecar with 4 hard constraints"
  - "REST API: POST /solve (async), GET /status, DELETE /terminate"
  - "Callback-based progress reporting with score analysis"
  - "Docker Compose solver service on port 8081"
  - "Domain model: Lesson, SolverTimeslot, SolverRoom, TeacherAvailability, SchoolTimetable"
affects: [03-timetable-solver-engine, 04-timetable-ui-management]

# Tech tracking
tech-stack:
  added: [timefold-solver-quarkus 1.32.0, quarkus 3.32.2, java 21, maven 3.9.9]
  patterns: [stateless-sidecar-with-callback, constraint-streams-api, constraint-verifier-testing]

key-files:
  created:
    - apps/solver/pom.xml
    - apps/solver/src/main/java/at/schoolflow/solver/domain/Lesson.java
    - apps/solver/src/main/java/at/schoolflow/solver/domain/SolverTimeslot.java
    - apps/solver/src/main/java/at/schoolflow/solver/domain/SolverRoom.java
    - apps/solver/src/main/java/at/schoolflow/solver/domain/TeacherAvailability.java
    - apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java
    - apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java
    - apps/solver/src/main/java/at/schoolflow/solver/rest/SolverResource.java
    - apps/solver/src/main/java/at/schoolflow/solver/rest/HealthResource.java
    - apps/solver/src/main/java/at/schoolflow/solver/dto/SolveRequest.java
    - apps/solver/src/main/java/at/schoolflow/solver/dto/SolveProgress.java
    - apps/solver/src/main/java/at/schoolflow/solver/dto/SolveResult.java
    - apps/solver/src/main/resources/application.properties
    - apps/solver/src/test/java/at/schoolflow/solver/SolverTest.java
    - apps/solver/Dockerfile
  modified:
    - docker/docker-compose.yml
    - .gitignore

key-decisions:
  - "Quarkus 3.32.2 (not 3.17 LTS) required for Timefold 1.32.0 compatibility -- Timefold build-parent pins quarkus 3.32.2"
  - "Anonymous @ValueRangeProvider (no id) for type-based matching -- explicit id not supported in Timefold 1.32.0 Quarkus build-time analysis"
  - "ConstraintVerifier for unit tests (not full SolverManager) -- fast deterministic constraint testing"
  - "Constraint methods made public for cross-package method reference in tests"
  - "JDK 21 Temurin installed to user-local directory for build (no system JDK 21 available)"

patterns-established:
  - "Stateless sidecar with callback: solver receives problem via REST, sends progress/completion to NestJS callback URL"
  - "ConstraintVerifier testing pattern: inject verifier, test individual constraints with given/penalizesBy"
  - "Score analysis via SolutionManager.analyze() for grouped violation reporting"
  - "ConcurrentHashMap for tracking in-flight solve operations (start times, callbacks, score history)"

requirements-completed: [TIME-01, ROOM-02]

# Metrics
duration: 24min
completed: 2026-03-30
---

# Phase 03 Plan 02: Timefold Quarkus Sidecar Summary

**Timefold 1.32.0 constraint solver sidecar with 4 hard constraints (teacher/room clash, availability, student groups), async REST API with callback pattern, and Docker Compose integration**

## Performance

- **Duration:** 24 min
- **Started:** 2026-03-30T16:57:27Z
- **Completed:** 2026-03-30T17:22:21Z
- **Tasks:** 2
- **Files modified:** 21

## Accomplishments
- Complete Quarkus 3.32.2 + Timefold 1.32.0 project with Maven wrapper and all domain classes
- 4 hard constraints implemented and verified: teacher conflict, room conflict, teacher availability windows, student group conflict (with disjoint group handling)
- 13 ConstraintVerifier unit tests covering all constraints including edge cases
- Async REST API with callback-based progress reporting and score analysis
- Docker image and Compose service definition ready for deployment

## Task Commits

Each task was committed atomically:

1. **Task 1: Scaffold Quarkus project with Timefold domain model and hard constraints** - `5baf5d2` (feat)
2. **Task 2: Create sidecar REST API and Docker Compose integration** - `a640647` (feat)

## Files Created/Modified
- `apps/solver/pom.xml` - Quarkus 3.32.2 + Timefold 1.32.0 Maven project
- `apps/solver/mvnw` + `.mvn/wrapper/` - Maven wrapper for reproducible builds
- `apps/solver/src/main/java/at/schoolflow/solver/domain/Lesson.java` - @PlanningEntity with teacher, room, timeslot
- `apps/solver/src/main/java/at/schoolflow/solver/domain/SolverTimeslot.java` - Problem fact with day, period, week type
- `apps/solver/src/main/java/at/schoolflow/solver/domain/SolverRoom.java` - Problem fact with type, capacity, equipment
- `apps/solver/src/main/java/at/schoolflow/solver/domain/TeacherAvailability.java` - Blocked slot problem fact
- `apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java` - @PlanningSolution combining all entities
- `apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java` - 4 hard constraints
- `apps/solver/src/main/java/at/schoolflow/solver/rest/SolverResource.java` - REST API with async solve, status, terminate
- `apps/solver/src/main/java/at/schoolflow/solver/rest/HealthResource.java` - Docker healthcheck endpoint
- `apps/solver/src/main/java/at/schoolflow/solver/dto/SolveRequest.java` - Solve request with problem and callback URL
- `apps/solver/src/main/java/at/schoolflow/solver/dto/SolveProgress.java` - Progress with violations and improvement rate
- `apps/solver/src/main/java/at/schoolflow/solver/dto/SolveResult.java` - Final result with solved lesson assignments
- `apps/solver/src/main/resources/application.properties` - Solver config (5min limit, port 8081)
- `apps/solver/src/test/java/at/schoolflow/solver/SolverTest.java` - 13 ConstraintVerifier tests
- `apps/solver/Dockerfile` - Multi-stage build with eclipse-temurin:21
- `docker/docker-compose.yml` - Added solver service with healthcheck
- `.gitignore` - Added target/ for Maven build output

## Decisions Made
- **Quarkus 3.32.2 instead of 3.17 LTS:** Timefold 1.32.0 was built against Quarkus 3.32.2 (verified from timefold-solver-build-parent POM). Using 3.17 LTS caused `NoClassDefFoundError: GeneratedClassGizmo2Adaptor` at build time. The plan specified 3.17 LTS, but version compatibility is a hard requirement.
- **Anonymous @ValueRangeProvider:** Removed explicit `id` attribute from `@ValueRangeProvider` annotations. Timefold 1.32.0's build-time analysis uses type-based matching; explicit IDs caused "no matching anonymous value range providers" error.
- **Public constraint methods:** Made constraint methods in TimetableConstraintProvider public (were package-private). Required for method reference access from test class in a different package.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Quarkus version upgraded from 3.17.8 to 3.32.2**
- **Found during:** Task 1 (test execution)
- **Issue:** Timefold 1.32.0 requires Quarkus 3.32.2 (from build-parent POM). Using 3.17 LTS caused `NoClassDefFoundError: io/quarkus/deployment/GeneratedClassGizmo2Adaptor`
- **Fix:** Changed `quarkus.platform.version` from 3.17.8 to 3.32.2 in pom.xml
- **Files modified:** apps/solver/pom.xml
- **Verification:** `./mvnw test` passes with 0 errors
- **Committed in:** 5baf5d2

**2. [Rule 1 - Bug] Constraint methods visibility changed to public**
- **Found during:** Task 1 (test compilation)
- **Issue:** Constraint methods were package-private, but test class in different package used method references (e.g., `TimetableConstraintProvider::teacherConflict`)
- **Fix:** Added `public` modifier to all 4 constraint methods
- **Files modified:** apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java
- **Verification:** Test compilation succeeds, all 13 tests pass
- **Committed in:** 5baf5d2

**3. [Rule 1 - Bug] Removed @ValueRangeProvider id attribute**
- **Found during:** Task 1 (test execution)
- **Issue:** Explicit `id` on `@ValueRangeProvider` caused "no matching anonymous value range providers" error in Timefold build-time analysis
- **Fix:** Changed `@ValueRangeProvider(id = "timeslotRange")` to `@ValueRangeProvider` (anonymous, type-based matching)
- **Files modified:** apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java
- **Verification:** Build-time validation passes, all tests pass
- **Committed in:** 5baf5d2

**4. [Rule 3 - Blocking] JDK 21 installed locally for builds**
- **Found during:** Task 1 (pre-build)
- **Issue:** Only JDK 11 installed system-wide; Quarkus 3.32 + Timefold 1.32 require JDK 17+
- **Fix:** Downloaded Temurin JDK 21 to `~/.jdk21/` (user-local, no sudo required)
- **Files modified:** None (local environment only)
- **Verification:** `java -version` shows 21.0.10

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 blocking)
**Impact on plan:** All deviations were necessary for correctness. Quarkus version change is the most significant -- 3.32.2 is newer than planned 3.17 LTS but required by Timefold 1.32.0. No scope creep.

## Issues Encountered
- None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. The solver runs as a standalone Docker service.

## Next Phase Readiness
- Solver sidecar ready for NestJS integration (Plan 03: Room CRUD, Plan 04: constraint weights, Plan 05: BullMQ orchestration)
- REST API contract defined: POST /solve with SolveRequest, callbacks to /progress/{runId} and /complete/{runId}
- Domain model extensible for soft constraints (Plan 04) and A/B weeks (Plan 05)
- Docker Compose integration allows `docker compose build solver` for testing

## Self-Check: PASSED

- All 18 created files verified present on disk
- Both task commits verified in git history (5baf5d2, a640647)
- 13/13 tests pass, BUILD SUCCESS confirmed

---
*Phase: 03-timetable-solver-engine*
*Completed: 2026-03-30*
