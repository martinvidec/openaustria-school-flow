---
phase: 01-project-scaffolding-auth
plan: 03
subsystem: auth
tags: [keycloak, passport-jwt, jwks-rsa, jwt, oidc, nestjs-guards, rbac, auth-decorators]

# Dependency graph
requires:
  - phase: 01-01
    provides: pnpm + Turborepo monorepo, NestJS 11 API with Fastify adapter, Docker Compose with Keycloak 26.5.6
provides:
  - Keycloak realm 'schoolflow' with 5 roles, OIDC client, token lifetime configuration, and 5 test users
  - Custom Passport-JWT strategy validating Keycloak tokens via JWKS endpoint
  - Global JwtAuthGuard protecting all endpoints by default
  - @Public() decorator to bypass auth on specific endpoints (health)
  - @CurrentUser() param decorator extracting AuthenticatedUser from JWT
  - AuthModule wrapping PassportModule with keycloak-jwt strategy
  - Token lifetime configuration for session persistence (15min access, 8hr SSO session per AUTH-06)
affects: [01-04, 01-05, 01-06, 01-07, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: ["@nestjs/passport@^11", "passport@^0.7", "passport-jwt@^4", "jwks-rsa@^4", "@nestjs/jwt@^11", "@types/passport-jwt@^4"]
  patterns: [custom-passport-strategy, global-app-guard, public-decorator-bypass, current-user-param-decorator, keycloak-jwks-validation]

key-files:
  created:
    - docker/keycloak/realm-export.json
    - apps/api/src/modules/auth/auth.module.ts
    - apps/api/src/modules/auth/strategies/keycloak-jwt.strategy.ts
    - apps/api/src/modules/auth/guards/jwt-auth.guard.ts
    - apps/api/src/modules/auth/decorators/public.decorator.ts
    - apps/api/src/modules/auth/decorators/current-user.decorator.ts
    - apps/api/src/modules/auth/types/keycloak-token.ts
    - apps/api/src/modules/auth/types/authenticated-user.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/api/src/modules/health/health.controller.ts
    - apps/api/package.json
    - pnpm-lock.yaml

key-decisions:
  - "Custom Passport-JWT with jwks-rsa chosen over nest-keycloak-connect (NestJS 11 peer dep issue #197)"
  - "JwtAuthGuard registered as global APP_GUARD -- all endpoints protected by default, opt-out via @Public()"
  - "Token lifetimes: 15min access, 30min idle SSO, 8hr max SSO session for full school day session persistence (AUTH-06)"

patterns-established:
  - "Auth guard pattern: Global APP_GUARD with @Public() bypass via IS_PUBLIC_KEY reflector metadata"
  - "User extraction pattern: @CurrentUser() param decorator returning AuthenticatedUser with id, email, username, roles"
  - "Keycloak realm import: docker/keycloak/realm-export.json auto-imported via --import-realm on container startup"
  - "Role merging: realm_access.roles + resource_access.*.roles merged with Set deduplication in JWT validate()"

requirements-completed: [AUTH-05, AUTH-06, API-03]

# Metrics
duration: 2min
completed: 2026-03-29
---

# Phase 01 Plan 03: Keycloak Auth Integration Summary

**Keycloak realm with 5 roles and OIDC client, custom Passport-JWT strategy with JWKS validation, global auth guard with @Public() bypass, and session-persistent token configuration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-29T12:22:04Z
- **Completed:** 2026-03-29T12:24:49Z
- **Tasks:** 2
- **Files modified:** 12

## Accomplishments
- Keycloak realm 'schoolflow' exports with 5 roles (admin, schulleitung, lehrer, eltern, schueler), OIDC client, role-in-token mappers, and 5 test users for development
- Token lifetime configuration ensures sessions persist for a full school day (8hr SSO max, 15min access tokens with refresh)
- Custom Passport-JWT strategy validates Keycloak tokens via JWKS endpoint (RS256) without nest-keycloak-connect dependency
- Global JwtAuthGuard protects all endpoints by default; @Public() decorator exempts health endpoint
- @CurrentUser() decorator provides typed AuthenticatedUser extraction for all protected controllers

## Task Commits

Each task was committed atomically:

1. **Task 1: Keycloak realm export with 5 roles, OIDC client, and token lifetime configuration** - `9fb1235` (feat)
2. **Task 2: Custom Passport-JWT strategy, global auth guard, and auth decorators** - `c40c992` (feat)

## Files Created/Modified
- `docker/keycloak/realm-export.json` - Keycloak realm with 5 roles, OIDC client, token lifetimes, client scopes, protocol mappers, 5 test users
- `apps/api/src/modules/auth/auth.module.ts` - NestJS auth module wrapping PassportModule with keycloak-jwt strategy
- `apps/api/src/modules/auth/strategies/keycloak-jwt.strategy.ts` - Passport-JWT strategy validating Keycloak tokens via JWKS
- `apps/api/src/modules/auth/guards/jwt-auth.guard.ts` - Global auth guard with @Public() reflector bypass
- `apps/api/src/modules/auth/decorators/public.decorator.ts` - SetMetadata decorator for public endpoints
- `apps/api/src/modules/auth/decorators/current-user.decorator.ts` - Param decorator extracting AuthenticatedUser from request
- `apps/api/src/modules/auth/types/keycloak-token.ts` - TypeScript interface for Keycloak JWT payload
- `apps/api/src/modules/auth/types/authenticated-user.ts` - TypeScript interface for extracted user (id, email, username, roles)
- `apps/api/src/app.module.ts` - Added AuthModule import and JwtAuthGuard as global APP_GUARD
- `apps/api/src/modules/health/health.controller.ts` - Added @Public() decorator to health endpoint
- `apps/api/package.json` - Added @nestjs/passport, passport, passport-jwt, jwks-rsa, @nestjs/jwt dependencies
- `pnpm-lock.yaml` - Updated lockfile with auth dependencies

## Decisions Made
- Used custom Passport-JWT with jwks-rsa instead of nest-keycloak-connect due to NestJS 11 peer dependency incompatibility (GitHub Issue #197, v2.0.0-alpha.2 is pre-release only)
- Registered JwtAuthGuard as global APP_GUARD so all endpoints are protected by default -- endpoints opt out via @Public() decorator rather than opt in
- Configured token lifetimes for school day session persistence: 15min access tokens (short-lived for security), 30min idle SSO timeout, 8hr max SSO session (covers a full school day without re-authentication)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Keycloak realm auto-imports on container startup via `--import-realm` flag in docker-compose.yml.

## Known Stubs
None - all files contain complete implementations as specified.

## Next Phase Readiness
- Auth infrastructure ready for RBAC/CASL integration (Plan 04)
- All endpoints protected by default -- new controllers added in Plans 05-07 will require @Public() only if publicly accessible
- @CurrentUser() decorator available for all protected controllers
- Keycloak realm with test users ready for integration testing
- Token configuration supports frontend refresh flow (to be implemented in frontend phase)

## Self-Check: PASSED

All 8 created files and 4 modified files verified on disk. Both task commits (9fb1235, c40c992) verified in git log.

---
*Phase: 01-project-scaffolding-auth*
*Completed: 2026-03-29*
