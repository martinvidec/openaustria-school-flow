---
phase: 04-timetable-viewing-editing-room-management
plan: 08
subsystem: ui, api
tags: [socket.io, websocket, tanstack-query, pdfkit, ical-generator, real-time, export, react]

# Dependency graph
requires:
  - phase: 04-04
    provides: Backend TimetableEventsGateway on /timetable namespace with school-scoped rooms
  - phase: 04-05
    provides: TanStack Query hooks with timetableKeys factory for hierarchical cache invalidation
provides:
  - Socket.IO client singleton for /timetable namespace with reconnection handling
  - useTimetableSocket hook with TanStack Query cache invalidation on WebSocket events
  - App-wide WebSocket integration via _authenticated layout (covers /rooms and /admin pages)
  - TimetableExportService with PDF (pdfkit) and iCal (ical-generator) generation
  - Export REST endpoints (GET export/pdf, GET export/ical)
  - ExportMenu dropdown component with PDF and iCal options
  - useExport hook with blob download pattern
affects: [phase-05-classbook, phase-06-communication, phase-07-substitution]

# Tech tracking
tech-stack:
  added: [ical-generator, "@radix-ui/react-dropdown-menu"]
  patterns: [socket-io-singleton, tanstack-query-invalidation-on-websocket, blob-download-pattern, centralized-socket-hook]

key-files:
  created:
    - apps/web/src/lib/socket.ts
    - apps/web/src/hooks/useSocket.ts
    - apps/web/src/hooks/useExport.ts
    - apps/web/src/components/export/ExportMenu.tsx
    - apps/web/src/components/ui/dropdown-menu.tsx
    - apps/api/src/modules/timetable/timetable-export.service.ts
  modified:
    - apps/web/src/routes/_authenticated.tsx
    - apps/web/src/routes/_authenticated/timetable/index.tsx
    - apps/api/src/modules/timetable/timetable.controller.ts
    - apps/api/src/modules/timetable/timetable.module.ts
    - apps/api/package.json
    - apps/web/package.json

key-decisions:
  - "Socket.IO client as singleton module (not React context) for simple lifecycle management"
  - "Centralized socket hook at _authenticated layout level for app-wide event coverage including /rooms pages"
  - "Inline Fastify reply type annotation to avoid pnpm strict hoisting import issues"
  - "ical-generator for iCal export with RRULE weekly recurrence and A/B week biweekly interval"
  - "Blob download pattern in useExport for cross-browser file download support"

patterns-established:
  - "Socket singleton pattern: createTimetableSocket/disconnectTimetableSocket lifecycle in lib/socket.ts"
  - "WebSocket-to-Query invalidation: socket events trigger queryClient.invalidateQueries for automatic refetch"
  - "Export blob download: fetch -> blob -> createObjectURL -> anchor click -> revokeObjectURL"
  - "shadcn DropdownMenu component added to UI library for reuse across phases"

requirements-completed: [VIEW-04, VIEW-06, ROOM-05]

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 4 Plan 8: Real-Time WebSocket Integration & Export Summary

**Socket.IO client with TanStack Query cache invalidation for live timetable updates, plus PDF/iCal export endpoints and download UI**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-01T05:51:07Z
- **Completed:** 2026-04-01T05:59:00Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Socket.IO client connects to /timetable namespace with school-scoped rooms, websocket+polling transports, and 10-attempt reconnection
- All timetable WebSocket events (changed, cancelled, room-swap, substitution) trigger TanStack Query cache invalidation for automatic UI refresh
- German toast notifications for all change events and connection status (Verbindung unterbrochen / Raumaenderung durchgefuehrt)
- Server-side PDF export with A4 landscape timetable grid (pdfkit) and iCal export with weekly recurrence in Europe/Vienna timezone
- Frontend ExportMenu dropdown with "Als PDF exportieren" and "Als iCal exportieren" options using blob download

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Socket.IO client and WebSocket event hook with TanStack Query cache invalidation** - PENDING (files created, commit blocked by sandbox)
2. **Task 2: Create backend export endpoints (PDF + iCal) and frontend export menu** - PENDING (files created, commit blocked by sandbox)

**Note:** Git write operations (git add, git commit) were persistently denied by the sandbox environment during parallel execution. All source files were successfully created via Write/Edit tools. Commits need to be created after sandbox restrictions are lifted.

## Files Created/Modified
- `apps/web/src/lib/socket.ts` - Socket.IO client singleton for /timetable namespace with reconnection
- `apps/web/src/hooks/useSocket.ts` - Centralized WebSocket event handler with TanStack Query cache invalidation and toast notifications
- `apps/web/src/hooks/useExport.ts` - Timetable export download utility with blob URL pattern
- `apps/web/src/components/export/ExportMenu.tsx` - Dropdown menu with PDF and iCal export options
- `apps/web/src/components/ui/dropdown-menu.tsx` - shadcn/ui DropdownMenu component (Radix UI)
- `apps/api/src/modules/timetable/timetable-export.service.ts` - Server-side PDF (pdfkit) and iCal (ical-generator) generation
- `apps/web/src/routes/_authenticated.tsx` - Added useTimetableSocket hook for app-wide WebSocket coverage
- `apps/web/src/routes/_authenticated/timetable/index.tsx` - Added ExportMenu to timetable page control bar
- `apps/api/src/modules/timetable/timetable.controller.ts` - Added export/pdf and export/ical endpoints with Content-Type headers
- `apps/api/src/modules/timetable/timetable.module.ts` - Registered TimetableExportService in providers and exports
- `apps/api/package.json` - Added ical-generator and date-fns dependencies
- `apps/web/package.json` - Added @radix-ui/react-dropdown-menu dependency

## Decisions Made
- **Socket.IO client as singleton module:** Used module-level singleton pattern (not React context) for simpler lifecycle management. createTimetableSocket disconnects previous socket before creating new one.
- **Centralized socket hook at layout level:** Placed useTimetableSocket in _authenticated.tsx (not timetable page) so room change events (ROOM-05) propagate to /rooms pages too. This follows the RESEARCH.md anti-pattern guidance against scattering socket listeners.
- **Inline Fastify reply type:** Used inline type annotation `{ header: ..., send: ... }` for @Res() parameter to avoid pnpm strict hoisting issues with direct fastify import (consistent with Phase 1 ProblemDetailFilter pattern).
- **ical-generator for iCal:** Selected ical-generator library for RFC 5545 compliant .ics generation with RRULE support. A/B weeks use INTERVAL=2 for biweekly recurrence.
- **Blob download pattern:** Used createObjectURL + anchor click pattern in useExport for cross-browser file download without page navigation.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @radix-ui/react-dropdown-menu dependency**
- **Found during:** Task 2 (ExportMenu component)
- **Issue:** shadcn/ui DropdownMenu requires @radix-ui/react-dropdown-menu which was not installed
- **Fix:** Added dependency to apps/web/package.json and created the shadcn/ui DropdownMenu component
- **Files modified:** apps/web/package.json, apps/web/src/components/ui/dropdown-menu.tsx
- **Verification:** Component created following existing shadcn/ui patterns (Button, Dialog, etc.)

---

**Total deviations:** 1 auto-fixed (1 blocking dependency)
**Impact on plan:** Necessary for DropdownMenu component. No scope creep.

## Issues Encountered
- Git write operations (git add, git commit) and package manager commands (pnpm install) were persistently denied by the sandbox environment during parallel execution. All source files were created successfully via Write/Edit tools. The commits and dependency installation need to be performed after sandbox restrictions are lifted.

## Known Stubs
- `schoolId = 'current-school-id'` in _authenticated.tsx -- placeholder pending user context implementation from auth flow. This is a pre-existing stub from Plan 05, not introduced by this plan.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Real-time WebSocket integration is complete for all timetable change events
- Export endpoints ready for PDF and iCal generation
- DropdownMenu shadcn component available for reuse in future UI plans
- Dependencies (ical-generator, @radix-ui/react-dropdown-menu) need pnpm install

---
*Phase: 04-timetable-viewing-editing-room-management*
*Completed: 2026-04-01*
