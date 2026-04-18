# Phase 10: Schulstammdaten & Zeitraster - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md -- this log preserves the alternatives considered.

**Date:** 2026-04-18
**Phase:** 10-schulstammdaten-zeitraster
**Areas discussed:** Admin-Onboarding-Flow, A/B-Wochen-Architektur, Schuljahr-Semantik, Zeitraster-Editor-UX, Kontakt-Gap

---

## Admin-Onboarding-Flow

### Shell-Shape

| Option | Description | Selected |
|--------|-------------|----------|
| Detail-Page mit Sektions-Tabs | Eine Route `/admin/school/settings` mit 4 horizontalen Tabs (Stammdaten/Zeitraster/Schuljahr/Optionen); unabhaengig speicherbar; Empty-State inline | ✓ |
| Wizard-Stepper (First-Run only) | Dedizierter Stepper nur fuer die Erst-Anlage; danach Switch auf Settings-Page. Zwei UI-Shapes zu pflegen | |
| Lange einseitige Detail-Page | Alle 4 Bereiche untereinander als Cards; sehr lang auf Mobile | |
| Getrennte Unter-Routen pro Ressource | `/admin/school`, `/admin/school/time-grid`, etc. -- mehr URL-Surface, mehr Navigations-Klicks | |

**User's choice:** Detail-Page mit Sektions-Tabs
**Notes:** Pattern wird fuer alle v1.1 Admin-Detail-Screens uebernommen (Phasen 11-16).

### Save-Model

| Option | Description | Selected |
|--------|-------------|----------|
| Pro-Tab speichern | Jeder Tab eigenes Speichern; Unsaved-Changes-Dialog bei Tab-Wechsel | ✓ |
| Globaler Dirty-State + Footer-Save | Alle Tabs in einem Batch-Call | |
| Auto-Save on Blur | Ohne Speichern-Button; Notion-Style | |

**User's choice:** Pro-Tab speichern

### Empty-Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Inline Setup-Card statt leerer Tabs | Gleiche Settings-Page mit CTA "Neue Schule anlegen" im ersten Tab; nach Create sind die anderen aktiviert | ✓ |
| Redirect zu Create-Form dann zur Detail-Page | Zwei Routen (`/new` vs. `/settings`) | |
| Disable Phase 10 bis Seed-Schule vorhanden | Annahme: Phase-1-Seed existiert immer | |

**User's choice:** Inline Setup-Card

---

## A/B-Wochen-Architektur

### Flag-Verortung

| Option | Description | Selected |
|--------|-------------|----------|
| Neue Spalte `School.abWeekEnabled` + Default-on-Run | Migration; Toggle aendert nur Default fuer neue Runs; keine Kaskade | ✓ |
| Neue Spalte + Sofort-Kaskade in aktiven Run | Konsistent mit REQUIREMENTS-Wortlaut "sofort", aber riskant | |
| Kein Schul-Flag, nur Per-Run | Phase 10 liefert das Feature nicht; verschoben auf Phase 14 | |
| Schul-Flag ohne Run-Default | Entkoppelt UI und Solver, potentiell inkonsistent | |

**User's choice:** Neue Spalte `School.abWeekEnabled` + Default-on-Run
**Notes:** Bestehendes `TimetableRun.abWeekEnabled` bleibt als Per-Run-Override in Phase 14.

### UI-Hinweis

| Option | Description | Selected |
|--------|-------------|----------|
| Banner mit aktivem Run-Status | Helper-Text "Aktueller Stundenplan: A/B aktiv/inaktiv" + Banner "Gilt ab naechstem Lauf" | ✓ |
| Toggle mit Warn-Dialog | Explizite Bestaetigung bei jedem Toggle | |
| Stiller Toggle + Tooltip | Minimal, aber leicht uebersehen | |

**User's choice:** Banner mit aktivem Run-Status

---

## Schuljahr-Semantik

### Year-Modell

| Option | Description | Selected |
|--------|-------------|----------|
| Multi-Year + isActive-Flag | Schema-Migration: `@unique` entfernen, isActive + partial unique index; UI zeigt Liste + Aktiv-Badge | ✓ |
| Single Year, nur editierbar | Kein Schema-Change; Sommeruebergang verliert Historie | |
| Multi-Year via Archivierung | isArchived statt isActive | |

**User's choice:** Multi-Year + isActive-Flag

### Aktiv-Swap

| Option | Description | Selected |
|--------|-------------|----------|
| Swap ohne Kaskade + Info-Banner | isActive wird gesetzt; bestehende TimetableRuns/Klassenbuch-Eintraege bleiben intakt | ✓ |
| Swap mit 2-stufiger Bestaetigung + Audit | Bewusste jaehrliche Handlung; mehr Reibung | |
| Kein explizites Aktiv-Setzen | Auto via Date-Overlap; keine Kontrolle | |

**User's choice:** Swap ohne Kaskade + Info-Banner

### Loeschung

| Option | Description | Selected |
|--------|-------------|----------|
| Nur leere, nicht-aktive Jahre | Orphan-Schutz analog Phase-11 SUBJECT-05 | ✓ |
| Archivieren statt Loeschen | Zusaetzliches isArchived-Flag | |
| Loeschen mit Cascade-Preview | Dialog zeigt alle mitgeloeschten Entitaeten | |

**User's choice:** Nur leere, nicht-aktive Jahre

---

## Zeitraster-Editor-UX

### Editor-Form

| Option | Description | Selected |
|--------|-------------|----------|
| Editierbare Tabelle mit Inline-Inputs | Dense table, Drag-Reorder, Add/Delete-Row, Template-Reload-Button | ✓ |
| Visual Timeline mit Drag-Handles | Horizontale Timeline mit Bloecken; mobile schwierig | |
| Template-First Wizard, dann Table-Edit | Pflicht-Template-Pick vorab | |
| Formular pro Periode + Modal-Edit | Cards + Modal; langsam bei Bulk-Edit | |

**User's choice:** Editierbare Tabelle mit Inline-Inputs

### Destructive-Edit

| Option | Description | Selected |
|--------|-------------|----------|
| Warn-Dialog + Speichern erlauben | Dialog: "X Stundenplaene betroffen" + [Speichern / Speichern+Re-Solve / Abbrechen] | ✓ |
| Blockieren bis Runs archiviert | Zu restriktiv fuer Label-Korrekturen | |
| Silent Save | Gefaehrlich, keine Warnung | |

**User's choice:** Warn-Dialog + Speichern erlauben

### Schultage-Verortung

| Option | Description | Selected |
|--------|-------------|----------|
| Im Zeitraster-Tab als Checkbox-Row | Wochentage ueber der Perioden-Tabelle | ✓ |
| Im Optionen-Tab zusammen mit A/B | Weniger intuitiv | |
| Im Stammdaten-Tab | Weniger logisch | |

**User's choice:** Im Zeitraster-Tab als Wochentage-Checkbox-Row

### Validation

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid: Client sofort, Server final | Zod in packages/shared + class-validator; beste UX + Defense-in-depth | ✓ |
| Nur Server-Side | Einfacher, aber schlechte UX | |
| Nur Client-Side | Unsicher, DSGVO-inakzeptabel | |

**User's choice:** Hybrid

---

## Kontakt-Gap

| Option | Description | Selected |
|--------|-------------|----------|
| Zusaetzliche Schema-Migration (School.contactEmail/Phone) | Erfuellt SCHOOL-01 buchstabengetreu | |
| Nur Adresse, kein Extra-Kontakt | Freitext im address-Feld; unstrukturiert | |
| In Phase 13 (User-Verwaltung) verschieben | Kontakt via "Hauptansprechpartner"-User-Relation | ✓ |

**User's choice:** In Phase 13 verschieben
**Notes:** SCHOOL-01 wird in Phase 10 mit Name/Schultyp/Adresse abgedeckt; strukturierter Kontakt folgt in Phase 13.

---

## Claude's Discretion

- Sidebar-Eintrag-Position im AppSidebar
- Breadcrumbs/Page-Header-Design
- React Hook Form + Zod-Resolver Wiring pro Tab
- Dialog-Komponenten-Wahl (shadcn/ui Dialog)
- Icon-Auswahl aus lucide-react
- Ferien/Autonome-Tage-Sub-UI-Komponente
- Exakte Orphan-Schutz-Query fuer Schuljahr-Loeschung
- Dashboard-Integration-Hooks (Phase 16 konsumiert nur Read-APIs)
- Empty-State-Illustrations
- Sticky-Save-Button auf Mobile
- useSchoolContext-Store-Erweiterung (falls benoetigt)

## Deferred Ideas

- School.contactEmail/contactPhone → Phase 13
- Stundentafel-Vorlagen-Picker pro Klasse → Phase 11/12
- Constraint-Weight-Tuning und Run-Level-A/B-Override → Phase 14
- Dashboard-Setup-Checkliste selbst → Phase 16
- Archivieren alter Schuljahre → spaeter, nur falls noetig
- Explicit Audit-Log-Eintrag fuer Jahr-Swap → Phase 15
