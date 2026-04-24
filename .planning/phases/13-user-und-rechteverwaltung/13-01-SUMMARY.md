---
phase: 13-user-und-rechteverwaltung
plan: 01
subsystem: auth
tags: [keycloak, casl, prisma, rbac, zod, nestjs, rfc-9457]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: CaslAbilityFactory, AuditInterceptor, PermissionsGuard, PrismaService, KeycloakAdminService (Phase 12 base)
  - phase: 11-teacher
    provides: TeacherService.linkKeycloakUser (the canonical mirror template)
  - phase: 12-stammdaten
    provides: ParentService, StudentService (CRUD surface; this plan adds keycloak-link methods)
provides:
  - "GET /admin/users — paginated hybrid Keycloak + DB user list"
  - "GET /admin/users/:userId — KC fields + roles + personLink hydration"
  - "PUT /admin/users/:userId/enabled — KC enabled toggle"
  - "POST/DELETE /admin/users/:userId/link-person — Person link with two-sided pre-check"
  - "GET /admin/users/:userId/effective-permissions — flat permissions list with source attribution"
  - "GET /admin/roles + GET/PUT /admin/users/:userId/roles — role CRUD with LOCK-01 mirror-write"
  - "POST/PUT/DELETE/GET /admin/permission-overrides — per-user ACL CRUD"
  - "Student/Parent {link,unlink}KeycloakUser parity with Teacher (Phase 11)"
  - "@schoolflow/shared interpolateConditions util"
  - "@schoolflow/shared Zod schemas: updateUserRolesSchema, createPermissionOverrideSchema, updatePermissionOverrideSchema, linkPersonSchema, keycloakUserQuerySchema"
affects: [13-02 (frontend), 13-03 (E2E)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "LOCK-01 mirror-write — Postgres + Keycloak realm-role mappings stay in sync from a Serializable transaction; KC mirror after DB commit, log-only on KC failure"
    - "Two-sided person-link pre-check — silent link-theft prevention by validating BOTH the user-side and the person-side before dispatching"
    - "Shared interpolateConditions util — single source of truth for {{ id }} replacement, consumed by CaslAbilityFactory AND EffectivePermissionsService"
    - "Hybrid KC+DB pagination with totalIsApproximate flag for post-filtered queries (RESEARCH Pitfall 5)"

key-files:
  created:
    - apps/api/prisma/migrations/20260424120000_add_override_updated_at_and_reason/migration.sql
    - packages/shared/src/permissions/interpolate-conditions.ts (+ spec)
    - packages/shared/src/schemas/user-role.schema.ts (+ spec)
    - packages/shared/src/schemas/permission-override.schema.ts (+ spec)
    - packages/shared/src/schemas/person-link.schema.ts (+ spec)
    - packages/shared/src/schemas/keycloak-user-query.schema.ts (+ spec)
    - apps/api/src/modules/user-directory/user-directory.module.ts
    - apps/api/src/modules/user-directory/user-directory.service.ts (+ spec)
    - apps/api/src/modules/user-directory/user-directory.controller.ts
    - apps/api/src/modules/user-directory/dto/user-directory-query.dto.ts
    - apps/api/src/modules/user-directory/dto/link-person.dto.ts
    - apps/api/src/modules/role-management/role-management.module.ts
    - apps/api/src/modules/role-management/role-management.service.ts (+ spec)
    - apps/api/src/modules/role-management/role-management.controller.ts
    - apps/api/src/modules/role-management/dto/update-user-roles.dto.ts
    - apps/api/src/modules/permission-override/permission-override.module.ts
    - apps/api/src/modules/permission-override/permission-override.service.ts (+ spec)
    - apps/api/src/modules/permission-override/permission-override.controller.ts
    - apps/api/src/modules/permission-override/dto/create-permission-override.dto.ts
    - apps/api/src/modules/permission-override/dto/update-permission-override.dto.ts
    - apps/api/src/modules/effective-permissions/effective-permissions.module.ts
    - apps/api/src/modules/effective-permissions/effective-permissions.service.ts (+ spec)
    - apps/api/README.md
  modified:
    - apps/api/prisma/schema.prisma (PermissionOverride: +updatedAt, +reason)
    - packages/shared/src/index.ts
    - apps/api/src/modules/auth/casl/casl-ability.factory.ts (uses shared interpolateConditions)
    - apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts (+ 8 methods)
    - apps/api/src/modules/keycloak-admin/keycloak-admin.service.spec.ts (+ 11 tests)
    - apps/api/src/modules/student/student.service.ts (+ link/unlinkKeycloakUser)
    - apps/api/src/modules/student/student.service.spec.ts (+ 4 tests)
    - apps/api/src/modules/student/student.controller.ts (+ keycloak-link endpoints)
    - apps/api/src/modules/parent/parent.service.ts (+ link/unlinkKeycloakUser)
    - apps/api/src/modules/parent/parent.service.spec.ts (+ 4 tests)
    - apps/api/src/modules/parent/parent.controller.ts (+ keycloak-link endpoints)
    - apps/api/src/app.module.ts (registered 4 new modules)

key-decisions:
  - "LOCK-01 (mirror-write) confirmed in role-management.service.ts; CASL factory remains JWT-driven, DB userRole is a denormalised cache for filter queries"
  - "Person-side link-theft pre-check ADDED beyond the planner's checklist; without it a bare UPDATE Person.keycloakUserId silently steals the link without raising P2002 (USER-05-LINK-02 invariant)"
  - "Migration uses DEFAULT CURRENT_TIMESTAMP NOT NULL on permission_overrides.updated_at — Prisma's auto-generator emitted NOT NULL without default; rewrote manually so migrate replay never fails on a non-empty table"
  - "KC mirror-write skip-empty diffs (toAdd.length === 0 short-circuits) for clean test assertions and adapter symmetry"
  - "AI-safety guard: Prisma 7 blocks `prisma migrate reset --force` under Claude Code; verified via `prisma migrate deploy` + information_schema.columns instead. CI / human-invoked reset replay is the residual coverage"

patterns-established:
  - "Shared permission-related Zod schemas re-exportable from @schoolflow/shared/permissions and /schemas — frontend and backend share shape contracts"
  - "RFC 9457 problem-detail with `affectedEntities` extension on every link/role conflict — UI's AffectedEntitiesList renders kind=user|person-* chips"
  - "EffectivePermissionsRow shape with discriminated `source` union (kind:'role' vs kind:'override') is the canonical admin-read model"

requirements-completed:
  - USER-01
  - USER-02
  - USER-03
  - USER-04
  - USER-05

# Metrics
duration: 41min
completed: 2026-04-24
---

# Phase 13 Plan 01: User- und Rechteverwaltung Backend Foundation Summary

**4 new admin modules + extended Keycloak adapter + shared Zod/permissions util ship the full /api/v1/admin/{users,roles,permission-overrides} surface required by Plan 13-02 (frontend) and 13-03 (E2E).**

## Performance

- **Duration:** ~41 min
- **Started:** 2026-04-24T21:38:15Z
- **Completed:** 2026-04-24T22:19:26Z
- **Tasks:** 3
- **Files modified/created:** 41

## Accomplishments

- Prisma migration `20260424120000_add_override_updated_at_and_reason` — `updated_at` (DEFAULT CURRENT_TIMESTAMP, backfills) + nullable `reason` on `permission_overrides`. Hygiene check passes.
- Shared `@schoolflow/shared` interpolateConditions util consumed by both CaslAbilityFactory (runtime) and EffectivePermissionsService (admin read) — single source of truth for `{{ id }}` replacement, eliminates drift.
- 4 shared Zod schemas: updateUserRoles, create/updatePermissionOverride, linkPerson, keycloakUserQuery. Each with companion .spec.ts (24 cases total).
- KeycloakAdminService extended with findUsers / countUsers / findUserById / setEnabled / listRealmRoleMappings / addRealmRoleMappings / delRealmRoleMappings / findRealmRoleByName. 11 mocked-contract tests.
- UserDirectoryService — hybrid KC + DB list with role + person-link hydration, post-filter `totalIsApproximate` semantics. linkPerson includes the user-side AND person-side conflict pre-checks (the latter prevents silent link-theft per USER-05-LINK-02). 14 unit tests.
- RoleManagementService — LOCK-01 mirror-write inside Serializable transaction with min-1-admin guard surfacing as RFC 9457 409. KC mirror failure logs but does not throw (T-13-10 residual risk). 7 unit tests.
- PermissionOverrideService — CRUD with P2002 → 409 schoolflow://errors/override-duplicate translation. 7 unit tests.
- EffectivePermissionsService — flat permission rows with discriminated `source` union (role vs. override) and pre-interpolated conditions. 5 unit tests.
- StudentService and ParentService now mirror TeacherService.{link,unlink}KeycloakUser. 8 new unit tests.
- HTTP surface complete under `/api/v1/admin/*` with `@CheckPermissions({ action: 'manage', subject: 'user'|'permission-override' })` guards on every endpoint.

## Task Commits

1. **Task 1: Prisma migration + shared permissions util + shared Zod schemas** — `0214148` (feat)
2. **Task 2: KeycloakAdminService extension + UserDirectory + RoleManagement + PermissionOverride modules** — `17ad173` (feat)
3. **Task 3: EffectivePermissionsService + Student/Parent linkKeycloakUser + UserDirectory dispatcher wiring** — `bc4c42a` (feat)

## API Endpoint Inventory

| Method | Path                                                | Guard            | Description                          |
| ------ | --------------------------------------------------- | ---------------- | ------------------------------------ |
| GET    | /api/v1/admin/users                                 | manage user      | Hybrid KC+DB user directory           |
| GET    | /api/v1/admin/users/:userId                         | manage user      | Single user detail                    |
| PUT    | /api/v1/admin/users/:userId/enabled                 | manage user      | Toggle KC enabled flag                |
| POST   | /api/v1/admin/users/:userId/link-person             | manage user      | Link KC user to Person                |
| DELETE | /api/v1/admin/users/:userId/link-person             | manage user      | Unlink KC user (idempotent)           |
| GET    | /api/v1/admin/users/:userId/effective-permissions   | manage user      | Flat permissions w/ source attribution |
| GET    | /api/v1/admin/roles                                 | manage user      | List all seeded roles                 |
| GET    | /api/v1/admin/users/:userId/roles                   | manage user      | List a user's roles                   |
| PUT    | /api/v1/admin/users/:userId/roles                   | manage user      | LOCK-01 mirror-write                  |
| GET    | /api/v1/admin/permission-overrides                  | manage permission-override | List overrides per userId   |
| POST   | /api/v1/admin/permission-overrides                  | manage permission-override | Create override             |
| PUT    | /api/v1/admin/permission-overrides/:id              | manage permission-override | Update override             |
| DELETE | /api/v1/admin/permission-overrides/:id              | manage permission-override | Delete override             |
| PATCH  | /api/v1/students/:id/keycloak-link                  | update student   | Link KC user to student person       |
| DELETE | /api/v1/students/:id/keycloak-link                  | update student   | Unlink                                |
| PATCH  | /api/v1/parents/:id/keycloak-link                   | update parent    | Link KC user to parent person         |
| DELETE | /api/v1/parents/:id/keycloak-link                   | update parent    | Unlink                                |

## LOCK-01 Decision Confirmation

LOCK-01 (mirror-write) is documented in `apps/api/src/modules/role-management/role-management.service.ts` class doc-comment AND inline. The service:

1. Opens a Serializable Prisma `$transaction`.
2. Validates every requested role name exists; rejects unknown roles with `BadRequestException`.
3. Replaces `prisma.userRole` rows (deleteMany → createMany).
4. Counts admin users globally; trips RFC 9457 409 `schoolflow://errors/last-admin-guard` if `< 1` (rolls back tx).
5. AFTER tx commit: diffs current KC realm-role mappings vs. desired, fires `addRealmRoleMappings` / `delRealmRoleMappings` (skipping empty diffs).
6. KC mirror failure logs at error level; DB wins. Admin re-applying the same role set reconciles (T-13-10 residual risk documented).

CaslAbilityFactory was NOT modified for role-loading semantics — JWT roles remain authoritative for the runtime `AppAbility` build (PermissionsGuard sees what KC sees). The factory was refactored to import shared `interpolateConditions` (Task 1); the 11 existing factory specs remain green.

## Migration Filename + Backfill Behavior

- **Filename:** `apps/api/prisma/migrations/20260424120000_add_override_updated_at_and_reason/migration.sql`
- **Renamed from auto-generated `20260424214115_*` to match plan timestamp**
- **SQL (rewritten from auto-generated):**
  ```sql
  ALTER TABLE "permission_overrides" ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
  ALTER TABLE "permission_overrides" ADD COLUMN "reason" TEXT;
  ```
- **Backfill:** existing rows (none in dev DB at execution time) get `updated_at = NOW()`, `reason = NULL`. Subsequent writes use Prisma's `@updatedAt` semantics.
- **Replay safety:** the DEFAULT CURRENT_TIMESTAMP is critical — Prisma's first-pass auto-generator omitted it (would have failed `prisma migrate reset` on any non-empty table).

## Decisions Made

- **LOCK-01 mirror-write** — confirmed and implemented exactly per planner's lock decision. KC remains JWT-authoritative, prisma.userRole is a denormalised cache.
- **Person-side pre-check (USER-05-LINK-02)** — added beyond the planner's checklist (the planner mentioned it but as a should-do; it's now a must-do because the silent-link-theft test in 13-VALIDATION.md will fail without it). The check fires BEFORE service dispatch, so a 409 leaves the system in its starting state.
- **Migration SQL rewritten** — Prisma's auto-generator emitted `ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL` (no default), which would fail on any existing row. Rewrote with `DEFAULT CURRENT_TIMESTAMP` (Rule 1 / 3 deviation, see below).
- **AI-safety guard for `prisma migrate reset`** — Prisma 7 refuses destructive ops under Claude Code without explicit `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION`. Verified migration via `prisma migrate deploy` + `_prisma_migrations` table + `information_schema.columns` instead; full-reset replay is deferred to CI / human-invoked run (logged in deferred-items).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] Prisma auto-generated migration missing DEFAULT on `updated_at`**

- **Found during:** Task 1
- **Issue:** `pnpm exec prisma migrate dev --create-only` emitted `ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL` — no default, no backfill. On any non-empty `permission_overrides` table this migration fails with `column "updated_at" of relation "permission_overrides" contains null values`. The plan's `<behavior>` explicitly required `DEFAULT CURRENT_TIMESTAMP NOT NULL` for backfill safety.
- **Fix:** Rewrote `migration.sql` by hand to use `ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP`. `reason` stays nullable as planned.
- **Files modified:** `apps/api/prisma/migrations/20260424120000_add_override_updated_at_and_reason/migration.sql`
- **Verification:** `prisma migrate deploy` succeeded; `_prisma_migrations` row records finished_at; `information_schema.columns` shows `column_default = CURRENT_TIMESTAMP` for `updated_at`.
- **Committed in:** `0214148`

**2. [Rule 3 — Blocking] Renamed migration folder timestamp to match plan**

- **Found during:** Task 1
- **Issue:** `--create-only` used the runtime timestamp `20260424214115_*`, plan files_modified expected `20260424120000_*`.
- **Fix:** `mv` to the plan-mandated timestamp (history is one-shot append-only; renaming a not-yet-applied migration is safe pre-deploy).
- **Files modified:** migration folder rename only.
- **Committed in:** `0214148`

**3. [Rule 2 — Missing Critical] `delRealmRoleMappings` short-circuit at service layer for empty diffs**

- **Found during:** Task 2 (role-management spec)
- **Issue:** Service called `kcAdmin.delRealmRoleMappings(userId, [])` unconditionally even when diff was empty. The KC adapter short-circuits empty arrays internally, but unit tests that mock the adapter directly saw the call regardless — produced a false-negative test failure.
- **Fix:** Skip the adapter call entirely when `toAdd.length === 0` / `toRemove.length === 0`. Adapter still has its own short-circuit for safety (defence-in-depth).
- **Files modified:** `apps/api/src/modules/role-management/role-management.service.ts`
- **Verification:** all 7 role-management spec cases green.
- **Committed in:** `17ad173`

**4. [Rule 3 — Blocking] Renamed `effectivePermissions` field → `effectivePermissionsService` in user-directory.controller.ts**

- **Found during:** Task 3 (`pnpm --filter @schoolflow/api build`)
- **Issue:** Constructor param `effectivePermissions` collided with the `@Get(':userId/effective-permissions') async effectivePermissions(...)` method name. TypeScript flagged TS2300 duplicate identifier.
- **Fix:** Renamed the field to `effectivePermissionsService`. Method name stays as the route handler.
- **Files modified:** `apps/api/src/modules/user-directory/user-directory.controller.ts`
- **Committed in:** `bc4c42a`

**5. [Rule 3 — Blocking] Type-cast UserDirectoryService dispatcher for the Task 2 build**

- **Found during:** Task 2 (`pnpm --filter @schoolflow/api build`)
- **Issue:** Task 2 plan listed `apps/api/src/app.module.ts` and required build green, but Task 3 was the place that actually adds Student/Parent linkKeycloakUser methods. Task 2 build failed TS2339 on those calls.
- **Fix:** Used `(this.studentService as any).linkKeycloakUser(...)` casts in Task 2; Task 3 removes the casts after the methods are wired. Documented in Task 2 commit body.
- **Files modified:** `apps/api/src/modules/user-directory/user-directory.service.ts` (cast in Task 2; cast removed in Task 3 commit `bc4c42a`)
- **Committed in:** `17ad173` (introduced) → `bc4c42a` (resolved)

---

**Total deviations:** 5 auto-fixed (1 Rule 1 / 2 Rule 2 / 2 Rule 3)
**Impact on plan:** All deviations either preserved planned behaviour (Rule 1 migration backfill), shipped a planner-acknowledged invariant (Rule 2 mirror-write empty-diff handling at service layer; Rule 2 implicit because plan instructed an unconditional call), or were trivial type/identifier fixes during the build (Rule 3). No scope creep; no architectural changes.

## Issues Encountered

- **Stale Postgres advisory lock from a runaway `prisma migrate dev` invocation** — The first `prisma migrate dev` invocation went into background and failed silently (output file empty). When retried, Prisma blocked on `pg_advisory_lock(72707369)`. Resolved with `pg_terminate_backend` on the stale pid via `psql`. Subsequent `prisma migrate deploy` succeeded.
- **Prisma 7 AI-safety guard blocks `prisma migrate reset`** — Documented in deferred-items.md; verification path via `prisma migrate deploy` + DB inspection covers the same invariant for this execution.

## Verification Status

| Check                                                                                    | Status |
| ---------------------------------------------------------------------------------------- | ------ |
| `pnpm --filter @schoolflow/shared test --run` (interpolate + 4 schemas)                  | 192 / 193 (1 pre-existing failure, deferred) |
| `pnpm --filter @schoolflow/api exec vitest run casl-ability.factory.spec`                | 11 / 11 |
| `pnpm --filter @schoolflow/api exec vitest run keycloak-admin.service.spec`              | 15 / 15 |
| `pnpm --filter @schoolflow/api exec vitest run user-directory.service.spec`              | 14 / 14 |
| `pnpm --filter @schoolflow/api exec vitest run role-management.service.spec`             | 7 / 7   |
| `pnpm --filter @schoolflow/api exec vitest run permission-override.service.spec`         | 7 / 7   |
| `pnpm --filter @schoolflow/api exec vitest run effective-permissions.service`            | 5 / 5   |
| `pnpm --filter @schoolflow/api exec vitest run student.service.spec parent.service.spec` | 42 / 42 |
| `pnpm --filter @schoolflow/api build`                                                    | 0 errors, 426 files compiled |
| `bash scripts/check-migration-hygiene.sh`                                                | OK |
| `prisma migrate deploy`                                                                  | 9 migrations recorded; `permission_overrides.updated_at + reason` columns present |

**Plan-level total:** 101 / 101 specs green for the eight Phase 13-01 spec files.

## Next Phase Readiness

- **Plan 13-02 (frontend) is unblocked** — every API endpoint listed in 13-UI-SPEC.md exists, every German error message + RFC 9457 type URI is wired, every Zod schema is exposed from `@schoolflow/shared`.
- **Plan 13-03 (E2E) test scaffolds** can hit the live `/api/v1/admin/*` surface as soon as Plan 13-02 lands — UAT-stable backend.
- **Operator action required before production:** the Keycloak service-account client must be granted `view-users`, `manage-users`, `view-realm` (+ optional `query-users`) under `realm-management`. Documented in `apps/api/README.md`.

## Self-Check: PASSED

All 14 spot-checked files exist (FOUND); all 3 task commits (`0214148`, `17ad173`, `bc4c42a`) are reachable from `git log --oneline --all`.
