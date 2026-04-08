---
phase: 08-homework-exams-data-import
plan: 06
subsystem: web, ui
tags: [react, tanstack-query, socket.io, import-wizard, ical, drag-drop, csv-mapping, untis-xml]

# Dependency graph
requires:
  - phase: 08-homework-exams-data-import
    plan: 03
    provides: "ImportController, ImportService, BullMQ processor, Socket.IO /import gateway"
  - phase: 08-homework-exams-data-import
    plan: 04
    provides: "CalendarController with iCal token auth, SisService with API key guard"
  - phase: 08-homework-exams-data-import
    plan: 05
    provides: "Homework/exam CRUD hooks, TimetableCellBadges, HomeworkDialog, ExamDialog"
  - phase: 07-communication
    provides: "AppSidebar with navItems pattern, MobileSidebar, messaging socket pattern"
provides:
  - "useImport hooks (upload, dry-run, commit, history, job polling) for import API integration"
  - "useImportSocket real-time progress hook for /import Socket.IO namespace"
  - "useCalendarToken hooks (generate, revoke) for iCal subscription management"
  - "ImportWizard 5-step state machine (upload, mapping/preview, dry-run, progress, result)"
  - "ImportFileUpload drag-and-drop component with Untis XML/CSV/DIF detection"
  - "ImportColumnMapper CSV header-to-SchoolFlow-field mapping UI"
  - "ImportUntisPreview parsed entity counts with expandable record preview"
  - "ImportDryRunPreview validation summary with error expansion"
  - "ImportProgressPanel animated progress bar with Socket.IO-driven updates"
  - "ImportResultSummary with status badge and CSV error report download"
  - "ImportHistoryList past imports table with status badges and actions"
  - "ICalSettings card with URL display, clipboard copy, token revoke dialog"
  - "Admin /import route and /settings route registered in TanStack Router"
  - "AppSidebar + MobileSidebar Datenimport link (admin-only)"
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns: [5-step import wizard state machine, page-scoped Socket.IO hook for import namespace, inline Socket.IO connection without socket.ts helper for school-scoped events]

key-files:
  created:
    - apps/web/src/hooks/useImport.ts
    - apps/web/src/hooks/useImportSocket.ts
    - apps/web/src/hooks/useCalendarToken.ts
    - apps/web/src/components/import/ImportFileUpload.tsx
    - apps/web/src/components/import/ImportColumnMapper.tsx
    - apps/web/src/components/import/ImportUntisPreview.tsx
    - apps/web/src/components/import/ImportDryRunPreview.tsx
    - apps/web/src/components/import/ImportProgressPanel.tsx
    - apps/web/src/components/import/ImportResultSummary.tsx
    - apps/web/src/components/import/ImportHistoryList.tsx
    - apps/web/src/components/import/ImportWizard.tsx
    - apps/web/src/components/calendar/ICalSettings.tsx
    - apps/web/src/routes/_authenticated/admin/import.tsx
    - apps/web/src/routes/_authenticated/settings.tsx
  modified:
    - apps/web/src/components/layout/AppSidebar.tsx
    - apps/web/src/components/layout/MobileSidebar.tsx
    - apps/web/src/routeTree.gen.ts

key-decisions:
  - "useImportSocket creates inline Socket.IO connection (not via socket.ts helper) for page-scoped /import namespace with school-scoped rooms"
  - "ImportWizard uses step state machine with conditional step 2 routing (CSV -> ImportColumnMapper, Untis -> ImportUntisPreview)"
  - "ICalSettings uses navigator.clipboard.writeText with 1s checkmark animation on copy success"
  - "routeTree.gen.ts auto-generated with TanStack Router file-based routing for /admin/import and /settings routes"

patterns-established:
  - "5-step wizard state machine: file upload -> type-specific mapping/preview -> dry-run -> progress -> result"
  - "Page-scoped Socket.IO hook pattern (useImportSocket at import page, not layout level) for domain-specific real-time events"

requirements-completed: [IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04]

# Metrics
duration: 10min
completed: 2026-04-08
---

# Phase 8 Plan 06: Frontend Import Wizard & iCal Settings Summary

**5-step import wizard with Untis XML/CSV drag-and-drop, column mapping, dry-run preview, real-time Socket.IO progress, and iCal subscription management with clipboard copy and token rotation**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-08T16:58:23Z
- **Completed:** 2026-04-08T17:08:00Z
- **Tasks:** 3/3 (2 auto + 1 checkpoint approved)
- **Files modified:** 17

## Accomplishments
- Created TanStack Query hooks for import upload/dry-run/commit/history and Socket.IO real-time progress hook for /import namespace
- Built 8 import wizard components: FileUpload (drag-and-drop), ColumnMapper (CSV header mapping), UntisPreview (entity counts), DryRunPreview (validation), ProgressPanel (animated bar), ResultSummary (status + report), HistoryList (past imports), and ImportWizard (5-step state machine)
- Created ICalSettings card with generate/copy/revoke token flow and German UI-SPEC copywriting
- Wired admin /import route with ImportWizard + ImportHistoryList, settings page with ICalSettings
- Updated AppSidebar + MobileSidebar with admin-only "Datenimport" link (Upload icon)
- All UI-SPEC copywriting applied: German labels, accessibility attributes (role="progressbar", role="button"), empty states

## Task Commits

Each task was committed atomically:

1. **Task 1: Import hooks + Socket.IO + wizard step components** - `02786af` (feat)
2. **Task 2: ImportWizard + admin route + sidebar + iCal settings** - `72b7c4a` (feat)
3. **Task 3: Human verification of complete Phase 8** - checkpoint approved
4. **Chore: Auto-generated route tree update** - `1e1cb39` (chore)

## Files Created/Modified
- `apps/web/src/hooks/useImport.ts` - Import CRUD hooks: useUploadImport, useDryRun, useCommitImport, useImportHistory, useImportJob
- `apps/web/src/hooks/useImportSocket.ts` - Socket.IO /import namespace hook with progress state and complete event
- `apps/web/src/hooks/useCalendarToken.ts` - iCal token hooks: useCalendarToken, useGenerateCalendarToken, useRevokeCalendarToken
- `apps/web/src/components/import/ImportFileUpload.tsx` - Drag-and-drop file upload with XML/CSV/DIF detection
- `apps/web/src/components/import/ImportColumnMapper.tsx` - CSV column-to-field mapping table with conflict mode selector
- `apps/web/src/components/import/ImportUntisPreview.tsx` - Untis XML parsed entity counts with expandable preview
- `apps/web/src/components/import/ImportDryRunPreview.tsx` - Dry-run validation summary with error row expansion
- `apps/web/src/components/import/ImportProgressPanel.tsx` - 8px animated progress bar with ARIA progressbar role
- `apps/web/src/components/import/ImportResultSummary.tsx` - Status badge, import counts, CSV error report download
- `apps/web/src/components/import/ImportHistoryList.tsx` - Past imports table with date, type, status badges, actions
- `apps/web/src/components/import/ImportWizard.tsx` - 5-step state machine wizard with step indicator
- `apps/web/src/components/calendar/ICalSettings.tsx` - iCal subscription card with URL copy, token revoke dialog
- `apps/web/src/routes/_authenticated/admin/import.tsx` - Admin import page with wizard and history
- `apps/web/src/routes/_authenticated/settings.tsx` - Settings page with ICalSettings
- `apps/web/src/components/layout/AppSidebar.tsx` - Added Datenimport nav item (admin-only, Upload icon)
- `apps/web/src/components/layout/MobileSidebar.tsx` - Added Datenimport nav item (admin-only, Upload icon)
- `apps/web/src/routeTree.gen.ts` - Auto-generated route tree with /admin/import and /settings

## Decisions Made
- useImportSocket creates inline Socket.IO connection for page-scoped /import namespace (same pattern as timetable/classbook sockets but without central socket.ts helper)
- ImportWizard routes step 2 conditionally: CSV files go to ImportColumnMapper, Untis XML/DIF files go to ImportUntisPreview
- ICalSettings uses navigator.clipboard.writeText with 1-second checkmark animation on copy success per UI-SPEC
- routeTree.gen.ts committed as auto-generated file needed for TanStack Router file-based routing

## Deviations from Plan

None - plan executed exactly as written. AppSidebar and MobileSidebar already contained the Datenimport entry from a prior execution pass; content verified matching plan requirements.

## Known Stubs
None - all components are fully functional with real API hook wiring and Socket.IO integration.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete Phase 8 frontend: import wizard (5-step), iCal settings, homework/exam badges all wired
- IMPORT-01 (Untis XML), IMPORT-02 (CSV), IMPORT-03 (iCal), IMPORT-04 (SIS API) frontend complete
- HW-01, HW-02, HW-03 frontend complete (from Plan 05)
- All 7 Phase 8 requirements verified end-to-end by human (Task 3 checkpoint approved)
- Phase 8 complete: HW-01, HW-02, HW-03, IMPORT-01, IMPORT-02, IMPORT-03, IMPORT-04 all verified

## Self-Check: PASSED

All 14 created files verified present. All 3 commits (02786af, 72b7c4a, 1e1cb39) verified in git log.

---
*Phase: 08-homework-exams-data-import*
*Completed: 2026-04-08*
