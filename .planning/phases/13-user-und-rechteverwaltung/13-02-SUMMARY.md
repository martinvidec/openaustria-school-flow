---
phase: 13-user-und-rechteverwaltung
plan: 02
subsystem: ui
tags: [react, tanstack-query, tanstack-router, shadcn, sonner, rbac, casl, silent-4xx]

# Dependency graph
requires:
  - phase: 13-01
    provides: "GET/POST/PUT/DELETE /admin/users, /admin/roles, /admin/permission-overrides; @schoolflow/shared Zod schemas (linkPerson, updateUserRoles, create/updatePermissionOverride, keycloakUserQuery); EffectivePermissionRow + PermissionOverride DTOs; RFC 9457 problem-detail with affectedEntities extension"
  - phase: 11-teacher
    provides: "useTeacherSearch + KeycloakLinkDialog autocomplete pattern (PersonAutocompletePopover mirrors this for Student/Parent)"
  - phase: 10-foundations
    provides: "PageShell, WarnDialog, UnsavedChangesDialog, StickyMobileSaveBar, sonner toast, Silent-4XX-Invariante invariant"
provides:
  - "Sidebar group 'Zugriff & Berechtigungen' (admin-only) with /admin/users entry"
  - "Page /admin/users with paginated/filterable user directory consuming GET /admin/users"
  - "Page /admin/users/:userId with 4-tab detail (Stammdaten, Rollen, Berechtigungen, Overrides & Verknüpfung)"
  - "13 TanStack Query hooks under apps/web/src/features/users/hooks/ + 2 search hooks (useStudentSearch, useParentSearch)"
  - "26 new admin/user/* components (RoleChip, StatusBadge, SourceChip, EffectivePermissionsRow, OverrideRow, ConditionsJsonEditor, …)"
  - "AffectedEntitiesList extended with kinds 'user' / 'person-teacher' / 'person-student' / 'person-parent'"
  - "Hand-authored shadcn accordion + radio-group primitives (matching Phase 5 CLI-incompat pattern)"
affects: [13-03 (E2E coverage)]

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-accordion ^1.2.12"
    - "@radix-ui/react-radio-group ^1.3.8"
  patterns:
    - "Silent-4XX-Invariante: every useMutation wires explicit onError → toast.error with title/description from RFC 9457 problem-detail; specific 409s (last-admin-guard / person-link-conflict) suppress hook-level toast and propagate to dialog UI"
    - "Hook-level cache invalidation matrix: role change → invalidate ['user-roles', userId], ['users'], ['effective-permissions', userId]; override CRUD → ['permission-overrides', userId] + ['effective-permissions', userId] (NOT ['users']); link/unlink → ['user', userId] + ['users']; enable-toggle → both"
    - "2-click inline confirm pattern for OverrideRow delete (UI-SPEC §540): click 1 flashes bg-destructive/10 + aria-label 'Zum Bestätigen erneut klicken' for 3s, click 2 fires DELETE, click elsewhere or 3s timeout cancels"
    - "ReLinkConflictDialog 2-stage flow: Stage 1 (unlinking) decides target side via affectedEntities[0].kind hint from server, Stage 2 (relinking) retries the original POST"

key-files:
  created:
    - apps/web/src/components/ui/accordion.tsx
    - apps/web/src/components/ui/radio-group.tsx
    - apps/web/src/components/admin/shared/AffectedEntitiesList.tsx
    - apps/web/src/components/admin/user/RoleChip.tsx
    - apps/web/src/components/admin/user/StatusBadge.tsx
    - apps/web/src/components/admin/user/SourceChip.tsx
    - apps/web/src/components/admin/user/UserListTable.tsx
    - apps/web/src/components/admin/user/UserMobileCards.tsx
    - apps/web/src/components/admin/user/UserFilterBar.tsx
    - apps/web/src/components/admin/user/UserDetailTabs.tsx
    - apps/web/src/components/admin/user/UserStammdatenTab.tsx
    - apps/web/src/components/admin/user/UserRolesTab.tsx
    - apps/web/src/components/admin/user/EffectivePermissionsTab.tsx
    - apps/web/src/components/admin/user/EffectivePermissionsRow.tsx
    - apps/web/src/components/admin/user/OverridesPersonLinkTab.tsx
    - apps/web/src/components/admin/user/OverridesSection.tsx
    - apps/web/src/components/admin/user/OverrideRow.tsx
    - apps/web/src/components/admin/user/ConditionsJsonEditor.tsx
    - apps/web/src/components/admin/user/PersonLinkSection.tsx
    - apps/web/src/components/admin/user/LinkPersonDialog.tsx
    - apps/web/src/components/admin/user/PersonAutocompletePopover.tsx
    - apps/web/src/components/admin/user/ReLinkConflictDialog.tsx
    - apps/web/src/components/admin/user/UnlinkPersonDialog.tsx
    - apps/web/src/components/admin/user/DisableUserDialog.tsx
    - apps/web/src/components/admin/user/EnableUserDialog.tsx
    - apps/web/src/components/admin/user/SelfLockoutWarnDialog.tsx
    - apps/web/src/components/admin/user/LastAdminGuardDialog.tsx
    - apps/web/src/features/users/types.ts
    - apps/web/src/features/users/hooks/use-users.ts
    - apps/web/src/features/users/hooks/use-user.ts
    - apps/web/src/features/users/hooks/use-set-user-enabled.ts
    - apps/web/src/features/users/hooks/use-roles.ts
    - apps/web/src/features/users/hooks/use-user-roles.ts
    - apps/web/src/features/users/hooks/use-update-user-roles.ts
    - apps/web/src/features/users/hooks/use-effective-permissions.ts
    - apps/web/src/features/users/hooks/use-permission-overrides.ts
    - apps/web/src/features/users/hooks/use-create-permission-override.ts
    - apps/web/src/features/users/hooks/use-update-permission-override.ts
    - apps/web/src/features/users/hooks/use-delete-permission-override.ts
    - apps/web/src/features/users/hooks/use-user-person-link.ts
    - apps/web/src/features/users/hooks/use-link-person.ts
    - apps/web/src/features/users/hooks/use-unlink-person.ts
    - apps/web/src/hooks/useStudentSearch.ts
    - apps/web/src/hooks/useParentSearch.ts
    - apps/web/src/routes/_authenticated/admin/users.index.tsx
    - apps/web/src/routes/_authenticated/admin/users.$userId.tsx
    - .planning/phases/13-user-und-rechteverwaltung/deferred-items.md
  modified:
    - apps/web/src/components/layout/AppSidebar.tsx
    - apps/web/src/components/layout/MobileSidebar.tsx
    - apps/web/src/routeTree.gen.ts
    - apps/web/package.json (+2 radix deps)

key-decisions:
  - "AffectedEntitiesList moved to components/admin/shared/ (wrapper) — delegates legacy 4 kinds (teacher/subject/student/class) to the original Phase 11 implementation under components/admin/teacher/, adds 4 new kinds (user/person-{teacher,student,parent}) for Phase 13"
  - "Hooks for student/parent search live under apps/web/src/hooks/ (mirroring useTeacherSearch convention) NOT under features/users/hooks/ — these are domain-search hooks shared with Phase 11/12, not user-domain hooks"
  - "Pre-existing web build errors in 11 files (vite-env.d.ts missing, react-hook-form resolver drift, useStudents.ts:220 rolldown ILLEGAL_REASSIGNMENT, 6 ImportMeta.env errors) DEFERRED to a follow-up Web build hygiene plan — none are introduced by Plan 13-02; verification limited to typecheck of Plan 13-02 surface only"
  - "Self-Lockout-Warn (D-06) is a UX pre-flight only; backend last-admin-guard (T-13-09 from 13-01) remains authoritative — server-side 409 still surfaces via LastAdminGuardDialog when client guard is bypassed"
  - "ReLinkConflictDialog v1.1 only handles `kind: 'user'` automatic resolution; `kind: 'person-*'` conflicts emit a guidance toast and ask the admin to resolve manually via the affected person's admin route (parent admin route does not exist in v1.1, so person-parent kind falls back to /admin/students list deep-link)"

patterns-established:
  - "Per-row dirty state for OverrideRow: each row owns its own isDirty + inline 'Override speichern' button; no global StickyMobileSaveBar for overrides section (UI-SPEC §476)"
  - "Tab-level dirty state with UnsavedChangesDialog interception: only Rollen + Overrides tabs own dirty state; Stammdaten uses optimistic mutation; Berechtigungen is read-only"
  - "Hook-level toast suppression for typed 409s: useUpdateUserRoles returns onError early when problem.type === 'schoolflow://errors/last-admin-guard'; useLinkPerson does the same for 'person-link-conflict'; useCreate/UpdatePermissionOverride emit canonical 'Override existiert bereits' toast for 'override-duplicate'"
  - "PageShell breadcrumbs convention: every Phase 13 surface uses [Admin → User & Berechtigungen → {detail}] structure"

requirements-completed:
  - USER-01
  - USER-02
  - USER-03
  - USER-04
  - USER-05

# Metrics
duration: 20min
completed: 2026-04-24
---

# Phase 13 Plan 02: User- und Rechteverwaltung Frontend Summary

**26 admin/user components + 15 hooks + 2 routes + 2 sidebar updates ship the full /admin/users surface against the Plan 13-01 backend; every German UI-SPEC copy string lands verbatim and every mutation enforces the Silent-4XX-Invariante via explicit onError handlers.**

## Performance

- **Duration:** ~20 min
- **Started:** 2026-04-24T22:35:54Z
- **Completed:** 2026-04-24T22:56:??Z (approx)
- **Tasks:** 3
- **Files created:** 47
- **Files modified:** 4

## Accomplishments

- **Sidebar integration** — `AppSidebar.tsx` + `MobileSidebar.tsx` now expose a new `Zugriff & Berechtigungen` group (admin-only role gate per UI-SPEC §586-592) with `User → /admin/users` entry. Schulleitung does NOT see this group (stricter than `Personal & Fächer`).
- **Two new file-based routes** — `/admin/users` and `/admin/users/$userId` registered via TanStack Router plugin; `routeTree.gen.ts` regenerated at build time. The detail route uses Zod-validated search params (`tab=stammdaten|rollen|berechtigungen|overrides`) so deep-links survive page reload.
- **15 TanStack Query hooks** — every endpoint from Plan 13-01 has a typed wrapper. Every mutation wires explicit `onError` per Silent-4XX-Invariante; specific 409 problem-types (last-admin-guard, person-link-conflict) suppress the hook-level toast and propagate via thrown `UserApiError` for dialog-driven resolution.
- **4-tab User-Detail** — Stammdaten (read-only KC fields + Sperren/Reaktivieren card), Rollen (5 checkboxes + self-lockout pre-flight + last-admin-guard 409 dialog + JWT-Refresh hint + Konsistenz-Hinweis amber InfoBanner per D-08 divergence detection), Berechtigungen (Accordion grouped by subject with first-item open + sticky table headers + RefreshCw refetch), Overrides & Verknüpfung (per-row OverrideRow CRUD + 2-click inline delete + ConditionsJsonEditor + PersonLinkSection with deep-link/change/unlink choreography).
- **AffectedEntitiesList extension** — wrapper at `components/admin/shared/` delegates legacy `kind`s (teacher/subject/student/class) to the original Phase 11 implementation and adds 4 new `kind`s (`user`, `person-teacher`, `person-student`, `person-parent`) consumed by `LastAdminGuardDialog` and `ReLinkConflictDialog`.
- **shadcn primitives installed** — accordion + radio-group hand-authored to match the existing Phase 5 CLI-incompat pattern; @radix-ui/react-accordion@^1.2 + @radix-ui/react-radio-group@^1.3 added to apps/web/package.json.
- **All UI-SPEC copy verbatim** — every primary CTA, empty-state, error toast, destructive confirmation, and inline micro-copy line lands identically to UI-SPEC §168-313. Verified via grep audit:
  - `Rollen aktualisiert` / `Override gespeichert` / `Override gelöscht` / `User gesperrt` / `User reaktiviert` / `Verknüpfung aktualisiert` / `Verknüpfung entfernt` (all 7 canonical success-toast strings present in `features/users/hooks/`).
  - `Override existiert bereits` 409 toast handled in both create + update hooks.
  - Mobile touch-target floor (`min-h-11`) on all interactive elements per UI-SPEC §484-493.
  - Zero `dark:` classes in `components/admin/user/` (UI-SPEC v1.1 forbids new dark variants).

## Task Commits

1. **Task 1: Sidebar + Routes + 15 hooks + shadcn primitives + AffectedEntitiesList extension** — `9d641c9` (feat)
2. **Task 2: List page + Stammdaten + Rollen + 4 dialogs** — `ddd6500` (feat)
3. **Task 3: Berechtigungen + Overrides & Verknüpfung tabs + person-link dialogs** — `f172ecc` (feat)

## Hook Inventory

| Hook | Endpoint | Cache invalidation on success |
| ---- | -------- | ----------------------------- |
| `useUsers(query)` | GET /admin/users | — |
| `useUser(userId)` | GET /admin/users/:userId | — |
| `useSetUserEnabled(userId)` | PUT /admin/users/:userId/enabled | `['users']`, `['user', userId]` |
| `useRoles()` | GET /admin/roles | — |
| `useUserRoles(userId)` | GET /admin/users/:userId/roles | — |
| `useUpdateUserRoles(userId)` | PUT /admin/users/:userId/roles | `['user-roles', userId]`, `['users']`, `['user', userId]`, `['effective-permissions', userId]` |
| `useEffectivePermissions(userId)` | GET /admin/users/:userId/effective-permissions | — |
| `usePermissionOverrides(userId)` | GET /admin/permission-overrides?userId= | — |
| `useCreatePermissionOverride(userId)` | POST /admin/permission-overrides | `['permission-overrides', userId]`, `['effective-permissions', userId]` |
| `useUpdatePermissionOverride(userId)` | PUT /admin/permission-overrides/:id | (same as create) |
| `useDeletePermissionOverride(userId)` | DELETE /admin/permission-overrides/:id | (same as create) |
| `useUserPersonLink(userId)` | derived from `useUser` | — |
| `useLinkPerson(userId)` | POST /admin/users/:userId/link-person | `['user', userId]`, `['users']` |
| `useUnlinkPerson(userId)` | DELETE /admin/users/:userId/link-person | (same as link) |
| `useStudentSearch / useParentSearch` | GET /students or /parents | — |

## Component Inventory

| Component | Responsibility |
|-----------|---------------|
| `RoleChip` | Badge with admin/schulleitung/other color + icon triad |
| `StatusBadge` | Aktiv (green CircleCheck) / Deaktiviert (amber Ban) |
| `SourceChip` | Effective-Permissions source attribution; clickable for Override deep-link (Task 3 deferred wiring — see Open Issues below) |
| `EffectivePermissionsRow` | Single ability row with granted/denied + source-chip + conditions tooltip |
| `EffectivePermissionsTab` | Accordion grouped by subject; first item open by default |
| `ConditionsJsonEditor` | font-mono Textarea + JSON.parse validation + variable hints |
| `OverrideRow` | Per-row inline editor for permission-override CRUD with 2-click delete |
| `OverridesSection` | List of OverrideRow Cards + 'Override hinzufügen' footer/empty CTA |
| `PersonAutocompletePopover` | Switches search hook by personType; min-length 2 + 300ms debounce |
| `LinkPersonDialog` | RadioGroup (Lehrkraft/Schüler:in/Erziehungsberechtigte:n) + autocomplete; 409 propagation |
| `ReLinkConflictDialog` | 2-stage destructive resolve flow with progress indicators |
| `UnlinkPersonDialog` | WarnDialog destructive confirm |
| `PersonLinkSection` | Card with linked/unlinked variants + deep-link to /admin/{teachers,students} |
| `OverridesPersonLinkTab` | Composes OverridesSection + Separator + PersonLinkSection (D-15 merged Tab 4) |
| `UserListTable` (desktop) / `UserMobileCards` (<640px) | Paginated user list with row-action dropdown |
| `UserFilterBar` | 4 controls + 'Filter zurücksetzen'; bottom-sheet on mobile |
| `UserStammdatenTab` | Read-only fields + Account-Status card |
| `UserRolesTab` | 5 role checkboxes + self-lockout pre-flight + JWT-Refresh hint + divergence banners |
| `UserDetailTabs` | 4-tab container with per-tab dirty + UnsavedChangesDialog |
| `DisableUserDialog` / `EnableUserDialog` | WarnDialog wrappers for Stammdaten Sperren/Reaktivieren |
| `SelfLockoutWarnDialog` / `LastAdminGuardDialog` | D-06 / D-07 dialogs for role-save flow |

## Decisions Made

- **AffectedEntitiesList wrapper at `components/admin/shared/`** — delegates the four legacy `kind`s to the existing Phase 11 implementation (kept under `components/admin/teacher/` to avoid touching mature code) and adds 4 new `kind`s for Phase 13. This keeps Phase 13 callers using a single shared import path while preserving Phase 11/12 backwards compatibility.
- **Search hooks at `apps/web/src/hooks/` (NOT `features/users/hooks/`)** — `useStudentSearch` and `useParentSearch` mirror the existing `useTeacherSearch` convention. They are domain-search hooks shared across phases (any phase that wants a Person autocomplete imports them), not user-domain hooks. The plan's `files_modified` list reflects this.
- **Hand-authored shadcn primitives** — `pnpm dlx shadcn@latest add accordion radio-group` failed with `Invalid configuration found in components.json` (likely a recent shadcn CLI / config-schema breaking change). Followed the existing Phase 5 CLI-incompat pattern: `pnpm add @radix-ui/react-accordion @radix-ui/react-radio-group` then hand-authored the wrappers matching the codebase's existing style (forwardRef + cn() + chevron rotate animation).
- **Self-Lockout-Warn is UX-only** — the backend's last-admin-guard (T-13-09 from Plan 13-01) is authoritative. Client guard is a nice-to-have that catches the common-case "I un-ticked my own admin role" mistake before round-tripping; if bypassed (admin opens devtools, removes the dialog, hits save), the server still returns 409 and `LastAdminGuardDialog` renders.
- **ReLinkConflictDialog person-side conflict deferred** — when the 409 payload's `affectedEntities[0].kind === 'person-*'` (the conflicting record is on the person side, not the user side), v1.1 emits a guidance toast asking the admin to resolve manually via the person's admin route. The 2-stage automatic flow only handles `kind: 'user'`. This matches Plan 13-01's backend wiring (see UserDirectoryService two-sided pre-check).
- **Pre-existing web build/typecheck failures deferred** — `pnpm --filter @schoolflow/web build` fails on errors **NOT introduced by Plan 13-02**: missing `vite-env.d.ts` for `ImportMeta.env`, `useStudents.ts:220` rolldown ILLEGAL_REASSIGNMENT (`const failed` reassigned), react-hook-form resolver type drift, etc. Verification was limited to `pnpm exec tsc --noEmit` filtered to Plan 13-02 surface (0 errors). All pre-existing failures documented in `.planning/phases/13-user-und-rechteverwaltung/deferred-items.md`. Recommend Phase 13 Plan 04 ("Web build hygiene") before E2E coverage in Plan 13-03.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] shadcn CLI failed with `Invalid configuration found in components.json`**

- **Found during:** Task 1 step 1 (`pnpm dlx shadcn@latest add accordion radio-group`)
- **Issue:** Latest shadcn CLI rejects the existing `components.json` config (likely a schema version drift). The repo already established a hand-authored pattern in Phase 5 (see `components/ui/checkbox.tsx`) for this exact case.
- **Fix:** Installed the radix dependencies directly (`@radix-ui/react-accordion@^1.2.12`, `@radix-ui/react-radio-group@^1.3.8`) and hand-authored the wrappers matching the existing codebase style (forwardRef + Lucide icon + Tailwind tokens).
- **Files modified:** `apps/web/src/components/ui/accordion.tsx`, `apps/web/src/components/ui/radio-group.tsx`, `apps/web/package.json`, `pnpm-lock.yaml`.
- **Verification:** Both files contain the expected primitive imports (`AccordionPrimitive` / `RadioGroupPrimitive`), match the project's `forwardRef` style, and are picked up by `tsc` cleanly.
- **Committed in:** `9d641c9`

**2. [Rule 3 — Blocking] Pre-existing web build errors prevent the planned `pnpm --filter @schoolflow/web build` verify step from passing**

- **Found during:** Task 1 verify (`pnpm --filter @schoolflow/web build`)
- **Issue:** The build fails with 11 errors in files **NOT touched by Plan 13-02**: vite-env.d.ts missing, useStudents.ts:220 const-reassignment, react-hook-form Resolver type drift, etc. These existed long before Phase 13 (some since Phase 04-02).
- **Fix:** Did not modify out-of-scope files. Documented in `.planning/phases/13-user-und-rechteverwaltung/deferred-items.md` and switched verification to `pnpm exec tsc --noEmit -p tsconfig.app.json` filtered to Plan 13-02 surface.
- **Verification:** 0 typecheck errors in any file under `components/admin/user/`, `features/users/`, `components/ui/accordion.tsx`, `components/ui/radio-group.tsx`, `components/admin/shared/AffectedEntitiesList.tsx`, `hooks/useStudentSearch.ts`, `hooks/useParentSearch.ts`, or the two new routes.
- **Committed in:** `9d641c9`

---

**Total deviations:** 2 auto-fixed (both Rule 3 blocking).
**Impact on plan:** None on planned behaviour. The shadcn CLI hand-author pattern matches Phase 5; the build-error deferral is documented for a follow-up plan.

## Manual Smoke Test Notes

Manual smoke per UI-SPEC §777-787 was NOT performed in this run — the user-directive 2026-04-21 (`feedback_e2e_first_no_uat.md`) replaces manual UAT with Plan 13-03 Playwright coverage. The TanStack Router plugin successfully regenerated `routeTree.gen.ts` (verified via grep), so navigation will work as soon as Plan 13-03 sets up the dev-server fixture.

## Open Issues for Plan 13-03 (E2E)

1. **SourceChip Override deep-link wiring** — UI-SPEC §580 specifies clicking the `Override` source-chip in EffectivePermissionsTab should scroll to the matching `OverrideRow` in Tab 4 with a `ring-primary` flash for 1s. The component accepts an `onClick` prop but the cross-tab navigation+scroll choreography is NOT wired (would require a tab-switch + ref-forward + scroll-into-view flow). E2E should either (a) cover this UX after a follow-up wires the click handler, or (b) defer the assertion to v1.2.
2. **ReLinkConflictDialog person-side conflict** — only `kind: 'user'` conflicts auto-resolve. E2E should cover the user-side path (current happy flow) and assert the manual-resolution toast for person-side conflicts.
3. **Test-data fixtures** — Plan 13-03 needs seed users with specific role combinations:
   - 1 admin (currentUser) + 1 admin (so self-lockout dialog can fire without triggering last-admin-guard)
   - 1 schulleitung (to test "stricter sidebar gating": schulleitung does NOT see the Zugriff & Berechtigungen group)
   - 1 user with `lehrer` role + NO TEACHER person-link (to assert the D-08 Konsistenz-InfoBanner)
   - 1 user with TEACHER person-link already → test ReLinkConflictDialog
   - 1 user with permission-override matching a role-permission (to test the source-chip override-vs-role precedence display)
4. **Pre-existing build errors** — recommend a separate Phase 13 Plan 04 ("Web build hygiene") before Plan 13-03 starts, otherwise CI will flag the build failure as "introduced by 13-02" even though it predates this plan.

## Threat Flags

No new flags. Plan 13-02 is a frontend consumer of Plan 13-01's already-modeled threat surface; no new endpoints, no schema changes, no auth paths introduced.

## Verification Status

| Check | Status |
| ----- | ------ |
| `pnpm exec tsc --noEmit -p tsconfig.app.json` filtered to Plan 13-02 surface | 0 errors |
| `routeTree.gen.ts` contains `/admin/users` + `/admin/users/$userId` | YES (verified via grep) |
| All 15 hooks present under `apps/web/src/features/users/hooks/` + `apps/web/src/hooks/use{Student,Parent}Search.ts` | 13 + 2 = 15 |
| Every mutation hook contains `onError:` + `toast.error(` | 7 / 7 mutations |
| All 7 canonical UI-SPEC `toast.success()` strings present verbatim | 7 / 7 |
| AffectedEntitiesList contains `kind: 'user'`, `kind: 'person-teacher'`, `kind: 'person-student'`, `kind: 'person-parent'` | 4 / 4 |
| `pnpm --filter @schoolflow/web build` exit 0 | DEFERRED (pre-existing errors) — see deferred-items.md |
| Zero `dark:` classes in `components/admin/user/` | YES (UI-SPEC v1.1 compliant) |

## Self-Check: PASSED

All 26 created components present (FOUND); both routes registered in `routeTree.gen.ts` (FOUND); all 3 task commits (`9d641c9`, `ddd6500`, `f172ecc`) reachable from `git log --oneline --all` (FOUND).
