---
phase: 08-homework-exams-data-import
plan: 05
subsystem: web, ui
tags: [react, tanstack-query, homework, exam, timetable-badges, collision-detection, dialog, popover]

# Dependency graph
requires:
  - phase: 08-homework-exams-data-import
    plan: 02
    provides: "HomeworkController at /schools/:schoolId/homework, ExamController at /schools/:schoolId/exams with collision-check endpoint"
  - phase: 04-timetable-ui
    provides: "TimetableGrid with renderCell prop, TimetableCell component, subject color palette"
  - phase: 05-classbook-grades-attendance
    provides: "Classbook $lessonId route with tabs, useClassbook hooks, apiFetch pattern"
provides:
  - "useHomework, useHomeworkByLesson, useCreateHomework, useUpdateHomework, useDeleteHomework hooks"
  - "useExams, useExamCollisionCheck, useCreateExam, useUpdateExam, useDeleteExam hooks"
  - "HomeworkBadge (BookOpen primary) and ExamBadge (ClipboardList warning) Popover components"
  - "TimetableCellBadges wrapper for renderCell badge overlay"
  - "HomeworkDialog and ExamDialog for teacher CRUD with validation"
  - "ExamCollisionWarning inline banner (D-03 soft warning)"
  - "HomeworkExamList with Hausaufgaben/Pruefungen tabs"
  - "Classbook Aufgaben tab with homework/exam create buttons and list"
  - "Timetable page badge overlay via renderCell prop"
affects: [08-06]

# Tech tracking
tech-stack:
  added: []
  patterns: [TimetableCellBadges renderCell wrapper for non-invasive timetable extension, classSubjectId-keyed badge lookup maps]

key-files:
  created:
    - apps/web/src/hooks/useHomework.ts
    - apps/web/src/hooks/useExams.ts
    - apps/web/src/components/homework/HomeworkBadge.tsx
    - apps/web/src/components/homework/ExamBadge.tsx
    - apps/web/src/components/homework/TimetableCellBadges.tsx
    - apps/web/src/components/homework/ExamCollisionWarning.tsx
    - apps/web/src/components/homework/HomeworkDialog.tsx
    - apps/web/src/components/homework/ExamDialog.tsx
    - apps/web/src/components/homework/HomeworkExamList.tsx
  modified:
    - apps/web/src/routes/_authenticated/classbook/$lessonId.tsx
    - apps/web/src/routes/_authenticated/timetable/index.tsx

key-decisions:
  - "TimetableCellBadges wraps TimetableCell via renderCell prop -- zero modification to TimetableGrid or TimetableCell per UI-SPEC constraint"
  - "Badge lookup uses classSubjectId-keyed Map built from school-wide homework/exam queries, memoized for performance"
  - "Classbook wiring adds Aufgaben tab (5th tab) rather than inline buttons in existing tabs, keeping separation of concerns"

patterns-established:
  - "renderCell badge wrapper: TimetableCellBadges wrapping TimetableCell content with absolute-positioned icon overlays"
  - "Partial<CreateRequest> & { id } pattern for update mutations when shared types lack explicit UpdateRequest interface"

requirements-completed: [HW-01, HW-02, HW-03]

# Metrics
duration: 7min
completed: 2026-04-07
---

# Phase 8 Plan 05: Frontend Homework & Exam UI Summary

**TanStack Query hooks for homework/exam CRUD, create/edit dialogs with exam collision warning, BookOpen/ClipboardList badge overlays on timetable cells via renderCell, and classbook Aufgaben tab integration**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-07T22:03:31Z
- **Completed:** 2026-04-07T22:10:08Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Created TanStack Query hooks for homework CRUD (list, by-lesson, create, update, delete) and exam CRUD (list, create, update, delete, collision-check) with German toast feedback
- Built 7 homework UI components: HomeworkBadge, ExamBadge, TimetableCellBadges, ExamCollisionWarning, HomeworkDialog, ExamDialog, HomeworkExamList
- Wired TimetableCellBadges into timetable route via renderCell prop showing BookOpen (primary) and ClipboardList (warning) icon badges on lesson cells
- Added Aufgaben tab to classbook lesson detail page with Hausaufgabe erstellen / Pruefung eintragen buttons and HomeworkExamList
- All UI-SPEC copywriting applied: German labels, D-03 collision warning text, role="alert" accessibility, empty states

## Task Commits

Each task was committed atomically:

1. **Task 1: TanStack Query hooks for homework and exam CRUD** - `62fee21` (feat)
2. **Task 2: Homework/Exam dialogs, badges, timetable integration, classbook wiring** - `f97f902` (feat)

## Files Created/Modified
- `apps/web/src/hooks/useHomework.ts` - Homework CRUD hooks: useHomework, useHomeworkByLesson, useCreateHomework, useUpdateHomework, useDeleteHomework
- `apps/web/src/hooks/useExams.ts` - Exam CRUD hooks: useExams, useExamCollisionCheck, useCreateExam, useUpdateExam, useDeleteExam
- `apps/web/src/components/homework/HomeworkBadge.tsx` - 16x16 BookOpen badge with Popover detail (title, description excerpt, due date)
- `apps/web/src/components/homework/ExamBadge.tsx` - 16x16 ClipboardList badge with Popover detail (title, date, subject, duration)
- `apps/web/src/components/homework/TimetableCellBadges.tsx` - Wrapper with absolute-positioned badge container (top-1 right-1, flex gap-1)
- `apps/web/src/components/homework/ExamCollisionWarning.tsx` - Inline warning banner with AlertTriangle icon, warning bg at 15% opacity, "Trotzdem eintragen" override
- `apps/web/src/components/homework/HomeworkDialog.tsx` - Create/edit dialog with title, description, due date fields and validation
- `apps/web/src/components/homework/ExamDialog.tsx` - Create/edit dialog with inline collision detection and forceCreate override
- `apps/web/src/components/homework/HomeworkExamList.tsx` - Tabbed list (Hausaufgaben/Pruefungen) with role-based edit/delete actions
- `apps/web/src/routes/_authenticated/classbook/$lessonId.tsx` - Added Aufgaben tab with homework/exam create buttons and HomeworkExamList
- `apps/web/src/routes/_authenticated/timetable/index.tsx` - Wired renderCellWithBadges using TimetableCellBadges + homework/exam lookup maps

## Decisions Made
- TimetableCellBadges wraps TimetableCell via renderCell prop with zero modification to TimetableGrid or TimetableCell per UI-SPEC constraint
- Badge lookup uses classSubjectId-keyed Map built from school-wide homework/exam queries (memoized via useMemo)
- Classbook wiring adds Aufgaben tab (5th tab) rather than inline buttons in existing tabs for clean separation
- Partial<CreateHomeworkRequest> & { id } used for update mutation type since shared types lack explicit UpdateRequest interfaces
- ExamDialog blocks submit when collision detected until user explicitly clicks "Trotzdem eintragen" (sets forceCreate=true)

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs
None - all components are fully functional with real API hook wiring.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 7 homework UI components available for reuse in Plan 06 (frontend iCal/import)
- Homework/exam hooks export query key factories for cross-component cache invalidation
- TimetableCellBadges pattern established for future badge types via renderCell
- HW-01, HW-02, HW-03 frontend requirements complete

## Self-Check: PASSED

All 9 created files verified present. Both commits (62fee21, f97f902) verified in git log.

---
*Phase: 08-homework-exams-data-import*
*Completed: 2026-04-07*
