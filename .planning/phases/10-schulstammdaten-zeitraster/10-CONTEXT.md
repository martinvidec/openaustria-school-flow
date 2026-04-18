# Phase 10: Schulstammdaten & Zeitraster - Context

**Gathered:** 2026-04-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Admin kann eine Schule UI-gestuetzt aufsetzen und pflegen: Stammdaten (Name, Schultyp, Adresse), Zeitraster (Perioden, Pausen, Unterrichtstage), Schuljahr (Start/End/Semester/Ferien/autonome Tage), A/B-Wochen-Modus. Erstes Admin-Surface der v1.1 Schuladmin Console -- legt das UX-Muster fuer alle nachfolgenden Admin-Phasen (11-16) fest. Backend-APIs fuer School/TimeGrid/SchoolYear existieren aus v1.0 Phase 1; zwei gezielte Schema-Migrationen sind Teil dieser Phase (abWeekEnabled auf School, Multi-Year via isActive).

</domain>

<decisions>
## Implementation Decisions

### Admin-Onboarding-Flow (pattern-setter fuer v1.1)
- **D-01:** Settings-Shell via Detail-Page mit 4 horizontalen Sektions-Tabs -- Stammdaten | Zeitraster | Schuljahr | Optionen. Route `/admin/school/settings`. Tabs werden auf Mobile zu Dropdown/Stack. Setzt das Muster fuer alle v1.1 Admin-Detail-Screens (Lehrer-Detail, Klasse-Detail, etc.) und fuer Dashboard-Deep-Links aus Phase 16.
- **D-02:** Pro-Tab Save-Modell. Jeder Tab hat eigenen Speichern-Button; ein API-Call pro Tab. Tab-Wechsel bei Dirty-State triggert Unsaved-Changes-Dialog. Fehler bleiben auf den jeweiligen Tab isoliert; partielle Workflows moeglich.
- **D-03:** Empty-Flow ohne separaten Wizard. Wenn keine Schule existiert, zeigt der Stammdaten-Tab eine Inline-Create-Form mit klar sichtbarem CTA "Neue Schule anlegen"; nach Create aktivieren sich Zeitraster/Schuljahr/Optionen-Tabs. Eine Route, ein Shell -- kein separater First-Run-Wizard zu pflegen.

### A/B-Wochen-Architektur
- **D-04:** Schema-Migration: neue Spalte `School.abWeekEnabled` (Boolean default false). Backend-Gap-Fix-Task im Phase-10-Plan. Bisheriges `TimetableRun.abWeekEnabled` bleibt bestehen und wird zum Per-Run-Override.
- **D-05:** Toggle-Semantik: aendert nur den **Default** fuer **neue** TimetableRuns. Bestehende aktive Runs bleiben unveraendert -- kein Zwangs-Re-Solve, keine Kaskade. Konsistent mit Phase-4-Muster (Edits erzeugen neuen Run, ueberschreiben Aktiven nicht).
- **D-06:** UI-Kommunikation: Toggle-Zeile zeigt aktuellen Run-Status ("A/B aktiv/inaktiv im aktuellen Stundenplan"); Banner darunter: "Eine Aenderung gilt ab dem naechsten Stundenplan-Lauf. Bestehende Plaene bleiben unveraendert." Lebt im Optionen-Tab.

### Schuljahr-Semantik
- **D-07:** Schema-Migration: `@unique` auf `SchoolYear.schoolId` entfernen; neues `isActive` Boolean mit partiellem Unique-Index (max ein aktives Jahr pro Schule). Backend-Gap-Fix-Task im Phase-10-Plan. Erfuellt SCHOOL-03 ("Schuljahre" plural, "aktiv markieren") vollstaendig und loest den Sommeruebergangs-Workflow (Vorbereitung des Folgejahrs parallel zum laufenden).
- **D-08:** UI zeigt Liste der Schuljahre mit "Aktiv"-Badge auf der Aktiv-Zeile; "Neues Schuljahr anlegen"-Button; Aktiv-Setzen per Row-Action-Button swappt den Kontext. Ferien und autonome Tage als nested Sub-UI pro Jahr (Inline-Date-Range-Liste).
- **D-09:** Aktiv-Swap ohne Kaskade + Info-Banner. Bestehende TimetableRuns, Klassenbuch-Eintraege, Homework, Exams bleiben referenziell intakt (diese Entitaeten referenzieren TimetableRun/Date, nicht SchoolYear direkt). Banner zeigt "Aktiv seit {Datum}". Neue Entities/Runs ordnen sich implizit dem aktiven Jahr zu.
- **D-10:** Loeschen mit Orphan-Schutz. Loeschen nur erlaubt wenn: nicht-aktiv UND keine referenzierenden Entitaeten (Holidays und AutonomousDays zaehlen als Teil des Jahrs, nicht als Referenz). Fehler-Message analog Phase-11 SUBJECT-05-Muster.

### Zeitraster-Editor-UX
- **D-11:** Editierbare dense-Tabelle mit Inline-Inputs. Spalten: # | Label | Start (HH:mm) | Ende (HH:mm) | Dauer | Pause | Aktion. Drag-Handle links zum Reorder; "+ Periode hinzufuegen" und "Aus Template neu laden"-Buttons unter der Tabelle. Inline-Zeit-Inputs (type=time oder maskierter Text); Dauer wird aus start/end autoberechnet und ist read-only-display.
- **D-12:** Mobile-Adaptation (375px): Tabelle wird zu gestackten Cards pro Periode mit Full-Width-Labels ueber Inputs. 44px Touch-Targets fuer Time-Inputs, Pause-Checkbox, Delete-Icon (MOBILE-ADM-02).
- **D-13:** Destructive-Edit-Schutz: Client erkennt Zeitraster-Drift gegenueber Server-State. Vor Submit prueft Server, ob bestehende TimetableRuns Periods mit geaenderten periodNumber-Slots referenzieren; bei Match zeigt die UI einen Warn-Dialog: "X bestehende Stundenplaene verwenden dieses Zeitraster. Aenderungen koennen Kollisionen verursachen." Optionen: [Nur speichern] [Speichern + Solver neu starten] [Abbrechen]. Admin behaelt Kontrolle; keine stille Inkonsistenz.
- **D-14:** SchoolDay-Toggles (Mo-Sa aktiv) leben **im Zeitraster-Tab** als Wochentage-Checkbox-Row ueber der Perioden-Tabelle. Semantisch: "wann findet Unterricht statt" gehoert zum Zeitraster. Eine Save-Action speichert Wochentage und Perioden gemeinsam.
- **D-15:** Validation Hybrid: Zod-Schema in `packages/shared` fuer Time-Format (`/^\\d{2}:\\d{2}$/`) und Overlap/Gap-Checks (endTime > startTime, periodN.endTime <= periodN+1.startTime, keine duplicate periodNumber). Client zeigt Inline-Errors live waehrend Edit; Server (bestehendes NestJS class-validator) validiert nochmal bei Submit (Defense-in-depth). Deutsche UI-Error-Strings, englische API-Response-Messages -- konsistent mit Phase-1 D-15.

### Claude's Discretion
- Exakte Sidebar-Eintrag-Position in `apps/web/src/components/layout/AppSidebar.tsx` (unter "Admin"-Gruppe; Label "Schulverwaltung" oder "Schule")
- Breadcrumbs/Page-Header-Design konsistent mit bestehenden Admin-Seiten
- React Hook Form + Zod-Resolver Wiring pro Tab (bleibt Phase-4-Pattern)
- Dialog-Komponenten-Wahl fuer Unsaved-Changes/Warn-Dialog (bereits vorhandene shadcn/ui `Dialog`)
- Icon-Auswahl fuer Drag-Handle/Delete/Add aus lucide-react (schon im Stack)
- Ferien- und Schulautonome-Tage-UI-Komponente im Schuljahr-Tab (nested Liste mit Date-Range-Picker)
- Exakte Orphan-Schutz-Query fuer Schuljahr-Loeschung (welche Entitaeten zaehlen als Referenz -- ausser Holidays/AutonomousDays)
- Dashboard-Integration (Phase 16): Phase 10 muss Completion-State aus DB ableitbar lassen -- keine Phase-10-Arbeit an der Checkliste selbst
- Empty-State-Illustrations fuer leere Schulliste / leeres Zeitraster
- Sticky Save-Button-Verhalten auf Mobile
- useSchoolContext-Store-Erweiterung (falls z.B. abWeekEnabled im Context benoetigt wird)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & Requirements
- `.planning/ROADMAP.md` -- Phase 10 goal, success criteria, requirement IDs (SCHOOL-01..05), dependencies (v1.0 backend)
- `.planning/REQUIREMENTS.md` -- Full v1.1 requirement statements: SCHOOL-01, SCHOOL-02, SCHOOL-03, SCHOOL-04, SCHOOL-05, MOBILE-ADM-02 (375px+44px)
- `.planning/PROJECT.md` -- v1.1 milestone goal, constraints, current active requirements list

### Prior phase decisions (foundation this phase builds on)
- `.planning/milestones/v1.0-phases/01-project-scaffolding-auth/01-CONTEXT.md` -- API conventions (RFC 9457 D-12, `/api/v1/` prefix D-13, offset/limit pagination D-14, English-API/German-UI D-15), RBAC+ACL (D-01..D-04), School-Profile foundation (D-08 Zeitraster mit Perioden+Pausen, D-09 Austrian school type templates, D-10 Schultage-Konfiguration, D-11 Schuljahr)
- `.planning/milestones/v1.0-phases/02-school-data-model-dsgvo/02-CONTEXT.md` -- School entity relationships, DSGVO patterns (wichtig fuer Admin-Operations auf Person-Daten in spaeteren Phasen)
- `.planning/milestones/v1.0-phases/04-timetable-viewing-editing-room-management/04-CONTEXT.md` -- React SPA stack patterns (D-01 Classic school grid layout), WebSocket live updates (D-12 Socket.IO namespaces), A/B Week tab switcher (D-05), Timetable Run pattern (D-09/D-10)
- `.planning/milestones/v1.0-phases/09-mobile-pwa-production-readiness/09-CONTEXT.md` -- Mobile breakpoints (D-01 Tailwind responsive audit), PWA scope (D-03 today-only offline), Web Push integration

### Backend code (existing v1.0 baseline)
- `apps/api/prisma/schema.prisma` §30-153 -- Models `School`, `TimeGrid`, `Period`, `SchoolDay`, `SchoolYear`, `Holiday`, `AutonomousDay` (current constraints: `TimeGrid.schoolId @unique`, `SchoolYear.schoolId @unique`, `SchoolDay @@unique([schoolId, dayOfWeek])`)
- `apps/api/prisma/schema.prisma` §680-702 -- `TimetableRun.abWeekEnabled` (current A/B home; Phase 10 adds School.abWeekEnabled parallel)
- `apps/api/src/modules/school/school.controller.ts` -- CRUD endpoints (`POST /schools`, `GET /schools`, `GET /schools/templates`, `GET/PUT/DELETE /schools/:id`)
- `apps/api/src/modules/school/school.service.ts` -- Create with nested timeGrid + schoolYear; update merges DTO fields
- `apps/api/src/modules/school/dto/` -- DTOs `CreateSchoolDto`, `CreateTimeGridDto`, `CreateSchoolYearDto`, `CreateHolidayDto`, `CreateAutonomousDayDto`, `UpdateSchoolDto`
- `apps/api/src/modules/school/templates/` -- Austrian school-type templates (used by `POST /schools` with `useTemplate:true`)
- `apps/api/src/modules/substitution/absence/teacher-absence.service.ts` -- Reads `TimetableRun.abWeekEnabled` for isWeekCompatible() (downstream impact when toggling)

### Frontend code (reuse + integration)
- `apps/web/src/stores/school-context-store.ts` -- Existing Zustand store with schoolId/personType; may extend with active schoolYearId and abWeekEnabled mirroring
- `apps/web/src/components/layout/AppSidebar.tsx` -- Admin-section link pattern (lines 48-98 show existing admin entries `/admin/import`, `/admin/resources`, `/admin/solver`, `/admin/timetable-edit`); new entry `/admin/school/settings`
- `apps/web/src/components/layout/MobileSidebar.tsx` -- Mobile-variant of sidebar (mirror structure)
- `apps/web/src/components/ui/` -- shadcn/ui primitives already available: `tabs`, `dialog`, `input`, `select`, `button`, `card`, `label`, `popover`, `dropdown-menu`
- `apps/web/src/lib/api.ts` -- `apiFetch` helper, URL-base, auth-token injection
- `apps/web/src/lib/query-client.ts` -- TanStack Query config (use for `useSchool`, `useTimeGrid`, `useSchoolYears` hooks)

### Tech-Stack reference
- `CLAUDE.md` -- Version pins and rationale: React 19, Vite 8, TanStack Query 5, TanStack Router 1, shadcn/ui + Radix UI, Tailwind 4, Zustand 5, Zod via React Hook Form, NestJS 11, Prisma 7 (Pure-TS), PostgreSQL 17

### Auto-memory notes
- Always restart Vite after API rebuild during UAT (see `/Users/vid/.claude/projects/-Users-vid-Documents-GitHub-agentic-research-openaustria-school-flow/memory/feedback_restart_vite.md`)
- App startup procedure (see memory reference_app_startup.md)
- "Admin kann X" requirements need UI evidence -- plan UAT with actual UI clicks (see feedback_admin_requirements_need_ui_evidence.md)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **School CRUD module** (`apps/api/src/modules/school/`) -- Complete controller + service + DTOs from v1.0 Phase 1; Phase 10 extends DTOs with `abWeekEnabled` and adds `isActive` for SchoolYear, plus (ideally) split SchoolYear into its own submodule or sub-controller.
- **Austrian school type templates** (`apps/api/src/modules/school/templates/`) -- Reused via "Aus Template neu laden"-Button in Zeitraster-Editor.
- **useSchoolContext Zustand store** (`apps/web/src/stores/school-context-store.ts`) -- Existing pattern; Phase 10 may extend with activeSchoolYearId and abWeekEnabled mirroring after load.
- **shadcn/ui primitives** (`apps/web/src/components/ui/`) -- `tabs`, `dialog`, `input`, `select`, `card`, `label` already installed; no new shadcn additions needed.
- **TanStack Query + React Hook Form + Zod** (Phase 4 stack) -- All three are established patterns; Phase 10 adds new hooks in `apps/web/src/hooks/` (e.g., `useSchool`, `useSchoolSettings`, `useTimeGrid`, `useSchoolYears`).
- **AppSidebar / MobileSidebar** -- Admin-link pattern with role-gating via `roles: ['admin', 'schulleitung']`; add new entry.
- **RFC 9457 error-response format** (Phase 1 D-12) -- Frontend already parses `application/problem+json`; validation errors from new endpoints integrate without changes.

### Established Patterns
- **German UI text, English API field names** (Phase 1 D-15) -- Labels in German ("Schulstammdaten", "Zeitraster"), API property names in English ("schoolType", "abWeekEnabled")
- **Partial updates** -- All PUT endpoints accept partial DTOs (class-validator marks most fields optional)
- **Permission decorator** -- `@CheckPermissions({ action, subject })` on controller methods; Phase 10 endpoints use `subject: 'school'` with `create|read|update|delete` actions, plus `manage` for A/B toggle
- **WebSocket live updates via Socket.IO** (Phase 4 D-12) -- If Phase 10 emits school-update events, reuse existing namespace pattern; not strictly required for Phase 10 but consider for abWeekEnabled changes if other tabs are open
- **BullMQ jobs** -- Not directly relevant to Phase 10 (no long-running ops), but schema migrations in this phase may want a data-backfill step
- **Prisma migrations via `npx prisma migrate dev --name ...`** -- Two migrations expected: `10_add_school_ab_week_enabled`, `10_school_year_multi_active`

### Integration Points
- **Prisma schema changes** (`apps/api/prisma/schema.prisma`) -- (1) `School.abWeekEnabled Boolean @default(false)`; (2) `SchoolYear.schoolId` drop `@unique`, add `isActive Boolean @default(false)` with partial-unique-index migration raw-SQL: `CREATE UNIQUE INDEX school_years_active_per_school ON school_years (school_id) WHERE is_active = true`
- **Backend module extensions** -- `SchoolModule` gets: SchoolYear sub-controller/service for multi-year CRUD + activation endpoint (`POST /schools/:id/school-years/:yearId/activate`); School update-DTO accepts `abWeekEnabled`
- **Frontend new route** -- `apps/web/src/routes/_authenticated/admin/school.settings.tsx` (TanStack Router file-based route) with 4 Tab components: `SchoolDetailsTab`, `TimeGridTab`, `SchoolYearTab`, `OptionsTab`
- **Sidebar nav entry** -- Add to `AppSidebar.tsx` and `MobileSidebar.tsx`: `{ href: '/admin/school/settings', label: 'Schulverwaltung', roles: ['admin', 'schulleitung'] }`
- **Default School for fresh install** -- Phase 1 seed creates a default School; Phase 10 UI must handle both "School exists" and "No School exists" states (D-03 Inline-Create)
- **Downstream: Phase 16 Dashboard** -- Setup-Checklist reads School/TimeGrid/SchoolYear state via these endpoints; Phase 10 ensures clean read-model-queryability
- **Downstream: Phase 14 Solver-Tuning** -- Per-Run abWeekEnabled override remains available in Solver screens; School-level is the default source

</code_context>

<specifics>
## Specific Ideas

- Tabellen-Muster fuer Zeitraster ist vertraut fuer DACH-Schuladmins (Untis-aehnlich) -- Excel-Gefuehl bei dense Bulk-Edit
- Setting-Page-Shell (Tabs) wird zum Referenz-Muster fuer Phasen 11-16 Detail-Screens
- "Aus Template neu laden"-Button soll destruktiv wirken (wipes current periods) -- Bestaetigungs-Dialog erwartet
- UI-Sprache: der Admin ist Schulpersonal, nicht IT -- alle Labels, Hinweise, Fehlermeldungen in klarem Deutsch ohne Tech-Jargon (aus feedback_admin_requirements_need_ui_evidence.md)
- Pro-Tab Save laesst den Admin in kleinen Schritten arbeiten (z.B. erst Stammdaten ohne Zeitraster) -- matches der Realitaet, dass Schuladmins oft mit Teilinfos beginnen

</specifics>

<deferred>
## Deferred Ideas

- **School.contactEmail / contactPhone** -- Bewusst nicht als Schul-Feld. Wird in Phase 13 (User-Verwaltung) ueber die "Hauptansprechpartner"-Relation zu einem User-Record abgebildet. SCHOOL-01 wird in Phase 10 mit Name/Schultyp/Adresse abgedeckt; "Kontakt" wandert als strukturierte User-Referenz nach Phase 13.
- **Stundentafel-Vorlagen-Picker pro Klasse** -- Gehoert zu Phase 11/12 (SUBJECT-03/04, CLASS-03). Phase 10 beruehrt Templates nur fuer Zeitraster-Initial-Load.
- **Constraint-Weight-Tuning und Run-Level-A/B-Override** -- Phase 14 (SOLVER-01..05). Phase 10 liefert nur den Schul-Level-Default; Per-Run-Settings bleiben Phase 14.
- **Dashboard-Setup-Checkliste selbst** -- Phase 16 (ADMIN-01..03). Phase 10 stellt lediglich sicher, dass der Completion-State der 4 Tabs (vorhanden/leer/unvollstaendig) aus den API-Endpoints queryable ist.
- **Archivieren alter Schuljahre** -- falls "nur leere Jahre loeschen" zu restriktiv wird, koennen spaetere Milestones einen Archiv-Flag nachruesten. Aktuell nicht noetig.
- **Explicit Audit-Log-Eintrag fuer Jahr-Swap** -- Phase 15 (AUDIT-VIEW-01..03). Phase 10 nutzt das bestehende Audit-Interceptor-Pattern aus Phase 1; keine spezialisierten Audit-Schemas noetig.

</deferred>

---

*Phase: 10-schulstammdaten-zeitraster*
*Context gathered: 2026-04-18*
