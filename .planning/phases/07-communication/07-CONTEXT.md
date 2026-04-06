# Phase 7: Communication - Context

**Gathered:** 2026-04-06
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers, parents, and admins can communicate within the platform -- replacing SchoolFox/email chains with role-scoped messaging, read tracking, and file sharing. This phase delivers: thread-based conversations (direct + broadcast), read receipts, file attachments, inline polls/surveys, and absence reporting via messaging. Requirements: COMM-01 through COMM-06.

</domain>

<decisions>
## Implementation Decisions

### Message Architecture & Data Model
- **D-01:** Thread-based conversation model. Messages belong to a Conversation entity. Replies stay grouped within the thread. Matches the SchoolFox/Teams mental model parents already know.
- **D-02:** Single Message row + MessageRecipient join table for broadcasts. One Message row, N MessageRecipient rows tracking deliveredAt/readAt per user. Efficient storage; read receipts (COMM-03) are first-class via the join table.
- **D-03:** Scope enum on Conversation: DIRECT, CLASS, YEAR_GROUP, SCHOOL + scopeId reference. System expands scope to individual MessageRecipient rows on send. Enables future custom groups without schema changes.
- **D-04:** Reuse Phase 6 Notification entity for message alerts. New message triggers a Notification (type: MESSAGE_RECEIVED). Messaging has its own data model (Conversation, Message, MessageRecipient) but leverages the existing notification bell + Socket.IO /notifications pipeline for "you have a new message" alerts.

### UI & Navigation
- **D-05:** Standalone /messages route in the sidebar alongside Stundenplan, Klassenbuch, Vertretung. Messaging is a core module, not a sub-feature.
- **D-06:** List-detail split view layout. Conversation list on left, selected conversation on right. Responsive: mobile shows list OR detail (not both), with back navigation.
- **D-07:** "Neue Nachricht" button opens compose dialog for broadcasts. Recipient scope picker (Klasse/Jahrgang/Schule), subject line, message body, file attach button. Direct messages start from the conversation list or user profile.
- **D-08:** New Socket.IO namespace /messaging for live chat updates (message:new, message:read events). Separate from /notifications and /timetable. Notification bell still fires via existing /notifications namespace for "you have a new message" alerts.

### Polls & Surveys (COMM-06)
- **D-09:** Single choice + multiple choice poll types. Covers event planning ("Welcher Termin?") and feedback ("Was hat gefallen?"). Free text responses deferred to v2.
- **D-10:** Named results for sender/admin, anonymous aggregated counts for other recipients. Sender sees who voted what (needed for event planning). Other parents only see totals.
- **D-11:** Optional deadline date with auto-close. Teacher sets a deadline, poll stops accepting votes after. No deadline = open until manually closed by the sender.
- **D-12:** Polls are inline in messages as a special message type. Message with type=POLL, rendered with vote buttons inline in the conversation. No separate /polls route -- keeps everything in the conversation flow.

### Absence Reporting via Message (COMM-05)
- **D-13:** Reuse Phase 5 AbsenceExcuse backend. "Kind abwesend melden" in messaging creates an AbsenceExcuse via the existing Phase 5 excuse service. Same Klassenvorstand review workflow. No duplicate absence system.
- **D-14:** Quick-action button in parent's message compose area. "Abwesenheit melden" shortcut opens the Phase 5 excuse form pre-filled with child context. Also accessible via existing /excuses route.
- **D-15:** Dual notification on absence report: creates the Phase 5 excuse DB record AND posts an automated direct message to the Klassenvorstand for visibility in the messaging system.

### Claude's Discretion
- Prisma schema design for Conversation, Message, MessageRecipient, PollOption, PollVote entities
- NestJS module structure (CommunicationModule or separate MessageModule + PollModule)
- MessageAttachment storage reusing Phase 5 @fastify/multipart pipeline
- Exact responsive breakpoints for list-detail split view
- Conversation list sort order and search/filter implementation
- Poll result visualization (bar chart, percentage, etc.)
- Message content format (plain text vs basic markdown)

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- **NotificationService + NotificationGateway** (apps/api/src/modules/substitution/notification/) -- generic Notification entity with extensible type enum, Socket.IO /notifications namespace with JWT auth, per-user rooms. Phase 6 D-10 explicitly designed for Phase 7 reuse.
- **useNotificationSocket hook** (apps/web/src/hooks/useNotificationSocket.ts) -- real-time notification client, mounted once at _authenticated layout level
- **useNotifications hook** (apps/web/src/hooks/useNotifications.ts) -- TanStack Query for notification CRUD
- **@fastify/multipart upload pipeline** (Phase 5) -- file upload with magic byte validation, PDF/JPG/PNG support, 5MB limit
- **ExcuseService** (apps/api/src/modules/classbook/excuse.service.ts) -- Phase 5 absence excuse workflow with Klassenvorstand review
- **createNotificationSocket / socket.ts** (apps/web/src/lib/socket.ts) -- Socket.IO client factory with JWT handshake auth
- **shadcn/ui components** -- Dialog, Popover, Tabs, ScrollArea, Select, DropdownMenu already installed

### Established Patterns
- Socket.IO namespace per domain: /timetable, /classbook, /notifications (Phase 3/5/6)
- Per-user rooms via user:{keycloakSub} for targeted event delivery
- TanStack Query + custom hooks for server state (useClassbook, useResources, useNotifications)
- Zustand for client-only UI state (sidebar, school context)
- apiFetch utility for REST calls with JWT auth
- Nested resource routing: /api/v1/schools/:schoolId/{resource}
- CASL permissions with NestJS Guards for RBAC

### Integration Points
- Sidebar navigation (apps/web/src/components/layout/) -- add /messages route
- _authenticated layout -- mount /messaging Socket.IO namespace alongside existing /notifications
- Keycloak roles -- map messaging permissions to existing Admin/Schulleitung/Lehrer/Eltern/Schueler roles
- Phase 5 ExcuseService -- called from messaging for COMM-05 absence reports

</code_context>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches. All decisions were accepted at recommended defaults based on prior phase patterns and established codebase conventions.

</specifics>

<deferred>
## Deferred Ideas

- Free text poll responses (v2)
- Custom recipient groups beyond class/year/school
- Message reactions/emoji responses
- Message forwarding between conversations
- Rich text editor / markdown support for messages (v1 uses plain text)

</deferred>
