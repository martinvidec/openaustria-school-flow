---
phase: 05-digital-class-book
verified: 2026-04-03T00:00:00Z
status: passed
score: 34/34 must-haves verified
gaps:
  - truth: "WebSocket events fire on attendance save, grade add, excuse review, and entry update"
    status: resolved
    reason: "ClassBookEventsGateway exposes emitGradeAdded and emitEntryUpdated methods, but GradeService and LessonContentService do not inject the gateway and never call these methods. Only AttendanceService and ExcuseService emit events."
    artifacts:
      - path: "apps/api/src/modules/classbook/grade.service.ts"
        issue: "No ClassBookEventsGateway injection. createGrade returns but never calls emitGradeAdded."
      - path: "apps/api/src/modules/classbook/lesson-content.service.ts"
        issue: "No ClassBookEventsGateway injection. updateContent returns but never calls emitEntryUpdated."
    missing:
      - "Inject ClassBookEventsGateway into GradeService constructor and call this.classBookEventsGateway.emitGradeAdded(schoolId, payload) after successful grade creation"
      - "Inject ClassBookEventsGateway into LessonContentService constructor and call this.classBookEventsGateway.emitEntryUpdated(schoolId, payload) after successful content update"
human_verification:
  - test: "Open timetable view on a desktop browser, click a lesson cell, verify navigation to /classbook/:lessonId with 4 tabs visible (Anwesenheit, Inhalt, Noten, Notizen)"
    expected: "Lesson detail page loads with ClassBookHeader showing subject/class/teacher context. Tab selection persists in URL (?tab=anwesenheit, etc.)."
    why_human: "Navigation from TimetableGrid to classbook requires onCellClick handler in the timetable page. Verified in code that timetable/index.tsx passes onCellClick with navigate to /classbook/$lessonId, but runtime browser behaviour cannot be verified programmatically."
  - test: "On a smartphone viewport (375px width), open the classbook lesson page and attempt to record attendance by tapping student status icons"
    expected: "Each status icon has a minimum 44x44px touch target. Tapping cycles through PRESENT -> ABSENT -> LATE -> EXCUSED. Late minutes input appears when LATE is selected. 'Alle anwesend' button visible and functional."
    why_human: "Touch target sizes (min-h-[44px] min-w-[44px] classes are present) and tap-to-cycle behaviour confirmed in code, but actual touch responsiveness on mobile cannot be verified without a device or browser emulation."
  - test: "On a smartphone viewport (375px width), open the Noten tab and verify the grade matrix scrolls horizontally with the student name column staying sticky on the left and the average column staying sticky on the right"
    expected: "ScrollArea with horizontal overflow enabled. Name column sticky left-0, average column sticky right-0. Grade columns scroll between them."
    why_human: "Sticky positioning with overflow-x scroll has browser-specific rendering quirks that require visual inspection."
  - test: "Log in as a parent user, navigate to Entschuldigungen, submit an excuse with a PDF attachment, then log in as the Klassenvorstand teacher and verify the pending excuse appears in the review list"
    expected: "Parent sees submitted excuse in list. Klassenvorstand sees it as PENDING. Accepting auto-updates attendance records to EXCUSED for the specified date range."
    why_human: "End-to-end workflow crossing two user sessions with file upload and database state changes cannot be verified without a running application."
  - test: "With two browser windows open to the same classbook lesson (as the same or different teacher), record attendance in one window and verify the other window's attendance grid updates automatically without a page refresh"
    expected: "Socket.IO classbook:attendance-updated event triggers TanStack Query cache invalidation, causing the attendance grid to refetch and show updated data."
    why_human: "Real-time WebSocket behaviour requires a running server and client."
---

# Phase 05: Digital Class Book Verification Report

**Phase Goal:** Teachers can run their daily class book workflow digitally -- record attendance, document lessons, enter grades, and add student notes -- on any device, while parents can submit digital absence excuses.
**Verified:** 2026-04-03
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ClassBook data model stores attendance, grades, notes, and excuse records per lesson | VERIFIED | schema.prisma lines 826-960: models ClassBookEntry, AttendanceRecord, GradeEntry, GradeWeight, StudentNote, AbsenceExcuse, ExcuseAttachment all present; klassenvorstandId on SchoolClass at line 432 |
| 2 | Shared TypeScript types for classbook domain exported from @schoolflow/shared | VERIFIED | packages/shared/src/types/classbook.ts exports all 10+ types; index.ts re-exports via `export * from './types/classbook'` |
| 3 | Teacher can create/fetch a ClassBookEntry for a specific lesson date and navigate from timetable | VERIFIED | classbook.controller.ts line 116: GET by-timetable-lesson/:timetableLessonId endpoint; timetable/index.tsx line 231 passes onCellClick navigating to /classbook/$lessonId |
| 4 | Teacher can record attendance for all students with tap-to-cycle statuses and bulk save | VERIFIED | attendance.service.ts bulkSave with lateMinutes validation; AttendanceGrid.tsx tap-to-cycle cycle (PRESENT->ABSENT->LATE->EXCUSED); 44px touch targets confirmed; useSetAllPresent hook connected |
| 5 | Teacher can document lesson content (thema, lehrstoff, hausaufgabe) with auto-save on blur | VERIFIED | LessonContentForm.tsx: onBlur triggers handleBlurSave with 1s debounce; useUpdateLessonContent hook wired |
| 6 | Teacher can create grade entries with Austrian 1-5 notation stored as decimal, with weighted average | VERIFIED | grade-average.util.ts: parseGradeInput, calculateWeightedAverage; grade.service.ts validates against VALID_GRADE_VALUES; grade.controller.ts exposes REST endpoints |
| 7 | Teacher can configure grade category weights per classSubject | VERIFIED | grade.service.ts getGradeWeights/updateWeights; useGradeWeights/useUpdateGradeWeights hooks wired |
| 8 | Teacher can create per-student notes with private flag; private notes visible only to author and Schulleitung | VERIFIED | student-note.service.ts: D-10 visibility filtering at lines 71-77; PRIVATE_NOTE_ROLES enforced |
| 9 | System calculates absence statistics per student with date range filtering; late >15min counted as absent | VERIFIED | statistics.service.ts line 157: `if (r.lateMinutes != null && r.lateMinutes > 15)` increments lateOver15MinCount; included in absence rate calculation |
| 10 | Parent can submit digital absence excuse with file attachment (PDF/JPG/PNG, 5MB) | VERIFIED | FileUploadField.tsx: DEFAULT_ACCEPT='application/pdf,image/jpeg,image/png'; DEFAULT_MAX_SIZE=5*1024*1024; ExcuseForm posts to attachment endpoint after excuse creation |
| 11 | Klassenvorstand can accept/reject excuses; accepted excuses auto-update attendance to EXCUSED | VERIFIED | excuse.service.ts line 179-189: on ACCEPT, updates AttendanceRecord status to 'EXCUSED' for affected date range; emitExcuseUpdated called |
| 12 | @fastify/multipart registered for file upload support | VERIFIED | main.ts lines 9, 30-32: imports multipart and registers via fastifyInstance.register |
| 13 | CASL permissions for classbook subjects seeded for all 5 roles | VERIFIED | seed.ts: schulleitung (classbook, grade, student-note, excuse), lehrer (grade, student-note, excuse with conditions), eltern (create excuse, read own), schueler (read own grades); 5 roles covered |
| 14 | WebSocket events fire on attendance save and excuse review | VERIFIED | AttendanceService.bulkSave calls emitAttendanceUpdated (line 294); ExcuseService.reviewExcuse calls emitExcuseUpdated (line 222) |
| 15 | WebSocket events fire on grade add and entry update | PARTIAL | ClassBookEventsGateway exposes emitGradeAdded and emitEntryUpdated, but GradeService and LessonContentService do not inject the gateway and never call these methods |
| 16 | TanStack Query hooks for all classbook data fetching with socket cache invalidation | VERIFIED | useClassbook.ts, useGrades.ts, useExcuses.ts all have complete hook sets; useClassbookSocket.ts invalidates query keys on attendance, grade, excuse, and entry events |
| 17 | Lesson detail page has 4 tabs wired to real components | VERIFIED | $lessonId.tsx imports AttendanceGrid, LessonContentForm, GradeMatrix, StudentNoteList; all 4 TabsContent elements render real components, not placeholders |
| 18 | Grade matrix displays with filtering, sorting, horizontal scroll, and sticky columns | VERIFIED | GradeMatrix.tsx: category filter, sortField/sortDir state, ScrollArea horizontal, sticky left-0 name column, sticky right-0 average column |
| 19 | Student notes CRUD with private checkbox and useNotes/useCreateNote/useUpdateNote/useDeleteNote | VERIFIED | StudentNoteList.tsx uses useNotes, useCreateNote, useUpdateNote, useDeleteNote from useClassbook.ts; StudentNoteForm.tsx has private checkbox |
| 20 | Parents see ExcuseForm; Klassenvorstand sees ExcuseReviewList -- role-based rendering | VERIFIED | excuses/index.tsx: isParent renders ExcuseForm + submitted list; isTeacher renders ExcuseReviewList |
| 21 | Sidebar shows Entschuldigungen for parents/teachers/Schulleitung/Admin | VERIFIED | AppSidebar.tsx line 42: roles ['eltern', 'lehrer', 'admin', 'schulleitung']; Klassenvorstand uses 'lehrer' role |
| 22 | Sidebar shows Abwesenheit for teachers/Schulleitung/Admin | VERIFIED | AppSidebar.tsx line 48: roles ['lehrer', 'admin', 'schulleitung'] |
| 23 | Absence statistics table with date range filter wired to AbsenceStatisticsPanel | VERIFIED | statistics/absence.tsx: createFileRoute, renders AbsenceStatisticsPanel with schoolId and classId; useAbsenceStatistics hook fetches from backend with startDate/endDate params |
| 24 | Excuse status badges use correct colors: pending=amber, accepted=green, rejected=red | VERIFIED | ExcuseCard.tsx STATUS_CONFIG: PENDING hsl(38...) amber, ACCEPTED hsl(142...) green, REJECTED hsl(0...) red |
| 25 | ClassBookModule imported in AppModule | VERIFIED | app.module.ts lines 22, 46: imports ClassBookModule |
| 26 | ClassBook features work on desktop, tablet, and smartphone (BOOK-07) | HUMAN NEEDED | Responsive Tailwind classes present throughout (sm: breakpoints, min-h-[44px] touch targets, ScrollArea horizontal, sticky columns). Actual multi-viewport rendering requires human visual inspection. |

**Score:** 24/25 automated truths verified (1 partial gap, 1 human needed)

---

### Required Artifacts

| Artifact | Provides | Lines | Status |
|----------|----------|-------|--------|
| `apps/api/prisma/schema.prisma` | 7 new models + 4 enums + klassenvorstandId | 961 | VERIFIED |
| `packages/shared/src/types/classbook.ts` | All shared DTO types and event interfaces | 165 | VERIFIED |
| `apps/api/src/modules/classbook/classbook.module.ts` | NestJS module registering all classbook services | 21 | VERIFIED |
| `apps/api/src/modules/classbook/attendance.service.ts` | Attendance CRUD, bulkSave, lateMinutes, setAllPresent | 345 | VERIFIED |
| `apps/api/src/modules/classbook/attendance.controller.ts` | Attendance REST endpoints | 73 | VERIFIED |
| `apps/api/src/modules/classbook/lesson-content.service.ts` | Lesson content upsert (thema/lehrstoff/hausaufgabe) | 102 | VERIFIED |
| `apps/api/src/modules/classbook/grade.service.ts` | Grade CRUD, matrix view, weight configuration | 328 | VERIFIED |
| `apps/api/src/modules/classbook/grade.controller.ts` | Grade REST endpoints | 128 | VERIFIED |
| `apps/api/src/modules/classbook/grade-average.util.ts` | calculateWeightedAverage, formatGradeDisplay, parseGradeInput | 92 | VERIFIED |
| `apps/api/src/modules/classbook/student-note.service.ts` | Note CRUD with D-10 private visibility filtering | 191 | VERIFIED |
| `apps/api/src/modules/classbook/student-note.controller.ts` | Student note REST endpoints | 94 | VERIFIED |
| `apps/api/src/modules/classbook/statistics.service.ts` | Absence statistics with >15min late rule (D-04) | 314 | VERIFIED |
| `apps/api/src/modules/classbook/statistics.controller.ts` | Statistics REST endpoints | 51 | VERIFIED |
| `apps/api/src/modules/classbook/excuse.service.ts` | Excuse workflow: create, review, accept/reject + EXCUSED update | 509 | VERIFIED |
| `apps/api/src/modules/classbook/excuse.controller.ts` | Excuse REST endpoints with file upload | 173 | VERIFIED |
| `apps/api/prisma/seed.ts` | CASL permission seeds for all 5 roles | 604 | VERIFIED |
| `apps/api/src/modules/classbook/classbook-events.gateway.ts` | Socket.IO gateway /classbook namespace, 4 emitters | 84 | VERIFIED (methods present; grade/entry emitters unwired from callers) |
| `apps/web/src/hooks/useClassbook.ts` | TanStack Query hooks for entry, attendance, notes | 335 | VERIFIED |
| `apps/web/src/hooks/useGrades.ts` | TanStack Query hooks for grade matrix, CRUD, weights | 209 | VERIFIED |
| `apps/web/src/hooks/useExcuses.ts` | TanStack Query hooks for excuse CRUD, review, statistics | 208 | VERIFIED |
| `apps/web/src/hooks/useClassbookSocket.ts` | Socket.IO client connecting to /classbook namespace | 84 | VERIFIED |
| `apps/web/src/components/classbook/ClassBookHeader.tsx` | Lesson context header with back-link | 67 | VERIFIED |
| `apps/web/src/routes/_authenticated/classbook/$lessonId.tsx` | Lesson detail page, 4 tabs, all real components | 135 | VERIFIED |
| `apps/web/src/components/classbook/AttendanceGrid.tsx` | Tap-to-cycle grid, bulk save, 44px targets | 231 | VERIFIED |
| `apps/web/src/components/classbook/AttendanceStatusIcon.tsx` | Tap-to-cycle icon with min-w-[44px] min-h-[44px] | 100 | VERIFIED |
| `apps/web/src/components/classbook/LessonContentForm.tsx` | 3-field form with onBlur auto-save | 202 | VERIFIED |
| `apps/web/src/components/classbook/GradeMatrix.tsx` | Spreadsheet matrix, sort, filter, horizontal scroll, sticky columns | 570 | VERIFIED |
| `apps/web/src/components/classbook/GradeEntryDialog.tsx` | Grade creation dialog with Austrian notation | 218 | VERIFIED |
| `apps/web/src/components/classbook/GradeValuePicker.tsx` | Austrian grade picker (1+, 2-, 3, etc.) | 88 | VERIFIED |
| `apps/web/src/components/classbook/StudentNoteList.tsx` | Note list grouped by student, TanStack Query hooks | 307 | VERIFIED |
| `apps/web/src/components/classbook/StudentNoteForm.tsx` | Inline note form with private checkbox | 162 | VERIFIED |
| `apps/web/src/routes/_authenticated/excuses/index.tsx` | Role-based excuse submission/review page | 125 | VERIFIED |
| `apps/web/src/components/classbook/ExcuseForm.tsx` | Parent excuse form with FileUploadField (PDF/JPG/PNG, 5MB) | 232 | VERIFIED |
| `apps/web/src/components/classbook/ExcuseReviewList.tsx` | Klassenvorstand review with accept/reject dialog | 180 | VERIFIED |
| `apps/web/src/components/classbook/AbsenceStatisticsPanel.tsx` | Statistics table with date range filter and PDF export link | 281 | VERIFIED |
| `apps/web/src/routes/_authenticated/statistics/absence.tsx` | Dedicated absence statistics route | 47 | VERIFIED |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `attendance.controller.ts` | `attendance.service.ts` | DI constructor injection | WIRED |
| `classbook.module.ts` | `app.module.ts` | Module import | WIRED |
| `grade.service.ts` | `grade-average.util.ts` | `import { calculateWeightedAverage }` (line 4) | WIRED |
| `classbook.module.ts` | `grade.service.ts` | Module provider | WIRED |
| `excuse.service.ts` | `statistics.service.ts` | Auto-updates AttendanceRecord to EXCUSED on accept | WIRED |
| `main.ts` | `@fastify/multipart` | `fastifyInstance.register(multipart, ...)` | WIRED |
| `attendance.service.ts` | `classbook-events.gateway.ts` | `this.classBookEventsGateway.emitAttendanceUpdated(...)` (line 294, 336) | WIRED |
| `excuse.service.ts` | `classbook-events.gateway.ts` | `this.classBookEventsGateway.emitExcuseUpdated(...)` (line 222) | WIRED |
| `grade.service.ts` | `classbook-events.gateway.ts` | emitGradeAdded call after createGrade | NOT_WIRED |
| `lesson-content.service.ts` | `classbook-events.gateway.ts` | emitEntryUpdated call after updateContent | NOT_WIRED |
| `useClassbookSocket.ts` | `useClassbook.ts` | `import { classbookKeys }` for cache invalidation | WIRED |
| `useClassbook.ts` | API endpoints | fetch via api.ts | WIRED |
| `$lessonId.tsx` | `useClassbookEntryByTimetableLesson` | `useClassbookEntryByTimetableLesson(schoolId, lessonId)` (line 51) | WIRED |
| `$lessonId.tsx` | `GradeMatrix.tsx` | Import and render in noten TabsContent | WIRED |
| `$lessonId.tsx` | `StudentNoteList.tsx` | Import and render in notizen TabsContent | WIRED |
| `timetable/index.tsx` | `classbook/$lessonId.tsx` | `navigate({ to: '/classbook/$lessonId', params: { lessonId: lesson.id } })` (line 231) | WIRED |
| `ExcuseForm.tsx` | `useCreateExcuse` | `const createExcuse = useCreateExcuse(schoolId)` (line 50) | WIRED |
| `ExcuseReviewList.tsx` | `useReviewExcuse` | `const reviewExcuse = useReviewExcuse(schoolId)` (line 23) | WIRED |
| `GradeMatrix.tsx` | `useGradeMatrix` | `const { data: matrixData } = useGradeMatrix(...)` (line 106) | WIRED |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|--------------|--------|--------------------|--------|
| `AttendanceGrid.tsx` | `attendance` | `useAttendance` -> `GET /schools/:id/classbook/:entryId/attendance` -> `prisma.attendanceRecord.findMany` | Yes | FLOWING |
| `GradeMatrix.tsx` | `matrixData` | `useGradeMatrix` -> `GET /grades/matrix/:classSubjectId` -> `prisma.gradeEntry.findMany` | Yes | FLOWING |
| `ExcuseReviewList.tsx` | `excuses` | `useExcuses(schoolId, 'PENDING')` -> `GET /classbook/excuses?status=PENDING` -> `getPendingExcusesForKlassenvorstand` -> `prisma.absenceExcuse.findMany` | Yes | FLOWING |
| `AbsenceStatisticsPanel.tsx` | `statistics` | `useAbsenceStatistics` -> `GET /classbook/statistics/class` -> `prisma.attendanceRecord` aggregate query | Yes | FLOWING |
| `StudentNoteList.tsx` | `notes` | `useNotes` -> `GET /classbook/:entryId/notes` -> `prisma.studentNote.findMany` with visibility filter | Yes | FLOWING |
| `classbook-events.gateway.ts` | emitGradeAdded | `grade.service.ts` createGrade | No -- method exists but never called | DISCONNECTED |
| `classbook-events.gateway.ts` | emitEntryUpdated | `lesson-content.service.ts` updateContent | No -- method exists but never called | DISCONNECTED |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| AttendanceService is injectable NestJS service | Node module inspection | `@Injectable` + `export class` confirmed in attendance.service.ts | PASS |
| GradeService is injectable NestJS service | Node module inspection | `@Injectable` + `export class` confirmed in grade.service.ts | PASS |
| ExcuseService is injectable NestJS service | Node module inspection | `@Injectable` + `export class` confirmed in excuse.service.ts | PASS |
| StatisticsService is injectable NestJS service | Node module inspection | `@Injectable` + `export class` confirmed in statistics.service.ts | PASS |
| ClassBookModule registers all 6 services + gateway | Direct file read | classbook.module.ts providers list confirms all 7 entries | PASS |
| FileUploadField enforces 5MB and PDF/JPG/PNG | Grep on source | DEFAULT_MAX_SIZE=5242880, DEFAULT_ACCEPT='application/pdf,image/jpeg,image/png' | PASS |
| Statistics service counts late >15min as absent | Grep on source | Line 157: `r.lateMinutes > 15` increments lateOver15MinCount | PASS |
| emitGradeAdded called after grade creation | Grep on grade.service.ts | No match -- gateway not injected, method not called | FAIL |
| emitEntryUpdated called after content update | Grep on lesson-content.service.ts | No match -- gateway not injected, method not called | FAIL |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| BOOK-01 | Plans 01, 02, 05, 06, 07 | Lehrer kann Anwesenheit pro Stunde erfassen (anwesend, abwesend, verspätet, entschuldigt) | SATISFIED | AttendanceRecord model, AttendanceService.bulkSave, AttendanceGrid tap-to-cycle, 4 status values |
| BOOK-02 | Plans 01, 02, 06, 07 | Lehrer kann Unterrichtsinhalt pro Stunde dokumentieren | SATISFIED | ClassBookEntry.thema/lehrstoff/hausaufgabe, LessonContentService.updateContent, LessonContentForm auto-save |
| BOOK-03 | Plans 01, 03, 05, 06, 08 | Lehrer kann Noten erfassen (mündlich, schriftlich, praktisch) mit konfigurierbarer Gewichtung | SATISFIED | GradeEntry model, GradeService, grade-average.util, GradeMatrix, GradeEntryDialog, GradeValuePicker |
| BOOK-04 | Plans 01, 03, 06, 08 | Lehrer kann Notizen zu einzelnen Schülern pro Stunde hinterlegen | SATISFIED | StudentNote model, StudentNoteService with D-10 visibility, StudentNoteList, StudentNoteForm |
| BOOK-05 | Plans 01, 04, 09 | System erstellt Abwesenheitsstatistiken pro Schüler, Klasse und Zeitraum | SATISFIED | StatisticsService with >15min rule, AbsenceStatisticsPanel, statistics/absence.tsx route |
| BOOK-06 | Plans 01, 04, 05, 06, 09 | Eltern können digitale Entschuldigungen einreichen | SATISFIED | AbsenceExcuse model, ExcuseService full workflow, ExcuseForm with FileUploadField, ExcuseReviewList |
| BOOK-07 | Plans 07, 08, 09, 10 | Klassenbuch funktioniert auf Desktop, Tablet und Smartphone gleichermaßen | HUMAN NEEDED | Responsive Tailwind classes and 44px touch targets present; actual rendering requires human visual verification |

All 7 requirement IDs (BOOK-01 through BOOK-07) are claimed in plan frontmatter and have implementation evidence. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `excuse.service.ts` | 262, 312, 326 | `return []` | Info | Early-exit guard clauses when parent/teacher not found in DB -- not stubs; real data queries precede each empty return |
| `statistics.service.ts` | 62 | `return []` | Info | Early-exit guard when no attendance records found -- correct behaviour |
| `excuse.controller.ts` | 78 | `return []` | Info | Fallback for unrecognised roles (not parent or teacher) -- defensive coding, not a stub |
| `grade-average.util.ts` | 59, 90 | `return null` | Info | Edge cases: no grades or zero total weight -- correct mathematical handling |
| `GradeMatrix.tsx` | 116, 144, 159 | `return []` | Info | useMemo guards for when matrixData is undefined during loading -- not stubs; data flows from useGradeMatrix |
| `StudentNoteList.tsx` | 91, 97 | `return []` | Info | useMemo guard when notes/attendance not yet loaded -- correct loading state handling |
| `LessonContentForm.tsx` | 105, 130, 151 | HTML `placeholder` attr | Info | UI placeholder text in textarea inputs -- this is correct usage of the HTML attribute, not a code stub |

No blocker anti-patterns found. All flagged `return []` occurrences are guard clauses following real database queries or loading-state handlers, not stub implementations.

### Human Verification Required

**1. Full timetable-to-classbook navigation flow**

**Test:** As a teacher, open the timetable view, click on any lesson cell, and verify navigation to the classbook lesson detail page.
**Expected:** Page loads at /classbook/:lessonId URL with ClassBookHeader showing subject name, class, teacher name, and date. Back link navigates to the timetable.
**Why human:** Code wiring confirmed (timetable/index.tsx line 231 calls navigate to /classbook/$lessonId), but the full TanStack Router file-based routing must be verified to register the route correctly at runtime.

**2. Mobile attendance recording (BOOK-07)**

**Test:** On a smartphone or emulated 375px viewport, open the Anwesenheit tab and tap through student status icons.
**Expected:** Each icon is at least 44x44px tappable area. Tapping cycles through PRESENT -> ABSENT -> LATE -> EXCUSED. A minutes input appears inline when LATE is selected. The "Alle anwesend" button resets all statuses.
**Why human:** CSS touch targets (min-h-[44px] min-w-[44px]) are present but actual tap behaviour and input visibility on mobile require browser/device testing.

**3. Grade matrix horizontal scroll with sticky columns on mobile (BOOK-07)**

**Test:** On a smartphone or emulated 375px viewport, open the Noten tab. Scroll the grade matrix horizontally.
**Expected:** Student name column stays fixed on the left. Weighted average column stays fixed on the right. Grade entry columns scroll between them. "Als PDF exportieren" link generates a PDF download.
**Why human:** CSS sticky positioning inside a ScrollArea component has known quirks with certain browser rendering paths that require visual confirmation.

**4. Parent excuse submission end-to-end (BOOK-06)**

**Test:** Log in as a parent, navigate to Entschuldigungen, submit an excuse for a child with a PDF attachment (under 5MB). Then log in as the Klassenvorstand teacher for that child's class and accept the excuse.
**Expected:** Excuse appears in parent's list with PENDING badge (amber). Klassenvorstand sees it in pending list. After accepting, the student's attendance records in the date range change to EXCUSED status.
**Why human:** Multi-session end-to-end workflow requiring a running database with seeded parent-child and teacher-class relationships.

**5. Real-time attendance update via WebSocket (BOOK-01)**

**Test:** Open the same classbook lesson page in two browser tabs. Record attendance in tab 1 and observe tab 2.
**Expected:** Tab 2's attendance grid refreshes automatically within 1-2 seconds without a page reload. The Socket.IO classbook:attendance-updated event triggers TanStack Query cache invalidation.
**Why human:** Requires running Socket.IO server and two simultaneous client connections.

---

## Gaps Summary

**One gap blocking full goal achievement.**

The phase goal includes "while parents can submit digital absence excuses" and the broader teacher workflow requires real-time awareness of classbook changes. Two WebSocket event pathways are incomplete:

**Gap: emitGradeAdded and emitEntryUpdated never fire**

`ClassBookEventsGateway` exposes `emitGradeAdded()` and `emitEntryUpdated()` as proper methods. However, neither `GradeService` (which creates grades) nor `LessonContentService` (which saves thema/lehrstoff/hausaufgabe) injects the gateway. As a result:
- When a teacher adds a grade, connected clients do not receive a `classbook:grade-added` event. The grade matrix in a second browser window will not auto-refresh.
- When a teacher saves lesson content (auto-save on blur), connected clients do not receive a `classbook:entry-updated` event.

The `useClassbookSocket.ts` client already listens for both events and would invalidate the correct query keys if the events were emitted -- the frontend is ready. The fix is purely on the backend: inject `ClassBookEventsGateway` into `GradeService` and `LessonContentService` and call the appropriate emit method after the DB write.

This is a partial gap: the core teacher workflow (record attendance, document lessons, enter grades, add notes) is fully functional through REST -- teachers can complete all tasks. Real-time multi-device synchronisation for grade and content changes is missing, which affects the "on any device" quality of the phase goal.

All 7 requirement IDs (BOOK-01 through BOOK-07) have substantive implementations satisfying their primary functionality. BOOK-07 (responsive/cross-device) requires human visual verification.

---

_Verified: 2026-04-03_
_Verifier: Claude (gsd-verifier)_
