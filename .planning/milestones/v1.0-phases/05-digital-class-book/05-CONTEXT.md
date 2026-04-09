# Phase 5: Digital Class Book - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Teachers can run their daily class book workflow digitally -- record attendance, document lessons, enter grades, and add student notes -- on any device, while parents can submit digital absence excuses. This phase covers BOOK-01 through BOOK-07.

</domain>

<decisions>
## Implementation Decisions

### Attendance Entry Flow
- **D-01:** Quick-tap grid for attendance -- student list with tap-to-cycle status icons (present -> absent -> late -> excused). All students default to 'present', teacher only taps exceptions. "Alle anwesend" bulk button for the common case.
- **D-02:** Attendance is a tab on the lesson detail page alongside Inhalt (content), Noten (grades), and Notizen (notes). One page per Stunde, mirrors paper Klassenbuch layout.
- **D-03:** Teachers navigate to the class book by clicking a lesson cell in their timetable view. The timetable IS the entry point -- no separate /classbook route needed.
- **D-04:** Late arrivals (verspaetet) capture arrival time with minute entry. Important for Austrian Schulunterrichtsgesetz -- repeated lateness >15min counts as absence. Enables accurate statistics (e.g., "Gruber: 4x verspaetet, avg 14 min").

### Grade System & Display
- **D-05:** Austrian 1-5 Notensystem with +/- modifiers (e.g., 2+ = 1.75, 2- = 2.25). Stored as decimal internally. Final semester grade is always a whole number 1-5.
- **D-06:** Three fixed grade categories: Schularbeit (written exam), Muendlich (oral), Mitarbeit (class participation). Admin sets default weights per school (e.g., SA 40%, M 30%, MA 30%). Teacher can override weights per subject.
- **D-07:** Student matrix view for grade overview -- spreadsheet-like grid with students as rows, grade entries as columns (chronological). Running weighted average at the end. Sortable by name or average. Filterable by category.
- **D-08:** Role-based grade visibility: Teacher sees full matrix for own classes. Schulleitung sees all classes read-only. Parents see only their child's grades with category breakdown and weighted average. Students see own grades only. Admin sees everything.

### Lesson Documentation
- **D-09:** Structured fields for lesson content: Thema (topic/title), Lehrstoff (content covered), Hausaufgabe (homework assigned). Matches the Austrian Klassenbuch format. Structured data enables search and reporting.
- **D-10:** Per-student notes visible to all teachers of that class + Schulleitung + Klassenvorstand. Private flag available for sensitive notes visible only to author + Schulleitung.

### Parent Excuse Workflow
- **D-11:** Dedicated excuse form for parents -- 'Kind abwesend melden' button. Fields: child selector, date range (Von/Bis), reason category (krank, Arzttermin, familiaer, sonstig), optional free-text note, optional file upload (Arztbestaetigung).
- **D-12:** Klassenvorstand reviews excuses -- sees pending list, can accept or reject with optional note. Accepted excuses auto-update attendance records for all affected lessons to 'entschuldigt'. Matches Austrian school practice.
- **D-13:** Basic file upload supported in excuse form (PDF, JPG, PNG, max 5MB per file). Stored server-side with DSGVO retention (5 years, matching attendance data).

### Claude's Discretion
- Prisma schema design for new entities (ClassBookEntry, AttendanceRecord, GradeEntry, StudentNote, AbsenceExcuse)
- NestJS module structure (ClassBookModule or separate modules per concern)
- File upload implementation (local disk vs S3-compatible storage)
- Exact tab UI component implementation within lesson detail page
- Grade entry dialog/form design
- Absence statistics calculation and caching strategy
- Mobile-responsive breakpoints and touch target sizing (BOOK-07)
- WebSocket events for real-time attendance/grade updates (extends existing Socket.IO setup)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 5 requirements
- `.planning/REQUIREMENTS.md` -- BOOK-01 through BOOK-07 acceptance criteria
- `.planning/ROADMAP.md` -- Phase 5 goal, success criteria, dependency on Phase 4

### Data model context
- `.planning/phases/02-school-data-model-dsgvo/02-CONTEXT.md` -- D-13 anonymization strategy (grades/attendance retained with anonymized refs), D-15 retention defaults (Noten 60yr, Anwesenheit 5yr), D-16/D-17 encryption strategy
- `apps/api/prisma/schema.prisma` -- Existing models: Person, Teacher, Student, Parent, SchoolClass, TimetableLesson, Group, GroupMembership

### Frontend patterns
- `.planning/phases/04-timetable-viewing-editing-room-management/04-CONTEXT.md` -- D-01 through D-04 grid layout decisions, React SPA patterns, shadcn/ui + Tailwind CSS 4 stack
- `apps/web/src/components/layout/AppSidebar.tsx` -- Role-based navigation pattern with hasAccess()
- `apps/web/src/routes/_authenticated.tsx` -- Authenticated layout with school context and WebSocket setup
- `apps/web/src/hooks/useTimetable.ts` -- TanStack Query pattern for timetable data fetching

### Project context
- `.planning/PROJECT.md` -- Core value, constraints, key decisions
- `CLAUDE.md` -- Full technology stack and version pinning

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/web/src/components/ui/tabs.tsx` -- shadcn Tabs component for lesson page tab layout (Anwesenheit/Inhalt/Noten/Notizen)
- `apps/web/src/components/ui/card.tsx` -- Card component for excuse cards, student note cards
- `apps/web/src/components/ui/badge.tsx` -- Badge component for attendance status indicators
- `apps/web/src/components/ui/dialog.tsx` -- Dialog for grade entry, excuse review
- `apps/web/src/components/ui/select.tsx` -- Select for reason category, child selector
- `apps/web/src/lib/api.ts` -- apiFetch utility for API calls (Content-Type set only when body present)
- `apps/web/src/hooks/useAuth.ts` -- Auth hook with user roles
- `apps/web/src/stores/school-context-store.ts` -- Zustand store for school context (schoolId)

### Established Patterns
- NestJS module pattern: one module per domain (e.g., `apps/api/src/modules/timetable/`)
- Prisma schema-first with `db push` for migrations (consistent pattern from Phase 3+4)
- TanStack Router file-based routes under `apps/web/src/routes/_authenticated/`
- TanStack Query for server state with Zustand for client-only UI state
- Role-based CASL permissions with @CheckPermissions decorator
- Socket.IO events for real-time updates (existing `timetable` namespace)
- Audit interceptor logs all mutations automatically

### Integration Points
- Timetable grid cells need click handler -> class book lesson page (new route)
- New sidebar nav items: "Klassenbuch" for teachers, "Entschuldigungen" for parents
- New CASL subjects/actions: classbook (read/manage), grade (read/manage), excuse (create/read/manage)
- Excuse file uploads need new storage infrastructure (not yet in codebase)
- Absence statistics endpoint for BOOK-05 (per student, class, time period)

</code_context>

<specifics>
## Specific Ideas

- Lesson detail page with tabs mirrors the paper Klassenbuch -- one page per Stunde with all info
- Timetable as entry point to class book is the natural teacher workflow: "What am I teaching now? Click it."
- Quick-tap attendance optimized for the common case (most students present, tap exceptions only)
- Austrian Schulunterrichtsgesetz requires tracking lateness minutes for >15min threshold
- Klassenvorstand as excuse reviewer matches Austrian school hierarchy (not every subject teacher)
- Arztbestaetigung upload is legally required after 3+ days absence in Austria

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 05-digital-class-book*
*Context gathered: 2026-04-02*
