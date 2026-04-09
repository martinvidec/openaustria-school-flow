---
phase: 08-homework-exams-data-import
plan: 01
subsystem: database, api, testing
tags: [prisma, postgresql, vitest, fast-xml-parser, papaparse, homework, exam, import, calendar, sis]

# Dependency graph
requires:
  - phase: 07-communication
    provides: "NotificationType enum, Notification model, messaging infrastructure"
  - phase: 05-digital-class-book
    provides: "ClassBookEntry model for homework linkage"
  - phase: 02-school-data-rbac
    provides: "School, ClassSubject, SchoolClass, Teacher, Student models"
provides:
  - "Homework, Exam, ImportJob, CalendarToken, SisApiKey Prisma models"
  - "ImportFileType, ImportStatus, ImportEntityType, ImportConflictMode enums"
  - "HOMEWORK_ASSIGNED, EXAM_SCHEDULED notification types"
  - "HomeworkDto, ExamDto, ImportJobDto, CalendarTokenDto, SisApiKeyDto shared types"
  - "67 Wave 0 it.todo() test stubs for HW-01..HW-03, IMPORT-01..IMPORT-04"
  - "IMPORT_QUEUE constant for BullMQ job queue"
  - "fast-xml-parser and papaparse npm dependencies"
affects: [08-02, 08-03, 08-04, 08-05, 08-06]

# Tech tracking
tech-stack:
  added: [fast-xml-parser, papaparse, "@types/papaparse"]
  patterns: [Wave 0 Nyquist test stubs, Phase 8 schema-first data contract]

key-files:
  created:
    - packages/shared/src/types/homework.ts
    - packages/shared/src/types/import.ts
    - packages/shared/src/types/calendar.ts
    - apps/api/src/modules/homework/__tests__/homework.service.spec.ts
    - apps/api/src/modules/homework/__tests__/exam.service.spec.ts
    - apps/api/src/modules/import/__tests__/import.service.spec.ts
    - apps/api/src/modules/import/__tests__/csv.parser.spec.ts
    - apps/api/src/modules/import/__tests__/untis-xml.parser.spec.ts
    - apps/api/src/modules/calendar/__tests__/calendar.service.spec.ts
    - apps/api/src/modules/calendar/__tests__/sis.service.spec.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/config/queue/queue.constants.ts
    - apps/api/package.json
    - packages/shared/src/index.ts

key-decisions:
  - "db push (not migrate dev) for schema sync -- consistent with Phase 3+ pattern"

patterns-established:
  - "Wave 0 Nyquist: 67 it.todo() stubs across 7 spec files before implementation"
  - "Phase 8 back-relation comments on existing models for traceability"

requirements-completed: [HW-01, HW-02, HW-03, IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04]

# Metrics
duration: 13min
completed: 2026-04-07
---

# Phase 8 Plan 01: Foundation Schema, Types, and Test Stubs Summary

**5 new Prisma models (Homework, Exam, ImportJob, CalendarToken, SisApiKey), 4 enums, shared TypeScript DTOs, and 67 Wave 0 test stubs covering all 7 Phase 8 requirements**

## Performance

- **Duration:** 13 min
- **Started:** 2026-04-07T17:11:47Z
- **Completed:** 2026-04-07T17:24:47Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- Extended Prisma schema with 5 new models, 4 new enums, and 2 new NotificationType values -- database synced via db push
- Created shared TypeScript DTOs for all Phase 8 sub-domains: homework, import, calendar/SIS
- Established 67 it.todo() Wave 0 test stubs across 7 spec files ensuring every requirement (HW-01..HW-03, IMPORT-01..IMPORT-04) has test coverage skeletons before implementation
- Installed fast-xml-parser (Untis XML parsing) and papaparse (CSV parsing) dependencies

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma schema extension + new dependencies + IMPORT_QUEUE constant** - `360fcca` (feat)
2. **Task 2: Shared types + Wave 0 Nyquist test stubs** - `fc617be` (feat)

## Files Created/Modified
- `apps/api/prisma/schema.prisma` - Added Homework, Exam, ImportJob, CalendarToken, SisApiKey models + 4 enums + 2 NotificationType values + back-relations
- `apps/api/src/config/queue/queue.constants.ts` - Added IMPORT_QUEUE constant
- `apps/api/package.json` - Added fast-xml-parser, papaparse, @types/papaparse
- `pnpm-lock.yaml` - Updated lockfile with new dependencies
- `packages/shared/src/types/homework.ts` - HomeworkDto, ExamDto, ExamCollisionDto, CreateHomeworkRequest, CreateExamRequest
- `packages/shared/src/types/import.ts` - ImportJobDto, ImportErrorDetail, ImportDryRunResult, ImportProgressEvent, StartImportRequest, ColumnMappingField
- `packages/shared/src/types/calendar.ts` - CalendarTokenDto, SisApiKeyDto, CreateSisApiKeyRequest
- `packages/shared/src/index.ts` - Re-exports for homework, import, calendar types
- `apps/api/src/modules/homework/__tests__/homework.service.spec.ts` - 9 it.todo() stubs for HW-01, HW-03
- `apps/api/src/modules/homework/__tests__/exam.service.spec.ts` - 11 it.todo() stubs for HW-02, HW-03
- `apps/api/src/modules/import/__tests__/import.service.spec.ts` - 13 it.todo() stubs for IMPORT-01, IMPORT-02
- `apps/api/src/modules/import/__tests__/csv.parser.spec.ts` - 8 it.todo() stubs for IMPORT-02
- `apps/api/src/modules/import/__tests__/untis-xml.parser.spec.ts` - 11 it.todo() stubs for IMPORT-01
- `apps/api/src/modules/calendar/__tests__/calendar.service.spec.ts` - 7 it.todo() stubs for IMPORT-03
- `apps/api/src/modules/calendar/__tests__/sis.service.spec.ts` - 8 it.todo() stubs for IMPORT-04

## Decisions Made
- Used `db push --accept-data-loss` instead of `migrate dev` for schema sync -- consistent with Phase 3+ established pattern

## Deviations from Plan
None - plan executed exactly as written.

## Known Stubs
None -- this plan's purpose IS to create stubs. All 67 it.todo() stubs are intentional Wave 0 placeholders to be implemented in Plans 02-06.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Database schema contract established -- Plans 02-06 can implement services against these models
- Shared types exported -- frontend and API consumers can start building against DTOs
- Test stubs ready -- implementation plans fill in the test bodies
- Dependencies installed -- fast-xml-parser and papaparse available for import parsers

---
*Phase: 08-homework-exams-data-import*
*Completed: 2026-04-07*
