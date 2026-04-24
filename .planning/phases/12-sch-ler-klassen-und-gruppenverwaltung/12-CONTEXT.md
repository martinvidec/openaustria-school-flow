# Phase 12: Schüler-, Klassen- und Gruppenverwaltung - Context

**Gathered:** 2026-04-24
**Status:** Ready for planning
**Mode:** Smart discuss (4 Gray Areas × 3-4 Fragen, recommended-first options)

<domain>
## Phase Boundary

Admin kann Schüler (inkl. Erziehungsberechtigte und Archivierung ohne Datenverlust), Stammklassen (inkl. Klassenvorstand, Stundentafel-Anwendung und SUBJECT-04 Wochenstunden-Editor) sowie Gruppenableitungsregeln und manuelle Gruppen-Overrides über das Web-Admin-UI pflegen. UI-Layer über dem existierenden v1.0-Backend `StudentModule` + `ClassModule` + `GroupModule` (inkl. `GroupMembershipRuleService`), erweitert um vier Backend-Gaps als atomic tasks: Parent-HTTP-Surface, Student.isArchived-Schema, Orphan-Guards auf `StudentService.remove`/`ClassService.remove` und neues `GroupDerivationRule`-Prisma-Model. Mobile-Parität bei 375px für alle Formulare. E2E mit Playwright für Schüler- und Klassen-CRUD inkl. Orphan-Guard, Stundentafel-Anwendung, Rule-Application und Manual-Override.

Deckt: STUDENT-01..04, CLASS-01..05, SUBJECT-04 (10 Requirements).

</domain>

<decisions>
## Implementation Decisions

### Area 1 — Student-UX + Archivierung + Umzug + Eltern

- **D-01:** Schülerliste-Layout — Dense Table auf `/admin/students` mit Filter-Bar. Spalten: Nachname | Vorname | Klasse | Status (Aktiv/Archiviert) | Aktionen. Filter-Bar oben: Suche (Name/Nachname), Klassen-Dropdown (inkl. "Ohne Stammklasse"), Status-Toggle (Aktiv/Archiviert/Alle), Schuljahr-Dropdown default=aktiv. Click-auf-Row öffnet Detail-Page `/admin/students/$studentId`. Konsistent mit Phase 11 Teacher-Liste und skaliert auf 500+ Schüler. Empty-State analog Phase 11 D-04 (Inline-CTA "Noch keine Schüler:innen — Ersten Schüler anlegen").
- **D-02:** Student-Detail-Page mit 3 Tabs (Stammdaten | Erziehungsberechtigte | Gruppen). Mirror des Phase-11-Teacher-Pattern (D-02). Tabs: **Stammdaten** (firstName, lastName, email, phone, address, dateOfBirth, socialSecurityNumber, studentNumber, enrollmentDate, classId-Picker); **Erziehungsberechtigte** (Parent-Liste mit Add/Remove); **Gruppen** (read-mostly, auto/manual Badges + Deep-Link auf Gruppen-Tab der Klasse). Pro-Tab-Save (Phase 10 D-02), UnsavedChangesDialog bei Tab-Wechsel.
- **D-03:** Eltern-Verknüpfungs-UX — Search-by-Email Autocomplete + Inline-Create-Fallback. Admin tippt Email in Command-Popover (shadcn/ui `command`); Backend-Endpoint `GET /parents?email=` returnt matching Parent oder 404. Bei Match: Confirm-Dialog + POST `/students/:id/parents` mit parentId. Bei 404: "Neue:n Erziehungsberechtigte:n anlegen"-Button öffnet Mini-Form (firstName, lastName, email, phone) → erstellt Parent (via Person-Nested-Create, personType=PARENT) und verknüpft in einer Transaktion. Konsistent mit Phase 11 D-08 (Keycloak-Search-Pattern). Remove-Verknüpfung via Icon-Button mit Confirm-Dialog; Parent-Record bleibt erhalten wenn andere Kinder existieren.
- **D-04:** STUDENT-04 Archivierung — Soft-Delete via neues Prisma-Feld `Student.isArchived Boolean @default(false)` + `archivedAt DateTime?`. Schema-Migration als Gap-Fix-Task. Endpoints: `POST /students/:id/archive` (setzt Flag + archivedAt=now) und `POST /students/:id/restore`. `findAll` bekommt Filter-Param `archived=active|archived|all` (default=active). UI zeigt Status-Badge + Row-Action "Archivieren"/"Reaktivieren". Archivierte Schüler bleiben referenziell intakt für Klassenbuch-Historie. Scharfe Trennung zu DSGVO-Art.-17-Anonymisierung (Phase 15).
- **D-05:** STUDENT-03 Klassen-Umzug — Zwei Flows: (1) Row-Action Single-Move "In andere Klasse verschieben" öffnet Dialog mit Klassen-Picker (Autocomplete-Search) + optionale Notiz-Eingabe. (2) Multi-Select-Checkboxen in Liste (Header-Checkbox + Row-Checkboxen) aktivieren Toolbar "Ausgewählte verschieben" → gleicher Dialog mit Listen-Preview der Selection. Beide nutzen `PUT /students/:id` mit neuem `classId`. Klassenbuch-Historie bleibt intakt (ClassBookEntry referenziert TimetableLesson/Date, nicht current classId). Jahres-Rollover-Wizard explizit deferred.

### Area 2 — Class-UX + Klassenvorstand + Stundentafel (SUBJECT-04)

- **D-06:** Klassenliste-Layout — Dense Table auf `/admin/classes` mit Filter-Bar. Spalten: Name | Jahrgangsstufe | Klassenvorstand | Schülerzahl | Stundentafel-Status | Aktionen. Filter-Bar: Schuljahr-Dropdown (default=aktiv), Year-Level-Multi-Select, Suche. Click-auf-Row → Detail-Page `/admin/classes/$classId`. Konsistent mit Phase 10 Schuljahre und Phase 11 Teacher/Subject. Empty-State-CTA wie Phase 11 D-04.
- **D-07:** Class-Detail-Page mit 4 Tabs (Stammdaten | Stundentafel | Schüler | Gruppen). Spiegel des Phase-11-Teacher-4-Tab-Patterns. **Stammdaten**: name, yearLevel, schoolYear (read-only nach Create), Klassenvorstand-Picker. **Stundentafel**: Apply-Template-Flow + SUBJECT-04-Wochenstunden-Editor (D-09). **Schüler**: read-mostly Liste der Stammklassen-Schüler mit Row-Actions "Aus Klasse entfernen" und "In andere Klasse verschieben" (re-use D-05 Dialog). **Gruppen**: Rule-Builder + Manual-Overrides (D-10/D-11). Pro-Tab-Save (Phase 10 D-02), StickyMobileSaveBar pro Tab.
- **D-08:** Klassenvorstand-Zuweisung — Autocomplete-Search im Stammdaten-Tab. shadcn/ui Command-Popover; Admin tippt Nachname, Backend sucht Teachers der Schule (re-use der TeacherModule-List-Endpoint mit `search=`-Query — prüfen ob existiert, sonst Gap-Fix-Task). Skaliert auf Schulen mit >100 Teachers. Klar-Icon entfernt die Zuweisung. Re-use Search-Pattern aus Phase 11 D-08 (Keycloak-Link).
- **D-09:** Apply-Stundentafel + SUBJECT-04 Wochenstunden — Apply-Template → Preview → Editable-Table-Flow. Stundentafel-Tab initial: Wenn keine ClassSubjects existieren, Button "Stundentafel aus Vorlage übernehmen" → Dialog mit Schultyp-Dropdown (default = School.type) + Year-Level-Anzeige + Preview-Tabelle (aus `packages/shared/src/stundentafel/`) → Confirm erstellt ClassSubjects via Backend (re-use existing `POST /classes/:id/apply-stundentafel` endpoint oder Gap-Fix wenn nicht vorhanden). Nach Apply zeigt Tab editierbare Tabelle: Zeilen pro ClassSubject mit Spalten Fach | Wochenstunden (Number-Input, 0..n) | isCustomized-Badge (automatisch true bei Edit) | Delete-Row-Icon. "+ Fach-Add-Row" am Ende mit Subject-Combobox. "Auf Vorlage zurücksetzen"-Button oben rechts mit WarnDialog (löscht custom ClassSubjects, re-applied Template). Deckt CLASS-03 + SUBJECT-04.

### Area 3 — Gruppenableitungsregeln + Manuelle Overrides (CLASS-04/05)

- **D-10:** Gruppen-Regeln UI — Rule-Builder-Table im Gruppen-Tab. Obere Section "Gruppenableitungsregeln": Tabelle mit Spalten Typ (RELIGION | WAHLPFLICHT | LEISTUNG | LANGUAGE | CUSTOM) | Gruppen-Name | Level (optional, String) | Schüler-Filter (Multi-Select-Popover über Klassen-Schüler) | Delete-Icon. "+ Regel hinzufügen"-Button darunter. Explizit "Regeln anwenden"-Button am Ende der Section → Dry-Run-Preview-Dialog zeigt neue Groups + neue Memberships + Conflicts (wenn manuelle Zuordnung existiert) → Confirm triggert `POST /groups/apply-rules/:classId`. Keine Auto-Apply bei Rule-Save. Preview folgt Phase 10 D-13 Destructive-Edit-Pattern.
- **D-11:** Manuelle Gruppen-Overrides (CLASS-04) — Untere Section "Gruppen + Mitglieder" im Gruppen-Tab. Expandierbare Karten pro Group mit: Group-Header (Name, Typ-Badge, Level, Member-Count) + Member-Liste mit Badge pro Row ("Auto" grün / "Manuell" blau) + Add-Student-Combobox (Multi-Select aus Klassen-Schülern, hinzugefügte bekommen `isAutoAssigned=false`) + Remove-Student-Icon pro Row. Remove bei `isAutoAssigned=true` zeigt Info-Hinweis "Wird bei nächster Regel-Anwendung wieder hinzugefügt". Persistente Exclusions (Rule-Ausschluss) explizit deferred.
- **D-12:** GroupDerivationRule Persistenz — Neues Prisma-Modell `GroupDerivationRule { id, classId (FK onDelete:Cascade), groupType (enum), groupName, level, studentIds Json?, createdAt, updatedAt }` via Migration als Gap-Fix-Task. CRUD-Endpoints `GET/POST/PUT/DELETE /classes/:classId/derivation-rules`. UI lädt Rules aus DB statt request-body. `GroupMembershipRuleService.applyRules` wird erweitert: akzeptiert classId + optional inline rules, sonst lädt aus DB. Rules überleben Jahres-Rollover (wenn in Zukunft implementiert, können Rules pro Klasse clone-and-adapted werden).

### Area 4 — Delivery + Backend-Gap-Fixes + Plan-Breakdown

- **D-13:** Backend-Gaps als atomic tasks in Phase-Plan (Phase 11 D-14 Pattern):
  1. **Parent-HTTP-Surface** — Neues `ParentModule` (Controller + Service + DTOs): `GET /parents` (list by schoolId, Filter email/name), `GET /parents/:id`, `POST /parents` (nested Person-Create mit personType=PARENT), `PUT /parents/:id`, `DELETE /parents/:id` (Orphan-Guard: keine Löschung wenn ParentStudent-Referenzen). Plus Student-Controller erweitern: `POST /students/:id/parents` (link existing Parent), `DELETE /students/:id/parents/:parentId` (unlink, Parent bleibt). CreateStudentDto bekommt optional `parentIds: string[]` (Array für initial-linking bei Create).
  2. **Student-Archivierung** — Prisma-Migration `Student.isArchived Boolean @default(false)` + `archivedAt DateTime?`. Endpoints `POST /students/:id/archive` + `POST /students/:id/restore`. `findAll` erweitert um `?archived=active|archived|all` Query-Param (default=active).
  3. **StudentService.remove Orphan-Guard** — Dependency-Check vor `person.delete`: `ClassBookEntry` (unknown — grep erforderlich), `Attendance`, `Grade`, `HomeworkSubmission`, `ExamResult`, `ConsentRecord` (personId-linked), `GroupMembership`, `ParentStudent`. Bei Referenzen wirft `ConflictException` mit `affectedEntities`-Extension (Phase 1 D-12 RFC 9457 + Phase 11 D-12 Affected-Entities-List-Pattern). Unit-Tests + E2E-Error-Path verpflichtend. (Hinweis: Löschung = harte DB-Entfernung; für "Schüler geht — Daten bleiben" bleibt D-04 Archivierung der primäre Weg. Delete nur für Testdaten/Dubletten.)
  4. **ClassService.remove Orphan-Guard** — Dependency-Check: aktive (nicht-archivierte) Students mit classId, ClassSubject, Group + GroupMembership, TimetableRun (wenn Klasse referenziert), ClassBookEntry (via TimetableLesson.class_id indirect — grep erforderlich), GroupDerivationRule. Schema-Änderung: `Student.classId onDelete:SetNull` bleibt bestehen, aber Guard prüft *bevor* Delete. RFC 9457 409 + affectedEntities.
  Plus **GroupDerivationRule Schema + CRUD** (siehe D-12). Alle Gap-Fix-Tasks haben Unit-Tests; E2E-Error-Paths decken Guards ab.
- **D-14:** E2E-Scope — Phase-11-Parity mit ~11 Spec-Files. **Schüler (~5 Specs):** E2E-STD-01 create+edit happy + error (desktop + mobile-375) inkl. SILENT-4XX, E2E-STD-02 delete-mit-Orphan-Guard (happy + error), E2E-STD-03 archive/restore, E2E-STD-04 Eltern-Link (Search-Existing + Inline-Create + Unlink), E2E-STD-05 Class-Move (Single-Row-Action + Multi-Select-Bulk). **Klassen (~6 Specs):** E2E-CLS-01 create+edit happy + error, E2E-CLS-02 delete-mit-Orphan-Guard (happy + mit aktiven Schülern → 409), E2E-CLS-03 Klassenvorstand-Zuweisung + Remove, E2E-CLS-04 Apply-Stundentafel + SUBJECT-04 Wochenstunden-Edit + Reset, E2E-CLS-05 Gruppen-Regel-Builder + Apply-Rules-Preview + Confirm, E2E-CLS-06 Manuelle Gruppen-Overrides (Add/Remove + Auto/Manual-Badge). Reuse Phase 10.3 Harness (loginAsRole, getByCardTitle 10.4-01), Phase 10.5-02 Prefix-Isolation (E2E-STD-*, E2E-CLS-*, E2E-STD-MOBILE-*, E2E-CLS-MOBILE-*), Phase 10.2-04 SILENT-4XX Invariante codified. Mobile-WebKit Bus-Error-10 acceptable via Phase 10.4-03 Precedent.
- **D-15:** Validation Split — Defense-in-Depth konsistent mit Phase 11 D-15: `packages/shared/src/validation/` Zod-Schemas für Student + Parent + SchoolClass + ClassSubject + GroupDerivationRule + GroupAssignStudent. RHF + zodResolver Client-Side mit Live-Inline-Errors. Bestehendes NestJS class-validator DTO Server-Side. Deutsche UI-Error-Strings (z.B. `z.string().email({message: 'Keine gültige E-Mail-Adresse'})`), englische API-Field-Names, englische Server-Messages (fallback).
- **D-16:** Plan-Breakdown — 3 bundled plans (Phase 11 D-16 Pattern):
  - **Plan 12-01** — Shared foundation + Student-CRUD + Parent-Surface: Zod-Schemas in `packages/shared/src/validation/` (Student, Parent, AssignParent), Routes (`/admin/students`, `/admin/students/$id`), TanStack-Query-Hooks (useStudents, useStudent, useCreateStudent, useUpdateStudent, useArchiveStudent, useRestoreStudent, useDeleteStudent, useMoveStudent, useBulkMoveStudents, useParentsByEmail, useCreateParent, useLinkParent, useUnlinkParent), Student-List mit Filter-Bar + Multi-Select, Student-Detail-Page mit 3 Tabs, Archive-Flow, Move-Dialog (Single + Bulk). Backend-Gap-Fixes: ParentModule komplett, Student.isArchived Migration + Endpoints, StudentService.remove Orphan-Guard + Unit-Tests. Sidebar "Personal & Fächer"-Gruppe erweitert um Schüler-Eintrag.
  - **Plan 12-02** — Class-CRUD + Stundentafel + Gruppen: Zod-Schemas (SchoolClass, ClassSubject, GroupDerivationRule), Routes (`/admin/classes`, `/admin/classes/$id`), TanStack-Query-Hooks (useClasses, useClass, useCreateClass, useUpdateClass, useDeleteClass, useClassSubjects, useApplyStundentafel, useResetStundentafel, useGroupDerivationRules, useApplyRulesPreview, useApplyRules, useClassGroups, useAddGroupMember, useRemoveGroupMember, useTeacherSearch), Class-List mit Filter-Bar, Class-Detail-Page mit 4 Tabs (Stammdaten mit Klassenvorstand-Autocomplete, Stundentafel mit Apply-Template-Flow + Wochenstunden-Editor + Reset, Schüler read-mostly mit Row-Actions, Gruppen mit Rule-Builder + Dry-Run-Preview + Manual-Overrides-Panel). Backend-Gap-Fixes: GroupDerivationRule Schema + CRUD, ClassService.remove Orphan-Guard + Unit-Tests. Sidebar erweitert um Klassen-Eintrag.
  - **Plan 12-03** — E2E Sweep: 11 Spec-Files (siehe D-14). Reuse Phase 10.3 Harness + Phase 11 Patterns. SILENT-4XX E2E-Invariante, Prefix-Isolation, API-Cleanup-afterEach. Bump `.planning/E2E-COVERAGE-MATRIX.md`.

### Claude's Discretion
- Exakte Sidebar-Position der neuen Einträge (Schüler + Klassen) in "Personal & Fächer"-Gruppe — wahrscheinlich Reihenfolge Lehrer → Fächer → Klassen → Schüler (logisch: Infrastruktur → Entities)
- shadcn/ui Primitives pro Tab (Tabs, Dialog, Form, Select, Input, Command, Popover — bereits vorhanden aus Phase 10/11)
- Icons aus lucide-react (UsersRound für Schüler, School/GraduationCap für Klassen, Users für Gruppen, UserPlus für Parent-Link, Archive/RotateCcw für Archiv-Actions, Move für Klassen-Umzug)
- Exakte Spalten-Breiten und Sortier-Defaults in Listen (Default-Sort Nachname ASC wie Phase 11)
- Loading-Skeleton-Design pro Tab
- Empty-State-Illustrations für leere Klasse ohne Schüler, leere Stundentafel, leere Gruppen-Section
- Preview-Dialog-Layout für Apply-Rules Dry-Run (Before/After-Diff-Styling)
- Mobile-Adaption des Stundentafel-Editors (Matrix → gestackte Cards pro Fach bei <640px)
- Bulk-Move-Dialog-Selection-Preview-Styling (Avatar-Stack, Liste?)
- Solver-Re-Run-Banner-Wahl nach Class-Änderungen (Stundentafel-Edit, Klassenvorstand-Change) analog Phase 10 D-06 / Phase 11 Discretion
- Audit-Log-Action-Types für neue Aktionen (archive-student, move-student, apply-rules) — re-use bestehendes Audit-Interceptor-Pattern, keine neuen Schemas
- Export-Button auf Schüler-Liste (CSV) — nicht in Requirements, deferred

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone & Requirements
- `.planning/ROADMAP.md` §Phase 12 — Phase 12 goal, success criteria, REQ-IDs (STUDENT-01..04, CLASS-01..05, SUBJECT-04), dependencies, Known risks (Parent HTTP surface gap, Orphan-Guard-Backend gap, GroupMembership isAutoAssigned existent)
- `.planning/REQUIREMENTS.md` §STUDENT/CLASS/SUBJECT — Full requirement statements: STUDENT-01, STUDENT-02, STUDENT-03, STUDENT-04, CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05, SUBJECT-04, MOBILE-ADM-02 (375px+44px)
- `.planning/PROJECT.md` — v1.1 Milestone-Goal, Constraints, Schülerliste+Klassen+Gruppen-Paragraphen

### Prior phase decisions (foundation this phase builds on)
- `.planning/phases/11-lehrer-und-f-cher-verwaltung/11-CONTEXT.md` — Detail-Page vs Dialog (D-02), Search-by-Email Pattern (D-08 Keycloak), Orphan-Guard als RFC 9457 409 mit affectedEntities-Extension (D-12, D-14), Shared Zod-Schemas Split (D-15), Bundled-Plan-Struktur (D-16), Sidebar "Personal & Fächer" Gruppe (D-03)
- `.planning/phases/10-schulstammdaten-zeitraster/10-CONTEXT.md` — Tabs mit Pro-Tab-Save (D-01, D-02), Empty-Flow ohne Wizard (D-03), Orphan-Schutz-Semantik bei Delete (D-10), Destructive-Edit-Schutz mit Warn-Dialog (D-13), Validation Hybrid (D-15)
- `.planning/milestones/v1.0-phases/01-project-scaffolding-auth/01-CONTEXT.md` — API-Conventions (RFC 9457 D-12, `/api/v1/` prefix D-13, offset/limit pagination D-14, English-API/German-UI D-15), RBAC+ACL (D-01..D-04), CheckPermissions decorator pattern
- `.planning/milestones/v1.0-phases/02-school-data-model-dsgvo/02-CONTEXT.md` — Person/Student/Parent relationships, AES-256-GCM field encryption (socialSecurityNumber), ConsentRecord pro Person, ParentStudent junction model, DSGVO-Trennung Archivierung ≠ Anonymisierung
- `.planning/milestones/v1.0-phases/05-digital-class-book/*-CONTEXT.md` — ClassBookEntry/Attendance/Grade-Modelle (important für StudentService.remove Orphan-Guard-Scope)

### Backend code (existing v1.0 + v1.1 baseline)
- `apps/api/prisma/schema.prisma` §373-421 — Models `Student`, `Parent`, `ParentStudent` (Person-FK, schoolId, classId nullable with onDelete:SetNull)
- `apps/api/prisma/schema.prisma` §453-505 — Models `SchoolClass`, `Group`, `GroupMembership` (isAutoAssigned + assignedAt already present)
- `apps/api/prisma/schema.prisma` §507-547 — Models `Subject`, `ClassSubject` (weeklyHours, isCustomized, preferDoublePeriod; unique [classId, subjectId, groupId])
- `apps/api/prisma/schema.prisma` §273-279 — `enum GroupType { RELIGION | WAHLPFLICHT | LEISTUNG | LANGUAGE | CUSTOM }`
- `apps/api/src/modules/student/student.controller.ts` — Existing CRUD (POST/GET/GET-id/PUT/DELETE); **NO** Parent-Link-Endpoints, **NO** archive endpoints
- `apps/api/src/modules/student/student.service.ts` — Nested Person-Create, cascading Person-Delete (onDelete:Cascade); **NO** Orphan-Guard (TO FIX in D-13.3)
- `apps/api/src/modules/student/dto/create-student.dto.ts` — Full Person+Student fields; **NO** `parentIds` (TO ADD in D-13.1)
- `apps/api/src/modules/class/class.controller.ts` — Existing CRUD + assignStudent/removeStudent; **NO** Orphan-Guard on DELETE (TO FIX in D-13.4)
- `apps/api/src/modules/class/class.service.ts` — `remove` does `prisma.schoolClass.delete` cascading Groups, SetNull auf Students-classId; NO dependency check
- `apps/api/src/modules/class/group.controller.ts` — Existing Group-CRUD + applyRules/clearAutoAssignments endpoints; applyRules akzeptiert body-Rules (TO ADAPT in D-13 für GroupDerivationRule)
- `apps/api/src/modules/class/group-membership-rule.service.ts` — Existing applyRules-Logik: findOrCreate Group, skipt existing Memberships, erstellt isAutoAssigned=true neue Memberships
- `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` + `packages/shared/src/stundentafel/` — Static Stundentafel-TS-Arrays pro Schultyp (Phase 2 validated)
- `apps/api/src/modules/teacher/` — Reference für Search-Endpoint-Pattern (Phase 11 Keycloak-Search + TeacherModule-List); prüfen ob GET /teachers mit search-query bereits unterstützt wird (sonst Gap-Fix)

### Frontend code (reuse + integration)
- `apps/web/src/routes/_authenticated/admin/` — Existing Routes pattern (teachers.index.tsx, teachers.$teacherId.tsx, subjects.index.tsx, school.settings.tsx); neu: `students.index.tsx`, `students.$studentId.tsx`, `classes.index.tsx`, `classes.$classId.tsx`
- `apps/web/src/components/admin/` — Shared Admin-Components aus Phase 10: PageShell, UnsavedChangesDialog, StickyMobileSaveBar, InfoBanner, WarnDialog. Phase 11 ergänzte AffectedEntitiesList (discriminated union kind: 'teacher'|'subject' — muss für 'class' + 'student' erweitert werden)
- `apps/web/src/stores/school-context-store.ts` — Liefert schoolId und activeSchoolYearId für Queries
- `apps/web/src/components/layout/AppSidebar.tsx` + `MobileSidebar.tsx` — "Personal & Fächer"-Gruppe (Phase 11) wird um Schüler + Klassen erweitert; role-gating `roles: ['admin', 'schulleitung']`
- `apps/web/src/components/ui/` — shadcn primitives: tabs, dialog, input, select, button, card, label, popover, dropdown-menu, command (alle bereits verfügbar); ggf. `checkbox` für Multi-Select-Listen
- `apps/web/src/lib/api.ts` — apiFetch + RFC 9457 Problem-Details-Parser (extensions-field für affectedEntities)
- `packages/shared/src/validation/` — Phase 11 Validation-Zod-Schemas (teacher.ts, subject.ts, availability-rule.ts, teaching-reduction.ts); neu: student.ts, parent.ts, school-class.ts, class-subject.ts, group-derivation-rule.ts
- `packages/shared/src/stundentafel/` — Existing Phase 2 Templates; Client liest read-only für Preview-Dialog in D-09 Apply-Template-Flow
- `apps/web/e2e/helpers/` — Phase 10.3 Harness (loginAsRole, getRoleToken, getByCardTitle); reuse direkt

### Auto-memory notes (from `/Users/vid/.claude/projects/...-school-flow/memory/`)
- `feedback_e2e_first_no_uat.md` — Ship mit Tests, E2E vor UAT (applies Phase 12 fully)
- `feedback_restart_api_after_migration.md` — Student.isArchived Migration bedingt API-Restart + post-process shared dist .js extensions
- `feedback_restart_vite.md` — Vite restart nach API rebuild
- `feedback_admin_requirements_need_ui_evidence.md` — "Admin kann X"-Requirements brauchen UI-Click-Evidence; E2E deckt das ab
- `CLAUDE.md` Migration-Hygiene-Policy — Alle Schema-Änderungen (Student.isArchived, GroupDerivationRule) MÜSSEN als `prisma migrate dev --name` Migration-Files committed sein; **NICHT** `prisma db push`. `scripts/check-migration-hygiene.sh` blockt PRs ohne Migration-SQL.

### Tech-Stack reference
- `CLAUDE.md` — Version pins: React 19, Vite 8, TanStack Query 5, TanStack Router 1, shadcn/ui + Radix UI, Tailwind 4, Zustand 5, Zod via RHF, NestJS 11, Prisma 7 (Pure-TS), PostgreSQL 17, Playwright 1.x

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets (v1.0 Backend)
- **StudentModule** (`apps/api/src/modules/student/`) — Controller + Service + DTOs + Prisma access via PersonModule nested-create. v1.1 ergänzt nur Gap-Fixes (isArchived, archive/restore Endpoints, Orphan-Guard in .remove, CreateStudentDto.parentIds). Create nutzt `person.create` mit `student: { create: {...} }`-Nested-Pattern — zuverlässig, testbar.
- **ClassModule** (`apps/api/src/modules/class/`) — class.controller + class.service + group.controller + group.service + group-membership-rule.service + DTOs. v1.1 ergänzt Orphan-Guard in class.service.remove + GroupDerivationRule-Prisma-Model + entsprechende CRUD-Endpoints + applyRules-Erweiterung für DB-persisted Rules.
- **GroupMembershipRuleService** (`apps/api/src/modules/class/group-membership-rule.service.ts`) — `applyRules` (findOrCreate Group + findOrCreate Membership mit isAutoAssigned=true) und `clearAutoAssignments`. Logik bleibt, Input-Source wechselt von request-body zu DB-stored GroupDerivationRule.
- **PersonModule** (implicit via Prisma) — Person-Record trägt firstName/lastName/email/phone/address/dateOfBirth/socialSecurityNumber (AES-256-GCM encrypted via Prisma middleware Phase 2). Parent-Create nutzt Person-Nested-Create mit personType=PARENT.
- **Austrian Stundentafel Templates** (`packages/shared/src/stundentafel/`) — Statische TS-Arrays pro Schultyp; Read-only Source für Apply-Template-Preview (D-09). Kein Edit.

### Reusable Assets (v1.1 Frontend from Phase 10 + 11)
- **PageShell / UnsavedChangesDialog / StickyMobileSaveBar / InfoBanner / WarnDialog** — Phase 10 Shared Admin-Components; Phase 12 Detail-Pages reuse PageShell + UnsavedChangesDialog (Pro-Tab-Dirty-State via Zustand-slice-pro-Tab) + StickyMobileSaveBar + WarnDialog für Destructive-Actions.
- **AffectedEntitiesList** (Phase 11 D-12) — Discriminated-Union-Komponente `kind: 'teacher' | 'subject'` mit backward-compat default. Phase 12 erweitert um `kind: 'student' | 'class' | 'group' | 'class-subject' | 'group-membership' | 'derivation-rule' | 'parent-student'` für ClassService.remove und StudentService.remove Orphan-Guard-Responses.
- **useSchoolContext Zustand Store** — schoolId + activeSchoolYearId; Phase 12 reads für List-Filter und Create-Default-Values.
- **shadcn/ui Primitives** — Alle benötigten vorhanden: tabs, dialog, input, select, button, card, label, popover, dropdown-menu, command (für Autocomplete-Searches in D-03 Email-Search und D-08 Klassenvorstand-Search). Ggf. checkbox für Multi-Select-Listen.
- **apiFetch + Problem-Details-Parser** — RFC 9457 mit extensions (affectedEntities) already integrated.
- **TanStack Query + RHF + Zod** — Phase 11-Stack-Pattern; useQuery-Key-Convention `['students', schoolId, filters]`, `['students', studentId]`, `['classes', schoolId, filters]`, `['classes', classId]`, `['parents', email]`, `['class-subjects', classId]`, `['group-derivation-rules', classId]`, `['class-groups', classId]`.
- **Silent-4xx-Toast-Invariante** (Phase 10.1-01 + 10.2-04) — Alle neuen Mutation-Hooks MÜSSEN useMutation's onError explizit verdrahten; niemals silent 4xx als Success.
- **Playwright E2E Harness** (Phase 10.3 + 10.4-01 CardTitle-Helper) — loginAsRole, getRoleToken, globalSetup + getByCardTitle. Reuse direkt.
- **SUBJECT_PALETTE + getSubjectColor(id)** (Phase 11 D-11 rollback) — Deterministisches Fach-Farb-Mapping; Phase 12 Stundentafel-Tabelle nutzt weiter für Fach-Anzeige-Farben.

### Established Patterns
- **Deutsche UI-Texte, englische API-Feldnamen** (Phase 1 D-15) — "Schüler:innen"/"Erziehungsberechtigte"/"Klassenvorstand" UI, `classId`/`parentIds`/`isArchived` API
- **CheckPermissions({ action, subject })** — `subject: 'student'` + `subject: 'class'` + `subject: 'parent'` (neu). Actions `create|read|update|delete|manage`.
- **Replace-all-in-transaction** (Phase 2 D-04) — Stundentafel-Apply-Template, Group-Rule-Apply nutzen das Pattern (neue Groups + Memberships in einer Tx)
- **RFC 9457 problem+json 409** für Orphan-Guard (Phase 1 D-12), mit custom `affectedEntities`-Extension (Phase 11 D-12 pattern extended)
- **Prisma Migration via `prisma migrate dev --name`** (CLAUDE.md Migration-Hygiene) — Phase 12 braucht 2 Migrations: (a) `12_student_is_archived` (isArchived + archivedAt), (b) `12_group_derivation_rules` (GroupDerivationRule model). CI-Script enforct.
- **Mobile-Parity Nyquist Wave 0** (Phase 4/6/7/10/11 pattern) — Alle E2E-Specs werden als `it.todo()` vorgeplant, dann implementiert
- **Pagination standard** (Phase 1 D-14) — offset/limit via PaginationQueryDto; Student-Liste + Class-Liste nutzen bereits

### Integration Points
- **AppSidebar + MobileSidebar** — "Personal & Fächer"-Gruppe erweitern um 2 Einträge (Klassen, Schüler); role-gating konsistent
- **Shared Zod Schemas** — `packages/shared/src/validation/student.ts`, `parent.ts`, `school-class.ts`, `class-subject.ts`, `group-derivation-rule.ts`, `assign-parent.ts`, `move-student.ts`. Re-use common utilities aus Phase 11 (z.B. address-schema)
- **RFC 9457 AffectedEntitiesList extension** — Erweitert um neue entity kinds (s.o.); UI-Komponente entsprechend ergänzen mit Deep-Links auf Detail-Pages
- **Parent-UI-Surface** — Neu in Phase 12 (nur über Student-Detail-Tab, keine eigenständige /admin/parents-Seite in diesem Scope — explizit deferred)
- **Stundentafel-Template-Reader im Frontend** — `packages/shared/src/stundentafel/` wird client-side gelesen für Preview-Dialog-Rendering (Apply-Template-Flow)
- **Solver-Re-Run-Awareness** — Klassenvorstand-Change, Stundentafel-Edit, Gruppen-Rule-Apply löst KEINEN automatischen Re-Solve aus; UI zeigt InfoBanner "Änderungen wirken sich erst beim nächsten Stundenplan-Lauf aus" analog Phase 10 D-06 und Phase 11 Discretion-Punkt
- **AuditInterceptor** (Phase 1) — bestehendes Pattern, keine neuen Schemas; Action-Types für archive-student, move-student, apply-derivation-rules loggt automatisch über CRUD-Wiring

</code_context>

<specifics>
## Specific Ideas

- **Apply-Template → Preview → Editable-Table-Flow (D-09)** — Admin kommt oft von Untis, erwartet "Stundentafel übernehmen und dann anpassen" als First-Class-Flow. Phase 12 etabliert das Muster; Phase 14 (Solver-Tuning) baut darauf auf.
- **Dry-Run-Preview vor Apply-Rules (D-10)** — Gruppenableitungsregeln können bestehende Memberships berühren; Admin muss SEHEN was passiert bevor er drückt. Parallel zu Phase 10 D-13 Destructive-Edit-Schutz.
- **Archivierung ≠ Anonymisierung (D-04)** — Schüler "deaktivieren" ist operativer Admin-Workflow, DSGVO Art. 17 "Löschung" ist separater Prozess in Phase 15. Zwei Flags sind besser als einer; Admin weiß immer was er tut.
- **Search-by-Email für Parent + Teacher (D-03, D-08)** — Zweimal Command-Popover-Pattern. Konsolidiert evtl. als `AutocompleteSearch`-Component (`source` prop: `parents-by-email` | `teachers-by-name`) wenn sich die Redundanz lohnt.
- **3 bundled plans (D-16)** — User bestätigte Phase-11-Pattern-Continuation. Trade-off bekannt: größere Plans, weniger Wave-Parallelism, aber weniger Plan-Seam-Overhead. Plan 12-02 ist der größte (Class-Detail-Page mit 4 Tabs + Backend-Gap-Fixes + GroupDerivationRule-Migration).

</specifics>

<deferred>
## Deferred Ideas

- **Jahres-Rollover-Wizard** — Automatischer Klassen-Rollover am Schuljahrbeginn (1A → 2A, 2A → 3A etc.) mit Mapping-UI. Eigene Phase / Phase 16 Dashboard-Kandidat. Phase 12 liefert nur atomare Move-Aktionen (Row + Bulk).
- **Persistente Rule-Exclusions (CLASS-04 Erweiterung)** — Wenn Admin einen auto-assigned Student aus Gruppe entfernt, könnte System sich das merken und beim nächsten Apply-Rules-Lauf nicht erneut zuordnen. Phase 12 zeigt nur Info-Hinweis ("wird bei nächster Regel-Anwendung wieder hinzugefügt"); persistente Exclusion-Liste deferred (erfordert ~DerivationExclusion-Model).
- **Parent-CRUD-Surface `/admin/parents`** — Standalone-Seite zum Eltern-Management (Bulk-Import, Duplikate-Merging). Phase 12 exponiert Parents nur über Student-Detail-Tab. Deferred bis Use-Case sichtbar wird (wahrscheinlich Phase 13 User-Mgmt oder v1.2).
- **Matrix Schüler×Gruppen Toggle-View** — Compact-View für Manual-Overrides. Mobile-unfreundlich; Phase 12 nutzt Per-Gruppe-Panel. Kandidat für UX-Polish-Tranche.
- **Drag-between-Classes** — Intuitives Ziehen zwischen Klassen-Listen. Mobile-375 inkompatibel; Phase 12 nutzt Row-Action + Multi-Select-Dialog. Deferred.
- **SVN-Verschlüsselung Re-Review** — Phase 2 etablierte AES-256-GCM; Phase 12 UI zeigt nur maskiert ("XXXX XXX XXX X") mit Edit-Unmask-Button. Keine Änderung am Crypto-Layer.
- **Schüler-CSV-Export / Klassen-Übersicht-Export** — nicht in Requirements, Phase 16 Dashboard-Kandidat.
- **Bulk-Archivierung / Bulk-Delete** — Multi-Select-Archive möglich in D-05 Multi-Select-Pattern als Erweiterung, aber nicht in MVP-Scope. Deferred wenn nicht trivial.
- **Student-Kalender-Export (ICS pro Schüler)** — Phase 4/8-Territorium; nicht in Phase 12 Scope.
- **Eltern-Portal-Invite-Flow** — Parent-Keycloak-Account-Auto-Create aus Student-Detail-Page; deferred zu Phase 13 (User-Management).

</deferred>

---

*Phase: 12-sch-ler-klassen-und-gruppenverwaltung*
*Context gathered: 2026-04-24*
