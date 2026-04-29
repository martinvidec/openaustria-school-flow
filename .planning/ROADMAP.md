# Roadmap: OpenAustria SchoolFlow

## Milestones

- ✅ **v1.0 MVP** — Phases 1-9 + gap closures 9.1-9.3 (shipped 2026-04-09)
- ◆ **v1.1 Schuladmin Console** — Phases 10-16 (started 2026-04-18)

See [.planning/milestones/v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) for full v1.0 phase details.

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1-9 + 9.1-9.3) — SHIPPED 2026-04-09</summary>

- [x] Phase 1: Project Scaffolding & Auth (7/7 plans)
- [x] Phase 2: School Data Model & DSGVO (8/8 plans)
- [x] Phase 3: Timetable Solver Engine (6/6 plans)
- [x] Phase 4: Timetable Viewing, Editing & Room Management (15/15 plans)
- [x] Phase 5: Digital Class Book (10/10 plans)
- [x] Phase 6: Substitution Planning (6/6 plans)
- [x] Phase 7: Communication (8/8 plans)
- [x] Phase 8: Homework, Exams & Data Import (6/6 plans)
- [x] Phase 9: Mobile, PWA & Production Readiness (5/5 plans)
- [x] Phase 9.1: Runtime Blockers Fix (1/1 plan) — GAP CLOSURE
- [x] Phase 9.2: DSGVO Compliance Closure (1/1 plan) — GAP CLOSURE
- [x] Phase 9.3: Solver Frontend Wiring (1/1 plan) — GAP CLOSURE

**Total:** 12 phases, 74 plans, 65/65 requirements satisfied

</details>

## v1.1 Schuladmin Console (Phases 10-16)

**Started:** 2026-04-18
**Status:** Roadmap created — ready to plan Phase 10
**Type:** Brownfield UI-only. All v1.0 backend APIs already shipped; v1.1 delivers admin-facing UI surfaces on top of them. Gap fixes surfaced during build are atomic tasks inside plans, not new requirements.
**Goal:** Ein Schuladmin kann eine neue Schule End-to-End durch die Benutzeroberfläche aufsetzen und den laufenden Schulbetrieb ohne SQL, Swagger oder Seed-Skripte administrieren.

### Phase summary

| # | Phase | REQ count | Depends on | Parallelism |
|---|-------|-----------|------------|-------------|
| 10 | Schulstammdaten & Zeitraster | 5 | Complete    | 2026-04-21 |
| 10.1 | UAT gap closure — DTO/schema/toast | gap-closure | Complete    | 2026-04-21 |
| 10.2 | E2E Admin-Console gap-closure (Tier 1) | 5/5 | Complete    | 2026-04-21 |
| 10.3 | E2E Harness + per-role Smoke (Tier 2) | E2E-hardening | Complete    | 2026-04-21 |
| 10.4 | E2E Harness Hardening (Tier 3a, rescoped) | E2E-hardening | Complete    | 2026-04-22 |
| 10.5 | E2E Admin-Ops Operations (Tier 3b) | 4/4 | Complete    | 2026-04-22 |
| 11 | Lehrer- und Fächer-Verwaltung | 11 | Complete    | 2026-04-23 |
| 12 | Schüler-, Klassen- & Gruppenverwaltung | 9 | Complete    | 2026-04-24 |
| 13 | User- und Rechteverwaltung | 3/3 | Complete    | 2026-04-25 |
| 14 | Solver-Tuning | 5 | Complete    | 2026-04-25 |
| 15 | DSGVO-Admin & Audit-Log-Viewer | 12/12 | Complete    | 2026-04-28 |
| 16 | Admin-Dashboard & Mobile-Härtung | 3/7 | In Progress|  |

**Total:** 7 feature phases + 5 gap/E2E phases (10.1-10.5), 50 requirements, 100% coverage. UAT resumes after Phase 10.5 per `feedback_e2e_first_no_uat.md`.

### Completed v1.1 phases

- [x] Phase 10: Schulstammdaten & Zeitraster (8/8 plans)
- [x] Phase 10.1: UAT gap closure (3/3 plans) — INSERTED
- [x] Phase 10.2: E2E Admin-Console gap-closure (5/5 plans) — TIER 1
- [x] Phase 10.3: E2E Harness + per-role Smoke (2/2 plans) — TIER 2
- [x] Phase 10.4: E2E Harness Hardening & Deferred-Items Closure (3/3 plans) — TIER 3a
- [x] Phase 10.5: E2E Admin-Ops Operations (4/4 plans) — TIER 3b

---

### Phase 10: Schulstammdaten & Zeitraster

**Goal:** Admin kann eine neue Schule mit Zeitraster und Schuljahr UI-gestützt aufsetzen — Fundament für alle weiteren Admin-Oberflächen.
**Requirements:** SCHOOL-01, SCHOOL-02, SCHOOL-03, SCHOOL-04, SCHOOL-05
**Depends on:** v1.0 backend (SchoolModule, TimeGrid, SchoolYear already exist from v1.0 Phase 1-2)
**Plans:** 8/8 plans complete

**Success criteria:**
- [ ] Admin kann eine neue Schule anlegen und Stammdaten (Name, Typ, Adresse, Kontakt) editieren
- [ ] Admin kann ein Zeitraster mit Perioden, Pausen und Unterrichtstagen definieren und editieren
- [ ] Admin kann ein Schuljahr mit Start-/Enddatum anlegen und als aktiv markieren
- [ ] Admin kann A/B-Wochen-Modus pro Schule aktivieren/deaktivieren mit sofortiger Auswirkung auf Solver-Constraints
- [ ] Alle Oberflächen sind bei 375px mit 44px-Touch-Targets benutzbar

**Known risks / backend gap candidates:**
- Holiday/AutonomousDay standalone CRUD endpoints did not exist in v1.0 — added in Plan 02 Task 3 (D-08 nested Sub-UI requirement).

Plans:
- [ ] 10-01a-PLAN.md — Backend foundation A: Prisma migrations (School.abWeekEnabled + SchoolYear multi-active partial unique index), seed.ts repair, Prisma client regen [BLOCKING for Wave 2+] [Wave 1]
- [ ] 10-01b-PLAN.md — Frontend foundation B: shared Zod schemas + shadcn primitives + RHF/zod installs (parallel with 01a, no file overlap) [Wave 1]
- [ ] 10-02-PLAN.md — Backend SchoolYear sub-module + SchoolTimeGrid destructive-edit endpoint + Holiday/AutonomousDay CRUD endpoints + abWeekEnabled DTO + permission seed + timetable.service cast cleanup [Wave 2]
- [ ] 10-03a-PLAN.md — Frontend page shell + reusable shared admin components (PageShell/UnsavedChangesDialog/StickyMobileSaveBar/InfoBanner/WarnDialog) + sidebar entry + Zustand extension + 4 placeholder tabs [Wave 3]
- [ ] 10-03b-PLAN.md — TanStack Query hooks bundle (useSchool/useTimeGrid/useSchoolYears + Holiday/AutonomousDay hooks/useActiveTimetableRun) + Stammdaten tab full implementation [Wave 4, depends on 03a]
- [ ] 10-04-PLAN.md — Zeitraster tab (PeriodsEditor with DnD, SchoolDay toggles, DestructiveEditDialog 3-button conflict flow with PINNED solver-rerun URL, TemplateReloadDialog) [Wave 5]
- [ ] 10-05-PLAN.md — Schuljahre tab (multi-year list, Aktiv-Badge, Aktivieren/Bearbeiten/Loeschen dialogs, nested Holidays + AutonomousDays via PINNED endpoints) + Optionen tab (A/B toggle + status line + Info Banner) [Wave 5]
- [ ] 10-06-PLAN.md — Playwright E2E (desktop happy path with seeded SCHOOL-05 orphan-guard + mobile 375px touch-target audit) + manual UAT screenshot checkpoint with per-screenshot SCHOOL-XX mapping [Wave 6]

---

### Phase 10.1: UAT gap closure — SchoolTypeDto enum, School.address schema, silent 4xx toast (INSERTED)

**Goal:** Close the 3 blockers found during Phase 10 manual UAT (10-UAT-FINDINGS.md) so Plan 10-06 Task 2 screenshot capture can resume — Bug 3 first (silent 4xx success toast, CRITICAL), then Bug 1 (SchoolTypeDto enum drift), then Bug 2 (School.address schema mismatch + corrupt seed row + migration).
**Requirements:** [gap-closure — no REQ-IDs; must-haves derived from 10-UAT-FINDINGS.md acceptance criteria]
**Depends on:** Phase 10
**Plans:** 3/3 plans complete

Plans:
- [x] 10.1-01-PLAN.md — Bug 3 audit: silent 4xx success-toast across useSchool/useSchoolYears/useTimeGrid/OptionsTab + regression specs [Wave 1]
- [x] 10.1-02-PLAN.md — Bug 1 fix: align SchoolTypeDto with @schoolflow/shared SCHOOL_TYPES (7 active values) + DTO validation regression spec [Wave 2]
- [x] 10.1-03-PLAN.md — Bug 2 fix: School.address → Json? @db.JsonB via hand-authored migration, AddressDto + AddressResponseDto, seed repair for corrupt '[object Object]' row [Wave 3]

---

### Phase 10.2: E2E Admin-Console gap-closure (Tier 1 — INSERTED)

**Goal:** Admin-Console mit Playwright-Coverage absichern. Zeitraster-Save-500 fixen und durch E2E abdecken, Wochentage-UX-Entscheidung treffen und Spec schreiben, Schuljahre edit/delete/activate-Switch durch E2E sichern, Silent-4xx als E2E für alle 4 Tabs, Phase-10 Screenshots automatisiert via Playwright, CI-Workflow wired. Schließt Phase 10 mit.
**Requirements:** E2E-hardening (no new REQ-IDs; must-haves aus E2E-COVERAGE-MATRIX.md Tier 1)
**Depends on:** Phase 10.1
**Plans:** 5/5 plans complete

Plans:
- [x] 10.2-01-PLAN.md — Zeitraster E2E (desktop + mobile) + durationMin UAT fix [Wave 1]
- [x] 10.2-02-PLAN.md — Wochentage UX decision + E2E spec [Wave 2] — FIX landed (18-LoC TimeGridTab promotion) + WOCH-01 spec green
- [x] 10.2-03-PLAN.md — Schuljahre edit/delete/activate E2E [Wave 2] — shipped at 2/3 (YEAR-01 edit deferred, see deferred-items.md #1)
- [x] 10.2-04-PLAN.md — Silent-4xx E2E sweep (Stammdaten/Zeitraster/Schuljahre/Optionen) [Wave 2]
- [x] 10.2-05-PLAN.md — Playwright screenshots + CI workflow + Phase 10 closure [Wave 3] (completed 2026-04-21)

**Success criteria:**
- [ ] `PUT /api/v1/schools/:id/time-grid` Happy-Path + Error-Path (invalid payload) haben je 1 Playwright-Spec (desktop + mobile)
- [ ] Wochentage-Surface: Entscheidung getroffen (Spec oder Backlog), bei "Spec" → E2E deckt `admin kann Mo-So als aktiv/inaktiv markieren` ab
- [ ] Schuljahre edit, delete (non-orphan), activate-switch haben je 1 Playwright-Spec
- [ ] Silent-4xx-Invariante ist als E2E für Stammdaten/Zeitraster/Schuljahre/Optionen verifiziert (green toast ausgeschlossen, red toast present bei 4xx)
- [ ] Phase-10 UAT-Screenshot-Capture läuft via Playwright `page.screenshot()` automatisiert, 6 Bilder unter `.planning/phases/10-schulstammdaten-zeitraster/uat-screenshots/`
- [ ] CI-Workflow (GitHub Actions) running Playwright green on PRs to main
- [ ] Phase 10 wird als `complete` markiert nach 10.2-Verification

---

### Phase 10.3: E2E Harness + per-role Smoke (Tier 2 — INSERTED)

**Goal:** Playwright-Harness für alle 5 Rollen nutzbar machen und je Rolle 1 Smoke-Spec (Login + primäre Aktion). Harness-Extensions: per-role Login-Helper, `globalSetup`/`globalTeardown`, Trace-Retention config, DB-Seeding+Cleanup-Pattern.
**Requirements:** E2E-hardening
**Depends on:** Phase 10.2
**Plans:** 2/2 plans complete

Plans:
- [x] 10.3-01-PLAN.md — Harness extension: loginAsRole(page, role) + getRoleToken(request, role) + globalSetup/globalTeardown + explicit reporter config [Wave 1]
- [x] 10.3-02-PLAN.md — Per-role smoke specs (schulleitung/lehrer/eltern/schueler) [Wave 2]

**Success criteria:**
- [x] Login-Helper pro Rolle: admin, schulleitung, lehrer, eltern, schueler
- [x] `globalSetup` seedet Basis-Fixtures, `globalTeardown` cleaned deterministisch
- [x] Smoke-Specs: schulleitung öffnet Substitutions-Admin · lehrer öffnet Timetable · eltern öffnet Kind-Timetable · schueler öffnet persönliches Timetable (admin bereits covered über 10.2)
- [x] Trace-Retention auf `retain-on-failure`, Screenshots als CI-Artifacts
- [x] Alle neuen Specs laufen in CI (aus 10.2 gewired — CI config unverändert, 4 neue SMOKE-Specs automatisch abgedeckt via testMatch `*.spec.ts`)

---

### Phase 10.4: E2E Harness Hardening & 10.3 Deferred-Items Closure (Tier 3a — INSERTED, RESCOPED 2026-04-22)

**Goal:** Schließt die in 10.3 deferred 3 pre-existing Failures (SCHOOL-02/03/05) und härtet das E2E-Harness (CardTitle-Helper). Schafft die Voraussetzung, dass Phase 11/12 E2E-Authoring ungestört läuft. People-CRUD E2E wurde nach Phase 11 (Lehrer+Fächer) und Phase 12 (Schüler+Klassen) verschoben, da die zu testenden UIs erst dort geshipped werden.
**Requirements:** E2E-hardening
**Depends on:** Phase 10.3
**Plans:** 3/3 plans complete

Plans:
- [x] 10.4-01-PLAN.md — E2E-harness hardening: getByCardTitle helper (Option 4a ADR), SCHOOL-02 heading selector, SCHOOL-05 orphan-year fixture (dotenv+datasources), roles-smoke migration [Wave 1] ✅ 2026-04-22
- [x] 10.4-02-PLAN.md — SchoolYearService.create atomic-demote (TDD RED→GREEN) + SCHOOL-03 E2E regression with API single-active invariant [Wave 1] ✅ 2026-04-22
- [x] 10.4-03-PLAN.md — Full-suite regression gate + ROADMAP consistency audit (read-only) + regression report artifact [Wave 2] ✅ 2026-04-22

**Success criteria:**
- [ ] SCHOOL-02 grün: `admin-school-settings.spec.ts` verwendet `getByRole('heading', { name: 'Unterrichtstage' })` statt `getByText` — Desktop & Mobile-375
- [ ] SCHOOL-03 grün: `SchoolYearService.create` demotet atomar einen existierenden `isActive:true`-Year in derselben Transaktion; `admin-school-settings.spec.ts` SCHOOL-03 zeigt Erfolgstoast „Schuljahr angelegt" (Backend-Gap-Fix inkl. Unit-Test + E2E)
- [ ] SCHOOL-05 grün: `apps/web/e2e/fixtures/orphan-year.ts` lädt `DATABASE_URL` explizit via `dotenv` oder direkter `datasources`-Injection — läuft sowohl in CI als auch lokal ohne `source .env`
- [ ] CardTitle-Harness-Hardening: Entweder Helper `getByCardTitle(name)` in `apps/web/e2e/helpers/` verfügbar & mindestens in einer bestehenden Spec verwendet, ODER shadcn `CardTitle` rendert als `<h3>` nach Tailwind/shadcn-Audit (Plan-zeitliche Entscheidung, per ADR dokumentiert)
- [ ] Gesamt-Regression: Alle desktop E2E-Specs grün (ab 20 bestehenden + ggf. neue Regressions-Tests für SCHOOL-03-Fix)
- [ ] ROADMAP-Edit durchgeführt: People-CRUD-Deliverables nach Phase 11/12 verschoben (siehe deren Success Criteria)

**Descope-Beschluss (2026-04-22):** People-CRUD-E2E (Klassen/Lehrer/Schüler/Fächer) wurde aus Phase 10.4 entfernt, weil die zu testenden Admin-UIs in v1.1 noch nicht existieren (siehe `10.4-RESEARCH.md` Blocker B1). Phase 11 + Phase 12 übernehmen das E2E-Authoring zusammen mit ihrem jeweiligen UI.

---

### Phase 10.5: E2E Admin-Ops Operations (Tier 3b — INSERTED)

**Goal:** Admin-Ops Operations-Surfaces mit E2E absichern: Räume-CRUD inkl. Booking-Conflict, Ressourcen-CRUD, Imports (Untis-XML + CSV Happy-Path + ein Error-Path), Solver-Workflow (trigger → result → publish).
**Requirements:** E2E-hardening
**Depends on:** Phase 10.3 (Harness) — parallel with 10.4 möglich
**Plans:** 4/4 plans complete

Plans:
- [x] TBD (run /gsd:plan-phase 10.5 to break down) (completed 2026-04-22)

**Success criteria:**
- [ ] Räume-Booking-Conflict: Happy + 409 (Räume-CRUD UI deferred to future phase)
- [ ] Ressourcen-CRUD: Happy + Error
- [ ] Imports: Untis-XML Happy-Path, CSV Happy-Path, CSV Error-Path (malformed row)
- [ ] Solver-Workflow: trigger run → WebSocket progress visible → result published — Happy-Path + ein abort/error-Path
- [ ] Nach 10.5-Verification: UAT-Ban ist aufgehoben per `feedback_e2e_first_no_uat.md`

---

### Phase 11: Lehrer- und Fächer-Verwaltung

**Goal:** Admin kann Lehrerstammdaten inkl. Lehrverpflichtung/Werteinheiten und Fächer inkl. Stundentafel-Vorlagen UI-gestützt pflegen.
**Requirements:** TEACHER-01, TEACHER-02, TEACHER-03, TEACHER-04, TEACHER-05, TEACHER-06, SUBJECT-01, SUBJECT-02, SUBJECT-03, SUBJECT-05
**Depends on:** Phase 10 (Schule + Schuljahr müssen vor Lehrer-Anlage existieren)
**Plans:** 3/3 plans complete

**Success criteria:**
- [ ] Admin sieht Lehrerliste mit Suche/Filter und kann einen Lehrer inkl. Person-Daten und Keycloak-Verknüpfung anlegen/editieren
- [ ] Admin kann Lehrverpflichtung/Werteinheiten (Beschäftigungsgrad, OEPU-Gruppen-Stunden, Ermäßigungen) pro Lehrer editieren
- [ ] Admin kann Lehrer-Verfügbarkeit (Tage, Zeitslots, wiederkehrende Ausnahmen) pflegen und Lehrer deaktivieren/archivieren ohne Datenverlust
- [ ] Admin kann Fächer (Name, Kürzel) anlegen/editieren und Stundentafel-Vorlagen pro Schultyp einsehen
- [ ] Fach-Löschung ist Orphan-sicher (Fach mit Zuordnungen kann nicht gelöscht werden)
- [x] **E2E (ex-10.4):** Lehrpersonen-CRUD (create/edit/delete/Werteinheiten-Edit) — je Happy + Error, Desktop + Mobile-375 für Formulare
- [x] **E2E (ex-10.4):** Fächer-CRUD (create/edit/delete inkl. Orphan-Guard-Error) — je Happy + Error, Desktop + Mobile-375 für Formulare

**Known risks / backend gap candidates:**
- SUBJECT-03 (Stundentafel-Vorlagen pro Schultyp einsehen): Templates sind als statische TS-Arrays in v1.0 implementiert — UI muss sie aus dem shared package lesen, nicht aus der DB.
- Orphan-Guard-Backend für Teacher/Subject DELETE fehlt in v1.0 (`TeacherService.remove` + `SubjectService.remove` kaskadieren ohne Dependency-Check). Plan muss Gap-Fix-Task mit ausliefern, damit "Orphan-sicher"-Success-Criterion + E2E-Error-Spec passen.

Plans:
- [x] 11-01-PLAN.md — Shared foundation (Zod schemas + werteinheiten util) + Teacher-CRUD FE/BE + TeacherService.remove Orphan-Guard gap-fix + Keycloak-admin module (GET /admin/keycloak/users) + sidebar "Personal & Fächer" group scaffold + Lehrer entry [Wave 1] — SHIPPED 2026-04-22 (3 tasks, 37 files, TEACHER-01..06 complete)
- [x] 11-02-PLAN.md — Fächer-CRUD FE/BE (Name + Kürzel dialog only, D-11 free-hex picker rolled back post-research) + Stundentafel-Vorlagen read-only section (moved to @schoolflow/shared) + SubjectService.remove Orphan-Guard gap-fix + sidebar Fächer entry append [Wave 2, depends on 11-01] — SHIPPED 2026-04-23 (3 tasks, 25 files, SUBJECT-01/02/03/05 complete; AffectedEntitiesList refactored to discriminated union kind: 'teacher' | 'subject' with backward-compat default)
- [x] 11-03-PLAN.md — 8 Playwright E2E specs: Teacher CRUD {happy, error, mobile-375} + Werteinheiten-deep-dive; Subject CRUD {happy, error, mobile-375} + Stundentafel-Vorlagen — reuses Phase 10.3 harness, Phase 10.5-02 prefix-isolation (E2E-TEA-*, E2E-SUB-*), Phase 10.2-04 SILENT-4XX invariant codified at E2E layer [Wave 3, depends on 11-01+11-02] — SHIPPED 2026-04-23 (8 spec files, 23 tests passing on desktop+mobile-chrome, mobile-WebKit/iPhone13 Bus-Error-10 deferred per 10.4-03/10.5-02 precedent; surfaced 4 Rule-1 bugs in production: RFC 9457 extensions passthrough, @IsUUID on seed schoolIds, pagination limit cap, SubjectFormDialog edit-payload schoolId leak)

---

### Phase 12: Schüler-, Klassen- und Gruppenverwaltung

**Goal:** Admin kann Schüler, Klassen mit Stammklasse und Klassenvorstand sowie Gruppenableitungsregeln UI-gestützt pflegen.
**Requirements:** STUDENT-01, STUDENT-02, STUDENT-03, STUDENT-04, CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05, SUBJECT-04
**Depends on:** Phase 11 (Fächer + Stundentafel-Vorlagen werden für CLASS-03 benötigt; SUBJECT-04 Wochenstunden-Editing verschoben aus Phase 11 weil ClassSubject-Model hier lebt)
**Plans:** 3/3 plans complete

**Success criteria:**
- [x] Admin kann Schüler mit Person-Daten und Erziehungsberechtigten anlegen, editieren und archivieren
- [x] Admin kann Klassen anlegen/editieren mit Stammklasse-Marker und Klassenvorstand-Zuweisung
- [x] Admin kann Stundentafel-Vorlage auf eine Klasse anwenden und pro Klasse anpassen (inkl. SUBJECT-04: Wochenstunden pro Fach pro Klassenstufe editieren)
- [x] Admin kann Gruppenableitungsregeln (Religion/Leistung/Wahlpflicht) pro Klasse definieren und Gruppenzugehörigkeiten manuell überschreiben
- [x] Admin kann Schüler zwischen Stammklassen umziehen ohne Datenverlust und ohne Referenz-Bruch zum Klassenbuch
- [x] **E2E (ex-10.4):** Schüler-CRUD (create/edit/delete, Elternlink) — je Happy + Error, Desktop + Mobile-375 für Formulare (Plan 12-03: 11 Playwright specs green)
- [x] **E2E (ex-10.4):** Klassen-CRUD (create/edit/delete mit Orphan-Guard, Stundentafel-Zuordnung) — je Happy + Error, Desktop + Mobile-375 für Formulare (Plan 12-03: 6 class specs green)

**Known risks / backend gap candidates:**
- CLASS-04 (Gruppenmitgliedschaften manuell verwalten): GroupMembership-CRUD in v1.0 unterstützt bereits `isAutoAssigned` — UI muss selective override reflektieren.
- Elternlink-HTTP-Surface fehlt in v1.0: `CreateStudentDto` kennt kein `parentId`, kein `ParentController` exponiert die ParentStudent-Junction. Plan muss Backend-Gap-Fix (CreateStudentDto-Erweiterung + POST `/students/:id/parents`) mitliefern, damit Elternlink-E2E möglich ist.
- Orphan-Guard-Backend für Student/SchoolClass DELETE fehlt in v1.0 (`StudentService.remove` + `ClassService.remove` kaskadieren ohne Dependency-Check). Plan muss Gap-Fix-Task enthalten.

Plans:
- [x] 12-01-PLAN.md — Shared foundation (Zod schemas + Student.isArchived migration + shadcn Command/Checkbox + AffectedEntitiesList kind=student) + Student CRUD FE/BE + Parent-Module greenfield + StudentService.remove Orphan-Guard + Sidebar Schüler-Eintrag [Wave 1] ✅ Complete 2026-04-24 (commits 3f4ce08, b7bc8cf, 2577860)
- [x] 12-02-PLAN.md — Class CRUD FE/BE (with Klassenvorstand TeacherSearchPopover + Teacher-Search gap-fix) + Apply-Stundentafel + SUBJECT-04 Wochenstunden-Editor + GroupDerivationRule migration + Rule-Builder + Dry-Run-Preview + Manual-Overrides + ClassService.remove Orphan-Guard + AffectedEntitiesList kind=class + Sidebar Klassen-Eintrag [Wave 2, depends on 12-01] ✅ Complete 2026-04-24 (commits 7a58260, e263340, 08ba000)
- [x] 12-03-PLAN.md — 11 Playwright E2E specs: Schüler-CRUD happy/error/mobile + archive/parents/move; Klassen-CRUD happy/error/mobile + klassenvorstand/stundentafel/gruppen — Pixel 5 viewport, Phase 10.3 harness, SILENT-4XX invariant codified, E2E-COVERAGE-MATRIX.md bump [Wave 3, depends on 12-01 + 12-02] ✅ Complete 2026-04-24 (commits c692ac5, 26c4282, 5e86796, 44628a9, 2791aa6). 19/19 desktop + 5/5 mobile-chrome green. 5 Rule-1/2/3 backend fixes (11 DTOs @IsUUID→@IsString, shared Zod school-class .uuid→.min(1), ClassService.create persist klassenvorstandId, pagination Max 100→500).

---

### Phase 13: User- und Rechteverwaltung

**Goal:** Admin kann Keycloak-User listen, Rollen zuweisen, CASL-ACL-Overrides pflegen und User mit Person-Records verknüpfen.
**Requirements:** USER-01, USER-02, USER-03, USER-04, USER-05
**Depends on:** Phase 12 (USER-05 verknüpft Keycloak-User mit Teacher/Student/Parent-Person-Records — alle müssen existieren)
**Plans:** 3/3 plans complete

**Success criteria:**
- [x] Admin sieht User-Liste aus Keycloak mit Suche/Filter (Name, Email, Rolle) — backend (13-01) + UI (13-02) + E2E (13-03)
- [x] Admin kann einem User eine oder mehrere der 5 Rollen (Admin, Schulleitung, Lehrer, Eltern, Schüler) zuweisen
- [x] Admin sieht pro User die wirksamen CASL-Permissions mit Rollen-Vererbung
- [x] Admin kann per-User-ACL-Overrides (subject + action + condition) anlegen, editieren und löschen
- [x] Admin kann einen Keycloak-User mit einem Teacher-, Student- oder Parent-Person-Record verknüpfen und die Verknüpfung wieder auflösen

**Known risks / backend gap candidates:**
- USER-01/02/05: Keycloak Admin API Adapter im Backend existiert möglicherweise nur für Login — Admin-User-Listing und Rollenzuweisung könnten eine kleine Service-Erweiterung benötigen (Gap-Fix-Task im Plan). RESOLVED — KeycloakAdminService extended in 13-01 Task 2.
- USER-03: Effektive Permissions-Resolution (Rolle + ACL-Overrides → wirksame Abilities) muss in einem Query-Endpoint verfügbar sein — v1.0 CASL-Factory müsste dies unterstützen, ist aber zu verifizieren. RESOLVED — EffectivePermissionsService greenfield in 13-01 Task 3.

Plans:
- [x] 13-01 Backend foundation (USER-01..05) — complete 2026-04-24
- [x] 13-02 Frontend (admin UI for /admin/users + /admin/permission-overrides) — complete 2026-04-24
- [x] 13-03 E2E sweep

---

### Phase 14: Solver-Tuning

**Goal:** Admin kann Constraint-Templates, Gewichtungen und Zeit-/Fach-Restriktionen UI-gestützt pflegen, ohne den Backend-Code oder die DB direkt anzufassen.
**Requirements:** SOLVER-01, SOLVER-02, SOLVER-03, SOLVER-04, SOLVER-05
**Depends on:** Phase 10 (Schule + Zeitraster müssen existieren für schul-scoped Constraint-Tuning)
**Plans:** 3/3 plans complete

**Success criteria:**
- [x] Admin sieht Constraint-Template-Liste mit klarer Hard/Soft-Unterscheidung und aktueller Gewichtung — E2E-SOLVER-01 (catalog 6 HARD + 9 SOFT)
- [x] Admin kann ConstraintWeightOverrides pro Schule setzen mit sofortiger Validierung (Min/Max/Typ) — E2E-SOLVER-02 + E2E-SOLVER-03 (bounds 422)
- [x] Admin kann ClassTimeslotRestrictions (geblockte Zeitfenster pro Klasse) anlegen und löschen — E2E-SOLVER-04/05/06 (CRUD + cross-ref 422 + multi-row banner)
- [x] Admin kann SubjectTimePreferences (bevorzugte Zeitfenster pro Fach) anlegen und löschen — E2E-SOLVER-07/08/09 (SUBJECT_MORNING + SUBJECT_PREFERRED_SLOT CRUD + sub-tab isolation)
- [x] Erneute Stundenplan-Generierung reflektiert geänderte Weights nachvollziehbar (manuelle Verifikation gegen Pre-Change-Baseline) — E2E-SOLVER-10 (gated, verified the saved weight reaches TimetableRun.constraintConfig)

**Known risks / backend gap candidates:**
- SOLVER-01/02: ConstraintTemplate CRUD existiert aus v1.0 Phase 3 — UI muss die Input-Form für Hard/Soft-Constraint-Parameter generisch gestalten.
- SOLVER-04/05: ClassTimeslotRestriction und SubjectTimePreference sind als Prisma-Modelle vorhanden, aber möglicherweise noch keine CRUD-Endpoints exponiert — als Gap-Fix-Task einplanen.

**Parallelism:** Kann parallel zu Phasen 11–13 ausgeführt werden (via `/gsd:new-workspace`), sobald Phase 10 gelandet ist.

Plans:
- [x] 14-01-backend-PLAN.md — Prisma migration + ConstraintWeightOverride CRUD + cross-reference validation + resolution chain (DB > DTO > defaults) + SUBJECT_PREFERRED_SLOT case + Java sidecar gap-fix [Wave 1] — complete 2026-04-25
- [x] 14-02-frontend-PLAN.md — /admin/solver-tuning 4-tab page (Constraints / Gewichtungen / Klassen-Sperrzeiten / Fach-Präferenzen) + sidebar entry + Generator-Page deep-link card [Wave 2, depends on 14-01] — complete 2026-04-25
- [x] 14-03-e2e-PLAN.md — 12 Playwright specs (E2E-SOLVER-*) + 1 RBAC + 1 mobile-chrome covering catalog + weights + restrictions + preferences + integration + audit + mobile-375 [Wave 3, depends on 14-01 + 14-02] — complete 2026-04-25

---

### Phase 15: DSGVO-Admin & Audit-Log-Viewer

**Goal:** Admin kann Einwilligungen, Aufbewahrungsrichtlinien, DSFA/VVZ und DSGVO-Jobs aus der UI verwalten und das Audit-Log durchsuchen und exportieren.
**Requirements:** DSGVO-ADM-01, DSGVO-ADM-02, DSGVO-ADM-03, DSGVO-ADM-04, DSGVO-ADM-05, DSGVO-ADM-06, AUDIT-VIEW-01, AUDIT-VIEW-02, AUDIT-VIEW-03
**Depends on:** Phase 13 (DSGVO-Jobs laufen pro User; Audit-Log filtert nach Actor)
**Plans:** 12/12 plans complete

**Success criteria:**
- [ ] Admin kann Einwilligungs-Records nach Zweck, Status und User filtern und durchsuchen
- [ ] Admin kann Aufbewahrungsrichtlinien pro Datenkategorie editieren und DSFA-/VVZ-Einträge anlegen/editieren
- [ ] Admin kann Art. 15 Datenexport für einen User aus der UI anstoßen und den BullMQ-Job-Status live verfolgen
- [ ] Admin kann Art. 17 Anonymisierung/Löschung für einen User aus der UI anstoßen, mit 2-stufiger Bestätigung und Job-Status-Tracking
- [ ] Admin kann Audit-Log durchsuchen (Actor, Action, Subject, Zeitraum), einen Eintrag mit Before/After-Diff öffnen und gefilterte Ergebnisse als CSV exportieren

**Known risks / backend gap candidates:**
- DSGVO-ADM-03/04: DSFA/VVZ CRUD aus v1.0 Phase 2 existiert — aber möglicherweise nur als `combined JSON export`, nicht als individuelle Record-CRUD-Endpoints. Als Gap-Fix-Task einplanen.
- DSGVO-ADM-05/06: UI-Trigger für BullMQ-Jobs braucht einen thin Job-Status-Read-Endpoint (Job-ID + Status + Fortschritt). v1.0 hat Job-Queues aber möglicherweise keinen UI-lesbaren Status-API — Gap-Fix-Task.
- AUDIT-VIEW-03: CSV-Export kann fehlen — v1.0 `AuditModule.exportCsv()` via grep verifizieren im Plan-Research. Falls nicht vorhanden: Gap-Fix-Task im Plan.

Plans:
- [x] TBD (run /gsd-plan-phase 15 to break down) (completed 2026-04-28)

---

### Phase 16: Admin-Dashboard & Mobile-Härtung

**Goal:** Admin sieht beim Login ein Dashboard mit Setup-Completeness-Checkliste das alle Admin-Surfaces aus Phasen 10–15 zusammenführt und als Einstiegspunkt dient; Mobile-Parity aller Admin-Surfaces ist final verifiziert.
**Requirements:** ADMIN-01, ADMIN-02, ADMIN-03, MOBILE-ADM-01, MOBILE-ADM-02, MOBILE-ADM-03
**Depends on:** Phasen 10-15 (Dashboard verlinkt auf alle CRUD-Surfaces; Mobile-Härtung verifiziert alle gelieferten Oberflächen)
**Plans:** 3/7 plans executed

**Success criteria:**
- [ ] Admin sieht beim Login ein Dashboard mit Setup-Completeness-Checkliste (Schule, Zeitraster, Schuljahr, Fächer, Lehrer, Klassen, Schüler, Solver, DSGVO, Audit)
- [ ] Jeder Checklisten-Eintrag verlinkt per Deep-Link auf die zugehörige Admin-Oberfläche
- [ ] Dashboard zeigt Live-Zustand (erledigt/fehlt/unvollständig) pro Eintrag ohne manuellen Reload nach jeder Admin-Aktion
- [ ] Alle Admin-Oberflächen aus Phasen 10–15 sind bei 375px benutzbar, haben 44px-Touch-Targets auf interaktiven Elementen und passen sich fließend auf 1280px an
- [ ] Admin-Navigation (Sidebar, Breadcrumb) funktioniert bei 375px über Drawer/Overlay-Pattern

**Known risks / backend gap candidates:**
- ADMIN-03 (Live-Zustand ohne Reload): benötigt entweder Polling mit TanStack Query staleTime oder Socket.IO-Broadcast auf Admin-Room — in v1.0 etabliertes Muster.
- MOBILE-ADM-Audit: finaler Mobile-Sweep kann UI-Regressions aus Phasen 10-15 aufdecken — Gap-Fix-Tasks innerhalb Phase 16 einplanen.

Plans:
- [x] 16-01-PLAN.md — Backend DashboardModule + DashboardService aggregator + admin-only controller + table-driven service spec + integration spec [Wave 1]
- [x] 16-02-PLAN.md — Frontend foundation: extract useIsMobile, build useDashboardStatus, build shared DataList, build ChecklistItem + DashboardChecklist (with unit tests) [Wave 1]
- [ ] 16-03-PLAN.md — Role-aware login redirect, /admin/index.tsx Dashboard route, AppSidebar + MobileSidebar entries (Phase 15 gap closure: DSGVO + Audit-Log added to MobileSidebar) [Wave 2, depends on 01+02]
- [x] 16-04-PLAN.md — Touch-target hardening: lift Button + Input + Select primitives to min-h-11 on <sm (responsive sm:min-h-{n} preserves desktop) [Wave 1]
- [ ] 16-05-PLAN.md — Mobile sweep audit spec + migrate Phase 14 (4 solver-tuning tables) + Phase 15 (5 DSGVO/audit tables) zero-mode tables to DataList [Wave 3, depends on 02+04]
- [ ] 16-06-PLAN.md — Mutation-hook invalidation fan-out: 13 hook files × ~57 mutations add `qc.invalidateQueries({ queryKey: dashboardKeys.status })` to onSuccess [Wave 3, depends on 01+02]
- [ ] 16-07-PLAN.md — E2E coverage closure: login-redirect.spec.ts (5 roles) + admin-dashboard.spec.ts (desktop) + admin-dashboard.mobile.spec.ts (375px + MobileSidebar drawer) [Wave 4, depends on 03+05+06]

---

## Backlog

### Phase 999.1: CI Stabilization — fix accumulated E2E test failures (BACKLOG)

**Goal:** Captured 2026-04-28 nach Phase-15-Merge — alle 3 PRs (#1 phase-15, #2 chore, #3 fix) wurden via `--admin` gemerged trotz roter E2E-CI. Build / Install / Solver-Sidecar / API+Web-Build sind grün; nur der `Run Playwright tests` Step hat ~30-50 Failures verteilt über Phase 11-15. Dieses Backlog-Item triagiert sie systematisch in real bugs vs CI-environment-flakes und macht den `--admin`-Override für zukünftige PRs (Phase 16+) überflüssig.

**Requirements:** TBD (siehe Triage-Result)
**Plans:** 7 plans

**Failure clusters (von PR #1 Run [25065085891](https://github.com/martinvidec/openaustria-school-flow/actions/runs/25065085891)):**

- **Phase 13 (User-Verwaltung)** — admin-user-overrides (5), admin-user-roles (4), admin-user-permissions (2), admin-user-person-link (3), admin-user-silent-4xx (2), admin-users-list (3+)
- **Phase 14 (Solver-Tuning)** — admin-solver-tuning-audit, -preferences (2), -restrictions (2), -integration (skipped — auf solver-run angewiesen)
- **Phase 15 (DSGVO/Audit)** — admin-audit-log-csv, admin-audit-log-detail, admin-audit-log-filter, admin-dsgvo-* Suite
- **Phase 10.5 (Operations)** — admin-import (3 tests, einer mit 1m-timeout), admin-timetable-edit-dnd
- **Mobile-375 cascade** — ~15+ Tests mit 1-380ms Failures (deutet auf globalen Setup-Cascade-Fehler hin, möglicherweise gemeinsame fixture/page-context)

**Triage-Strategie (vorgeschlagen für die Discuss-Phase):**

1. **Sofort-Fixes**: gemeinsame Cascade-Fehler im mobile-Setup → 1 Fix repariert ~15 Tests
2. **Per-cluster-Audit**: pro Phase eine Stichprobe lokal vs. CI ausführen — Diff identifizieren
3. **Differentiation**: real bug (gleicher Fail in beiden) vs flake (CI-only) vs CI-env (timing/race) vs missing-fixture (Solver-Run-Tests etc.)
4. **Fix-Plans pro Cluster**: 1 Plan pro Cluster oder 1 Plan für mehrere wenn Root-Cause geteilt

**Known risks / Probable causes:**

- Solver-Sidecar-Timing: Maven-Build dauert in CI 2-3min, Solver braucht 30s start_period — Tests die direkt nach setup laufen könnten Cold-Solver treffen
- Mobile-375 cascade-Pattern (1-380ms): vermutlich `globalSetup` failure für mobile-Worker spezifisch oder shared admin-login fixture timed out
- Phase-13-Tests: könnten Reihenfolge-abhängig sein (User-State von vorigem Test nötig) oder seed-data-Voraussetzung haben die in CI fehlt
- Phase-14-integration: explizit `-` (skipped), nicht failed — solver-run zu langsam in CI?

**Success criteria (TBD):**
- [ ] CI-`Run Playwright tests`-Step grün auf einer leeren PR off main
- [ ] Phase-16 PR kann ohne `--admin`-Override gemerged werden
- [ ] Triage-Dokument im Phase-Verzeichnis kategorisiert jede Failure als real-bug/flake/env

**Reference:**
- PR #1 run: https://github.com/martinvidec/openaustria-school-flow/actions/runs/25065085891
- Memory-Eintrag: `feedback_phase_branch_discipline.md` (warum --admin nötig war)

Plans:
- [ ] TBD (promote with /gsd-review-backlog when ready)
