# Phase 4: Timetable Viewing, Editing & Room Management - Research

**Researched:** 2026-03-31
**Domain:** React SPA frontend setup, timetable grid UI, drag-and-drop editing, real-time WebSocket integration, PDF/iCal export, room booking
**Confidence:** HIGH

## Summary

Phase 4 is the first frontend phase. No `apps/web/` directory exists yet -- the entire React SPA must be scaffolded from scratch using the locked stack: React 19 + Vite 6 + TanStack Router + TanStack Query + Zustand + shadcn/ui + Tailwind CSS 4. The backend API (NestJS 11) already has timetable, room, and WebSocket infrastructure from Phase 3 that this phase extends.

The core challenge is three-fold: (1) building a production-grade timetable grid component with merged cells for Doppelstunden, subject color-coding, and change indicators; (2) implementing admin drag-and-drop editing with real-time constraint validation; and (3) wiring Socket.IO events to TanStack Query cache invalidation for live timetable updates across all roles. The locked decisions (D-01 through D-16) are highly specific about layout, behavior, and data model -- leaving discretion primarily on library choices (DnD, PDF), frontend architecture, and API design.

**Primary recommendation:** Use `@dnd-kit/core` 6.x (stable) for drag-and-drop, server-side PDF generation with the already-installed `pdfkit`, `ical-generator` for iCal export, and `keycloak-js` for OIDC authentication. Build the timetable grid as a custom CSS Grid component (not a third-party scheduler) to match the specific Austrian Stundenplan layout requirements.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Classic school grid -- days as columns, periods as rows, like a paper Stundenplan. Pause rows shown between periods. Familiar to Austrian schools.
- **D-02:** Each cell shows subject abbreviation (line 1), teacher surname (line 2), room number (line 3). Doppelstunden rendered as merged cells spanning 2 rows.
- **D-03:** Day + week view toggle [Tag | Woche]. Week view for overview, day view shows today's schedule with more detail. Day view is the default on mobile.
- **D-04:** Role-aware dropdown selector for timetable perspective (VIEW-01/02/03): Teachers see "Mein Stundenplan" by default. Admins get dropdown to switch between Lehrer/Klasse/Raum views. Students/parents see only their class -- no switcher needed.
- **D-05:** Tab switcher [A-Woche | B-Woche] at top of grid. Default shows current week. User switches tabs to see the other week. Only visible when school has A/B mode enabled.
- **D-06:** Auto-assigned background colors from a curated palette (10-15 distinct colors). Each subject gets a consistent color across all views for the school. Admin can override individual subject colors via settings.
- **D-07:** Instant visual constraint feedback during drag: valid drop targets highlight green, hard constraint violations show red with tooltip (teacher clash, room conflict), soft constraint warnings show yellow but allow drop.
- **D-08:** Hard constraint violations prevent drop entirely. Soft constraint warnings allowed with visual indicator.
- **D-09:** Manual edits modify the active TimetableRun's lessons in-place. New fields on TimetableLesson: isManualEdit (boolean), editedBy (userId), editedAt (timestamp). Re-solving creates a new run -- does not overwrite manual edits on the active run.
- **D-10:** Full persistent edit history -- every manual edit tracked in an audit trail. Admin can revert to any previous state. Undo/redo not limited to current session.
- **D-11:** Inline cell badges with color-coded borders for changes: orange border = substitution/change, red border = cancelled lesson ("Entfall"), blue border = room change.
- **D-12:** WebSocket live updates via Socket.IO (extend existing solver namespace or add 'timetable' namespace). Events: timetable:changed, timetable:cancelled, timetable:room-swap, timetable:substitution. Client receives event, refetches affected data, shows brief toast.
- **D-13:** Room availability grid -- same grid layout as timetable. Free slots shown as green/clickable. Teacher clicks a free slot to book it. Filters by room type, equipment, capacity.
- **D-14:** Ad-hoc bookings visible in room timetable view alongside solver-assigned lessons. Visually distinct (dashed border or different shade).
- **D-15:** Resources as separate entity with availability tracking, independent booking capability.
- **D-16:** Room changes propagate to all timetable views instantly via Socket.IO events.

### Claude's Discretion
- React SPA setup (Vite + React 19 + TanStack Router + TanStack Query + Zustand + shadcn/ui + Tailwind 4)
- Frontend project structure and component organization
- Specific subject color palette design (10-15 colors)
- DnD library choice (dnd-kit, react-beautiful-dnd, or native HTML5 DnD)
- Constraint validation API design (client-side pre-check vs server-side)
- Edit history data model and revert mechanism
- PDF export layout and iCal format details (VIEW-06)
- Resource entity Prisma schema design
- Room booking API endpoint structure
- Toast notification component and timing

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope.

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TIME-08 | Admin kann generierten Stundenplan manuell nachbearbeiten (Drag & Drop) | @dnd-kit/core 6.x for DnD, constraint validation API pattern, TimetableLesson schema extension (D-09), edit history model (D-10) |
| VIEW-01 | Lehrer sieht eigenen Stundenplan (Tages- und Wochenansicht) | CSS Grid timetable component, day/week toggle, TanStack Query + role-filtered API endpoint |
| VIEW-02 | Schueler/Eltern sehen Klassen-Stundenplan | Same grid component, class-scoped data fetching, no perspective switcher |
| VIEW-03 | Admin sieht alle Stundenplaene (Lehrer, Klassen, Raeume) | Perspective dropdown selector, parameterized query keys, room-view layout |
| VIEW-04 | Vertretungen, Ausfaelle und Raumaenderungen werden in Echtzeit aktualisiert | Socket.IO client + TanStack Query invalidation, change badge components (D-11) |
| VIEW-05 | Farbcodierung nach Faechern, visuelle Indikatoren fuer Aenderungen | Subject color palette (10-15 colors), SubjectColor model or school config, change indicator badges |
| VIEW-06 | Stundenplan als PDF und iCal exportierbar | Server-side pdfkit for PDF, ical-generator for iCal, download endpoints |
| ROOM-03 | Lehrer kann freie Raeume fuer Ad-hoc-Nutzung buchen | Room availability grid, RoomBooking model, booking API endpoints, availability query |
| ROOM-04 | Admin kann Ressourcen verwalten (Tablet-Waegen, Laborgeraete, Beamer) | Resource Prisma model, resource CRUD API, resource booking association |
| ROOM-05 | Raumaenderungen propagieren sofort in alle Stundenplan-Ansichten | Socket.IO timetable:room-swap event, client-side cache invalidation |

</phase_requirements>

## Standard Stack

### Core (Frontend - NEW)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.4 | UI library | Locked in CLAUDE.md. Largest ecosystem, shares mental model with React Native |
| Vite | 8.0.3 | Build tool, dev server | CLAUDE.md says 6.x but npm latest is 8.0.3 (released 2026-03). Use 8.x -- backwards-compatible Vite plugin APIs. |
| @vitejs/plugin-react | 6.0.1 | React Vite integration | Official React plugin for Vite with Fast Refresh |
| TypeScript | ~6.0 | Language | Locked in CLAUDE.md. Consistent with API workspace |
| @tanstack/react-router | 1.168.10 | Routing | Locked in CLAUDE.md. Type-safe file-based routing |
| @tanstack/router-plugin | 1.167.12 | Vite router plugin | Required for file-based route generation at build time |
| @tanstack/react-query | 5.95.2 | Server state management | Locked in CLAUDE.md. Caching, dedup, background refetch |
| Zustand | 5.0.12 | Client state | Locked in CLAUDE.md. Sidebar, theme, view toggle state |
| Tailwind CSS | 4.2.2 | Styling | Locked in CLAUDE.md. Utility-first, v4 Vite plugin |
| @tailwindcss/vite | 4.2.2 | Tailwind Vite integration | First-party Vite plugin for Tailwind v4 |

### Core (Frontend - DnD & Real-Time)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/core | 6.3.1 | Drag-and-drop base | Stable production release (v6). Lightweight (10kb), zero deps, accessible. Grid/multi-container support. |
| @dnd-kit/sortable | 10.0.0 | Sortable presets | Companion to @dnd-kit/core for sortable containers |
| @dnd-kit/utilities | 3.2.2 | DnD utilities | CSS transform utilities for drag overlays |
| socket.io-client | 4.8.3 | WebSocket client | Matches server socket.io 4.8.3. Auto-reconnect, polling fallback for school networks |
| sonner | 2.0.7 | Toast notifications | Lightweight, accessible toast library. Works well with shadcn/ui patterns |

### Core (Frontend - UI Components)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| shadcn/ui | latest | Component library | Locked in CLAUDE.md. Copy-paste, accessible, Tailwind-styled |
| @radix-ui/* | latest | Headless primitives | Foundation for shadcn/ui components (Dialog, Dropdown, Tabs, Select) |
| keycloak-js | 26.2.3 | OIDC client | Matches Keycloak 26.5 server. Still actively maintained with independent release cycle since 26.2.0 |

### Core (Backend Extensions)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ical-generator | 10.1.0 | iCal export | Most mature iCal generation library. TypeScript support, actively maintained |
| pdfkit | 0.18.0 | PDF generation | Already installed in API. Server-side PDF for consistent output, no browser dependency |
| date-fns | 4.1.0 | Date manipulation | Tree-shakeable, TypeScript-first. Needed for week calculation, period time display |

### Testing (Frontend)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | 4.1.2 | Unit & integration tests | Locked in CLAUDE.md. Native ESM, Vite-powered |
| @testing-library/react | 16.3.2 | Component testing | Standard React testing approach |
| @testing-library/user-event | 14.6.1 | User interaction simulation | Realistic event simulation for DnD tests |
| @testing-library/jest-dom | 6.9.1 | DOM matchers | Extended expect matchers for DOM assertions |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/core 6.x | @dnd-kit/react 0.3.2 | New API but pre-1.0 (v0.3.2). Unstable for production. Stick with core 6.x |
| @dnd-kit/core | react-beautiful-dnd | Abandoned by Atlassian in 2024. No maintenance. Do not use |
| @dnd-kit/core | HTML5 native DnD | No accessibility, no keyboard support, inconsistent mobile behavior. Insufficient for school admin tool |
| pdfkit (server) | jsPDF + html2canvas (client) | Client-side PDF is image-based (no text search), inconsistent across browsers, blocks main thread |
| keycloak-js | oidc-spa | More modern API but adds non-standard dependency. keycloak-js is officially maintained and widely documented |
| sonner | react-hot-toast | sonner integrates better with shadcn/ui patterns and supports stacking/queuing |
| date-fns | dayjs | dayjs is smaller but mutates. date-fns is immutable, tree-shakeable, better TypeScript support |

**Installation (apps/web):**
```bash
pnpm add react react-dom @tanstack/react-router @tanstack/react-query zustand \
  @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities \
  socket.io-client keycloak-js sonner date-fns

pnpm add -D typescript @types/react @types/react-dom \
  @vitejs/plugin-react @tanstack/router-plugin @tanstack/router-devtools \
  tailwindcss @tailwindcss/vite \
  vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  @vitest/coverage-v8
```

**Installation (apps/api -- new dependencies):**
```bash
pnpm add ical-generator date-fns
```

**Note:** `pdfkit` is already installed in `apps/api`.

## Architecture Patterns

### Recommended Frontend Project Structure
```
apps/web/
  index.html
  vite.config.ts
  tsconfig.json
  tsconfig.app.json
  package.json
  src/
    main.tsx                    # React root, QueryClient, Keycloak init
    app.css                     # @import "tailwindcss" + custom theme
    routeTree.gen.ts            # Auto-generated by TanStack Router plugin
    routes/
      __root.tsx                # Root layout (sidebar, header, auth gate)
      _authenticated.tsx        # Auth-required layout wrapper
      _authenticated/
        timetable/
          index.tsx             # Timetable week view (default)
          day.tsx               # Timetable day view
        rooms/
          index.tsx             # Room list / availability grid
          booking.tsx           # Room booking form
        admin/
          timetable-edit.tsx    # Admin drag-and-drop editor
          resources.tsx         # Resource management
    components/
      ui/                      # shadcn/ui components (Button, Dialog, etc.)
      timetable/
        TimetableGrid.tsx       # Core grid component (reused across all views)
        TimetableCell.tsx       # Single lesson cell with color + badges
        DayWeekToggle.tsx       # [Tag | Woche] toggle
        ABWeekTabs.tsx          # [A-Woche | B-Woche] tab switcher
        PerspectiveSelector.tsx # Admin role/class/room dropdown
        ChangeIndicator.tsx     # Badge component for substitutions/cancellations
      dnd/
        DraggableLesson.tsx     # Draggable timetable cell wrapper
        DroppableSlot.tsx       # Drop target with constraint feedback
        DragOverlay.tsx         # Ghost preview during drag
        ConstraintFeedback.tsx  # Green/yellow/red validation overlay
      rooms/
        RoomAvailabilityGrid.tsx # Room x period availability matrix
        RoomBookingDialog.tsx    # Booking form in dialog
        ResourceList.tsx         # Resource CRUD list
      export/
        ExportMenu.tsx          # PDF / iCal export dropdown
    hooks/
      useAuth.ts                # Keycloak auth wrapper hook
      useTimetable.ts           # TanStack Query hooks for timetable data
      useSocket.ts              # Socket.IO connection + event hooks
      useDragConstraints.ts     # Constraint validation during DnD
      useRoomAvailability.ts    # Room availability query hook
    lib/
      api.ts                    # Fetch wrapper with auth headers
      query-client.ts           # TanStack Query client config
      socket.ts                 # Socket.IO singleton instance
      colors.ts                 # Subject color palette + assignment logic
      keycloak.ts               # Keycloak instance + init config
    stores/
      ui-store.ts               # Zustand: sidebar, theme, view mode
      timetable-store.ts        # Zustand: selected perspective, A/B week, day
    types/
      timetable.ts              # TimetableLesson, TimetableView types
      room.ts                   # Room, RoomBooking, Resource types
      api.ts                    # API response shapes
```

### Pattern 1: TanStack Query + Socket.IO Cache Invalidation
**What:** Socket.IO events trigger TanStack Query cache invalidation, causing automatic background refetch
**When to use:** All real-time timetable updates (VIEW-04, ROOM-05, D-12, D-16)
**Example:**
```typescript
// hooks/useSocket.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { socket } from '../lib/socket';
import { toast } from 'sonner';

export function useTimetableSocket(schoolId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    socket.on('timetable:changed', (data) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', schoolId] });
      toast.info(`Stundenplan aktualisiert: ${data.changeCount} Aenderungen`);
    });

    socket.on('timetable:room-swap', (data) => {
      queryClient.invalidateQueries({ queryKey: ['timetable', schoolId] });
      queryClient.invalidateQueries({ queryKey: ['rooms', schoolId, 'availability'] });
      toast.info('Raumaenderung durchgefuehrt');
    });

    return () => {
      socket.off('timetable:changed');
      socket.off('timetable:room-swap');
    };
  }, [schoolId, queryClient]);
}
```

### Pattern 2: CSS Grid for Timetable Layout (D-01, D-02)
**What:** CSS Grid with explicit row/column tracks for periods x days, supporting merged cells for Doppelstunden
**When to use:** All timetable views (week view, day view, room availability)
**Example:**
```typescript
// Timetable grid using CSS Grid with row spanning for Doppelstunden
// grid-template-rows: one track per period (including breaks)
// grid-template-columns: time-label + one per active school day
// Doppelstunden: gridRow: `${startPeriod} / span 2`

interface TimetableGridProps {
  periods: Period[];       // From TimeGrid
  days: DayOfWeek[];       // Active school days
  lessons: TimetableLesson[];
  subjectColors: Map<string, string>;
  showBreaks: boolean;
}

// Each cell rendered via:
// style={{ gridRow: period, gridColumn: dayIndex + 1 }}
// Merged cells: style={{ gridRow: `${period} / span 2` }}
```

### Pattern 3: DnD Constraint Validation (D-07, D-08)
**What:** Server-side constraint check during drag with optimistic UI feedback
**When to use:** Admin timetable editing (TIME-08)
**Example:**
```typescript
// Approach: Client sends candidate move to server validation endpoint
// Server checks hard constraints (teacher clash, room clash) and soft constraints
// Returns { valid: boolean, hardViolations: [], softWarnings: [] }
// Client shows green/red/yellow feedback based on response

// POST /api/v1/schools/:schoolId/timetable/validate-move
// Body: { lessonId, targetDay, targetPeriod, targetRoomId? }
// Response: { valid, hardViolations, softWarnings }

// During drag: debounced validation call on dragOver
// On drop: if hardViolations.length > 0, reject drop
// If softWarnings only, allow drop with yellow indicator
```

### Pattern 4: Keycloak Auth Gate with TanStack Router
**What:** Keycloak OIDC init before router renders, token injection into API calls
**When to use:** App initialization, all authenticated routes
**Example:**
```typescript
// lib/keycloak.ts
import Keycloak from 'keycloak-js';

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

// main.tsx: Initialize keycloak before rendering
keycloak.init({
  onLoad: 'check-sso',
  silentCheckSsoRedirectUri: window.location.origin + '/silent-check-sso.html',
  pkceMethod: 'S256',
}).then((authenticated) => {
  // Render React app
  // If not authenticated and route requires auth, redirect to login
});

// lib/api.ts: Inject token into every API call
const apiFetch = async (url: string, options?: RequestInit) => {
  await keycloak.updateToken(30); // Refresh if <30s remaining
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${keycloak.token}`,
    },
  });
};
```

### Pattern 5: Subject Color Assignment (D-06, VIEW-05)
**What:** Deterministic color assignment from a curated palette, stored per-school
**When to use:** All timetable cell rendering
**Example:**
```typescript
// lib/colors.ts
// Curated 15-color palette designed for readability on white background
// Each color is a background + text pair for WCAG AA contrast
export const SUBJECT_PALETTE = [
  { bg: '#DBEAFE', text: '#1E40AF' },  // Blue
  { bg: '#FEF3C7', text: '#92400E' },  // Amber
  { bg: '#D1FAE5', text: '#065F46' },  // Emerald
  { bg: '#FCE7F3', text: '#9D174D' },  // Pink
  { bg: '#E0E7FF', text: '#3730A3' },  // Indigo
  { bg: '#FED7AA', text: '#9A3412' },  // Orange
  { bg: '#CCFBF1', text: '#134E4A' },  // Teal
  { bg: '#F3E8FF', text: '#6B21A8' },  // Purple
  { bg: '#FEE2E2', text: '#991B1B' },  // Red
  { bg: '#ECFCCB', text: '#3F6212' },  // Lime
  { bg: '#E0F2FE', text: '#075985' },  // Sky
  { bg: '#FECDD3', text: '#9F1239' },  // Rose
  { bg: '#D9F99D', text: '#365314' },  // Light green
  { bg: '#FDE68A', text: '#78350F' },  // Yellow
  { bg: '#C7D2FE', text: '#4338CA' },  // Violet
] as const;

// Assignment: Hash subject ID to palette index for consistency
// Admin overrides stored in School config or SubjectColor table
```

### Anti-Patterns to Avoid
- **Third-party scheduler component:** Libraries like FullCalendar or Mobiscroll do NOT match the Austrian Stundenplan layout (periods as rows, Doppelstunden, Pausen). Building a custom CSS Grid component is the correct approach for this specific layout requirement.
- **Client-side PDF generation:** html2canvas produces image-based PDFs (no searchable text, inconsistent rendering). Server-side pdfkit produces consistent, vector-based, searchable PDFs.
- **Polling for real-time updates:** Socket.IO is already set up on the server. Never use setInterval polling -- use event-driven cache invalidation.
- **Storing DnD state in Zustand:** DnD state (isDragging, activeId, overId) should live in @dnd-kit's internal state. Only use Zustand for UI state (selected view, sidebar open).
- **Inline Socket.IO listeners in components:** Centralize socket event handling in a single hook/provider. Listeners in child components cause state-timing bugs and memory leaks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag and drop | Custom pointer/touch event handlers | @dnd-kit/core 6.x | Accessibility (keyboard), collision detection, smooth animations. 10kb. |
| PDF generation | Custom canvas-to-PDF pipeline | pdfkit (server-side) | Consistent output, vector text, no browser dependency |
| iCal export | Manual VCALENDAR string building | ical-generator 10.x | RFC 5545 compliance, timezone handling, recurring events |
| Toast notifications | Custom notification system | sonner 2.x | Stacking, auto-dismiss, accessible, queuing, SSR-safe |
| OIDC authentication | Custom JWT/token management | keycloak-js 26.x | Silent SSO, token refresh, PKCE, multi-tab sync |
| Date/time formatting | Manual date string parsing | date-fns 4.x | Locale support (de-AT), week numbering, immutable |
| Form validation | Manual onChange validators | React Hook Form + Zod (via shadcn) | Performance (uncontrolled), TypeScript inference, error states |

**Key insight:** This phase has significant UI complexity (grid layout, DnD with live validation, real-time updates, multi-role views). Every hand-rolled solution adds testing burden that compounds. Use proven libraries for infrastructure, invest custom code in the timetable grid and constraint feedback -- those are domain-specific and cannot be solved by generic libraries.

## Common Pitfalls

### Pitfall 1: @dnd-kit/react vs @dnd-kit/core Confusion
**What goes wrong:** Developer installs @dnd-kit/react (v0.3.2, pre-1.0) thinking it is the stable version.
**Why it happens:** The new @dnd-kit/react package exists on npm alongside the stable @dnd-kit/core.
**How to avoid:** Use `@dnd-kit/core` (v6.3.1) + `@dnd-kit/sortable` + `@dnd-kit/utilities`. These are the stable, production-proven packages.
**Warning signs:** Version number starting with 0.x, import from `@dnd-kit/react` instead of `@dnd-kit/core`.

### Pitfall 2: Socket.IO Namespace Mismatch
**What goes wrong:** Client connects to wrong namespace or no namespace, events never arrive.
**Why it happens:** Server gateway is on `/solver` namespace (from Phase 3). Phase 4 adds timetable events -- need to decide: extend solver namespace or add `/timetable` namespace.
**How to avoid:** Add a new `timetable` namespace on the server. Keep solver namespace for solve-specific events. Client connects to both namespaces as needed.
**Warning signs:** Client connects, no events received. Check namespace in connection URL.

### Pitfall 3: TanStack Query Key Inconsistency
**What goes wrong:** Socket event invalidates wrong query key, stale data persists.
**Why it happens:** Query keys for timetable data differ between components (e.g., `['timetable', schoolId]` vs `['timetable', schoolId, 'teacher', teacherId]`).
**How to avoid:** Define query key factories in a central file. Use hierarchical keys so `invalidateQueries({ queryKey: ['timetable', schoolId] })` invalidates all sub-keys (teacher, class, room views).
**Warning signs:** Some views update on socket event, others do not.

### Pitfall 4: Doppelstunde Merged Cell Rendering
**What goes wrong:** Double periods render as two separate cells instead of one merged cell spanning two rows.
**Why it happens:** Lesson data has two separate TimetableLesson records for consecutive periods of the same ClassSubject.
**How to avoid:** Group consecutive same-subject lessons in the same day before rendering. Detect sequences where lesson[n].periodNumber + 1 === lesson[n+1].periodNumber for the same classSubjectId.
**Warning signs:** Double periods appear as two identical cells instead of one tall cell.

### Pitfall 5: Keycloak Token Refresh Race Condition
**What goes wrong:** API calls fail with 401 because token expired between check and request.
**Why it happens:** `keycloak.updateToken(30)` is async. Multiple concurrent requests can race.
**How to avoid:** Use a single token refresh promise. If a refresh is in progress, queue subsequent requests to wait for it. Wrap in the API fetch utility.
**Warning signs:** Intermittent 401 errors, especially after idle periods.

### Pitfall 6: DnD Constraint Validation Flooding
**What goes wrong:** Every pixel of mouse movement during drag triggers a server validation call.
**Why it happens:** dragOver fires continuously. Without debouncing, hundreds of validation requests hit the server.
**How to avoid:** Debounce validation calls (200-300ms). Only call when the target slot actually changes (not on every pointer move). Cache validation results for previously checked slots.
**Warning signs:** Server CPU spike during drag operations, slow UI response.

### Pitfall 7: CSS Grid Row Span with Break Rows
**What goes wrong:** Period numbering is off because break rows (Pausen) occupy grid rows but have no period number.
**Why it happens:** TimeGrid includes break periods with `isBreak: true`. These need grid rows but should not be drop targets.
**How to avoid:** Map TimeGrid periods to grid rows explicitly. Break rows get a special CSS class (reduced height, different background). Non-break periods have their own index for data mapping.
**Warning signs:** Lessons appear in wrong grid positions, DnD drops on break rows.

### Pitfall 8: Tailwind CSS v4 Import Syntax
**What goes wrong:** Old `@tailwind base; @tailwind components; @tailwind utilities;` directives don't work in Tailwind v4.
**Why it happens:** Tailwind v4 uses a single `@import "tailwindcss"` import instead of the three directives.
**How to avoid:** Use `@import "tailwindcss"` in the main CSS file. No tailwind.config.js needed -- config is CSS-based in v4.
**Warning signs:** Tailwind classes not applying, build warnings about unknown directives.

## Code Examples

### Backend: Constraint Validation Endpoint
```typescript
// apps/api/src/modules/timetable/timetable.controller.ts (extension)
@Post('validate-move')
@CheckPermissions({ action: 'update', subject: 'timetable' })
@ApiOperation({ summary: 'Validate a lesson move before applying' })
async validateMove(
  @Param('schoolId') schoolId: string,
  @Body() dto: ValidateMoveDto,
) {
  return this.timetableService.validateMove(schoolId, dto);
}

// ValidateMoveDto
export class ValidateMoveDto {
  lessonId!: string;
  targetDay!: string;     // DayOfWeek enum value
  targetPeriod!: number;
  targetRoomId?: string;
}

// Response shape
interface MoveValidation {
  valid: boolean;
  hardViolations: { type: string; description: string }[];
  softWarnings: { type: string; description: string; weight: number }[];
}
```

### Backend: Lesson Edit with Audit Trail (D-09, D-10)
```typescript
// TimetableLesson model extension (Prisma schema)
model TimetableLesson {
  // ... existing fields
  isManualEdit  Boolean   @default(false) @map("is_manual_edit")
  editedBy      String?   @map("edited_by")   // Keycloak user ID
  editedAt      DateTime? @map("edited_at")
}

// Edit history as separate model for revert capability
model TimetableLessonEdit {
  id             String   @id @default(uuid())
  lessonId       String   @map("lesson_id")
  runId          String   @map("run_id")
  editedBy       String   @map("edited_by")
  editAction     String   @map("edit_action")  // "move", "swap", "cancel", "revert"
  previousState  Json     @map("previous_state")
  newState       Json     @map("new_state")
  createdAt      DateTime @default(now()) @map("created_at")

  @@index([runId, createdAt])
  @@map("timetable_lesson_edits")
}
```

### Backend: Room Booking Model (ROOM-03)
```typescript
// Prisma schema extension
model RoomBooking {
  id           String    @id @default(uuid())
  roomId       String    @map("room_id")
  room         Room      @relation(fields: [roomId], references: [id], onDelete: Cascade)
  bookedBy     String    @map("booked_by")  // Teacher's person/user ID
  dayOfWeek    DayOfWeek @map("day_of_week")
  periodNumber Int       @map("period_number")
  weekType     String    @default("BOTH") @map("week_type")
  purpose      String?
  isAdHoc      Boolean   @default(true) @map("is_ad_hoc")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@unique([roomId, dayOfWeek, periodNumber, weekType])
  @@map("room_bookings")
}

// Room model extension
model Room {
  // ... existing fields
  bookings RoomBooking[]
}
```

### Backend: Resource Model (ROOM-04, D-15)
```typescript
model Resource {
  id           String   @id @default(uuid())
  schoolId     String   @map("school_id")
  school       School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  name         String
  resourceType String   @map("resource_type")  // "TABLET_CART", "LAB_EQUIPMENT", "BEAMER"
  description  String?
  quantity     Int      @default(1)
  createdAt    DateTime @default(now()) @map("created_at")
  updatedAt    DateTime @updatedAt @map("updated_at")

  bookings     ResourceBooking[]

  @@unique([schoolId, name])
  @@map("resources")
}

model ResourceBooking {
  id           String    @id @default(uuid())
  resourceId   String    @map("resource_id")
  resource     Resource  @relation(fields: [resourceId], references: [id], onDelete: Cascade)
  roomId       String?   @map("room_id")  // Optional: booked for a specific room
  bookedBy     String    @map("booked_by")
  dayOfWeek    DayOfWeek @map("day_of_week")
  periodNumber Int       @map("period_number")
  weekType     String    @default("BOTH") @map("week_type")
  createdAt    DateTime  @default(now()) @map("created_at")

  @@unique([resourceId, dayOfWeek, periodNumber, weekType])
  @@map("resource_bookings")
}
```

### Backend: WebSocket Timetable Events (D-12)
```typescript
// Extend TimetableGateway with timetable change events
// Option: Add new 'timetable' namespace gateway

@WebSocketGateway({
  namespace: 'timetable',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'],
})
export class TimetableEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    const schoolId = client.handshake.query.schoolId as string;
    if (schoolId) client.join(`school:${schoolId}`);
  }

  handleDisconnect(_client: Socket) {}

  emitTimetableChanged(schoolId: string, payload: {
    changeType: 'changed' | 'cancelled' | 'room-swap' | 'substitution';
    lessonId: string;
    changeCount: number;
  }) {
    this.server.to(`school:${schoolId}`).emit(`timetable:${payload.changeType}`, payload);
  }
}
```

### Frontend: Socket.IO Singleton with Auth
```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';
import { keycloak } from './keycloak';

const API_URL = import.meta.env.VITE_API_URL;

export function createTimetableSocket(schoolId: string): Socket {
  return io(`${API_URL}/timetable`, {
    query: { schoolId },
    auth: { token: keycloak.token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 10,
  });
}
```

### Frontend: iCal Export Endpoint
```typescript
// Backend controller
@Get('export/ical')
@CheckPermissions({ action: 'read', subject: 'timetable' })
@ApiOperation({ summary: 'Export timetable as iCal (.ics)' })
async exportIcal(
  @Param('schoolId') schoolId: string,
  @Query('view') view: 'teacher' | 'class' | 'room',
  @Query('viewId') viewId: string,
  @Res() res: FastifyReply,
) {
  const icalString = await this.timetableService.exportIcal(schoolId, view, viewId);
  res.header('Content-Type', 'text/calendar; charset=utf-8');
  res.header('Content-Disposition', `attachment; filename="stundenplan.ics"`);
  res.send(icalString);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-beautiful-dnd | @dnd-kit/core | 2024 | rbd abandoned by Atlassian. dnd-kit is the standard React DnD library |
| Tailwind v3 config (tailwind.config.js) | Tailwind v4 CSS-based config (@import "tailwindcss") | 2025-01 | No JS config file, Vite plugin, CSS-native configuration |
| create-react-app | Vite | 2025-02 | CRA officially deprecated by React team |
| React Router v6 | TanStack Router | 2024-2025 | Type-safe routing, file-based route generation, search params typing |
| keycloak-js bundled releases | keycloak-js independent releases | 2025 (v26.2.0) | JS adapter has own release cycle, no longer tied to server version |
| @tailwind base/components/utilities | @import "tailwindcss" | 2025-01 (v4.0) | Single import replaces three directives, zero-config |

**Deprecated/outdated:**
- **react-beautiful-dnd**: Abandoned by Atlassian. Do not use for new projects.
- **create-react-app**: Officially deprecated Feb 2025.
- **@react-keycloak/web v3.4.0**: Still on npm but has peer dep issues with React 19. Use keycloak-js directly with custom hooks instead.

## Open Questions

1. **TanStack Router file-based routes with Keycloak auth guard**
   - What we know: TanStack Router supports `beforeLoad` hooks for auth checks. keycloak-js init is async.
   - What's unclear: Best pattern for integrating Keycloak check-sso with TanStack Router's beforeLoad without blocking initial render.
   - Recommendation: Init Keycloak before mounting React app. Use `_authenticated.tsx` layout route with `beforeLoad` that checks `keycloak.authenticated`. Redirect to login if not authenticated.

2. **Constraint validation latency during drag**
   - What we know: Server-side validation ensures accuracy. Network latency could make drag feel sluggish.
   - What's unclear: Acceptable latency budget for validation during drag.
   - Recommendation: Use 200ms debounce. Cache validation results per (lesson, target-slot) pair. Pre-validate adjacent slots on dragStart.

3. **Subject color persistence model**
   - What we know: D-06 says "auto-assigned from palette" with admin override capability.
   - What's unclear: Whether colors should be a JSON field on School, a separate SubjectColor junction table, or computed on the fly.
   - Recommendation: Add `color` optional field to Subject model. If null, compute from subject ID hash against palette index. If set, use override. Simple, no extra table.


4. **Vite version: CLAUDE.md says 6.x, npm latest is 8.0.3**
   - What we know: CLAUDE.md was written when Vite 6.x was current. Vite 8.0.3 is now the latest stable release on npm.
   - What is unclear: Whether Vite 8.x introduces breaking changes that affect the project setup.
   - Recommendation: Use Vite 8.0.3. Vite maintains a stable plugin API across major versions. The @tailwindcss/vite and @vitejs/plugin-react plugins are compatible. If any issues arise, pinning to 6.x is a fallback.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All | Yes | v25.8.2 | -- (exceeds >=24 requirement) |
| pnpm | Package management | Yes | 10.33.0 | -- |
| TypeScript | All | Yes | ~6.0 (workspace) | -- |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

Note: All required dependencies are npm packages installed via pnpm. No system-level dependencies beyond Node.js are needed. Docker services (PostgreSQL, Redis, Keycloak) are managed via existing docker-compose from Phase 1.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.2 |
| Config file (API) | `apps/api/vitest.config.ts` (exists) |
| Config file (Web) | `apps/web/vitest.config.ts` (Wave 0 -- needs creation) |
| Quick run command | `pnpm --filter @schoolflow/web test` |
| Full suite command | `pnpm test` (Turborepo runs all workspaces) |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TIME-08 | Drag-and-drop lesson move with constraint validation | unit (service) + component | `pnpm --filter @schoolflow/api vitest run src/modules/timetable/timetable.service.spec.ts -t "validateMove"` | No -- Wave 0 |
| VIEW-01 | Teacher sees own timetable (day + week) | component | `pnpm --filter @schoolflow/web vitest run src/components/timetable/TimetableGrid.test.tsx` | No -- Wave 0 |
| VIEW-02 | Student/parent sees class timetable | component | Covered by TimetableGrid.test.tsx with class perspective prop | No -- Wave 0 |
| VIEW-03 | Admin sees all timetables with switcher | component | `pnpm --filter @schoolflow/web vitest run src/components/timetable/PerspectiveSelector.test.tsx` | No -- Wave 0 |
| VIEW-04 | Real-time updates via WebSocket | integration | `pnpm --filter @schoolflow/web vitest run src/hooks/useSocket.test.ts` | No -- Wave 0 |
| VIEW-05 | Subject color-coding | unit | `pnpm --filter @schoolflow/web vitest run src/lib/colors.test.ts` | No -- Wave 0 |
| VIEW-06 | PDF and iCal export | unit (service) | `pnpm --filter @schoolflow/api vitest run src/modules/timetable/timetable-export.service.spec.ts` | No -- Wave 0 |
| ROOM-03 | Teacher room booking | unit (service) + API | `pnpm --filter @schoolflow/api vitest run src/modules/room/room-booking.service.spec.ts` | No -- Wave 0 |
| ROOM-04 | Resource CRUD management | unit (service) | `pnpm --filter @schoolflow/api vitest run src/modules/resource/resource.service.spec.ts` | No -- Wave 0 |
| ROOM-05 | Room change WebSocket propagation | integration | Covered by useSocket.test.ts timetable:room-swap event test | No -- Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @schoolflow/web vitest run` + `pnpm --filter @schoolflow/api vitest run`
- **Per wave merge:** `pnpm test` (full suite via Turborepo)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `apps/web/vitest.config.ts` -- Vitest config for web workspace (extends Vite config)
- [ ] `apps/web/src/test/setup.ts` -- Testing Library setup (jest-dom matchers, cleanup)
- [ ] `apps/web/src/components/timetable/TimetableGrid.test.tsx` -- covers VIEW-01, VIEW-02
- [ ] `apps/web/src/components/timetable/PerspectiveSelector.test.tsx` -- covers VIEW-03
- [ ] `apps/web/src/hooks/useSocket.test.ts` -- covers VIEW-04, ROOM-05
- [ ] `apps/web/src/lib/colors.test.ts` -- covers VIEW-05
- [ ] `apps/api/src/modules/timetable/timetable-export.service.spec.ts` -- covers VIEW-06
- [ ] `apps/api/src/modules/room/room-booking.service.spec.ts` -- covers ROOM-03
- [ ] `apps/api/src/modules/resource/resource.service.spec.ts` -- covers ROOM-04
- [ ] Framework install: `pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom @vitest/coverage-v8` (in apps/web)

## Project Constraints (from CLAUDE.md)

- **Monorepo:** pnpm workspaces + Turborepo. apps/web must be added to pnpm-workspace.yaml (already covered by `apps/*` glob).
- **API-First:** All features via REST API. UI is a consumer. Frontend must NOT contain business logic beyond display.
- **Framework independence:** UI client must be replaceable without backend changes. API contracts are the boundary.
- **DSGVO:** All personal data handling must comply. Frontend must not cache PII in localStorage/sessionStorage.
- **Deployment:** Docker/docker-compose. apps/web serves as static files (Vite build output).
- **TypeScript 6.0:** Use ~6.0 pinning. Definite assignment assertions (!) on class properties.
- **NestJS 11:** Existing patterns: module + controller + service + DTOs per domain. Global APP_GUARD.
- **Prisma 7:** Schema-first. @@map() for snake_case. UUID PKs. createdAt/updatedAt.
- **Socket.IO:** websocket + polling transports for school network compatibility.
- **English API / German UI:** API endpoints and code in English, user-facing text in German.
- **GSD Workflow:** Use GSD commands for structured work.

## Sources

### Primary (HIGH confidence)
- npm registry -- verified package versions for all dependencies (2026-03-31)
- [Vite Getting Started](https://vite.dev/guide/) -- Vite 8.x setup guide
- [TanStack Router File-Based Routing](https://tanstack.com/router/latest/docs/framework/react/routing/file-based-routing) -- file-based routing setup
- [TanStack Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) -- cache invalidation patterns
- [dnd-kit Documentation](https://docs.dndkit.com/) -- @dnd-kit/core 6.x API
- [shadcn/ui Vite Installation](https://ui.shadcn.com/docs/installation/vite) -- shadcn/ui setup with Vite
- [Tailwind CSS v4 Vite Plugin](https://tailwindcss.com/docs) -- @tailwindcss/vite setup
- [Socket.IO React Guide](https://socket.io/how-to/use-with-react) -- Socket.IO client patterns
- [Keycloak JavaScript Adapter](https://www.keycloak.org/securing-apps/javascript-adapter) -- keycloak-js 26.x docs
- [ical-generator npm](https://www.npmjs.com/package/ical-generator) -- v10.1.0 iCal generation
- [PDFKit](https://pdfkit.org/) -- server-side PDF generation

### Secondary (MEDIUM confidence)
- [TanStack Query + WebSockets LogRocket](https://blog.logrocket.com/tanstack-query-websockets-real-time-react-data-fetching/) -- Socket.IO + Query invalidation pattern
- [dnd-kit Discussion #1842](https://github.com/clauderic/dnd-kit/discussions/1842) -- @dnd-kit/react vs @dnd-kit/core roadmap
- [Top 5 DnD Libraries 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) -- DnD library comparison
- [keycloak-js independent releases](https://www.keycloak.org/2023/03/adapter-deprecation-update) -- adapter deprecation status update
- [oidc-spa Migration Guide](https://docs.oidc-spa.dev/resources/migrating-from-keycloak-js) -- keycloak-js alternative context

### Tertiary (LOW confidence)
- None -- all findings verified with at least two sources.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries locked in CLAUDE.md or verified via npm registry with multiple stable releases
- Architecture: HIGH -- patterns derived from existing codebase (Phase 1-3) + official documentation
- Pitfalls: HIGH -- derived from practical experience with verified library versions and known issues
- DnD library choice: HIGH -- @dnd-kit/core 6.x is clearly the stable choice over pre-1.0 @dnd-kit/react
- PDF/iCal approach: HIGH -- pdfkit already installed, ical-generator is the standard npm library

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (30 days -- stack is stable, no fast-moving components)
