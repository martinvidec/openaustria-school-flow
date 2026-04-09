---
phase: 03-timetable-solver-engine
plan: 03
subsystem: solver
tags: [timefold, constraints, soft-constraints, hard-constraints, pedagogical-quality, double-periods, ab-week, constraint-verifier]

# Dependency graph
requires:
  - phase: 03-timetable-solver-engine
    provides: "Timefold sidecar with 4 hard constraints and domain model (Plan 02)"
provides:
  - "5 hard constraints (teacher clash, room clash, availability, student groups, room type)"
  - "7 soft constraints (subject doubling, balanced distribution, max lessons, double periods, home room, room changes, morning preference)"
  - "A/B week compatibility utility (isWeekCompatible) for value range filtering"
  - "31 ConstraintVerifier unit tests covering all 12 constraints"
affects: [03-timetable-solver-engine, 04-timetable-ui-management]

# Tech tracking
tech-stack:
  added: [ConstraintCollectors.loadBalance]
  patterns: [loadBalance-for-fairness, areConsecutive-helper, ifNotExists-for-double-periods]

key-files:
  created:
    - apps/solver/src/test/java/at/schoolflow/solver/ConstraintTest.java
  modified:
    - apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java
    - apps/solver/src/main/java/at/schoolflow/solver/domain/Lesson.java

key-decisions:
  - "loadBalance collector with intValue() conversion for HardSoftScore compatibility (BigDecimal unfairness truncated to int)"
  - "A/B week filtering via isWeekCompatible utility method rather than constraint (avoids search space explosion per Pitfall 1)"
  - "Max 8 lessons per day as soft constraint threshold (Austrian school standard)"
  - "Main subjects identified by null requiredRoomType (no Fachraum = core academic subject)"

patterns-established:
  - "areConsecutive() helper using nextTimeslotId for O(1) adjacency checks across constraints"
  - "ifNotExists pattern for double-period reward: penalize when no consecutive partner found"
  - "loadBalance collector for even distribution constraints with HardSoftScore"
  - "Factory helper methods (timeslot(), room(), lesson()) for DRY constraint test data"

requirements-completed: [TIME-02, TIME-04, TIME-05]

# Metrics
duration: 6min
completed: 2026-03-30
---

# Phase 03 Plan 03: Soft Constraints and A/B Week Support Summary

**12-constraint solver with pedagogical quality optimization: subject distribution, double periods, room preferences, morning scheduling, and A/B week support**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-30T17:25:41Z
- **Completed:** 2026-03-30T17:31:41Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- 8 new constraints added to TimetableConstraintProvider (1 hard + 7 soft), bringing total to 12 (5 hard + 7 soft)
- A/B week compatibility method in Lesson.java for efficient value range filtering without search space explosion
- 31 new ConstraintVerifier unit tests in ConstraintTest.java covering every constraint with positive and negative cases
- Full test suite: 44 tests passing (31 new + 13 existing SolverTest)

## Task Commits

Each task was committed atomically:

1. **Task 1: Implement soft constraints and room-type hard constraint** - `cd878b3` (feat)
2. **Task 2: Add A/B week support and comprehensive ConstraintVerifier unit tests** - `ecfe5eb` (feat)

## Files Created/Modified
- `apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java` - Extended from 4 to 12 constraints (5 hard + 7 soft) with areConsecutive helper
- `apps/solver/src/main/java/at/schoolflow/solver/domain/Lesson.java` - Added isWeekCompatible() for A/B week timeslot filtering
- `apps/solver/src/test/java/at/schoolflow/solver/ConstraintTest.java` - 31 ConstraintVerifier unit tests for all constraints

## Decisions Made
- **loadBalance with intValue():** Timefold's loadBalance collector returns BigDecimal unfairness, but project uses HardSoftScore (int-based). Used `unfairness().intValue()` conversion -- fairness values for day distribution are small integers, so truncation is safe.
- **A/B week via utility, not constraint:** Per Research Pitfall 1 (search space explosion), A/B week filtering is handled by value range provider limiting timeslot options, not by a constraint. Added `isWeekCompatible()` as a utility for the SolverInputService (Plan 05) to use.
- **Max 8 lessons/day threshold:** Austrian school standard for maximum class workload per day. Implemented as soft penalty (count - 8) for exceeding lessons.
- **Main subjects = null requiredRoomType:** Subjects that don't need a Fachraum (Turnsaal, EDV-Raum, etc.) are considered main academic subjects for morning scheduling preference.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 12 constraints ready for weight configuration in Plan 04 (ConstraintWeightOverrides)
- A/B week utility ready for SolverInputService in Plan 05 to filter timeslots
- Domain model complete for full timetable generation pipeline

## Known Stubs
None - all constraints are fully implemented with complete logic.

## Self-Check: PASSED

- All 3 created/modified files verified present on disk
- Both task commits verified in git history (cd878b3, ecfe5eb)
- 44/44 tests pass, BUILD SUCCESS confirmed

---
*Phase: 03-timetable-solver-engine*
*Completed: 2026-03-30*
