# Project Research Summary

**Project:** OpenAustria SchoolFlow
**Domain:** Open-source school management platform (DACH market, Untis alternative)
**Researched:** 2026-03-29
**Confidence:** HIGH

## Executive Summary

OpenAustria SchoolFlow is a self-hosted, open-source school management platform targeting the DACH market (Austria, Germany, Switzerland) as an alternative to the proprietary Untis/WebUntis ecosystem. The recommended approach is a TypeScript modular monolith (NestJS 11 on Node.js 24 LTS) with a separate JVM sidecar for the Timefold constraint solver, PostgreSQL 17 as the primary database, and React 19 + Vite for the frontend SPA. This stack maximizes contributor pool, code sharing across web and mobile (React Native/Expo), and operational simplicity for single-school self-hosting via Docker Compose. The architecture enforces module boundaries through schema-per-module database isolation and an in-process event bus, avoiding premature microservice extraction while keeping extraction possible later.

The timetabling engine is both the primary differentiator and the primary technical risk. It requires a three-tier constraint model (hard/medium/soft), anytime solving with real-time progress feedback, and a separate fast algorithm for daily substitution planning. DSGVO compliance is the second major risk: it must be embedded in the data model from entity zero (audit trails, retention categories, deletion cascades, consent management), not retrofitted. Austrian school law mandates specific Klassenbuch (class book) requirements, a Data Protection Impact Assessment (DSFA) for digital class books, and scoped RBAC that reflects real school hierarchies (Klassenvorstand, Abteilungsvorstand, Fachlehrer -- not flat Admin/Teacher/Parent roles).

The feature landscape requires 10 table-stakes features for a credible product, with the timetable engine, digital class book, substitution planning, and RBAC/DSGVO as the non-negotiable core. Untis data import is a critical adoption enabler -- schools with years of existing data will not re-enter it manually. The recommended build order follows a strict dependency chain: Core Platform (RBAC + DSGVO) first, then Timetable Engine, then ClassBook, then Substitution Planning, then Communication, then Plugin System. Starting with a single school type (AHS Unterstufe/Mittelschule) and extending to other types via modular extensions avoids the premature abstraction trap.

## Key Findings

### Recommended Stack

The stack is TypeScript-centric with a JVM exception for the constraint solver. NestJS 11 with the Fastify adapter provides the modular architecture (DI, guards, interceptors, CQRS) needed for a plugin-capable platform. Prisma 7 (pure TypeScript, no Rust engine) handles ORM with schema-first design suitable for open-source teams. The API layer is REST-first with a GraphQL facade for frontend consumption. See `.planning/research/STACK.md` for full details.

**Core technologies:**
- **NestJS 11 + Fastify adapter:** API framework -- modular DI architecture, 2-3x throughput over Express adapter
- **Timefold Solver 1.32 (JVM/Kotlin):** Timetable constraint solving -- purpose-built for school timetabling, sidecar REST service
- **PostgreSQL 17:** Primary database -- JSONB, row-level security for DSGVO, schema-per-module isolation
- **Prisma 7:** ORM -- schema-first design, pure TypeScript engine, best migration tooling
- **Keycloak 26.5:** Identity/SSO -- LDAP/AD federation for DACH schools, OIDC, self-hosted
- **React 19 + Vite 6:** Frontend SPA -- no SSR needed, static file deployment
- **React Native + Expo SDK 55:** Mobile -- shares TypeScript and TanStack Query with web
- **BullMQ 5 + Redis 7:** Job queues -- async solver jobs, notifications, DSGVO data operations
- **Socket.IO 4:** Real-time -- fallback to long-polling for restrictive school networks
- **pnpm 10 + Turborepo 2.8:** Monorepo -- fast builds, task caching, workspace protocol

**Critical version notes:** Pin Timefold to 1.32.0 exactly (solver behavior changes break timetable quality). Use TypeScript 6.0 (do NOT jump to TS 7.0 native preview). Expo SDK 55 pinned per SDK version.

### Expected Features

See `.planning/research/FEATURES.md` for full competitive analysis across Untis/WebUntis, AlekSIS, FET, SchoolFox, and EduPage.

**Must have (table stakes for v1):**
- TS-1: Automatic timetable generation (the raison d'etre)
- TS-2: Digital class book (legally mandated in DACH)
- TS-3: Substitution planning (daily operational need)
- TS-4: Timetable viewing with per-role views and real-time updates
- TS-5: Room and resource management
- TS-7: Scoped RBAC (DSGVO requirement, foundational)
- TS-8: DSGVO compliance (non-negotiable legal requirement)
- TS-9: Mobile access (responsive web + PWA for v1)
- TS-10: Untis data import (critical adoption enabler)

**Should have (v1.1 fast follow):**
- TS-6: School communication (bundling SchoolFox functionality)
- D-1: Open API documentation (nearly free if API-first)
- D-8: Homework/exam management (low effort, high daily value)
- D-6: Parent-teacher day online booking (crowd-pleaser)

**Defer to v2+:**
- D-2: Plugin marketplace (design extension points early, ship marketplace later)
- D-5: Multi-language message translation (DeepL integration, adds cost)
- D-7: Analytics dashboard (needs data volume)
- D-9: Course registration / Kurswahl (Oberstufe only)

**Anti-features (explicitly do NOT build):**
LMS/e-learning (Moodle owns this), SIS/Stammdatenverwaltung (Sokrates owns this), financial management, video conferencing engine, multi-tenant SaaS (v1), full Zeugniserstellung, school website/CMS, behavior tracking system.

### Architecture Approach

Modular monolith with strict internal boundaries, deployed as a single unit plus a JVM solver sidecar. Modules (Timetable, ClassBook, Communication, Admin, Plugin Manager) communicate through typed service interfaces and an in-process event bus. Each module owns a PostgreSQL schema; cross-module data access is forbidden at the SQL level. The solver is stateless: it receives the full problem as JSON, returns optimized assignments, and persists nothing. See `.planning/research/ARCHITECTURE.md` for full details.

**Major components:**
1. **Core Platform (Shared Kernel)** -- Authentication, RBAC, user management, base entities (Person, SchoolClass, Subject, Room), DSGVO audit infrastructure
2. **Timetable Module** -- Lesson CRUD, constraint definitions, solver orchestration, substitution planning, teacher availability
3. **Solver Service (JVM)** -- Timefold constraint satisfaction via REST API, stateless, async with progress callbacks
4. **ClassBook Module** -- Attendance tracking, grade management, lesson documentation, absence workflows
5. **Communication Module** -- Messaging, announcements, read receipts, notification dispatch via WebSocket
6. **Admin Module** -- Room management, school config, data import/export, reporting, DSGVO workflows
7. **Plugin Manager** -- Registry, hook system, connector SDK, sandboxed external integrations

**Key patterns:** Module boundary enforcement via typed interfaces, domain events for cross-module side effects, schema-per-module database isolation, solver as stateless REST service, DSGVO audit middleware on all personal data operations.

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 15 pitfalls with full prevention strategies.

1. **Flat constraint model kills the solver** -- Treating all scheduling preferences as hard constraints makes ~60% of problems infeasible. Use three-tier constraint scoring (hard/medium/soft) with an infeasibility explainer that tells admins which constraints conflict.
2. **DSGVO as afterthought** -- Retrofitting privacy into an existing data model requires touching every entity and endpoint. Add DSGVO fields (legal_basis, retention_category, deletion_due_date, anonymized_at) to every personal data entity from day one. Ship DSFA documentation before the first pilot.
3. **No solver progress feedback** -- Admins see a spinner for 30 minutes and assume the system is broken. Implement anytime solving with WebSocket progress updates (score, violations remaining, improvement rate) and configurable time limits.
4. **Premature school-type abstraction** -- Trying to model Volksschule through BHS in one unified schema creates a God Object with 30+ nullable fields. Start with AHS Unterstufe/Mittelschule, extend via modular school-type plugins.
5. **Substitution planning as batch job** -- Full solver takes 5-30 minutes; substitution planning must respond in under 30 seconds. Design it as a separate fast algorithm from the start, not a rerun of the full solver.

## Implications for Roadmap

Based on combined research, here is the suggested phase structure. Phase boundaries are driven by dependency flow, risk mitigation, and deployment incrementality.

### Phase 1: Foundation (Core Platform + Monorepo Scaffolding)
**Rationale:** Everything depends on authentication, RBAC, base entities, and DSGVO infrastructure. This must be right before any feature module exists.
**Delivers:** Monorepo structure (pnpm + Turborepo), NestJS API shell with Fastify adapter, Keycloak integration, scoped RBAC system (role + resource scope, not flat roles), PostgreSQL with schema-per-module setup, DSGVO audit middleware, base entities (Person, SchoolClass, Subject, Room, AcademicYear, Period), Docker Compose for local development, DSFA documentation template.
**Addresses:** TS-7 (RBAC), TS-8 (DSGVO), D-3 (self-hosted Docker Compose)
**Avoids:** Pitfall 3 (DSGVO afterthought), Pitfall 4 (missing DSFA), Pitfall 8 (flat RBAC), Pitfall 5 (premature abstraction -- choose AHS Unterstufe as target school type)

### Phase 2: Timetable Engine
**Rationale:** The core differentiator and hardest technical problem. ClassBook, substitution planning, and room management all depend on timetable data. This must be proven before investing in downstream features.
**Delivers:** Lesson/constraint CRUD, Timefold solver sidecar service with REST API, three-tier constraint model (hard/medium/soft), async solving with BullMQ job queue, WebSocket progress feedback (score, violations, improvement rate), configurable time limits, solver abstraction layer, manual timetable editing, timetable versioning (draft/published/archived).
**Addresses:** TS-1 (timetable generation), TS-4 (timetable viewing -- basic), TS-5 (room management -- basic, rooms as solver input)
**Avoids:** Pitfall 1 (flat constraints), Pitfall 2 (no feedback), Pitfall 13 (solver lock-in via abstraction layer)

### Phase 3: ClassBook + Substitution Planning
**Rationale:** The ClassBook depends on timetable data to populate lesson slots. Substitution planning modifies the timetable in real-time. These are the two daily-use features for teachers and administrators.
**Delivers:** Digital class book (attendance, lesson topics, grades, student notes), append-only entry model with correction audit trail, absence state machine (excused/unexcused/late/partial), substitution planning with fast heuristic algorithm (<30s), substitute teacher ranking (availability, qualification, workload fairness), push notifications for substitutions.
**Addresses:** TS-2 (digital class book), TS-3 (substitution planning), parts of TS-4 (real-time timetable updates from substitutions)
**Avoids:** Pitfall 9 (substitution as afterthought), Pitfall 10 (Klassenbuch complexity -- research Austrian Schulunterrichtsgesetz before modeling)

### Phase 4: Frontend + Mobile + Data Import
**Rationale:** With core backend modules functional, the frontend SPA and mobile app can be built against stable APIs. Untis data import is bundled here because schools need a migration path before they can evaluate the product in pilots.
**Delivers:** React 19 SPA (Vite + TanStack Query + TanStack Router), timetable views (daily/weekly, per-role), class book UI, substitution management UI, React Native/Expo mobile app (timetable viewing, attendance recording, push notifications), Untis XML/DIF import pipeline, CSV import/export, offline caching for timetable viewing and attendance recording.
**Addresses:** TS-9 (mobile access), TS-10 (data import), TS-4 (full timetable viewing), D-4 (modern UX)
**Avoids:** Pitfall 7 (no Untis import), Pitfall 14 (offline/low-connectivity), Pitfall 15 (locale -- string externalization from day one)

### Phase 5: Communication + Parent Features
**Rationale:** Communication requires stable RBAC, user management, and WebSocket infrastructure (built in earlier phases). Parent-teacher day booking is a high-value, low-effort feature once the communication module exists.
**Delivers:** In-app messaging (direct, group, broadcast), read receipts, notification dispatch (email, push), absence notification by parents, parent-teacher day online booking (Elternsprechtag), homework/exam management linked to timetable.
**Addresses:** TS-6 (communication), D-6 (parent-teacher day), D-8 (homework/exam management)
**Avoids:** Building communication before there is something to communicate about (grades, absences, schedule changes)

### Phase 6: Plugin System + Integrations + Analytics
**Rationale:** The plugin system needs stable internal APIs to hook into. Analytics needs data volume from real usage. These are ecosystem features that mature after the core is proven.
**Delivers:** Plugin Manager (registry, hook system, connector SDK with @stable/@experimental/@internal tiers), first connectors (Google Calendar, MS Teams, Outlook, iCal export), Open API documentation (REST), analytics dashboard (attendance trends, substitution fairness, room utilization), DSGVO data export/deletion UI, Verarbeitungsverzeichnis export.
**Addresses:** D-1 (Open API), D-2 (plugin system), D-7 (analytics), remaining D-3 (Helm charts for Kubernetes)
**Avoids:** Pitfall 6 (plugin API without stability contracts -- define API stability tiers before first external consumer)

### Phase Ordering Rationale

- **Dependency-driven:** RBAC and DSGVO are consumed by every module. Timetable data populates ClassBook lesson slots. Substitution planning modifies timetables. Communication needs user context and event data from upstream modules.
- **Risk-front-loaded:** The two hardest problems (timetable solver + DSGVO compliance) are tackled in Phases 1-2. If these fail, the project learns early before investing in UI polish and integrations.
- **Adoption-gated:** Untis import is in Phase 4 (not Phase 6) because pilot schools cannot evaluate the product without their existing data. This must ship before any school pilot.
- **Architecture-aligned:** The modular monolith means phases add NestJS modules to the same deployment unit. No new infrastructure is needed between phases (except the solver sidecar in Phase 2). Each phase produces a deployable increment.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 2 (Timetable Engine):** Timefold constraint modeling for Austrian school types, A/B week support, BHS workshop rotations. The solver is the highest-risk component and warrants dedicated spike/prototyping before full implementation.
- **Phase 3 (ClassBook):** Austrian Schulunterrichtsgesetz requirements for the Klassenbuch, per-Bundesland variations, legal record requirements. Domain expert consultation recommended.
- **Phase 4 (Data Import):** Untis GPU/DIF file format documentation is sparse. Reference the Enbrea project's open-source implementation. May require reverse-engineering effort.
- **Phase 6 (Plugin System):** Plugin sandboxing and permission scoping need design research. DSGVO implications of plugins accessing personal data must be addressed.

Phases with standard patterns (skip additional research):
- **Phase 1 (Foundation):** NestJS + Keycloak + Prisma + PostgreSQL is a well-documented stack with official integration guides.
- **Phase 5 (Communication):** Messaging, WebSocket rooms, and notification dispatch are standard patterns with extensive NestJS documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All technologies verified against official releases and documentation (March 2026). Version compatibility confirmed. Clear rationale for every choice with alternatives documented. |
| Features | HIGH | Competitive landscape well-mapped across 6 competitors. Feature dependencies charted. Anti-features clearly defined. MVP prioritization grounded in market requirements. |
| Architecture | HIGH | Modular monolith pattern well-documented (DDD references, NestJS module system). Timefold solver sidecar pattern verified against official integration docs. Schema-per-module enforced at PostgreSQL level. |
| Pitfalls | MEDIUM-HIGH | Critical pitfalls (constraint modeling, DSGVO, solver UX) backed by academic research and official documentation. Austrian school-specific pitfalls (Klassenbuch legal requirements, calendar edge cases, school-type variations) need validation with domain experts during implementation. |

**Overall confidence:** HIGH

### Gaps to Address

- **Austrian Schulunterrichtsgesetz specifics:** The Klassenbuch data model requires review of actual legal text before Phase 3 implementation. Recommend involving a school administrator or legal advisor.
- **Untis file format details:** GPU/DIF format documentation is partially proprietary. The Enbrea open-source project provides a reference implementation but may not cover all edge cases. Budget time for reverse-engineering.
- **Per-Bundesland DSFA requirements:** Each German Bundesland has different DSFA templates and "Positivlisten." The initial DSFA template should target Austrian schools (primary market) with German/Swiss variants added incrementally.
- **BHS/HTL workshop rotation scheduling:** This is a significantly more complex constraint problem than standard timetabling. Defer to a later phase (v2 school-type extension) but ensure the solver abstraction layer supports it.
- **Multi-school-in-one-building scenario:** Some Austrian locations host multiple school types (Volksschule + Mittelschule) sharing rooms and teachers. The single-tenant data model should be tested against this scenario early (Phase 1 validation).
- **Grading scale configurability:** DACH regions use different scales (1-5 AT/DE, 1-6 CH, verbal assessments for Volksschule). Must be configurable per school but exact requirements need stakeholder input.
- **Timefold 2.0 GA timeline:** Currently beta-2 as of March 2026. Start with stable 1.32.0. Evaluate 2.0 when it reaches GA (expected Q2 2026).

## Sources

### Primary (HIGH confidence)
- NestJS 11 official announcement and documentation
- Timefold Solver 1.32 official docs, school timetabling quickstart, performance benchmarks
- Prisma 7 architecture rewrite documentation
- Keycloak 26.5.6 release notes and OIDC/LDAP integration docs
- PostgreSQL 17 release notes
- Expo SDK 55 and React Native New Architecture documentation
- TypeScript 6.0 announcement (Microsoft DevBlogs)
- Austrian school data protection sources (datenschutz-schule.info, dr-datenschutz.de)
- UniTime academic papers on constraint-based timetabling
- Enbrea project Untis import documentation

### Secondary (MEDIUM confidence)
- Competitor analysis (WebUntis, AlekSIS, FET, SchoolFox, EduPage) from official product pages
- Drizzle vs Prisma comparison articles (2026)
- Keycloak vs Authentik vs Ory comparison articles
- Plugin architecture pattern references (Microsoft Engineering Playbook)
- Modular monolith with DDD reference architecture (GitHub)
- React Native vs Flutter comparisons (2026)

### Tertiary (LOW confidence)
- School timetabling with constraint programming (Medium article, Feb 2026) -- general patterns only
- Untis Mobile user reviews (app store) -- anecdotal UX complaints
- Austrian school calendar edge cases -- need validation with school administrators

---
*Research completed: 2026-03-29*
*Ready for roadmap: yes*
