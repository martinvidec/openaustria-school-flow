---
phase: 01-project-scaffolding-auth
plan: 07
subsystem: api
tags: [swagger, openapi, oauth2, rfc-9457, problem-details, validation, vitest, casl-tests, e2e, pagination]

# Dependency graph
requires:
  - phase: 01-03
    provides: Keycloak JWT auth with realm/client config (KEYCLOAK_URL, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID)
  - phase: 01-04
    provides: CASL ability factory, PermissionsGuard, @CheckPermissions() decorator, seed data for 5 roles
  - phase: 01-05
    provides: School CRUD service with Austrian templates, SchoolModule
  - phase: 01-06
    provides: AuditInterceptor, AuditModule registered as APP_INTERCEPTOR
provides:
  - Swagger UI at /api/docs with OAuth2 authorization code flow pointing to Keycloak OIDC endpoints
  - RFC 9457 ProblemDetailFilter returning application/problem+json for all errors
  - Global ValidationPipe with whitelist, forbidNonWhitelisted, 422 status for validation errors
  - PaginationQueryDto and PaginatedResponseDto for consistent API pagination
  - Unit test suite: 5 CASL ability factory tests, 5 school service tests, 1 health controller test, 1 e2e health test
affects: [all-subsequent-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [swagger-oauth2-setup, rfc-9457-problem-details, global-validation-pipe, pagination-dto]

key-files:
  created:
    - apps/api/src/common/filters/problem-detail.filter.ts
    - apps/api/src/common/dto/pagination.dto.ts
    - apps/api/src/common/pipes/validation.pipe.ts
    - apps/api/src/modules/auth/casl/casl-ability.factory.spec.ts
    - apps/api/src/modules/school/school.service.spec.ts
    - apps/api/test/app.e2e-spec.ts
  modified:
    - apps/api/src/main.ts
    - apps/api/package.json

key-decisions:
  - "Used inline type annotations instead of importing Fastify types directly -- pnpm strict hoisting prevents direct fastify import, NestJS generic types sufficient"
  - "Moved @fastify/static from devDependencies to dependencies -- Swagger UI needs static asset serving at runtime"

patterns-established:
  - "Swagger OAuth2 pattern: DocumentBuilder.addOAuth2 with Keycloak OIDC endpoints, persistAuthorization for token persistence"
  - "RFC 9457 pattern: Global ProblemDetailFilter catches all exceptions, returns application/problem+json with type, title, status, detail, instance, traceId"
  - "Validation pipe pattern: Global ValidationPipe with whitelist, forbidNonWhitelisted, 422 status, implicit conversion"
  - "Pagination pattern: PaginationQueryDto with page/limit defaults, skip getter, PaginatedResponseDto with meta"

requirements-completed: [API-01, API-02, AUTH-06]

# Metrics
duration: 4min
completed: 2026-03-29
---

# Phase 01 Plan 07: API Polish and Testing Summary

**Swagger/OpenAPI at /api/docs with OAuth2 Keycloak flow, RFC 9457 problem details error responses, global validation pipe, and 12 passing tests across CASL, school, health, and e2e**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-29T12:48:04Z
- **Completed:** 2026-03-29T12:52:12Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Swagger UI at /api/docs with OAuth2 authorization code flow pointing to Keycloak OIDC, persistAuthorization for developer session persistence (AUTH-06)
- RFC 9457 ProblemDetailFilter returns application/problem+json with German error messages, field-level validation errors, traceId from Fastify request
- Global ValidationPipe with whitelist, forbidNonWhitelisted, implicit conversion, 422 status for validation errors
- 12 passing tests: CASL ability factory (5 scenarios: admin manage-all, scoped conditions, multi-role union, ACL overrides, empty permissions), school service (5: template creation, findAll, findOne, NotFoundException, Austrian templates), health unit + e2e (2)

## Task Commits

Each task was committed atomically:

1. **Task 1: Swagger/OpenAPI with OAuth2, RFC 9457 error filter, and validation pipe** - `81badb3` (feat)
2. **Task 2: Unit tests for CASL ability factory, school service, and e2e health check** - `c709cbe` (test)

## Files Created/Modified
- `apps/api/src/main.ts` - Full bootstrap with Swagger/OpenAPI, OAuth2, CORS, validation pipe, exception filter
- `apps/api/src/common/filters/problem-detail.filter.ts` - RFC 9457 exception filter with application/problem+json responses
- `apps/api/src/common/dto/pagination.dto.ts` - PaginationQueryDto and PaginatedResponseDto for consistent pagination
- `apps/api/src/common/pipes/validation.pipe.ts` - Global ValidationPipe factory with whitelist and 422 status
- `apps/api/package.json` - Moved @fastify/static to dependencies for Swagger UI static serving
- `apps/api/src/modules/auth/casl/casl-ability.factory.spec.ts` - 5 unit tests for CASL ability factory (AUTH-01, AUTH-02, AUTH-03, D-02, D-04)
- `apps/api/src/modules/school/school.service.spec.ts` - 5 unit tests for school service (CRUD, templates, NotFoundException)
- `apps/api/test/app.e2e-spec.ts` - E2E smoke test for /api/v1/health via Fastify inject

## Decisions Made
- Used inline type annotations for Fastify request/response in ProblemDetailFilter instead of importing from 'fastify' directly -- pnpm strict dependency hoisting prevents the import since fastify is a transitive dependency of @nestjs/platform-fastify, not a direct dependency
- Moved @fastify/static from devDependencies to dependencies -- Swagger UI requires static file serving at runtime, not just during development

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fastify type imports not resolvable in pnpm strict mode**
- **Found during:** Task 1 (ProblemDetailFilter compilation)
- **Issue:** `import { FastifyReply, FastifyRequest } from 'fastify'` fails because fastify is not a direct dependency -- it's a transitive dependency of @nestjs/platform-fastify, and pnpm strict hoisting does not expose it
- **Fix:** Replaced direct Fastify type imports with inline type annotations matching the Fastify response/request shape
- **Files modified:** apps/api/src/common/filters/problem-detail.filter.ts
- **Verification:** `npx nest build` compiles with 0 type errors
- **Committed in:** 81badb3 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary for compilation under pnpm strict dependency resolution. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required
None - no external service configuration required. Swagger UI is available immediately when the API starts. Tests run without any external services via mocked PrismaService.

## Known Stubs
None - all files contain complete implementations as specified.

## Next Phase Readiness
- Phase 01 is fully complete: project scaffolding, Prisma schema, Keycloak auth, CASL authorization, school CRUD, audit trail, Swagger docs, and test suite
- All future controllers automatically get: JWT auth guard, permissions guard, audit interceptor, validation pipe, RFC 9457 errors
- PaginationQueryDto ready for use in any list endpoint (import from common/dto/pagination.dto)
- Swagger UI documents all endpoints with OAuth2 flow for developer testing
- 12 passing tests provide regression safety for core modules

## Self-Check: PASSED

---
*Phase: 01-project-scaffolding-auth*
*Completed: 2026-03-29*
