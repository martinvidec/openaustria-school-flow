---
status: resolved
trigger: "subject-tenant-isolation-leak — SubjectService.findAll Category C silent-permissiveness, mechanical mirror of useTeachers fix"
created: 2026-04-26T00:00:00Z
updated: 2026-04-26T00:00:00Z
resolved_at: 2026-04-26
resolution_commits:
  - 6cf3c94  # fix(api): SubjectService.findAll rejects requests without schoolId
---

## Current Focus

reasoning_checkpoint:
  hypothesis: "SubjectService.findAll has the Category C silent-permissiveness leak. SubjectController forwards `query.schoolId!` from SchoolPaginationQueryDto where schoolId is @IsOptional. When schoolId is undefined, Prisma silently strips the key from `where: { schoolId: undefined }` and returns subjects from EVERY school."
  confirming_evidence:
    - "subject.service.ts L42-54: findAll signature is `findAll(schoolId: string, pagination)` with no guard before `where: { schoolId }` (lines 45 and 53)."
    - "subject.controller.ts L40-50: @Get() with @CheckPermissions read/subject, @Query() SchoolPaginationQueryDto, then `subjectService.findAll(query.schoolId!, ...)` — non-null assertion is a TS lie because pagination.dto.ts L37-39 declares schoolId as `@IsOptional() @IsString() schoolId?: string`."
    - "Prisma behavior is documented and reproducible from the just-fixed teacher leak (commit d7e1c9d) — the structural shape is identical."
    - "Audit grep for `query.schoolId!` returns exactly the subject + (now-fixed) teacher controllers — confirming subject is the last remaining Category C site."
  falsification_test: "If `service.findAll(undefined, {skip:0,limit:20})` returns data instead of throwing, OR `mockPrisma.subject.findMany` is called when schoolId is undefined, the hypothesis is wrong. (We expect both to be true before the fix and false after.)"
  fix_rationale: "Add `if (!schoolId) throw new NotFoundException('schoolId query parameter is required');` at the top of SubjectService.findAll, mirroring TeacherService.findAll L86-88 exactly. Defense in depth — even if every current frontend caller passes schoolId (which audit confirms — useSubjects in apps/web/src/hooks/useSubjects.ts uses URLSearchParams + enabled gate, and StundentafelTab passes schoolId in template literal), future callers (mobile, plugins, scripts, third-party integrations) cannot be trusted. The backend guard is the authoritative leak closure. Frontend fix is NOT needed per playbook directive (no churn for symmetry)."
  blind_spots: "1) Did not run a live SQL query against a multi-tenant DB to literally observe Prisma stripping undefined — relying on documented Prisma behavior + identical pattern from teacher session. 2) Did not verify there's no third caller of SubjectService.findAll outside subject.controller.ts (e.g., another service injecting SubjectService directly). 3) Auth layer protects /api/v1/subjects (CheckPermissions read/subject) but does NOT enforce tenant — a non-admin teacher in school A could still hit the endpoint and (pre-fix) get school B's subjects. The guard closes this independent of caller identity."

## Symptoms

expected: |
  GET /api/v1/subjects without schoolId query param should be rejected with 4xx (mirroring TeacherService fix in d7e1c9d).
  When called WITH valid schoolId, only subjects belonging to that school returned.
  Frontend hooks must always send active schoolId.

actual: |
  Backend: `where: { schoolId }` with no guard (subject.service.ts L45+L53) — Prisma returns subjects from all schools when schoolId undefined.
  Frontend: useSubjects (apps/web/src/hooks/useSubjects.ts) is ALREADY CORRECT — uses URLSearchParams, sets schoolId only when defined, and gates with `enabled: !!schoolId`. StundentafelTab also passes schoolId. No frontend churn needed.

errors: |
  No error logs. Same silent-leak signature as useTeachers session.

reproduction: |
  Authenticated GET /api/v1/subjects (no query) returns 200 with subjects from all schools (pre-fix).
  Authenticated GET /api/v1/subjects (no query) returns 404 "schoolId query parameter is required" (post-fix).

started: |
  Surfaced 2026-04-26 in audit step of /gsd:debug useteachers-tenant-isolation-leak.

## Eliminated

- hypothesis: "Frontend caller (useSubjects) might also have the bug requiring URLSearchParams fix"
  evidence: "Read apps/web/src/hooks/useSubjects.ts L90-112 — already builds URLSearchParams, only sets schoolId if defined, gates query with `enabled: !!schoolId`. Other caller (StundentafelTab.tsx L34-47) is also gated with `enabled: !!schoolId` and passes schoolId in template literal."
  timestamp: 2026-04-26T00:00:00Z
- hypothesis: "Other findAll services may have a sibling Category C bug introduced since the prior audit"
  evidence: "Re-audited all `findAll(`-style services + `query.schoolId!` usage. The only `query.schoolId!` non-null assertion outside the (now-fixed) teacher controller is subject.controller.ts:46. All other `where: { schoolId }` patterns are in services where schoolId enters via `:schoolId` URL Param (route-enforced 404), comes from a typed parameter the caller is responsible for, or sit on intentionally-global services (school.service, audit.service)."
  timestamp: 2026-04-26T00:00:00Z

## Evidence

- timestamp: 2026-04-26T00:00:00Z
  checked: "Knowledge base for prior pattern (.planning/debug/knowledge-base.md L24-37)"
  found: "useteachers-tenant-isolation-leak entry documents the canonical fix (commit d7e1c9d backend + 3e9de88 frontend) and explicitly flags subject.service.ts:42 as the last Category C remainder."
  implication: "Mechanical mirror — copy TeacherService.findAll L86-88 verbatim into SubjectService.findAll, mirror the 2 spec cases."
- timestamp: 2026-04-26T00:00:00Z
  checked: "subject.service.ts findAll (L42-65) and subject.controller.ts findAll (L40-50)"
  found: "Identical structure to pre-fix TeacherService — no guard, query.schoolId! non-null assertion. Pagination DTO subject.controller passes is SchoolPaginationQueryDto (L20 import + L45 usage)."
  implication: "One-line fix is sufficient and safe. The service has no other code path that would interact with the guard."
- timestamp: 2026-04-26T00:00:00Z
  checked: "common/dto/pagination.dto.ts SchoolPaginationQueryDto (L35-50)"
  found: "schoolId is @IsOptional @IsString — optional at the validation layer. ValidationPipe will NOT reject a request missing schoolId."
  implication: "The non-null assertion in the controller is purely cosmetic; the runtime check must live in the service."
- timestamp: 2026-04-26T00:00:00Z
  checked: "Frontend callers of /api/v1/subjects (grep across apps/web)"
  found: "Two callers — useSubjects hook (apps/web/src/hooks/useSubjects.ts L90-112) and useSubjectsList in StundentafelTab.tsx (L34-47). Both are tenant-correct: URLSearchParams + `enabled: !!schoolId` gating in useSubjects, template literal + `enabled: !!schoolId` in StundentafelTab."
  implication: "No frontend fix needed. Per playbook: do NOT add churn for the sake of symmetry."
- timestamp: 2026-04-26T00:00:00Z
  checked: "Audit re-grep for `query.schoolId!` and `findAll(` patterns across apps/api/src/modules"
  found: "subject.controller.ts:46 is the ONLY remaining `query.schoolId!` site. teacher.controller.ts:48 is the now-fixed sibling (the service guard catches it). All other `where: { schoolId }` sites are in services where schoolId enters via @Param URL segment, callers' responsibility, or intentionally-global endpoints."
  implication: "Closing this fix retires the entire Category C bucket per the audit taxonomy."
- timestamp: 2026-04-26T00:00:00Z
  checked: "apps/api/vitest.config.ts"
  found: "globals: true — no need to import describe/it/vi in spec files (existing subject.service.spec.ts confirms this style)."
  implication: "Add new tests in the existing spec describe('findAll', ...) block without import noise."

## Resolution

root_cause: "SubjectService.findAll built `where: { schoolId }` with no guard. Controller forwarded `query.schoolId!` from a SchoolPaginationQueryDto with @IsOptional schoolId. When schoolId was undefined, Prisma stripped the key from the where clause and findMany returned subjects from EVERY school in the database. Cross-tenant data leak."
fix: "Added `if (!schoolId) throw new NotFoundException('schoolId query parameter is required')` at the top of SubjectService.findAll, mirroring TeacherService.findAll L86-88 verbatim. Frontend NOT touched — useSubjects (apps/web/src/hooks/useSubjects.ts) and StundentafelTab's useSubjectsList already pass schoolId correctly with `enabled: !!schoolId` gating. Per playbook directive: no churn for symmetry."
verification: |
  - vitest run subject.service.spec.ts: 21/21 pass (3 new + 18 existing)
  - vitest run subject + teacher modules: 63/63 pass (no cross-impact)
  - TypeScript build (tsc --noEmit) on apps/api: clean
  - Falsification: temporarily disabled the guard with `if (false && !schoolId)` — both new tenant-isolation tests failed (rejects.toThrow(NotFoundException) failed AND not.toHaveBeenCalled() failed), confirming the tests genuinely capture the leak. Restored guard, all green again.
files_changed:
  - apps/api/src/modules/subject/subject.service.ts
  - apps/api/src/modules/subject/subject.service.spec.ts
