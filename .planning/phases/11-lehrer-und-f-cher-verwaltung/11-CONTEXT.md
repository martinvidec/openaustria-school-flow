# Phase 11: Lehrer- und Fächer-Verwaltung - Context

**Gathered:** 2026-04-22
**Status:** Ready for planning
**Mode:** Smart discuss (batch grey-area tables, 4 areas × 4 questions)

<domain>
## Phase Boundary

Admin kann Lehrerstammdaten (inkl. Keycloak-Verknüpfung, Werteinheiten/Lehrverpflichtung, Verfügbarkeit, Ermäßigungen) und Fächer (inkl. Stundentafel-Vorlagen-Readout pro Schultyp, Orphan-sichere Löschung) über das Web-Admin-UI pflegen. Erster UI-Layer über den existierenden v1.0-Backends `TeacherModule` + `SubjectModule` (werteinheiten.util, austrian-stundentafeln Templates, Orphan-Guard als Gap-Fix). Mobile-Parität bei 375px für alle Formulare. E2E mit Playwright für Lehrer- und Fächer-CRUD (happy + error × desktop + mobile-375).

Deckt: TEACHER-01..06, SUBJECT-01..05 (11 Requirements).

</domain>

<decisions>
## Implementation Decisions

### Area 1 — Navigation & Route Structure

- **D-01:** Separate Routes — `/admin/teachers` und `/admin/subjects` als eigenständige TanStack-Router file-based routes. Eine Oberfläche pro Concern, konsistent mit Phase 10's `/admin/school/settings`. Skaliert zu Phase 12 (Schüler/Klassen) und Phase 13-15 (User, Solver, DSGVO).
- **D-02:** List → Detail Flow mit TanStack-Router param routes — `/admin/teachers/$teacherId` öffnet Detail-Seite mit 4 horizontalen Section-Tabs (Stammdaten | Lehrverpflichtung | Verfügbarkeit | Ermäßigungen). Mirror des Phase 10 D-01 Patterns. Subjects verwenden Dialog-Edit (siehe Area 3), nicht Detail-Page — Begründung: 3-Feld-Entity ist für eine Detail-Seite überproportioniert.
- **D-03:** Sidebar-Gruppierung — Neue "Personal & Fächer" Gruppe im `AppSidebar` und `MobileSidebar` unter der Admin-Sektion, zwei Einträge (Lehrer, Fächer). Gruppe erweitert sich in Phase 12 um Schüler + Klassen. Role-Gating via `roles: ['admin', 'schulleitung']` konsistent mit Phase 10.
- **D-04:** Empty-List-Flow — Keine Teacher vorhanden → Liste rendert Inline-CTA "Noch keine Lehrerinnen und Lehrer — Erste Lehrperson anlegen" statt leeres Table-Body. Matches Phase 10 D-03 (kein separater First-Run-Wizard). Same pattern for Fächer.

### Area 2 — Teacher Detail UX

- **D-05:** Werteinheiten-Editor — Editable inputs (Beschäftigungsgrad %, OEPU-Gruppen-Stunden, Zusatz-Stunden) mit live-computed WE-Total. werteinheiten.util.ts wird als pure function auch im Frontend (packages/shared Re-Export) verwendet, damit Server und Client identisch rechnen. Tab 2 "Lehrverpflichtung" zeigt: Eingabefelder oben, computed WE-Total + Breakdown unten, "Gespeichert: X WE" Badge.
- **D-06:** Verfügbarkeits-Editor — Visual Week-Grid (Mo-Fr × periods from active TimeGrid) mit Toggle-Klick pro Zelle. **[USER-OVERRIDE: day-list war recommended, User wählte Grid]**. Implementation-Risk: Mobile-375 Adaption des Grids erfordert sm:breakpoint-specific layout (z.B. day-picker Dropdown + nur 1 Tag sichtbar). Grid-Cells rendern `AvailabilityRule`-DTO-Einträge (recurring, dayOfWeek + startPeriod..endPeriod) zurück; CRUD ops sind Bulk-Operations.
- **D-07:** Ermäßigungen-UI — Row-Add-List auf Tab 4 "Ermäßigungen". Pro Row: Select (Grund — Klassenvorstand, OEPU-Funktion, Supplier-Reduktion, Sonstiges) + Number (Stunden) + Delete-Icon. "+ Ermäßigung hinzufügen" Button unten. Matches `TeachingReduction`-DTO; Replace-all-in-transaction-Strategie beim Save (Phase 2 D-04 Pattern).
- **D-08:** Keycloak-Verknüpfung — Search-by-Email-Pattern: Admin tippt Email, Backend-Endpoint `GET /keycloak/users?email=` returnt matching User oder 404; Admin bestätigt Verknüpfung in Dialog. Sicherer als Dropdown (skaliert zu Schulen mit >500 KC-Usern). Entfernen der Verknüpfung via "Verknüpfung lösen"-Button mit Confirm-Dialog.

### Area 3 — Subject & Stundentafel UX

- **D-09:** Fach-Liste — Dense Table (Name | Kürzel | Farbe | Nutzung-Count | Aktionen) auf `/admin/subjects`. Click-auf-Row öffnet Edit-Dialog (shadcn/ui Dialog) mit 3 Feldern (Name, Kürzel, Farbe). "+ Fach anlegen"-Button oben rechts öffnet Create-Dialog. Keine Detail-Page (Entity zu klein). Nutzung-Count ist klickbar → öffnet Liste der zuordnenden Klassen/Teacher (Pattern wird in D-12 wiederverwendet).
- **D-10:** Stundentafel-Vorlagen — Separate Section unterhalb der Fach-Liste auf `/admin/subjects`, read-only Tables pro Schultyp (AHS_UNTERSTUFE, MS, HTL, etc.). Source: `packages/shared` static arrays (Austrian-stundentafeln.ts). Header "Stundentafel-Vorlagen" + Schultyp-Tab/Accordion; pro Schultyp Table (Fach | Klassenstufe 1 | 2 | 3 | 4 — Wochenstunden). Rein informativ, kein Edit. SUBJECT-03 Requirement ("einsehen") erfüllt.
- **D-11:** Farb-Picker — **[USER-OVERRIDE ROLLED BACK 2026-04-22 post-research]** — Phase 11 research surfaced a schema gap: `Subject` model has no `colorBg`/`colorText`/`colorIndex` column and the user explicitly descoped schema changes for this phase (Assumption A3 resolution). Consequence: **the Farbe field is removed from the Subject Create/Edit dialog entirely**. Subject colors remain auto-derived via the existing v1.0 `getSubjectColor(id)` hash-to-SUBJECT_PALETTE mapping (deterministic, WCAG-AA-compliant by construction). Dialog shows only Name + Kürzel plus an information note "Die Farbe wird automatisch aus der Standard-Palette vergeben. Manuelle Farbauswahl folgt in einer späteren Phase." Admin-chosen color customization is deferred to a future phase (future schema migration + picker UI).
- **D-12:** Orphan-Guard Delete Error — 409-Response vom Backend mit `{ affectedClasses: [{id, name}], affectedTeachers: [{id, name}] }` Payload. UI zeigt Inline-Hinweis im Delete-Confirm-Dialog: "Fach X hat N Zuordnungen:" + scrollbare Liste der Klassen/Teacher (jede mit Deep-Link auf die jeweilige Detail-Seite — functional für Phase 11 für Teacher, TODO-Placeholder für Phase 12 Klasse). Action: "Löschen" ist disabled bis alle Zuordnungen aufgelöst sind. Matches 409-Problem+JSON-Pattern aus Phase 1 D-12.

### Area 4 — Delivery Scope & Gap-Fix

- **D-13:** E2E Coverage — Full ROADMAP Scope: Lehrer-CRUD (create/edit/delete/Werteinheiten-Edit) × (happy + error) × (desktop + mobile-375) + Fächer-CRUD (create/edit/delete inkl. Orphan-Guard-Error) × (happy + error) × (desktop + mobile-375). Ziel: 8 Spec-Files. Pattern-Referenzen: Phase 10.2 SILENT-4XX-Sweep, Phase 10.5-02 Mobile-Prefix-Isolation (E2E-TEA-* desktop, E2E-TEA-MOBILE-* mobile). Mobile-WebKit Bus-Error-10 bleibt acceptable (10.4-03 Precedent) — Chromium-375-Emulation ist Verifikation.
- **D-14:** Orphan-Guard Gap-Fix — atomic tasks im Phase-11-Plan (nicht separate Phase). Scope: `TeacherService.remove` dependency check (prüft `TeacherSubject`, `TimetableLesson.teacherId`, `Substitution.originalTeacherId/supervisorTeacherId`, `ClassBookEntry.teacherId` — wirft `ConflictException` mit affected-entity-list); `SubjectService.remove` dependency check (prüft `TeacherSubject`, `ClassSubject`, `TimetableLesson.subjectId`, `HomeworkAssignment.subjectId`, `Exam.subjectId` — wirft `ConflictException` mit affected-entity-list). Plus Unit-Tests + E2E-Error-Path. Matches v1.1 Gap-Fix-Policy ("Gap fixes are atomic tasks inside plans, not new requirements").
- **D-15:** Validation Split — Defense-in-Depth: (1) `packages/shared/src/validation/` Zod-Schemas für Teacher + Subject + AvailabilityRule + TeachingReduction, (2) RHF + zodResolver im Frontend für Live-Inline-Errors, (3) bestehendes NestJS class-validator auf DTOs für Server-Side Re-Validation. Phase 10 D-15 Pattern: Deutsche UI-Error-Strings (aus Zod `z.string({message: 'Name ist erforderlich'})`), englische API-Field-Names (JSON), englische Server-Messages (fallback falls Client-Side übergangen wird).
- **D-16:** Plan Breakdown — **[USER-OVERRIDE: 5 plans war recommended, User wählte 3 plans]**. Gebundelte 3-Plan-Struktur: 
  - **Plan 11-01** — Shared foundation + Teacher-CRUD: Zod-Schemas in `packages/shared`, Routes-Shell (AppSidebar-Eintrag, `/admin/teachers` + `/admin/teachers/$id`), TanStack-Query-Hooks (useTeachers, useTeacher, useCreateTeacher, useUpdateTeacher, useDeleteTeacher, useAvailabilityRules, useTeachingReductions, useKeycloakUsers), Teacher-List-Page, Teacher-Detail-Page mit 4 Tabs (Stammdaten + Werteinheiten + Verfügbarkeits-Grid + Ermäßigungen + Keycloak-Link). Inkl. TeacherService.remove Orphan-Guard Gap-Fix + Unit-Tests.
  - **Plan 11-02** — Fächer-CRUD + Stundentafel-Vorlagen: Routes `/admin/subjects`, TanStack-Query-Hooks (useSubjects, useCreateSubject, useUpdateSubject, useDeleteSubject, useStundentafelTemplates), Subject-Dense-Table mit Edit-Dialog (Free-Hex-Picker mit WCAG-Warn-Live-Preview + SUBJECT_PALETTE-Swatch), Stundentafel-Vorlagen-Section (read-only per Schultyp aus packages/shared), Orphan-Guard Delete-Dialog mit Affected-Entity-List. Inkl. SubjectService.remove Orphan-Guard Gap-Fix + Unit-Tests.
  - **Plan 11-03** — E2E Sweep: 8 Spec-Files (Lehrer-CRUD × {happy, error} × {desktop, mobile-375} + Fächer-CRUD × {happy, error} × {desktop, mobile-375}). Reuse Phase 10.2 + 10.5 patterns (SILENT-4XX, prefix-isolation, API-cleanup-afterEach). Bump E2E coverage matrix.

### Claude's Discretion
- Exakte Sidebar-Position der "Personal & Fächer"-Gruppe in `AppSidebar.tsx` (wahrscheinlich unter Schul-Einstellungen, vor Solver/Substitutions)
- shadcn/ui Primitives-Auswahl pro Tab (Tabs, Dialog, Form, Select, Input etc. — wie Phase 10)
- Icons aus lucide-react (UserPlus, BookOpen, Grid3x3 für Verfügbarkeits-Grid, Palette für Farbpicker, etc.)
- Grid-Cell-Styling des Verfügbarkeits-Editors (Color-Legende für "verfügbar" vs "gesperrt")
- Exact WCAG-contrast-ratio-Library-Wahl (z.B. `tinycolor2` oder eigene Utility)
- Affected-Entity-Modal-Size und Pagination (bei sehr vielen Zuordnungen)
- Mobile-Adaption des Verfügbarkeits-Grids (Day-Picker vs Swipe-Navigation)
- Solver-Re-Run Banner nach Werteinheiten/Verfügbarkeits-Änderung (analog Phase 10 D-13) — wahrscheinlich ja, soft banner "Änderungen wirken sich erst beim nächsten Stundenplan-Lauf aus"
- Bulk-Actions auf Teacher-Liste (Multi-Deaktivierung) — deferred zu späterer Phase wenn nicht trivial
- Export-Button auf Teacher-Liste (CSV) — nicht in Requirements, deferred

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets (v1.0 Backend)
- **TeacherModule** (`apps/api/src/modules/teacher/`) — Controller + Service + DTOs (create/update, availability-rule, teaching-reduction) + `werteinheiten.util.ts` (pure functions, testable, reusable client-side) + specs. v1.1 fügt nur Gap-Fix (Orphan-Guard in `.remove`) hinzu — keine neuen Endpoints.
- **SubjectModule** (`apps/api/src/modules/subject/`) — Controller + Service + DTOs (create/update/apply-stundentafel) + `stundentafel-template.service.ts` + `templates/austrian-stundentafeln.ts` + specs. v1.1 fügt Orphan-Guard + Gap-Fix für veraltete `SchoolTypeDto`-Kopie (siehe memory `project_double_prefix_bug.md`) hinzu.
- **Austrian Stundentafel Templates** (`apps/api/src/modules/subject/templates/austrian-stundentafeln.ts`) + `packages/shared/src/stundentafel/` (Phase 2) — Statische TS-Arrays pro Schultyp; read-only Render-Source für SUBJECT-03.
- **werteinheiten.util.ts** (`apps/api/src/modules/teacher/werteinheiten.util.ts`) — Pure function für WE-Computation (Besch.-Grad × Vollzeit-Faktor + OEPU-Zuschläge). Sollte nach `packages/shared/src/werteinheiten/` umziehen oder re-exportiert werden, damit Client identisch rechnet.

### Reusable Assets (v1.1 Frontend from Phase 10)
- **PageShell / UnsavedChangesDialog / StickyMobileSaveBar / InfoBanner / WarnDialog** (`apps/web/src/components/admin/`) — Phase 10 shared admin components; Teacher Detail-Page wiederverwendet PageShell + UnsavedChangesDialog (Pro-Tab-Dirty-State) + StickyMobileSaveBar pro Tab + WarnDialog für Keycloak-Unlink + Destructive-Edit.
- **useSchoolContext Zustand Store** (`apps/web/src/stores/school-context-store.ts`) — Liefert schoolId und activeSchoolYearId für Queries.
- **shadcn/ui Primitives** (`apps/web/src/components/ui/`) — tabs, dialog, input, select, button, card, label, popover, dropdown-menu vorhanden. Neu für Phase 11: ggf. `color-picker` (manuell, analog Textarea in Phase 5), `command` (für Keycloak-Email-Search autocomplete).
- **apiFetch + Problem-Details-Parser** (`apps/web/src/lib/api.ts`) — RFC 9457 application/problem+json wird bereits geparst; Orphan-Guard 409 mit custom payload kann über `extensions`-Feld transportiert werden (RFC-compliant).
- **TanStack Query + RHF + Zod** — Etablierter Stack (Phase 4/10 Pattern). Alle neuen Hooks folgen `useQuery({queryKey: ['teachers', schoolId], ...})` Pattern; invalidation beim Mutation-Success.
- **Silent-4xx-Toast-Invariante** (Phase 10.1-01 + 10.2-04) — Alle neuen Mutation-Hooks MÜSSEN useMutation's `onError` explizit verdrahten, niemals silent 4xx als Success behandeln. Covered by SILENT-4XX E2E Pattern.
- **Playwright E2E Harness** (Phase 10.3) — `loginAsRole`, `getRoleToken`, globalSetup + CardTitle-Helper (10.4-01). Reuse direkt für Phase 11 Specs.

### Established Patterns
- **Deutsche UI-Texte, englische API-Feldnamen** (Phase 1 D-15)
- **CheckPermissions({ action, subject })** — `subject: 'teacher'` + `subject: 'subject'` (Case-sensitive — Subject=entity type). Actions `create|read|update|delete|manage`.
- **Replace-all-in-transaction** für Availability-Rules und Teaching-Reductions (Phase 2 D-04)
- **RFC 9457 problem+json 409** für Orphan-Guard (Phase 1 D-12), mit custom `affectedEntities`-Extension
- **Prisma-Migration via `prisma migrate dev --name ...`** — Phase 11 braucht *keine* neuen Migrations (UI-only), außer wenn Gap-Fix Schema-Änderungen verlangt (unwahrscheinlich)
- **Mobile-Parity Nyquist Wave 0** (Phase 4/6/7 pattern) — Alle Specs werden als `it.todo()` erst geschrieben, dann implementiert

### Integration Points
- **AppSidebar + MobileSidebar** — Neuer Section-Eintrag "Personal & Fächer" mit 2 Child-Entries
- **Shared Zod Schemas** — `packages/shared/src/validation/teacher.ts` + `subject.ts` + `availability-rule.ts` + `teaching-reduction.ts`
- **Shared werteinheiten util** — Move oder re-export `werteinheiten.util.ts` nach `packages/shared/src/werteinheiten/`
- **Keycloak-User-Search-Endpoint** — Muss existieren oder als Gap-Fix ergänzt werden; `GET /api/v1/admin/keycloak/users?email=` (wahrscheinlich bereits durch UserModule in Phase 13 vorgesehen; Phase 11 darf vorziehen oder lokalen Workaround nutzen — zu klären im Plan)
- **Solver Re-Run Hook** — TimeGrid/Verfügbarkeit-Änderung löst kein automatisches Re-Solve aus; UI zeigt nur Info-Banner

</code_context>

<specifics>
## Specific Ideas

- **Visual Week-Grid für Verfügbarkeit (D-06)** — User explizit override statt Day-List. Mobile-375 Adaption ist known risk; Plan 11-01 muss Day-Picker-Fallback oder Swipe-Pattern spezifizieren.
- **Free Hex Picker (D-11)** — User explizit override statt curated palette. WCAG-AA Live-Contrast-Warning ist Mitigation; SUBJECT_PALETTE bleibt als "Empfohlene Farben"-Swatch-Leiste.
- **3 bundled plans (D-16)** — User explizit override statt 5-plan parallel split. Trade-off: größere Plans, weniger Wave-Parallelism, aber weniger plan-seam overhead.

</specifics>

<deferred>
## Deferred Ideas

- **Bulk-Actions auf Teacher-Liste** (Multi-Deaktivierung / Multi-Archiv) — nicht in Requirements, deferred zu späterer Phase
- **Teacher-CSV-Export** — nicht in Requirements, deferred
- **Lehrer-Verfügbarkeit UX v2 mit Visual-Range-Drag** — v1 shipped als Grid mit Click-to-Toggle; Drag-to-Range könnte in späterer UX-Polish-Tranche folgen
- **Fach-Import aus Vorlage** — z.B. "Apply Stundentafel-Vorlage an Klasse X" gehört zu Phase 12 (CLASS-03)
- **Keycloak-Bulk-Create aus Teacher-List** — Wenn Admin Teacher ohne KC-Link hat, keine UI-Aktion zum KC-Account-Create; deferred zu Phase 13 (User-Management)
- **Subject-Icon-System** — Nur Farbe, kein Icon; deferred
- **Werteinheiten-Report (aggregiert pro Lehrer über Jahr)** — Analytics, deferred zu v1.3

</deferred>
