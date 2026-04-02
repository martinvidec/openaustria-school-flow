---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: executing
stopped_at: Completed 04-13-PLAN.md
last_updated: "2026-04-02T11:37:04.689Z"
last_activity: 2026-04-02
progress:
  total_phases: 9
  completed_phases: 3
  total_plans: 36
  completed_plans: 35
  percent: 83
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Schulen bekommen eine moderne, erweiterbare Plattform mit automatischer Stundenplanerstellung, die sie selbst hosten koennen -- ohne Vendor Lock-in, mit offenen APIs und DSGVO-Konformitaet von Tag 1.
**Current focus:** Phase 04 — timetable-viewing-editing-room-management

## Current Position

Phase: 04 (timetable-viewing-editing-room-management) — EXECUTING
Plan: 2 of 15
Status: Ready to execute
Last activity: 2026-04-02

Progress: [========..] 83%

## Performance Metrics

**Velocity:**

- Total plans completed: 0
- Average duration: -
- Total execution time: 0 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| - | - | - | - |

**Recent Trend:**

- Last 5 plans: -
- Trend: -

*Updated after each plan completion*
| Phase 01 P01 | 4min | 2 tasks | 24 files |
| Phase 01 P02 | 4min | 2 tasks | 8 files |
| Phase 01 P03 | 2min | 2 tasks | 12 files |
| Phase 01 P04 | 6min | 2 tasks | 14 files |
| Phase 01 P06 | 3min | 2 tasks | 8 files |
| Phase 01 P05 | 3min | 2 tasks | 10 files |
| Phase 01 P07 | 4min | 2 tasks | 8 files |
| Phase 02 P01 | 8min | 2 tasks | 12 files |
| Phase 02 P04 | 4min | 2 tasks | 12 files |
| Phase 02 P02 | 5min | 2 tasks | 12 files |
| Phase 02 P03 | 5min | 2 tasks | 21 files |
| Phase 02 P06 | 6min | 2 tasks | 15 files |
| Phase 02 P05 | 6min | 2 tasks | 19 files |
| Phase 02 P07 | 4min | 2 tasks | 4 files |
| Phase 02 P08 | 1min | 1 tasks | 3 files |
| Phase 03 P01 | 3min | 2 tasks | 11 files |
| Phase 03 P02 | 24min | 2 tasks | 21 files |
| Phase 03 P03 | 6min | 2 tasks | 3 files |
| Phase 03 P04 | 18min | 2 tasks | 13 files |
| Phase 03 P05 | 6min | 2 tasks | 11 files |
| Phase 03 P06 | 8min | 2 tasks | 10 files |
| Phase 04 P01 | 3min | 2 tasks | 4 files |
| Phase 04 P00 | 3min | 2 tasks | 12 files |
| Phase 04 P06 | 46min | 2 tasks | 10 files |
| Phase 04 P07 | 10min | 2 tasks | 7 files |
| Phase 04 P10 | 2min | 2 tasks | 2 files |
| Phase 04 P09 | 8min | 2 tasks | 14 files |
| Phase 04 P11 | 2min | 1 tasks | 4 files |
| Phase 04 P12 | 2min | 2 tasks | 2 files |
| Phase 04 P13 | 1min | 2 tasks | 5 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Timetable solver (Timefold JVM sidecar) is Phase 3 -- the highest-risk component is front-loaded after foundation
- [Roadmap]: RBAC + DSGVO in Phases 1-2 -- no feature module exists without these
- [Roadmap]: Start with AHS Unterstufe/Mittelschule as target school type, extend later
- [Roadmap]: Rooms split across Phase 3 (solver constraints) and Phase 4 (management UI)
- [Phase 01]: Added ignoreDeprecations 6.0 for TS 6.0 + moduleResolution node compatibility
- [Phase 01]: Spec files excluded from TSC build -- Vitest handles test compilation via SWC
- [Phase 01]: Docker Compose provides infra only (postgres, redis, keycloak) -- API runs locally for hot-reload
- [Phase 01]: Prisma 7.6.0 generates client directly into output folder (not prisma/ subfolder) -- import from ./generated/client.js
- [Phase 01]: Approved @prisma/engines and prisma in pnpm.onlyBuiltDependencies for build script execution
- [Phase 01]: Custom Passport-JWT with jwks-rsa chosen over nest-keycloak-connect (NestJS 11 peer dep issue #197)
- [Phase 01]: Global APP_GUARD with @Public() opt-out pattern -- all endpoints protected by default
- [Phase 01]: Token lifetimes: 15min access, 30min idle SSO, 8hr max SSO session for school day persistence (AUTH-06)
- [Phase 01]: Prisma.DbNull for nullable JSON fields -- Prisma 7 requires explicit DbNull, not null
- [Phase 01]: DTO definite assignment assertions (!) for class-validator with TypeScript 6.0 strict mode
- [Phase 01]: PermissionsGuard as second APP_GUARD in AuthModule -- JwtAuthGuard resolves user first, then PermissionsGuard checks abilities
- [Phase 01]: AuditInterceptor registered as global APP_INTERCEPTOR -- logs mutations always, sensitive reads only (D-05)
- [Phase 01]: Per-category retention defaults: MUTATION=3yr, SENSITIVE_READ=1yr, admin-configurable (D-07)
- [Phase 01]: Definite assignment assertions (!) on DTO properties consistent with TS 6.0 strict mode pattern from Plan 04
- [Phase 01]: Inline Fastify type annotations in ProblemDetailFilter -- pnpm strict hoisting prevents direct fastify import
- [Phase 01]: @fastify/static moved to dependencies (not devDependencies) for Swagger UI runtime static serving
- [Phase 02]: Added datasource.url to prisma.config.ts -- Prisma 7 requires explicit URL for migration tooling
- [Phase 02]: Custom Prisma client extension for field encryption (not third-party library) for Prisma 7 safety
- [Phase 02]: Encryption format $enc:v1:{iv}:{authTag}:{ciphertext} with non-deterministic IV and versioned prefix
- [Phase 02]: Person.dateOfBirth stored as String (not DateTime) for encryption compatibility
- [Phase 02]: Stundentafel data stored as static TypeScript arrays -- no DB persistence for templates
- [Phase 02]: Find-or-create pattern for applyTemplate: subjects reused if existing, created if new
- [Phase 02]: ClassSubject isCustomized=false for template-created, true for manual additions/edits
- [Phase 02]: Nested Person+Teacher creation via prisma.person.create for atomic record creation
- [Phase 02]: Replace-all strategy for teacher qualifications/rules/reductions: deleteMany + createMany in transaction
- [Phase 02]: Nested Person+Student creation via prisma.person.create with student: { create: {} } for atomic insert
- [Phase 02]: GroupAutoAssignRule interface is input-driven (admin provides rules and student IDs) not auto-inferred from student attributes
- [Phase 02]: Werteinheiten utility as pure functions (no DI) for testability and Phase 3 solver reuse
- [Phase 02]: isAutoAssigned boolean flag on GroupMembership distinguishes manual vs rule-derived assignments for selective cleanup
- [Phase 02]: Deterministic anonymous counter from person ID hash for DSGVO anonymization naming
- [Phase 02]: PDF export limited to 50 most recent audit entries to prevent oversized DSGVO Art. 15 documents
- [Phase 02]: Austrian-specific retention defaults: noten=21900d (60yr), anwesenheit=1825d (5yr), kommunikation=365d (1yr)
- [Phase 02]: Consent re-grant updates existing record with version++ (preserves unique constraint)
- [Phase 02]: DsgvoModule OnModuleInit registers BullMQ repeatable job at cron 0 2 * * * for daily retention check
- [Phase 02]: No changes to CASL factory code -- dynamic permission loading already supports any subject string from DB
- [Phase 02]: Schulleitung cannot delete consent records (DSGVO audit trail preservation)
- [Phase 02]: Seed data uses fixed IDs (seed-school-*, seed-teacher-*) for idempotent re-runs
- [Phase 02]: BullMQ v5 uses repeat.pattern (not repeat.cron) for cron schedule syntax
- [Phase 02]: Prisma JSON fields need explicit InputJsonValue casts when TSC cannot narrow complex types
- [Phase 03]: Nested resource routing (/api/v1/schools/:schoolId/rooms) for school-scoped room management
- [Phase 03]: Equipment stored as PostgreSQL text[] (Prisma String[]) for flexible equipment tagging without separate Equipment model
- [Phase 03]: Quarkus 3.32.2 (not 3.17 LTS) required for Timefold 1.32.0 compatibility
- [Phase 03]: Anonymous @ValueRangeProvider (type-based matching) for Timefold 1.32.0 Quarkus build-time analysis
- [Phase 03]: ConstraintVerifier testing pattern with public constraint methods for cross-package method references
- [Phase 03]: loadBalance collector with intValue() conversion for HardSoftScore compatibility
- [Phase 03]: A/B week filtering via isWeekCompatible utility (not constraint) to avoid search space explosion
- [Phase 03]: Max 8 lessons per day as soft constraint threshold (Austrian school standard)
- [Phase 03]: @ConstraintConfiguration with @ConstraintWeight for configurable soft constraints (not ConstraintWeightOverrides)
- [Phase 03]: NO_LESSONS_AFTER as hard constraint (school-mandated dismissal), SUBJECT_MORNING as soft constraint (pedagogical preference)
- [Phase 03]: TimetableModule as dedicated NestJS module for solver-related endpoints (constraint templates, future solve runs)
- [Phase 03]: Dual controller pattern: TimetableController (JWT-protected admin) + SolverCallbackController (@Public with X-Solver-Secret)
- [Phase 03]: SolvedLessonDto includes dayOfWeek/periodNumber/weekType directly from sidecar (not parsed from timeslotId)
- [Phase 03]: Hard constraints registered in @ConstraintConfiguration with ONE_HARD weight for Timefold 1.32.0 penalizeConfigurable() compatibility
- [Phase 03]: Socket.IO with websocket+polling transports for school network proxy fallback (Pitfall 7)
- [Phase 03]: Lightweight WebSocket solve:complete event (scores only) -- client fetches full lesson list via REST
- [Phase 04]: Used db push instead of migrate dev due to Phase 3 drift (consistent with established pattern)
- [Phase 04]: TimetableLessonEdit stores IDs without FK constraints for audit trail preservation across lesson deletions
- [Phase 04]: 15 WCAG AA-compliant color pairs in SUBJECT_PALETTE for sufficient distinct subject colors
- [Phase 04]: Wave 0 it.todo() stubs for all requirements before any implementation -- Nyquist sampling pattern
- [Phase 04]: TimetableGrid extended with renderCell/renderEmptySlot render props for DnD integration without core grid changes
- [Phase 04]: Break rows excluded from droppable targets to prevent invalid drops
- [Phase 04]: DragOverlay uses null dropAnimation for instant feedback
- [Phase 04]: Inline native HTML input/table elements with Tailwind classes instead of installing missing shadcn components (Input, Table, Label)
- [Phase 04]: Radix Select __all__ sentinel value for empty/all filter options (empty string not supported)
- [Phase 04]: ResourceList uses inline HTML table with shadcn-compatible styling (no shadcn Table dependency)
- [Phase 04]: String? instead of Prisma enum for changeType to avoid migration when Phase 6 adds new change types
- [Phase 04]: Backend user-context query uses request.user.id (Keycloak sub) mapped to Person.keycloakUserId for lookup
- [Phase 04]: Zustand store + useQuery hook pattern for server-derived global state (school context resolved at authenticated layout mount)
- [Phase 04]: @IsString @IsNotEmpty replaces @IsUUID for lessonId -- Prisma findUnique handles invalid IDs gracefully
- [Phase 04]: Fallback MoveValidation objects with hardViolations instead of null on error -- prevents downstream TypeError
- [Phase 04]: IoAdapter from @nestjs/platform-socket.io explicitly registered for Fastify WebSocket compatibility
- [Phase 04]: Lehrer gets read room + create/delete room-booking + read resource (no room CRUD authority)
- [Phase 04]: Schulleitung gets manage-all for room, room-booking, and resource
- [Phase 04]: Schueler and Eltern get read-only room permission for timetable display
- [Phase 04]: apiFetch Content-Type set only when body present (not on all non-GET methods)
- [Phase 04]: pointerWithin collision detection for DnD (pointer-accurate, replaces closestCenter)
- [Phase 04]: DraggableLesson opacity-only style (no CSS.Translate transform) -- DragOverlay provides drag ghost

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 3 (Solver): Timefold constraint modeling for Austrian school types needs spike/prototyping
- Phase 5 (ClassBook): Austrian Schulunterrichtsgesetz requirements need domain expert review
- Phase 8 (Import): Untis XML/DIF format documentation is sparse -- may need reverse-engineering

## Session Continuity

Last session: 2026-04-02T11:37:04.686Z
Stopped at: Completed 04-13-PLAN.md
Resume file: None
