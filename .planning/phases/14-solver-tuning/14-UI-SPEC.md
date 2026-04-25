---
phase: 14
slug: solver-tuning
status: draft
shadcn_initialized: true
preset: default-neutral-cssvars
created: 2026-04-25
---

# Phase 14 — UI Design Contract

> Visual and interaction contract for Solver-Tuning. Consumed by gsd-planner, gsd-executor, gsd-ui-checker, gsd-ui-auditor.
>
> **Authoritative upstream:** `14-CONTEXT.md` (locked decisions D-01..D-17) + Phase 10/11/12/13 UI-SPECs (pattern continuation) + `apps/web/src/app.css` (existing design tokens) + `apps/web/components.json` (shadcn config).
>
> **Non-goals:** Do NOT re-invent tokens. Phase 14 binds the new `/admin/solver-tuning` 4-tab page (with two nested sub-tabs in Tab 4) plus the Generator-Page Read-only-Card extension to the existing token set, and only adds phase-specific rules (slider semantics, Hard/Soft severity badges, Constraint-Catalog accent reservations, multi-row InfoBanner copy, deutsche Constraint-Übersetzungen).

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn/ui | `apps/web/components.json` (Phase 13 confirmed) |
| Preset | `default` style, `neutral` base color, CSS variables on | `components.json` |
| Component library | Radix UI via shadcn/ui (Slider primitive uses `@radix-ui/react-slider`) | CLAUDE.md |
| Icon library | lucide-react | `components.json iconLibrary: "lucide"` |
| Font | Inter, fallbacks `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `app.css --font-sans` |
| Dark mode | **Not supported in v1.1** — Phase 14 MUST NOT introduce new `dark:*` variants. | Phase 13 contract continuation |
| Styling | Tailwind CSS 4 with `@theme` CSS custom properties | `app.css` header |

**Design language direction:** Dense-admin, technical-configuration aesthetic. Neutral greys for chrome, blue primary for principal mutations (Save, Add), red destructive strictly for HARD-Constraint-Severity-Badges and irreversible actions (Delete-Restriction, Delete-Preference), amber for multi-row strictest-wins warning banner. **Slider-Tab is the centerpiece** — sliders feel responsive on touch (Phase 13 mobile 44px tap-zone rule applies to thumb), default-vs-custom state visually distinguished without color confusion (track-tint shift, never red/green on the slider itself — sliders are a *configuration surface*, not a status surface).

---

## Spacing Scale

Declared values (all multiples of 4, aligned to Tailwind 4 defaults — use Tailwind utility classes `p-1 p-2 p-4 p-6 p-8 p-12`):

| Token | Value | Tailwind | Usage in Phase 14 |
|-------|-------|----------|-------------------|
| xs | 4px | `1` | Icon-to-label gap in severity-badges, inline NumberInput-to-Slider gap, Reset-Icon-Button padding |
| sm | 8px | `2` | Catalog-row vertical padding, Slider-Row vertical padding, Sub-Tab-Trigger horizontal gap, Switch-to-label gap |
| md | 16px | `4` | Default form field vertical gap, Card inner padding, Tab content padding, Slider-Row card padding, Add-Dialog form vertical rhythm |
| lg | 24px | `6` | Section breaks within a tab, Dialog inner padding, gap between Hard-Section and Soft-Section in Catalog-Tab, Sub-Tab-content top spacing |
| xl | 32px | `8` | Gap between major page sections (Header → Tabs, Table → Add-Button, InfoBanner → Table) |
| 2xl | 48px | `12` | Desktop page top padding above PageShell header |
| 3xl | 64px | `16` | Not used in Phase 14 |

**Phase-14 mobile exceptions (MOBILE-ADM-02 hard rule — 375px viewport):**
- **Touch targets ≥ 44×44 px:** Tab triggers (4 main + 2 nested sub-tabs), Slider thumbs, NumberInput up/down arrows (custom Wrapper for spinner buttons), Reset-Icon-Button, Switch (isActive-Toggle in Restriction/Preference rows), Add-Restriction button, Edit/Delete row-action icons, Sub-Tab triggers — all MUST render at min `h-11 w-11` (44px) on viewports `<640px`. Desktop may shrink to `h-9` (36px).
- **Mobile `StickyMobileSaveBar`:** 56px fixed height at bottom, 16px horizontal padding — Phase 10 component spec, no changes. Present ONLY on Tab 2 "Gewichtungen" (the only dirty-bulk tab; Tabs 3 and 4 use individual CRUD).
- **Mobile horizontal-scroll Tab-Bar:** `overflow-x-auto`, `scroll-snap-type: x mandatory`, active-tab snaps to start via `scroll-into-view` on mount — Phase 13 D-04 pattern verbatim.
- **Mobile Sub-Tab-Bar in Tab 4:** Sub-Tabs (`Vormittags-Präferenzen` / `Bevorzugte Slots`) collapse to vertical Toggle-Group on `<md` (640px) — full-width row per option.
- **Mobile Slider-Row layout:** label + Java-name on row 1, slider full-width on row 2, NumberInput + Default-Hint + Reset-Icon on row 3 (44px tap zones throughout). Desktop keeps single-row horizontal layout.
- **Mobile Restriction/Preference Table:** rows stack vertically into a `Card` with 16px inner padding; each cell becomes a label-value pair; row-actions become a `…` overflow menu opening a bottom-sheet.

---

## Typography

Exactly 4 type sizes and 2 weights (per 60/30/10 + contract-minimalism rules). All sizes map to Tailwind utility classes. Pattern locked by Phase 10/11/12/13 — Phase 14 does NOT deviate.

| Role | Size | Weight | Line Height | Tailwind | Phase 14 usage |
|------|------|--------|-------------|----------|----------------|
| Body | 14px | 400 (regular) | 1.5 (21px) | `text-sm leading-normal font-normal` | Catalog description text, Constraint Java-name (`<small>`), Default-Hint text, table cell text, NumberInput value, tooltip content, Add-Dialog form input text, InfoBanner body |
| Label | 14px | 600 (semibold) | 1.4 (20px) | `text-sm font-semibold` | Slider-Row label (Constraint-Display-Name), table column headers, Tab triggers, Sub-Tab triggers, form field labels in Add-Dialog, severity-Badge label, Last-Run-Score badge label |
| Heading | 18px | 600 (semibold) | 1.3 (24px) | `text-lg font-semibold` | Card titles (`CardTitle`), Dialog titles, section titles ("Hard-Constraints (6)", "Soft-Constraints (8)", "Klassen-Sperrzeiten", "Vormittags-Präferenzen", "Bevorzugte Slots") |
| Display | 24px | 600 (semibold) | 1.2 (29px) | `text-2xl font-semibold` | PageShell page title (`Solver-Tuning`) |

**Rules:**
- Never introduce a 5th size or 3rd weight. Italic/underline forbidden for emphasis.
- Java-name in Catalog and in Slider-Row labels uses Body token with `text-muted-foreground text-xs` — **NOT a new size**, only Tailwind's `text-xs` (12px) for tertiary metadata; this matches Phase 13 PageShell-subtitle precedent. *(Note: this is the only `text-xs` usage in Phase 14 and is scoped exclusively to English Java-name annotations next to German labels.)*
- NumberInput in Slider-Row uses `tabular-nums` to keep digit alignment stable as the value changes.
- Default-Hint text (`Default: {n}`) uses Body token + `text-muted-foreground` — never a different size.
- Score-Badge in Tuning-Page header (`Letzter Solve-Run vor X Stunden — Score: Hard=0, Soft=-127`) uses Label token + `tabular-nums` for the numeric portion.
- Period values in Restriction/Preference tables use `tabular-nums`.

---

## Color

Mapped directly to `app.css` CSS variables. Do NOT hardcode hex values in JSX; use Tailwind utilities that resolve to these variables.

### 60 / 30 / 10 split

| Role | HSL | CSS var | Tailwind | Usage |
|------|-----|---------|----------|-------|
| Dominant (60%) | `hsl(0 0% 100%)` | `--color-background` | `bg-background` | Page canvas, table body, form input canvas, Slider-Row card body |
| Secondary (30%) | `hsl(240 5% 96%)` | `--color-card` / `--color-muted` / `--color-secondary` | `bg-card`, `bg-muted`, `bg-secondary` | Cards, sidebar, Tab-list background, Sub-Tab-list background, table header row, sticky mobile save bar, Slider-Row default-state surface, Section-Header bands ("Hard-Constraints (6)"), Last-Run-Score badge background |
| Accent (10%) | `hsl(221 83% 53%)` (blue) | `--color-primary` | `bg-primary text-primary-foreground`, `text-primary`, `ring-primary` | Reserved — see below |
| Destructive | `hsl(0 84% 60%)` (red) | `--color-destructive` | `bg-destructive`, `text-destructive`, border variant | Reserved — see below |
| Success signal | `hsl(142 71% 45%)` (green) | `--color-success` | `text-success`, `bg-success/10` | Reserved — see below |
| Warning signal | `hsl(38 92% 50%)` (amber) | `--color-warning` | `text-warning`, `bg-warning/10` | Reserved — see below |

### Accent (blue primary) — reserved-for list

The blue primary is restricted to these elements across Phase 14. No other element may use `bg-primary` or `text-primary`.

1. **Primary CTA buttons** on every surface (see Copywriting Contract for labels):
   - Tab "Gewichtungen" sticky-save: `Änderungen speichern`
   - Tab "Klassen-Sperrzeiten" header: `+ Sperrzeit hinzufügen`
   - Tab "Fach-Präferenzen" Sub-Tab a header: `+ Vormittags-Präferenz hinzufügen`
   - Tab "Fach-Präferenzen" Sub-Tab b header: `+ Bevorzugten Slot hinzufügen`
   - Add/Edit-Dialog primary confirm: `Anlegen` / `Speichern`
   - Generator-Page Read-only-Card deep-link: `Tuning öffnen`
   - Tuning-Page header deep-link: `Generator starten`
2. **Active Tab trigger underline / bar** (shadcn `TabsTrigger` active state) — the 4 main tabs AND the 2 nested sub-tabs in Tab 4.
3. **Focus ring** on every interactive element (`--color-ring` resolves to primary). Non-negotiable.
4. **Active sidebar item indicator** for the "Solver-Tuning" entry (existing `AppSidebar` behavior — no change).
5. **Slider track active fill** (the portion of the slider track from min to thumb) uses `bg-primary` per shadcn defaults — do NOT recolor based on default-vs-custom state.
6. **Custom-state Slider thumb** has a `ring-2 ring-primary ring-offset-2` halo when `value !== DEFAULT_WEIGHTS[name]`, signaling "this row diverges from default." Default-state thumb has no ring.
7. **Catalog-Tab "Gewichtung bearbeiten" deep-link button** (Soft-row only) — `text-primary` link variant, `ArrowRight` icon, navigates to Tab 2 + scrolls to matching Slider-Row + flashes `ring-primary` for 1s on the destination row.
8. **Last-Run-Score badge deep-link** in Tuning-Page header (`→ History öffnen`) — `text-primary underline-offset-2 hover:underline`.
9. **Generator-Page Read-only "Aktuelle Schul-Weights" card border-tint** (`border-primary/20`) — signals "this is a configurable surface, click through to edit."

### Destructive (red) — reserved-for list

1. **Catalog-Tab Severity-Badge "HARD"** — `bg-destructive/10 text-destructive border-destructive/40` + `ShieldAlert` icon + label `HARD`. Every Hard-Constraint row carries this badge. Soft-rows use a neutral/secondary variant (see Success/neutral).
2. **Add/Edit-Dialog inline form validation error text** below invalid fields (`text-destructive text-sm`) — e.g. "Periode muss ≤ 8 sein" (D-13 cross-reference).
3. **Restriction/Preference row Delete-Icon-Button** (`Trash2`) — hover/focus state triggers `text-destructive`; click opens 1-step confirm dialog (Phase 13 D-10 pattern; explicit dialog NOT inline 2-click because these rows have no row-internal save state).
4. **Delete-Restriction WarnDialog** + **Delete-Subject-Preference WarnDialog** — `variant="destructive"` confirm button.
5. **Toast variant="destructive"** for Silent-4XX-Invariante violations (Phase 10.2-04 codified pattern). All Phase 14 mutation hooks MUST surface 4xx via destructive toast — no silent failure.
6. **422 RFC 9457 cross-reference / period-out-of-range / unknown-constraint-name** errors — destructive toast title + body per Copywriting Contract.

### Success (green) — reserved-for list

1. **Toast variant="success"** on successful Weight-Save, Restriction-Create/Update/Delete, Preference-Create/Update/Delete, Reset-to-Default — uses existing toast system (Phase 13 precedent).
2. **Last-Run-Score badge — Hard=0 indicator** uses `text-success` color + `CircleCheck` icon when last run had `hardScore === 0` (feasible solution); otherwise neutral. The badge as a whole stays `bg-secondary`; the icon and number color shift conveys feasibility.
3. **Catalog-Tab Severity-Badge "SOFT"** — does NOT use green. SOFT uses **neutral/secondary** (`bg-secondary text-secondary-foreground border` + `Sliders` icon + label `SOFT`) — see Forbidden color usages. Green is reserved for status semantics, not category labels.

### Warning (amber) — reserved-for list

1. **InfoBanner "Mehrfache Einträge — strengster Wert wins"** (D-14) at top of Tab 3 "Klassen-Sperrzeiten" or Tab 4 Sub-Tab a/b when ≥2 active rows for the same `(classId | subjectId)` exist — `bg-warning/10 border-warning/40 text-warning-foreground` + `TriangleAlert` icon. Copy per Copywriting Contract.
2. **InfoBanner "Solver-Sync-Hinweis"** at top of Tab 2 "Gewichtungen" (subtle, footer position): `Geänderte Gewichtungen wirken beim nächsten Solve-Run. Verifikation manuell über die Run-History.` — amber subtle (`bg-warning/10 text-warning-foreground`).
3. **Last-Run-Score badge — Hard>0 indicator** uses `text-warning` + `TriangleAlert` icon when last run had `hardScore < 0` (infeasible) — signals "ein neuer Solve-Run mit aktuellen Gewichtungen sollte gestartet werden." Phase 9.x precedent for hardScore semantics.
4. **Constraint-Configuration-Drift InfoBanner** (Tuning-Page header, conditional): `Aktuelle Gewichtungen wurden nach dem letzten Solve-Run geändert.` — shown when any `ConstraintWeightOverride.updatedAt > TimetableRun.completedAt` of the latest run. Drives admin to re-run the solver to see effect.
5. **Slider-Row Background tint when dirty** — `bg-warning/5` background on Slider-Row card while value is unsaved-and-different-from-persisted (subtle ≤5% opacity to avoid alarm-fatigue; this is a *change-pending*, not an *error* state). Disappears on Save.

### Severity-signal pairings (Phase 14-specific, configuration-clarity)

Every Constraint-Severity element MUST pair color + icon + text label. Color alone is never the affordance (WCAG 1.4.1).

| Signal | Color | Icon | Text label |
|--------|-------|------|------------|
| Hard-Constraint | destructive red | `ShieldAlert` | `HARD` |
| Soft-Constraint | neutral secondary | `Sliders` | `SOFT` |
| Custom Weight (≠ default) | primary blue (slider thumb halo) | *(no icon — visual ring only)* | *(no label — Reset-Icon serves as restoration affordance)* |
| Default Weight | neutral | *(no icon)* | `Default: {n}` muted-foreground inline hint |
| Active Restriction/Preference | success green | `CircleCheck` (in Switch) | `Aktiv` |
| Inactive Restriction/Preference | neutral | `(empty Switch)` | `Inaktiv` |
| Last-Run feasible | success green | `CircleCheck` | `Hard=0` |
| Last-Run infeasible | warning amber | `TriangleAlert` | `Hard={n}` |
| Strictest-wins warning | warning amber | `TriangleAlert` | InfoBanner copy |

**Forbidden color usages (checker will reject):**
- Severity-badges MUST NOT use red+green binary (HARD=red, SOFT=neutral — green is reserved for *status* semantics like "Aktiv" / "Hard=0", not *category* semantics).
- Sliders MUST NOT have red/green track or thumb based on weight value. Weight 0 (effectively-disabled) and weight 100 (max-emphasis) look identical — the surface communicates *intensity*, not *quality*.
- No additional palette colors (purple, teal, pink) introduced for Phase 14.
- No color used as the sole affordance for meaning (always pair color with icon or text label — WCAG 1.4.1).
- No `text-primary` on body copy. Primary is for interactive affordances, custom-weight thumb halo, deep-links, and the Generator-Page card border-tint only.
- No red/green on a constraint name itself (only on the badge or the row-internal Switch).
- `SUBJECT_PALETTE` (Phase 11 deterministic subject coloring) MAY appear in Tab 4 Sub-Tab a/b for the Subject column chip, consistent with Phase 11 Subject-Badge precedent. **Class-list views in Tab 3 use the existing Class-Badge convention (Phase 12) — do NOT re-color.**

---

## Copywriting Contract

German UI, English API fields (Phase 1 D-15). All user-facing strings below are canonical — executor MUST use verbatim unless a checker-approved deviation is documented.

### Primary CTAs

| Surface | Copy |
|---------|------|
| Tuning-Page header (when Generator-Page deep-link exists) | `Generator starten` |
| Generator-Page "Aktuelle Schul-Weights" card deep-link | `Tuning öffnen` |
| Tab "Constraints" Soft-row action button | `Gewichtung bearbeiten` |
| Tab "Constraints" Hard-row action | *(no CTA — read-only with `Lock` icon and tooltip)* |
| Tab "Gewichtungen" sticky-save (desktop + mobile) | `Änderungen speichern` |
| Tab "Gewichtungen" discard button | `Verwerfen` |
| Tab "Gewichtungen" Slider-Row Reset-Icon-Button (aria-label) | `Auf Default zurücksetzen` |
| Tab "Klassen-Sperrzeiten" header CTA | `+ Sperrzeit hinzufügen` |
| Tab "Klassen-Sperrzeiten" empty-state CTA | `Sperrzeit anlegen` |
| Tab "Fach-Präferenzen" Sub-Tab a header | `+ Vormittags-Präferenz hinzufügen` |
| Tab "Fach-Präferenzen" Sub-Tab a empty-state CTA | `Vormittags-Präferenz anlegen` |
| Tab "Fach-Präferenzen" Sub-Tab b header | `+ Bevorzugten Slot hinzufügen` |
| Tab "Fach-Präferenzen" Sub-Tab b empty-state CTA | `Bevorzugten Slot anlegen` |
| Add-Dialog primary confirm (create) | `Anlegen` |
| Edit-Dialog primary confirm (update) | `Speichern` |
| Add/Edit-Dialog cancel | `Abbrechen` |
| Delete-Restriction WarnDialog primary confirm | `Löschen` *(variant="destructive")* |
| Delete-Preference WarnDialog primary confirm | `Löschen` *(variant="destructive")* |

### Empty states

Every list + tab empty state MUST render: an icon (`text-muted-foreground`, 24px), a heading (`text-lg font-semibold`), a body line (`text-sm text-muted-foreground`), and a single primary CTA. No illustrative SVGs in v1.1.

| Surface | Heading | Body | CTA | Icon |
|---------|---------|------|-----|------|
| Tab "Klassen-Sperrzeiten" (0 active rows) | `Keine Sperrzeiten gesetzt` | `Klassen-Sperrzeiten begrenzen, bis zu welcher Periode eine Klasse Unterricht haben darf. Legen Sie eine Sperrzeit an, um ab der nächsten Stundenplan-Generierung zu wirken.` | `Sperrzeit anlegen` | `CalendarOff` |
| Tab "Fach-Präferenzen" Sub-Tab a (0 active rows) | `Keine Vormittags-Präferenzen` | `Vormittags-Präferenzen halten ein Fach möglichst vor einer bestimmten Periode. Legen Sie eine Präferenz an, um z. B. Mathematik bevorzugt vormittags zu legen.` | `Vormittags-Präferenz anlegen` | `Sun` |
| Tab "Fach-Präferenzen" Sub-Tab b (0 active rows) | `Keine bevorzugten Slots` | `Bevorzugte Slots legen ein Fach idealerweise auf einen festen Wochentag und eine feste Periode. Legen Sie einen Slot an, um z. B. Sport am Dienstag in der ersten Periode zu bevorzugen.` | `Bevorzugten Slot anlegen` | `CalendarClock` |
| Tab "Constraints" loading-error fallback | `Constraint-Catalog konnte nicht geladen werden` | `Bitte laden Sie die Seite neu. Falls das Problem bleibt, kontaktieren Sie den System-Administrator.` | `Erneut laden` *(ghost button, triggers refetch)* | `XCircle` |

**No empty-state for Tab "Constraints"** — the catalog is a static list of 14 entries that always renders; only the loading-error fallback is possible.

**No empty-state for Tab "Gewichtungen"** — all 8 Soft-Constraint sliders always render; default values come from `DEFAULT_CONSTRAINT_WEIGHTS` even before any persistence.

### Error states (Silent-4XX-Invariante compliance)

Every mutation error MUST surface via `Toast variant="destructive"` with the copy below. Never silently swallow 4xx (auto-memory `feedback_admin_requirements_need_ui_evidence.md` + `feedback_e2e_first_no_uat.md` + Phase 10.2-04 invariant).

| Condition | Toast title | Toast description |
|-----------|-------------|-------------------|
| 422 `PUT /schools/:schoolId/constraint-weights` (unknown constraint name in payload) | `Speichern nicht möglich` | `Eine der Gewichtungen verweist auf ein unbekanntes Constraint. Bitte laden Sie die Seite neu.` |
| 422 `PUT /schools/:schoolId/constraint-weights` (weight out of range 0..100) | `Ungültige Gewichtung` | `Gewichtungen müssen zwischen 0 und 100 liegen.` |
| 422 `POST/PUT /constraint-templates` (cross-reference missing — class/subject not in school) | `Eintrag passt nicht zur Schule` | `Die ausgewählte Klasse oder das Fach gehört nicht zu dieser Schule. Bitte wählen Sie einen gültigen Eintrag.` |
| 422 `POST/PUT /constraint-templates` (period-out-of-range — maxPeriod > school.maxPeriodNumber) | `Periode außerhalb des Zeitrasters` | `Die gewählte Periode liegt außerhalb der konfigurierten Schul-Perioden (max. {maxPeriodNumber}).` |
| 400 validation on Add-Restriction/Preference (missing required field) | `Eintrag nicht gespeichert` | `Bitte prüfen Sie die markierten Felder.` *(plus inline field errors)* |
| 403 on any mutation (non-admin user somehow reached surface) | `Aktion nicht erlaubt` | `Diese Funktion ist nur für Administratoren verfügbar.` |
| 404 on PUT/DELETE (template deleted between load and edit) | `Eintrag nicht gefunden` | `Der Eintrag wurde inzwischen entfernt. Bitte laden Sie die Seite neu.` |
| 500 on any mutation | `Etwas ist schiefgelaufen` | `Bitte versuchen Sie es später erneut. Falls das Problem bleibt, kontaktieren Sie den System-Administrator.` |
| Network offline | `Keine Verbindung` | `Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.` |
| Silent-4XX fallback (unexpected 4xx) | `Aktion nicht möglich` | `Der Server hat die Anfrage abgelehnt (Status {status}).` (Phase 10.2-04 invariant — visible test in E2E-SOLVER-03) |

### Destructive confirmations

Destructive dialogs use `WarnDialog` (Phase 10 shared). Pattern: **ActionName:ConfirmationCopy:PrimaryButtonLabel**. Primary button is `variant="destructive"` unless otherwise noted.

| Action | Dialog title | Dialog body | Confirm button | Cancel button |
|--------|-------------|-------------|----------------|---------------|
| Delete Klassen-Sperrzeit (D-11) | `Sperrzeit löschen?` | `Die Sperrzeit für Klasse {className} (bis Periode {maxPeriod}) wird gelöscht. Beim nächsten Solve-Run hat die Klasse keine Periode-Beschränkung mehr.` | `Löschen` | `Abbrechen` |
| Delete Vormittags-Präferenz (D-12) | `Vormittags-Präferenz löschen?` | `Die Vormittags-Präferenz für {subjectName} (spätestens Periode {latestPeriod}) wird gelöscht. Beim nächsten Solve-Run gibt es keine Vormittags-Bevorzugung mehr für dieses Fach.` | `Löschen` | `Abbrechen` |
| Delete Bevorzugter-Slot (D-12) | `Bevorzugten Slot löschen?` | `Der bevorzugte Slot für {subjectName} ({dayOfWeekLabel} · Periode {period}) wird gelöscht. Beim nächsten Solve-Run gibt es keine Slot-Bevorzugung mehr für dieses Fach an diesem Tag/Periode.` | `Löschen` | `Abbrechen` |
| UnsavedChangesDialog (Tab 2 → tab-switch with dirty weights) | `Ungespeicherte Änderungen` | `Sie haben Gewichtungen geändert, die noch nicht gespeichert sind. Möchten Sie den Tab trotzdem verlassen?` | `Verwerfen und wechseln` | `Abbrechen` |

### Multi-Row InfoBanner (D-14, strictest-wins)

Shown at top of Tab "Klassen-Sperrzeiten" or Tab "Fach-Präferenzen" Sub-Tab a/b when ≥2 active rows for the same `(classId | subjectId)` exist. Uses `InfoBanner` with variant `warning` (amber).

| Tab | Trigger condition | InfoBanner body |
|-----|-------------------|-----------------|
| Tab "Klassen-Sperrzeiten" | ≥2 active `NO_LESSONS_AFTER` rows for same `params.classId` | `⚠️ Mehrfache Einträge für **Klasse {className}** vorhanden — Solver verwendet die strengste Sperrzeit (Periode {minMaxPeriod}).` |
| Tab "Fach-Präferenzen" Sub-Tab a | ≥2 active `SUBJECT_MORNING` rows for same `params.subjectId` | `⚠️ Mehrfache Einträge für **{subjectName}** vorhanden — Solver verwendet die strengste Vormittags-Präferenz (Periode {minLatestPeriod}).` |
| Tab "Fach-Präferenzen" Sub-Tab b | ≥2 active `SUBJECT_PREFERRED_SLOT` rows for same `(subjectId, dayOfWeek, period)` triple | `⚠️ Mehrfache identische Slot-Einträge für **{subjectName}** ({dayOfWeekLabel} · Periode {period}) vorhanden — Solver wertet sie kumulativ aus.` |
| Multiple parallel divergences (different classes/subjects) | Concatenate the per-(classId|subjectId)-tuple banner messages with `<br/>` separator, max 3 lines shown; remaining roll into a `…und {n} weitere` summary line. | *(see above)* |

### Tuning-Page header copy (Last-Run badge + drift-banner)

| State | Copy |
|-------|------|
| No prior solve-run for this school | `Noch kein Solve-Run` *(neutral muted badge, no deep-link)* |
| Last run feasible (`hardScore === 0`) | `Letzter Solve-Run vor {relativeTime} — Hard=0 · Soft={softScore}` *(success green icon + neutral text)* + deep-link `→ History öffnen` |
| Last run infeasible (`hardScore < 0`) | `Letzter Solve-Run vor {relativeTime} — Hard={hardScore} · Soft={softScore}` *(warning amber icon + neutral text)* + deep-link `→ History öffnen` |
| Drift detected (any `ConstraintWeightOverride.updatedAt > lastRun.completedAt`) | `Aktuelle Gewichtungen wurden nach dem letzten Solve-Run geändert. Starten Sie eine neue Generierung, um den Effekt zu prüfen.` *(amber InfoBanner under header, with deep-link `Generator starten`)* |

### Solver-Sync hint (Tab "Gewichtungen" footer)

`Geänderte Gewichtungen wirken beim nächsten Solve-Run. Verifikation manuell über die Run-History.` (amber subtle InfoBanner — D-15 codified pattern; deep-link `→ History öffnen` to `/admin/timetable-history`)

### Inline micro-copy (not destructive, but load-bearing)

| Context | Copy |
|---------|------|
| Page title | `Solver-Tuning` |
| PageShell subtitle | `Constraint-Konfiguration und Gewichtungen pro Schule` |
| Tab 1 label | `Constraints` |
| Tab 2 label | `Gewichtungen` |
| Tab 3 label | `Klassen-Sperrzeiten` |
| Tab 4 label | `Fach-Präferenzen` |
| Tab 4 Sub-Tab a label | `Vormittags-Präferenzen` |
| Tab 4 Sub-Tab b label | `Bevorzugte Slots` |
| Tab "Constraints" Hard-section header | `Hard-Constraints (6)` |
| Tab "Constraints" Soft-section header | `Soft-Constraints (8)` |
| Tab "Constraints" Hard-row tooltip on `Lock` icon | `Hard-Constraints sind im Solver immer aktiv und können nicht deaktiviert werden.` |
| Tab "Constraints" column headers | `Name` / `Severity` / `Beschreibung` / `Aktion` |
| Tab "Gewichtungen" Slider-Row Default-Hint | `Default: {n}` |
| Tab "Gewichtungen" NumberInput aria-label | `Gewichtung für {constraintDisplayName}` |
| Tab "Gewichtungen" Reset-Icon-Button aria-label | `Auf Default zurücksetzen` |
| Tab "Gewichtungen" Slider aria-label | `Gewichtung {constraintDisplayName} (0 bis 100)` |
| Tab "Gewichtungen" StickyMobileSaveBar discard | `Verwerfen` |
| Tab "Klassen-Sperrzeiten" column headers | `Klasse` / `Sperrt ab Periode` / `Aktiv` / `Aktionen` |
| Tab "Klassen-Sperrzeiten" Sperrt-ab-Periode cell format | `Bis Periode {maxPeriod} erlaubt` |
| Tab "Fach-Präferenzen" Sub-Tab a column headers | `Fach` / `Spätestens bis Periode` / `Aktiv` / `Aktionen` |
| Tab "Fach-Präferenzen" Sub-Tab a Periode cell format | `Bis Periode {latestPeriod}` |
| Tab "Fach-Präferenzen" Sub-Tab b column headers | `Fach` / `Wochentag` / `Periode` / `Aktiv` / `Aktionen` |
| Tab "Fach-Präferenzen" Sub-Tab b Wochentag cell format | `MO` / `DI` / `MI` / `DO` / `FR` *(2-letter Badge, Phase 12 day-badge convention)* |
| Add-Restriction Dialog title | `Klassen-Sperrzeit anlegen` |
| Edit-Restriction Dialog title | `Klassen-Sperrzeit bearbeiten` |
| Add-Restriction Klassen-Autocomplete label | `Klasse` |
| Add-Restriction Klassen-Autocomplete placeholder | `Klassen-Name (min. 2 Zeichen) …` |
| Add-Restriction Klassen-Autocomplete empty-result | `Keine Treffer. Prüfen Sie den Namen oder legen Sie die Klasse in der Klassenverwaltung an.` |
| Add-Restriction maxPeriod-NumberInput label | `Sperrt ab Periode` |
| Add-Restriction maxPeriod-NumberInput helper | `Klasse darf bis einschließlich Periode {maxPeriod} unterrichtet werden. Maximum: {school.maxPeriodNumber}.` |
| Add-Restriction isActive-Switch label | `Aktiv` |
| Add-Vormittags-Präferenz Dialog title | `Vormittags-Präferenz anlegen` |
| Edit-Vormittags-Präferenz Dialog title | `Vormittags-Präferenz bearbeiten` |
| Add-Vormittags-Präferenz Subject-Autocomplete label | `Fach` |
| Add-Vormittags-Präferenz latestPeriod-NumberInput label | `Spätestens bis Periode` |
| Add-Vormittags-Präferenz latestPeriod-NumberInput helper | `Fach soll bevorzugt bis einschließlich dieser Periode liegen. Maximum: {school.maxPeriodNumber}.` |
| Add-Bevorzugter-Slot Dialog title | `Bevorzugten Slot anlegen` |
| Edit-Bevorzugter-Slot Dialog title | `Bevorzugten Slot bearbeiten` |
| Add-Bevorzugter-Slot dayOfWeek-Select label | `Wochentag` |
| Add-Bevorzugter-Slot dayOfWeek-Select options | `Montag` / `Dienstag` / `Mittwoch` / `Donnerstag` / `Freitag` |
| Add-Bevorzugter-Slot period-NumberInput label | `Periode` |
| Add-Bevorzugter-Slot period-NumberInput helper | `Periode innerhalb des Schul-Zeitrasters (1 bis {school.maxPeriodNumber}).` |
| Subject-Autocomplete placeholder (in Tab 4 dialogs) | `Fach-Name (min. 2 Zeichen) …` |
| Subject-Autocomplete empty-result | `Keine Treffer. Prüfen Sie den Namen oder legen Sie das Fach in der Fächerverwaltung an.` |
| Sidebar group label | `Solver & Operations` *(existing — Phase 9.x)* |
| Sidebar entry label (new) | `Solver-Tuning` |
| Loading skeleton aria-label | `Lade Solver-Konfiguration …` |
| Severity-Badge HARD aria-label | `Hard-Constraint, immer aktiv` |
| Severity-Badge SOFT aria-label | `Soft-Constraint, gewichtbar` |
| isActive-Switch aria-label | `Eintrag aktiv schalten` |
| Edit-Icon-Button aria-label | `Eintrag bearbeiten` |
| Delete-Icon-Button aria-label | `Eintrag löschen` |

### Deutsche Constraint-Übersetzungen (D-10, Claude's Discretion)

The following German `displayName` and `description` values are canonical for `CONSTRAINT_CATALOG`. Executor MUST use these verbatim in `packages/shared/src/constraint-catalog.ts`. They mirror Java `TimetableConstraintProvider.java` constraint names. *(If Plan-14-01 research surfaces additional constraints not listed here, the planner MUST loop back to ui-researcher for translation rather than ad-hoc-translate in code.)*

| Java name | German `displayName` | German `description` (tooltip) | Severity |
|-----------|---------------------|-------------------------------|----------|
| `Room conflict` | `Raum-Konflikt` | `Zwei Stunden dürfen nicht gleichzeitig im selben Raum stattfinden.` | HARD |
| `Teacher conflict` | `Lehrkraft-Konflikt` | `Eine Lehrkraft darf nicht zwei Stunden gleichzeitig unterrichten.` | HARD |
| `Student group conflict` | `Klassen-/Gruppen-Konflikt` | `Eine Klasse oder Gruppe darf nicht zwei Stunden gleichzeitig haben.` | HARD |
| `Class timeslot restriction` | `Klassen-Sperrzeit` | `Klassen dürfen nicht in gesperrten Perioden unterrichtet werden (siehe Tab Klassen-Sperrzeiten).` | HARD |
| `Subject time preference (hard)` | `Fach-Zeit-Sperre (hard)` | `Fächer dürfen nicht außerhalb fest definierter Zeitfenster liegen, wenn als hart konfiguriert.` | HARD |
| `Proper timeslots for lessons` | `Stunden in gültigen Zeitfenstern` | `Jede Stunde muss in ein gültiges Zeitfenster der Schule fallen.` | HARD |
| `No same subject doubling` | `Kein Doppel-Fach hintereinander` | `Vermeidet, dass dasselbe Fach in derselben Klasse direkt aufeinanderfolgend liegt.` | SOFT |
| `Teacher time preference` | `Lehrkraft-Zeitpräferenz` | `Berücksichtigt bevorzugte Unterrichtszeiten der Lehrkräfte.` | SOFT |
| `Subject morning preference` | `Vormittags-Präferenz` | `Bevorzugt das Legen bestimmter Fächer auf die Vormittagsperioden (siehe Tab Fach-Präferenzen).` | SOFT |
| `Subject preferred slot` | `Bevorzugter Slot` | `Bevorzugt für ein Fach einen bestimmten Wochentag und eine bestimmte Periode (siehe Tab Fach-Präferenzen).` | SOFT |
| `Even distribution across week` | `Gleichmäßige Wochenverteilung` | `Verteilt Fachstunden möglichst gleichmäßig über die Woche.` | SOFT |
| `Avoid empty periods` | `Freistunden vermeiden` | `Reduziert Lücken im Klassen-Stundenplan.` | SOFT |
| `Teacher consecutive periods` | `Lehrkraft-Block-Stunden` | `Bevorzugt zusammenhängende Unterrichtsblöcke pro Lehrkraft.` | SOFT |
| `Room stability per class` | `Raum-Stabilität pro Klasse` | `Bevorzugt, dass eine Klasse möglichst im selben Raum bleibt.` | SOFT |

**Sync-Disziplin reminder:** `apps/api/src/modules/timetable/constraint-catalog.ts` and `packages/shared/src/constraint-catalog.ts` MUST mirror each other; both files carry a top-comment pointing at `apps/solver/src/main/java/at/schoolflow/solver/constraints/TimetableConstraintProvider.java` as the upstream source-of-truth. If the Java source declares a constraint name not in the table above, **planner MUST loop back to ui-researcher** for German translation — do not ad-hoc-translate in code.

---

## Component Inventory

### Reused from Phase 10/11/12/13 (no changes required)

| Component | Source | Used in Phase 14 |
|-----------|--------|------------------|
| `PageShell` | `components/admin/shared/` | New route `/admin/solver-tuning` |
| `UnsavedChangesDialog` | shared | Tab "Gewichtungen" tab-switch with dirty weights |
| `StickyMobileSaveBar` | shared | Tab "Gewichtungen" only (`<640px`) |
| `InfoBanner` | shared | Multi-row strictest-wins warning (Tab 3, Tab 4 sub-tabs); Solver-Sync hint (Tab 2 footer); Drift-banner (Tuning-Page header) |
| `WarnDialog` | shared | Delete-Restriction, Delete-Preference confirm |
| `ClassAutocomplete` | `components/admin/class/` (Phase 12 D-08) | Add/Edit-Restriction Dialog |
| `SubjectAutocomplete` | `components/admin/subject/` (Phase 11 D-08) | Add/Edit-Vormittags-Präferenz Dialog, Add/Edit-Bevorzugter-Slot Dialog |
| `SubjectBadge` | Phase 11 deterministic-color subject chip | Tab 4 Sub-Tab a + b Subject column |
| `ClassBadge` | Phase 12 class chip with year-badge | Tab 3 Klasse column |
| Tailwind utilities + existing CSS vars | `app.css` | All styling |

### shadcn primitives required

**Planner MUST verify at Wave 0 and run `npx shadcn add {missing}` if absent.** Per CONTEXT.md §Reusable Assets line 274/306, all required primitives are already installed from Phases 10–13. Phase 14 adds **no new shadcn primitive installs**.

| Primitive | Used for | Present? |
|-----------|----------|----------|
| `tabs` | Tuning-Page main tabs (4) + Tab 4 nested sub-tabs (2) | YES |
| `slider` | Tab "Gewichtungen" 8 weight sliders | YES *(installed pre-Phase 14)* |
| `dialog` | Add/Edit Restriction, Add/Edit Vormittags-Präferenz, Add/Edit Bevorzugter-Slot, all WarnDialogs | YES |
| `input` | NumberInputs in Slider-Row + Add-Dialogs | YES |
| `select` | Add-Bevorzugter-Slot dayOfWeek select | YES |
| `button` | All actions | YES |
| `card` | Slider-Row container, Section bands, table-row mobile-cards | YES |
| `label` | Form labels | YES |
| `popover` | Class- and Subject-Autocomplete host | YES |
| `command` | Class- and Subject-Autocomplete results | YES |
| `badge` | Severity-Badge (HARD/SOFT), Wochentag-Badge, Class/Subject chips, Last-Run-Score badge | YES |
| `switch` | isActive-Toggle in Restriction/Preference rows + Add-Dialog | YES |
| `tooltip` | Hard-Row Lock-icon explanation, Slider-Row Java-name + description, Severity-Badge aria-explanation | YES |
| `separator` | Section divider between Hard- and Soft-section in Tab 1 | YES |
| `sonner` / toast | Silent-4XX toast invariant | YES *(Phase 10 established)* |

**Optional (verify at Wave 0):**
- `radio-group` — NOT used in Phase 14 (Phase 13 verified install already; no Phase 14 surface needs it).

### New Phase-14 components (executor creates)

| Component | File | Responsibility |
|-----------|------|----------------|
| `SolverTuningTabs` | `components/admin/solver-tuning/SolverTuningTabs.tsx` | 4-tab container with per-tab dirty-state integration + UnsavedChangesDialog wiring |
| `LastRunScoreBadge` | `components/admin/solver-tuning/LastRunScoreBadge.tsx` | Header badge: `Letzter Solve-Run vor X Stunden — Hard={n} · Soft={n}` + deep-link to `/admin/timetable-history` |
| `DriftBanner` | `components/admin/solver-tuning/DriftBanner.tsx` | Conditional InfoBanner shown when any weight-override updatedAt > last-run completedAt |
| `ConstraintCatalogTab` | `components/admin/solver-tuning/ConstraintCatalogTab.tsx` | Tab 1 read-only list with Hard/Soft sections, severity-badges, deep-link to Tab 2 for Soft-rows |
| `ConstraintCatalogRow` | `components/admin/solver-tuning/ConstraintCatalogRow.tsx` | Single catalog row: displayName + Java-name + severity-badge + description + action-cell |
| `ConstraintWeightsTab` | `components/admin/solver-tuning/ConstraintWeightsTab.tsx` | Tab 2 container with 8 SliderRows + StickyMobileSaveBar + Solver-Sync footer |
| `ConstraintWeightSliderRow` | `components/admin/solver-tuning/ConstraintWeightSliderRow.tsx` | Single Slider-Row card: label + Java-name + Slider + NumberInput + Default-Hint + Reset-Icon + Tooltip |
| `ClassRestrictionsTab` | `components/admin/solver-tuning/ClassRestrictionsTab.tsx` | Tab 3 container with InfoBanner + Table + Add-Restriction button |
| `ClassRestrictionsTable` | `components/admin/solver-tuning/ClassRestrictionsTable.tsx` | Desktop dense table; mobile stacked Cards. Columns per Copywriting Contract |
| `AddEditClassRestrictionDialog` | `components/admin/solver-tuning/AddEditClassRestrictionDialog.tsx` | Dialog: ClassAutocomplete + maxPeriod-NumberInput + isActive-Switch |
| `SubjectPreferencesTab` | `components/admin/solver-tuning/SubjectPreferencesTab.tsx` | Tab 4 container with nested 2 sub-tabs (Vormittags / Bevorzugte Slots) |
| `SubjectMorningPreferenceTable` | `components/admin/solver-tuning/SubjectMorningPreferenceTable.tsx` | Sub-Tab a table |
| `AddEditSubjectMorningPreferenceDialog` | `components/admin/solver-tuning/AddEditSubjectMorningPreferenceDialog.tsx` | Sub-Tab a Add/Edit dialog: SubjectAutocomplete + latestPeriod-NumberInput + isActive-Switch |
| `SubjectPreferredSlotTable` | `components/admin/solver-tuning/SubjectPreferredSlotTable.tsx` | Sub-Tab b table |
| `AddEditSubjectPreferredSlotDialog` | `components/admin/solver-tuning/AddEditSubjectPreferredSlotDialog.tsx` | Sub-Tab b Add/Edit dialog: SubjectAutocomplete + dayOfWeek-Select + period-NumberInput + isActive-Switch |
| `SeverityBadge` | `components/admin/solver-tuning/SeverityBadge.tsx` | Badge variant with icon + label, color-coded per Severity-signal pairings (HARD=destructive, SOFT=neutral) |
| `WochentagBadge` | `components/admin/solver-tuning/WochentagBadge.tsx` | 2-letter MO/DI/MI/DO/FR badge for Sub-Tab b table |
| `MultiRowConflictBanner` | `components/admin/solver-tuning/MultiRowConflictBanner.tsx` | Computes conflict groups, renders amber InfoBanner with strictest-wins copy per Copywriting Contract |
| `GeneratorPageWeightsCard` | `components/admin/solver/GeneratorPageWeightsCard.tsx` | Read-only Card on existing `/admin/solver` page: shows current school weights summary + deep-link `Tuning öffnen` (D-06) |

### Icon inventory (lucide-react, canonical)

| Concept | Icon |
|---------|------|
| Sidebar entry "Solver-Tuning" | `SlidersHorizontal` |
| Page header / Tab "Gewichtungen" | `Sliders` |
| Tab "Constraints" | `ListChecks` |
| Tab "Klassen-Sperrzeiten" | `CalendarOff` |
| Tab "Fach-Präferenzen" | `BookOpen` |
| Sub-Tab "Vormittags-Präferenzen" | `Sun` |
| Sub-Tab "Bevorzugte Slots" | `CalendarClock` |
| Severity HARD | `ShieldAlert` |
| Severity SOFT | `Sliders` |
| Hard-row Read-only indicator | `Lock` |
| Reset-Slider-to-Default | `RotateCcw` |
| Edit row | `Pencil` |
| Delete row | `Trash2` |
| Add row | `Plus` |
| Active (Switch checked) | `CircleCheck` |
| Last-Run feasible (Hard=0) | `CircleCheck` |
| Last-Run infeasible (Hard<0) | `TriangleAlert` |
| Drift / multi-row warning | `TriangleAlert` |
| Deep-link external indicator | `ArrowRight` |
| Search (Autocomplete) | `Search` |
| Info | `Info` |
| Close dialog | `X` |
| Empty state — Constraints | `XCircle` |
| Empty state — Klassen-Sperrzeiten | `CalendarOff` |
| Empty state — Vormittags-Präferenzen | `Sun` |
| Empty state — Bevorzugte Slots | `CalendarClock` |

**Icon size rule:** 16px (`h-4 w-4`) inline with body text; 20px (`h-5 w-5`) as standalone row-action button child; 24px (`h-6 w-6`) in empty-state headers and Severity-Badge Hard-icon. Icon color `text-muted-foreground` by default; `text-primary` ONLY on the active tab trigger, deep-link text, and Generator-Page card border-tint affordance; `text-success` on Hard=0 score icon and Active-Switch-checked icon; `text-warning` on Hard<0 score icon and Drift/multi-row warning icon; `text-destructive` on HARD severity-badge icon and Delete-row hover state.

---

## Responsive / Layout Contract

### Breakpoints (Tailwind 4 defaults, inherited from Phase 13)

| Breakpoint | Min-width | Phase 14 behavior |
|-----------|-----------|-------------------|
| Mobile | 0–639px | Mandatory target: **375px** (MOBILE-ADM-02). Tabs horizontally scrollable. Sub-Tabs in Tab 4 collapse to vertical Toggle-Group. Slider-Row stacks vertically. Restriction/Preference tables become stacked Cards. StickyMobileSaveBar bottom in Tab 2 only. |
| Tablet | 640–1023px | Two-column form where space allows. Tables remain horizontal. Slider-Rows remain single-row horizontal. Tab 4 Sub-Tabs render as horizontal `Tabs` (shadcn), not Toggle-Group. |
| Desktop | 1024px+ | Default layout, full table density, Slider-Rows horizontal, Sub-Tabs horizontal. |

### Per-surface layout rules

**`/admin/solver-tuning` (Tuning-Page)**

- Desktop: PageShell title `Solver-Tuning` + subtitle `Constraint-Konfiguration und Gewichtungen pro Schule`. Right of subtitle: `LastRunScoreBadge` + `Generator starten` deep-link button (ghost). Below: optional `DriftBanner` (conditional). Below: 4-tab `Tabs` row, then Tab content.
- Mobile 375: Tabs row becomes horizontally scrollable (no wrap). Active indicator remains blue primary bar. PageShell header collapses (subtitle moves below title).
- StickyMobileSaveBar visible only on `<640px` and only in Tab 2 "Gewichtungen". Tabs 3 and 4 use individual CRUD with Add/Edit Dialogs — no global save bar.

**Tab 1 "Constraints"** (read-only)

- Desktop: full-width single-column. Section header `Hard-Constraints (6)` — Card-list with 6 catalog rows — `Separator` — Section header `Soft-Constraints (8)` — Card-list with 8 catalog rows.
- Each catalog row Desktop layout: grid `grid-cols-[2fr_auto_3fr_auto]` → DisplayName+Java-name | Severity-Badge | Description | Action-cell (`Lock` icon for Hard / `Gewichtung bearbeiten` button for Soft).
- Mobile 375: rows stack vertically in a Card; DisplayName + Severity-Badge inline on row 1, Java-name muted on row 2, Description on row 3, Action button full-width on row 4.

**Tab 2 "Gewichtungen"**

- Desktop: full-width single-column. Card-list with 8 SliderRows. Bottom: discard + save buttons inline right-aligned. Footer: amber subtle Solver-Sync InfoBanner.
- Each SliderRow Desktop layout: grid `grid-cols-[2fr_3fr_auto_auto_auto]` → Label+Java-name | Slider | NumberInput (60px wide, tabular-nums) | Default-Hint | Reset-Icon-Button.
- Mobile 375: SliderRow stacks vertically — row 1: label + Java-name + Tooltip-trigger; row 2: full-width Slider; row 3: NumberInput + Default-Hint + Reset-Icon (44px tap zones).
- Dirty-state visual cue: Slider-Row card background tinted `bg-warning/5` when current value ≠ persisted value. Disappears after Save.
- Custom-state Slider thumb: `ring-2 ring-primary ring-offset-2` halo when current value ≠ DEFAULT. Default-state thumb has no ring.
- StickyMobileSaveBar appears on `<640px` whenever any row is dirty.
- UnsavedChangesDialog intercepts tab switch when dirty.

**Tab 3 "Klassen-Sperrzeiten"**

- Desktop: full-width. `MultiRowConflictBanner` at top (conditional) + `+ Sperrzeit hinzufügen` button (right-aligned) + `ClassRestrictionsTable` (4 columns: Klasse | Sperrt ab Periode | Aktiv | Aktionen).
- Mobile 375: ClassRestrictionsTable rows become stacked Cards. Add-Sperrzeit button becomes full-width.
- Empty-state per Copywriting Contract.

**Tab 4 "Fach-Präferenzen"** (with 2 nested sub-tabs)

- Desktop: full-width. Inner `Tabs` (Sub-Tab) row with 2 triggers: `Vormittags-Präferenzen` / `Bevorzugte Slots`. Below: per-sub-tab content (banner + add-button + table).
- Mobile 375: Sub-Tabs collapse to vertical Toggle-Group (full-width row per option, 44px height).
- Sub-Tab a content: `MultiRowConflictBanner` + `+ Vormittags-Präferenz hinzufügen` button + `SubjectMorningPreferenceTable` (4 columns: Fach | Spätestens bis Periode | Aktiv | Aktionen).
- Sub-Tab b content: `MultiRowConflictBanner` + `+ Bevorzugten Slot hinzufügen` button + `SubjectPreferredSlotTable` (5 columns: Fach | Wochentag | Periode | Aktiv | Aktionen).
- Mobile 375: tables in both sub-tabs become stacked Cards.

**Add/Edit Dialogs (4 dialog variants)**

- Modal `Dialog` with `DialogTitle` per Copywriting Contract.
- Single-column form. Each field: `Label` + control + helper text (or inline error if invalid).
- Footer: `Abbrechen` (ghost) + primary confirm (`Anlegen` for create, `Speichern` for edit).
- Mobile 375: Dialog full-width, form controls full-width, primary buttons stack vertically.

**Generator-Page Read-only "Aktuelle Schul-Weights" card** (D-06 add-on to existing `/admin/solver` page)

- Position: top of Generator-Page, above the existing Generate-Button card.
- Card content: `CardTitle` "Aktuelle Schul-Gewichtungen" + small list of 8 weight key-value pairs (label = German `displayName` from CONSTRAINT_CATALOG; value = current resolved weight; default values shown in muted-foreground).
- Footer: deep-link button `Tuning öffnen` (primary ghost variant) → `/admin/solver-tuning?tab=gewichtungen`.
- Mobile: card full-width; weights rendered as 2-column key-value grid; deep-link full-width.

### Touch target floor (MOBILE-ADM-02 hard rule)

- All interactive elements on `<640px`: **min 44×44 px**. This includes:
  - Main Tab triggers: `min-h-11`.
  - Sub-Tab triggers (Tab 4): `min-h-11` (whether rendered as Tabs or Toggle-Group).
  - Slider thumb: 44×44px tap zone (visual thumb may be smaller; tap-zone is via `[&_[data-orientation]]:h-11` style or wrapper).
  - NumberInput up/down spinner buttons (custom wrapper if needed): 44×44px each.
  - Reset-Icon-Button: `size="icon"` variant = 44×44px on mobile.
  - isActive-Switch: standard shadcn size + parent tap zone `h-11 w-11`.
  - Edit/Delete row-action icon buttons: 44×44px each.
  - Add-Restriction / Add-Preference buttons: full-width on mobile, `min-h-11`.
  - Class- and Subject-Autocomplete trigger + result rows: `min-h-11`.
  - Severity-Badge: NOT interactive (no tap zone requirement); however, the Soft-row "Gewichtung bearbeiten" button it sits next to is `min-h-11`.
- Form inputs: `min-h-11` (44px) on mobile; desktop may use `h-9` (36px).

---

## Interaction Choreography (key flows)

### Silent-4XX-Invariante (every mutation)

1. `useMutation({ onError: (err) => toast.error(...) })` — explicit, verifiable in code review.
2. Never `.catch(() => undefined)` in UI code.
3. E2E `silent-4xx`-style assertion is codified in **E2E-SOLVER-03 weights-validation-bounds** (D-16): direct API call with weight=200 → assert red toast appears, no green success toast on the same action. Pattern repeated for E2E-SOLVER-05 cross-reference 422.
4. Mutation hooks affected: `useUpdateConstraintWeights`, `useResetConstraintWeight`, `useCreateConstraintTemplate`, `useUpdateConstraintTemplate`, `useDeleteConstraintTemplate`, `useToggleConstraintTemplateActive`.

### Pro-Tab dirty-state with UnsavedChangesDialog

1. Tab 2 "Gewichtungen" owns a dirty flag `weightsDirty: boolean` (Zustand slice or local state).
2. Tabs 1, 3, 4 are **not** dirty-tracking (Tab 1 read-only; Tabs 3 + 4 use individual CRUD via Dialogs that are atomic, no draft state).
3. On tab-change with `weightsDirty === true`: open `UnsavedChangesDialog`. On confirm `Verwerfen und wechseln`: reset weights form, navigate. On cancel: stay on Tab 2.
4. StickyMobileSaveBar mirrors desktop discard + save buttons on Tab 2 (mobile).

### Weight-Save flow (Tab 2, D-07)

1. User drags Slider OR types in NumberInput. Both controls bidirectionally sync (Slider triggers NumberInput-update via local state; NumberInput triggers Slider-update via local state).
2. Row becomes dirty if current value ≠ persisted value → row background tints `bg-warning/5`; thumb may add `ring-primary` ring if ≠ default.
3. Reset-Icon-Button (per row) becomes active when current value ≠ DEFAULT_WEIGHTS[constraintName]. Click sets local value to DEFAULT (does NOT save immediately — still requires global Save).
4. Global Save button (`Änderungen speichern`) appears in StickyMobileSaveBar on mobile, inline bottom-right on desktop, when at least one row is dirty.
5. Click Save:
   - Zod validates `z.record(z.string(), z.number().int().min(0).max(100))` client-side. Disabled Save button if invalid.
   - Mutation fires `PUT /api/v1/schools/:schoolId/constraint-weights { weights: Record<string,number> }` (replace-all-in-tx, D-07).
   - 200 → green toast "Gewichtungen gespeichert" → invalidate `['constraint-weights', schoolId]` → all rows transition to non-dirty state → no banner cleanup (Solver-Sync footer remains visible as static guidance).
   - 422 → destructive toast per Error states table → form remains editable with rows unchanged.
6. Discard button (`Verwerfen`) reverts all rows to their persisted values without firing a mutation.

### Slider ↔ NumberInput bidirectional sync

1. Slider `onValueChange` ([n]) → setLocalValue(n) → NumberInput renders n.
2. NumberInput `onChange` (event) → parse → if 0 ≤ n ≤ 100 → setLocalValue(n) → Slider renders n.
3. NumberInput out-of-range input (e.g. 150) → inline-error below input ("Gewichtungen müssen zwischen 0 und 100 liegen.") → Slider does NOT update → row stays dirty but Save button disabled until corrected.
4. Tooltip (Constraint description) is triggered on hover/focus on the row Label or the small `Info` icon next to it.

### Restriction CRUD (Tab 3, D-11)

1. **Create:** click `+ Sperrzeit hinzufügen` → `AddEditClassRestrictionDialog` opens with empty form + ClassAutocomplete focused.
2. User selects Klasse via Autocomplete (min 2 chars, 300ms debounce — Phase 11/12 pattern).
3. User enters maxPeriod via NumberInput. Helper shows `Maximum: {school.maxPeriodNumber}`.
4. User toggles isActive Switch (default: on).
5. Click `Anlegen`:
   - Zod validates form (templateType=NO_LESSONS_AFTER discriminated-union variant). Disabled if invalid.
   - Mutation fires `POST /api/v1/constraint-templates`.
   - 201 → green toast "Sperrzeit angelegt" → invalidate `['constraint-templates', schoolId, 'NO_LESSONS_AFTER']` → dialog closes → row appears at end of table → MultiRowConflictBanner re-evaluates (may appear if duplicate classId).
   - 422 cross-reference-missing → destructive toast "Eintrag passt nicht zur Schule".
   - 422 period-out-of-range → destructive toast "Periode außerhalb des Zeitrasters".
   - 400 validation → inline field errors + ghost toast "Eintrag nicht gespeichert".
6. **Edit:** click row Edit-Icon → same dialog pre-filled with existing values → confirm `Speichern` fires `PUT /api/v1/constraint-templates/:id`.
7. **Toggle isActive (inline):** click row Switch → optimistic toggle → `PATCH /api/v1/constraint-templates/:id { isActive: boolean }` → on error revert + destructive toast → on success silent (no toast for inline isActive toggle, consistent with Phase 11 inline-toggle precedent).
8. **Delete:** click row Trash-Icon → `WarnDialog` opens with delete-restriction copy → confirm `Löschen` (destructive) → `DELETE /api/v1/constraint-templates/:id` → 200 → green toast "Sperrzeit gelöscht" → row fades out → invalidate.

### Vormittags-Präferenz CRUD (Tab 4 Sub-Tab a, D-12)

Mirror of Restriction CRUD with template-type `SUBJECT_MORNING`, SubjectAutocomplete (Phase 11) instead of ClassAutocomplete, latestPeriod field instead of maxPeriod. Toast copies adjusted to "Vormittags-Präferenz". WarnDialog title `Vormittags-Präferenz löschen?`.

### Bevorzugter-Slot CRUD (Tab 4 Sub-Tab b, D-12)

Mirror of Restriction CRUD with template-type `SUBJECT_PREFERRED_SLOT`, SubjectAutocomplete + dayOfWeek-Select + period-NumberInput. Toast copies adjusted to "Bevorzugten Slot". WarnDialog title `Bevorzugten Slot löschen?`.

### Catalog deep-link (Tab 1 → Tab 2)

1. User clicks `Gewichtung bearbeiten` button on a Soft-row in Tab 1.
2. Navigate (in-page state, no router change unless using search-param tab=) to Tab 2 "Gewichtungen".
3. After Tab 2 mounts, programmatically scroll the matching SliderRow into view (`scrollIntoView({ block: 'center', behavior: 'smooth' })`) and apply a `ring-2 ring-primary ring-offset-2` flash for 1s (then remove via `setTimeout`).
4. Slider's NumberInput receives focus.

### Multi-Row InfoBanner computation (D-14)

1. After every successful CRUD mutation in Tab 3 / Tab 4, recompute conflict groups from currently-loaded data (no extra API call — derive from cached query data).
2. For Tab 3: group active rows by `params.classId`; if any group has ≥2 rows, render banner with the group's class display name + `min(maxPeriod)` per Copywriting Contract.
3. For Tab 4 Sub-Tab a: group active rows by `params.subjectId`; same logic with `min(latestPeriod)`.
4. For Tab 4 Sub-Tab b: group active rows by `(subjectId, dayOfWeek, period)` triple; if any group has ≥2 identical rows, render banner with cumulative-evaluation copy.
5. If multiple groups conflict simultaneously: concatenate with `<br/>`, max 3 lines, remaining roll into `…und {n} weitere`.
6. Banner is silent: no toast, no escalation. Pure informational signal.

### Sidebar Integration (D-03)

1. New entry `Solver-Tuning` added to existing `Solver & Operations` group in both `AppSidebar.tsx` and `MobileSidebar.tsx`.
2. Position: after `Stundenplan-Generator`, before any future entry.
3. Icon: `SlidersHorizontal`.
4. Role-gating: `roles: ['admin']` only (stricter than `Personal & Fächer` which is `['admin', 'schulleitung']` — Phase 13 D-03 strictness pattern). Schulleitung does NOT see this entry.
5. Active state follows existing sidebar-active-indicator pattern (blue primary underline/dot).
6. Group label `Solver & Operations` is **unchanged** (Phase 9.x existing).

### Last-Run-Score badge & Drift-Banner (Tuning-Page header)

1. On page mount: `GET /api/v1/timetable-runs?schoolId={current}&limit=1&order=desc` → latest run.
2. Render `LastRunScoreBadge` with `relativeTime(completedAt, now)` + Hard/Soft scores, color-coded per Severity-signal pairings.
3. Compute drift: if any `weightOverride.updatedAt > lastRun.completedAt` → render `DriftBanner` between header and Tabs row.
4. Both elements include deep-link `→ History öffnen` to `/admin/timetable-history` and `Generator starten` to `/admin/solver`.

### Generator-Page Read-only Card (D-06)

1. On `/admin/solver` page mount: existing Generator-Page receives a new `GeneratorPageWeightsCard` at top.
2. Card fetches `GET /api/v1/schools/:schoolId/constraint-weights` (cached query — same key as Tab 2 query; auto-shared).
3. Renders 8 key-value rows: `{germanDisplayName}: {weight}` (default values muted-foreground if no override).
4. Footer button `Tuning öffnen` → navigates to `/admin/solver-tuning?tab=gewichtungen`.
5. Card style: `border-primary/20` + `bg-card`. Affordance signal that this is a configurable surface.

---

## Registry Safety

`components.json` declares shadcn official only (Phase 13 confirmed). No third-party registries introduced in Phase 14. No MCP tool usage for registry install beyond `npx shadcn add` (and Phase 14 needs zero new installs per CONTEXT.md line 274/306).

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `tabs`, `slider`, `dialog`, `input`, `select`, `button`, `card`, `label`, `popover`, `command`, `badge`, `switch`, `tooltip`, `separator`, `sonner` | not required (official) |
| Third-party | — (none declared) | not applicable |

If a future task requires a third-party block, it MUST re-trigger the ui-researcher gate per `<design_contract_questions>` in the agent spec.

---

## Accessibility Contract (non-negotiable)

Basis for DSGVO audit alignment + EN 301 549 reasonable conformance targets for education sector. Phase 14 surfaces are admin-only configuration; a11y defects here are medium-severity (no security-critical change-preview as in Phase 13).

- **Keyboard nav:** All row-actions reachable via `Tab`; `Enter` opens Add/Edit-Dialog; `Space` toggles isActive Switch; `Arrow keys` move Slider thumb (1 unit per arrow, +/-10 with Page Up/Down — shadcn Slider default); `Esc` closes dialogs; Tab navigation through Sub-Tabs in Tab 4 is sequential.
- **Screen-reader labels:** Every icon-only button has `aria-label` in German (`Eintrag bearbeiten`, `Eintrag löschen`, `Auf Default zurücksetzen`, `Eintrag aktiv schalten`). Every Slider has `aria-label` `Gewichtung {constraintDisplayName} (0 bis 100)`. Every form input has visible `<label>` via `Label` primitive.
- **Focus ring:** Always visible (uses `--color-ring` which resolves to primary). Never `outline: none` without replacement.
- **Color + text + icon triad:** Severity-Badges pair color + icon + text label (HARD + destructive + `ShieldAlert` + `HARD`; SOFT + neutral + `Sliders` + `SOFT`). Active-Switch + Inactive-Switch pair color + icon (CircleCheck for active, empty for inactive) + label `Aktiv`/`Inaktiv` (in row "Aktiv" column header). Score-Badge pairs color + icon + numeric label.
- **Slider a11y:** `role="slider"` + `aria-valuemin="0"` + `aria-valuemax="100"` + `aria-valuenow={current}` + `aria-label`. Drag and keyboard both update aria-valuenow. NumberInput is a SECONDARY control — both controls have independent aria-labels referring to the same logical value.
- **Contrast:** All foreground/background pairs meet WCAG AA (body text 4.5:1; non-text UI 3:1). Existing CSS variable palette validated in Phase 10-13.
- **Switch with label:** isActive Switch in each Restriction/Preference row has `aria-label="Eintrag aktiv schalten"` AND a visible text label in the table column header `Aktiv`.
- **Tooltip a11y:** Tooltip-trigger uses Radix Tooltip primitive (keyboard-accessible via focus). Description content readable by screen-reader via `aria-describedby` linking input → tooltip content.
- **Dialogs:** `role="dialog"` + `aria-labelledby` pointing at DialogTitle + initial focus on first input (Class-/Subject-Autocomplete) per shadcn default. Delete-Restriction WarnDialog: initial focus on `Abbrechen` (safe default, prevents accidental Enter-confirm).
- **Autocomplete popover:** `role="combobox"` on input, `role="listbox"` on results, each result `role="option"` with `aria-selected`. Keyboard: Arrow keys navigate, Enter selects, Esc closes.
- **Table headers:** `<th scope="col">` on all Phase 14 tables (Catalog table, Restriction table, both Subject-Preference tables).
- **Empty states:** Heading has `role="heading" aria-level="3"` for proper document structure.
- **Tab-bar a11y:** Both main Tabs and nested Sub-Tabs in Tab 4 use shadcn Tabs primitive (Radix), which provides `role="tablist"` + `role="tab"` + `role="tabpanel"` + `aria-selected` + arrow-key navigation by default. Mobile Toggle-Group fallback for Sub-Tabs uses `role="radiogroup"` + `role="radio"` (Radix ToggleGroup default).

---

## Ambiguity / Inherits flags

Areas deliberately NOT pinned; planner/executor to confirm via Glob against existing admin pattern or escalate.

| Area | Status | Action |
|------|--------|--------|
| Loading skeleton exact shape per tab (4 tabs) | inherits from Phase 10/11/12/13 admin pattern | default: shimmering rows matching table columns / label placeholders; Tab 2 shows 8 SliderRow placeholders |
| Toast library (sonner vs shadcn `toast`) | inherits — already chosen in Phase 10 | use `sonner` per `components/ui/sonner.tsx` |
| Class-/Subject-Autocomplete debounce interval | discretion | 300 ms (consistent with Phase 11/12/13) |
| Class-/Subject-Autocomplete min-length | discretion | 2 characters (consistent with Phase 11 D-08) |
| Slider step size | locked at 1 | per D-07; do not deviate |
| Slider visual range | locked at 0..100 | per D-07; do not deviate |
| NumberInput width | discretion | `w-16` (64px) on desktop, full-width-row-cell on mobile |
| Reset-Icon-Button position | locked at right of row, after Default-Hint | per D-07; do not deviate |
| Catalog row Description column max-width | discretion | `max-w-md` desktop; full-width row 3 on mobile |
| Sub-Tab order in Tab 4 | locked: Vormittags-Präferenzen first, Bevorzugte Slots second | per CONTEXT.md "Claude's Discretion" → defaulted; do not deviate |
| MultiRowConflictBanner update mechanism | discretion | derive from cached query data after every CRUD mutation; no separate query |
| Cache invalidation granularity after Restriction-CRUD | discretion | invalidate only `['constraint-templates', schoolId, templateType]` (not full `['constraint-templates', schoolId]`) |
| Cache invalidation granularity after Weight-Save | locked | invalidate `['constraint-weights', schoolId]` AND share with Generator-Page Read-only Card (same query key) |
| Drift-banner refetch trigger | discretion | refetch on Tuning-Page mount + after any Weight-Save mutation; do NOT poll |
| Last-Run-Score badge time format | discretion | `vor X Stunden` for <24h, `vor X Tagen` for <7d, full date for older (use `date-fns` `formatDistanceToNow` with `de` locale, consistent with Phase 9.x history-page) |
| Mobile Sub-Tab Toggle-Group vs nested Tabs | locked | Toggle-Group on `<md` (640px); nested Tabs on `≥md` |
| Hard-row Lock-icon vs hidden action cell | locked at Lock-icon visible + tooltip | per D-10 transparency philosophy; do not hide |
| Soft-row "Gewichtung bearbeiten" deep-link target | locked | Tab 2 + scroll-into-view + 1s ring-primary flash + focus NumberInput |
| Generator-Page card weights display format | discretion | 2-column key-value grid; default values rendered in `text-muted-foreground`; custom values rendered in `text-foreground` |
| Empty-Rollen display on Tab 1 | discretion (inherits Phase 13 em-dash convention) | Show em-dash `—` (muted) only in cells where data is absent (none expected in Tab 1 — catalog is fully populated) |
| Slider keyboard shortcuts (Page Up/Down for ±10) | locked at shadcn default | do not customize keystrokes |
| German `displayName` translations for Java constraints | locked at table in Copywriting Contract | if Plan-14-01 surfaces additional Java constraints not listed, planner MUST loop back to ui-researcher |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (CTAs + 4 empty states + 10 error toasts + 4 destructive confirmations + 14 German constraint translations + 50+ inline micro-copy lines — all German, verbatim, covering 12 E2E-covered flows)
- [ ] Dimension 2 Visuals: PASS (19-component new inventory + Phase 11/12/13 shared reuse + icon inventory + layout per breakpoint documented + Slider-row dirty/custom-state visual semantics)
- [ ] Dimension 3 Color: PASS (60/30/10 + primary reserved-for + destructive reserved-for + success reserved-for + warning reserved-for + Severity-signal pairings triad + Slider-color-rule that explicitly forbids red/green on the slider itself)
- [ ] Dimension 4 Typography: PASS (4 sizes, 2 weights, line heights declared; `text-xs` scoped exclusively to Java-name annotations next to German labels)
- [ ] Dimension 5 Spacing: PASS (8-point scale + mobile 44px touch-target floor for Slider thumbs, NumberInput spinners, Switch tap zones, row-action icons; all card-padding values stay on the declared scale)
- [ ] Dimension 6 Registry Safety: PASS (shadcn official only; **no new primitive installs required** — Slider, Tooltip, Switch, Tabs, Dialog, Command, Badge, Separator all already installed per CONTEXT.md line 274/306)

**Approval:** pending

---

## UI-SPEC COMPLETE

**Phase:** 14 — Solver-Tuning
**Design System:** shadcn/ui default-style + neutral base + CSS variables (inherited from Phase 13 detection of `apps/web/components.json` + `apps/web/src/app.css`)

### Contract Summary
- Spacing: 8-point scale (4, 8, 16, 24, 32, 48) + mobile 44px touch-target floor (Slider thumbs, NumberInput spinners, Switch tap zones, row-action icons)
- Typography: 4 sizes (14, 14, 18, 24), 2 weights (400, 600), Inter; `text-xs` scoped exclusively to Java-name annotations
- Color: 60 white / 30 card-neutral / 10 blue primary; destructive red, success green, warning amber — each with explicit reserved-for lists; Severity-signal pairings triad (color + icon + text); Slider-color-rule explicitly forbids red/green on the slider itself
- Copywriting: 16 primary-CTA labels, 4 empty states, 10 error-toast templates, 4 destructive confirmations, 14 German constraint translations + descriptions, 3 multi-row InfoBanner variants, 50+ inline micro-copy lines — all German, verbatim
- Registry: shadcn official only; **no new primitive installs required** (all 15 needed primitives already installed per CONTEXT.md line 274/306)

### File Created
`.planning/phases/14-solver-tuning/14-UI-SPEC.md`

### Pre-Populated From
| Source | Decisions Used |
|--------|---------------|
| 14-CONTEXT.md | 17 (D-01 through D-17 locked decisions) |
| REQUIREMENTS.md | 5 (SOLVER-01..05) + 2 (MOBILE-ADM-01/02 touch-target rules) |
| ROADMAP.md §Phase 14 | 5 success criteria |
| Phase 13 UI-SPEC | Token reuse (60/30/10 split, accent reserved-for pattern, mobile 44px floor, Silent-4XX-Invariante codification) |
| Phase 10/11/12 UI-SPECs | Pattern continuation (Tabs, StickyMobileSaveBar, UnsavedChangesDialog, Autocomplete debounce/min-length) |
| `apps/web/components.json` | yes (preset, icon library, CSS-var mode — inherited from Phase 13 detection) |
| `apps/web/src/app.css` | yes (Inter font, token palette, no dark mode — inherited from Phase 13 detection) |
| User input | 0 (no new questions asked — upstream fully covered; CONTEXT.md decisions LOCKED per orchestrator instruction) |

### Ready for Verification
UI-SPEC complete. Checker can now validate against 6 design quality dimensions.
