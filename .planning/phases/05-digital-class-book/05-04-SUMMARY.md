---
phase: 05-digital-class-book
plan: 04
subsystem: api
tags: [nestjs, prisma, statistics, excuse-workflow, file-upload, fastify-multipart, attendance, austrian-law]

# Dependency graph
requires:
  - phase: 05-01
    provides: "ClassBookEntry, AttendanceRecord, ClassSubject models and AttendanceService"
provides:
  - "StatisticsService with per-student/per-class absence aggregation and date range filtering"
  - "ExcuseService with PENDING -> ACCEPTED/REJECTED workflow and attendance auto-update"
  - "ExcuseController with file upload via @fastify/multipart"
  - "StatisticsController with class and student statistics endpoints"
affects: [05-digital-class-book, frontend-classbook-ui]

# Tech tracking
tech-stack:
  added: ["@fastify/multipart ^9.4.0"]
  patterns: ["Austrian semester date range detection", "Magic byte file validation", "Excuse-to-attendance cascading update"]

key-files:
  created:
    - "apps/api/src/modules/classbook/statistics.service.ts"
    - "apps/api/src/modules/classbook/statistics.controller.ts"
    - "apps/api/src/modules/classbook/dto/statistics.dto.ts"
    - "apps/api/src/modules/classbook/excuse.service.ts"
    - "apps/api/src/modules/classbook/excuse.controller.ts"
    - "apps/api/src/modules/classbook/dto/excuse.dto.ts"
  modified:
    - "apps/api/src/main.ts"
    - "apps/api/src/modules/classbook/classbook.module.ts"
    - "apps/api/package.json"

key-decisions:
  - "Austrian semester detection: Sep-Jan / Feb-Jun / Jul-Aug defaults to Feb-Jun"
  - "@fastify/multipart registered on raw Fastify instance via getHttpAdapter().getInstance()"
  - "Magic byte validation for PDF/JPG/PNG alongside MIME type check"
  - "Accepted excuse cascades ABSENT -> EXCUSED via Prisma transaction with updateMany"

patterns-established:
  - "Semester date range helper: getSemesterDateRange() for Austrian school calendar"
  - "File upload pattern: raw Fastify req.file() with manual buffer collection"
  - "Excuse workflow: PENDING -> ACCEPTED/REJECTED with cascading attendance update"

requirements-completed: [BOOK-05, BOOK-06]

# Metrics
duration: 7min
completed: 2026-04-03
---

# Phase 05 Plan 04: Statistics & Excuse Workflow Summary

**Absence statistics with per-student/class aggregation (late >15min = absent per Schulunterrichtsgesetz) and parent excuse workflow with file upload, Klassenvorstand review, and automatic EXCUSED attendance updates**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-03T20:30:22Z
- **Completed:** 2026-04-03T20:37:33Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Statistics backend with per-student and per-class absence aggregation, date range filtering, and Austrian semester auto-detection
- Late >15min counted as absent per Austrian Schulunterrichtsgesetz D-04 in absence rate calculation
- Complete excuse workflow: parent creates with validation, Klassenvorstand accepts/rejects, acceptance auto-updates attendance to EXCUSED
- File upload infrastructure via @fastify/multipart with 5MB limit, PDF/JPG/PNG validation, and magic byte checking
- Parent authorization: can only submit excuses for own children
- Klassenvorstand pending excuse queue ordered oldest-first

## Task Commits

Each task was committed atomically:

1. **Task 1: StatisticsService + StatisticsController + DTOs** - `2f0b9d8` (feat)
2. **Task 2: ExcuseService + ExcuseController + file upload + DTOs** - `f0475ae` (feat)

## Files Created/Modified
- `apps/api/src/modules/classbook/statistics.service.ts` - Per-student/class absence aggregation with semester detection
- `apps/api/src/modules/classbook/statistics.controller.ts` - GET /class and GET /student endpoints
- `apps/api/src/modules/classbook/dto/statistics.dto.ts` - Query DTOs with date range filtering
- `apps/api/src/modules/classbook/excuse.service.ts` - Excuse CRUD, review workflow, file attachment, attendance cascade
- `apps/api/src/modules/classbook/excuse.controller.ts` - REST endpoints with multipart upload
- `apps/api/src/modules/classbook/dto/excuse.dto.ts` - Create, review, and list DTOs
- `apps/api/src/main.ts` - @fastify/multipart registration with 5MB limit
- `apps/api/src/modules/classbook/classbook.module.ts` - Added all 6 services and 6 controllers
- `apps/api/package.json` - Added @fastify/multipart dependency
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Austrian semester detection: getSemesterDateRange() returns Sep 1 - Jan 31 for winter semester, Feb 1 - Jun 30 for summer semester, Jul/Aug defaults to previous summer semester
- @fastify/multipart registered on raw Fastify instance via app.getHttpAdapter().getInstance() to avoid NestJS adapter wrapper issues
- Magic byte validation (PDF: %PDF, JPEG: 0xFFD8FF, PNG: 0x89504E47) in addition to MIME type check for security
- Accepted excuse cascades ABSENT -> EXCUSED via Prisma transaction with updateMany on matching AttendanceRecords
- @IsIn(['ACCEPTED', 'REJECTED']) instead of @IsEnum for ReviewExcuseDto.status to restrict to only review-valid states
- File storage on local disk at uploads/{schoolId}/excuses/{excuseId}/{filename} with sanitized filenames

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all services are fully wired to Prisma data sources.

## Next Phase Readiness
- Statistics and excuse workflow backends are complete, ready for frontend integration
- All 6 classbook services registered in ClassBookModule
- File upload infrastructure established for future use (e.g., other document uploads)

---
*Phase: 05-digital-class-book*
*Completed: 2026-04-03*
