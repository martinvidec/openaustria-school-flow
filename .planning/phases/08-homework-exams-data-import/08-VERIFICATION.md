---
phase: 08-homework-exams-data-import
verified: 2026-04-09T05:36:48Z
status: passed
score: 7/7 must-haves verified
re_verification: false
gaps: []
human_verification:
  - test: "HW-01/HW-02: Create homework via classbook lesson detail, then view badge on timetable"
    expected: "Homework created by teacher appears as BookOpen badge on the lesson's timetable cell"
    why_human: "Badge rendering requires live data from running API; cannot verify badge -> cell mapping programmatically across rendering"
  - test: "HW-02: Create two exams for same class on same day"
    expected: "Second exam creation shows yellow ExamCollisionWarning banner with 'Trotzdem eintragen' option"
    why_human: "Collision detection UX flow requires interactive form state with real-time collision check; visual and interactive"
  - test: "IMPORT-01: Upload Untis XML file in import wizard"
    expected: "Parsed entity counts appear in ImportUntisPreview; dry-run and progress steps complete"
    why_human: "Requires running app, file upload, WebSocket progress, multi-step wizard state machine"
  - test: "IMPORT-03: Generate iCal token, paste URL in calendar app"
    expected: "ICS file downloads with VCALENDAR, VEVENT entries for timetable, homework, exams"
    why_human: "End-to-end calendar subscription requires running API and external calendar app"
  - test: "IMPORT-04: SIS API key auth"
    expected: "curl -H 'X-Api-Key: KEY' /api/v1/sis/students returns JSON students; without key returns 401/403"
    why_human: "Requires running API with seeded SIS key; cannot curl offline"
---

# Phase 8: Homework, Exams & Data Import Verification Report

**Phase Goal:** Homework and exams are visible in the timetable with collision detection, and schools can migrate their existing data from Untis or CSV files into SchoolFlow
**Verified:** 2026-04-09T05:36:48Z
**Status:** PASSED
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Prisma schema contains Homework, Exam, ImportJob, CalendarToken, SisApiKey models | VERIFIED | `grep -c "model Homework\|model Exam\|model ImportJob\|model CalendarToken\|model SisApiKey"` returns 5 |
| 2 | Teacher can create homework linked to a lesson with title, description, dueDate | VERIFIED | `HomeworkService.create()` calls `prisma.homework.create` with DI-injected `NotificationService`; `HomeworkController` exposes `POST /api/v1/schools/:schoolId/homework` |
| 3 | Teacher can create exam with soft collision detection | VERIFIED | `ExamService.checkCollision()` queries `prisma.exam.findFirst` with `classId+date`; `create()` attaches collision info to response; `exam.controller.ts` has `GET collision-check` endpoint |
| 4 | Students and parents receive HOMEWORK_ASSIGNED and EXAM_SCHEDULED notifications | VERIFIED | Both services call `NotificationService.create()` with correct `NotificationType` enum values after every `create()` call |
| 5 | Admin can upload Untis XML/DIF or CSV files and see dry-run preview before committing | VERIFIED | `ImportService.uploadAndParse()` + `startDryRun()` + `commitImport()`; `ImportProcessor` runs as BullMQ `@Processor(IMPORT_QUEUE)` worker; `ImportWizard` (5-step) wired to `useUploadImport`, `useDryRun`, `useCommitImport` hooks |
| 6 | User can generate a personal iCal URL containing timetable, homework, and exams | VERIFIED | `CalendarService.generateIcs()` uses `ical-generator` with `prisma.homework.findMany` + `prisma.exam.findMany`; `@Public() GET /api/v1/calendar/:token.ics` endpoint returns `text/calendar`; `ICalSettings` component with generate/copy/revoke UI wired in settings page |
| 7 | External SIS systems can read school data via API key-authenticated endpoints | VERIFIED | `SisApiKeyGuard` checks `X-Api-Key` header against `prisma.sisApiKey.findFirst`; `SisController` exposes `GET /api/v1/sis/students|teachers|classes`; `SisService` makes real Prisma queries |

**Score:** 7/7 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/prisma/schema.prisma` | Homework, Exam, ImportJob, CalendarToken, SisApiKey models + 4 enums | VERIFIED | All 5 models present; HOMEWORK_ASSIGNED, EXAM_SCHEDULED in NotificationType enum |
| `packages/shared/src/types/homework.ts` | HomeworkDto, ExamDto, ExamCollisionDto types | VERIFIED | Exports confirmed; re-exported from `packages/shared/src/index.ts` |
| `packages/shared/src/types/import.ts` | ImportJobDto, ImportDryRunResult, ImportProgressEvent types | VERIFIED | All types present and re-exported |
| `packages/shared/src/types/calendar.ts` | CalendarTokenDto, SisApiKeyDto types | VERIFIED | All types present and re-exported |
| `apps/api/src/modules/homework/homework.service.ts` | Homework CRUD with HOMEWORK_ASSIGNED notification side-effect | VERIFIED | `prisma.homework.create` + `NotificationService.create(HOMEWORK_ASSIGNED)` confirmed (3 occurrences of HOMEWORK_ASSIGNED) |
| `apps/api/src/modules/homework/exam.service.ts` | Exam CRUD with checkCollision and EXAM_SCHEDULED notification | VERIFIED | `checkCollision` found (4 occurrences), `EXAM_SCHEDULED` found (3 occurrences), `prisma.exam.findFirst` for collision |
| `apps/api/src/modules/homework/homework.controller.ts` | REST endpoints for homework CRUD | VERIFIED | `HomeworkController` in `homework.module.ts`; registered in `app.module.ts` |
| `apps/api/src/modules/homework/exam.controller.ts` | REST endpoints with collision-check endpoint | VERIFIED | `GET collision-check` endpoint confirmed (3 matches) |
| `apps/api/src/modules/import/parsers/untis-xml.parser.ts` | `parseUntisXml` function with XMLParser | VERIFIED | `parseUntisXml` present; `XMLParser` from `fast-xml-parser` used |
| `apps/api/src/modules/import/parsers/untis-dif.parser.ts` | `parseUntisTeachersDif` and sibling functions | VERIFIED | `parseUntisTeachersDif` present; `papaparse` used |
| `apps/api/src/modules/import/parsers/csv.parser.ts` | `parseCsv` with auto-delimiter detection | VERIFIED | `parseCsv` present; `Papa.parse` used; behavioral spot-check confirms semicolon detection |
| `apps/api/src/modules/import/import.service.ts` | Import orchestration with `filePath` coupling | VERIFIED | `filePath` found (12 occurrences); `uploadAndParse`, `startDryRun`, `commitImport` methods |
| `apps/api/src/modules/import/processors/import.processor.ts` | BullMQ `@Processor(IMPORT_QUEUE)` worker | VERIFIED | `@Processor` confirmed; `gateway.emitProgress` called (2 occurrences) |
| `apps/api/src/modules/import/import-events.gateway.ts` | Socket.IO `/import` namespace with `emitProgress` | VERIFIED | `emitProgress` method present; `import:progress` event emitted |
| `apps/api/src/modules/calendar/calendar.service.ts` | ICS generation with timetable + homework + exams | VERIFIED | `generateIcs` uses `ical-generator` (`ical`, `createEvent`); `HA:` and `Pruefung:` prefixes confirmed |
| `apps/api/src/modules/calendar/calendar.controller.ts` | Token-authenticated `@Public()` `.ics` endpoint | VERIFIED | `@Public()` decorator confirmed; `text/calendar` content type set; `findByToken + generateIcs` wired |
| `apps/api/src/modules/calendar/sis.service.ts` | Read-only SIS data access | VERIFIED | `prisma.sisApiKey`, `prisma.student`, `prisma.teacher`, `prisma.schoolClass` queries present |
| `apps/api/src/modules/calendar/sis.controller.ts` | `/api/v1/sis/` endpoints with `SisApiKeyGuard` | VERIFIED | Guard wired; student/teacher/class endpoints present |
| `apps/api/src/modules/calendar/guards/sis-api-key.guard.ts` | `X-Api-Key` header guard with `prisma.sisApiKey.findFirst` | VERIFIED | `x-api-key`, `sisSchoolId`, `prisma.sisApiKey.findFirst` all confirmed |
| `apps/web/src/components/homework/HomeworkDialog.tsx` | Create/edit homework dialog | VERIFIED | "Hausaufgabe erstellen" confirmed; wired via `useCreateHomework`; used in classbook `$lessonId.tsx` |
| `apps/web/src/components/homework/ExamDialog.tsx` | Exam dialog with collision detection | VERIFIED | "Pruefung eintragen" confirmed; wired in classbook `$lessonId.tsx` |
| `apps/web/src/components/homework/ExamCollisionWarning.tsx` | Collision warning with "Trotzdem eintragen" | VERIFIED | Both strings and `role="alert"` confirmed |
| `apps/web/src/components/homework/TimetableCellBadges.tsx` | Badge overlay component | VERIFIED | 4 matches in timetable route; correctly wraps `TimetableCell` in `renderCellWithBadges` |
| `apps/web/src/hooks/useHomework.ts` | TanStack Query hooks for homework CRUD | VERIFIED | `useHomework`, `useCreateHomework`, `useDeleteHomework` all exported; `apiFetch` to `/api/v1/schools/:schoolId/homework` |
| `apps/web/src/hooks/useExams.ts` | TanStack Query hooks including `useExamCollisionCheck` | VERIFIED | `useExamCollisionCheck` exported; `apiFetch` to `/exams` endpoints |
| `apps/web/src/components/import/ImportWizard.tsx` | 5-step import wizard | VERIFIED | Uses `useUploadImport`, `useDryRun`, `useCommitImport`, `useImportSocket` |
| `apps/web/src/components/import/ImportColumnMapper.tsx` | CSV column mapping UI | VERIFIED | File exists; exported |
| `apps/web/src/components/calendar/ICalSettings.tsx` | iCal subscription URL card | VERIFIED | "Kalender-Abonnement", "URL kopieren", "Token erneuern", `clipboard` all confirmed |
| `apps/web/src/routes/_authenticated/admin/import.tsx` | Admin import page | VERIFIED | `ImportWizard` referenced (3 matches) |
| `apps/web/src/components/layout/AppSidebar.tsx` | Admin-only "Datenimport" link | VERIFIED | "Datenimport" confirmed; `href: '/admin/import'` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `homework.service.ts` | `notification.service.ts` | `NotificationService` DI, `HOMEWORK_ASSIGNED` type | WIRED | 3 occurrences of `HOMEWORK_ASSIGNED` in `create()` flow |
| `exam.service.ts` | `prisma.exam` | `checkCollision` → `findFirst(classId, date)` | WIRED | 4 occurrences of `checkCollision`; confirmed `prisma.exam.findFirst` with `classId+date` filter |
| `import.processor.ts` | `import-events.gateway.ts` | `gateway.emitProgress()` | WIRED | 2 occurrences in processor; `emitProgress` method confirmed in gateway |
| `import.controller.ts` | `import.service.ts` | Upload→dry-run→commit flow | WIRED | `importService.uploadAndParse`, `importService.startDryRun`, `importService.commitImport` all called |
| `calendar.service.ts` | `ical-generator` | `ical(...)` + `cal.createEvent(...)` | WIRED | 3 `createEvent` calls; `HA:` homework prefix + `Pruefung:` exam prefix confirmed |
| `calendar.controller.ts` | `calendar.service.ts` | `findByToken` → `generateIcs` | WIRED | Line 42: `findByToken(token)`, line 47: `generateIcs(...)` |
| `sis-api-key.guard.ts` | `prisma.sisApiKey` | `findFirst({ where: { key, isActive: true } })` | WIRED | `prisma.sisApiKey.findFirst` confirmed at line 22 |
| `ImportWizard.tsx` | `useImport.ts` | Upload→dry-run→commit flow via hooks | WIRED | Line 9 imports confirmed; `dryRunMutation`, `commitMutation` used in wizard |
| `useImportSocket.ts` | Socket.IO `/import` namespace | `socket.on('import:progress', ...)` | WIRED | Line 61: event handler confirmed |
| `AppSidebar.tsx` | `/admin/import` | Admin-only nav item | WIRED | `href: '/admin/import'` confirmed; "Datenimport" label present |
| `TimetableCellBadges.tsx` | `timetable/index.tsx` | `renderCellWithBadges` callback using `renderCell` prop | WIRED | `TimetableCellBadges` wrapped around `TimetableCell` at lines 159-172 in timetable route |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `timetable/index.tsx` (badges) | `allHomework`, `allExams` | `useHomework(schoolId)` → `GET /api/v1/schools/:schoolId/homework` → `prisma.homework.findMany` | Yes — real Prisma query | FLOWING |
| `HomeworkExamList.tsx` (classbook) | `homework`, `exams` | `useHomework(schoolId, classSubjectId)` → real API | Yes — filtered by classSubjectId | FLOWING |
| `calendar.service.ts` (ICS) | `homeworkItems`, `exams` | `prisma.homework.findMany`, `prisma.exam.findMany` | Yes — real Prisma queries | FLOWING |
| `sis.service.ts` (SIS data) | students/teachers/classes | `prisma.student.findMany`, `prisma.teacher.findMany`, `prisma.schoolClass.findMany` | Yes — real Prisma queries | FLOWING |
| `homework.controller.ts` `GET /by-lesson/:classBookEntryId` | (none) | Hardcoded `return []` — no Prisma query | No | STATIC (warning only — frontend uses `useHomework(schoolId, classSubjectId)` path instead, not `useHomeworkByLesson`; UX unaffected) |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| NestJS build compiles all 351 files | `pnpm nest build` | `Found 0 issues. Successfully compiled: 351 files with swc` | PASS |
| All 7 Phase 8 spec files pass | `pnpm vitest run src/modules/homework/__tests__/ src/modules/import/__tests__/ src/modules/calendar/__tests__/` | `7 passed (7 files) / 69 tests passed` | PASS |
| `parseCsv` exported from dist | `node -e "require('./dist/...csv.parser'); console.log(typeof m.parseCsv)"` | `function` | PASS |
| CSV auto-detects semicolon delimiter | `parseCsv('Vorname;Nachname\nMax;Muster')` | `{"detectedDelimiter":";","headers":["Vorname","Nachname"],"data":[["Max","Muster"]]}` | PASS |
| Wave 0 stubs fully converted to real tests | `grep -c "it.todo" homework.service.spec.ts` | 0 remaining stubs; 9+11+13+9+8+7+12 = 69 real tests | PASS |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| HW-01 | 08-01, 08-02, 08-05 | Teacher assigns homework to lesson, visible in timetable | SATISFIED | `HomeworkService.create()`, `HomeworkController POST`, timetable badge via `TimetableCellBadges` |
| HW-02 | 08-01, 08-02, 08-05 | Teacher schedules exams with collision detection (no 2 exams same day/class) | SATISFIED | `ExamService.checkCollision()`, `ExamDialog` with inline `ExamCollisionWarning` |
| HW-03 | 08-01, 08-02, 08-05 | Students/parents see homework/exams in timetable + push notifications | SATISFIED | `HOMEWORK_ASSIGNED`/`EXAM_SCHEDULED` in `NotificationService`; badges visible to all roles via `TimetableCellBadges` |
| IMPORT-01 | 08-01, 08-03, 08-06 | Admin imports Untis XML/DIF format (teachers, classes, rooms, timetables) | SATISFIED | `parseUntisXml`, `parseUntisTeachersDif`; `ImportProcessor` BullMQ job; `ImportWizard` wizard |
| IMPORT-02 | 08-01, 08-03, 08-06 | Admin imports CSV files with column mapping | SATISFIED | `parseCsv` with auto-delimiter; `ImportColumnMapper` UI; conflict modes (SKIP/UPDATE/FAIL) |
| IMPORT-03 | 08-01, 08-04, 08-06 | System offers iCal/ICS export for personal calendars | SATISFIED | `CalendarService.generateIcs()` with homework+exam events; `@Public()` token-URL endpoint; `ICalSettings` UI |
| IMPORT-04 | 08-01, 08-04, 08-06 | API enables SIS system data integration | SATISFIED | `SisApiKeyGuard`; `SisController`; `SisService` with real Prisma queries |

**Orphaned requirements check:** REQUIREMENTS.md maps all 7 IDs to Phase 8. All 7 are claimed in plan frontmatter. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `apps/api/src/modules/homework/homework.controller.ts` | 99 | `return []` in `GET /by-lesson/:classBookEntryId` — no Prisma query, hardcoded empty | Warning | The `useHomeworkByLesson` hook in the frontend calls this endpoint, but the classbook page (`$lessonId.tsx`) uses `HomeworkExamList` which calls `useHomework(schoolId, classSubjectId)` instead — so the by-lesson path is unused in practice. UX is unaffected but the endpoint is a dead stub. |
| `apps/api/src/modules/homework/exam.controller.ts` | 81 | `return []` for no-filter case on `GET /exams` | Info | Intentional behavior: the endpoint documents that callers must provide `classId` or `classSubjectId` filter. Not a stub — callers always pass filters. |

### Human Verification Required

#### 1. Homework badge on timetable after create

**Test:** Log in as Lehrer, open Klassenbuch > lesson detail, click "Hausaufgabe erstellen", fill in title and dueDate, submit. Then navigate to Stundenplan.
**Expected:** The corresponding timetable cell shows a BookOpen icon badge (primary blue, 16x16px, top-right corner). Clicking the badge opens a popover with the homework title and due date.
**Why human:** Badge rendering requires live data from running API, TanStack Query cache, and visual verification of icon placement in the timetable cell overlay.

#### 2. Exam collision warning

**Test:** As Lehrer, create Exam A for class 5A on date 2026-05-15. Then create Exam B for class 5A on the same date.
**Expected:** On the second create, `ExamCollisionWarning` appears with yellow banner: "Achtung: Am 2026-05-15 ist bereits eine Prüfung für diese Klasse eingetragen (Exam A). Trotzdem eintragen?". Clicking "Trotzdem eintragen" creates the second exam.
**Why human:** Collision detection flow is interactive form state with real-time API calls; visual warning placement needs review.

#### 3. Untis XML import end-to-end

**Test:** Log in as Admin, navigate to sidebar "Datenimport" → `/admin/import`. Upload a minimal Untis-style XML file. Click through the 5-step wizard (upload → Untis preview → dry-run → progress → result).
**Expected:** Step 2 shows parsed entity counts. Progress bar animates during import. Step 5 shows import summary with counts.
**Why human:** Multi-step wizard state machine + WebSocket progress + file upload require running stack.

#### 4. iCal subscription URL downloads valid ICS

**Test:** Navigate to Settings → "Kalender-Abonnement". Click "Kalender-URL erstellen". Copy URL. Paste URL in browser.
**Expected:** Browser downloads a `.ics` file containing `BEGIN:VCALENDAR`, `PRODID:SchoolFlow`, `BEGIN:VEVENT` entries including `SUMMARY:HA:` (homework) and `SUMMARY:Pruefung:` (exam) events.
**Why human:** End-to-end calendar subscription involves running API, token lookup, ICS generation, and HTTP download with correct `Content-Type: text/calendar` header.

#### 5. SIS API key auth

**Test:** Create a SIS API key via `POST /api/v1/schools/:schoolId/sis/api-keys`. Use `curl -H "X-Api-Key: YOUR_KEY" http://localhost:3000/api/v1/sis/students`. Also test without header.
**Expected:** With valid key: JSON array of students. Without key: 403 response.
**Why human:** Requires running API with seeded school data and valid Keycloak JWT for key creation.

### Gaps Summary

No blocking gaps found. All 7 requirements have verified implementation paths from database schema through backend services to frontend UI. The single warning-level finding (stubbed `/by-lesson/:classBookEntryId` controller endpoint) has no user-facing impact because the classbook page routes through the working `useHomework(schoolId, classSubjectId)` path.

---

_Verified: 2026-04-09T05:36:48Z_
_Verifier: Claude (gsd-verifier)_
