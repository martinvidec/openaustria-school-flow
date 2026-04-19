---
phase: 10
slug: schulstammdaten-zeitraster
status: draft
shadcn_initialized: true
preset: shadcn default (new-york / Tailwind 4 tokens, pre-existing install)
ui_language: de
api_language: en
created: 2026-04-18
canonical_for:
  - Phase 11 (Faecher & Stundentafeln)
  - Phase 12 (Klassen & Klassen-Fach-Zuweisungen)
  - Phase 13 (Lehrer & Personen-Verwaltung)
  - Phase 14 (Solver-Tuning)
  - Phase 15 (Audit-Log-Viewer)
  - Phase 16 (Admin-Dashboard)
---

# Phase 10 — UI Design Contract: Schulstammdaten & Zeitraster

> Pattern-setter for all v1.1 Admin-Detail-Screens. Locked by CONTEXT.md D-01..D-15 and RESEARCH.md §2-8. Reused by Phases 11–16.
>
> Consumed by `gsd-planner`, `gsd-executor`, `gsd-ui-checker`, `gsd-ui-auditor`.

---

## 0. Source-of-Truth Map

| Decision / Requirement | Where It Was Locked | UI Section |
|-------------------------|--------------------|------------|
| D-01 Tab shell, `/admin/school/settings` | CONTEXT.md | §1 Page Shell |
| D-02 Pro-Tab Save + Unsaved-Changes | CONTEXT.md | §2, §8 |
| D-03 Empty-flow inline-create | CONTEXT.md | §3 |
| D-04..D-06 A/B-Wochen toggle + banner | CONTEXT.md | §6 |
| D-07..D-10 Schuljahre multi-active + orphan-delete | CONTEXT.md | §5, §9 |
| D-11 Dense editable period table | CONTEXT.md | §4 |
| D-12 Mobile card-stack + 44px | CONTEXT.md + MOBILE-ADM-02 | §4, §10, §11 |
| D-13 Destructive-edit warn-dialog | CONTEXT.md | §7 |
| D-14 SchoolDay Mo-Sa in Zeitraster | CONTEXT.md | §4 |
| D-15 Zod shared + class-validator | CONTEXT.md | §12, §14 |
| SCHOOL-01..05 | REQUIREMENTS.md | §3, §4, §5, §9 |

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn (already initialized in repo) |
| Preset | shadcn default tokens (new-york style, neutral base, Tailwind 4) |
| Component library | Radix UI primitives via shadcn wrappers (`components/ui/*`) |
| Icon library | lucide-react (already installed) |
| Date utilities | date-fns (already installed) |
| Drag library | @dnd-kit/core + @dnd-kit/sortable (already installed) |
| Toasts | sonner (already installed) |
| Font | Tailwind 4 default stack (system-ui, -apple-system, Segoe UI) — no custom font |

Registry additions: none. No third-party shadcn registries used — registry safety gate not required.

---

## 1. Page Shell Pattern (reusable for Phases 11–16)

### 1.1 Route + Header
- Route file: `apps/web/src/routes/_authenticated/admin/school.settings.tsx` → URL `/admin/school/settings`
- Active tab persisted via Zod-validated search param `?tab=details|timegrid|years|options`
- Default `tab=details`

### 1.2 Breadcrumbs
Pattern (desktop + mobile, lives above H1):
```
Admin  ›  Schulverwaltung
```
- Component: inline `<nav aria-label="Breadcrumb">` rendering a `<ol>` of `<a>` links separated by a `ChevronRight` icon (`lucide-react`, `h-4 w-4 text-muted-foreground`).
- Last crumb is the current page — rendered as `<span>` with `text-foreground`, not a link.
- Desktop: visible. Mobile (< md): show only the last crumb + a back-arrow button returning to the sidebar parent.
- Spacing: `text-sm` (14px), `gap-1.5` (6px) between crumb + separator. Padding-bottom `mb-2` (8px).
- Colors: `text-muted-foreground` for link crumbs, `text-foreground` for current, `hover:text-foreground` on links.

### 1.3 Page Header (H1 + Sub-line)
```
Schulverwaltung
Stammdaten, Zeitraster, Schuljahre und Optionen dieser Schule pflegen.
```
- H1: `text-2xl font-semibold tracking-tight` (24px / 600) → desktop `md:text-3xl` (30px). Line-height `leading-tight` (1.2).
- Sub-line: `text-sm text-muted-foreground mt-1` (14px / 400, line-height 1.5).
- Spacing below header: `mb-6` (24px) before the tab bar.
- No avatar, no status-badge on this page header. (Those live on future entity-detail pages, e.g. Lehrer-Detail in Phase 13 — document there.)

### 1.4 Tab Bar (desktop)
- Component: shadcn `<Tabs value onValueChange={guardedTabChange}>` + `<TabsList>` + 4 `<TabsTrigger>`.
- Horizontal, left-aligned, `gap-1`. Radix default focus ring (2px `ring-ring` + 2px offset).
- Disabled state for Tabs 2–4 when `schoolId` is missing (empty-flow, see §3).
- Disabled visual: `opacity-50 cursor-not-allowed` + `aria-disabled="true"`. No tooltip on disabled (keep it simple — the context is obvious).

Tab labels (German, canonical — Phases 11–16 reuse the same 2-word rule):
| Value | Label |
|-------|-------|
| `details` | Stammdaten |
| `timegrid` | Zeitraster |
| `years` | Schuljahre |
| `options` | Optionen |

### 1.5 Tab Bar (mobile, < md / < 768px)
- Swap `<TabsList>` for a shadcn `<Select>` dropdown.
- Full-width (`w-full`), 44px min-height (`h-11`).
- Trigger shows current tab label + `ChevronDown` icon.
- Rendering rule: two sibling nodes, one with `hidden md:flex` (TabsList), one with `md:hidden` (Select). Both drive the same `tab` state.
- Disabled tabs appear in the Select as grayed-out options (`<SelectItem disabled>`).

### 1.6 Sticky Save Bar (mobile only)
- Desktop: Save button lives at the bottom-right of the tab content panel (`flex justify-end mt-6`). No sticky behavior needed.
- Mobile (< md): per-tab Save button becomes a sticky footer bar:
  ```
  fixed bottom-0 left-0 right-0 border-t bg-background px-4 py-3 z-40
  ```
  - Button inside: `w-full h-11` (44px). Primary variant.
  - Only visible when `isDirty === true` (slide-up with `transition-transform`).
  - Respects safe-area insets: `pb-[max(0.75rem,env(safe-area-inset-bottom))]`.

---

## 2. Tab Content Pattern (reusable)

### 2.1 Tab Panel Frame
- Each `<TabsContent>` wraps content in a `<Card>` (shadcn) on desktop: `p-6 md:p-8`.
- Mobile: no card chrome (borders invisible at 375px — use `border-none shadow-none md:border md:shadow-sm`).

### 2.2 Section Titles (within a tab)
- `h2`: `text-lg font-semibold` (18px / 600), line-height `leading-tight` (1.2).
- Optional sub-line: `text-sm text-muted-foreground mt-1`.
- Spacing below section title: `mb-4` (16px).
- Multiple sections in a tab: separate with `<Separator className="my-6" />` (24px above and below).

### 2.3 Form Field Layout
- **Canonical stack (both desktop and 375px):** label above input, vertically stacked. Never inline label/input at mobile.
- Spacing:
  - Label → input: `space-y-1.5` (6px)
  - Field group → field group: `space-y-4` (16px)
- Label: shadcn `<Label>` — `text-sm font-medium` (14px / 500).
- Input: shadcn `<Input>` — `h-11` on mobile (44px touch), `md:h-10` on desktop (40px).
- Required fields: asterisk `*` in label text, NOT as a separate span. Pattern: `Schulname *`.
- Optional-field indicator: none (default is required-visible; optionality is implicit unless labeled "(optional)").

### 2.4 Help Text + Error Text
- Help text: `text-xs text-muted-foreground mt-1.5` (12px / 400, line-height 1.5). Rendered below input.
- Error text: `text-xs text-destructive mt-1.5`.
  - Icon prefix: `AlertCircle` (lucide-react), `h-3.5 w-3.5 inline mr-1`.
- Both wired via `aria-describedby` on the input pointing to the element's ID. `aria-invalid="true"` when error.
- Error text preempts help text (don't render both). On field-valid-and-dirty transition, help text is OK.

### 2.5 Save Button Placement
- Desktop: right-aligned at the bottom of the tab content, `flex justify-end mt-6`.
- Desktop button: shadcn `<Button>` primary, `min-w-[8rem]` (128px, keeps "Speichern" from being tiny).
- Mobile: sticky footer bar (see §1.6).
- While `isSubmitting`: button shows left-side `Loader2` spinner (lucide-react, `h-4 w-4 mr-2 animate-spin`) and disabled. Text stays "Speichern" — do not swap to "Speichert…".
- On success: toast via `sonner` with message `"Änderungen gespeichert."`, then RHF `reset(serverResponse)` so `isDirty → false`.

### 2.6 Cancel / Discard
- No separate "Abbrechen"-Button on the tab panel (Pro-Tab-Save scope is the tab; navigation-away triggers Unsaved-Changes-Dialog).
- EXCEPT within nested Dialogs (Unsaved-Changes, Destructive-Edit-Warn, Confirm-Delete) — those DO have Abbrechen.

### 2.7 Disabled-Tab Visual (empty-flow)
- When `schoolId === undefined`, Tabs 2–4 are `disabled`.
- Visual: 50% opacity, cursor not-allowed, aria-disabled.
- The Stammdaten Tab is always enabled.

---

## 3. Stammdaten-Tab (SCHOOL-01)

### 3.1 Empty State (no school exists)
- Hero area inside the Card:
  - Icon: `Building2` (lucide-react), `h-12 w-12 text-muted-foreground`
  - H2: `Noch keine Schule angelegt`
  - Sub-line: `Legen Sie zuerst die Stammdaten Ihrer Schule an. Anschließend können Sie Zeitraster, Schuljahre und Optionen konfigurieren.`
  - Spacing: `text-center py-8`; icon `mx-auto mb-4`; h2 `mb-2`.
- CTA: the empty state is NOT a separate button — it is a directly-rendered inline-create form below the hero text. No separate "Neue Schule anlegen"-click step.
- Form uses the same layout as Edit mode (§3.2). Submit button label: `Schule anlegen` (not "Speichern") — distinguishes create from update.
- After successful POST: toast `"Schule angelegt. Sie können jetzt Zeitraster und Schuljahr pflegen."`, store `schoolId` in `useSchoolContext`, tabs 2–4 enable.

### 3.2 Edit Mode (school exists)
Field order (top to bottom):
1. **Schulname** (required) — `Input type="text"`, `placeholder="z. B. BG/BRG Wien Gymnasium Rahlgasse"`.
2. **Schultyp** (required) — `Select` with 7 options:
   | Value | Label |
   |-------|-------|
   | `VS` | Volksschule |
   | `NMS` | Neue Mittelschule |
   | `AHS` | Allgemeinbildende höhere Schule |
   | `BHS` | Berufsbildende höhere Schule |
   | `BMS` | Berufsbildende mittlere Schule |
   | `PTS` | Polytechnische Schule |
   | `ASO` | Allgemeine Sonderschule |
3. **Adresse** — group with a subtle section label ("Adresse", `text-sm font-medium mb-2 text-muted-foreground`):
   - **Straße + Hausnummer** (required) — full-width.
   - **PLZ** (required) — 1/3 width on desktop (`md:col-span-1` within a `md:grid-cols-3`), full-width on mobile. Zod regex `/^\d{4,5}$/` (AT 4, DE 5).
   - **Ort** (required) — 2/3 width on desktop (`md:col-span-2`), full-width on mobile.
   - Use CSS grid: `grid grid-cols-1 md:grid-cols-3 gap-4`.

### 3.3 Copywriting (German)
| Element | Copy |
|---------|------|
| Section title | `Stammdaten` |
| Section subtitle | `Name, Schultyp und Adresse der Schule.` |
| Name label | `Schulname *` |
| Name placeholder | `z. B. BG/BRG Wien Gymnasium Rahlgasse` |
| Schultyp label | `Schultyp *` |
| Schultyp placeholder | `Schultyp auswählen` |
| Straße label | `Straße *` |
| PLZ label | `PLZ *` |
| PLZ placeholder | `1010` |
| Ort label | `Ort *` |
| Save button (edit) | `Speichern` |
| Save button (create, empty-flow) | `Schule anlegen` |
| Success toast (update) | `Änderungen gespeichert.` |
| Success toast (create) | `Schule angelegt. Sie können jetzt Zeitraster und Schuljahr pflegen.` |
| Required-field error | `Pflichtfeld` |
| PLZ format error | `PLZ muss 4 oder 5 Ziffern haben` |

---

## 4. Zeitraster-Tab (SCHOOL-02, D-11, D-12, D-14)

### 4.1 Section Structure (top to bottom)
1. **Section header** "Zeitraster" + sub-line "Unterrichtstage, Perioden und Pausen dieser Schule."
2. **SchoolDay-Toggles** (Mo–Sa) — wochentage row (D-14).
3. **Perioden-Tabelle** (desktop) / **Perioden-Cards** (mobile).
4. **Aktions-Leiste** — [+ Periode hinzufügen] [Aus Template neu laden].
5. **Save button** (desktop right-aligned; mobile sticky).

### 4.2 SchoolDay-Toggles (D-14)
- Row of 6 toggles labeled `Mo Di Mi Do Fr Sa` (no Sunday by default).
- Visual: shadcn `<Toggle>` pill (`variant="outline"`), or a row of small `<Checkbox>` + `<Label>` pairs. **Choose Toggle** (cleaner for binary on/off, matches Untis-like feel).
- Layout: `flex flex-wrap gap-2 mb-6`.
- Size: `h-10 w-12` desktop (32px target OK), `h-11 w-12` mobile (44px target — MOBILE-ADM-02).
- Active visual: `bg-primary text-primary-foreground`; inactive: `bg-background text-foreground border`.
- Label above the row: `text-sm font-medium text-muted-foreground mb-2` — copy: `Unterrichtstage`.
- Help text below the row: `text-xs text-muted-foreground mt-2` — copy: `An inaktiven Tagen findet kein Unterricht statt.`

### 4.3 Perioden-Tabelle (desktop, `md:` and up)
Layout: `<table className="hidden md:table w-full">` within `<DndContext><SortableContext>`.

Columns (left-to-right) with Tailwind widths:
| Column | Width | Alignment | Notes |
|--------|-------|-----------|-------|
| Drag-Handle | `w-8` | center | `GripVertical` icon (lucide), `h-4 w-4 text-muted-foreground cursor-grab` |
| # (periodNumber) | `w-12` | center | Read-only, auto from row index + 1 |
| Label | `w-32` | left | Editable Input, `placeholder="1. Stunde"` |
| Start (HH:mm) | `w-28` | left | `<Input type="time">` |
| Ende (HH:mm) | `w-28` | left | `<Input type="time">` |
| Dauer | `w-20` | right | Read-only computed `{n} min` |
| Pause danach | `w-24` | center | `<Switch>` |
| Aktion | `w-10` | center | `Trash2` icon-button (lucide), `h-8 w-8` |

Header row: `text-xs font-medium text-muted-foreground uppercase tracking-wide border-b`. Padding `px-3 py-2`.
Body row: `border-b hover:bg-muted/50 transition-colors`. Padding `px-3 py-3`.
Ghost/drag visual: `opacity-40` on the source row; drop indicator `border-t-2 border-primary` on target.
Keyboard reorder: dnd-kit defaults (Space to pick up, Arrow Up/Down to move, Space to drop, Esc to cancel).

### 4.4 Perioden-Cards (mobile, `< md`)
Layout: `<div className="md:hidden space-y-3">` with one shadcn `<Card>` per period inside the `SortableContext`.

Per-card structure:
- Card header (`p-3 flex items-center justify-between border-b`):
  - Left: `GripVertical` icon (`h-5 w-5`, 44px hit-slop via padding) + `#N` badge (`h-6 px-2 text-xs bg-muted rounded`).
  - Right: `Trash2` icon-button (`h-11 w-11` = 44px target).
- Card body (`p-3 space-y-3`):
  - **Label** field — full-width, stacked label/input.
  - **Start** + **Ende** row — `grid grid-cols-2 gap-3`. Each input `h-11`.
  - **Dauer** — read-only text row, `text-sm`. Copy: `Dauer: {n} min`.
  - **Pause danach** — row with `<Label>` + `<Switch>`, `flex items-center justify-between`. Switch target `44×44`.

### 4.5 Aktions-Leiste (below table/cards)
- Container: `flex flex-col gap-2 md:flex-row md:items-center md:justify-between mt-4`.
- Left button: `+ Periode hinzufügen` — shadcn `<Button variant="outline">` with `Plus` icon left. Desktop `h-10`, mobile `h-11 w-full`.
- Right button: `Aus Template neu laden` — shadcn `<Button variant="ghost">` with `RefreshCcw` icon, `text-destructive` tint.
  - Clicking opens a Confirm-Dialog (see §7.2 Template-Reload-Dialog) before wiping periods.

### 4.6 Time Input Behavior
- `<Input type="time">` — native browser/OS picker on iOS/Android Safari; desktop shows stepper.
- RHF `register('startTime')` → string value `"HH:mm"`.
- Zod refinement: `/^\d{2}:\d{2}$/` + endTime > startTime + periodN.endTime ≤ periodN+1.startTime.
- iOS Safari 375px: `h-11` guarantees 44px tap target (iOS picker is full-screen modal; no in-page picker geometry concerns).
- Inline validation errors: live (onChange + onBlur), shown via §2.4 error text pattern.

### 4.7 Computed Dauer
- Derivation: `differenceInMinutes(parse(endTime,'HH:mm',new Date()), parse(startTime,'HH:mm',new Date()))`.
- Display: `{n} min`. When invalid or empty, display em-dash `—` (text-muted-foreground).
- Read-only. No input field, no form-state tracking.

---

## 5. Schuljahr-Tab (SCHOOL-03, D-08, D-09)

### 5.1 List Layout (desktop + mobile, same structure)
- Section header "Schuljahre" + sub-line "Pflegen Sie Start- und Endzeitpunkte, Ferien und schulautonome Tage."
- CTA row at top: `[+ Neues Schuljahr anlegen]` — right-aligned desktop, full-width mobile.
- List: stacked shadcn `<Card>` elements, one per year. No table variant (list is short — typically 2–3 years).

### 5.2 Schuljahr-Card
Card header (`p-4 flex items-center justify-between border-b`):
- Left: Year name (`text-base font-semibold`) + date range (`text-sm text-muted-foreground`, format via date-fns `dd.MM.yyyy – dd.MM.yyyy`).
- Right: Aktiv-Badge when `isActive === true` — shadcn `<Badge variant="default">` with `CheckCircle2` icon (`h-3.5 w-3.5 mr-1`), label `Aktiv`.

Card actions row (`p-4 flex flex-wrap gap-2`):
- `[Aktivieren]` — only visible when `!isActive`. `variant="outline"`.
- `[Bearbeiten]` — always visible. `variant="ghost"` with `Pencil` icon.
- `[Löschen]` — disabled when `isActive` OR `hasReferences === true` (see §9). `variant="ghost"` with `Trash2` icon, `text-destructive`.
  - Disabled tooltip (shadcn `<Tooltip>` on hover): `Aktives Schuljahr kann nicht gelöscht werden` / `Schuljahr wird noch referenziert`.

Card body (expanded section, optional — collapsible via `<Collapsible>`):
- Two sub-sections: **Ferien** + **Schulautonome Tage**.
- Each sub-section is a list of Date-Range rows plus a `+ Eintrag hinzufügen` row.

### 5.3 Ferien / Autonome Tage Sub-UI
- Each entry: `flex items-center gap-2 py-2 border-b last:border-b-0`.
- Left: date-range display — two `<Input type="date">` inputs joined by `"–"`, or a custom shadcn `<Popover>` + `<Calendar>` range-picker.
  - **Choice: two `<Input type="date">` inputs** (simpler, no new component). Desktop `h-10`, mobile `h-11`.
- Right: `Trash2` icon-button (`h-8 w-8` desktop, `h-11 w-11` mobile).
- For "Schulautonome Tage": a single-day entry — one `<Input type="date">` plus optional label (`<Input type="text" placeholder="z. B. Schulfest">`).
- `+ Eintrag hinzufügen` button: `variant="ghost"` with `Plus` icon, left-aligned.

### 5.4 Neues Schuljahr anlegen (Dialog)
- Opens on `[+ Neues Schuljahr anlegen]` click.
- shadcn `<Dialog>` with title `Neues Schuljahr anlegen`.
- Fields (stacked):
  - **Name** — e.g. "2026/2027" (required).
  - **Start** — date (required).
  - **Semesterwechsel** — date (required, must be between start and end).
  - **Ende** — date (required).
  - **Als aktives Schuljahr setzen** — switch (default off).
- Buttons: `[Abbrechen]` (ghost) + `[Anlegen]` (primary).
- On submit success: toast `"Schuljahr angelegt."`, close dialog, refetch years list.

### 5.5 Aktivieren Row-Action
- Click → Confirm-Dialog: title `Schuljahr aktivieren`, body `"{name}" wird zum aktiven Schuljahr. Bestehende Stundenpläne und Klassenbuch-Einträge bleiben unverändert.`
- Buttons: `[Abbrechen]` + `[Aktivieren]` (primary).
- On success: toast `"Aktives Schuljahr gewechselt."`, InfoBanner at the top of the tab updates to show `Aktiv seit {Datum}`.

### 5.6 Aktiv-Swap Info Banner (D-09)
- Rendered at the top of the Schuljahr-Tab content (above the CTA row) whenever there is an active year:
  ```
  ┌─────────────────────────────────────────────────────┐
  │  ℹ  {name} ist aktiv seit {dd.MM.yyyy}.             │
  │     Neue Stundenpläne und Einträge ordnen sich      │
  │     diesem Schuljahr zu.                            │
  └─────────────────────────────────────────────────────┘
  ```
- Visual: `bg-muted/50 border border-muted rounded-md p-3 text-sm`. Icon `Info` (lucide, `h-4 w-4 mr-2 inline`).

### 5.7 Copywriting (German)
| Element | Copy |
|---------|------|
| Section title | `Schuljahre` |
| Section subtitle | `Pflegen Sie Start- und Endzeitpunkte, Ferien und schulautonome Tage.` |
| CTA | `Neues Schuljahr anlegen` |
| Aktiv-Badge | `Aktiv` |
| Action buttons | `Aktivieren` / `Bearbeiten` / `Löschen` |
| Empty state (no years) | heading `Noch kein Schuljahr angelegt` + body `Legen Sie das erste Schuljahr an, um mit der Planung zu beginnen.` |
| Delete disabled tooltip (active) | `Aktives Schuljahr kann nicht gelöscht werden` |
| Delete disabled tooltip (refs) | `Schuljahr wird noch verwendet und kann nicht gelöscht werden` |
| Ferien sub-section | `Ferien` |
| Autonome sub-section | `Schulautonome Tage` |

---

## 6. Optionen-Tab (SCHOOL-04, D-05, D-06)

### 6.1 A/B-Wochen-Toggle-Zeile
- Row container: `flex items-start justify-between gap-4 py-3`.
- Left column (flex-col):
  - Label: `A/B-Wochen-Modus` (`text-sm font-medium`).
  - Help text / current-run status: `text-xs text-muted-foreground mt-1`.
    - Dynamic copy (two variants):
      - `A/B-Wochen sind im aktuellen Stundenplan aktiviert.` (current run has `abWeekEnabled=true`)
      - `A/B-Wochen sind im aktuellen Stundenplan deaktiviert.` (current run has `abWeekEnabled=false`)
      - `Es existiert noch kein Stundenplan.` (no active run)
- Right column: shadcn `<Switch>` (44×24 target; extend hit-slop to 44×44 via parent padding on mobile).

### 6.2 Info Banner (directly below toggle)
```
┌───────────────────────────────────────────────────────────┐
│  ℹ  Eine Änderung gilt ab dem nächsten Stundenplan-Lauf.  │
│     Bestehende Stundenpläne bleiben unverändert.          │
└───────────────────────────────────────────────────────────┘
```
- Visual: same as §5.6 banner (`bg-muted/50 border border-muted rounded-md p-3 text-sm` + `Info` icon).
- Always visible — even when toggle state matches current run (the rule is non-obvious enough to warrant permanence).

### 6.3 Copywriting
| Element | Copy |
|---------|------|
| Section title | `Optionen` |
| Section subtitle | `Schulweite Einstellungen, die den Stundenplan-Solver beeinflussen.` |
| A/B label | `A/B-Wochen-Modus` |
| A/B status (on) | `A/B-Wochen sind im aktuellen Stundenplan aktiviert.` |
| A/B status (off) | `A/B-Wochen sind im aktuellen Stundenplan deaktiviert.` |
| A/B status (no run) | `Es existiert noch kein Stundenplan.` |
| Banner | `Eine Änderung gilt ab dem nächsten Stundenplan-Lauf. Bestehende Stundenpläne bleiben unverändert.` |
| Save toast | `Option gespeichert.` |

---

## 7. Dialogs

### 7.1 Destructive-Edit Warn-Dialog (D-13, Zeitraster save)
Trigger: 409 Conflict on `PUT /schools/:id/time-grid` with RFC 9457 body `impacted-runs`.

- Component: shadcn `<Dialog>`. Max width `sm:max-w-md`.
- Title: `Zeitraster-Änderung betrifft aktive Stundenpläne`
- Body (two paragraphs):
  - Paragraph 1: `{N} bestehende Stundenplan{N === 1 ? '' : '€'} verwenden dieses Zeitraster.` (N-aware plural: `1 bestehender Stundenplan verwendet` / `N bestehende Stundenpläne verwenden`).
  - Paragraph 2 (muted): `Änderungen können Kollisionen verursachen. Wählen Sie, wie Sie fortfahren möchten.`
- Icon at top: `AlertTriangle` (lucide, `h-6 w-6 text-amber-600`).
- Buttons (bottom, `flex flex-col-reverse sm:flex-row sm:justify-end gap-2`):
  - `[Abbrechen]` — `variant="outline"`. **Default-focused action** (safe path per the researcher recommendation).
  - `[Nur speichern]` — `variant="secondary"`. Re-submits with `?force=true`, no solver rerun.
  - `[Speichern + Solver neu starten]` — `variant="default"` (primary). Re-submits with `?force=true` and enqueues solver rerun job.
- Closing via ESC or backdrop click = Abbrechen semantics.

### 7.2 Template-Reload-Confirm-Dialog (Zeitraster "Aus Template neu laden")
- Title: `Zeitraster aus Vorlage neu laden?`
- Body: `Die aktuell eingetragenen Perioden werden ersetzt durch die Vorlage "{schoolType}-Standard". Nicht gespeicherte Änderungen gehen verloren.`
- Icon: `AlertTriangle` (`h-6 w-6 text-amber-600`).
- Buttons: `[Abbrechen]` (default-focus, outline) + `[Überschreiben]` (destructive variant — `variant="destructive"`, red).

### 7.3 Delete-Schuljahr-Confirm-Dialog
- Title: `Schuljahr löschen?`
- Body: `"{name}" wird dauerhaft gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.`
- Buttons: `[Abbrechen]` + `[Löschen]` (destructive variant).

---

## 8. Unsaved-Changes Dialog (D-02, reusable for Phases 11–16)

Trigger: any `isDirty` tab, plus any of:
- Tab switch (`guardedTabChange`)
- Router navigation (`useBlocker` with `shouldBlockFn: isDirty && !isSubmitting`)
- Browser back/forward, in-app link click

- Component: shadcn `<Dialog>`. Located at `apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx` (reusable export).
- Title: `Änderungen verwerfen?`
- Body: `Sie haben ungespeicherte Änderungen in diesem Tab. Wenn Sie jetzt wechseln, gehen diese verloren.`
- Icon: `AlertCircle` (`h-6 w-6 text-amber-600`).
- Buttons (`flex flex-col-reverse sm:flex-row sm:justify-end gap-2`):
  - `[Verwerfen]` — `variant="outline"`. Drops local state, resolves blocker with `proceed`.
  - `[Abbrechen]` — `variant="ghost"`. Cancels navigation (resolves blocker with `block`). **Default-focused.**
  - `[Speichern & Weiter]` — `variant="default"`. Triggers the active tab's save mutation; on success, resolves blocker with `proceed`; on failure, stays on the dialog.
- ESC = Abbrechen semantics.

**Reusability rule:** The component accepts `{ onDiscard, onCancel, onSaveAndContinue, isSaving }` props. Phases 11–16 import and reuse without duplicating copy.

---

## 9. Orphan-Delete Error (SCHOOL-05, D-10)

Trigger: `DELETE /schools/:id/school-years/:yearId` returns 409 with RFC 9457 body:
```
{ type: '/errors/school-year-has-references',
  title: 'Schuljahr hat Referenzen',
  status: 409,
  detail: '...',
  'referencing-counts': { timetableRuns: N, classbookEntries: N, ... } }
```

### 9.1 Presentation
- **Toast first** (sonner error toast, 6s duration):
  - Title: `Schuljahr kann nicht gelöscht werden`
  - Body: `Es wird noch von {count} Einträgen verwendet.` (count = sum of referencing-counts)
- **Inline detail banner** (optional, within the Schuljahr-Card expanded body, rendered if a recent 409 was returned):
  - `bg-destructive/10 border border-destructive/30 rounded-md p-3 text-sm text-destructive`
  - Icon: `AlertCircle h-4 w-4 mr-2 inline`
  - Copy: `Dieses Schuljahr wird noch verwendet: {timetableRunsN} Stundenpläne, {classbookEntriesN} Klassenbuch-Einträge. Löschen nicht möglich.`

### 9.2 Copywriting rule
- UI: always German, user-friendly, NEVER show the RFC 9457 `type` URL or `detail` string as-is.
- API response: English (`Title: Schoolyear has references`). Client maps to German.
- Never show "409" or "Conflict" in user copy.

---

## 10. Design Tokens (reusable for v1.1 Admin phases)

### 10.1 Color
Tailwind 4 + shadcn semantic tokens. All values come from the default shadcn theme — **no new tokens introduced**.

| Role (60/30/10) | Token | Usage | Examples |
|-----------------|-------|-------|----------|
| Dominant (60%) | `bg-background` / `text-foreground` | Page background, body text | Page canvas, input backgrounds |
| Secondary (30%) | `bg-card` / `bg-muted` | Cards, sidebar, tab panels, banners | Tab content Card, sidebar, info-banners |
| Accent (10%) | `bg-primary` / `text-primary` | Primary CTAs, active badge, active tab indicator, active Toggle pill | `[Speichern]`, `[Anlegen]`, `[Aktivieren]`, Aktiv-Badge, current-tab underline |
| Destructive | `bg-destructive` / `text-destructive` | Destructive actions and errors ONLY | `[Löschen]`, `[Überschreiben]`, error text, orphan-ref banner |
| Warning | `text-amber-600` | Warn-Dialog icons | `AlertTriangle` in Destructive-Edit / Template-Reload / Unsaved-Changes |
| Success | `text-green-600` (sparingly) | Aktiv-Badge icon only | `CheckCircle2` in Aktiv-Badge |

**Accent reserved for:** primary CTAs (`Speichern`, `Anlegen`, `Aktivieren`), the Aktiv-Badge, the active tab indicator, and the active-state of Toggle pills. Not for general interactive elements. Hover states on secondary buttons use `bg-muted`, not accent.

### 10.2 Typography

| Role | Size (mobile → desktop) | Weight | Line-height | Usage |
|------|------------------------|--------|-------------|-------|
| Body | 14px (`text-sm`) | 400 | 1.5 (`leading-normal`) | All paragraphs, field values, help text body |
| Label | 14px (`text-sm`) | 500 (`font-medium`) | 1.5 | Form labels, toggle labels, section subtitles |
| Heading (h2) | 18px (`text-lg`) | 600 (`font-semibold`) | 1.2 (`leading-tight`) | Section titles inside tabs |
| Display (h1) | 24px → 30px (`text-2xl md:text-3xl`) | 600 | 1.2 (`tracking-tight`) | Page header |

Small / caption: `text-xs` (12px / 400 / 1.5) — reserved for help text, error text, breadcrumbs, table headers, status lines. Do NOT introduce additional sizes (11px, 13px, 15px, etc.) — budget is 4 roles + 1 caption = 5 max.

**Weight budget — 2 primary weights + 1 documented exception:**

- **400 (regular)** — body, help, caption, error, input text, Table cells.
- **600 (semibold)** — h1 (display) and h2 (section titles) only.
- **500 (medium) — EXCEPTION, Label-only.** Reserved exclusively for the shadcn `<Label>` component (whose default is `font-medium`). This is inherited from the shadcn design system's form-field convention; overriding `<Label>` to 400 would drift the entire project from the library's canonical form layout. Treat 500 as a sub-role bound to the Label role — NOT a free weight. If you find yourself reaching for `font-medium` outside a `<Label>`, use 400 or 600 instead.

### 10.3 Spacing
Tailwind defaults, multiples of 4:

| Token | Value | Usage |
|-------|-------|-------|
| 1 | 4px | Icon gaps (`gap-1`), badge padding |
| 2 | 8px | Compact element spacing (`gap-2`, `space-y-2`) |
| 3 | 12px | Inter-card gaps, card padding (mobile) |
| 4 | 16px | Default field gaps (`space-y-4`, `gap-4`) |
| 6 | 24px | Section padding (`p-6`), section separator margins |
| 8 | 32px | Card padding (desktop, `md:p-8`), layout gaps |
| 12 | 48px | Empty-state vertical padding |

**Exceptions (not free scale tokens — each documented with a specific role):**

- **6px** (`space-y-1.5`, `gap-1.5`, `mt-1.5`) — label-to-input spacing inside form-field stacks (§2.3), help/error margin below inputs (§2.4), and breadcrumb chevron gap (§1.2). Inherited from shadcn's canonical `<Label>` + `<Input>` form-field layout. NOT reused for any other inter-element spacing. If you find yourself reaching for `1.5` outside of form-field-internal gaps or breadcrumb separators, use token 2 (8px) instead.
- **44px** (`h-11`, `w-11`) — mandated mobile touch-target floor (MOBILE-ADM-02). Applies to icon-buttons, mobile Inputs, and sticky mobile action buttons. NOT reused for general spacing.

### 10.4 Border Radius
- Default: `rounded-md` (shadcn `--radius` = 0.5rem = 8px).
- Inputs, buttons, cards: `rounded-md`.
- Badges, pills: `rounded-full`.
- No other radii introduced.

### 10.5 Touch Targets
- **Mobile (< md, 375px):** 44×44 minimum for ALL interactive elements (MOBILE-ADM-02). Enforced via `h-11 w-11` on icon-buttons, `h-11` on all Inputs, `h-11 w-full` on mobile action buttons.
- **Desktop (≥ md):** 32×32 minimum for icon-buttons, 40×40 (`h-10`) for Inputs/Buttons. Rationale: hover-pointer precision.
- Sticky mobile save bar respects 44px button height.

### 10.6 Focus Ring
- Radix default — shadcn wrappers already render `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`.
- Do not override. All custom buttons/interactive divs must include the same classes.

### 10.7 Elevation / Shadow
- Cards: `shadow-sm` (desktop), no shadow on mobile (cards bleed to edges).
- Dialogs: shadcn default (`shadow-lg` on DialogContent).
- Sticky mobile save bar: `shadow-[0_-2px_8px_rgba(0,0,0,0.05)]` (top-side shadow).
- No other shadows.

---

## 11. Breakpoint Map

| Breakpoint | px | Tailwind | Phase-10 Behavior |
|------------|----|-----:|-------------------|
| default (xs) | 375 | — | Mobile target. Tab bar = Select dropdown. Table = card-stack. Sticky save bar. 44px touch targets. |
| sm | 640 | `sm:` | Form grid stacks relax; dialog buttons horizontal. Table still card-stack. |
| md | 768 | `md:` | **Critical breakpoint.** Table switches from card-stack to `<table>`. TabsList replaces Select. Save bar becomes inline (not sticky). Cards show border+shadow. |
| lg | 1024 | `lg:` | Sidebar (`AppSidebar`) visible permanently; MobileSidebar drawer hidden. Page header `text-3xl`. |
| xl | 1280 | `xl:` | No layout change for Phase 10. |

Explicit rule (reused by Phases 11–16): **data tables collapse to cards at `< md`**. Both representations live inside the same React tree, wrapped in the same `SortableContext` when drag-and-drop applies.

Sidebar:
- Desktop (`lg+`): `AppSidebar` (permanent left column).
- Mobile/Tablet (`< lg`): `MobileSidebar` (shadcn `<Sheet>` drawer).

---

## 12. Accessibility Contract

### 12.1 Standards
- **WCAG 2.1 AA** color contrast. Tailwind 4 default shadcn tokens already meet this; verified by `gsd-ui-auditor` retroactively. No new tokens → no new risk.
- Keyboard-reachable for every interactive control.
- Focus visible on every focusable element (see §10.6).

### 12.2 Specific Requirements

| Control | ARIA / Accessibility Treatment |
|---------|------------------------------|
| Tabs (desktop) | Radix `<Tabs>` ships correct `role="tablist"` / `role="tab"` / `role="tabpanel"` + arrow-key navigation. |
| Tabs (mobile Select) | shadcn Select renders `role="combobox"` + listbox; label via associated `<Label htmlFor>`. |
| Breadcrumbs | `<nav aria-label="Breadcrumb">` with `<ol>`, current page is `<span aria-current="page">`. |
| Form fields | `<Label htmlFor={id}>`; `aria-invalid="true"` on error; `aria-describedby` pointing to help OR error text. |
| Help + error text | Singular id per field (e.g. `field-name-msg`) bound via `aria-describedby`. |
| Time inputs | Native `<input type="time">` — browser exposes semantic role; label association required (`<Label htmlFor>`). |
| Checkbox / Switch / Toggle | Radix wrappers already expose `role="switch"` or `role="checkbox"` with `aria-checked`. |
| Drag-and-drop (dnd-kit) | Keyboard support: **Space** to pick up, **Arrow Up / Arrow Down** to move, **Space** to drop, **Esc** to cancel. dnd-kit provides `ScreenReaderInstructions` — override German: `screenReaderInstructions={{ draggable: 'Zum Verschieben Leertaste drücken. Pfeiltasten zum Bewegen. Leertaste zum Ablegen. Escape zum Abbrechen.' }}`. |
| Drag announcements | Provide `announcements` handler with German strings: `onDragStart → "Periode {n} wird verschoben"`, `onDragOver → "Periode {n} über Position {m}"`, `onDragEnd → "Periode {n} auf Position {m} abgelegt"`, `onDragCancel → "Verschieben abgebrochen"`. |
| Dialogs | Radix Dialog ships focus trap + `role="dialog"` + `aria-labelledby` + `aria-describedby`. Default-focused button per §7/§8. ESC closes. |
| Disabled tabs | `aria-disabled="true"`; not in tab sequence. |
| Sticky save bar | `role="region" aria-label="Speichern"` container; only rendered when dirty (no visual clutter when clean). |
| Tooltips | shadcn `<Tooltip>` with `aria-label` on trigger when icon-only button. |
| Toasts | sonner uses `role="status"` for success, `role="alert"` for errors. No config change needed. |

### 12.3 Language
- `<html lang="de">` — set globally (once, not per component). All user-facing text in German; `aria-label`s in German.
- API response messages remain English (Phase 1 D-15) — UI never renders API `detail` string verbatim; maps to German copy.

---

## 13. Copywriting Tone (German, jargon-free)

### 13.1 Rules
- **Duzen / Siezen:** Use **Sie-Form** (formal). Target audience is Schulpersonal — formal register is the Austrian/DACH standard in administrative UIs.
- **Tech-Jargon:** avoid. Use "Stundenplan" (not "Run" / "Solver-Run"). Use "Pflichtfeld" (not "required"). Use "Fehler beim Speichern" (not "HTTP 500"). Exception: "A/B-Wochen" is the accepted DACH school term.
- **Verben (CTAs):** use concrete verbs: `Speichern`, `Anlegen`, `Aktivieren`, `Löschen`, `Verwerfen`, `Bearbeiten`, `Hinzufügen`. Avoid `OK`, `Absenden`, `Übernehmen`.
- **Fehlermeldungen:** name the problem + a concrete next step. NOT `"Fehler aufgetreten"` → YES `"Netzwerkfehler – bitte erneut versuchen."`.
- **Länge:** labels ≤ 3 Wörter, buttons ≤ 2 Wörter, hints ≤ 1 Satz, errors ≤ 2 Sätze.

### 13.2 Canonical Button Labels (reused across all v1.1 Admin phases)

| Action | Label | Variant |
|--------|-------|---------|
| Save (update) | `Speichern` | primary |
| Save (create) | `Anlegen` or context-specific (`Schule anlegen`, `Schuljahr anlegen`) | primary |
| Cancel (in dialog) | `Abbrechen` | ghost or outline |
| Discard dirty changes | `Verwerfen` | outline |
| Save-and-proceed | `Speichern & Weiter` | primary |
| Delete | `Löschen` | destructive |
| Hard overwrite | `Überschreiben` | destructive |
| Activate (year) | `Aktivieren` | primary or outline |
| Edit row | `Bearbeiten` | ghost |
| Add new row | `Hinzufügen` | outline |
| Remove row | `Entfernen` (trash icon — icon-only acceptable with `aria-label="Entfernen"`) | ghost |
| Destructive-edit "save without rerun" | `Nur speichern` | secondary |
| Destructive-edit "save + solver rerun" | `Speichern + Solver neu starten` | primary |

### 13.3 Empty-State Copy per Tab

| Tab | Heading | Body |
|-----|---------|------|
| Stammdaten (no school) | `Noch keine Schule angelegt` | `Legen Sie zuerst die Stammdaten Ihrer Schule an. Anschließend können Sie Zeitraster, Schuljahre und Optionen konfigurieren.` |
| Zeitraster (no periods) | `Noch keine Perioden definiert` | `Fügen Sie Perioden manuell hinzu oder laden Sie eine Vorlage für Ihren Schultyp.` |
| Schuljahr (no years) | `Noch kein Schuljahr angelegt` | `Legen Sie das erste Schuljahr an, um mit der Planung zu beginnen.` |
| Optionen | (no empty state — toggles always render) | — |

### 13.4 Error-State Copy Patterns

| Trigger | Copy |
|---------|------|
| Pflichtfeld leer | `Pflichtfeld` |
| PLZ falsches Format | `PLZ muss 4 oder 5 Ziffern haben` |
| Zeit ungültig | `Zeit muss im Format HH:mm sein` |
| endTime ≤ startTime | `Ende muss nach Start liegen` |
| Periode überlappt | `Perioden dürfen sich nicht überlappen` |
| Netzwerkfehler | `Netzwerkfehler – bitte erneut versuchen.` |
| Speichern fehlgeschlagen (generic) | `Speichern fehlgeschlagen. Bitte prüfen Sie Ihre Eingaben.` |
| 409 Orphan-Ref (Schuljahr) | `Schuljahr wird noch verwendet und kann nicht gelöscht werden.` |
| 409 Destructive-Edit (Zeitraster) | (opens dialog, siehe §7.1) |

---

## 14. State Machines per Tab

Each tab runs the following state machine (driven by TanStack Query + RHF):

| State | Trigger | UI Treatment |
|-------|---------|-------------|
| **Loading** | initial query pending | Skeleton rows: `<div className="animate-pulse bg-muted rounded h-10 w-full">` per field slot. Tab content area ≥ 240px min height to prevent jump. No Save button rendered. |
| **Empty** | query success + result empty (Stammdaten: no school; Zeitraster: no periods; Schuljahr: no years) | Empty-state per §3.1 / §13.3. Save button hidden. CTA inline/explicit per tab. |
| **Loaded** | query success + result present | Form rendered with server values. `isDirty === false`. Save button visible but disabled. |
| **Dirty** | any field change | `isDirty === true`. Save button enabled. Sticky mobile save bar slides up (mobile). Navigation blocker armed. |
| **Saving** | mutation in flight | Save button disabled + `Loader2` spinner. Form inputs remain enabled (don't disable — that's jarring). |
| **SaveSuccess** | mutation resolves 2xx | sonner toast (title per tab). RHF `reset(response)` → back to Loaded. Sticky bar slides down. |
| **SaveError** | mutation rejects 4xx (not 409-destructive-edit) | sonner error toast + inline field errors from server. Form stays in Dirty. |
| **SaveConflict409** | Zeitraster mutation 409 | Open Destructive-Edit Warn-Dialog (§7.1). Form stays in Dirty. |

### 14.1 Dirty-Reset Discipline (critical — see RESEARCH §8)
- After a successful save: `form.reset(serverResponse)` MUST be called with the fresh server state.
- Without `reset`, `isDirty` stays true → navigation blocker remains armed → users see spurious Unsaved-Changes Dialogs. **Planner: call this out as an executor checklist item.**

### 14.2 Query-Keys Discipline
Per-tab query keys (narrow — avoid blanket invalidation):
- Stammdaten: `['school', schoolId]`
- Zeitraster: `['time-grid', schoolId]`
- Schuljahr list: `['school-years', schoolId]`
- Current active run (for Optionen status-line): `['timetable-run:active', schoolId]`
- Options (abWeekEnabled): shares `['school', schoolId]` (it's a field on School).

Each mutation invalidates its own key only. Exceptions:
- Aktivieren Schuljahr: invalidates `['school-years', schoolId]` + `['school', schoolId]` (may affect active context) + `['timetable-run:active', schoolId]` (banner state).
- Save Zeitraster with Solver-Rerun: invalidates `['timetable-run:active', schoolId]` once the rerun job completes (trigger via BullMQ callback → WebSocket → query invalidation).

---

## 15. Icons (lucide-react)

Canonical icon set for Phase 10 (reused across Phases 11–16 wherever semantic):

| Icon | Usage |
|------|-------|
| `Building2` | Schulverwaltung sidebar entry; Stammdaten empty-state hero |
| `CalendarDays` | Schuljahr tab trigger icon (optional — not rendered in the label, kept for Select-dropdown variant if needed later) |
| `Clock` | Zeitraster tab trigger icon (optional) |
| `Settings` | Optionen tab trigger icon (optional) |
| `GripVertical` | Drag-handle in Perioden-Tabelle rows and Perioden-Cards |
| `Trash2` | Delete / remove row (Periode, Ferien-Eintrag, Autonome-Tag, Schuljahr) |
| `Plus` | "Hinzufügen" / "Anlegen" CTAs (prefix) |
| `Pencil` | "Bearbeiten" Row-Action button |
| `CheckCircle2` | Aktiv-Badge icon (green-600) |
| `AlertTriangle` | Destructive / warning dialog icons (amber-600) |
| `AlertCircle` | Inline error text prefix; Unsaved-Changes dialog icon |
| `Info` | Info banners (§5.6, §6.2) |
| `ChevronRight` | Breadcrumb separator |
| `ChevronDown` | Select triggers |
| `RefreshCcw` | "Aus Template neu laden" button prefix |
| `Loader2` | In-flight spinner on Save button (`animate-spin`) |
| `X` | Dialog close button (shadcn default) |

**Tab triggers render labels only (no icons).** Icons are reserved for sidebar entries, buttons, status badges, and empty-state heroes — consistent with the shadcn default look and to keep the tab bar visually calm.

Sizing convention:
- In buttons: `h-4 w-4 mr-2` (16px).
- In row-actions / badges: `h-3.5 w-3.5` (14px).
- In empty-state heroes: `h-12 w-12` (48px).
- In dialog heroes: `h-6 w-6` (24px).

---

## 16. Reusability Manifest (for Phases 11–16)

The following Phase 10 components and patterns MUST be extracted as reusable exports and cited by name in Phases 11–16:

| Asset | Path | Reused by |
|-------|------|-----------|
| `UnsavedChangesDialog` | `apps/web/src/components/admin/shared/UnsavedChangesDialog.tsx` | 11, 12, 13, 14 |
| `PageShell` (breadcrumbs + H1 + Tabs frame) | `apps/web/src/components/admin/shared/PageShell.tsx` | 11 (Fächer-Detail), 12 (Klassen-Detail), 13 (Lehrer-Detail) |
| `StickyMobileSaveBar` | `apps/web/src/components/admin/shared/StickyMobileSaveBar.tsx` | 11, 12, 13, 16 |
| Mobile-adaptation pattern (`md:table` ↔ `md:hidden space-y-3 cards`) | documented in this file §4.3–§4.4 and Phase-10 PLAN | 11 (Fächer list), 12 (Klassen list), 13 (Lehrer list) |
| `InfoBanner` (muted bg, `Info` icon, text-sm) | `apps/web/src/components/admin/shared/InfoBanner.tsx` | 14 (solver warnings), 16 (dashboard hints) |
| `WarnDialog` (AlertTriangle + 2–3 action buttons) | `apps/web/src/components/admin/shared/WarnDialog.tsx` | 14 (solver-rerun warn), 15 (audit-export warn) |
| Canonical button-label catalogue (§13.2) | this file — documented for reference | all |
| Color/typography/spacing tokens (§10) | shadcn defaults + notes in this file | all |

Planner SHOULD generate tasks to extract these as shared components in Wave 0 or Wave 1 of the Phase 10 plan.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `tabs`, `dialog`, `input`, `select`, `button`, `card`, `label`, `popover`, `dropdown-menu`, `textarea`, `switch`, `toggle`, `badge`, `separator`, `tooltip`, `collapsible`, `sheet`, `sonner` | not required |
| third-party | none | not applicable |

No third-party registries declared. Registry vetting gate not required.

**Install status — action required by the planner:** The following shadcn primitives are referenced in this UI-SPEC but are NOT yet present in `apps/web/src/components/ui/` (inventory at writing time contained only `button`, `card`, `dialog`, `dropdown-menu`, `input`, `label`, `popover`, `select`, `tabs`, `textarea`). The planner MUST add install tasks to Wave 0 of the owning plan:

- `switch` — Optionen-Tab A/B toggle (§6.1)
- `toggle` or `switch` — SchoolDay Mo-Sa toggles (§4.2 — Toggle-Group pattern; reuse `toggle-group` primitive if added, otherwise composite with `toggle`)
- `separator` — breadcrumb + section dividers (§1.2, §2.2)
- `tooltip` — icon-only action hints on desktop (§4.3 drag handle, §5.2 row-action icons)
- `collapsible` — Ferien / Autonome Tage expandable rows (§5.3)
- `sheet` — MobileSidebar drawer (confirm whether MobileSidebar already uses this; if yes, no new install)
- `sonner` — toast notifications (package is installed per RESEARCH.md §Stack, but shadcn `sonner` wrapper component may need adding)
- `badge` — Aktiv-Badge on Schuljahr list (§5.2)

Install command (batch): `pnpm --filter @schoolflow/web exec npx shadcn@latest add switch toggle toggle-group separator tooltip collapsible sheet sonner badge`.

**Design-system preset reconciliation:** The frontmatter `preset` field references `new-york` style, but `apps/web/components.json` currently has `"style": "default"`. Planner should pick one and update either the UI-SPEC or `components.json` accordingly. Recommended: keep the existing `"default"` style (it is what is already installed and rendered) and update the UI-SPEC frontmatter to `preset: shadcn default (Tailwind 4 tokens, pre-existing install)`. Non-blocking, but worth closing before execution so the executor does not run `shadcn add` commands that assume a different style registry.

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending (awaiting gsd-ui-checker)

---

*Phase 10 UI-SPEC authored 2026-04-18. Canonical for v1.1 Schuladmin Console Admin-Detail-Screens (Phases 11–16).*
