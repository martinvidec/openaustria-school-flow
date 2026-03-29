# Requirements: OpenAustria SchoolFlow

**Defined:** 2026-03-29
**Core Value:** Schulen bekommen eine moderne, erweiterbare Plattform mit automatischer Stundenplanerstellung, die sie selbst hosten können — ohne Vendor Lock-in, mit offenen APIs und DSGVO-Konformität von Tag 1.

## v1 Requirements

### Foundation

- [x] **FOUND-01**: Admin kann Schulprofil anlegen (Name, Typ, Zeitraster, Unterrichtstage)
- [ ] **FOUND-02**: Admin kann Lehrer mit Stammdaten erfassen (Name, Fächer, Verfügbarkeit, Beschäftigungsgrad)
- [ ] **FOUND-03**: Admin kann Klassen/Gruppen anlegen mit Schülerzuordnung
- [ ] **FOUND-04**: Admin kann Fächer mit Wochenstunden-Soll pro Klasse definieren
- [ ] **FOUND-05**: System unterstützt verschiedene Schultypen (VS, MS, AHS, BHS) über konfigurierbare Zeitraster und Regelwerke

### Timetable Engine

- [ ] **TIME-01**: System generiert automatisch Stundenplan unter Einhaltung von Hard Constraints (Lehrer-Clash, Raum-Clash, Zeitfenster)
- [ ] **TIME-02**: System berücksichtigt Soft Constraints (max. Stunden/Tag, keine Dopplung gleicher Fächer, bevorzugte Zeitfenster, ausgewogene Wochenverteilung)
- [ ] **TIME-03**: Admin kann individuelle Constraints definieren (geblockte Zeitfenster, Lehrer-Verfügbarkeit, Teilzeit-Modelle)
- [ ] **TIME-04**: System unterstützt Doppelstunden und flexible Blocklängen
- [ ] **TIME-05**: System unterstützt A/B-Wochen und mehrwöchige Stundenplan-Zyklen
- [ ] **TIME-06**: System zeigt Solving-Fortschritt in Echtzeit an (Anytime-Solving mit Zwischenergebnissen)
- [ ] **TIME-07**: System erklärt bei unlösbaren Stundenplänen, welche Constraints in Konflikt stehen
- [ ] **TIME-08**: Admin kann generierten Stundenplan manuell nachbearbeiten (Drag & Drop)

### Timetable Viewing

- [ ] **VIEW-01**: Lehrer sieht eigenen Stundenplan (Tages- und Wochenansicht)
- [ ] **VIEW-02**: Schüler/Eltern sehen Klassen-Stundenplan
- [ ] **VIEW-03**: Admin sieht alle Stundenpläne (Lehrer, Klassen, Räume)
- [ ] **VIEW-04**: Vertretungen, Ausfälle und Raumänderungen werden in Echtzeit aktualisiert
- [ ] **VIEW-05**: Farbcodierung nach Fächern, visuelle Indikatoren für Änderungen
- [ ] **VIEW-06**: Stundenplan als PDF und iCal exportierbar

### Digital Class Book

- [ ] **BOOK-01**: Lehrer kann Anwesenheit pro Stunde erfassen (anwesend, abwesend, verspätet, entschuldigt)
- [ ] **BOOK-02**: Lehrer kann Unterrichtsinhalt pro Stunde dokumentieren
- [ ] **BOOK-03**: Lehrer kann Noten erfassen (mündlich, schriftlich, praktisch) mit konfigurierbarer Gewichtung
- [ ] **BOOK-04**: Lehrer kann Notizen zu einzelnen Schülern pro Stunde hinterlegen
- [ ] **BOOK-05**: System erstellt Abwesenheitsstatistiken pro Schüler, Klasse und Zeitraum
- [ ] **BOOK-06**: Eltern können digitale Entschuldigungen einreichen
- [ ] **BOOK-07**: Klassenbuch funktioniert auf Desktop, Tablet und Smartphone gleichermaßen

### Substitution Planning

- [ ] **SUBST-01**: Admin kann Lehrer-Abwesenheit mit Grund und Dauer erfassen
- [ ] **SUBST-02**: System schlägt automatisch passende Vertretungen vor (Verfügbarkeit, Qualifikation, Auslastungs-Fairness)
- [ ] **SUBST-03**: Vertretungslehrer kann Vertretung per Push-Notification bestätigen/ablehnen
- [ ] **SUBST-04**: Abwesender Lehrer kann Übergabenotizen pro Stunde hinterlassen
- [ ] **SUBST-05**: Vertretungsänderungen propagieren sofort in alle Stundenplan-Ansichten
- [ ] **SUBST-06**: System erfasst Vertretungsstatistiken pro Lehrer (gegeben/erhalten)

### Room & Resource Management

- [ ] **ROOM-01**: Admin kann Raumkatalog pflegen (Typ, Kapazität, Ausstattung)
- [ ] **ROOM-02**: System verhindert Doppelbelegung von Räumen (Hard Constraint)
- [ ] **ROOM-03**: Lehrer kann freie Räume für Ad-hoc-Nutzung buchen
- [ ] **ROOM-04**: Admin kann Ressourcen verwalten (Tablet-Wägen, Laborgeräte, Beamer)
- [ ] **ROOM-05**: Raumänderungen propagieren sofort in alle Stundenplan-Ansichten

### Communication

- [ ] **COMM-01**: Lehrer/Admin kann Nachrichten an Klasse, Jahrgang oder gesamte Schule senden
- [ ] **COMM-02**: Lehrer und Eltern können private Einzelnachrichten austauschen
- [ ] **COMM-03**: Empfänger sehen Lesebestätigungen (wer hat gelesen, wer nicht)
- [ ] **COMM-04**: Nachrichten unterstützen Dateianhänge (Fotos, PDFs, Dokumente)
- [ ] **COMM-05**: Eltern können Abwesenheit des Kindes per Nachricht melden
- [ ] **COMM-06**: Lehrer kann Umfragen/Abstimmungen erstellen (Veranstaltungsplanung, Feedback)

### RBAC & Security

- [x] **AUTH-01**: System unterstützt 5 Standardrollen: Administrator, Schulleitung, Lehrer, Eltern, Schüler
- [x] **AUTH-02**: Zugriffsrechte sind pro Modul feingranular konfigurierbar
- [x] **AUTH-03**: Datensichtbarkeit ist rollenbasiert eingeschränkt (Eltern sehen nur eigenes Kind, Lehrer nur eigene Klassen)
- [x] **AUTH-04**: System führt Audit-Trail über alle Datenzugriffe und -änderungen
- [x] **AUTH-05**: Authentifizierung über Keycloak (OIDC/SAML, LDAP/AD-Anbindung)
- [x] **AUTH-06**: Session bleibt über Browser-Refresh bestehen

### DSGVO Compliance

- [ ] **DSGVO-01**: System trackt Einwilligungen pro Datenverarbeitungszweck
- [ ] **DSGVO-02**: Personenbezogene Daten können vollständig gelöscht werden (Recht auf Vergessenwerden)
- [ ] **DSGVO-03**: Nutzer können Export aller eigenen Daten anfordern (Art. 15 DSGVO)
- [ ] **DSGVO-04**: Datenbank-Felder mit sensiblen Daten sind verschlüsselt (at rest + in transit)
- [ ] **DSGVO-05**: Automatisierte Aufbewahrungsfristen mit konfigurierbarer Ablaufzeit
- [ ] **DSGVO-06**: System liefert DSFA-Template und Verarbeitungsverzeichnis-Export

### Mobile Access

- [ ] **MOBILE-01**: Alle Features sind über responsive Web-App auf Smartphone/Tablet nutzbar
- [ ] **MOBILE-02**: Push-Notifications für Stundenplanänderungen, neue Nachrichten, Abwesenheits-Alerts
- [ ] **MOBILE-03**: Heutiger Stundenplan ist offline einsehbar (PWA Cache)

### Data Import/Export

- [ ] **IMPORT-01**: Admin kann Daten aus Untis XML-Format importieren (Lehrer, Klassen, Räume, Stundenpläne)
- [ ] **IMPORT-02**: Admin kann CSV-Dateien importieren (Schülerlisten, Lehrerlisten, Raumlisten)
- [ ] **IMPORT-03**: System bietet iCal/ICS-Export für persönliche Kalender
- [ ] **IMPORT-04**: API ermöglicht Datenanbindung an externe SIS-Systeme

### Homework & Exams

- [ ] **HW-01**: Lehrer kann Hausaufgaben einer Unterrichtsstunde zuordnen (sichtbar im Stundenplan)
- [ ] **HW-02**: Lehrer kann Prüfungstermine eintragen mit Kollisionserkennung (keine 2 Prüfungen am selben Tag für eine Klasse)
- [ ] **HW-03**: Schüler/Eltern sehen Hausaufgaben und Prüfungen im Stundenplan und per Push-Notification

### Open API

- [x] **API-01**: Alle Funktionen sind über dokumentierte REST-API verfügbar
- [x] **API-02**: API-Dokumentation wird automatisch generiert (OpenAPI/Swagger)
- [x] **API-03**: API unterstützt Token-basierte Authentifizierung (OAuth2/OIDC)

### Deployment

- [x] **DEPLOY-01**: System lässt sich mit einem Befehl via Docker Compose starten
- [ ] **DEPLOY-02**: Backup/Restore-Skripte sind dokumentiert und getestet
- [ ] **DEPLOY-03**: System unterstützt Rolling Updates ohne Downtime

## v2 Requirements

### Plugin System

- **PLUGIN-01**: Offene Konnektor-API mit versioniertem SDK
- **PLUGIN-02**: Plugin-Registry für Community-Erweiterungen
- **PLUGIN-03**: Kalender-Sync-Konnektoren (Google Calendar, Outlook)
- **PLUGIN-04**: MS Teams / Google Workspace Integration
- **PLUGIN-05**: Plugin-Sandboxing für Sicherheit und DSGVO

### Communication Enhancements

- **COMM-07**: Mehrsprachige Nachrichtenübersetzung (DeepL-Integration)
- **COMM-08**: Elternsprechtag Online-Buchungssystem

### Analytics

- **ANALYTICS-01**: Anwesenheits-Dashboard mit Trends und Risiko-Schülern
- **ANALYTICS-02**: Vertretungsanalyse (Fairness, Ausfallraten)
- **ANALYTICS-03**: Raumauslastungsberichte
- **ANALYTICS-04**: Lehrer-Workload-Analyse
- **ANALYTICS-05**: Exportierbare Reports (PDF/CSV)

### Advanced Features

- **ADV-01**: Kurswahl-System für Oberstufe (AHS/BHS)
- **ADV-02**: Kubernetes Helm Charts für größere Deployments
- **ADV-03**: Multi-Tenant-Option für gehostete Variante

## Out of Scope

| Feature | Reason |
|---------|--------|
| E-Learning / LMS | Moodle-Territorium — per Konnektor anbinden, nicht nachbauen |
| Schüler-Informationssystem (SIS) | Separate Produktkategorie, Sokrates ist Standard — per API anbinden |
| Finanz-/Budgetverwaltung | Nicht Kernkompetenz, eigener Problemraum |
| Video-Conferencing Engine | Über Konnektoren zu Teams/Zoom/Jitsi lösen |
| Zeugniserstellung | Per-Bundesland unterschiedlich, SIS-Territorium — Noten per API exportieren |
| Schul-Website / CMS | WordPress/Typo3 existieren — per RSS/iCal-Feed anbinden |
| Verhaltens-/Disziplinsystem | Kulturell sensitiv, variiert stark — Notizen im Klassenbuch reichen |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FOUND-01 | Phase 1 | Complete |
| FOUND-02 | Phase 2 | Pending |
| FOUND-03 | Phase 2 | Pending |
| FOUND-04 | Phase 2 | Pending |
| FOUND-05 | Phase 2 | Pending |
| TIME-01 | Phase 3 | Pending |
| TIME-02 | Phase 3 | Pending |
| TIME-03 | Phase 3 | Pending |
| TIME-04 | Phase 3 | Pending |
| TIME-05 | Phase 3 | Pending |
| TIME-06 | Phase 3 | Pending |
| TIME-07 | Phase 3 | Pending |
| TIME-08 | Phase 4 | Pending |
| VIEW-01 | Phase 4 | Pending |
| VIEW-02 | Phase 4 | Pending |
| VIEW-03 | Phase 4 | Pending |
| VIEW-04 | Phase 4 | Pending |
| VIEW-05 | Phase 4 | Pending |
| VIEW-06 | Phase 4 | Pending |
| BOOK-01 | Phase 5 | Pending |
| BOOK-02 | Phase 5 | Pending |
| BOOK-03 | Phase 5 | Pending |
| BOOK-04 | Phase 5 | Pending |
| BOOK-05 | Phase 5 | Pending |
| BOOK-06 | Phase 5 | Pending |
| BOOK-07 | Phase 5 | Pending |
| SUBST-01 | Phase 6 | Pending |
| SUBST-02 | Phase 6 | Pending |
| SUBST-03 | Phase 6 | Pending |
| SUBST-04 | Phase 6 | Pending |
| SUBST-05 | Phase 6 | Pending |
| SUBST-06 | Phase 6 | Pending |
| ROOM-01 | Phase 3 | Pending |
| ROOM-02 | Phase 3 | Pending |
| ROOM-03 | Phase 4 | Pending |
| ROOM-04 | Phase 4 | Pending |
| ROOM-05 | Phase 4 | Pending |
| COMM-01 | Phase 7 | Pending |
| COMM-02 | Phase 7 | Pending |
| COMM-03 | Phase 7 | Pending |
| COMM-04 | Phase 7 | Pending |
| COMM-05 | Phase 7 | Pending |
| COMM-06 | Phase 7 | Pending |
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| AUTH-06 | Phase 1 | Complete |
| DSGVO-01 | Phase 2 | Pending |
| DSGVO-02 | Phase 2 | Pending |
| DSGVO-03 | Phase 2 | Pending |
| DSGVO-04 | Phase 2 | Pending |
| DSGVO-05 | Phase 2 | Pending |
| DSGVO-06 | Phase 2 | Pending |
| MOBILE-01 | Phase 9 | Pending |
| MOBILE-02 | Phase 9 | Pending |
| MOBILE-03 | Phase 9 | Pending |
| IMPORT-01 | Phase 8 | Pending |
| IMPORT-02 | Phase 8 | Pending |
| IMPORT-03 | Phase 8 | Pending |
| IMPORT-04 | Phase 8 | Pending |
| HW-01 | Phase 8 | Pending |
| HW-02 | Phase 8 | Pending |
| HW-03 | Phase 8 | Pending |
| API-01 | Phase 1 | Complete |
| API-02 | Phase 1 | Complete |
| API-03 | Phase 1 | Complete |
| DEPLOY-01 | Phase 1 | Complete |
| DEPLOY-02 | Phase 9 | Pending |
| DEPLOY-03 | Phase 9 | Pending |

**Coverage:**
- v1 requirements: 71 total
- Mapped to phases: 71
- Unmapped: 0

---
*Requirements defined: 2026-03-29*
*Last updated: 2026-03-29 after roadmap creation*
