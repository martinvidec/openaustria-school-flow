---
phase: 01-project-scaffolding-auth
plan: 06
subsystem: audit
tags: [audit-trail, nestjs-interceptor, prisma, dsgvo, rbac, pagination, sensitive-data]

# Dependency graph
requires:
  - phase: 01-02
    provides: Prisma 7 schema with AuditEntry model, AuditCategory enum, PrismaService
  - phase: 01-03
    provides: Keycloak JWT auth, JwtAuthGuard, @CurrentUser() decorator, AuthenticatedUser type
provides:
  - AuditService with log(), findAll() (role-scoped), and cleanup() (per-category retention)
  - AuditInterceptor globally registered for automatic mutation + sensitive read logging
  - AuditController with GET /audit endpoint for role-scoped audit trail queries
  - Prisma extension stub for future DB-level audit triggers
  - Query DTOs with pagination, date range, category, and resource filters
affects: [01-07, all-subsequent-phases]

# Tech tracking
tech-stack:
  added: []
  patterns: [global-audit-interceptor, role-scoped-visibility, per-category-retention, sensitive-resource-detection]

key-files:
  created:
    - apps/api/src/modules/audit/audit.service.ts
    - apps/api/src/modules/audit/audit.interceptor.ts
    - apps/api/src/modules/audit/audit-prisma.extension.ts
    - apps/api/src/modules/audit/audit.module.ts
    - apps/api/src/modules/audit/audit.controller.ts
    - apps/api/src/modules/audit/dto/query-audit.dto.ts
    - apps/api/src/modules/audit/dto/audit-entry-response.dto.ts
  modified:
    - apps/api/src/app.module.ts

key-decisions:
  - "AuditInterceptor registered as global APP_INTERCEPTOR in AppModule -- intercepts all routes, internally decides what to log (mutations always, sensitive reads only)"
  - "HTTP-level interceptor for Phase 1 audit logging instead of Prisma extension/DB triggers -- avoids transaction overhead per Pitfall 7"
  - "Per-category retention defaults: MUTATION=1095 days (3 years), SENSITIVE_READ=365 days (1 year) -- admin-configurable via cleanup() parameter"

patterns-established:
  - "Audit logging pattern: Global interceptor detecting resource from URL path (/api/v1/{resource}), logging mutations and sensitive reads separately"
  - "Role-scoped visibility pattern: Admin sees all, Schulleitung sees pedagogical resources, other users see only their own entries"
  - "Sensitive resource detection: SENSITIVE_RESOURCES array defines which resources trigger read logging (grades, student, teacher, user)"
  - "Body sanitization pattern: Sensitive fields (password, secret, token, credential) redacted before storage in audit metadata"

requirements-completed: [AUTH-04]

# Metrics
duration: 3min
completed: 2026-03-29
---

# Phase 01 Plan 06: Audit Trail System Summary

**Two-layer audit logging with global interceptor for mutations/sensitive reads, role-scoped query API, and per-category retention management**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-29T12:36:05Z
- **Completed:** 2026-03-29T12:39:19Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- AuditService with log(), findAll() (role-scoped: admin=all, schulleitung=pedagogical, user=own per D-06), and cleanup() with per-category configurable retention (D-07)
- AuditInterceptor globally registered as APP_INTERCEPTOR -- logs mutations (POST/PUT/PATCH/DELETE) always, sensitive reads (GET grades/student/teacher/user) only, non-sensitive reads skipped (D-05)
- AuditController at GET /audit with @CheckPermissions, pagination, date range, category, and resource filters (D-14)
- Prisma extension stub prepared for future DB-level audit triggers (Phase 2+)

## Task Commits

Each task was committed atomically:

1. **Task 1: Audit service with per-category retention, interceptor for sensitive reads, and Prisma extension** - `49f17bd` (feat)
2. **Task 2: Audit query API with role-scoped visibility and pagination** - `7ae2806` (feat)

## Files Created/Modified
- `apps/api/src/modules/audit/audit.service.ts` - Audit log CRUD, role-scoped findAll, per-category retention cleanup
- `apps/api/src/modules/audit/audit.interceptor.ts` - Global NestJS interceptor for mutation + sensitive read logging
- `apps/api/src/modules/audit/audit-prisma.extension.ts` - Prisma client extension stub for future DB-level triggers
- `apps/api/src/modules/audit/audit.module.ts` - Global NestJS module with controller, service, and interceptor
- `apps/api/src/modules/audit/audit.controller.ts` - GET /audit endpoint with role-scoped visibility and pagination
- `apps/api/src/modules/audit/dto/query-audit.dto.ts` - Query DTO with pagination, date range, category, resource, userId filters
- `apps/api/src/modules/audit/dto/audit-entry-response.dto.ts` - Response DTO for Swagger documentation
- `apps/api/src/app.module.ts` - Added AuditModule import and AuditInterceptor as global APP_INTERCEPTOR

## Decisions Made
- Registered AuditInterceptor as global APP_INTERCEPTOR in AppModule -- it intercepts all HTTP routes and internally decides what to log based on HTTP method and resource sensitivity
- Used HTTP-level interceptor for Phase 1 instead of Prisma extension or database triggers -- avoids per-query transaction overhead while still capturing all mutations and sensitive reads
- Set per-category retention defaults (MUTATION=3 years per Austrian Aufbewahrungspflicht, SENSITIVE_READ=1 year) configurable via cleanup() parameter for admin override

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Audit logging activates automatically when the API receives authenticated requests.

## Known Stubs
None - all files contain complete implementations as specified.

## Next Phase Readiness
- Audit interceptor active for all future controllers -- any new endpoint automatically gets mutation logging
- Sensitive read logging applies to grades, student, teacher, user resources -- new sensitive resources can be added to SENSITIVE_RESOURCES array
- AuditService injectable in any module via @Global() AuditModule
- Cleanup method ready for BullMQ scheduled job integration in later phases

## Self-Check: PASSED

---
*Phase: 01-project-scaffolding-auth*
*Completed: 2026-03-29*
