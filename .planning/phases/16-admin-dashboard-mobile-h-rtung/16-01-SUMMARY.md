---
phase: 16-admin-dashboard-mobile-h-rtung
plan: 01
subsystem: api
tags: [nestjs, prisma, casl, dashboard, admin, aggregator, tenant-isolation]

requires:
  - phase: 16-admin-dashboard-mobile-h-rtung
    provides: "16-CONTEXT (D-06 to D-14, D-23 solver, D-24 timegrid), 16-RESEARCH (Approach B aggregator template, Pitfall #2 module-import duplication, Pitfall #5 solver heuristic, Pitfall #6 address heuristic), 16-PATTERNS (admin-tenant resolution via Person.findFirst)"

provides:
  - "GET /admin/dashboard/status — single-round-trip admin-only endpoint returning DashboardStatusDto (10 categories in D-06 order)"
  - "DashboardModule (Approach B — direct PrismaService consumer + SchoolModule import; NO TimetableModule/DsgvoModule per Pitfall #2)"
  - "DashboardService.getStatus(schoolId): 17 reads via Promise.all → 10 categories with German UI-SPEC secondary copy"
  - "DashboardService.resolveAdminSchoolId(keycloakUserId): tenant resolver via Person.findFirst — replicates calendar.service.ts:79-80 + user-context.service.ts:9-11"
  - "QueryDashboardDto with @IsUUID() validation"
  - "DashboardStatusDto + CategoryStatusDto + CategoryStatus + CategoryKey union types"
  - "D-23 solver heuristic: configExists = (constraintWeightOverride.count + constraintTemplate.count) > 0 AND timetableRun.count(status='COMPLETED') >= 1"
  - "D-24 timegrid heuristic: periodCount >= 1 AND schoolDay.count(isActive: true) >= 1"
  - "Cross-tenant guard at controller layer (T-16-2): rejects 403 if resolved schoolId !== query.schoolId or no Person row"

affects:
  - "16-02 frontend (already shipped — useDashboardStatus hook calls GET /admin/dashboard/status)"
  - "16-03 admin route wiring (will mount this endpoint)"
  - "16-06 cross-mutation invalidation (Plan 06 invalidates the dashboard-status query key after Plan 06 mutations)"
  - "Future read-only admin aggregators (template for tenant-resolved admin endpoints)"

tech-stack:
  added: []
  patterns:
    - "Admin-tenant resolution via Person.findFirst({ where: { keycloakUserId } }) — third site joining the calendar.service.ts + user-context.service.ts pattern family"
    - "Single-round-trip aggregator design (Promise.all over 17 reads → ternary status builders) — template for future status/health endpoints"
    - "Per-category status builders as pure private methods (testable in isolation; mockable Prisma)"
    - "Cross-tenant guard at controller layer rejecting 403 BEFORE the service touches Prisma — defense in depth on top of per-query `where: { schoolId }` filters"

key-files:
  created:
    - "apps/api/src/modules/dashboard/dashboard.module.ts"
    - "apps/api/src/modules/dashboard/dashboard.controller.ts"
    - "apps/api/src/modules/dashboard/dashboard.service.ts"
    - "apps/api/src/modules/dashboard/dashboard.service.spec.ts"
    - "apps/api/src/modules/dashboard/dashboard.spec.ts"
    - "apps/api/src/modules/dashboard/dto/dashboard-status.dto.ts"
    - "apps/api/src/modules/dashboard/dto/query-dashboard.dto.ts"
    - "apps/api/test/dashboard.e2e-spec.ts"
  modified:
    - "apps/api/src/app.module.ts"

key-decisions:
  - "D-23 (solver configExists union): implemented as (weightOverrideCount + templateCount) > 0 — both Prisma models scoped by schoolId. Done state additionally requires timetableRun.count(status='COMPLETED') >= 1."
  - "D-24 (timegrid Wochentage active gate): done = (timeGrid?.periods.length ?? 0) >= 1 AND schoolDay.count(isActive: true) >= 1; partial = periods exist but no active day; missing = no periods."
  - "Tenant resolution via Person.findFirst({ where: { keycloakUserId } }) — replicates the canonical pattern at calendar.service.ts:79-80 + user-context.service.ts:9-11. AuthenticatedUser carries no schoolId field; Person row is the single source of truth."
  - "AuditEntry.count is global (not schoolId-scoped) — schema.prisma:231-249 verifies AuditEntry has no schoolId column. Documented as a known deviation per plan; future schema change to add schoolId would tighten this. (No data leak: aggregated count only, no row content exposed.)"
  - "Teacher count gates on Person.isAnonymized=false (the plan said `isArchived: false`, but Person has no isArchived field — schema only defines isAnonymized on Person). isAnonymized matches the existing data-deletion.service.spec.ts pattern."
  - "Class count uses prisma.schoolClass (Prisma model is `SchoolClass` per schema.prisma:461; the plan referred to it as 'class' which is a TypeScript reserved keyword and is not exposed on PrismaService)."
  - "Cross-tenant probe (Test 4 of e2e) asserts BEHAVIOR (statusCode + body.message), NOT source-code shape — per plan acceptance criterion."

patterns-established:
  - "Admin-tenant resolution via Person.findFirst pattern — DashboardService is the third admin-adjacent site joining calendar.service.ts + user-context.service.ts. Future admin aggregators can copy this 4-line resolver verbatim."
  - "Single-round-trip aggregator with per-category pure builders — testable + future-proof template for admin status endpoints."
  - "E2E spec strategy for guard-protected endpoints WITHOUT live Keycloak/Postgres: bootstrap minimal NestJS app with stubbed JwtAuthGuard + PermissionsGuard reading user identity from a test header (`x-test-user`). Pure controller wiring + cross-tenant guard verified."

requirements-completed: [ADMIN-01, ADMIN-03]

duration: ~12min
completed: 2026-04-29
---

# Phase 16 Plan 01: Admin Dashboard Backend Endpoint Summary

**GET /admin/dashboard/status single-round-trip aggregator returning the 10-category Setup-Completeness DTO (D-06 order, D-23 solver, D-24 timegrid) — admin-only, tenant-isolated via Person.findFirst pattern, with table-driven unit spec (31 cases) and full integration spec (7 cases) covering admin/non-admin/cross-tenant/no-Person/validation/auth boundaries.**

## Performance

- **Duration:** ~12 min (recovery iteration only — original Task 1 + RED commits already on disk)
- **Started:** 2026-04-29T06:13Z (recovery resumed from 61fba23 → working-tree GREEN code)
- **Completed:** 2026-04-29T06:25Z
- **Tasks:** 3 (all completed)
- **Files modified:** 9 (8 created, 1 edited)

## Accomplishments

- Shipped GET /admin/dashboard/status returning DashboardStatusDto with the 10 D-06 categories in locked order (school, timegrid, schoolyear, subjects, teachers, classes, students, solver, dsgvo, audit). Single round-trip per CONTEXT D-10 — frontend useDashboardStatus (already shipped in Plan 02) consumes this.
- DashboardService.getStatus runs 17 reads via Promise.all (1 SchoolService.findOne + 14 prisma counts + 2 prisma findFirst) and builds each category via a pure private `build*Category(...)` method. Each builder is a deterministic function of the read-side data → unit-testable in isolation.
- D-23 solver heuristic landed: configExists is the union (constraintWeightOverride.count(schoolId) + constraintTemplate.count(schoolId)) > 0, and `done` additionally requires timetableRun.count(status='COMPLETED', schoolId) >= 1. Three states (done/partial/missing) covered by 3 dedicated unit tests.
- D-24 timegrid heuristic landed: periodCount >= 1 AND schoolDay.count(isActive: true, schoolId) >= 1 → done; periodCount >= 1 AND no active day → partial; no periods → missing.
- Tenant resolution via DashboardService.resolveAdminSchoolId(keycloakUserId): Person.findFirst({ where: { keycloakUserId }, select: { schoolId: true } }). Joins the canonical pattern family with calendar.service.ts:79-80 + user-context.service.ts:9-11 (third site). AuthenticatedUser carries no schoolId field — Person row is the single source of truth.
- DashboardController layered guard: @CheckPermissions({ action: 'manage', subject: 'all' }) (CASL admin shorthand → T-16-1 mitigation) + cross-tenant guard rejecting 403 when (a) no Person row exists or (b) resolved schoolId !== query.schoolId (T-16-2 mitigation).
- E2E spec covering 7 cases: admin happy-path, lehrer-403, schulleitung-403, cross-tenant-403, no-Person-403, invalid-UUID-400/422, unauthenticated-401/403. Strategy: bootstrap minimal NestJS app, stub global guards via test header. No live Keycloak/Postgres required.

## Task Commits

1. **Task 1 RED — failing module/DTO test** — `1dc6291` (test) [pre-existing on branch]
2. **Task 1 GREEN — module skeleton + DTOs registered in AppModule** — `4b78025` (feat) [pre-existing]
3. **Task 2 RED — failing service spec for 10-category aggregator + resolveAdminSchoolId** — `61fba23` (test) [pre-existing]
4. **Task 2 GREEN — implement 10-category aggregator + resolveAdminSchoolId** — `2c2297f` (feat) [recovery commit]
5. **Task 3 RED — e2e spec for /admin/dashboard/status** — `fc147cf` (test) [recovery commit]
6. **Task 3 GREEN — GET /admin/dashboard/status controller wiring** — `71b63d4` (feat) [recovery commit]

**Plan metadata:** _(this commit)_ (docs)

_Note: Plan was a TDD plan (frontmatter `tdd="true"` on every task). Each task shipped as a RED commit (failing test) + a GREEN commit (passing implementation). No REFACTOR commit was needed — all builders shipped clean on first pass._

## Files Created/Modified

**Created:**
- `apps/api/src/modules/dashboard/dashboard.module.ts` — Approach B: imports SchoolModule only, providers: [DashboardService], controllers: [DashboardController]
- `apps/api/src/modules/dashboard/dashboard.controller.ts` — `@Controller('admin/dashboard')` with `@Get('status')`, `@CheckPermissions({ action: 'manage', subject: 'all' })`, cross-tenant guard via resolveAdminSchoolId
- `apps/api/src/modules/dashboard/dashboard.service.ts` — 376 lines: getStatus(schoolId) + resolveAdminSchoolId(keycloakUserId) + 6 private build*Category methods
- `apps/api/src/modules/dashboard/dashboard.service.spec.ts` — 31 tests: 10-category status matrix + ordering + ISO timestamp + 2 resolveAdminSchoolId
- `apps/api/src/modules/dashboard/dashboard.spec.ts` — Task 1 RED smoke test for module/DTO compile
- `apps/api/src/modules/dashboard/dto/dashboard-status.dto.ts` — DashboardStatusDto + CategoryStatusDto + CategoryStatus + CategoryKey
- `apps/api/src/modules/dashboard/dto/query-dashboard.dto.ts` — @IsUUID() schoolId
- `apps/api/test/dashboard.e2e-spec.ts` — 7 integration tests with stubbed JwtAuthGuard + PermissionsGuard

**Modified:**
- `apps/api/src/app.module.ts` — appended DashboardModule to imports array

## The 17 Reads in Promise.all (DashboardService.getStatus)

| # | Read | Purpose | Tenant scope |
|---|------|---------|--------------|
| 1 | `schoolService.findOne(schoolId).catch(() => null)` | School profile + address fields for D-06 row 1 | URL/argument |
| 2 | `prisma.timeGrid.findUnique({ where: { schoolId }, include: { periods: true } })` | Period count for D-24 | `where: { schoolId }` |
| 3 | `prisma.schoolDay.count({ where: { schoolId, isActive: true } })` | Active-day gate for D-24 | `where: { schoolId }` |
| 4 | `prisma.schoolYear.findFirst({ where: { schoolId } })` | Any SY exists (partial gate) | `where: { schoolId }` |
| 5 | `prisma.schoolYear.findFirst({ where: { schoolId, isActive: true } })` | Active SY (done gate + label) | `where: { schoolId }` |
| 6 | `prisma.subject.count({ where: { schoolId } })` | Subjects category | `where: { schoolId }` |
| 7 | `prisma.teacher.count({ where: { schoolId, person: { isAnonymized: false } } })` | Active teachers | `where: { schoolId }` |
| 8 | `prisma.schoolClass.count({ where: { schoolId } })` | Classes category | `where: { schoolId }` |
| 9 | `prisma.student.count({ where: { schoolId, isArchived: false } })` | Active students | `where: { schoolId }` |
| 10 | `prisma.student.count({ where: { schoolId, isArchived: false, classId: null } })` | Students-without-class (drives partial) | `where: { schoolId }` |
| 11 | `prisma.timetableRun.count({ where: { schoolId, status: 'COMPLETED' } })` | D-23 done gate | `where: { schoolId }` |
| 12 | `prisma.constraintWeightOverride.count({ where: { schoolId } })` | D-23 configExists union part 1 | `where: { schoolId }` |
| 13 | `prisma.constraintTemplate.count({ where: { schoolId } })` | D-23 configExists union part 2 | `where: { schoolId }` |
| 14 | `prisma.retentionPolicy.count({ where: { schoolId } })` | DSGVO retention | `where: { schoolId }` |
| 15 | `prisma.dsfaEntry.count({ where: { schoolId } })` | DSGVO DSFA | `where: { schoolId }` |
| 16 | `prisma.vvzEntry.count({ where: { schoolId } })` | DSGVO VVZ | `where: { schoolId }` |
| 17 | `prisma.auditEntry.count()` | Audit category — **global count, see deviation below** | _(none — schema gap)_ |

## D-06 Status Heuristic Decisions per Category

| # | key | done | partial | missing | Source |
|---|-----|------|---------|---------|--------|
| 1 | school | name + schoolType + (street + postalCode + city) | any required field set | no school record | D-06 + Pitfall #6 |
| 2 | timegrid | ≥1 Period AND `schoolDay.count(isActive: true)` ≥ 1 | ≥1 Period but 0 active days | 0 Periods | **D-24** |
| 3 | schoolyear | active SY with name+startDate+endDate | any SY exists but not active OR incomplete | 0 SY records | D-06 |
| 4 | subjects | count ≥ 1 | (n/a) | count = 0 | D-06 |
| 5 | teachers | count ≥ 1 (Person.isAnonymized=false) | (n/a) | count = 0 | D-06 |
| 6 | classes | count ≥ 1 | (n/a) | count = 0 | D-06 |
| 7 | students | count ≥ 1 AND no `classId IS NULL` | count ≥ 1 AND ≥1 classId IS NULL | count = 0 | D-06 |
| 8 | solver | configExists AND completedRunCount ≥ 1 | configExists AND 0 COMPLETED runs | configExists=false | **D-23** |
| 9 | dsgvo | retention ≥ 1 AND dsfa ≥ 1 AND vvz ≥ 1 | retention ≥ 1 AND (dsfa=0 OR vvz=0) | retention=0 AND dsfa=0 AND vvz=0 | D-06 |
| 10 | audit | auditEntry.count ≥ 1 | (n/a) | count = 0 | D-06 |

`configExists` = `(constraintWeightOverride.count(schoolId) + constraintTemplate.count(schoolId)) > 0` (D-23 union).

## resolveAdminSchoolId Mechanism

```typescript
async resolveAdminSchoolId(keycloakUserId: string): Promise<string | null> {
  const person = await this.prisma.person.findFirst({
    where: { keycloakUserId },
    select: { schoolId: true },
  });
  return person?.schoolId ?? null;
}
```

- **Prisma model used:** `Person`
- **Field used:** `keycloakUserId` (Keycloak `sub` UUID — equals `AuthenticatedUser.id`)
- **Rationale:** `AuthenticatedUser` carries only `id` / `email` / `username` / `roles` (verified in `apps/api/src/modules/auth/types/authenticated-user.ts`). NO `user.schoolId` field exists. Admins have a `Person` row that carries their schoolId.
- **Pattern parity (verified):** Replicates the canonical pattern from `apps/api/src/modules/calendar/calendar.service.ts:79-80` and `apps/api/src/modules/user-context/user-context.service.ts:9-11`. DashboardService is the third site in the family.

## Decisions Made

- **D-23 implementation:** Solver `configExists` is the additive union of the two ConstraintWeightOverride + ConstraintTemplate counts (both schoolId-scoped). `done` additionally requires `timetableRun.count(status='COMPLETED') >= 1`.
- **D-24 implementation:** Timegrid `done` requires both `timeGrid.periods.length >= 1` AND `schoolDay.count(isActive: true) >= 1`. Partial: periods exist but no active day. Missing: no periods.
- **AuditEntry global count (deviation):** `AuditEntry` has no `schoolId` column (schema.prisma:231-249). The plan's threat-model row T-16-2 mentions a fallback to global count if absent — taken. Future schema migration could add schoolId to AuditEntry; for now an aggregated count alone has no data-leak surface (count only, no row content).
- **Class accessor name fix:** Prisma client exposes `prisma.schoolClass`, not `prisma.class` (the schema model is `SchoolClass`; "class" is a TypeScript reserved keyword and not exposed on PrismaService). The plan/spec referred to `class` — corrected per schema reality. Spec mock key updated from `class` → `schoolClass` for consistency.
- **Teacher field fix:** Plan said `person: { isArchived: false }` but `Person` has no `isArchived` field — only `isAnonymized`. Used `isAnonymized: false` instead, matching the existing pattern in `data-deletion.service.spec.ts`.
- **Cross-tenant guard at controller layer (defense in depth):** Beyond per-query `where: { schoolId }` tenant scoping in the service, the controller rejects 403 BEFORE the service touches Prisma if (a) no Person row exists for the keycloak sub, or (b) resolved schoolId !== query.schoolId. Plan called this out explicitly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Plan referred to `prisma.class.count` — Prisma client exposes `prisma.schoolClass`**
- **Found during:** Task 2 GREEN verification (TypeScript compile after wiring `getStatus`)
- **Issue:** TS error: "Property 'class' does not exist on type 'PrismaService'." The schema model is `SchoolClass` (schema.prisma:461) and the Prisma client uses the camelCase property `schoolClass`. The plan referred to it as "class" which is a TypeScript reserved keyword and not exposed on PrismaService.
- **Fix:** Service updated to use `this.prisma.schoolClass.count({ where: { schoolId } })`. Spec mock key updated from `class: { count: vi.fn() }` → `schoolClass: { count: vi.fn() }` to match.
- **Files modified:** `apps/api/src/modules/dashboard/dashboard.service.ts`, `apps/api/src/modules/dashboard/dashboard.service.spec.ts`
- **Verification:** `pnpm --filter @schoolflow/api exec tsc --noEmit` exits 0; 31/31 unit tests pass.
- **Committed in:** `2c2297f` (Task 2 GREEN commit)

**2. [Rule 1 — Bug] Plan said `person: { isArchived: false }` — Person has no `isArchived` field**
- **Found during:** Task 2 GREEN implementation
- **Issue:** Plan specified `prisma.teacher.count({ where: { schoolId, person: { isArchived: false } } })`. Schema only defines `isAnonymized` on Person (schema.prisma line 331); there is no `isArchived` field. Using the wrong filter would TS-fail.
- **Fix:** Used `person: { isAnonymized: false }`, matching the existing pattern in `apps/api/src/modules/dsgvo/data-deletion/data-deletion.service.spec.ts`.
- **Files modified:** `apps/api/src/modules/dashboard/dashboard.service.ts`
- **Verification:** TypeScript compiles; teacher-category unit tests pass with mock returning the count directly.
- **Committed in:** `2c2297f` (Task 2 GREEN commit)

**3. [Rule 2 — Missing Critical] AuditEntry global count (no schoolId column)**
- **Found during:** Task 2 GREEN implementation
- **Issue:** Plan specified `prisma.auditEntry.count({ where: { schoolId } })` with a parenthetical fallback note ("if absent, fall back to global count and document"). Schema verified absent — `AuditEntry` (schema.prisma:231-249) has no schoolId column, so the schoolId filter would TS-fail.
- **Fix:** Used `prisma.auditEntry.count()` (global). Documented as a known deviation in this SUMMARY. Future schema migration could add schoolId; aggregated count alone has no data-leak surface (count only, no row content exposed across tenants).
- **Files modified:** `apps/api/src/modules/dashboard/dashboard.service.ts`
- **Verification:** Audit-category unit tests pass (done/missing both green).
- **Committed in:** `2c2297f` (Task 2 GREEN commit)

---

**Total deviations:** 3 auto-fixed (2 Rule 1 bugs from plan/schema drift, 1 Rule 2 documented schema-gap fallback)
**Impact on plan:** All three are schema-truth corrections; none affect the user-facing contract or D-06/D-23/D-24 semantics. No scope creep.

## Issues Encountered

- **Recovery from prior parallel-executor failure.** This plan was originally attempted by a parallel-executor agent that committed Task 1 (RED + GREEN) and Task 2 RED to the branch, then failed mid-Task-2-GREEN due to a bash sandbox issue, leaving the working tree with the Task 2 GREEN service uncommitted. This sequential recovery iteration: (1) verified the working-tree service was correct via `pnpm --filter @schoolflow/api test --run dashboard.service.spec` (31/31 passing); (2) discovered + fixed the `prisma.class` → `prisma.schoolClass` TS error (Deviation #1 above); (3) committed Task 2 GREEN; (4) authored Task 3 RED + GREEN. No work was lost.
- **Pre-existing test failure in `apps/api/prisma/__tests__/school-year-multi-active.spec.ts > backfill invariant`** — unrelated to dashboard work (Phase 10 spec, last touched in `aaa3672`). Out of scope per executor SCOPE BOUNDARY rule. Logged here for visibility; no action taken.

## Self-Check

Verifying claims before declaring complete.

**Files claimed to exist:**
- `apps/api/src/modules/dashboard/dashboard.module.ts` — FOUND
- `apps/api/src/modules/dashboard/dashboard.controller.ts` — FOUND
- `apps/api/src/modules/dashboard/dashboard.service.ts` — FOUND
- `apps/api/src/modules/dashboard/dashboard.service.spec.ts` — FOUND
- `apps/api/src/modules/dashboard/dashboard.spec.ts` — FOUND
- `apps/api/src/modules/dashboard/dto/dashboard-status.dto.ts` — FOUND
- `apps/api/src/modules/dashboard/dto/query-dashboard.dto.ts` — FOUND
- `apps/api/test/dashboard.e2e-spec.ts` — FOUND

**Commits claimed to exist:**
- `1dc6291` — FOUND (Task 1 RED)
- `4b78025` — FOUND (Task 1 GREEN)
- `61fba23` — FOUND (Task 2 RED)
- `2c2297f` — FOUND (Task 2 GREEN)
- `fc147cf` — FOUND (Task 3 RED)
- `71b63d4` — FOUND (Task 3 GREEN)

**Test counts claimed:**
- Unit + module + e2e dashboard tests: 43/43 passing — VERIFIED
- TypeScript compile clean — VERIFIED

## Self-Check: PASSED

## User Setup Required

None — backend endpoint only. Frontend `useDashboardStatus` (Plan 02, already shipped) consumes this endpoint at runtime; no env vars or external service config needed.

## Next Phase Readiness

- **Plan 03 (admin route wiring):** ready — endpoint live at `GET /api/v1/admin/dashboard/status`, contract documented (DashboardStatusDto with 10 D-06 categories).
- **Plan 06 (cross-mutation invalidation):** ready — useDashboardStatus query key (`['dashboard-status']`) is the invalidation target after admin mutations. The single-round-trip aggregator design (D-10) means each invalidation triggers exactly one network call.
- **No blockers** for Wave 2 plans.

---
*Phase: 16-admin-dashboard-mobile-h-rtung*
*Plan: 01*
*Completed: 2026-04-29*
