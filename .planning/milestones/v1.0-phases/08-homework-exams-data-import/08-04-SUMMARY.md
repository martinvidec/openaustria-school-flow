---
phase: 08-homework-exams-data-import
plan: 04
subsystem: api, calendar, sis
tags: [ical-generator, calendar-token, sis-api, api-key-guard, nestjs, prisma, casl]

# Dependency graph
requires:
  - phase: 08-homework-exams-data-import
    plan: 01
    provides: "CalendarToken + SisApiKey Prisma models, Wave 0 test stubs"
  - phase: 08-homework-exams-data-import
    plan: 02
    provides: "HomeworkService, ExamService, HomeworkModule exports"
  - phase: 08-homework-exams-data-import
    plan: 03
    provides: "ImportModule registered in AppModule"
provides:
  - "CalendarService: iCal subscription token management + ICS generation with timetable + homework + exams"
  - "CalendarController: public token-authenticated .ics endpoint + JWT-protected token CRUD"
  - "SisService: read-only student/teacher/class data + API key CRUD"
  - "SisController: API key-authenticated SIS endpoints + JWT-protected key management"
  - "SisApiKeyGuard: X-Api-Key header validation with lastUsed tracking"
  - "CalendarModule registered in AppModule"
  - "CASL permission seeds for Phase 8 entities: homework, exam, import, calendar-token, sis-api-key"
affects: [08-05, 08-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [token-authenticated public endpoint with @Public() decorator, API key guard pattern for external system integration, ICS generation combining multiple data sources]

key-files:
  created:
    - apps/api/src/modules/calendar/calendar.service.ts
    - apps/api/src/modules/calendar/calendar.controller.ts
    - apps/api/src/modules/calendar/sis.service.ts
    - apps/api/src/modules/calendar/sis.controller.ts
    - apps/api/src/modules/calendar/guards/sis-api-key.guard.ts
    - apps/api/src/modules/calendar/dto/calendar-token.dto.ts
    - apps/api/src/modules/calendar/dto/sis-response.dto.ts
    - apps/api/src/modules/calendar/calendar.module.ts
  modified:
    - apps/api/src/modules/calendar/__tests__/calendar.service.spec.ts
    - apps/api/src/modules/calendar/__tests__/sis.service.spec.ts
    - apps/api/src/app.module.ts
    - apps/api/prisma/seed.ts

key-decisions:
  - "CalendarService queries timetable lessons, homework, and exams directly via Prisma rather than importing HomeworkService/ExamService -- avoids circular dependency since CalendarModule imports HomeworkModule"
  - "SisApiKeyGuard updates lastUsed timestamp synchronously (not fire-and-forget) for accurate audit trail"
  - "CASL seeds: Lehrer gets full homework/exam CRUD; Eltern and Schueler get read-only homework/exam plus calendar-token management"

patterns-established:
  - "Token-in-URL public endpoint: @Public() bypasses JwtAuthGuard, token validated in service layer (D-09 pattern for calendar subscriptions)"
  - "API key guard pattern: SisApiKeyGuard reads X-Api-Key header, validates against DB, sets request.sisSchoolId for downstream controller use"
  - "Combined ICS generation: CalendarService aggregates timetable lessons (VEVENT weekly recurrence), homework (all-day HA: prefix), and exams (all-day Pruefung: prefix) into single ICS feed"

requirements-completed: [IMPORT-03, IMPORT-04]

# Metrics
duration: 10min
completed: 2026-04-08
---

# Phase 8 Plan 04: Calendar & SIS Integration Summary

**iCal subscription with token-authenticated .ics endpoint combining timetable/homework/exams, plus SIS read-only API with X-Api-Key guard and CASL permission seeds for all Phase 8 entities**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-07T21:49:06Z
- **Completed:** 2026-04-07T21:59:38Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Implemented CalendarService with token management (generate/revoke/regenerate) and ICS generation combining timetable lessons, homework due dates ("HA:" prefix), and exam dates ("Pruefung:" prefix) in Europe/Vienna timezone
- Created CalendarController with public token-authenticated .ics endpoint (D-09) and JWT-protected token CRUD endpoints with CheckPermissions CASL guards
- Implemented SisService with API key CRUD and read-only student/teacher/class data for external SIS consumers (IMPORT-04)
- Created SisApiKeyGuard validating X-Api-Key header against prisma.sisApiKey with lastUsed timestamp tracking
- Registered CalendarModule in AppModule with HomeworkModule import for data access
- Added CASL permission seeds for homework, exam, import, calendar-token, and sis-api-key across all 4 non-admin roles
- Converted all 15 Wave 0 it.todo() test stubs to real passing tests (7 calendar + 8 SIS)

## Task Commits

Each task was committed atomically:

1. **Task 1: CalendarService + CalendarController + tests** - `0a9db33` (feat)
2. **Task 2: SisService + SisApiKeyGuard + CalendarModule + CASL seeds** - `cc17b36` (feat)

## Files Created/Modified
- `apps/api/src/modules/calendar/calendar.service.ts` - iCal token management + ICS generation with timetable/homework/exam events
- `apps/api/src/modules/calendar/calendar.controller.ts` - Public .ics endpoint + JWT-protected token CRUD
- `apps/api/src/modules/calendar/sis.service.ts` - API key CRUD + read-only student/teacher/class data
- `apps/api/src/modules/calendar/sis.controller.ts` - API key-auth SIS endpoints + JWT-protected key management
- `apps/api/src/modules/calendar/guards/sis-api-key.guard.ts` - X-Api-Key header guard with lastUsed tracking
- `apps/api/src/modules/calendar/dto/calendar-token.dto.ts` - CalendarTokenResponseDto
- `apps/api/src/modules/calendar/dto/sis-response.dto.ts` - SisStudentDto, SisTeacherDto, SisClassDto, SisApiKeyResponseDto
- `apps/api/src/modules/calendar/calendar.module.ts` - CalendarModule with providers, controllers, exports
- `apps/api/src/modules/calendar/__tests__/calendar.service.spec.ts` - 7 real tests (converted from it.todo stubs)
- `apps/api/src/modules/calendar/__tests__/sis.service.spec.ts` - 8 real tests (converted from it.todo stubs)
- `apps/api/src/app.module.ts` - CalendarModule added to imports
- `apps/api/prisma/seed.ts` - Phase 8 CASL permission seeds for all roles

## Decisions Made
- CalendarService queries timetable/homework/exams directly via Prisma rather than importing service classes -- avoids circular dependency
- SisApiKeyGuard updates lastUsed synchronously for accurate audit trail
- CASL seed hierarchy: Lehrer gets full homework/exam CRUD + calendar-token; Eltern/Schueler get read-only homework/exam + calendar-token management

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs
None -- all it.todo() stubs converted to real passing tests.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CalendarService and SisService exported from CalendarModule for frontend integration in Plans 05-06
- All 15 calendar/SIS tests passing, establishing test patterns for future plans
- CASL permissions seeded for all Phase 8 subjects -- frontend can now enforce permission-gated UI
- iCal .ics endpoint ready for integration testing with calendar apps (Google Calendar, Apple Calendar)
- SIS API ready for external system integration testing via X-Api-Key header

## Self-Check: PASSED

All 8 created files verified present on disk. Commits 0a9db33 (Task 1) and cc17b36 (Task 2) verified in git log. Build: 0 TSC issues, 351 files compiled. Tests: 15 passed across 2 spec files.

---
*Phase: 08-homework-exams-data-import*
*Completed: 2026-04-08*
