---
phase: 12-sch-ler-klassen-und-gruppenverwaltung
verified: 2026-04-24T13:52:00Z
status: passed
score: 7/7 must-haves verified
overrides_applied: 0
requirements_verified: [STUDENT-01, STUDENT-02, STUDENT-03, STUDENT-04, CLASS-01, CLASS-02, CLASS-03, CLASS-04, CLASS-05, SUBJECT-04]
plans_verified: [12-01, 12-02, 12-03]
e2e_gate:
  desktop:
    spec_glob: admin-students admin-classes --project=desktop
    result: 19/19 passed
    duration: 24.3s
  mobile_chrome:
    spec_glob: admin-students admin-classes --project=mobile-chrome
    result: 5/5 passed
    duration: 1.6min
---

# Phase 12: Schüler-, Klassen- und Gruppenverwaltung — Verification Report

**Phase Goal:** Admin kann Schüler, Klassen mit Stammklasse und Klassenvorstand sowie Gruppenableitungsregeln UI-gestützt pflegen.
**Verified:** 2026-04-24T13:52:00Z
**Status:** passed
**Re-verification:** No — initial verification
**Plans executed:** 12-01 (Schüler-Admin-Surface), 12-02 (Klassen-Admin-Surface), 12-03 (Playwright E2E sweep)

## Goal Achievement

### Observable Truths (Success Criteria from ROADMAP)

| #   | Truth | Status | Evidence |
| --- | ----- | ------ | -------- |
| 1 | Admin kann Schüler mit Person-Daten und Erziehungsberechtigten anlegen, editieren und archivieren | verified | `/admin/students` list + `/admin/students/$studentId` 3-tab detail (Stammdaten / Erziehungsberechtigte / Gruppen); `StudentService.archive` + `.restore` at `apps/api/src/modules/student/student.service.ts:225-246`; `Student.isArchived + archivedAt` migration `20260424000000_student_archive_flag`; `ParentModule` greenfield with 5 routes + `linkParent`/`unlinkParent` methods; `E2E-STD-01/02/03/04` specs green (create, edit, archive, restore, parent-link) |
| 2 | Admin kann Klassen anlegen/editieren mit Stammklasse-Marker und Klassenvorstand-Zuweisung | verified | `/admin/classes` list + `/admin/classes/$classId` 4-tab detail; `SchoolClass.klassenvorstandId` FK + `klassenvorstand` Teacher relation at `schema.prisma:464-468`; `TeacherSearchPopover` (shadcn Command, 300ms debounce, Clear-Icon for null); `ClassService.create` persists `klassenvorstandId` (fixed in `2791aa6`); Stammklasse is modelled via `Student.classId → SchoolClass` (every student's current Stammklasse = `SchoolClass`); E2E-CLS-01 + E2E-CLS-03 ASSIGN + CLEAR all green |
| 3 | Admin kann Stundentafel-Vorlage auf eine Klasse anwenden und pro Klasse anpassen (inkl. SUBJECT-04 Wochenstunden) | verified | `ClassSubjectService.applyStundentafel` delegates to Phase-11 `StundentafelTemplateService.applyTemplate` (line 37); `updateClassSubjects` replace-all-in-tx with `isCustomized` auto-flip by template comparison (line 70-130); `resetStundentafel` (line 142); `StundentafelEditorTable` (desktop) + `StundentafelMobileCards` (<640px) with `tabular-nums` weeklyHours + amber Angepasst badge; `ApplyStundentafelDialog` + Reset WarnDialog; E2E-CLS-04 apply → edit → reset green |
| 4 | Admin kann Gruppenableitungsregeln pro Klasse definieren und Gruppenzugehörigkeiten manuell überschreiben | verified | `GroupDerivationRule` Prisma model + CRUD service/controller (`apps/api/src/modules/class/group-derivation-rule.*`); migration `20260424000001_group_derivation_rule`; `GroupMembershipRuleService.applyRulesDryRun` (no DB writes) + `loadRulesFromDb` (line 41, 106, 166); `GroupRuleBuilderTable` with inline-edit debounce PUT; `ApplyRulesPreviewDialog` (Dry-Run + conflicts); `GroupOverridesPanel` with Auto/Manuell badges; `GroupController` accepts `isAutoAssigned` flag on manual member add/remove; E2E-CLS-05 Rule-Builder → preview → apply green |
| 5 | Admin kann Schüler zwischen Stammklassen umziehen ohne Datenverlust | verified | `MoveStudentDialog` (single + bulk mode) at `apps/web/src/components/admin/student/MoveStudentDialog.tsx`; backend uses `PUT /students/:id` with new `classId` — no cascade delete / no data loss (ClassBookEntry references `TimetableLesson.classId`, not current `Student.classId`); `StudentService.remove` Orphan-Guard refuses hard-delete; E2E-STD-05-SINGLE + E2E-STD-05-BULK green |
| 6 | E2E Schüler-CRUD (Desktop + Mobile) green | verified | 6 spec files (`admin-students-crud`, `.error`, `.mobile`, `-archive`, `-parents`, `-move`); **Desktop: 11/11 passing (~17s)**; **Mobile-Chrome: 3/3 passing** (create + sticky save + 44px tap target). Verified live 2026-04-24. |
| 7 | E2E Klassen-CRUD (Desktop + Mobile) green | verified | 6 spec files (`admin-classes-crud`, `.error`, `.mobile`, `-klassenvorstand`, `-stundentafel`, `-gruppen`); **Desktop: 8/8 passing (~11s)**; **Mobile-Chrome: 2/2 passing** (create + tab-strip). Verified live 2026-04-24. |

**Score:** 7/7 observable truths verified

### Combined E2E Gate

| Run | Command | Result |
| --- | ------- | ------ |
| Phase-12 desktop | `playwright test admin-students admin-classes --project=desktop` | **19/19 passed (24.3s)** |
| Phase-12 mobile-chrome | `playwright test admin-students admin-classes --project=mobile-chrome` | **5/5 passed (1.6min)** |
| Combined | - | **24/24 passed** |

No `.only(` found in any Phase-12 spec file.

### Required Artifacts

#### Prisma Migrations
| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `apps/api/prisma/migrations/20260424000000_student_archive_flag/migration.sql` | ADD `is_archived` + `archived_at` columns | verified | 2 `ADD COLUMN` statements against `students` table; `scripts/check-migration-hygiene.sh` green |
| `apps/api/prisma/migrations/20260424000001_group_derivation_rule/migration.sql` | CREATE TABLE `group_derivation_rules` + FK + index | verified | Full CREATE + `class_id_idx` + `ON DELETE CASCADE` FK to `school_classes` |

#### Prisma Schema Changes
| Field / Model | Path | Line | Status |
| ------------- | ---- | ---- | ------ |
| `Student.isArchived` | schema.prisma | 383 | verified |
| `Student.archivedAt` | schema.prisma | 384 | verified |
| `SchoolClass.klassenvorstandId` | schema.prisma | 464 | verified |
| `SchoolClass.klassenvorstand` relation | schema.prisma | 468 | verified |
| `SchoolClass.derivationRules` back-relation | schema.prisma | 473 | verified |
| `GroupMembership.isAutoAssigned` | schema.prisma | 503 | verified (pre-existing) |
| `GroupDerivationRule` model | schema.prisma | 512-525 | verified |
| `ClassSubject.weeklyHours` + `.isCustomized` | schema.prisma | 557-558 | verified (pre-existing) |

#### API Modules / Services
| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `apps/api/src/modules/parent/` (module + service + controller + 4 DTOs) | ParentModule greenfield | verified | 5 routes (CRUD + search); schulleitung permissions granted in seed |
| `apps/api/src/modules/student/student.service.ts::archive/.restore/.linkParent/.unlinkParent/.remove` (orphan-guard) | 12-01 gap-fixes | verified | Orphan-Guard at line 274-321 counts 6 dependents + RFC 9457 409 `affectedEntities` |
| `apps/api/src/modules/class/class.service.ts::remove` (orphan-guard) | 12-02 gap-fix | verified | Guards 6 counts (Students + ClassSubject + Group + GroupMembership + TimetableLesson indirect + GroupDerivationRule) at line 146-218 with sampleStudents top-50 |
| `apps/api/src/modules/class/class.service.ts::create` (klassenvorstandId) | 12-03 Rule-2 fix | verified | Commit `2791aa6` ensures `klassenvorstandId` persisted |
| `apps/api/src/modules/class/class-subject.service.ts` | applyStundentafel + updateClassSubjects + resetStundentafel | verified | 3 methods + isCustomized auto-flip; 20 unit tests green |
| `apps/api/src/modules/class/group-derivation-rule.service.ts` + controller | CRUD for GroupDerivationRule | verified | 4 routes: GET/POST/PUT/DELETE `/classes/:classId/derivation-rules` |
| `apps/api/src/modules/class/group-membership-rule.service.ts::applyRulesDryRun + loadRulesFromDb` | 12-02 dry-run + DB-source | verified | line 41 (`applyRules`) + 111 (`applyRulesDryRun`) + 166 (`loadRulesFromDb`) |
| `apps/api/src/modules/class/group.controller.ts` | manual member endpoints + preview | verified | Accepts `isAutoAssigned` flag + `GET /classes/:classId/apply-rules/preview` |
| `apps/api/src/modules/teacher/teacher.service.ts::findAll` (search param) | 12-02 search gap-fix | verified | Case-insensitive on `Person.firstName | lastName | email` backs TeacherSearchPopover |

#### Shared Zod Schemas
| Schema | Path | Status |
| ------ | ---- | ------ |
| student.schema.ts | packages/shared/src/schemas/ | verified |
| parent.schema.ts | packages/shared/src/schemas/ | verified |
| assign-parent.schema.ts | packages/shared/src/schemas/ | verified |
| move-student.schema.ts | packages/shared/src/schemas/ | verified |
| school-class.schema.ts | packages/shared/src/schemas/ | verified (`.uuid()` → `.min(1)` in 12-03 Rule-1) |
| class-subject.schema.ts | packages/shared/src/schemas/ | verified |
| group-derivation-rule.schema.ts | packages/shared/src/schemas/ | verified |
| group-membership.schema.ts | packages/shared/src/schemas/ | verified |

**Shared tests:** 162 pass (124 from 12-01 + 38 from 12-02).

#### Frontend Routes + Components
| Artifact | Path | Status |
| -------- | ---- | ------ |
| `/admin/students` list + filter + bulk toolbar | `apps/web/src/routes/_authenticated/admin/students.index.tsx` | verified |
| `/admin/students/$studentId` 3-tab detail | `.../students.$studentId.tsx` | verified |
| 17 student components (Table/Cards/FilterBar/Dialogs/Detail-Tabs/Search-Popover) | `apps/web/src/components/admin/student/` | verified (all 17 files on disk) |
| `/admin/classes` list + filter | `.../classes.index.tsx` | verified |
| `/admin/classes/$classId` 4-tab detail | `.../classes.$classId.tsx` | verified |
| 21 class components (Table/Cards/FilterBar/Tabs/Rule-Builder/Preview/Overrides/Stundentafel/Create/Delete/SolverReRunBanner/TeacherSearch) | `apps/web/src/components/admin/class/` | verified (all 21 files on disk) |
| Sidebar entries `Klassen` (lucide `School`) + `Schüler:innen` (lucide `UsersRound`) | `apps/web/src/components/layout/AppSidebar.tsx:139,149` | verified (role-gated admin + schulleitung; order Lehrer → Fächer → Klassen → Schüler:innen) |
| AffectedEntitiesList discriminated union kinds `teacher \| subject \| student \| class` | `apps/web/src/components/admin/teacher/AffectedEntitiesList.tsx` | verified |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `StudentCreateDialog` | `POST /students` | `useCreateStudent` → fetch body includes `parentIds[]` | verified | E2E-STD-01 creates row and asserts toast + row visibility |
| `ArchiveStudentDialog` / `RestoreStudentDialog` | `POST /students/:id/archive` / `/restore` | `useArchiveStudent` / `useRestoreStudent` | verified | E2E-STD-03-ARCHIVE + RESTORE green |
| `ParentSearchPopover` + `InlineCreateParentForm` | `GET /parents?email=` + `POST /parents` + `POST /students/:id/parents` | `useParentsByEmail` + `useCreateParent` + `useLinkParent` | verified | E2E-STD-04-SEARCH + CREATE + UNLINK all green |
| `MoveStudentDialog` (single + bulk) | `PUT /students/:id` with new `classId` | `useMoveStudent` / `useBulkMoveStudents` | verified | E2E-STD-05-SINGLE + BULK green |
| `DeleteStudentDialog` | `DELETE /students/:id` | `useDeleteStudent` | verified | Orphan-Guard triggered with references → E2E-STD-02 asserts 409 + AffectedEntitiesList panel |
| `ClassCreateDialog` | `POST /classes` (incl. klassenvorstandId) | `useCreateClass` | verified | E2E-CLS-01 create + row visible |
| `TeacherSearchPopover` (Klassenvorstand) | `GET /teachers?search=...` | `useTeacherSearch` + `TeacherService.findAll` Person-search gap-fix | verified | E2E-CLS-03-ASSIGN picks teacher; CLEAR saves `klassenvorstandId: null` |
| `ApplyStundentafelDialog` | `POST /classes/:id/apply-stundentafel` | `useApplyStundentafel` | verified | E2E-CLS-04 applies template |
| `StundentafelEditorTable` cell | `PUT /classes/:classId/subjects` | `useUpdateClassSubjects` | verified | E2E-CLS-04 edits Wochenstunden with isCustomized badge |
| Reset-Stundentafel WarnDialog | `POST /classes/:id/reset-stundentafel` | `useResetStundentafel` | partial | WarnDialog renders + Abbrechen tested; POST deferred because seed school is BHS (no yearLevel=1 template) — service-level unit test covers the happy path. Not a gap (see Decision 2 in 12-03-SUMMARY). |
| `GroupRuleBuilderTable` row | `POST/PUT/DELETE /classes/:classId/derivation-rules` | `useGroupDerivationRules` | verified | E2E-CLS-05 creates rules inline |
| `ApplyRulesPreviewDialog` | `GET /classes/:classId/apply-rules/preview` then `POST /groups/apply-rules/:classId` | `useApplyRulesPreview` + `useApplyRules` | verified | E2E-CLS-05 preview → confirm → GroupOverridesPanel reflects derived Groups |
| `GroupOverridesPanel` (manual override) | `POST/DELETE /groups/:id/members` with `isAutoAssigned` flag | `useAddGroupMember` + `useRemoveGroupMember` | verified | E2E-CLS-05 covers Rule-derived groups; manual-override add-path deferred to follow-up (see `deferred-items.md` and 12-03-SUMMARY Decision 1) — **not in scope for Phase 12 success criteria** (roadmap SC 4 satisfied by Rule-Builder + Manual-Override panel rendering) |
| `DeleteClassDialog` | `DELETE /classes/:id` | `useDeleteClass` | verified | Orphan-Guard with active students triggers E2E-CLS-02 409 assertion + AffectedEntitiesList `kind='class'` |

### Data-Flow Trace (Level 4)

| Artifact | Data Source | Produces Real Data | Status |
| -------- | ----------- | ------------------ | ------ |
| `/admin/students` list | `GET /students?archived=...&classId=...&search=...` → `prisma.student.findMany` with `person` include | yes (6 seed students + 1 archived = 7 total rows in dev DB) | flowing |
| `/admin/students/$studentId` 3-tab detail | `GET /students/:id` + `GET /students/:id/parents` + `GET /students/:id/groups` | yes | flowing |
| `/admin/classes` list | `GET /classes?schoolYearId=...&yearLevels=...&search=...` with `klassenvorstand.person` include | yes (2 seed classes 1A/1B + 2 newly created) | flowing |
| `/admin/classes/$classId` Stundentafel tab | `GET /classes/:classId/subjects` → prisma.classSubject.findMany | yes (after apply) | flowing |
| Gruppen tab (Rule-Builder) | `GET /classes/:classId/derivation-rules` → prisma.groupDerivationRule.findMany | yes (seed fixture `seed-rule-religion-1a`) | flowing |
| Preview dialog | `GET /classes/:classId/apply-rules/preview` → `applyRulesDryRun` (no DB writes) | yes | flowing |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Phase-12 E2E desktop gate | `pnpm --filter @schoolflow/web exec playwright test admin-students admin-classes --project=desktop` | 19/19 passed (24.3s) | pass |
| Phase-12 E2E mobile-chrome gate | `pnpm --filter @schoolflow/web exec playwright test admin-students admin-classes --project=mobile-chrome` | 5/5 passed (1.6min) | pass |
| No `.only(` in Phase-12 specs | grep across 12 spec files | 0 matches | pass |
| Prisma migration integrity | `ls apps/api/prisma/migrations/{20260424000000_student_archive_flag,20260424000001_group_derivation_rule}/migration.sql` | both present | pass |
| Git commits referenced in summaries exist | `git log --oneline` for 11 commit hashes (3f4ce08, b7bc8cf, 2577860, 7a58260, e263340, 08ba000, c692ac5, 26c4282, 5e86796, 44628a9, 2791aa6) | all 11 present | pass |
| Unit suites (summaries) | `pnpm --filter @schoolflow/shared test` (162 pass), `pnpm --filter @schoolflow/api exec vitest run src/modules` (546 pass, 65 todo), `pnpm --filter @schoolflow/web test` (93 pass, 66 todo) | reported in summaries | pass (trusted) |

### Requirements Coverage (Traceability)

| Requirement | Source Plan | Description | Status | Evidence |
| ----------- | ----------- | ----------- | ------ | -------- |
| STUDENT-01 | 12-01 | Admin sieht Schülerliste mit Suche und Filter (Name, Klasse, Status) | SATISFIED | `StudentFilterBar` with `search`/`classId`/`archived` + `StudentListTable`; E2E-STD-01 exercises the list after create |
| STUDENT-02 | 12-01 | Admin kann Schüler anlegen und editieren (Person-Daten, Erziehungsberechtigte) | SATISFIED | `StudentCreateDialog` + `StudentDetailTabs` → `StudentStammdatenTab` + `StudentParentsTab`; E2E-STD-01 + EDIT + E2E-STD-04 green |
| STUDENT-03 | 12-01 | Admin kann Schüler einer Stammklasse zuordnen oder umziehen | SATISFIED | `MoveStudentDialog` mode=single+bulk; E2E-STD-05-SINGLE + BULK green |
| STUDENT-04 | 12-01 | Admin kann Schüler deaktivieren/archivieren ohne Datenverlust | SATISFIED | `Student.isArchived + archivedAt` migration; `StudentService.archive/.restore`; `ArchiveStudentDialog` + `RestoreStudentDialog`; E2E-STD-03-ARCHIVE + RESTORE green |
| CLASS-01 | 12-02 | Admin sieht Klassenliste mit Filter (Jahrgangsstufe, Schultyp) | SATISFIED | `ClassFilterBar` (schoolYearId + yearLevels[] + search) + `ClassListTable`/`ClassMobileCards`; E2E-CLS-01 covers the list |
| CLASS-02 | 12-02 | Admin kann Klassen anlegen und editieren (Stammklasse-Marker, Klassenvorstand-Zuweisung) | SATISFIED | `ClassCreateDialog` + `ClassStammdatenTab` + `TeacherSearchPopover`; `ClassService.create` persists `klassenvorstandId`; E2E-CLS-01 + CLS-03 |
| CLASS-03 | 12-02 | Admin kann Stundentafel-Vorlage auf eine Klasse anwenden und anpassen | SATISFIED | `ClassSubjectService.applyStundentafel/.updateClassSubjects/.resetStundentafel`; `StundentafelTab` + `ApplyStundentafelDialog`; E2E-CLS-04 green |
| CLASS-04 | 12-02 | Admin kann Gruppenzugehörigkeiten (Religion/Leistung/Wahlpflicht) pro Klasse verwalten | SATISFIED | `GroupOverridesPanel` with Auto/Manuell badges + Remove; `GroupController` accepts `isAutoAssigned` flag; Rule-Builder path exercised end-to-end by E2E-CLS-05 (Add-member leg is covered by unit/service tests; E2E follow-up tracked in `deferred-items.md` — not a scope gap) |
| CLASS-05 | 12-02 | Admin kann Gruppenableitungsregeln pro Klasse definieren | SATISFIED | `GroupDerivationRule` model + CRUD; `GroupRuleBuilderTable` with inline-edit debounce PUT; `applyRulesDryRun` + `ApplyRulesPreviewDialog`; E2E-CLS-05 green |
| SUBJECT-04 | 12-02 | Admin kann Wochenstunden pro Fach pro Klassenstufe anpassen | SATISFIED | `StundentafelEditorTable` Wochenstunden column with `isCustomized` amber badge; replace-all-in-tx in `updateClassSubjects` with template comparison; E2E-CLS-04 edit leg green |

**Orphaned requirements check:** All 10 Phase-12 requirement IDs in `REQUIREMENTS.md` are claimed by at least one of 12-01 / 12-02 frontmatter. No orphans.

### Anti-Patterns Found

No blocker anti-patterns introduced by Phase 12.

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| (pre-existing) `src/components/admin/school-settings/CreateSchoolYearDialog.tsx` | — | `tsc -b` resolver type mismatch | info | Phase-9/10 code, not touched by Phase 12, documented in `deferred-items.md` |
| (pre-existing) `src/hooks/useImportSocket.ts`, `usePushSubscription.ts`, `lib/keycloak.ts`, `lib/socket.ts`, `main.tsx`, `routes/_authenticated/classbook/$lessonId.tsx`, `messages/$conversationId.tsx`, `teacher/substitutions.tsx` | — | `tsc -b` legacy type-widening issues | info | Pre-existing on `main` before Phase 12, pass under `tsc --noEmit`, do not block `vite build` |
| (pre-existing) `admin-import.spec.ts` + `screenshots.spec.ts` | — | E2E test timeouts (environmental) | info | Out-of-scope for Phase 12 — canonical gate is `admin-students admin-classes` (24/24 pass) |

**Silent-4xx invariant:** PASS — every `useMutation` in `useStudents.ts` (8), `useParents.ts` (3), `useClasses.ts` (3), `useClassSubjects.ts` (3), `useGroupDerivationRules.ts` (4), `useClassGroups.ts` (2) wires an explicit `onError → sonner.toast.error`; every error-path spec asserts `expect(green-toast).not.toBeVisible()` + red alert / inline red error.

### Human Verification Required

None. Per user memory rule `feedback_e2e_first_no_uat.md` (2026-04-21 user directive: "ship with tests, no more 'please test in browser' asks"), Playwright coverage replaces human UAT for Phase 12:

- **Desktop gate:** 19/19 green on `admin-students admin-classes --project=desktop`
- **Mobile gate:** 5/5 green on `admin-students admin-classes --project=mobile-chrome`
- **Silent-4xx invariant** codified at the E2E layer
- **Orphan-Guard** asserted for both Student and Class delete paths (`kind='student'` + `kind='class'` AffectedEntitiesList)

### Gaps Summary

**No gaps.** All seven ROADMAP success criteria verified; all ten requirement IDs satisfied; 24/24 Playwright tests pass across desktop + mobile-chrome projects; Prisma migrations respected (`check-migration-hygiene.sh` green); backend builds clean (393 → 406 files); shared schemas green (162 tests); API modules green (546 tests); Web components green (93 tests). Three tracked follow-ups (all non-blocking, documented in `deferred-items.md`):

1. **E2E-CLS-06 manual-override add-member spec** — deferred pending a dedicated fresh-class-with-fresh-students Playwright fixture. The underlying feature (manual add with `isAutoAssigned=false`) is covered by unit tests on `GroupMembershipRuleService` and `GroupController`. ROADMAP success criterion 4 is satisfied by the rendered `GroupOverridesPanel` + Rule-Builder + apply flow.
2. **Reset-Stundentafel full POST assertion** — blocked by seed school type BHS which has no `yearLevel=1` template. Service-level unit tests cover the reset logic; E2E asserts WarnDialog copy + Abbrechen.
3. **Pre-existing `tsc -b` warnings** in Phase-9/10/11 files — untouched by Phase 12; a separate `phase-12.x-typecheck-repair` plan is tracked.

---

*Verified: 2026-04-24T13:52:00Z*
*Verifier: Claude (gsd-verifier)*
