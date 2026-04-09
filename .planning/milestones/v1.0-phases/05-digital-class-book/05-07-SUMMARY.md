---
phase: 05-digital-class-book
plan: 07
subsystem: ui
tags: [react, tanstack-router, tanstack-query, classbook, attendance, lesson-content, tabs, shadcn, wcag]

# Dependency graph
requires:
  - phase: 05-05
    provides: "CASL permissions for classbook domain, ClassBookEventsGateway for real-time events"
  - phase: 05-06
    provides: "TanStack Query hooks (useClassbook, useClassbookSocket), ClassBookHeader component, apiFetch utility"
provides:
  - "AttendanceGrid with quick-tap status cycling, debounced batch save, and 'Alle anwesend' reset"
  - "AttendanceStatusIcon with 44px WCAG touch targets and 4-state cycle"
  - "LateMinutesInput for late arrival minute tracking (Austrian Schulunterrichtsgesetz)"
  - "LessonContentForm with Thema/Lehrstoff/Hausaufgabe auto-save on blur"
  - "Classbook lesson detail route /_authenticated/classbook/$lessonId with 4 tabs"
  - "Timetable cell click navigation to classbook for teacher role"
  - "shadcn Textarea, Input, Label UI components"
affects: [05-08, 05-09, 05-10]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manual shadcn component creation (CLI config incompatibility with components.json)"
    - "Tab state persistence via URL search param (?tab=anwesenheit)"
    - "TimetableLesson ID resolution via useClassbookEntryByTimetableLesson (not direct ClassBookEntry lookup)"

key-files:
  created:
    - apps/web/src/components/classbook/AttendanceGrid.tsx
    - apps/web/src/components/classbook/AttendanceStatusIcon.tsx
    - apps/web/src/components/classbook/LateMinutesInput.tsx
    - apps/web/src/components/classbook/LessonContentForm.tsx
    - apps/web/src/routes/_authenticated/classbook/$lessonId.tsx
    - apps/web/src/components/ui/textarea.tsx
    - apps/web/src/components/ui/input.tsx
    - apps/web/src/components/ui/label.tsx
  modified:
    - apps/web/src/routes/_authenticated/timetable/index.tsx
    - apps/web/src/routeTree.gen.ts

key-decisions:
  - "shadcn CLI incompatible with components.json format -- created Textarea/Input/Label components manually following shadcn pattern"
  - "Noten and Notizen tabs rendered as placeholder text referencing Plan 08 (intentional per plan scope)"
  - "Teacher role check (roles.includes('lehrer')) gates timetable cell click navigation to classbook"

patterns-established:
  - "Classbook route uses TimetableLesson ID from URL, resolved via useClassbookEntryByTimetableLesson hook"
  - "Tab state persisted in URL search params for shareable/bookmarkable classbook views"
  - "Optimistic attendance updates with 2s debounce before server sync"

requirements-completed: [BOOK-01, BOOK-02, BOOK-07]

# Metrics
duration: 16min
completed: 2026-04-03
---

# Phase 05 Plan 07: Lesson Detail Page & Attendance Grid Summary

**Lesson detail page with tabbed layout (Anwesenheit/Inhalt/Noten/Notizen), quick-tap attendance grid with optimistic updates, lesson content form with auto-save, and timetable cell click navigation for teachers**

## Performance

- **Duration:** 16 min
- **Started:** 2026-04-03T20:56:41Z
- **Completed:** 2026-04-03T21:12:41Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- AttendanceGrid with tap-to-cycle status icons (present/absent/late/excused), 2s debounced batch save, "Alle anwesend" bulk reset, and 44px WCAG touch targets
- Lesson detail route at /classbook/$lessonId with 4 tabs and URL-persisted tab state, resolving TimetableLesson IDs to ClassBookEntries via backend endpoint
- LessonContentForm with Thema/Lehrstoff/Hausaufgabe auto-save on blur with "Gespeichert" indicator and collapsible recent entries history
- Timetable cell click navigation wired for teacher role -- clicking a timetable cell navigates to /classbook/$lessonId

## Task Commits

Each task was committed atomically:

1. **Task 1: shadcn components + AttendanceGrid + AttendanceStatusIcon + LateMinutesInput** - `f810bcd` (feat)
2. **Task 2: Lesson detail route + LessonContentForm + timetable navigation** - `81be606` (feat)

## Files Created/Modified
- `apps/web/src/components/ui/textarea.tsx` - shadcn-compatible Textarea component
- `apps/web/src/components/ui/input.tsx` - shadcn-compatible Input component
- `apps/web/src/components/ui/label.tsx` - shadcn-compatible Label component
- `apps/web/src/components/classbook/AttendanceStatusIcon.tsx` - Tap-to-cycle icon with 44px touch target and 4-state cycle
- `apps/web/src/components/classbook/LateMinutesInput.tsx` - Inline 48px number input for late arrival minutes
- `apps/web/src/components/classbook/AttendanceGrid.tsx` - Quick-tap attendance grid with optimistic updates and debounced save
- `apps/web/src/components/classbook/LessonContentForm.tsx` - Auto-save form for Thema/Lehrstoff/Hausaufgabe with recent entries
- `apps/web/src/routes/_authenticated/classbook/$lessonId.tsx` - Lesson detail route with 4-tab layout
- `apps/web/src/routes/_authenticated/timetable/index.tsx` - Added teacher classbook navigation on cell click
- `apps/web/src/routeTree.gen.ts` - Regenerated with classbook route

## Decisions Made
- **shadcn CLI workaround:** The shadcn CLI rejected the existing components.json format, so Textarea, Input, and Label components were created manually following the exact shadcn component pattern. This is consistent with the Phase 4 established pattern of inline components when shadcn CLI is unavailable.
- **Noten/Notizen tab placeholders:** The plan explicitly scopes this to Anwesenheit and Inhalt tabs. Noten and Notizen tabs show informational text pointing to Plan 08 for implementation.
- **Teacher role gating:** Timetable cell click navigation uses `roles.includes('lehrer')` check -- non-teachers keep existing no-click behavior, teachers navigate to classbook.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Manual shadcn component creation**
- **Found during:** Task 1 (shadcn install)
- **Issue:** shadcn CLI (v2.x through v4.x) reported "Invalid configuration found in components.json" -- the existing `resolvedPaths` field is not part of the CLI's expected schema
- **Fix:** Created Textarea, Input, Label components manually using the standard shadcn component source code pattern (Radix-free wrapper components with cn() utility)
- **Files modified:** apps/web/src/components/ui/textarea.tsx, input.tsx, label.tsx
- **Verification:** Vite build passes, components imported successfully by classbook components
- **Committed in:** f810bcd (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary to unblock component creation. Identical output to what shadcn CLI would generate. No scope creep.

## Issues Encountered
- Pre-existing tsc build errors (import.meta.env type, CSS module import) are Vite-specific types not available to raw tsc. Vite build succeeds. Consistent with 05-06-SUMMARY.md observations.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- **Noten tab** (apps/web/src/routes/_authenticated/classbook/$lessonId.tsx:124): Placeholder text "Noten werden in einem naechsten Schritt implementiert." -- intentional, resolved in Plan 08 (GradeMatrix)
- **Notizen tab** (apps/web/src/routes/_authenticated/classbook/$lessonId.tsx:131): Placeholder text "Notizen werden in einem naechsten Schritt implementiert." -- intentional, resolved in Plan 08 (StudentNoteList)

## Next Phase Readiness
- Core teacher daily workflow operational: timetable click -> classbook page with attendance and content tabs
- AttendanceGrid and LessonContentForm consume data hooks from Plan 06 with optimistic updates and real-time sync
- Plan 08 can build GradeMatrix and StudentNoteList into the existing Noten/Notizen tab placeholders
- Plan 09/10 can build on the classbook route structure for excuses and statistics

## Self-Check: PASSED

All 8 created files verified present. Both task commits (f810bcd, 81be606) verified in git log.

---
*Phase: 05-digital-class-book*
*Completed: 2026-04-03*
