---
phase: 07-communication
plan: 06
subsystem: ui
tags: [react, tanstack-query, read-receipts, popover, messaging, lucide-react]

# Dependency graph
requires:
  - phase: 07-communication
    provides: MessageBubble with own/other/system styling, ConversationView with schoolId prop, useMessages/useSendMessage/useMarkRead hooks, Popover component, formatRelativeTime utility, UserInitialsAvatar, ScrollArea
  - phase: 07-communication
    provides: GET /:messageId/recipients backend endpoint returning per-user read status (Plan 02)
provides:
  - ReadReceiptIndicator with 4 visual states (sent/delivered/partial-read/all-read) per COMM-03
  - ReadReceiptDetail Popover content with Gelesen/Nicht gelesen per-recipient lists
  - useReadReceipts TanStack Query hook fetching from GET /:messageId/recipients endpoint
  - MessageBubble updated with inline read receipt Popover for sender messages
  - Frontend test stubs for useMessages and useReadReceipts
affects: [07-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Read receipt Popover pattern: ReadReceiptIndicator triggers Popover with ReadReceiptDetail content, useReadReceipts only fetches when Popover is open (enabled prop)"
    - "4-state read receipt visual encoding: Check (sent), CheckCheck muted (delivered), CheckCheck primary (partial), CheckCheck success (all read)"

key-files:
  created:
    - apps/web/src/components/messaging/ReadReceiptIndicator.tsx
    - apps/web/src/components/messaging/ReadReceiptDetail.tsx
    - apps/web/src/hooks/useReadReceipts.ts
    - apps/web/src/hooks/__tests__/useMessages.test.ts
  modified:
    - apps/web/src/components/messaging/MessageBubble.tsx
    - apps/web/src/components/messaging/ConversationView.tsx

key-decisions:
  - "ReadReceiptDetail always enabled when Popover is mounted -- useReadReceipts enabled=true on mount, staleTime 10s for socket-driven invalidation"
  - "schoolId added as explicit prop to MessageBubble (passed from ConversationView) rather than using useSchoolContext store for component purity"

patterns-established:
  - "Read receipt Popover: PopoverTrigger wraps ReadReceiptIndicator, PopoverContent renders ReadReceiptDetail with on-demand fetch"

requirements-completed: [COMM-03]

# Metrics
duration: 2min
completed: 2026-04-07
---

# Phase 7 Plan 06: Read Receipt UI Components Summary

**Read receipt indicators with 4 visual states (sent/delivered/partial-read/all-read), detail Popover with per-recipient Gelesen/Nicht gelesen lists, and useReadReceipts hook wired to GET /:messageId/recipients endpoint**

## Performance

- **Duration:** 2 min
- **Started:** 2026-04-07T06:06:06Z
- **Completed:** 2026-04-07T06:08:35Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- ReadReceiptIndicator with 4 states per UI-SPEC: single check (sent), double check muted (delivered), double check primary (partial read), double check success (all read)
- ReadReceiptDetail Popover content with "Gelesen" section (names + read timestamps via formatRelativeTime) and "Nicht gelesen" section (names only), scrollable via ScrollArea
- useReadReceipts TanStack Query hook fetching from GET /:messageId/recipients with 10s staleTime for socket-driven invalidation
- MessageBubble updated with inline Popover for sender's messages showing read receipt detail on click
- Frontend test stubs for useMessages and useReadReceipts hooks

## Task Commits

Each task was committed atomically:

1. **Task 1: ReadReceiptIndicator, ReadReceiptDetail, useReadReceipts hook** - `bd9828e` (feat)
2. **Task 2: Wire ReadReceiptIndicator into MessageBubble** - `757af89` (feat)

## Files Created/Modified
- `apps/web/src/components/messaging/ReadReceiptIndicator.tsx` - Inline read receipt icon with 4 visual states per COMM-03
- `apps/web/src/components/messaging/ReadReceiptDetail.tsx` - Popover content with per-recipient read/unread lists
- `apps/web/src/hooks/useReadReceipts.ts` - TanStack Query hook for GET /:messageId/recipients endpoint
- `apps/web/src/hooks/__tests__/useMessages.test.ts` - Test stubs for useMessages and useReadReceipts
- `apps/web/src/components/messaging/MessageBubble.tsx` - Added Popover with ReadReceiptIndicator + ReadReceiptDetail, schoolId prop
- `apps/web/src/components/messaging/ConversationView.tsx` - Passes schoolId to MessageBubble

## Decisions Made
- ReadReceiptDetail always enabled when Popover is mounted -- useReadReceipts fetches on mount with 10s staleTime for socket-driven cache invalidation
- schoolId added as explicit prop to MessageBubble (passed from ConversationView) rather than using useSchoolContext store -- keeps component pure and testable

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all components are fully wired to their backend endpoints.

## Next Phase Readiness
- Read receipt UI fully integrated into MessageBubble for sender messages
- ReadReceiptDetail fetches live data from Plan 02 GET /:messageId/recipients endpoint
- Socket.IO message:read events (from Plan 05 useMessagingSocket) will invalidate readReceipts query automatically
- Ready for Plan 07 (attachments, polls, type-ahead) to build on existing MessageBubble + ConversationView

## Self-Check: PASSED

All created files verified present. Both task commits (bd9828e, 757af89) confirmed in git log.

---
*Phase: 07-communication*
*Completed: 2026-04-07*
