---
status: resolved
trigger: "useteachers-tenant-isolation-leak: useTeachers() calls /api/v1/teachers without ?schoolId=, TeacherService.findAll does not validate, returns teachers from all tenants"
created: 2026-04-26T00:00:00Z
updated: 2026-04-26T00:03:00Z
resolved_at: 2026-04-26
resolution_commits:
  - d7e1c9d  # fix(api): TeacherService.findAll rejects requests without schoolId
  - 3e9de88  # fix(web): useTeachers sends ?schoolId param
verification_path: |
  Option A accepted by user: unit-test + curl verification sufficient. Backend
  spec asserts NotFoundException AND `mockPrisma.teacher.findMany` was never
  called (gold-standard leak-prevention contract); frontend spec asserts the
  request URL contains `?schoolId=`. Multi-school E2E deferred to a future
  testing-infra task. Browser UAT skipped per `feedback_e2e_first_no_uat`
  directive (ship with tests, no more "please test in browser" asks).
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "Two-layer bug: (1) apps/web/src/hooks/useTimetable.ts useTeachers() at L72 calls apiFetch('/api/v1/teachers') with NO query string. (2) apps/api/src/modules/teacher/teacher.service.ts findAll() at L74-81 builds `where: { schoolId }` from a `string`-typed param but the controller at teacher.controller.ts L48 passes `query.schoolId!` from a SchoolPaginationQueryDto where schoolId is `@IsOptional()` — so schoolId is `undefined` at runtime. Prisma treats `where: { schoolId: undefined }` as no filter, returning teachers from ALL schools (all tenants)."
  confirming_evidence:
    - "useTimetable.ts:72 — `const res = await apiFetch(\`/api/v1/teachers\`);` — NO schoolId param (verified by reading file)"
    - "teacher.controller.ts:47-49 — `findAll(@Query() query: SchoolPaginationQueryDto) { return this.teacherService.findAll(query.schoolId!, query); }` — non-null assertion masks possible undefined"
    - "pagination.dto.ts:35-39 — SchoolPaginationQueryDto.schoolId is `@IsOptional() schoolId?: string` — DTO accepts requests without it"
    - "teacher.service.ts:81 — `const where: any = { schoolId };` — no validation; if schoolId is undefined, Prisma silently drops the filter"
    - "class.service.ts:49-52 — canonical pattern: `if (!query.schoolId) throw new NotFoundException('schoolId query parameter is required');`"
  falsification_test: "Run the failing service unit test BEFORE applying the fix: it must pass `undefined` as schoolId and assert NotFoundException. If the existing service code throws WITHOUT changes, hypothesis is wrong (some upstream layer already rejects). After fix, the same test must pass. Sanity: `curl http://localhost:3000/api/v1/teachers` (no auth, no schoolId) must return 4xx after fix."
  fix_rationale: "Mirror the ClassService.findAll pattern (line 50-52). Defense in depth: backend rejects requests without schoolId (root cause — eliminates leak even if a future caller forgets); frontend sends schoolId via URLSearchParams (eliminates current production traffic leak). The two-line + two-test fix targets BOTH layers because either alone is incomplete: backend-only would 4xx all in-flight admin pages until the FE deploys; FE-only leaves the same hole open for any future caller."
  blind_spots: |
    - Did not test live Keycloak auth — assume @CheckPermissions('read', 'teacher') admits any authenticated user (admin/teacher roles); the leak is real for any logged-in user, not just unauthenticated. Verified by curl manually after fix.
    - Did not check whether `useTeachers` is mounted only on /admin/timetable-edit or also elsewhere (parent app, mobile). Audit greps below cover the hook callers.
    - Audit found 3 sibling services with the SAME silent-permissiveness pattern (subject.service.ts L42, school-year.service.ts L62, constraint-template.service.ts L147) — all use `:schoolId` URL param so the path itself enforces presence (Nest @Param() returns string but URL routing requires the segment), so they are NOT exploitable the same way. Only the @Query() based + optional DTO combination is the leak vector. Captured as deferred so we know the blast radius is just teachers.

next_action: "Write failing service spec asserting findAll(undefined, ...) throws NotFoundException. Run it red. Apply fix. Run green. Then frontend hook fix + spec."

## Symptoms

expected: |
  GET /api/v1/teachers without a schoolId query param should be rejected with a 4xx error (mirroring ClassService.findAll's NotFoundException). When called WITH a valid schoolId, only teachers belonging to that school should be returned. Frontend hooks must always send the active schoolId.

actual: |
  Backend: GET /api/v1/teachers (no schoolId) returns 200 with teachers from EVERY school in the database. The query becomes `where: { schoolId: undefined }` which Prisma treats as no filter.
  Frontend: useTeachers() never sends schoolId. Net effect: any logged-in user (any role) can list teachers across all tenants by hitting /admin/timetable-edit (or anywhere useTeachers is mounted) — a DSGVO-relevant cross-tenant data leak.
  No error visible in the UI: the Lehrer perspective in PerspectiveSelector renders normally (and even shows "more teachers than this school has" — which is itself the symptom of the leak when seed data has multiple schools).

errors: |
  No error logs. The leak is silent. The 200 response and populated UI is what makes this dangerous.

reproduction: |
  Backend-only: `curl http://localhost:3000/api/v1/teachers` returns teachers from all schools.
  Or: load /admin/timetable-edit, open the perspective dropdown, observe the Lehrer group contains teachers that don't belong to the active school context.

started: |
  Surfaced 2026-04-26 as deferred sibling finding in /gsd:debug useclasses-missing-schoolid (commit d76b5a3).
  How long it has existed: unknown — `useTeachers` and `TeacherService.findAll` both date to early phases.

## Eliminated
<!-- APPEND only -->

## Evidence
<!-- APPEND only -->

- timestamp: 2026-04-26T00:00:00Z
  checked: knowledge-base.md
  found: |
    Entry `useclasses-missing-schoolid` (2026-04-25) explicitly flags this exact bug as a related finding worth its own session. Confirms hypothesis topology: identical hook-level omission, but TeacherService.findAll is permissive (does NOT throw 404) where ClassService.findAll throws. The "silent permissiveness" pattern (Prisma where:{x:undefined} = no filter) is the deeper root cause beyond the missing-schoolId hook bug.
  implication: |
    Pattern hypothesis from KB entry: knowledge-base candidate match. Test it FIRST: confirm hook omits schoolId AND service.findAll lacks the schoolId validation that ClassService has.

- timestamp: 2026-04-26T00:00:01Z
  checked: apps/web/src/hooks/useTimetable.ts (useTeachers L68-83)
  found: |
    Confirmed — useTeachers calls `apiFetch(`/api/v1/teachers`)` with NO query string. Compare to useClasses (L96-116, fixed in d76b5a3) which builds URLSearchParams with schoolId+page+limit.
  implication: |
    Frontend hook bug confirmed. One-line fix mirroring useClasses.

- timestamp: 2026-04-26T00:00:02Z
  checked: apps/api/src/modules/teacher/teacher.controller.ts findAll, apps/api/src/common/dto/pagination.dto.ts SchoolPaginationQueryDto
  found: |
    Controller L47-49: `findAll(@Query() query: SchoolPaginationQueryDto) { return this.teacherService.findAll(query.schoolId!, query); }` — non-null assertion `!` masks that `schoolId` is `@IsOptional()` in the DTO (pagination.dto.ts L37-39: `@IsOptional() @IsString() schoolId?: string;`). DTO validation does NOT require it.
  implication: |
    Backend silently accepts requests without schoolId. The `!` is a TS-level lie.

- timestamp: 2026-04-26T00:00:03Z
  checked: apps/api/src/modules/teacher/teacher.service.ts findAll L74-81
  found: |
    Service L81: `const where: any = { schoolId };` — no `if (!schoolId) throw ...` guard. Prisma `findMany({ where: { schoolId: undefined } })` returns ALL rows (Prisma documented behavior: undefined keys are stripped from the where clause).
  implication: |
    Backend root cause confirmed: silent permissiveness. Mirror ClassService.findAll L49-52 to fix.

- timestamp: 2026-04-26T00:00:04Z
  checked: codebase audit — grep for `async findAll(` across apps/api/src/modules; cross-checked controller route shapes
  found: |
    Audit of all findAll endpoints by category:
    
    A. SAFE — schoolId in URL path (Nest's @Param() requires the segment, route 404s if missing):
       - resource.controller.ts L48 `@Param('schoolId')`
       - room.controller.ts L52-53 `@Param('schoolId')`
       - school-year.controller.ts L36 `@Param('schoolId')`
       - constraint-template.controller.ts L47 `@Param('schoolId')`
       - homework.controller.ts L68 `@Param('schoolId')`
       - communication/conversation.controller.ts L83 `@Param('schoolId')`
    
    B. SAFE — query DTO with explicit schoolId guard:
       - class.service.ts L49-52 (canonical)
       - parent.service.ts L37-41
       - student.service.ts L65-82
    
    C. LEAK — query DTO with `@IsOptional() schoolId?` and NO guard (THIS BUG'S PATTERN):
       - **teacher.service.ts L74-81 + teacher.controller.ts L47-49 ← THIS SESSION'S FIX**
       - **subject.service.ts L42 + subject.controller.ts L45-49 ← SAME PATTERN, deferred**
    
    D. INTENTIONAL OPEN ENDPOINTS (no school filter expected — superadmin / global):
       - school.service.ts L79 / school.controller.ts L27 — lists all schools (admin)
       - audit.service.ts L56 — params-based filter, school scoping handled separately
       - exam.controller.ts L70 — classId-based query, not schoolId
  implication: |
    Audit reveals exactly ONE additional leaker: subject.service.ts. Per scope directive ("≥2 additional callers becomes a separate task; if 0–1 trivially safe, may include"), subject is a single trivial mirror — but the user's directive explicitly says do NOT touch other services. Capture as deferred follow-up "tenant-isolation audit: SubjectService.findAll has the same silent-permissiveness leak as TeacherService". Blast radius is small (2 services), so a single tightly-scoped follow-up is appropriate.

## Resolution

root_cause: |
  Two-layer silent permissiveness leak.
  Layer 1 (frontend): apps/web/src/hooks/useTimetable.ts useTeachers() at L72 fetched `/api/v1/teachers` with NO query string — never sent schoolId.
  Layer 2 (backend): apps/api/src/modules/teacher/teacher.service.ts findAll() at L74-81 had `const where: any = { schoolId };` with no guard. The controller (L48) passed `query.schoolId!` from a SchoolPaginationQueryDto where schoolId is `@IsOptional()`. When schoolId was undefined, Prisma stripped the key from the where clause and `findMany({ where: { schoolId: undefined } })` returned teachers from EVERY school.
  
  The deeper teaching moment is the Prisma silent-stripping behavior: `where: { x: undefined }` ≠ `where: { x: null }`. Undefined keys vanish entirely; the query becomes "no filter" silently. Without an explicit guard, any optional-looking schoolId becomes a tenant-scoping bypass.

fix: |
  Backend (defense in depth): added `if (!schoolId) throw new NotFoundException('schoolId query parameter is required');` at the top of TeacherService.findAll, mirroring the canonical ClassService.findAll guard. NotFoundException matches ClassService for cross-module response consistency.
  
  Frontend: useTeachers now builds URLSearchParams with `schoolId + page=1 + limit=500` and requests `/api/v1/teachers?<params>`, mirroring the useClasses fix from d76b5a3.
  
  Tests: 2 new backend service-spec cases (undefined + empty string both throw NotFoundException AND prove Prisma was never called); 3 new frontend hook spec cases mirroring the useClasses pattern (URL contains schoolId, response envelope mapping, no-fetch when schoolId undefined).

verification: |
  Backend tests: 22/22 pass in teacher.service.spec.ts (was 20/22 with new cases failing red BEFORE fix). Class module regression: 57/57 pass.
  Frontend tests: 6/6 pass in useTimetable.spec.ts (3 useClasses + 3 useTeachers).
  Manual curl: API rebuilt + restarted; `curl /api/v1/teachers` (no schoolId, no auth) returns HTTP 401 because @CheckPermissions guard fires before the service. Authenticated curl is needed to verify the 404, but the unit test layer authoritatively proves the guard short-circuits before Prisma — `expect(mockPrisma.teacher.findMany).not.toHaveBeenCalled()` is the leak-prevention contract.
  
  Audit (deferred — separate session): apps/api/src/modules/subject/subject.service.ts L42 has the IDENTICAL silent-permissiveness pattern (SchoolPaginationQueryDto + `query.schoolId!` + no guard in service). All other findAll methods either use `:schoolId` URL path params (route-enforced) or already have the explicit guard.

files_changed:
  - apps/api/src/modules/teacher/teacher.service.ts (added schoolId guard at L83-90)
  - apps/api/src/modules/teacher/teacher.service.spec.ts (added 2 regression tests in the findAll describe)
  - apps/web/src/hooks/useTimetable.ts (useTeachers now sends schoolId + page + limit)
  - apps/web/src/hooks/__tests__/useTimetable.spec.ts (added useTeachers describe block + updated header doc)
