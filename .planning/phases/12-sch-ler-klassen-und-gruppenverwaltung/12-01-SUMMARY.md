---
phase: 12-sch-ler-klassen-und-gruppenverwaltung
plan: 01
subsystem: admin-ui
tags: [student, parent, admin, orphan-guard, archive, move, shared-zod, prisma-migration, shadcn, phase-12, d-01, d-02, d-03, d-04, d-05, d-13, d-16]

requires:
  - phase: 11-lehrer-und-f-cher-verwaltung
    provides: AffectedEntitiesList discriminated-union, PageShell, WarnDialog, UnsavedChangesDialog, StickyMobileSaveBar, AppSidebar Personal-&-Fächer-group, shared Zod schema pattern (teacher/subject)
provides:
  - ParentModule greenfield (/parents CRUD with email+name search, Orphan-Guard on delete)
  - StudentService.remove Orphan-Guard (RFC 9457 409 with extensions.affectedEntities)
  - Student.isArchived + archivedAt Prisma migration (20260424000000_student_archive_flag)
  - StudentService.archive / .restore / .linkParent / .unlinkParent
  - CreateStudentDto.parentIds[] transaction-linked on create
  - Shared Zod schemas (student / parent / assign-parent / move-student) in @schoolflow/shared
  - /admin/students list + /admin/students/$studentId 3-tab detail page
  - StudentCreateDialog + ArchiveStudentDialog + RestoreStudentDialog + DeleteStudentDialog + MoveStudentDialog (single + bulk)
  - ParentSearchPopover (shadcn Command + 300ms debounce + email autocomplete + inline-create 404 fallback)
  - AffectedEntitiesList.kind='student' discriminated-union extension
  - shadcn Command + Checkbox primitives (hand-authored via Phase 5 CLI-incompat pattern)
  - AppSidebar + MobileSidebar 'Schüler:innen' entry in 'Personal & Fächer' group
affects:
  - phase-12-02 (class + group admin — will append Klassen entry to same sidebar group, reuse AffectedEntitiesList + shadcn Command + Checkbox)
  - phase-12-03 (E2E sweep — Playwright specs against admin-students-* surfaces)

tech-stack:
  added:
    - cmdk (shadcn Command primitive backing)
    - "@radix-ui/react-checkbox"
  patterns:
    - "Hand-authored shadcn primitives (components.json-incompat workaround from Phase 5)"
    - "Discriminated-union kind= extension in AffectedEntitiesList (teacher | subject | student)"
    - "Sequential bulk-move via UI orchestration (no bulk endpoint on the backend, D-05)"
    - "Silent-4xx invariant enforced by every useMutation wiring explicit onError → sonner.toast.error"
    - "Orphan-Guard with RFC 9457 problem+json extensions.affectedEntities pattern"

key-files:
  created:
    - packages/shared/src/schemas/student.schema.ts
    - packages/shared/src/schemas/parent.schema.ts
    - packages/shared/src/schemas/assign-parent.schema.ts
    - packages/shared/src/schemas/move-student.schema.ts
    - apps/api/prisma/migrations/20260424000000_student_archive_flag/migration.sql
    - apps/api/src/modules/parent/parent.module.ts
    - apps/api/src/modules/parent/parent.service.ts
    - apps/api/src/modules/parent/parent.controller.ts
    - apps/api/src/modules/parent/dto/create-parent.dto.ts
    - apps/api/src/modules/parent/dto/update-parent.dto.ts
    - apps/api/src/modules/parent/dto/parent-list-query.dto.ts
    - apps/api/src/modules/parent/dto/parent-response.dto.ts
    - apps/api/src/modules/student/dto/student-list-query.dto.ts
    - apps/api/src/modules/student/dto/assign-parent.dto.ts
    - apps/web/src/hooks/useStudents.ts
    - apps/web/src/hooks/useParents.ts
    - apps/web/src/routes/_authenticated/admin/students.index.tsx
    - apps/web/src/routes/_authenticated/admin/students.$studentId.tsx
    - apps/web/src/components/admin/student/StudentListTable.tsx
    - apps/web/src/components/admin/student/StudentMobileCards.tsx
    - apps/web/src/components/admin/student/StudentFilterBar.tsx
    - apps/web/src/components/admin/student/StudentCreateDialog.tsx
    - apps/web/src/components/admin/student/StudentDetailTabs.tsx
    - apps/web/src/components/admin/student/StudentStammdatenTab.tsx
    - apps/web/src/components/admin/student/StudentParentsTab.tsx
    - apps/web/src/components/admin/student/StudentGroupsTab.tsx
    - apps/web/src/components/admin/student/ArchiveStudentDialog.tsx
    - apps/web/src/components/admin/student/RestoreStudentDialog.tsx
    - apps/web/src/components/admin/student/DeleteStudentDialog.tsx
    - apps/web/src/components/admin/student/MoveStudentDialog.tsx
    - apps/web/src/components/admin/student/ParentSearchPopover.tsx
    - apps/web/src/components/admin/student/InlineCreateParentForm.tsx
    - apps/web/src/components/ui/command.tsx
    - apps/web/src/components/ui/checkbox.tsx
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/prisma/seed.ts
    - apps/api/src/modules/student/student.service.ts
    - apps/api/src/modules/student/student.controller.ts
    - apps/api/src/modules/student/student.service.spec.ts
    - apps/api/src/modules/student/dto/create-student.dto.ts
    - apps/api/src/app.module.ts
    - apps/web/src/components/admin/teacher/AffectedEntitiesList.tsx
    - apps/web/src/components/layout/AppSidebar.tsx
    - apps/web/src/components/layout/MobileSidebar.tsx
    - packages/shared/src/index.ts

key-decisions:
  - "shadcn CLI is incompatible with the current apps/web/components.json — hand-authored Command + Checkbox primitives following the Phase 5 precedent; installed cmdk + @radix-ui/react-checkbox via pnpm"
  - "StudentService.findAll accepts both legacy (string schoolId, pagination) and new StudentListQueryDto signatures for backward compat with existing internal callers (e.g., class module)"
  - "Bulk move orchestrated UI-side (sequential PUT per row) rather than adding a new backend endpoint — matches D-05 decision and keeps API surface minimal"
  - "StudentStammdatenTab uses plain React state (no RHF/zodResolver) to match Phase 11 StammdatenTab precedent; validation logic mirrors the existing teacher tab"
  - "Dirty-state lifted to parent (StudentDetailTabs) via onDirtyChange callback so Zustand slice is not strictly required for Phase 12-01; tab-switch guard still honoured via UnsavedChangesDialog"

patterns-established:
  - "Sub-entity modules (parent) follow the same structure as teacher/subject: controller + service + module + DTOs + service spec under apps/api/src/modules/<name>/"
  - "Orphan-Guard: $transaction([...]) array of counts + total > 0 → RFC 9457 ConflictException with extensions.affectedEntities"
  - "AffectedEntitiesList kind= discriminated union to add new entity types without breaking Phase 11 callers"
  - "ParentSearchPopover: shadcn Command + 300ms debounce + min 3 chars + inline-create fallback on CommandEmpty"

requirements-completed: [STUDENT-01, STUDENT-02, STUDENT-03, STUDENT-04]

duration: 28min
completed: 2026-04-24
---

# Phase 12 Plan 01: Schüler-Admin-Surface + ParentModule + Orphan-Guard Summary

**End-to-end Schüler:innen admin (list + detail + archive + move + parent-link) with ParentModule greenfield, StudentService Orphan-Guard gap-fix, and Student.isArchived Prisma migration shipped in a single coherent slice.**

## Performance

- **Duration:** 28 min
- **Started:** 2026-04-24T09:39:08Z
- **Completed:** 2026-04-24T10:07:45Z (approx)
- **Tasks:** 3
- **Files created:** 35
- **Files modified:** 12
- **Commits:** 3 task commits + (final metadata commit)

## Accomplishments

- **STUDENT-01..04 end-to-end:** /admin/students list with filter bar + dense table / mobile cards + bulk-select + floating toolbar; /admin/students/$studentId detail with 3 tabs (Stammdaten | Erziehungsberechtigte | Gruppen) + row-action menu; empty-state CTA; Zod-validated search-params route.
- **Backend gap-fixes (D-13):**
  - `ParentModule` greenfield with 5 routes (CRUD + Orphan-Guard 409) — previously no public Parent HTTP surface existed.
  - `StudentService.remove` Orphan-Guard counts AttendanceRecord + GradeEntry + StudentNote + AbsenceExcuse + GroupMembership + ParentStudent; refuses delete with RFC 9457 `409 Conflict` carrying `extensions.affectedEntities` payload. Pre-12-01 the delete silently zombified 4 denormalized studentId FK columns.
  - `StudentService.archive` / `.restore` / `.linkParent` / `.unlinkParent` added; `create` extended to accept `parentIds[]` and link inside the same Prisma transaction.
- **Student.isArchived + archivedAt Prisma migration:** `20260424000000_student_archive_flag/migration.sql` committed via `prisma migrate dev --create-only` then rename — CLAUDE.md hard rule honoured, `scripts/check-migration-hygiene.sh` green.
- **Shared foundation:** 4 Zod schemas (student / parent / assign-parent / move-student) with deutsche error messages + englische API field names; re-exported from `@schoolflow/shared` and ready for Plan 12-02/03 reuse.
- **shadcn Command + Checkbox** primitives hand-authored (Phase 5 CLI-incompat pattern); `cmdk` + `@radix-ui/react-checkbox` installed.
- **AffectedEntitiesList** discriminated-union extended with `kind='student'` — Phase 11 `kind='teacher'` (default) and `kind='subject'` preserved byte-for-byte.
- **Sidebar:** `Schüler:innen` entry with `UsersRound` icon appended to `Personal & Fächer` group on both AppSidebar + MobileSidebar, role-gated `['admin', 'schulleitung']`.
- **Silent-4xx invariant:** every `useMutation` in `useStudents.ts` (8 mutations) and `useParents.ts` (3 mutations) wires explicit `onError` → `sonner.toast.error`.

## Task Commits

1. **Task 1: Wave 0 foundation** — `3f4ce08` (feat) — shared Zod schemas + 124 schema tests + Prisma migration + shadcn primitives + AffectedEntitiesList kind='student' + Wave 0 TDD stubs
2. **Task 2: Backend gap-fixes** — `b7bc8cf` (feat) — ParentModule greenfield + StudentService Orphan-Guard / archive / restore / linkParent / unlinkParent + CreateStudentDto.parentIds + StudentController new endpoints; 34 API tests green; API boots clean
3. **Task 3: Frontend admin surface** — `2577860` (feat) — useStudents / useParents hooks + /admin/students routes + 13 student/parent components + dialogs + sidebar entries; 16 web component tests green

## Verification Results

| Check | Result |
|-------|--------|
| `pnpm --filter @schoolflow/shared test` | 124 tests pass |
| `pnpm exec vitest run apps/api/src/modules/student apps/api/src/modules/parent` | 34 tests pass |
| `pnpm exec vitest run apps/web/src/components/admin/student` | 16 tests pass |
| `pnpm --filter @schoolflow/shared build` | clean |
| `pnpm --filter @schoolflow/api build` | clean (393 files) |
| `pnpm --filter @schoolflow/api exec prisma validate` | valid |
| `bash scripts/check-migration-hygiene.sh` | `schema changed, 5 new migration(s) -- OK` |
| `pnpm exec nest start` (API boot) | `Nest application successfully started` in ~9ms |
| Silent-4xx invariant (`useMutation` ≤ `onError`) | PASS (9/9 useStudents, 4/3 useParents — extra is import line, actual mutations 3/3) |

## Decisions Made

- **shadcn CLI bypass:** The shadcn@4 and earlier CLIs cannot parse the current `apps/web/components.json`. Following the Phase 5 Popover precedent I hand-authored Command + Checkbox primitives using the shadcn canonical source and installed `cmdk` + `@radix-ui/react-checkbox` via pnpm. Documented in component doc-comments.
- **StudentService.findAll legacy signature preserved:** The existing internal caller (class module via `findByClass`) passes `(schoolId: string, pagination)`. I kept the overload by letting `findAll` accept either a `StudentListQueryDto` or the legacy `(string, pagination)` pair and normalising internally. No existing callers broke.
- **Silent-4xx invariant via grep count:** 9 `useMutation` vs 9 `onError` in `useStudents.ts` (one counts the import statement). In `useParents.ts` the same pattern holds (3 real mutations + 1 import = 4 useMutation occurrences vs 3 onError hooks). Every mutation has an `onError` handler.
- **Bulk-move progress via hook callback:** Instead of lifting a `useState<progress>` to the dialog, the `useBulkMoveStudents` mutation accepts an `onProgress` callback in `mutationFn` args. The dialog passes a setter; simpler than inventing an extra hook or store slice.
- **StudentStammdatenTab uses plain state (not RHF):** The existing Phase 11 `StammdatenTab` for teachers uses plain `useState` + manual validation. We matched that precedent to keep the diff small and consistent; zodResolver migration can happen as a cross-cutting refactor later.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] shadcn CLI refused to parse components.json**

- **Found during:** Task 1 (shadcn `add command checkbox`)
- **Issue:** `npx shadcn@latest add command checkbox` and older versions (2.3, 2.7) all exit with `Invalid configuration found in .../components.json` — the CLI cannot parse the current schema format.
- **Fix:** Hand-authored `apps/web/src/components/ui/command.tsx` and `apps/web/src/components/ui/checkbox.tsx` using the shadcn canonical source code, with clear doc-comments pointing to the Phase 5 precedent. Installed `cmdk` + `@radix-ui/react-checkbox` via `pnpm add`.
- **Files modified:** apps/web/src/components/ui/command.tsx (created), apps/web/src/components/ui/checkbox.tsx (created), apps/web/package.json (deps added).
- **Verification:** Primitives import cleanly in ParentSearchPopover and StudentListTable; tests green.
- **Committed in:** `3f4ce08` (Task 1 commit)

**2. [Rule 1 - Bug] Zod 4 `required_error` → `error` migration**

- **Found during:** Task 1 (move-student.schema.spec.ts first run)
- **Issue:** The plan snippet used Zod 3's `z.string({ required_error: '...' })` syntax; this project runs Zod 4 which renamed the option to `error`. Tests failed because the required-field message wasn't surfaced.
- **Fix:** Changed to `z.string({ error: '...' }).uuid(...)`.
- **Files modified:** packages/shared/src/schemas/move-student.schema.ts
- **Verification:** 124 shared schema tests green.
- **Committed in:** `3f4ce08` (Task 1 commit)

**3. [Rule 2 - Missing Critical] Added `parent` permissions to seed.ts**

- **Found during:** Task 2 (registering ParentModule)
- **Issue:** Plan specified `@CheckPermissions({ subject: 'parent' })` on all ParentController routes. Without an explicit `parent` permission seed, the Schulleitung role would be denied by CASL (admin's `manage:all` still grants). Non-admin users would see 403 when trying to search parents via the ParentSearchPopover.
- **Fix:** Added `{ action: 'create'|'read'|'update'|'delete', subject: 'parent' }` to the `schulleitungPermissions` array right after the `student` block.
- **Files modified:** apps/api/prisma/seed.ts
- **Verification:** Seed runs green; schulleitung role can now hit /parents endpoints.
- **Committed in:** `b7bc8cf` (Task 2 commit)

**4. [Rule 3 - Blocking] Shared dist `.js` extension post-process after rebuild**

- **Found during:** Task 2 (API boot verification)
- **Issue:** `pnpm --filter @schoolflow/shared build` emits extensionless relative imports (e.g., `export * from './constants/roles'`). Node 25.8.2's ESM resolver refuses these and the API crashes on boot with `ERR_MODULE_NOT_FOUND`. Per `feedback_restart_api_after_migration.md` memory, a `perl -i -pe` post-process appends `.js` to every relative specifier.
- **Fix:** Ran the documented `find . -name "*.js" -exec perl -i -pe "..." {} +` post-process in `packages/shared/dist`.
- **Files modified:** none (transient dist rewrite).
- **Verification:** API boots with `Nest application successfully started` within ~9ms.
- **Not committed:** dist artefacts are generated, not tracked.

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 bug, 1 missing critical). No Rule 4 (architectural) escalations.

**Impact on plan:** All deviations were necessary for correctness/bootability. Scope unchanged.

## Issues Encountered

- **Pre-existing `tsc -b` failures in apps/web** (Phase 9/10 code) — Documented in `.planning/phases/12-sch-ler-klassen-und-gruppenverwaltung/deferred-items.md`. My changes compile cleanly with `tsc --noEmit`; the project-references incremental build surfaces legacy type-widening issues in files Plan 12-01 does not touch. Out of scope per the execution framework's Scope Boundary rule.
- **Vitest `test --` argument forwarding:** `pnpm --filter @schoolflow/api test -- student.service` runs the _entire_ suite because the recipe is `vitest run`. Had to invoke `pnpm exec vitest run <path>` directly to filter. Minor ergonomic friction, no action needed.

## User Setup Required

None — no external service configuration. The Prisma migration has already been applied to the local dev DB; on fresh clones a single `pnpm --filter @schoolflow/api exec prisma migrate deploy` brings the DB in sync.

## Hand-off for Plan 12-02

- **AffectedEntitiesList kinds remaining to add:** `class` (Plan 12-02 ClassService.remove Orphan-Guard), `group`, `class-subject`, `group-membership`, `derivation-rule`, `parent-student` (deferred to follow-up plans).
- **Sidebar 'Personal & Fächer' group:** Plan 12-01 added `Schüler:innen`. Plan 12-02 should append `Klassen` (icon suggestion: `Users` or `School` from lucide-react). Order target: `Lehrer → Fächer → Schüler:innen → Klassen`.
- **shadcn Command + Checkbox primitives** live at `apps/web/src/components/ui/{command,checkbox}.tsx` — reuse them for the class-group picker in Plan 12-02 without re-installing.
- **StudentService patterns reusable by class-side:** `.linkParent` / `.unlinkParent` (upsert + deleteMany) translates directly to `Class.linkGroup` / `.unlinkGroup`. Orphan-Guard $transaction pattern is ready to extend.
- **Shared Zod foundation:** `StudentListFiltersSchema` is the template for `ClassListFiltersSchema`; `MoveStudentSchema` shape can power `MoveClassSchema` for future class-move flows.

## Next Phase Readiness

- Plan 12-02 can start immediately — all foundations in place.
- Plan 12-03 (E2E sweep) requires both 12-01 + 12-02 merged. Current state ships /admin/students functional against the dev API; Playwright specs can author-against-fixture-student `seed-student-7` (archived) + the 6 active fixture students.

## Threat Flags

None introduced. Parent HTTP surface is behind CASL `@CheckPermissions` with schulleitung permissions explicitly granted; Orphan-Guard prevents zombie cross-references at trust boundary.

---

## Self-Check: PASSED

All 3 task commits exist in `git log` (3f4ce08, b7bc8cf, 2577860). All 15 spot-checked key files exist on disk. Verified 2026-04-24.

---

*Phase: 12-sch-ler-klassen-und-gruppenverwaltung*
*Completed: 2026-04-24*
