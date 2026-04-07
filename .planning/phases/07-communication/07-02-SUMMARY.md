---
phase: 07-communication
plan: 02
subsystem: api
tags: [nestjs, prisma, messaging, rest, vitest, notifications, read-receipts]

# Dependency graph
requires:
  - phase: 07-communication
    provides: Prisma communication schema (7 models), shared types, DTOs, CommunicationModule scaffold, test stubs
  - phase: 06-substitution-planning
    provides: NotificationService, NotificationGateway, SubstitutionModule exports
provides:
  - ConversationService with scope expansion (DIRECT, CLASS, YEAR_GROUP, SCHOOL), RBAC, directPairKey dedup
  - ConversationController with POST/GET/GET:id/DELETE REST endpoints
  - MessageService with send (recipient expansion + notification), markRead, getRecipients, delete
  - MessageController with POST/GET/GET:recipients/DELETE + ConversationReadController with PATCH /read
  - 15 passing unit tests (8 conversation + 7 message)
affects: [07-03, 07-04, 07-05, 07-06, 07-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Scope expansion: CLASS resolves students + parents + klassenvorstand via Prisma includes"
    - "directPairKey sorted userId pair for DIRECT conversation find-or-create (Pitfall 5)"
    - "MessageRecipient per-user tracking with createMany for batch recipient creation"
    - "Cursor-based pagination for message list (createdAt DESC)"
    - "Post-transaction notification emission: notifications sent after tx commit"
    - "ConversationReadController as separate controller for PATCH /read on conversation level"

key-files:
  created:
    - apps/api/src/modules/communication/conversation/conversation.service.ts
    - apps/api/src/modules/communication/conversation/conversation.controller.ts
    - apps/api/src/modules/communication/message/message.service.ts
    - apps/api/src/modules/communication/message/message.controller.ts
  modified:
    - apps/api/src/modules/communication/communication.module.ts
    - apps/api/src/modules/communication/dto/conversation.dto.ts
    - apps/api/src/modules/communication/__tests__/conversation.service.spec.ts
    - apps/api/src/modules/communication/__tests__/message.service.spec.ts

key-decisions:
  - "ConversationService.create() takes userRoles parameter for RBAC validation instead of injecting a separate RBAC service"
  - "Teacher-to-class assignment check via TeacherSubject matching (ClassSubject -> Subject -> TeacherSubject chain)"
  - "ConversationReadController as separate controller class for PATCH /read to keep routing clean with MessageController"
  - "Notification failures in message send are caught and swallowed (non-critical path)"
  - "getRecipients sorted: read recipients first (by readAt DESC), then unread alphabetically by lastName"
  - "recipientId added to CreateConversationDto for DIRECT scope conversations"

patterns-established:
  - "Service method signatures include userRoles: string[] for inline RBAC validation"
  - "Cursor-based pagination returns { items, nextCursor } pattern for message lists"
  - "RecipientDetailDto export from message.service.ts for read receipt Popover data shape"

requirements-completed: [COMM-01, COMM-02, COMM-03]

# Metrics
duration: 7min
completed: 2026-04-07
---

# Phase 7 Plan 02: Conversation & Message Services Summary

**ConversationService with 4-scope expansion (DIRECT/CLASS/YEAR_GROUP/SCHOOL) and RBAC, MessageService with send/read-receipts/recipient-detail and MESSAGE_RECEIVED notifications**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-07T05:12:20Z
- **Completed:** 2026-04-07T05:19:20Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- ConversationService handles all 4 scope types: DIRECT with directPairKey dedup, CLASS with student+parent+KV expansion, YEAR_GROUP expanding across classes, SCHOOL expanding to all persons
- MessageService.send() creates Message + MessageRecipient rows, increments unreadCount, and sends MESSAGE_RECEIVED notifications via NotificationService
- Read receipt support: markRead() sets readAt + resets unreadCount; getRecipients() returns per-user read status with resolved names for Popover
- 15 unit tests passing (8 conversation + 7 message), 0 failures

## Task Commits

Each task was committed atomically:

1. **Task 1: ConversationService + ConversationController** - `ae80af3` (feat)
2. **Task 2: MessageService + MessageController with read receipts** - `c7230f7` (feat)

## Files Created/Modified
- `apps/api/src/modules/communication/conversation/conversation.service.ts` - Scope expansion, RBAC, DIRECT dedup, CRUD, member resolution
- `apps/api/src/modules/communication/conversation/conversation.controller.ts` - REST endpoints: POST/GET/GET:id/DELETE at /schools/:schoolId/conversations
- `apps/api/src/modules/communication/message/message.service.ts` - Send with recipient expansion, cursor pagination, markRead, getRecipients, delete
- `apps/api/src/modules/communication/message/message.controller.ts` - REST endpoints: POST/GET/GET:recipients/DELETE + PATCH /read
- `apps/api/src/modules/communication/communication.module.ts` - Registers all services and controllers
- `apps/api/src/modules/communication/dto/conversation.dto.ts` - Added recipientId field for DIRECT scope
- `apps/api/src/modules/communication/__tests__/conversation.service.spec.ts` - 8 tests: scope expansion, dedup, RBAC
- `apps/api/src/modules/communication/__tests__/message.service.spec.ts` - 7 tests: send, unreadCount, notifications, markRead, readCount, getRecipients

## Decisions Made
- ConversationService.create() takes userRoles parameter for inline RBAC validation (no separate RBAC service injection)
- Teacher-to-class assignment check uses TeacherSubject matching since ClassSubject lacks direct teacherId FK
- ConversationReadController as separate controller class for PATCH /read to avoid routing conflicts with MessageController
- Notification failures during message send are caught silently (non-critical -- message delivery should not fail because notification delivery failed)
- getRecipients returns results sorted: read recipients first (by readAt DESC), then unread alphabetically by lastName
- recipientId added to CreateConversationDto (@IsOptional @IsString) for DIRECT scope

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- 5 it.todo() stubs in message.service.spec.ts are intentional deferrals:
  - `emits message:new Socket.IO event` -- Plan 04 (MessagingGateway)
  - `saves MessageAttachment` -- Plan 03
  - `rejects files exceeding 5MB` -- Plan 03
  - `creates AbsenceExcuse via ExcuseService` -- Plan 04
  - `absence system message has type SYSTEM` -- Plan 04

## Next Phase Readiness
- ConversationService + MessageService ready for consumption by Plans 03-07
- REST endpoints mounted at /api/v1/schools/:schoolId/conversations[...]
- MessageService injectable for future MessagingGateway Socket.IO integration (Plan 04)
- getRecipients endpoint ready for frontend ReadReceiptDetail Popover (Plan 06a)

## Self-Check: PASSED

---
*Phase: 07-communication*
*Completed: 2026-04-07*
