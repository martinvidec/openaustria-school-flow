---
phase: 02-school-data-model-dsgvo
plan: 04
subsystem: api
tags: [nestjs, prisma, subjects, stundentafel, curriculum, austrian-lehrplan]

# Dependency graph
requires:
  - phase: 02-01
    provides: "Prisma schema with Subject, ClassSubject, SubjectType enum, SchoolType enum"
provides:
  - "SubjectModule with CRUD, ClassSubject management, and Stundentafel template system"
  - "AUSTRIAN_STUNDENTAFELN data for AHS Unterstufe (years 1-4) and Mittelschule (years 1-4)"
  - "StundentafelTemplateService for template lookup and application to classes"
  - "SubjectService for subject CRUD and class-subject association management"
affects: [03-timetable-solver, 04-room-management, 05-classbook]

# Tech tracking
tech-stack:
  added: []
  patterns: [find-or-create for template application, isCustomized flag for template vs manual distinction]

key-files:
  created:
    - apps/api/src/modules/subject/templates/austrian-stundentafeln.ts
    - apps/api/src/modules/subject/stundentafel-template.service.ts
    - apps/api/src/modules/subject/stundentafel-template.service.spec.ts
    - apps/api/src/modules/subject/subject.service.ts
    - apps/api/src/modules/subject/subject.service.spec.ts
    - apps/api/src/modules/subject/subject.controller.ts
    - apps/api/src/modules/subject/subject.module.ts
    - apps/api/src/modules/subject/dto/create-subject.dto.ts
    - apps/api/src/modules/subject/dto/update-subject.dto.ts
    - apps/api/src/modules/subject/dto/subject-response.dto.ts
    - apps/api/src/modules/subject/dto/apply-stundentafel.dto.ts
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "Stundentafel data stored as static TypeScript arrays -- no DB persistence for templates"
  - "Find-or-create pattern for applyTemplate: subjects created if missing, reused if existing"
  - "isCustomized=false for template-created ClassSubject, true for manual additions/edits"

patterns-established:
  - "Template data as exported const arrays with typed interfaces"
  - "Find-or-create pattern via findFirst + conditional create for idempotent template application"
  - "ClassSubject isCustomized flag distinguishes template-sourced from manually configured"

requirements-completed: [FOUND-04, FOUND-05]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 02 Plan 04: Subject & Stundentafel Summary

**Subject CRUD with Austrian Stundentafel template system for AHS Unterstufe and Mittelschule curriculum hour allocation**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T17:31:23Z
- **Completed:** 2026-03-29T17:36:01Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Austrian Stundentafel templates for 8 school-type/year combinations (4 AHS_UNTER + 4 MS) with correct weekly hours and Lehrverpflichtungsgruppen
- Subject CRUD service with unique shortName-per-school enforcement (ConflictException)
- ClassSubject management: add/remove subjects from classes, update hours with isCustomized tracking
- Stundentafel template application via find-or-create pattern for idempotent class population

## Task Commits

Each task was committed atomically:

1. **Task 1: Austrian Stundentafel template data and template service** - `7a7d4b5` (feat) [TDD]
2. **Task 2: Subject CRUD controller, service, and module** - `bdd86eb` (feat)

## Files Created/Modified
- `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` - 8 Stundentafel templates (AHS_UNTER 1-4, MS 1-4) with StundentafelTemplate interface
- `apps/api/src/modules/subject/stundentafel-template.service.ts` - Template lookup and application service
- `apps/api/src/modules/subject/stundentafel-template.service.spec.ts` - 10 unit tests for template data and service
- `apps/api/src/modules/subject/subject.service.ts` - Subject CRUD + ClassSubject management
- `apps/api/src/modules/subject/subject.service.spec.ts` - 8 unit tests for service
- `apps/api/src/modules/subject/subject.controller.ts` - REST controller with 11 endpoints
- `apps/api/src/modules/subject/subject.module.ts` - NestJS module
- `apps/api/src/modules/subject/dto/create-subject.dto.ts` - SubjectType enum validation
- `apps/api/src/modules/subject/dto/update-subject.dto.ts` - PartialType of create, omit schoolId
- `apps/api/src/modules/subject/dto/subject-response.dto.ts` - Swagger-decorated response DTO
- `apps/api/src/modules/subject/dto/apply-stundentafel.dto.ts` - SchoolType enum + yearLevel validation
- `apps/api/src/app.module.ts` - Added SubjectModule import

## Decisions Made
- Stundentafel data stored as static TypeScript arrays -- no DB persistence needed for templates; templates are read-only reference data
- Find-or-create pattern for applyTemplate: subjects reused if already in school, created if new -- idempotent operation
- isCustomized flag: false for template-created ClassSubject entries, true for manual additions and hour edits

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Subject and ClassSubject management operational for timetable solver (Phase 3)
- Stundentafel templates provide sensible defaults for AHS Unterstufe and Mittelschule
- Template system extensible for VS, AHS_OBER, BHS by adding entries to AUSTRIAN_STUNDENTAFELN array

## Self-Check: PASSED

- All 11 created files verified on disk
- Both task commits verified in git log (7a7d4b5, bdd86eb)
- All 79 tests pass (Stundentafel + Subject)
- NestJS build compiles with 0 errors

---
*Phase: 02-school-data-model-dsgvo*
*Completed: 2026-03-29*
