# Requirements: OpenAustria SchoolFlow

**Defined:** 2026-04-18
**Milestone:** v1.1 Schuladmin Console
**Core Value:** Schulen bekommen eine moderne, erweiterbare Plattform mit automatischer Stundenplanerstellung, die sie selbst hosten können — ohne Vendor Lock-in, mit offenen APIs und DSGVO-Konformität von Tag 1.

**Milestone Goal:** Ein Schuladmin kann eine neue Schule End-to-End durch die Benutzeroberfläche aufsetzen und den laufenden Schulbetrieb ohne SQL, Swagger oder Seed-Skripte administrieren — alle bestehenden v1.0-Backend-APIs bekommen produktive Admin-UIs, DSGVO-konform und mit vollständiger Mobile-Parität.

**Milestone Type:** Brownfield UI-only. No new Prisma models or backend endpoints are planned; v1.0 backend is reused. Gap fixes surfaced during build become atomic tasks, not new requirements.

---

## v1.1 Requirements

### Admin Dashboard & Onboarding

- [ ] **ADMIN-01**: Admin sieht ein Dashboard mit Setup-Completeness-Checkliste für Schulstammdaten, Zeitraster, Schuljahr, Fächer, Lehrer, Klassen, Schüler und Solver-Konfiguration
- [ ] **ADMIN-02**: Admin navigiert vom Dashboard aus direkt zu jeder offenen Setup-Aufgabe (Deep-Link)
- [ ] **ADMIN-03**: Dashboard zeigt Live-Zustand (erledigt/fehlt/unvollständig) pro Checklisten-Eintrag, aktualisiert sich ohne Reload nach jeder Admin-Aktion

### School Profile & Year

- [ ] **SCHOOL-01**: Admin kann Schulstammdaten (Name, Schultyp, Adresse, Kontakt) anlegen und editieren
- [ ] **SCHOOL-02**: Admin kann Zeitraster (Perioden, Pausenzeiten, Unterrichtstage) konfigurieren
- [ ] **SCHOOL-03**: Admin kann Schuljahre mit Start-/Enddatum anlegen und aktives Schuljahr setzen
- [ ] **SCHOOL-04**: Admin kann A/B-Wochen-Modus pro Schule aktivieren/deaktivieren
- [ ] **SCHOOL-05**: Admin kann Perioden-Slots (Länge, Label, Pausen-Flag) im Zeitraster editieren

### Teacher Management

- [ ] **TEACHER-01**: Admin sieht Lehrerliste mit Suche und Filter (Name, Fach, Status)
- [ ] **TEACHER-02**: Admin kann Lehrer anlegen und editieren (Stammdaten, Keycloak-Verknüpfung)
- [ ] **TEACHER-03**: Admin kann Lehrverpflichtung/Werteinheiten editieren (Beschäftigungsgrad, OEPU-Gruppen-Stunden)
- [ ] **TEACHER-04**: Admin kann Lehrer-Verfügbarkeit editieren (Tage, Zeitslots, wiederkehrende Ausnahmen)
- [ ] **TEACHER-05**: Admin kann Ermäßigungen/Reduktionen mit Grund und Stundenanzahl verwalten
- [ ] **TEACHER-06**: Admin kann Lehrer deaktivieren/archivieren ohne Datenverlust

### Student & Class Management

- [ ] **STUDENT-01**: Admin sieht Schülerliste mit Suche und Filter (Name, Klasse, Status)
- [ ] **STUDENT-02**: Admin kann Schüler anlegen und editieren (Person-Daten, Erziehungsberechtigte)
- [ ] **STUDENT-03**: Admin kann Schüler einer Stammklasse zuordnen oder umziehen
- [ ] **STUDENT-04**: Admin kann Schüler deaktivieren/archivieren ohne Datenverlust
- [ ] **CLASS-01**: Admin sieht Klassenliste mit Filter (Jahrgangsstufe, Schultyp)
- [ ] **CLASS-02**: Admin kann Klassen anlegen und editieren (Stammklasse-Marker, Klassenvorstand-Zuweisung)
- [ ] **CLASS-03**: Admin kann Stundentafel-Vorlage auf eine Klasse anwenden und anpassen
- [ ] **CLASS-04**: Admin kann Gruppenzugehörigkeiten (Religion/Leistung/Wahlpflicht) pro Klasse verwalten
- [ ] **CLASS-05**: Admin kann Gruppenableitungsregeln pro Klasse definieren

### Subject & Stundentafel

- [ ] **SUBJECT-01**: Admin sieht Fächerliste mit Filter
- [ ] **SUBJECT-02**: Admin kann Fächer anlegen und editieren (Name, Kürzel, Farbe)
- [ ] **SUBJECT-03**: Admin kann Stundentafel-Vorlagen pro Schultyp einsehen und auswählen
- [ ] **SUBJECT-04**: Admin kann Wochenstunden pro Fach pro Klassenstufe anpassen
- [ ] **SUBJECT-05**: Admin kann ungenutzte Fächer löschen (Orphan-Schutz gegen Fächer mit Zuordnungen)

### User & ACL Management

- [ ] **USER-01**: Admin sieht User-Liste aus Keycloak mit Suche und Filter
- [ ] **USER-02**: Admin kann Rollen (Admin, Schulleitung, Lehrer, Eltern, Schüler) einem User zuweisen
- [ ] **USER-03**: Admin sieht pro User die wirksamen CASL-Permissions (Rollen-Vererbung)
- [ ] **USER-04**: Admin kann per-User-ACL-Overrides anlegen, editieren und löschen
- [ ] **USER-05**: Admin kann Keycloak-User mit einem Teacher-/Student-/Parent-Person-Record verknüpfen

### Solver Tuning

- [ ] **SOLVER-01**: Admin sieht Constraint-Template-Liste mit Hard/Soft-Unterscheidung
- [ ] **SOLVER-02**: Admin kann Constraint-Templates editieren (Gewicht, Parameter)
- [ ] **SOLVER-03**: Admin kann ConstraintWeightOverrides pro Schule setzen
- [ ] **SOLVER-04**: Admin kann ClassTimeslotRestrictions (Klassen-Zeitsperren) pflegen
- [ ] **SOLVER-05**: Admin kann SubjectTimePreferences (Fach-Zeitfenster-Präferenzen) pflegen

### DSGVO Admin

- [ ] **DSGVO-ADM-01**: Admin kann Einwilligungs-Records nach Zweck/Status filtern und durchsuchen
- [ ] **DSGVO-ADM-02**: Admin kann Aufbewahrungsrichtlinien pro Datenkategorie editieren
- [ ] **DSGVO-ADM-03**: Admin kann DSFA-Einträge (Datenschutz-Folgenabschätzung) anlegen und editieren
- [ ] **DSGVO-ADM-04**: Admin kann VVZ-Einträge (Verarbeitungsverzeichnis) anlegen und editieren
- [ ] **DSGVO-ADM-05**: Admin kann Art. 15 Datenexport für einen User aus der UI anstoßen und den BullMQ-Job-Status verfolgen
- [ ] **DSGVO-ADM-06**: Admin kann Art. 17 Anonymisierung/Löschung für einen User aus der UI anstoßen und bestätigen

### Audit Log Viewer

- [ ] **AUDIT-VIEW-01**: Admin kann Audit-Log mit Suche und Filter (Actor, Action, Subject, Zeitraum) durchsuchen
- [ ] **AUDIT-VIEW-02**: Admin sieht Audit-Eintrag-Detail mit Before/After-Diff
- [ ] **AUDIT-VIEW-03**: Admin kann gefilterten Audit-Log als CSV für DSGVO-Berichte exportieren

### Mobile Parity

- [ ] **MOBILE-ADM-01**: Alle Admin-CRUD-Tabellen haben eine mobile-taugliche Karten-/Listen-Alternative bei 375px
- [ ] **MOBILE-ADM-02**: Alle Admin-Formulare funktionieren bei 375px mit 44px-Touch-Targets
- [ ] **MOBILE-ADM-03**: Admin-Dashboard und Navigation funktionieren bei 375px

---

## Future Requirements (v1.2+)

Deferred from v1.1 scope or carried over from v1.0 v2 list.

### Plugin System (v1.2 candidate)

- **PLUGIN-01**: Offene Konnektor-API mit versioniertem SDK
- **PLUGIN-02**: Plugin-Registry für Community-Erweiterungen
- **PLUGIN-03**: Kalender-Sync-Konnektoren (Google Calendar, Outlook)
- **PLUGIN-04**: MS Teams / Google Workspace Integration
- **PLUGIN-05**: Plugin-Sandboxing für Sicherheit und DSGVO

### Communication Enhancements (v1.3+)

- **COMM-07**: Mehrsprachige Nachrichtenübersetzung (DeepL-Integration)
- **COMM-08**: Elternsprechtag Online-Buchungssystem

### Analytics (v1.3+)

- **ANALYTICS-01**: Anwesenheits-Dashboard mit Trends und Risiko-Schülern
- **ANALYTICS-02**: Vertretungsanalyse (Fairness, Ausfallraten)
- **ANALYTICS-03**: Raumauslastungsberichte
- **ANALYTICS-04**: Lehrer-Workload-Analyse
- **ANALYTICS-05**: Exportierbare Reports (PDF/CSV)

### Advanced (v2.0+)

- **ADV-01**: Kurswahl-System für Oberstufe (AHS/BHS)
- **ADV-02**: Kubernetes Helm Charts für größere Deployments
- **ADV-03**: Multi-Tenant-Option für gehostete Variante

---

## Out of Scope

Explicit exclusions for v1.1 (documented to prevent scope creep).

| Feature | Reason |
|---------|--------|
| Neue Backend-Endpoints oder Prisma-Modelle | v1.1 ist reiner UI-Meilenstein; Gap-Fixes werden als atomare Tasks behandelt, nicht als Requirements |
| Multi-School / Multi-Tenancy | Bleibt Single-Tenant per Projekt-Constraint |
| Reporting / Analytics / Dashboards jenseits Setup-Checkliste | Eigener Meilenstein (v1.3+) |
| Plugin-/Konnektor-UI | Bleibt für v1.2 |
| E-Learning / LMS | Moodle-Territorium — per Konnektor anbinden |
| Schüler-Informationssystem (SIS) | Separate Produktkategorie — per API anbinden |
| Finanz-/Budgetverwaltung | Nicht Kernkompetenz |
| Video-Conferencing Engine | Über Konnektoren zu Teams/Zoom/Jitsi |
| Zeugniserstellung | Per-Bundesland unterschiedlich — SIS-Territorium |
| Schul-Website / CMS | WordPress/Typo3 existieren |
| Verhaltens-/Disziplinsystem | Kulturell sensitiv — Notizen im Klassenbuch reichen |

---

## Traceability

Empty initially — populated during roadmap creation by `gsd-roadmapper`.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ADMIN-01 | Phase 16 | Pending |
| ADMIN-02 | Phase 16 | Pending |
| ADMIN-03 | Phase 16 | Pending |
| SCHOOL-01 | Phase 10 | Pending |
| SCHOOL-02 | Phase 10 | Pending |
| SCHOOL-03 | Phase 10 | Pending |
| SCHOOL-04 | Phase 10 | Pending |
| SCHOOL-05 | Phase 10 | Pending |
| TEACHER-01 | Phase 11 | Pending |
| TEACHER-02 | Phase 11 | Pending |
| TEACHER-03 | Phase 11 | Pending |
| TEACHER-04 | Phase 11 | Pending |
| TEACHER-05 | Phase 11 | Pending |
| TEACHER-06 | Phase 11 | Pending |
| STUDENT-01 | Phase 12 | Pending |
| STUDENT-02 | Phase 12 | Pending |
| STUDENT-03 | Phase 12 | Pending |
| STUDENT-04 | Phase 12 | Pending |
| CLASS-01 | Phase 12 | Pending |
| CLASS-02 | Phase 12 | Pending |
| CLASS-03 | Phase 12 | Pending |
| CLASS-04 | Phase 12 | Pending |
| CLASS-05 | Phase 12 | Pending |
| SUBJECT-01 | Phase 11 | Pending |
| SUBJECT-02 | Phase 11 | Pending |
| SUBJECT-03 | Phase 11 | Pending |
| SUBJECT-04 | Phase 11 | Pending |
| SUBJECT-05 | Phase 11 | Pending |
| USER-01 | Phase 13 | Pending |
| USER-02 | Phase 13 | Pending |
| USER-03 | Phase 13 | Pending |
| USER-04 | Phase 13 | Pending |
| USER-05 | Phase 13 | Pending |
| SOLVER-01 | Phase 14 | Pending |
| SOLVER-02 | Phase 14 | Pending |
| SOLVER-03 | Phase 14 | Pending |
| SOLVER-04 | Phase 14 | Pending |
| SOLVER-05 | Phase 14 | Pending |
| DSGVO-ADM-01 | Phase 15 | Pending |
| DSGVO-ADM-02 | Phase 15 | Pending |
| DSGVO-ADM-03 | Phase 15 | Pending |
| DSGVO-ADM-04 | Phase 15 | Pending |
| DSGVO-ADM-05 | Phase 15 | Pending |
| DSGVO-ADM-06 | Phase 15 | Pending |
| AUDIT-VIEW-01 | Phase 15 | Pending |
| AUDIT-VIEW-02 | Phase 15 | Pending |
| AUDIT-VIEW-03 | Phase 15 | Pending |
| MOBILE-ADM-01 | Phase 16 | Pending |
| MOBILE-ADM-02 | Phase 16 | Pending |
| MOBILE-ADM-03 | Phase 16 | Pending |

**Coverage:**
- v1.1 requirements: 50 total
- Mapped to phases: 50 (7 phases, Phase 10-16)
- Unmapped: 0 ✓

---

*Requirements defined: 2026-04-18*
*Last updated: 2026-04-18 after v1.1 milestone kickoff*
