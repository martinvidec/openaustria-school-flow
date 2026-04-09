# Phase 3: Timetable Solver Engine - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

The system can automatically generate valid timetables that satisfy hard constraints (no clashes), respect soft constraints (pedagogical quality), and show solving progress in real time. Includes the Timefold JVM sidecar, room catalog with solver integration, async solving via BullMQ, and WebSocket progress reporting. Manual timetable editing (drag-and-drop) is Phase 4.

</domain>

<decisions>
## Implementation Decisions

### Constraint Hierarchy
- **D-01:** Two-tier model: Hard + Soft only. Hard constraints must never be violated. Soft constraints are quality optimizations with weighted penalties. No medium tier — simpler model, standard Timefold approach.
- **D-02:** Hard constraints are physical only: teacher clash (same teacher, same time), room double-booking, teacher availability windows (BLOCKED_PERIOD, BLOCKED_DAY from Phase 2 AvailabilityRule), and student group clash. MAX_DAYS_PER_WEEK and Werteinheiten limits are soft constraints.
- **D-03:** Soft constraint weights ship with sensible researched defaults. Admin can tune individual constraint weights via API. Examples: 'no same-subject doubling' = default weight 10, 'balanced weekly distribution' = default weight 5.
- **D-04:** Custom constraints via rule builder with templates. Admin picks from an extensible set of constraint templates: 'Block time slot for teacher X', 'Subject Y must be in morning', 'No lessons after period N for class Z'. Each template maps to a solver constraint.

### Double Periods & A/B Weeks
- **D-05:** Per-subject double-period preference as soft constraint. ClassSubject gets a `preferDoublePeriod` flag. Solver tries to schedule consecutive periods for flagged subjects. Not a hard constraint — solver can use single periods if needed.
- **D-06:** Default double-period preference for standard Austrian subjects: Turnen (BSP), Werken (TEW/TXW), Bildnerische Erziehung (BE), Physik/Chemie lab hours, Informatik. Admin can override per class-subject.
- **D-07:** Optional 2-week A/B cycle per school. Admin enables A/B mode in school settings. When enabled, some subjects alternate weekly (e.g., Werken in A-week, Textiles Gestalten in B-week). Solver generates a 2-week plan. When disabled (default), single-week plan.

### Solving Experience
- **D-08:** WebSocket progress dashboard via Socket.IO: current hard/soft score, remaining violations grouped by type (e.g., '2 teacher clashes, 5 distribution issues'), improvement rate (improving/plateauing), elapsed time, and best-so-far score history chart data. No intermediate timetable preview — score + violations only.
- **D-09:** Time limit + manual stop. Default max solving time 5 minutes (admin-configurable). Admin can click 'Stop — use best so far' at any time. Auto-terminate early if hard score reaches 0 (no violations) and soft score stops improving for 30 seconds.
- **D-10:** Conflict explanation via grouped violation list. When no feasible timetable exists, remaining hard constraint violations are grouped by type with entity references: 'Teacher Mueller has 2 clashes on Monday P3', 'Room 101 double-booked Friday P5-P6'. Admin can see which constraints to relax.
- **D-11:** Keep last 3 solve runs per school. Admin can compare results and select which to activate. Old runs beyond 3 auto-deleted. Useful for iterating on constraint tweaks.

### Room Constraints
- **D-12:** Room model: type (Klassenzimmer, Turnsaal, EDV-Raum, Werkraum, Labor, Musikraum) + capacity (max students) + equipment tags (Beamer, Smartboard, PCs). New Room entity in Prisma schema. Subjects can require specific room types or equipment.
- **D-13:** Home room (Stammklasse-Raum) as soft preference. Each class can optionally be assigned a home room. Solver prefers scheduling that class in their home room but will use other rooms if needed.
- **D-14:** Subject-to-room-type mapping as hard constraint. Subjects declare a required room type (e.g., Turnen -> Turnsaal, Informatik -> EDV-Raum). Solver must place the lesson in a matching room. Regular subjects (Mathe, Deutsch) can go in any Klassenzimmer.
- **D-15:** Minimize room changes during the day as soft constraint. Solver penalizes each room change for a class, trying to keep classes in the same room for consecutive non-Fachraum lessons.

### Claude's Discretion
- Timefold Constraint Streams API implementation details
- JVM sidecar framework choice (Spring Boot vs Quarkus)
- Timetable data model (Prisma schema for Lesson/TimetableSlot/SolveRun entities)
- WebSocket message format and Socket.IO room/namespace design for progress updates
- BullMQ job design for async solve orchestration
- REST API contract between NestJS and Timefold sidecar
- Solver configuration parameters and tuning
- Room CRUD API endpoint structure
- Constraint template data model and storage

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 3 requirements
- `.planning/REQUIREMENTS.md` -- TIME-01 through TIME-07, ROOM-01, ROOM-02
- `.planning/ROADMAP.md` -- Phase 3 goal, success criteria, dependency on Phase 2

### Project context
- `.planning/PROJECT.md` -- Core value, constraints, key decisions including validated stack choices
- `CLAUDE.md` -- Full technology stack: Timefold 1.32.0, Java 21, Spring Boot/Quarkus, BullMQ 5, Socket.IO 4, NestJS 11, version pins and rationale

### Foundation from prior phases
- `.planning/phases/01-project-scaffolding-auth/01-CONTEXT.md` -- TimeGrid/Period model (D-08/D-09), school type templates, API conventions (RFC 9457, pagination)
- `.planning/phases/02-school-data-model-dsgvo/02-CONTEXT.md` -- Teacher availability rules (D-01), Werteinheiten model (D-02), class/group structure (D-06/D-07), subject types and Stundentafeln (D-09/D-10/D-11)

### Existing codebase (solver input entities)
- `apps/api/prisma/schema.prisma` -- Current schema: TimeGrid, Period, Teacher, AvailabilityRule, TeachingReduction, SchoolClass, Group, Subject, ClassSubject, TeacherSubject
- `apps/api/src/modules/teacher/werteinheiten.util.ts` -- Pure function Werteinheiten calculator (reusable for solver input derivation)
- `apps/api/src/config/queue/queue.module.ts` -- BullMQ queue infrastructure (extend for solver queue)
- `docker/docker-compose.yml` -- Current infra services (needs Timefold sidecar container addition)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `werteinheiten.util.ts`: Pure function calculator for teacher max weekly hours — directly reusable to compute solver input constraints
- `queue.module.ts`: BullMQ infrastructure with Redis connection — extend with solver queue for async job orchestration
- `apps/api/src/modules/school/`: School CRUD pattern (module + controller + service + DTOs) — replicate for Room and Timetable modules
- `apps/api/prisma/schema.prisma`: All solver input entities already exist (Teacher, AvailabilityRule, SchoolClass, Group, Subject, ClassSubject, TeacherSubject, TimeGrid, Period)
- `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts`: Austrian Stundentafel templates — inform default double-period preferences

### Established Patterns
- NestJS module organization: module + controller + service + DTOs per domain entity
- Prisma 7 with `@@map()` for snake_case, UUID PKs, createdAt/updatedAt timestamps
- Global APP_GUARD with @Public() opt-out — all new endpoints protected by default
- AuditInterceptor as global APP_INTERCEPTOR for mutation logging
- BullMQ processors for async background jobs (DSGVO module pattern)
- DTO definite assignment assertions (!) for TypeScript 6.0 strict mode

### Integration Points
- Solver reads from existing Prisma entities (Teacher, AvailabilityRule, SchoolClass, Group, Subject, ClassSubject, TimeGrid, Period) — NestJS aggregates and sends to JVM sidecar
- New Room entity needed in Prisma schema — solver uses for room assignment constraints
- WebSocket via Socket.IO (@nestjs/websockets) for real-time progress — new module
- New JVM sidecar service in Docker Compose (Java 21 + Timefold)
- BullMQ queue for solve job orchestration (NestJS -> Redis -> processor -> sidecar)
- Results stored in PostgreSQL (new TimetableRun/Lesson entities) and pushed to clients via Socket.IO

</code_context>

<specifics>
## Specific Ideas

- Timefold as JVM sidecar microservice, not embedded — separate Docker container with REST API, NestJS communicates via HTTP
- Austrian Doppelstunden defaults based on typical Stundentafel practice (BSP, TEW/TXW, BE, Lab, Informatik)
- Constraint templates should be extensible — new template types added via code, not admin configuration
- Score history data pushed via WebSocket enables frontend to render improvement chart (Phase 4 UI concern)
- A/B week mode is per-school toggle, not per-subject — simplifies the model

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope.

</deferred>

---

*Phase: 03-timetable-solver-engine*
*Context gathered: 2026-03-30*
