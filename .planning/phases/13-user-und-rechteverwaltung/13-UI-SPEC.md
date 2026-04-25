---
phase: 13
slug: user-und-rechteverwaltung
status: approved
shadcn_initialized: true
preset: default-neutral-cssvars
created: 2026-04-24
reviewed_at: 2026-04-24
---

# Phase 13 — UI Design Contract

> Visual and interaction contract for User- und Rechteverwaltung. Consumed by gsd-planner, gsd-executor, gsd-ui-checker, gsd-ui-auditor.
>
> **Authoritative upstream:** `13-CONTEXT.md` (user decisions D-01..D-16) + `apps/web/src/app.css` (existing design tokens) + `apps/web/components.json` (shadcn config) + Phase 10/11/12 UI-SPECs (pattern continuation).
>
> **Non-goals:** Do NOT re-invent tokens already declared in `apps/web/src/app.css`. This spec binds phase-13 surfaces to the existing token set and only adds phase-specific rules (German copy, accent reserved-for list, icon inventory, interaction choreography) for the 4-tab User-Detail, User-List, and the 6 backend-gap-fix UIs.

---

## Design System

| Property | Value | Source |
|----------|-------|--------|
| Tool | shadcn/ui | `apps/web/components.json` confirmed |
| Preset | `default` style, `neutral` base color, CSS variables on | `components.json` |
| Component library | Radix UI via shadcn/ui (per CLAUDE.md; currently transitioning to Base UI — monitor, do not migrate in Phase 13) | CLAUDE.md |
| Icon library | lucide-react | `components.json iconLibrary: "lucide"` |
| Font | Inter, fallbacks `-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | `app.css --font-sans` |
| Dark mode | **Not supported in v1.1** — Phase 13 MUST NOT introduce new `dark:*` variants. | `apps/web/src/app.css` grep |
| Styling | Tailwind CSS 4 with `@theme` CSS custom properties | `app.css` header |

**Design language direction:** Dense-admin, Untis-replacement aesthetic. Neutral greys for chrome, blue primary for principal actions, red destructive for irreversible actions (e.g. Unlink, Disable, Override-Delete, Re-Link-After-Conflict), green/amber reserved strictly for status signaling (Aktiv/Deaktiviert, Granted/Denied attribution chips, InfoBanner surfaces). **Security-critical surface:** user-visible change preview (effective permissions) uses higher contrast cues than generic admin surfaces — see Color §"Access-signal pairings".

---

## Spacing Scale

Declared values (all multiples of 4, aligned to Tailwind 4 defaults — use Tailwind utility classes `p-1 p-2 p-4 p-6 p-8 p-12` rather than raw px):

| Token | Value | Tailwind | Usage in Phase 13 |
|-------|-------|----------|-------------------|
| xs | 4px | `1` | Icon-to-label gap in role-chips and source-chips, inline badge padding |
| sm | 8px | `2` | Table cell padding vertical, compact form row gap, checkbox-to-label gap in Rollen-Tab |
| md | 16px | `4` | Default form field vertical gap, card inner padding, tab content padding, Override-Row vertical spacing |
| lg | 24px | `6` | Section breaks within a tab, dialog inner padding, gap between Effective-Permissions subject-group accordions |
| xl | 32px | `8` | Gap between major page sections (filter-bar → table, table → pagination, Override-Editor → Person-Link section in merged Tab 4) |
| 2xl | 48px | `12` | Desktop page top padding above PageShell header |
| 3xl | 64px | `16` | Not used in Phase 13 (reserved for marketing surfaces) |

**Phase-13 mobile exceptions (MOBILE-ADM-02 hard rule — 375px viewport):**
- **Touch targets ≥ 44×44px:** Row-action icon buttons, filter-bar toggles, role-checkboxes, Granted/Denied switches, Accordion triggers, Tab triggers MUST render at min `h-11 w-11` (44px) on viewports `<640px`. Desktop may shrink to `h-9` (36px).
- **Mobile `StickyMobileSaveBar`:** 56px fixed height at bottom, 16px horizontal padding — inherits Phase 10 component spec, no changes. Present on Rollen-Tab and Overrides+Person-Link merged Tab.
- **Mobile list row density:** User-list table rows on `<640px` switch to stacked `Card` layout with 8px vertical padding (Tailwind `p-2`) to maintain tight card density on narrow viewports.
- **Override-Editor Row on mobile:** each row stacks vertically into a `Card` with 16px inner padding; Conditions-Panel becomes a full-width collapsible at the bottom of the card.
- **Effective-Permissions Accordion:** subject-group headers sticky at top of scroll area (`sticky top-0 bg-card z-10`) on mobile so the current group context stays visible while long ability lists scroll.

---

## Typography

Exactly 4 type sizes and 2 weights (per 60/30/10 + contract-minimalism rules). All sizes map to Tailwind utility classes. Pattern locked by Phase 10/11/12 — Phase 13 does NOT deviate.

| Role | Size | Weight | Line Height | Tailwind | Phase 13 usage |
|------|------|--------|-------------|----------|----------------|
| Body | 14px | 400 (regular) | 1.5 (21px) | `text-sm leading-normal font-normal` | Table cell text, form input text, description text, toast body, badge label, Conditions JSON monospace fallback text, role-chip label |
| Label | 14px | 600 (semibold) | 1.4 (20px) | `text-sm font-semibold` | Form field labels, table column headers, tab triggers, breadcrumb current segment, action-button label, Override-Editor row-header labels (Action/Subject/Granted/Reason) |
| Heading | 18px | 600 (semibold) | 1.3 (24px) | `text-lg font-semibold` | Card titles (`CardTitle`), Dialog titles, tab-section titles (e.g. "Rollen", "Effektive Berechtigungen", "Overrides", "Person-Verknüpfung"), PageShell subtitle headers |
| Display | 24px | 600 (semibold) | 1.2 (29px) | `text-2xl font-semibold` | PageShell page title (`{firstName} {lastName} · {email}` on User-Detail, list-page title "User & Berechtigungen") |

**Rules:**
- Never introduce a 5th size. If a new scale appears to be needed (e.g. "big number of Admin-count in last-admin-guard warning"), use `Display` + `text-muted-foreground` caption below.
- Never introduce a 3rd weight. Italic/underline are forbidden for emphasis; use `font-semibold` or `text-foreground` vs `text-muted-foreground` color shift instead.
- Conditions JSON editor uses the **Body** token with `font-mono` utility override (`text-sm font-mono`) — this is NOT a new typography size, only a font-family shift for code legibility. Line height remains 1.5.
- Numbers in tables (Override-row counts, Effective-Permission row-counts per subject-group accordion header) MUST use `tabular-nums` utility to keep column alignment stable.
- Monospace is used ONLY in the Conditions-JSON editor textarea and the JSON preview under Variable-Hints (`{{ id }}`).

---

## Color

Mapped directly to `app.css` CSS variables. Do NOT hardcode hex values in JSX; use Tailwind utilities that resolve to these variables (`bg-background`, `bg-card`, `bg-primary`, `text-destructive`, etc).

### 60 / 30 / 10 split

| Role | HSL | CSS var | Tailwind | Usage |
|------|-----|---------|----------|-------|
| Dominant (60%) | `hsl(0 0% 100%)` | `--color-background` | `bg-background` | Page canvas, table body, form input canvas, Accordion panel body |
| Secondary (30%) | `hsl(240 5% 96%)` | `--color-card` / `--color-muted` / `--color-secondary` | `bg-card`, `bg-muted`, `bg-secondary` | Cards, sidebar, tab-list background, table header row, sticky mobile save bar, filter-bar container, Accordion header row, Override-Row Card surface, Person-Link read-state Card |
| Accent (10%) | `hsl(221 83% 53%)` (blue) | `--color-primary` | `bg-primary text-primary-foreground`, `text-primary`, `ring-primary` | Reserved — see below |
| Destructive | `hsl(0 84% 60%)` (red) | `--color-destructive` | `bg-destructive`, `text-destructive`, border variant | Reserved — see below |
| Success signal | `hsl(142 71% 45%)` (green) | `--color-success` | `text-success`, `bg-success/10` | Reserved — see below |
| Warning signal | `hsl(38 92% 50%)` (amber) | `--color-warning` | `text-warning`, `bg-warning/10` | Reserved — see below |

### Accent (blue primary) — reserved-for list

The blue primary is restricted to these elements across Phase 13. No other element may use `bg-primary` or `text-primary`.

1. **Primary CTA button** on every surface (see Copywriting Contract for labels):
   - `/admin/users` header: no "Create" CTA — page is read-mostly (D-04: **no KC-User-Create** in v1.1). Primary CTA on list page is `Filter zurücksetzen` in empty-state-by-filter only.
   - User-Detail Rollen-Tab sticky save: `Änderungen speichern`
   - User-Detail Overrides section (inline per row): `Override speichern` (inside each Override-Row Card when dirty) + `+ Override hinzufügen` footer button
   - User-Detail Person-Link section: `Verknüpfung ändern` (when linked) / `Mit Person verknüpfen` (when unlinked)
   - Dialog primary confirm button (`Übernehmen`, `Verknüpfen`, `Anwenden`)
2. **Active Tab trigger underline / bar** (shadcn `TabsTrigger` active state) — 4 tabs on User-Detail.
3. **Focus ring** on every interactive element (`--color-ring` resolves to primary). Non-negotiable — keyboard a11y requirement.
4. **Active sidebar item indicator** (existing `AppSidebar` behavior — no change).
5. **Linked-status filter-bar toggle** "Verknüpft" state uses `bg-primary/10 text-primary` (light tint) — signals filtered-into view; "Nicht verknüpft" uses neutral. "Alle" uses neutral.
6. **Deep-link text** in Person-Link Card body (`Verknüpft mit Teacher Max Mustermann →`) — `text-primary underline-offset-2 hover:underline` treatment.
7. **Source-chip "Override"** variant in Effective-Permissions table — see Access-signal pairings.

### Destructive (red) — reserved-for list

1. **Override-Row Delete icon button** (row-level `Trash2`) — hover/focus state triggers `text-destructive`; click opens inline 1-step confirm (no dialog) per D-10 granular CRUD pattern.
2. **"Verknüpfung lösen" (Unlink) button** — `variant="destructive"` on Person-Link Card when linked state is shown.
3. **"Sperren" (Disable) row-action** on User-List — uses `text-destructive` on hover-reveal.
4. **Last-Admin-Guard 409 error toast** + `AffectedEntitiesList` inside WarnDialog (existing Phase 11/12 pattern) — `variant="destructive"`.
5. **Link-Conflict WarnDialog 409** — destructive variant on "Bestehende Verknüpfung lösen und neu verknüpfen" (2-step re-link) CTA.
6. **Inline form validation error text** below invalid Conditions-JSON + invalid Reason-empty fields (`text-destructive text-sm`).
7. **Toast variant="destructive"** for Silent-4XX-Invariante violations surfaced as user-visible errors (Phase 10.2-04 codified pattern).
8. **Role "Admin" chip when currently-logged-in user is un-ticking own Admin role** — border flashes `border-destructive` briefly (200ms) as visual cue before the Self-Lockout WarnDialog opens (D-06).
9. **Granted/Denied switch — "Denied" state** — `data-[state=checked]:bg-destructive data-[state=checked]:text-destructive-foreground` on shadcn `Switch` primitive.
10. **Effective-Permissions row with `granted: false`** — row-background `bg-destructive/5` + `XCircle` icon in destructive color (paired with icon + "Verweigert" text label — WCAG 1.4.1).

### Success (green) — reserved-for list

1. **"Aktiv" status badge** in User-List Status column (`bg-success/10 text-success` + `CircleCheck` icon).
2. **Granted/Denied switch — "Granted" state** — `data-[state=checked]:bg-success data-[state=checked]:text-success-foreground`.
3. **Effective-Permissions row with `granted: true`** — `CircleCheck` icon in success color (row-background stays `bg-background` — no row-highlight to keep scan-ability).
4. **Source-chip "Rolle: admin"** — `bg-success/10 text-success border-success/40` (roles inherited are "positive/expected" attribution).
5. **Toast variant="success"** on successful Role-Save, Override-Create/Update/Delete, Link/Unlink, Enable/Disable — uses existing toast system.
6. **Person-Link Card read-state connector** — small `CircleCheck` icon (green) left of the person-chip in "Verknüpft mit …" sentence.

### Warning (amber) — reserved-for list

1. **InfoBanner "Rolle ↔ Person-Link Konsistenz-Hinweis"** (D-08) at top of Rollen-Tab when divergence detected (e.g. user has `lehrer` role but no TEACHER-person-link) — `bg-warning/10 border-warning/40 text-warning-foreground`. Copy per Copywriting Contract below.
2. **InfoBanner "JWT-Refresh-Hinweis"** (D-05 footer of Rollen-Tab) — amber subtle `bg-warning/10 text-warning-foreground`. Copy: `Änderungen wirken spätestens nach erneutem Login vollständig (typisch innerhalb von 15 Minuten).`
3. **"Deaktiviert" status badge** in User-List Status column — amber (not red, because a disabled user is a *pending* state, not a *destroyed* one). `bg-warning/10 text-warning` + `Ban` icon.
4. **Source-chip "Rolle: schulleitung"** — `bg-warning/10 text-warning border-warning/40` (secondary-admin role, lower privilege than `admin`). All other roles (`lehrer`, `eltern`, `schueler`) use neutral chip `bg-secondary text-secondary-foreground`.
5. **Self-Lockout WarnDialog** — `TriangleAlert` icon in amber in dialog header alongside destructive-variant confirm button (mixed icon/button color is intentional: icon flags "risk" amber; button drives "destructive action" red — consistent with Phase 10 destructive-edit pattern).

### Access-signal pairings (Phase 13-specific, security-critical)

Every permission-related UI element MUST pair color + icon + text label. Color alone is never the affordance (WCAG 1.4.1).

| Signal | Color | Icon | Text label |
|--------|-------|------|------------|
| Granted | success green | `CircleCheck` | `Erlaubt` |
| Denied | destructive red | `XCircle` | `Verweigert` |
| Role-inherited (admin) | success green tint | `ShieldCheck` | `Rolle: admin` |
| Role-inherited (schulleitung) | warning amber tint | `Shield` | `Rolle: schulleitung` |
| Role-inherited (lehrer/eltern/schueler) | neutral | `Users` | `Rolle: {roleName}` |
| Override-sourced | primary blue tint | `KeyRound` | `Override` |
| Active user | success green | `CircleCheck` | `Aktiv` |
| Disabled user | warning amber | `Ban` | `Deaktiviert` |
| Person-linked | primary blue | `Link2` | `Verknüpft` |
| Person-unlinked | neutral | `Link2Off` | `Nicht verknüpft` |

**Forbidden color usages (checker will reject):**
- No additional palette colors (purple, teal, pink) introduced for Phase 13.
- No color used as the sole affordance for meaning (always pair color with icon or text label — WCAG 1.4.1).
- No `text-primary` on body copy. Primary is for interactive affordances and Override source-chip only.
- No red/green on a role-chip label itself (chip background tint only — label text stays `text-foreground` or the chip's `text-{color}` pair).
- `SUBJECT_PALETTE` (Phase 11 deterministic subject coloring) MUST NOT appear anywhere in Phase 13 — no classroom-subject concept in User-Mgmt surfaces.

---

## Copywriting Contract

German UI, English API fields (Phase 1 D-15). All user-facing strings below are canonical — executor MUST use verbatim unless a checker-approved deviation is documented.

### Primary CTAs

| Surface | Copy |
|---------|------|
| `/admin/users` page header | *(no CTA — read-mostly surface, D-04)* |
| `/admin/users` empty-by-filter state | `Filter zurücksetzen` |
| User-Detail Stammdaten tab | *(no save button — read-only KC fields except Enabled-Toggle)* |
| User-Detail Stammdaten tab Enabled-Toggle action button | `Sperren` / `Reaktivieren` (state-dependent) |
| User-Detail Rollen tab sticky-save | `Änderungen speichern` |
| User-Detail Overrides section footer (add new) | `+ Override hinzufügen` |
| User-Detail Overrides section inline per-row save | `Override speichern` |
| User-Detail Person-Link section (unlinked) | `Mit Person verknüpfen` |
| User-Detail Person-Link section (linked) | `Verknüpfung ändern` |
| User-Detail Person-Link section (linked) secondary | `Verknüpfung lösen` *(variant="destructive")* |
| Link-Person Dialog primary confirm | `Verknüpfen` |
| Re-Link-After-Conflict Dialog primary confirm (2-step) | `Bestehende lösen und neu verknüpfen` *(variant="destructive")* |
| Self-Lockout WarnDialog primary confirm | `Admin-Rolle entziehen` *(variant="destructive")* |
| Disable-User WarnDialog primary confirm | `Sperren` *(variant="destructive")* |
| Enable-User WarnDialog primary confirm | `Reaktivieren` |
| Unlink-Person WarnDialog primary confirm | `Verknüpfung lösen` *(variant="destructive")* |

### Empty states

Every list + tab empty state MUST render: an icon (`text-muted-foreground`, 24px), a heading (`text-lg font-semibold`), a body line (`text-sm text-muted-foreground`), and a single primary CTA (or no CTA where deep-link-only). No illustrative SVGs in v1.1.

| Surface | Heading | Body | CTA |
|---------|---------|------|-----|
| `/admin/users` (KC returns 0 users) | `Keine User im Verzeichnis` | `Der angebundene Keycloak-Realm enthält keine User. Legen Sie Accounts in der Keycloak-Admin-Oberfläche an.` | *(no CTA — KC-lifecycle external, D-04)* |
| `/admin/users` filter yields nothing | `Keine User gefunden` | `Passen Sie die Filter an oder setzen Sie sie zurück.` | `Filter zurücksetzen` (ghost button) |
| User-Detail → Overrides section (0 overrides) | `Keine Overrides gesetzt` | `Per-User-Berechtigungen überschreiben die Rollen-Defaults. Fügen Sie einen Override hinzu, um gezielt Zugriff zu erweitern oder zu entziehen.` | `+ Override hinzufügen` |
| User-Detail → Person-Link section (unlinked) | `Nicht verknüpft` | `Dieser User ist mit keinem Lehrer-, Schüler- oder Eltern-Record verknüpft. Ohne Verknüpfung sehen rollen-basierte Personen-Views keine Daten.` | `Mit Person verknüpfen` |
| User-Detail → Permissions tab (effective-permissions query returns 0 abilities, rare edge case e.g. user has no roles and no overrides) | `Keine effektiven Berechtigungen` | `Dieser User hat weder eine Rolle noch einen Override. Weisen Sie im Tab "Rollen" eine Rolle zu.` | *(no CTA — deep-link only via tab switch)* |

### Error states (Silent-4XX-Invariante compliance)

Every mutation error MUST surface via `Toast variant="destructive"` with the copy below. Never silently swallow 4xx (see auto-memory `feedback_admin_requirements_need_ui_evidence.md` + `feedback_e2e_first_no_uat.md` + Phase 10.2-04 invariant).

| Condition | Toast title | Toast description |
|-----------|-------------|-------------------|
| 409 `PUT /admin/users/:id/roles` (Last-Admin-Guard, D-07) | `Rolle kann nicht entzogen werden` | `Mindestens ein Admin muss bestehen bleiben. Weisen Sie einem anderen User die Admin-Rolle zu, bevor Sie diese entziehen.` |
| 409 `POST /admin/users/:id/link-person` (Person-Link-Konflikt, D-14) | `Person-Verknüpfung nicht möglich` | *(toast closes; WarnDialog opens inline with `AffectedEntitiesList` + Deep-Link to conflicting entity — see destructive confirmations)* |
| 409 `POST /admin/permission-overrides` (Duplicate unique [userId,action,subject]) | `Override existiert bereits` | `Für diese Kombination aus Aktion und Ressource existiert bereits ein Override. Bearbeiten Sie den bestehenden Override statt einen neuen anzulegen.` |
| 400 validation on Role-Save (empty roleNames, unknown role) | `Speichern nicht möglich` | `Bitte prüfen Sie die ausgewählten Rollen.` |
| 400 validation on Override-Create/Update (invalid JSON, invalid action/subject, missing reason) | `Override nicht gespeichert` | `Bitte prüfen Sie die markierten Felder. Bedingungen müssen gültiges JSON sein.` *(plus inline field errors)* |
| 400 on Link-Person (invalid personType or personId) | `Verknüpfung nicht möglich` | `Bitte wählen Sie eine gültige Person aus dem Suchfeld.` |
| 403 on any mutation (non-admin user somehow reached surface) | `Aktion nicht erlaubt` | `Diese Funktion ist nur für Administratoren verfügbar.` |
| 404 on GET user detail (user deleted in KC between list-load and detail-open) | `User nicht gefunden` | `Der User wurde möglicherweise in Keycloak entfernt. Zurück zur Liste.` |
| 500 on any mutation | `Etwas ist schiefgelaufen` | `Bitte versuchen Sie es später erneut. Falls das Problem bleibt, kontaktieren Sie den System-Administrator.` |
| Network offline | `Keine Verbindung` | `Prüfen Sie Ihre Internetverbindung und versuchen Sie es erneut.` |
| Keycloak Admin API unreachable (upstream 502/503) | `Keycloak-Verzeichnis nicht erreichbar` | `Das Identity-System ist gerade nicht verfügbar. Rollen, Overrides und Verknüpfungen bleiben erreichbar; nur die User-Liste und der Enabled-Toggle benötigen Keycloak.` |
| Silent-4XX fallback (unexpected 4xx) | `Aktion nicht möglich` | `Der Server hat die Anfrage abgelehnt (Status {status}).` (Phase 10.2-04 invariant — visible test in E2E) |

### Destructive confirmations

Destructive dialogs use `WarnDialog` (Phase 10 shared). Pattern: **ActionName:ConfirmationCopy:PrimaryButtonLabel**. Primary button is `variant="destructive"` unless otherwise noted.

| Action | Dialog title | Dialog body | Confirm button | Cancel button |
|--------|-------------|-------------|----------------|---------------|
| Self-Lockout-Warn (D-06) | `Sich selbst die Admin-Rolle entziehen?` | `Du entziehst dir gerade die Admin-Rolle. Nach Speichern hast du beim nächsten Request andere Rechte. Stelle sicher, dass mindestens ein weiterer Admin existiert — andernfalls blockiert der Server diese Änderung zum Schutz des Systems.` | `Admin-Rolle entziehen` | `Abbrechen` |
| Last-Admin-Guard 409 (D-07, informational — no confirm, only close) | `Mindestens ein Admin muss bestehen bleiben` | `Weise einem anderen User die Admin-Rolle zu, bevor du diese entziehst. Siehe betroffene Entitäten unten.` + `AffectedEntitiesList` rendering the set of currently-admin userIds | `Verstanden` *(variant="default", closes dialog)* | *(no cancel — single action)* |
| Unlink-Person (D-13) | `Verknüpfung lösen?` | `Die Verknüpfung zwischen {userEmail} und {personType} {personFirstName} {personLastName} wird gelöst. Der User behält seine Rollen und Overrides, aber person-basierte Views (z.B. eigener Stundenplan) sehen ihn nicht mehr als {personType}.` | `Verknüpfung lösen` | `Abbrechen` |
| Link-Conflict Re-Link (D-14) | `Bestehende Verknüpfung ersetzen?` | `{personType} {personFirstName} {personLastName} ist bereits mit User {conflictingUserEmail} verknüpft. Um diese Verknüpfung dem neuen User zuzuweisen, muss zuerst die bestehende gelöst werden. Fortfahren?` + `AffectedEntitiesList` with conflicting user chip + Deep-Link | `Bestehende lösen und neu verknüpfen` | `Abbrechen` |
| Disable-User (D-04) | `User sperren?` | `{userFirstName} {userLastName} ({userEmail}) wird deaktiviert und kann sich nicht mehr einloggen. Bestehende Sessions bleiben bis zum Ablauf (max. 15 Minuten) aktiv. Reaktivierung jederzeit möglich.` | `Sperren` | `Abbrechen` |
| Enable-User (D-04) | `User reaktivieren?` | `{userFirstName} {userLastName} ({userEmail}) kann sich wieder einloggen.` | `Reaktivieren` *(variant="default" — not destructive)* | `Abbrechen` |
| Delete-Override (inline, no separate dialog per D-10) | *(inline confirm — 2-click pattern: first click marks row red, second click within 3s deletes. No modal.)* | *(row label changes to "Zum Bestätigen erneut klicken" for 3s)* | *(second click)* | *(click elsewhere cancels)* |

### Rolle ↔ Person-Link Konsistenz InfoBanner (D-08)

Shown at top of Rollen-Tab when divergence detected. Uses `InfoBanner` with variant `warning` (amber).

| Condition | InfoBanner body |
|-----------|-----------------|
| User has `lehrer` role but no TEACHER-person-link | `Tipp: Dieser User hat die Lehrer-Rolle, ist aber nicht mit einem Lehrer-Record verknüpft. Wechseln Sie zum Tab "Overrides & Verknüpfung", um eine Lehrkraft zuzuordnen.` |
| User has `schueler` role but no STUDENT-person-link | `Tipp: Dieser User hat die Schüler-Rolle, ist aber nicht mit einem Schüler-Record verknüpft. Wechseln Sie zum Tab "Overrides & Verknüpfung", um einen Schüler zuzuordnen.` |
| User has `eltern` role but no PARENT-person-link | `Tipp: Dieser User hat die Eltern-Rolle, ist aber nicht mit einem Eltern-Record verknüpft. Wechseln Sie zum Tab "Overrides & Verknüpfung", um eine:n Erziehungsberechtigte:n zuzuordnen.` |
| Multiple divergences | Concatenate with `<br/>` separator, max 3 lines shown; remaining roll into a "…weitere" summary line. |

**No divergence InfoBanner for `admin` or `schulleitung` roles** — these roles do not imply person-link expectations per D-08.

### Inline micro-copy (not destructive, but load-bearing)

| Context | Copy |
|---------|------|
| Filter-bar search placeholder | `Name oder E-Mail …` |
| Filter-bar Rolle multi-select placeholder | `Alle Rollen` |
| Filter-bar Rolle pseudo-option | `Ohne Rolle` |
| Filter-bar Linked-Status toggle labels | `Alle` / `Verknüpft` / `Nicht verknüpft` |
| Filter-bar Enabled-Toggle labels | `Alle` / `Aktiv` / `Deaktiviert` |
| User-List Nachname column header | `Nachname` |
| User-List Vorname column header | `Vorname` |
| User-List Email column header | `E-Mail` |
| User-List Rollen column header | `Rollen` |
| User-List Verknüpft-mit column header | `Verknüpft mit` |
| User-List Status column header | `Status` |
| User-List row-action menu label | `Aktionen` |
| User-List row-action: Detail | `Öffnen` |
| User-List row-action: Disable | `Sperren` |
| User-List row-action: Enable | `Reaktivieren` |
| User-Detail PageShell subtitle | `Keycloak-User · {userId}` *(shortened to first 8 chars)* |
| Tab 1 label | `Stammdaten` |
| Tab 2 label | `Rollen` |
| Tab 3 label | `Berechtigungen` |
| Tab 4 label | `Overrides & Verknüpfung` |
| Stammdaten-Tab read-only field labels | `Vorname` / `Nachname` / `E-Mail` / `Benutzername` / `Erstellt am` / `Status` |
| Rollen-Tab Checkbox-List section title | `Rollen zuweisen` |
| Rollen-Tab each-role label format | `{displayName}` + `{description}` (muted-foreground below) |
| Permissions-Tab section title | `Effektive Berechtigungen` |
| Permissions-Tab subject-group accordion header format | `{subject} · {count} Abilities` |
| Permissions-Tab row-column headers | `Aktion` / `Status` / `Quelle` / `Bedingungen` |
| Permissions-Tab `conditions === null` cell | `—` *(em-dash, muted-foreground)* |
| Permissions-Tab interpolated-condition preview header | `Aufgelöst:` |
| Overrides-Section title | `Per-User-Overrides` |
| Overrides-Row Action-Select placeholder | `Aktion wählen …` |
| Overrides-Row Subject-Select placeholder | `Ressource wählen …` |
| Overrides-Row Granted/Denied switch labels | `Erlaubt` / `Verweigert` |
| Overrides-Row Reason input label | `Begründung` *(required)* |
| Overrides-Row Reason input placeholder | `z.B. Vertretungs-Admin während Sommerferien 2026` |
| Overrides-Row Conditions panel toggle | `Erweitert: Bedingungen` |
| Overrides-Row Conditions panel placeholder | `{ "userId": "{{ id }}" }` *(muted-foreground)* |
| Conditions variable-hint line | `Variablen: {{ id }} → Keycloak-User-ID. Weitere Interpolationen folgen in späteren Phasen.` |
| Conditions JSON invalid-parse error | `Kein gültiges JSON` |
| Conditions JSON empty | `Keine Bedingungen (ability gilt uneingeschränkt)` |
| Person-Link Section title | `Person-Verknüpfung` |
| Person-Link unlinked body | `Nicht verknüpft` |
| Person-Link linked body format | `Verknüpft mit {personTypeLabel} {firstName} {lastName}` |
| Person-Link personTypeLabel | `Lehrkraft` / `Schüler:in` / `Erziehungsberechtigte:n` |
| Person-Link Dialog title | `Mit Person verknüpfen` |
| Person-Link Dialog Person-Type radio labels | `Lehrkraft` / `Schüler:in` / `Erziehungsberechtigte:n` |
| Person-Link Dialog search placeholder | `Nachname eingeben (min. 2 Zeichen) …` |
| Person-Link Dialog search empty-result | `Keine Treffer. Prüfen Sie den Namen oder legen Sie die Person in der jeweiligen Verwaltung an.` |
| Person-Link Dialog already-linked enrichment hint (per row in autocomplete) | `Bereits verknüpft mit {conflictingUserEmail}` *(muted, in red text if current search would conflict)* |
| JWT-Refresh hint (bottom of Rollen-Tab) | `Änderungen wirken spätestens nach erneutem Login vollständig (typisch innerhalb von 15 Minuten).` |
| Mobile StickyMobileSaveBar discard | `Verwerfen` |
| UnsavedChangesDialog title | `Ungespeicherte Änderungen` |
| UnsavedChangesDialog body | `Sie haben Änderungen in diesem Tab, die nicht gespeichert sind. Möchten Sie den Tab trotzdem verlassen?` |
| UnsavedChangesDialog confirm | `Verwerfen und wechseln` |
| Sidebar group label | `Zugriff & Berechtigungen` |
| Sidebar entry label | `User` |
| Loading skeleton description (screen-reader aria-label) | `Lade User-Daten …` |
| Pagination "showing" label | `{from}–{to} von {total}` |
| Pagination page-size selector | `Pro Seite: {n}` |

---

## Component Inventory

### Reused from Phase 10/11/12 (no changes required)

| Component | Source | Used in Phase 13 |
|-----------|--------|------------------|
| `PageShell` | `components/admin/shared/` | Both new routes (`/admin/users`, `/admin/users/$userId`) |
| `UnsavedChangesDialog` | shared | User-Detail tab switching (Rollen-Tab + Overrides+Person-Link merged tab) |
| `StickyMobileSaveBar` | shared | Rollen-Tab on `<640px`; Override-Editor uses per-row inline save (no sticky bar) |
| `InfoBanner` | shared | Rolle ↔ Person-Link Konsistenz-Hinweis (D-08), JWT-Refresh-Hinweis (D-05) |
| `WarnDialog` | shared | Self-Lockout, Last-Admin-Guard 409, Unlink-Person, Link-Conflict Re-Link, Disable-User |
| `AffectedEntitiesList` | `components/admin/teacher/` | Extend `kind` union with: `'user' \| 'person-teacher' \| 'person-student' \| 'person-parent'` (Phase 13 adds — see D-14 and CONTEXT §Integration Points) |
| Tailwind utilities + existing CSS vars | `app.css` | All styling |

### shadcn primitives required

**Planner MUST verify at Wave 0 and run `npx shadcn add {missing}` if absent.** Glob findings: `accordion` is **MISSING** in `components/ui/` and MUST be installed for the Effective-Permissions subject-group accordion (D-09). `command` + `checkbox` are present (installed in Phase 12).

| Primitive | Used for | Present? |
|-----------|----------|----------|
| `tabs` | User-Detail (4 tabs) | YES |
| `dialog` | Link-Person, Re-Link-After-Conflict, Last-Admin-Guard, Self-Lockout, Disable/Enable, Unlink | YES |
| `input` | Search, Reason, Conditions textarea | YES |
| `textarea` | Conditions-JSON editor (with `font-mono` utility) | YES *(verify via `ls components/ui/textarea.tsx`)* |
| `select` | Filter-bar Rolle multi-select, Override-Row Action-Select, Override-Row Subject-Select | YES |
| `button` | All actions | YES |
| `card` | Override-Row container, Person-Link Card, Effective-Permissions subject-group body, mobile list-cards | YES |
| `label` | Form labels | YES |
| `popover` | Autocomplete search host in Link-Person dialog | YES |
| `dropdown-menu` | User-List row-action menu | YES |
| `command` | Person-search autocomplete in Link-Person dialog (Teacher/Student/Parent) | YES *(installed Phase 12)* |
| `checkbox` | Rollen-Tab Rolle-Checkbox-Liste, Filter-bar Rolle multi-select items | YES *(installed Phase 12)* |
| `badge` | Role-chip, Source-chip, Status-badge, Already-linked enrichment-chip | YES |
| `switch` | Granted/Denied toggle in Override-Row, Enabled-Toggle in Stammdaten-Tab | YES |
| `accordion` | Effective-Permissions subject-group accordion | **MISSING — install at Wave 0** |
| `collapsible` | Override-Row Conditions panel (D-11) | YES |
| `radio-group` | Person-Link Dialog Person-Type selector (Teacher/Student/Parent) | *(verify via `ls components/ui/radio-group.tsx`; if missing, **install at Wave 0**)* |
| `separator` | Tab 4 divider between Overrides-Section and Person-Link-Section | YES |
| `sonner` / toast | Silent-4XX toast invariant | YES *(Phase 10 established)* |

### New Phase-13 components (executor creates)

| Component | File | Responsibility |
|-----------|------|----------------|
| `UserListTable` | `components/admin/user/UserListTable.tsx` | Desktop dense table with filter-bar, row-action menu, pagination, row-click-to-detail |
| `UserMobileCards` | `components/admin/user/UserMobileCards.tsx` | `<640px` stacked cards with row-action dropdown and status-chip |
| `UserFilterBar` | `components/admin/user/UserFilterBar.tsx` | Search + Rolle multi-select + Linked-Status toggle + Enabled-Toggle + `Filter zurücksetzen` |
| `UserDetailTabs` | `components/admin/user/UserDetailTabs.tsx` | 4-tab container (Stammdaten / Rollen / Berechtigungen / Overrides & Verknüpfung) with per-tab dirty-state integration |
| `UserStammdatenTab` | `components/admin/user/UserStammdatenTab.tsx` | Read-only KC fields + Enabled-Toggle with WarnDialog (Disable/Enable) |
| `UserRolesTab` | `components/admin/user/UserRolesTab.tsx` | Checkbox-List of 5 roles from `prisma.role.findMany()` + Self-Lockout-Warn wiring + Konsistenz-InfoBanner (D-08) + JWT-Refresh hint |
| `EffectivePermissionsTab` | `components/admin/user/EffectivePermissionsTab.tsx` | Subject-group Accordion container with source-attribution + conditions preview (D-09) |
| `EffectivePermissionsRow` | `components/admin/user/EffectivePermissionsRow.tsx` | Single ability row: action-badge + granted/denied + source-chip + conditions cell |
| `OverridesPersonLinkTab` | `components/admin/user/OverridesPersonLinkTab.tsx` | Merged Tab 4: Overrides-Section (top) + Separator + Person-Link-Section (bottom) |
| `OverridesSection` | `components/admin/user/OverridesSection.tsx` | Row-add-list container + `+ Override hinzufügen` footer button |
| `OverrideRow` | `components/admin/user/OverrideRow.tsx` | Per-row Card: Action/Subject/Granted-Switch/Reason/Conditions-Collapsible/Delete (inline 2-click confirm) |
| `ConditionsJsonEditor` | `components/admin/user/ConditionsJsonEditor.tsx` | Textarea (`font-mono`) with Zod-validation inline-error + Variable-Hints footer |
| `PersonLinkSection` | `components/admin/user/PersonLinkSection.tsx` | Read-state Card with linked/unlinked body + action buttons (`Verknüpfung ändern` / `Verknüpfung lösen`) |
| `LinkPersonDialog` | `components/admin/user/LinkPersonDialog.tsx` | Dialog with Person-Type radio group + PersonAutocompletePopover + Confirm |
| `PersonAutocompletePopover` | `components/admin/user/PersonAutocompletePopover.tsx` | Command-popover switches backing search hook based on selected personType (`useTeacherSearch` / `useStudentSearch` / `useParentSearch`); enrichment-chip for already-linked results |
| `ReLinkConflictDialog` | `components/admin/user/ReLinkConflictDialog.tsx` | WarnDialog variant: 409 Person-Link conflict with 2-step re-link + `AffectedEntitiesList` (kind='user') |
| `SelfLockoutWarnDialog` | `components/admin/user/SelfLockoutWarnDialog.tsx` | WarnDialog wrapper for D-06 self-un-admin scenario |
| `LastAdminGuardDialog` | `components/admin/user/LastAdminGuardDialog.tsx` | Error-state Dialog shown when 409 last-admin-guard returns; renders `AffectedEntitiesList` (kind='user') with list of current admins |
| `DisableUserDialog` + `EnableUserDialog` | `components/admin/user/DisableUserDialog.tsx` / `EnableUserDialog.tsx` | WarnDialog wrappers for Enabled-Toggle confirm |
| `UnlinkPersonDialog` | `components/admin/user/UnlinkPersonDialog.tsx` | WarnDialog wrapper for Person-Unlink confirm |
| `RoleChip` | `components/admin/user/RoleChip.tsx` | Badge variant with icon + role-display-name, color-coded per Access-signal pairings (admin=green, schulleitung=amber, others=neutral) |
| `SourceChip` | `components/admin/user/SourceChip.tsx` | Badge variant for Effective-Permissions source column (`Rolle: {name}` / `Override`) |
| `StatusBadge` (user-status) | `components/admin/user/StatusBadge.tsx` | Aktiv (green) / Deaktiviert (amber) with icon + label |

### Icon inventory (lucide-react, canonical)

| Concept | Icon |
|---------|------|
| Sidebar group "Zugriff & Berechtigungen" | `ShieldCheck` |
| Sidebar entry "User" | `UserCircle` |
| User-List header / empty state | `UsersRound` |
| Overrides / KeyRound | `KeyRound` |
| Person-Verknüpfung (linked) | `Link2` |
| Person-Verknüpfung (unlinked / unlink-action) | `Link2Off` |
| Granted | `CircleCheck` |
| Denied | `XCircle` |
| Role: admin | `ShieldCheck` |
| Role: schulleitung | `Shield` |
| Role: lehrer/eltern/schueler | `Users` |
| Status: Aktiv | `CircleCheck` |
| Status: Deaktiviert | `Ban` |
| Search | `Search` |
| Filter | `SlidersHorizontal` |
| Row-More-Menu | `MoreHorizontal` |
| Add Override | `Plus` |
| Delete Override (row hover) | `Trash2` |
| Expand Accordion / Collapsible | `ChevronDown` / `ChevronRight` |
| Warning / Self-Lockout | `TriangleAlert` |
| Info | `Info` |
| Close dialog | `X` |
| Deep-link external indicator | `ArrowRight` |
| Copy userId (Stammdaten-Tab helper, future enhancement) | `Copy` |

**Icon size rule:** 16px (`h-4 w-4`) inline with body text; 20px (`h-5 w-5`) as standalone row-action button child; 24px (`h-6 w-6`) in empty-state headers. Icon color `text-muted-foreground` by default; `text-primary` ONLY on the active tab trigger, Override source-chip, or deep-link text; `text-success` on Granted + Aktiv + role-admin chip; `text-warning` on Deaktiviert + role-schulleitung chip + Konsistenz-Hinweis InfoBanner; `text-destructive` on Denied + Unlink-action button hover + destructive confirm buttons.

---

## Responsive / Layout Contract

### Breakpoints (Tailwind 4 defaults, inherited from Phase 12)

| Breakpoint | Min-width | Phase 13 behavior |
|-----------|-----------|-------------------|
| Mobile | 0–639px | Mandatory target: **375px** (MOBILE-ADM-02). List → stacked Cards. Filter-bar collapses into bottom-sheet. Tabs horizontally scrollable. Sticky save bar bottom in Rollen-Tab. Override-rows stack vertically. Accordion in Permissions-Tab retains sticky group-headers. |
| Tablet | 640–1023px | Two-column form where space allows. Lists remain table. Override-rows remain horizontally laid out. |
| Desktop | 1024px+ | Default layout, 4-control filter-bar in single row, full table density, Override-rows horizontal. |

### Per-surface layout rules

**`/admin/users` (list)**

- Desktop (≥1024px): full-width dense table; Filter-bar sticky at top of content area; 6 columns: Nachname | Vorname | E-Mail | Rollen | Verknüpft mit | Status | *(row-action menu as "…" button in last cell, right-aligned)*. Pagination at bottom-right, `25` per page default. Default sort: Nachname ASC.
- Tablet (640–1023px): full-width table; Filter-bar 2-row layout (search on row 1; 3 toggles on row 2).
- Mobile 375: stacked Cards per row; Filter-bar collapses behind a `SlidersHorizontal` button opening a bottom-sheet Dialog; row-click → Detail-Page. Each card shows: Nachname+Vorname (heading), E-Mail (muted body), Rollen (chip-list, max 3 visible + `+N` overflow), Status-badge, Verknüpft-mit chip if linked, `…` row-action button at top-right.
- Empty state (no KC users at all) per Copywriting Contract — no CTA (KC-lifecycle external).
- Empty state by filter — `Filter zurücksetzen` ghost button.

**`/admin/users/$userId` (4 tabs)**

- Desktop: horizontal Tabs row under PageShell title (PageShell subtitle shows `{firstName} {lastName} · {email}`).
- Mobile 375: Tabs row becomes horizontally scrollable (no wrap); active indicator remains blue primary bar.
- Form column count: 2 on `≥1024px` in Stammdaten tab (read-only fields arranged in 2 columns); 1 on `<1024px`.
- `StickyMobileSaveBar` visible only on `<640px` and only in Rollen-Tab. Overrides use per-row inline save buttons instead of a global save-bar.

**Stammdaten-Tab (Tab 1)**

- Read-only KC fields in 2-column grid (desktop): `Vorname` / `Nachname` / `E-Mail` / `Benutzername` / `Erstellt am` / `User-ID (short)`.
- Enabled-Toggle lives in its own `Card` at the bottom with label `Account-Status` + Switch + action button (`Sperren` or `Reaktivieren` depending on current state).
- No dirty-state tracking (no save bar) — Enabled-Toggle uses optimistic mutation with WarnDialog confirm before firing.

**Rollen-Tab (Tab 2)**

- Single column. InfoBanner (Konsistenz-Hinweis, amber) at top if divergence detected.
- `Rollen zuweisen` card: 5 checkbox-rows (one per Role from `prisma.role.findMany()`). Each row: `Checkbox` + `displayName` (label) + `description` (muted body below). Row height `min-h-11` on mobile.
- `JWT-Refresh hint` InfoBanner (amber, subtle variant) at bottom of card.
- StickyMobileSaveBar on mobile; desktop inline `Änderungen speichern` + `Verwerfen` bottom-right.
- Self-Lockout-Warn fires when user un-ticks `admin` on own userId — WarnDialog intercepts save action.

**Berechtigungen-Tab (Tab 3)**

- Single column, full-width.
- Top: section title "Effektive Berechtigungen" + small `RefreshCw` icon button (manual refetch, no dirty state).
- Accordion container: one `AccordionItem` per `subject`. Default state: all collapsed except the first subject.
- Accordion header row: `{subject}` (label-weight) + `{count} Abilities` (muted-foreground, tabular-nums) + ChevronDown.
- Accordion panel body: dense table with columns `Aktion | Status | Quelle | Bedingungen`.
  - Aktion column: `Badge` with action name.
  - Status column: `CircleCheck` / `XCircle` icon + text label (`Erlaubt` / `Verweigert`), color-coded.
  - Quelle column: `SourceChip` (`Rolle: {name}` or `Override`).
  - Bedingungen column: compact `{"key":"value"}` preview OR `—` if null. Long JSONs truncate with `…` + tooltip/expandable showing full interpolated form under header `Aufgelöst:`.
- Mobile 375: Accordion header sticky at top of scroll area when panel is open; rows stack vertically with stacked label-value pairs (Action label + badge, then Status label + icon+text, then Quelle label + chip, then Bedingungen label + JSON preview). Subject-group-header remains visible.

**Overrides & Verknüpfung-Tab (Tab 4, merged per D-15)**

- Two sections separated by `Separator`:
  1. **Overrides-Section (top)** — flex-column of `OverrideRow` cards + `+ Override hinzufügen` footer button.
     - Each `OverrideRow` is a `Card` with inner padding `p-4`. Desktop layout: row-internal grid `grid-cols-[auto_auto_auto_1fr_auto_auto]` → Action-Select | Subject-Select | Granted/Denied-Switch | Reason-Input | Collapsible-Toggle | Delete-Icon. Mobile: stacked vertically with Conditions collapsible at bottom.
     - Each row owns its own dirty-state and inline `Speichern` button (appears when dirty); no global StickyMobileSaveBar for this section.
     - Delete uses inline 2-click confirm pattern (click 1: row flashes `bg-destructive/10` + label "Zum Bestätigen erneut klicken"; click 2: mutation fires). No modal.
     - 409 duplicate-unique on Save → Toast "Override existiert bereits" (see Error states table).
  2. **Person-Link-Section (bottom)** — `Card` showing current link state + action buttons.
     - Unlinked state: icon `Link2Off` + heading "Nicht verknüpft" + body + CTA `Mit Person verknüpfen`.
     - Linked state: icon `Link2` + sentence `Verknüpft mit {personTypeLabel} {firstName} {lastName}` + deep-link `ArrowRight` to `/admin/{teachers|students|parents}/$id` + action buttons `Verknüpfung ändern` (primary) / `Verknüpfung lösen` (destructive ghost).
- Mobile: both sections full-width; `+ Override hinzufügen` becomes full-width button.

### Touch target floor (MOBILE-ADM-02 hard rule)

- All interactive elements on `<640px`: **min 44×44 px**. This includes:
  - Filter-bar toggles (Linked/Enabled): `min-h-11`.
  - Role-checkboxes in Rollen-Tab: `h-11 w-11` tap area around visually-smaller (20px) Checkbox.
  - Tab triggers: `min-h-11`.
  - Dropdown-menu triggers, popover triggers, accordion triggers: `min-h-11 min-w-11`.
  - Icon-only row actions: `size="icon"` button variant = 44px on mobile.
  - Granted/Denied Switch: min tap zone `h-11 w-11` (Switch itself remains standard shadcn size).
- Form inputs: `min-h-11` (44px) on mobile; desktop may use `h-9` (36px).

---

## Interaction Choreography (key flows)

### Silent-4XX-Invariante (every mutation)

1. `useMutation({ onError: (err) => toast.error(...) })` — explicit, verifiable in code review.
2. Never `.catch(() => undefined)` in UI code.
3. E2E (`silent-4xx.spec.ts`-style) pattern codified for each of the 11 Phase-13 specs (D-16): assert on forced 4xx the user sees a red toast OR a red inline error; assert absence of green success-toast on the same action.

### Pro-Tab-Save with UnsavedChangesDialog

1. Rollen-Tab and Overrides+Person-Link tab each own a Zustand slice: `tabXYZDirty: boolean`.
2. Stammdaten-Tab has no dirty state (Enabled-Toggle uses WarnDialog confirm).
3. Permissions-Tab is read-only (no dirty state).
4. On tab-change with `dirty === true`, show `UnsavedChangesDialog` (copy above).
5. On dialog confirm (`Verwerfen und wechseln`): reset form, navigate.
6. Mobile sticky save bar mirrors desktop buttons on Rollen-Tab only.

### Role-Save with Self-Lockout-Warn + Last-Admin-Guard (D-05 + D-06 + D-07)

1. User toggles one or more checkboxes in Rollen-Tab. Sticky-save-bar (`Änderungen speichern` | `Verwerfen`) appears when dirty.
2. **Pre-save client-side check:** if `userId === currentUser.id` AND `admin` was previously in UserRoles AND is now unticked → open `SelfLockoutWarnDialog` (amber TriangleAlert icon). 
   - On confirm: proceed to save.
   - On cancel: re-tick the `admin` checkbox, dismiss save-bar.
3. **Save request:** `PUT /admin/users/:userId/roles { roleNames }`.
4. **Backend Last-Admin-Guard (D-07)** may respond 409 RFC 9457 `schoolflow://errors/last-admin-guard`.
   - Frontend catches 409 → renders `LastAdminGuardDialog` with copy + `AffectedEntitiesList` (kind='user') listing current admin users.
   - Dialog has single `Verstanden` button that closes; checkbox state is reverted to pre-save on dismiss.
5. On 200 success: green toast "Rollen aktualisiert"; invalidate queries `['user-roles', userId]` + `['users', ...filters]` + `['effective-permissions', userId]`.
6. If user just un-assigned `lehrer/schueler/eltern` and there was a matching Person-Link → Konsistenz-InfoBanner updates state (may disappear if divergence cleared, may appear if new divergence).

### Override CRUD (D-10 + D-11)

1. **Create:** click `+ Override hinzufügen` → new empty `OverrideRow` card appears at end of list, focused on Action-Select.
2. User picks Action, Subject, toggles Granted/Denied, enters Reason. Optionally expands Conditions and enters JSON.
3. Row becomes dirty → inline `Speichern` button appears at bottom-right of card.
4. Click `Speichern`:
   - Zod validates Conditions JSON client-side (throws inline error below textarea if invalid).
   - Reason validated non-empty (inline error if empty).
   - Mutation fires `POST /admin/permission-overrides` → 201 Created or 409 Duplicate.
   - 409 → Toast "Override existiert bereits" (see Error states) → card stays editable.
   - 201 → green toast "Override gespeichert" + card transitions to non-dirty state + invalidate `['permission-overrides', userId]` + `['effective-permissions', userId]`.
5. **Edit:** user changes any field → row becomes dirty → `Speichern` button appears → `PUT /admin/permission-overrides/:id` on submit. Same validation + toast pattern.
6. **Delete (inline 2-click):**
   - Click 1 on row-trash icon: row flashes `bg-destructive/10` for 3s, trash-icon label changes to "Zum Bestätigen erneut klicken".
   - Click 2 within 3s on same trash: `DELETE /admin/permission-overrides/:id` fires. 200 → green toast "Override gelöscht" + row fades out + invalidate.
   - Click elsewhere or 3s timeout: row reverts to neutral state, no mutation.

### Enabled-Toggle with WarnDialog (D-04)

1. User clicks `Sperren` button in Stammdaten-Tab Account-Status card.
2. `DisableUserDialog` opens → user confirms `Sperren`.
3. `PUT /admin/users/:userId/enabled { enabled: false }` fires (optimistic UI: Switch moves to off immediately).
4. On error: revert Switch, Toast variant="destructive" per Error states table.
5. On success: green toast "User gesperrt", Status-badge updates to amber "Deaktiviert" + invalidate `['users', ...filters]` + `['user', userId]`.
6. Reactivate: mirror flow with `EnableUserDialog`.

### Person-Link Flow (D-13 + D-14)

1. **Unlinked → Link:** user clicks `Mit Person verknüpfen` → `LinkPersonDialog` opens.
2. Dialog: Person-Type radio-group (Teacher/Student/Parent) + `PersonAutocompletePopover`.
3. User selects Person-Type → backing hook switches (`useTeacherSearch` / `useStudentSearch` / `useParentSearch`).
4. User types ≥2 chars (debounce 300ms, consistent with Phase 11/12) → results appear.
5. Each result row: `{firstName} {lastName}` + `{email or className}`; enrichment-chip `Bereits verknüpft mit {userEmail}` (red-subtle text) if already linked.
6. User picks a result → Confirm button `Verknüpfen` enables.
7. Click Confirm → `POST /admin/users/:userId/link-person { personType, personId }`.
8. **409 Conflict (D-14):** backend returns RFC 9457 `schoolflow://errors/person-link-conflict` with `affectedEntities`.
   - Frontend closes LinkPersonDialog → opens `ReLinkConflictDialog` (WarnDialog variant, destructive).
   - Dialog body: copy per Copywriting Contract + `AffectedEntitiesList` (kind='user' or kind='person-*' per server payload) + deep-link to conflicting entity.
   - User clicks `Bestehende lösen und neu verknüpfen` (destructive):
     - Stage 1: `DELETE /admin/users/:userId/link-person` on the conflicting user OR `DELETE /admin/{teachers|students|parents}/:id/keycloak-link` (whichever side the conflict is on — server decides via 409 payload hint).
     - Stage 2: retry `POST /admin/users/:userId/link-person`.
     - Both stages optimistic with progress indicator inside dialog; on intermediate error, stop + toast.
   - On full success: green toast "Verknüpfung aktualisiert" + invalidate all Person-Link queries across both users.
9. **Linked → Change-Link:** same flow, but dialog title becomes `Verknüpfung ändern` and confirm becomes `Verknüpfung übernehmen`.
10. **Linked → Unlink:** click `Verknüpfung lösen` → `UnlinkPersonDialog` (WarnDialog destructive) → confirm → `DELETE /admin/users/:userId/link-person` → invalidate.

### Effective-Permissions View (D-09, read-only)

1. Tab 3 loads → `GET /admin/users/:userId/effective-permissions` fires.
2. Response: flat list with `{ action, subject, granted, source: { kind: 'role' | 'override', name?: string }, conditions: Record | null, interpolatedConditions?: Record }`.
3. Frontend groups by `subject` → builds Accordion items.
4. Default: first AccordionItem expanded; subsequent collapsed.
5. User can expand any subject → dense table renders rows.
6. Clicking a row does nothing (read-only); clicking source-chip `Override` deep-links to the matching `OverrideRow` in Tab 4 (scrolls into view + flashes `ring-primary` for 1s).
7. Conditions cell:
   - `null` → `—` (em-dash, muted).
   - non-null: shows compact `{ "userId": "{{ id }}" }`; hover/tap shows tooltip/expanded with `Aufgelöst:` label + `interpolatedConditions` rendered.
8. Refetch via `RefreshCw` button (re-runs the query, no UI-state dirty).

### Sidebar Integration

1. New sidebar group **"Zugriff & Berechtigungen"** inserted between "Personal & Fächer" and "Solver & Operations" in both `AppSidebar.tsx` and `MobileSidebar.tsx`.
2. Group icon: `ShieldCheck`.
3. Role-gating: `roles: ['admin']` only (stricter than "Personal & Fächer" which is `['admin', 'schulleitung']`). Schulleitung does NOT see this group.
4. Single entry: `User` → `/admin/users`, icon `UserCircle`.
5. Active state follows existing sidebar-active-indicator pattern (blue primary underline/dot).

---

## Registry Safety

`components.json` declares shadcn official only. No third-party registries introduced in Phase 13. No MCP tool usage for registry install beyond `npx shadcn add`.

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | `accordion` (install at Wave 0 — MISSING), `radio-group` (verify at Wave 0, install if missing), `tabs`, `dialog`, `input`, `textarea`, `select`, `button`, `card`, `label`, `popover`, `dropdown-menu`, `command`, `checkbox`, `badge`, `switch`, `collapsible`, `separator`, `sonner` | Not required (official) |
| Third-party | — (none declared) | Not applicable |

If a future task requires a third-party block, it MUST re-trigger the ui-researcher gate per `<design_contract_questions>` in the agent spec.

---

## Accessibility Contract (non-negotiable)

Basis for DSGVO audit alignment + EN 301 549 reasonable conformance targets for education sector. Phase 13 surfaces are security-critical — a11y defects here are higher-severity than on pure read surfaces.

- **Keyboard nav:** All row-actions reachable via `Tab`; `Enter` opens detail; `Space` toggles checkbox/switch; `Esc` closes dialogs and collapses accordions. No trap in popovers or Conditions-JSON textarea (verified in E2E).
- **Screen-reader labels:** Every icon-only button has `aria-label` in German (e.g. `User sperren`, `Override löschen`, `Verknüpfung lösen`, `Erweiterte Bedingungen umschalten`). Every form input has visible `<label>` via `Label` primitive.
- **Focus ring:** Always visible (uses `--color-ring` which resolves to primary). Never `outline: none` without replacement.
- **Color + text + icon triad:** All permission signals pair color + icon + text label (Granted + green + `CircleCheck` + `Erlaubt`; Denied + red + `XCircle` + `Verweigert`; Override + blue + `KeyRound` + `Override`; Role: admin + green + `ShieldCheck` + `Rolle: admin`). No single-channel affordance.
- **Contrast:** All foreground/background pairs meet WCAG AA (body text 4.5:1; non-text UI 3:1). Existing CSS variable palette validated in Phase 10-12.
- **Switch with label:** Granted/Denied Switch in Override-Row has both `aria-label="Status"` AND a visible text label (`Erlaubt` / `Verweigert`) to prevent screen-reader ambiguity.
- **Accordion a11y:** `aria-expanded` state correct; accordion header uses native `<button>` with `aria-controls` pointing at panel id. Keyboard: Enter/Space toggles.
- **Conditions JSON editor:** `aria-describedby` pointing at variable-hint + error-message containers; syntax errors announced as live-region updates.
- **Dialogs:** `role="dialog"` + `aria-labelledby` pointing at DialogTitle + initial focus on first input or cancel button per shadcn default. Self-Lockout-Warn and Last-Admin-Guard dialogs: initial focus on `Abbrechen`/`Verstanden` (safe default, prevents accidental Enter-confirm).
- **Autocomplete popover:** `role="combobox"` on input, `role="listbox"` on results, each result `role="option"` with `aria-selected`. Keyboard: Arrow keys navigate, Enter selects, Esc closes.
- **Table headers:** `<th scope="col">` on both User-List and Effective-Permissions sub-tables.
- **Empty states:** Heading has `role="heading" aria-level="3"` for proper document structure.

---

## Ambiguity / Inherits flags

Areas deliberately NOT pinned; planner/executor to confirm via Glob against existing admin pattern or escalate.

| Area | Status | Action |
|------|--------|--------|
| Loading skeleton exact shape per tab (4 tabs) | inherits from Phase 10/11/12 admin pattern — planner/executor to confirm via Glob (`components/admin/**/Skeleton*`) | default: shimmering rows matching table columns / label placeholders |
| Toast library (sonner vs shadcn `toast`) | inherits — already chosen in Phase 10 | use whatever Phase 11/12 `teachers.$teacherId.tsx` + `students.$studentId.tsx` already use (`sonner` per `components/ui/sonner.tsx` presence) |
| Avatar presence on user-list rows | discretion — v1.1 has no avatar storage | Do NOT render avatars; use monogram-circles from initials if desired, else omit |
| Empty-state illustration presence | explicitly NO in v1.1 | text-only empty states only |
| Dark mode variants | explicitly NOT in v1.1 | must not introduce new `dark:*` classes |
| User-search debounce interval | discretion | 300 ms (consistent with Phase 11/12) |
| Person-autocomplete min-length | discretion | 2 characters (consistent with Phase 11 D-08) |
| Pagination page-size options | discretion | `10 / 25 / 50 / 100`; default 25 (KC `max=25` matches) |
| Conditions-JSON syntax-highlighting (Monaco vs plain textarea) | explicitly plain `textarea` with `font-mono` (D-11 discretion — Monaco deferred to v1.2 if reciprocal demand emerges) | plain textarea + Zod-validation + Variable-Hints below |
| Autocomplete-Popover "already-linked" enrichment data source | inherits Phase 11 D-08 pattern (`alreadyLinkedToPersonId` in search response) | backend extends search responses for Teacher + Student + Parent analogously |
| Source-chip "Override" color | locked at primary-blue tint | do not deviate |
| Role-chip color-coding thresholds (admin=green, schulleitung=amber) | locked per Access-signal pairings | Do not introduce a role-specific palette beyond the 3 tiers (privileged=green, secondary=amber, neutral=grey) |
| "Last-Admin-Guard" count display (how many admins currently?) in guard-dialog | discretion | Show count inline as "Aktuell gibt es {count} Admin{count===1?'':'s'} im System." above `AffectedEntitiesList` |
| Empty-Rollen display on User-List "Rollen" column | discretion | Show em-dash `—` (muted) — NOT the "Ohne Rolle" pseudo-chip (pseudo-chip is filter-bar-only concept) |
| Cache invalidation granularity after Override-CRUD | discretion | Invalidate only `['permission-overrides', userId]` + `['effective-permissions', userId]` (not full `['users']` list) |
| Handling of Keycloak-Admin-API downtime (graceful degradation) | discretion | Show error toast per Error states table; render User-List empty with `Keycloak-Verzeichnis nicht erreichbar` banner; Rollen/Overrides/Person-Link tabs remain usable on stored userIds |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS (CTAs + empty states + error toasts + destructive confirmations + inline micro-copy — all German, verbatim, covering 11 E2E-covered flows)
- [ ] Dimension 2 Visuals: PASS (26-component new inventory + existing shared reuse + icon inventory + layout per breakpoint documented)
- [ ] Dimension 3 Color: PASS (60/30/10 + primary reserved-for + destructive reserved-for + success reserved-for + warning reserved-for + Access-signal pairings triad)
- [ ] Dimension 4 Typography: PASS (4 sizes, 2 weights, line heights declared, monospace scoped to Conditions-JSON only)
- [ ] Dimension 5 Spacing: PASS (8-point scale + mobile 44px touch-target floor; all card-padding values stay on the declared scale)
- [ ] Dimension 6 Registry Safety: PASS (shadcn official only; `accordion` + `radio-group` install flagged for Wave 0)

**Approval:** pending

---

## UI-SPEC COMPLETE

**Phase:** 13 — User- und Rechteverwaltung
**Design System:** shadcn/ui default-style + neutral base + CSS variables (detected from existing `apps/web/components.json` + `apps/web/src/app.css`)

### Contract Summary
- Spacing: 8-point scale (4, 8, 16, 24, 32, 48) + mobile 44px touch-target floor
- Typography: 4 sizes (14, 14, 18, 24), 2 weights (400, 600), Inter; monospace scoped to Conditions-JSON editor
- Color: 60 white / 30 card-neutral / 10 blue primary; destructive red, success green, warning amber — each with explicit reserved-for lists; security-critical Access-signal pairings triad (color + icon + text) codified
- Copywriting: 16 primary-CTA labels, 5 empty states, 12 error-toast templates, 6 destructive confirmations, 4 Konsistenz-Hinweis InfoBanner variants, 50+ inline micro-copy lines — all German, verbatim
- Registry: shadcn official only; `accordion` + `radio-group` primitives flagged for Wave 0 install

### File Created
`.planning/phases/13-user-und-rechteverwaltung/13-UI-SPEC.md`

### Pre-Populated From
| Source | Decisions Used |
|--------|---------------|
| 13-CONTEXT.md | 16 (D-01 through D-16 locked decisions) |
| REQUIREMENTS.md | 5 (USER-01..05) + 2 (MOBILE-ADM-01/02 touch-target rules) |
| ROADMAP.md | 5 success criteria |
| `apps/web/components.json` | yes (preset, icon library, CSS-var mode) |
| `apps/web/src/app.css` | yes (Inter font, token palette, no dark mode) |
| Phase 10/11/12 UI-SPECs | Pattern continuation (tokens, Copywriting templates, Silent-4XX invariant) |
| User input | 0 (no new questions asked — upstream fully covered) |

### Ready for Verification
UI-SPEC complete. Checker can now validate against 6 design quality dimensions.
