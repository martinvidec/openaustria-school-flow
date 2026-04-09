---
phase: 02-school-data-model-dsgvo
plan: 03
subsystem: api
tags: [nestjs, prisma, student, class, group, crud, tdd, casl, pagination]

requires:
  - phase: 02-01
    provides: Prisma schema with Student, SchoolClass, Group, GroupMembership models and enums
  - phase: 01-04
    provides: CASL permissions guard with @CheckPermissions decorator
  - phase: 01-03
    provides: PaginationQueryDto and PaginatedResponseDto
provides:
  - StudentModule with CRUD and Person nested creation
  - ClassModule with CRUD, student assign/remove, and unique constraint enforcement
  - GroupService with manual membership management
  - GroupMembershipRuleService for auto-derivation of group memberships
  - GroupController with REST endpoints for group and membership CRUD
affects: [03-timetable-solver, 05-classbook, 06-communication]

tech-stack:
  added: []
  patterns:
    - "Nested Prisma create for Person+Student in single transaction"
    - "ConflictException for unique constraint violations (checked before create)"
    - "GroupAutoAssignRule interface for declarative group auto-population"
    - "isAutoAssigned flag distinguishes manual vs auto-derived group memberships"

key-files:
  created:
    - apps/api/src/modules/student/student.service.ts
    - apps/api/src/modules/student/student.controller.ts
    - apps/api/src/modules/student/student.module.ts
    - apps/api/src/modules/student/student.service.spec.ts
    - apps/api/src/modules/student/dto/create-student.dto.ts
    - apps/api/src/modules/student/dto/update-student.dto.ts
    - apps/api/src/modules/student/dto/student-response.dto.ts
    - apps/api/src/modules/class/class.service.ts
    - apps/api/src/modules/class/class.controller.ts
    - apps/api/src/modules/class/class.module.ts
    - apps/api/src/modules/class/class.service.spec.ts
    - apps/api/src/modules/class/dto/create-class.dto.ts
    - apps/api/src/modules/class/dto/update-class.dto.ts
    - apps/api/src/modules/class/dto/class-response.dto.ts
    - apps/api/src/modules/class/group.service.ts
    - apps/api/src/modules/class/group.controller.ts
    - apps/api/src/modules/class/group-membership-rule.service.ts
    - apps/api/src/modules/class/group-membership-rule.service.spec.ts
    - apps/api/src/modules/class/dto/create-group.dto.ts
    - apps/api/src/modules/class/dto/assign-student.dto.ts
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "Nested Person+Student creation via prisma.person.create with student: { create: {} } for atomic insert"
  - "ConflictException for duplicate class names checked via findUnique before create (not relying on DB error)"
  - "GroupAutoAssignRule interface is input-driven (admin provides rules) not auto-inferred from student attributes"
  - "isAutoAssigned boolean flag on GroupMembership distinguishes manual vs rule-derived assignments"

patterns-established:
  - "Nested create pattern: prisma.person.create with student: { create: } for PII-to-role entity creation"
  - "Conflict check pattern: findUnique with composite key before create, throw ConflictException"
  - "Paginated service pattern: Promise.all([findMany, count]) returning PaginatedResponseDto"
  - "Sub-resource endpoints: POST /:id/students for assigning, DELETE /:id/students/:studentId for removing"
  - "Group auto-derivation: clearAutoAssignments + applyRules preserves manual assignments"

requirements-completed: [FOUND-03]

duration: 5min
completed: 2026-03-29
---

# Phase 02 Plan 03: Student & Class/Group Management Summary

**Student CRUD with nested Person creation, Class CRUD with Stammklasse assignment, and Group auto-derivation rule engine for Religion/Leistung/Wahlpflicht splits**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-29T17:31:10Z
- **Completed:** 2026-03-29T17:36:20Z
- **Tasks:** 2
- **Files modified:** 21

## Accomplishments
- Student CRUD at /students with nested Person creation (personType=STUDENT) and school-scoped pagination
- Class CRUD at /classes with unique constraint enforcement, student assign/remove endpoints
- Group CRUD at /groups with manual membership management and ConflictException on duplicates
- Auto-derivation rule engine (GroupMembershipRuleService) creates groups and assigns students with isAutoAssigned=true, preserving manual assignments
- Full TDD cycle for Task 2: 7 test behaviors specified, RED tests committed, GREEN implementation passes all

## Task Commits

Each task was committed atomically:

1. **Task 1: Student module and Class module with CRUD endpoints** - `57937ea` (feat)
2. **Task 2 RED: Failing tests for Group management** - `484150c` (test)
3. **Task 2 GREEN: Group management and auto-derivation rule engine** - `95a7d42` (feat)

## Files Created/Modified
- `apps/api/src/modules/student/student.service.ts` - Student CRUD with nested Person creation
- `apps/api/src/modules/student/student.controller.ts` - REST endpoints for /students
- `apps/api/src/modules/student/student.module.ts` - NestJS module
- `apps/api/src/modules/student/student.service.spec.ts` - Unit tests for create, findAll, findOne, remove
- `apps/api/src/modules/student/dto/create-student.dto.ts` - Input validation with TS 6.0 definite assignments
- `apps/api/src/modules/student/dto/update-student.dto.ts` - PartialType of CreateStudentDto
- `apps/api/src/modules/student/dto/student-response.dto.ts` - Swagger response types
- `apps/api/src/modules/class/class.service.ts` - Class CRUD with assignStudent/removeStudent
- `apps/api/src/modules/class/class.controller.ts` - REST endpoints for /classes with sub-resource routes
- `apps/api/src/modules/class/class.module.ts` - Module with Group providers
- `apps/api/src/modules/class/class.service.spec.ts` - Unit tests for create, conflict, assign, remove
- `apps/api/src/modules/class/dto/create-class.dto.ts` - Class creation with yearLevel 1-13
- `apps/api/src/modules/class/dto/update-class.dto.ts` - Partial omitting schoolId and schoolYearId
- `apps/api/src/modules/class/dto/class-response.dto.ts` - Swagger response types
- `apps/api/src/modules/class/group.service.ts` - Group CRUD with manual member management
- `apps/api/src/modules/class/group.controller.ts` - REST endpoints for /groups with member sub-routes
- `apps/api/src/modules/class/group-membership-rule.service.ts` - Auto-derivation engine (D-07)
- `apps/api/src/modules/class/group-membership-rule.service.spec.ts` - 8 unit tests (7 TDD + 1 conflict)
- `apps/api/src/modules/class/dto/create-group.dto.ts` - GroupType enum validation
- `apps/api/src/modules/class/dto/assign-student.dto.ts` - Student ID validation
- `apps/api/src/app.module.ts` - Added StudentModule and ClassModule imports

## Decisions Made
- Nested Person+Student creation via `prisma.person.create({ data: { ...personData, student: { create: {} } } })` for atomic insert
- ConflictException for duplicate class names checked via findUnique before create (not relying on DB error parsing)
- GroupAutoAssignRule interface is input-driven: admin provides explicit rules and student lists, not auto-inferred from student attributes (auto-inference is future scope)
- isAutoAssigned boolean flag on GroupMembership allows clearAutoAssignments to selectively remove only rule-derived memberships

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all services are fully wired with Prisma queries and return real data structures.

## Next Phase Readiness
- StudentModule and ClassModule are fully operational with CASL protection
- GroupMembershipRuleService ready for timetable solver integration (Phase 3)
- ClassSubject assignment (curriculum linking) available for Phase 4 subject management
- Group structure (RELIGION, LEISTUNG, WAHLPFLICHT splits) provides foundation for D-08 Leistungsniveau timetabling

## Self-Check: PASSED

All 21 files verified present. All 3 commits (57937ea, 484150c, 95a7d42) verified in git log.

---
*Phase: 02-school-data-model-dsgvo*
*Completed: 2026-03-29*
