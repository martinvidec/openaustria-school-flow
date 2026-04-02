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

### Active

- [ ] Digitales Klassenbuch (Anwesenheit, Unterrichtsinhalte, Noten, Abwesenheiten)
- [ ] Schulkommunikation (Lehrer-Eltern, Lehrer-Schüler, Mitteilungen, Lesebestätigungen)
- [ ] Vertretungsplanung (automatische Vorschläge basierend auf Verfügbarkeit)
- [ ] Plugin-/Konnektor-System mit offener API (MS Teams, Google Calendar, Outlook, etc.)
- [ ] Multi-Plattform UI (Web + Mobile) mit modernem, responsivem Design

### Out of Scope

- E-Learning / LMS (Moodle-Territorium) — anderer Problemraum, eigenes Produkt
- Schüler-Informationssystem / SIS (Stammdatenverwaltung, Zeugnisse) — kann über API angebunden werden
- Finanz-/Budgetverwaltung — nicht Kernkompetenz einer Schulplattform
- Video-Conferencing Engine — über Konnektoren zu Teams/Zoom/Jitsi lösen
- Cloud-SaaS Mandantenfähigkeit — v1 ist Single-Tenant; Multi-Tenant als spätere Option

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
*Last updated: 2026-04-01 after Phase 4 completion — Timetable Viewing, Editing & Room Management*
