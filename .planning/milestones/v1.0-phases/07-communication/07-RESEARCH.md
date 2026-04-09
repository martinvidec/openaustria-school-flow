# Phase 7: Communication - Research

**Researched:** 2026-04-06
**Domain:** Thread-based messaging, real-time chat, polls, file attachments, absence integration
**Confidence:** HIGH

## Summary

Phase 7 implements an in-platform communication system replacing SchoolFox/email chains. The technical scope spans six requirements (COMM-01 through COMM-06): broadcast messaging to classes/year groups/school, private direct messages, read receipts, file attachments, absence reporting via messaging, and inline polls/surveys. The architecture builds heavily on established Phase 5 and Phase 6 patterns -- the NotificationService/Gateway for alerts, the @fastify/multipart pipeline for file uploads, Socket.IO namespace pattern for real-time events, and TanStack Query + apiFetch for frontend data fetching.

The data model centers on three core entities: Conversation (thread container with scope), Message (individual message with optional poll), and MessageRecipient (per-user delivery/read tracking join table). Polls are modeled as a Message subtype with PollOption and PollVote child entities. File attachments follow the ExcuseAttachment/HandoverAttachment pattern from Phases 5/6. All six requirements map cleanly onto the established NestJS module + Prisma + Socket.IO + TanStack Query stack with no new external dependencies.

**Primary recommendation:** Implement as a single CommunicationModule with sub-services (ConversationService, MessageService, PollService) following the SubstitutionModule pattern. Reuse the existing NotificationService for message alerts (D-04), the @fastify/multipart pipeline for attachments (D-14), and the ExcuseService for absence reports (D-13). Add a new /messaging Socket.IO namespace (D-08) mirroring the /notifications gateway pattern.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Thread-based conversation model. Messages belong to a Conversation entity. Replies stay grouped within the thread. Matches the SchoolFox/Teams mental model parents already know.
- **D-02:** Single Message row + MessageRecipient join table for broadcasts. One Message row, N MessageRecipient rows tracking deliveredAt/readAt per user. Efficient storage; read receipts (COMM-03) are first-class via the join table.
- **D-03:** Scope enum on Conversation: DIRECT, CLASS, YEAR_GROUP, SCHOOL + scopeId reference. System expands scope to individual MessageRecipient rows on send. Enables future custom groups without schema changes.
- **D-04:** Reuse Phase 6 Notification entity for message alerts. New message triggers a Notification (type: MESSAGE_RECEIVED). Messaging has its own data model (Conversation, Message, MessageRecipient) but leverages the existing notification bell + Socket.IO /notifications pipeline for "you have a new message" alerts.
- **D-05:** Standalone /messages route in the sidebar alongside Stundenplan, Klassenbuch, Vertretung. Messaging is a core module, not a sub-feature.
- **D-06:** List-detail split view layout. Conversation list on left, selected conversation on right. Responsive: mobile shows list OR detail (not both), with back navigation.
- **D-07:** "Neue Nachricht" button opens compose dialog for broadcasts. Recipient scope picker (Klasse/Jahrgang/Schule), subject line, message body, file attach button. Direct messages start from the conversation list or user profile.
- **D-08:** New Socket.IO namespace /messaging for live chat updates (message:new, message:read events). Separate from /notifications and /timetable. Notification bell still fires via existing /notifications namespace for "you have a new message" alerts.
- **D-09:** Single choice + multiple choice poll types. Covers event planning ("Welcher Termin?") and feedback ("Was hat gefallen?"). Free text responses deferred to v2.
- **D-10:** Named results for sender/admin, anonymous aggregated counts for other recipients. Sender sees who voted what (needed for event planning). Other parents only see totals.
- **D-11:** Optional deadline date with auto-close. Teacher sets a deadline, poll stops accepting votes after. No deadline = open until manually closed by the sender.
- **D-12:** Polls are inline in messages as a special message type. Message with type=POLL, rendered with vote buttons inline in the conversation. No separate /polls route -- keeps everything in the conversation flow.
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

### Deferred Ideas (OUT OF SCOPE)
- Free text poll responses (v2)
- Custom recipient groups beyond class/year/school
- Message reactions/emoji responses
- Message forwarding between conversations
- Rich text editor / markdown support for messages (v1 uses plain text)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| COMM-01 | Lehrer/Admin kann Nachrichten an Klasse, Jahrgang oder gesamte Schule senden | Conversation scope enum (D-03) with scope expansion to MessageRecipient rows. ConversationService.create() + MessageService.send() with batch MessageRecipient creation. SchoolClass/yearLevel queries for scope resolution. |
| COMM-02 | Lehrer und Eltern koennen private Einzelnachrichten austauschen | DIRECT scope conversations. ParentStudent join table resolves parent-teacher messaging permission. RBAC guard validates messaging eligibility. |
| COMM-03 | Empfaenger sehen Lesebestaetigungen (wer hat gelesen, wer nicht) | MessageRecipient.readAt per user. PATCH endpoint to mark messages as read (debounced on client). ReadReceiptIndicator component with Popover detail. Socket.IO message:read event for real-time sender updates. |
| COMM-04 | Nachrichten unterstuetzen Dateianhhaenge (Fotos, PDFs, Dokumente) | MessageAttachment model following ExcuseAttachment/HandoverAttachment pattern. @fastify/multipart already registered in main.ts with 5MB limit. Magic byte validation reused from ExcuseService. Storage under uploads/{schoolId}/messages/{messageId}/. |
| COMM-05 | Eltern koennen Abwesenheit des Kindes per Nachricht melden | AbsenceQuickAction UI triggers ExcuseService.createExcuse() (Phase 5) + auto-creates system message in Klassenvorstand direct conversation (D-15). No new backend excuse logic needed. |
| COMM-06 | Lehrer kann Umfragen/Abstimmungen erstellen (Veranstaltungsplanung, Feedback) | Poll/PollOption/PollVote models. Message type=POLL with inline PollDisplay rendering. Single/multiple choice (D-09). Named vs anonymous results (D-10). Optional deadline with auto-close (D-11). PollService for CRUD + vote tallying. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- **Architecture:** Monorepo with clearly separated services and internal APIs -- UI client must be swappable without backend changes
- **API-First:** All features available via API -- UI is just a consumer
- **DSGVO:** Compliance from day 1 -- messaging data is personal data (kommunikation retention = 365d per Phase 2 decision)
- **Deployment:** Single-tenant, self-hosted via Docker/Kubernetes as default
- **Framework:** NestJS 11 backend, React 19 + Vite frontend, Prisma 7 ORM, Socket.IO for real-time
- **Testing:** Vitest 4 for unit/integration tests. Nyquist validation enabled.
- **DTO definite assignment assertions (!) for class-validator with TypeScript 6.0 strict mode**
- **Global APP_GUARD with @Public() opt-out -- all endpoints protected by default**
- **Nested resource routing: /api/v1/schools/:schoolId/{resource}**
- **shadcn CLI incompatible -- create components manually following shadcn pattern**
- **apiFetch skips Content-Type for FormData bodies (instanceof check)**
- **Prisma JSON fields need explicit InputJsonValue casts**
- **Socket.IO: websocket+polling transports for school network proxy fallback**

## Standard Stack

### Core (Already Installed -- No New Dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | ^11.0 | Backend API framework | CommunicationModule follows SubstitutionModule pattern. Controllers, services, guards, gateways. |
| Prisma | ^7.0 | ORM, schema, migrations | New models (Conversation, Message, MessageRecipient, MessageAttachment, Poll, PollOption, PollVote) added to existing schema.prisma. |
| Socket.IO | 4.x | Real-time messaging events | New /messaging namespace (D-08) follows /notifications gateway pattern. JWT handshake auth via JWKS. |
| @nestjs/websockets | ^11.0 | WebSocket gateway decorator | @WebSocketGateway({ namespace: 'messaging' }) with handleConnection JWT verification. |
| @nestjs/platform-socket.io | ^11.0 | Socket.IO adapter for Fastify | Already registered in main.ts via IoAdapter. |
| @fastify/multipart | (registered) | File upload (COMM-04) | Already registered in main.ts with 5MB limit. Reuse Phase 5 upload pattern. |
| React | ^19.0 | Frontend UI | Conversation list, message detail, compose dialog, poll display, read receipts. |
| TanStack Query | 5.x | Server state management | useConversations, useMessages, usePoll hooks following useNotifications/useSubstitutions pattern. |
| TanStack Router | 1.x | Routing | /messages route with ?id= search param (desktop) or /{conversationId} nested route (mobile). |
| socket.io-client | 4.x | Frontend Socket.IO client | createMessagingSocket() following createNotificationSocket() pattern in lib/socket.ts. |
| Zustand | 5.x | Client state | Unread conversation count for sidebar badge, UI-only state. |
| Lucide React | (installed) | Icons | MessageSquare (sidebar), Check/CheckCheck (read receipts), Paperclip (attachments), Send (send button), AlertCircle (absence), BarChart (polls). |

### No New NPM Packages Required

Phase 7 is fully covered by the existing dependency tree. All patterns (Socket.IO gateway, file upload, Prisma models, TanStack Query hooks, shadcn UI components) are established from prior phases. No new npm install commands needed.

## Architecture Patterns

### Recommended Module Structure

```
apps/api/src/modules/communication/
  communication.module.ts           # NestJS module (imports SubstitutionModule for NotificationService)
  dto/
    conversation.dto.ts             # CreateConversationDto, ConversationResponseDto
    message.dto.ts                  # SendMessageDto, MessageResponseDto
    poll.dto.ts                     # CreatePollDto, CastVoteDto, PollResponseDto
    message-recipient.dto.ts        # MarkReadDto
  conversation/
    conversation.controller.ts      # CRUD: list, get, create, delete
    conversation.service.ts         # Scope expansion, member resolution, RBAC
  message/
    message.controller.ts           # Send, list (paginated), delete, attachments
    message.service.ts              # Send with recipient expansion, attachment save
  poll/
    poll.controller.ts              # Create (via message), vote, close, results
    poll.service.ts                 # Vote logic, deadline check, result aggregation
  messaging.gateway.ts              # Socket.IO /messaging namespace
  __tests__/
    conversation.service.spec.ts
    message.service.spec.ts
    poll.service.spec.ts
    messaging.gateway.spec.ts
```

```
apps/web/src/
  routes/_authenticated/messages/
    index.tsx                       # /messages route -- list-detail split view
    $conversationId.tsx             # Mobile-specific conversation detail route
  hooks/
    useConversations.ts             # TanStack Query: list, search, unread count
    useMessages.ts                  # TanStack Query: paginated messages for a conversation
    useMessagingSocket.ts           # Socket.IO /messaging client hook
    usePoll.ts                      # TanStack Query: poll data, vote mutation
    useReadReceipts.ts              # TanStack Query: read receipt detail for a message
  components/messaging/
    ConversationList.tsx
    ConversationListItem.tsx
    ConversationView.tsx
    MessageBubble.tsx
    MessageReplyInput.tsx
    ComposeDialog.tsx
    MessageAttachmentUpload.tsx
    MessageAttachmentDisplay.tsx
    ReadReceiptIndicator.tsx
    ReadReceiptDetail.tsx
    PollCreator.tsx
    PollDisplay.tsx
    PollResultBar.tsx
    AbsenceQuickAction.tsx
    UserInitialsAvatar.tsx
```

### Pattern 1: Scope Expansion (COMM-01, D-03)

**What:** When a broadcast message is sent, the backend expands the conversation scope (CLASS, YEAR_GROUP, SCHOOL) into individual MessageRecipient rows for every applicable user.

**When to use:** On every message send in a broadcast conversation.

**Implementation approach:**

```typescript
// ConversationService -- scope expansion
async expandScopeToRecipients(
  schoolId: string,
  scope: ConversationScope,
  scopeId: string | null,
): Promise<string[]> {
  // Returns keycloakUserIds of all recipients
  switch (scope) {
    case 'CLASS': {
      // Find all students in class -> their parents + class teachers + KV
      const schoolClass = await this.prisma.schoolClass.findUniqueOrThrow({
        where: { id: scopeId! },
        include: {
          students: {
            include: {
              parentStudents: {
                include: { parent: { include: { person: true } } },
              },
              person: true,
            },
          },
          klassenvorstand: { include: { person: true } },
          classSubjects: {
            include: { teacher: { include: { person: true } } },
          },
        },
      });
      // Collect unique keycloakUserIds from parents, students, teachers, KV
      const userIds = new Set<string>();
      // ... expansion logic
      return Array.from(userIds);
    }
    case 'YEAR_GROUP': {
      // Find all classes with matching yearLevel in school
      // Expand each class's users
    }
    case 'SCHOOL': {
      // Find all persons in school with keycloakUserId
    }
    case 'DIRECT': {
      // Return the single recipient's keycloakUserId
    }
  }
}
```

### Pattern 2: MessageRecipient Join Table for Read Receipts (COMM-03, D-02)

**What:** One Message row, N MessageRecipient rows. Each MessageRecipient tracks deliveredAt and readAt per user. Read receipt queries aggregate across MessageRecipient rows.

**Implementation approach:**

```typescript
// On message send:
await this.prisma.$transaction(async (tx) => {
  const message = await tx.message.create({
    data: {
      conversationId,
      senderId: senderKeycloakId,
      body: dto.body,
      type: dto.pollData ? 'POLL' : 'TEXT',
    },
  });

  // Batch create recipient rows
  const recipientIds = await this.conversationService.getMemberIds(conversationId);
  await tx.messageRecipient.createMany({
    data: recipientIds
      .filter((id) => id !== senderKeycloakId) // sender doesn't get a recipient row
      .map((userId) => ({
        messageId: message.id,
        userId,
        deliveredAt: new Date(), // mark delivered on creation (server-side delivery)
      })),
  });

  return message;
});
```

### Pattern 3: Socket.IO /messaging Namespace (D-08)

**What:** New MessagingGateway at /messaging namespace, following NotificationGateway's JWT handshake auth + per-user rooms pattern.

**When to use:** Real-time message delivery, read receipt updates, poll vote broadcasts.

**Key events:**
- `message:new` -- new message in a conversation (sent to all conversation members)
- `message:read` -- read receipt update (sent to message sender only)
- `poll:vote` -- vote count update (sent to all conversation members)
- `conversation:new` -- new conversation created (sent to all members)

**Implementation:** The gateway joins each authenticated client to `user:{keycloakSub}` rooms (identical to NotificationGateway). Message events are emitted to all conversation member rooms. The gateway class should copy the JWT verification logic from NotificationGateway (JWKS-based RS256 verification).

```typescript
@WebSocketGateway({
  namespace: 'messaging',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class MessagingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  // Identical JWT handshake pattern to NotificationGateway
  // Per-user rooms: user:{keycloakSub}

  emitNewMessage(recipientUserIds: string[], message: MessageResponseDto): void {
    for (const userId of recipientUserIds) {
      this.server.to(`user:${userId}`).emit('message:new', { message });
    }
  }

  emitReadReceipt(senderUserId: string, messageId: string, readBy: string, readCount: number, totalRecipients: number): void {
    this.server.to(`user:${senderUserId}`).emit('message:read', {
      messageId, readBy, readCount, totalRecipients,
    });
  }

  emitPollVote(recipientUserIds: string[], pollId: string, results: PollResultDto): void {
    for (const userId of recipientUserIds) {
      this.server.to(`user:${userId}`).emit('poll:vote', { pollId, results });
    }
  }
}
```

### Pattern 4: Notification Integration (D-04)

**What:** New message triggers a Notification (type: MESSAGE_RECEIVED) via the existing NotificationService, which fires the existing notification:new Socket.IO event on the /notifications namespace. This drives the bell badge and Sonner toast.

**Implementation:** After creating a message, call NotificationService.create() for each recipient with type MESSAGE_RECEIVED. The existing NotificationGateway handles the rest. Requires extending the NotificationType Prisma enum and the shared type.

```typescript
// After sending a message:
for (const recipientId of recipientUserIds) {
  await this.notificationService.create({
    userId: recipientId,
    type: 'MESSAGE_RECEIVED',
    title: `Neue Nachricht von ${senderName}`,
    body: messagePreview.substring(0, 100),
    payload: { conversationId, messageId },
  });
}
```

### Pattern 5: File Attachment Reuse (COMM-04)

**What:** MessageAttachment follows ExcuseAttachment/HandoverAttachment pattern exactly. Same fields (filename, storagePath, mimeType, sizeBytes), same magic byte validation, same disk storage under uploads/{schoolId}/messages/{messageId}/{sanitizedFilename}.

**Why reuse:** The @fastify/multipart plugin is already registered globally in main.ts. The magic byte validation constants and logic from ExcuseService can be extracted into a shared utility or duplicated (minimal code). The apiFetch FormData handling is already implemented (Phase 5 decision).

### Pattern 6: RBAC for Messaging

**What:** Messaging permissions map to existing Keycloak roles. No new CASL subjects needed unless fine-grained conversation-level control is desired. The controller-level guards validate:

| Action | Allowed Roles | Logic |
|--------|--------------|-------|
| Send broadcast to CLASS | lehrer (own classes), admin, schulleitung | Teacher must be assigned to the class (via ClassSubject or Klassenvorstand) |
| Send broadcast to YEAR_GROUP | admin, schulleitung | Year-group broadcasts are admin-level |
| Send broadcast to SCHOOL | admin, schulleitung | School-wide broadcasts are admin-level |
| Send direct message | lehrer, eltern, admin, schulleitung | Teacher<->Parent of their students. Admin/Schulleitung to anyone. |
| Read messages | All roles | Only in conversations they are members of |
| Delete conversation | admin, schulleitung | Admin-only destructive action |
| Create poll | lehrer, admin, schulleitung | Parents/students cannot create polls |
| Vote on poll | All conversation members | Must be a member of the conversation |

**Recommendation:** Add a new PermissionSubject `MESSAGE` to the shared permissions.ts enum. Guard logic validates conversation membership at the service level (not CASL conditions), similar to how NotificationService validates userId ownership.

### Anti-Patterns to Avoid

- **Sending messages via Socket.IO instead of REST:** All message creation must go through REST endpoints (POST) that persist to database first, then emit Socket.IO events. Socket.IO is for broadcasting, not for receiving user input. This ensures messages survive server restarts and are audit-trailable.
- **Creating N Notification rows per broadcast message:** For a school-wide broadcast to 500 users, do NOT create 500 Notification rows. Instead, create notifications only for the message bell/toast (one per recipient) using a batched approach or consider deferred notification delivery via BullMQ if N > 50.
- **Denormalizing conversation member lists:** The MessageRecipient table IS the membership list per message. Don't create a separate ConversationMember table -- it duplicates state. Use the latest message's recipients as the effective member list. However, for performance on conversation list queries, a lightweight ConversationMember join table (conversationId + userId) is acceptable for fast "list my conversations" queries without scanning all MessageRecipient rows.
- **Polling for new messages:** Use Socket.IO exclusively for real-time updates. Do not use setInterval polling. TanStack Query staleTime should be set high (30s+) since Socket.IO events drive cache invalidation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Read receipt tracking | Custom event system | MessageRecipient.readAt + PATCH endpoint | Join table gives you per-user tracking for free. No custom pub/sub needed. |
| Notification delivery | Separate messaging notification system | Existing NotificationService + NotificationGateway | D-04 explicitly mandates reusing the Phase 6 notification pipeline. |
| File upload/validation | Custom multipart parser | @fastify/multipart (already registered) + Phase 5 magic byte pattern | Multipart parsing is deceptively complex. The pipeline is already working. |
| Absence reporting | New absence backend | Phase 5 ExcuseService | D-13 explicitly mandates reusing the existing excuse workflow. |
| Real-time event auth | Custom token validation | Copy NotificationGateway's JWKS JWT verification | The pattern is proven and tested. |
| Scope expansion (who receives a class broadcast) | Hardcoded user lists | Query SchoolClass -> students -> parentStudents -> parents + classSubjects -> teachers | The Prisma schema already has all the relations needed. |
| Relative timestamps ("vor 5 Min.") | Custom date formatting | Simple utility function with Intl.RelativeTimeFormat or manual thresholds | Small utility, but don't inline in components. Create a shared formatRelativeTime util. |

**Key insight:** Phase 7 has zero new external dependencies. Every technical capability needed is already in the codebase. The challenge is correct orchestration and integration, not technology selection.

## Common Pitfalls

### Pitfall 1: N+1 Queries on Conversation List
**What goes wrong:** Loading the conversation list with last message, unread count, and participants triggers N+1 queries per conversation.
**Why it happens:** Each conversation needs: last message (body preview), unread count (COUNT MessageRecipient WHERE readAt IS NULL), participant info (names for display).
**How to avoid:** Use a single Prisma query with `include` for the last message (orderBy createdAt desc, take 1) and a raw SQL or Prisma aggregation for unread counts. Pre-compute unread counts on the ConversationMember table (increment on message send, decrement on read). Or use a single raw SQL query that joins conversations + last message + unread count.
**Warning signs:** Conversation list takes >500ms to load with 50+ conversations.

### Pitfall 2: Broadcast Scope Expansion Creates Too Many Rows
**What goes wrong:** A school-wide broadcast to 500 users creates 500 MessageRecipient rows + 500 Notification rows in a single transaction.
**Why it happens:** Naive implementation creates all rows synchronously in one Prisma transaction.
**How to avoid:** Use `createMany` for MessageRecipient rows (single bulk INSERT). For Notifications, either batch via createMany or defer to a BullMQ job for large broadcasts (>50 recipients). Set a reasonable batch size (100 per createMany call) if Prisma's createMany has limits.
**Warning signs:** Sending a school-wide message takes >5 seconds.

### Pitfall 3: Socket.IO Event Storm on Large Broadcasts
**What goes wrong:** A school-wide broadcast emits 500 individual Socket.IO events (one per user room), flooding the event loop.
**Why it happens:** Loop over user IDs calling `server.to(user:${id}).emit()` for each.
**How to avoid:** For broadcast conversations, consider emitting to a school-scoped room (`school:{schoolId}`) or conversation-scoped room (`conversation:{conversationId}`) instead of N individual user rooms. Users join the conversation room on Socket.IO connect if they are members. This changes the emission from O(N) to O(1).
**Warning signs:** Message delivery latency increases linearly with recipient count.

### Pitfall 4: Stale Read Receipt Counts
**What goes wrong:** Read receipt indicators show incorrect counts because the client caches stale data.
**Why it happens:** TanStack Query cache for message data is not invalidated when a message:read Socket.IO event arrives.
**How to avoid:** The useMessagingSocket hook must listen for `message:read` events and use `queryClient.setQueryData` to optimistically update the read count in the cached message data, or invalidate the specific message's query.
**Warning signs:** Read receipt icon stays gray (delivered) even though recipients have read the message.

### Pitfall 5: Race Condition on Conversation Creation (Direct Messages)
**What goes wrong:** Two users simultaneously start a direct message conversation with each other, creating two separate Conversation records.
**Why it happens:** No unique constraint on (scope=DIRECT, participant pair).
**How to avoid:** Before creating a DIRECT conversation, query for an existing conversation between the two users. Use a database-level advisory lock or a unique constraint on a sorted pair of user IDs. Simplest: add a `directPairKey` field (sorted concatenation of both user IDs) with a unique constraint.
**Warning signs:** Users see two separate conversation threads for the same 1:1 chat.

### Pitfall 6: Message Ordering with Optimistic Updates
**What goes wrong:** Optimistically inserted messages appear out of order when the server returns a different createdAt timestamp.
**Why it happens:** Client generates a temporary timestamp, but server assigns the authoritative createdAt.
**How to avoid:** Use optimistic mutation with a temporary ID and client timestamp. On mutation success, replace the temporary message with the server response. Sort by server-assigned createdAt. Use `queryClient.setQueryData` to insert the optimistic message at the bottom, then reconcile on success.
**Warning signs:** Messages briefly appear, disappear, and reappear in a different position.

### Pitfall 7: JWT Expiry During Long Chat Sessions
**What goes wrong:** Socket.IO connection breaks after 15 minutes (Keycloak access token lifetime) without graceful reconnection.
**Why it happens:** The JWT used during Socket.IO handshake expires. Socket.IO's built-in reconnection retries with the same expired token.
**How to avoid:** On `connect_error`, refresh the Keycloak token (`keycloak.updateToken(30)`) and reconnect with the new token in `auth.token`. The createMessagingSocket factory should accept a token getter function rather than a static token string. Alternatively, use the existing pattern from createNotificationSocket which reads `keycloak.token` at connection time -- Socket.IO's reconnection will re-read the (refreshed) token if the factory is called again.
**Warning signs:** Chat stops receiving messages after ~15 minutes of inactivity.

### Pitfall 8: DSGVO -- Message Data is Personal Data
**What goes wrong:** Messages are stored indefinitely without retention policy.
**Why it happens:** Phase 2 established retention defaults but the communication category (kommunikation=365d/1yr) needs to be wired to the new entities.
**How to avoid:** Ensure the Phase 2 retention job (DsgvoModule BullMQ cron at 0 2 * * *) includes Conversation, Message, and MessageRecipient in its cleanup scope. Mark message entities with the `kommunikation` retention category. This is a data model decision, not a code change -- the retention service queries by entity type.
**Warning signs:** DSGVO audit reveals messages older than 1 year still in the database.

## Code Examples

### Prisma Schema Design (Conversation + Message + MessageRecipient)

```prisma
// Phase 7 -- Communication (COMM-01..COMM-06)

enum ConversationScope {
  DIRECT
  CLASS
  YEAR_GROUP
  SCHOOL
}

enum MessageType {
  TEXT
  POLL
  SYSTEM
}

model Conversation {
  id        String            @id @default(uuid())
  schoolId  String            @map("school_id")
  school    School            @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  scope     ConversationScope
  scopeId   String?           @map("scope_id")  // classId, yearLevel string, or null for SCHOOL/DIRECT
  subject   String?           // required for broadcasts, null for DIRECT
  createdBy String            @map("created_by") // keycloakUserId of creator
  directPairKey String?       @unique @map("direct_pair_key") // sorted "userId1:userId2" for DIRECT dedup (Pitfall 5)
  createdAt DateTime          @default(now()) @map("created_at")
  updatedAt DateTime          @updatedAt @map("updated_at")

  messages            Message[]
  conversationMembers ConversationMember[]

  @@index([schoolId, scope])
  @@index([createdBy])
  @@map("conversations")
}

model ConversationMember {
  id             String       @id @default(uuid())
  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String       @map("user_id") // keycloakUserId
  unreadCount    Int          @default(0) @map("unread_count")
  joinedAt       DateTime     @default(now()) @map("joined_at")

  @@unique([conversationId, userId])
  @@index([userId])
  @@map("conversation_members")
}

model Message {
  id             String       @id @default(uuid())
  conversationId String       @map("conversation_id")
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  senderId       String       @map("sender_id") // keycloakUserId
  body           String
  type           MessageType  @default(TEXT)
  createdAt      DateTime     @default(now()) @map("created_at")

  recipients  MessageRecipient[]
  attachments MessageAttachment[]
  poll        Poll?

  @@index([conversationId, createdAt])
  @@map("messages")
}

model MessageRecipient {
  id          String    @id @default(uuid())
  messageId   String    @map("message_id")
  message     Message   @relation(fields: [messageId], references: [id], onDelete: Cascade)
  userId      String    @map("user_id") // keycloakUserId
  deliveredAt DateTime? @map("delivered_at")
  readAt      DateTime? @map("read_at")

  @@unique([messageId, userId])
  @@index([userId, readAt])
  @@map("message_recipients")
}

model MessageAttachment {
  id          String   @id @default(uuid())
  messageId   String   @map("message_id")
  message     Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)
  filename    String
  storagePath String   @map("storage_path")
  mimeType    String   @map("mime_type")
  sizeBytes   Int      @map("size_bytes")
  createdAt   DateTime @default(now()) @map("created_at")

  @@map("message_attachments")
}

model Poll {
  id        String     @id @default(uuid())
  messageId String     @unique @map("message_id")
  message   Message    @relation(fields: [messageId], references: [id], onDelete: Cascade)
  question  String
  type      PollType
  deadline  DateTime?
  isClosed  Boolean    @default(false) @map("is_closed")
  createdAt DateTime   @default(now()) @map("created_at")

  options PollOption[]

  @@map("polls")
}

enum PollType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
}

model PollOption {
  id     String @id @default(uuid())
  pollId String @map("poll_id")
  poll   Poll   @relation(fields: [pollId], references: [id], onDelete: Cascade)
  text   String
  order  Int    @default(0) // display order

  votes PollVote[]

  @@map("poll_options")
}

model PollVote {
  id           String     @id @default(uuid())
  pollOptionId String     @map("poll_option_id")
  pollOption   PollOption @relation(fields: [pollOptionId], references: [id], onDelete: Cascade)
  userId       String     @map("user_id") // keycloakUserId
  createdAt    DateTime   @default(now()) @map("created_at")

  @@unique([pollOptionId, userId]) // one vote per option per user
  @@index([userId])
  @@map("poll_votes")
}
```

**Design rationale:**
- `ConversationMember` table enables fast "list my conversations" queries (WHERE userId = ?) without scanning MessageRecipient.
- `ConversationMember.unreadCount` is denormalized for O(1) sidebar badge rendering. Incremented on message send, decremented on mark-read.
- `directPairKey` (sorted "userId1:userId2") prevents duplicate DIRECT conversations (Pitfall 5).
- `MessageRecipient` is per-message, `ConversationMember` is per-conversation. Both are needed.
- `Poll` has a 1:1 relation to `Message` via unique `messageId`. Polls are always inline (D-12).
- `PollVote` unique constraint on `[pollOptionId, userId]` allows vote changes via upsert.
- For MULTIPLE_CHOICE: user can have votes on multiple PollOptions within the same Poll. The unique constraint is per-option, not per-poll.

### Controller Route Structure

```
POST   /api/v1/schools/:schoolId/conversations          # Create conversation + first message
GET    /api/v1/schools/:schoolId/conversations          # List user's conversations (paginated)
GET    /api/v1/schools/:schoolId/conversations/:id      # Get conversation detail
DELETE /api/v1/schools/:schoolId/conversations/:id      # Delete conversation (admin only)

POST   /api/v1/schools/:schoolId/conversations/:id/messages       # Send message in conversation
GET    /api/v1/schools/:schoolId/conversations/:id/messages       # List messages (paginated, cursor-based)
DELETE /api/v1/schools/:schoolId/conversations/:id/messages/:mid  # Delete message

POST   /api/v1/schools/:schoolId/conversations/:id/messages/:mid/attachments  # Upload attachment
GET    /api/v1/schools/:schoolId/conversations/:id/messages/:mid/attachments/:aid/download  # Download

PATCH  /api/v1/schools/:schoolId/conversations/:id/read           # Mark conversation as read (batch)

POST   /api/v1/schools/:schoolId/polls/:pid/votes       # Cast vote
DELETE /api/v1/schools/:schoolId/polls/:pid/votes       # Retract vote (for change)
PATCH  /api/v1/schools/:schoolId/polls/:pid/close       # Close poll
GET    /api/v1/schools/:schoolId/polls/:pid/results     # Get poll results (role-scoped: named vs anonymous)
```

### Frontend Socket.IO Hook Pattern

```typescript
// useMessagingSocket.ts -- follows useNotificationSocket pattern
export function useMessagingSocket(jwt: string | null) {
  const queryClient = useQueryClient();
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!jwt) return;

    const socket = createMessagingSocket(jwt);
    socketRef.current = socket;

    socket.on('message:new', (event: { message: MessageDto }) => {
      // Optimistic cache update: append message to conversation
      queryClient.invalidateQueries({
        queryKey: ['messages', event.message.conversationId],
      });
      // Update conversation list preview
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    });

    socket.on('message:read', (event: { messageId: string; readCount: number }) => {
      // Update read receipt count in cache
      // Use setQueryData for instant UI update without refetch
    });

    socket.on('poll:vote', (event: { pollId: string; results: PollResultDto }) => {
      queryClient.setQueryData(['poll', event.pollId], event.results);
    });

    return () => {
      disconnectMessagingSocket(socketRef.current);
      socketRef.current = null;
    };
  }, [jwt, queryClient]);
}
```

### Shared Types (packages/shared/src/types/messaging.ts)

```typescript
// Enums (mirror Prisma enums)
export type ConversationScope = 'DIRECT' | 'CLASS' | 'YEAR_GROUP' | 'SCHOOL';
export type MessageType = 'TEXT' | 'POLL' | 'SYSTEM';
export type PollType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';

// DTOs
export interface ConversationDto {
  id: string;
  schoolId: string;
  scope: ConversationScope;
  scopeId: string | null;
  subject: string | null;
  createdBy: string;
  createdAt: string;
  // Denormalized for list view:
  lastMessage: MessagePreviewDto | null;
  unreadCount: number;
  memberCount: number;
}

export interface MessagePreviewDto {
  body: string;
  senderName: string;
  createdAt: string;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  body: string;
  type: MessageType;
  createdAt: string;
  attachments: MessageAttachmentDto[];
  poll: PollDto | null;
  // Read receipt (sender only):
  readCount?: number;
  totalRecipients?: number;
}

export interface MessageAttachmentDto {
  id: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
}

export interface PollDto {
  id: string;
  question: string;
  type: PollType;
  deadline: string | null;
  isClosed: boolean;
  options: PollOptionDto[];
  userVoteOptionIds: string[]; // which options the current user voted for
}

export interface PollOptionDto {
  id: string;
  text: string;
  voteCount: number;
  // Named voters (sender/admin only):
  voters?: { userId: string; name: string }[];
}

// Socket events
export interface MessageNewEvent {
  message: MessageDto;
}

export interface MessageReadEvent {
  messageId: string;
  readBy: string;
  readCount: number;
  totalRecipients: number;
}

export interface PollVoteEvent {
  pollId: string;
  results: PollOptionDto[];
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate REST polling for messages | Socket.IO real-time + TanStack Query cache invalidation | Established in Phase 3 | Zero polling overhead; instant message delivery |
| Rust-based Prisma engine | Pure TypeScript Prisma 7 | Late 2025 | createMany is faster; no engine startup overhead for batch MessageRecipient creation |
| Custom file upload handling | @fastify/multipart (registered globally) | Phase 5 | No new upload infrastructure needed |
| Per-module notification systems | Centralized NotificationService (Phase 6) | Phase 6 | MESSAGE_RECEIVED is just another NotificationType enum value |

**Deprecated/outdated:**
- None for this phase. All patterns are current and established.

## Open Questions

1. **ConversationMember vs MessageRecipient for membership**
   - What we know: D-02 specifies MessageRecipient as the per-message tracking table. D-03 implies scope expansion happens on send.
   - What's unclear: Should there be a separate ConversationMember table for fast "list my conversations" queries, or should membership be derived from MessageRecipient?
   - Recommendation: Use both. ConversationMember for fast list queries and unread counts, MessageRecipient for per-message read tracking. ConversationMember is populated on conversation creation/scope expansion. This is the recommended approach in the Prisma schema above.

2. **Notification volume for school-wide broadcasts**
   - What we know: D-04 says new messages trigger Notification rows.
   - What's unclear: Should a school-wide broadcast to 500 users create 500 Notification rows?
   - Recommendation: Yes, but defer creation to a BullMQ job for broadcasts with >50 recipients. The notification job creates rows in batches of 100. This prevents the send action from blocking on notification creation.

3. **Message content: plain text only**
   - What we know: Deferred ideas explicitly exclude rich text/markdown for v1.
   - What's unclear: Should plain-text URLs be auto-linked in the frontend?
   - Recommendation: Yes, auto-link URLs in the MessageBubble component using a simple regex. This is a frontend-only concern. Store message body as plain text in the database.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.x |
| Config file | `apps/api/vitest.config.ts` (backend), `apps/web/vitest.config.ts` (frontend) |
| Quick run command | `pnpm --filter api test -- --run --reporter=verbose` |
| Full suite command | `pnpm --filter api test -- --run && pnpm --filter web test -- --run` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| COMM-01 | Broadcast message to class/year/school with scope expansion | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/conversation.service.spec.ts -t "scope expansion"` | Wave 0 |
| COMM-01 | Message delivered to all expanded recipients | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/message.service.spec.ts -t "broadcast"` | Wave 0 |
| COMM-02 | Direct message between teacher and parent | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/message.service.spec.ts -t "direct"` | Wave 0 |
| COMM-02 | RBAC: parent can only message own child's teachers | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/conversation.service.spec.ts -t "RBAC"` | Wave 0 |
| COMM-03 | Read receipt marks MessageRecipient.readAt | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/message.service.spec.ts -t "read receipt"` | Wave 0 |
| COMM-03 | Read receipt counts (read/total) correct | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/message.service.spec.ts -t "receipt count"` | Wave 0 |
| COMM-04 | File attachment saved with magic byte validation | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/message.service.spec.ts -t "attachment"` | Wave 0 |
| COMM-04 | Invalid file type rejected | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/message.service.spec.ts -t "invalid file"` | Wave 0 |
| COMM-05 | Absence quick-action creates ExcuseService record | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/message.service.spec.ts -t "absence"` | Wave 0 |
| COMM-05 | Absence report auto-creates system message to KV | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/message.service.spec.ts -t "absence system message"` | Wave 0 |
| COMM-06 | Poll creation with single/multiple choice | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/poll.service.spec.ts -t "create"` | Wave 0 |
| COMM-06 | Vote casting and change | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/poll.service.spec.ts -t "vote"` | Wave 0 |
| COMM-06 | Deadline auto-close | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/poll.service.spec.ts -t "deadline"` | Wave 0 |
| COMM-06 | Named results for sender, anonymous for others | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/poll.service.spec.ts -t "results visibility"` | Wave 0 |
| D-08 | MessagingGateway JWT auth + room join | unit | `pnpm --filter api test -- --run apps/api/src/modules/communication/__tests__/messaging.gateway.spec.ts` | Wave 0 |

### Sampling Rate

- **Per task commit:** `pnpm --filter api test -- --run --reporter=verbose`
- **Per wave merge:** `pnpm --filter api test -- --run && pnpm --filter web test -- --run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `apps/api/src/modules/communication/__tests__/conversation.service.spec.ts` -- covers COMM-01, COMM-02 scope/RBAC
- [ ] `apps/api/src/modules/communication/__tests__/message.service.spec.ts` -- covers COMM-01 send, COMM-02 direct, COMM-03 receipts, COMM-04 attachments, COMM-05 absence
- [ ] `apps/api/src/modules/communication/__tests__/poll.service.spec.ts` -- covers COMM-06
- [ ] `apps/api/src/modules/communication/__tests__/messaging.gateway.spec.ts` -- covers D-08 Socket.IO

## Sources

### Primary (HIGH confidence)

- **Codebase inspection** -- Read NotificationService, NotificationGateway, NotificationController (apps/api/src/modules/substitution/notification/)
- **Codebase inspection** -- Read ExcuseService with file upload pattern (apps/api/src/modules/classbook/excuse.service.ts)
- **Codebase inspection** -- Read Socket.IO client setup (apps/web/src/lib/socket.ts)
- **Codebase inspection** -- Read useNotificationSocket hook (apps/web/src/hooks/useNotificationSocket.ts)
- **Codebase inspection** -- Read Prisma schema (apps/api/prisma/schema.prisma) -- Notification, ExcuseAttachment, HandoverAttachment, Person, Parent, ParentStudent, Student, SchoolClass models
- **Codebase inspection** -- Read SubstitutionModule structure (apps/api/src/modules/substitution/substitution.module.ts)
- **Codebase inspection** -- Read AppSidebar navigation (apps/web/src/components/layout/AppSidebar.tsx)
- **Codebase inspection** -- Read _authenticated layout (apps/web/src/routes/_authenticated.tsx)
- **Codebase inspection** -- Read main.ts (@fastify/multipart registration, IoAdapter)
- **Codebase inspection** -- Read app.module.ts (module registration pattern)
- **CONTEXT.md** -- All 15 locked decisions (D-01 through D-15)
- **07-UI-SPEC.md** -- Approved UI design contract with component inventory, interaction contracts, copywriting

### Secondary (MEDIUM confidence)

- **Established project patterns** -- Phase 4/5/6 decisions documented in STATE.md. Socket.IO namespace pattern, file upload pattern, CASL permission pattern, TanStack Query hook pattern all verified through code inspection.

### Tertiary (LOW confidence)

- None. All recommendations are grounded in codebase patterns and locked decisions.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies; all patterns verified in codebase
- Architecture: HIGH -- CommunicationModule follows established SubstitutionModule pattern; schema design informed by ExcuseAttachment/Notification models
- Pitfalls: HIGH -- identified from direct codebase analysis (N+1 queries, batch size, Socket.IO patterns, JWT expiry, DSGVO retention)

**Research date:** 2026-04-06
**Valid until:** 2026-05-06 (stable -- all patterns are established; no external dependency changes expected)
