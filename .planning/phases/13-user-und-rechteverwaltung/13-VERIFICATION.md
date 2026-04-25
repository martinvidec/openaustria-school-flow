---
phase: 13-user-und-rechteverwaltung
verified: 2026-04-25T06:39:36Z
status: passed
score: 11/11 must-haves verified (5/5 ROADMAP success criteria + 6 plan-merged truths)
overrides_applied: 0
re_verification: false
requirements_coverage:
  - id: USER-01
    plans: [13-01, 13-02, 13-03]
    status: SATISFIED
  - id: USER-02
    plans: [13-01, 13-02, 13-03]
    status: SATISFIED
  - id: USER-03
    plans: [13-01, 13-02, 13-03]
    status: SATISFIED
  - id: USER-04
    plans: [13-01, 13-02, 13-03]
    status: SATISFIED
  - id: USER-05
    plans: [13-01, 13-02, 13-03]
    status: SATISFIED
---

# Phase 13: User- und Rechteverwaltung Verification Report

**Phase Goal:** Admin kann Keycloak-User listen, Rollen zuweisen, CASL-ACL-Overrides pflegen und User mit Person-Records verknüpfen.
**Verified:** 2026-04-25T06:39:36Z
**Status:** passed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (merged ROADMAP success criteria + 13-01/02/03 plan must-haves)

| #   | Truth                                                                                                                                                            | Status     | Evidence                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | (ROADMAP SC-1) Admin sees Keycloak user list with search/filter (name/email/role) — backend (13-01) + UI (13-02)                                                 | PASSED | Backend: `GET /admin/users` in `apps/api/src/modules/user-directory/user-directory.controller.ts:34` consumes `KeycloakAdminService.findUsers/countUsers` (verified at lines 75-76 of service). Frontend: `apps/web/src/routes/_authenticated/admin/users.index.tsx` (144 LOC) renders `UserListTable` + `UserFilterBar` (264 LOC, with Name/Email/Rolle/Linked/Enabled filters). E2E: `admin-users-list.spec.ts` (5 tests). |
| 2   | (ROADMAP SC-2) Admin can assign one or more of the 5 roles (Admin, Schulleitung, Lehrer, Eltern, Schüler) to a user                                              | PASSED | Backend: `PUT /admin/users/:userId/roles` in `role-management.controller.ts` calls `RoleManagementService.updateRoles` which mirror-writes via `kcAdmin.addRealmRoleMappings/delRealmRoleMappings` (lines 120-123) inside Serializable transaction with min-1-admin guard. Frontend: `UserRolesTab.tsx` (226 LOC) + `use-update-user-roles.ts` (53 LOC). E2E: `admin-user-roles.spec.ts` (4 tests).                          |
| 3   | (ROADMAP SC-3) Admin sees per-user effective CASL permissions with role inheritance                                                                              | PASSED | Backend: `effective-permissions.service.ts:80` LOC pulls roles + overrides + interpolates conditions via `interpolateConditions` from `@schoolflow/shared`. Frontend: `EffectivePermissionsTab.tsx` (122 LOC) + `EffectivePermissionsRow.tsx` (84 LOC) renders accordion-grouped abilities with `SourceChip` ("Rolle: admin" or "Override"). E2E: `admin-user-permissions.spec.ts` (2 tests).                                |
| 4   | (ROADMAP SC-4 / Plan-derived) Admin can create/edit/delete per-user ACL overrides (subject + action + condition)                                                | PASSED | Backend: `permission-override.controller.ts` `@Controller('admin/permission-overrides')` with full CRUD, P2002 → 409 `schoolflow://errors/override-duplicate`. Frontend: `OverridesSection.tsx` (91) + `OverrideRow.tsx` (301 LOC, 2-click delete). Migration `20260424120000_add_override_updated_at_and_reason/migration.sql` adds `updated_at` + `reason`. E2E: `admin-user-overrides.spec.ts` (5 tests).                  |
| 5   | (ROADMAP SC-5 / Plan-derived) Admin can link a Keycloak user with Teacher/Student/Parent Person record AND unlink it                                            | PASSED | Backend: `user-directory.service.ts:312-323` dispatches by `personType` to `teacherService/studentService/parentService.linkKeycloakUser`; both Student and Parent expose link/unlink (verified at parent.service.ts:145/161 and student.service.ts:345/361). Frontend: `LinkPersonDialog.tsx` (148) + `PersonAutocompletePopover.tsx` (169) + `ReLinkConflictDialog.tsx` (145). E2E: `admin-user-person-link.spec.ts` (3 tests). |
| 6   | (Plan must-have) `interpolateConditions` is a SHARED util consumed by BOTH CaslAbilityFactory and EffectivePermissionsService — no algorithm drift              | PASSED | `packages/shared/src/permissions/interpolate-conditions.ts` exists. Imported by `apps/api/src/modules/auth/casl/casl-ability.factory.ts:3` AND `apps/api/src/modules/effective-permissions/effective-permissions.service.ts:2` (both verified via grep).                                                                                                                                                                  |
| 7   | (Plan must-have) Sidebar exposes new "Zugriff & Berechtigungen" admin-only group                                                                                 | PASSED | `AppSidebar.tsx:162` and `MobileSidebar.tsx:141` both contain `group: 'Zugriff & Berechtigungen'`. Access guard verified by `admin-user-access-guard.spec.ts` (schulleitung does NOT see group + cannot reach `/admin/users`).                                                                                                                                                                                          |
| 8   | (Plan must-have) Silent-4XX-Invariante — every useMutation has explicit onError handler                                                                         | PASSED | `admin-user-silent-4xx.spec.ts` (152 LOC, 2 tests) forces 500 on `PUT /admin/users/:id/roles` and `POST /admin/permission-overrides`; both assert red toast visible AND green toast NEVER fires within 3s.                                                                                                                                                                                                            |
| 9   | (Plan must-have) Mobile-375 + 44px touch-target regression for UserMobileCards + LinkPersonDialog                                                               | PASSED | `admin-user-mobile.spec.ts` (167 LOC) asserts UserMobileCards renders at 375px, row "…" trigger ≥ 44×44 px, LinkPersonDialog opens at 320+ width, Person-Type radio rows + primary CTA all meet 44px floor (mobile-chrome project per playwright.config.ts).                                                                                                                                                          |
| 10  | (Plan must-have) Prisma migration adds `updatedAt` + `reason` columns to PermissionOverride; `prisma migrate reset` replays cleanly; no `db push` used         | PASSED | Migration file present at `apps/api/prisma/migrations/20260424120000_add_override_updated_at_and_reason/migration.sql` (10 LOC). Schema reflects columns (lines 206-207 of `schema.prisma`). Migration uses `DEFAULT CURRENT_TIMESTAMP` for backfill (replay-safe per CLAUDE.md migration policy).                                                                                                                       |
| 11  | (Plan must-have) PUT `/admin/users/:userId/roles` enforces min-1-admin invariant as RFC 9457 409 — server is authoritative even when client SelfLockoutWarn is bypassed | PASSED | Last-admin guard in `role-management.service.ts`. E2E `admin-user-roles.spec.ts USER-02-ROLES-04` proves backend 409 + LastAdminGuardDialog appears + DB unchanged + no green toast.                                                                                                                                                                                                                                  |

**Score:** 11/11 truths verified (5/5 ROADMAP success criteria + 6 merged plan must-haves).

### Required Artifacts

| Artifact                                                                                       | Expected                                          | Status     | Details                                                                                            |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `apps/api/prisma/migrations/20260424120000_add_override_updated_at_and_reason/migration.sql`    | Schema delta updated_at + reason                  | VERIFIED | 10 LOC; ALTER TABLE present                                                                        |
| `packages/shared/src/permissions/interpolate-conditions.ts`                                     | Shared util, exports `interpolateConditions`     | VERIFIED | Re-exported via `index.ts:34`; spec passes                                                         |
| `packages/shared/src/schemas/{user-role,permission-override,person-link,keycloak-user-query}.schema.ts` | 4 Zod schemas + 4 specs                            | VERIFIED | All 4 present; 31/31 shared tests pass                                                              |
| `apps/api/src/modules/user-directory/{service,controller,module,spec,dto}`                      | Hybrid KC+DB user-directory module                 | VERIFIED | Service 381 LOC, controller `@Controller('admin/users')`, 14/14 tests pass                          |
| `apps/api/src/modules/role-management/...`                                                      | Role management with min-1-admin guard            | VERIFIED | Service 136 LOC, controller `@Controller('admin')`, 7 tests pass                                    |
| `apps/api/src/modules/permission-override/...`                                                  | CRUD module with `@Controller('admin/permission-overrides')` | VERIFIED | Service 80 LOC, controller present, 7 tests pass                                                    |
| `apps/api/src/modules/effective-permissions/...`                                                | Resolver mirroring CaslAbilityFactory             | VERIFIED | Service 80 LOC, 8 tests pass                                                                        |
| `apps/api/src/modules/auth/casl/casl-ability.factory.ts`                                        | Refactored to use shared `interpolateConditions` | VERIFIED | Imports `interpolateConditions` from `@schoolflow/shared`                                          |
| `apps/api/src/modules/student/student.service.ts` + `parent.service.ts`                         | linkKeycloakUser + unlinkKeycloakUser parity      | VERIFIED | Both methods exist; mirror Teacher pattern                                                          |
| `apps/web/src/routes/_authenticated/admin/users.index.tsx`                                      | List page                                         | VERIFIED | 144 LOC                                                                                              |
| `apps/web/src/routes/_authenticated/admin/users.$userId.tsx`                                    | Detail page (4 tabs)                              | VERIFIED | 97 LOC, renders `<UserDetailTabs>`                                                                  |
| `apps/web/src/components/admin/user/*` (24 components)                                          | All 24 admin/user components                       | VERIFIED | All 24 files present (counted via ls); LOC totals 2786 lines                                        |
| `apps/web/src/features/users/hooks/*` (14 hooks)                                                | 14 TanStack Query hooks                           | VERIFIED | All 14 hooks present; 12 verified to use `apiFetch('/api/v1/admin/...')`                            |
| `apps/web/src/components/ui/{accordion,radio-group}.tsx`                                        | shadcn primitives                                 | VERIFIED | Both files exist                                                                                    |
| `apps/web/src/components/admin/shared/AffectedEntitiesList.tsx`                                 | Wrapper extending kinds                           | VERIFIED | File present                                                                                        |
| `apps/web/src/components/layout/{App,Mobile}Sidebar.tsx`                                        | New "Zugriff & Berechtigungen" group               | VERIFIED | Both contain literal string                                                                         |
| `apps/web/e2e/helpers/users.ts`                                                                 | Shared seed/cleanup helper                        | VERIFIED | 314 LOC                                                                                              |
| `apps/web/e2e/admin-users-list.spec.ts`                                                         | USER-01 list + filter + Sperren                   | VERIFIED | 202 LOC, 5 tests                                                                                    |
| `apps/web/e2e/admin-user-roles.spec.ts`                                                         | USER-02 role-assign + Self-Lockout + Last-Admin   | VERIFIED | 214 LOC, 4 tests; literal "Mindestens ein Admin" present                                            |
| `apps/web/e2e/admin-user-permissions.spec.ts`                                                   | USER-03 effective-permissions tab                  | VERIFIED | 95 LOC, 2 tests; "Effektive Berechtigungen" present                                                |
| `apps/web/e2e/admin-user-overrides.spec.ts`                                                     | USER-04 Override CRUD + 409 + 2-click delete       | VERIFIED | 314 LOC, 5 tests; "Override existiert bereits" present                                              |
| `apps/web/e2e/admin-user-person-link.spec.ts`                                                   | USER-05 Link + ReLinkConflict + Unlink             | VERIFIED | 257 LOC, 3 tests; "Verknüpfung lösen" + "Bestehende lösen und neu verknüpfen" present              |
| `apps/web/e2e/admin-user-access-guard.spec.ts`                                                  | Sidebar + route guard for non-admin                | VERIFIED | 81 LOC, 2 tests                                                                                    |
| `apps/web/e2e/admin-user-silent-4xx.spec.ts`                                                    | Silent-4xx invariant                              | VERIFIED | 152 LOC, 2 tests; `page.route` present                                                              |
| `apps/web/e2e/admin-user-mobile.spec.ts`                                                        | Mobile-375 + 44px touch-target                    | VERIFIED | 167 LOC, 2 tests                                                                                    |

### Key Link Verification

| From                                                  | To                                                          | Via                                                                     | Status | Details                                                                              |
| ----------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------ |
| `role-management.service.ts`                          | `keycloak-admin.service.ts`                                 | `addRealmRoleMappings` / `delRealmRoleMappings` (LOCK-01 mirror-write) | WIRED  | Lines 120-123 of service: `await this.kcAdmin.addRealmRoleMappings(userId, toAdd)` |
| `effective-permissions.service.ts`                    | `packages/shared/src/permissions/interpolate-conditions.ts` | `import { interpolateConditions } from '@schoolflow/shared'`           | WIRED  | Line 2 of service                                                                    |
| `auth/casl/casl-ability.factory.ts`                   | `packages/shared/src/permissions/interpolate-conditions.ts` | `import { interpolateConditions }` (replaces private method)            | WIRED  | Line 3 of factory; lines 32 & 49 use it                                              |
| `user-directory.service.ts`                           | `student.service.ts` / `parent.service.ts` / `teacher.service.ts` | `linkPerson` dispatches by `personType` to correct service              | WIRED  | Lines 260-323 of service                                                              |
| `apps/web/src/features/users/hooks/use-users.ts`      | `apps/web/src/lib/api.ts`                                   | `apiFetch('/api/v1/admin/users?...')`                                   | WIRED  | Line 39 of hook                                                                       |
| All 14 user hooks                                     | API endpoints                                               | `apiFetch('/api/v1/admin/...')`                                         | WIRED  | 12 hooks have `apiFetch('/api/v1/admin/...')` calls (use-user-person-link composes via use-user, use-roles via REST) |
| `users.$userId.tsx`                                   | `UserDetailTabs.tsx`                                        | `<UserDetailTabs>` rendered with user prop                              | WIRED  | Line 89 of route                                                                      |
| `admin-user-roles.spec.ts`                            | `LastAdminGuardDialog.tsx`                                  | asserts copy "Mindestens ein Admin muss bestehen bleiben"               | WIRED  | Verified via grep                                                                    |
| `admin-user-overrides.spec.ts`                        | `OverrideRow.tsx`                                           | asserts 2-click delete + 409 duplicate toast                            | WIRED  | "Override existiert bereits" present                                                 |
| `admin-user-person-link.spec.ts`                      | `ReLinkConflictDialog.tsx`                                  | asserts 2-stage re-link                                                 | WIRED  | "Bestehende lösen und neu verknüpfen" present                                       |
| `admin-user-silent-4xx.spec.ts`                       | `use-update-user-roles.ts` + `use-create-permission-override.ts` | `page.route(**admin/users/*/roles, **admin/permission-overrides) → 500` | WIRED  | `page.route` present in spec                                                         |
| `admin-user-access-guard.spec.ts`                     | `AppSidebar.tsx`                                            | schulleitung login → "Zugriff & Berechtigungen" not visible             | WIRED  | Sidebar group conditional on admin role                                              |

### Data-Flow Trace (Level 4)

| Artifact                                          | Data Variable                  | Source                                                           | Produces Real Data | Status   |
| ------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------- | ------------------ | -------- |
| `users.index.tsx`                                 | users (paginated)              | `useUsers` → `apiFetch('/admin/users?...')` → `UserDirectoryService.list` → `kcAdmin.findUsers` + `prisma.userRole.findMany` | YES                | FLOWING  |
| `users.$userId.tsx`                               | userDetail                     | `useUser` → `GET /admin/users/:userId` → `kcAdmin.findUserById` + `prisma.userRole.findMany` + `prisma.person.findUnique` | YES                | FLOWING  |
| `EffectivePermissionsTab.tsx`                     | rows                            | `useEffectivePermissions` → `EffectivePermissionsService` → DB queries roles + overrides + interpolation | YES                | FLOWING  |
| `OverridesSection.tsx`                            | overrides                       | `usePermissionOverrides` → `GET /admin/permission-overrides?userId=` → `prisma.permissionOverride.findMany` | YES                | FLOWING  |
| `PersonLinkSection.tsx`                            | personLink                      | Detail endpoint includes person reverse-lookup; `useLinkPerson` posts to dispatcher | YES                | FLOWING  |
| `UserRolesTab.tsx`                                | userRoles                       | `useUserRoles` → `GET /admin/users/:id/roles` → `prisma.userRole.findMany` joined to Role | YES                | FLOWING  |

### Behavioral Spot-Checks

| Behavior                                                                  | Command                                                            | Result                                | Status |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------- | ------ |
| Phase 13 backend tests pass                                               | `pnpm exec vitest run src/modules/{user-directory,role-management,permission-override,effective-permissions,keycloak-admin}` | 5 files / 48 tests / 0 failures       | PASS   |
| Shared package phase 13 tests pass                                        | `pnpm exec vitest run src/permissions src/schemas/{user-role,permission-override,person-link,keycloak-user-query}.schema` | 5 files / 31 tests / 0 failures       | PASS   |
| API service line counts substantive (not stubs)                            | `wc -l apps/api/src/modules/{user-directory,role-management,permission-override,effective-permissions}/*.ts` | 1794 LOC across 15 files               | PASS   |
| FE component line counts substantive (not stubs)                           | `wc -l apps/web/src/components/admin/user/*.tsx`                    | 24 components / 2786 LOC               | PASS   |
| E2E spec line counts substantive                                           | `wc -l apps/web/e2e/admin-user-*.spec.ts apps/web/e2e/admin-users-list.spec.ts apps/web/e2e/helpers/users.ts` | 9 files / 1796 LOC / 25 distinct `test(` blocks | PASS   |
| Migration file content matches plan                                       | `cat apps/api/prisma/migrations/20260424120000_*/migration.sql`     | ALTER TABLE updated_at + reason       | PASS   |
| 19 phase-13 commits in main                                                | `git log --oneline -25`                                             | 0214148, 17ad173, bc4c42a, fb20eb2 (13-01); 9d641c9, ddd6500, f172ecc, ab9f5be (13-02); 74cd76b, 736d929, b998019, cc2ab12, a63c263, 0a9d036, ffe2800, 54efbaf, 9680bc6, 00fcd14 (13-03); c2ebbd3 (post-fix) — all present | PASS |
| Pre-existing `school-year-multi-active.spec.ts` failure                    | (phase 10 data-dep test)                                            | Failure noted in user context, NOT phase 13 | SKIP — out of scope per user directive |

### Requirements Coverage

| Requirement | Source Plans                  | Description                                                                                | Status      | Evidence                                                                                                                                                                                            |
| ----------- | ----------------------------- | ------------------------------------------------------------------------------------------ | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| USER-01     | 13-01 + 13-02 + 13-03         | Admin sieht User-Liste aus Keycloak mit Suche und Filter                                  | SATISFIED | Backend list endpoint + UI list + filter + 5-test E2E spec; REQUIREMENTS.md line 60 marked `[x]`                                                                                                       |
| USER-02     | 13-01 + 13-02 + 13-03         | Admin kann Rollen einem User zuweisen                                                     | SATISFIED | Mirror-write LOCK-01 service + UserRolesTab + LastAdminGuardDialog + 4-test E2E spec; REQUIREMENTS.md line 61 marked `[x]`                                                                            |
| USER-03     | 13-01 + 13-02 + 13-03         | Admin sieht pro User die wirksamen CASL-Permissions (Rollen-Vererbung)                    | SATISFIED | EffectivePermissionsService with shared interpolation + EffectivePermissionsTab + 2-test E2E spec; REQUIREMENTS.md line 62 marked `[x]`                                                              |
| USER-04     | 13-01 + 13-02 + 13-03         | Admin kann per-User-ACL-Overrides anlegen, editieren und löschen                          | SATISFIED | PermissionOverride CRUD module + OverridesSection + OverrideRow + 5-test E2E spec including duplicate-409; REQUIREMENTS.md line 63 marked `[x]`                                                       |
| USER-05     | 13-01 + 13-02 + 13-03         | Admin kann Keycloak-User mit Teacher-/Student-/Parent-Person-Record verknüpfen           | SATISFIED | UserDirectory linkPerson dispatcher + Student/Parent service parity + LinkPersonDialog + ReLinkConflictDialog + UnlinkPersonDialog + 3-test E2E spec; REQUIREMENTS.md line 64 marked `[x]`            |

No orphaned requirements detected — all 5 USER-0* IDs declared in plan frontmatter (13-01, 13-02, 13-03) are accounted for in REQUIREMENTS.md and verified above.

### Anti-Patterns Found

| File             | Line  | Pattern                                                              | Severity | Impact                                                                              |
| ---------------- | ----- | -------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| (none)           | —     | No TODO/FIXME/placeholder/coming-soon strings in any phase-13 source | —        | Grep across `apps/api/src/modules/{user-directory,role-management,permission-override,effective-permissions}/*.ts` and `apps/web/src/{components/admin/user,features/users}/*` returned 0 hits. Form-input `placeholder=""` attributes (UserFilterBar, OverrideRow, ConditionsJsonEditor, PersonAutocompletePopover) are legitimate UI affordances, not stubs. |

### Human Verification Required

(none) — Phase 13 satisfies the user's E2E-first directive (memory `feedback_e2e_first_no_uat.md` 2026-04-21). Plan 13-03 ships 9 Playwright spec files / 25 tests covering all 5 USER-* requirements + Silent-4xx invariant + access-guard + mobile-375 viewport. Verbatim German UI-SPEC strings asserted in spec assertions. No surfaces require manual UAT.

### Gaps Summary

**No gaps.** All 11 must-haves verified. Each ROADMAP success criterion has a backend implementation (real DB + Keycloak calls, no stubs), a frontend rendering surface (substantive LOC, no placeholders), and an E2E spec that drives the real UI through the real backend. The two pre-existing items called out in the user context (web build failures in 11 unrelated files; the `school-year-multi-active.spec.ts` data-dependent test from Phase 10) are explicitly out of scope per `.planning/phases/13-user-und-rechteverwaltung/deferred-items.md`.

ROADMAP success-criteria checkboxes (lines 263-267) are still rendered as `[ ]` in `.planning/ROADMAP.md`, but the ROADMAP table on line 51 shows `Phase 13 | 3/3 | Complete | 2026-04-25` and REQUIREMENTS.md (lines 60-64) marks all 5 USER-* requirements `[x]`. The unchecked ROADMAP success-criteria checkboxes are a documentation lag, not a goal-achievement gap; recommend the orchestrator flip them to `[x]` when committing this VERIFICATION.md.

---

_Verified: 2026-04-25T06:39:36Z_
_Verifier: Claude (gsd-verifier)_
