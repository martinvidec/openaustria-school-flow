---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: verifying
stopped_at: Completed 02-07-PLAN.md
last_updated: "2026-03-29T17:54:23.282Z"
last_activity: 2026-03-29
progress:
  total_phases: 9
  completed_phases: 2
  total_plans: 14
  completed_plans: 14
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-29)

**Core value:** Schulen bekommen eine moderne, erweiterbare Plattform mit automatischer Stundenplanerstellung, die sie selbst hosten koennen -- ohne Vendor Lock-in, mit offenen APIs und DSGVO-Konformitaet von Tag 1.
**Current focus:** Phase 02 — school-data-model-dsgvo

## Current Position

Phase: 02 (school-data-model-dsgvo) — EXECUTING
Plan: 7 of 7
Status: Phase complete — ready for verification
Last activity: 2026-03-29

Progress: [..........] 0%

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

### Pending Todos

None yet.

### Blockers/Concerns

- Phase 3 (Solver): Timefold constraint modeling for Austrian school types needs spike/prototyping
- Phase 5 (ClassBook): Austrian Schulunterrichtsgesetz requirements need domain expert review
- Phase 8 (Import): Untis XML/DIF format documentation is sparse -- may need reverse-engineering

## Session Continuity

Last session: 2026-03-29T17:54:23.280Z
Stopped at: Completed 02-07-PLAN.md
Resume file: None
