---
phase: 07-communication
verified: 2026-04-07T09:15:00Z
status: human_needed
score: 17/17 must-haves verified
re_verification:
  previous_status: gaps_found
  previous_score: 14/17
  gaps_closed:
    - "Parent can report absence via AbsenceQuickAction which POSTs to /api/v1/schools/:schoolId/absence-report (COMM-05)"
    - "File attachments uploaded to /messages/:messageId/attachments after message creation in ConversationView and ComposeDialog (COMM-04)"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "End-to-end messaging flow"
    expected: "Sender sends message, recipient sees it in real-time, read receipts update"
    why_human: "Requires running full stack with Keycloak, Socket.IO, two authenticated sessions"
  - test: "Poll voting and named voter visibility"
    expected: "Teacher sees named voters per D-10; student sees anonymous counts only"
    why_human: "Role-based data visibility requires real Keycloak tokens and multiple user sessions"
  - test: "File attachment download"
    expected: "Uploaded file downloads correctly via download endpoint with correct Content-Disposition header"
    why_human: "Requires running API server with filesystem write access"
  - test: "AbsenceQuickAction end-to-end: parent reports absence and Klassenvorstand receives system message"
    expected: "POST to /absence-report creates AbsenceExcuse + system message visible in Klassenvorstand's conversation list"
    why_human: "Requires parent Keycloak session, school with configured Klassenvorstand, and running API"
---

# Phase 7: Communication Verification Report (RE-VERIFICATION)

**Phase Goal:** Teachers, parents, and admins can communicate within the platform -- replacing SchoolFox/email chains with role-scoped messaging, read tracking, and file sharing
**Verified:** 2026-04-07T09:15:00Z
**Status:** human_needed
**Re-verification:** Yes -- after gap closure by Plan 07-08

## Re-verification Summary

Previous verification (2026-04-07T08:22:00Z) found 2 gaps:
- COMM-05: AbsenceQuickAction called wrong endpoint (/classbook/excuses via ExcuseForm)
- COMM-04: ConversationView.handleSend ignored files param; ComposeDialog had explicit TODO for attachment upload

Plan 07-08 closed both gaps. This re-verification confirms all 17 truths now pass automated checks.

**Score:** 17/17 (was 14/17)

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | Prisma schema has 8 communication models + 3 enums + MESSAGE_RECEIVED | VERIFIED | Confirmed in initial verification; no regressions |
| 2  | Shared types package exports all messaging DTOs and enums | VERIFIED | Confirmed in initial verification; no regressions |
| 3  | Teacher can create class/year/school-scoped broadcast conversations with scope expansion | VERIFIED | Confirmed in initial verification; no regressions |
| 4  | Teacher and parent can exchange direct messages with DIRECT dedup | VERIFIED | Confirmed in initial verification; no regressions |
| 5  | Sending a message creates MessageRecipient rows and increments unreadCount | VERIFIED | Confirmed in initial verification; no regressions |
| 6  | Read receipt marking sets readAt and resets unreadCount | VERIFIED | Confirmed in initial verification; no regressions |
| 7  | GET /:messageId/recipients returns per-user read status with names | VERIFIED | Confirmed in initial verification; no regressions |
| 8  | Socket.IO /messaging namespace handles message:new, message:read, poll:vote, conversation:new | VERIFIED | Confirmed in initial verification; no regressions |
| 9  | Messages can include file attachments with magic byte validation and 5MB limit | VERIFIED | uploadMessageAttachments exported from useMessages.ts (line 87-104); imported in ConversationView (line 5, used at line 100); imported in ComposeDialog (line 28, called at line 98). No TODO comments remain. |
| 10 | Parent can report absence creating AbsenceExcuse + system message to Klassenvorstand | VERIFIED | AbsenceQuickAction rewritten: POSTs to `/api/v1/schools/${schoolId}/absence-report` (line 117); children populated from useSchoolContext store (line 53); no ExcuseForm import; success toast at line 129. |
| 11 | Polls render inline with single/multi choice, voting, results, auto-close | VERIFIED | Confirmed in initial verification; no regressions |
| 12 | User can see conversation list with last message preview, unread count, scope badge | VERIFIED | Confirmed in initial verification; no regressions |
| 13 | User can compose and send broadcast or direct message | VERIFIED | Confirmed in initial verification; no regressions |
| 14 | User can reply to messages in a conversation | VERIFIED | handleSend now accepts (body, files?) at line 94-110; MessageReplyInput.onSend is fully wired |
| 15 | Sidebar shows Nachrichten with unread badge for all authenticated roles | VERIFIED | Confirmed in initial verification; no regressions |
| 16 | useMessagingSocket hook mounted in authenticated layout listening for all 4 event types | VERIFIED | Confirmed in initial verification; no regressions |
| 17 | Read receipt indicators show 4 states, clicking shows Popover with per-user details | VERIFIED | Confirmed in initial verification; no regressions |

**Score: 17/17 truths verified**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/prisma/schema.prisma` | 8 communication models + 3 enums | VERIFIED | Confirmed in initial verification |
| `packages/shared/src/types/messaging.ts` | ConversationDto, MessageDto, PollDto, socket events | VERIFIED | Confirmed in initial verification |
| `apps/api/src/modules/communication/communication.module.ts` | Module with all services/controllers registered | VERIFIED | Confirmed in initial verification |
| `apps/api/src/modules/communication/conversation/conversation.service.ts` | Scope expansion, CRUD, RBAC | VERIFIED | Confirmed in initial verification |
| `apps/api/src/modules/communication/conversation/conversation.controller.ts` | REST endpoints for conversations | VERIFIED | Confirmed in initial verification |
| `apps/api/src/modules/communication/message/message.service.ts` | Send, read receipts, attachments, absence, pagination | VERIFIED | Confirmed in initial verification |
| `apps/api/src/modules/communication/message/message.controller.ts` | REST endpoints including recipients, attachments, absence-report | VERIFIED | Confirmed in initial verification |
| `apps/api/src/modules/communication/poll/poll.service.ts` | Poll CRUD, voting, results | VERIFIED | Confirmed in initial verification |
| `apps/api/src/modules/communication/poll/poll.controller.ts` | Poll REST endpoints | VERIFIED | Confirmed in initial verification |
| `apps/api/src/modules/communication/messaging.gateway.ts` | Socket.IO /messaging namespace | VERIFIED | Confirmed in initial verification |
| `packages/shared/src/constants/permissions.ts` | CONVERSATION, MESSAGE, POLL subjects | VERIFIED | Confirmed in initial verification |
| `apps/web/src/routes/_authenticated/messages/index.tsx` | Messages page with list-detail split | VERIFIED | Confirmed in initial verification |
| `apps/web/src/hooks/useConversations.ts` | TanStack Query hooks + CreateConversationResponse type | VERIFIED | CreateConversationResponse type at line 9-11 includes firstMessage?: MessageDto; useCreateConversation mutationFn returns Promise<CreateConversationResponse> (line 68) |
| `apps/web/src/hooks/useMessages.ts` | TanStack Query hooks + uploadMessageAttachments utility | VERIFIED | uploadMessageAttachments exported at line 87-104; sequential per-file POST to /attachments endpoint |
| `apps/web/src/hooks/useMessagingSocket.ts` | Socket.IO /messaging client hook | VERIFIED | Confirmed in initial verification |
| `apps/web/src/hooks/useReadReceipts.ts` | Read receipt fetching hook | VERIFIED | Confirmed in initial verification |
| `apps/web/src/hooks/useUserContext.ts` | Passes children array to school-context-store | VERIFIED | children field added to UserContextResponse (line 20); setContext(query.data) passes entire response including children (line 40) |
| `apps/web/src/stores/school-context-store.ts` | children field in SchoolContextState | VERIFIED | ChildContext interface (lines 3-8); children: ChildContext[] in state (line 19); initialized to [] (line 44); stored via setContext with `data.children ?? []` (line 57) |
| `apps/web/src/components/messaging/ComposeDialog.tsx` | Attachment upload after conversation creation | VERIFIED | uploadMessageAttachments called at lines 98-103 after createConversation.mutateAsync; no TODO comments; result.firstMessage?.id used correctly |
| `apps/web/src/components/messaging/ReadReceiptIndicator.tsx` | 4-state read receipt icon | VERIFIED | Confirmed in initial verification |
| `apps/web/src/components/messaging/ReadReceiptDetail.tsx` | Popover with per-user read/unread | VERIFIED | Confirmed in initial verification |
| `apps/web/src/components/messaging/PollDisplay.tsx` | Inline poll with vote buttons | VERIFIED | Confirmed in initial verification |
| `apps/web/src/components/messaging/AbsenceQuickAction.tsx` | Parent absence reporting direct POST to /absence-report | VERIFIED | No ExcuseForm import; POSTs to /api/v1/schools/${schoolId}/absence-report (line 117); children from useSchoolContext (line 53); auto-selects single child (line 140); success toast at line 129; error toast at line 133 |
| `apps/web/src/lib/format-relative-time.ts` | German relative timestamps | VERIFIED | Confirmed in initial verification |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `conversation/conversation.service.ts` | `prisma.conversation` | Prisma client queries | WIRED | Confirmed in initial verification |
| `message/message.service.ts` | `prisma.message` | Prisma client queries | WIRED | Confirmed in initial verification |
| `message/message.service.ts` | `notification.service.ts` | NotificationService.create() | WIRED | Confirmed in initial verification |
| `message/message.service.ts` | `messaging.gateway.ts` | emitNewMessage() after send | WIRED | Confirmed in initial verification |
| `message/message.service.ts` | `messaging.gateway.ts` | emitReadReceipt() after markRead | WIRED | Confirmed in initial verification |
| `poll/poll.service.ts` | `prisma.poll` | Prisma client queries | WIRED | Confirmed in initial verification |
| `poll/poll.service.ts` | `messaging.gateway.ts` | emitPollVote() after castVote | WIRED | Confirmed in initial verification |
| `message/message.service.ts` | `excuse.service.ts` | ExcuseService for COMM-05 | WIRED | Confirmed in initial verification |
| `useMessagingSocket.ts` | `lib/socket.ts` | createMessagingSocket() | WIRED | Confirmed in initial verification |
| `useConversations.ts` | `/api/v1/schools/:schoolId/conversations` | apiFetch | WIRED | Confirmed in initial verification |
| `useMessages.ts` | `/api/v1/schools/:schoolId/conversations/:id/messages` | apiFetch | WIRED | Confirmed in initial verification |
| `useReadReceipts.ts` | `/api/v1/.../messages/:messageId/recipients` | apiFetch GET | WIRED | Confirmed in initial verification |
| `MessageBubble.tsx` | `ReadReceiptIndicator.tsx` | Inline render for sender's messages | WIRED | Confirmed in initial verification |
| `MessageBubble.tsx` | `PollDisplay.tsx` | Inline render when message.type === 'POLL' | WIRED | Confirmed in initial verification |
| `MessageBubble.tsx` | `MessageAttachmentDisplay.tsx` | Inline render when attachments.length > 0 | WIRED | Confirmed in initial verification |
| `AbsenceQuickAction.tsx` | `/api/v1/schools/:schoolId/absence-report` | apiFetch POST | WIRED | Line 117: apiFetch(`/api/v1/schools/${schoolId}/absence-report`, { method: 'POST', body: JSON.stringify({...}) }); response checked at line 127; toast on success/error |
| `ConversationView.tsx` | `/messages/:messageId/attachments` | uploadMessageAttachments after sendMessage.mutateAsync | WIRED | handleSend (lines 94-110) calls sendMessage.mutateAsync, then uploadMessageAttachments(schoolId, conversationId, message.id, files) |
| `ComposeDialog.tsx` | `/messages/:messageId/attachments` | uploadMessageAttachments after createConversation.mutateAsync | WIRED | handleBroadcastSend calls createConversation.mutateAsync, then uploadMessageAttachments(schoolId, result.id, result.firstMessage.id, attachedFiles) at lines 96-107 |
| `useUserContext.ts` | `school-context-store.ts` children field | setContext(query.data) includes children | WIRED | UserContextResponse.children (line 20) flows to setContext at line 40; store stores data.children ?? [] |

---

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `ConversationList.tsx` | conversations | useConversations -> apiFetch GET /conversations | Yes (DB via ConversationService.findAll) | FLOWING |
| `ConversationView.tsx` | messages | useMessages -> apiFetch GET /messages | Yes (DB via MessageService.findAll with cursor pagination) | FLOWING |
| `ReadReceiptDetail.tsx` | recipientStatus | useReadReceipts -> apiFetch GET /recipients | Yes (DB via MessageService.getRecipients) | FLOWING |
| `PollDisplay.tsx` | poll (from MessageDto) | messageQuery -> MessageService.findAll includes poll | Yes (DB via Poll/PollOption relations) | FLOWING |
| `AbsenceQuickAction.tsx` | children (selector) | useSchoolContext(s => s.children) <- useUserContext <- /api/v1/users/me | Yes (API response children array for parent role) | FLOWING |

---

## Behavioral Spot-Checks

| Behavior | Check | Result | Status |
|----------|-------|--------|--------|
| TypeScript compiles with zero errors | `npx tsc --noEmit -p apps/web/tsconfig.json` | No output (zero errors) | PASS |
| AbsenceQuickAction has no ExcuseForm reference | grep ExcuseForm AbsenceQuickAction.tsx | No matches | PASS |
| AbsenceQuickAction calls /absence-report | grep "absence-report" AbsenceQuickAction.tsx | Lines 29, 117 confirmed | PASS |
| ComposeDialog has no TODO for attachment upload | grep TODO ComposeDialog.tsx | No matches | PASS |
| ComposeDialog calls uploadMessageAttachments | grep "uploadMessageAttachments" ComposeDialog.tsx | Lines 28, 98 confirmed | PASS |
| ConversationView calls uploadMessageAttachments | grep "uploadMessageAttachments" ConversationView.tsx | Lines 5, 100 confirmed | PASS |
| uploadMessageAttachments exported from useMessages | Present at lines 87-104 | Sequential per-file POST to correct endpoint | PASS |
| school-context-store has children field | children: ChildContext[] at line 19, initialized [] line 44 | Children wired through setContext | PASS |
| useUserContext children in interface | children?: Array<{...}> at line 20 | Flows via setContext(query.data) at line 40 | PASS |
| useConversations CreateConversationResponse has firstMessage | type at lines 9-11: ConversationDto & { firstMessage?: MessageDto } | mutationFn return type correct | PASS |

---

## Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| COMM-01 | 07-01, 07-02, 07-04, 07-05 | Lehrer/Admin kann Nachrichten an Klasse, Jahrgang oder gesamte Schule senden | SATISFIED | ConversationService.expandScopeToRecipients; ComposeDialog Rundnachricht tab; REQUIREMENTS.md marked Complete |
| COMM-02 | 07-01, 07-02, 07-04, 07-05 | Lehrer und Eltern koennen private Einzelnachrichten austauschen | SATISFIED | createDirect with directPairKey dedup; ComposeDialog Direktnachricht tab; REQUIREMENTS.md marked Complete |
| COMM-03 | 07-01, 07-02, 07-04, 07-05, 07-06 | Empfaenger sehen Lesebestaetigung (wer hat gelesen, wer nicht) | SATISFIED | MessageService.markRead + getRecipients; ReadReceiptIndicator 4 states; ReadReceiptDetail Popover; REQUIREMENTS.md marked Complete |
| COMM-04 | 07-01, 07-03, 07-07, 07-08 | Nachrichten unterstuetzen Dateianhange (Fotos, PDFs, Dokumente) | SATISFIED | uploadMessageAttachments utility wired into ConversationView.handleSend and ComposeDialog.handleBroadcastSend; backend magic byte validation confirmed; REQUIREMENTS.md marked Complete |
| COMM-05 | 07-01, 07-03, 07-07, 07-08 | Eltern koennen Abwesenheit des Kindes per Nachricht melden | SATISFIED | AbsenceQuickAction rewritten to POST /absence-report; children from useSchoolContext populated via useUserContext; success toast confirmed; REQUIREMENTS.md marked Complete |
| COMM-06 | 07-01, 07-03, 07-04, 07-07 | Lehrer kann Umfragen/Abstimmungen erstellen | SATISFIED | PollService.createWithMessage, castVote, closePoll, getResults; PollDisplay wired in MessageBubble; REQUIREMENTS.md marked Complete |

All 6 COMM requirements are marked Complete in REQUIREMENTS.md. No orphaned requirements found.

---

## Anti-Patterns Found

No blockers or warnings. The 2 anti-patterns from the initial verification are resolved:

| File | Previous Issue | Resolution |
|------|---------------|------------|
| `AbsenceQuickAction.tsx` | ExcuseForm wrapper calling /classbook/excuses; children: [] hardcoded | Fully rewritten: inline form posting to /absence-report; children from store |
| `ComposeDialog.tsx` | TODO comment on lines 92-95; attachedFiles silently discarded | TODO removed; uploadMessageAttachments called after createConversation.mutateAsync |
| `ConversationView.tsx` | handleSend(body: string) signature ignoring files | handleSend(body, files?) at line 94; files uploaded via uploadMessageAttachments |

No new anti-patterns introduced by Plan 07-08.

---

## Human Verification Required

### 1. End-to-End Messaging Flow

**Test:** Log in as Lehrer in one browser, Eltern in another. Send a CLASS-scoped broadcast from Lehrer. Verify Eltern receives it in real-time via Socket.IO.
**Expected:** Message appears without page refresh; sidebar unread badge increments; marking as read clears badge.
**Why human:** Requires full stack running with Keycloak, Socket.IO, two authenticated sessions.

### 2. Poll Voting with Named/Anonymous Visibility

**Test:** Teacher creates a poll, students vote, teacher views named voters, student views anonymous counts.
**Expected:** Teacher sees names per D-10; student sees counts only.
**Why human:** Role-based data visibility requires real Keycloak tokens and multiple user sessions.

### 3. File Attachment Download (Full Round-Trip)

**Test:** Use API client (curl/Postman) or the UI to upload an attachment via the reply input or compose dialog, then download via the generated download URL.
**Expected:** File downloads with correct Content-Disposition header; magic byte validation rejects non-image/non-document files.
**Why human:** Requires running API server with filesystem write access and a valid session token.

### 4. AbsenceQuickAction End-to-End

**Test:** Log in as Eltern. Click "Abwesenheit melden" in the messages view. Select child, set date range, pick reason, submit.
**Expected:** Success toast "Abwesenheit gemeldet und Klassenvorstand benachrichtigt" appears; Klassenvorstand sees a system message in their conversation list for the class.
**Why human:** Requires parent Keycloak session with children configured in user context, a school with an assigned Klassenvorstand, and the full API stack running.

---

## Gaps Summary

No gaps remain. All 17 truths verified. Both previously failing items (COMM-04, COMM-05) are now VERIFIED with substantive implementations wired end-to-end. Automated checks all pass. Phase 7 goal is fully achieved at the code level.

---

_Verified: 2026-04-07T09:15:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification: Yes (after Plan 07-08 gap closure)_
