---
phase: 07-communication
plan: 08
subsystem: ui
tags: [react, messaging, absence-reporting, file-upload, attachments, zustand, tanstack-query]

# Dependency graph
requires:
  - phase: 07-communication
    provides: AbsenceQuickAction stub, ConversationView with handleSend, ComposeDialog with broadcast compose, useMessages hooks, useConversations hooks, MessageReplyInput with file selection, school-context-store, useUserContext
provides:
  - AbsenceQuickAction rewired to POST /api/v1/schools/:schoolId/absence-report with children from user context
  - uploadMessageAttachments utility for multipart file upload to message attachments endpoint
  - ConversationView.handleSend wired to upload files after message creation
  - ComposeDialog.handleBroadcastSend wired to upload attachedFiles after conversation creation
  - school-context-store children field for parent child data
  - useUserContext passes children array through to store
  - CreateConversationResponse type including firstMessage for post-creation attachment upload
affects: [phase-09-mobile]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Post-creation attachment upload: create message first, then upload files to /messages/:messageId/attachments"
    - "Non-blocking attachment error handling: message sent even if attachment upload fails, error toast shown"
    - "Zustand store children array populated from /api/v1/users/me backend response for parent role"

key-files:
  created: []
  modified:
    - apps/web/src/components/messaging/AbsenceQuickAction.tsx
    - apps/web/src/components/messaging/ConversationView.tsx
    - apps/web/src/components/messaging/ComposeDialog.tsx
    - apps/web/src/hooks/useMessages.ts
    - apps/web/src/hooks/useConversations.ts
    - apps/web/src/hooks/useUserContext.ts
    - apps/web/src/stores/school-context-store.ts

key-decisions:
  - "AbsenceQuickAction fully rewritten with inline form instead of ExcuseForm wrapper -- posts to /absence-report not /classbook/excuses"
  - "Per-file sequential upload for attachments matching backend @fastify/multipart single-file expectation"
  - "CreateConversationResponse extended type for firstMessage access without modifying shared ConversationDto"

patterns-established:
  - "Post-creation file upload pattern: create entity -> use returned ID -> upload files to entity"

requirements-completed: [COMM-04, COMM-05]

# Metrics
duration: 3min
completed: 2026-04-07
---

# Phase 07 Plan 08: Gap Closure -- Absence Reporting and File Attachment Upload Wiring

**AbsenceQuickAction rewired to POST /absence-report with children from user context, and file attachments uploaded via multipart POST after message/conversation creation in ConversationView and ComposeDialog**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-07T07:23:59Z
- **Completed:** 2026-04-07T07:27:00Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- AbsenceQuickAction completely rewritten to POST directly to /api/v1/schools/:schoolId/absence-report with ReportAbsenceDto shape, closing COMM-05
- File attachments from reply input (ConversationView) and compose dialog (ComposeDialog) now uploaded to backend via multipart POST, closing COMM-04
- school-context-store and useUserContext extended with children field for parent child data flow

## Task Commits

Each task was committed atomically:

1. **Task 1: Rewire AbsenceQuickAction to POST /absence-report with children from user context** - `f039de7` (feat)
2. **Task 2: Wire file attachment upload in ConversationView and ComposeDialog** - `041fdfc` (feat)

## Files Created/Modified
- `apps/web/src/components/messaging/AbsenceQuickAction.tsx` - Complete rewrite: inline form posting to /absence-report with child selector from store
- `apps/web/src/stores/school-context-store.ts` - Added children field to SchoolContextState interface and setContext
- `apps/web/src/hooks/useUserContext.ts` - Added children to UserContextResponse interface for store pass-through
- `apps/web/src/hooks/useMessages.ts` - Added uploadMessageAttachments utility for sequential per-file multipart upload
- `apps/web/src/components/messaging/ConversationView.tsx` - handleSend now accepts (body, files?) and uploads after message creation
- `apps/web/src/components/messaging/ComposeDialog.tsx` - handleBroadcastSend uploads attachedFiles after conversation creation
- `apps/web/src/hooks/useConversations.ts` - Added CreateConversationResponse type with firstMessage for post-creation upload

## Decisions Made
- AbsenceQuickAction fully rewritten with inline form instead of wrapping Phase 5 ExcuseForm -- the Phase 7 /absence-report endpoint creates both the AbsenceExcuse record AND the system message to Klassenvorstand, which the Phase 5 /classbook/excuses endpoint does not
- Per-file sequential upload for attachments to match backend @fastify/multipart single-file-per-request design
- CreateConversationResponse as extended type (ConversationDto & { firstMessage?: MessageDto }) rather than modifying the shared ConversationDto -- keeps the shared package stable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 7 Communication is now fully complete with all 6 COMM requirements verified (COMM-01 through COMM-06)
- Both gaps identified in 07-VERIFICATION.md are now closed
- Phase 8 (Homework, Exams & Data Import) can proceed
- Phase 9 (Mobile, PWA & Production Readiness) depends on Phase 7 (now complete) and Phase 8

## Self-Check: PASSED

- All 7 modified files verified present on disk
- Commit f039de7 (Task 1) verified in git log
- Commit 041fdfc (Task 2) verified in git log

---
*Phase: 07-communication*
*Completed: 2026-04-07*
