# Phase 12: Schüler-, Klassen- und Gruppenverwaltung — Research

**Status:** Complete
**Date:** 2026-04-24
**Confidence:** HIGH (CONTEXT.md is authoritative; code surfaces confirmed via Glob)
**Scope constraint:** Focused research — CONTEXT.md is authoritative; this doc complements it with code-surface grounding.

## User Constraints (from CONTEXT.md)

### Locked Decisions (verbatim from 12-CONTEXT.md)

**Area 1 — Student-UX + Archivierung + Umzug + Eltern**
- **D-01:** Dense Table `/admin/students` with Filter-Bar (Suche, Klassen-Dropdown, Status-Toggle, Schuljahr-Dropdown). Row-Click → `/admin/students/$studentId`. Empty-State inline CTA.
- **D-02:** Student-Detail-Page mit 3 Tabs (Stammdaten | Erziehungsberechtigte | Gruppen). Pro-Tab-Save, UnsavedChangesDialog.
- **D-03:** Eltern-Verknüpfungs-UX — Search-by-Email Autocomplete (shadcn Command-Popover, `GET /parents?email=`) + Inline-Create-Fallback (Mini-Form → Parent-Create mit personType=PARENT + Link in Transaktion). Remove via Icon + Confirm-Dialog.
- **D-04:** STUDENT-04 Archivierung — Soft-Delete via Prisma-Feld `Student.isArchived Boolean @default(false)` + `archivedAt DateTime?`. Endpoints `POST /students/:id/archive` + `POST /students/:id/restore`. `findAll` mit `?archived=active|archived|all` (default=active). Scharfe Trennung zu DSGVO Art. 17 (Phase 15).
- **D-05:** STUDENT-03 Klassen-Umzug — (1) Single-Row-Action "Verschieben" Dialog mit Klassen-Picker; (2) Multi-Select-Checkboxen + Toolbar "Ausgewählte verschieben". Beide nutzen `PUT /students/:id` mit neuem `classId`. Klassenbuch-Historie bleibt intakt.

**Area 2 — Class-UX + Klassenvorstand + Stundentafel**
- **D-06:** Dense Table `/admin/classes` mit Filter-Bar. Click-auf-Row → `/admin/classes/$classId`.
- **D-07:** Class-Detail-Page mit 4 Tabs (Stammdaten | Stundentafel | Schüler | Gruppen). Pro-Tab-Save.
- **D-08:** Klassenvorstand-Zuweisung via Command-Popover; Backend `GET /teachers?search=` (Gap-Fix falls nicht vorhanden).
- **D-09:** Apply-Stundentafel-Flow: "Stundentafel aus Vorlage übernehmen" → Schultyp-Dropdown + Preview-Table → Confirm erstellt ClassSubjects. Nach Apply: editierbare Tabelle (Fach | Wochenstunden | isCustomized-Badge | Delete-Row) + "+ Fach"-Row + "Auf Vorlage zurücksetzen" mit WarnDialog. Deckt CLASS-03 + SUBJECT-04.

**Area 3 — Gruppenableitungsregeln + Manuelle Overrides**
- **D-10:** Rule-Builder-Table im Gruppen-Tab. "Regeln anwenden" → Dry-Run-Preview-Dialog (Groups + Memberships + Conflicts) → Confirm triggert `POST /groups/apply-rules/:classId`. Keine Auto-Apply bei Rule-Save.
- **D-11:** Manuelle Overrides — Expandierbare Karten pro Group, Member-Liste mit "Auto"/"Manuell"-Badges, Add-Student-Combobox (`isAutoAssigned=false`), Remove-Icon. Persistente Exclusions deferred.
- **D-12:** `GroupDerivationRule { id, classId (FK onDelete:Cascade), groupType, groupName, level, studentIds Json?, createdAt, updatedAt }` via Migration. CRUD-Endpoints `GET/POST/PUT/DELETE /classes/:classId/derivation-rules`. `applyRules` erweitert: optional inline, sonst DB-load.

**Area 4 — Delivery**
- **D-13:** Vier Backend-Gap-Fixes als atomic tasks:
  1. Parent-HTTP-Surface (ParentModule + Student-Controller Link-Endpoints + CreateStudentDto.parentIds)
  2. Student-Archivierung (Migration + archive/restore Endpoints + findAll-Filter)
  3. StudentService.remove Orphan-Guard (Dependency-Check: ClassBookEntry, Attendance, Grade, HomeworkSubmission, ExamResult, ConsentRecord, GroupMembership, ParentStudent → 409 RFC 9457 mit `affectedEntities`)
  4. ClassService.remove Orphan-Guard (aktive Students, ClassSubject, Group + GroupMembership, TimetableRun, ClassBookEntry, GroupDerivationRule → 409)
  Plus GroupDerivationRule Schema + CRUD. Alle mit Unit-Tests + E2E-Error-Paths.
- **D-14:** ~11 E2E-Spec-Files (Schüler 5 + Klassen 6). Prefix-Isolation E2E-STD-* / E2E-CLS-* / E2E-STD-MOBILE-* / E2E-CLS-MOBILE-*. SILENT-4XX-Invariante. Mobile-WebKit Bus-Error-10 acceptable.
- **D-15:** Defense-in-Depth Validation — `packages/shared/src/validation/` Zod (student, parent, school-class, class-subject, group-derivation-rule, assign-parent) + RHF Client + class-validator DTO Server. Deutsche UI-Errors, englische API-Felder.
- **D-16:** 3 bundled plans — Plan 12-01 (Foundation + Student-CRUD + Parent-Surface), Plan 12-02 (Class-CRUD + Stundentafel + Gruppen), Plan 12-03 (E2E Sweep ~11 Specs).

### Claude's Discretion (verbatim from 12-CONTEXT.md)
- Sidebar-Position Schüler + Klassen in "Personal & Fächer" (wahrscheinlich Lehrer → Fächer → Klassen → Schüler)
- shadcn/ui Primitives (alle vorhanden aus Phase 10/11)
- lucide-react Icons (UsersRound, School/GraduationCap, Users, UserPlus, Archive/RotateCcw, Move)
- Spalten-Breiten, Default-Sort Nachname ASC (Phase 11 parity)
- Loading-Skeletons, Empty-State-Illustrations
- Preview-Dialog-Layout für Apply-Rules Dry-Run
- Mobile-Adaption Stundentafel-Editor (Matrix → Cards <640px)
- Bulk-Move-Dialog Selection-Preview-Styling
- Solver-Re-Run-Banner nach Class-Änderungen (Phase 10 D-06 Pattern)
- Audit-Log-Action-Types (archive-student, move-student, apply-rules) — re-use Interceptor
- Export-Button CSV — deferred (nicht in Requirements)

### Deferred Ideas (OUT OF SCOPE)
- Jahres-Rollover-Wizard (eigene Phase / Phase 16 Dashboard)
- Persistente Rule-Exclusions (DerivationExclusion-Model)
- Parent-CRUD Standalone-Page `/admin/parents` (deferred Phase 13 oder v1.2)
- Matrix Schüler×Gruppen Toggle-View
- Drag-between-Classes
- SVN-Verschlüsselung Re-Review
- Schüler-/Klassen-CSV-Export
- Bulk-Archivierung / Bulk-Delete
- Student-Kalender-Export (ICS)
- Eltern-Portal-Invite-Flow (Phase 13 User-Management)

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STUDENT-01 | Admin legt Schüler:in mit Person-Daten + Klasse an | D-01/D-02 List+Detail; CreateStudentDto erweitert um parentIds (D-13.1) |
| STUDENT-02 | Admin verknüpft Schüler:in mit Erziehungsberechtigten | D-03 Search-by-Email Autocomplete + Inline-Create; POST/DELETE /students/:id/parents (D-13.1) |
| STUDENT-03 | Admin verschiebt Schüler:in zwischen Stammklassen | D-05 Single+Bulk Flows; PUT /students/:id mit classId |
| STUDENT-04 | Admin archiviert Schüler:in ohne Datenverlust | D-04 isArchived + archivedAt Migration; archive/restore Endpoints (D-13.2) |
| CLASS-01 | Admin legt Klasse mit Jahrgangsstufe + Schuljahr an | D-06/D-07 List+Detail; bestehender ClassModule |
| CLASS-02 | Admin weist Klassenvorstand zu | D-08 Command-Popover Teacher-Search; `GET /teachers?search=` |
| CLASS-03 | Admin wendet Stundentafel-Vorlage auf Klasse an | D-09 Apply-Template-Flow; Austrian Stundentafeln (Phase 2) |
| CLASS-04 | Admin legt Gruppenableitungsregeln fest | D-10 Rule-Builder + Dry-Run; GroupDerivationRule Model (D-12/D-13) |
| CLASS-05 | Admin überschreibt Gruppen manuell | D-11 Expandierbare Group-Cards + Manual-Add/Remove mit isAutoAssigned-Flag |
| SUBJECT-04 | Admin editiert Wochenstunden pro Klassen-Fach | D-09 Editable-Table nach Apply; ClassSubject.weeklyHours bestehend |
| MOBILE-ADM-02 | Alle Admin-Formulare Mobile-375 + 44px-Tapgröße | D-07 StickyMobileSaveBar; E2E-STD-MOBILE-* + E2E-CLS-MOBILE-* Specs (D-14) |

## 1. Existing Domain Surface (Confirmed via Glob)

### Backend (apps/api/src/modules/)
**Student Module:**
- `student/student.controller.ts`, `student/student.service.ts`, `student/student.service.spec.ts`, `student/student.module.ts`
- DTOs: `dto/create-student.dto.ts`, `dto/update-student.dto.ts`, `dto/student-response.dto.ts`
- **Missing (per CONTEXT.md D-13):** Parent-Link endpoints, archive/restore endpoints, orphan-guard in `.remove`, `parentIds` in CreateStudentDto

**Class Module:**
- `class/class.controller.ts`, `class/class.service.ts`, `class/class.service.spec.ts`, `class/class.module.ts`
- `class/group.controller.ts`, `class/group.service.ts`
- `class/group-membership-rule.service.ts` + spec (`GroupMembershipRuleService.applyRules` + `clearAutoAssignments`)
- DTOs: `dto/create-class.dto.ts`, `dto/update-class.dto.ts`, `dto/class-response.dto.ts`, `dto/create-group.dto.ts`, `dto/assign-student.dto.ts`
- **Missing (per CONTEXT.md D-13):** Orphan-guard in ClassService.remove, GroupDerivationRule model + CRUD, applyRules DB-source extension

**Parent Module:**
- **NOT found in apps/api/src/modules/** — Gap confirmed. ParentModule is new in Phase 12 (D-13.1 atomic task).

**Subject Module (Phase 11):**
- Phase 11 pattern available as closest analog for CRUD form + table pattern. Stundentafel reader in `packages/shared/src/stundentafel/` (per CONTEXT.md).

### Frontend (apps/web/src/routes/_authenticated/admin/)
**Existing Phase 10/11 routes confirmed:**
- `teachers.index.tsx`, `teachers.$teacherId.tsx` — Phase 11 Teacher CRUD (primary analog for Student-Detail-Page)
- `subjects.index.tsx` — Phase 11 Subject CRUD
- `school.settings.tsx` — Phase 10 school settings
- `timetable-history.tsx`, `timetable-edit.tsx`, `substitutions.tsx`, `resources.tsx`, `import.tsx`, `solver.tsx`

**Missing routes (to create per CONTEXT.md D-01/D-06/D-16):**
- `students.index.tsx`, `students.$studentId.tsx`
- `classes.index.tsx`, `classes.$classId.tsx`

### E2E (apps/web/e2e/)
**Phase 11 analogs confirmed (closest pattern):**
- `admin-teachers-crud.spec.ts`, `admin-teachers-crud.error.spec.ts`, `admin-teachers-crud.mobile.spec.ts`, `admin-teachers-werteinheiten.spec.ts`
- `admin-subjects-crud.spec.ts`, `admin-subjects-crud.error.spec.ts`, `admin-subjects-crud.mobile.spec.ts`, `admin-subjects-stundentafel.spec.ts`

**Phase 10 harness (reuse directly):**
- `silent-4xx.spec.ts` — SILENT-4XX-Invariante baseline
- `roles-smoke.spec.ts`, `zeitraster.spec.ts`, `schuljahre.spec.ts`, `wochentage.spec.ts`

**Missing (to create per D-14, ~11 specs):**
- Schüler (5): E2E-STD-01 create+edit, E2E-STD-02 delete+Orphan-Guard, E2E-STD-03 archive/restore, E2E-STD-04 Eltern-Link, E2E-STD-05 Class-Move
- Klassen (6): E2E-CLS-01 create+edit, E2E-CLS-02 delete+Orphan-Guard, E2E-CLS-03 Klassenvorstand, E2E-CLS-04 Stundentafel+SUBJECT-04, E2E-CLS-05 Rules+Dry-Run, E2E-CLS-06 Manual-Overrides

## 2. Backend Gaps (ground CONTEXT.md claims in code)

### 2.1 Elternlink HTTP surface (D-13.1)
- **Evidence:** ParentModule directory does NOT exist in `apps/api/src/modules/` (Glob-confirmed). CONTEXT.md §93-95 states `CreateStudentDto` lacks `parentIds` and `student.controller.ts` lacks parent-link endpoints.
- **Fix:**
  - New `ParentModule` with Controller + Service + DTOs: `GET /parents` (list by schoolId, filter email/name), `GET /parents/:id`, `POST /parents` (nested Person-Create, personType=PARENT), `PUT /parents/:id`, `DELETE /parents/:id` (Orphan-Guard via ParentStudent refs)
  - Extend `CreateStudentDto` with optional `parentIds: string[]` for initial-linking-on-create
  - Add `POST /students/:id/parents` (link existing Parent) + `DELETE /students/:id/parents/:parentId` (unlink, Parent record preserved)
- **Migration needed:** NO. ParentStudent junction model already exists (per CONTEXT.md schema.prisma §373-421).

### 2.2 Orphan-Guard on DELETE (D-13.3 + D-13.4)
- **Pattern:** Reuse Phase 11 Orphan-Guard pattern (RFC 9457 409 + `affectedEntities` extension). Phase 11 `AffectedEntitiesList` component is discriminated union `kind: 'teacher' | 'subject'` — extend with `'student' | 'class' | 'group' | 'class-subject' | 'group-membership' | 'derivation-rule' | 'parent-student'`.
- **StudentService.remove affected dependencies (per CONTEXT.md D-13.3):** ClassBookEntry, Attendance, Grade, HomeworkSubmission, ExamResult, ConsentRecord, GroupMembership, ParentStudent. (Planner MUST grep schema.prisma to confirm exact FK relationships before implementing guard.)
- **ClassService.remove affected dependencies (per CONTEXT.md D-13.4):** aktive (nicht-archivierte) Students mit classId, ClassSubject, Group + GroupMembership, TimetableRun (wenn referenced), ClassBookEntry (via TimetableLesson.class_id — grep erforderlich), GroupDerivationRule.
- **Note:** Delete = hard DB removal. For "Schüler geht — Daten bleiben" the primary UX path is D-04 Archivierung. Delete only for testdata/dubletten.

### 2.3 Student.isArchived Schema (D-13.2)
- **Fields:** `Student.isArchived Boolean @default(false)` + `archivedAt DateTime?`
- **Migration (CLAUDE.md hard rule):** `pnpm --filter @schoolflow/api exec prisma migrate dev --name 12_student_is_archived` — MUST commit SQL migration file in same PR. `prisma db push` is FORBIDDEN on this project.
- **Endpoints:** `POST /students/:id/archive` (sets flag + archivedAt=now) + `POST /students/:id/restore` (clears both)
- **findAll extension:** `?archived=active|archived|all` query-param (default=active)

### 2.4 GroupDerivationRule Schema + CRUD (D-12/D-13)
- **New Model:** `GroupDerivationRule { id, classId (FK onDelete:Cascade), groupType (enum GroupType), groupName, level, studentIds Json?, createdAt, updatedAt }`
- **Migration:** `12_group_derivation_rules` (separate migration file from 12_student_is_archived)
- **CRUD:** `GET/POST/PUT/DELETE /classes/:classId/derivation-rules`
- **applyRules adaptation:** Accept classId + optional inline rules; default loads from DB.

### 2.5 Teacher-Search Endpoint (D-08)
- CONTEXT.md flags this: "prüfen ob `GET /teachers` mit search-query bereits unterstützt wird (sonst Gap-Fix)".
- Planner MUST grep `apps/api/src/modules/teacher/teacher.controller.ts` for `@Query('search')` or similar before deciding Gap-Fix scope.

### 2.6 GroupMembership.isAutoAssigned override
- Flag already exists in v1.0 schema (per CONTEXT.md §453-505 and §132-133). No migration needed for the flag itself.
- UI requirement: toggle "manueller Override" pro Schüler (D-11).

## 3. Frontend Gaps

Missing routes (relative to `apps/web/src/routes/_authenticated/admin/`):
- `students.index.tsx` — list + filter-bar + multi-select + bulk-move-toolbar
- `students.$studentId.tsx` — 3-tab detail page (Stammdaten | Erziehungsberechtigte | Gruppen)
- `classes.index.tsx` — list + filter-bar
- `classes.$classId.tsx` — 4-tab detail page (Stammdaten | Stundentafel | Schüler | Gruppen)

**Closest analog to copy (confirmed via Glob):** `apps/web/src/routes/_authenticated/admin/teachers.$teacherId.tsx` (Phase 11 tab pattern, pro-tab-save, UnsavedChangesDialog).

**Mobile-375 mandatory** for all forms (MOBILE-ADM-02) — StickyMobileSaveBar pattern from Phase 10.

**New Sidebar Entries:** "Personal & Fächer" gruppe in `AppSidebar.tsx` + `MobileSidebar.tsx` bekommt Klassen + Schüler (role-gating `['admin', 'schulleitung']`).

## 4. Patterns to Reuse (confirmed via CONTEXT.md)

- **CRUD form + table pattern** from Phase 11 subjects/teachers (teachers.$teacherId.tsx, subjects.index.tsx)
- **Stundentafel-Vorlage application** — Apply-Template → Preview → Editable-Table Flow (D-09). `packages/shared/src/stundentafel/` = source of truth.
- **Toast error handling** — Silent-4XX-Invariante per `feedback_admin_requirements_need_ui_evidence.md` + Phase 10.2-04 invariant. Existing `silent-4xx.spec.ts` as baseline.
- **RFC 9457 Problem-Details** — `apiFetch + Problem-Details-Parser` in `apps/web/src/lib/api.ts` already integrated.
- **Pro-Tab-Save + UnsavedChangesDialog** — Phase 10 D-02 pattern, extended in Phase 11 for teacher-detail.
- **Silent-4xx-Toast-Invariante** — Alle Mutation-Hooks MÜSSEN useMutation's onError explizit verdrahten.
- **AffectedEntitiesList** discriminated union — Phase 11 D-12 pattern; extend with new kinds for Phase 12 orphan guards.
- **AutocompleteSearch via shadcn Command-Popover** — Two instances: Parent-by-Email (D-03) and Teacher-by-Name (D-08); CONTEXT.md §173 suggests consolidating as reusable `AutocompleteSearch` component with `source` prop (planner discretion).

## 5. Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Student/Class CRUD | API (NestJS) | Frontend SPA | Business logic + validation server-side; SPA consumer per CLAUDE.md constraint |
| Parent HTTP surface | API (NestJS) | — | New ParentModule owns identity of Erziehungsberechtigte |
| Orphan-Guard logic | API (NestJS) | — | Referential integrity belongs to service layer; UI only consumes 409+affectedEntities |
| Student Archivierung | API + DB | Frontend SPA | Soft-delete flag in DB; UI toggles + filter |
| Stundentafel-Template-Read | packages/shared | Frontend SPA | Read-only static TS arrays shared web+api |
| Apply-Stundentafel-Tx | API (NestJS) | — | Replace-all-in-transaction (Phase 2 D-04) |
| GroupDerivationRule evaluator | API (NestJS GroupMembershipRuleService) | — | Pure domain logic; adapts to DB-source |
| Mobile 375 forms | Frontend SPA | — | StickyMobileSaveBar component |
| E2E validation | apps/web/e2e (Playwright) | — | Browser-level verification of admin UX |

## 6. Validation Architecture (Nyquist Dim 8 — MANDATORY)

### Test Framework
| Property | Value |
|----------|-------|
| Unit/Integration framework | Vitest 4.x (per CLAUDE.md) |
| E2E framework | Playwright 1.x (per CLAUDE.md) |
| API integration | Supertest 7.x (NestJS controllers) |
| Quick run command | `pnpm --filter @schoolflow/api test -- --run` (unit) and `pnpm --filter @schoolflow/web test -- --run` |
| Full suite | `pnpm test` (root, all workspaces) |
| E2E run | `pnpm --filter @schoolflow/web test:e2e` |
| Migration hygiene | `scripts/check-migration-hygiene.sh` (required per CLAUDE.md) |

### Unit (Vitest)
- `StudentService.remove` orphan-guard (happy: no dependents → delete succeeds; error: ClassBookEntry/Attendance/Grade/HomeworkSubmission/ExamResult/ConsentRecord/GroupMembership/ParentStudent present → 409)
- `ClassService.remove` orphan-guard (happy; error with Students/ClassSubject/Group/GroupMembership/TimetableRun/ClassBookEntry/GroupDerivationRule)
- `GroupMembershipRuleService.applyRules` (extended): inline rules path + DB-load path + dispatch Religion/Leistung/Wahlpflicht/Language/Custom
- `ParentService` CRUD (create+nested-Person, list-by-email, delete orphan-guard)
- `StudentService.archive` + `.restore` (sets/clears isArchived + archivedAt)
- `StudentService.moveToClass` (happy: classId updated; historic ClassBookEntry references intact)

### Integration (Supertest)
- `POST /students` with parentIds array (creates Student + ParentStudent links in Tx)
- `POST /students/:id/parents` (link existing) + `DELETE /students/:id/parents/:parentId` (unlink, Parent preserved)
- `DELETE /students/:id` conflict path (409 RFC 9457 with `affectedEntities` extension)
- `DELETE /classes/:id` conflict path (409 with `affectedEntities`)
- `POST /students/:id/archive` + `POST /students/:id/restore`
- `GET /students?archived=active|archived|all`
- `GET /parents?email=` (Autocomplete-Search 200 match / 404 no-match)
- `PUT /classes/:id/subjects` (SUBJECT-04 Wochenstunden update + isCustomized flip)
- `POST /classes/:id/apply-stundentafel` (Apply-Template-Flow)
- `GET/POST/PUT/DELETE /classes/:classId/derivation-rules`
- `POST /groups/apply-rules/:classId` (Dry-Run + Confirm)
- `PUT /students/:id` with new classId (Move-Flow, single + bulk via loop)

### E2E (Playwright — ex-10.4 requirements, ~11 spec files per D-14)
**Schüler (5):**
- `admin-students-crud.spec.ts` — E2E-STD-01 create+edit happy (desktop)
- `admin-students-crud.error.spec.ts` — E2E-STD-01 error incl. SILENT-4XX + E2E-STD-02 delete-Orphan-Guard 409
- `admin-students-crud.mobile.spec.ts` — E2E-STD-01 MOBILE-375
- `admin-students-archive.spec.ts` — E2E-STD-03 archive/restore
- `admin-students-parents.spec.ts` — E2E-STD-04 Eltern-Link (Search-Existing + Inline-Create + Unlink)
- `admin-students-move.spec.ts` — E2E-STD-05 Class-Move (Single-Row-Action + Multi-Select-Bulk)

**Klassen (6):**
- `admin-classes-crud.spec.ts` — E2E-CLS-01 create+edit happy
- `admin-classes-crud.error.spec.ts` — E2E-CLS-01 error + E2E-CLS-02 delete-Orphan-Guard 409 (mit aktiven Schülern)
- `admin-classes-crud.mobile.spec.ts` — E2E-CLS-01 MOBILE-375
- `admin-classes-klassenvorstand.spec.ts` — E2E-CLS-03 Klassenvorstand-Zuweisung + Remove
- `admin-classes-stundentafel.spec.ts` — E2E-CLS-04 Apply-Stundentafel + SUBJECT-04 Wochenstunden-Edit + Reset
- `admin-classes-gruppen.spec.ts` — E2E-CLS-05 Rule-Builder + Dry-Run + Apply + E2E-CLS-06 Manual-Overrides (Add/Remove + Auto/Manual-Badge)

**Harness:** Reuse Phase 10.3 (loginAsRole, getRoleToken, globalSetup) + Phase 10.4-01 (getByCardTitle).
**Prefix-Isolation (Phase 10.5-02):** E2E-STD-*, E2E-CLS-*, E2E-STD-MOBILE-*, E2E-CLS-MOBILE-*.
**SILENT-4XX-Invariante (Phase 10.2-04):** codified in all error specs.
**Mobile-WebKit Bus-Error-10:** acceptable (Phase 10.4-03 Precedent).

### Seed / Fixtures
- Min: 1 School, 1 Class, 2 Students, 1 Parent with ParentStudent link, 3 Subjects from Phase 11 seed
- Existing seed handles linkage via fixed UUIDs (per auto-memory `project_seed_gap.md`)
- New seed additions: 1 archived Student (to test archive-filter), 1 GroupDerivationRule (Religion) — planner to decide

### Sampling Rate
- **Per task commit:** `pnpm --filter @schoolflow/api test -- --run <file>` for touched area
- **Per wave merge:** Full unit + integration suite for api + web
- **Phase gate:** All E2E green + `scripts/check-migration-hygiene.sh` passes before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `packages/shared/src/validation/student.ts` — Zod schema
- [ ] `packages/shared/src/validation/parent.ts` — Zod schema
- [ ] `packages/shared/src/validation/school-class.ts` — Zod schema
- [ ] `packages/shared/src/validation/class-subject.ts` — Zod schema
- [ ] `packages/shared/src/validation/group-derivation-rule.ts` — Zod schema
- [ ] `packages/shared/src/validation/assign-parent.ts` — Zod schema
- [ ] `packages/shared/src/validation/move-student.ts` — Zod schema
- [ ] Playwright spec scaffolds (11 files as `it.todo()` first per Nyquist-Wave-0)
- [ ] Backend module scaffolds: ParentModule (Controller + Service + Module + 5 DTOs)
- [ ] Two migration files: `12_student_is_archived` + `12_group_derivation_rules`
- [ ] Extend `AffectedEntitiesList` component kinds union

## 7. Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Backend + Frontend | ✓ (assumed from prior phases) | 24 LTS | — |
| pnpm | Monorepo | ✓ | 10.x | — |
| PostgreSQL 17 | Prisma migrations | ✓ (running per Phase 10) | 17.x | — |
| Prisma 7 | Schema + migrations | ✓ | 7.x | — |
| Playwright | E2E | ✓ (existing apps/web/e2e/) | 1.x | — |
| Vitest | Unit | ✓ | 4.x | — |
| shadcn/ui Command + Checkbox | D-03 + D-05 multi-select | Confirm via `apps/web/src/components/ui/` Glob | — | Install from shadcn registry if missing |

**Planner action:** Glob `apps/web/src/components/ui/{command,checkbox}.tsx` before Wave 1 to confirm primitives present (CONTEXT.md §108 states all primitives available, treat as HIGH confidence; quick verification only).

## 8. Risks

- **Migration hygiene (CLAUDE.md hard rule):** Both schema changes (Student.isArchived + GroupDerivationRule) MUST produce SQL migration files via `prisma migrate dev --name`. `prisma db push` is forbidden. `scripts/check-migration-hygiene.sh` will block PRs without migration SQL.
- **Restart API after prisma migrate (auto-memory `feedback_restart_api_after_migration.md`):** Long-running Nest binds Prisma Client at boot; after each migration the API must be restarted AND shared dist `.js` extension post-processing must re-run.
- **Restart Vite after API rebuild (auto-memory `feedback_restart_vite.md`):** Check and restart both servers.
- **SUBJECT-04 Wochenstunden editor MUST NOT break Phase 11 Stundentafel template** — template reader in `packages/shared/src/stundentafel/` remains read-only; edits land on ClassSubject rows, not template.
- **Student move between classes MUST NOT break Klassenbuch references** — ClassBookEntry references TimetableLesson/Date (not current Student.classId), but planner MUST confirm via schema.prisma grep before Phase 12 ships (CONTEXT.md §25 claims this; verify).
- **StudentService.remove dependency-grep required** — CONTEXT.md §13.3 flags ClassBookEntry relationship as "unknown — grep erforderlich". Planner MUST resolve before writing guard.
- **ClassService.remove ClassBookEntry indirection** — via TimetableLesson.class_id; grep required (CONTEXT.md §13.4).
- **Teacher-Search endpoint** — `GET /teachers?search=` may not exist yet; planner must verify and add as Gap-Fix if missing (D-08).
- **Mobile-WebKit Bus-Error-10** — accepted per Phase 10.4-03 precedent but reduces mobile E2E coverage confidence.
- **E2E-first directive (auto-memory `feedback_e2e_first_no_uat.md`):** User directive 2026-04-21 — ship with tests, no "please test in browser" asks. All 11 E2E specs MUST land before phase is considered complete.
- **"Admin kann X" requires UI evidence (auto-memory `feedback_admin_requirements_need_ui_evidence.md`):** Backend-only proof is rejected; each requirement needs UI-click-evidence covered by E2E.

## 9. Project Constraints (from CLAUDE.md)

- **Monorepo with pnpm workspaces + Turborepo** — `packages/shared` for cross-package Zod schemas
- **Framework-Unabhängigkeit** — No framework-lock-in; best-tool-for-job per layer
- **DSGVO von Tag 1** — Archivierung ≠ Anonymisierung (Phase 15 owns Art. 17); AES-256-GCM for socialSecurityNumber already established (Phase 2)
- **API-First** — All functionality via REST/GraphQL; UI is pure consumer
- **Migration-Hygiene (hard rule):** Every `schema.prisma` change ships as migration file under `apps/api/prisma/migrations/<timestamp>_<name>/`. `prisma db push` is FORBIDDEN. Enforced by `scripts/check-migration-hygiene.sh` in CI. See `apps/api/prisma/README.md`.
- **GSD Workflow Enforcement** — No direct edits outside GSD workflow
- **German UI, English API fields** — Already established Phase 1 D-15
- **Single-Tenant self-hosted via Docker** — Default deployment constraint

## 10. Standard Stack (from CLAUDE.md — already locked)

| Layer | Technology | Version |
|-------|------------|---------|
| Backend framework | NestJS | 11.x |
| ORM | Prisma | 7.x |
| Database | PostgreSQL | 17.x |
| Shared validation | Zod via RHF + zodResolver | — |
| Server validation | class-validator DTO | — |
| Frontend | React | 19.x |
| Router | TanStack Router | 1.x |
| Server state | TanStack Query | 5.x |
| UI primitives | shadcn/ui + Radix | Latest |
| Styling | Tailwind CSS | 4.x |
| Client state | Zustand | 5.x |
| Unit test | Vitest | 4.x |
| E2E test | Playwright | 1.x |
| API test | Supertest | 7.x |

**No version research needed** — stack is locked at project level.

## 11. Don't Hand-Roll (reuse existing)

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Autocomplete Command-Popover | Custom combobox | shadcn/ui Command primitive | Already in `apps/web/src/components/ui/` |
| RFC 9457 Problem parser | Custom fetch wrapper | `apiFetch` + Problem-Details-Parser in `apps/web/src/lib/api.ts` | Existing integration |
| Affected entities UI list | Custom table | `AffectedEntitiesList` discriminated union (Phase 11 D-12) | Extend existing kinds |
| Pro-Tab-Save orchestration | Custom dirty tracking | `UnsavedChangesDialog` + per-tab Zustand slice (Phase 10/11) | Proven pattern |
| Mobile save bar | Custom floating action | `StickyMobileSaveBar` (Phase 10) | Already shipped |
| Audit log entries | New audit schema | `AuditInterceptor` + existing Audit schema (Phase 1) | Auto-logged via CRUD wiring |
| Orphan-guard 409 response | Custom error shape | RFC 9457 problem+json with `affectedEntities` extension (Phase 1 D-12 + Phase 11 D-12) | Client already parses |
| Stundentafel Template | Custom JSON | `packages/shared/src/stundentafel/*.ts` static arrays (Phase 2 validated) | Read-only source of truth |

## 12. Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | ClassBookEntry references TimetableLesson/Date (not current Student.classId) so Student move is safe | §2.2 / §8 | Klassenbuch-Historie bricht bei Move. Planner MUST grep schema.prisma + ClassBookEntry relationships. |
| A2 | `GET /teachers?search=` exists already | D-08 / §2.5 | Additional Gap-Fix scope needed. Planner MUST grep teacher.controller.ts. |
| A3 | shadcn Checkbox primitive is present | §7 | Install step needed. Planner MUST Glob `components/ui/checkbox.tsx`. |
| A4 | Existing seed auto-creates ParentStudent linkage via fixed UUIDs | §6 Seed | E2E-STD-04 Eltern-Link spec needs custom fixture setup. |
| A5 | StudentService.remove dependencies limited to listed set (ClassBookEntry, Attendance, Grade, HomeworkSubmission, ExamResult, ConsentRecord, GroupMembership, ParentStudent) | §2.2 | Orphan-guard incomplete; silent deletion of referenced records. Planner MUST grep all Person/Student FK relationships. |

## 13. Open Questions

1. **Is `GET /teachers?search=` already implemented?**
   - What we know: CONTEXT.md §101 flags it as "prüfen ob existiert, sonst Gap-Fix"
   - What's unclear: actual state
   - Recommendation: Planner runs `grep -n "search" apps/api/src/modules/teacher/teacher.controller.ts` as first step of Plan 12-02

2. **Exact ClassBookEntry relationships (for orphan-guard scope)**
   - What we know: CONTEXT.md §13.3 and §13.4 flag "grep erforderlich"
   - What's unclear: FK chain (direct personId? indirect via TimetableLesson.class_id?)
   - Recommendation: Planner greps `schema.prisma` for `ClassBookEntry` and documents in Plan 12-01 Wave 0 before implementing guard

3. **Should AutocompleteSearch be consolidated as reusable component?**
   - What we know: CONTEXT.md §173 suggests it "if redundancy pays off"
   - What's unclear: discretion level of consolidation
   - Recommendation: Planner decides in Plan 12-01 (Parent-by-Email is first; if Teacher-by-Name in Plan 12-02 fits `source` prop cleanly, consolidate)

4. **Bulk-Move UX limits**
   - What we know: D-05 Multi-Select-Bulk via checkbox toolbar
   - What's unclear: max selection before performance issues (500+ students per list per D-01)
   - Recommendation: Planner defines N/A or documents soft-limit in Plan 12-01 discretion notes

## 14. Canonical References (planner MUST read)

- `.planning/phases/12-sch-ler-klassen-und-gruppenverwaltung/12-CONTEXT.md` — locked decisions (AUTHORITATIVE)
- `apps/api/prisma/schema.prisma` §373-547 — Student, SchoolClass, Parent, ParentStudent, ClassSubject, GroupMembership, Group, Subject
- `apps/api/src/modules/student/` — existing CRUD to extend
- `apps/api/src/modules/class/` — existing CRUD + GroupMembershipRuleService to extend
- `apps/api/src/modules/subject/templates/austrian-stundentafeln.ts` + `packages/shared/src/stundentafel/` — read-only template source
- `apps/web/src/routes/_authenticated/admin/teachers.$teacherId.tsx` — PRIMARY ANALOG for Student-Detail-Page and Class-Detail-Page
- `apps/web/src/routes/_authenticated/admin/subjects.index.tsx` — Subject CRUD analog
- `apps/web/e2e/admin-teachers-crud.*.spec.ts` — PRIMARY ANALOG for E2E-STD-* + E2E-CLS-*
- `apps/web/e2e/silent-4xx.spec.ts` — Silent-4XX-Invariante baseline
- `.planning/phases/11-lehrer-und-f-cher-verwaltung/` all PLAN*.md files — closest pattern precedent
- `.planning/phases/10-schulstammdaten-zeitraster/10-CONTEXT.md` — Tab+Pro-Tab-Save patterns (D-01/D-02)
- `CLAUDE.md` — Migration-Hygiene hard rule, Stack versions, Project constraints
- `apps/api/prisma/README.md` — Migration policy details + shadow DB setup

## Sources

### Primary (HIGH confidence)
- `.planning/phases/12-sch-ler-klassen-und-gruppenverwaltung/12-CONTEXT.md` (read in full)
- `.planning/ROADMAP.md` §Phase 12 (grep-confirmed)
- Glob confirmation of `apps/api/src/modules/student/**`, `apps/api/src/modules/class/**`, `apps/web/src/routes/_authenticated/admin/**`, `apps/web/e2e/**`
- `CLAUDE.md` (project rules surfaced via system context)
- Auto-memory: `feedback_e2e_first_no_uat.md`, `feedback_restart_api_after_migration.md`, `feedback_restart_vite.md`, `project_seed_gap.md`, `feedback_admin_requirements_need_ui_evidence.md`

### Deferred verification (planner must confirm)
- ClassBookEntry FK chain (schema.prisma grep)
- `GET /teachers?search=` existence (teacher.controller.ts grep)
- shadcn Checkbox primitive (Glob `components/ui/checkbox.tsx`)

## Metadata

**Confidence breakdown:**
- Locked decisions: HIGH — CONTEXT.md is user-authoritative
- Existing code surfaces: HIGH — Glob-confirmed
- ClassBookEntry orphan-guard scope: MEDIUM — CONTEXT.md flags "grep erforderlich"
- Teacher-Search endpoint state: LOW — explicit gap in CONTEXT.md
- Seed / fixture sufficiency: MEDIUM — depends on ParentStudent auto-linkage

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days; stable stack, locked decisions)

## RESEARCH COMPLETE
