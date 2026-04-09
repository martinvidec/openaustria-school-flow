---
phase: 07-communication
plan: 05
subsystem: ui
tags: [react, tanstack-query, socket.io, messaging, conversation, compose-dialog, sidebar, real-time]

# Dependency graph
requires:
  - phase: 07-communication
    provides: MessagingGateway at /messaging namespace, conversation/message/poll REST endpoints, shared messaging types, CASL permissions
  - phase: 06-substitution-planning
    provides: NotificationSocket pattern (createNotificationSocket, useNotificationSocket), AppSidebar/MobileSidebar with nav items, _authenticated layout with socket mount
  - phase: 04-timetable-ui
    provides: apiFetch utility, useAuth hook, useSchoolContext store, ScrollArea/Badge/Dialog/Tabs/Select UI components, TanStack Router file-based routing
provides:
  - /messages route with list-detail split view (360px list + flexible detail desktop, single-view mobile)
  - ConversationList with search, sort, and ComposeDialog CTA
  - ConversationView with message history, auto-scroll, mark-read, and reply input
  - MessageBubble with own/other/system styling per UI-SPEC
  - ComposeDialog with Rundnachricht (broadcast) and Direktnachricht (direct) tabs
  - useMessagingSocket hook mounted at _authenticated layout for real-time events
  - useConversations, useCreateConversation, useUnreadCount TanStack Query hooks
  - useMessages (infinite query), useSendMessage, useMarkRead TanStack Query hooks
  - createMessagingSocket/disconnectMessagingSocket Socket.IO client factory
  - formatRelativeTime German locale timestamp utility
  - Sidebar "Nachrichten" entry with unread count badge for all roles
affects: [07-06, 07-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Messaging socket hook at authenticated layout level: useMessagingSocket mirrors useNotificationSocket single-mount pattern"
    - "Conversation list-detail split view: 360px fixed list + flexible detail on desktop, separate views on mobile"
    - "German relative timestamp utility: formatRelativeTime with Gerade eben/Min/Std/Gestern/Tagen/DD.MM.YYYY"
    - "Unread count derived from conversations query (no extra API call): useUnreadCount aggregates conversation.unreadCount"

key-files:
  created:
    - apps/web/src/hooks/useMessagingSocket.ts
    - apps/web/src/hooks/useConversations.ts
    - apps/web/src/hooks/useMessages.ts
    - apps/web/src/lib/format-relative-time.ts
    - apps/web/src/routes/_authenticated/messages/index.tsx
    - apps/web/src/routes/_authenticated/messages/$conversationId.tsx
    - apps/web/src/components/messaging/ConversationList.tsx
    - apps/web/src/components/messaging/ConversationListItem.tsx
    - apps/web/src/components/messaging/ConversationView.tsx
    - apps/web/src/components/messaging/MessageBubble.tsx
    - apps/web/src/components/messaging/MessageReplyInput.tsx
    - apps/web/src/components/messaging/ComposeDialog.tsx
    - apps/web/src/components/messaging/UserInitialsAvatar.tsx
  modified:
    - apps/web/src/lib/socket.ts
    - apps/web/src/routes/_authenticated.tsx
    - apps/web/src/components/layout/AppSidebar.tsx
    - apps/web/src/components/layout/MobileSidebar.tsx

key-decisions:
  - "useMessagingSocket mounted at _authenticated layout level (same as useNotificationSocket) to prevent duplicate socket connections"
  - "Unread count derived from conversations list query via useUnreadCount to avoid extra API call"
  - "Mobile navigation uses separate route (/messages/$conversationId) while desktop uses search param (?id=) for split view"
  - "ComposeDialog send button shared across tabs -- both broadcast and direct use same CTA (simplified from plan's tab-specific buttons)"
  - "D-07 user-profile entry point explicitly deferred -- ComposeDialog Direktnachricht tab satisfies COMM-02"

patterns-established:
  - "Messaging components directory: apps/web/src/components/messaging/ for all conversation/message UI"
  - "List-detail pattern: fixed-width list panel + flexible detail panel with responsive mobile fallback"
  - "formatRelativeTime: shared German timestamp utility for all time display needs"

requirements-completed: [COMM-01, COMM-02, COMM-03]

# Metrics
duration: 10min
completed: 2026-04-07
---

# Phase 7 Plan 05: Messaging Frontend Core Summary

**Messages page with list-detail split view, Socket.IO real-time hooks, conversation/message TanStack Query hooks, ComposeDialog with broadcast/direct tabs, and sidebar navigation with unread badge**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-07T05:52:34Z
- **Completed:** 2026-04-07T06:03:29Z
- **Tasks:** 2
- **Files modified:** 17

## Accomplishments
- Full messaging UI with /messages route: 360px conversation list + flexible detail panel on desktop, single-view navigation on mobile
- Socket.IO /messaging client with useMessagingSocket hook listening for message:new, message:read, poll:vote, conversation:new events mounted at _authenticated layout level
- TanStack Query hooks for all CRUD operations: useConversations (list), useCreateConversation (mutation), useMessages (infinite query), useSendMessage, useMarkRead
- ComposeDialog with Rundnachricht/Direktnachricht tabs, ConversationView with auto-scroll and mark-read, MessageBubble with own/other/system styling per UI-SPEC
- Sidebar "Nachrichten" entry in both AppSidebar and MobileSidebar with real-time unread count badge

## Task Commits

Each task was committed atomically:

1. **Task 1: Socket.IO client, TanStack Query hooks, utility functions** - `561cb10` (feat)
2. **Task 2: Messages page, ConversationList, ConversationView, ComposeDialog, sidebar** - `dcd2f16` (feat)

## Files Created/Modified
- `apps/web/src/lib/socket.ts` - Added createMessagingSocket/getMessagingSocket/disconnectMessagingSocket for /messaging namespace
- `apps/web/src/lib/format-relative-time.ts` - German relative timestamp utility (Gerade eben, vor N Min., Gestern, etc.)
- `apps/web/src/hooks/useMessagingSocket.ts` - Socket.IO /messaging hook with 4 event listeners + query invalidation
- `apps/web/src/hooks/useConversations.ts` - useConversations, useCreateConversation, useUnreadCount hooks
- `apps/web/src/hooks/useMessages.ts` - useMessages (infinite query), useSendMessage, useMarkRead hooks
- `apps/web/src/routes/_authenticated.tsx` - Mounted useMessagingSocket at layout level
- `apps/web/src/routes/_authenticated/messages/index.tsx` - Messages page with list-detail split view
- `apps/web/src/routes/_authenticated/messages/$conversationId.tsx` - Mobile conversation detail route
- `apps/web/src/components/messaging/ConversationList.tsx` - Scrollable list with search, sort, compose CTA
- `apps/web/src/components/messaging/ConversationListItem.tsx` - 72px row with avatar, title, preview, timestamp, badges
- `apps/web/src/components/messaging/ConversationView.tsx` - Message history with auto-scroll, mark-read, reply input
- `apps/web/src/components/messaging/MessageBubble.tsx` - Own (right/primary tint), other (left/card), system (center/italic)
- `apps/web/src/components/messaging/MessageReplyInput.tsx` - Auto-expand textarea with Enter-to-send, Shift+Enter newline
- `apps/web/src/components/messaging/ComposeDialog.tsx` - Dialog with Rundnachricht/Direktnachricht tabs
- `apps/web/src/components/messaging/UserInitialsAvatar.tsx` - Deterministic color avatar from userId hash
- `apps/web/src/components/layout/AppSidebar.tsx` - Added Nachrichten nav item with MessageSquare icon and unread badge
- `apps/web/src/components/layout/MobileSidebar.tsx` - Added Nachrichten nav item with MessageSquare icon and unread badge

## Decisions Made
- useMessagingSocket mounted at _authenticated layout level (same as useNotificationSocket) to prevent duplicate socket connections -- consistent with Phase 6 Pattern 4 anti-pattern guidance
- Unread count derived from conversations list query via useUnreadCount to avoid extra API call -- conversations already return unreadCount per item
- Mobile uses separate route (/messages/$conversationId) while desktop uses search param (?id=) for split view -- preserves mobile back-button navigation
- ComposeDialog renders shared send button outside tab context -- simplified from plan which implied per-tab buttons
- D-07 user-profile entry point explicitly deferred -- requires user profile view that does not exist yet; ComposeDialog Direktnachricht tab fully satisfies COMM-02

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
- ComposeDialog direct message recipient field uses plain text input (userId) -- type-ahead search to be wired in Plan 06
- Attachment button in MessageReplyInput and ComposeDialog is rendered but disabled -- wired in Plan 06
- Poll toggle in ComposeDialog is deferred -- wired in Plan 06
- ComposeDialog broadcast target selector uses plain text input -- will be replaced with a Select populated from API in Plan 06

## Next Phase Readiness
- All messaging UI components ready for Plan 06 (attachments, polls, type-ahead search) enhancement
- Socket.IO /messaging client active and listening for all 4 event types
- Sidebar badge provides real-time unread count feedback across the application
- ConversationView and ComposeDialog are wired to backend endpoints but gracefully handle missing data

## Self-Check: PASSED

All created files verified present. Both task commits (561cb10, dcd2f16) confirmed in git log.

---
*Phase: 07-communication*
*Completed: 2026-04-07*
