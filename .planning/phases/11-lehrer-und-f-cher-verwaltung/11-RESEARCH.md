# Phase 11: Lehrer- und Fächer-Verwaltung — Research

**Researched:** 2026-04-22
**Domain:** Admin-UI layer over existing v1.0 Teacher + Subject modules (CRUD, Verfügbarkeit, Werteinheiten, Ermäßigungen, Stundentafel-Vorlagen read-out, Orphan-Guard)
**Confidence:** HIGH (all findings verified against codebase)
**Mode:** Focused — trusts CONTEXT.md's 16 decisions and UI-SPEC.md's 1100-line contract; no library alternatives re-explored.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (16)

- **D-01:** Separate routes `/admin/teachers` and `/admin/subjects` (TanStack file-based).
- **D-02:** List → Detail mit TanStack-Router param routes; 4 Tabs im Teacher-Detail (Stammdaten | Lehrverpflichtung | Verfügbarkeit | Ermäßigungen). Subjects = Dialog-Edit, keine Detail-Page.
- **D-03:** Neue Sidebar-Gruppe "Personal & Fächer" in AppSidebar + MobileSidebar (admin/schulleitung).
- **D-04:** Empty-List Flow = Inline-CTA, keine separate Wizard-Seite.
- **D-05:** Werteinheiten-Editor mit live-computed Total via shared `werteinheiten.util.ts` (re-export nach `packages/shared`).
- **D-06 [USER-OVERRIDE]:** Verfügbarkeit = **Visual Week-Grid** (Mo-Fr × periods), Click-to-Toggle. Mobile-375-Fallback = Day-Picker + Single-Column-Period-List.
- **D-07:** Ermäßigungen-UI = Row-Add-List, Replace-all-in-transaction Save.
- **D-08:** Keycloak-Verknüpfung via `GET /admin/keycloak/users?email=` Search-Endpoint + Link-Dialog + "Verknüpfung lösen"-Warn-Dialog.
- **D-09:** Fach-Liste = Dense Table, Click-Row → Edit-Dialog, "+ Fach anlegen"-Create-Dialog oben rechts.
- **D-10:** Stundentafel-Vorlagen = read-only Tabs unterhalb der Fach-Liste, aus `packages/shared` statisch.
- **D-11 [USER-OVERRIDE]:** **Free Hex Picker** + `<input type="color">` + Text-Hex-Input + WCAG-AA Live-Preview mit 4-Tier-Banner (AAA / AA / large-only / fail). SUBJECT_PALETTE als "Empfohlene Farben"-Swatch-Row. Submit NIEMALS contrast-blocked — Warning only.
- **D-12:** Orphan-Guard 409-Response mit `{ affectedClasses: [...], affectedTeachers: [...] }` Payload via RFC 9457 `extensions`.
- **D-13:** Full-E2E-Coverage — 8 Spec-Files (CRUD × {happy, error} × {desktop, mobile-375}) für Teacher + Subject. Mobile-WebKit Bus-Error-10 acceptable; Chromium-375-Emulation ist Verifikation.
- **D-14:** Orphan-Guard als atomische Gap-Fix-Tasks INNERHALB Phase 11 (nicht separate Phase). Teacher + Subject `.remove` dependency checks + ConflictException mit affected-entity-list.
- **D-15:** Defense-in-Depth Validation — Shared Zod in `packages/shared/src/validation/`, RHF + zodResolver FE, class-validator BE. Deutsche UI-Strings, englische API-Feldnamen.
- **D-16 [USER-OVERRIDE]:** **3-Plan-Struktur** (statt 5 parallel): Plan 11-01 Shared+Teacher, Plan 11-02 Fächer+Stundentafel, Plan 11-03 E2E-Sweep.

### Claude's Discretion

- Exact sidebar position, lucide icons, grid styling, color-ratio library choice (recommend hand-rolled — see Focus 2), affected-entity-modal pagination, solver-rerun-banner copy, shadcn-primitive selection.

### Deferred Ideas (OUT OF SCOPE)

- Bulk-Actions auf Teacher-Liste, Teacher-CSV-Export, Visual-Range-Drag im Grid, Fach-Import aus Vorlage, Keycloak-Bulk-Create, Subject-Icons, Werteinheiten-Jahres-Report.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TEACHER-01 | Admin kann Lehrerliste einsehen | §Focus-5 Plan 11-01 owns `/admin/teachers` list + useTeachers hook; schema confirms `Teacher` model with `person` join (line 343-369). |
| TEACHER-02 | Admin kann Lehrer anlegen/bearbeiten (Stammdaten) | `TeacherService.create/update` existing (lines 12-205). UI-SPEC §2.2 Tab 1. New: `packages/shared/src/validation/teacher.ts` Zod. |
| TEACHER-03 | Admin kann Werteinheiten/Lehrverpflichtung pflegen | `werteinheiten.util.ts` existing — move/re-export to shared. UI-SPEC §2.3 Tab 2 live-compute. |
| TEACHER-04 | Admin kann Verfügbarkeit pflegen | `AvailabilityRule` model (lines 425-437), `TeacherService.update` already Replace-all (lines 161-177). UI-SPEC §2.4 Visual Grid. Focus 1. |
| TEACHER-05 | Admin kann Ermäßigungen pflegen | `TeachingReduction` model (lines 441-451). Row-Add-List §2.5. Replace-all-in-transaction (lines 179-193). |
| TEACHER-06 | Admin kann Lehrer löschen (Orphan-safe) | **Gap-Fix:** `TeacherService.remove` currently does hard-cascade (lines 207-213). Focus 4. |
| SUBJECT-01 | Admin kann Fächer-Liste einsehen | `SubjectService.findAll` existing (lines 42-65). UI-SPEC §3.1, §3.2. |
| SUBJECT-02 | Admin kann Fach anlegen/bearbeiten (Farbe!) | `SubjectService.create/update` existing. UI-SPEC §3.3. **BLOCKING:** Subject schema has no color columns — see Risks §9. |
| SUBJECT-03 | Admin kann Stundentafel-Vorlagen pro Schultyp einsehen | `packages/shared/src/stundentafel/` static arrays (Phase 2). UI-SPEC §3.4 read-only Tabs. |
| SUBJECT-04 | Admin kann Fach löschen (Orphan-safe) | **Gap-Fix:** `SubjectService.remove` currently does hard-cascade (lines 104-107). Focus 4. |
| SUBJECT-05 | Fach-Kürzel ist eindeutig pro Schule | Already enforced: `@@unique([schoolId, shortName])` line 524 + 409-ConflictException (lines 21-25). UI wires Zod async-unique-check + inline error. |

All 11 requirements are covered by existing backend behaviour **except** (a) color persistence for SUBJECT-02 and (b) Orphan-Guard gap-fixes for TEACHER-06 + SUBJECT-04. Both are atomic tasks within Plan 11-01 / 11-02 per CONTEXT.md D-14.
</phase_requirements>

## Executive Summary

- **Backend is 90% already in place.** `TeacherModule` and `SubjectModule` ship create/update/remove + `werteinheiten.util.ts` + `stundentafel-template.service.ts` + Austrian template arrays. Phase 11 is predominantly UI + two Gap-Fixes (Orphan-Guard in both `.remove` methods) + one Keycloak-User-Search endpoint (does NOT yet exist in the API — `@keycloak/keycloak-admin-client` is also NOT yet a dependency).
- **Two schema gaps discovered that MAY require migrations** (CLAUDE.md hard-rule applies if so): (1) `Subject` model has NO `colorBg` / `colorText` columns but D-11's free-hex picker requires persisting admin-picked colors; currently color is deterministically hashed from `subjectId` via `SUBJECT_PALETTE`. (2) UI-SPEC §3.3 references "Schultyp-Zuordnung multi-select" for Subject but `Subject` model has no schoolType-mapping. Both must be surfaced to the planner for an explicit decision (see Risks §9).
- **Many teacher/subject references in the schema are DENORMALIZED strings with no FK enforcement** — `TimetableLesson.teacherId`, `ClassBookEntry.teacherId`, `Substitution.originalTeacherId/substituteTeacherId`, `GradeEntry.teacherId`. Orphan-Guard must query these by hand; Prisma will NOT prevent deletions, and the cascading on `TeacherSubject`, `AvailabilityRule`, `TeachingReduction` IS `onDelete: Cascade` today, so **without an explicit guard, deleting a Teacher silently zombifies timetable history**. Same for `Subject` via `ClassSubject` (cascade) and `TeacherSubject` (cascade). This makes D-14 non-optional.
- **Visual Week-Grid + Free Hex Picker are hand-rolled**, no new dependency needed. shadcn/ui + Tailwind + native `<input type="color">` + a 30-LoC `wcag.ts` util cover both user-overrides. Mobile-375 fallback for the grid is a Day-Picker `<Select>` + `<Toggle>` list (explicitly specified in UI-SPEC §2.4.2, no swipe pattern).
- **Plan seam is clean**: Plan 11-01 owns Teacher FE+BE-Gap-Fix + Keycloak-search, Plan 11-02 owns Subject FE+BE-Gap-Fix, Plan 11-03 owns 8 Playwright specs (2 desktop + 2 mobile × 2 entities × {happy, error}). Zero source-file overlap — see §Focus 5.

**Primary recommendation:** Execute D-16's 3-plan bundle. Begin Plan 11-01 with Zod-schemas + shared werteinheiten export + Keycloak-search endpoint (API-side atomic task) before FE routes. Begin Plan 11-02 with a schema-migration decision + SubjectService Orphan-Guard before dialog UI. Plan 11-03 executes last, depending on 11-01 + 11-02 merged.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Teacher CRUD UI (list, detail, tabs) | Browser (React SPA) | API (existing Nest CRUD) | `TeacherService` already ships create/update/remove; FE builds 4-tab RHF+Zod form, bulk-saves via existing PATCH. |
| Verfügbarkeits-Grid toggle-state + bulk-save | Browser (React state) | API (Replace-all tx) | Grid state lives in RHF as `Set<"mo-1"|...>`; one PATCH computes diff vs server-truth, API replaces `AvailabilityRule[]` in $transaction (existing pattern lines 161-177). |
| Werteinheiten live-compute | Browser (pure fn) | API (same fn, validation) | `werteinheiten.util.ts` → re-export to `packages/shared` so FE+BE are byte-identical. |
| Keycloak user-search by email | API (Nest controller + admin-client) | — | FE cannot talk to Keycloak admin-API directly (CORS + client-secret). New BE endpoint wraps `KeycloakAdminClient.users.find({email})`. |
| WCAG contrast computation | Browser (pure fn) | — | Live preview needs < 16ms recompute; no API roundtrip. 30-LoC `apps/web/src/lib/wcag.ts`. |
| Subject color persistence | API (Prisma) | Browser (form input) | **Schema gap** — see Risks §9. If migration lands, new `colorBg/colorText` columns; if not, FE sends color to a new endpoint that stores elsewhere (unlikely-not-preferred). |
| Orphan-Guard dependency check | API (Prisma $transaction) | Browser (409 display) | Multiple denormalized FKs make this service-layer only. FE consumes RFC 9457 `extensions.affectedEntities` and renders dialog. |
| Stundentafel-Vorlagen read-out | Browser (static import) | — | `packages/shared/src/stundentafel/` already ships arrays; no API call needed. Pure render. |
| E2E verification (8 specs) | Playwright (outside SUT) | — | Phase 10.3 harness reused; no FE/BE code changes. |

## Focus Area 1: Visual Week-Grid (D-06, UI-SPEC §2.4)

### Component Shape

```tsx
// apps/web/src/components/admin/teacher/VerfuegbarkeitsGrid.tsx
type CellKey = `${DayOfWeek}-${PeriodNumber}`; // e.g. "MONDAY-2"

interface Props {
  periods: TimeGridPeriod[];       // from useTimeGrid(schoolId)
  days: DayOfWeek[];               // active school days (Mo..Fr or Mo..Sa)
  value: Set<CellKey>;             // BLOCKED cells (RHF-controlled)
  onChange: (next: Set<CellKey>) => void;
}
```

**State model** — one flat `Set<CellKey>` of blocked cells. "verfügbar" = absence from set. Toggle = `set.has(k) ? set.delete(k) : set.add(k)` + `onChange(new Set(set))`. RHF integration via `<Controller>` + custom `setValue(name, next, { shouldDirty: true })`.

**Mapping to/from `AvailabilityRule[]`** — Server model stores rules as `{ teacherId, ruleType: 'UNAVAILABLE', dayOfWeek, periodNumbers: [1,2,...] }` grouped by day (existing shape, lines 425-437). Client-side hooks:
- **Load:** flatten rules into `Set<CellKey>` — for each rule, for each `periodNumber` in `periodNumbers[]`, add `${dayOfWeek}-${periodNumber}`.
- **Save:** group the Set back into one rule per day with `UNAVAILABLE` type and `periodNumbers` sorted array. Send via existing `PATCH /teachers/:id` with `availabilityRules: [...]` — `TeacherService.update` already does Replace-all (lines 161-177). **Single PATCH, entire array.**

### Accessibility (verified from UI-SPEC §2.4.1, §8)

- Root: HTML `<table role="grid">` with explicit `<caption class="sr-only">Verfügbarkeits-Raster — {N} Perioden × {M} Tage</caption>`.
- Cells: `<button role="gridcell" aria-pressed={isBlocked} aria-label="Montag, 2. Stunde, geblockt">`.
- **Keyboard nav:** Tab enters at first cell; Arrow keys move focus (React state-managed `focusedKey`); Space/Enter toggles. Grid-keyboard reference implementation: WAI-ARIA APG grid pattern. Hand-rolled — 25-30 LoC of `onKeyDown` handler.
- **Colorblind-safe:** "geblockt" uses diagonal-hatched `background-image: repeating-linear-gradient(45deg, transparent 0 4px, var(--color-muted-foreground) 4px 5px)` (per UI-SPEC §2.4.1 table), NOT color alone. `Lock` icon inside blocked cells reinforces.
- **Focus ring:** Tailwind `focus-visible:ring-2 ring-ring ring-offset-2` (inherits design system).

### Row/Column Bulk-Toggle Shortcuts (§2.4.1 bottom)

Click day-header → toggle all cells in column. Click period-label → toggle all cells in row. Confirm-dialog triggers when ≥ 3 cells currently blocked in that row/col — prevents accidental bulk-clear. Implementation: shadcn `<AlertDialog>` with copy `"Ganze Spalte umschalten? {Montag} wird für alle Perioden {frei|geblockt}."`

### Mobile-375 Fallback (§2.4.2) — No Swipe

Full-width `<Select h-11>` labelled "Tag" → renders single-column `<div>` of periods for selected day. Each row `h-11 flex items-center justify-between border rounded-md px-4`. Right side: shadcn `<Toggle>` with `Lock` icon, `h-11 w-11` (44px touch target). Swipe is explicitly OUT of scope per UI-SPEC §2.4.2 (accessibility complications, no Radix primitive). Day-Select stays as the canonical accessible fallback.

### Empty-TimeGrid Edge Case

If `useTimeGrid` returns `periods: []`, render Phase 10 `InfoBanner` with copy `Das Zeitraster ist noch leer. Legen Sie zuerst Perioden unter Schulverwaltung › Zeitraster an.` + deep-link button to `/admin/school/settings?tab=timegrid`. Grid is not rendered in this case.

## Focus Area 2: Free Hex Picker + WCAG Contrast (D-11, UI-SPEC §3.3)

### `apps/web/src/lib/wcag.ts` — Pseudocode (hand-rolled, no dep)

```ts
// Source: WCAG 2.1 spec §1.4.3 — https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
// Hand-rolled (per CONTEXT.md discretion) — avoids tinycolor2 / color-contrast-checker deps.

/** Parse "#RRGGBB" → [r, g, b] 0..255. Throws on malformed. */
export function parseHex(hex: string): [number, number, number] {
  const m = /^#([0-9A-Fa-f]{6})$/.exec(hex);
  if (!m) throw new Error(`Invalid hex: ${hex}`);
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** sRGB channel → linear (per WCAG 2.1 §1.4.3). */
function srgbToLinear(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/** Relative luminance per WCAG 2.1. */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/** Contrast ratio per WCAG 2.1 §1.4.3 (returns e.g. 4.52). */
export function contrastRatio(bgHex: string, textHex: string): number {
  const L1 = relativeLuminance(bgHex);
  const L2 = relativeLuminance(textHex);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

export type ContrastTier = 'AAA' | 'AA' | 'AA_LARGE_ONLY' | 'FAIL';

export function contrastTier(ratio: number): ContrastTier {
  if (ratio >= 7.0) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3.0) return 'AA_LARGE_ONLY';
  return 'FAIL';
}
```

### Tier Table (exactly from UI-SPEC §3.3.1-c)

| Ratio | Tier | Banner |
|-------|------|--------|
| ≥ 7.0 | AAA | green — `Kontrastverhältnis {ratio}:1 — WCAG AAA.` |
| 4.5–7.0 | AA | green — `Kontrastverhältnis {ratio}:1 — WCAG AA.` |
| 3.0–4.5 | AA-large-only | amber — `Kontrastverhältnis {ratio}:1 — Nur für große Texte ausreichend. Für Timetable-Zellen ist WCAG AA (≥ 4.5:1) empfohlen.` |
| < 3.0 | FAIL | destructive — `Kontrastverhältnis {ratio}:1 — Unzureichend für Timetable-Zellen. Speichern ist trotzdem möglich, wir empfehlen aber eine Anpassung.` |

Critical invariant: **Submit is NEVER contrast-blocked.** The admin can save with FAIL-tier contrast — UI-SPEC §3.3.1-c end explicitly codifies D-11's "Verantwortung beim Admin".

### SUBJECT_PALETTE Import

Path: `packages/shared/src/types/timetable.ts` (line 95, 15 WCAG-AA-compliant pairs). Re-exported via `@schoolflow/shared`. Clicking a swatch calls `form.setValue('colorBg', pair.bg); form.setValue('colorText', pair.text, { shouldDirty: true });` — sets both in one atomic UI operation. Swatch layout: `flex flex-wrap gap-1.5` with 32×32 buttons, selected = `ring-2 ring-ring ring-offset-2`.

### Live Preview Markup (UI-SPEC §3.3.2)

```tsx
<div className="rounded-md p-3 shadow-sm"
     style={{ backgroundColor: bgHex, color: textHex }}>
  <div className="text-xs font-semibold uppercase tracking-wide">{kuerzel || 'FAC'}</div>
  <div className="text-sm font-medium mt-1 truncate">{name || 'Fach-Vorschau'}</div>
  <div className="text-xs opacity-80 mt-1">Raum 101 · Mo 2.</div>
</div>
```

Two mini-swatches below: one on `bg-white` (day-view context), one on `bg-muted` (week-view alternating). Mobile `< md`: preview stacks BELOW form fields.

### Rejected Alternatives

- `tinycolor2`, `color-contrast-checker`, `chroma-js` — all > 5 KB gz, none needed for the tiny pure-math operation. Hand-rolled is auditable, dependency-free, and matches the Phase 10 pattern of preferring local utils (see `apps/web/src/lib/` inventory).

## Focus Area 3: Keycloak User-Search Endpoint (D-08)

### Codebase Grep Result — NOT YET IMPLEMENTED

- `apps/api/src/modules/auth/` contains `auth.module.ts`, `casl/`, `decorators/`, `guards/`, `permissions/`, `strategies/keycloak-jwt.strategy.ts`, `types/`. **No admin-client usage.**
- `grep @keycloak/keycloak-admin-client` across `apps/api/src` → **0 results.** Package is NOT yet installed.
- `grep "keycloak"` across `apps/api/package.json`, root `package.json` → **0 results** for admin-client. Only the JWT strategy uses Keycloak (via public JWKs, no admin API).
- `user-context.service.ts` reads `person.keycloakUserId` from Prisma (a denormalized string, Person.keycloakUserId is `@unique` line 317) but never hits Keycloak directly.

**Conclusion:** This is a greenfield Gap-Fix for Plan 11-01.

### Endpoint Design

```
GET /api/v1/admin/keycloak/users?email=<query>
```

- **Guard:** existing `KeycloakJwtGuard` + `@CheckPermissions({ action: 'manage', subject: 'teacher' })` (Keycloak-linking IS a teacher-management concern).
- **Rate limit:** reuse NestJS `@Throttle({ default: { ttl: 60_000, limit: 30 } })` — 30/min per-user, sufficient for debounced (300ms) type-ahead in the link dialog. Inherits Phase 10's throttle config if present, else add to the new controller.
- **Response:**
  - `200`: `{ id: string, email: string, firstName: string, lastName: string, enabled: boolean, alreadyLinkedToPersonId?: string }`
    - `alreadyLinkedToPersonId` is a Prisma-side lookup on `person.findUnique({ where: { keycloakUserId } })` to support the UI-SPEC §2.6.2 "Bereits verknüpft mit {name}" warning.
  - `404`: RFC 9457 `application/problem+json` when Keycloak `users.find({email})` returns empty. `title: "Kein Account gefunden"`.
  - `400`: query param missing or < 3 chars (Zod validation).

### Module Structure

New module `apps/api/src/modules/keycloak-admin/` (separate from `auth/` to keep admin-API concerns isolated from JWT verification):

```
keycloak-admin/
├── keycloak-admin.module.ts
├── keycloak-admin.service.ts      # wraps @keycloak/keycloak-admin-client
├── keycloak-admin.controller.ts   # GET /admin/keycloak/users
└── dto/keycloak-user-query.dto.ts
```

### Library: `@keycloak/keycloak-admin-client`

[ASSUMED — not verified in npm this session, but was a stated dependency-intent in the additional_context] — official Red Hat-maintained client. Usage:

```ts
import KeycloakAdminClient from '@keycloak/keycloak-admin-client';

const kcAdmin = new KeycloakAdminClient({
  baseUrl: config.get('KEYCLOAK_URL'),
  realmName: config.get('KEYCLOAK_REALM'),
});
await kcAdmin.auth({
  grantType: 'client_credentials',
  clientId: config.get('KEYCLOAK_ADMIN_CLIENT_ID'),
  clientSecret: config.get('KEYCLOAK_ADMIN_CLIENT_SECRET'),
});
const users = await kcAdmin.users.find({ email, exact: false });
```

**Token caching:** the service should cache the service-account token for its lifetime (~5 min default), not re-auth per request. Use simple in-memory `{ token, expiresAt }` with a lazy re-auth on expiry. [ASSUMED pattern — standard for server-side admin clients.]

### Linking Mutation (outside this endpoint's scope but related)

`PATCH /api/v1/teachers/:id/keycloak-link` + `DELETE /api/v1/teachers/:id/keycloak-link` update `person.keycloakUserId` on the already-linked Person record. These are also new Gap-Fix atomic tasks inside Plan 11-01.

## Focus Area 4: Orphan-Guard Pattern (D-14, CONTEXT.md §Code Insights)

### Schema Reality Check

**Teacher dependents** (grep schema.prisma — `@@map` targets):
| Table | FK column | onDelete behaviour | Enforcement |
|-------|-----------|---------------------|-------------|
| `teacher_subjects` | `teacher_id` | Cascade | Silent cascade — fine to drop when teacher goes |
| `availability_rules` | `teacher_id` | Cascade | Silent cascade — fine |
| `teaching_reductions` | `teacher_id` | Cascade | Silent cascade — fine |
| `school_classes.klassenvorstand_id` | — | SetNull (implicit, nullable FK) | Silent SetNull — **blocks, because KV is a semantic assignment** |
| `timetable_lessons` | `teacher_id` | **DENORMALIZED STRING — no FK** | **Silent zombie** — row keeps stale teacherId, no cascade |
| `class_book_entries` | `teacher_id` | **DENORMALIZED STRING — no FK** | **Silent zombie** |
| `grade_entries` | `teacher_id` | **DENORMALIZED STRING — no FK** | **Silent zombie** |
| `substitutions.original_teacher_id` | — | **DENORMALIZED STRING — no FK** | **Silent zombie** |
| `substitutions.substitute_teacher_id` | — | **DENORMALIZED STRING — no FK** | **Silent zombie** |
| `teacher_absences.teacher_id` | `teacher_id` | (from schema line 1053) Cascade | Silent cascade — absences survive logically, but deleting a Teacher also deletes absence history. Debatable — Gap-Fix should BLOCK on active absences. |

**Subject dependents:**
| Table | FK column | onDelete behaviour |
|-------|-----------|---------------------|
| `class_subjects` | `subject_id` | **Cascade** — silent drop, takes Homework + Exam with it |
| `teacher_subjects` | `subject_id` | Cascade — fine |
| `groups.subject_id` | — | nullable, SetNull (implicit) |
| (indirect) `homework` → `class_subject` | — | cascades via class_subject drop |
| (indirect) `exams` → `class_subject` | — | `@relation` WITHOUT onDelete (line 1382) = NO ACTION = would error on DB level → hidden blocker |

### Required Prisma Queries — `TeacherService.remove` Gap-Fix

```ts
async remove(id: string) {
  const teacher = await this.findOne(id); // throws 404

  const [
    klassenvorstandCount,
    lessonCount,
    classbookCount,
    gradeCount,
    originalSubCount,
    substituteSubCount,
    klassenvorstandClasses,
  ] = await this.prisma.$transaction([
    this.prisma.schoolClass.count({ where: { klassenvorstandId: id } }),
    this.prisma.timetableLesson.count({ where: { teacherId: id } }),
    this.prisma.classBookEntry.count({ where: { teacherId: id } }),
    this.prisma.gradeEntry.count({ where: { teacherId: id } }),
    this.prisma.substitution.count({ where: { originalTeacherId: id } }),
    this.prisma.substitution.count({ where: { substituteTeacherId: id } }),
    // For the affected-entities list UI (D-12) we also fetch names:
    this.prisma.schoolClass.findMany({
      where: { klassenvorstandId: id },
      select: { id: true, name: true },
      take: 50, // UI caps list
    }),
  ]);

  const totalRefs = klassenvorstandCount + lessonCount + classbookCount
                  + gradeCount + originalSubCount + substituteSubCount;

  if (totalRefs > 0) {
    throw new ConflictException({
      type: 'https://schoolflow.dev/errors/teacher-has-dependents',
      title: 'Lehrperson hat Abhängigkeiten',
      status: 409,
      detail: 'Diese Lehrperson ist noch verplant. Lösen Sie erst alle Zuordnungen.',
      'affectedEntities': {
        klassenvorstandFor: klassenvorstandClasses,
        lessonCount,
        classbookCount,
        gradeCount,
        substitutionCount: originalSubCount + substituteSubCount,
      },
    });
  }

  // Proceed with existing cascade-delete
  await this.prisma.teacher.delete({ where: { id } });
  await this.prisma.person.delete({ where: { id: teacher.personId } });
}
```

### Required Prisma Queries — `SubjectService.remove` Gap-Fix

```ts
async remove(id: string) {
  await this.findOne(id); // throws 404

  const [
    classSubjectCount,
    teacherSubjectCount,
    timetableLessonCount,  // via ClassSubject
    homeworkCount,
    examCount,
    affectedClasses,
    affectedTeachers,
  ] = await this.prisma.$transaction([
    this.prisma.classSubject.count({ where: { subjectId: id } }),
    this.prisma.teacherSubject.count({ where: { subjectId: id } }),
    this.prisma.timetableLesson.count({
      where: { classSubject: { subjectId: id } },
    }),
    this.prisma.homework.count({
      where: { classSubject: { subjectId: id } },
    }),
    this.prisma.exam.count({
      where: { classSubject: { subjectId: id } },
    }),
    this.prisma.classSubject.findMany({
      where: { subjectId: id },
      select: { schoolClass: { select: { id: true, name: true } } },
      distinct: ['classId'],
      take: 50,
    }),
    this.prisma.teacherSubject.findMany({
      where: { subjectId: id },
      select: {
        teacher: {
          select: { id: true, person: { select: { firstName: true, lastName: true } } },
        },
      },
      take: 50,
    }),
  ]);

  const totalRefs = classSubjectCount + teacherSubjectCount
                  + timetableLessonCount + homeworkCount + examCount;

  if (totalRefs > 0) {
    throw new ConflictException({
      type: 'https://schoolflow.dev/errors/subject-has-dependents',
      title: 'Fach hat Abhängigkeiten',
      status: 409,
      detail: 'Dieses Fach ist Klassen oder Lehrpersonen zugeordnet. Lösen Sie erst alle Zuordnungen.',
      'affectedEntities': {
        affectedClasses: affectedClasses.map((cs) => cs.schoolClass),
        affectedTeachers: affectedTeachers.map((ts) => ({
          id: ts.teacher.id,
          name: `${ts.teacher.person.firstName} ${ts.teacher.person.lastName}`,
        })),
        lessonCount: timetableLessonCount,
        homeworkCount,
        examCount,
      },
    });
  }

  return this.prisma.subject.delete({ where: { id } });
}
```

### RFC 9457 Payload Shape (D-12)

```json
{
  "type": "https://schoolflow.dev/errors/subject-has-dependents",
  "title": "Fach hat Abhängigkeiten",
  "status": 409,
  "detail": "Dieses Fach ist Klassen oder Lehrpersonen zugeordnet. Lösen Sie erst alle Zuordnungen.",
  "instance": "/api/v1/subjects/abc-123",
  "affectedEntities": {
    "affectedClasses": [{"id": "cls-1", "name": "3a"}, ...],
    "affectedTeachers": [{"id": "tea-1", "name": "Maria Huber"}, ...],
    "lessonCount": 42,
    "homeworkCount": 7,
    "examCount": 3
  }
}
```

FE parser (`apps/web/src/lib/api.ts` `parseProblemJson`) already handles RFC 9457 + extensions (CONTEXT.md §Existing Code Insights). Delete-Dialog (UI-SPEC §4.3) renders lists with deep-links to `/admin/teachers/{id}` (live in Phase 11) and TODO-placeholder links for classes (Phase 12 fills those routes).

### Unit Tests for Gap-Fix (§Validation Architecture)

Both `TeacherService.remove` and `SubjectService.remove` need Vitest specs:
1. 0 dependents → returns; entity deleted.
2. N dependents → throws `ConflictException`; entity NOT deleted; payload contains correct counts + arrays.
3. Exactly 1 dependent in each dependency-category → payload lists all correctly (use Prisma test fixtures).

## Focus Area 5: 3-Plan Seam Analysis (D-16)

### Plan 11-01 — Shared Foundation + Teacher-CRUD + Keycloak-Search

**Owns (FE):**
- `apps/web/src/routes/_authenticated/admin/teachers/index.tsx`
- `apps/web/src/routes/_authenticated/admin/teachers/$teacherId.tsx`
- `apps/web/src/components/admin/teacher/**` (TeacherListTable, TeacherDetailTabs, StammdatenTab, LehrverpflichtungTab, VerfuegbarkeitsGrid, VerfuegbarkeitsMobileList, ErmaessigungenList, KeycloakLinkDialog, KeycloakLinkedState)
- `apps/web/src/hooks/teachers.ts` (useTeachers, useTeacher, useCreateTeacher, useUpdateTeacher, useDeleteTeacher, useAvailabilityRules indirectly-via-update, useTeachingReductions indirectly-via-update, useKeycloakUsers)
- `apps/web/src/lib/wcag.ts` (referenced from Plan 11-02 — but authored here as it is the generic lib; Plan 11-02 ONLY imports it)

**Owns (BE):**
- `apps/api/src/modules/teacher/teacher.service.ts` — EDIT `.remove` (Orphan-Guard Gap-Fix, Focus 4) + new `.linkKeycloakUser(id, keycloakUserId)` + `.unlinkKeycloakUser(id)` methods.
- `apps/api/src/modules/teacher/teacher.controller.ts` — add `PATCH /:id/keycloak-link` and `DELETE /:id/keycloak-link` endpoints.
- `apps/api/src/modules/keycloak-admin/**` — new module (service + controller + DTO) for `GET /admin/keycloak/users?email=` (Focus 3).
- `apps/api/src/modules/teacher/teacher.service.spec.ts` — new Orphan-Guard unit tests.

**Owns (shared):**
- `packages/shared/src/validation/teacher.ts` (Zod schemas for Create/Update TeacherDto)
- `packages/shared/src/validation/availability.ts` (AvailabilityRule Zod)
- `packages/shared/src/validation/teaching-reduction.ts` (TeachingReduction Zod + 6-enum `ReductionType`)
- `packages/shared/src/werteinheiten/` (re-export or move of `apps/api/src/modules/teacher/werteinheiten.util.ts`)

**Sidebar edits (shared with Plan 11-02 BUT each edits its own entry):**
- `apps/web/src/components/layout/AppSidebar.tsx` + `MobileSidebar.tsx` — Plan 11-01 adds the "Personal & Fächer" section scaffold + Lehrer entry. Plan 11-02 ADDS the Fächer entry only. Avoid the conflict by making 11-02 a pure-append edit; documented in Plan 11-01 SUMMARY.

### Plan 11-02 — Fächer-CRUD + Stundentafel-Vorlagen + Color-Picker

**Owns (FE):**
- `apps/web/src/routes/_authenticated/admin/subjects/index.tsx`
- `apps/web/src/components/admin/subject/**` (SubjectTable, SubjectMobileCards, SubjectFormDialog, FreeHexPicker, SubjectPaletteSwatches, ContrastBanner, TimetableCellPreview, StundentafelVorlagenSection)
- `apps/web/src/hooks/subjects.ts` (useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject, useStundentafelTemplates)
- AppSidebar/MobileSidebar Fächer-entry append only (see above).

**Owns (BE):**
- `apps/api/src/modules/subject/subject.service.ts` — EDIT `.remove` (Orphan-Guard Gap-Fix, Focus 4). EDIT `.create/.update` if schema gains `colorBg/colorText` columns (see Risks §9).
- `apps/api/src/modules/subject/subject.service.spec.ts` — new Orphan-Guard unit tests.
- `apps/api/prisma/schema.prisma` + `apps/api/prisma/migrations/<ts>_subject_color_+_schooltype/` — **IF** Risks §9 is resolved in favour of schema changes (follow CLAUDE.md migration hygiene hard-rule).

**Owns (shared):**
- `packages/shared/src/validation/subject.ts` (Zod with `colorBg: /^#[0-9A-Fa-f]{6}$/` regex)
- (Consumer only — imports `wcag.ts` from apps/web which was authored in Plan 11-01)

### Plan 11-03 — E2E Sweep (8 Playwright Specs)

**Owns (test-only, zero FE/BE source changes):**
- `apps/web/e2e/specs/admin-teachers-happy.spec.ts` (desktop)
- `apps/web/e2e/specs/admin-teachers-error.spec.ts` (desktop)
- `apps/web/e2e/specs/admin-teachers-happy.mobile.spec.ts` (375×812)
- `apps/web/e2e/specs/admin-teachers-error.mobile.spec.ts` (375×812)
- `apps/web/e2e/specs/admin-subjects-happy.spec.ts`
- `apps/web/e2e/specs/admin-subjects-error.spec.ts`
- `apps/web/e2e/specs/admin-subjects-happy.mobile.spec.ts`
- `apps/web/e2e/specs/admin-subjects-error.mobile.spec.ts`

**Reuses (no edits):**
- Phase 10.3 harness: `loginAsRole`, `getRoleToken`, global-setup JWT, CardTitle helper (10.4-01).
- Phase 10.5-02 prefix-isolation: `E2E-TEA-*` (desktop) and `E2E-TEA-MOBILE-*` (mobile) test-IDs for cleanup collision avoidance.
- Phase 10.2-04 SILENT-4XX assertion helper (toast-on-4xx invariant).

**Zero source-file overlap with 11-01/11-02** — pure-additive test files, separate folder.

### Merge Discipline

- Plan 11-01 lands first (has the shared `wcag.ts`, validation modules, keycloak-admin module, and the sidebar scaffold).
- Plan 11-02 lands second, rebasing on 11-01. Only new conflict risk: AppSidebar/MobileSidebar — resolved by 11-02 doing a surgical append.
- Plan 11-03 lands last; runs against both merged features.

## Validation Architecture

Nyquist is enabled (CLAUDE.md + Phase 10/6/4 precedent — no `workflow.nyquist_validation: false` in config.json).

### Test Framework

| Property | Value |
|----------|-------|
| Framework (FE unit) | Vitest 4.x (via `@schoolflow/web` package) |
| Framework (BE unit) | Vitest 4.x (via `@schoolflow/api` package) |
| Framework (E2E) | Playwright 1.x (existing harness `apps/web/e2e/`) |
| Config (FE) | `apps/web/vitest.config.ts` (exists) |
| Config (BE) | `apps/api/vitest.config.ts` (exists) |
| Config (E2E) | `apps/web/playwright.config.ts` (exists) |
| Quick run (FE) | `pnpm --filter @schoolflow/web test:run -- <pattern>` |
| Quick run (BE) | `pnpm --filter @schoolflow/api test:run -- <pattern>` |
| Full suite | `pnpm -r test:run` + `pnpm --filter @schoolflow/web e2e` |
| E2E against dev | `pnpm --filter @schoolflow/web e2e:headed` |

### Phase Requirements → Test Map

| Req ID | Behaviour | Test Type | Command | File (Wave 0) |
|--------|-----------|-----------|---------|---------------|
| TEACHER-01 | Liste rendert N Teacher; empty-state zeigt Inline-CTA | E2E | `pnpm --filter @schoolflow/web e2e -- admin-teachers-happy` | `e2e/specs/admin-teachers-happy.spec.ts` ❌ |
| TEACHER-02 | Create-Dialog + Save → 201 + neues Listen-Item | E2E + Vitest (zod) | `pnpm --filter @schoolflow/shared test:run -- teacher` | `packages/shared/tests/validation/teacher.test.ts` ❌ + E2E above |
| TEACHER-02 | RHF-Validation blocks invalid email | Vitest (FE) | `pnpm --filter @schoolflow/web test:run -- StammdatenTab` | `apps/web/src/components/admin/teacher/StammdatenTab.test.tsx` ❌ |
| TEACHER-03 | WE-Total re-computes on Beschäftigungsgrad change | Vitest (FE) | `pnpm --filter @schoolflow/web test:run -- LehrverpflichtungTab` | `apps/web/src/components/admin/teacher/LehrverpflichtungTab.test.tsx` ❌ |
| TEACHER-03 | `calculateMaxTeachingHours` pure fn identical FE/BE | Vitest (shared) | `pnpm --filter @schoolflow/shared test:run -- werteinheiten` | `packages/shared/tests/werteinheiten.test.ts` ❌ |
| TEACHER-04 | Grid toggle-cell; bulk-save sends full rules array | Vitest (FE) + E2E | `... VerfuegbarkeitsGrid` | `apps/web/src/components/admin/teacher/VerfuegbarkeitsGrid.test.tsx` ❌ |
| TEACHER-04 | Keyboard-nav: arrow-keys move focus, Space toggles | Vitest (FE + user-event) | same | same file (extra describe block) |
| TEACHER-04 | Mobile-375: day-picker + period-toggle-list | E2E (mobile) | `... admin-teachers-happy.mobile` | `e2e/specs/admin-teachers-happy.mobile.spec.ts` ❌ |
| TEACHER-05 | Add/remove/edit reduction rows; save replaces-all | Vitest (FE) + Supertest | `... teacher.service` / `... ErmaessigungenList` | `apps/web/src/components/admin/teacher/ErmaessigungenList.test.tsx` ❌ + existing `teacher.service.spec.ts` |
| TEACHER-06 | Orphan-Guard — 409 with affectedEntities blocks delete | Vitest (BE) + E2E | `... teacher.service.spec` / `... admin-teachers-error` | `apps/api/src/modules/teacher/teacher.service.spec.ts` (extend) + `e2e/specs/admin-teachers-error.spec.ts` ❌ |
| TEACHER-06 | No-dep Teacher deletes successfully → 204 | Vitest (BE) + E2E | same | same |
| SUBJECT-01 | Liste zeigt Table + Mobile Cards; empty-state CTA | E2E + E2E-mobile | `... admin-subjects-happy` (both) | `e2e/specs/admin-subjects-happy.{spec,mobile.spec}.ts` ❌ |
| SUBJECT-02 | Create + Edit-Dialog; Kürzel uppercase auto-transform | Vitest (FE) + E2E | `... SubjectFormDialog` | `apps/web/src/components/admin/subject/SubjectFormDialog.test.tsx` ❌ |
| SUBJECT-02 | WCAG contrast util: 4 tier transitions | Vitest (FE pure) | `... wcag.test` | `apps/web/src/lib/wcag.test.ts` ❌ |
| SUBJECT-02 | Live preview renders picked colors | Vitest (FE) | `... TimetableCellPreview` | `apps/web/src/components/admin/subject/TimetableCellPreview.test.tsx` ❌ |
| SUBJECT-03 | Stundentafel-Vorlagen read-only renders per-Schultyp | Vitest (FE) + E2E | `... StundentafelVorlagenSection` | `apps/web/src/components/admin/subject/StundentafelVorlagenSection.test.tsx` ❌ + E2E above |
| SUBJECT-04 | Orphan-Guard — 409 with affectedEntities blocks delete | Vitest (BE) + E2E | `... subject.service.spec` / `... admin-subjects-error` | `apps/api/src/modules/subject/subject.service.spec.ts` (extend) + `e2e/specs/admin-subjects-error.{spec,mobile.spec}.ts` ❌ |
| SUBJECT-05 | Duplicate Kürzel → 409 inline error | Vitest (BE) + E2E | `... subject.service.spec` / `... admin-subjects-error` | existing `subject.service.spec.ts` (already covers this, re-verify) + E2E |

**Totals:** Vitest ≈ 14 new test files + 2 extended (teacher.service.spec + subject.service.spec) = 16 suites; Playwright = 8 new spec files. Matches additional_context ballpark (~18-22 Vitest + 8 Playwright).

### Sampling Rate

- **Per task commit:** `pnpm --filter <affected-package> test:run -- <specific-pattern>` (< 20s per target).
- **Per wave merge:** `pnpm -r test:run` (Vitest full) — < 2 min.
- **Phase gate:** Full Vitest + full Playwright green before `/gsd-verify-work`. Playwright desktop + mobile together ~3-5 min.

### Wave 0 (TDD-Stub Pattern — Phase 4/6/7/10 precedent)

All 14 new test files are authored as `it.todo('...')` stubs BEFORE any implementation begins. Concretely: the first task in each Plan (11-01, 11-02) is a "Wave-0" task that creates these stub files. The second task makes the stubs runnable (skeleton `it(...)` with placeholder assertions). Implementation tasks turn stubs green one-by-one. Memory-reference: `feedback_e2e_first_no_uat.md` — user-directive 2026-04-21 "ship with tests, no more 'please test in browser' asks."

**Wave-0 files to author:**
- `packages/shared/tests/validation/teacher.test.ts`
- `packages/shared/tests/validation/subject.test.ts`
- `packages/shared/tests/validation/availability.test.ts`
- `packages/shared/tests/validation/teaching-reduction.test.ts`
- `packages/shared/tests/werteinheiten.test.ts` (after move/re-export)
- `apps/web/src/lib/wcag.test.ts`
- `apps/web/src/components/admin/teacher/VerfuegbarkeitsGrid.test.tsx`
- `apps/web/src/components/admin/teacher/StammdatenTab.test.tsx`
- `apps/web/src/components/admin/teacher/LehrverpflichtungTab.test.tsx`
- `apps/web/src/components/admin/teacher/ErmaessigungenList.test.tsx`
- `apps/web/src/components/admin/teacher/KeycloakLinkDialog.test.tsx`
- `apps/web/src/components/admin/subject/SubjectFormDialog.test.tsx`
- `apps/web/src/components/admin/subject/TimetableCellPreview.test.tsx`
- `apps/web/src/components/admin/subject/StundentafelVorlagenSection.test.tsx`
- 8 × `apps/web/e2e/specs/admin-{teachers,subjects}-{happy,error}{,.mobile}.spec.ts`

**Extended:**
- `apps/api/src/modules/teacher/teacher.service.spec.ts` — add Orphan-Guard describe.
- `apps/api/src/modules/subject/subject.service.spec.ts` — add Orphan-Guard describe.

Framework install: none needed — Vitest 4.x and Playwright 1.x both already configured (see `apps/web/vitest.config.ts`, `apps/api/vitest.config.ts`, `apps/web/playwright.config.ts`).

## Risks & Pitfalls

1. **SCHEMA GAP — Subject color persistence (SUBJECT-02 blocker).** Schema `Subject` has NO `colorBg` / `colorText` columns (verified lines 509-526). Current codebase derives color deterministically via `getSubjectColor(subjectId)` hash into SUBJECT_PALETTE. D-11's free-hex picker requires admin-chosen colors to persist — this REQUIRES a schema migration (`ALTER TABLE subjects ADD COLUMN color_bg VARCHAR(7), ADD COLUMN color_text VARCHAR(7)`). CLAUDE.md migration hygiene hard-rule applies: must ship as `apps/api/prisma/migrations/<ts>_subject_color/`. Planner MUST either: (a) accept the migration as part of Plan 11-02 OR (b) escalate to user to defer free-hex picker to a later phase. CONTEXT.md implicitly assumes (a); flag for plan-checker.

2. **SCHEMA GAP — Subject schoolType-mapping (UI-SPEC §3.3 reference).** UI-SPEC calls for a multi-select "Schultyp-Zuordnung" field in the Subject form/table (§3.2 "Schultyp" column, §3.3 "Schultyp-Zuordnung (required, multi-select)"). `Subject` has only `subjectType SubjectType` (academic category) — no schoolType FK or array. This is a second migration: either `schoolTypes SchoolType[]` (Postgres array column) or a new junction `SubjectSchoolType`. Same escalation path as Risk 1.

3. **Denormalized teacher/subject IDs silently zombify history.** `TimetableLesson.teacherId`, `ClassBookEntry.teacherId`, `GradeEntry.teacherId`, `Substitution.originalTeacherId`, `Substitution.substituteTeacherId` are `String` columns with NO FK (verified). Prisma `onDelete` does nothing for these. Without the Orphan-Guard in Focus 4, deleting a Teacher leaves stale string-ids throughout the timetable/classbook/grade history — reports and UI lookups silently break (FE does `join in JS` by id and gets `undefined`). **This is WHY D-14 is non-optional** — it is the only layer that can prevent the data corruption.

4. **Keycloak admin-client token caching.** The service-account token expires (~5 min default). Naively re-auth'ing per request DDOSes Keycloak. Cache `{ token, expiresAt }` per-process (NestJS singleton) and re-auth lazily — standard pattern but easy to forget in a greenfield module. Add a Vitest stub for "token refresh on expiry" to lock the behaviour.

5. **AppSidebar/MobileSidebar merge conflict between Plan 11-01 and 11-02.** Both plans touch the same "Personal & Fächer" section. Mitigation: Plan 11-01 creates the section scaffold with only the "Lehrer" entry; Plan 11-02 does a one-line append for the "Fächer" entry. Plan 11-02 rebases on 11-01. Document in both SUMMARY.md files.

6. **Radix `Select` + `Dialog` z-index** — Known Phase 10 pitfall. Keycloak-Link-Dialog and Subject-Form-Dialog contain Selects (Schultyp multi-select). Both must use `Select.Portal` to render above the `Dialog.Portal`. Easy to miss; check in code review.

7. **Mobile-WebKit Bus-Error-10 (10.4-03 precedent).** E2E `mobile.spec.ts` files run on Chromium-375 emulation, not WebKit. CI config needs `projects: [{ name: 'mobile-chrome', use: { ...devices['Pixel 5'] } }]` — re-verify that Phase 10.5 playwright.config still has this.

8. **`TeacherSubject` qualifications replace-all is EXISTING behaviour** (lines 148-158) — but Phase 11 UI exposes it via `subjectIds` in the update form. Make sure FE sends the FULL desired list, not a diff, to preserve the Replace-all-in-transaction contract.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node 24 LTS | API + Web dev | Presumed ✓ | per CLAUDE.md stack pin | — |
| PostgreSQL 17 | API DB | Presumed ✓ (existing phases) | — | — |
| Keycloak instance | Keycloak-search endpoint | Presumed ✓ (Phase 1 foundation) | 26.5.x | — |
| `@keycloak/keycloak-admin-client` npm package | Plan 11-01 BE | **✗ NOT INSTALLED** | — | **Must be added via `pnpm --filter @schoolflow/api add @keycloak/keycloak-admin-client` as Plan 11-01 first task** |
| Vitest 4.x | Unit tests | ✓ (Phase 10 uses it) | — | — |
| Playwright 1.x | E2E | ✓ (Phase 10.3+) | — | — |
| shadcn/ui primitives | FE | ✓ (Phase 10 inventory: tabs, dialog, input, select, button, card, label, popover, dropdown-menu) | — | — |
| shadcn `Command` + `Popover` (for Schultyp combobox + Keycloak-email autocomplete) | Plan 11-01/11-02 FE | Presumed ✓ (installed per Phase 10); re-verify when planning | — | Fall back to native `<Combobox>` pattern if missing |
| shadcn `Toggle` (for mobile Verfügbarkeit list) | Plan 11-01 FE | Unknown — verify in planning | — | Use `Button variant="outline"` + `aria-pressed` if missing |
| shadcn `AlertDialog` (for bulk-toggle confirm, destructive confirms) | Both plans | Presumed ✓ | — | Reuse Phase 10 `WarnDialog` |

**Missing dependencies with no fallback:** none — `@keycloak/keycloak-admin-client` install is a trivial first task.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `@keycloak/keycloak-admin-client` is the appropriate official client (node.js, Red Hat-maintained) | Focus 3 | Low — alternative is direct-REST against `/auth/admin/realms/{realm}/users` with manually-managed bearer tokens. Same endpoint shape, slightly more LoC. |
| A2 | Token caching pattern is a standard NestJS singleton with lazy re-auth | Focus 3 | Low — misimplementation causes DDOS on Keycloak but is easy to detect in load tests. |
| A3 | D-11 schema-change is in scope for Phase 11 (not deferred) | Risk 1 | High — if deferred, Phase 11 ships without persisted colors and D-11 becomes a lie. Needs user confirmation before Plan 11-02 starts. |
| A4 | D-stuff re: "Schultyp-Zuordnung" on Subject in UI-SPEC §3.3 is intentional and in scope | Risk 2 | High — if UI-SPEC is aspirational and schoolType-mapping is actually out-of-scope, UI form should drop that field. Needs user confirmation. |
| A5 | `shadcn/ui` has `Command`, `Popover`, `Toggle`, `AlertDialog` already installed from Phase 10 | Environment Availability | Low — `npx shadcn add ...` is one command if missing. |
| A6 | Playwright config has a `mobile-chrome` project already from Phase 10.5 | Risk 7 | Low — easy verification at planning time; trivial to add. |

**Planner and discuss-phase should confirm A3 and A4 with the user before execution.**

## Sources

### Primary (HIGH confidence — in-codebase verification)

- `apps/api/prisma/schema.prisma` (full read, all relevant models)
- `apps/api/src/modules/teacher/teacher.service.ts` (full read)
- `apps/api/src/modules/subject/subject.service.ts` (full read)
- `apps/api/src/modules/auth/` (directory listing)
- `apps/api/src/modules/user-context/user-context.service.ts` (partial — confirms Person.keycloakUserId usage pattern)
- `packages/shared/src/types/timetable.ts` (SUBJECT_PALETTE confirmed, line 95)
- `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-CONTEXT.md` (full — 16 decisions)
- `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-UI-SPEC.md` (§2.4, §3.3, §5.1 read in detail; headings scanned for full structure)
- `.planning/phases/10-schulstammdaten-zeitraster/10-RESEARCH.md` (Validation Architecture template §401-426)
- `./CLAUDE.md` (migration hygiene rule, stack pins, GSD workflow)

### Secondary (MEDIUM — training-knowledge-derived WCAG formula)

- WCAG 2.1 §1.4.3 relative-luminance formula (public-domain specification; formula is canonical and stable across versions) [CITED: https://www.w3.org/TR/WCAG21/#dfn-relative-luminance]

### Tertiary (ASSUMED — not independently verified this session)

- `@keycloak/keycloak-admin-client` package name, API shape, token-caching convention (A1, A2)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — relies entirely on Phase 10 precedent which is in-tree.
- Architecture: HIGH — schema queried directly, service-layer read directly.
- Pitfalls: HIGH — two schema gaps are in-codebase grep-verified, not speculation.
- Keycloak admin module design: MEDIUM — admin-client package not yet in `package.json` this session; shape is [ASSUMED] standard.

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (30 days; stable domain — no fast-moving libraries involved)

## RESEARCH COMPLETE

## Open Questions (RESOLVED)

_This section records the planner-level resolution of research-time open questions and assumptions, captured 2026-04-22 during the Phase 11 plan-revision workflow._

| Item | Resolution date | Resolution |
|------|-----------------|------------|
| **A3** — "D-11 schema-change is in scope for Phase 11 (not deferred)" | 2026-04-22 | **RESOLVED — no color migration.** User descoped Subject color schema changes for Phase 11 (Assumption A3 resolution). Admin-chosen colors are deferred to a future phase (future migration + picker UI). Colors remain auto-derived via existing v1.0 `getSubjectColor(id)` hash-to-SUBJECT_PALETTE mapping. See REQUIREMENTS.md SUBJECT-02 update + 11-CONTEXT.md D-11 rollback. |
| **A4** — "D-stuff re: 'Schultyp-Zuordnung' on Subject in UI-SPEC §3.3 is intentional and in scope" | 2026-04-22 | **RESOLVED — no schoolType junction.** Subject keeps its single optional `schoolType` enum column; multi-select via junction table is deferred. Schultyp multi-select field is REMOVED from SubjectFormDialog in Phase 11. See 11-CONTEXT.md post-research descope note in the §3.3 post-research block. |
| **D-11** — Free Hex Picker with WCAG-AA warn-live preview | 2026-04-22 | **RESOLVED — rolled back.** Free hex picker is removed from SubjectFormDialog. Auto-palette via `getSubjectColor(id)` retained (deterministic, WCAG-AA-compliant by construction). Dialog now ships with Name + Kürzel fields only + information note "Manuelle Farbauswahl folgt in einer späteren Phase." |
| **SUBJECT-04 / SUBJECT-05 labeling mismatch** | 2026-04-22 | **RESOLVED — scope clarified.** SUBJECT-04 (Wochenstunden pro Fach pro Klassenstufe anpassen) moved to Phase 12 per ROADMAP update — ClassSubject junction and Wochenstunden editing live with the Klassen CRUD work. SUBJECT-05 is the canonical "Admin kann ungenutzte Fächer löschen / Orphan-Schutz" requirement delivered in 11-02 via `SubjectService.remove` Orphan-Guard. Kürzel-uniqueness (existing `@@unique([schoolId, shortName])` + inline 409 UI) is an **implementation constraint**, not a standalone REQ-ID — REQUIREMENTS.md has no separate uniqueness requirement. Phase 11 `requirements` frontmatter now covers TEACHER-01..06 + SUBJECT-01, SUBJECT-02, SUBJECT-03, SUBJECT-05. |

**Follow-up:** A1, A2, A5, A6 remain unchanged (Keycloak admin client assumptions, shadcn availability, mobile-chrome project) — trivial to verify at execution time with no scope impact.
