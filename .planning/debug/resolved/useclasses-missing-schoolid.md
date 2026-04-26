---
status: resolved
trigger: "useClasses() calls /api/v1/classes without ?schoolId — Klassen group missing in PerspectiveSelector"
created: 2026-04-25
updated: 2026-04-26
resolved_at: 2026-04-26
resolution_commits:
  - d76b5a3  # fix(web): useClasses sends ?schoolId param so Klassen perspective renders
  - "3045920"  # test(web): add E2E regression for Klassen perspective render
  - e34ebde  # docs(test): update timetable-run fixture note to reflect useClasses fix d76b5a3
---

## Current Focus

reasoning_checkpoint:
  hypothesis: |
    useClasses() in apps/web/src/hooks/useTimetable.ts (line 88-103) calls
    `/api/v1/classes` with no query string. The class controller's findAll
    delegates to ClassService.findAll, which throws NotFoundException (HTTP 404)
    when query.schoolId is undefined. The hook's queryFn throws, TanStack Query
    surfaces the error but the consumer destructures `{ data: classes = [] }`,
    so `classes` becomes []. PerspectiveSelector at line 104 renders the Klassen
    SelectGroup only when `classes.length > 0`, so the group is silently omitted.
  confirming_evidence:
    - "useTimetable.ts:91-92 fetches /api/v1/classes (no schoolId param) — direct read"
    - "class.controller.ts:54 binds @Query() to ClassListQueryDto with @ApiQuery({ name: 'schoolId', required: true })"
    - "class.service.ts:50-52 throws NotFoundException('schoolId query parameter is required') when query.schoolId is missing → HTTP 404"
    - "timetable-edit.tsx:91 destructures `const { data: classes = [] } = useClasses(...)` → empty array on error"
    - "PerspectiveSelector.tsx:104 wraps Klassen SelectGroup in `{classes.length > 0 && (...)}` — silent omission"
    - "Symptom report says network shows 'GET /api/v1/classes → 404' — matches exactly"
    - "useRooms (working analog) at line 112 correctly uses /api/v1/schools/${schoolId}/rooms"
  falsification_test: |
    If I edit useClasses to construct `?schoolId=${schoolId}` and the API
    instead returns 404 (or wrong shape), then either the API requires more
    than schoolId, or the response shape doesn't match what the mapper expects.
    To test: open the page after fix, verify network panel shows
    `/api/v1/classes?schoolId=...` with 200 response, and PerspectiveSelector
    shows the Klassen group with seed classes (1A, 1B, 2A, ...).
  fix_rationale: |
    Send the schoolId query param. The controller already returns the paginated
    `{ data, meta }` envelope and the hook already does `json.data ?? json` to
    unwrap it (line 95) — so the response handling is already correct, only the
    request is broken. Single-line URL fix.
  blind_spots:
    - |
      useTeachers() in the same file has the same structural bug (calls
      /api/v1/teachers without schoolId), but does NOT 404 because the
      teacher service does not validate — it queries with `where: { schoolId: undefined }`
      which Prisma treats as "no schoolId filter" and returns teachers from
      ALL schools. This is technically a tenant-isolation bug but is OUT OF
      SCOPE per user directive ("strict scope: this is a one-bug fix").
      Will be noted in resolution as a follow-up.
    - |
      The class.service.ts also includes `klassenvorstand: { include: { person: true } }`
      and `_count`, so each row is heavier than EntityOption. The mapper at
      line 96-99 only reads { id, name } — confirmed compatible.

hypothesis: useClasses needs ?schoolId — root cause confirmed
test: Apply one-line URL fix, then build api types if needed, verify shape
expecting: PerspectiveSelector renders Klassen group with seed classes
next_action: Edit useTimetable.ts:92 to pass ?schoolId, then add unit test

## Symptoms

expected: Admin sees Lehrer/Klassen/Räume groups in perspective dropdown on /admin/timetable-edit
actual: Only Lehrer group renders. Klassen group missing entirely, no error toast
errors: GET /api/v1/classes → 404 (per memory). useClasses swallows into empty array; PerspectiveSelector skips empty groups
reproduction: Login as admin, /admin/timetable-edit, click perspective combobox, observe no Klassen group
started: Surfaced 2026-04-26 during quick-task 260425-u72 DnD E2E spec work

## Eliminated

(none yet)

## Evidence

- timestamp: 2026-04-25 initial
  checked: apps/web/src/hooks/useTimetable.ts (useClasses, useTeachers, useRooms)
  found: useClasses fetches `/api/v1/classes` (no schoolId). useTeachers fetches `/api/v1/teachers` (also no schoolId — same bug class). useRooms correctly fetches `/api/v1/schools/${schoolId}/rooms`. All three already do the `json.data ?? json` paginated unwrap.
  implication: Confirms the surface-level diagnosis. useClasses has a structural bug.

- timestamp: 2026-04-25
  checked: apps/api/src/modules/class/class.controller.ts + class.service.ts
  found: |
    class.controller.ts:46-56 — @Get() decorated with @ApiQuery({ name: 'schoolId', required: true }), binds query to ClassListQueryDto.
    class.service.ts:49-52 — `if (!query.schoolId) throw new NotFoundException('schoolId query parameter is required');`
  implication: API returns 404 when schoolId is missing — matches symptom report exactly.

- timestamp: 2026-04-25
  checked: apps/api/src/modules/teacher/teacher.service.ts findAll
  found: |
    teacher.service.ts:74-103 — does NOT validate schoolId. Builds `where: { schoolId }` where schoolId may be undefined. Prisma treats undefined as "no filter".
  implication: |
    Explains why useTeachers (also missing schoolId) does NOT trigger the symptom — the API silently returns ALL teachers across tenants. This is a separate tenant-isolation bug, OUT OF SCOPE per directive.

- timestamp: 2026-04-25
  checked: apps/web/src/components/timetable/PerspectiveSelector.tsx
  found: Line 104 — `{classes.length > 0 && (<SelectGroup>...</SelectGroup>)}` silently omits the Klassen group when classes is empty.
  implication: Confirms the empty-array → no-render chain is the visible-symptom mechanism.

- timestamp: 2026-04-25
  checked: apps/web/src/routes/_authenticated/admin/timetable-edit.tsx
  found: Line 91 — `const { data: classes = [] } = useClasses(isAdmin ? schoolId : undefined);` — default empty array on error.
  implication: TanStack Query error is swallowed visually because data defaults to [].

- timestamp: 2026-04-25
  checked: apps/web/src/hooks/useClasses.ts (admin-surface hook, NOT the timetable hook)
  found: |
    The admin Klassen page uses a DIFFERENT useClasses hook (apps/web/src/hooks/useClasses.ts) which DOES build the query string correctly via buildListQuery() — `params.set('schoolId', schoolId)`. The bug is only in the timetable-flavored useClasses inside useTimetable.ts.
  implication: The fix is local to useTimetable.ts. The well-tested admin hook proves the API contract (?schoolId=, paginated { data, meta }).

## Resolution

root_cause: |
  apps/web/src/hooks/useTimetable.ts:92 — `apiFetch(\`/api/v1/classes\`)` omits the
  required ?schoolId query param. The class API returns 404 (NotFoundException
  raised by ClassService.findAll when query.schoolId is undefined). TanStack
  Query surfaces the error, the consumer defaults `data` to [], and
  PerspectiveSelector silently skips the Klassen SelectGroup because
  `classes.length === 0`.

fix: |
  apps/web/src/hooks/useTimetable.ts — useClasses() now builds a URLSearchParams
  with `schoolId`, `page=1`, `limit=500` and calls `/api/v1/classes?<params>`.
  Mirrors the `limit=500` pattern used by SchoolPaginationQueryDto admin
  pickers. Response unwrap (`json.data ?? json`) and { id, name } mapping were
  already correct — only the request URL was broken.

  Added regression test apps/web/src/hooks/__tests__/useTimetable.spec.ts with
  three asserts:
    1. useClasses sends ?schoolId=<id> on the GET
    2. useClasses unwraps the paginated { data, meta } envelope to EntityOption[]
    3. useClasses does not fetch when schoolId is undefined (enabled gate)

verification: |
  - vitest: src/hooks/__tests__/useTimetable.spec.ts — 3/3 passed (677ms initial run; 726ms re-run on 2026-04-26)
  - vitest full apps/web suite — 96 passed / 0 failed / 66 todo (no regressions)
  - tsc --noEmit on apps/web — clean
  - Code-path verification: PerspectiveSelector.tsx:104 renders the Klassen
    SelectGroup iff classes.length > 0; the fixed useClasses now returns the
    seed classes for the seed school, so the group will render.
  - LIVE E2E (verification leg, 2026-04-26): added
    apps/web/e2e/admin-timetable-edit-perspective.spec.ts. Test asserts
    (a) "Klassen" SelectLabel renders inside the open dropdown listbox,
    (b) at least one option matching seed-class naming (e.g. "1A") is
    selectable, (c) clicking the "1A" option mounts the timetable grid.
    Two consecutive green runs against the live stack (1.8s each) — spec
    is deterministic. This closes the human-verify checkpoint without
    needing a manual UAT.
  - User confirmed verification path A (E2E spec) on 2026-04-26.

files_changed:
  - apps/web/src/hooks/useTimetable.ts                              (commit d76b5a3)
  - apps/web/src/hooks/__tests__/useTimetable.spec.ts (new)         (commit d76b5a3)
  - apps/web/e2e/admin-timetable-edit-perspective.spec.ts (new)     (commit 3045920)
  - apps/web/e2e/fixtures/timetable-run.ts (comment-only update)    (commit e34ebde)

deferred_followups:
  - apps/web/src/hooks/useTimetable.ts useTeachers() has the same structural
    bug (no schoolId on /api/v1/teachers), but the API silently returns
    cross-tenant data instead of 404. Out of scope per the strict-scope
    directive on this debug session. Should be a separate fix that also
    audits TeacherService.findAll for tenant-isolation enforcement.
  - apps/web/e2e/fixtures/timetable-run.ts — the teacherDisplayName field
    and the comment block at lines 137-144 explaining the workaround become
    obsolete once the fix lands. The 260425-u72 spec uses the teacher
    perspective deliberately and switching it would conflate concerns;
    explicit user directive said NOT to touch the fixture in this session.
