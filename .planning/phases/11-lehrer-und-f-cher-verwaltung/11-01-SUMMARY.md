---
phase: 11-lehrer-und-f-cher-verwaltung
plan: 01
subsystem: admin-ui
tags: [teacher, admin, keycloak, werteinheiten, zod, shared, orphan-guard, rbac, rfc9457, phase-11]

# Dependency graph
requires:
  - phase: 02-foundation-rbac-dsgvo
    provides: "TeacherModule + Person model + werteinheiten.util (moved to @schoolflow/shared in this plan)"
  - phase: 10-schulstammdaten-zeitraster
    provides: "PageShell / StickyMobileSaveBar / WarnDialog / InfoBanner / UnsavedChangesDialog shared admin components + Silent-4xx invariant"
  - phase: 10.3-e2e-harness-per-role-smoke
    provides: "loginAsRole + Playwright harness (11-03 will consume)"
provides:
  - "Shared Zod schemas for Teacher/Availability/TeachingReduction under packages/shared/src/schemas/"
  - "Werteinheiten util moved to packages/shared for FE/BE byte-identical compute (D-05)"
  - "TeacherService.remove orphan-guard with RFC 9457 problem+json 409 + extensions.affectedEntities (TEACHER-06 / D-12 / D-14)"
  - "KeycloakAdmin NestJS module: GET /admin/keycloak/users?email= with service-account token caching + alreadyLinkedToPerson enrichment"
  - "Teacher PATCH/DELETE :id/keycloak-link endpoints (TEACHER-02 / D-08)"
  - "Admin web surface: /admin/teachers list + /admin/teachers/$teacherId detail with 4 tabs + KeycloakLinkDialog + DeleteTeacherDialog with 409 blocked-state + ArchiveTeacherDialog"
  - "Sidebar grouping refactor: NavItem.group? optional field + rendering pass for group separator headers"
  - "AppSidebar + MobileSidebar 'Personal & Fächer' group (admin|schulleitung)"
affects: [11-02-subject-crud, 11-03-e2e-sweep, 12-klassen-schueler]

# Tech tracking
tech-stack:
  added:
    - "@keycloak/keycloak-admin-client (api, ^24)"
  patterns:
    - "packages/shared Zod schemas alongside NestJS class-validator DTOs (defense-in-depth per D-15)"
    - "Werteinheiten util in @schoolflow/shared for FE/BE byte-identical compute"
    - "RFC 9457 extensions.affectedEntities payload for orphan-guard 409 (first use: teacher; 11-02 will reuse for subject)"
    - "TeacherApiError typed error class (instanceof check for 409 vs other 4xx in mutation onError handlers)"
    - "NavItem.group? + groupItems() helper for sidebar section rendering (Plan 11-02 will reuse)"
    - "Legacy/new hook coexistence pattern: rename original to useTeacherOptions + re-export under legacy name to avoid breaking substitution/timetable-edit callers"
    - "Keycloak service-account token cache (5min TTL, refresh 30s before expiry) for KeycloakAdminService"

key-files:
  created:
    - packages/shared/src/werteinheiten/werteinheiten.util.ts
    - packages/shared/src/werteinheiten/werteinheiten.util.spec.ts
    - packages/shared/src/werteinheiten/index.ts
    - packages/shared/src/schemas/teacher.schema.ts
    - packages/shared/src/schemas/teacher.schema.spec.ts
    - packages/shared/src/schemas/availability.schema.ts
    - packages/shared/src/schemas/availability.schema.spec.ts
    - packages/shared/src/schemas/teaching-reduction.schema.ts
    - packages/shared/src/schemas/teaching-reduction.schema.spec.ts
    - apps/api/src/modules/keycloak-admin/keycloak-admin.module.ts
    - apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts
    - apps/api/src/modules/keycloak-admin/keycloak-admin.service.spec.ts
    - apps/api/src/modules/keycloak-admin/keycloak-admin.controller.ts
    - apps/api/src/modules/keycloak-admin/dto/keycloak-user-query.dto.ts
    - apps/api/src/modules/keycloak-admin/dto/keycloak-user-response.dto.ts
    - apps/api/src/modules/teacher/dto/link-keycloak.dto.ts
    - apps/web/src/hooks/useKeycloakUsers.ts
    - apps/web/src/routes/_authenticated/admin/teachers.index.tsx
    - apps/web/src/routes/_authenticated/admin/teachers.$teacherId.tsx
    - apps/web/src/components/admin/teacher/ (14 components + 5 it.todo test stubs)
  modified:
    - packages/shared/src/index.ts (new re-exports)
    - apps/api/src/modules/teacher/werteinheiten.util.ts (pure re-export from @schoolflow/shared)
    - apps/api/src/modules/teacher/teacher.service.ts (orphan-guard + linkKeycloakUser/unlinkKeycloakUser)
    - apps/api/src/modules/teacher/teacher.service.spec.ts (9 new Orphan-Guard tests)
    - apps/api/src/modules/teacher/teacher.controller.ts (PATCH/DELETE :id/keycloak-link)
    - apps/api/src/app.module.ts (KeycloakAdminModule import)
    - apps/api/package.json + pnpm-lock.yaml (@keycloak/keycloak-admin-client)
    - apps/web/src/hooks/useTeachers.ts (rename + add 7 admin hooks)
    - apps/web/src/components/layout/AppSidebar.tsx + MobileSidebar.tsx (grouping refactor + Lehrer entry)
    - apps/web/src/routeTree.gen.ts (TanStack Router auto-regen)

key-decisions:
  - "Zod enum values MUST mirror actual Prisma enums (AvailabilityRuleType, ReductionType, DayOfWeek) — the plan's draft names (UNAVAILABLE, OEPU_FUNKTION, SUPPLIERREDUKTION, MENTORING, SONSTIGES) would have triggered 400s on every PUT; Prisma schema is the source of truth"
  - "werteinheiten util MOVED (not duplicated) to @schoolflow/shared — apps/api's werteinheiten.util.ts rewritten as pure re-export so existing teacher.service.ts import path keeps working"
  - "TeacherStatus (ACTIVE/ARCHIVED) is a UI-level concept — no Teacher.status column exists; ArchiveTeacherDialog uses employmentPercentage=0 as a pragmatic stand-in until a real archive column lands"
  - "Existing useTeachers hook (TeacherOption[] flat list for substitution/timetable-edit dropdowns) renamed to useTeacherOptions + re-exported under legacy name — avoids breaking 2 existing call sites while introducing the new admin hooks"
  - "Throttling on GET /admin/keycloak/users deferred — requires @nestjs/throttler dep + APP_GUARD registration not currently wired; minimal @CheckPermissions manage teacher gate still blocks casual access"
  - "TeacherApiError typed error class with problem+status exposed so DeleteTeacherDialog can branch on 409 via instanceof without string matching"
  - "KeycloakAdminService token cache uses tokenExpiresAt - 30_000 guard so the 30s refresh window is non-blocking; tokenExpiresAt seeded at Date.now() + 5*60*1000 per Keycloak default admin TTL"
  - "Vitest constructor mock for @keycloak/keycloak-admin-client uses `function MockKCC() { return kcMock; }` (old-style function constructor) instead of vi.fn().mockImplementation — latter returns a non-constructible mock under Vitest 4"

patterns-established:
  - "Phase 11-01: Zod enum values MUST match Prisma enums byte-for-byte — drift breaks the replace-all PUT pipeline silently"
  - "Phase 11-01: @schoolflow/shared re-exports with apps/api shim (pure re-export preserving old import path) = zero-impact move of shared utilities"
  - "Phase 11-01: RFC 9457 extensions.affectedEntities naming convention: `{entityCategory}Count` for scalar counts + `{entityCategory}For: [{id,name}]` for bounded (≤50) detail lists"
  - "Phase 11-01: Mutation hook error strategy — custom typed error class (TeacherApiError) with status + problem fields, so consuming dialogs branch on status via instanceof (DeleteTeacherDialog 409 → blocked-state)"
  - "Phase 11-01: Legacy hook coexistence pattern (rename + re-export) preserves existing callers when adding new admin-surface hooks under the same name"

requirements-completed: [TEACHER-01, TEACHER-02, TEACHER-03, TEACHER-04, TEACHER-05, TEACHER-06]

# Metrics
duration: 17min
completed: 2026-04-22
---

# Phase 11 Plan 01: Teacher Admin Surface + Orphan-Guard + Keycloak-Admin Module Summary

**Full teacher admin UI (list/detail/4 tabs/Keycloak-link dialog) + TeacherService.remove 409 orphan-guard with RFC 9457 extensions.affectedEntities + new KeycloakAdmin NestJS module, shared Zod schemas & werteinheiten util moved to @schoolflow/shared.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-04-22T20:58:10Z
- **Completed:** 2026-04-22T21:15:08Z
- **Tasks:** 3 / 3
- **Files modified:** 37 (13 shared/api + 24 web)

## Accomplishments

- **TEACHER-01** shipped: `/admin/teachers` list route with search + empty-state inline CTA + desktop table / mobile cards + archive/delete dropdown actions
- **TEACHER-02** shipped: Create dialog (Stammdaten) + Edit detail page with 4 tabs; explicit `onError` on every mutation hook (Silent-4xx invariant)
- **TEACHER-03** shipped: Live-computed Werteinheiten bilanz using `calculateMaxTeachingHours` from `@schoolflow/shared` — byte-identical FE/BE compute per D-05
- **TEACHER-04** shipped: Visual week-grid desktop (`role="grid"`, aria-pressed cells, repeating-linear-gradient hatch + Lock icon) + Day-Picker mobile fallback with h-11 (44px WCAG) toggles
- **TEACHER-05** shipped: Ermässigungen row-add list with SONSTIGES/OTHER conditional Anmerkung validation + replace-all save
- **TEACHER-06** shipped (core gap-fix): `TeacherService.remove` now refuses with 409 when ANY of `klassenvorstandId` / `TimetableLesson.teacherId` / `ClassBookEntry.teacherId` / `GradeEntry.teacherId` / `Substitution.originalTeacherId` / `Substitution.substituteTeacherId` references the teacher; payload ships `extensions.affectedEntities` so the UI renders a blocked-state `DeleteTeacherDialog` with klassenvorstand class names + per-category counts. 9 new Vitest specs; prevents silent zombification of denormalized-FK history.
- **D-03** shipped: Sidebar grouping refactor — `NavItem.group?` + separator header row; "Personal & Fächer" group with "Lehrer" entry (Plan 11-02 will append Fächer).
- **D-08** shipped: `KeycloakAdmin` greenfield NestJS module — `GET /admin/keycloak/users?email=` via `@keycloak/keycloak-admin-client` with service-account token caching + Prisma-side `alreadyLinkedToPersonId` enrichment for duplicate-link warning.
- **D-15** shipped: 3 Zod schemas under `packages/shared/src/schemas/` (teacher, availability, teaching-reduction) + enum values aligned with actual Prisma enums.
- **D-05 foundation**: `werteinheiten.util.ts` moved to `packages/shared/src/werteinheiten/`; apps/api's copy rewritten as pure re-export. Existing callers (teacher.service.ts, werteinheiten.util.spec.ts) unchanged.

## Task Commits

1. **Task 1: Wave 0 — Shared Zod schemas + werteinheiten util move + TDD stubs** — `09790da` (feat)
2. **Task 2: API — TeacherService.remove Orphan-Guard + KeycloakAdmin module** — `f89079e` (feat)
3. **Task 3: Web — /admin/teachers routes + 4 tabs + dialogs + sidebar grouping** — `f3e7be0` (feat)

Total across 3 commits: 51 files changed, 3,585 insertions / 178 deletions.

## Files Created/Modified

### Shared
- `packages/shared/src/werteinheiten/werteinheiten.util.ts` — VERBATIM move from `apps/api/src/modules/teacher/werteinheiten.util.ts`
- `packages/shared/src/werteinheiten/werteinheiten.util.spec.ts` — Ported specs (same describe/it names, same expect values)
- `packages/shared/src/werteinheiten/index.ts` — Re-export barrel
- `packages/shared/src/schemas/teacher.schema.ts` — StammdatenSchema, LehrverpflichtungSchema, TeacherCreateSchema, TeacherUpdateSchema, TeacherStatusEnum
- `packages/shared/src/schemas/teacher.schema.spec.ts` — 15 cases
- `packages/shared/src/schemas/availability.schema.ts` — AvailabilityRuleSchema with backend-matching enums
- `packages/shared/src/schemas/availability.schema.spec.ts` — 8 cases
- `packages/shared/src/schemas/teaching-reduction.schema.ts` — TeachingReductionSchema with OTHER refine
- `packages/shared/src/schemas/teaching-reduction.schema.spec.ts` — 7 cases
- `packages/shared/src/index.ts` — appended schema + werteinheiten re-exports

### API
- `apps/api/src/modules/teacher/werteinheiten.util.ts` — now pure re-export from @schoolflow/shared
- `apps/api/src/modules/teacher/teacher.service.ts` — orphan-guard in `.remove`; new `.linkKeycloakUser` / `.unlinkKeycloakUser`
- `apps/api/src/modules/teacher/teacher.service.spec.ts` — 9 new Orphan-Guard tests + expanded mock prisma
- `apps/api/src/modules/teacher/teacher.controller.ts` — PATCH/DELETE `:id/keycloak-link`
- `apps/api/src/modules/teacher/dto/link-keycloak.dto.ts` — NEW
- `apps/api/src/modules/keycloak-admin/keycloak-admin.module.ts` — NEW
- `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts` — NEW with token cache + enrichment
- `apps/api/src/modules/keycloak-admin/keycloak-admin.service.spec.ts` — NEW (4 tests: token cache, re-auth on TTL, enrichment, empty result)
- `apps/api/src/modules/keycloak-admin/keycloak-admin.controller.ts` — NEW
- `apps/api/src/modules/keycloak-admin/dto/keycloak-user-query.dto.ts` — NEW
- `apps/api/src/modules/keycloak-admin/dto/keycloak-user-response.dto.ts` — NEW
- `apps/api/src/app.module.ts` — `KeycloakAdminModule` in imports
- `apps/api/package.json` + `pnpm-lock.yaml` — added `@keycloak/keycloak-admin-client`

### Web
- `apps/web/src/hooks/useTeachers.ts` — rewritten with legacy `useTeacherOptions` preserved; 7 new admin hooks (`useAdminTeachers`, `useTeacher`, `useCreateTeacher`, `useUpdateTeacher`, `useDeleteTeacher`, `useLinkKeycloak`, `useUnlinkKeycloak`) — every mutation wires explicit `onError`
- `apps/web/src/hooks/useKeycloakUsers.ts` — NEW (debounced-aware, staleTime 30s, enabled>=3 chars)
- `apps/web/src/routes/_authenticated/admin/teachers.index.tsx` — NEW list route
- `apps/web/src/routes/_authenticated/admin/teachers.$teacherId.tsx` — NEW detail route with Zod-validated ?tab= search
- `apps/web/src/components/admin/teacher/` — 14 production components + 5 it.todo test stubs (StammdatenTab, LehrverpflichtungTab, VerfuegbarkeitsGrid, VerfuegbarkeitsMobileList, ErmaessigungenList, KeycloakLinkSection, KeycloakLinkDialog, ArchiveTeacherDialog, DeleteTeacherDialog, AffectedEntitiesList, TeacherListTable, TeacherMobileCards, TeacherCreateDialog, TeacherDetailTabs)
- `apps/web/src/components/layout/AppSidebar.tsx` + `MobileSidebar.tsx` — grouping refactor + "Lehrer" entry
- `apps/web/src/routeTree.gen.ts` — TanStack Router auto-regen

## Decisions Made

- **Enum values follow Prisma, not the plan's draft names.** The plan listed `UNAVAILABLE`, `OEPU_FUNKTION`, `SUPPLIERREDUKTION`, `MENTORING`, `SONSTIGES` — none of which exist in `apps/api/prisma/schema.prisma` (actual values: `BLOCKED_PERIOD`, `KUSTODIAT`, `KLASSENVORSTAND`, `MENTOR`, `PERSONALVERTRETUNG`, `ADMINISTRATION`, `OTHER`). Using the plan's names would have produced 400s on every PUT. Applied Rule 1 (bug-fix) — Prisma schema is the source of truth per CLAUDE.md "database schema IS the contract between services".
- **Werteinheiten util moved, not duplicated.** apps/api's copy rewritten as pure re-export from `@schoolflow/shared` so the FE compute path is byte-identical per D-05. Zero changes needed to teacher.service.ts import lines.
- **TeacherStatus = UI concept.** No `status` column exists on Teacher; the Zod schema exposes the enum for form use but the ArchiveTeacherDialog writes `employmentPercentage=0` as a pragmatic archive signal. A real archive column is a future schema change (follow-up).
- **Legacy `useTeachers` hook preserved.** The substitution planner + timetable-edit pages import `useTeachers(schoolId)` returning `TeacherOption[]`. Renaming it outright would break both routes. Chose to rename the original to `useTeacherOptions` and re-export under the legacy name, then add the new admin hooks with the names the plan called for. Zero import updates needed at existing call sites.
- **Throttling deferred on `/admin/keycloak/users`.** The plan wanted `@nestjs/throttler @Throttle(30/min)`, but the dep isn't in the api workspace and wiring it properly needs an APP_GUARD registration. `CheckPermissions({action:'manage', subject:'teacher'})` still gates access. Follow-up item for a future throttler-infra plan.
- **Constructor mock style for `@keycloak/keycloak-admin-client`.** Vitest 4's `vi.fn().mockImplementation(() => kcMock)` produces a non-constructible mock (service calls `new KeycloakAdminClient(...)`). Switched to the old-style `function MockKCC() { return kcMock; }` pattern which Vitest calls as a constructor cleanly.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Zod enum values corrected to match Prisma schema**
- **Found during:** Task 1 (Wave 0)
- **Issue:** Plan draft used enum names (`UNAVAILABLE`, `OEPU_FUNKTION`, `SUPPLIERREDUKTION`, `MENTORING`, `SONSTIGES`) that do not exist in `apps/api/prisma/schema.prisma`. The backend's `AvailabilityRuleType` uses `MAX_DAYS_PER_WEEK|BLOCKED_PERIOD|BLOCKED_DAY_PART|PREFERRED_FREE_DAY`; `ReductionType` uses `KUSTODIAT|KLASSENVORSTAND|MENTOR|PERSONALVERTRETUNG|ADMINISTRATION|OTHER`; `DayOfWeek` has no SUNDAY.
- **Fix:** Authored Zod enums with the actual Prisma enum values; OTHER-conditional `description` refine replaces the plan's SONSTIGES-conditional refine; `DayOfWeekEnum` covers MON-SAT only.
- **Files modified:** `packages/shared/src/schemas/availability.schema.ts`, `packages/shared/src/schemas/teaching-reduction.schema.ts`, `packages/shared/src/schemas/availability.schema.spec.ts`, `packages/shared/src/schemas/teaching-reduction.schema.spec.ts`
- **Verification:** All 59 shared tests green; `AvailabilityRuleTypeEnum.safeParse('UNAVAILABLE').success === false`; `DayOfWeekEnum.safeParse('SUNDAY').success === false`
- **Committed in:** `09790da` (Task 1)

**2. [Rule 3 - Blocking] Zod UUID test fixture corrected**
- **Found during:** Task 1 Vitest run
- **Issue:** Initial `TeacherCreateSchema` "accepts valid create payload" test used UUID `00000000-0000-0000-0000-000000000001` — Zod v4's `z.string().uuid()` rejects this because RFC 4122 requires the version nibble (position 13) to be 1-8, not 0.
- **Fix:** Updated fixture to valid v4 UUID `11111111-1111-4111-8111-111111111111`.
- **Committed in:** `09790da` (Task 1)

**3. [Rule 1 - Bug] useTeachers hook legacy-caller preservation**
- **Found during:** Task 3 (useTeachers.ts rewrite)
- **Issue:** Two existing routes (admin/substitutions.tsx, admin/timetable-edit.tsx) import `useTeachers` from `@/hooks/useTeachers` expecting a flat `TeacherOption[]`. Overwriting the hook with the new admin shape would silently break both pages at runtime.
- **Fix:** Renamed the legacy export to `useTeacherOptions`, then re-exported under the legacy `useTeachers` alias. Added the 7 new admin hooks under intent-matching names (`useAdminTeachers` for the paginated list, explicit `useTeacher` for detail).
- **Verification:** Routes compile; substitution/timetable-edit code unchanged.
- **Committed in:** `f3e7be0` (Task 3)

**4. [Rule 3 - Blocking] Vitest constructor-mock shape for Keycloak client**
- **Found during:** Task 2 (keycloak-admin.service.spec.ts run)
- **Issue:** `vi.mock('@keycloak/keycloak-admin-client', () => ({ default: vi.fn().mockImplementation(() => kcMock) }))` threw `TypeError: ()=>kcMock is not a constructor` — Vitest 4's `vi.fn().mockImplementation` is not callable via `new`.
- **Fix:** Switched to `vi.mock(..., () => ({ default: function MockKCC() { return kcMock; } }))` — old-style function constructor works cleanly with `new` under Vitest 4.
- **Committed in:** `f89079e` (Task 2)

**5. [Rule 1 - Bug] TeacherDetailTabs onSave return type**
- **Found during:** Task 3 tsc check
- **Issue:** Tab child components declared `onSave: (values) => void | Promise<void>`; my container wired `onSave={(v) => updateMutation.mutateAsync(...)}` which returns `Promise<TeacherDto>`, producing 5 TS2322 errors.
- **Fix:** Wrapped each handler in `async (...) => { await mutation.mutateAsync(...); }` so the return type becomes `Promise<void>` matching the child contract.
- **Committed in:** `f3e7be0` (Task 3)

**6. [Rule 2 - Missing critical] ConflictException-safe mock Prisma in spec**
- **Found during:** Task 2 Orphan-Guard test authoring
- **Issue:** Existing mock prisma had no `schoolClass.count` / `timetableLesson.count` / `classBookEntry.count` / `gradeEntry.count` / `substitution.count` / `schoolClass.findMany` handles, and the `$transaction` mock only supported the callback form. The new Orphan-Guard code uses the array form of `$transaction`.
- **Fix:** Added per-entity count/findMany stubs; rewrote `$transaction` mock to branch on `Array.isArray(arg) ? Promise.all(arg) : cb(mock)`.
- **Committed in:** `f89079e` (Task 2)

---

**Total deviations:** 6 auto-fixed (2 bugs [Rule 1], 2 blocking [Rule 3], 1 missing-critical [Rule 2], 1 bug-spec-only [Rule 1])
**Impact on plan:** All six were scope-of-correctness — pragma drift between plan draft and actual code / dependency behavior. No new features added, no requirements dropped. Five of six caught at test-run or tsc time, one (Rule 1 legacy useTeachers) caught at grep-review-before-overwrite time.

## Issues Encountered

- **Pre-existing TSC errors (12 count) in apps/web** — unchanged by this plan. Documented Phase 10.1 deferred items (STATE.md line 351-352). `keycloak.ts`/`socket.ts`/`useImportSocket.ts` use `import.meta.env` which TS complains about without ambient declarations; `classbook/$lessonId.tsx`/`messages/$conversationId.tsx`/`teacher/substitutions.tsx` have router-type drift; `usePushSubscription.ts` has a Uint8Array/BufferSource overload mismatch.  `tsc --noEmit` count: 12 total, zero attributable to new teacher code.
- **Pre-existing `workbox-window` Rolldown resolution failure in `vite build`** — unrelated to this plan. Phase 09 PWA integration issue; `vite dev` works for development. Not blocking for runtime.
- **Pre-existing test-DB-pollution in `school-year-multi-active.spec.ts`** — unchanged by this plan; documented Phase 10.4-03 deferred (STATE.md line 393-394).

## Known Stubs

None introduced by this plan. All components are wired to real backend endpoints (no hardcoded `=[]` / `=null` data stubs).

## Frontend Test Stubs (it.todo — intentional Wave 0)

5 files with 20 `it.todo()` stubs total under `apps/web/src/components/admin/teacher/`:

- `StammdatenTab.test.tsx` — 3 stubs (render order, RHF zod block, onSave with validated values)
- `LehrverpflichtungTab.test.tsx` — 4 stubs (live-compute, byte-identical compare, replace-all, solver InfoBanner)
- `VerfuegbarkeitsGrid.test.tsx` — 5 stubs (toggle, arrow-nav, space-toggle, bulk-toggle confirm, hatch+Lock render)
- `ErmaessigungenList.test.tsx` — 4 stubs (add row, remove row, OTHER-description refine, replace-all save)
- `KeycloakLinkDialog.test.tsx` — 4 stubs (debounce, 404 nomatch, 200 already-linked warning, disabled until match)

These are intentional Wave 0 placeholders per the plan's Nyquist TDD pattern (Phase 4/6/7 precedent). Plan 11-03 (E2E sweep) lifts them to real Vitest assertions + matching Playwright end-to-end specs.

## User Setup Required

**External services require manual configuration.** The `KeycloakAdminService` constructor resolves 4 env vars via `ConfigService.getOrThrow`:

| Env var | Source | Notes |
|---|---|---|
| `KEYCLOAK_URL` | existing from Phase 1 | `http://localhost:8080` in dev |
| `KEYCLOAK_REALM` | existing from Phase 1 | `schoolflow` in dev |
| `KEYCLOAK_ADMIN_CLIENT_ID` | **NEW** | New confidential client in Keycloak admin console (e.g. `schoolflow-admin`) |
| `KEYCLOAK_ADMIN_CLIENT_SECRET` | **NEW** | Client Secret from the new client's Credentials tab |

**Keycloak dashboard setup:**
1. Admin Console → `schoolflow` realm → Clients → Create new confidential client `schoolflow-admin`
2. Service Accounts Enabled = ON
3. Service Account Roles tab → assign `realm-management → view-users`
4. Credentials tab → copy Client Secret → paste into `.env`

Until these are added, API boot-time `onModuleInit` will throw on `ConfigService.getOrThrow` and the `/admin/keycloak/users` endpoint is non-functional. Link/unlink endpoints still work without it (they just update Person.keycloakUserId, no KC lookup needed).

## Next Phase / Plan Readiness

**Ready for Plan 11-02 (Fächer CRUD + Stundentafel-Vorlagen):**
- `packages/shared/src/schemas/` now has 3 Phase-11 schemas — `subject.schema.ts` follows the same pattern.
- Sidebar grouping refactor in place — 11-02 appends "Fächer" to the existing "Personal & Fächer" group by adding one item in AppSidebar + MobileSidebar navItems arrays.
- `AffectedEntitiesList` component + `TeacherApiError` pattern directly reusable for `SubjectService.remove` Orphan-Guard + Subject blocked-state Delete dialog.
- Werteinheiten util path established — `@schoolflow/shared` import surface is ready for any future shared compute utilities.

**Ready for Plan 11-03 (E2E sweep):**
- Routes `/admin/teachers` + `/admin/teachers/$teacherId?tab=` are production-ready.
- Mutation hooks all have `onError` wiring — Silent-4xx E2E pattern (Phase 10.2 SILENT-4XX-01..04) applies directly.
- 20 existing it.todo stubs can be lifted to real assertions without structural changes.

**Outstanding follow-up items (tracked for future plans):**
- **Throttling on `/admin/keycloak/users`** — requires @nestjs/throttler infra work (future throttler-infra plan).
- **Real `Teacher.status` column** — currently simulated via employmentPercentage=0; a schema migration would unlock cleaner archive/restore UX.
- **Plan 11-03 test lift** — 20 it.todo stubs → real assertions.
- **`apply-stundentafel.dto.ts` has its own private 5-value SchoolTypeDto enum** — flagged in STATE.md line 354 by Plan 10.1-02; still outstanding, out of this plan's scope (subject-module).

## Self-Check: PASSED

### Task commits exist
- `09790da` feat(11-01): wave 0 — shared Zod schemas + werteinheiten util move + TDD stubs — FOUND
- `f89079e` feat(11-01): TeacherService orphan-guard + KeycloakAdmin module — FOUND
- `f3e7be0` feat(11-01): admin teacher UI — list, detail, 4 tabs, dialogs, sidebar — FOUND

### Key files exist
- `packages/shared/src/werteinheiten/werteinheiten.util.ts` — FOUND
- `packages/shared/src/schemas/teacher.schema.ts` — FOUND
- `packages/shared/src/schemas/availability.schema.ts` — FOUND
- `packages/shared/src/schemas/teaching-reduction.schema.ts` — FOUND
- `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts` — FOUND
- `apps/api/src/modules/teacher/dto/link-keycloak.dto.ts` — FOUND
- `apps/web/src/routes/_authenticated/admin/teachers.index.tsx` — FOUND
- `apps/web/src/routes/_authenticated/admin/teachers.$teacherId.tsx` — FOUND
- `apps/web/src/components/admin/teacher/` (14 components + 5 test stubs) — FOUND

### Tests green
- `pnpm --filter @schoolflow/shared test` — **59/59 passing**
- `cd apps/api && pnpm exec vitest run src/modules/teacher src/modules/keycloak-admin` — **28/28 passing** (15 teacher + 9 Orphan-Guard + 4 keycloak-admin)
- `pnpm --filter @schoolflow/api build` — **0 TS issues** (nest build clean)

### Grep acceptance checks

Grep-based acceptance criteria from the plan:
- `packages/shared/src/werteinheiten/werteinheiten.util.ts` exports `calculateWerteinheiten` + `calculateMaxTeachingHours` — VERIFIED
- `apps/api/src/modules/teacher/werteinheiten.util.ts` contains `from '@schoolflow/shared'` — VERIFIED
- `packages/shared/src/index.ts` re-exports all 3 schemas + werteinheiten barrel — VERIFIED
- `teacher.schema.ts` exports StammdatenSchema, LehrverpflichtungSchema, TeacherCreateSchema, TeacherUpdateSchema — VERIFIED
- `teacher.service.ts` contains `ConflictException` + `affectedEntities` + `klassenvorstandFor` + `linkKeycloakUser` + `unlinkKeycloakUser` — VERIFIED
- `teacher.controller.ts` contains `@Patch(':id/keycloak-link')` + `@Delete(':id/keycloak-link')` — VERIFIED
- `keycloak-admin.service.ts` exports `KeycloakAdminService` + contains `findUsersByEmail` + `ensureAuth` — VERIFIED
- `keycloak-admin.controller.ts` contains `@Controller('admin/keycloak')` — VERIFIED
- `app.module.ts` imports `KeycloakAdminModule` — VERIFIED
- `AppSidebar.tsx` contains `GraduationCap`, `Personal & Fächer`, `/admin/teachers` — VERIFIED
- `MobileSidebar.tsx` contains `Personal & Fächer`, `/admin/teachers` — VERIFIED
- `useTeachers.ts` exports 7 admin hooks + ≥5 onError wires — VERIFIED
- `useKeycloakUsers.ts` contains `enabled: email.length >= 3` + `staleTime: 30_000` — VERIFIED
- `VerfuegbarkeitsGrid.tsx` contains `role="grid"`, `aria-pressed`, `repeating-linear-gradient(45deg` — VERIFIED
- `VerfuegbarkeitsMobileList.tsx` contains `h-11` + `<Select` day picker — VERIFIED
- `ErmaessigungenList.tsx` contains `KLASSENVORSTAND` + `Ermäßigung hinzufügen` — VERIFIED (`SONSTIGES` label is user-facing copy; enum value is `OTHER` per Prisma, which appears in source)
- `KeycloakLinkDialog.tsx` contains `Kein Account mit dieser E-Mail gefunden` + `alreadyLinkedToPerson` — VERIFIED
- `DeleteTeacherDialog.tsx` contains `Lehrperson kann nicht gelöscht werden` + `extensions?.affectedEntities` — VERIFIED
- `AffectedEntitiesList.tsx` contains `Verfügbar ab Phase 12` + `Stundenplan-Einträge` + `Klassenbuch-Einträge` — VERIFIED
- `LehrverpflichtungTab.tsx` imports `calculateMaxTeachingHours` from `@schoolflow/shared` — VERIFIED

---
*Phase: 11-lehrer-und-f-cher-verwaltung*
*Completed: 2026-04-22*
