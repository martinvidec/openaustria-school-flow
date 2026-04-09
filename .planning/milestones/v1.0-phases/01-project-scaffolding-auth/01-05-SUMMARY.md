---
phase: 01-project-scaffolding-auth
plan: 05
subsystem: api
tags: [school-profile, crud, nestjs, prisma, austrian-templates, time-grid, school-year, dto, swagger]

# Dependency graph
requires:
  - phase: 01-02
    provides: Prisma 7 schema with School, TimeGrid, Period, SchoolDay, SchoolYear, Holiday, AutonomousDay models and PrismaService
  - phase: 01-04
    provides: CASL ability factory, @CheckPermissions() decorator, PermissionsGuard as global APP_GUARD
provides:
  - School CRUD REST API at /api/v1/schools with 6 endpoints (POST, GET all, GET templates, GET by ID, PUT, DELETE)
  - Austrian school type templates for VS, MS, AHS_UNTER, AHS_OBER, BHS with standard 50min period patterns
  - Nested Prisma creates for timeGrid/periods, schoolDays, schoolYear/holidays/autonomousDays
  - Automatic template application when useTemplate is not false and no custom timeGrid provided
  - SchoolModule registered in AppModule for application-wide availability
affects: [01-07, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [school-crud-api, nested-prisma-create, austrian-template-system, dto-validation-pattern]

key-files:
  created:
    - apps/api/src/modules/school/templates/austrian-school-templates.ts
    - apps/api/src/modules/school/dto/create-school.dto.ts
    - apps/api/src/modules/school/dto/update-school.dto.ts
    - apps/api/src/modules/school/dto/school-response.dto.ts
    - apps/api/src/modules/school/dto/create-time-grid.dto.ts
    - apps/api/src/modules/school/dto/create-school-year.dto.ts
    - apps/api/src/modules/school/school.service.ts
    - apps/api/src/modules/school/school.controller.ts
    - apps/api/src/modules/school/school.module.ts
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "Definite assignment assertions (!) on all DTO properties -- consistent with TypeScript 6.0 strict mode pattern established in 01-04"

patterns-established:
  - "School CRUD pattern: Controller with @CheckPermissions on every route, Service with Prisma nested creates, Module with exports for cross-module use"
  - "Austrian template system: getTemplateBySchoolType() provides default time grids per school type, auto-applied on school creation"
  - "DTO enum mirrors: SchoolTypeDto and DayOfWeekDto enums in DTO layer mirror Prisma enums for validation without Prisma import dependency"
  - "Nested Prisma create pattern: Single prisma.school.create with nested timeGrid/periods, schoolDays, schoolYear/holidays/autonomousDays"

requirements-completed: [FOUND-01, API-01]

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 01 Plan 05: School Profile CRUD API Summary

**School CRUD REST API with Austrian time grid templates for 5 school types, nested creation of time grids/periods/school days/school years, and CASL-protected endpoints**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T12:42:05Z
- **Completed:** 2026-03-29T12:45:16Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- School CRUD API with 6 REST endpoints at /api/v1/schools, all protected by @CheckPermissions CASL decorator
- Austrian school type templates for VS, MS, AHS_UNTER, AHS_OBER, BHS with realistic 50min period patterns including breaks and Mittagspause
- Automatic template application on school creation: when no custom timeGrid provided and useTemplate is not false, the matching Austrian template is used
- Nested Prisma creates handle timeGrid/periods, schoolDays, and schoolYear/holidays/autonomousDays in a single transaction

## Task Commits

Each task was committed atomically:

1. **Task 1: Austrian school type templates and DTOs** - `742fb28` (feat)
2. **Task 2: School controller, service, and module with CRUD endpoints** - `e629e4e` (feat)

## Files Created/Modified
- `apps/api/src/modules/school/templates/austrian-school-templates.ts` - 5 Austrian school type templates with period/break patterns and default school days
- `apps/api/src/modules/school/dto/create-school.dto.ts` - Create DTO with name, schoolType, optional schoolDays/timeGrid/schoolYear/useTemplate
- `apps/api/src/modules/school/dto/update-school.dto.ts` - PartialType of CreateSchoolDto for PATCH-style updates
- `apps/api/src/modules/school/dto/school-response.dto.ts` - Response DTOs with nested TimeGrid, SchoolDay, SchoolYear types
- `apps/api/src/modules/school/dto/create-time-grid.dto.ts` - Time grid DTO with HH:mm regex validation and nested period DTOs
- `apps/api/src/modules/school/dto/create-school-year.dto.ts` - School year DTO with ISO date validation and nested holiday/autonomous day DTOs
- `apps/api/src/modules/school/school.service.ts` - Business logic with nested Prisma creates, template lookup, and German 404 messages
- `apps/api/src/modules/school/school.controller.ts` - REST controller with 6 endpoints, Swagger docs, and CASL permissions
- `apps/api/src/modules/school/school.module.ts` - NestJS module exporting SchoolService
- `apps/api/src/app.module.ts` - Added SchoolModule to root module imports

## Decisions Made
- Applied definite assignment assertions (!) on all DTO properties, consistent with TypeScript 6.0 strict mode pattern from Plan 04
- Used `@IsBoolean()` validator on `useTemplate` field (plan omitted it) for proper runtime validation

## Deviations from Plan

None - plan executed exactly as written. class-validator and class-transformer were already installed from Plan 04, so the conditional install step was unnecessary.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. School CRUD endpoints require a running API with PostgreSQL and Keycloak. Seed data from Plan 04 provides the role permissions for the `school` subject.

## Known Stubs
None - all files contain complete implementations as specified.

## Next Phase Readiness
- School CRUD API ready for integration testing and frontend consumption
- SchoolService exported from SchoolModule for use in other modules (timetable, class book)
- Austrian templates available via GET /api/v1/schools/templates for UI template selection
- All 5 school types (VS, MS, AHS_UNTER, AHS_OBER, BHS) have realistic time grid templates

## Self-Check: PASSED

---
*Phase: 01-project-scaffolding-auth*
*Completed: 2026-03-29*
