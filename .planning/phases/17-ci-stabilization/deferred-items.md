# Phase 17 Deferred Items

Discovered during Phase 17 execution but out-of-scope for this phase. Each item is logged with file/line, the discovery context, and a recommended owner phase.

## Out-of-scope TS errors (discovered during 17-03 verification)

**File:** `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx`
**Lines affected:** 175, 192, 209, 224
**Discovered during:** 17-03 Task 1 TypeScript verification (`pnpm --filter @schoolflow/web exec tsc -p tsconfig.app.json --noEmit`)
**Symptom:** `error TS2345: Argument of type '{...; status: Q["status"]; ...}' is not assignable to parameter of type 'Partial<Q>'. Types of property 'status' are incompatible.`
**Reproducibility:** Errors present BEFORE Plan 17-03 changes (verified via `git stash` + re-run). Pre-existing.
**Why deferred:** Out of Plan 17-03 scope (touch-target lifts only — PageShell.tsx, tabs.tsx, radio-group.tsx). Touching the test file would expand the diff outside the plan's `files_modified` declaration.
**Recommended owner:** Phase 17-05 (Plan E — pre-existing regressions) or a future test-types harmonization task.

## Out-of-scope `md:` breakpoint usages in admin sub-surfaces (discovered during 17-04 verification)

**Files affected (7 occurrences across 6 files):**
- `apps/web/src/components/admin/teacher/TeacherDetailTabs.tsx:42` — `<div className="md:hidden mb-3">` (mobile tab-select dropdown wrapper)
- `apps/web/src/components/admin/teacher/VerfuegbarkeitsGrid.tsx:86` — `<div className="hidden md:block space-y-4">` (desktop availability grid)
- `apps/web/src/components/admin/teacher/VerfuegbarkeitsMobileList.tsx:72` — `<div className="md:hidden space-y-3">` (mobile availability list)
- `apps/web/src/components/admin/student/StudentDetailTabs.tsx:86` — `<div className="md:hidden mb-3">` (mobile tab-select dropdown wrapper)
- `apps/web/src/components/admin/subject/StundentafelVorlagenSection.tsx:91` — `<div className="hidden md:block overflow-x-auto">` (desktop Stundentafel-Vorlagen table)
- `apps/web/src/components/admin/subject/StundentafelVorlagenSection.tsx:140` — `<div className="md:hidden space-y-2">` (mobile Stundentafel-Vorlagen cards)
- `apps/web/src/components/admin/user/UserDetailTabs.tsx:87` — `<div className="md:hidden mb-3">` (mobile tab-select dropdown wrapper)

**Discovered during:** Plan 17-04 Task 3 verification grep (`grep -RIn 'md:hidden\|hidden md:block' apps/web/src/components/admin/{teacher,student,class,subject,user}/`) — the success criterion expected ZERO matches in those five directories.

**Why deferred:** Plan 17-04 scope (CONTEXT D-09 + PATTERNS.md File Classification) is the **5 admin list surfaces** — `TeacherListTable+TeacherMobileCards`, `StudentListTable+StudentMobileCards`, `ClassListTable+ClassMobileCards`, `SubjectTable+SubjectMobileCards`, `UserListTable+UserMobileCards`. The 7 remaining `md:` usages are in:
1. **Detail-page tab wrappers** (`*DetailTabs.tsx` × 4) — a separate primitive (tab-select-on-mobile vs Tabs-on-desktop) that pre-dates Plan 17-04's list-surface scope. Lifting these would require either a TabsList primitive lift or a separate dual-mode wrapper migration — both out of D-09's "5 list surfaces" scope.
2. **`VerfuegbarkeitsGrid` + `VerfuegbarkeitsMobileList`** — a separate dual-mode component pair that lives at the teacher detail level (`/admin/teachers/$id`), not the teacher list level (`/admin/teachers`). Distinct surface from `TeacherListTable`/`TeacherMobileCards`.
3. **`StundentafelVorlagenSection`** — a sub-section embedded inside `subjects.index.tsx` rendering Stundentafel-Vorlagen (not Subjects). Distinct dual-mode pair from `SubjectTable`/`SubjectMobileCards`.

All 5 list-surface migration files (the actual scope of Plan 17-04) **do** ship at zero `md:` usages — confirmed by grep on the 5 new `XList.tsx` files (Teacher/Student/Class/Subject/User) returning zero matches.

**Recommended owner:** A future "admin sub-surface DataList migration" plan, or absorb into Phase 17-05 (Plan E) backlog if it becomes a real CI blocker. Pattern is identical: `XGrid+XMobileList`/`XDetailTabs` pair → DataList collapse + sm: breakpoint. Not blocking Phase 17 because mobile-cascade failures are rooted in the LIST surfaces (per CONTEXT D-09 + PR #1 mobile-chrome run 25065085891).
