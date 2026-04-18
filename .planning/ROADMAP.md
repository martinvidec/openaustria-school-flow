# Roadmap: OpenAustria SchoolFlow

## Milestones

- ✅ **v1.0 MVP** — Phases 1-9 + gap closures 9.1-9.3 (shipped 2026-04-09)
- ◆ **v1.1 Schuladmin Console** — Phases 10-16 (started 2026-04-18)

See [.planning/milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full v1.0 phase details.

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-9 + 9.1-9.3) — SHIPPED 2026-04-09</summary>

- [x] Phase 1: Project Scaffolding & Auth (7/7 plans)
- [x] Phase 2: School Data Model & DSGVO (8/8 plans)
- [x] Phase 3: Timetable Solver Engine (6/6 plans)
- [x] Phase 4: Timetable Viewing, Editing & Room Management (15/15 plans)
- [x] Phase 5: Digital Class Book (10/10 plans)
- [x] Phase 6: Substitution Planning (6/6 plans)
- [x] Phase 7: Communication (8/8 plans)
- [x] Phase 8: Homework, Exams & Data Import (6/6 plans)
- [x] Phase 9: Mobile, PWA & Production Readiness (5/5 plans)
- [x] Phase 9.1: Runtime Blockers Fix (1/1 plan) — GAP CLOSURE
- [x] Phase 9.2: DSGVO Compliance Closure (1/1 plan) — GAP CLOSURE
- [x] Phase 9.3: Solver Frontend Wiring (1/1 plan) — GAP CLOSURE

**Total:** 12 phases, 74 plans, 65/65 requirements satisfied

</details>

## v1.1 Schuladmin Console (Phases 10-16)

**Started:** 2026-04-18
**Status:** Roadmap created — ready to plan Phase 10
**Type:** Brownfield UI-only. All v1.0 backend APIs already shipped; v1.1 delivers admin-facing UI surfaces on top of them. Gap fixes surfaced during build are atomic tasks inside plans, not new requirements.
**Goal:** Ein Schuladmin kann eine neue Schule End-to-End durch die Benutzeroberfläche aufsetzen und den laufenden Schulbetrieb ohne SQL, Swagger oder Seed-Skripte administrieren.

### Phase summary

| # | Phase | REQ count | Depends on | Parallelism |
|---|-------|-----------|------------|-------------|
| 10 | Schulstammdaten & Zeitraster | 5 | v1.0 backend | — |
| 11 | Lehrer- und Fächer-Verwaltung | 11 | Phase 10 | Parallel with Phase 14 |
| 12 | Schüler-, Klassen- & Gruppenverwaltung | 9 | Phase 11 | — |
| 13 | User- und Rechteverwaltung | 5 | Phase 12 | — |
| 14 | Solver-Tuning | 5 | Phase 10 | Parallel with Phases 11-13 |
| 15 | DSGVO-Admin & Audit-Log-Viewer | 9 | Phase 13 | — |
| 16 | Admin-Dashboard & Mobile-Härtung | 6 | Phases 10-15 | — |

**Total:** 7 phases, 50 requirements, 100% coverage.

---

### Phase 10: Schulstammdaten & Zeitraster

**Goal:** Admin kann eine neue Schule mit Zeitraster und Schuljahr UI-gestützt aufsetzen — Fundament für alle weiteren Admin-Oberflächen.
**Requirements:** SCHOOL-01, SCHOOL-02, SCHOOL-03, SCHOOL-04, SCHOOL-05
**Depends on:** v1.0 backend (SchoolModule, TimeGrid, SchoolYear already exist from v1.0 Phase 1-2)
**Plans:** 0 plans

**Success criteria:**
- [ ] Admin kann eine neue Schule anlegen und Stammdaten (Name, Typ, Adresse, Kontakt) editieren
- [ ] Admin kann ein Zeitraster mit Perioden, Pausen und Unterrichtstagen definieren und editieren
- [ ] Admin kann ein Schuljahr mit Start-/Enddatum anlegen und als aktiv markieren
- [ ] Admin kann A/B-Wochen-Modus pro Schule aktivieren/deaktivieren mit sofortiger Auswirkung auf Solver-Constraints
- [ ] Alle Oberflächen sind bei 375px mit 44px-Touch-Targets benutzbar

**Known risks / backend gap candidates:**
- Keine erwartet — SchoolModule + TimeGrid + SchoolYear CRUD sind aus v1.0 bereits produktiv.

Plans:
- [ ] TBD (run /gsd-plan-phase 10 to break down)

---

### Phase 11: Lehrer- und Fächer-Verwaltung

**Goal:** Admin kann Lehrerstammdaten inkl. Lehrverpflichtung/Werteinheiten und Fächer inkl. Stundentafel-Vorlagen UI-gestützt pflegen.
**Requirements:** TEACHER-01, TEACHER-02, TEACHER-03, TEACHER-04, TEACHER-05, TEACHER-06, SUBJECT-01, SUBJECT-02, SUBJECT-03, SUBJECT-04, SUBJECT-05
**Depends on:** Phase 10 (Schule + Schuljahr müssen vor Lehrer-Anlage existieren)
**Plans:** 0 plans

**Success criteria:**
- [ ] Admin sieht Lehrerliste mit Suche/Filter und kann einen Lehrer inkl. Person-Daten und Keycloak-Verknüpfung anlegen/editieren
- [ ] Admin kann Lehrverpflichtung/Werteinheiten (Beschäftigungsgrad, OEPU-Gruppen-Stunden, Ermäßigungen) pro Lehrer editieren
- [ ] Admin kann Lehrer-Verfügbarkeit (Tage, Zeitslots, wiederkehrende Ausnahmen) pflegen und Lehrer deaktivieren/archivieren ohne Datenverlust
- [ ] Admin kann Fächer (Name, Kürzel, Farbe) anlegen/editieren und Stundentafel-Vorlagen pro Schultyp einsehen
- [ ] Fach-Löschung ist Orphan-sicher (Fach mit Zuordnungen kann nicht gelöscht werden)

**Known risks / backend gap candidates:**
- SUBJECT-03 (Stundentafel-Vorlagen pro Schultyp einsehen): Templates sind als statische TS-Arrays in v1.0 implementiert — UI muss sie aus dem shared package lesen, nicht aus der DB.

Plans:
- [ ] TBD (run /gsd-plan-phase 11 to break down)

---

### Phase 12: Schüler-, Klassen- und Gruppenverwaltung

**Goal:** Admin kann Schüler, Klassen mit Stammklasse und Klassenvorstand sowie Gruppenableitungsregeln UI-gestützt pflegen.
**Requirements:** STUDENT-01, STUDENT-02, STUDENT-03, STUDENT-04, CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05
**Depends on:** Phase 11 (Fächer + Stundentafel-Vorlagen werden für CLASS-03 benötigt)
**Plans:** 0 plans

**Success criteria:**
- [ ] Admin kann Schüler mit Person-Daten und Erziehungsberechtigten anlegen, editieren und archivieren
- [ ] Admin kann Klassen anlegen/editieren mit Stammklasse-Marker und Klassenvorstand-Zuweisung
- [ ] Admin kann Stundentafel-Vorlage auf eine Klasse anwenden und pro Klasse anpassen
- [ ] Admin kann Gruppenableitungsregeln (Religion/Leistung/Wahlpflicht) pro Klasse definieren und Gruppenzugehörigkeiten manuell überschreiben
- [ ] Admin kann Schüler zwischen Stammklassen umziehen ohne Datenverlust und ohne Referenz-Bruch zum Klassenbuch

**Known risks / backend gap candidates:**
- CLASS-04 (Gruppenmitgliedschaften manuell verwalten): GroupMembership-CRUD in v1.0 unterstützt bereits `isAutoAssigned` — UI muss selective override reflektieren.

Plans:
- [ ] TBD (run /gsd-plan-phase 12 to break down)

---

### Phase 13: User- und Rechteverwaltung

**Goal:** Admin kann Keycloak-User listen, Rollen zuweisen, CASL-ACL-Overrides pflegen und User mit Person-Records verknüpfen.
**Requirements:** USER-01, USER-02, USER-03, USER-04, USER-05
**Depends on:** Phase 12 (USER-05 verknüpft Keycloak-User mit Teacher/Student/Parent-Person-Records — alle müssen existieren)
**Plans:** 0 plans

**Success criteria:**
- [ ] Admin sieht User-Liste aus Keycloak mit Suche/Filter (Name, Email, Rolle)
- [ ] Admin kann einem User eine oder mehrere der 5 Rollen (Admin, Schulleitung, Lehrer, Eltern, Schüler) zuweisen
- [ ] Admin sieht pro User die wirksamen CASL-Permissions mit Rollen-Vererbung
- [ ] Admin kann per-User-ACL-Overrides (subject + action + condition) anlegen, editieren und löschen
- [ ] Admin kann einen Keycloak-User mit einem Teacher-, Student- oder Parent-Person-Record verknüpfen und die Verknüpfung wieder auflösen

**Known risks / backend gap candidates:**
- USER-01/02/05: Keycloak Admin API Adapter im Backend existiert möglicherweise nur für Login — Admin-User-Listing und Rollenzuweisung könnten eine kleine Service-Erweiterung benötigen (Gap-Fix-Task im Plan).
- USER-03: Effektive Permissions-Resolution (Rolle + ACL-Overrides → wirksame Abilities) muss in einem Query-Endpoint verfügbar sein — v1.0 CASL-Factory müsste dies unterstützen, ist aber zu verifizieren.

Plans:
- [ ] TBD (run /gsd-plan-phase 13 to break down)

---

### Phase 14: Solver-Tuning

**Goal:** Admin kann Constraint-Templates, Gewichtungen und Zeit-/Fach-Restriktionen UI-gestützt pflegen, ohne den Backend-Code oder die DB direkt anzufassen.
**Requirements:** SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05
**Depends on:** Phase 10 (Schule + Zeitraster müssen existieren für schul-scoped Constraint-Tuning)
**Plans:** 0 plans

**Success criteria:**
- [ ] Admin sieht Constraint-Template-Liste mit klarer Hard/Soft-Unterscheidung und aktueller Gewichtung
- [ ] Admin kann ConstraintWeightOverrides pro Schule setzen mit sofortiger Validierung (Min/Max/Typ)
- [ ] Admin kann ClassTimeslotRestrictions (geblockte Zeitfenster pro Klasse) anlegen und löschen
- [ ] Admin kann SubjectTimePreferences (bevorzugte Zeitfenster pro Fach) anlegen und löschen
- [ ] Erneute Stundenplan-Generierung reflektiert geänderte Weights nachvollziehbar (manuelle Verifikation gegen Pre-Change-Baseline)

**Known risks / backend gap candidates:**
- SOLVER-01/02: ConstraintTemplate CRUD existiert aus v1.0 Phase 3 — UI muss die Input-Form für Hard/Soft-Constraint-Parameter generisch gestalten.
- SOLVER-04/05: ClassTimeslotRestriction und SubjectTimePreference sind als Prisma-Modelle vorhanden, aber möglicherweise noch keine CRUD-Endpoints exponiert — als Gap-Fix-Task einplanen.

**Parallelism:** Kann parallel zu Phasen 11–13 ausgeführt werden (via `/gsd:new-workspace`), sobald Phase 10 gelandet ist.

Plans:
- [ ] TBD (run /gsd-plan-phase 14 to break down)

---

### Phase 15: DSGVO-Admin & Audit-Log-Viewer

**Goal:** Admin kann Einwilligungen, Aufbewahrungsrichtlinien, DSFA/VVZ und DSGVO-Jobs aus der UI verwalten und das Audit-Log durchsuchen und exportieren.
**Requirements:** DSGVO-ADM-01, DSGVO-ADM-02, DSGVO-ADM-03, DSGVO-ADM-04, DSGVO-ADM-05, DSGVO-ADM-06, AUDIT-VIEW-01, AUDIT-VIEW-02, AUDIT-VIEW-03
**Depends on:** Phase 13 (DSGVO-Jobs laufen pro User; Audit-Log filtert nach Actor)
**Plans:** 0 plans

**Success criteria:**
- [ ] Admin kann Einwilligungs-Records nach Zweck, Status und User filtern und durchsuchen
- [ ] Admin kann Aufbewahrungsrichtlinien pro Datenkategorie editieren und DSFA-/VVZ-Einträge anlegen/editieren
- [ ] Admin kann Art. 15 Datenexport für einen User aus der UI anstoßen und den BullMQ-Job-Status live verfolgen
- [ ] Admin kann Art. 17 Anonymisierung/Löschung für einen User aus der UI anstoßen, mit 2-stufiger Bestätigung und Job-Status-Tracking
- [ ] Admin kann Audit-Log durchsuchen (Actor, Action, Subject, Zeitraum), einen Eintrag mit Before/After-Diff öffnen und gefilterte Ergebnisse als CSV exportieren

**Known risks / backend gap candidates:**
- DSGVO-ADM-03/04: DSFA/VVZ CRUD aus v1.0 Phase 2 existiert — aber möglicherweise nur als `combined JSON export`, nicht als individuelle Record-CRUD-Endpoints. Als Gap-Fix-Task einplanen.
- DSGVO-ADM-05/06: UI-Trigger für BullMQ-Jobs braucht einen thin Job-Status-Read-Endpoint (Job-ID + Status + Fortschritt). v1.0 hat Job-Queues aber möglicherweise keinen UI-lesbaren Status-API — Gap-Fix-Task.
- AUDIT-VIEW-03: CSV-Export kann fehlen — v1.0 `AuditModule.exportCsv()` via grep verifizieren im Plan-Research. Falls nicht vorhanden: Gap-Fix-Task im Plan.

Plans:
- [ ] TBD (run /gsd-plan-phase 15 to break down)

---

### Phase 16: Admin-Dashboard & Mobile-Härtung

**Goal:** Admin sieht beim Login ein Dashboard mit Setup-Completeness-Checkliste das alle Admin-Surfaces aus Phasen 10–15 zusammenführt und als Einstiegspunkt dient; Mobile-Parity aller Admin-Surfaces ist final verifiziert.
**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03, MOBILE-ADM-01, MOBILE-ADM-02, MOBILE-ADM-03
**Depends on:** Phasen 10-15 (Dashboard verlinkt auf alle CRUD-Surfaces; Mobile-Härtung verifiziert alle gelieferten Oberflächen)
**Plans:** 0 plans

**Success criteria:**
- [ ] Admin sieht beim Login ein Dashboard mit Setup-Completeness-Checkliste (Schule, Zeitraster, Schuljahr, Fächer, Lehrer, Klassen, Schüler, Solver, DSGVO, Audit)
- [ ] Jeder Checklisten-Eintrag verlinkt per Deep-Link auf die zugehörige Admin-Oberfläche
- [ ] Dashboard zeigt Live-Zustand (erledigt/fehlt/unvollständig) pro Eintrag ohne manuellen Reload nach jeder Admin-Aktion
- [ ] Alle Admin-Oberflächen aus Phasen 10–15 sind bei 375px benutzbar, haben 44px-Touch-Targets auf interaktiven Elementen und passen sich fließend auf 1280px an
- [ ] Admin-Navigation (Sidebar, Breadcrumb) funktioniert bei 375px über Drawer/Overlay-Pattern

**Known risks / backend gap candidates:**
- ADMIN-03 (Live-Zustand ohne Reload): benötigt entweder Polling mit TanStack Query staleTime oder Socket.IO-Broadcast auf Admin-Room — in v1.0 etabliertes Muster.
- MOBILE-ADM-Audit: finaler Mobile-Sweep kann UI-Regressions aus Phasen 10-15 aufdecken — Gap-Fix-Tasks innerhalb Phase 16 einplanen.

Plans:
- [ ] TBD (run /gsd-plan-phase 16 to break down)
