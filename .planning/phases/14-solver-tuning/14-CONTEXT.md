# Phase 14: Solver-Tuning - Context

**Gathered:** 2026-04-25
**Status:** Ready for planning
**Mode:** Smart discuss (4 Gray Areas × 4 Fragen, recommended-first options)

<domain>
## Phase Boundary

Admin pflegt UI-gestützt die schul-scoped Solver-Konfiguration: (a) Read-only-Übersicht der 14 Solver-Constraints (6 Hard + 8 Soft) mit klarer Hard/Soft-Differenzierung, (b) Per-School persistente Soft-Constraint-Gewichts-Overrides (8 Sliders 0–100 mit Reset-to-Default), (c) `ClassTimeslotRestrictions` (Klassen-Periode-Sperren) als ConstraintTemplate-Type `NO_LESSONS_AFTER` mit Tabellen-CRUD, (d) `SubjectTimePreferences` als Sub-Tabs für ConstraintTemplate-Typen `SUBJECT_MORNING` und `SUBJECT_PREFERRED_SLOT`. Alles unter neuer Route `/admin/solver-tuning` (Tabs-Page) in Sidebar-Gruppe "Solver & Operations" (Admin-only). Mobile-Parität bei 375px (horizontal-scrollbare Tab-Bar). Geänderte Konfig wirkt beim nächsten Solve-Run; Verifikation manuell via TimetableRun-History-Vergleich.

UI-Layer über v1.0-Backend (`ConstraintTemplate` CRUD existiert, `solver-input.service.ts` übersetzt Templates zu solver-internen Listen) plus drei Backend-Gap-Fixes als atomic tasks: (1) NEUES Prisma-Modell `ConstraintWeightOverride` (Tall-Format) + Migration + CRUD-Endpoint + Solver-Flow-Anpassung (Resolution-Reihenfolge: DB > Per-Run-DTO > Hardcoded-Default), (2) Statische TS-Constraint-Catalog-Konstante (Mirror der Java `TimetableConstraintProvider`) für Hard/Soft-Übersicht, (3) Cross-Reference-Validation in `ConstraintTemplateService` (classId/teacherId/subjectId existiert in Schule + maxPeriod ≤ Schule.zeitraster.maxPeriodNumber).

Out-of-scope: BLOCK_TIMESLOT (Lehrer-Sperrzeiten — gehört in Lehrer-Detail-Verfügbarkeit, TEACHER-04 Phase 11), Pre-Solve-Impact-Preview (Defer v1.2), Score-Sparklines (Defer Phase 16/v1.2), Hard-Constraint-Editierbarkeit (Hard ist immer aktiv im Java-Solver).

Deckt: SOLVER-01..05 (5 Requirements).

</domain>

<decisions>
## Implementation Decisions

### Area 1 — Information Architecture

- **D-01:** Neue Route `/admin/solver-tuning` als Tabs-Page (eigene Sub-Route, kein Reuse von `/admin/solver`). Bestehende `/admin/solver` (Generator-Page, Phase 9.x) bleibt unverändert — klare Trennung "solver" = Run-Trigger, "solver-tuning" = Konfig-Editor. File: `apps/web/src/routes/_authenticated/admin/solver-tuning.tsx` (Single-File Tabs-Page, kein File-based Sub-Routing — analog Phase 13 User-Detail-4-Tabs-Pattern). Deep-Link zwischen beiden Seiten: Generator-Page "Aktuelle Weights"-Card mit Link "→ Tuning öffnen", Tuning-Page "Generator starten"-CTA im Header.

- **D-02:** 4 Tabs in fixierter Reihenfolge:
  1. **Constraints** (Read-only-Übersicht aller 14 Solver-Constraints mit Hard/Soft-Badges — siehe D-10)
  2. **Gewichtungen** (8 Soft-Constraint-Sliders mit Reset-to-Default — siehe D-07; SOLVER-02/03)
  3. **Klassen-Sperrzeiten** (Tabellen-CRUD für `NO_LESSONS_AFTER`-Templates — siehe D-11; SOLVER-04)
  4. **Fach-Präferenzen** (Sub-Tabs für `SUBJECT_MORNING` + `SUBJECT_PREFERRED_SLOT` — siehe D-12; SOLVER-05)

  BLOCK_TIMESLOT (Lehrer-Sperrzeiten) ist explizit kein Tab — gehört in Lehrer-Detail Tab "Verfügbarkeit" (TEACHER-04, Phase 11). Wenn sich später ein Bedarf für ad-hoc admin-overrides ohne Lehrer-Detail-Detour ergibt: Phase 16 oder v1.2.

- **D-03:** Sidebar-Gruppe **"Solver & Operations"** (existierende Gruppe aus Phase 9.x mit Eintrag "Stundenplan-Generator"). Neuer Eintrag **"Solver-Tuning"** mit lucide-Icon `SlidersHorizontal`. Role-Gating `roles: ['admin']` — strikter als Personal-Gruppe (analog Phase 13 D-03 Strenge-Begründung: Tuning ist sehr technisch, Schulleitung soll keine Soft-Weights versehentlich verbiegen). Gateway-Position: nach "Stundenplan-Generator", vor evtl. zukünftigem "Vertretungs-Konfiguration".

- **D-04:** Mobile-Adaption bei 375px = **horizontal scrollbare Tab-Bar** (Phase 13 Pattern, `overflow-x-auto`, active-tab snappt zum Anfang via `scroll-into-view`). 44px Touch-Targets pro Tab. Pro-Tab-Skeleton während Load. UnsavedChangesDialog beim Tab-Wechsel mit dirty-State (Phase 10 D-02 Pattern).

### Area 2 — ConstraintWeightOverride Persistenz (GAP-A: Neues Prisma-Modell)

- **D-05:** Neues Prisma-Modell **`ConstraintWeightOverride`** im **Tall-Format** (1 Row pro `[schoolId, constraintName]`):

  ```prisma
  model ConstraintWeightOverride {
    id             String   @id @default(uuid())
    schoolId       String   @map("school_id")
    school         School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)
    constraintName String   @map("constraint_name")  // matches Java @ConstraintWeight name verbatim
    weight         Int                                // 0..100 (CHECK constraint server-side)
    updatedAt      DateTime @updatedAt @map("updated_at")
    updatedBy      String?  @map("updated_by")        // userId (audit-trail)

    @@unique([schoolId, constraintName])
    @@index([schoolId])
    @@map("constraint_weight_overrides")
  }
  ```

  Vorteile: zukunftssicher (neue Constraint-Names → neue Rows ohne Schema-Migration); Default-Fallback wenn Row fehlt; granulare Audit-Trails pro Constraint; konsistent mit Phase 13 PermissionOverride-Tall-Pattern. Migration via `prisma migrate dev --name add_constraint_weight_overrides` (CLAUDE.md Migration-Hygiene-Hard-Rule).

- **D-06:** Solver-Flow Resolution-Reihenfolge in `timetable.service.ts:startSolve()`:
  1. `ConstraintWeightOverride.findMany({ where: { schoolId } })` → Map(constraintName → weight)
  2. Per-Solve-Request DTO `dto.constraintWeights` (Record<string, number>) merged ON TOP (one-off A/B-Testing/Experimentation)
  3. Restliche Constraint-Names ohne DB-Row + ohne DTO → `DEFAULT_CONSTRAINT_WEIGHTS` aus `dto/constraint-weight.dto.ts` (Hardcoded Fallback bleibt unverändert als Safety-Net)
  4. Resolved Map wird als `TimetableRun.constraintConfig` Json gespeichert (existing Snapshot-Behavior bleibt — wichtig für Verifikation D-15)

  Per-Solve-Request-DTO bleibt erhalten — nicht entfernt. Generator-Page (`/admin/solver`) bekommt Read-only-Card "Aktuelle Schul-Weights" mit Link zu /admin/solver-tuning Tab "Gewichtungen".

- **D-07:** Weight-Editor-UI (Tab 2 "Gewichtungen"): Card-Liste mit 8 Rows (eine pro `CONFIGURABLE_CONSTRAINT_NAMES`-Eintrag aus `constraint-weight.dto.ts`). Pro Row:
  - **Label:** Deutscher Name (z.B. "Kein Doppel-Fach hintereinander") + englischer Java-Name als `<small>` darunter (z.B. "No same subject doubling")
  - **Slider:** shadcn `Slider` 0–100 mit Step 1 (`@radix-ui/react-slider`)
  - **Number-Input:** synchronisiert mit Slider (bidirektional, Slider triggert NumberInput-Update und vice versa)
  - **Default-Hint:** "Default: {DEFAULT_WEIGHT}" als Helper-Text rechts
  - **Reset-Icon-Button:** lucide `RotateCcw` setzt Wert auf Default zurück, aktiv nur wenn Wert ≠ Default
  - **Tooltip:** Constraint-Beschreibung aus statischem Catalog (siehe D-10)

  Save-All-Button via StickyMobileSaveBar (Phase 10 D-02 Pattern). Dirty-State pro Row sichtbar (Background-Tint-Change). Replace-all-in-Tx Backend-Pattern (Phase 2 D-04 / Phase 11 D-07): `PUT /api/v1/schools/:schoolId/constraint-weights { weights: Record<string,number> }` ersetzt komplettes Set in einer Prisma-Transaktion. Wert 0 = Constraint deaktiviert (im Solver-Sidecar `@ConstraintWeight(0)` ist no-op-equivalent).

  **Validation:** Zod-Schema `z.record(z.string(), z.number().int().min(0).max(100))` Client-side; Server validiert zusätzlich constraintName ∈ `CONFIGURABLE_CONSTRAINT_NAMES` (whitelisted, RFC 9457 422 bei unbekanntem Namen).

- **D-08:** Audit-Trail via bestehenden **AuditInterceptor** (Phase 1 D-07) — neues Subject `constraint-weight-override` mit Action-Types `create`/`update`/`delete`, automatisch über CRUD-Wiring geloggt. Plus: `TimetableRun.constraintConfig` Json-Snapshot pro Solve-Run (existing field, kein Änderung) speichert die für diesen Run **resolved** Weight-Map. Verifikation gegen Pre-Change-Baseline (REQ Success-Criteria) erfolgt manuell via existierender `/admin/timetable-history`-Route + Run-Detail-View (zeigt `constraintConfig` Json), kein neuer Surface nötig (D-15). Dedicated History-Tabelle / Inline-Sparklines verworfen.

### Area 3 — Constraint-Template Editor UX (GAP-B + GAP-C)

- **D-09:** **Typed Forms pro templateType mit RHF + Zod-Discriminated-Union** (`packages/shared/src/validation/constraint-template.ts`):

  ```typescript
  export const constraintTemplateParamsSchema = z.discriminatedUnion('templateType', [
    z.object({ templateType: z.literal('NO_LESSONS_AFTER'),
               classId: z.string().uuid(),
               maxPeriod: z.number().int().min(1).max(12) }),
    z.object({ templateType: z.literal('SUBJECT_MORNING'),
               subjectId: z.string().uuid(),
               latestPeriod: z.number().int().min(1).max(12) }),
    z.object({ templateType: z.literal('SUBJECT_PREFERRED_SLOT'),
               subjectId: z.string().uuid(),
               dayOfWeek: dayOfWeekEnum,
               period: z.number().int().min(1).max(12) }),
    // BLOCK_TIMESLOT explicit Phase-14-out-of-scope (vorhanden für Lehrer-Detail-Reuse)
    z.object({ templateType: z.literal('BLOCK_TIMESLOT'),
               teacherId: z.string().uuid(),
               dayOfWeek: dayOfWeekEnum,
               periods: z.array(z.number().int().min(1).max(12)) }),
  ]);
  ```

  4 separate React-Form-Components (`<NoLessonsAfterForm>`, `<SubjectMorningForm>`, `<SubjectPreferredSlotForm>`, `<BlockTimeslotForm>`-deferred) mit RHF zod-resolver. Konsistent mit Phase 11 TeacherForm + Phase 12 ClassForm Convention. Neue templateTypes erweitern Discriminated-Union ohne Breaking-Change.

- **D-10:** Tab 1 "Constraints" = **Read-only-Liste der 14 Solver-Constraints** (6 Hard + 8 Soft):

  Statische TS-Konstante `CONSTRAINT_CATALOG` in `apps/api/src/modules/timetable/constraint-catalog.ts` (mirrored auch nach `packages/shared/src/constraint-catalog.ts` für Frontend-Konsumtion):

  ```typescript
  export interface ConstraintCatalogEntry {
    name: string;          // matches Java @Constraint name verbatim
    displayName: string;   // German UI label
    description: string;   // German tooltip
    severity: 'HARD' | 'SOFT';
    source: string;        // 'TimetableConstraintProvider.java#methodName' for traceability
  }

  export const CONSTRAINT_CATALOG: ConstraintCatalogEntry[] = [
    // 6 HARD (immer aktiv, nicht editierbar)
    { name: 'Room conflict', severity: 'HARD', ... },
    { name: 'Teacher conflict', severity: 'HARD', ... },
    { name: 'Student group conflict', severity: 'HARD', ... },
    { name: 'Class timeslot restriction', severity: 'HARD', ... },
    { name: 'Subject time preference (hard)', severity: 'HARD', ... },
    { name: 'Proper timeslots for lessons', severity: 'HARD', ... },
    // 8 SOFT (DEFAULT_CONSTRAINT_WEIGHTS-Keys, editierbar via Tab 2)
    { name: 'No same subject doubling', severity: 'SOFT', ... },
    // ... 7 weitere
  ];
  ```

  **Sync-Disziplin:** wie `DEFAULT_CONSTRAINT_WEIGHTS` (das bereits Java mirroring macht) wird `CONSTRAINT_CATALOG` manuell mit `TimetableConstraintProvider.java` + `TimetableConstraintConfiguration.java` synchron gehalten. Code-Comment auf beiden Seiten erinnert daran.

  **UI:** Liste/Tabelle im Tab "Constraints":
  - Spalten: Name (deutsch + Java-name als small), Severity-Badge (HARD = rot/destructive, SOFT = blau/secondary), Beschreibung, Aktion
  - Hard-Rows: Aktion = "Read-only" (kein Edit-Button, Tooltip "Hard-Constraints sind immer aktiv")
  - Soft-Rows: Aktion = Button "Gewichtung bearbeiten" → Deep-Link zu Tab 2 mit Auto-Scroll zur passenden Slider-Row
  - Sektions-Header "Hard-Constraints (6)" und "Soft-Constraints (8)" mit Trenner zwischen Sektionen

- **D-11:** Tab 3 "Klassen-Sperrzeiten" = **Tabelle + Add-Row Pattern** für `ConstraintTemplate.templateType = 'NO_LESSONS_AFTER'`:

  - **Tabelle:** Spalten: **Klasse** (Badge mit Klassenname + Jahrgang-Badge) | **Sperrt ab Periode** (z.B. "Bis Periode 5 erlaubt") | **Aktiv** (Switch isActive) | **Aktionen** (Bearbeiten + Löschen-Icon-Buttons)
  - **+ Sperrzeit hinzufügen** Button öffnet Dialog mit:
    - Klassen-Autocomplete (Command-Popover, Reuse Phase 11 D-08 + Phase 12 D-08 Pattern, min 2 Zeichen)
    - maxPeriod-NumberInput mit Constraint maxPeriod ≤ `school.maxPeriodNumber` (Cross-Reference-Validation D-13)
  - **Edit-Aktion:** öffnet selben Dialog vorbefüllt
  - **Mehrfach-Einträge pro Klasse:** erlaubt (siehe D-14 Konflikt-Handling)
  - **Empty-State:** InfoBanner "Keine Sperrzeiten gesetzt" + CTA "Sperrzeit anlegen"
  - **Save:** individuelle POST/PUT/DELETE pro Row (analog Phase 13 D-10 PermissionOverride-CRUD-Pattern, NICHT replace-all, damit Audit-Action-Types korrekt bleiben)

- **D-12:** Tab 4 "Fach-Präferenzen" = **Single-Tab mit zwei Sub-Tabs**:
  - **Sub-Tab a "Vormittags-Präferenzen"** (`SUBJECT_MORNING`): Tabellen-Pattern wie D-11. Spalten: Fach (Subject-Badge mit Farbe) | Spätestens bis Periode | Aktiv | Aktionen. Add-Dialog: Fach-Autocomplete + latestPeriod-NumberInput (1..maxPeriodNumber).
  - **Sub-Tab b "Bevorzugte Slots"** (`SUBJECT_PREFERRED_SLOT`): Tabellen-Pattern. Spalten: Fach | Wochentag (Badge MO–FR) | Periode | Aktiv | Aktionen. Add-Dialog: Fach-Autocomplete + dayOfWeek-Select + period-NumberInput.

  Beide Sub-Tabs nutzen denselben `<ConstraintTemplateTable>`-Component mit type-spezifischen Form-Components. Sub-Tab-Switch mit shadcn `Tabs` (in Tab 4 nested). Mobile: Sub-Tabs werden zu vertical Toggle-Group bei <md.

### Area 4 — Validierung & Konflikt-Handling

- **D-13:** **Hybrid-Validierung** (Phase 10 D-15 Standard):
  - **Frontend:** Zod-Schemas validieren Form-Shape, Werte-Ranges (maxPeriod ≥1 ≤12, weight 0..100), Required-Fields. RHF zeigt Inline-Errors. Submit-Button disabled bei Form-Invalid.
  - **Backend:** zusätzliche Cross-Reference-Checks (NICHT im Frontend möglich, da Schul-Kontext nötig):
    1. `classId` / `teacherId` / `subjectId` muss in derselben Schule existieren (`prisma.class.findFirst({ where: { id, schoolId } })`) — bei NotFound: RFC 9457 422 `{ type: 'schoolflow://errors/cross-reference-missing', detail: 'Klasse Z gehört nicht zu dieser Schule' }`
    2. `maxPeriod` / `period` / `latestPeriod` ≤ `school.maxPeriodNumber` (aus `school.timeslot`-Konfig Phase 10) — bei Verstoss: 422 `{ type: 'schoolflow://errors/period-out-of-range', detail: 'maxPeriod 8 > Zeitraster-Maximum 6' }`
    3. `constraintName` ∈ `CONFIGURABLE_CONSTRAINT_NAMES` für Weight-Override (whitelisted) — 422 bei unknown
  - **GAP-Fix-Task:** `ConstraintTemplateService` aktuell hat keine Cross-Reference-Validation (`constraint-template.service.ts:create()` setzt einfach params Json) → Plan-14-01 Task: erweitere service-Methoden um Cross-Reference-Check pro templateType.

- **D-14:** **Mehrfach-Einträge erlaubt + InfoBanner-Warnung**:
  - Schema erlaubt mehrere `ConstraintTemplate`-Rows mit selbem `templateType` + selbem `params.classId` (oder `params.subjectId`). Kein DB-Unique-Constraint (params ist Json — DB-Index brittle).
  - Solver-Input-Service nimmt **strengsten Wert** (kleinster `maxPeriod` für NO_LESSONS_AFTER und SUBJECT_MORNING; alle SUBJECT_PREFERRED_SLOT-Rows kumulativ aktiv). `solver-input.service.ts:354-403` Verhalten bleibt unverändert (push-all-Pattern); für strengster-Wert-Logik wird ein dedupe-Step hinzugefügt: gruppiere nach (classId | subjectId), nimm min(maxPeriod) für *_AFTER + *_MORNING Types.
  - **UI-InfoBanner** im jeweiligen Tab (oben, Phase 10 InfoBanner-Component): wenn 2+ aktive Rows für selbe (Klasse | Fach):
    > "⚠️ Mehrfache Einträge für **Klasse 1A** vorhanden — Solver verwendet die strengste Sperrzeit (Periode 4)."
  - **Begründung:** erlaubt temporäre Overrides für Prüfungswochen / Sondersituationen ohne Existing-Eintrag löschen zu müssen. Konsistent mit Phase 9.5 Pre-Solve-Validation-Toleranz-Philosophie.

- **D-15:** **Manuelle Verifikation via Run-History-Vergleich** (REQ Success-Criteria-Wording "manuelle Verifikation gegen Pre-Change-Baseline" wird wörtlich genommen):
  - Kein neuer Pre-Solve-Preview-Endpoint (Defer v1.2)
  - Kein neuer Score-Sparkline-Surface (Defer Phase 16/v1.2)
  - **Workflow:** Admin (1) speichert Weight-Change in Tab "Gewichtungen", (2) startet Solve via existing `/admin/solver` Generator-Page, (3) öffnet `/admin/timetable-history` (existing Route aus Phase 9.x) mit Run-Detail-View, (4) vergleicht `constraintConfig`-Snapshot + Score von neuem Run mit dem vorherigen Run (zwei Runs nebeneinander).
  - **Kleine UI-Verbesserung:** Tuning-Page Header zeigt "Letzter Solve-Run vor X Stunden — Score: Hard=0, Soft=-127" Read-only-Badge mit Deep-Link zu `/admin/timetable-history`.

- **D-16:** **E2E Voll-Sweep — 12 Specs** (USER-OVERRIDE auf Recommended 8-9). Konsistent mit Phase 13 D-16 11-Spec-Pattern. Prefix-Isolation `E2E-SOLVER-*` (Phase 10.5-02 Pattern). Reuse Phase 10.3 Harness (`loginAsRole`, `getRoleToken`, `globalSetup`) + Phase 10.4-01 `getByCardTitle`-Helper:

  1. **E2E-SOLVER-01 catalog-readonly** — Tab "Constraints" lädt, zeigt 14 Rows mit Hard/Soft-Badges, Hard-Rows haben kein Edit-Button (Click führt zu Tooltip "immer aktiv"), Soft-Row Click "Gewichtung bearbeiten" navigiert zu Tab 2 + scrollt zu passender Slider-Row.
  2. **E2E-SOLVER-02 weights-edit-save-reset** — Slider verschieben → Number-Input syncs, Save → Toast "Gewichtungen gespeichert", reload → persistierte Werte zeigen, Reset-Icon → Wert zurück auf Default, Save → DB zeigt Default-Row gelöscht (oder weight = default).
  3. **E2E-SOLVER-03 weights-validation-bounds** — Number-Input mit -5 oder 150 → Frontend-Inline-Error, Save-Button disabled. Server-Direct-Call (via apiFetch in Test-Harness) mit weight=200 → 422 RFC 9457.
  4. **E2E-SOLVER-04 class-restriction-CRUD-happy** — Tab "Klassen-Sperrzeiten", Add-Dialog: Klassen-Autocomplete → maxPeriod=5 → Save → Row in Tabelle, Edit Row → maxPeriod=4 → Save → Row updated, Toggle isActive → Row dimmed, Delete-Icon + Confirm → Row weg.
  5. **E2E-SOLVER-05 class-restriction-cross-reference-422** — Direct-API-Call mit maxPeriod=99 (Schule hat nur 8 Perioden) → 422 problem+json `period-out-of-range`. Direct-API-Call mit classId aus anderer Schule → 422 `cross-reference-missing`.
  6. **E2E-SOLVER-06 class-restriction-duplicate-warn** — 2x Add für Klasse 1A (maxPeriod=5 und maxPeriod=4) → beide Rows in Tabelle + InfoBanner "Mehrfache Einträge für Klasse 1A — Solver verwendet strengste (Periode 4)".
  7. **E2E-SOLVER-07 subject-pref-morning-CRUD** — Sub-Tab "Vormittags-Präferenzen" → Add Mathe latestPeriod=4 → Save → Row, Edit → Save, Delete → Confirm → weg.
  8. **E2E-SOLVER-08 subject-pref-preferred-slot-CRUD** — Sub-Tab "Bevorzugte Slots" → Add Sport DI Periode 1 → Save → Row, Edit → Save, Delete → weg.
  9. **E2E-SOLVER-09 subject-pref-mixed-list** — Sub-Tab-Wechsel funktioniert; SUBJECT_MORNING-Row taucht NICHT in Bevorzugte-Slots auf und vice versa.
  10. **E2E-SOLVER-10 weights-survive-solve-run** — **Kritische Integrations-Spec für REQ-Success-Criteria.** Set Weight "No same subject doubling" auf 50 (default 10) → Save → navigate `/admin/solver` → Generate-Button → wait for solve:complete → navigate `/admin/timetable-history/$runId` → assert `constraintConfig['No same subject doubling'] === 50`. Verifikation dass Persistenz tatsächlich beim Solver landet.
  11. **E2E-SOLVER-11 audit-trail** — Set Weight ändern via UI → fetch `/api/v1/audit-log?subject=constraint-weight-override` → assert audit-Eintrag `update` mit `actorUserId` = current-admin. Set Class-Restriction → assert audit-Eintrag `create` mit subject `constraint-template`.
  12. **E2E-SOLVER-MOBILE-01 tabs-mobile-375** (chromium-375, mobile-webkit-Bus-Error-10 acceptable via Phase 10.4-03 Precedent) — Horizontal-Scroll-Tab-Bar funktioniert, Tab-Switch erhält Werte (UnsavedChanges-Warn), Slider Touch-Drag funktioniert, Add-Dialog Mobile-Layout (44px Touch-Targets, Autocomplete-Popover Keyboard-Behavior).

  Bumpt `.planning/E2E-COVERAGE-MATRIX.md` um neue Spec-Family `E2E-SOLVER-*`. SILENT-4XX-Invariante codified (alle Mutation-Hooks haben explizit verdrahtetes onError). Coverage erfüllt `feedback_e2e_first_no_uat.md` Direktive.

### Plan-Breakdown

- **D-17:** **3 bundled plans** (Phase 11 D-16 + Phase 12 D-16 + Phase 13 D-15 Pattern-Continuation):

  - **Plan 14-01** — Shared foundation + Backend (alle Gap-Fixes, atomic tasks): `packages/shared/src/validation/constraint-template.ts` (Zod-Discriminated-Union D-09) + `packages/shared/src/constraint-catalog.ts` (CONSTRAINT_CATALOG D-10 mirrored aus API-side). Backend: (1) Prisma-Migration `add_constraint_weight_overrides` (D-05) — strikt via `prisma migrate dev --name`, NIEMALS `db push` (CLAUDE.md Hard-Rule); (2) `ConstraintWeightOverrideService` + `ConstraintWeightOverrideController` (CRUD + replace-all-Bulk-PUT + min-0/max-100 + whitelisted-name-Check D-07); (3) `constraint-template.service.ts` Cross-Reference-Validation extension (D-13 — Stelle 1/2/3); (4) `solver-input.service.ts` dedupe-Step für Multi-Row-Restrictions (D-14 — strengster-Wert-Logik); (5) `timetable.service.ts:startSolve` Resolution-Reihenfolge-Anpassung (D-06 — DB > Per-Run-DTO > Hardcoded); (6) `apps/api/src/modules/timetable/constraint-catalog.ts` API-side Source-of-Truth + `GET /api/v1/timetable/constraint-catalog` Read-only-Endpoint. Inkl. Unit-Tests pro Service-Methode + Cross-Reference-Validation-Tests + Resolution-Reihenfolge-Tests (Phase 1 D-04-Pattern).

  - **Plan 14-02** — Frontend Routes + Tabs-Page + 4 Tab-Components: Sidebar-Erweiterung in `AppSidebar.tsx` + `MobileSidebar.tsx` (D-03). Route `/admin/solver-tuning.tsx` mit shadcn `Tabs` (4 Tabs D-02). TanStack-Query-Hooks: `useConstraintCatalog()`, `useConstraintWeights(schoolId)`, `useUpdateConstraintWeights`, `useResetConstraintWeight`, `useConstraintTemplates(schoolId, templateType)`, `useCreateConstraintTemplate`, `useUpdateConstraintTemplate`, `useDeleteConstraintTemplate`, `useToggleConstraintTemplateActive`. Pro Tab eine Component:
    - `<ConstraintCatalogTab>` (D-10 Read-only-Liste mit Hard/Soft-Badges + Deep-Link-zu-Tab-2)
    - `<ConstraintWeightsTab>` (D-07 Slider+Number-Inputs+Reset, StickyMobileSaveBar)
    - `<ClassRestrictionsTab>` (D-11 Tabelle+Add-Dialog+Edit-Dialog+InfoBanner D-14)
    - `<SubjectPreferencesTab>` (D-12 mit zwei Sub-Tabs, jeweils Tabelle+Add+Edit)
    - Shared: `<ConstraintTemplateTable>` Component, `<ClassAutocomplete>` (Reuse Phase 12 D-08), `<SubjectAutocomplete>` (Reuse Phase 11 D-08). UnsavedChangesDialog pro Tab. Silent-4xx-Invariante (Phase 10.1-01) auf allen Mutation-Hooks. Generator-Page (`/admin/solver`) bekommt Read-only-Card "Aktuelle Weights" mit Deep-Link zu Tuning-Page (D-06 Spät-Edit).

  - **Plan 14-03** — E2E Voll-Scope (12 Specs, D-16). Inklusive Test-Helper `createConstraintWeightOverrideViaAPI()` und `createConstraintTemplateViaAPI()` für Setup-Phase pro Test. `globalSetup` lädt CONSTRAINT_CATALOG einmalig. Pre-Solve-Run-Spec (E2E-SOLVER-10) reuses Phase 9.x Solver-Test-Harness (warte auf solve:complete via Socket.IO).

### Claude's Discretion

- Exakte deutsche Übersetzungen der 14 Java-Constraint-Namen (CONSTRAINT_CATALOG `displayName`)
- Exakte deutsche Tooltip-Texte für Constraint-Beschreibungen
- Tab-Order innerhalb Tab 4 Sub-Tabs (Vormittags vor Bevorzugte-Slots wahrscheinlich richtig)
- Slider-Color-Coding (default-state vs custom-state)
- Reset-to-Default-Button-Position (Icon vs Text-Button)
- Skeleton-Layout pro Tab (4 Tabs, jeder eigenes Skeleton)
- Empty-State-Illustration für Klassen-Sperrzeiten und Fach-Präferenzen
- Search-Debounce Autocomplete-Min-Length (300ms / 2 Zeichen, konsistent Phase 11/12)
- TanStack-Query-Cache-Invalidation-Strategie nach Mutation (constraint-weights affect alle, constraint-templates nur per templateType)
- Loading-States pro Bulk-PUT (StickyMobileSaveBar zeigt "Speichert..." mit Spinner)
- Performance-Optimierung der CONSTRAINT_CATALOG-Konstante (statisch importiert, kein Network)
- TimetableRun-History-Diff-View Verbesserungen (out of scope für Phase 14, aber falls trivial mit ergänzen)
- Header-Link zu Generator-Page Wording
- Audit-Log-Action-Type-Granularität (`update` vs `replace-all` für Bulk-PUT — empfehle einen `update` pro betroffener Row für klare Historie)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & Requirements
- `.planning/ROADMAP.md` §Phase 14 (lines 280–301) — Phase 14 goal, success criteria (5 criteria), REQ-IDs (SOLVER-01..05), dependencies (Phase 10), Known risks (ConstraintTemplate CRUD existiert / generic params-Form / ClassTimeslotRestriction + SubjectTimePreference möglicherweise als Gap-Fix). **Achtung Korrektur:** ROADMAP-Behauptung "ClassTimeslotRestriction und SubjectTimePreference sind als Prisma-Modelle vorhanden" ist falsch — sie sind interne DTOs, abgeleitet aus ConstraintTemplate-templateType-Variants. Siehe D-Domain.
- `.planning/REQUIREMENTS.md` §Solver Tuning (lines 67–72) — Full requirement statements: SOLVER-01..05; §Mobile Parity (lines 91–93) — MOBILE-ADM-01/02 (375px + 44px Touch-Targets gilt für Phase 14)
- `.planning/PROJECT.md` — v1.1 Milestone-Goal (Brownfield UI-only), Constraints, **Phase-3-validated Key-Decisions**: "Timefold 1.32.0 Quarkus sidecar" / "6 hard + 8 soft constraints" / "Two-tier model with configurable weights via ConstraintWeightOverrides"

### Prior phase decisions (foundation this phase builds on)
- `.planning/phases/13-user-und-rechteverwaltung/13-CONTEXT.md` — Tall-Format-Pattern für PermissionOverride (D-10/D-11; spiegelt unser ConstraintWeightOverride D-05), Bundled-3-Plan-Struktur (D-15), RFC-9457 problem+json mit affectedEntities (D-14), Sidebar-Gruppe + Role-Gating-Strenge (D-03), Replace-all-in-transaction (D-05), Audit via bestehender AuditInterceptor (D-08 verbatim Pattern)
- `.planning/phases/12-sch-ler-klassen-und-gruppenverwaltung/12-CONTEXT.md` — Class-Autocomplete-Pattern (D-08), Cross-Reference-Validation in Service-Layer (D-13.x für Klassen-Stundentafel-Apply analog), 3-Plan-Breakdown (D-16), AffectedEntitiesList-kind-Erweiterung
- `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-CONTEXT.md` — Subject-Autocomplete-Pattern (D-08), Shared Zod-Schemas Split (D-15), Replace-all-in-transaction für User-Role-Updates (Phase 11 D-07; analog für Weight-Bulk-PUT D-07), Detail-Page vs Dialog (D-02; wir nutzen Dialog für Add-Restriction)
- `.planning/phases/10-schulstammdaten-zeitraster/10-CONTEXT.md` — Tabs mit Pro-Tab-Save (D-01, D-02), UnsavedChangesDialog-Pattern, StickyMobileSaveBar-Pattern, Validation-Hybrid (D-15 verbatim Pattern für unser D-13), Mobile-Adaption Tabs (D-04 Pattern)
- `.planning/milestones/v1.0-phases/03-timetable-solver-engine/` — Phase 3 ConstraintTemplate-Schema-Design (D-04), Solver-Input-Service-Translation-Logic, Java `@ConstraintWeight` Konventionen, hard-vs-soft-Modell-Begründung. **Plan-Researcher MUSS lesen** für Solver-Architektur-Verständnis.

### Backend code (existing v1.0 baseline — key for Phase 14 gap-fixes)
- `apps/api/prisma/schema.prisma` §837–849 (model `ConstraintTemplate`) — schoolId-scoped + templateType + params Json + isActive. Bleibt unverändert. Cross-Reference-Validation wird in Service ergänzt (D-13)
- `apps/api/prisma/schema.prisma` §66–67 (School relation `constraintTemplates ConstraintTemplate[]`) — bleibt; neue Relation `constraintWeightOverrides ConstraintWeightOverride[]` wird in Migration ergänzt (D-05)
- `apps/api/prisma/schema.prisma` (School-Modell + Timeslot/Period-Konfig) — `school.maxPeriodNumber` (oder analog) wird für Cross-Reference-Validation D-13 gelesen. Plan-Researcher muss exakten Pfad bestätigen (Phase 10 hat das geshipped)
- `apps/api/src/modules/timetable/constraint-template.controller.ts` — existing 5 Endpoints (POST/GET/GET-by-id/PUT/DELETE) bleiben; Cross-Reference-Validation kommt in Service hinzu
- `apps/api/src/modules/timetable/constraint-template.service.ts` — existing CRUD; Service-Methoden create/update bekommen `validateCrossReference(schoolId, dto)` Aufruf (Plan-14-01 Task)
- `apps/api/src/modules/timetable/constraint-template.service.spec.ts` — existing Unit-Tests; werden um Cross-Reference-Tests ergänzt
- `apps/api/src/modules/timetable/dto/constraint-template.dto.ts` §12–17 — `ConstraintTemplateType` enum (4 values: BLOCK_TIMESLOT, SUBJECT_MORNING, NO_LESSONS_AFTER, SUBJECT_PREFERRED_SLOT). UI bedient nur 3 (BLOCK_TIMESLOT bleibt für Lehrer-Detail Phase 11)
- `apps/api/src/modules/timetable/dto/constraint-weight.dto.ts` — DEFAULT_CONSTRAINT_WEIGHTS (8 keys, default-Values), CONFIGURABLE_CONSTRAINT_NAMES (whitelisted), ConstraintWeightOverrideDto (Per-Solve), `mergeWeightOverrides()` Helper. Wird erweitert um `mergeWithSchoolDefaults(schoolWeights, perRunOverride)` für D-06-Resolution-Chain
- `apps/api/src/modules/timetable/solver-input.service.ts` §340–403 — `mapConstraintTemplatesToSolverInput()` returnt 3 Listen (additionalBlockedSlots / classTimeslotRestrictions / subjectTimePreferences). Wird um dedupe-Step ergänzt (D-14: strengster-Wert pro Klasse/Fach)
- `apps/api/src/modules/timetable/timetable.service.ts` §37–79 (`startSolve`) — Resolution-Chain bekommt Step 0 hinzu: `await this.constraintWeightOverrideService.findBySchool(schoolId)` mergen (D-06)
- `apps/api/src/modules/timetable/timetable.controller.ts` §54–70 (`POST solve`) — bleibt; akzeptiert weiterhin `dto.constraintWeights` als optional (Per-Run-Override on-top, D-06 Step 2)
- `apps/api/src/modules/auth/decorators/check-permissions.decorator.ts` — neue subjects: `constraint-weight-override` + Reuse `timetable` für ConstraintTemplate-CRUD (existing). Phase-1-Seed Admin-Role hat `manage timetable` und bekommt zusätzlich `manage constraint-weight-override` via seed-extension oder migration
- `apps/api/src/modules/audit/audit.interceptor.ts` — bestehender AuditInterceptor (Phase 1 D-07), automatisches Logging bei CRUD; subjects `constraint-weight-override` + `constraint-template` ergeben sich aus CheckPermissions-Decorator-Wiring
- `apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java` — Quelle der 6 Hard + 8 Soft Constraints. **Plan-Researcher liest, kopiert die exakten Constraint-Namen + Hardness in CONSTRAINT_CATALOG (D-10)**
- `apps/solver/src/main/java/at/schoolflow/solver/domain/TimetableConstraintConfiguration.java` — Java-side `@ConstraintWeight`-Annotations (Default-Weights mirror DEFAULT_CONSTRAINT_WEIGHTS). Synchronisiert mit constraint-weight.dto.ts manuell

### Frontend code (reuse + integration)
- `apps/web/src/routes/_authenticated/admin/solver.tsx` — Existing Generator-Page (Phase 9.x + 10.5-04). Bleibt unverändert, bekommt Read-only-Card "Aktuelle Schul-Weights" mit Deep-Link zu Tuning-Page (D-06)
- `apps/web/src/routes/_authenticated/admin/` — Existing Pattern; neu: `solver-tuning.tsx` (Single-File Tabs-Page; analog `users.$userId.tsx`)
- `apps/web/src/components/admin/` — Shared Admin-Components aus Phase 10-13: PageShell, UnsavedChangesDialog, StickyMobileSaveBar, InfoBanner, WarnDialog, AffectedEntitiesList. Direct-Reuse
- `apps/web/src/components/layout/AppSidebar.tsx` + `MobileSidebar.tsx` — Erweitere "Solver & Operations"-Gruppe um Eintrag "Solver-Tuning" (Icon `SlidersHorizontal`, role-gating `roles: ['admin']`)
- `apps/web/src/components/ui/` — shadcn primitives: tabs (4 Tabs + nested 2 Sub-Tabs), dialog, input, select, button, card, label, popover, dropdown-menu, command (Autocomplete), checkbox, switch (isActive-Toggle), slider, accordion, badge, tooltip — alle bereits vorhanden
- `apps/web/src/lib/api.ts` — apiFetch + RFC 9457 Problem-Details-Parser (für 422 cross-reference-missing / period-out-of-range / unknown-constraint-name)
- `apps/web/src/stores/school-context-store.ts` — Reused für Constraint-Queries (schoolId in Filter-Parameters)
- `packages/shared/src/validation/` — Existing Zod-Schemas Phase 11/12/13; neu: `constraint-template.ts` (Discriminated-Union D-09), `constraint-weight.ts` (Record-Schema D-07)
- `packages/shared/src/constraint-catalog.ts` — neu (D-10 Mirror der API-side CONSTRAINT_CATALOG)
- `apps/web/e2e/helpers/` — Phase 10.3 Harness (`loginAsRole`, `getRoleToken`, `getByCardTitle` aus 10.4-01); direkt reuse + neue Helpers `createConstraintWeightOverrideViaAPI()` + `createConstraintTemplateViaAPI()`

### Auto-memory notes (from `/Users/vid/.claude/projects/...-school-flow/memory/`)
- `feedback_e2e_first_no_uat.md` — Ship mit Tests, E2E vor UAT (applies Phase 14 fully); User-Override auf 12 Specs (D-16) bestätigt Direktive verbatim
- `feedback_restart_api_after_migration.md` — **KRITISCH** für Phase 14: neue Prisma-Migration (D-05) erfordert API-Restart + post-process shared dist .js extensions nach `prisma migrate dev`. Plan-14-01 Task 1 muss diesen Schritt explizit enumerieren
- `feedback_restart_vite.md` — Vite-Restart nach API-Rebuild
- `feedback_admin_requirements_need_ui_evidence.md` — "Admin kann X"-Requirements brauchen UI-Click-Evidence; D-16 12-Spec-E2E-Sweep erfüllt für SOLVER-01..05 + REQ-Success-Criteria
- `CLAUDE.md` Migration-Hygiene-Hard-Rule — Phase 14 hat **eine** Schema-Migration (ConstraintWeightOverride D-05); MUSS via `prisma migrate dev --name add_constraint_weight_overrides` geshippt werden, **NIEMALS** `db push`. Plan-14-01 Task 1 muss diesen Pfad explizit enumerieren

### Tech-Stack reference
- `CLAUDE.md` — Version pins: React 19, Vite 8, TanStack Query 5, TanStack Router 1, shadcn/ui + Radix UI (Slider!), Tailwind 4, Zustand 5, RHF + Zod, NestJS 11, Prisma 7, PostgreSQL 17, Playwright 1.x, Timefold 1.32.0 (Java solver)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (v1.0 Backend)
- **TimetableModule** (`apps/api/src/modules/timetable/`) — Vollständiger Solver-Stack. ConstraintTemplate-CRUD shipped. Solver-Input-Service-Translation-Logic shipped. Phase 14 erweitert um neuen `ConstraintWeightOverrideService` (D-05) + Cross-Reference-Validation in `ConstraintTemplateService` (D-13) + Resolution-Chain in `TimetableService.startSolve` (D-06) + dedupe in `solver-input.service.ts` (D-14)
- **DEFAULT_CONSTRAINT_WEIGHTS + CONFIGURABLE_CONSTRAINT_NAMES** (`dto/constraint-weight.dto.ts:10-25`) — Static config dictionary mit 8 soft constraints. Mirror der Java-`@ConstraintWeight`-Defaults. Phase 14 D-07 nutzt CONFIGURABLE_CONSTRAINT_NAMES als Whitelist + Iteration-Source für Slider-Liste; D-10 nutzt Keys als Cross-Reference-Source für CONSTRAINT_CATALOG-`severity: 'SOFT'`-Einträge
- **AuditInterceptor** (Phase 1 D-07) — Existing pattern; neue Action-Types (`create`/`update`/`delete` auf subjects `constraint-weight-override` + `constraint-template`) werden automatisch via CRUD-Wiring geloggt. Keine neue Schemas, keine Migration. D-08 Audit-Strategie steht und fällt mit dieser bestehenden Infrastruktur

### Reusable Assets (v1.1 Frontend from Phase 10-13)
- **PageShell / UnsavedChangesDialog / StickyMobileSaveBar / InfoBanner / WarnDialog** (`apps/web/src/components/admin/`) — Phase 10 Shared Admin-Components; Phase 14 Tabs-Page reuse direkt (4 Tabs mit Pro-Tab-Dirty-State, StickyMobileSaveBar in Tab "Gewichtungen", InfoBanner in Tab "Klassen-Sperrzeiten" für Mehrfach-Einträge-Warnung D-14)
- **shadcn `Slider`** (`apps/web/src/components/ui/slider.tsx`) — bereits installiert (Radix-UI Slider). Reuse für Weight-Editor (D-07)
- **Autocomplete-Pattern** (Phase 11 D-08 Teacher-Email-Search + Phase 12 D-08 Class/Subject-Search) — Command-Popover, min 2 Zeichen, 300ms Debounce. Reuse für Klassen-Add-Dialog (D-11) und Subject-Add-Dialog (D-12)
- **AffectedEntitiesList** (Phase 11 D-12 + Phase 12 D-14 + Phase 13 D-14) — Discriminated-Union-Component. Phase 14 erweitert NICHT (keine neuen kinds nötig — Cross-Reference-422-Errors zeigen einfache Detail-Strings, kein affected-Entities)
- **shadcn/ui Primitives** — Alle benötigten vorhanden: tabs, dialog, input, select, button, card, label, popover, command (Autocomplete), checkbox, switch, slider, accordion, badge, tooltip
- **apiFetch + Problem-Details-Parser** — RFC 9457 mit 422 Validation-Errors (Reuse Phase 10 D-15 Hybrid-Validation-Pattern)
- **TanStack Query + RHF + Zod** — Phase-10-13-Stack-Pattern; useQuery-Key-Convention `['constraint-catalog']` (statisch, infinite cache), `['constraint-weights', schoolId]`, `['constraint-templates', schoolId, templateType]`
- **Silent-4xx-Toast-Invariante** (Phase 10.1-01 + 10.2-04) — Alle neuen Mutation-Hooks MÜSSEN useMutation's onError explizit verdrahten (D-16 E2E-SOLVER-03 422-Path covered)
- **Playwright E2E Harness** (Phase 10.3 + 10.4-01 CardTitle-Helper) — `loginAsRole`, `getRoleToken`, `globalSetup`/`globalTeardown`, `getByCardTitle`. Direct-Reuse + neue Test-Helpers für Constraint-Setup

### Established Patterns
- **Deutsche UI-Texte, englische API-Feldnamen** (Phase 1 D-15) — "Solver-Tuning" / "Gewichtungen" / "Klassen-Sperrzeiten" / "Fach-Präferenzen" / "Bevorzugte Slots" UI; `constraintName` / `weight` / `templateType` / `params` / `maxPeriod` / `latestPeriod` API
- **CheckPermissions({ action, subject })** — Existing subject `timetable` für ConstraintTemplate (gilt) + neuer subject `constraint-weight-override`. Actions: `create | read | update | delete | manage`. Nur Admin-Role bekommt per Default `manage constraint-weight-override` aus Phase-1-Seed-Extension
- **Replace-all-in-transaction** (Phase 2 D-04 + Phase 11 D-07) — Weight-Bulk-PUT (D-07): Backend nimmt `Record<string, number>` und ersetzt komplettes Set in einer Prisma-Transaktion (delete-old + create-new für changed Rows). ConstraintTemplate-CRUD nutzt **nicht** replace-all (individuelles CRUD pro Row, damit Audit-Action-Types granular bleiben — analog Phase 13 D-10 PermissionOverride)
- **RFC 9457 problem+json 422** (Phase 10 D-15 + Phase 12 D-13.4) — für Cross-Reference-Validation (D-13: cross-reference-missing, period-out-of-range, unknown-constraint-name)
- **Prisma-Migration via `prisma migrate dev --name`** (CLAUDE.md Migration-Hygiene-Hard-Rule + `feedback_restart_api_after_migration.md`) — Phase 14 hat **EINE** Schema-Migration (D-05). Plan-14-01 Task 1 enumeriert: schema.prisma editieren → migrate dev --name → API-Restart → post-process shared dist .js extensions → Service implementieren
- **Mobile-Parity Nyquist Wave 0** (Phase 4/6/7/10/11/12/13 pattern) — Alle 12 E2E-Specs werden als `it.todo()` vorgeplant, dann implementiert
- **Static-Catalog mirroring Java** (DEFAULT_CONSTRAINT_WEIGHTS-Precedent) — CONSTRAINT_CATALOG (D-10) folgt selber Disziplin: manuelle Sync mit Java-Source, Code-Comment auf beiden Seiten als Reminder. Konsistent mit existierender Architektur
- **Discriminated-Union-Zod-Schema** (Phase 12 D-08-Form-Patterns) — D-09 nutzt z.discriminatedUnion für 4 templateType-Variants

### Integration Points
- **AppSidebar + MobileSidebar** — Sidebar-Gruppe "Solver & Operations" bekommt 2. Eintrag "Solver-Tuning" mit Icon `SlidersHorizontal`. Role-Gating `roles: ['admin']` strikter als Personal-Gruppe
- **Shared Zod-Schemas** — `packages/shared/src/validation/constraint-template.ts` (Discriminated-Union 4 templateTypes D-09), `constraint-weight.ts` (Record + min/max D-07). Frontend + Backend importieren
- **Shared Constraint-Catalog** — `packages/shared/src/constraint-catalog.ts` (D-10) wird in Tab "Constraints" konsumiert; mirror von API-side `apps/api/src/modules/timetable/constraint-catalog.ts` (Source-of-Truth, manuell mit Java synchronisiert)
- **Solver-Sidecar Hot-Reload** — Java-Solver liest Weights pro Solve-Run aus dem Request-Payload (kein Persistent-State im Sidecar). Geänderte Schul-Weights wirken sofort beim nächsten `/solver/solve`-Call. Kein Sidecar-Restart nötig (good)
- **TimetableRun.constraintConfig Json-Snapshot** — existing field, kein Change. Speichert resolved Weight-Map pro Run für Audit + Pre/Post-Verifikation (D-08, D-15)
- **AuditInterceptor** (Phase 1) — Keine neuen Schemas; Action-Types für constraint-weight-override-CRUD + constraint-template-CRUD loggt automatisch über CRUD-Wiring

</code_context>

<specifics>
## Specific Ideas

- **Hard/Soft-Differenzierung als Read-only-Catalog (D-10)** — User akzeptiert die Position, dass Hard-Constraints im Java-Solver hardcoded sind und nicht editierbar sein sollen. UI macht das transparent statt zu verstecken: 6 Hard-Rows mit Tooltip "immer aktiv", 8 Soft-Rows mit Edit-Deep-Link. Konsistent mit Phase 13 D-11 "Transparenz über UX-Magic"-Philosophie (raw conditions JSON exposed).

- **Tall-Format ConstraintWeightOverride (D-05)** — User bestätigt Pattern-Continuation aus Phase 13 PermissionOverride. Granulare Audit-Trails pro Constraint, zukunftssicher gegen neue Constraint-Names ohne Schema-Migration. Wide-Format-Json wäre einfacher zu UPDATEN aber Audit-Diff schwerer.

- **Resolution-Chain ohne Per-Run-DTO-Removal (D-06)** — User bevorzugt additive Architektur: Schul-Defaults sind die neue Quelle, Per-Run-DTO bleibt für one-off Experimentation/A-B-Testing. Generator-Page bekommt Read-only-Anzeige der aktuellen Werte. Kein Breaking-Change am Solve-Endpoint.

- **Manual-Verifikation via Run-History (D-15)** — User akzeptiert REQ-Success-Criteria "manuelle Verifikation gegen Pre-Change-Baseline" wörtlich. Kein Pre-Solve-Preview-Endpoint, keine Sparklines. Existing `/admin/timetable-history` + constraintConfig-Snapshot reichen. Schmaler Scope, ehrlicher Surface, MVP-tauglich.

- **12-Spec E2E Voll-Sweep (User-Override D-16)** — User wählt 12 Specs explizit gegen Recommended 8-9. Begründung: Solver-Tuning ist Score-relevant — Weight-Persistenz, Cross-Reference-Validation, Multi-Row-Restrictions, audit-Trail brauchen dedizierte Regression-Guards. E2E-SOLVER-10 (weights-survive-solve-run) ist der kritische Integrations-Spec für REQ-Success-Criteria 5.

- **3-Plan-Pattern-Continuation (D-17)** — User bestätigt Phase-11/12/13-Pattern. Plan 14-01 ist mittelgroß (1 Migration + 1 neuer Service + 4 Service-Erweiterungen + Cross-Reference-Validation + Resolution-Chain + Sidecar-Catalog-Endpoint), Plan 14-02 ist Standard-Frontend-Tabs-Page (4 Tab-Components + Sub-Tabs in Tab 4 + Slider+Form-Forms), Plan 14-03 ist 12-Spec-E2E-Sweep mit Solver-Run-Integration-Spec.

- **Sidebar-Strenge Admin-only (D-03)** — User bestätigt Phase 13 USER-Mgmt-Strenge: Solver-Tuning ist sehr technisch, Schulleitung soll keine Soft-Weights versehentlich verbiegen können. Explizite Trennung Personal-Gruppe (admin+schulleitung) vs Solver-Gruppe (admin-only).

</specifics>

<deferred>
## Deferred Ideas

- **Lehrer-Sperrzeiten als ad-hoc admin-override (BLOCK_TIMESLOT)** — User entschied gegen separaten Tab in Phase 14. BLOCK_TIMESLOT bleibt im Schema und wird via Phase 11 Lehrer-Detail Tab "Verfügbarkeit" (TEACHER-04) bedient. Falls sich später ein Bedarf für admin-overrides ohne Lehrer-Detail-Detour ergibt: Phase 16 Dashboard oder v1.2.

- **Pre-Solve-Impact-Preview** — Backend POST `/admin/solver-tuning/preview { weights }` mit 10s-Mini-Solve, projected scores zurück. Wertvoll für "Was passiert wenn ich 'Mathe-Morgens' auf 100 setze?"-Frage. Erfordert ganzen Solver-Sidecar-Roundtrip + neuer Endpoint. Defer v1.2.

- **Score-Sparklines pro Constraint im Weights-Tab** — Inline Mini-Charts der letzten 5 Runs zeigen wie Constraint-Score reagiert. Pre-computed Baseline nötig. Defer Phase 16 Dashboard.

- **Drag-and-Drop-Prioritäts-Ranking** — Statt absoluter Weights eine ordinale Sortierung der 8 Soft-Constraints. Mathematisch nicht-äquivalent zu Weight-Tuning. Defer Forever (Solver-API ist Weight-basiert).

- **Visueller Wochenraster-Editor für NO_LESSONS_AFTER** — Drag-to-block grid wie Phase 11 Lehrer-Verfügbarkeit. Out of scope von "NO_LESSONS_AFTER" Semantik (das ist nur eine Periode-Schwelle pro Klasse, kein volles Grid). Eventuell sinnvoll wenn neuer templateType `CLASS_TIMESLOT_GRID` kommt — defer v1.2.

- **Pre-Solve-Validation-Warnings** — Beim Speichern eines Templates: prüfe ob die kombinierte Restriktion-Menge mathematisch lösbar ist (z.B. 5 Klassen können nur bis Periode 4, aber Stundentafel braucht 6h/Tag). Komplexe constraint-propagation. Defer v1.2.

- **Multi-Schule Constraint-Templating** — "Wende dieselben Weights auf alle Schulen einer Region an". v1 ist Single-Tenant — defer v2.

- **A/B-Testing-Framework für Weights** — Run zwei Solves mit unterschiedlichen Weights parallel, präsentiere Score-Diff. Per-Run-DTO-on-top (D-06) ist die Bausteine, aber UI-Surface ist v1.2.

- **Weight-Templates / Presets** — Vordefinierte Weight-Bundles ("Volksschule-Standard", "BHS-Tagesschwerpunkte"). Defer bis User-Patterns klar sind (~3-6 Monate Produktiv-Nutzung).

- **Sub-Tab Reorder in Tab 4** — Drag-and-Drop für Bevorzugte-Slots (Priorisierung). Out of scope.

- **Constraint-Catalog-Auto-Discovery aus Java-Sidecar** — Sidecar exponiert `/solver/constraints/catalog` REST-Endpoint, NestJS holt CONSTRAINT_CATALOG zur Laufzeit. Eliminiert manuellen Sync (D-10). Sinnvoll für Plugin-System v1.2 (ohne neu deployen). Phase 14 bleibt bei manuellem Mirror.

- **Editierbare Hard-Constraints** — Erlaube Admin Hard-Constraints zu deaktivieren (z.B. "ignoriere Raum-Konflikte temporär"). Verletzt Solver-Architektur (Java-Solver kennt nur konfigurierbare Soft-Weights). Defer Forever.

- **Constraint-Weight-History-Timeline pro Constraint** — Chronologischer Log aller Weight-Changes pro Constraint mit Wer/Wann/Warum. Phase-15-Audit-Viewer deckt das mit Filter-by-subject ab. Kein dedicated Surface nötig.

</deferred>

---

*Phase: 14-solver-tuning*
*Context gathered: 2026-04-25*
