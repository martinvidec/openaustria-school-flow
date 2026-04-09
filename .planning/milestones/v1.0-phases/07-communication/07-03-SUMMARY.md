---
phase: 07-communication
plan: 03
subsystem: api
tags: [nestjs, prisma, attachments, polls, absence-reporting, vitest, magic-bytes, file-upload]

# Dependency graph
requires:
  - phase: 07-communication
    provides: ConversationService, MessageService, Prisma communication schema, shared DTOs, CommunicationModule scaffold
  - phase: 05-classbook
    provides: ExcuseService with createExcuse method, @fastify/multipart registered globally
  - phase: 06-substitution-planning
    provides: NotificationService for MESSAGE_RECEIVED notifications
provides:
  - MessageService.uploadAttachment with 5MB limit, MIME whitelist, magic byte validation (COMM-04)
  - MessageService.downloadAttachment with conversation membership verification (COMM-04)
  - MessageService.reportAbsence creating AbsenceExcuse + SYSTEM message to Klassenvorstand (COMM-05)
  - PollService with createWithMessage, castVote, retractVote, closePoll, getResults (COMM-06)
  - PollController at /schools/:schoolId/polls with votes, close, results endpoints
  - AbsenceReportController at /schools/:schoolId/absence-report
  - ReportAbsenceDto with ExcuseReasonEnum validation
  - ConversationController wired for inline poll creation via pollData
affects: [07-04, 07-05, 07-06, 07-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Magic byte validation for PDF/JPG/PNG/DOC/DOCX with signature arrays supporting multiple valid signatures per MIME type"
    - "PollService.createWithMessage: single transaction for Message(type=POLL) + Poll + PollOptions + MessageRecipients"
    - "Vote replacement: deleteMany existing + create new in transaction (both SINGLE_CHOICE and MULTIPLE_CHOICE)"
    - "Named vs anonymous results via sender/admin role check (D-10)"
    - "Deadline auto-close: past-deadline polls auto-set isClosed=true and reject votes with BadRequestException"
    - "Absence report creates ExcuseService record then posts SYSTEM message to Klassenvorstand conversation"

key-files:
  created:
    - apps/api/src/modules/communication/poll/poll.service.ts
    - apps/api/src/modules/communication/poll/poll.controller.ts
  modified:
    - apps/api/src/modules/communication/message/message.service.ts
    - apps/api/src/modules/communication/message/message.controller.ts
    - apps/api/src/modules/communication/dto/message.dto.ts
    - apps/api/src/modules/communication/communication.module.ts
    - apps/api/src/modules/communication/conversation/conversation.controller.ts
    - apps/api/src/modules/communication/__tests__/message.service.spec.ts
    - apps/api/src/modules/communication/__tests__/poll.service.spec.ts

key-decisions:
  - "ExcuseReasonEnum reused from classbook/dto/excuse.dto.ts in ReportAbsenceDto for type-safe reason field"
  - "Fastify request/reply typed as 'any' per Phase 1 precedent (pnpm strict hoisting prevents direct fastify import)"
  - "AbsenceReportController as separate controller at /schools/:schoolId/absence-report (not nested under conversations)"
  - "PollService.getResults resolves voter names on-demand only for sender/admin -- anonymous users get counts only"
  - "ConversationController delegates to PollService.createWithMessage when pollData is present in CreateConversationDto"
  - "Magic byte signatures use array-of-arrays to support multiple valid signatures per MIME type (DOC=OLE, DOCX=ZIP)"

patterns-established:
  - "Magic byte validation pattern with MIME-to-signature mapping for file upload endpoints"
  - "Vote replacement pattern: deleteMany + create in transaction for poll vote changes"
  - "SYSTEM message type for automated messages (absence reports) distinct from user TEXT messages"

requirements-completed: [COMM-04, COMM-05, COMM-06]

# Metrics
duration: 14min
completed: 2026-04-07
---

# Phase 7 Plan 03: File Attachments, Polls, and Absence Reporting Summary

**File attachments with magic byte validation (PDF/JPG/PNG/DOC/DOCX), inline polls with single/multi choice voting and named/anonymous results, absence reporting creating ExcuseService record + SYSTEM message to Klassenvorstand**

## Performance

- **Duration:** 14 min
- **Started:** 2026-04-07T05:22:25Z
- **Completed:** 2026-04-07T05:36:25Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- File attachment upload/download on messages with 5MB limit, MIME whitelist (PDF/JPG/PNG/DOC/DOCX), magic byte validation, and conversation membership verification (COMM-04)
- Inline poll creation via PollService.createWithMessage with SINGLE_CHOICE and MULTIPLE_CHOICE types, vote casting with replacement, deadline auto-close, manual close, and named vs anonymous results (COMM-06)
- Absence reporting via messaging: creates AbsenceExcuse via ExcuseService + SYSTEM message to Klassenvorstand + MESSAGE_RECEIVED notification for KV (COMM-05)
- 17 new tests passing (11 message + 6 poll), 0 failures, TypeScript compiles cleanly

## Task Commits

Each task was committed atomically:

1. **Task 1: File attachments + absence reporting in MessageService** - `aa3f40d` (feat)
2. **Task 2: PollService + PollController** - `f7fa007` (feat)

## Files Created/Modified
- `apps/api/src/modules/communication/poll/poll.service.ts` - PollService with createWithMessage, castVote, retractVote, closePoll, getResults
- `apps/api/src/modules/communication/poll/poll.controller.ts` - REST endpoints: POST/DELETE votes, PATCH close, GET results
- `apps/api/src/modules/communication/message/message.service.ts` - Added uploadAttachment, downloadAttachment, reportAbsence methods
- `apps/api/src/modules/communication/message/message.controller.ts` - Added POST attachment, GET download, AbsenceReportController
- `apps/api/src/modules/communication/dto/message.dto.ts` - Added ReportAbsenceDto with ExcuseReasonEnum
- `apps/api/src/modules/communication/communication.module.ts` - Registered PollService, PollController, AbsenceReportController, ClassBookModule import
- `apps/api/src/modules/communication/conversation/conversation.controller.ts` - Wired PollService for inline poll creation
- `apps/api/src/modules/communication/__tests__/message.service.spec.ts` - 11 tests: send, unread, notifications, markRead, readCount, getRecipients, attachment upload, attachment rejection, absence report, absence SYSTEM message
- `apps/api/src/modules/communication/__tests__/poll.service.spec.ts` - 6 tests: create SINGLE/MULTI choice, cast vote, multi vote, deadline/close rejection, named vs anonymous results

## Decisions Made
- ExcuseReasonEnum reused from classbook/dto/excuse.dto.ts in ReportAbsenceDto -- maintains type safety across modules without duplicating the enum
- Fastify request/reply typed as `any` per established Phase 1 pattern (pnpm strict hoisting prevents direct fastify import)
- AbsenceReportController as separate controller at /schools/:schoolId/absence-report rather than nesting under conversations
- Magic byte signatures use array-of-arrays to support multiple valid signatures per MIME type (DOC=OLE compound, DOCX=ZIP archive)
- ConversationController now injects both MessageService and PollService to delegate first message creation based on pollData presence

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] ExcuseReasonEnum type mismatch in ReportAbsenceDto**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** Plan specified `reason: string` in ReportAbsenceDto but CreateExcuseDto.reason expects ExcuseReasonEnum. TSC error: "Type 'string' is not assignable to type 'ExcuseReasonEnum'"
- **Fix:** Changed ReportAbsenceDto.reason to use @IsEnum(ExcuseReasonEnum) with proper import from classbook dto
- **Files modified:** apps/api/src/modules/communication/dto/message.dto.ts
- **Verification:** TypeScript compiles cleanly, tests pass
- **Committed in:** aa3f40d (Task 1 commit)

**2. [Rule 1 - Bug] Fastify type import not available due to pnpm strict hoisting**
- **Found during:** Task 1 (TypeScript compilation)
- **Issue:** `import type { FastifyReply, FastifyRequest } from 'fastify'` fails because pnpm strict hoisting doesn't expose fastify types directly
- **Fix:** Changed to `@Req() req: any` and `@Res() reply: any` per established Phase 1/Phase 5 pattern
- **Files modified:** apps/api/src/modules/communication/message/message.controller.ts
- **Verification:** TypeScript compiles cleanly
- **Committed in:** aa3f40d (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bug fixes)
**Impact on plan:** Both auto-fixes necessary for compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- 1 it.todo() in message.service.spec.ts: `emits message:new Socket.IO event` -- intentionally deferred to Plan 04 (MessagingGateway)
- Note field added to ReportAbsenceDto but not wired to system message body (note is passed to ExcuseService but not displayed in the SYSTEM message text) -- Plan 06/07 frontend can display it from the excuse record

## Next Phase Readiness
- All 6 COMM requirements (COMM-01..COMM-06) now have backend implementation complete
- PollService and MessageService ready for MessagingGateway Socket.IO integration (Plan 04)
- File attachment endpoints ready for frontend file upload UI (Plan 06a)
- Absence report endpoint ready for parent mobile/web interface (Plan 06a)
- REST endpoints mounted at /api/v1/schools/:schoolId/... for all communication features

## Self-Check: PASSED

---
*Phase: 07-communication*
*Completed: 2026-04-07*
