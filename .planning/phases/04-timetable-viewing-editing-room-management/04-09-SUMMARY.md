---
phase: 04-timetable-viewing-editing-room-management
plan: 09
subsystem: api, ui
tags: [nestjs, zustand, react-query, keycloak, user-context, schoolId, timetable-perspective]

# Dependency graph
requires:
  - phase: 01-project-scaffolding-auth
    provides: JWT auth guard, Keycloak strategy, AuthenticatedUser type
  - phase: 02-school-data-model-dsgvo
    provides: Person, Student, Parent, SchoolClass Prisma models
provides:
  - "GET /api/v1/users/me endpoint resolving keycloakUserId to schoolId, role, classId"
  - "useSchoolContext Zustand store for app-wide schoolId consumption"
  - "useUserContext hook fetching user context on authenticated layout mount"
  - "Student and parent auto-perspective initialization for timetable view"
affects: [05-digital-classbook, 06-communication, 07-substitution-planning]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Zustand store + useQuery hook for server-derived global state (school context)"
    - "Authenticated layout gate pattern: show loader until user context is resolved"
    - "Role-based perspective initialization: teacher=teacher, student=class, parent=child-class"

key-files:
  created:
    - apps/api/src/modules/user-context/user-context.controller.ts
    - apps/api/src/modules/user-context/user-context.service.ts
    - apps/api/src/modules/user-context/user-context.module.ts
    - apps/api/src/modules/user-context/dto/user-context.dto.ts
    - apps/web/src/hooks/useUserContext.ts
    - apps/web/src/stores/school-context-store.ts
  modified:
    - apps/api/src/app.module.ts
    - apps/web/src/routes/_authenticated.tsx
    - apps/web/src/routes/_authenticated/timetable/index.tsx
    - apps/web/src/routes/_authenticated/admin/timetable-edit.tsx
    - apps/web/src/routes/_authenticated/admin/timetable-history.tsx
    - apps/web/src/routes/_authenticated/rooms/index.tsx
    - apps/web/src/routes/_authenticated/admin/resources.tsx

key-decisions:
  - "Backend user-context query uses request.user.id (Keycloak sub) to resolve Person via keycloakUserId"
  - "Parent resolves first child's classId for timetable perspective (ordered by ParentStudent relation)"
  - "useUserContext enabled only when !isLoaded to prevent redundant fetches with 5min staleTime"

patterns-established:
  - "User context resolution: backend endpoint + Zustand store + layout-level loader gate"
  - "School-scoped data: all route components read schoolId from useSchoolContext instead of hardcoding"

requirements-completed: [VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06, TIME-08, ROOM-03, ROOM-04, ROOM-05]

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 04 Plan 09: User Context + schoolId Resolution Summary

**Backend user-context endpoint resolving keycloakUserId to schoolId/classId, Zustand store for app-wide consumption, student/parent auto-perspective initialization**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-01T15:34:14Z
- **Completed:** 2026-04-01T16:42:59Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Backend GET /api/v1/users/me endpoint resolves authenticated user's schoolId, personType, classId (student) or childClassId (parent) from Keycloak token via Person model
- All 6 frontend route files now use real schoolId from useSchoolContext Zustand store instead of hardcoded placeholder
- Students automatically see their class timetable and parents see their first child's class timetable on login
- Authenticated layout shows loading spinner until user context is resolved, preventing API calls with invalid schoolId

## Task Commits

Each task was committed atomically:

1. **Task 1: Backend user-context endpoint** - `223f8e6` (feat) -- backend files committed by parallel agent
2. **Task 2: Frontend schoolId resolution and student/parent perspective** - `a64aad0` (feat)

## Files Created/Modified
- `apps/api/src/modules/user-context/user-context.controller.ts` - GET /api/v1/users/me endpoint
- `apps/api/src/modules/user-context/user-context.service.ts` - Person lookup by keycloakUserId with teacher/student/parent includes
- `apps/api/src/modules/user-context/user-context.module.ts` - NestJS module registration
- `apps/api/src/modules/user-context/dto/user-context.dto.ts` - Response DTO with schoolId, classId, childClassId
- `apps/api/src/app.module.ts` - UserContextModule import added
- `apps/web/src/hooks/useUserContext.ts` - React Query hook fetching /api/v1/users/me
- `apps/web/src/stores/school-context-store.ts` - Zustand store for schoolId, personType, classId
- `apps/web/src/routes/_authenticated.tsx` - Context fetch on mount, loading gate
- `apps/web/src/routes/_authenticated/timetable/index.tsx` - schoolId from store, student/parent perspective init
- `apps/web/src/routes/_authenticated/admin/timetable-edit.tsx` - schoolId from store
- `apps/web/src/routes/_authenticated/admin/timetable-history.tsx` - schoolId from store
- `apps/web/src/routes/_authenticated/rooms/index.tsx` - schoolId from store
- `apps/web/src/routes/_authenticated/admin/resources.tsx` - schoolId from store

## Decisions Made
- Backend user-context query uses `request.user.id` (Keycloak sub) mapped to `Person.keycloakUserId` for lookup
- Parent perspective defaults to first child's classId (first ParentStudent relation) -- parents with multiple children can switch via PerspectiveSelector
- useUserContext hook uses `enabled: !isLoaded` with 5min staleTime to avoid redundant fetches

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Backend files already committed by parallel 04-10 agent**
- **Found during:** Task 1
- **Issue:** The parallel agent executing plan 04-10 included the user-context backend module in its commit (223f8e6)
- **Fix:** Verified the committed files matched the plan requirements exactly; no additional backend commit needed
- **Files modified:** None (already correct)
- **Verification:** TSC clean, @Get('me') present, service contains prisma.person.findUnique
- **Committed in:** 223f8e6 (by parallel agent)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** No functional impact. Backend was already correctly implemented by parallel agent.

## Issues Encountered
- Pre-existing TSC error in `timetable-export.service.ts:331` (ICalWeekday type mismatch) unrelated to this plan's changes -- out of scope, not fixed

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- All frontend routes use real schoolId from user context
- Student and parent timetable perspectives auto-initialize
- Ready for Phase 5 (Digital Classbook) which will also need schoolId context

## Self-Check: PASSED

All created files verified on disk. Both commit hashes (223f8e6, a64aad0) found in git log.

---
*Phase: 04-timetable-viewing-editing-room-management*
*Completed: 2026-04-01*
