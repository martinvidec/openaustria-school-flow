---
phase: 01-project-scaffolding-auth
plan: 02
subsystem: database
tags: [prisma, postgresql, orm, schema, driver-adapter, nestjs, rbac, audit]

# Dependency graph
requires:
  - phase: 01-01
    provides: pnpm + Turborepo monorepo, NestJS 11 API with Fastify adapter, Docker Compose with PostgreSQL 17
provides:
  - Prisma 7 schema with 12 models covering school profile, RBAC/ACL, and audit trail
  - PrismaService with PrismaPg driver adapter (Prisma 7 architecture)
  - Global PrismaModule injectable across all NestJS modules
  - prisma.config.ts for Prisma 7 CLI configuration
  - Enums for SchoolType (5 Austrian types), DayOfWeek, AuditCategory
affects: [01-03, 01-04, 01-05, 01-06, 01-07, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: [prisma@7.6.0, "@prisma/adapter-pg@7.6.0", "pg@8.20.0", "@types/pg@8.20.0"]
  patterns: [prisma7-driver-adapter, prisma7-cjs-module-format, global-prisma-module, schema-first-orm]

key-files:
  created:
    - apps/api/prisma/schema.prisma
    - apps/api/prisma.config.ts
    - apps/api/src/config/database/prisma.service.ts
    - apps/api/src/config/database/prisma.module.ts
  modified:
    - apps/api/package.json
    - apps/api/src/app.module.ts
    - package.json
    - pnpm-lock.yaml

key-decisions:
  - "Prisma 7.6.0 generates client directly into output folder (not prisma/ subfolder) -- adjusted import path from plan accordingly"
  - "Approved @prisma/engines and prisma build scripts in root pnpm onlyBuiltDependencies"

patterns-established:
  - "Prisma 7 driver adapter pattern: PrismaPg with connectionString from ConfigService, passed as adapter to PrismaClient super()"
  - "Import PrismaClient from generated output path (./generated/client.js), never from @prisma/client"
  - "Global PrismaModule: @Global() decorator enables injection in any module without explicit imports"
  - "Schema uses @@map() for snake_case table/column names with camelCase TypeScript fields"

requirements-completed: [FOUND-01, AUTH-01, AUTH-02, AUTH-04]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 01 Plan 02: Prisma Schema & Database Layer Summary

**Prisma 7 schema with 12 models (school profile, RBAC/ACL, audit trail), PrismaPg driver adapter service, and global NestJS module**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T12:15:40Z
- **Completed:** 2026-03-29T12:19:46Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Prisma 7 schema defines all Phase 1 data models: School (with TimeGrid, Period, SchoolDay, SchoolYear, Holiday, AutonomousDay), RBAC (Role, Permission, PermissionOverride, UserRole), and AuditEntry
- PrismaService uses Prisma 7's driver-adapter architecture with PrismaPg for PostgreSQL connectivity
- PrismaModule is globally available -- any NestJS module can inject PrismaService without additional imports
- Schema uses CJS module format for NestJS compatibility (Pitfall 1 avoided)

## Task Commits

Each task was committed atomically:

1. **Task 1: Prisma 7 schema with all Phase 1 models and driver-adapter configuration** - `2cbbc5c` (feat)
2. **Task 2: PrismaService with driver adapter and global PrismaModule** - `37fd9d4` (feat)

## Files Created/Modified
- `apps/api/prisma/schema.prisma` - Complete Phase 1 data model with 12 models, 3 enums, indexes, and unique constraints
- `apps/api/prisma.config.ts` - Prisma 7 CLI configuration with earlyAccess flag and schema path
- `apps/api/src/config/database/prisma.service.ts` - PrismaClient with PrismaPg driver adapter, lifecycle hooks
- `apps/api/src/config/database/prisma.module.ts` - Global NestJS module exporting PrismaService
- `apps/api/src/app.module.ts` - Added PrismaModule to root module imports
- `apps/api/package.json` - Added @prisma/client, @prisma/adapter-pg, pg, prisma, @types/pg
- `package.json` - Approved @prisma/engines and prisma build scripts in pnpm config
- `pnpm-lock.yaml` - Updated lockfile with Prisma dependencies

## Decisions Made
- Adjusted PrismaClient import path from `./generated/prisma/client.js` (plan) to `./generated/client.js` (actual) because Prisma 7.6.0 generates files directly into the output directory without a `prisma/` subfolder
- Added `@prisma/engines` and `prisma` to `pnpm.onlyBuiltDependencies` in root package.json to approve Prisma post-install scripts (pnpm 10 blocks them by default)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Prisma 7.6.0 generated client path differs from plan**
- **Found during:** Task 1 (Prisma generate)
- **Issue:** Plan specified import path `./generated/prisma/client.js` but Prisma 7.6.0 generates `client.ts` directly in the output directory (`./generated/client.js`)
- **Fix:** Used `./generated/client.js` as the import path in PrismaService
- **Files modified:** apps/api/src/config/database/prisma.service.ts
- **Verification:** `npx nest build` compiles with 0 type errors
- **Committed in:** 37fd9d4 (Task 2 commit)

**2. [Rule 3 - Blocking] pnpm 10 blocked Prisma build scripts**
- **Found during:** Task 1 (pnpm add prisma)
- **Issue:** pnpm 10 blocks postinstall scripts for @prisma/engines and preinstall for prisma by default
- **Fix:** Added `@prisma/engines` and `prisma` to root package.json `pnpm.onlyBuiltDependencies`
- **Files modified:** package.json
- **Verification:** `pnpm install` runs Prisma build scripts successfully
- **Committed in:** 2cbbc5c (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (both blocking issues)
**Impact on plan:** Both fixes necessary for correct operation. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviations above.

## User Setup Required
None - no external service configuration required. Database migration (`prisma migrate dev`) requires PostgreSQL to be running (via `docker compose -f docker/docker-compose.yml up -d postgres`).

## Known Stubs
None - all files contain complete implementations as specified.

## Next Phase Readiness
- Database schema ready for all Phase 1 modules (auth, school CRUD, audit)
- PrismaModule globally available for injection in upcoming Plans 03-07
- Migration can be run when PostgreSQL is available: `cd apps/api && npx prisma migrate dev --name init`
- Schema ready for seed data (Austrian school type templates) in Plan 05

## Self-Check: PASSED

---
*Phase: 01-project-scaffolding-auth*
*Completed: 2026-03-29*
