# OpenAustria SchoolFlow

## What This Is

Eine Open-Source-Plattform zur Verwaltung von Schulen im DACH-Raum — die freie Alternative zu Untis. SchoolFlow bietet automatische Stundenplanerstellung, digitales Klassenbuch, und schulinterne Kommunikation mit modernem, responsivem UI auf Web und Mobile. Gebaut für alle Schultypen von der Volksschule bis zur BHS.

## Core Value

Schulen bekommen eine moderne, erweiterbare Plattform mit automatischer Stundenplanerstellung, die sie selbst hosten können — ohne Vendor Lock-in, mit offenen APIs und DSGVO-Konformität von Tag 1.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Automatische Stundenplanerstellung mit Constraint-Engine (Verfügbarkeit, Räume, pädagogische Regeln, organisatorische Vorgaben)
- [ ] Digitales Klassenbuch (Anwesenheit, Unterrichtsinhalte, Noten, Abwesenheiten)
- [ ] Schulkommunikation (Lehrer-Eltern, Lehrer-Schüler, Mitteilungen, Lesebestätigungen)
- [ ] Vertretungsplanung (automatische Vorschläge basierend auf Verfügbarkeit)
- [ ] Raum- und Ressourcenverwaltung (Kapazitäten, Fachräume, Doppelbelegungsschutz)
- [ ] Plugin-/Konnektor-System mit offener API (MS Teams, Google Calendar, Outlook, etc.)
- [ ] Multi-Plattform UI (Web + Mobile) mit modernem, responsivem Design
- [ ] Rollen- und Rechteverwaltung (Admin, Schulleitung, Lehrer, Eltern, Schüler)
- [ ] REST/GraphQL API als primäre Schnittstelle (UI-agnostisch, Client austauschbar)
- [ ] Single-Tenant Deployment (Docker/Kubernetes, Self-Hosted als Default)
- [ ] DSGVO-Konformität (Datenhaltung, Löschkonzepte, Einwilligungen, Audit-Trail)

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
*Last updated: 2026-03-29 after initialization*
