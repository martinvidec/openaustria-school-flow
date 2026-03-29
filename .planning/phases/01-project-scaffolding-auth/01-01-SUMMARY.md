---
phase: 01-project-scaffolding-auth
plan: 01
subsystem: infra
tags: [pnpm, turborepo, nestjs, fastify, vitest, docker-compose, postgresql, redis, keycloak, typescript, swc]

# Dependency graph
requires: []
provides:
  - pnpm + Turborepo monorepo structure with apps/* and packages/* workspaces
  - @schoolflow/shared package with Role enum (5 roles), PermissionAction, PermissionSubject enums, and API response types
  - @schoolflow/api NestJS 11 application with Fastify adapter on /api/v1 prefix
  - Health endpoint at GET /api/v1/health
  - Docker Compose dev stack with PostgreSQL 17, Redis 7, Keycloak 26.5.6
  - Vitest test infrastructure with SWC plugin configured from Wave 1
affects: [01-02, 01-03, 01-04, 01-05, 01-06, 01-07, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: [pnpm@10.33.0, turbo@2.8.21, typescript@6.0.2, nestjs@11, fastify, vitest@4.1.2, swc, docker-compose]
  patterns: [monorepo-workspace-protocol, nestjs-module-pattern, fastify-adapter, swc-builder, vitest-with-unplugin-swc]

key-files:
  created:
    - package.json
    - pnpm-workspace.yaml
    - turbo.json
    - tsconfig.base.json
    - .env.example
    - .gitignore
    - .nvmrc
    - apps/api/package.json
    - apps/api/tsconfig.json
    - apps/api/nest-cli.json
    - apps/api/vitest.config.ts
    - apps/api/src/main.ts
    - apps/api/src/app.module.ts
    - apps/api/src/modules/health/health.module.ts
    - apps/api/src/modules/health/health.controller.ts
    - apps/api/src/modules/health/health.controller.spec.ts
    - packages/shared/package.json
    - packages/shared/tsconfig.json
    - packages/shared/src/index.ts
    - packages/shared/src/constants/roles.ts
    - packages/shared/src/constants/permissions.ts
    - packages/shared/src/types/api-response.ts
    - docker/docker-compose.yml
    - docker/keycloak/.gitkeep
  modified: []

key-decisions:
  - "Added ignoreDeprecations: 6.0 to tsconfig for moduleResolution: node compatibility with TS 6.0"
  - "Excluded spec files from TSC build -- Vitest handles test compilation via SWC plugin"
  - "Removed obsolete docker-compose version attribute (v2+ ignores it)"
  - "Added pnpm.onlyBuiltDependencies for @nestjs/core and @swc/core build script approval"

patterns-established:
  - "NestJS module pattern: feature modules in src/modules/{name}/ with module, controller, service files"
  - "Workspace protocol: internal packages referenced via workspace:* in dependencies"
  - "Vitest + unplugin-swc: test files use SWC for fast compilation, separated from TSC build"
  - "Docker Compose: infrastructure services only (no API container for dev mode -- API runs locally with hot-reload)"

requirements-completed: [DEPLOY-01]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 01 Plan 01: Monorepo Scaffolding Summary

**pnpm + Turborepo monorepo with NestJS 11 Fastify API, shared types package, Vitest test infra, and Docker Compose dev stack (PostgreSQL 17, Redis 7, Keycloak 26.5.6)**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T12:07:37Z
- **Completed:** 2026-03-29T12:11:56Z
- **Tasks:** 2
- **Files modified:** 24

## Accomplishments
- Monorepo with pnpm workspaces + Turborepo operational -- `pnpm install`, `turbo build`, `turbo test` all pass
- NestJS 11 API with Fastify adapter serves GET /api/v1/health returning `{ status: "ok", timestamp, service }`
- @schoolflow/shared package exports Role enum (ADMIN, SCHULLEITUNG, LEHRER, ELTERN, SCHUELER), PermissionAction, PermissionSubject enums, and PaginatedResponse/ProblemDetail types
- Docker Compose brings up PostgreSQL 17, Redis 7-alpine, Keycloak 26.5.6 (with dedicated keycloak-db) with health checks
- Vitest configured with SWC plugin and health controller test passing from Wave 1

## Task Commits

Each task was committed atomically:

1. **Task 1: Monorepo scaffolding with pnpm workspaces, Turborepo, and shared package** - `305cddf` (feat)
2. **Task 2: NestJS API bootstrap with Fastify, health endpoint, Vitest config, and Docker Compose dev stack** - `9853041` (feat)

## Files Created/Modified
- `package.json` - Root workspace config with Turborepo, pnpm@10.33.0
- `pnpm-workspace.yaml` - Workspace definition for apps/* and packages/*
- `turbo.json` - Build orchestration with task caching
- `tsconfig.base.json` - TypeScript 6.0 base config with ES2024 target
- `.env.example` - Environment variables template for dev stack
- `.gitignore` - Standard ignores for node_modules, dist, .env, .turbo
- `.nvmrc` - Node.js 24 version pin
- `apps/api/package.json` - NestJS 11 API package with Fastify, Swagger, SWC
- `apps/api/tsconfig.json` - API TypeScript config with decorators enabled
- `apps/api/nest-cli.json` - NestJS CLI config with SWC builder
- `apps/api/vitest.config.ts` - Vitest with unplugin-swc for test compilation
- `apps/api/src/main.ts` - NestJS bootstrap with Fastify adapter, /api/v1 prefix
- `apps/api/src/app.module.ts` - Root module with ConfigModule and HealthModule
- `apps/api/src/modules/health/health.module.ts` - Health feature module
- `apps/api/src/modules/health/health.controller.ts` - Health check endpoint with Swagger decorators
- `apps/api/src/modules/health/health.controller.spec.ts` - Health controller unit test
- `packages/shared/package.json` - Shared types/constants package
- `packages/shared/tsconfig.json` - Shared package TypeScript config
- `packages/shared/src/index.ts` - Barrel export for all shared modules
- `packages/shared/src/constants/roles.ts` - 5-role enum with display names
- `packages/shared/src/constants/permissions.ts` - PermissionAction and PermissionSubject enums
- `packages/shared/src/types/api-response.ts` - PaginatedResponse and ProblemDetail interfaces
- `docker/docker-compose.yml` - Dev stack: PostgreSQL 17, Redis 7, Keycloak 26.5.6
- `docker/keycloak/.gitkeep` - Placeholder for realm import (Plan 03)

## Decisions Made
- Added `ignoreDeprecations: "6.0"` to tsconfig.base.json because TypeScript 6.0 deprecates `moduleResolution: "node"` (node10) but NestJS 11 with CommonJS still requires it
- Excluded `*.spec.ts` files from the NestJS TSC build via tsconfig exclude -- Vitest runs tests with its own SWC-based compilation pipeline
- Removed obsolete `version: "3.9"` from docker-compose.yml -- Docker Compose v2+ ignores the version field and warns about it
- Added `pnpm.onlyBuiltDependencies` to root package.json to approve post-install scripts for @nestjs/core and @swc/core

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] TypeScript 6.0 deprecation of moduleResolution: "node"**
- **Found during:** Task 1 (Monorepo scaffolding)
- **Issue:** Plan specified `"moduleResolution": "node"` but TS 6.0 treats this as deprecated and errors by default
- **Fix:** Added `"ignoreDeprecations": "6.0"` to tsconfig.base.json per TS 6.0 migration guidance
- **Files modified:** tsconfig.base.json
- **Verification:** `pnpm turbo build` passes with 0 type errors
- **Committed in:** 305cddf (Task 1 commit)

**2. [Rule 3 - Blocking] pnpm 10 build script approval required**
- **Found during:** Task 1 (pnpm install)
- **Issue:** pnpm 10 blocks postinstall scripts by default for @nestjs/core and @swc/core
- **Fix:** Added `pnpm.onlyBuiltDependencies` to root package.json to approve build scripts
- **Files modified:** package.json
- **Verification:** `pnpm install` runs build scripts successfully
- **Committed in:** 305cddf (Task 1 commit)

**3. [Rule 3 - Blocking] TSC fails on test globals in spec files**
- **Found during:** Task 2 (NestJS API build)
- **Issue:** `nest build` runs TSC type-check which includes spec files, but Vitest globals (describe, it, expect) are not in scope for TSC
- **Fix:** Added `"exclude": ["src/**/*.spec.ts", "src/**/*.e2e-spec.ts"]` to apps/api/tsconfig.json
- **Files modified:** apps/api/tsconfig.json
- **Verification:** `nest build` compiles with 0 type errors, Vitest still runs tests correctly
- **Committed in:** 9853041 (Task 2 commit)

**4. [Rule 1 - Bug] Obsolete docker-compose version attribute**
- **Found during:** Task 2 (Docker Compose validation)
- **Issue:** Plan included `version: "3.9"` but Docker Compose v2+ ignores this and warns about it
- **Fix:** Removed the `version` attribute from docker-compose.yml
- **Files modified:** docker/docker-compose.yml
- **Verification:** `docker compose config --quiet` exits 0 with no warnings
- **Committed in:** 9853041 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking TS/pnpm issues, 1 blocking build issue, 1 cosmetic bug)
**Impact on plan:** All auto-fixes necessary for correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required.

## Known Stubs
None - all files contain complete implementations as specified.

## Next Phase Readiness
- Monorepo structure ready for all subsequent plans in Phase 01
- Docker Compose stack can be started with `docker compose -f docker/docker-compose.yml up -d`
- NestJS API ready for Prisma schema (Plan 02), Keycloak integration (Plan 03), and RBAC (Plan 04)
- Vitest test infrastructure available for TDD from Wave 1

## Self-Check: PASSED

All 24 created files verified on disk. Both task commits (305cddf, 9853041) verified in git log.

---
*Phase: 01-project-scaffolding-auth*
*Completed: 2026-03-29*
