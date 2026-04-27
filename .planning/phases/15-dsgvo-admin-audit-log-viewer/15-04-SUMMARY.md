---
phase: 15-dsgvo-admin-audit-log-viewer
plan: 04
subsystem: api
tags: [phase-15, dsgvo, jobs, backend, admin-list, tenant-isolation, nestjs, prisma, vitest]

# Dependency graph
requires:
  - phase: 15-dsgvo-admin-audit-log-viewer
    provides: existing per-id /dsgvo/export/:id, /dsgvo/deletion/:id, /dsgvo/export/person/:personId routes (Phase 5 baseline) — left untouched
provides:
  - GET /dsgvo/jobs school-wide tenant-scoped admin list endpoint (D-23, DSGVO-ADM-05/06)
  - DsgvoJobsService.findAllForAdmin with role-gate (admin-only) + Pitfall 4 schoolId guard + two-query Person hydration
  - QueryDsgvoJobsDto with required @IsUUID schoolId + optional status/jobType enum filters
  - DsgvoJobStatusFilter + DsgvoJobTypeFilter enums (mirror Prisma enums, frontend shared)
affects: [15-08-jobs-tab-and-art17-dialogs, 15-10-dsgvo-e2e-suite]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Two-query Person hydration: paginated parent query + tenant-scoped IN-list child query when schema has scalar FK without Prisma navigation relation. Avoids schema migration when relation field is missing but join is required by response contract."
    - "Service-level role gate (`requestingUser.roles.includes('admin')`) as defense-in-depth alongside controller-level @CheckPermissions decorator (mirrors audit.service.ts and 15-03's consent.service.ts)"
    - "DTO mandatory schoolId (no @IsOptional) + service-level falsy schoolId guard → BadRequestException, dual-layer Pitfall 4 protection"

key-files:
  created:
    - apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts
    - apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts
    - apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts
    - apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts
  modified:
    - apps/api/src/modules/dsgvo/dsgvo.module.ts

key-decisions:
  - "Two-query Person hydration instead of Prisma include — DsgvoJob has scalar personId? but no Prisma navigation relation. Adding the relation would require a schema change + migration, which the plan frontmatter explicitly forbade. Two queries preserve the must_have response shape (`person: PersonSummary | null` per row) without schema churn."
  - "Person hydration query is itself tenant-scoped (`where: { id: { in: ... }, schoolId: query.schoolId }`) — defense-in-depth against stale personId pointing to a different tenant's Person."
  - "9 service spec cases (plan asked for 8) — added explicit test for the optimization branch where no jobs have personId so Person hydration is skipped entirely."

patterns-established:
  - "Two-query join pattern: when a Prisma model has a scalar FK without a navigation relation and a response contract requires the joined entity, page the parent + IN-list fetch the child + tenant-filter both. Documented in service JSDoc."
  - "DSGVO admin list endpoints: required schoolId + admin-only service role gate + standard {data, meta} envelope (consistent with plan 15-03 consent admin filter)."

requirements-completed:
  - DSGVO-ADM-05
  - DSGVO-ADM-06

# Metrics
duration: 21min
completed: 2026-04-27
---

# Phase 15 Plan 04: DSGVO Jobs List Endpoint Summary

**GET /dsgvo/jobs admin route shipped: paginated, tenant-scoped, role-gated DsgvoJob list with two-query Person hydration that preserves the JobsTab's display contract without touching the schema.**

## Performance

- **Duration:** ~21 min
- **Started:** 2026-04-27T18:15:11Z
- **Completed:** 2026-04-27T18:36:00Z (approx.)
- **Tasks:** 3 (all autonomous, all green)
- **Files modified:** 5 (4 created + 1 edit)

## Accomplishments
- New `apps/api/src/modules/dsgvo/jobs/` module with controller, service, DTO, and Vitest spec
- `GET /dsgvo/jobs?schoolId=…&status=…&jobType=…&page=…&limit=…` returns the school's DsgvoJob rows with `person: { id, firstName, lastName, email } | null` joined per row
- Defense-in-depth Pitfall 4 guard: DTO requires `@IsUUID schoolId`, service throws BadRequestException on falsy schoolId BEFORE composing `where`
- Service-level admin role gate: non-admin tokens get 403 even if CASL `read:export` is granted
- 9/9 Vitest service spec cases pass; full `nest build` green; 0 typecheck errors
- Existing per-id and per-person DSGVO routes untouched

## Task Commits

Each task was committed atomically:

1. **Task 1: QueryDsgvoJobsDto with required schoolId + status/jobType filters** — `6258986` (feat)
2. **Task 2: DsgvoJobsService.findAllForAdmin with tenant scope + role gate** — `7850be1` (feat)
3. **Task 3: DsgvoJobsController + spec + module wiring** — `ecfcf22` (feat)

**Plan metadata commit:** (added at end of execution)

## Files Created/Modified
- `apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts` — Required schoolId UUID, optional status/jobType enum filters, extends PaginationQueryDto, exports DsgvoJobStatusFilter + DsgvoJobTypeFilter enums
- `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` — `findAllForAdmin(query, requestingUser)` with admin role gate, Pitfall 4 schoolId guard, two-query Person hydration with cross-tenant Person filter, parallel findMany+count, standard `{data, meta}` envelope
- `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts` — `@Controller('dsgvo/jobs')` with single `@Get()` handler, `@CheckPermissions({ action: 'read', subject: 'export' })`, `@CurrentUser`, `@ApiTags`, `@ApiBearerAuth`, full Swagger response annotations
- `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts` — 9 test cases: 4 forbidden roles, empty schoolId 400, where-shape with no/status/jobType filters, createdAt desc, two-query Person hydration with tenant scope, no-personId optimization branch, paginated envelope totals
- `apps/api/src/modules/dsgvo/dsgvo.module.ts` — Registers DsgvoJobsController + DsgvoJobsService alongside existing DSGVO providers; not exported (no other module needs to inject it)

## Decisions Made
- **Two-query Person hydration over schema migration**: The plan frontmatter said "no schema changes, no migrations" yet must_haves required `person: { ... } | null` per row. The DsgvoJob model has scalar `personId?` but no Prisma navigation relation. Adding `Person? @relation(...)` would create a new FK constraint in Postgres (Prisma 7 generates one for every relation), forcing a migration. Resolved by paginating jobs first, then issuing a single `prisma.person.findMany({ where: { id: { in: [...] }, schoolId } })` for the page's unique personIds. Memory-bounded by `query.limit` (≤500). Tenant-scoped Person fetch is a side-bonus: even a stale cross-tenant personId cannot leak data.
- **Spec count 9 vs 8 in plan**: Added explicit "skips Person hydration when no jobs have personId" case to verify the optimization branch (no Person query when entire page is RETENTION_CLEANUP). Strictly more coverage than the plan asked for.
- **`onDelete: SetNull` rejected**: Initially considered adding the Prisma relation with `onDelete: SetNull` (since `personId` is nullable). Backed out because the underlying DB has no FK on `dsgvo_jobs.person_id` today; introducing one is a behavioral schema change and violated the plan constraint.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 — Plan Constraint Conflict] Switched from `include: { person: ... }` to two-query hydration**
- **Found during:** Task 2 (service implementation)
- **Issue:** Plan's `<action>` step explicitly wrote `include: { person: { select: ... } }`, but the Prisma `DsgvoJob` model lacks a `person` navigation relation (only the scalar `personId?` FK column exists). Prisma 7 emitted `error TS2353: 'person' does not exist in type DsgvoJobInclude<...>`. Adding the relation would require a Prisma schema edit + a migration with a new FK constraint, both of which the plan frontmatter explicitly forbade ("No schema changes, no migrations"). Plan instructions were internally contradictory.
- **Fix:** Implemented a two-query merge — paginate jobs first, then `prisma.person.findMany({ where: { id: { in: personIds }, schoolId } })` to hydrate. Result envelope is identical to what the `include` would have produced. The Person fetch is itself tenant-scoped, providing extra defense against stale cross-tenant personIds.
- **Files modified:** `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts`, `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts`
- **Verification:** Vitest spec verifies the Person follow-up query is tenant-scoped (`where.schoolId === query.schoolId`), select-narrow (only id/firstName/lastName/email), and that the merged response carries `person: PersonSummary | null` per row. nest build + tsc clean.
- **Committed in:** `7850be1` (Task 2) + `ecfcf22` (Task 3 spec)

**2. [Rule 3 — Blocking infrastructure] Pre-installed dependencies + generated Prisma client + built shared package**
- **Found during:** Task 1 (typecheck)
- **Issue:** Worktree had no `node_modules`, no Prisma generated client, and no built `packages/shared/dist`. `tsc --noEmit` reported 200+ errors, none of which were caused by this plan's changes.
- **Fix:** Ran `pnpm install --prefer-offline` (4.8s, all from store), `pnpm --filter @schoolflow/api exec prisma generate`, and `pnpm --filter @schoolflow/shared build`. After these, `tsc --noEmit` reported 0 errors.
- **Files modified:** None (build artifacts only, gitignored).
- **Committed in:** N/A — bootstrap step.

**3. [Rule 3 — Verify command flag deprecated] Dropped `--reporter=basic` from Vitest invocation**
- **Found during:** Task 3 verification
- **Issue:** Plan's verify command used `pnpm --filter @schoolflow/api test -- dsgvo-jobs.service --reporter=basic`. Vitest 4.1.2 in this repo treats `basic` as a custom reporter module path and crashes with `Failed to load url basic`.
- **Fix:** Ran `npx vitest run src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts` directly. All 9 cases pass.
- **Files modified:** None.
- **Committed in:** N/A — verification-only adjustment.

**4. [Out-of-scope, deferred] Pre-existing failing test in `prisma/__tests__/school-year-multi-active.spec.ts`**
- **Found during:** Initial full-suite test run.
- **Issue:** `school-year-multi-active.spec.ts` "backfill invariant" test fails (`expected 1 to be 2`). Unrelated to plan 15-04 — touches Phase 10 SchoolYear migration. Pre-existing on the parallel-execution worktree base.
- **Action:** Logged here per scope_boundary rule. NOT fixed by this plan. Plan 15-04's own spec is fully green when run in isolation.

---

**Total deviations:** 3 auto-fixed (1 plan-constraint conflict resolved with workaround, 2 infrastructure/tooling adjustments) + 1 deferred (out-of-scope unrelated test failure)
**Impact on plan:** All success criteria met. Output contract preserved. No scope creep. Schema, migrations, and existing routes untouched. The two-query workaround is documented in service JSDoc so a future plan can promote it to a Prisma relation when a controlled migration is acceptable.

## Issues Encountered
- Worktree was created from an older base than the phase 15 branch — required `git merge gsd/phase-15-dsgvo-admin-audit-log-viewer` at start of execution to bring in the plan files (`.planning/phases/15-dsgvo-admin-audit-log-viewer/...`) and the Phase 15 baseline. Merge was a fast-forward, no conflicts.
- Drift detected during exploratory `prisma migrate dev --create-only` — another parallel agent (likely 15-01) had applied `20260427181615_add_audit_entry_before_snapshot` to the live DB but the migration file lives on a sibling branch. This is expected behavior in the parallel-execution model and did not affect plan 15-04 because we abandoned the schema-change path entirely.

## User Setup Required
None — backend-only plan, no environment variables, no external services, no manual configuration.

## Next Phase Readiness
- Plan 15-08 (`jobs-tab-and-art17-dialogs`) can now consume `GET /dsgvo/jobs` via a `useDsgvoJobs(filters)` hook. The endpoint already returns the joined Person summary the JobsTab needs — no additional roundtrips required.
- Plan 15-10 (`dsgvo-e2e-suite`) gains a clear admin-list E2E target: 200 for admin with valid schoolId, 403 for non-admin, 422 for missing/invalid schoolId or unknown enum, paginated `{data, meta}` envelope with desc-by-createdAt ordering.

## Threat Flags

None — surface introduced exactly matches the plan's threat model. Every STRIDE entry (T-15-04-01 through T-15-04-07) has its mitigation in place; T-15-04-03 (cross-tenant leak) is in fact double-mitigated since the Person hydration query is itself tenant-scoped.

## Self-Check: PASSED

**Files verified to exist:**
- `apps/api/src/modules/dsgvo/jobs/dto/query-dsgvo-jobs.dto.ts` — FOUND
- `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.ts` — FOUND
- `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.controller.ts` — FOUND
- `apps/api/src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts` — FOUND
- `apps/api/src/modules/dsgvo/dsgvo.module.ts` — modified, contains DsgvoJobsController + DsgvoJobsService

**Commits verified to exist:**
- `6258986` (Task 1) — FOUND
- `7850be1` (Task 2) — FOUND
- `ecfcf22` (Task 3) — FOUND

**Verification commands re-run before sign-off:**
- `cd apps/api && npx tsc --noEmit` → 0 errors
- `cd apps/api && npx vitest run src/modules/dsgvo/jobs/dsgvo-jobs.service.spec.ts` → 9/9 passed
- `pnpm --filter @schoolflow/api build` → SWC compiled 436 files, 0 issues
- `git diff --stat` against base → 5 files changed (matches plan verification)

---
*Phase: 15-dsgvo-admin-audit-log-viewer*
*Plan: 04 — dsgvo-jobs-list-endpoint*
*Completed: 2026-04-27*
