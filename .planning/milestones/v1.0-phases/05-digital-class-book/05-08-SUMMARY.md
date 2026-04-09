---
phase: 05-digital-class-book
plan: 08
subsystem: ui
tags: [react, classbook, grades, notes, austrian-notensystem, tanstack-query, shadcn]

# Dependency graph
requires:
  - phase: 05-06
    provides: TanStack Query hooks for grades (useGradeMatrix, useCreateGrade, useUpdateGrade, useDeleteGrade, useGradeWeights, useUpdateGradeWeights) and notes (useNotes, useCreateNote, useUpdateNote, useDeleteNote)
provides:
  - GradeMatrix component with spreadsheet-like grid, category filtering, sorting, weighted averages
  - GradeEntryDialog for adding/editing grades with Austrian 1-5 +/- notation
  - GradeValuePicker for Austrian grade notation selection (15 options)
  - StudentNoteList with grouped display, private flag, author-restricted editing
  - StudentNoteForm for inline add/edit with TanStack Query CRUD
  - ScrollArea UI component for horizontal scroll
affects: [05-09, 05-10, lesson-detail-page]

# Tech tracking
tech-stack:
  added: []
  patterns: [grade-color-scale, austrian-grade-decimal-encoding, grouped-note-display, sticky-column-matrix]

key-files:
  created:
    - apps/web/src/components/classbook/GradeValuePicker.tsx
    - apps/web/src/components/classbook/GradeEntryDialog.tsx
    - apps/web/src/components/classbook/GradeMatrix.tsx
    - apps/web/src/components/classbook/StudentNoteList.tsx
    - apps/web/src/components/classbook/StudentNoteForm.tsx
    - apps/web/src/components/ui/scroll-area.tsx
  modified: []

key-decisions:
  - "ScrollArea created manually following shadcn pattern (consistent with Phase 5 decision for Textarea/Input/Label)"
  - "Grade cell context delete action via hover overlay rather than dropdown menu for compact matrix cells"
  - "Weight editing via inline dialog triggered from weight display section"

patterns-established:
  - "Grade color scale mapping: Math.ceil(value) determines color band (1=green/10, 2=green/5, 3=transparent, 4=amber/10, 5=red/10)"
  - "Grouped-by-student note display with section headers and per-note expand/collapse"
  - "Sticky column pattern: position:sticky with z-index layering for name (left) and average (right) columns"

requirements-completed: [BOOK-03, BOOK-04, BOOK-07]

# Metrics
duration: 7min
completed: 2026-04-03
---

# Phase 5 Plan 08: Grade Matrix & Student Notes Summary

**Grade matrix with Austrian 1-5 +/- Notensystem, category filters, weighted averages, and student notes panel with grouped display and private flag visibility**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-03T21:17:33Z
- **Completed:** 2026-04-03T21:24:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- Grade matrix component with spreadsheet-like layout: students as rows, chronological grade columns with category icons, weighted average column, category filter badges (Alle/Schularbeit/Muendlich/Mitarbeit), sortable by name or average
- GradeValuePicker with all 15 Austrian grade options (1+ through 5-) using color-coded backgrounds per UI-SPEC grade color scale, 44px minimum touch targets
- GradeEntryDialog for add/edit with student select, category select, grade value picker, description textarea, date input, using useCreateGrade/useUpdateGrade hooks
- Student notes panel grouped by student with private flag ("Privat" badge with lock icon), author-restricted edit/delete via dropdown, inline add/edit form
- All note CRUD through TanStack Query hooks (useNotes, useCreateNote, useUpdateNote, useDeleteNote) with automatic cache invalidation
- Mobile-responsive grade matrix with horizontal scroll and sticky name/average columns

## Task Commits

Each task was committed atomically:

1. **Task 1: GradeValuePicker + GradeEntryDialog + GradeMatrix** - `cb6d901` (feat)
2. **Task 2: StudentNoteList + StudentNoteForm** - `3c5fec6` (feat)

## Files Created/Modified
- `apps/web/src/components/classbook/GradeValuePicker.tsx` - Austrian grade notation picker with 15 options and color-coded backgrounds
- `apps/web/src/components/classbook/GradeEntryDialog.tsx` - Add/edit grade dialog with student/category/value/description/date fields
- `apps/web/src/components/classbook/GradeMatrix.tsx` - Spreadsheet-like grade grid with sorting, filtering, weights, sticky columns
- `apps/web/src/components/classbook/StudentNoteList.tsx` - Grouped note display with private badge, author-restricted actions, delete confirmation
- `apps/web/src/components/classbook/StudentNoteForm.tsx` - Inline add/edit form with student select, content textarea, private checkbox
- `apps/web/src/components/ui/scroll-area.tsx` - Lightweight scroll area component for horizontal matrix scroll

## Decisions Made
- ScrollArea created manually following shadcn pattern (consistent with Phase 5 decision for Textarea/Input/Label) instead of attempting shadcn CLI installation
- Grade cell delete action uses hover overlay button rather than dropdown menu for space efficiency in compact matrix cells
- Weight editing uses dialog triggered from "Anpassen" button in weight display section
- Own-note detection compares note.authorId to user.id from useAuth hook (Keycloak subject)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Created missing ScrollArea UI component**
- **Found during:** Task 1 (GradeMatrix implementation)
- **Issue:** ScrollArea component referenced in plan as "installed by Plan 07" but not present in apps/web/src/components/ui/
- **Fix:** Created ScrollArea manually following shadcn pattern (consistent with Phase 5 decision for Textarea/Input/Label)
- **Files modified:** apps/web/src/components/ui/scroll-area.tsx
- **Verification:** Vite build passes, component renders correctly
- **Committed in:** cb6d901 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Minor dependency gap filled. No scope creep.

## Issues Encountered
- Pre-existing TSC errors (import.meta.env, CSS module import, TanStack Router search params type) unrelated to this plan's changes. Vite build succeeds; these are known issues in the web app TypeScript configuration.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are fully implemented with TanStack Query hooks wired to backend API endpoints.

## Next Phase Readiness
- Grade matrix and student notes panels ready for integration into lesson detail page tabs (Noten and Notizen)
- Plan 09 (excuse workflow) and Plan 10 (statistics) can proceed independently
- Components export GradeMatrix, GradeEntryDialog, GradeValuePicker, StudentNoteList, StudentNoteForm for use in lesson detail route

## Self-Check: PASSED

All 6 created files verified present. Both task commits (cb6d901, 3c5fec6) verified in git log. SUMMARY.md exists.

---
*Phase: 05-digital-class-book*
*Completed: 2026-04-03*
