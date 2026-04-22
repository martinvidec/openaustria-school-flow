---
phase: 11
slug: lehrer-und-faecher-verwaltung
status: approved
reviewed_at: 2026-04-22
shadcn_initialized: true
preset: shadcn default (Tailwind 4 tokens, pre-existing install — components.json style=default, baseColor=neutral, cssVariables=true)
ui_language: de
api_language: en
created: 2026-04-22
inherits_from:
  - .planning/phases/10-schulstammdaten-zeitraster/10-UI-SPEC.md
canonical_for:
  - Phase 12 (Schüler-, Klassen- und Gruppenverwaltung)
---

# Phase 11 — UI Design Contract: Lehrer- und Fächer-Verwaltung

> Visual + interaction contract for TEACHER-01..06 and SUBJECT-01..05. Layered on top of the Phase 10 canonical contract (inherited, not redefined). Locked by `11-CONTEXT.md` D-01..D-16 with the three explicit user overrides called out in §0.
>
> Consumed by `gsd-planner`, `gsd-executor`, `gsd-ui-checker`, `gsd-ui-auditor`.

---

## 0. Source-of-Truth Map

| Decision / Requirement | Source | UI Section |
|-------------------------|--------|------------|
| D-01 `/admin/teachers` + `/admin/subjects` separate routes | CONTEXT.md | §1 |
| D-02 Teacher list→detail 4-tab page; Subject dialog-edit | CONTEXT.md | §2, §3 |
| D-03 "Personal & Fächer" sidebar group | CONTEXT.md | §1.5 |
| D-04 Inline empty CTA (no first-run wizard) | CONTEXT.md | §2.1, §3.1 |
| D-05 Werteinheiten live-computed total | CONTEXT.md | §2.3 |
| **D-06 USER-OVERRIDE: Visual week-grid for Verfügbarkeit** | CONTEXT.md | §2.4 |
| D-07 Row-add list for Ermäßigungen | CONTEXT.md | §2.5 |
| D-08 Keycloak search-by-email + confirmation | CONTEXT.md | §2.6 |
| D-09 Dense table + edit dialog for Subjects | CONTEXT.md | §3.2 |
| D-10 Stundentafel-Vorlagen read-only section | CONTEXT.md | §3.4 |
| ~~D-11 USER-OVERRIDE: Free hex picker~~ — **rolled back 2026-04-22** after research; Farbe field removed from Subject dialog (no schema change) | CONTEXT.md | §3.3 |
| D-12 Orphan-Guard 409 with affected-entity list | CONTEXT.md | §4 |
| D-13 E2E full ROADMAP scope — 8 spec files | CONTEXT.md | §9 (E2E patterns) |
| D-14 Orphan-Guard backend gap-fix atomic | CONTEXT.md | §4 |
| D-15 Defense-in-depth (shared Zod + RHF + class-validator) | CONTEXT.md | §6 |
| **D-16 USER-OVERRIDE: 3 bundled plans (shared+Teacher / Subject / E2E)** | CONTEXT.md | §9 |
| TEACHER-01..06 | REQUIREMENTS.md | §2 |
| SUBJECT-01..05 | REQUIREMENTS.md | §3 |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized in repo) |
| Preset | shadcn default (Tailwind 4, neutral base, CSS variables) |
| Component library | Radix UI primitives via shadcn wrappers (`components/ui/*`) |
| Icon library | lucide-react (already installed) |
| Font | Inter loaded via `--font-sans` in `app.css` |
| Toasts | sonner (already installed) |
| Forms | React Hook Form + Zod (`@schoolflow/shared`) via `zodResolver` |
| Contrast utility | hand-rolled WCAG 2.1 relative-luminance helper under `apps/web/src/lib/wcag.ts` (Claude's discretion — no new library). Reason: `tinycolor2` is unmaintained since 2021; WCAG-AA ratio math is ~20 LoC. |
| Re-used Phase 10 shared | `PageShell`, `UnsavedChangesDialog`, `StickyMobileSaveBar`, `InfoBanner`, `WarnDialog` (see §7) |

Registry additions: none. No third-party shadcn registries used — registry safety gate not required (see §10).

---

## 1. Page Shell Pattern

### 1.1 Routes (TanStack Router, file-based)

| Route file | URL | Purpose |
|------------|-----|---------|
| `apps/web/src/routes/_authenticated/admin/teachers.index.tsx` | `/admin/teachers` | Lehrerliste (dense table / mobile cards) |
| `apps/web/src/routes/_authenticated/admin/teachers.$teacherId.tsx` | `/admin/teachers/$teacherId` | Lehrer-Detail with 4 tabs |
| `apps/web/src/routes/_authenticated/admin/subjects.index.tsx` | `/admin/subjects` | Fächer-Dense-Table + Stundentafel-Vorlagen-Section (no detail page) |

Active detail tab persisted via Zod-validated search param `?tab=stammdaten|verpflichtung|verfuegbarkeit|ermaessigungen`; default `tab=stammdaten`.

### 1.2 Breadcrumbs (reuses Phase 10 PageShell)

Teacher list:
```
Admin  ›  Personal & Fächer  ›  Lehrer
```

Teacher detail:
```
Admin  ›  Personal & Fächer  ›  Lehrer  ›  {firstName lastName}
```

Subject page:
```
Admin  ›  Personal & Fächer  ›  Fächer
```

Pattern identical to Phase 10 §1.2 (`ChevronRight` separator, `text-sm`, `gap-1.5`, muted link crumbs). Last crumb is current page, non-link. On `< md` only the last crumb + back-arrow button are visible.

### 1.3 Page Header (H1 + Sub-line)

Inherits Phase 10 §1.3 (`text-2xl md:text-3xl font-semibold tracking-tight leading-tight` for H1, `text-sm text-muted-foreground mt-1` for sub-line, `mb-6` below).

| Page | H1 | Sub-line |
|------|----|---------|
| Teachers list | `Lehrerinnen und Lehrer` | `Stammdaten, Lehrverpflichtung, Verfügbarkeit und Ermäßigungen pflegen.` |
| Teacher detail | `{firstName} {lastName}` | `{fach1}, {fach2} · {beschaeftigungsgrad}% · {status === ACTIVE ? 'Aktiv' : 'Archiviert'}` |
| Subjects page | `Fächer` | `Fachkatalog pflegen und Stundentafel-Vorlagen pro Schultyp einsehen.` |

Teacher-detail sub-line is dynamic and reads from the GET response. When no qualifications exist yet, sub-line renders `Noch keine Fachzuordnungen · {beschaeftigungsgrad}% · Aktiv`. Archived teachers render an additional `Archiviert`-Badge inline right of the H1 (`bg-muted text-muted-foreground`, Phase 10 Aktiv-Badge visual pattern but neutral palette).

### 1.4 Tab Bar (Teacher detail only)

Reuses Phase 10 §1.4 / §1.5 verbatim: desktop `<Tabs>` + `<TabsList>` + 4 `<TabsTrigger>`; mobile `< md` swaps to shadcn `<Select>` dropdown full-width `h-11`.

| Value | Label |
|-------|-------|
| `stammdaten` | Stammdaten |
| `verpflichtung` | Lehrverpflichtung |
| `verfuegbarkeit` | Verfügbarkeit |
| `ermaessigungen` | Ermäßigungen |

Tab labels follow the Phase 10 1-word rule (Ermäßigungen is intentional — no shorter accurate German term). No tab is disabled in the empty-flow because a Teacher cannot be opened without existing.

Pro-Tab-Dirty-State: each tab owns its own RHF form, `isDirty`, and save mutation. Navigating tabs with an unsaved change triggers the shared `UnsavedChangesDialog` (Phase 10 §8) — zero new copy.

### 1.5 Sidebar Group — "Personal & Fächer" (D-03)

New group in `AppSidebar.tsx` and `MobileSidebar.tsx`, role-gated `roles: ['admin', 'schulleitung']`, inserted **after** `Schulverwaltung` and **before** `Ressourcen`. Executor's placement discretion is allowed within that window; the semantic slot is "Stammdaten-Verwaltung aller Personen/Entitäten" (grows in Phase 12 to include Schüler + Klassen).

| Sidebar entry | Route | Icon |
|----------------|-------|------|
| Lehrer | `/admin/teachers` | `GraduationCap` (lucide) |
| Fächer | `/admin/subjects` | `BookOpen` (lucide) |

Group visual:
- **Desktop expanded sidebar:** Group label rendered as uppercase-small-caps separator row: `<div className="px-3 pt-4 pb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">Personal & Fächer</div>`, then the two entries below it. `mt-2` above the label.
- **Desktop collapsed sidebar (`w-16`):** No group label visible; the two icon-only entries sit in sequence. Tooltip (hover) shows the entry label (Phase 10 canonical pattern).
- **Mobile drawer:** Group label same `text-xs uppercase tracking-wider`, entries below inherit Phase 10 mobile sidebar row styling.

Current Phase 10 `AppSidebar.tsx` is a flat list — the planner MUST refactor to support grouping. This is a refactor, not a new component, and belongs in Plan 11-01 Wave 0.

### 1.6 Sticky Save Bar (mobile, Teacher-Detail per tab)

Reuses Phase 10 §1.6 exactly: `fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-3 z-40`, `h-11 w-full` button, `env(safe-area-inset-bottom)` padding, only renders when `isDirty`. Per-tab save scope. Existing `StickyMobileSaveBar` component is reused as-is.

The Subjects page does NOT have a sticky save bar (all mutations happen inside Dialogs).

---

## 2. Teacher UI (TEACHER-01..06)

### 2.1 Teacher List Page — `/admin/teachers` (TEACHER-01, TEACHER-06)

#### 2.1.1 Header Controls Row (above list)
Layout: `flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4`.
- **Left (filter cluster, `flex gap-2 w-full md:w-auto`):**
  - Search input — shadcn `<Input>` with leading `Search` icon (`h-4 w-4 text-muted-foreground`). `placeholder="Name, Fach oder E-Mail suchen"`. Desktop `w-64`, mobile `w-full`. Debounced 250ms into the TanStack Query key.
  - Fach filter — shadcn `<Select>` labelled "Fach filtern", `min-w-[180px]`, mobile full-width below the search input (`flex-col md:flex-row`).
  - Status filter — shadcn `<Select>` with 3 options: `Alle` / `Aktiv` / `Archiviert`. Default = `Aktiv`. `min-w-[140px]`.
- **Right (primary CTA):** `[+ Lehrperson anlegen]` — shadcn `<Button variant="default">`, `Plus` icon prefix, `h-10` desktop / `h-11 w-full` mobile.

No bulk-select checkboxes in Phase 11 (bulk-actions deferred per CONTEXT.md).

#### 2.1.2 Desktop Table (`md:` and up)

`<table className="hidden md:table w-full">` inside `<Card>`.

| Column | Width | Alignment | Content |
|--------|-------|-----------|---------|
| Name | `w-auto` | left | `{firstName} {lastName}` (14px / 500 weight) + `E-Mail` below in `text-xs text-muted-foreground` |
| Fächer | `w-48` | left | Comma-separated `{kuerzel}` list (max 3 visible + `+N` pill for overflow). Each kürzel pill uses the Fach's color pair as background-text, `rounded px-1.5 py-1 text-xs font-semibold`. |
| Werteinheiten | `w-28` | right | Computed total (e.g. `18,5 WE`). `tabular-nums`. |
| Status | `w-24` | center | Badge: `Aktiv` (primary) or `Archiviert` (muted). |
| Keycloak | `w-20` | center | `Link2` icon (primary) when linked, `Link2Off` icon muted when not. Tooltip on hover: linked email or `Nicht verknüpft`. |
| Aktion | `w-10` | center | Row-level `<DropdownMenu>` trigger: `MoreVertical` icon-button. |

Row click anywhere except the Aktion dropdown → navigate to `/admin/teachers/$teacherId?tab=stammdaten`. Cursor `cursor-pointer`; hover `hover:bg-muted/50`.

Row actions in the dropdown:
- `Bearbeiten` — opens detail page.
- `Archivieren` (visible when `status === ACTIVE`) — **opens `WarnDialog`** (non-destructive variant, `AlertTriangle` amber-600). Canonical copy declared in §7.2. On confirm: PATCH status to `ARCHIVED`, toast `Lehrperson archiviert.`, invalidate list query.
- `Reaktivieren` (visible when `status === ARCHIVED`) — **direct mutation, no confirmation** (action is fully recoverable). PATCH status to `ACTIVE`, toast `Lehrperson reaktiviert.`, invalidate list query.
- `Löschen` — destructive; only visible when `status === ARCHIVED` AND has no orphan references (the backend decides; client calls the endpoint and surfaces the 409 if it comes back). Disabled-tooltip on `ACTIVE` teachers: `Lehrperson muss vorher archiviert werden`.

Header row: `text-xs font-medium text-muted-foreground uppercase tracking-wide border-b px-3 py-2` (inherits Phase 10 §4.3 header row style).

#### 2.1.3 Mobile Cards (`< md`)

`<div className="md:hidden space-y-3">`, one shadcn `<Card>` per teacher, tap-area the whole card (`<Link to=".../$teacherId">`).

Per-card layout (`p-4 flex items-start gap-3`):
- Avatar circle: initials on muted background (`h-10 w-10 rounded-full bg-muted text-sm font-semibold flex items-center justify-center`). No photo upload in v1.1.
- Main column (`flex-1 min-w-0`):
  - Line 1: `{firstName} {lastName}` (`text-base font-semibold truncate`).
  - Line 2: `{kuerzel list}` with color pills (max 3 + `+N`), `flex flex-wrap gap-1 mt-1`.
  - Line 3: `{WE-total} WE · {Aktiv | Archiviert}`, `text-xs text-muted-foreground mt-1`.
- Trailing: `ChevronRight` icon (`h-5 w-5 text-muted-foreground shrink-0`).

Long-press or explicit `MoreVertical` trigger at the card's top-right opens the same Aktion dropdown.

#### 2.1.4 Empty State (D-04)

No teachers match the current filter:
- Filtered empty (filter active): hero icon `SearchX` (48px, muted) + heading `Keine Treffer` + body `Keine Lehrperson entspricht den gewählten Filtern. Filter zurücksetzen oder neue Lehrperson anlegen.` + button `Filter zurücksetzen` (ghost, left of `+ Lehrperson anlegen`).
- Unfiltered empty (no teachers yet): hero icon `GraduationCap` (48px, muted) + heading `Noch keine Lehrerinnen und Lehrer` + body `Legen Sie die erste Lehrperson an, um Fächer zuordnen und Stundenpläne erzeugen zu können.` + inline form **opens a Dialog** on button click — NOT a directly-rendered form (Teacher creation has >5 fields, incl. Keycloak search, which is too heavy for inline-first-paint per CONTEXT.md D-04's "inline CTA" phrasing which applies to list rendering, not to the form itself).

The CTA `[Erste Lehrperson anlegen]` opens the same `TeacherCreateDialog` as the top-right button.

### 2.2 Teacher Detail — Tab 1 "Stammdaten" (TEACHER-02)

Section title: `Stammdaten` — sub-line: `Persönliche Daten und Verknüpfung mit dem Keycloak-Account.`

Field order (top to bottom, stacked per Phase 10 §2.3):

1. **Vorname** (required) — `Input type="text"`, `placeholder="Maria"`.
2. **Nachname** (required) — `Input type="text"`, `placeholder="Huber"`.
3. **Akademischer Titel** (optional) — `Input type="text"`, `placeholder="Mag., Dr."`, `maxLength={32}`.
4. **E-Mail (beruflich)** (required) — `Input type="email"`, `placeholder="m.huber@schule.at"`.
5. **Telefon** (optional) — `Input type="tel"`.
6. **Status** (required) — shadcn `<Select>` with 2 options: `Aktiv` / `Archiviert`. Default = `Aktiv` on create. Archiving here is equivalent to Row-Aktion → Archivieren. Info text below the select: `Archivierte Lehrpersonen verschwinden aus neuen Stundenplan-Läufen; ihre bestehenden Einträge bleiben unverändert.`
7. **Keycloak-Verknüpfung** — see §2.6.

Save button placement: Phase 10 §2.5 (desktop `flex justify-end mt-6`, mobile sticky).

#### 2.2.1 Copywriting

| Element | Copy |
|---------|------|
| Section title | `Stammdaten` |
| Section subtitle | `Persönliche Daten und Verknüpfung mit dem Keycloak-Account.` |
| Vorname label | `Vorname *` |
| Nachname label | `Nachname *` |
| Titel label | `Akademischer Titel` |
| Titel placeholder | `Mag., Dr.` |
| E-Mail label | `E-Mail (beruflich) *` |
| Telefon label | `Telefon` |
| Status label | `Status *` |
| Status info | `Archivierte Lehrpersonen verschwinden aus neuen Stundenplan-Läufen; ihre bestehenden Einträge bleiben unverändert.` |
| Save (update) | `Speichern` |
| Save (create, in dialog) | `Lehrperson anlegen` |
| Success toast (update) | `Änderungen gespeichert.` |
| Success toast (create) | `Lehrperson angelegt.` |
| Required-field error | `Pflichtfeld` |
| Email format error | `Gültige E-Mail-Adresse eingeben` |

### 2.3 Teacher Detail — Tab 2 "Lehrverpflichtung" (TEACHER-03)

Section title: `Lehrverpflichtung` — sub-line: `Beschäftigungsgrad, OEPU-Funktionsstunden und zusätzliche Werteinheiten.`

Two-column layout on desktop (`grid grid-cols-1 md:grid-cols-2 gap-8`), stacked on mobile.

**Left column — editable inputs (D-05):**

1. **Beschäftigungsgrad (%)** (required) — `Input type="number"`, `min={0}`, `max={100}`, `step={1}`, suffix-chip `%` rendered in a `pr-10` padding plus an absolute `<span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">%</span>`. Full width.
2. **OEPU-Gruppe** (optional) — shadcn `<Select>` with OEPU groups + "Keine". Feeds into `werteinheiten.util.getOepuSupplement()`.
3. **OEPU-Funktionsstunden** (optional) — `Input type="number"`, `min={0}`, `step={0.5}`. Suffix `h`.
4. **Zusätzliche Werteinheiten** (optional, power-user override) — `Input type="number"`, `min={0}`, `step={0.5}`. Suffix `WE`. Help text: `Für spezielle Aufgaben außerhalb der OEPU-Systematik.`
5. **Fachzuordnungen** (TeacherSubject list) — sub-section with "+ Fach zuordnen" button. Each row: `Select` (Fach) + `Number` (Stunden/Woche) + `Trash2` icon. Same row-add pattern as §2.5. Empty state inside sub-section: `Noch keine Fächer zugeordnet.`

**Right column — live-computed Werteinheiten-Breakdown:**

Rendered as a shadcn `<Card>` with `bg-muted/30 p-4`. Content:
- Header: `Berechnete Werteinheiten` (`text-sm font-medium`).
- Breakdown rows (each `flex justify-between py-1 text-sm tabular-nums border-b last:border-b-0`):
  - `Fachunterricht ({stundenTotal} h)` → `{WE-fach} WE`
  - `OEPU-Zuschlag ({oepuGruppe})` → `+ {WE-oepu} WE`
  - `Zusatz` → `+ {WE-zusatz} WE`
  - `Ermäßigungen` → `− {WE-erm} WE` (negative, linked from Tab 4)
- Footer row (`pt-3 border-t font-semibold text-base flex justify-between`):
  - `Gesamt` → `{WE-total} WE`
- Server-saved comparison line (only when `isDirty`): `text-xs text-muted-foreground mt-3` — copy: `Zuletzt gespeichert: {we-server-saved} WE`.

The pure `werteinheiten.util.ts` function moves to `packages/shared/src/werteinheiten/` (or is re-exported) so client and server compute identically (CONTEXT.md Integration Points).

Save button: Phase 10 §2.5.

#### 2.3.1 Solver Re-Run Info Banner (CONTEXT.md Claude discretion)

Directly above the save button area, **always rendered on this tab** (changes to Lehrverpflichtung affect solver outcomes):
```
ℹ  Änderungen an Werteinheiten oder Fachzuordnungen wirken sich erst
   beim nächsten Stundenplan-Lauf aus.
```
Uses the Phase 10 `InfoBanner` component verbatim (`bg-muted/50 border border-muted rounded-md p-3 text-sm` + `Info` icon). Copy locked above.

#### 2.3.2 Copywriting

| Element | Copy |
|---------|------|
| Section title | `Lehrverpflichtung` |
| Section subtitle | `Beschäftigungsgrad, OEPU-Funktionsstunden und zusätzliche Werteinheiten.` |
| Beschäftigungsgrad label | `Beschäftigungsgrad *` |
| Beschäftigungsgrad error (0-100) | `Wert muss zwischen 0 und 100 liegen` |
| OEPU-Gruppe label | `OEPU-Gruppe` |
| OEPU-Stunden label | `OEPU-Funktionsstunden` |
| Zusatz-WE label | `Zusätzliche Werteinheiten` |
| Zusatz-WE hint | `Für spezielle Aufgaben außerhalb der OEPU-Systematik.` |
| Fachzuordnungen section | `Fachzuordnungen` |
| Fachzuordnungen empty | `Noch keine Fächer zugeordnet.` |
| Add Fach CTA | `Fach zuordnen` |
| Computed card heading | `Berechnete Werteinheiten` |
| Gesamt row | `Gesamt` |
| Solver banner | `Änderungen an Werteinheiten oder Fachzuordnungen wirken sich erst beim nächsten Stundenplan-Lauf aus.` |

### 2.4 Teacher Detail — Tab 3 "Verfügbarkeit" (TEACHER-04) — **USER-OVERRIDE D-06**

Section title: `Verfügbarkeit` — sub-line: `Klicken Sie auf eine Zelle, um sie als geblockt zu markieren. Geblockte Zellen werden im Solver nicht verplant.`

#### 2.4.1 Desktop Week-Grid (`md:` and up)

Source rows: TimeGrid periods (non-break rows) × school days (Mo..Sa filtered to active school days — fetched from `useTimeGrid(schoolId)`).

Layout: HTML `<table>` (accessible grid) with `role="grid"` explicit, captioned `Verfügbarkeits-Raster — {periodCount} Perioden × {dayCount} Tage`.

| Column | Width | Content |
|--------|-------|---------|
| (header col 0) | `w-16` | Period label, `text-xs text-muted-foreground text-right pr-3` |
| Mo..Fr(..Sa) | `flex-1` equal | Clickable cell `<button role="gridcell" aria-pressed={isBlocked}>` |

Cell size: desktop `h-12` (48px). Cell visual states:

| State | Background | Text | Border |
|-------|-----------|------|--------|
| Verfügbar (default) | `bg-background` | `text-muted-foreground` | `border border-border` |
| Geblockt | `bg-muted` diagonal-hatched via `background-image: repeating-linear-gradient(45deg, transparent 0 4px, var(--color-muted-foreground) 4px 5px)` — accessible, distinct for colorblind users | `text-foreground font-medium` | `border border-muted-foreground/30` |
| Hover (verfügbar) | `bg-accent` | `text-accent-foreground` | — |
| Focus | (Radix/Tailwind) `focus-visible:ring-2 ring-ring ring-offset-2` | — | — |
| Pause row | `bg-muted/20` pattern, not interactive | `text-muted-foreground italic text-xs` | no border |

Cell inner content (when blocked): `Lock` icon (`h-4 w-4`) centered. When available: empty (noise-free). Hovering the cell shows a shadcn `<Tooltip>` with `Klicken, um zu blocken` / `Klicken, um freizugeben`.

Cell label for screen-readers: `aria-label="Montag, 2. Stunde, verfügbar"` / `aria-label="Montag, 2. Stunde, geblockt"`. Keyboard nav: Tab enters the grid at the first cell; Arrow keys move between cells; Space / Enter toggles. Documented in §8 Accessibility.

**Row/column shortcuts (Claude discretion implementation):**
- Click on a column header day name → toggles all cells in that day (confirm-dialog if ≥ 3 cells currently blocked to avoid accidental bulk-clear).
- Click on a row header period label → toggles that period across all days (same confirm rule).
- Column/row header hover-state: slightly darker `bg-muted` hint; cursor `cursor-pointer`; tooltip `Gesamten {Montag | 2. Stunde} umschalten`.

#### 2.4.2 Mobile Day-Picker Fallback (`< md`) — **USER-OVERRIDE mitigation**

375px cannot fit a 5-column grid with 44px touch targets (`5 × 44 + 4 × 8 = 252px` minimum for cells alone + row label + padding → exceeds viewport inner width ~343px once padding and label column apply). The mobile adaptation is:

- **Day-Picker Dropdown** (shadcn `<Select>` full-width `h-11`) at top of section, labelled `Tag`. Default = first active school day.
- **Single-column list of periods** for the selected day. Each row: full-width `h-11 flex items-center justify-between border rounded-md px-4` with period label on the left, toggle pill on the right.
- Toggle pill: shadcn `<Toggle>` with `Lock` icon, 44×44 hit area. Active = geblockt.
- Help text above the day-picker: `Wählen Sie einen Tag, um seine Verfügbarkeit zu pflegen.`
- Swipe-left/right between days is NOT in scope for Phase 11 (accessibility complications + no Radix pattern); day navigation stays via the Select. Documented as Claude-discretion resolution of the CONTEXT.md mobile-risk flag.

NO swipe pattern in Phase 11. If the executor adds one later, it MUST still expose the Select as an accessible fallback.

#### 2.4.3 Legend Row

Below both desktop grid and mobile list: `flex items-center gap-4 mt-3 text-xs text-muted-foreground`:
- `<span className="inline-block h-3 w-3 border border-border mr-1"></span> Verfügbar`
- `<span className="inline-block h-3 w-3 bg-muted bg-hatched mr-1"></span> Geblockt`
- `<span className="inline-block h-3 w-3 bg-muted/20 mr-1"></span> Pause (nicht planbar)`

#### 2.4.4 Save Behavior

Changes accumulate in RHF (per-cell `isBlocked` bool). `isDirty` true on first toggle. Save = single PUT with the full availability-rules array (Replace-all-in-transaction pattern from Phase 2 D-04 / Phase 10 §14.1).

Save button: Phase 10 §2.5 + Phase 10 `InfoBanner` solver-rerun reminder (identical to §2.3.1 text).

#### 2.4.5 Copywriting

| Element | Copy |
|---------|------|
| Section title | `Verfügbarkeit` |
| Section subtitle | `Klicken Sie auf eine Zelle, um sie als geblockt zu markieren. Geblockte Zellen werden im Solver nicht verplant.` |
| Grid caption (sr-only) | `Verfügbarkeits-Raster — {N} Perioden × {M} Tage` |
| Tooltip available → blocked | `Klicken, um zu blocken` |
| Tooltip blocked → available | `Klicken, um freizugeben` |
| Bulk-toggle confirm title | `Ganze Spalte umschalten?` / `Ganze Zeile umschalten?` |
| Bulk-toggle confirm body | `{Montag | 2. Stunde} wird für alle {Perioden | Tage} {frei | geblockt}. Fortfahren?` |
| Mobile day-picker label | `Tag` |
| Mobile help text | `Wählen Sie einen Tag, um seine Verfügbarkeit zu pflegen.` |
| Save button | `Speichern` |
| Success toast | `Verfügbarkeit gespeichert.` |
| Solver banner | `Änderungen an Werteinheiten oder Fachzuordnungen wirken sich erst beim nächsten Stundenplan-Lauf aus.` (reused copy — single canonical string) |

Empty TimeGrid edge-case: if the school has no periods yet, render Phase 10 `InfoBanner` with copy `Das Zeitraster ist noch leer. Legen Sie zuerst Perioden unter Schulverwaltung › Zeitraster an.` + deep link button to `/admin/school/settings?tab=timegrid`.

### 2.5 Teacher Detail — Tab 4 "Ermäßigungen" (TEACHER-05) — D-07

Section title: `Ermäßigungen` — sub-line: `Reduktionen der Lehrverpflichtung mit Grund und Stundenanzahl.`

Row-add list (Phase 2 D-04 replace-all-in-transaction strategy).

Row layout (`flex flex-col md:flex-row md:items-end gap-3 py-3 border-b last:border-b-0`):
- **Grund** (required) — shadcn `<Select>` min-w `md:w-64`, options:
  | Value | Label |
  |-------|-------|
  | `KLASSENVORSTAND` | Klassenvorstand |
  | `OEPU_FUNKTION` | OEPU-Funktion |
  | `SUPPLIERREDUKTION` | Supplierreduktion |
  | `KUSTODIAT` | Kustodiat |
  | `MENTORING` | Mentoring |
  | `SONSTIGES` | Sonstiges |
- **Anmerkung** (required when `Grund === SONSTIGES`, optional otherwise) — `Input type="text"`, `placeholder="kurze Erläuterung"`, `maxLength={120}`. Phase 10 §2.4 validation pattern (inline error).
- **Stunden (WE)** (required) — `Input type="number"`, `min={0}`, `step={0.5}`, `suffix="WE"`, `w-28`.
- **Entfernen** — `Trash2` icon-button, `h-8 w-8` desktop / `h-11 w-11` mobile, `aria-label="Ermäßigung entfernen"`.

Below the list:
- `[+ Ermäßigung hinzufügen]` — shadcn `<Button variant="outline">` with `Plus` icon prefix. Full-width mobile.
- Summary row below the "+"-button (always rendered, even when empty):
  `text-sm text-muted-foreground mt-3 flex justify-between tabular-nums`:
  - Left: `{count} Ermäßigung{count === 1 ? '' : 'en'}`
  - Right: `Gesamt {sum} WE`

Empty state (no rows): `text-sm text-muted-foreground py-6 text-center` — copy: `Keine Ermäßigungen erfasst.`

Save: Phase 10 §2.5. Replace-all-in-transaction on the server. Dirty = any add/remove/edit.

#### 2.5.1 Copywriting

| Element | Copy |
|---------|------|
| Section title | `Ermäßigungen` |
| Section subtitle | `Reduktionen der Lehrverpflichtung mit Grund und Stundenanzahl.` |
| Grund label | `Grund *` |
| Anmerkung label (SONSTIGES) | `Anmerkung *` |
| Anmerkung label (other) | `Anmerkung` |
| Stunden label | `Stunden (WE) *` |
| Empty state | `Keine Ermäßigungen erfasst.` |
| Add CTA | `Ermäßigung hinzufügen` |
| Summary singular | `1 Ermäßigung · Gesamt {sum} WE` |
| Summary plural | `{count} Ermäßigungen · Gesamt {sum} WE` |
| Save | `Speichern` |
| Success toast | `Ermäßigungen gespeichert.` |
| Anmerkung required (SONSTIGES) error | `Anmerkung ist bei "Sonstiges" erforderlich` |

### 2.6 Keycloak-Verknüpfung (D-08) — rendered on Stammdaten-Tab

Sub-section at the bottom of Tab 1 (after the status field), separated by `<Separator className="my-6" />`.

#### 2.6.1 Unlinked State

Layout: `flex flex-col gap-3 p-4 bg-muted/30 border border-dashed border-muted rounded-md`:
- Header row (`flex items-center gap-2 text-sm`): `Link2Off` icon + label `Kein Keycloak-Account verknüpft` + subtitle `text-xs text-muted-foreground`: `Ohne Verknüpfung kann sich die Lehrperson nicht einloggen.`
- CTA button: `[Keycloak-Account verknüpfen]` — outline variant, `h-10` desktop / `h-11` mobile.

#### 2.6.2 Link Dialog (opens on CTA click)

shadcn `<Dialog>`, `sm:max-w-md`. Title: `Keycloak-Account verknüpfen`.

Body layout (`space-y-4`):
1. **E-Mail-Suchfeld** — `Input type="email" autoFocus`, `placeholder="m.huber@schule.at"`, leading `Search` icon inside `pl-10` padding. Below input: debounced (300ms) query fires to `GET /admin/keycloak/users?email=...`.
2. **Result state machine:**
   - **Idle / empty input:** placeholder helper text `Mindestens 3 Zeichen eingeben, um zu suchen.`
   - **Searching:** inline `Loader2` spinner + text `Suche läuft...`.
   - **No match (404):** destructive-tinted inline banner `bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive` with `AlertCircle` icon + copy `Kein Account mit dieser E-Mail gefunden.` + secondary action button `Nach anderen Treffern suchen` (re-focuses input).
   - **Match (200):** user-card inside `bg-card border rounded-md p-3`:
     - Avatar circle (initials, 10×10) + name bold (`text-sm font-semibold`) + email muted (`text-xs text-muted-foreground`) + 2-line spacer + shadcn `<Badge>` with Keycloak-ID (first 8 chars, `text-xs tabular-nums font-mono`).
     - Sub-note if user already linked to ANOTHER teacher: `bg-amber-50 border border-amber-200 p-2 text-xs rounded mt-2` — `AlertTriangle` icon + copy `Bereits verknüpft mit {firstName} {lastName}. Beim Bestätigen wird die alte Verknüpfung gelöst.` (the backend enforces uniqueness via upsert on keycloakUserId, this copy mirrors the behavior).
3. **Footer buttons** (`flex flex-col-reverse sm:flex-row sm:justify-end gap-2`):
   - `[Abbrechen]` — ghost, default-focused when dialog opens (or once a result loads, no action selected).
   - `[Verknüpfen]` — primary, disabled until a match is displayed and selected.

On success: dialog closes, toast `Keycloak-Account verknüpft.`, Stammdaten sub-section switches to Linked-State (§2.6.3). Invalidates `['teacher', teacherId]`.

#### 2.6.3 Linked State

Layout: `flex items-center justify-between gap-3 p-4 bg-primary/5 border border-primary/20 rounded-md`:
- Left: `Link2` icon (primary) + email (`text-sm font-semibold`) + `text-xs text-muted-foreground` sub-line: `Keycloak-ID: {kcId8}...`.
- Right: `[Verknüpfung lösen]` — ghost variant, `text-destructive`, `Unlink2` icon.

Clicking `[Verknüpfung lösen]` opens the Phase 10 `WarnDialog` with:
- Title: `Verknüpfung lösen?`
- Body: `{email} wird von dieser Lehrperson entkoppelt. Sie kann sich nach dem Lösen nicht mehr einloggen, bis ein neuer Account verknüpft wird.`
- Icon: `AlertTriangle` amber-600.
- Actions: `[Abbrechen]` (ghost, autoFocus) + `[Verknüpfung lösen]` (destructive).

On success: toast `Verknüpfung gelöst.`.

#### 2.6.4 Copywriting

| Element | Copy |
|---------|------|
| Unlinked header | `Kein Keycloak-Account verknüpft` |
| Unlinked subtitle | `Ohne Verknüpfung kann sich die Lehrperson nicht einloggen.` |
| Unlinked CTA | `Keycloak-Account verknüpfen` |
| Dialog title | `Keycloak-Account verknüpfen` |
| Search placeholder | `m.huber@schule.at` |
| Search idle hint | `Mindestens 3 Zeichen eingeben, um zu suchen.` |
| Searching | `Suche läuft...` |
| No match | `Kein Account mit dieser E-Mail gefunden.` |
| Already linked warning | `Bereits verknüpft mit {name}. Beim Bestätigen wird die alte Verknüpfung gelöst.` |
| Confirm link | `Verknüpfen` |
| Dialog cancel | `Abbrechen` |
| Success toast | `Keycloak-Account verknüpft.` |
| Linked CTA | `Verknüpfung lösen` |
| Unlink dialog title | `Verknüpfung lösen?` |
| Unlink dialog body | `{email} wird von dieser Lehrperson entkoppelt. Sie kann sich nach dem Lösen nicht mehr einloggen, bis ein neuer Account verknüpft wird.` |
| Unlink confirm | `Verknüpfung lösen` |
| Unlink success toast | `Verknüpfung gelöst.` |

---

## 3. Subject UI (SUBJECT-01..05)

### 3.1 Subjects Page — `/admin/subjects` (SUBJECT-01)

Page-level structure:

```
[PageShell Header: "Fächer"]
  ├── Header controls row   (§3.1.1)
  ├── Fach-Table / Cards    (§3.2)
  ├── <Separator my-8 />
  └── Stundentafel-Vorlagen Section   (§3.4)
```

#### 3.1.1 Header Controls Row

Identical pattern to §2.1.1: search input + optional category filter + primary CTA. For Subjects:
- Search input — `placeholder="Name oder Kürzel suchen"`, `w-64` desktop / `w-full` mobile.
- No status or Fach filter (N/A).
- CTA: `[+ Fach anlegen]` — opens Create-Dialog (§3.3).

#### 3.1.2 Empty State

No subjects yet: Phase 10 §3.1 pattern. Hero icon `BookOpen` (48px, muted) + heading `Noch keine Fächer angelegt` + body `Fächer sind die Basis für Stundentafeln und Zuordnungen. Legen Sie das erste Fach an.` + inline button `[Erstes Fach anlegen]` (center-aligned) that opens the same Create-Dialog.

Filtered empty: hero icon `SearchX` (48px) + heading `Keine Treffer` + body `Kein Fach entspricht der Suche.` + button `Filter zurücksetzen` (ghost).

### 3.2 Dense Fach-Table (desktop) / Mobile Cards (D-09)

Desktop `<table className="hidden md:table w-full">` inside a `<Card>`.

| Column | Width | Alignment | Content |
|--------|-------|-----------|---------|
| Farbe | `w-16` | center | `12px × 12px` color swatch (`rounded-sm`) with background = subject.color.bg; inline ARIA label `Farbe {hexValue}`. Native right of the swatch rendered inside the same cell: `text-xs font-mono text-muted-foreground` hex value (hidden `< lg`, visible `lg:` ≥ 1024px). |
| Name | `w-auto` | left | `text-sm font-medium` |
| Kürzel | `w-24` | left | colored pill (`rounded px-2 py-1 text-xs font-semibold`) using subject color pair (`bg` + `text`) |
| Schultyp | `w-40` | left | `text-sm text-muted-foreground` |
| Nutzung | `w-28` | right | `<button>` — `{count} Zuordnungen` as underlined inline link (`text-primary underline-offset-2 hover:underline`). Click opens the Affected-Entities-Dialog (§4.2 pre-emptive — non-deletion context). `tabular-nums`. |
| Aktion | `w-10` | center | Row-level `<DropdownMenu>` trigger: `MoreVertical`. |

Row click (anywhere except the Nutzung link and the Aktion dropdown) opens the Edit-Dialog (§3.3) — since there is no detail page. Cursor `cursor-pointer` on rows; hover `hover:bg-muted/50`.

Row actions in dropdown:
- `Bearbeiten` — opens Edit-Dialog.
- `Löschen` — opens Delete-Dialog (§4) — goes through Orphan-Guard.

#### 3.2.1 Mobile Cards (`< md`)

`<div className="md:hidden space-y-3">`, one `<Card>` per subject. Tap-area: whole card opens Edit-Dialog.

Per-card layout (`p-4 flex items-center gap-3`):
- Left: large color swatch `h-10 w-10 rounded-md` with subject.bg, no inner content.
- Main: Line 1 — name bold + kürzel pill inline after `gap-2`. Line 2 — `text-xs text-muted-foreground` → `{schultyp} · {count} Zuordnungen`.
- Trailing: `MoreVertical` icon-button (`h-11 w-11`) opening the same dropdown.

### 3.3 Subject Create + Edit Dialog (SUBJECT-02) — D-11 descoped, no color field

shadcn `<Dialog>`, `sm:max-w-md`.

> **Scope note (2026-04-22, post-research):** D-11 user-override "free hex picker" and D-A4 "Schultyp-Zuordnung multi-select" both rolled back after research surfaced schema gaps. `Subject` model has no `colorBg/colorText/colorIndex` column in v1.0 — and since the research-gate descope explicitly excludes schema changes, the Farbe field is **removed from Phase 11 scope entirely**. Subject colors remain auto-derived via `getSubjectColor(id)` hash-to-SUBJECT_PALETTE mapping (existing v1.0 behavior, unchanged). Admin-chosen color customization is deferred to a future phase (see §13 Deferred).

Title: `Fach anlegen` (create) / `Fach bearbeiten` (edit).

Body layout (`space-y-4`):

1. **Name** (required) — `Input type="text"`, `placeholder="Mathematik"`, `maxLength={64}`.
2. **Kürzel** (required, unique per school) — `Input type="text"`, `placeholder="M"`, `maxLength={8}`, uppercase auto-transform via RHF setValue on blur.

Footer buttons (`flex flex-col-reverse sm:flex-row sm:justify-end gap-2`):
- `[Abbrechen]` — ghost, default-focused.
- `[Fach anlegen]` / `[Speichern]` — primary, disabled until Zod-valid.

Information note inside dialog body (above footer): `<div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3">Die Farbe wird automatisch aus der Standard-Palette vergeben. Manuelle Farbauswahl folgt in einer späteren Phase.</div>`

#### 3.3.2 Copywriting

| Element | Copy |
|---------|------|
| Dialog title (create) | `Fach anlegen` |
| Dialog title (edit) | `Fach bearbeiten` |
| Name label | `Name *` |
| Name placeholder | `Mathematik` |
| Kürzel label | `Kürzel *` |
| Kürzel placeholder | `M` |
| Kürzel uniqueness error | `Dieses Kürzel ist bereits vergeben.` |
| Color info note | `Die Farbe wird automatisch aus der Standard-Palette vergeben. Manuelle Farbauswahl folgt in einer späteren Phase.` |
| Dialog cancel | `Abbrechen` |
| Dialog submit (create) | `Fach anlegen` |
| Dialog submit (edit) | `Speichern` |
| Success toast (create) | `Fach angelegt.` |
| Success toast (edit) | `Fach aktualisiert.` |

### 3.4 Stundentafel-Vorlagen Section (SUBJECT-03) — D-10

Separated from the Fach-Table by `<Separator className="my-8" />`.

Section header:
- `h2 text-lg font-semibold` — `Stundentafel-Vorlagen` (Phase 10 §2.2).
- Sub-line: `Offizielle Austrian-Stundentafeln pro Schultyp. Informativ — die Anwendung auf eine Klasse erfolgt in der Klassenverwaltung.` (`text-sm text-muted-foreground mt-1 mb-4`).

#### 3.4.1 Schultyp-Navigation

Desktop and mobile: shadcn `<Tabs>` with 1 trigger per Schultyp (reuses the §1.4 pattern). Per-Schultyp tab renders a read-only `<table>` (desktop) or a stacked card list (mobile `< md`).

Tab labels are the full German Schultyp names from `SCHOOL_TYPES_LABELS` in `@schoolflow/shared`. If > 4 tabs cause overflow, mobile uses the `<Select>` fallback (Phase 10 §1.5).

#### 3.4.2 Per-Schultyp Stundentafel Table

Columns:

| Column | Width | Alignment | Content |
|--------|-------|-----------|---------|
| Fach | `w-auto` | left | `text-sm` |
| Kürzel | `w-16` | center | `<span className="bg-muted rounded px-1.5 py-1 text-xs font-mono">{kuerzel}</span>` |
| Jg. 1 | `w-16` | center | Wochenstunden integer; `text-muted-foreground` when `=== 0`, else `text-foreground tabular-nums`. |
| Jg. 2 | `w-16` | center | ditto |
| Jg. 3 | `w-16` | center | ditto |
| Jg. 4 | `w-16` | center | ditto |

Rows read-only — no inputs, no actions. Rendered from `packages/shared/src/stundentafel/` static arrays.

Footer: compact summary row `text-xs text-muted-foreground border-t pt-2 mt-2` — `Wochenstunden gesamt pro Jahrgang: {sum1} · {sum2} · {sum3} · {sum4}`.

Mobile: stacked cards per Fach. Each card:
```
[Kürzel pill]  Mathematik
             Jg. 1–4: 4 · 4 · 3 · 3
```

#### 3.4.3 Copywriting

| Element | Copy |
|---------|------|
| Section title | `Stundentafel-Vorlagen` |
| Section subtitle | `Offizielle Austrian-Stundentafeln pro Schultyp. Informativ — die Anwendung auf eine Klasse erfolgt in der Klassenverwaltung.` |
| Deep-link hint | `Zur Klassenverwaltung →` (future Phase 12; in Phase 11 rendered as disabled link with tooltip `Verfügbar ab Phase 12` — acceptable placeholder per CONTEXT.md Integration Points; OR hidden if planner prefers not to render a dead link) |
| Table col headers | `Fach` / `Kürzel` / `Jg. 1` / `Jg. 2` / `Jg. 3` / `Jg. 4` |
| Footer summary | `Wochenstunden gesamt pro Jahrgang: {a} · {b} · {c} · {d}` |

Planner decision note: render a disabled "Zur Klassenverwaltung →" link (with tooltip) — consistent with Phase 10's pattern of leaving forward-pointers instead of hiding them. Keeps the Phase 11 UI self-describing about what comes next.

---

## 4. Orphan-Guard Delete Flow (D-12, D-14)

Applies to both Teacher and Subject DELETE. Same visual contract, same copy pattern.

### 4.1 Delete Confirmation Dialog — Happy Path (no references)

shadcn `<Dialog>`, `sm:max-w-md`. Title: `{entityLabel} löschen?`

Body (`space-y-2`):
- Paragraph: `"{entityName}" wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`
- Icon at top: `AlertTriangle` amber-600 (h-6 w-6) — Phase 10 §7 canonical.

Footer (`flex flex-col-reverse sm:flex-row sm:justify-end gap-2`):
- `[Abbrechen]` — outline, **default-focused**.
- `[Löschen]` — `variant="destructive"`.

On success: toast `{entityLabel} gelöscht.` + invalidate list query + for Teacher-Detail page, navigate back to `/admin/teachers`.

### 4.2 Orphan-Guard 409 Response — Blocked State

Triggered when DELETE returns `409 Conflict` with body (RFC 9457 + extension):
```json
{
  "type": "/errors/teacher-has-references",
  "title": "Teacher has references",
  "status": 409,
  "detail": "Cannot delete teacher with active assignments.",
  "extensions": {
    "affectedEntities": {
      "teacherSubjects":  [{ "id": "...", "label": "M, 7A" }, ...],
      "timetableLessons": [{ "id": "...", "label": "Mo 2. · 7A · M" }, ...],
      "substitutions":    [{ "id": "...", "label": "2026-03-15 · 5B · E" }, ...],
      "classbookEntries": [{ "id": "...", "label": "2026-03-15 · 7A" }, ...]
    }
  }
}
```

Same schema for Subject with:
- `teacherSubjects`
- `classSubjects` (per class assignments)
- `timetableLessons`
- `homeworkAssignments`
- `exams`

The client does NOT close the dialog on 409 — it transitions the SAME dialog into the blocked-state view without unmounting.

### 4.3 Blocked Dialog Content (409 received)

Title changes to: `{entityLabel} kann nicht gelöscht werden`. Icon stays `AlertTriangle` but switches tint to `text-destructive` (red).

Body (`space-y-3`):
1. Lead paragraph (`text-sm`): `"{entityName}" hat {totalCount} aktive Zuordnung{totalCount === 1 ? '' : 'en'}. Die Löschung ist nicht möglich, solange diese Zuordnungen bestehen.`
2. Grouped list inside `<ScrollArea className="max-h-64 border rounded-md p-3 bg-muted/30">`. Each group = one `affectedEntities` key with ≥ 1 item. Group header:
   ```
   <h4 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
     {groupLabel} ({count})
   </h4>
   ```
   Group labels:

   | Key | German label |
   |-----|--------------|
   | `teacherSubjects` | Fachzuordnungen |
   | `timetableLessons` | Stundenplan-Einträge |
   | `substitutions` | Vertretungen |
   | `classbookEntries` | Klassenbuch-Einträge |
   | `classSubjects` | Klassen-Fach-Zuordnungen |
   | `homeworkAssignments` | Hausübungen |
   | `exams` | Prüfungen |

3. Items below each group header: `<ul className="space-y-1">` with `<li className="text-sm flex items-center justify-between gap-2">`:
   - Left: item `label` (from backend, e.g. `Mo 2. · 7A · Mathematik`) — truncate with `truncate min-w-0`.
   - Right: "Öffnen" deep-link for entity types that have a detail route in Phase 11:
     - `teacherSubjects` → `/admin/teachers/{teacherId}` (Phase 11 functional).
     - All other types → disabled link with tooltip `Verfügbar ab Phase 12` (for class/classbook) or `Nicht verknüpfbar` (for internal IDs).
   - Deep-link visual: `text-primary text-xs underline-offset-2 hover:underline`, disabled variant `text-muted-foreground cursor-not-allowed no-underline`.

4. Resolution hint (`text-sm text-muted-foreground pt-2 border-t`): `Lösen Sie die oben aufgeführten Zuordnungen, bevor Sie die {entityLabelGenitive} löschen.` (Genitive: `Lehrperson` → `Lehrperson`, `Fach` → `Fach` — German grammar allows same form in this sentence).

Footer:
- `[Schließen]` — outline, full-width on mobile, right on desktop. Default-focused.
- `[Löschen]` button REMOVED (no re-attempt button — admin must fix referents first). This matches CONTEXT.md D-12: "Action: Löschen ist disabled bis alle Zuordnungen aufgelöst sind."

**Also-surfaced toast** (alongside the dialog transition): sonner error toast, 6s, title `{entityLabel} kann nicht gelöscht werden`, body `Es bestehen noch {totalCount} aktive Zuordnung{totalCount === 1 ? '' : 'en'}.`

### 4.4 Affected-Entities Pre-emptive Dialog (from Nutzung-Count click, §3.2)

Same list layout as §4.3, but:
- Title: `Zuordnungen zu "{entityName}"`.
- Icon: neutral `Info` (muted-foreground, NOT destructive).
- Lead paragraph: `"{entityName}" ist mit {totalCount} Einträgen verknüpft.`
- No destructive warning; no delete action. Just informational.
- Footer: single `[Schließen]` button (ghost).

### 4.5 Copywriting

| Element | Copy |
|---------|------|
| Delete dialog title (happy) | `Lehrperson löschen?` / `Fach löschen?` |
| Delete dialog body (happy) | `"{entityName}" wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.` |
| Delete confirm button | `Löschen` |
| Delete success toast | `Lehrperson gelöscht.` / `Fach gelöscht.` |
| Blocked dialog title | `Lehrperson kann nicht gelöscht werden` / `Fach kann nicht gelöscht werden` |
| Blocked lead (singular) | `"{entityName}" hat 1 aktive Zuordnung. Die Löschung ist nicht möglich, solange diese Zuordnung besteht.` |
| Blocked lead (plural) | `"{entityName}" hat {totalCount} aktive Zuordnungen. Die Löschung ist nicht möglich, solange diese Zuordnungen bestehen.` |
| Resolution hint (Teacher) | `Lösen Sie die oben aufgeführten Zuordnungen, bevor Sie die Lehrperson löschen.` |
| Resolution hint (Subject) | `Lösen Sie die oben aufgeführten Zuordnungen, bevor Sie das Fach löschen.` |
| Blocked close | `Schließen` |
| Blocked error toast title | `Lehrperson kann nicht gelöscht werden` / `Fach kann nicht gelöscht werden` |
| Blocked error toast body (singular) | `Es besteht noch 1 aktive Zuordnung.` |
| Blocked error toast body (plural) | `Es bestehen noch {totalCount} aktive Zuordnungen.` |
| Pre-emptive title | `Zuordnungen zu "{entityName}"` |
| Pre-emptive body | `"{entityName}" ist mit {totalCount} Einträgen verknüpft.` |
| Deep-link "Öffnen" | `Öffnen` |
| Deep-link disabled tooltip (Phase 12) | `Verfügbar ab Phase 12` |

---

## 5. Design Tokens

Inherits Phase 10 §10 entirely. This section ONLY documents Phase-11-specific additions, constrained to what is reasoned from D-06 and D-11.

### 5.1 Color — Additions

| Role | Token | Usage |
|------|-------|-------|
| Verfügbarkeits-Hatch overlay | `var(--color-muted-foreground)` @ 5px repeating 45deg lines against `bg-muted` | Grid "geblockt" cells (§2.4.1) |
| Subject swatch border | `border-2 border-border` + `ring-2 ring-ring ring-offset-2` when selected | Palette swatches (§3.3.1) |
| Contrast banner (pass) | `bg-green-50 border-green-200 text-green-900` | WCAG banner AA/AAA (§3.3.1) |
| Contrast banner (large-only) | `bg-amber-50 border-amber-200 text-amber-900` | WCAG banner 3–4.5 |
| Contrast banner (fail) | `bg-destructive/10 border-destructive/30 text-destructive` | WCAG banner < 3 |

Accent-usage budget unchanged from Phase 10 (primary CTAs, active badge, active tab, active toggle). Subject colors are NOT system-accents — they are content colors (same discipline as timetable cells: custom per-subject, not theme-derived).

**Accent reserved for (Phase 11 specific):** primary CTAs (`Lehrperson anlegen`, `Fach anlegen`, `Speichern`), Keycloak-linked state (`bg-primary/5 border-primary/20`), selected palette swatch ring. Green-tinted contrast success banners are NOT accent — they are status colors (same discipline as amber/red warn/destructive).

### 5.2 Typography — No additions

Phase 11 inherits Phase 10's full typography budget verbatim: 4 roles (Body 14, Label 14, Heading 18, Display 24→30) + 1 caption (12) + 2-weight budget (400/600) with a 500-weight Label exception. Total: 5 distinct numeric sizes (12/14/18/24/30) and 3 weights (400/500/600).

**No additional exceptions in Phase 11.** All `{kuerzel}` color-pills, Keycloak-ID badges, table-header uppercase captions, and Timetable-Cell preview captions use `text-xs` (12px) — the existing caption role. Any proposal to introduce a new size must first extend Phase 10 canonical and be re-checked against Dimension 4 budget.

### 5.3 Spacing — No new tokens, one scope extension

Phase 10's exceptions (6px `*-1.5` for form-field label/input gap + breadcrumb chevron gap, 44px `h-11` for mobile touch) carry forward. No new numeric tokens introduced.

**Scope extension (documented):** The 6px `gap-1.5` exception inventory is extended by one context — **palette swatch grid gap** in the Subject color picker (§3.3.1). Rationale: 15 compact 32×32 swatches in a `flex flex-wrap` grid need a tight visual gap to read as a single palette cluster; `gap-2` (8px) produces excessive whitespace that fragments the palette into disconnected swatches. The 6px value itself is unchanged — this is a scope note, not a new token.

Full 6px scoped-use list (Phase 10 + Phase 11): (1) form-field label-to-input gap, (2) form-field input-to-help/error gap, (3) breadcrumb chevron gap, (4) Subject palette swatch grid gap.

### 5.4 Touch Targets (inherits Phase 10 §10.5)

New enforcements specific to Phase 11:
- Verfügbarkeits-Grid cells desktop ≥ 44×44 (set to `h-12` = 48px for comfortable clicking, §2.4.1). Mobile day-picker list rows `h-11` = 44px (§2.4.2).
- Palette swatches `h-8 w-8` = 32px on desktop (inherits Phase 10 "desktop icon-button" floor 32×32). On mobile, swatches occupy a separate fit-row; they still render at 32×32 but are the only interactive in a zero-conflict context, which meets Apple's 44-or-adjacent-separated rule. If executor prefers strict 44×44 on mobile, rationale to grow to `h-11 w-11` is acceptable but not required.
- Row-action dropdown trigger `h-11 w-11` on mobile / `h-8 w-8` on desktop (Phase 10 §10.5).

### 5.5 Icons (additions to Phase 10 §15)

| Icon | Usage |
|------|-------|
| `GraduationCap` | Sidebar Lehrer entry; empty-state hero |
| `BookOpen` | Sidebar Fächer entry; empty-state hero; Stundentafel-Vorlagen section icon (optional) |
| `Link2` | Keycloak linked state (primary) |
| `Link2Off` | Keycloak unlinked state (muted) |
| `Unlink2` | Keycloak unlink CTA |
| `Palette` | (optional, not used in canonical — reserved if a palette-popover gets added later) |
| `Lock` | Verfügbarkeits-Grid "geblockt" cell |
| `Search` | Leading icon inside search inputs |
| `SearchX` | Filtered-empty hero |
| `MoreVertical` | Row-level dropdown trigger |
| `UserPlus` | (optional alternative to `Plus` for "Lehrperson anlegen" — Phase 10 canonical uses plain `Plus`, keep consistency) |
| `Users` | (reserved for future bulk-actions, not used in Phase 11) |

Sizing convention unchanged from Phase 10 §15.

---

## 6. State Machines & Query Keys

Inherits Phase 10 §14 tab-state-machine verbatim for each detail tab.

### 6.1 Phase-11-specific Query Keys

Narrow scoping (same discipline as Phase 10 §14.2):

| Concern | Query Key |
|---------|-----------|
| Teacher list | `['teachers', schoolId, { search, fachId, status }]` |
| Teacher detail | `['teacher', teacherId]` |
| Teacher availability rules | `['availability-rules', teacherId]` |
| Teacher teaching-reductions | `['teaching-reductions', teacherId]` |
| Keycloak user search | `['keycloak-users', { email }]` — `enabled: email.length >= 3`, `staleTime: 30_000` |
| Subject list | `['subjects', schoolId, { search }]` |
| Subject detail (for Edit dialog) | `['subject', subjectId]` |
| Stundentafel templates (static) | `['stundentafel', schoolType]` — `staleTime: Infinity` (data comes from packages/shared) |
| Affected-entities (delete pre-flight) | `['affected-entities', entityType, entityId]` — re-query on dialog open |

Mutation invalidation:
- Teacher create/update/delete → invalidates `['teachers', ...]` list + `['teacher', id]`.
- Teacher availability save → invalidates `['availability-rules', id]` + `['teacher', id]` (computed WE may shift).
- Teacher reductions save → invalidates `['teaching-reductions', id]` + `['teacher', id]`.
- Keycloak link/unlink → invalidates `['teacher', id]`.
- Subject create/update/delete → invalidates `['subjects', ...]` + `['subject', id]` + ALL `['teacher', *]` (broad — subject colors affect teacher cards) — ACCEPTABLE because teacher-list queries refetch via stale-while-revalidate; or use targeted `queryClient.setQueriesData` on specific keys if the executor prefers.

### 6.2 Dirty-Reset Discipline

Identical to Phase 10 §14.1 — `form.reset(serverResponse)` after each successful save. Called out in every Plan 11-01 task list.

### 6.3 Silent-4xx Invariant (Phase 10.1-01 locked rule)

Every new `useMutation` hook introduced in Phase 11 MUST:
- Wire an explicit `onError` handler.
- NEVER treat a 4xx HTTP response as success (the `onSuccess` callback only fires for 2xx).
- Surface error toast via sonner with the German problem message.

E2E coverage in Plan 11-03 includes the SILENT-4XX pattern (same shape as Phase 10.2-04 sweep) for every Phase 11 mutation.

---

## 7. Reused Phase 10 Shared Components

Phase 11 reuses the following without copying:

| Component | Source | Phase 11 Usage |
|-----------|--------|----------------|
| `PageShell` | `apps/web/src/components/admin/shared/PageShell.tsx` | Teachers list, Teacher-detail, Subjects page |
| `UnsavedChangesDialog` | `apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx` | Teacher-detail per-tab dirty-navigation |
| `StickyMobileSaveBar` | `apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx` | Teacher-detail all 4 tabs |
| `InfoBanner` | `apps/web/src/components/admin/shared/InfoBanner.tsx` | Solver-re-run hint on Lehrverpflichtung + Verfügbarkeit; empty-TimeGrid hint on Verfügbarkeit |
| `WarnDialog` | `apps/web/src/components/admin/shared/WarnDialog.tsx` | Keycloak unlink confirmation (§2.6.3); Teacher archive confirmation (§2.1.2, §7.2) |

Phase 10 `preset reconciliation` note remains valid: `components.json` style is `default`, UI-SPEC `preset` frontmatter mirrors that. No preset change needed.

### 7.1 Reactivate — No Dialog

`Reaktivieren` is a direct mutation with toast feedback. Rationale: reactivation is fully recoverable (the admin can archive again with one click) and carries no data-integrity risk, so a confirmation dialog would only add friction. If a future phase introduces non-recoverable side-effects on reactivation (e.g. re-enabling Keycloak login with notification), reassess.

### 7.2 Canonical WarnDialog Copy — Teacher Archive

Invoked from §2.1.2 row-action `Archivieren` on `status === ACTIVE` teachers.

| Element | Copy |
|---------|------|
| Title | `Lehrperson archivieren?` |
| Icon | `AlertTriangle` amber-600 (non-destructive variant) |
| Body | `Archivierte Lehrpersonen verschwinden aus aktiven Listen, bleiben aber für Reporting und Referenzen aus vergangenen Schuljahren erhalten. Die Verknüpfung zum Keycloak-Account bleibt bestehen.` |
| Cancel button | `Abbrechen` (ghost, autoFocus) |
| Confirm button | `Archivieren` (default variant — NOT destructive; archivation is recoverable) |
| Success toast | `Lehrperson archiviert.` |
| Reactivate success toast (no dialog) | `Lehrperson reaktiviert.` |

No separate dialog for `Reaktivieren` — see §7.1.

---

## 8. Accessibility Contract

Inherits Phase 10 §12 entirely. Phase-11-specific additions:

| Control | ARIA / Accessibility Treatment |
|---------|------------------------------|
| Verfügbarkeits-Grid (§2.4.1) | `role="grid"` on the `<table>`; `role="gridcell"` on each toggle cell; `aria-rowcount` / `aria-colcount` set; each cell `aria-pressed={isBlocked}` (toggle semantic); each cell `aria-label="{Dayname}, {Period label}, {verfügbar | geblockt}"`; `<caption className="sr-only">` describes grid purpose |
| Grid column/row headers | Clickable day/period headers expose `<button aria-label="Gesamten {Montag | 2. Stunde} umschalten">` with same `aria-pressed` semantics; confirm-dialog ensures accidental click tolerance |
| Grid keyboard nav | Tab enters at first cell; Arrow keys move focus between cells (home/end for row start/end); Space/Enter toggles `isBlocked`. dnd-kit-style sr-only instructions rendered: `screenReaderInstructions="Pfeiltasten zum Navigieren. Leertaste zum Umschalten."` |
| Mobile day-picker (§2.4.2) | Standard shadcn `<Select>` a11y (combobox pattern). Toggles in the list each have `role="switch" aria-checked={isBlocked}` with labels. |
| Contrast picker (§3.3.1) | Live contrast ratio announced via `aria-live="polite"` region below the hex inputs: `<div aria-live="polite" className="sr-only">{contrastAnnouncement}</div>`. Copy: `Kontrastverhältnis {ratio}:1. {WCAG-status-Kurz}.` |
| Color palette swatches (§3.3.1) | `<button aria-label="Farbvorgabe {i+1}: Hintergrund {bgHex}, Text {textHex}">`; selected state on one swatch sets `aria-pressed="true"` |
| Affected-entities list (§4.3) | Rendered as semantic grouped lists (`<h4>` + `<ul>`); `<ScrollArea>` exposes scrollable region; deep-links are `<Link>` (TanStack) with descriptive inline text |
| Hex input group (§3.3.1) | Each `<input>` has its own `<label>` (visually hidden OK for the three chained inputs, but use `<fieldset>` + `<legend>` if executor wants to group). Recommended: fieldset with legend `Farbe` wrapping all three inputs for stronger grouping semantic. |
| Keycloak link dialog search (§2.6.2) | `aria-live="polite"` region holds the state machine text (Idle / Searching / No match / Match). Result user-card has `role="region" aria-label="Gefundener Account: {email}"`. |

### 8.1 Language
- `<html lang="de">` already set globally (Phase 10 §12.3). All user-facing text German; `aria-label`s in German. No new i18n infrastructure in Phase 11.
- API response messages remain English (Phase 1 D-15). UI maps to German per §4.5.

---

## 9. E2E + Planning (D-13, D-16)

### 9.1 Plan Breakdown — USER-OVERRIDE (D-16: 3 plans)

| Plan | Scope |
|------|-------|
| **11-01** | Shared foundation + Teacher CRUD + Orphan-Guard gap-fix. Zod schemas in `packages/shared` (teacher + availability-rule + teaching-reduction), werteinheiten.util re-export, WCAG util, `/admin/teachers` routes shell, sidebar "Personal & Fächer" group refactor, all Teacher TanStack-Query hooks, Teacher-List-Page, Teacher-Detail-Page with all 4 tabs, Keycloak-Link UI. Backend: `TeacherService.remove` Orphan-Guard + unit tests. |
| **11-02** | Fächer CRUD + Stundentafel-Vorlagen + Orphan-Guard gap-fix. `/admin/subjects` route, hooks, Fach-Table, Edit/Create-Dialog (Name + Kürzel only — no Farbe field per post-research descope, colors auto-derived via `getSubjectColor(id)`), Affected-Entities pre-emptive dialog, Orphan-Guard Delete-Dialog. Backend: `SubjectService.remove` Orphan-Guard + unit tests. No schema migration. |
| **11-03** | E2E Sweep — 8 Playwright spec files (Lehrer-CRUD × {happy, error} × {desktop, mobile-375} + Fächer-CRUD × {happy, error} × {desktop, mobile-375}). Reuses Phase 10.2 SILENT-4XX pattern, Phase 10.5-02 mobile-prefix-isolation (E2E-TEA-* desktop, E2E-TEA-MOBILE-* mobile for teachers; E2E-SUB-* / E2E-SUB-MOBILE-* for subjects). |

### 9.2 E2E Coverage (D-13) — 8 Spec Files

| # | Spec file | Project | Role | Coverage |
|---|-----------|---------|------|----------|
| 1 | `apps/web/e2e/admin-teachers-crud.spec.ts` | desktop | admin | TEACHER-CRUD-01 happy (create), -02 happy (edit Stammdaten), -03 happy (delete) |
| 2 | `apps/web/e2e/admin-teachers-crud.error.spec.ts` | desktop | admin | TEACHER-CRUD-04 error (Orphan-Guard 409 Löschen blockiert), -05 error (Email dupe validation) |
| 3 | `apps/web/e2e/admin-teachers-crud.mobile.spec.ts` | mobile-375 | admin | TEACHER-CRUD-01.m happy (create via Dialog at 375px), -02.m happy (Stammdaten edit with sticky-save) |
| 4 | `apps/web/e2e/admin-teachers-werteinheiten.spec.ts` | desktop | admin | TEACHER-CRUD-06 Werteinheiten-Edit (live-computed total), Verfügbarkeits-Grid toggle persistence, Ermäßigungen row-add, Keycloak search-by-email happy |
| 5 | `apps/web/e2e/admin-subjects-crud.spec.ts` | desktop | admin | SUBJECT-CRUD-01 happy (create Name + Kürzel), -02 happy (edit Name + Kürzel), -03 happy (delete) |
| 6 | `apps/web/e2e/admin-subjects-crud.error.spec.ts` | desktop | admin | SUBJECT-CRUD-04 error (Orphan-Guard 409 Löschen blockiert — with seeded ClassSubject), -05 error (Kürzel-Uniqueness dupe) |
| 7 | `apps/web/e2e/admin-subjects-crud.mobile.spec.ts` | mobile-375 | admin | SUBJECT-CRUD-01.m happy (create via Dialog), -02.m happy (edit via Dialog) |
| 8 | `apps/web/e2e/admin-subjects-stundentafel.spec.ts` | desktop | admin | STUNDENTAFEL-01 section renders all 7 Schultyp tabs with static data (read-only view); Stundentafel-Vorlagen displayed per Schultyp |

All specs reuse the Phase 10.3 Playwright harness (`loginAsRole`, `getRoleToken`, `globalSetup`, `getByCardTitle` helper).

### 9.3 Prefix-Isolation Pattern (Phase 10.5-02 carry-forward)

| Prefix | Scope |
|--------|-------|
| `E2E-TEA-` | Desktop teacher test data |
| `E2E-TEA-MOBILE-` | Mobile-375 teacher test data |
| `E2E-SUB-` | Desktop subject test data |
| `E2E-SUB-MOBILE-` | Mobile-375 subject test data |

Cleanup in `afterEach`: API-level DELETE of test-prefix rows (bypasses Orphan-Guard via bulk-truncate admin endpoint or by pre-deleting assignments first).

### 9.4 Accepted Deferrals (Phase 10 precedent)

- Mobile WebKit Bus-Error-10 on macOS 14.3 remains acceptable per STATE.md Phase 10.4-03 pattern — Chromium-375 emulation (Pixel 5 profile) verifies spec logic is correct.
- Visual regression / screenshot diff for Verfügbarkeits-Grid and contrast banner is NOT in Phase 11 scope — DOM-locator assertions only. (May be added in a future visual-regression tranche.)

---

## 10. Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `tabs`, `dialog`, `input`, `select`, `button`, `card`, `label`, `popover`, `dropdown-menu`, `textarea`, `switch`, `toggle`, `badge`, `separator`, `tooltip`, `collapsible`, `sheet`, `scroll-area`, `command`, `sonner` | not required |
| third-party | none | not applicable |

No third-party registries declared. Registry vetting gate not required.

**Install status — action required by the planner:** Phase 10 already installed most primitives. Phase 11 additions:

- `command` — Keycloak search combobox (§2.6.2) only. CONFIRM existence via `ls apps/web/src/components/ui/` before adding to Wave 0 tasks.
- `scroll-area` — Affected-entities list inside delete dialog (§4.3). Already installed (visible in `apps/web/src/components/ui/scroll-area.tsx`).
- All others already installed in Phase 10 (see `apps/web/src/components/ui/` listing).

Install command (only if `command` not present):
```
pnpm --filter @schoolflow/web exec npx shadcn@latest add command
```

No free-hex color picker library is added; native `<input type="color">` + text-hex input + in-house WCAG util cover the entire D-11 requirement without new dependencies.

---

## 11. Copywriting Contract — Quick-Reference

Canonical single-table for gsd-ui-checker Dimension 1 PASS.

| Element | Copy |
|---------|------|
| Primary CTA (Teacher create) | `Lehrperson anlegen` |
| Primary CTA (Subject create) | `Fach anlegen` |
| Primary CTA (Save) | `Speichern` |
| Secondary CTA (Edit row) | `Bearbeiten` |
| Secondary CTA (Add row) | `Ermäßigung hinzufügen` / `Fach zuordnen` |
| Empty state heading (no teachers) | `Noch keine Lehrerinnen und Lehrer` |
| Empty state body (no teachers) | `Legen Sie die erste Lehrperson an, um Fächer zuordnen und Stundenpläne erzeugen zu können.` |
| Empty state heading (no subjects) | `Noch keine Fächer angelegt` |
| Empty state body (no subjects) | `Fächer sind die Basis für Stundentafeln und Zuordnungen. Legen Sie das erste Fach an.` |
| Empty state heading (filter empty) | `Keine Treffer` |
| Error state (generic save) | `Speichern fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.` |
| Error state (network) | `Netzwerkfehler – bitte erneut versuchen.` |
| Error state (Kürzel unique) | `Dieses Kürzel ist bereits vergeben.` |
| Error state (WCAG fail) | `Kontrastverhältnis {ratio}:1 — Unzureichend für Timetable-Zellen. Speichern ist trotzdem möglich, wir empfehlen aber eine Anpassung.` |
| Destructive confirmation (Teacher delete) | `Lehrperson löschen?` → confirm button `Löschen` |
| Destructive confirmation (Subject delete) | `Fach löschen?` → confirm button `Löschen` |
| Destructive confirmation (Keycloak unlink) | `Verknüpfung lösen?` → confirm button `Verknüpfung lösen` |
| Recoverable confirmation (Teacher archive) | `Lehrperson archivieren?` → confirm button `Archivieren` (see §7.2 for body) |
| Orphan-guard blocked title | `{Lehrperson | Fach} kann nicht gelöscht werden` |

Tone is Phase 10 §13.1 (Sie-Form, no tech jargon, concrete verbs). Button-label canon from Phase 10 §13.2 is reused verbatim.

---

## 12. Open Planner Notes (not blockers)

1. **`AppSidebar.tsx` grouping refactor** — currently a flat `navItems` array. Plan 11-01 Wave 0 needs a small refactor to support grouped entries (group label + children). Keep grouping backwards-compatible: existing items without a group render ungrouped at the top; items tagged with `group: 'personalAndFaecher'` render under the "Personal & Fächer" separator row. Same refactor benefits Phase 12, 13, 14, 15 for future groups. ~25 LoC change. No new component.
2. **`werteinheiten.util.ts` → shared** — move to `packages/shared/src/werteinheiten/index.ts` OR re-export from existing `apps/api` location. Preferred: move, so client imports directly from `@schoolflow/shared`. Phase 11 Plan 11-01 Wave 0 task.
3. **Keycloak search endpoint** — `GET /api/v1/admin/keycloak/users?email=` may not exist in v1.0 backend. Plan 11-01 must verify and, if absent, include a Gap-Fix task (thin Keycloak Admin API proxy endpoint with admin-only CheckPermissions). CONTEXT.md Integration Points flags this as "wahrscheinlich bereits durch UserModule in Phase 13 vorgesehen; Phase 11 darf vorziehen oder lokalen Workaround nutzen — zu klären im Plan".
4. **Stundentafel templates static source** — confirm that `packages/shared/src/stundentafel/` is the single-source and that `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` is the mirror. The UI in §3.4 reads from the shared package. If the shared package still imports from the api package, the planner must consolidate.
5. **Phase 12 deep-link placeholders** — the Stundentafel-Vorlagen "Zur Klassenverwaltung →" link and the Affected-Entities deep-links for `classSubjects` / `classbookEntries` / `timetableLessons` land on non-existent routes in Phase 11. Render them as disabled with tooltip `Verfügbar ab Phase 12`. Do NOT fake the routes.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PENDING
- [ ] Dimension 2 Visuals: PENDING
- [ ] Dimension 3 Color: PENDING
- [ ] Dimension 4 Typography: PENDING
- [ ] Dimension 5 Spacing: PENDING
- [ ] Dimension 6 Registry Safety: PENDING

**Approval:** pending (awaiting gsd-ui-checker)

---

*Phase 11 UI-SPEC authored 2026-04-22. **Revision 1 applied 2026-04-22** — Typography budget reconciled (removed 11px exception, all captions on `text-xs` 12px), Subject Create dialog submit relabelled `Fach anlegen`, Teacher archive `WarnDialog` copy declared (§7.2, recoverable variant; Reaktivieren is direct-mutation per §7.1), group-header margin normalized to `mb-2`. Inherits Phase 10 canonical contract. Locks three user-override decisions (D-06 visual week-grid, D-11 free hex picker with WCAG live warning, D-16 3-plan breakdown) per 11-CONTEXT.md.*
