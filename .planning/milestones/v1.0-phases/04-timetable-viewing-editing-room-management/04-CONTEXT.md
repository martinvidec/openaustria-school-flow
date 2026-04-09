# Phase 4: Timetable Viewing, Editing & Room Management - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Every role sees their relevant timetable with real-time updates, admins can manually adjust schedules via drag-and-drop with constraint validation, rooms are fully managed with ad-hoc booking, resources are tracked as independent entities, and timetables can be exported as PDF and iCal. This is the first frontend phase -- sets up the React SPA and establishes all UI patterns.

</domain>

<decisions>
## Implementation Decisions

### Timetable Grid Layout
- **D-01:** Classic school grid -- days as columns, periods as rows, like a paper Stundenplan. Pause rows shown between periods. Familiar to Austrian schools.
- **D-02:** Each cell shows subject abbreviation (line 1), teacher surname (line 2), room number (line 3). Doppelstunden rendered as merged cells spanning 2 rows.
- **D-03:** Day + week view toggle [Tag | Woche]. Week view for overview, day view shows today's schedule with more detail. Day view is the default on mobile.
- **D-04:** Role-aware dropdown selector for timetable perspective (VIEW-01/02/03): Teachers see "Mein Stundenplan" by default. Admins get dropdown to switch between Lehrer/Klasse/Raum views. Students/parents see only their class -- no switcher needed.

### A/B Week Display
- **D-05:** Tab switcher [A-Woche | B-Woche] at top of grid. Default shows current week. User switches tabs to see the other week. Only visible when school has A/B mode enabled.

### Subject Color-Coding (VIEW-05)
- **D-06:** Auto-assigned background colors from a curated palette (10-15 distinct colors). Each subject gets a consistent color across all views for the school. Admin can override individual subject colors via settings.

### Drag-and-Drop Editing (TIME-08)
- **D-07:** Instant visual constraint feedback during drag: valid drop targets highlight green, hard constraint violations show red with tooltip (teacher clash, room conflict), soft constraint warnings show yellow but allow drop.
- **D-08:** Hard constraint violations prevent drop entirely. Soft constraint warnings allowed with visual indicator.
- **D-09:** Manual edits modify the active TimetableRun's lessons in-place. New fields on TimetableLesson: isManualEdit (boolean), editedBy (userId), editedAt (timestamp). Re-solving creates a new run -- does not overwrite manual edits on the active run.
- **D-10:** Full persistent edit history -- every manual edit tracked in an audit trail. Admin can revert to any previous state. Undo/redo not limited to current session.

### Real-Time Change Indicators (VIEW-04)
- **D-11:** Inline cell badges with color-coded borders for changes: orange border = substitution/change (strikethrough original, new value below), red border = cancelled lesson ("Entfall"), blue border = room change (strikethrough old room, arrow to new).
- **D-12:** WebSocket live updates via Socket.IO (extend existing solver namespace or add 'timetable' namespace). Events: timetable:changed, timetable:cancelled, timetable:room-swap, timetable:substitution. Client receives event, refetches affected data, shows brief toast: "Stundenplan aktualisiert: N Aenderungen".

### Room Booking (ROOM-03)
- **D-13:** Room availability grid -- same grid layout as timetable (rooms as rows, periods as columns). Free slots shown as green/clickable. Teacher clicks a free slot to book it. Filters by room type, equipment, capacity.
- **D-14:** Ad-hoc bookings visible in room timetable view alongside solver-assigned lessons. Visually distinct (dashed border or different shade) to distinguish from scheduled lessons.

### Resource Management (ROOM-04)
- **D-15:** Resources (tablet carts, lab equipment, etc.) as a separate entity -- not just room equipment tags. Own entity with availability tracking, independent booking capability. Can be booked for a room + period combination.

### Room Change Propagation (ROOM-05)
- **D-16:** Room changes propagate to all timetable views instantly via the same WebSocket event system (D-12). No polling -- Socket.IO events trigger client-side refetch.

### Claude's Discretion
- React SPA setup (Vite + React 19 + TanStack Router + TanStack Query + Zustand + shadcn/ui + Tailwind 4) -- all stack choices defined in CLAUDE.md
- Frontend project structure and component organization
- Specific subject color palette design (10-15 colors)
- DnD library choice (dnd-kit, react-beautiful-dnd, or native HTML5 DnD)
- Constraint validation API design (client-side pre-check vs server-side)
- Edit history data model and revert mechanism
- PDF export layout and iCal format details (VIEW-06)
- Resource entity Prisma schema design
- Room booking API endpoint structure
- Toast notification component and timing

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 requirements
- `.planning/REQUIREMENTS.md` -- TIME-08, VIEW-01 through VIEW-06, ROOM-03, ROOM-04, ROOM-05
- `.planning/ROADMAP.md` -- Phase 4 goal, success criteria, dependency on Phase 3

### Project context
- `.planning/PROJECT.md` -- Core value, constraints, key decisions including all validated stack choices
- `CLAUDE.md` -- Full technology stack: React 19, Vite 6, TanStack Query 5, TanStack Router 1, shadcn/ui + Radix UI, Tailwind CSS 4, Zustand 5, Socket.IO 4, NestJS 11, Prisma 7

### Foundation from prior phases
- `.planning/phases/01-project-scaffolding-auth/01-CONTEXT.md` -- API conventions (RFC 9457, pagination D-14, English API / German UI D-15), RBAC granularity (D-01 to D-04), school profile with TimeGrid (D-08/D-09)
- `.planning/phases/02-school-data-model-dsgvo/02-CONTEXT.md` -- Teacher model (D-01 to D-05), class/group structure (D-06 to D-08), subject types and Stundentafeln (D-09 to D-11)
- `.planning/phases/03-timetable-solver-engine/03-CONTEXT.md` -- Constraint hierarchy (D-01 to D-04), room model (D-12 to D-15), A/B weeks (D-07), WebSocket progress (D-08), solve runs (D-09/D-11)

### Existing codebase (Phase 4 builds on)
- `apps/api/prisma/schema.prisma` -- TimetableRun, TimetableLesson, Room, ConstraintTemplate models + all school data entities
- `apps/api/src/modules/timetable/timetable.controller.ts` -- Solve run endpoints, solver callback controller
- `apps/api/src/modules/timetable/timetable.service.ts` -- Solve orchestration, run management, lesson persistence
- `apps/api/src/modules/timetable/timetable.gateway.ts` -- Socket.IO WebSocket gateway (solver namespace, school-scoped rooms)
- `apps/api/src/modules/room/` -- Room CRUD (controller, service, DTOs) already implemented
- `apps/api/src/modules/timetable/dto/` -- Solve request, progress, result DTOs

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `timetable.gateway.ts`: Socket.IO gateway with school-scoped rooms -- extend with timetable change events (currently only solve:progress and solve:complete)
- `timetable.service.ts`: TimetableRun management (start, stop, activate, find) -- extend with lesson editing, ad-hoc booking
- `timetable.controller.ts`: Solve run endpoints pattern -- extend with lesson CRUD, room booking endpoints
- `room/room.controller.ts` + `room.service.ts`: Room CRUD already implemented -- extend with availability query and booking
- `apps/api/prisma/schema.prisma`: TimetableLesson model with runId, classSubjectId, teacherId, roomId, dayOfWeek, periodNumber, weekType -- needs isManualEdit, editedBy, editedAt fields
- Existing DTOs (solve-progress.dto.ts, solve-result.dto.ts) as patterns for new timetable view DTOs

### Established Patterns
- NestJS module organization: module + controller + service + DTOs per domain entity
- Prisma 7 with @@map() for snake_case, UUID PKs, createdAt/updatedAt timestamps
- Global APP_GUARD with @Public() opt-out -- all new endpoints protected by default
- CheckPermissions decorator for RBAC on endpoints
- Socket.IO with websocket + polling transports for school network proxy fallback
- School-scoped WebSocket rooms (school:{schoolId})
- BullMQ for async background jobs
- DTO definite assignment assertions (!) for TypeScript 6.0 strict mode

### Integration Points
- No frontend exists yet -- apps/web/ needs to be created from scratch (React 19 + Vite 6 SPA)
- WebSocket client connects to existing Socket.IO server -- extend namespace for timetable events
- TanStack Query for server state, Zustand for client UI state (sidebar, theme, view toggles)
- Keycloak JWT tokens for auth -- frontend needs OIDC client integration
- GraphQL gateway may aggregate timetable queries (REST for now, GraphQL optional per CLAUDE.md)

</code_context>

<specifics>
## Specific Ideas

- Classic paper Stundenplan layout is the reference -- familiar to every Austrian teacher, parent, and student
- Doppelstunden as merged cells matches how Austrian schools think about their timetables
- Full persistent edit history (not just session undo) -- admin wants complete auditability of manual changes
- Resources as separate entity (not room tags) -- user explicitly wants independent availability tracking and booking
- Ad-hoc room bookings visible in room timetable view alongside scheduled lessons with visual distinction

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 04-timetable-viewing-editing-room-management*
*Context gathered: 2026-03-31*
