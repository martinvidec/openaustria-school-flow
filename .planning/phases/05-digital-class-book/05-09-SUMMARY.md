---
phase: 05-digital-class-book
plan: 09
subsystem: ui
tags: [react, tanstack-router, shadcn-ui, file-upload, excuse-workflow, absence-statistics, sidebar-navigation]

# Dependency graph
requires:
  - phase: 05-06
    provides: useExcuses hooks, AbsenceExcuseDto, AbsenceStatisticsDto shared types, excuse API endpoints
provides:
  - ExcuseForm component for parent excuse submission with file upload
  - ExcuseCard component with status badges (Ausstehend/Akzeptiert/Abgelehnt)
  - ExcuseReviewList component for Klassenvorstand accept/reject workflow
  - FileUploadField with drag-and-drop, 5MB limit, PDF/JPG/PNG validation
  - AbsenceStatisticsPanel with sortable table, date range filter, PDF export
  - Excuses route at /excuses with role-based content (parent vs reviewer)
  - Statistics route at /statistics/absence
  - Sidebar navigation items for Entschuldigungen and Abwesenheit
affects: [05-10, mobile, e2e-testing]

# Tech tracking
tech-stack:
  added: []
  patterns: [role-based page content switching, inline date inputs for date range, sortable table with tabular-nums]

key-files:
  created:
    - apps/web/src/components/classbook/FileUploadField.tsx
    - apps/web/src/components/classbook/ExcuseForm.tsx
    - apps/web/src/components/classbook/ExcuseCard.tsx
    - apps/web/src/components/classbook/ExcuseReviewList.tsx
    - apps/web/src/components/classbook/AbsenceStatisticsPanel.tsx
    - apps/web/src/routes/_authenticated/excuses/index.tsx
    - apps/web/src/routes/_authenticated/statistics/absence.tsx
  modified:
    - apps/web/src/components/layout/AppSidebar.tsx

key-decisions:
  - "Direct apiFetch call for file upload in ExcuseForm instead of useUploadAttachment hook (avoids dynamic import and hook dependency on excuseId not yet available)"
  - "Inline native date inputs for date pickers instead of Calendar+Popover (Calendar component not installed, native inputs work well for date ranges)"
  - "AbsenceStatisticsPanel embeds class selector rather than receiving it from parent route (self-contained component)"

patterns-established:
  - "Role-based page content: single route renders different UI based on user roles (parent sees form, reviewer sees list)"
  - "Sortable table pattern: column header click toggles asc/desc sort with ArrowUpDown icon indicator"
  - "Status badge color mapping: HSL values applied via className for precise UI-SPEC color compliance"

requirements-completed: [BOOK-05, BOOK-06, BOOK-07]

# Metrics
duration: 8min
completed: 2026-04-04
---

# Phase 5 Plan 9: Excuse Workflow UI, Statistics & Sidebar Summary

**Parent excuse submission with file upload, Klassenvorstand review with accept/reject dialogs, absence statistics with sortable table and PDF export, and sidebar navigation for Entschuldigungen and Abwesenheit**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-03T22:15:22Z
- **Completed:** 2026-04-04T05:58:37Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Parent excuse form with child selector, date range, reason, note, and drag-and-drop file upload (D-11, D-13)
- Klassenvorstand review interface with accept/reject flow including required/optional review notes (D-12)
- Absence statistics table with all UI-SPEC columns, sortable headers, date range filter, late >15min warning highlight, and PDF export (BOOK-05, D-04)
- Sidebar updated with Entschuldigungen (eltern/lehrer/admin/schulleitung) and Abwesenheit (lehrer/admin/schulleitung) -- no Klassenbuch entry per D-03

## Task Commits

Each task was committed atomically:

1. **Task 1: FileUploadField + ExcuseForm + ExcuseCard + ExcuseReviewList + excuses route** - `3241aec` (feat)
2. **Task 2: AbsenceStatisticsPanel + statistics route + sidebar navigation updates** - `71ec4ea` (feat)

## Files Created/Modified
- `apps/web/src/components/classbook/FileUploadField.tsx` - Drag-and-drop file upload with 5MB limit and PDF/JPG/PNG validation
- `apps/web/src/components/classbook/ExcuseForm.tsx` - Parent excuse submission form with all D-11 fields
- `apps/web/src/components/classbook/ExcuseCard.tsx` - Single excuse display card with status badges per UI-SPEC colors
- `apps/web/src/components/classbook/ExcuseReviewList.tsx` - Klassenvorstand pending excuse review with accept/reject dialogs
- `apps/web/src/components/classbook/AbsenceStatisticsPanel.tsx` - Statistics table with all UI-SPEC columns, sortable, filterable
- `apps/web/src/routes/_authenticated/excuses/index.tsx` - Excuses page route, adapts by role (parent form vs reviewer list)
- `apps/web/src/routes/_authenticated/statistics/absence.tsx` - Absence statistics page route
- `apps/web/src/components/layout/AppSidebar.tsx` - Added Entschuldigungen and Abwesenheit nav items with FileText and BarChart3 icons

## Decisions Made
- Used direct apiFetch call for file upload in ExcuseForm instead of useUploadAttachment hook -- the hook requires excuseId at call time which is not available until after excuse creation completes
- Used native HTML date inputs instead of Calendar+Popover components -- Calendar component is not installed and native date inputs provide adequate UX for date range selection
- AbsenceStatisticsPanel includes its own class selector as a self-contained component, with the statistics route simply providing school context and initial class selection

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Removed dynamic import of apiFetch in ExcuseForm**
- **Found during:** Task 1 (ExcuseForm implementation)
- **Issue:** Initial implementation used `await import('@/lib/api')` for file upload, causing Vite build warning about ineffective dynamic import since api.ts is also statically imported elsewhere
- **Fix:** Changed to static import of apiFetch at top of file
- **Files modified:** apps/web/src/components/classbook/ExcuseForm.tsx
- **Verification:** Vite build passes without dynamic import warning
- **Committed in:** 3241aec (Task 1 commit)

**2. [Rule 1 - Bug] Removed unused imports in statistics route**
- **Found during:** Task 2 (statistics route implementation)
- **Issue:** Initial implementation had unused Select, Label, useAuth imports since AbsenceStatisticsPanel already handles class selection internally
- **Fix:** Cleaned up to only import necessary dependencies
- **Files modified:** apps/web/src/routes/_authenticated/statistics/absence.tsx
- **Verification:** Vite build passes cleanly
- **Committed in:** 71ec4ea (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Minor code quality fixes during implementation. No scope creep.

## Issues Encountered
- apiFetch already had FormData check from Plan 05-06 -- step 0 of Task 1 (api.ts update) was already done, no modification needed
- Pre-existing TypeScript errors in keycloak.ts, socket.ts, main.tsx, and classbook route prevent `tsc -b` from passing, but Vite build succeeds -- these are not caused by this plan's changes

## User Setup Required

None - no external service configuration required.

## Known Stubs

None - all components are fully wired to hooks and API endpoints from Plan 05-06.

## Next Phase Readiness
- Excuse workflow UI complete -- ready for E2E testing and mobile parity
- Statistics view operational -- ready for per-class summary cards in future enhancement
- Plan 05-10 (final Phase 5 plan) can proceed
- All sidebar navigation items in place for Phase 5 features

## Self-Check: PASSED

All 9 files verified as present. Both task commits (3241aec, 71ec4ea) confirmed in git log.

---
*Phase: 05-digital-class-book*
*Completed: 2026-04-04*
