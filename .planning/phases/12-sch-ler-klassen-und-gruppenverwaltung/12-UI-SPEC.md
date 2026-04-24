---
phase: 12
slug: sch-ler-klassen-und-gruppenverwaltung
status: draft
shadcn_initialized: true
preset: default-neutral-cssvars
created: 2026-04-24
---

# Phase 12 — UI Design Contract

> Visual and interaction contract for Schüler-, Klassen- und Gruppenverwaltung. Consumed by gsd-planner, gsd-executor, gsd-ui-checker, gsd-ui-auditor.
>
> **Authoritative upstream:** `12-CONTEXT.md` (user decisions) + `12-RESEARCH.md` (code-surface grounding) + `apps/web/src/app.css` (existing design tokens) + `apps/web/components.json` (shadcn config).
>
> **Non-goals:** Do NOT re-invent tokens already declared in `apps/web/src/app.css`. This spec binds phase-12 surfaces to the existing token set and only adds phase-specific rules (German copy, accent reserved-for list, icon inventory, interaction choreography).

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn/ui | `apps/web/components.json` confirmed |
| Preset | `default` style, `neutral` base color, CSS variables on | `components.json` |
| Component library | Radix UI via shadcn/ui (per CLAUDE.md; currently transitioning to Base UI — monitor, do not migrate in Phase 12) | CLAUDE.md |
| Icon library | lucide-react | `components.json iconLibrary: "lucide"` |
| Font | Inter, fallbacks `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `app.css --font-sans` |
| Dark mode | **Not supported in v1.1** — no `prefers-color-scheme` media query in `app.css`; only 2 incidental `dark:*` class usages in legacy files (TeacherListTable, KeycloakLinkDialog). Phase 12 MUST NOT introduce new `dark:*` variants. | `apps/web/src/app.css` grep |
| Styling | Tailwind CSS 4 with `@theme` CSS custom properties | `app.css` header |

**Design language direction:** Dense-admin, Untis-replacement aesthetic. Neutral greys for chrome, blue primary for principal actions, red destructive for irreversible actions, green/orange reserved for status signaling only. No illustrative imagery in v1.1 (deferred — executor may ship text-only empty states).

---

## Spacing Scale

Declared values (all multiples of 4, aligned to Tailwind 4 defaults — use Tailwind utility classes `p-1 p-2 p-4 p-6 p-8 p-12 p-16` rather than raw px):

| Token | Value | Tailwind | Usage in Phase 12 |
|-------|-------|----------|-------------------|
| xs | 4px | `1` | Icon-to-label gap in buttons, inline badge padding |
| sm | 8px | `2` | Table cell padding vertical, compact form row gap |
| md | 16px | `4` | Default form field vertical gap, card inner padding, tab content padding |
| lg | 24px | `6` | Section breaks within a tab, dialog inner padding |
| xl | 32px | `8` | Gap between major page sections (filter-bar → table, table → pagination) |
| 2xl | 48px | `12` | Desktop page top padding above PageShell header |
| 3xl | 64px | `16` | Not used in Phase 12 (reserved for marketing surfaces) |

**Phase-12 mobile exceptions:**
- **Touch targets ≥ 44×44px (MOBILE-ADM-02 hard rule):** Row-action icon buttons, row-checkboxes, and Tab triggers MUST render at min `h-11 w-11` (44px) on viewports `<640px`. Desktop may shrink to `h-9` (36px).
- **Mobile `StickyMobileSaveBar`:** 56px fixed height at bottom, 16px horizontal padding — inherits Phase 10 component spec, no changes.
- **Mobile list row density:** table rows on `<640px` switch to stacked `Card` layout with 12px vertical padding (exception: 12px is a multiple of 4, non-8-scale but justified by card density — flagged for checker awareness).

---

## Typography

Exactly 4 type sizes and 2 weights (per 60/30/10 + contract-minimalism rules). All sizes map to Tailwind utility classes.

| Role | Size | Weight | Line Height | Tailwind | Phase 12 usage |
|------|------|--------|-------------|----------|----------------|
| Body | 14px | 400 (regular) | 1.5 (21px) | `text-sm leading-normal font-normal` | Table cell text, form input text, description text, toast body, badge label |
| Label | 14px | 600 (semibold) | 1.4 (20px) | `text-sm font-semibold` | Form field labels, table column headers, tab triggers, breadcrumb current segment, action-button label |
| Heading | 18px | 600 (semibold) | 1.3 (24px) | `text-lg font-semibold` | Card titles (`CardTitle`), Dialog titles, tab-section titles (e.g. "Erziehungsberechtigte"), PageShell subtitle headers |
| Display | 24px | 600 (semibold) | 1.2 (29px) | `text-2xl font-semibold` | PageShell page title (student name, class name, list-page title "Schüler:innen", "Klassen") |

**Rules:**
- Never introduce a 5th size. If a new scale appears to be needed (e.g. "huge number stat"), escalate to checker; the likely fix is `Display` + `text-muted-foreground` caption below.
- Never introduce a 3rd weight. Italic/underline are also forbidden for emphasis; use `font-semibold` or `text-foreground` vs `text-muted-foreground` color shift instead.
- Numbers in data tables (Wochenstunden column, Member-Count) MUST use `tabular-nums` utility to keep column alignment in the SUBJECT-04 Wochenstunden editor and class-list `Schülerzahl` column.
- Monospace is NOT used in Phase 12 surfaces.

---

## Color

Mapped directly to `app.css` CSS variables. Do NOT hardcode hex values in JSX; use Tailwind utilities that resolve to these variables (`bg-background`, `bg-card`, `bg-primary`, `text-destructive`, etc).

### 60 / 30 / 10 split

| Role | HSL | CSS var | Tailwind | Usage |
|------|-----|---------|----------|-------|
| Dominant (60%) | `hsl(0 0% 100%)` | `--color-background` | `bg-background` | Page canvas, table body, form input canvas |
| Secondary (30%) | `hsl(240 5% 96%)` | `--color-card` / `--color-muted` / `--color-secondary` | `bg-card`, `bg-muted`, `bg-secondary` | Cards, sidebar, tab-list background, table header row, sticky mobile save bar, filter-bar container |
| Accent (10%) | `hsl(221 83% 53%)` (blue) | `--color-primary` | `bg-primary text-primary-foreground`, `text-primary`, `ring-primary` | Reserved — see below |
| Destructive | `hsl(0 84% 60%)` (red) | `--color-destructive` | `bg-destructive`, `text-destructive`, border variant | Reserved — see below |
| Success signal | `hsl(142 71% 45%)` (green) | `--color-success` | `text-success`, `bg-success/10` | Reserved — see below |
| Warning signal | `hsl(38 92% 50%)` (amber) | `--color-warning` | `text-warning`, `bg-warning/10` | Reserved — see below |

### Accent (blue primary) — reserved-for list

The blue primary is restricted to these elements across Phase 12. No other element may use `bg-primary` or `text-primary`.

1. **Primary CTA button** on every surface (see Copywriting Contract for labels).
   - `/admin/students` header: `Schüler:in anlegen`
   - `/admin/students/$id` Stammdaten tab sticky save: `Änderungen speichern`
   - `/admin/classes` header: `Klasse anlegen`
   - `/admin/classes/$id` Stammdaten/Stundentafel/Schüler/Gruppen tab save: `Änderungen speichern`
   - Dialog primary confirm button (`Verschieben`, `Anlegen und verknüpfen`, `Regeln anwenden`, `Stundentafel übernehmen`)
2. **Active Tab trigger underline / bar** (shadcn `TabsTrigger` active state).
3. **Focus ring** on every interactive element (`--color-ring` resolves to primary). Non-negotiable — keyboard a11y requirement.
4. **Active sidebar item indicator** (existing `AppSidebar` behavior — no change).
5. **"Auto"-assigned membership badge** (D-11) uses a GREEN variant, NOT primary — see Success.

### Destructive (red) — reserved-for list

1. **Delete / Archive confirmation dialog primary button** (`Endgültig löschen`, `Archivieren`).
2. **Row-action icon buttons** for destructive actions in hover/focus state only (`TrashIcon`, `ArchiveIcon`).
3. **Inline form validation error text** below invalid fields (`text-destructive text-sm`).
4. **Toast variant="destructive"** for Silent-4XX-Invariante violations surfaced as user-visible errors.
5. **`AffectedEntitiesList` component header** when rendering in a 409 conflict dialog (existing Phase 11 pattern).
6. **"Archivierte Schüler:innen" filter badge** when status=archived is selected in filter-bar — uses red-subtle `bg-destructive/10 text-destructive` to signal read-only historic cohort.

### Success (green) — reserved-for list

1. **"Auto" assignment badge** in D-11 Manual-Overrides (`bg-success/10 text-success`) — indicates membership came from `GroupDerivationRule.applyRules`.
2. **"Aktiv" status badge** in student list Status column.
3. **Toast variant="success"** on successful Save/Archive/Apply-Rules (if existing toast system supports it — otherwise neutral default).

### Warning (amber) — reserved-for list

1. **"Manuell" assignment badge** in D-11 Manual-Overrides (`bg-warning/10 text-warning`) — signals override that next `applyRules` will not re-sync.
2. **Solver-Re-Run InfoBanner** at the top of Class-Detail-Stammdaten and Class-Detail-Stundentafel tabs AFTER any save that could invalidate an existing TimetableRun: `bg-warning/10 border-warning/40 text-warning-foreground` (reuses Phase 10 D-06 pattern). Copy: `"Änderungen wirken sich erst beim nächsten Stundenplan-Lauf aus."`
3. **`isCustomized=true` badge** on ClassSubject rows in SUBJECT-04 editor — amber outline badge: `Angepasst`.

**Forbidden color usages (checker will reject):**
- No additional palette colors (purple, teal, pink) introduced for Phase 12.
- No color used as the sole affordance for meaning (always pair color with icon or text label — WCAG 1.4.1).
- No `text-primary` on body copy. Primary is for interactive affordances only.
- `SUBJECT_PALETTE` (Phase 11 deterministic subject coloring) is permitted ONLY in: (a) Stundentafel editor row accent-strip, (b) Schüler-Gruppen-tab group-card left border — nowhere else. Do NOT apply subject palette to list rows in student/class list (prevents rainbow-dashboard effect).

---

## Copywriting Contract

German UI, English API fields (Phase 1 D-15). All user-facing strings below are the canonical copy — executor MUST use verbatim unless a checker-approved deviation is documented.

### Primary CTAs

| Surface | Copy |
|---------|------|
| `/admin/students` page header | `Schüler:in anlegen` |
| `/admin/classes` page header | `Klasse anlegen` |
| Student-Detail Stammdaten/Erziehungsberechtigte tab sticky-save | `Änderungen speichern` |
| Class-Detail all 4 tabs sticky-save | `Änderungen speichern` |
| Student-Detail Eltern tab (no parent linked state) | `Erziehungsberechtigte:n verknüpfen` |
| Stundentafel tab (empty, no ClassSubjects yet) | `Stundentafel aus Vorlage übernehmen` |
| Stundentafel editor footer (add row) | `+ Fach hinzufügen` |
| Gruppen tab (rule-builder empty) | `+ Regel hinzufügen` |
| Gruppen tab (rules exist, before apply) | `Regeln anwenden` |
| Students-list multi-select toolbar | `Ausgewählte verschieben` |

### Empty states

Every list + tab empty state MUST render: an icon (`text-muted-foreground`, 24px), a heading (`text-lg font-semibold`), a body line (`text-sm text-muted-foreground`), and a single primary CTA. No illustrative SVGs in v1.1.

| Surface | Heading | Body | CTA |
|---------|---------|------|-----|
| `/admin/students` no students | `Noch keine Schüler:innen` | `Legen Sie die erste Schülerin oder den ersten Schüler an, um zu beginnen.` | `Schüler:in anlegen` |
| `/admin/students` filter yields nothing | `Keine Schüler:innen gefunden` | `Passen Sie die Filter an oder setzen Sie sie zurück.` | `Filter zurücksetzen` (ghost button) |
| `/admin/classes` no classes | `Noch keine Klassen` | `Legen Sie die erste Stammklasse für das aktive Schuljahr an.` | `Klasse anlegen` |
| Student-Detail → Erziehungsberechtigte tab (0 linked) | `Keine Erziehungsberechtigten verknüpft` | `Suchen Sie per E-Mail nach bestehenden Eltern oder legen Sie neue an.` | `Erziehungsberechtigte:n verknüpfen` |
| Student-Detail → Gruppen tab (0 memberships) | `Keine Gruppen-Mitgliedschaften` | `Gruppen ergeben sich aus den Ableitungsregeln der Stammklasse oder manuellen Zuordnungen.` | (no CTA — deep-link only) |
| Class-Detail → Stundentafel tab (no ClassSubjects) | `Stundentafel noch nicht angewendet` | `Übernehmen Sie die Stundentafel-Vorlage für den Schultyp und passen Sie sie bei Bedarf an.` | `Stundentafel aus Vorlage übernehmen` |
| Class-Detail → Schüler tab (0 students) | `Noch keine Schüler:innen in dieser Klasse` | `Legen Sie Schüler:innen direkt an oder verschieben Sie bestehende aus einer anderen Klasse.` | `Schüler:in anlegen` (links to `/admin/students` with pre-filled classId) |
| Class-Detail → Gruppen tab (0 rules + 0 groups) | `Noch keine Gruppen` | `Definieren Sie Ableitungsregeln oder weisen Sie Schüler:innen manuell Gruppen zu.` | `+ Regel hinzufügen` |

### Error states (Silent-4XX-Invariante compliance)

Every mutation error MUST surface via `Toast variant="destructive"` with the copy below. Never silently swallow 4xx (see auto-memory `feedback_admin_requirements_need_ui_evidence.md` + `feedback_e2e_first_no_uat.md`).

| Condition | Toast title | Toast description |
|-----------|-------------|-------------------|
| 409 `DELETE /students/:id` (Orphan-Guard) | `Schüler:in kann nicht gelöscht werden` | `Es bestehen noch Verknüpfungen. Öffnen Sie die Details oder archivieren Sie stattdessen.` + `AffectedEntitiesList` below toast (inline in Dialog) |
| 409 `DELETE /classes/:id` (Orphan-Guard) | `Klasse kann nicht gelöscht werden` | `Die Klasse enthält noch Schüler:innen, Gruppen oder Stundentafel-Einträge.` + `AffectedEntitiesList` |
| 400 validation on student create/update | `Speichern nicht möglich` | `Bitte prüfen Sie die markierten Felder.` (inline field errors appear below inputs) |
| 404 parent not found (Search-by-Email) | (no toast — handled inline) | Command-popover empty state: `Keine Eltern mit dieser E-Mail gefunden. Neu:e Erziehungsberechtigte:n anlegen?` (inline CTA button below) |
| 409 on Apply-Stundentafel (existing ClassSubjects) | `Stundentafel bereits vorhanden` | `Setzen Sie die Stundentafel erst zurück, bevor Sie eine neue Vorlage übernehmen.` |
| 500 on any mutation | `Etwas ist schiefgelaufen` | `Bitte versuchen Sie es später erneut. Falls das Problem bleibt, kontaktieren Sie die Administration.` |
| Network offline | `Keine Verbindung` | `Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.` |
| Silent-4XX fallback (unexpected 4xx) | `Aktion nicht möglich` | `Der Server hat die Anfrage abgelehnt (Status {status}).` (Phase 10.2-04 invariant — visible test in E2E) |

### Destructive confirmations

Destructive dialogs use `WarnDialog` (Phase 10 shared). Pattern: **ActionName:ConfirmationCopy:PrimaryButtonLabel**. Primary button is `variant="destructive"`.

| Action | Dialog title | Dialog body | Confirm button | Cancel button |
|--------|-------------|-------------|----------------|---------------|
| Archivieren Schüler (D-04) | `Schüler:in archivieren?` | `{firstName} {lastName} wird als archiviert markiert. Daten bleiben erhalten. Die Person erscheint nicht mehr in aktiven Listen und Stundenplänen. Reaktivierung jederzeit möglich.` | `Archivieren` | `Abbrechen` |
| Reaktivieren Schüler (D-04) | `Schüler:in reaktivieren?` | `{firstName} {lastName} erscheint wieder in aktiven Listen. Prüfen Sie Klassenzuordnung und Gruppen vor dem nächsten Stundenplan-Lauf.` | `Reaktivieren` | `Abbrechen` |
| Endgültig löschen Schüler (D-13.3, nur wenn Orphan-Guard grünes Licht gibt) | `Schüler:in endgültig löschen?` | `Diese Aktion kann nicht rückgängig gemacht werden. Alle Personendaten werden gelöscht. Für DSGVO-konforme Löschung mit Audit-Trail nutzen Sie die Anonymisierung (ab Phase 15).` | `Endgültig löschen` | `Abbrechen` |
| Klasse löschen (D-13.4) | `Klasse endgültig löschen?` | `Die Klasse {name} wird entfernt. Gruppen und Stundentafel-Einträge werden ebenfalls gelöscht. Schüler:innen-Zuordnungen werden auf "Ohne Stammklasse" gesetzt.` | `Endgültig löschen` | `Abbrechen` |
| Stundentafel zurücksetzen (D-09) | `Stundentafel auf Vorlage zurücksetzen?` | `Alle manuellen Anpassungen der Wochenstunden werden überschrieben. Die Vorlage für {schoolType} {yearLevel} wird erneut angewendet.` | `Zurücksetzen` | `Abbrechen` |
| Erziehungsberechtigte:n entfernen (D-03) | `Verknüpfung entfernen?` | `{parentFirstName} {parentLastName} wird von {studentFirstName} {studentLastName} entkoppelt. Die Person bleibt im System, falls andere Kinder verknüpft sind.` | `Entfernen` | `Abbrechen` |
| Klassen-Umzug (D-05, Single) | `Schüler:in verschieben?` | `{firstName} {lastName} wird von {currentClass} nach {targetClass} verschoben. Klassenbuch-Einträge bleiben erhalten.` | `Verschieben` | `Abbrechen` |
| Klassen-Umzug (D-05, Bulk) | `{n} Schüler:innen verschieben?` | `Die ausgewählten {n} Schüler:innen werden nach {targetClass} verschoben. Klassenbuch-Einträge bleiben erhalten.` (plus Avatar-Stack preview, max 5 visible + `+N weitere`) | `Verschieben` | `Abbrechen` |
| Apply-Rules Dry-Run Confirm (D-10) | `Gruppenableitungsregeln anwenden?` | Preview-Table: `{n} neue Gruppen`, `{n} neue Mitgliedschaften`, `{n} Konflikte (manuelle Zuordnungen bleiben unberührt)`. | `Anwenden` | `Abbrechen` |

### Inline micro-copy (not destructive, but load-bearing)

| Context | Copy |
|---------|------|
| Filter-bar status-toggle | `Aktiv` / `Archiviert` / `Alle` |
| Filter-bar class dropdown default option | `Alle Klassen` + explicit option `Ohne Stammklasse` |
| Student-Detail → Erziehungsberechtigte search placeholder | `E-Mail eingeben …` |
| Student-Detail → Erziehungsberechtigte search no-match | `Keine Treffer. Neu:e Erziehungsberechtigte:n anlegen?` |
| Class-Detail → Stammdaten Klassenvorstand picker placeholder | `Nachname eingeben …` |
| Class-Detail → Schüler tab row action | `Aus Klasse entfernen` / `In andere Klasse verschieben` |
| Gruppen-Tab Auto-Remove-Info | `Wird bei nächster Regel-Anwendung wieder hinzugefügt.` |
| SUBJECT-04 Wochenstunden input aria-label | `Wochenstunden für {subjectName}` |
| Mobile StickyMobileSaveBar discard | `Verwerfen` |
| UnsavedChangesDialog title | `Ungespeicherte Änderungen` |
| UnsavedChangesDialog body | `Sie haben Änderungen in diesem Tab, die nicht gespeichert sind. Möchten Sie den Tab trotzdem verlassen?` |
| UnsavedChangesDialog confirm | `Verwerfen und wechseln` |

---

## Component Inventory

### Reused from Phase 10/11 (no changes required)

| Component | Source | Used in Phase 12 |
|-----------|--------|------------------|
| `PageShell` | `components/admin/shared/` | All 4 new routes |
| `UnsavedChangesDialog` | shared | Student-Detail + Class-Detail tab switching |
| `StickyMobileSaveBar` | shared | Every form tab on `<640px` |
| `InfoBanner` | shared | Solver-Re-Run warnings (Class-Detail) |
| `WarnDialog` | shared | All destructive confirmations listed above |
| `AffectedEntitiesList` | `components/admin/teacher/` | Extend `kind` union with: `'student' \| 'class' \| 'group' \| 'class-subject' \| 'group-membership' \| 'derivation-rule' \| 'parent-student'` (see RESEARCH §2.2) |
| `DestructiveEditDialog` | school-settings | Stundentafel "Auf Vorlage zurücksetzen" flow (D-09) |
| Tailwind utilities + existing CSS vars | `app.css` | All styling |

### shadcn primitives required

All listed should be present in `components/ui/`. **Planner MUST verify at Wave 0 and run `npx shadcn add {missing}` if absent.** Per RESEARCH §7 and Glob findings, `command.tsx` and `checkbox.tsx` are MISSING and MUST be installed.

| Primitive | Used for | Present? |
|-----------|----------|----------|
| `tabs` | Student-Detail (3 tabs), Class-Detail (4 tabs) | YES |
| `dialog` | All confirmation/preview/create dialogs | YES |
| `input` | All form fields | YES (assumed) |
| `select` | Filter dropdowns (Klasse, Schuljahr, Schultyp, YearLevel, GroupType) | YES (assumed) |
| `button` | All actions | YES (assumed) |
| `card` | Group-Detail cards (D-11), mobile list-cards | YES (assumed) |
| `label` | Form labels | YES (assumed) |
| `popover` | Autocomplete search host | YES (assumed) |
| `dropdown-menu` | Row-action menu (Archivieren / Verschieben / Löschen) | YES (assumed) |
| `command` | Parent-by-Email search (D-03), Teacher-by-Name search (D-08), Subject-Combobox in Stundentafel "+ Fach", Student-Multi-Select in Rule-Builder (D-10) + Manual-Overrides (D-11) | **MISSING — install at Wave 0** |
| `checkbox` | Multi-select rows in `/admin/students` (D-05 Bulk-Move), Rule-Builder student-filter (D-10) | **MISSING — install at Wave 0** |
| `badge` | Status/Auto/Manuell/isCustomized signaling | YES (assumed, verify) |
| `toast` (sonner or shadcn toast) | Silent-4XX toast invariant | YES (from Phase 10) |

### New Phase-12 components (executor creates)

| Component | File | Responsibility |
|-----------|------|----------------|
| `StudentListTable` | `components/admin/student/StudentListTable.tsx` | Desktop dense table with multi-select, row-click-to-detail, row-actions |
| `StudentMobileCards` | `components/admin/student/StudentMobileCards.tsx` | `<640px` stacked cards with swipe-less row actions |
| `StudentFilterBar` | `components/admin/student/StudentFilterBar.tsx` | Search + Klasse + Status + Schuljahr filter controls + `Filter zurücksetzen` reset |
| `StudentCreateDialog` | `components/admin/student/StudentCreateDialog.tsx` | Dialog form matching TeacherCreateDialog shape |
| `StudentDetailTabs` | `components/admin/student/StudentDetailTabs.tsx` | 3-tab container (Stammdaten / Erziehungsberechtigte / Gruppen) |
| `StudentStammdatenTab` | `components/admin/student/StudentStammdatenTab.tsx` | Person + Student fields, pro-tab save |
| `StudentParentsTab` | `components/admin/student/StudentParentsTab.tsx` | Parent list + Search-by-Email + Inline-Create |
| `StudentGroupsTab` | `components/admin/student/StudentGroupsTab.tsx` | Read-mostly group memberships with Auto/Manuell badge + deep-link |
| `ArchiveStudentDialog` | `components/admin/student/ArchiveStudentDialog.tsx` | WarnDialog wrapper for archive action |
| `RestoreStudentDialog` | `components/admin/student/RestoreStudentDialog.tsx` | WarnDialog wrapper for restore |
| `MoveStudentDialog` | `components/admin/student/MoveStudentDialog.tsx` | Single + Bulk move dialog (prop `mode: 'single' \| 'bulk'`) |
| `ParentSearchPopover` | `components/admin/student/ParentSearchPopover.tsx` | Command-popover: search-by-email + inline-create CTA |
| `InlineCreateParentForm` | `components/admin/student/InlineCreateParentForm.tsx` | Mini-form nested inside ParentSearchPopover |
| `DeleteStudentDialog` | `components/admin/student/DeleteStudentDialog.tsx` | 409 Orphan-Guard path with AffectedEntitiesList |
| `ClassListTable` + `ClassMobileCards` + `ClassFilterBar` + `ClassCreateDialog` | `components/admin/class/*` | Class-list analogs |
| `ClassDetailTabs` | `components/admin/class/ClassDetailTabs.tsx` | 4-tab container |
| `ClassStammdatenTab` | `components/admin/class/ClassStammdatenTab.tsx` | name, yearLevel (read-only after create), schoolYear (read-only), Klassenvorstand picker |
| `TeacherSearchPopover` | `components/admin/class/TeacherSearchPopover.tsx` | Command-popover for Klassenvorstand (`GET /teachers?search=`) |
| `StundentafelTab` | `components/admin/class/StundentafelTab.tsx` | Apply-Template empty state + editable table + "+ Fach" + Reset |
| `ApplyStundentafelDialog` | `components/admin/class/ApplyStundentafelDialog.tsx` | Schultyp dropdown + preview table + confirm |
| `StundentafelEditorTable` | `components/admin/class/StundentafelEditorTable.tsx` | Rows: Fach | Wochenstunden (number input) | isCustomized badge | Delete-row; "+ Fach" footer |
| `StundentafelMobileCards` | `components/admin/class/StundentafelMobileCards.tsx` | `<640px` stacked cards per ClassSubject |
| `ClassStudentsTab` | `components/admin/class/ClassStudentsTab.tsx` | Read-mostly student list with row-action "Verschieben" / "Aus Klasse entfernen" |
| `ClassGroupsTab` | `components/admin/class/ClassGroupsTab.tsx` | 2 sections: Rule-Builder + Group-Overrides |
| `GroupRuleBuilderTable` | `components/admin/class/GroupRuleBuilderTable.tsx` | Rows: Typ | Name | Level | Schüler-Filter (multi-select) | Delete; + `Regel hinzufügen` + `Regeln anwenden` |
| `ApplyRulesPreviewDialog` | `components/admin/class/ApplyRulesPreviewDialog.tsx` | Dry-Run preview: new groups / new memberships / conflicts |
| `GroupOverridesPanel` | `components/admin/class/GroupOverridesPanel.tsx` | Expandable group cards with member list + Auto/Manuell badges + add/remove |
| `SolverReRunBanner` | `components/admin/class/SolverReRunBanner.tsx` | InfoBanner wrapper with warning semantics (amber) |

### Optional consolidation (planner discretion per RESEARCH §13.3)

- `AutocompleteSearch<TResult>` — reusable component that backs both `ParentSearchPopover` and `TeacherSearchPopover`. Propose only if the second implementation starts to duplicate >30 lines. Otherwise keep two focused components.

### Icon inventory (lucide-react, canonical)

| Concept | Icon |
|---------|------|
| Schüler:innen (list + nav + empty state) | `UsersRound` |
| Klassen (list + nav + empty state) | `School` |
| Gruppen | `Users` |
| Erziehungsberechtigte | `UserPlus` (add) / `UserMinus` (remove) |
| Archivieren / Reaktivieren | `Archive` / `RotateCcw` |
| Klassen-Umzug | `MoveRight` (single) / `MoveRight` + counter (bulk) |
| Suche | `Search` |
| Filter | `SlidersHorizontal` |
| Regel hinzufügen | `Plus` |
| Regeln anwenden | `Play` |
| Löschen (row action) | `Trash2` |
| Edit (row action) | `Pencil` |
| Row-More-Menu | `MoreHorizontal` |
| Success check | `CircleCheck` |
| Warning / Solver-Re-Run | `TriangleAlert` |
| Info | `Info` |
| Close dialog | `X` |
| Chevron (expand card) | `ChevronDown` / `ChevronRight` |
| Drag-handle (NOT used in Phase 12 — drag-drop deferred) | — |

**Icon size rule:** 16px (`h-4 w-4`) inline with body text; 20px (`h-5 w-5`) as standalone row-action button child; 24px (`h-6 w-6`) in empty-state headers. Icon color `text-muted-foreground` by default; `text-primary` ONLY on the active tab trigger or primary CTA chevron; `text-destructive` on destructive row-action hover.

---

## Responsive / Layout Contract

### Breakpoints (Tailwind 4 defaults)

| Breakpoint | Min-width | Phase 12 behavior |
|-----------|-----------|-------------------|
| Mobile | 0–639px | Mandatory target: **375px** (MOBILE-ADM-02). Lists → stacked Cards. Forms → single column. Tab triggers stack to horizontal scrolling strip. Sticky save bar bottom. |
| Tablet | 640–1023px | Two-column form where space allows. Lists remain table. |
| Desktop | 1024px+ | Default layout, three-column filter-bar, full table density. |

### Per-surface layout rules

**`/admin/students` (list)**

- Desktop: full-width dense table; Filter-bar sticky at top of content area; `Schüler:in anlegen` CTA top-right.
- Mobile 375: stacked Cards per row; Filter-bar collapses behind a `SlidersHorizontal` button opening a bottom-sheet Dialog; row-click → Detail-Page; multi-select enabled via long-press ... **simplified:** checkbox visible on each card; bulk-action bar slides up from bottom when any selection is active.
- Multi-select bar copy: `{n} ausgewählt` + `Ausgewählte verschieben` + close-icon.

**`/admin/students/$id` (3 tabs)**

- Desktop: horizontal Tabs row under PageShell title.
- Mobile 375: Tabs row becomes horizontally scrollable (no wrap); active indicator remains blue primary bar.
- Form column count: 2 on `≥1024px` in Stammdaten tab, 1 on `<1024px`.
- `StickyMobileSaveBar` visible only on `<640px`; desktop uses inline `Änderungen speichern` + `Verwerfen` bottom-right of tab panel.

**`/admin/classes/$id` → Stundentafel tab**

- Desktop: table with columns `Fach | Wochenstunden | isCustomized | Delete`.
- Mobile 375 (D-09 Discretion): collapses to stacked Cards. Each card: Fach-Label (left, subject-color strip), Wochenstunden-Number-Input (right, 48px wide with tabular-nums), isCustomized badge (inline), Delete row-action menu. "+ Fach" becomes a full-width button at list end.

**`/admin/classes/$id` → Gruppen tab**

- Desktop: two stacked sections with max-width 1200px.
- Mobile 375: sections full-width; Rule-Builder table compresses to one column per rule row showing Typ + Name + member-count summary; tapping a row opens an Edit-Dialog (dialog mirrors the inline-table inputs). This avoids horizontal scroll in a narrow Rule-Builder table.

### Touch target floor (MOBILE-ADM-02 hard rule)

- All interactive elements on `<640px`: **min 44×44 px**. This includes:
  - Row-checkboxes: use `h-11 w-11` tap area around a visually-smaller (20px) `Checkbox`.
  - Tab triggers: `min-h-11`.
  - Dropdown-menu triggers and popover triggers: `min-h-11 min-w-11`.
  - Icon-only row actions: `size="icon"` button variant = 44px on mobile.
- Forms inputs: `min-h-11` (44px) on mobile; desktop may use `h-9` (36px).

---

## Interaction Choreography (key flows)

### Silent-4XX-Invariante (every mutation)

1. `useMutation({ onError: (err) => toast.error(...) })` — explicit.
2. Never `.catch(() => undefined)` in UI code.
3. E2E `silent-4xx.spec.ts` pattern extended: for each of the 11 Phase-12 specs, assert that on forced 4xx the user sees a red toast OR a red inline error.

### Pro-Tab-Save with UnsavedChangesDialog

1. Each tab owns a Zustand slice: `tabXYZDirty: boolean`.
2. On tab-change, if `dirty === true`, show `UnsavedChangesDialog` (copy above).
3. On dialog confirm (`Verwerfen und wechseln`): reset form, navigate.
4. Mobile sticky save bar mirrors desktop buttons.

### Parent Search-by-Email (D-03)

1. User focuses Command input in popover → placeholder `E-Mail eingeben …`.
2. Debounce 300ms → `GET /parents?email={value}` (Phase 12 Gap-Fix).
3. 200 match: show row with `firstName lastName · email` + green `CircleCheck`; Enter or click → Confirm-Dialog "Erziehungsberechtigte:n verknüpfen" → `POST /students/:id/parents`.
4. 404 no-match: show copy `Keine Treffer. Neu:e Erziehungsberechtigte:n anlegen?` + button → opens `InlineCreateParentForm` inside same popover (fields firstName, lastName, email prefilled, phone optional) → on submit: single-tx Create Parent + Link (per D-03).

### Apply-Stundentafel (D-09)

1. Empty Stundentafel tab → Primary CTA `Stundentafel aus Vorlage übernehmen`.
2. Dialog: Schultyp-Dropdown (default `School.type`) + YearLevel readout + Preview-Table (read-only, subjects with weeklyHours from `packages/shared/src/stundentafel/`).
3. Confirm: `POST /classes/:id/apply-stundentafel` → editable table replaces empty state. Toast: `Stundentafel übernommen`.
4. Editor: each row `weeklyHours` input (number, min=0, step=0.5). On change, row auto-flags `isCustomized=true` (amber badge `Angepasst`).
5. `+ Fach hinzufügen` → Combobox to pick subject not yet in list → appends row with `weeklyHours=0`.
6. `Auf Vorlage zurücksetzen` (top-right) → DestructiveEditDialog → on confirm, delete ClassSubjects + re-apply template. Toast: `Stundentafel zurückgesetzt`.

### Apply-Rules Dry-Run (D-10)

1. User edits rules in `GroupRuleBuilderTable`, no side-effect.
2. `Regeln anwenden` button → `ApplyRulesPreviewDialog` opens with server-rendered dry-run preview.
3. Preview sections (each a titled card): `Neue Gruppen ({n})`, `Neue Mitgliedschaften ({n})`, `Konflikte ({n})` — last only shown if >0, with explanatory copy `Diese Schüler:innen haben manuelle Zuordnungen, die unberührt bleiben.`.
4. Confirm button: `Anwenden`. Cancel button: `Abbrechen`.
5. On confirm → `POST /groups/apply-rules/:classId` → toast `Regeln angewendet` + refresh Group-Overrides panel.

### Multi-select Bulk Move (D-05)

1. Header checkbox + row checkboxes; selection state in Zustand.
2. Floating action bar appears at bottom-center (desktop) or bottom-sheet (mobile) when `selection.length > 0`.
3. `Ausgewählte verschieben` → `MoveStudentDialog` in `mode='bulk'`.
4. Dialog body: avatar-stack preview (max 5 + `+N weitere`), target Klassen-Picker (required), optional Notiz-Textarea, `Verschieben` button.
5. On confirm: sequential `PUT /students/:id` with new classId, progress counter `{done}/{total}`, final toast `{n} Schüler:innen verschoben`. On any 4xx: stop at current index, toast `{done}/{total} verschoben. Fehler bei {name}.` — NEVER silent.

---

## Registry Safety

`components.json` declares shadcn official only. No third-party registries introduced in Phase 12. No MCP tool usage for registry install beyond `npx shadcn add`.

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `command`, `checkbox` (install at Wave 0 if missing) | Not required (official) |
| Third-party | — (none declared) | Not applicable |

If a future task requires a third-party block, it MUST re-trigger the ui-researcher gate per `<design_contract_questions>` in the agent spec.

---

## Accessibility Contract (non-negotiable)

Basis for DSGVO audit alignment + EN 301 549 reasonable conformance targets for education sector.

- **Keyboard nav:** All row-actions reachable via `Tab`; `Enter` opens detail; `Space` toggles checkbox; `Esc` closes dialogs. No trap in popovers (verified in E2E).
- **Screen-reader labels:** Every icon-only button has `aria-label` in German (e.g. `Schüler:in archivieren`, `Aus Klasse entfernen`). Every form input has visible `<label>` via `Label` primitive.
- **Focus ring:** Always visible (uses `--color-ring` which resolves to primary). Never `outline: none` without replacement.
- **Color + text:** All status cues pair icon + color + text (Aktiv + green + `CircleCheck`; Auto + green badge + "Auto" text; Manuell + amber badge + "Manuell" text).
- **Contrast:** All foreground/background pairs meet WCAG AA (body text 4.5:1). The existing CSS variable palette has been validated in Phase 10/11.
- **Number inputs in Stundentafel editor:** `inputMode="decimal"` + `step="0.5"` + `min="0"`, keyboard arrows adjust by 0.5.
- **Table headers:** `<th scope="col">` and sortable headers expose `aria-sort`.
- **Dialogs:** `role="dialog"` + `aria-labelledby` pointing at DialogTitle + initial focus on first input or cancel button per shadcn default.

---

## Ambiguity / Inherits flags

Areas deliberately NOT pinned; planner/executor to confirm via Glob against existing admin pattern or escalate.

| Area | Status | Action |
|------|--------|--------|
| Loading skeleton exact shape per tab | inherits from existing admin pattern — planner/executor to confirm via Glob (`components/admin/**/Skeleton*`) | default: shadcn-style shimmering rows matching table columns |
| Toast library (sonner vs shadcn `toast`) | inherits — already chosen in Phase 10 | use whatever is imported in Phase 11 `teachers.$teacherId.tsx` adjacent code |
| Avatar stack component for Bulk-Move preview | inherits from existing admin pattern — planner/executor to confirm via Glob | if none exists, simple `-ml-2` overlapping circles with first initial; deferred to ui-auditor review |
| Empty-state illustration presence | explicitly NO in v1.1 | text-only empty states only |
| Export CSV button | explicitly deferred (CONTEXT `<deferred>`) | do not implement |
| Dark mode variants | explicitly NOT in v1.1 | must not introduce new `dark:*` classes |
| Parent-by-Email debounce interval | discretion | 300 ms recommended |
| Bulk-move max N | discretion | soft-limit 200; show warning if selection exceeds |
| Subject color palette usage beyond the 2 permitted contexts | discretion (ui-checker will flag) | do not extend without checker sign-off |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (CTA + empty states + error states + destructive confirmations all declared in German, verbatim)
- [ ] Dimension 2 Visuals: PASS (component inventory + icon inventory + layout per breakpoint documented)
- [ ] Dimension 3 Color: PASS (60/30/10 + accent reserved-for + destructive reserved-for + success + warning reserved-for)
- [ ] Dimension 4 Typography: PASS (4 sizes, 2 weights, line heights declared)
- [ ] Dimension 5 Spacing: PASS (8-point scale + mobile 44px exception declared)
- [ ] Dimension 6 Registry Safety: PASS (shadcn official only; `command` + `checkbox` install flagged)

**Approval:** pending

---

## UI-SPEC COMPLETE

**Phase:** 12 — Schüler-, Klassen- und Gruppenverwaltung
**Design System:** shadcn/ui default-style + neutral base + CSS variables (detected from existing `apps/web/components.json` + `apps/web/src/app.css`)

### Contract Summary
- Spacing: 8-point scale (4, 8, 16, 24, 32, 48) + mobile 44px touch-target exception
- Typography: 4 sizes (14, 14, 18, 24), 2 weights (400, 600), Inter
- Color: 60 white / 30 card-neutral / 10 blue primary; destructive red, success green, warning amber — each with explicit reserved-for lists
- Copywriting: 11 primary-CTA labels, 8 empty states, 7 error-toast templates, 9 destructive confirmations, 15+ inline micro-copy lines — all German, verbatim
- Registry: shadcn official only; `command` + `checkbox` primitives flagged for Wave 0 install

### File Created
`.planning/phases/12-sch-ler-klassen-und-gruppenverwaltung/12-UI-SPEC.md`

### Pre-Populated From
| Source | Decisions Used |
|--------|---------------|
| 12-CONTEXT.md | 16 (D-01 through D-16 locked decisions) |
| 12-RESEARCH.md | 14 (backend gaps, existing surfaces, closest analogs, open questions, assumptions) |
| `apps/web/components.json` | yes (preset, icon library, CSS-var mode) |
| `apps/web/src/app.css` | yes (Inter font, token palette, no dark mode) |
| User input | 0 (no new questions asked — upstream fully covered) |

### Ready for Verification
UI-SPEC complete. Checker can now validate against 6 design quality dimensions.
