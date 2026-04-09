---
phase: 02-school-data-model-dsgvo
plan: 02
subsystem: api
tags: [nestjs, prisma, teacher, werteinheiten, lehrverpflichtung, crud, casl, tdd]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Prisma schema with Person, Teacher, AvailabilityRule, TeachingReduction, TeacherSubject models"
provides:
  - "TeacherModule with full CRUD (create, list, get, update, delete)"
  - "TeacherService with nested Person creation (personType=TEACHER)"
  - "Werteinheiten utility with all 9 Lehrverpflichtungsgruppen (OEPU standard)"
  - "calculateWerteinheiten and calculateMaxTeachingHours functions"
  - "GET /teachers/:id/capacity endpoint for Werteinheiten calculation"
  - "TeacherSubject qualifications management"
  - "AvailabilityRule constraint storage (4 rule types)"
  - "TeachingReduction tracking (6 reduction types)"
affects: [03-timetable-solver, 04-room-resource-management]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "TDD for utility functions (RED-GREEN commit pattern)"
    - "Nested Prisma create for Person+Teacher in single transaction"
    - "Replace-all strategy for updating related collections (delete+recreate in $transaction)"
    - "Paginated findAll with schoolId filter"

key-files:
  created:
    - apps/api/src/modules/teacher/werteinheiten.util.ts
    - apps/api/src/modules/teacher/werteinheiten.util.spec.ts
    - apps/api/src/modules/teacher/teacher.service.ts
    - apps/api/src/modules/teacher/teacher.service.spec.ts
    - apps/api/src/modules/teacher/teacher.controller.ts
    - apps/api/src/modules/teacher/teacher.module.ts
    - apps/api/src/modules/teacher/dto/create-teacher.dto.ts
    - apps/api/src/modules/teacher/dto/update-teacher.dto.ts
    - apps/api/src/modules/teacher/dto/teacher-response.dto.ts
    - apps/api/src/modules/teacher/dto/create-availability-rule.dto.ts
    - apps/api/src/modules/teacher/dto/create-teaching-reduction.dto.ts
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "Nested Person+Teacher creation via prisma.person.create with teacher:{create:...} for atomic record creation"
  - "Replace-all strategy for qualifications/rules/reductions: deleteMany + createMany in $transaction for simplicity"
  - "Werteinheiten utility as pure functions (no DI needed) for testability and reuse in solver integration"

patterns-established:
  - "Teacher module follows Phase 1 school module CRUD pattern with pagination"
  - "TDD RED-GREEN-REFACTOR for pure utility functions"
  - "Enum DTOs mirror Prisma enums for validation"

requirements-completed: [FOUND-02]

# Metrics
duration: 5min
completed: 2026-03-29
---

# Phase 02 Plan 02: Teacher CRUD with Austrian Werteinheiten Summary

**Teacher CRUD module with Austrian Lehrverpflichtung (Werteinheiten) calculation, 9 OEPU-standard groups, availability constraints, and teaching reductions**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T17:30:46Z
- **Completed:** 2026-03-29T17:36:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Werteinheiten utility with all 9 Lehrverpflichtungsgruppen (I through VI) matching OEPU standards, TDD-tested
- Teacher CRUD with nested Person creation (personType=TEACHER), subject qualifications, availability rules, and teaching reductions
- GET /teachers/:id/capacity endpoint calculating effective Werteinheiten after Kustodiat/Klassenvorstand/Mentor/etc. reductions
- Paginated teacher listing filtered by schoolId with full include (person, qualifications, rules, reductions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Werteinheiten utility with TDD and Teacher DTOs**
   - `9cf0c9a` (test: RED phase - failing Werteinheiten tests)
   - `cc0cae4` (feat: GREEN phase - Werteinheiten utility implementation)
   - `7a7d4b5` (feat: Teacher DTOs with all D-01/D-02/D-03/D-05 fields)
2. **Task 2: Teacher controller, service, and module with CRUD endpoints** - `ba06f28` (feat)

## Files Created/Modified
- `apps/api/src/modules/teacher/werteinheiten.util.ts` - Austrian Lehrverpflichtung calculation with 9 groups
- `apps/api/src/modules/teacher/werteinheiten.util.spec.ts` - 9 unit tests for Werteinheiten calculations
- `apps/api/src/modules/teacher/teacher.service.ts` - CRUD service with nested Person creation and $transaction updates
- `apps/api/src/modules/teacher/teacher.service.spec.ts` - Unit tests with mocked PrismaService
- `apps/api/src/modules/teacher/teacher.controller.ts` - 6 REST endpoints with CASL @CheckPermissions
- `apps/api/src/modules/teacher/teacher.module.ts` - NestJS module exporting TeacherService
- `apps/api/src/modules/teacher/dto/create-teacher.dto.ts` - DTO with schoolId, name, HR fields, subjects, rules, reductions
- `apps/api/src/modules/teacher/dto/update-teacher.dto.ts` - PartialType(CreateTeacherDto)
- `apps/api/src/modules/teacher/dto/teacher-response.dto.ts` - Response DTOs with nested person, qualifications, rules
- `apps/api/src/modules/teacher/dto/create-availability-rule.dto.ts` - 4 rule types (MAX_DAYS_PER_WEEK, BLOCKED_PERIOD, BLOCKED_DAY_PART, PREFERRED_FREE_DAY)
- `apps/api/src/modules/teacher/dto/create-teaching-reduction.dto.ts` - 6 reduction types (KUSTODIAT, KLASSENVORSTAND, MENTOR, etc.)
- `apps/api/src/app.module.ts` - Added TeacherModule import

## Decisions Made
- Nested Person+Teacher creation via `prisma.person.create` with `teacher:{create:...}` ensures atomic creation of both records
- Replace-all strategy for qualifications, availability rules, and reductions on update: deleteMany + createMany inside `$transaction` is simpler than diffing and avoids orphan records
- Werteinheiten utility implemented as pure exported functions (no class/DI) for easy testability and future reuse in Phase 3 solver integration

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## Known Stubs

None - all data paths are wired to Prisma persistence.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Teacher CRUD ready for Phase 3 timetable solver integration (Werteinheiten calculations available)
- Availability rules stored and queryable for constraint satisfaction
- Teaching reductions feed into capacity calculations for solver scheduling

## Self-Check: PASSED

- All 12 files verified present on disk
- All 4 commit hashes verified in git log (9cf0c9a, cc0cae4, 7a7d4b5, ba06f28)
- Werteinheiten tests pass (9/9)
- TeacherService tests pass (5/5)
- NestJS build compiles with 0 errors

---
*Phase: 02-school-data-model-dsgvo*
*Completed: 2026-03-29*
