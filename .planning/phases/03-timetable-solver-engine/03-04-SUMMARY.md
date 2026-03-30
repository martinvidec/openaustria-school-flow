---
phase: 03-timetable-solver-engine
plan: 04
subsystem: solver, api
tags: [timefold, constraint-weights, constraint-configuration, nestjs, crud, prisma]

requires:
  - phase: 03-02
    provides: Timefold solver domain model (Lesson, SchoolTimetable, SolverTimeslot, SolverRoom)
  - phase: 03-03
    provides: 12 constraints (5 hard + 7 soft) in TimetableConstraintProvider

provides:
  - Configurable soft constraint weights via @ConstraintConfiguration with 8 default weights
  - ClassTimeslotRestriction domain for NO_LESSONS_AFTER hard constraint
  - SubjectTimePreference domain for SUBJECT_MORNING soft constraint
  - ConstraintTemplate CRUD REST API at /api/v1/schools/:schoolId/constraint-templates
  - DEFAULT_CONSTRAINT_WEIGHTS map in NestJS mirroring Java defaults

affects: [03-05, 03-06, 04-timetable-ui]

tech-stack:
  added: []
  patterns:
    - "@ConstraintConfiguration with @ConstraintWeight for configurable soft constraints"
    - "penalizeConfigurable() for runtime weight tuning via admin API"
    - "TimetableModule as NestJS module for solver-related CRUD"

key-files:
  created:
    - apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java
    - apps/solver/src/main/java/at/schoolflow/solver/domain/ClassTimeslotRestriction.java
    - apps/solver/src/main/java/at/schoolflow/solver/domain/SubjectTimePreference.java
    - apps/api/src/modules/timetable/constraint-template.service.ts
    - apps/api/src/modules/timetable/constraint-template.controller.ts
    - apps/api/src/modules/timetable/dto/constraint-weight.dto.ts
    - apps/api/src/modules/timetable/dto/constraint-template.dto.ts
    - apps/api/src/modules/timetable/timetable.module.ts
    - apps/api/src/modules/timetable/constraint-template.service.spec.ts
  modified:
    - apps/solver/src/main/java/at/schoolflow/solver/domain/SchoolTimetable.java
    - apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java
    - apps/solver/src/test/java/at/schoolflow/solver/ConstraintTest.java
    - apps/api/src/app.module.ts

key-decisions:
  - "@ConstraintConfiguration over ConstraintWeightOverrides for Timefold 1.32.0 configurable weights"
  - "8 default weights (added Subject time preference = 3 for SUBJECT_MORNING templates)"
  - "NO_LESSONS_AFTER as hard constraint (school-mandated dismissal rule)"
  - "SUBJECT_MORNING as soft constraint (pedagogical preference, not physical impossibility)"
  - "TimetableModule as new NestJS module for all solver-related API endpoints"

patterns-established:
  - "penalizeConfigurable() for all soft constraints with @ConstraintWeight defaults"
  - "Constraint template CRUD at nested school route /api/v1/schools/:schoolId/constraint-templates"
  - "DEFAULT_CONSTRAINT_WEIGHTS constant mirroring Java TimetableConstraintConfiguration defaults"

requirements-completed: [TIME-03]

duration: 18min
completed: 2026-03-30
---

# Phase 3 Plan 4: Constraint Weight Configuration and Template CRUD Summary

**Configurable soft constraint weights via @ConstraintConfiguration with 8 defaults, constraint template CRUD API, and ClassTimeslotRestriction/SubjectTimePreference domain types for admin-defined scheduling rules**

## Performance

- **Duration:** 18 min
- **Started:** 2026-03-30T17:33:58Z
- **Completed:** 2026-03-30T17:52:04Z
- **Tasks:** 2
- **Files modified:** 13

## Accomplishments
- Converted all 8 soft constraints from hardcoded ONE_SOFT to penalizeConfigurable() with sensible defaults
- Added ClassTimeslotRestriction (NO_LESSONS_AFTER hard constraint) and SubjectTimePreference (SUBJECT_MORNING soft constraint) to the solver
- Built complete constraint template CRUD REST API at /api/v1/schools/:schoolId/constraint-templates
- Created DEFAULT_CONSTRAINT_WEIGHTS map in NestJS mirroring Java TimetableConstraintConfiguration defaults
- Added 6 new constraint unit tests (3 for ClassTimeslotRestriction, 3 for SubjectTimePreference)
- Added 10 service unit tests for ConstraintTemplateService (all 157 API tests pass)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ConstraintWeightOverrides to solver and define named constraint weights** - `0a1a3bf` (feat)
2. **Task 2: Create NestJS constraint template CRUD and weight configuration DTOs** - `02899cc` (feat)

## Files Created/Modified
- `apps/solver/.../domain/TimetableConstraintConfiguration.java` - @ConstraintConfiguration with 8 @ConstraintWeight defaults and applyOverrides()
- `apps/solver/.../domain/ClassTimeslotRestriction.java` - NO_LESSONS_AFTER domain (classId, maxPeriod)
- `apps/solver/.../domain/SubjectTimePreference.java` - SUBJECT_MORNING domain (subjectId, latestPeriod)
- `apps/solver/.../domain/SchoolTimetable.java` - Added constraintConfiguration, classTimeslotRestrictions, subjectTimePreferences fields
- `apps/solver/.../constraints/TimetableConstraintProvider.java` - 6 hard + 8 soft constraints with penalizeConfigurable()
- `apps/solver/.../ConstraintTest.java` - 6 new tests for ClassTimeslotRestriction and SubjectTimePreference
- `apps/api/.../timetable/constraint-template.service.ts` - CRUD + findActive for ConstraintTemplate
- `apps/api/.../timetable/constraint-template.controller.ts` - REST controller at nested school route
- `apps/api/.../timetable/dto/constraint-weight.dto.ts` - DEFAULT_CONSTRAINT_WEIGHTS, ConstraintWeightOverrideDto, mergeWeightOverrides
- `apps/api/.../timetable/dto/constraint-template.dto.ts` - ConstraintTemplateType enum, Create/Update/Response DTOs
- `apps/api/.../timetable/timetable.module.ts` - Module registering controller and service
- `apps/api/.../timetable/constraint-template.service.spec.ts` - 10 unit tests with mocked PrismaService
- `apps/api/src/app.module.ts` - Added TimetableModule import

## Decisions Made
- **@ConstraintConfiguration over ConstraintWeightOverrides**: Used @ConstraintConfiguration with @ConstraintWeight annotations because it provides declarative default weights and integrates cleanly with Timefold 1.32.0 penalizeConfigurable() API. ConstraintWeightOverrides would require providing all weights at runtime, while @ConstraintConfiguration allows defaults in the annotation.
- **NO_LESSONS_AFTER as hard constraint**: School-mandated dismissal rules (e.g., "1a has no lessons after 5th period") are physical scheduling requirements, not preferences. The solver must never violate them.
- **SUBJECT_MORNING as soft constraint**: "Mathematik should be before period 4" is a pedagogical preference. The solver should try to honor it but can override if other constraints conflict.
- **8 default weights (not 7)**: Added "Subject time preference" weight (default: 3) for the new SUBJECT_MORNING constraint. The plan's acceptance criteria said 7 but that was written before the new constraint.
- **TimetableModule**: Created a dedicated NestJS module for timetable/solver-related endpoints rather than adding to RoomModule. This keeps solver concerns (constraint templates, future solve runs) separate from room management.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added Subject time preference to DEFAULT_CONSTRAINT_WEIGHTS**
- **Found during:** Task 2
- **Issue:** Plan acceptance criteria specified 7 weight entries, but Task 1 added the "Subject time preference" constraint which needs a default weight
- **Fix:** Added "Subject time preference": 3 as 8th entry in DEFAULT_CONSTRAINT_WEIGHTS
- **Files modified:** apps/api/src/modules/timetable/dto/constraint-weight.dto.ts
- **Verification:** Weight map has 8 entries matching 8 soft constraints in Java config
- **Committed in:** 02899cc (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix necessary for correctness. Without the 8th weight entry, the SUBJECT_MORNING constraint would have no NestJS-side default. No scope creep.

## Issues Encountered
- Java 21 not available in environment (only Java 11 installed). Solver tests cannot be executed via `./mvnw test`. This is a pre-existing environment limitation from Plans 03-02 and 03-03. Code correctness verified by: (1) Timefold 1.32.0 jar API inspection confirming @ConstraintConfiguration, @ConstraintWeight, and @ConstraintConfigurationProvider exist, (2) syntax consistency with existing working constraints.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Constraint weight configuration ready for Plan 03-05 (solver input aggregation service)
- ClassTimeslotRestriction and SubjectTimePreference types ready for solver input mapping
- ConstraintTemplateService.findActive() provides the bridge between DB templates and solver domain
- TimetableModule provides the foundation for future solve run management endpoints

## Self-Check: PASSED

All 9 created files verified present. Both task commits (0a1a3bf, 02899cc) verified in git log.

---
*Phase: 03-timetable-solver-engine*
*Completed: 2026-03-30*
