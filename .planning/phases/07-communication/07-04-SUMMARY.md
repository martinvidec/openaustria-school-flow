---
phase: 07-communication
plan: 04
subsystem: api
tags: [nestjs, socket.io, websocket, jwt, jwks, casl, rbac, dsgvo, messaging, real-time]

# Dependency graph
requires:
  - phase: 07-communication
    provides: CommunicationModule scaffold, Prisma communication schema, MessageService, PollService, ConversationService, shared messaging types
  - phase: 06-substitution-planning
    provides: NotificationGateway pattern (JWT JWKS auth + per-user rooms), NotificationService, SubstitutionModule exports
  - phase: 01-project-scaffolding-auth
    provides: CheckPermissions decorator, CASL ability factory, PermissionsGuard, seed.ts permission structure
provides:
  - MessagingGateway at /messaging namespace with Keycloak JWKS JWT auth (D-08)
  - Real-time Socket.IO events: message:new, message:read, poll:vote, conversation:new
  - Post-transaction emission pattern in MessageService, PollService, ConversationService
  - CASL permission subjects: CONVERSATION, MESSAGE, POLL in PermissionSubject enum
  - Role-based permission seeds for all 5 roles (admin, schulleitung, lehrer, eltern, schueler)
  - @CheckPermissions decorators on all communication controllers
  - DSGVO retention category documented on Prisma schema (kommunikation 365d)
affects: [07-05, 07-06, 07-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "MessagingGateway per-domain WebSocket namespace pattern: /messaging mirrors /notifications gateway structure"
    - "Post-transaction event emission: collect data in tx callback, emit AFTER commit to prevent rolled-back tx leaking events"
    - "CASL coarse subject-level gate with fine-grained service-level membership validation"

key-files:
  created:
    - apps/api/src/modules/communication/messaging.gateway.ts
  modified:
    - apps/api/src/modules/communication/communication.module.ts
    - apps/api/src/modules/communication/message/message.service.ts
    - apps/api/src/modules/communication/poll/poll.service.ts
    - apps/api/src/modules/communication/conversation/conversation.service.ts
    - apps/api/src/modules/communication/conversation/conversation.controller.ts
    - apps/api/src/modules/communication/message/message.controller.ts
    - apps/api/src/modules/communication/poll/poll.controller.ts
    - apps/api/src/modules/communication/__tests__/messaging.gateway.spec.ts
    - apps/api/src/modules/communication/__tests__/conversation.service.spec.ts
    - apps/api/src/modules/communication/__tests__/message.service.spec.ts
    - apps/api/src/modules/communication/__tests__/poll.service.spec.ts
    - packages/shared/src/constants/permissions.ts
    - apps/api/prisma/seed.ts
    - apps/api/prisma/schema.prisma

key-decisions:
  - "MessagingGateway replicates NotificationGateway JWT JWKS pattern verbatim -- identical handshake auth, per-user rooms, dual transports"
  - "Post-transaction emission: gateway methods called AFTER Prisma $transaction commit to prevent events leaking from rolled-back transactions"
  - "CASL provides coarse subject-level gate (conversation/message/poll), service-level ConversationMember check provides fine-grained access"
  - "Schueler get read-only conversation/message access (no create) per school communication policy"

patterns-established:
  - "Per-domain WebSocket namespace pattern: /messaging for communication events, /notifications for substitution events, /classbook for classbook events"
  - "Post-transaction Socket.IO emission pattern across MessageService.send(), markRead(), PollService.castVote(), ConversationService.create()"

requirements-completed: [COMM-01, COMM-02, COMM-03, COMM-06]

# Metrics
duration: 10min
completed: 2026-04-07
---

# Phase 7 Plan 04: MessagingGateway, Socket.IO Events, CASL Permissions Summary

**MessagingGateway at /messaging namespace with JWT JWKS auth, real-time message/read-receipt/poll-vote/conversation events wired post-transaction, CASL permission subjects for 5 roles with @CheckPermissions on all controllers**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-07T05:39:36Z
- **Completed:** 2026-04-07T05:49:36Z
- **Tasks:** 2
- **Files modified:** 15

## Accomplishments
- MessagingGateway at /messaging WebSocket namespace with Keycloak JWKS JWT auth, per-user rooms, dual transports (websocket + polling for school network proxies)
- Real-time event emissions wired into services: message:new after send, message:read after markRead, poll:vote after castVote, conversation:new after create -- all using post-transaction pattern
- CASL permission subjects (CONVERSATION, MESSAGE, POLL) added with role-based seeds for all 5 roles and @CheckPermissions on all communication endpoints
- 7 gateway tests (auth, rejection, event emission for all 4 event types, transport config), all 319 tests pass

## Task Commits

Each task was committed atomically:

1. **Task 1: MessagingGateway + wire Socket.IO events into services** - `b450fc7` (feat)
2. **Task 2: CASL permissions + DSGVO retention + seed data** - `9ac78bf` (feat)

## Files Created/Modified
- `apps/api/src/modules/communication/messaging.gateway.ts` - MessagingGateway with JWT JWKS auth, emitNewMessage, emitReadReceipt, emitPollVote, emitNewConversation
- `apps/api/src/modules/communication/communication.module.ts` - Registered MessagingGateway in providers and exports
- `apps/api/src/modules/communication/message/message.service.ts` - Injected MessagingGateway, wired emitNewMessage in send(), emitReadReceipt in markRead()
- `apps/api/src/modules/communication/poll/poll.service.ts` - Injected MessagingGateway, wired emitPollVote in castVote()
- `apps/api/src/modules/communication/conversation/conversation.service.ts` - Injected MessagingGateway, wired emitNewConversation in create() and createDirect()
- `apps/api/src/modules/communication/conversation/conversation.controller.ts` - Added @CheckPermissions for create, read on conversation
- `apps/api/src/modules/communication/message/message.controller.ts` - Added @CheckPermissions for create, read, delete on message
- `apps/api/src/modules/communication/poll/poll.controller.ts` - Added @CheckPermissions for create, manage, read on poll
- `apps/api/src/modules/communication/__tests__/messaging.gateway.spec.ts` - 7 tests: auth accept, auth reject, emitNewMessage, emitReadReceipt, emitPollVote, emitNewConversation, transport config
- `apps/api/src/modules/communication/__tests__/conversation.service.spec.ts` - Added MessagingGateway mock provider
- `apps/api/src/modules/communication/__tests__/message.service.spec.ts` - Added MessagingGateway mock provider
- `apps/api/src/modules/communication/__tests__/poll.service.spec.ts` - Added MessagingGateway mock provider, fixed conversationMember.findMany default
- `packages/shared/src/constants/permissions.ts` - Added CONVERSATION, MESSAGE, POLL to PermissionSubject enum
- `apps/api/prisma/seed.ts` - Added communication permission seeds for all 5 roles
- `apps/api/prisma/schema.prisma` - DSGVO retention comment on Conversation model (kommunikation 365d)

## Decisions Made
- MessagingGateway replicates NotificationGateway JWT JWKS pattern verbatim for consistency (identical auth, per-user rooms, dual transports)
- Post-transaction emission: gateway methods called AFTER $transaction commit to prevent rolled-back tx leaking Socket.IO events
- CASL provides coarse subject-level gate (conversation/message/poll); service-level ConversationMember checks provide fine-grained membership validation
- Schueler get read-only conversation/message access (no create) per school communication policy -- students observe but don't initiate

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] MessagingGateway mock required in existing service test modules**
- **Found during:** Task 1 (running tests after wiring gateway)
- **Issue:** PollService, MessageService, and ConversationService tests failed with "Can't resolve dependencies of PollService (?, MessagingGateway)" because test modules did not include the new gateway dependency
- **Fix:** Added `{ provide: MessagingGateway, useValue: { emitNewMessage: vi.fn(), ... } }` mock provider to all 3 existing service test files. Also added default `.mockResolvedValue([])` to poll.service.spec.ts conversationMember.findMany for the new post-vote member lookup.
- **Files modified:** conversation.service.spec.ts, message.service.spec.ts, poll.service.spec.ts
- **Verification:** All 319 tests pass, TypeScript compiles cleanly
- **Committed in:** b450fc7 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Standard dependency injection mock update for new provider. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- 1 it.todo() remaining in message.service.spec.ts: `emits message:new Socket.IO event` -- this was a Plan 03 stub; now covered by messaging.gateway.spec.ts tests which verify event emission directly at the gateway level
- 52 it.todo() stubs total remain across the codebase (historical stubs from earlier phases, unrelated to this plan)

## Next Phase Readiness
- MessagingGateway ready for frontend Socket.IO client integration (Plan 05/06)
- All 6 COMM requirements have backend implementation complete with real-time capabilities
- CASL permissions seeded and controllers decorated -- RBAC active for all communication endpoints
- Frontend can connect to /messaging namespace with JWT token for live message/poll/conversation updates

## Self-Check: PASSED

All created files verified present. Both task commits (b450fc7, 9ac78bf) confirmed in git log.

---
*Phase: 07-communication*
*Completed: 2026-04-07*
