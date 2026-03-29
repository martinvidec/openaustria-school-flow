# Phase 2: School Data Model & DSGVO - Context

**Gathered:** 2026-03-29
**Status:** Ready for planning

<domain>
## Phase Boundary

The complete school entity model (teachers, classes, students, subjects) is populated and queryable, with DSGVO compliance infrastructure (consent tracking, data deletion, export, encryption, retention) operational from the start. Builds on Phase 1's school profile, RBAC, and audit trail foundation.

</domain>

<decisions>
## Implementation Decisions

### Teacher & Availability Modeling
- **D-01:** Constraint rules for availability -- teachers define rules like 'max 4 days/week', 'no afternoons on Friday', 'not available period 1-2 on Mondays'. Most expressive model, validated against TimeGrid periods.
- **D-02:** Full Lehrverpflichtung model -- track Werteinheiten (value units), Faecherzuschlaege (subject bonuses), and Abschlaege (reductions: Kustodiat, Klassenvorstand, Mentor, etc.). Derive max weekly teaching hours from these. Matches Austrian payroll logic.
- **D-03:** Extended teacher data with HR fields -- Name, Email, Telefon, Personalnum, Dienstjahre, Pragmatisierung, Stammschule (for shared teachers), Beschaeftigungsgrad, subject qualifications, availability constraints.
- **D-04:** Shared teachers (Wanderlehrer): Flag only in Phase 2 -- isShared boolean + Stammschule reference. Full multi-school scheduling logic deferred to a later phase.
- **D-05:** Qualifications: Teachable subjects list only -- admin assigns which subjects a teacher can teach. No formal Lehramtspruefung tracking. Simple and directly usable by solver.

### Class Structure & Student Groups
- **D-06:** Stammklasse + Gruppen model -- every student belongs to exactly one Stammklasse (home class, e.g., 3B). Additional Gruppen for splits: Religionsgruppen, Wahlpflichtfaecher, Leistungsgruppen. Solver schedules both class-level and group-level lessons.
- **D-07:** Auto-derive group membership from Stammklasse + rules -- student assigned to Stammklasse, Religion/Ethik split and Leistungsgruppen derived from configurable rules. Admin manages exceptions only. Reduces manual admin work.
- **D-08:** Leistungsgruppen as a group type tag -- groups with type='leistungsgruppe' and a level attribute (Standard/AHS). No dedicated entity. Sufficient for Mittelschule scheduling.

### Subject & Weekly Hour Quotas
- **D-09:** Template library + custom Stundentafeln -- library of templates by school type AND year level (based on Austrian Lehrplan). Admin picks a template for each class, can customize individual subjects. Best balance of speed and flexibility.
- **D-10:** Wahlpflichtfaecher as regular subjects with group link -- a Wahlpflichtfach is a Subject linked to a student Group. Appears in Stundentafel like any subject. Solver schedules it for the group, not the whole class.
- **D-11:** Subject type enum -- PFLICHT (mandatory), WAHLPFLICHT (elective), FREIGEGENSTAND (optional), UNVERBINDLICH (Uebung). Affects scheduling priority and student assignment rules.

### DSGVO Consent & Deletion
- **D-12:** Per processing purpose consent tracking -- track consent per Verarbeitungszweck (Stundenplanerstellung, Kommunikation, Notenverarbeitung, Fotofreigabe, etc.). Each purpose has its own consent record with timestamp, version, and withdrawal option. Meets DSGVO Art. 6/7 Zweckbindung.
- **D-13:** Anonymize + retain structure for deletion (Art. 17) -- replace personal data with anonymized placeholders (Name -> 'Geloeschte Person #123'). Keep structural records (grades, attendance) with anonymized references. Preserves statistics and class history.
- **D-14:** JSON primary + PDF summary for data export (Art. 15/20) -- machine-readable JSON bundle with all personal data (Art. 20 portability) plus human-readable PDF summary for non-technical parents (Art. 15 info).
- **D-15:** Per-category retention defaults + admin override -- default retention per data category (e.g., Noten: 60 Jahre, Anwesenheit: 5 Jahre, Kommunikation: 1 Jahr). Admin can override per category. BullMQ daily job checks and executes expiry. Extends Phase 1 audit retention pattern (D-07).
- **D-16:** Sensitive PII only encrypted at rest (DSGVO-04) -- encrypt: Geburtsdatum, Sozialversicherungsnummer, Gesundheitsdaten, Telefonnummern, Adressen. Leave names, emails, grades unencrypted for query/index capability.
- **D-17:** Application-level encryption via Prisma middleware -- encrypt/decrypt in Node.js before/after DB writes. Keys managed by application. Portable across databases, transparent to codebase.
- **D-18:** DSFA and Verarbeitungsverzeichnis as JSON export + PDF render -- system stores DSFA/VVZ data as structured JSON. Export as JSON for machine processing AND render as formatted PDF for Datenschutzbeauftragte. Admin updates entries via API.

### Claude's Discretion
- Prisma schema design for new entities (Teacher, Student, Class, Group, Subject, Consent, etc.)
- Migration strategy from Phase 1 schema
- Seed data for Austrian school type templates (Stundentafeln)
- Encryption key management approach
- BullMQ job design for retention/deletion
- Person base entity pattern (shared fields between Teacher/Student/Parent)
- API endpoint structure for new CRUD operations
- Group membership rule engine implementation

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

No external specs or ADRs exist yet -- this is a greenfield project. Requirements are fully captured in:

### Core project docs
- `.planning/REQUIREMENTS.md` -- Phase 2 requirements: FOUND-02 through FOUND-05, DSGVO-01 through DSGVO-06
- `.planning/PROJECT.md` -- Project constraints, DSGVO-from-day-1 principle, key decisions including Phase 1 validated stack
- `.planning/ROADMAP.md` -- Phase 2 goal, success criteria, dependency on Phase 1

### Phase 1 context (foundation this phase builds on)
- `.planning/phases/01-project-scaffolding-auth/01-CONTEXT.md` -- Phase 1 decisions: RBAC+ACL hybrid, audit trail, school profile, API conventions
- `apps/api/prisma/schema.prisma` -- Current Prisma schema with School, TimeGrid, Period, SchoolDay, SchoolYear, RBAC, Audit models

### Technology stack
- `CLAUDE.md` -- Full technology stack: NestJS 11, Prisma 7, PostgreSQL 17, BullMQ 5, Keycloak 26.5, version pins and rationale

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `apps/api/prisma/schema.prisma` -- Existing schema with School, TimeGrid, Period, SchoolDay, SchoolYear, Holiday, AutonomousDay, Role, Permission, PermissionOverride, UserRole, AuditEntry. New entities (Teacher, Student, Class, Group, Subject, Consent) extend this schema.
- `apps/api/src/modules/school/` -- School CRUD module with controller, service, DTOs. Pattern to replicate for Teacher, Class, Subject modules.
- `apps/api/src/modules/audit/` -- Audit trail module with interceptor and controller. Extends to cover DSGVO audit/export.
- `apps/api/src/modules/auth/casl/` -- CASL ability factory for RBAC. New entities need ability definitions.
- `apps/api/src/common/dto/pagination.dto.ts` -- Pagination DTO (D-14 from Phase 1). Reuse for all new list endpoints.
- `apps/api/src/common/filters/problem-detail.filter.ts` -- RFC 9457 error responses. Consistent across new endpoints.

### Established Patterns
- NestJS module organization: module + controller + service + DTOs per domain entity
- Prisma 7 with `@@map()` for snake_case table names, `@map()` for column names
- UUID primary keys with `@default(uuid())`
- `createdAt`/`updatedAt` timestamps on all entities
- Global APP_GUARD with @Public() opt-out (all new endpoints protected by default)
- AuditInterceptor as global APP_INTERCEPTOR for mutation logging
- DTO definite assignment assertions (!) for TypeScript 6.0 strict mode

### Integration Points
- Keycloak user IDs referenced in `userId` fields (PermissionOverride, UserRole, AuditEntry). New Person/Teacher/Student entities will reference Keycloak IDs.
- BullMQ already in stack for job queues. Use for DSGVO deletion jobs, retention expiry, data export generation.
- Redis for caching. Consider caching frequently-read teacher/class data.
- School entity as root -- new entities (Teacher, Class) likely link to School via schoolId FK.

</code_context>

<specifics>
## Specific Ideas

- Full Austrian Lehrverpflichtung with Werteinheiten -- user explicitly wants accurate Austrian teaching load model, not a simplified hours-only approach
- Stammklasse + Gruppen matches the Austrian Klassenverband reality -- students belong to a home class with additional group splits
- Auto-derivation of group membership from rules reduces admin workload -- admin manages exceptions, not every assignment
- Stundentafel templates from Austrian Lehrplan -- schools should get sensible defaults they can customize
- Anonymization over hard deletion preserves school history while meeting DSGVO Art. 17
- JSON + PDF dual export covers both technical portability (Art. 20) and parent accessibility (Art. 15)

</specifics>

<deferred>
## Deferred Ideas

- Full multi-school scheduling for Wanderlehrer -- flagged in Phase 2, full logic in a later phase
- Formal Lehramtspruefung tracking per subject -- not needed for solver, could be added later for quality metrics
- Faecher uebergreifender Unterricht (cross-subject teaching blocks) -- separate scheduling concern
- Doppelstunden-Praeferenz pro Fach -- solver concern, Phase 3
- Fachgruppen (subject departments) -- organizational structure, not needed for scheduling

</deferred>

---

*Phase: 02-school-data-model-dsgvo*
*Context gathered: 2026-03-29*
