# Phase 14: Solver-Tuning - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-25
**Phase:** 14-solver-tuning
**Areas discussed:** Information Architecture, ConstraintWeightOverride Persistenz (GAP-A), Constraint-Template Editor UX (GAP-B/C), Validierung & Konflikt-Handling

---

## Gray Area Selection

| Option | Description | Selected |
|--------|-------------|----------|
| Information Architecture | Tabs vs Routes; Page-Position; Sidebar-Gruppe | ✓ |
| ConstraintWeightOverride Persistenz (GAP-A) | Schema-Design; Solver-Flow; Migration-Strategy | ✓ |
| Constraint-Template Editor UX (GAP-B/C) | Generic vs typed Forms; Hard/Soft-Visualisierung | ✓ |
| Validierung & Konflikt-Handling | Cross-Reference-Validation; Doppel-Restriktionen; Pre-Solve-Preview | ✓ |

**User's choice:** Alle 4 Areas ausgewählt (multiSelect: alle).

---

## Area 1: Information Architecture

### Q1.1 — Wo lebt die Solver-Tuning-Page in der Routing-Struktur?

| Option | Description | Selected |
|--------|-------------|----------|
| /admin/solver-tuning (neue Route, Tabs-Page) (Recommended) | Eigene Sub-Route + 3-4 Tabs; bestehende /admin/solver bleibt | ✓ |
| /admin/solver erweitert um Tabs | Konsolidierung; Generator + Tuning-Tabs nebeneinander | |
| 4 separate Routen unter /admin/solver-tuning/* | Deep-Link-freundlich; 4 Sidebar-Einträge oder Sub-Sidebar | |

**User's choice:** /admin/solver-tuning (neue Route, Tabs-Page) — Recommended.

### Q1.2 — Welche Tab-Struktur innerhalb der Solver-Tuning-Page?

| Option | Description | Selected |
|--------|-------------|----------|
| 4 Tabs: Übersicht + Weights + Class-Restrictions + Subject-Preferences (Recommended) | Tab 1 Read-only Hard/Soft, Tab 2 Sliders, Tab 3 NO_LESSONS_AFTER, Tab 4 SUBJECT_MORNING+SUBJECT_PREFERRED_SLOT; BLOCK_TIMESLOT out-of-scope | ✓ |
| 3 Tabs: Übersicht + Weights + Restriktionen (Templates konsolidiert) | Generic dropdown-templateType in einem Tab | |
| 5 Tabs: + Lehrer-Sperren | Doppelte Surface mit TEACHER-04 | |

**User's choice:** 4 Tabs — Recommended.

### Q1.3 — Sidebar-Eintrag-Position und Role-Gating?

| Option | Description | Selected |
|--------|-------------|----------|
| Gruppe 'Solver & Operations', roles: ['admin'] (Recommended) | Existing Gruppe; SlidersHorizontal-Icon; Admin-only (strikter als Personal) | ✓ |
| Gruppe 'Solver & Operations', roles: ['admin', 'schulleitung'] | Schulleitung darf auch tunen | |
| Neue Gruppe 'Konfiguration' | Eigene Gruppe statt unter Solver | |

**User's choice:** Solver & Operations, admin-only — Recommended.

### Q1.4 — Mobile-Adaption der Tabs bei 375px?

| Option | Description | Selected |
|--------|-------------|----------|
| Horizontal scrollbare Tab-Bar (Phase 13 Pattern) (Recommended) | overflow-x-auto, snappt zum Anfang; 44px Touch-Targets | ✓ |
| Dropdown-Tab-Selector auf Mobile | Tabs werden zu select-Dropdown <md | |
| Akkordeon-Layout | Collapsible-Accordions statt Tabs auf Mobile | |

**User's choice:** Horizontal scrollbare Tab-Bar — Recommended.

---

## Area 2: ConstraintWeightOverride Persistenz (GAP-A)

### Q2.1 — Wie sieht das neue Prisma-Modell aus?

| Option | Description | Selected |
|--------|-------------|----------|
| Tall-Format: schoolId + constraintName + weight (Recommended) | 1 Row pro [schoolId, constraintName]; @@unique; zukunftssicher | ✓ |
| Wide-Format: schoolId + weights Json | Atomic-Update einfacher, Audit-Diff schwerer | |
| Per-Solve-Run Snapshot only (kein Modell) | Verletzt REQ-03 'pro Schule setzen' | |

**User's choice:** Tall-Format — Recommended.

### Q2.2 — Wie fliessen Weights bei einem Solve-Run zusammen?

| Option | Description | Selected |
|--------|-------------|----------|
| Schul-Defaults > Per-Run-Override > Hardcoded-Default (Recommended) | DB-Lookup → DTO-Override on top → Hardcoded-Fallback | ✓ |
| Schul-Defaults ersetzen Hardcoded komplett, Per-Run-DTO entfällt | Klarer aber unflexibler; Breaking-Change | |
| Schul-Defaults + Per-Run-DTO additiv (sum) | Mathematisch falsch | |

**User's choice:** 3-stufige Resolution — Recommended.

### Q2.3 — Wie wird der Weight-Editor präsentiert?

| Option | Description | Selected |
|--------|-------------|----------|
| Slider 0–100 + Number-Input + Reset-to-Default-Button pro Row (Recommended) | 8 Rows; bidirektional sync Slider↔Number; Default-Hint | ✓ |
| Nur Number-Inputs (kein Slider) | Kompakter; Slider visualisiert relative Stärke besser | |
| Drag-and-Drop Prioritäts-Ranking | Out of scope | |

**User's choice:** Slider + Number + Reset — Recommended.

### Q2.4 — Wie wird die Änderungs-Historie nachverfolgt?

| Option | Description | Selected |
|--------|-------------|----------|
| Bestehender AuditInterceptor + Snapshot in TimetableRun (Recommended) | Subject 'constraint-weight-override'; constraintConfig-Json pro Run; existing Routes für Vergleich | ✓ |
| Dedizierte Weight-Change-History-Tabelle | Übertrieben; Audit-Log deckt das ab | |
| Inline Diff-Anzeige im Weight-Tab über letzte 5 Runs | Phase-16-Dashboard-Material | |

**User's choice:** Bestehender Audit + TimetableRun-Snapshot — Recommended.

---

## Area 3: Constraint-Template Editor UX (GAP-B + GAP-C)

### Q3.1 — Wie wird der params-Editor pro templateType realisiert?

| Option | Description | Selected |
|--------|-------------|----------|
| Typed Forms pro templateType mit Discriminated Union (Recommended) | RHF + Zod-Discriminated-Union; 4 Form-Components | ✓ |
| Generischer Json-Editor mit Schema-Hint | Monaco/Textarea + Json-Validation; zu technisch für Schul-Admins | |
| Dynamisches Form aus Json-Schema generieren | Übertrieben für 4 Types | |

**User's choice:** Typed Forms + Discriminated Union — Recommended.

### Q3.2 — Wie wird Hard/Soft-Unterscheidung realisiert?

| Option | Description | Selected |
|--------|-------------|----------|
| Read-only-Liste der 14 Java-Constraints mit Badge (Recommended) | Statisches CONSTRAINT_CATALOG; 6 Hard rot + 8 Soft blau; Soft hat Deep-Link zu Tab Weights | ✓ |
| Hard im Akkordeon, Soft mit Inline-Edit | Konsolidiert zu 3 Tabs; bricht 4-Tab-Struktur | |
| Nur Soft im Tab 1, Hard wird unsichtbar | Verletzt REQ-01 | |

**User's choice:** Read-only 14er Liste — Recommended.

### Q3.3 — Wie wird der Tab 'Klassen-Sperrzeiten' (NO_LESSONS_AFTER) gestaltet?

| Option | Description | Selected |
|--------|-------------|----------|
| Tabelle mit Klassen-Spalte + maxPeriod + Aktiv-Toggle + Add-Row Pattern (Recommended) | Tabellen-CRUD, Add-Dialog mit Klassen-Autocomplete + maxPeriod-NumberInput; Mehrfach-Einträge erlaubt | ✓ |
| Klassen-Liste mit inline-period-editor pro Klasse | 1 Eintrag pro Klasse; verbietet Mehrfach-Restriktionen | |
| Visueller Wochenraster-Editor | Out of scope von 'NO_LESSONS_AFTER' | |

**User's choice:** Tabelle + Add-Row — Recommended.

### Q3.4 — Wie wird Tab 'Fach-Präferenzen' (SUBJECT_MORNING + SUBJECT_PREFERRED_SLOT) gestaltet?

| Option | Description | Selected |
|--------|-------------|----------|
| Single-Tab mit templateType-Switch Sub-Tabs (Recommended) | 2 Sub-Tabs Vormittags-Präferenzen + Bevorzugte Slots; gleicher Tabellen-Pattern | ✓ |
| Eine Liste mit dropdown-templateType | Generisch aber visuell verwirrend | |
| Nur SUBJECT_MORNING in Phase 14 | REQ-05 impliziert mehr | |

**User's choice:** Sub-Tabs in Tab 4 — Recommended.

---

## Area 4: Validierung & Konflikt-Handling

### Q4.1 — Wie wird die Param-Validierung pro templateType umgesetzt?

| Option | Description | Selected |
|--------|-------------|----------|
| Hybrid: Zod-Schemas + Backend-Cross-Reference-Check (Recommended) | Frontend Form-Shape + Range; Backend classId/teacherId/subjectId-Existenz + maxPeriod ≤ Zeitraster; RFC 9457 422 | ✓ |
| Nur Frontend-Validierung | Backend trusted; schwach | |
| Nur Backend-Validierung mit RFC 9457 Rückgabe | Bricht UX (Phase 10 D-15) | |

**User's choice:** Hybrid — Recommended.

### Q4.2 — Was passiert bei Duplikaten?

| Option | Description | Selected |
|--------|-------------|----------|
| Mehrfach-Einträge erlaubt + InfoBanner-Warnung im UI (Recommended) | Solver nimmt strengsten Wert; UI warnt; erlaubt temp Overrides | ✓ |
| @@unique([schoolId, templateType, params->>classId]) blocked Duplikate | Postgres-spezifisch + brittle JSON-Index | |
| Frontend-Pre-Check + Confirm-Dialog | Race-Condition-anfällig | |

**User's choice:** Mehrfach + Warning — Recommended.

### Q4.3 — Wie wird Pre/Post-Verifikation des Score-Effekts umgesetzt?

| Option | Description | Selected |
|--------|-------------|----------|
| Nur Manual: Run-History-Vergleich über TimetableRun.constraintConfig (Recommended) | Existing /admin/timetable-history; constraintConfig-Snapshot reicht; REQ-Wording 'manuell' | ✓ |
| Pre-Solve-Impact-Preview-Endpoint | 10s-Mini-Solve; ganzer neuer Flow; defer v1.2 | |
| Inline 'Letzter Score'-Anzeige beim Tunen | Pre-computed Baseline nötig; defer | |

**User's choice:** Manual via Run-History — Recommended.

### Q4.4 — Wie viele Playwright-Specs für Phase 14?

| Option | Description | Selected |
|--------|-------------|----------|
| ~8-9 Specs: 4 Tabs × (happy + edge) + Mobile-375 (Recommended) | 4 Tabs × 2 + Solver-Run-Integration + Mobile | |
| ~5 Specs (lean) | Schneller; keine Validation/Konflikt-Coverage | |
| ~12 Specs (gross) | Voll-Sweep wie Phase 13; jede Validation + Konflikt + Audit | ✓ |

**User's choice:** ~12 Specs (gross) — **USER OVERRIDE auf Recommended 8-9**.
**User-Notes (inferred from override):** Solver-Tuning ist Score-relevant — Weight-Persistenz, Cross-Reference-Validation, Multi-Row-Restrictions, audit-Trail brauchen dedizierte Regression-Guards. E2E-SOLVER-10 (weights-survive-solve-run) ist der kritische Integrations-Spec für REQ-Success-Criteria 5. Konsistent mit Phase 13 USER-Override (11 specs gegen ~7 Recommended) und `feedback_e2e_first_no_uat.md` Direktive.

---

## Wrap-Up

### Q5 — Bereit für CONTEXT.md, oder noch unklare Bereiche?

| Option | Description | Selected |
|--------|-------------|----------|
| Bereit für CONTEXT (Recommended) | 16 Decisions + 3-Plan-Breakdown | ✓ |
| Plan-Breakdown noch diskutieren | 3 vs 2 Bundled Plans | |
| Weitere Gray Areas erkunden | Lehrer-Sperrzeiten, Solver-Sidecar Hot-Reload | |

**User's choice:** Bereit für CONTEXT — Recommended.

---

## Claude's Discretion

Areas where user accepted Claude's defaults (not explicitly asked):
- Exakte deutsche Übersetzungen der Java-Constraint-Namen + Tooltip-Texte
- Tab-Order innerhalb Sub-Tabs in Tab 4
- Slider-Color-Coding default vs custom
- Reset-to-Default-Button-Position
- Skeleton-Layouts pro Tab
- Empty-State-Illustrations
- Search-Debounce-Timing + Autocomplete-Min-Length
- TanStack-Query-Cache-Invalidation-Strategy
- Loading-States für Bulk-PUT
- Audit-Log-Action-Type-Granularität (update vs replace-all)
- Header-Link-Wording zu Generator-Page

## Deferred Ideas

Captured during discussion as out-of-scope for Phase 14:
- BLOCK_TIMESLOT als ad-hoc admin-override (gehört in TEACHER-04)
- Pre-Solve-Impact-Preview-Endpoint (v1.2)
- Score-Sparklines pro Constraint (Phase 16)
- Drag-and-Drop-Prioritäts-Ranking
- Visueller Wochenraster-Editor für NO_LESSONS_AFTER
- Pre-Solve-Validation-Warnings für mathematisch unlösbare Sets
- Multi-Schule Constraint-Templating (v2)
- A/B-Testing-Framework für Weights (v1.2)
- Weight-Templates / Presets
- Constraint-Catalog-Auto-Discovery aus Java-Sidecar (v1.2)
- Editierbare Hard-Constraints (defer Forever)
- Constraint-Weight-History-Timeline pro Constraint (Phase 15 Audit-Viewer deckt ab)
