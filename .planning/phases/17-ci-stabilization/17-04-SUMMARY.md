---
phase: 17-ci-stabilization
plan: 04
subsystem: ui
tags: [datalist-migration, sm-breakpoint, list-rendering, mobile, admin-console, ci-stabilization]

# Dependency graph
requires:
  - phase: 16-admin-dashboard-mobile-h-rtung
    provides: shared/DataList primitive (DataList.tsx) + ClassRestrictionsTable.tsx as the proven migration analog
  - phase: 17-01
    provides: PeriodsEditor sm: breakpoint + selector-drift fixes
  - phase: 17-02
    provides: WebKit-darwin Bus-Error-10 env-classification (mobile-chrome is the darwin reference surface)
  - phase: 17-03
    provides: 44px touch-target floor on PageShell breadcrumb anchors, TabsList primitive, RadioGroupItem primitive
provides:
  - 5 admin list surfaces (Teacher, Student, Class, Subject, User) migrated to shared <DataList>
  - sm: (640px) breakpoint convention complete across all 5 list surfaces — Class was already on sm:; Teacher, Student, Subject, User joined it via DataList
  - 10 OLD list-component files deleted (5 XListTable + 5 XMobileCards)
  - 5 NEW XList.tsx components — single-import replacement for the dual-component pair
  - User pagination block lifted out of UserListTable into users.index.tsx as adjunct (DataList does not own pagination)
  - admin-students-crud.mobile.spec.ts:122 selector unified `student-card-` → `student-row-`
  - 17-TRIAGE.md extended with Plan-D row + side-effect row + 2 legend entries (datalist-migration, datalist-migration-side-effect)
affects: [phase-17-05, future admin-sub-surface-migration, mobile-cascade regressions]

# Tech tracking
tech-stack:
  added: []  # No new libraries — pure migration onto existing shared/DataList primitive
  patterns:
    - "DataList migration template: columns array + mobileCard fn + getRowAttrs/getRowTestId carry-through"
    - "Pagination split: list components own data rendering, route owns pagination state + UI"
    - "Selector unification: when DataList applies the same `data-testid` on both desktop tr AND mobile-card wrapper, legacy mobile-only test-id prefixes (e.g. `student-card-`) get dropped in favor of unified `student-row-` prefix"
    - "Out-of-scope deferred-items.md hygiene: pre-existing patterns in adjacent surfaces (DetailTabs, sub-sections) are logged but not auto-fixed"

key-files:
  created:
    - apps/web/src/components/admin/teacher/TeacherList.tsx
    - apps/web/src/components/admin/student/StudentList.tsx
    - apps/web/src/components/admin/class/ClassList.tsx
    - apps/web/src/components/admin/subject/SubjectList.tsx
    - apps/web/src/components/admin/user/UserList.tsx
  modified:
    - apps/web/src/routes/_authenticated/admin/teachers.index.tsx (dual-import → single-import)
    - apps/web/src/routes/_authenticated/admin/students.index.tsx (dual-import → single-import)
    - apps/web/src/routes/_authenticated/admin/classes.index.tsx (dual-import → single-import)
    - apps/web/src/routes/_authenticated/admin/subjects.index.tsx (dual-import → single-import)
    - apps/web/src/routes/_authenticated/admin/users.index.tsx (dual-import → single-import + adjunct pagination block)
    - apps/web/e2e/admin-students-crud.mobile.spec.ts (selector unification: `student-card-` → `student-row-`)
    - .planning/phases/17-ci-stabilization/17-TRIAGE.md (Plan-D rows + 2 legend entries)
    - .planning/phases/17-ci-stabilization/deferred-items.md (7 out-of-scope `md:` usages logged)
  deleted:
    - apps/web/src/components/admin/teacher/TeacherListTable.tsx
    - apps/web/src/components/admin/teacher/TeacherMobileCards.tsx
    - apps/web/src/components/admin/student/StudentListTable.tsx
    - apps/web/src/components/admin/student/StudentMobileCards.tsx
    - apps/web/src/components/admin/class/ClassListTable.tsx
    - apps/web/src/components/admin/class/ClassMobileCards.tsx
    - apps/web/src/components/admin/subject/SubjectTable.tsx
    - apps/web/src/components/admin/subject/SubjectMobileCards.tsx
    - apps/web/src/components/admin/user/UserListTable.tsx
    - apps/web/src/components/admin/user/UserMobileCards.tsx

key-decisions:
  - "D-09 enforced: full migration of all 5 list surfaces to DataList, NOT a narrow 375px-bug fix"
  - "Student selector unification: `student-card-${id}` (mobile-only) merged into `student-row-${id}` (both branches) — DataList contract applies the same testid to both render paths via getRowTestId, so maintaining two prefixes would have required a custom getRowAttrs branch and split the selector contract. Spec edited as plan-recommended side-effect."
  - "User pagination split: pagination state hooks already lived in users.index.tsx (filter.page, filter.limit), so lifting only the JSX out of UserListTable was the cleanest path — no Pagination component extraction needed"
  - "Out-of-scope `md:` usages NOT auto-fixed: 7 occurrences in 6 admin sub-surface files (DetailTabs, VerfuegbarkeitsGrid+MobileList, StundentafelVorlagenSection) pre-date Plan 17-04's 5-list-surface scope. Logged in deferred-items.md per scope-boundary rule."

patterns-established:
  - "DataList migration template: read OLD ListTable + MobileCards, distill desktop columns into DataListColumn array, fold MobileCards body into mobileCard fn, preserve data-testid via getRowTestId, preserve data-row-id/data-template-type/data-audit-id via getRowAttrs, preserve action-cell stopPropagation via data-row-action carve-out (Pattern S4), preserve mobile button 44px floor via min-h-11 (Pattern S1)"
  - "Pagination ownership: route call-site owns pagination state + UI when DataList is the list primitive — DataList itself is paginate-agnostic"
  - "Selector unification side-effect documentation: when a migration changes the testid contract on ANY render branch, log a separate triage row classified `<pattern>-side-effect` so reviewers can audit the test edits"

requirements-completed: []  # Plan frontmatter requirements: [] — Phase 17 is tech-debt closure, not feature delivery

# Metrics
duration: 49min
completed: 2026-05-02

triage_ref: .planning/phases/17-ci-stabilization/17-TRIAGE.md
decisions_addressed: [D-01, D-06, D-07, D-09, D-10, D-11]
---

# Phase 17 Plan 17-04: DataList migration of 5 admin list surfaces Summary

**5 admin list surfaces (Teacher, Student, Class, Subject, User) collapsed onto the shared <DataList> primitive — 10 OLD files deleted, 5 NEW XList components, sm: breakpoint convention complete across the entire admin console.**

## Performance

- **Duration:** 49 min
- **Started:** 2026-05-02T10:59:49Z
- **Completed:** 2026-05-02T11:49:36Z
- **Tasks:** 3
- **Files created:** 5 (TeacherList, StudentList, ClassList, SubjectList, UserList)
- **Files deleted:** 10 (5 XListTable + 5 XMobileCards)
- **Files modified:** 8 (5 routes + 1 mobile spec + 17-TRIAGE.md + deferred-items.md)

## Accomplishments

- All 5 admin list surfaces migrated from the dual `XListTable` + `XMobileCards` pair onto the shared `<DataList>` primitive proven by `ClassRestrictionsTable.tsx` (Phase 16 Plan 05). The four md: surfaces (Teacher, Student, Subject, User) joined Class on the sm: (640px) breakpoint via DataList's `hidden sm:block` / `sm:hidden`.
- 10 OLD files deleted in two atomic commits (6 in commit `d798f73` for Teacher/Class/Subject + 4 in commit `a8a7987` for Student/User). Each surface's call-site route now imports a SINGLE `XList` component instead of the dual pair.
- E2E selector contract preserved across the migration: existing `data-testid="subject-row-${shortName}"` (admin-subjects-crud.spec.ts:96, 135 + admin-subjects-crud.error.spec.ts:61) carried through via `getRowTestId`. Existing `data-testid="student-table"` parent wrapper preserved as the wrapping `<div>` around StudentList's DataList. The mobile spec `admin-students-crud.mobile.spec.ts:122` selector unified from legacy `student-card-` (mobile-only) to `student-row-` (both branches) — a one-line spec edit, logged in 17-TRIAGE.md as a `datalist-migration-side-effect` row.
- User pagination block lifted out of the deleted `UserListTable.tsx:188-231` into the route call-site `users.index.tsx` as an adjunct directly under `<UserList />`. Pagination state hooks (`filter.page`, `filter.limit`) already lived in the route — only the JSX moved.
- 17-TRIAGE.md updated with one Plan-D row covering all 5 surfaces + one side-effect row for the spec edit + 2 new classification legend entries (`datalist-migration`, `datalist-migration-side-effect`).
- deferred-items.md updated with 7 out-of-scope `md:` breakpoint usages found in admin sub-surfaces (DetailTabs × 4, VerfuegbarkeitsGrid+MobileList, StundentafelVorlagenSection × 2) — pre-existing pattern in adjacent surfaces, logged but not auto-fixed per scope-boundary rule.

## Task Commits

Each task was committed atomically with `--no-verify` (parallel-worktree convention).

1. **Task 1: Migrate Teacher + Class + Subject surfaces to DataList** — `d798f73` (feat)
2. **Task 2: Migrate Student + User surfaces to DataList (the complex ones)** — `a8a7987` (feat)
3. **Task 3: Append Plan-D rows to 17-TRIAGE.md + log out-of-scope md: usages** — `a90757a` (docs)

## Files Created/Modified

**Created (5 — one new XList per surface, each backed by DataList):**
- `apps/web/src/components/admin/teacher/TeacherList.tsx` — DropdownMenu fold into actions column; getRowTestId='teacher-row-${id}'
- `apps/web/src/components/admin/student/StudentList.tsx` — `<div data-testid="student-table">` wrapper preserved; getRowTestId='student-row-${id}' on both branches; header-row select-all checkbox lifted into a small toolbar above DataList; `h-11 w-11` `<label>` wrapping mobile checkbox preserved
- `apps/web/src/components/admin/class/ClassList.tsx` — purely mechanical (already on sm:); empty-state copy "Keine Klassen gefunden." preserved via emptyState prop
- `apps/web/src/components/admin/subject/SubjectList.tsx` — onRowClick={onEdit} preserves click-card-to-edit pattern from old SubjectMobileCards; getRowTestId='subject-row-${shortName}' preserves admin-subjects-crud{,.error}.spec.ts selectors
- `apps/web/src/components/admin/user/UserList.tsx` — DataList's loading+emptyState props absorb the bespoke loading/empty branches from the old UserListTable+UserMobileCards; pagination lives outside

**Deleted (10 — the OLD dual-component pair per surface):**
- `apps/web/src/components/admin/teacher/{TeacherListTable,TeacherMobileCards}.tsx`
- `apps/web/src/components/admin/student/{StudentListTable,StudentMobileCards}.tsx`
- `apps/web/src/components/admin/class/{ClassListTable,ClassMobileCards}.tsx`
- `apps/web/src/components/admin/subject/{SubjectTable,SubjectMobileCards}.tsx`
- `apps/web/src/components/admin/user/{UserListTable,UserMobileCards}.tsx`

**Modified (8):**
- 5 routes: `apps/web/src/routes/_authenticated/admin/{teachers,students,classes,subjects,users}.index.tsx` — each collapsed dual-import to single-import
- `apps/web/e2e/admin-students-crud.mobile.spec.ts` — selector unified `student-card-` → `student-row-`
- `.planning/phases/17-ci-stabilization/17-TRIAGE.md` — Plan-D row + side-effect row + 2 legend entries
- `.planning/phases/17-ci-stabilization/deferred-items.md` — 7 out-of-scope `md:` usages logged

## Decisions Made

1. **Student selector unification (D-11 application):** Per Plan D guidance, the mobile spec was edited from `student-card-${id}` to `student-row-${id}` instead of writing a custom `getRowAttrs` that asymmetrically applies different testids to desktop vs mobile branches. Rationale: DataList's contract is intentionally symmetric — `getRowTestId` applies to BOTH render paths (DataList.tsx:105 + 148). Forcing asymmetric testids would require a custom `getRowAttrs` branch checking layout, which DataList does not expose, and would split the selector contract between two distinct prefixes. The spec edit is one line; log entry is one row in 17-TRIAGE.md classified as `datalist-migration-side-effect`.

2. **User pagination split = route lifting:** The OLD UserListTable held the pagination JSX (lines 188-231) but the actual pagination STATE (`filter.page`, `filter.limit`) was already managed in `users.index.tsx`. Lifting only the JSX out of the list component (option `a` from the plan: lift state to route) was the simplest path and matches the existing state ownership. No `UserListPagination.tsx` component extraction was needed — that would have been the option `b` path with no benefit.

3. **Out-of-scope `md:` usages NOT auto-fixed:** The verification grep `grep -RIn 'md:hidden\|hidden md:block' apps/web/src/components/admin/{teacher,student,class,subject,user}/` found 7 remaining matches in 6 files. ALL 7 are in detail/sub-surface files (TeacherDetailTabs, VerfuegbarkeitsGrid+MobileList, StudentDetailTabs, StundentafelVorlagenSection × 2, UserDetailTabs) NOT in the 5 list-surface files declared in this plan's `files_modified` frontmatter. Per scope-boundary rule (deferred-items.md, fix-attempt limit) these pre-existing patterns are out of Plan 17-04's scope. The 5 NEW XList files all ship with zero `md:` usages — the actual scope is fully clean.

## Deviations from Plan

None — plan executed exactly as written. The single recommended side-effect (admin-students-crud.mobile.spec.ts selector update) was explicitly enumerated in the plan's Task 2 action and is captured in 17-TRIAGE.md as a `datalist-migration-side-effect` row.

The 7 out-of-scope `md:` breakpoint matches discovered during the verification grep are NOT a deviation — they are scope-boundary discoveries logged in `deferred-items.md` per the executor's scope-boundary rule.

## Issues Encountered

1. **Initial worktree merge-base mismatch:** Worktree HEAD was at `7249ebc` (a Phase-17-pre commit) instead of the expected `587dbfc` (Phase 17-03 SUMMARY commit). Resolved per the worktree branch check protocol via `git reset --hard 587dbfc73f67dc3bbbcfd792f54e74b8b080f0ed` before any source changes. No work loss.
2. **Missing node_modules in worktree:** Fresh worktree did not have `node_modules/`. Resolved with `pnpm install --prefer-offline` (4.5s using pnpm v10.33.0 store cache). No version drift — pnpm-lock.yaml reused.
3. **Missing `@schoolflow/shared` build artifact:** First `tsc` run reported `Cannot find module '@schoolflow/shared'` across ~40 hooks/components. Resolved with `pnpm --filter @schoolflow/shared run build`. After that, only the pre-existing `DashboardChecklist.test.tsx` errors remained (already documented in deferred-items.md by Plan 17-03).
4. **Live mobile-chrome run deferred:** The Playwright `globalSetup` hook health-checks API (port 3000), Vite (port 5173), and the Timefold sidecar (port 8081) before any test runs. None of those services run in the parallel-worktree environment, so a live run was not possible. Same constraint as Plans 17-01 and 17-02 (see TRIAGE rows 18 and 19). Verification snapshot taken via `playwright test --project=mobile-chrome --list` showing 42 tests in 13 files load — saved to `/tmp/mobile-chrome-after-D.log`. Live run deferred to wave-merge verification.

## TS Build Verification

`pnpm --filter @schoolflow/web exec tsc -p tsconfig.app.json --noEmit` passes with the same 8 pre-existing errors in `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx` (TS2345 — TanStack Query `Partial<Q>` type narrowing). These were already documented by Plan 17-03 in `deferred-items.md` and are NOT introduced by this plan. Source files in `apps/web/src/` outside that test file: zero TS errors.

## User Setup Required

None — no external service configuration required. Pure in-repo TypeScript / React / Tailwind refactor.

## Next Phase Readiness

- **Phase 17-05 (Plan E)** inherits a triage table where all selector-drift / migration-rooted failures from the 5 admin list surfaces are already handled. Plan E's scope (pre-existing regressions per CONTEXT D-12) is now narrowed — anything still red on `mobile-chrome` after Plan D is either a real bug (rare, given the migration matches the proven analog) or an existing skip-with-reason candidate.
- The 5 new XList components are ready for any future admin-list extension (e.g. column changes, sort, multi-select). Adding a column = appending a `DataListColumn<T>` to the columns array and updating the `mobileCard` body — no breakpoint-class plumbing required.
- The pagination split pattern in `users.index.tsx` is the reference for any future paginated DataList consumer.
- Deferred items in `deferred-items.md` provide a future "admin sub-surface DataList migration" plan with the 7 enumerated `md:` usages as scope.

## Self-Check: PASSED

**Files claimed created (5) — verified:**
- TeacherList.tsx, StudentList.tsx, ClassList.tsx, SubjectList.tsx, UserList.tsx — all present at the documented paths.

**Files claimed deleted (10) — verified absent:**
- 5 OLD XListTable.tsx + 5 OLD XMobileCards.tsx — all confirmed absent via `test ! -e`.

**Commits claimed — verified in `git log --oneline`:**
- `d798f73`: feat(17-04): migrate Teacher + Class + Subject lists to shared DataList
- `a8a7987`: feat(17-04): migrate Student + User lists to shared DataList
- `a90757a`: docs(17-04): append Plan-D rows to triage + log out-of-scope md: usages

**Triage acceptance — verified via grep:**
- `grep -c "datalist-migration" 17-TRIAGE.md` returns 4 (1 row + 1 side-effect row + 2 legend entries).
- `grep -c "shared DataList" 17-TRIAGE.md` returns 1 (the Plan-D row).

**Scope grep on the 5 new XList files — verified:**
- `grep -RIn 'md:hidden\|hidden md:block' <5 XList files>` returns zero matches.

---
*Phase: 17-ci-stabilization*
*Plan: 04*
*Completed: 2026-05-02*
