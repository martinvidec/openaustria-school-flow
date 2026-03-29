---
phase: 01-project-scaffolding-auth
plan: 04
subsystem: auth
tags: [casl, rbac, acl, permissions, authorization, nestjs-guards, prisma, seed-data]

# Dependency graph
requires:
  - phase: 01-02
    provides: Prisma 7 schema with Role, Permission, PermissionOverride, UserRole models and PrismaService
  - phase: 01-03
    provides: Keycloak JWT auth, global JwtAuthGuard, @Public() and @CurrentUser() decorators, AuthenticatedUser type
provides:
  - CASL ability factory loading role permissions (union of all user roles) and user-level ACL overrides from database
  - PermissionsGuard checking CASL abilities on every request with @CheckPermissions() decorator
  - @Roles() decorator for simple role-based access checks
  - ACL override CRUD API (POST/GET/DELETE /permissions/overrides) with admin-only access
  - Roles listing API (GET /permissions/roles) with default permissions
  - Seed script creating 5 roles with scoped default permissions including {{ id }} condition templates
  - Conditions interpolation replacing {{ id }} with user.id for data visibility scoping (AUTH-03)
affects: [01-05, 01-06, 01-07, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: ["@casl/ability@^6.8.0", "@casl/prisma@^1.6.1", "class-validator@^0.15.1", "class-transformer@^0.5.1", "tsx@^4.21.0"]
  patterns: [casl-ability-factory, permissions-guard-app-guard, check-permissions-decorator, db-persisted-permissions, acl-override-api, seed-script, conditions-interpolation]

key-files:
  created:
    - apps/api/src/modules/auth/casl/casl-ability.factory.ts
    - apps/api/src/modules/auth/casl/casl.module.ts
    - apps/api/src/modules/auth/guards/permissions.guard.ts
    - apps/api/src/modules/auth/decorators/check-permissions.decorator.ts
    - apps/api/src/modules/auth/decorators/roles.decorator.ts
    - apps/api/src/modules/auth/permissions/permissions.controller.ts
    - apps/api/src/modules/auth/permissions/permissions.service.ts
    - apps/api/src/modules/auth/permissions/dto/create-permission-override.dto.ts
    - apps/api/src/modules/auth/permissions/dto/permission-override-response.dto.ts
    - apps/api/prisma/seed.ts
  modified:
    - apps/api/src/modules/auth/auth.module.ts
    - apps/api/package.json
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Prisma.DbNull used for nullable JSON fields instead of null -- Prisma 7 requires explicit DbNull for JSON null values"
  - "Definite assignment assertions (!) on DTO properties -- TypeScript 6.0 strict mode requires explicit initialization markers for class-validator decorated properties"
  - "PermissionsGuard runs as second APP_GUARD (after JwtAuthGuard in AppModule) -- guard execution order: JWT resolves user, then PermissionsGuard checks abilities"
  - "Approved esbuild build scripts in pnpm onlyBuiltDependencies for tsx seed runner"

patterns-established:
  - "CASL ability factory pattern: Load role permissions (union) then apply user-level overrides, conditions interpolated with {{ id }} -> user.id"
  - "Permissions guard pattern: Global APP_GUARD checking @CheckPermissions() metadata, skipping @Public() endpoints"
  - "ACL override pattern: Upsert on unique [userId, action, subject] -- idempotent create/update"
  - "DTO pattern: class-validator decorators with definite assignment assertions for TypeScript 6.0 strict mode"
  - "Prisma JSON null pattern: Use Prisma.DbNull instead of null, cast Record<string, unknown> to Prisma.InputJsonValue"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03]

# Metrics
duration: 6min
completed: 2026-03-29
---

# Phase 01 Plan 04: RBAC + ACL Authorization Summary

**CASL-based hybrid RBAC+ACL authorization with database-persisted permissions, ACL override API, and seed data for 5 Austrian school roles with scoped conditions**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-29T12:27:33Z
- **Completed:** 2026-03-29T12:33:46Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- CaslAbilityFactory loads permissions for all user roles (union per D-04) with conditions interpolation replacing {{ id }} with user.id for data visibility scoping
- PermissionsGuard checks CASL abilities on every request, returning 403 with German error message ("Zugriff verweigert") on denial
- ACL override REST API with POST/GET/DELETE endpoints, admin-only access via @CheckPermissions({ action: 'manage', subject: 'permission' })
- Seed script creates 5 roles (admin, schulleitung, lehrer, eltern, schueler) with 21 total default permissions including scoped conditions for teachers, parents, and students

## Task Commits

Each task was committed atomically:

1. **Task 1: CASL ability factory with database-persisted permissions and ACL overrides** - `cd214c9` (feat)
2. **Task 2: ACL override API and seed data for 5 roles with default permissions** - `4e84fcd` (feat)

## Files Created/Modified
- `apps/api/src/modules/auth/casl/casl-ability.factory.ts` - Builds CASL abilities from DB for user, loads role permissions + user overrides, interpolates conditions
- `apps/api/src/modules/auth/casl/casl.module.ts` - NestJS module exporting CaslAbilityFactory
- `apps/api/src/modules/auth/guards/permissions.guard.ts` - Guard checking CASL permissions and role requirements
- `apps/api/src/modules/auth/decorators/check-permissions.decorator.ts` - @CheckPermissions() metadata decorator
- `apps/api/src/modules/auth/decorators/roles.decorator.ts` - @Roles() metadata decorator for simple role checks
- `apps/api/src/modules/auth/permissions/permissions.controller.ts` - REST controller for ACL overrides and role listing
- `apps/api/src/modules/auth/permissions/permissions.service.ts` - Service with upsert, findMany, delete for overrides
- `apps/api/src/modules/auth/permissions/dto/create-permission-override.dto.ts` - Request DTO with class-validator decorators
- `apps/api/src/modules/auth/permissions/dto/permission-override-response.dto.ts` - Response DTO for Swagger docs
- `apps/api/prisma/seed.ts` - Seed script for 5 roles with 21 default permissions
- `apps/api/src/modules/auth/auth.module.ts` - Added CaslModule, PermissionsController, PermissionsService, PermissionsGuard as APP_GUARD
- `apps/api/package.json` - Added @casl/ability, @casl/prisma, class-validator, class-transformer, tsx; added prisma:seed script
- `package.json` - Approved esbuild build scripts in pnpm onlyBuiltDependencies
- `pnpm-lock.yaml` - Updated lockfile

## Decisions Made
- Used `Prisma.DbNull` instead of `null` for nullable JSON fields -- Prisma 7 requires explicit DbNull for JSON null values, plain `null` causes type errors
- Added definite assignment assertions (`!`) on DTO class properties -- TypeScript 6.0 strict mode with `strictPropertyInitialization` requires explicit markers for class-validator decorated properties that are set by runtime validation
- Cast `Record<string, unknown>` to `Prisma.InputJsonValue` when passing conditions to Prisma -- bridges the gap between class-validator DTO types and Prisma's strict JSON input types
- Approved esbuild build scripts in root `pnpm.onlyBuiltDependencies` for tsx (TypeScript seed runner)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing class-validator and class-transformer dependencies**
- **Found during:** Task 2 (DTO creation)
- **Issue:** Plan referenced class-validator decorators (@IsString, @IsBoolean, etc.) but packages were not installed
- **Fix:** Ran `pnpm add class-validator class-transformer`
- **Files modified:** apps/api/package.json, pnpm-lock.yaml
- **Verification:** `npx nest build` compiles DTOs with 0 type errors
- **Committed in:** 4e84fcd (Task 2 commit)

**2. [Rule 1 - Bug] Prisma nullable JSON field type mismatch**
- **Found during:** Task 2 (PermissionsService)
- **Issue:** Using `?? null` for Prisma JSON fields caused type error -- Prisma 7 requires `Prisma.DbNull` for nullable JSON, and `Record<string, unknown>` doesn't match `InputJsonValue`
- **Fix:** Used `Prisma.DbNull` for null case and cast conditions to `Prisma.InputJsonValue` for defined case
- **Files modified:** apps/api/src/modules/auth/permissions/permissions.service.ts
- **Verification:** `npx nest build` compiles with 0 type errors
- **Committed in:** 4e84fcd (Task 2 commit)

**3. [Rule 1 - Bug] DTO properties missing definite assignment assertions**
- **Found during:** Task 2 (DTO compilation)
- **Issue:** TypeScript 6.0 strict mode requires initializers or definite assignment assertions for class properties
- **Fix:** Added `!` definite assignment assertions to all DTO properties
- **Files modified:** apps/api/src/modules/auth/permissions/dto/create-permission-override.dto.ts, apps/api/src/modules/auth/permissions/dto/permission-override-response.dto.ts
- **Verification:** `npx nest build` compiles with 0 type errors
- **Committed in:** 4e84fcd (Task 2 commit)

**4. [Rule 3 - Blocking] esbuild build scripts blocked by pnpm**
- **Found during:** Task 2 (tsx installation)
- **Issue:** pnpm 10 blocked esbuild postinstall script required by tsx
- **Fix:** Added `esbuild` to root package.json `pnpm.onlyBuiltDependencies`
- **Files modified:** package.json
- **Verification:** `pnpm install` runs esbuild scripts successfully
- **Committed in:** 4e84fcd (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 bugs, 2 blocking)
**Impact on plan:** All fixes necessary for correct compilation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. Seed script requires running PostgreSQL and executed migration: `cd apps/api && pnpm prisma:seed` (after `docker compose -f docker/docker-compose.yml up -d postgres` and `npx prisma migrate dev`).

## Known Stubs
None - all files contain complete implementations as specified.

## Next Phase Readiness
- Authorization infrastructure ready for all future controllers -- @CheckPermissions() and @Roles() decorators available
- PermissionsGuard automatically checks abilities on every non-@Public() request
- Seed data defines default permissions for all 5 roles -- new modules can reference these subjects (school, timetable, classbook, grades, student, teacher, user, audit, permission)
- ACL override API ready for admin UI integration
- CaslModule exported from AuthModule for use in other modules needing ability checks

## Self-Check: PASSED

---
*Phase: 01-project-scaffolding-auth*
*Completed: 2026-03-29*
