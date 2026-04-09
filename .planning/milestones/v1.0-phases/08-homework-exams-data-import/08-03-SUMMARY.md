---
phase: 08-homework-exams-data-import
plan: 03
subsystem: api, import, queue, websocket
tags: [fast-xml-parser, papaparse, bullmq, socket.io, untis, csv, nestjs, prisma]

# Dependency graph
requires:
  - phase: 08-homework-exams-data-import
    plan: 01
    provides: "ImportJob Prisma model, ImportFileType/ImportStatus/ImportEntityType/ImportConflictMode enums, IMPORT_QUEUE constant, fast-xml-parser + papaparse deps, Wave 0 test stubs"
  - phase: 02-school-data-rbac
    provides: "Person, Teacher, Student, SchoolClass, Room models, nested Person+Teacher/Student create pattern"
  - phase: 06-substitution-planning
    provides: "NotificationGateway JWT JWKS handshake pattern for Socket.IO"
provides:
  - "parseUntisXml: Untis XML export parser with multi-structure support"
  - "parseUntisTeachersDif/ClassesDif/RoomsDif/LessonsDif: Untis GPU DIF parsers"
  - "parseCsv: CSV parser with auto-delimiter detection and BOM handling"
  - "detectUntisFormat: XML vs DIF format auto-detection"
  - "ImportService: file upload/parse/dry-run/commit/history orchestration"
  - "ImportProcessor: BullMQ IMPORT_QUEUE worker with chunked row processing"
  - "ImportEventsGateway: /import Socket.IO namespace with school-scoped rooms"
  - "ImportController: admin-only REST endpoints at /api/v1/schools/:schoolId/import"
  - "ImportModule: registered in AppModule"
affects: [08-04, 08-05, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [BullMQ chunked processor with Socket.IO progress emission, school-scoped Socket.IO rooms for import progress, file-to-temp-path coupling for async BullMQ processing]

key-files:
  created:
    - apps/api/src/modules/import/parsers/untis-types.ts
    - apps/api/src/modules/import/parsers/untis-xml.parser.ts
    - apps/api/src/modules/import/parsers/untis-dif.parser.ts
    - apps/api/src/modules/import/parsers/csv.parser.ts
    - apps/api/src/modules/import/import.service.ts
    - apps/api/src/modules/import/processors/import.processor.ts
    - apps/api/src/modules/import/import-events.gateway.ts
    - apps/api/src/modules/import/import.controller.ts
    - apps/api/src/modules/import/import.module.ts
    - apps/api/src/modules/import/dto/start-import.dto.ts
    - apps/api/src/modules/import/dto/column-mapping.dto.ts
    - apps/api/src/modules/import/dto/import-result.dto.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/modules/import/__tests__/untis-xml.parser.spec.ts
    - apps/api/src/modules/import/__tests__/csv.parser.spec.ts
    - apps/api/src/modules/import/__tests__/import.service.spec.ts

key-decisions:
  - "personType required on Person creation: TEACHER for imported teachers, STUDENT for imported students (schema constraint from Phase 2)"
  - "SchoolClass import resolves schoolYearId from SchoolYear.findUnique({where: {schoolId}}) -- requires school to have a configured school year"
  - "Room import defaults roomType to KLASSENZIMMER -- admin can update post-import"
  - "Prisma.DbNull for nullable JSON fields when no column mapping provided (Prisma 7 pattern from Phase 1)"
  - "ImportProcessor processes rows in chunks of 50 for batch efficiency with per-chunk progress emission"
  - "ImportEventsGateway uses school-scoped rooms (not user-scoped) so all admins watching the same school see import progress"

patterns-established:
  - "File-to-temp-path coupling: uploadAndParse writes file to os.tmpdir(), stores filePath in ImportJob.dryRunResult, processor reads from filePath and deletes in finally block"
  - "Chunked BullMQ processing: CHUNK_SIZE=50 rows per batch, progress emitted after each chunk via both job.updateProgress() and Socket.IO"
  - "Uniform row format: all parsers (XML, DIF, CSV) convert to Record<string, string>[] before processImportRow, enabling format-agnostic conflict resolution"

requirements-completed: [IMPORT-01, IMPORT-02]

# Metrics
duration: 14min
completed: 2026-04-07
---

# Phase 8 Plan 03: Data Import Backend Summary

**Untis XML/DIF and CSV parsers with BullMQ background import processor, Socket.IO progress gateway, and admin-only import REST API with conflict resolution (skip/update/fail)**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-07T21:31:16Z
- **Completed:** 2026-04-07T21:45:53Z
- **Tasks:** 2
- **Files modified:** 16

## Accomplishments
- Three parser implementations: Untis XML (fast-xml-parser), Untis DIF (papaparse positional fields), CSV (papaparse auto-delimiter detection with BOM handling)
- ImportService orchestrates full import lifecycle: file upload/parse preview, dry-run validation, background commit with conflict resolution, history audit trail (D-08)
- BullMQ ImportProcessor with chunked row processing (50 rows/batch) and real-time Socket.IO progress emission via ImportEventsGateway /import namespace
- ImportController with 6 admin-only endpoints: upload, dry-run, commit, history, status, delete
- ImportModule registered in AppModule with IMPORT_QUEUE
- 34 passing tests across 3 spec files covering all parser formats and service behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Untis XML/DIF + CSV parsers with tests** - `3284d14` (feat)
2. **Task 2: ImportService + BullMQ processor + Socket.IO gateway + controller + module wiring** - `e8cde9e` (feat)

## Files Created/Modified
- `apps/api/src/modules/import/parsers/untis-types.ts` - Shared Untis data interfaces (UntisTeacher, UntisClass, UntisRoom, UntisLesson, UntisXmlData)
- `apps/api/src/modules/import/parsers/untis-xml.parser.ts` - parseUntisXml with multi-structure XML support and defensive field mapping
- `apps/api/src/modules/import/parsers/untis-dif.parser.ts` - GPU002-005 DIF parsers with auto-delimiter detection and format detection
- `apps/api/src/modules/import/parsers/csv.parser.ts` - parseCsv with BOM stripping, auto-delimiter detection, header/data separation
- `apps/api/src/modules/import/import.service.ts` - ImportService: uploadAndParse, startDryRun, commitImport, processImportRow, getJob, getHistory, deleteJob
- `apps/api/src/modules/import/processors/import.processor.ts` - BullMQ worker with chunked processing, dry-run validation, temp file cleanup
- `apps/api/src/modules/import/import-events.gateway.ts` - Socket.IO /import namespace with school-scoped rooms and JWT JWKS handshake
- `apps/api/src/modules/import/import.controller.ts` - 6 admin-only endpoints with CheckPermissions and Swagger decorators
- `apps/api/src/modules/import/import.module.ts` - NestJS module registering IMPORT_QUEUE, providers, and controller
- `apps/api/src/modules/import/dto/start-import.dto.ts` - StartImportDto with enum validation for fileType, entityType, conflictMode
- `apps/api/src/modules/import/dto/column-mapping.dto.ts` - ColumnMappingDto for CSV source-to-target field mapping
- `apps/api/src/modules/import/dto/import-result.dto.ts` - ImportResultDto with ApiProperty decorators for all ImportJob fields
- `apps/api/src/app.module.ts` - Added ImportModule to imports array
- `apps/api/src/modules/import/__tests__/untis-xml.parser.spec.ts` - 11 tests for XML parsing, DIF parsing, format detection
- `apps/api/src/modules/import/__tests__/csv.parser.spec.ts` - 9 tests for CSV delimiter detection, BOM, quoting, explicit override
- `apps/api/src/modules/import/__tests__/import.service.spec.ts` - 12 tests for status transitions, conflict modes, CRUD operations

## Decisions Made
- personType required on Person creation: TEACHER for imported teachers, STUDENT for imported students (Prisma schema constraint from Phase 2)
- SchoolClass import resolves schoolYearId via SchoolYear.findUnique({where: {schoolId}}) -- requires school to have configured school year
- Room import defaults roomType to KLASSENZIMMER (admin can update post-import)
- Prisma.DbNull for nullable JSON fields when no column mapping provided (consistent with Phase 1 pattern)
- ImportProcessor chunks rows at 50 per batch for progress emission granularity
- ImportEventsGateway uses school-scoped rooms (all admins of same school see import progress)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed Prisma import path for processor**
- **Found during:** Task 2
- **Issue:** Import path `../../../generated/client` does not exist; correct path is `../../../config/database/generated/client.js`
- **Fix:** Updated import to use established Prisma client path
- **Files modified:** apps/api/src/modules/import/processors/import.processor.ts, apps/api/src/modules/import/import.service.ts
- **Committed in:** e8cde9e

**2. [Rule 1 - Bug] Added missing personType field on Person creation**
- **Found during:** Task 2
- **Issue:** Person.create requires personType enum (TEACHER/STUDENT) per schema -- plan did not specify
- **Fix:** Added personType: 'TEACHER' and personType: 'STUDENT' to respective create calls
- **Files modified:** apps/api/src/modules/import/import.service.ts
- **Committed in:** e8cde9e

**3. [Rule 1 - Bug] Fixed SchoolClass and Room field names**
- **Found during:** Task 2
- **Issue:** Schema uses `yearLevel` (not `level`), `schoolYearId` (not `schoolYear`), `roomType` (not `type`) -- plan used incorrect field names
- **Fix:** Updated to correct Prisma field names; added SchoolYear lookup for schoolYearId; used KLASSENZIMMER enum for default room type
- **Files modified:** apps/api/src/modules/import/import.service.ts
- **Committed in:** e8cde9e

---

**Total deviations:** 3 auto-fixed (3 bugs -- incorrect field/path references in plan)
**Impact on plan:** All auto-fixes necessary for type-safe compilation. No scope creep.

## Known Stubs
None -- all parser functions, service methods, processor logic, and gateway events are fully implemented.

## Issues Encountered
None -- build and tests passed after deviation fixes.

## User Setup Required
None - no external service configuration required. IMPORT_QUEUE uses the existing Redis connection from QueueModule.

## Next Phase Readiness
- Import backend fully operational -- Plans 04-06 can build calendar sync, SIS API, and frontend against ImportService/ImportController
- Socket.IO /import namespace ready for frontend integration (Plan 06 import UI)
- All 34 import-related tests passing

## Self-Check: PASSED

- All 12 created files verified present on disk
- Commit 3284d14 (Task 1) found in git log
- Commit e8cde9e (Task 2) found in git log
- Build: 0 TSC issues, 343 files compiled
- Tests: 34 passed across 3 spec files

---
*Phase: 08-homework-exams-data-import*
*Completed: 2026-04-07*
