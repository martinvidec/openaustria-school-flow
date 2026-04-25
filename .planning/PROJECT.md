# OpenAustria SchoolFlow

## What This Is

Eine Open-Source-Plattform zur Verwaltung von Schulen im DACH-Raum — die freie Alternative zu Untis. SchoolFlow bietet automatische Stundenplanerstellung, digitales Klassenbuch, und schulinterne Kommunikation mit modernem, responsivem UI auf Web und Mobile. Gebaut für alle Schultypen von der Volksschule bis zur BHS.

## Core Value

Schulen bekommen eine moderne, erweiterbare Plattform mit automatischer Stundenplanerstellung, die sie selbst hosten können — ohne Vendor Lock-in, mit offenen APIs und DSGVO-Konformität von Tag 1.

## Requirements

### Validated

- [x] Rollen- und Rechteverwaltung (Admin, Schulleitung, Lehrer, Eltern, Schüler) — Validated in Phase 1: Project Scaffolding & Auth
- [x] REST/GraphQL API als primäre Schnittstelle (UI-agnostisch, Client austauschbar) — Validated in Phase 1: Project Scaffolding & Auth
- [x] Single-Tenant Deployment (Docker/Kubernetes, Self-Hosted als Default) — Validated in Phase 1: Project Scaffolding & Auth
- [x] DSGVO-Konformität: Audit-Trail — Validated in Phase 1: Project Scaffolding & Auth
- [x] Schuldatenmodell (Lehrer, Klassen, Schüler, Fächer) mit schultyp-agnostischer Konfiguration — Validated in Phase 2: School Data Model & DSGVO
- [x] DSGVO-Konformität (Einwilligungen, Löschkonzepte, Datenexport, Verschlüsselung, Aufbewahrungsfristen) — Validated in Phase 2: School Data Model & DSGVO
- [x] Automatische Stundenplanerstellung mit Constraint-Engine (Verfügbarkeit, Räume, pädagogische Regeln, organisatorische Vorgaben) — Validated in Phase 3: Timetable Solver Engine
- [x] Raum- und Ressourcenverwaltung (Kapazitäten, Fachräume, Doppelbelegungsschutz) — Validated in Phase 3: Timetable Solver Engine
- [x] Rollenbasierte Stundenplanansichten (Lehrer, Klasse, Raum) mit Echtzeit-Updates — Validated in Phase 4: Timetable Viewing, Editing & Room Management
- [x] Drag-and-Drop Stundenplanbearbeitung mit Constraint-Validierung — Validated in Phase 4: Timetable Viewing, Editing & Room Management
- [x] Raumbuchung und Ressourcenverwaltung (Ad-hoc Buchung, Verfügbarkeitsgrid) — Validated in Phase 4: Timetable Viewing, Editing & Room Management
- [x] Stundenplan-Export (PDF/iCal) — Validated in Phase 4: Timetable Viewing, Editing & Room Management
- [x] Digitales Klassenbuch (Anwesenheit, Unterrichtsinhalte, Noten, Abwesenheiten) — Validated in Phase 5: Digital Class Book
- [x] Vertretungsplanung (automatische Vorschläge basierend auf Verfügbarkeit) — Validated in Phase 6: Substitution Planning
- [x] Schulkommunikation (Lehrer-Eltern, Lehrer-Schüler, Mitteilungen, Lesebestätigungen) — Validated in Phase 7: Communication
- [x] Hausaufgaben, Prüfungen & Datenimport (Untis XML, CSV, iCal Export, SIS API) — Validated in Phase 8: Homework, Exams & Data Import
- [x] Multi-Plattform UI (Web + Mobile) mit modernem, responsivem Design — Validated in Phase 9: Mobile, PWA & Production Readiness
- [x] Admin UI für Lehrer-CRUD mit Lehrverpflichtung/Werteinheiten, Verfügbarkeit und Ermäßigungen — Validated in Phase 11: Lehrer- und Fächer-Verwaltung (TEACHER-01..06 + Keycloak-Verknüpfung + Orphan-Guard)
- [x] Admin UI für Schüler- und Klassen-CRUD mit Stammklasse und Gruppenzuordnung — Validated in Phase 12: Schüler-, Klassen- und Gruppenverwaltung (STUDENT-01..04 + CLASS-01..05 + SUBJECT-04 Wochenstunden-Editor + GroupDerivationRule Rule-Builder + Orphan-Guard + 24 Playwright specs)
- [x] Admin UI für User-Verwaltung (Keycloak-Liste, Rollenzuweisung) und CASL-ACL-Overrides pro User — Validated in Phase 13: User- und Rechteverwaltung (USER-01..05 + Silent-4xx invariant + Last-admin-guard + Link-theft guard + 25 Playwright tests across 9 spec files)
- [x] Admin UI für Solver-Tuning (Constraint-Templates, Gewichts-Overrides, Zeit-/Fach-Restriktionen) — Validated in Phase 14: Solver-Tuning (SOLVER-01..05 + 4-tab `/admin/solver-tuning` + GeneratorPageWeightsCard deep-link + 9-slider weight UI + ClassTimeslotRestrictions + Subject-Morning/PreferredSlot CRUD + D-06 resolution chain + 12 Playwright specs across 8 files)

### Active

**v1.1 Schuladmin Console (current milestone):**

- [ ] Admin UI für Schulstammdaten, Zeitraster, Schuljahr (inkl. A/B-Wochen-Toggle)
- [ ] Admin UI für Fächer-CRUD und Stundentafel-Verwaltung inkl. Gruppenableitungsregeln (Religion/Leistung/Wahlpflicht) — Fach-CRUD + Stundentafel-Vorlagen-Readout shipped in Phase 11 (SUBJECT-01/02/03/05); Wochenstunden-Edit (SUBJECT-04) + Gruppenableitungsregeln shipped in Phase 12
- [ ] Admin UI für DSGVO-Verwaltung (Einwilligungs-Audit, Aufbewahrungs-Editor, DSFA/VVZ, manuelle Art. 15/17-Auslösung)
- [ ] Admin UI für Audit-Log-Viewer mit Such- und Filterfunktion
- [ ] Admin-Dashboard mit Setup-Completeness-Checkliste als Einstiegspunkt
- [ ] Vollständige Mobile-Parität (375px ↔ 1280px) für alle Admin-Oberflächen

**Deferred to later milestones:**

- [ ] Plugin-/Konnektor-System mit offener API (MS Teams, Google Calendar, Outlook, etc.) — deferred to v1.2

### Out of Scope

- E-Learning / LMS (Moodle-Territorium) — anderer Problemraum, eigenes Produkt
- Schüler-Informationssystem / SIS (Stammdatenverwaltung, Zeugnisse) — kann über API angebunden werden
- Finanz-/Budgetverwaltung — nicht Kernkompetenz einer Schulplattform
- Video-Conferencing Engine — über Konnektoren zu Teams/Zoom/Jitsi lösen
- Cloud-SaaS Mandantenfähigkeit — v1 ist Single-Tenant; Multi-Tenant als spätere Option

## Current State

**v1.0 MVP shipped 2026-04-09.** 12 phases (9 planned + 3 gap closure), 74 plans, 148 tasks, ~178K LOC TypeScript/Java. All 65 v1.0 requirements satisfied. 423 backend tests passing. Full stack: NestJS 11 + Prisma 7 backend, React 19 + Vite 8 frontend, Timefold 1.32 JVM solver sidecar, Keycloak 26.5 auth, PostgreSQL 17 + Redis 7, PWA with Web Push, production Docker with backup/restore.

**v1.1 Schuladmin Console started 2026-04-18.** Brownfield UI-only milestone. All backend APIs exist from v1.0; no new endpoints or Prisma models planned (except gap fixes surfaced during build). Goal: a Schuladmin can onboard a new school and administer the running year end-to-end through the UI — no SQL, no Swagger, no seed scripts.

**E2E-first directive (2026-04-21).** Per user feedback, UAT is paused until Playwright coverage exists for all roles and admin-ops surfaces. Phases 10.1–10.5 drove that hardening; Phase 10.5 completed 2026-04-22 — E2E-first hardening tranche closed, UAT-Ban per `feedback_e2e_first_no_uat.md` lifted. People-CRUD E2E coverage (originally 10.4 scope, deferred) was delivered as part of Phase 11 (Teacher + Subject) and remains pending for Phase 12 (Schüler + Klassen).

**Phase 11 (Lehrer- und Fächer-Verwaltung) completed 2026-04-23.** Shipped TEACHER-01..06 (list + Stammdaten + Lehrverpflichtung/Werteinheiten + Verfügbarkeitsgrid + Ermäßigungen + Keycloak-Link + Archiv/Delete mit Orphan-Guard) and SUBJECT-01/02/03/05 (Fach-CRUD + Stundentafel-Vorlagen-Readout + Orphan-Guard). 8 Playwright specs (desktop + mobile-chrome, 23/23 green) satisfy the E2E-first directive for this surface. 4 Rule-1 production bugs fixed during E2E execution (RFC 9457 extension passthrough, DTO validator relaxation, admin-list limit cap, SubjectFormDialog edit-payload hygiene). SUBJECT-04 (Wochenstunden pro Fach pro Klassenstufe) deferred to Phase 12 because its editing UI belongs in Klassen-Management. Next: Phase 12 (Schüler-, Klassen- und Gruppenverwaltung).

**Phase 13 (User- und Rechteverwaltung) completed 2026-04-25.** Shipped USER-01..05 admin/users surface — KeycloakAdminService extension (8 new methods), 4 NestJS modules (UserDirectory, RoleManagement, PermissionOverride, EffectivePermissions), shared Zod schemas + interpolateConditions util, LOCK-01 mirror-write under Serializable transaction with last-admin guard, person-side link-theft guard surfacing RFC 9457 409. Frontend ships 26 components + 15 hooks + 4-tab User-Detail (Stammdaten/Rollen/Berechtigungen/Overrides & Verknüpfung) with Silent-4xx invariant, Self-Lockout warn, and last-admin server-409 dialog. 8 Playwright spec files (25 tests across desktop + mobile-chrome) lock USER-01..05 + Silent-4xx + access-guard + 44px touch-targets at the E2E layer. 1 unit-test mock alignment fix during verification (user-directory.service.spec.ts). Pre-existing web build drift in 11 unrelated files documented in deferred-items.md for a follow-up "Web build hygiene" plan.

**Phase 14 (Solver-Tuning) completed 2026-04-25.** Shipped SOLVER-01..05 admin/solver-tuning surface — Prisma `ConstraintWeightOverride` model + migration, 15-entry constraint catalog (6 HARD + 9 SOFT) shared between TS API and Java sidecar, ConstraintWeightOverride CRUD with `lastUpdatedAt` for DriftBanner, ConstraintTemplate `PATCH /:id/active` for granular audit, cross-reference validation (`schoolflow://errors/cross-reference-missing`, `schoolflow://errors/period-out-of-range`), D-06 resolution chain (defaults < school DB < per-run DTO) with snapshot in `TimetableRun.constraintConfig`, Java sidecar `SubjectPreferredSlot` domain class + `@ConstraintWeight` + reward stream. Frontend ships 4-tab `/admin/solver-tuning` (Catalog/Weights/Restrictions/Preferences) with 19 components, 4 TanStack Query hooks, GeneratorPageWeightsCard deep-link on `/admin/solver`, admin-only sidebar entry, DriftBanner consuming `lastUpdatedAt`, and silent-4xx → toast for all 6 mutations. 12 Playwright scenarios across 8 spec files (catalog/weights/restrictions/preferences/integration/audit/mobile/rbac) — 11 desktop + 1 mobile-chrome green; E2E-SOLVER-10 (gated) verified separately. 1 cross-phase regression fix (SUBST-05 view-overlay test received `ConstraintWeightOverrideService` stub provider after TimetableService DI signature change). 9-slider weight set locked end-to-end across TS defaults, Java `@ConstraintWeight`, and reward stream. Next: Phase 15 (DSGVO-Admin & Audit-Log-Viewer), Phase 16 (Schulstammdaten/Zeitraster/Schuljahr), or Phase 17 (Admin-Dashboard).

## Current Milestone: v1.1 Schuladmin Console

**Goal:** Ein Schuladmin kann eine neue Schule End-to-End durch die Benutzeroberfläche aufsetzen und den laufenden Schulbetrieb ohne SQL, Swagger oder Seed-Skripte administrieren — alle bestehenden v1.0-Backend-APIs bekommen produktive Admin-UIs, DSGVO-konform und mit vollständiger Mobile-Parität.

**Target features:**

- Teachers (Lehrer) — CRUD mit Lehrverpflichtung/Werteinheiten, Verfügbarkeit, Ermäßigungen
- Students + Classes — Schüler-CRUD mit Person-Daten, Klassen-CRUD mit Stammklasse und Stundentafel-Zuordnung
- Subjects + Stundentafel — Fächer-CRUD, Stundentafel-Vorlagen pro Schultyp, Gruppenableitungsregeln
- School profile + year — Schulstammdaten, Zeitraster, Schuljahrgrenzen, A/B-Wochen, Periodendefinitionen
- Users + ACL overrides — User-Liste aus Keycloak, Rollenzuweisung, CASL-Per-User-Overrides
- Solver tuning — ConstraintTemplate- und ConstraintWeightOverrides-Editor, Zeit-/Fach-Restriktionen
- DSGVO admin — Einwilligungs-Audit, Aufbewahrungs-Editor, DSFA/VVZ-Management, Art. 15/17-Trigger
- Audit log viewer — Such- und filterbare Audit-Log-Ansicht
- Admin dashboard + setup checklist — Einstiegsseite mit Setup-Completeness-Checkliste

**Out of scope for v1.1:**

- Plugin-/Konnektor-System (MS Teams, Google Calendar, Outlook) — deferred to v1.2
- Reporting / Analytics / Dashboards jenseits der Setup-Checkliste
- Multi-School / Multi-Tenancy
- Neue Backend-Features (reine UI-Meilenstein)

## Context

- **Markt:** Untis dominiert den DACH-Raum mit ~26.000 Schulen. Proprietär, keine offene API, veraltete UX. Bestehende Open-Source-Alternativen (FET, AlekSIS, UniTime) decken jeweils nur Teilbereiche ab.
- **Motivation:** Projekt gestartet aus Frustration als Elternteil und Softwareentwickler über die schlechte Qualität von Untis. Ziel ist eine moderne, offene Alternative.
- **Stundenplan-Algorithmus:** Constraint Satisfaction Problem (CSP) — etablierte Ansätze: Genetic Algorithms, Simulated Annealing, hybride GA-CSP Modelle. Bibliotheken wie Timefold (Java/Python/Kotlin) existieren.
- **Regulatorisch:** DSGVO-Konformität ist Pflicht für Schulen im DACH-Raum. Datenhaltung, Löschkonzepte und Einwilligungsmanagement müssen von Anfang an mitgedacht werden.
- **Zielgruppe:** Alle Schultypen — Volksschulen, Mittelschulen, AHS, BHS/HTL/HAK. Die Plattform muss schultyp-agnostisch sein.

## Constraints

- **Architektur**: Monorepo mit klar getrennten Services und internen APIs — UI-Client muss austauschbar sein ohne Backend-Änderungen
- **Framework-Unabhängigkeit**: Kein Lock-in auf ein spezifisches Framework — "best tool for the job" mit Fokus auf Performance und Modularität
- **DSGVO**: Konformität von Tag 1 — kein nachträgliches Retrofitting
- **Deployment**: Single-Tenant, Self-Hosted via Docker/Kubernetes als Default-Deployment
- **Lizenz**: Open Source (Lizenztyp noch zu entscheiden — MIT, AGPL, oder Apache 2.0)
- **Plattformen**: Web (responsive) + Mobile (native oder cross-platform) mit Feature-Parität
- **API-First**: Alle Funktionen über API verfügbar — UI ist nur ein Consumer

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| API-First Architektur | UI-Client soll austauschbar sein; ermöglicht Drittanbieter-Integrationen | — Pending |
| Single-Tenant Default | Einfacher, mehr Kontrolle für Schulen, DSGVO-freundlicher | — Pending |
| Monorepo + Services | Modularität ohne Microservice-Komplexität; klare Grenzen mit internen APIs | — Pending |
| Plugin-System für Konnektoren | Offene Erweiterbarkeit statt fest eingebauter Integrationen | — Pending |
| Open Source | Gegenpol zu Untis-Monopol; Community-getrieben, kein Vendor Lock-in | — Pending |
| NestJS 11 + Fastify + Prisma 7 | TypeScript ecosystem, Fastify perf, Prisma 7 driver-adapter arch | Phase 1 validated |
| Keycloak 26.5 OIDC | Enterprise SSO, LDAP/AD federation, self-hosted | Phase 1 validated |
| CASL hybrid RBAC+ACL | DB-persisted permissions, per-user overrides, condition templates | Phase 1 validated |
| AES-256-GCM field encryption | DSGVO personal data protection, versioned format $enc:v1:{iv}:{authTag}:{ct} | Phase 2 validated |
| Stundentafel as static TS arrays | Template data not persisted in DB, applied via find-or-create pattern | Phase 2 validated |
| Austrian Lehrverpflichtung/Werteinheiten model | Correct teacher workload calculation for solver input | Phase 2 validated |
| BullMQ async DSGVO jobs | Retention cron, data deletion, data export via background processing | Phase 2 validated |
| Timefold 1.32.0 Quarkus sidecar | Purpose-built constraint solver for school timetabling, JVM performance | Phase 3 validated |
| 6 hard + 8 soft constraints | Two-tier model with configurable weights via ConstraintWeightOverrides | Phase 3 validated |
| A/B week support | Per-school toggle for 2-week cycles, solver generates both weeks | Phase 3 validated |
| Socket.IO WebSocket progress | Real-time solve progress broadcasting with school-scoped rooms | Phase 3 validated |
| React 19 + Vite SPA | Plain SPA for timetable UI, served as static files, no SSR needed | Phase 4 validated |
| shadcn/ui + Tailwind CSS 4 | Copy-paste components, accessible by default, utility-first styling | Phase 4 validated |
| TanStack Router + Query | Type-safe routing, server state caching with suspense support | Phase 4 validated |
| @dnd-kit for drag-and-drop | Accessible DnD with constraint validation overlay | Phase 4 validated |
| IoAdapter for Fastify WebSocket | Explicit Socket.IO binding required for NestJS + Fastify | Phase 4 validated |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? -> Move to Out of Scope with reason
2. Requirements validated? -> Move to Validated with phase reference
3. New requirements emerged? -> Add to Active
4. Decisions to log? -> Add to Key Decisions
5. "What This Is" still accurate? -> Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-25 after Phase 14 (Solver-Tuning) completed. SOLVER-01..05 shipped with 12 Playwright scenarios across 8 spec files. 4-tab `/admin/solver-tuning` + GeneratorPageWeightsCard deep-link + admin-only sidebar entry; ConstraintWeightOverride Prisma model + 15-entry catalog + D-06 resolution chain (defaults < DB < DTO) + Java sidecar `SubjectPreferredSlot` reward stream; 9-slider weight UI locked end-to-end TS↔Java; silent-4xx → toast invariant on all 6 mutations; cross-phase SUBST-05 regression repaired. 10/12 v1.1 phases complete (83%). Next: Phase 15 (DSGVO-Admin & Audit-Log-Viewer).*
