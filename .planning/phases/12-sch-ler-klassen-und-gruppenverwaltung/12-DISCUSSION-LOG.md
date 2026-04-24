# Phase 12: Schüler-, Klassen- und Gruppenverwaltung - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-24
**Phase:** 12-sch-ler-klassen-und-gruppenverwaltung
**Mode:** discuss (interactive, recommended-first options)
**Areas discussed:** Student-UX + Umzug + Eltern, Class-UX + Stundentafel + SUBJECT-04, Gruppen-Regeln + Overrides, Delivery + Gap-Fixes + Plan-Breakdown

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Student-UX + Umzug + Eltern | Liste-Layout, Dialog-vs-Detail-Page, Eltern-Verknüpfung, Archivierung, Klassen-Umzug | ✓ |
| Class-UX + Stundentafel + SUBJECT-04 | Klassenliste, Detail-Tabs, Klassenvorstand-Picker, Apply-Template-Flow, Wochenstunden-Editor | ✓ |
| Gruppen-Regeln + Overrides (CLASS-04/05) | Rule-Builder, Apply-Trigger, Manuelle Overrides, Auto/Manual-Badge | ✓ |
| Delivery + Gap-Fixes + Plan-Breakdown | Backend-Gaps, E2E-Scope, Plan-Anzahl | ✓ |

**User's choice:** All 4 areas selected for discussion.

---

## Area 1 — Student-UX + Umzug + Eltern

### Q1.1 Schülerliste-Layout auf `/admin/students`?

| Option | Description | Selected |
|--------|-------------|----------|
| Dense Table mit Filter-Bar (Recommended) | Spalten: Nachname / Vorname / Klasse / Status / Aktionen; Filter-Bar; skaliert auf 500+; Phase-11-konsistent | ✓ |
| Karten-Grid mit Avatar | Initialen-Avatar + Name + Klasse-Badge; bei >100 unübersichtlich | |
| Gruppiert nach Klasse (Accordion) | Klasse-1A > Liste etc.; gut für kleine VS, schlechter für Maturaklassen | |

**User's choice:** Dense Table mit Filter-Bar (Recommended) → **D-01**

### Q1.2 Schüler anlegen/editieren: Detail-Page oder Dialog?

| Option | Description | Selected |
|--------|-------------|----------|
| Detail-Page mit Tabs (Recommended) | `/admin/students/$id` mit Stammdaten/Eltern/Gruppen; Phase-11-Teacher-Mirror | ✓ |
| Dialog für Stammdaten, Inline-Sections für Relations | Stammdaten-Dialog, Relations separat; Abweichung vom Phase-11-Pattern | |

**User's choice:** Detail-Page mit Tabs (Recommended) → **D-02**

### Q1.3 Eltern-Verknüpfungs-UX (Backend-Gap: POST /students/:id/parents fehlt heute)?

| Option | Description | Selected |
|--------|-------------|----------|
| Search-by-Email + Inline-Create-Fallback (Recommended) | Email-Autocomplete → Match-Confirm oder Inline-Parent-Create; Phase-11-Keycloak-Pattern | ✓ |
| Nur Inline-Create | Immer neuer Parent; Geschwister-Duplikate; DSGVO-schlecht | |
| Zwei-Schritt: Parent-CRUD-Surface zuerst | Separate /admin/parents-Seite + Dropdown-Picker; mehr UI-Fläche | |

**User's choice:** Search-by-Email + Inline-Create-Fallback (Recommended) → **D-03**

### Q1.4 STUDENT-04 Archivierung?

| Option | Description | Selected |
|--------|-------------|----------|
| Soft-Delete-Flag (isArchived + archivedAt) (Recommended) | Neues Schema-Feld; Archiv-Tab + Filter; referenziell intakt; DSGVO-kompatibel | ✓ |
| ClassId=null + Semantik umdeuten | Kein Schema-Change; schlecht: verwechselbar mit "neu eingeschrieben" | |

**User's choice:** Soft-Delete-Flag (isArchived + archivedAt) (Recommended) → **D-04**

### Q1.5 STUDENT-03 Klassen-Umzug?

| Option | Description | Selected |
|--------|-------------|----------|
| Row-Action Move + Multi-Select Bulk-Move (Recommended) | Single-Dialog + Multi-Select-Toolbar-Button; Klassenbuch-Historie bleibt intakt | ✓ |
| Nur Row-Action Single-Move | MVP-Minimum; ungeeignet für Jahres-Rollover | |
| Drag-between-Classes | Split-View DnD; mobile-375 unkompatibel; komplexe Impl | |
| Jahres-Rollover-Wizard | Batch-Rollover ganze Klassen; Scope-Creep, eigene Phase | |

**User's choice:** Row-Action Move + Multi-Select Bulk-Move (Recommended) → **D-05**

---

## Area 2 — Class-UX + Stundentafel + SUBJECT-04

### Q2.1 Klassenliste-Layout auf `/admin/classes`?

| Option | Description | Selected |
|--------|-------------|----------|
| Dense Table mit Year-Level-Filter (Recommended) | Spalten + Filter-Bar (Schuljahr/Stufe/Suche); Click→Detail-Page; konsistent | ✓ |
| Gruppiert nach Jahrgangsstufe (Accordion) | Hilfreich für durchgestaffelte Schulen; bei >15 Klassen weniger dicht | |
| Zeitstrahl-Matrix (Schuljahr × Stufe) | Matrix-Grid; komplex; Dashboard-Phase 16 | |

**User's choice:** Dense Table mit Year-Level-Filter (Recommended) → **D-06**

### Q2.2 Class-Detail-Page-Tabs?

| Option | Description | Selected |
|--------|-------------|----------|
| 4 Tabs: Stammdaten \| Stundentafel \| Schüler \| Gruppen (Recommended) | Phase-11-Teacher-4-Tab-Mirror; Pro-Tab-Save | ✓ |
| 3 Tabs: Stammdaten+Stundentafel zusammen \| Schüler \| Gruppen | Ein Tab wird sehr lang; mobile scroll | |
| 2 Haupttabs + Drill-downs: Konfiguration \| Zuordnungen | Konzeptionell sauber; unüblich, kognitive Last | |

**User's choice:** 4 Tabs (Recommended) → **D-07**

### Q2.3 Apply-Stundentafel + SUBJECT-04 Wochenstunden?

| Option | Description | Selected |
|--------|-------------|----------|
| Apply-Template → Preview → Editable-Table (Recommended) | Template-Dialog → Confirm → editable; isCustomized auto-set; Reset-Button | ✓ |
| Read-only Vorlage + separater Override-Section | ClassSubject weeklyHours ist required; Datenmodell-Konflikt | |
| Wochenstunden-Editor auf /admin/subjects | Matrix Fach×Stufe; widerspricht "pro Klasse anpassen"-Requirement | |

**User's choice:** Apply-Template → Preview → Editable-Table (Recommended) → **D-09**

### Q2.4 Klassenvorstand-Zuweisung?

| Option | Description | Selected |
|--------|-------------|----------|
| Autocomplete-Search im Stammdaten-Tab (Recommended) | Command-Popover, Nachname-Suche, skaliert; Phase 11 D-08 Pattern | ✓ |
| Dropdown mit allen Teachers | Bei >50 Teachers unübersichtlich | |
| 'Aus Klasse wählen' + Fallback-Search | Smart aber UX-Annahme greift nicht immer | |

**User's choice:** Autocomplete-Search im Stammdaten-Tab (Recommended) → **D-08**

---

## Area 3 — Gruppen-Regeln + Manuelle Overrides (CLASS-04/05)

### Q3.1 CLASS-05 Gruppen-Regeln UI?

| Option | Description | Selected |
|--------|-------------|----------|
| Rule-Builder-Table im Gruppen-Tab (Recommended) | Rules-Tabelle + Apply-Button + Dry-Run-Preview vor Confirm | ✓ |
| Auto-Apply bei Rule-Änderung | Weniger Klicks, aber keine Preview, gefährlich | |
| Wizard pro Rule-Typ | 4 Wizards, Overkill für MVP | |

**User's choice:** Rule-Builder-Table im Gruppen-Tab (Recommended) → **D-10**

### Q3.2 CLASS-04 Manuelle Overrides?

| Option | Description | Selected |
|--------|-------------|----------|
| Per-Gruppe Panel mit Member-Liste + Add/Remove + Badge (Recommended) | Expandierbare Gruppen-Cards; Auto/Manual-Badge; persistente Exclusions deferred | ✓ |
| Matrix Schüler × Gruppen Toggle-Zellen | 150+ Zellen bei mittlerer Klasse, mobile unbedienbar | |
| Pro-Schüler-Ansicht (Student-Detail-Tab) | Schlecht für Bulk; Lehrer-Perspektive verloren | |

**User's choice:** Per-Gruppe Panel mit Member-Liste + Badge (Recommended) → **D-11**

### Q3.3 Rule-Persistenz (Backend-Gap)?

| Option | Description | Selected |
|--------|-------------|----------|
| Neues Prisma-Modell GroupDerivationRule pro Klasse (Recommended) | Schema-Migration; Rules überleben Jahres-Rollover; audit-fähig | ✓ |
| Rules als Config-JSON auf SchoolClass | Einfacher, aber schlechter queryable | |
| Rules nicht persistent | Admin muss jedes Mal neu eingeben; Rollover-schlecht | |

**User's choice:** Neues Prisma-Modell GroupDerivationRule (Recommended) → **D-12**

---

## Area 4 — Delivery + Gap-Fixes + Plan-Breakdown

### Q4.1 Backend-Gap-Scope?

| Option | Description | Selected |
|--------|-------------|----------|
| Alle 4 Gaps in Phase 12 (Recommended) | Parent-Surface + Student.isArchived + Student/Class-Orphan-Guards + GroupDerivationRule | ✓ |
| Nur Parent + Orphan-Guards, Rest in Phase 13/15 | Success-Criteria nur halb erfüllt | |
| Volle Phase 12 + Data-Migration für Bestand | Overengineering (keine Prod-Daten) | |

**User's choice:** Alle 4 Gaps in Phase 12 (Recommended) → **D-13**

### Q4.2 E2E-Playwright-Coverage?

| Option | Description | Selected |
|--------|-------------|----------|
| Phase-11-parity: 8+ Specs (happy + error) × (desktop + mobile-375) (Recommended) | ~11 Specs; SILENT-4XX + Prefix-Isolation; reuse Phase 10.3 Harness | ✓ |
| Reduzierter Scope: nur Happy-Path desktop + Mobile-Audit | Silent-4xx-Invariante ohne Error-E2E nicht prüfbar; Risiko-Rückschritt | |
| Maximal-Scope: + Parent-Life-Cycle + Group-Rule-Application + Move-Bulk | 14-15 Specs; Beste Coverage, aber Spec-Engineering-Overhead | |

**User's choice:** Phase-11-parity ~11 Specs (Recommended) → **D-14**

### Q4.3 Plan-Breakdown?

| Option | Description | Selected |
|--------|-------------|----------|
| 3 bundled plans (Phase-11-Pattern) (Recommended) | 12-01 Student+Parent, 12-02 Class+Stundentafel+Gruppen, 12-03 E2E | ✓ |
| 5 plans finer-grained | Mehr Wave-Parallelism, mehr Plan-Seam-Overhead | |
| 4 plans (Student + Class + Gruppen separat + E2E) | Zwischenpunkt; Gruppen eng verflochten mit Class-Detail | |

**User's choice:** 3 bundled plans (Recommended) → **D-16**

---

## Claude's Discretion (User deferred)

Sidebar-Position der neuen Einträge, shadcn/ui Primitives-Wahl, Icon-Wahl, Spalten-Breiten/Sortier-Defaults, Loading-Skeleton-Design, Empty-State-Illustrations, Preview-Dialog-Layout-Styling, Mobile-Adaption des Stundentafel-Editors, Bulk-Move-Dialog-Selection-Preview-Styling, Solver-Re-Run-Banner-Text, Audit-Log-Action-Types, CSV-Export auf Schüler-Liste.

## Deferred Ideas (out of Phase 12 scope)

Jahres-Rollover-Wizard, persistente Rule-Exclusions, Standalone /admin/parents-Surface, Matrix-Toggle-View für Overrides, Drag-between-Classes, SVN-Crypto-Re-Review, CSV-Export, Bulk-Archivierung, Student-Kalender-Export, Eltern-Portal-Invite-Flow.
