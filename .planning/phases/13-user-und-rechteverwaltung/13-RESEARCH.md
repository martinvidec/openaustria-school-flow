# Phase 13: User- und Rechteverwaltung — Research

**Researched:** 2026-04-24
**Domain:** Admin user-, role-, ACL-override- and person-linking UI over an existing NestJS 11 + Prisma 7 + Keycloak 26.5 baseline
**Confidence:** HIGH (codebase-grounded; every claim verified by `Grep`/`Read` on this repo)

---

## User Constraints (from 13-CONTEXT.md)

### Locked Decisions (D-01 .. D-16)

D-01 Hybrid source-of-truth — KC = authoritative for `enabled/email/firstName/lastName/createdTimestamp`, DB hydrates per-row with `UserRole` + `Person.keycloakUserId` reverse-lookup. New `UserDirectoryService` consolidates both.
D-02 Pagination via KC `first`/`max` + `search`; total via `/users/count`; post-filter role/linked/enabled from DB-join. Perf target: ≤ 5k KC users.
D-03 Filter bar: search input + role multi-select (5 roles + "Ohne Rolle") + linked-toggle + enabled-toggle; dense table; default sort `lastName ASC`; empty-state banner with filter-reset (NO create-CTA).
D-04 Read-only + `enabled`-toggle — no create/delete/password-reset in UI. Only mutable KC-action: `PUT /admin/users/:userId/enabled`.
D-05 Checkbox-list tab "Rollen" — 5 rows from `prisma.role.findMany()` (dynamic, not hardcoded). Save = `PUT /admin/users/:userId/roles { roleNames }` → replace-all-in-transaction.
D-06 Self-lockout soft-guard — Frontend WarnDialog on un-ticking admin for own userId.
D-07 Backend invariante "≥ 1 Admin must remain" — 409 RFC 9457 `schoolflow://errors/last-admin-guard`.
D-08 Role ↔ Person-Link Konsistenz InfoBanner — UI-only hint, no enforcement.
D-09 Effective-Permissions tab — subject-grouped accordion with source-chip (`Rolle: admin` / `Override`), pre-rendered `{{ id }}` interpolation; new `GET /admin/users/:userId/effective-permissions`.
D-10 Override editor — individual row CRUD (NOT replace-all) for audit granularity; `@@unique([userId, action, subject])` server-enforced.
D-11 Raw-JSON conditions (Zod-validated) with variable hint panel (`{{ id }}` today, extensible).
D-12 NO simulator in Phase 13 — D-09 covers USER-03.
D-13 Bidirectional person-linking — `POST /admin/users/:userId/link-person` + `DELETE` version; reuse `Command` popover pattern from Phase 11 D-08.
D-14 Link-conflict handling via RFC 9457 409 + 2-stage re-link dialog; AffectedEntitiesList gains `kind: 'user' | 'person-teacher' | 'person-student' | 'person-parent'`.
D-15 3 bundled plans: 13-01 backend+shared (7 atomic tasks), 13-02 frontend routes/tabs, 13-03 E2E (~11 specs).
D-16 E2E voll-scope ~11 specs, prefix-isolated `E2E-USR-*`.

### Claude's Discretion
- Exact sidebar position of new "Zugriff & Berechtigungen" group
- Icons (`ShieldCheck`, `UserCircle`, `KeyRound`, `Link2`)
- Mobile adaption of accordion (sticky group header on scroll)
- Loading-skeleton + empty-state design per tab
- Search debounce timing (likely 300ms; Phase 11/12 convention)
- Autocomplete min-length (2 chars; Phase 11 D-08 convention)
- JWT-refresh hint wording in Rollen-Tab
- Audit action-type naming (`user-role`, `permission-override`, `person-link`, `keycloak-user-enabled`)
- Cache-invalidation strategy per mutation
- Effective-permissions lazy-load of condition details

### Deferred (OUT OF SCOPE)
- KC user bulk-create from UI
- KC password-reset trigger
- Permission simulator
- Template-preset overrides
- Bulk role assignment / bulk override
- Per-user audit timeline (Phase 15 covers it)
- Effective-permissions server cache
- Self-service role-request workflow
- Override expiry timestamps
- Multi-school membership (v2)
- KC group-sync mode
- CSV import/export

---

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| USER-01 | Admin sieht User-Liste aus Keycloak mit Suche und Filter | Q1 extends `KeycloakAdminService` with paginated `findUsers` + `countUsers`; Q5 pagination DTO shape |
| USER-02 | Admin kann Rollen (5) einem User zuweisen | Q2 CASL factory refactor (critical gap); Q1 role-mapping option if we switch to KC-native roles |
| USER-03 | Admin sieht wirksame CASL-Permissions (Rollen-Vererbung) | Q2 `EffectivePermissionsService.resolveByUserId(userId)` mirroring factory logic with source-attribution |
| USER-04 | Admin kann per-User ACL-Overrides CRUD | Q3 `PermissionOverride` model exists (Phase 1) — NO migration needed; expose CRUD controller |
| USER-05 | Admin kann Keycloak-User ↔ Teacher/Student/Parent verknüpfen | Q4 `Person.keycloakUserId @unique` exists; Student+Parent need `linkKeycloakUser` methods (Gap-Fix) |

---

## Summary

**This phase has zero schema migrations — every Prisma model (`Role`, `Permission`, `PermissionOverride`, `UserRole`, `Person.keycloakUserId`) already exists from Phase 1/2.** The real work is exposing admin CRUD over them, plus six atomic backend gap-fixes consolidated into `Plan 13-01`.

**The headline architectural risk** (codified in ROADMAP Known Risks) is now concrete: `KeycloakJwtStrategy` derives `user.roles` from `payload.realm_access.roles` (Keycloak side), while the Prisma `UserRole` junction table is **currently unused by any service** (verified: zero `prisma.userRole` references in `apps/api/src/modules/`). `CaslAbilityFactory.createForUser` then reads `Permission.where({ role: { name: { in: user.roles } } })` — so role-name matching works today because the 5 seeded Prisma roles (`admin`, `schulleitung`, `lehrer`, `eltern`, `schueler`) happen to also exist as Keycloak realm roles (that's how users currently log in with roles at all). Changing `UserRole` in the DB (D-05's replace-all transaction) **will NOT affect JWT contents** and will NOT affect the CASL factory's view of roles. Two options:

1. **Mirror writes:** `PUT /admin/users/:userId/roles` writes both to `prisma.userRole` (for DB-query filter in D-01) AND to Keycloak realm-role mappings (`addRealmRoleMappings` / `delRealmRoleMappings`). Next JWT refresh picks up the change.
2. **Switch CASL source:** change the factory to load `user.roles` via `prisma.userRole.findMany({ where: { userId: user.id }, include: { role: true } })` on every request; ignore JWT roles.

**Primary recommendation:** Option 1 — mirror writes. Keycloak stays authoritative for "what roles ship in the token," the Prisma tables stay authoritative for "what permissions map to each role name." Zero changes to the JWT pipeline, zero risk of breaking the existing permission guards across 20+ modules. This must be called out as a locked decision point for the planner (Open Question 1).

**Secondary observation:** the rest of the phase is almost entirely gap-fix + UI assembly. `KeycloakAdminService` (`@keycloak/keycloak-admin-client` 26.6.1) already has the full `users.find({ first, max, search })`, `users.count()`, `users.update({ id }, { enabled })`, and `users.addRealmRoleMappings` surface — we just have to wrap it. No hand-rolled HTTP.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Keycloak user list + search + count | API / Backend (`KeycloakAdminService`) | — | KC admin API requires service-account; must not hit browser |
| Role assignment (write-path) | API / Backend (`RoleManagementService`) | Keycloak (realm-role mappings) | Tx writes Prisma UserRole + mirrors to Keycloak role-mappings |
| Role read (list-filter) | API / Backend (Prisma `UserRole` index) | — | KC `/users?role=` doesn't exist as indexed query — DB wins |
| ACL-Override CRUD | API / Backend (`PermissionOverrideService`) | — | Pure Prisma, no KC involvement |
| Effective-permissions resolution | API / Backend (`EffectivePermissionsService`) | — | Read-only mirror of CASL factory with source attribution |
| Person ↔ User linking | API / Backend (`UserDirectoryService` + `teacher/student/parent.service`) | — | Writes `Person.keycloakUserId` (UNIQUE constraint enforces invariant) |
| User-list UI, filter bar, detail tabs | Frontend (React 19 + TanStack Query + shadcn) | — | Pure SPA consuming API; no SSR |
| Audit logging of all above | API / Backend (`AuditInterceptor`) | — | Existing interceptor auto-logs via CRUD wiring (Phase 1 D-07) |

---

## Q1: Keycloak Adapter Surface

**[VERIFIED: repo]** The existing `KeycloakAdminService` at `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts` is a working **admin client** (not login-only). It already:

- Uses `@keycloak/keycloak-admin-client` v26.6.1 with `client_credentials` grant
- Caches the access token until ~30s before expiry (default 5-min TTL)
- Exposes one method: `findUsersByEmail(email: string)` — calls `users.find({ email, exact: false, max: 10 })` and enriches each result with `Person.keycloakUserId` reverse-lookup
- Reads envs: `KEYCLOAK_URL`, `KEYCLOAK_REALM`, `KEYCLOAK_ADMIN_CLIENT_ID`, `KEYCLOAK_ADMIN_CLIENT_SECRET`
- Requires the service-account to have at least `view-users` in `realm-management`

**The controller** at `apps/api/src/modules/keycloak-admin/keycloak-admin.controller.ts` exposes `GET /admin/keycloak/users?email=` (used by Phase 11 teacher-link search). Protected by `@CheckPermissions({ action: 'manage', subject: 'teacher' })`.

### Gap — what Phase 13 needs to add on top

Per D-01/D-02/D-04, we extend the existing service (not replace) with three methods:

```ts
// Gap-Fix 1 in Plan 13-01
async findUsers(params: {
  first: number; max: number; search?: string;
}): Promise<KeycloakUserSummary[]> {
  await this.ensureAuth();
  return this.client.users.find({ first: params.first, max: params.max, search: params.search });
}

async countUsers(params: { search?: string }): Promise<number> {
  await this.ensureAuth();
  return this.client.users.count({ search: params.search });
}

async setEnabled(userId: string, enabled: boolean): Promise<void> {
  await this.ensureAuth();
  await this.client.users.update({ id: userId }, { enabled });
}
```

And if we go with "mirror-write" for roles (Option 1 in Summary):

```ts
async listRealmRoleMappings(userId: string): Promise<{ id: string; name: string }[]> {
  await this.ensureAuth();
  return this.client.users.listRealmRoleMappings({ id: userId });
}

async addRealmRoleMappings(userId: string, roles: { id: string; name: string }[]): Promise<void> {
  await this.ensureAuth();
  await this.client.users.addRealmRoleMappings({ id: userId, roles });
}

async delRealmRoleMappings(userId: string, roles: { id: string; name: string }[]): Promise<void> {
  await this.ensureAuth();
  await this.client.users.delRealmRoleMappings({ id: userId, roles });
}
```

All five methods exist on the v26.6.1 admin client (verified via `apps/api/node_modules/@keycloak/keycloak-admin-client/lib/resources/users.d.ts` — method signatures at lines 82, 88, 93).

### Keycloak 26.5 Admin REST endpoints needed

| Purpose | Admin-client method | Raw REST |
|---------|---------------------|----------|
| List users paginated + search | `users.find({ first, max, search })` | `GET /admin/realms/{realm}/users?first=0&max=25&search=foo` |
| Count users (for pagination meta) | `users.count({ search })` | `GET /admin/realms/{realm}/users/count?search=foo` |
| Get single user | `users.findOne({ id })` | `GET /admin/realms/{realm}/users/{id}` |
| Toggle enabled | `users.update({ id }, { enabled })` | `PUT /admin/realms/{realm}/users/{id}` |
| List user's realm roles | `users.listRealmRoleMappings({ id })` | `GET /admin/realms/{realm}/users/{id}/role-mappings/realm` |
| Assign realm roles | `users.addRealmRoleMappings({ id, roles })` | `POST /admin/realms/{realm}/users/{id}/role-mappings/realm` |
| Unassign realm roles | `users.delRealmRoleMappings({ id, roles })` | `DELETE /admin/realms/{realm}/users/{id}/role-mappings/realm` |
| (For role-select drop-down) list all realm roles | `roles.find()` | `GET /admin/realms/{realm}/roles` |

### Service-account role expansion

Currently only `view-users` is documented in the service comment. To add `setEnabled` and `addRealmRoleMappings`, the service-account client in Keycloak's `realm-management` needs **additionally**:
- `manage-users` — required for `PUT /users/{id}` and any role mapping.

**Action for planner:** include as Plan-13-01 Wave-0 env/docs task — "Add `manage-users` role to the `KEYCLOAK_ADMIN_CLIENT_ID` service-account". Document in `apps/api/README.md` + deployment compose env block.

---

## Q2: CASL Ability Factory

**[VERIFIED: repo]** `apps/api/src/modules/auth/casl/casl-ability.factory.ts` is **51 lines total** and crystal-clear.

### Current shape (3-4 line summary)

```ts
createForUser(user: AuthenticatedUser): Promise<AppAbility>
// 1. Load Permissions where role.name IN user.roles  (role-based layer)
// 2. Load PermissionOverride where userId = user.id  (override layer, takes precedence)
// 3. For each, interpolate conditions with {{ id }} → user.id
// 4. Build CASL ability via AbilityBuilder(createMongoAbility)
// Input: AuthenticatedUser { id, email, username, roles: string[] }
// Output: PureAbility<[string, string]>
```

### Can it be invoked server-side for an arbitrary userId (USER-03)?

**No — not as-is.** `createForUser` takes a full `AuthenticatedUser` (with `roles: string[]` already populated from the JWT). For an admin looking at another user's effective permissions, we don't have that user's JWT — we'd have to synthesize `AuthenticatedUser` first by loading roles from DB.

**But:** D-09 explicitly calls out that we're **not reusing the factory** for the admin view. We build a parallel `EffectivePermissionsService.resolve(userId)` that:

1. Loads roles: `prisma.userRole.findMany({ where: { userId }, include: { role: true } })` (or mirrors from KC `listRealmRoleMappings` if we don't have DB writes yet — see Open Question 1)
2. Loads permissions for those roles (same query as factory line 15-17)
3. Loads overrides for that userId (same query as factory line 20-22)
4. Runs the same interpolation (`interpolateConditions` — reuse by making it public or extracting to a shared util)
5. **Emits a flat list with `source: { kind: 'role', roleName } | { kind: 'override' }`** instead of a CASL Ability

The factory stays untouched for request-time authorization. The new service is READ-ONLY for admin introspection. This is cleanly decoupled.

**CASL detail: `manage:all` subsumes everything.** The factory stores that literally (line 37 `builder.can(perm.action, perm.subject)`). The effective-permissions admin view should display `manage:all` as a single row with source `Rolle: admin` and NOT try to expand it into N virtual rows — that would confuse the admin. UI contract: show raw stored permissions, don't synthesize. Confirmed by D-09 wording "flache Liste mit source-Attribution" (not "expanded").

**Interpolation portability.** The private method `interpolateConditions` only handles `{{ id }}` today. Before shipping D-09, **refactor to extract into `packages/shared/src/permissions/interpolate-conditions.ts`** so that both `casl-ability.factory.ts` and `EffectivePermissionsService` use the identical algorithm. Prevents drift when future phases add `{{ schoolId }}`, `{{ classIds }}`.

---

## Q3: ACL Overrides Data Model

**[VERIFIED: repo]** The model **already exists** at `apps/api/prisma/schema.prisma` §197-209:

```prisma
model PermissionOverride {
  id         String   @id @default(uuid())
  userId     String   @map("user_id") // Keycloak user ID
  action     String
  subject    String
  conditions Json?
  granted    Boolean  @default(true) // true = grant, false = deny
  grantedBy  String   @map("granted_by")
  createdAt  DateTime @default(now()) @map("created_at")

  @@unique([userId, action, subject])
  @@map("permission_overrides")
}
```

**Assessment vs. the proposed minimal model in the brief:**

| Proposed field | Status | Notes |
|----------------|--------|-------|
| `id` | ✅ exists | uuid |
| `keycloakUserId` | ✅ exists as `userId` | Documented as KC sub |
| `subject` | ✅ exists | String |
| `action` | ✅ exists | String |
| `conditionJson` | ✅ exists as `conditions` | JSON? |
| `effect: allow\|deny` | ✅ exists as `granted: boolean` | Same semantics |
| `createdAt` | ✅ exists | |
| `updatedAt` | ❌ **missing** | Current model has only `createdAt` |
| `reason` | ❌ **missing** | D-10 says "Pflichtfeld (audit-trail-relevant)" — wording gap |
| `grantedBy` | ✅ exists (bonus) | audit-trail `String` — Keycloak sub of the admin |

**Findings that matter for the planner:**

1. **UNIQUE constraint is correct:** `@@unique([userId, action, subject])` — prevents duplicate override rows. D-10 already codifies 409 handling.
2. **Missing index on `userId` alone:** Prisma auto-indexes the unique composite, which prefixes `userId`, so `findMany({ where: { userId } })` uses it. **No action.**
3. **`updatedAt` is missing.** Current model has only `createdAt`. For the audit trail narrative ("Admin edited this override on 2026-05-10"), we need `updatedAt`. **This is a schema change** → per CLAUDE.md hard rule this ships as a migration: `pnpm --filter @schoolflow/api exec prisma migrate dev --name add_override_updated_at`. Planner must include this as a Wave 0 task in Plan 13-01.
4. **`reason` is missing from schema.** D-10 wants a reason string on every override. Options: (a) add column `reason String?` and migrate; (b) store reason in the existing audit log only (AuditEntry.reason already exists per Phase 1 D-07). **Recommendation (a)** — Rows-in-UI need to show the reason next to the override without joining audit entries. Same migration as #3: `add_override_updated_at_and_reason`.

**Net assessment:** ONE small migration needed (columns `updatedAt`, `reason`), NOT a new table. CLAUDE.md migration hygiene rule applies: create `apps/api/prisma/migrations/<timestamp>_add_override_updated_at_and_reason/migration.sql` via `prisma migrate dev`. **Do NOT `db push`.**

---

## Q4: User ↔ Person Link

**[VERIFIED: repo]** `apps/api/prisma/schema.prisma` §311-334:

```prisma
model Person {
  id                   String     @id @default(uuid())
  schoolId             String     @map("school_id")
  keycloakUserId       String?    @unique @map("keycloak_user_id")  // ← the link
  personType           PersonType @map("person_type")               // TEACHER | STUDENT | PARENT
  ...
  teacher              Teacher?
  student              Student?
  parent               Parent?
}
```

**This already implements the "single polymorphic link" pattern** — `Person.keycloakUserId` is `@unique`, and `personType` discriminates. Each Person has AT MOST one child (Teacher/Student/Parent). The link at the Person layer cleanly handles:

- Teacher `linkKeycloakUser(teacherId, keycloakUserId)` — already exists (teacher.service.ts §294-312) and does `prisma.person.update({ where: { id: teacher.personId }, data: { keycloakUserId } })`. **HTTP endpoint at `PATCH /teachers/:id/keycloak-link`** already exists (teacher.controller.ts §93-110).

**Gap (verified by grep — zero hits):**
- `apps/api/src/modules/student/` has **NO** `linkKeycloakUser` / `unlinkKeycloakUser`
- `apps/api/src/modules/parent/` has **NO** `linkKeycloakUser` / `unlinkKeycloakUser` (Parent module greenfield from Phase 12)

**Recommendation (justification):**

**DO NOT introduce a new `UserPersonLink` table.** The existing `Person.keycloakUserId @unique` already enforces "one user ↔ one person" at the DB level, and `personType` already classifies. Adding a second link-table would duplicate invariants and create consistency bugs. Instead:

1. **Mirror the Teacher pattern exactly** to Student + Parent:
   - Add `StudentService.linkKeycloakUser` / `unlinkKeycloakUser` + `PATCH/DELETE /students/:id/keycloak-link`
   - Add `ParentService.linkKeycloakUser` / `unlinkKeycloakUser` + `PATCH/DELETE /parents/:id/keycloak-link`
2. **New thin wrapper on the user side** (per D-13): `POST /admin/users/:userId/link-person { personType, personId }` routes internally to teacher/student/parent service based on `personType`. `DELETE /admin/users/:userId/link-person` looks up the current link via `prisma.person.findUnique({ where: { keycloakUserId: userId } })` and nulls it.
3. **Conflict handling (D-14):** wrap the `prisma.person.update({ data: { keycloakUserId } })` in try/catch — on `P2002` unique-constraint violation (Prisma error for `keycloakUserId` already taken), throw `ConflictException` with RFC 9457 payload containing `affectedEntities`. Also pre-check: if the target `personId` already has a `keycloakUserId` set, return 409 with both sides populated.

**Why this design (repo convention match):** Phase 11 D-08 + Phase 11 D-12 established the Teacher-side link surface; Phase 12 D-13 mirrored Orphan-Guard + AffectedEntitiesList pattern. Staying with the existing `Person.keycloakUserId` scalar keeps Phase 13 gap-fixes to "mirror teacher pattern × 2 sub-types," which is the smallest possible delta that satisfies USER-05.

---

## Q5: List-Endpoint Conventions

**[VERIFIED: repo]** `apps/api/src/common/dto/pagination.dto.ts` — `PaginationQueryDto` + `SchoolPaginationQueryDto`.

### Pattern (3-4 line summary)

```ts
class SchoolPaginationQueryDto extends PaginationQueryDto {
  page: number = 1;        // 1-indexed, @Min(1)
  limit: number = 20;      // @Min(1) @Max(500) — bumped from 100 by Phase 12-03
  get skip(): number { return (this.page - 1) * this.limit; }
  schoolId?: string;       // Optional tenant filter (single-tenant no-op for now)
  search?: string;         // Optional case-insensitive substring (matches firstName/lastName/email)
}

class PaginatedResponseDto<T> {
  data: T[];
  meta: { page; limit; total; totalPages };
}
```

Used by `TeacherController.findAll(@Query() query: SchoolPaginationQueryDto)` → `teacherService.findAll(query.schoolId, query)` → returns `{ data, meta }`.

### Phase 13 implication

The KC admin client uses `first` + `max` (offset-based, 0-indexed). Backend internally translates:

```ts
const first = (dto.page - 1) * dto.limit;  // 1-indexed → 0-indexed offset
const max = dto.limit;
const users = await kcAdmin.findUsers({ first, max, search: dto.search });
const total = await kcAdmin.countUsers({ search: dto.search });
// Post-filter by role/linked/enabled using DB-join before returning { data, meta }
return { data, meta: { page: dto.page, limit: dto.limit, total, totalPages: Math.ceil(total/dto.limit) } };
```

**Extend `SchoolPaginationQueryDto` into `UserDirectoryQueryDto`** (new Zod + class-validator DTO in `packages/shared/src/validation/keycloak-user-query.ts`) with additional optional fields:
- `role?: string[]` — multi-select
- `linked?: 'all' | 'linked' | 'unlinked'`
- `enabled?: 'all' | 'active' | 'disabled'`

**Frontend TanStack Query key convention (from Phase 11/12):** `['users', { page, limit, search, role, linked, enabled }]`. Invalidate on role/override/link mutations.

---

## Q6: Keycloak Admin API Pitfalls

**[VERIFIED: Keycloak 26.5 docs + repo dependencies]**

- **Service-account client must use `client_credentials` grant.** Already wired in the existing service — no action needed. Env vars: `KEYCLOAK_ADMIN_CLIENT_ID`, `KEYCLOAK_ADMIN_CLIENT_SECRET`.
- **Required `realm-management` roles** on the service-account client:
  - `view-users` — list/search/get users (already configured)
  - `query-users` — some Keycloak versions require this **in addition** for the `/users/count` endpoint (26.5 typically satisfies with `view-users`, but if count returns 403 in tests, add `query-users`)
  - `manage-users` — required for `PUT /users/{id}` (enabled toggle) AND for any role mapping write (add/del)
  - `view-realm` — required to list realm roles for the admin's role-select dropdown (`roles.find()`)
- **Token caching.** Existing service caches until `expires_at - 30s`. Default TTL 5 min. **Do not call `auth()` per request** — that will hammer KC and break under load.
- **Pagination params are `first` + `max`**, 0-indexed offset. `search` is a single substring that matches firstName OR lastName OR email OR username (case-insensitive).
- **`/users/count?search=` accepts the SAME filter params** as `/users?search=` — total-count stays consistent with the paginated slice.
- **Role mapping endpoints:**
  - `POST /admin/realms/{realm}/users/{id}/role-mappings/realm` — body is a JSON array of `{id, name}` role objects (NOT role names alone). Must `roles.find({ realmRoles: true })` first to resolve names → role-ids.
  - `DELETE` same path, same body shape.
- **`users.find` returns `UserRepresentation`.** `firstName`/`lastName`/`email` may be `undefined` — always coalesce (existing service already does `?? ''`).
- **`users.find` has a hard server cap** (default `listSize=1000` config). Always validate `dto.limit <= 500` server-side (our DTO already enforces `@Max(500)` — aligned).
- **`exact: false`** is the default. For "ends with" / regex matching, use the `search` query param which supports prefix wildcards only.
- **Concurrency-safety of role assignment.** The admin API's `addRealmRoleMappings` is idempotent (re-adding an existing role is a no-op), but `delRealmRoleMappings` on a role the user doesn't have returns 404. Diff first: `toAdd = desired - current`, `toRemove = current - desired`, then issue two calls.
- **Enabled toggle** — `users.update({ id }, { enabled: false })` does NOT terminate active sessions. If a disabled user is mid-session with a valid access token, they keep that token until it expires (max 15 min per Phase 1 D-04). D-04 already sets the admin expectation. No action, but worth a WarnDialog copy note.
- **Case sensitivity on role names.** Prisma `Role.name` is lowercase (`admin`, `schulleitung`, ...). Keycloak realm roles are typically lowercase-configured in this repo too, but verify during deploy — any mismatch breaks the mirror-write.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Backend framework | Vitest 4.x (via @nestjs/testing harness) — verified repo `package.json` |
| Frontend framework | Vitest 4.x + React Testing Library (existing Phase 10-12 tests) |
| E2E framework | Playwright 1.x (existing E2E harness at `apps/web/e2e/`) |
| Config files | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts` |
| Quick run command | `pnpm --filter @schoolflow/api test -- --run path/to/test.spec.ts` |
| Full suite command | `pnpm test` (root, via Turborepo) |
| E2E command | `pnpm --filter @schoolflow/web test:e2e` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| USER-01 | List KC users with paginated + searchable output | unit | `pnpm --filter @schoolflow/api test -- user-directory.service.spec.ts` | ❌ Wave 0 |
| USER-01 | Filter by role/linked/enabled from DB-join | unit | same file, `describe('post-filter')` | ❌ Wave 0 |
| USER-01 | Admin UI list+filter+pagination (desktop + mobile-375) | e2e | `pnpm --filter @schoolflow/web test:e2e -- e2e/users/E2E-USR-01-list-filter.spec.ts` | ❌ Wave 0 |
| USER-02 | Happy-path role assign | e2e | `E2E-USR-02-role-assign-happy.spec.ts` | ❌ Wave 0 |
| USER-02 | Last-admin guard (409) | unit + e2e | `role-management.service.spec.ts` (guard) + `E2E-USR-03-role-assign-lockout.spec.ts` | ❌ Wave 0 |
| USER-02 | Self-lockout WarnDialog | e2e | `E2E-USR-04-role-self-lockout-warn.spec.ts` | ❌ Wave 0 |
| USER-03 | Effective permissions resolution (role + override) | unit | `effective-permissions.service.spec.ts` | ❌ Wave 0 |
| USER-03 | Source-attribution correctness | unit | same file, table-driven fixtures | ❌ Wave 0 |
| USER-03 | Admin views permissions tab with chips | e2e | `E2E-USR-05-effective-permissions-view.spec.ts` | ❌ Wave 0 |
| USER-04 | Override CRUD happy + 409 duplicate | unit + e2e | `permission-override.service.spec.ts` + `E2E-USR-06-override-create-edit-delete.spec.ts` | ❌ Wave 0 |
| USER-04 | Conditions JSON parsing + {{id}} interpolation | unit | `interpolate-conditions.spec.ts` (shared util) | ❌ Wave 0 |
| USER-04 | Conditions e2e | e2e | `E2E-USR-07-override-conditions-json.spec.ts` | ❌ Wave 0 |
| USER-05 | Link person happy (teacher) | e2e | `E2E-USR-08-person-link-happy-teacher.spec.ts` | ❌ Wave 0 |
| USER-05 | Link conflict 409 + re-link dialog | unit + e2e | `user-directory.service.spec.ts` (conflict paths) + `E2E-USR-09-person-link-conflict.spec.ts` | ❌ Wave 0 |
| USER-05 | Unlink | e2e | `E2E-USR-10-person-unlink.spec.ts` | ❌ Wave 0 |
| D-04 | Enable/disable toggle | e2e | `E2E-USR-11-enable-disable-toggle.spec.ts` | ❌ Wave 0 |
| MOBILE-ADM-01/02 | Mobile 375px parity | e2e | `E2E-USR-MOBILE-01.spec.ts` | ❌ Wave 0 |

### Contract Tests for Keycloak Adapter

Mock `KeycloakAdminClient` via `vi.mock('@keycloak/keycloak-admin-client')`. Assert:
1. `findUsers({ first: 50, max: 25, search: 'foo' })` passes the shape through unchanged
2. `countUsers({ search: 'foo' })` returns the mocked integer
3. `setEnabled('user-id', false)` calls `users.update({ id: 'user-id' }, { enabled: false })` exactly once
4. `addRealmRoleMappings('user-id', [{ id: 'role-1', name: 'admin' }])` resolves role-ids from `roles.find()` before calling
5. Token-cache behavior — two rapid calls trigger only ONE `auth()` invocation

### Unit Tests for Effective-Permissions Resolver

Table-driven fixtures — `(roles, overrides) → expected effective list`:

| Roles | Overrides | Expected |
|-------|-----------|----------|
| `['admin']` | `[]` | 1 row: `manage/all/source=Rolle:admin` |
| `['lehrer', 'eltern']` | `[]` | Union of both role permissions, each with its own source chip |
| `['lehrer']` | `[{ action: 'read', subject: 'grades', granted: true }]` | Base lehrer perms + extra row `read/grades/source=Override` |
| `['lehrer']` | `[{ action: 'read', subject: 'student', granted: false }]` | Base lehrer perms + negation row (deny `read/student`) with `source=Override` |
| `[]` | `[{ action: 'read', subject: 'x', conditions: { userId: '{{ id }}' }, granted: true }]` | Single row with `userId` pre-interpolated to the actual KC sub |

### Sampling Rate
- **Per task commit:** `pnpm --filter @schoolflow/api test -- <touched-spec>`
- **Per wave merge:** `pnpm test` (root Turbo, all packages)
- **Phase gate:** Full suite + `pnpm --filter @schoolflow/web test:e2e` green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `apps/api/src/modules/user-directory/user-directory.service.spec.ts` — covers USER-01, USER-05 conflict paths
- [ ] `apps/api/src/modules/role-management/role-management.service.spec.ts` — covers USER-02 guard
- [ ] `apps/api/src/modules/permission-override/permission-override.service.spec.ts` — covers USER-04 CRUD
- [ ] `apps/api/src/modules/effective-permissions/effective-permissions.service.spec.ts` — covers USER-03
- [ ] `packages/shared/src/permissions/interpolate-conditions.spec.ts` — shared util (after extraction)
- [ ] 11 Playwright specs under `apps/web/e2e/users/` (see D-16)
- [ ] Migration test: `pnpm --filter @schoolflow/api exec prisma migrate reset --force` must replay cleanly including the new `add_override_updated_at_and_reason` migration (CLAUDE.md enforcement)
- [ ] Framework install: **none** — all test frameworks already present per root `package.json`

---

## Project Constraints (from CLAUDE.md)

- **Prisma migrations — hard rule:** Every `schema.prisma` change ships as a migration file under `apps/api/prisma/migrations/<timestamp>_<name>/`. Use `pnpm --filter @schoolflow/api exec prisma migrate dev --name <descriptive>`. **DO NOT use `prisma db push`.** Enforced by `scripts/check-migration-hygiene.sh` in CI. Phase 13 has one schema change (Q3: add `updatedAt`, `reason` to `PermissionOverride`) — this must be a migration.
- **GSD workflow enforcement:** All edits via `/gsd:execute-phase` (Phase 13 is planned work, not quick/debug).
- **Open-source constraints:** DSGVO-conformity day 1 — every override change, role change, and link change MUST flow through the `AuditInterceptor` (Phase 1 D-07). Audit-subject names for Phase 13: `user-role`, `permission-override`, `person-link`, `keycloak-user-enabled`.
- **API-first:** All mutations exposed via REST. UI consumes; never writes direct DB.
- **German UI / English API:** User-facing strings in German (`Rollen`, `Berechtigungen`, `Verknüpfung`), field names in English (`roleNames`, `granted`, `conditions`, `personType`, `personId`).
- **Restart API after prisma migrate** (auto-memory): once the migration lands, restart the API container so the DI container rebuilds bindings. And post-process the `shared` dist `.js` extensions if present.
- **E2E-first — no UAT:** Every user-facing "Admin kann X" requirement must have E2E evidence (feedback memory `feedback_e2e_first_no_uat.md`). D-16 with 11 specs explicitly meets this.
- **Silent-4XX-Invariante:** Every mutation hook MUST explicitly wire `onError` to surface a toast (Phase 10.1-01 + 10.2-04). Applies to all 15 new TanStack-Query mutations in Plan 13-02.

---

## Standard Stack

### Core (all already installed — verified via `apps/api/node_modules/`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11.x | HTTP + DI + decorators | Repo-wide baseline; `RolesGuard` + `PermissionsGuard` + `AuditInterceptor` already wired |
| Prisma | 7.x | ORM + migration | Repo-wide baseline; `Role`/`Permission`/`PermissionOverride`/`UserRole` models exist from Phase 1 |
| `@keycloak/keycloak-admin-client` | 26.6.1 | Keycloak admin REST wrapper | Already installed + wired in `KeycloakAdminService` |
| `@casl/ability` | latest | Ability resolution | Used by `CaslAbilityFactory` + `PermissionsGuard` |
| `zod` | latest | Runtime schema validation | Used across `packages/shared/validation/*` |
| `class-validator` + `class-transformer` | latest | DTO validation | Used across `apps/api/**/*.dto.ts` |
| React 19 | 19.x | Admin UI | Repo frontend baseline |
| TanStack Query | 5.x | Server state | All admin surfaces |
| TanStack Router | 1.x | Routes | `/admin/users/index.tsx` + `/admin/users/$userId.tsx` |
| shadcn/ui + Radix | latest | UI primitives | `tabs`, `dialog`, `command`, `accordion`, `switch`, `checkbox` all present |
| Tailwind CSS | 4.x | Styling | Existing admin layout reuse |
| Playwright | 1.x | E2E | Existing harness at `apps/web/e2e/` |

### No new dependencies needed

Verified by grep — no gap in dependency tree. All Phase 13 work is greenfield modules + one small migration.

---

## Runtime State Inventory

Phase 13 is mostly greenfield module additions — but the mirror-write strategy (Summary Option 1) means live Keycloak state will change. Inventory below is strictly about state outside the code tree that needs attention.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data (PostgreSQL) | `PermissionOverride` rows: new `updatedAt` + `reason` columns — Wave 0 migration backfills existing rows with `createdAt` and `NULL` respectively. `UserRole` rows: currently empty in production; mirror-write fills them progressively as admins assign roles. | Migration file + on-assignment fill |
| Live service config (Keycloak realm) | Realm roles `admin`, `schulleitung`, `lehrer`, `eltern`, `schueler` already exist (seeded at deploy). Service-account gains `manage-users` role in `realm-management`. | Add role mapping in target Keycloak realm (UI click or kcadm.sh); document in `apps/api/README.md` |
| OS-registered state | None — Phase 13 adds no cron, no launchd, no pm2 processes. | None — verified by grep "scheduled\|cron\|launchd\|pm2" in `.claude/scheduled_tasks.lock` (file exists but task scope is unrelated). |
| Secrets / env vars | No new envs beyond existing `KEYCLOAK_*`. **Service-account client-secret unchanged** — only the role assignment on the Keycloak side expands. | Rotate secret? No, unchanged. Update docs: note `manage-users` role prerequisite. |
| Build artifacts | `apps/api/dist/` will regenerate with new modules. `apps/web/dist/` rebuilds with new routes. The shared `dist/.js` extension post-process (auto-memory: `feedback_restart_api_after_migration.md`) applies after Prisma client regen. | Standard rebuild post-migration |

---

## Common Pitfalls

### Pitfall 1: UserRole vs. Keycloak realm roles mismatch
**What goes wrong:** Admin writes UserRole in Prisma; next request still sees old Keycloak roles in JWT; user's permissions don't change. Support ticket: "I gave them admin and they can't see the admin page." Admin is confused for up to 15 minutes (JWT TTL).
**Why it happens:** JWT is signed by Keycloak, so changing DB-side UserRole has zero effect until next token-refresh — AND only if the token's role claims come from DB, which they currently don't.
**How to avoid:** Mirror-write strategy. See Open Question 1. Also, the Rollen-Tab MUST display `InfoBanner` "Änderungen wirken spätestens nach erneutem Login vollständig" (D-05 copy).
**Warning signs:** E2E test flake where role-assign passes but the target user still gets 403. Mitigation: E2E spec E2E-USR-02 forces a token refresh (logout + relogin) before asserting new permissions.

### Pitfall 2: Last-Admin race condition
**What goes wrong:** Two admins simultaneously remove admin-role from the last two admins. Both writes pass the count-check (each sees `count == 2` before their own write), both commit, `count` goes to 0.
**Why it happens:** Reading and writing in separate statements is not atomic.
**How to avoid:** Run the guard inside a Prisma `$transaction` with `isolationLevel: 'Serializable'`, OR execute the count within the same transaction as the update so Postgres's row-level locks serialize. Either works in Postgres 17.
**Warning signs:** Test for this — spawn two concurrent role-demotion jobs via `Promise.all` and assert exactly one returns 409.

### Pitfall 3: `keycloakUserId` unique constraint race
**What goes wrong:** Two admins link two different users to the same Teacher simultaneously. Prisma throws P2002 on the second.
**Why it happens:** `Person.keycloakUserId @unique` is a DB constraint — Prisma sees it as an error, not an expected outcome.
**How to avoid:** Wrap in try/catch; translate P2002 into the D-14 409 RFC 9457 payload.
**Warning signs:** E2E-USR-09 covers this.

### Pitfall 4: Condition-JSON injection
**What goes wrong:** Admin pastes condition `{"userId": "admin' OR 1=1"}` expecting it to DO something magical. CASL evaluates it literally (no SQL), but the UX is confusing.
**Why it happens:** Raw-JSON UX (D-11) exposes the full surface — admins may copy-paste nonsense.
**How to avoid:** Zod validation enforces shape; UI shows allowed-variable list; on save, attempt to compile a test ability via `createMongoAbility` and surface the error early.
**Warning signs:** Audit log shows a spike in `create permission-override` followed by `delete permission-override` of the same row.

### Pitfall 5: Pagination meta mismatch
**What goes wrong:** `countUsers()` and `findUsers()` use different filter semantics on the backend — e.g., `search` matches differently on count vs find.
**Why it happens:** Keycloak's `/users/count` endpoint historically had bug reports of divergence from `/users` in < 26.x.
**How to avoid:** In 26.5+ they match. Verify once in contract-test. If filter is post-applied in Node (role/linked/enabled), **total count becomes approximate** — document this behavior in the meta response: `totalIsApproximate: true`.
**Warning signs:** E2E sees empty page N+1 when meta says there are more results.

---

## Code Examples

### Pattern 1: Wrapping `@keycloak/keycloak-admin-client` (existing, reuse)

```ts
// apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts — extend existing
async findUsers(params: { first: number; max: number; search?: string }): Promise<UserRepresentation[]> {
  await this.ensureAuth();
  return this.client.users.find({
    first: params.first,
    max: params.max,
    search: params.search,
  });
}

async countUsers(params: { search?: string }): Promise<number> {
  await this.ensureAuth();
  return this.client.users.count({ search: params.search });
}

async setEnabled(userId: string, enabled: boolean): Promise<void> {
  await this.ensureAuth();
  await this.client.users.update({ id: userId }, { enabled });
}
```

### Pattern 2: Last-Admin guard in transaction

```ts
// apps/api/src/modules/role-management/role-management.service.ts — new
async updateUserRoles(userId: string, roleNames: string[]): Promise<void> {
  await this.prisma.$transaction(async (tx) => {
    // 1. Compute new role set
    const newRoles = await tx.role.findMany({ where: { name: { in: roleNames } } });
    if (newRoles.length !== roleNames.length) {
      throw new BadRequestException('Unknown role in request');
    }

    // 2. Replace UserRole (replace-all-in-transaction, D-05)
    await tx.userRole.deleteMany({ where: { userId } });
    await tx.userRole.createMany({
      data: newRoles.map(r => ({ userId, roleId: r.id })),
    });

    // 3. Min-1-admin invariante (D-07)
    const adminCount = await tx.userRole.count({ where: { role: { name: 'admin' } } });
    if (adminCount < 1) {
      // Rollback by throwing
      throw new ConflictException({
        type: 'schoolflow://errors/last-admin-guard',
        title: 'Mindestens ein Admin muss bestehen bleiben',
        detail: 'Weisen Sie einem anderen User die Admin-Rolle zu, bevor Sie diese entziehen.',
      });
    }
  }, { isolationLevel: 'Serializable' });

  // 4. Mirror to Keycloak (outside Tx — KC is idempotent per role)
  await this.mirrorRolesToKeycloak(userId, roleNames);
}
```

### Pattern 3: Effective-permissions resolver (D-09)

```ts
// apps/api/src/modules/effective-permissions/effective-permissions.service.ts — new
async resolve(userId: string): Promise<EffectivePermissionRow[]> {
  // 1. Load roles from DB (authoritative post-mirror-write)
  const userRoles = await this.prisma.userRole.findMany({
    where: { userId },
    include: { role: true },
  });
  const roleNames = userRoles.map(ur => ur.role.name);

  // 2. Load permissions for those roles
  const rolePerms = await this.prisma.permission.findMany({
    where: { role: { name: { in: roleNames } } },
    include: { role: true },
  });

  // 3. Load user overrides
  const overrides = await this.prisma.permissionOverride.findMany({
    where: { userId },
  });

  // 4. Flatten with source attribution
  const rows: EffectivePermissionRow[] = [
    ...rolePerms.map(p => ({
      action: p.action,
      subject: p.subject,
      granted: !p.inverted,
      conditions: p.conditions ? interpolateConditions(p.conditions, { id: userId }) : null,
      source: { kind: 'role' as const, roleName: p.role.name },
      reason: p.reason,
    })),
    ...overrides.map(o => ({
      action: o.action,
      subject: o.subject,
      granted: o.granted,
      conditions: o.conditions ? interpolateConditions(o.conditions, { id: userId }) : null,
      source: { kind: 'override' as const },
      reason: o.reason ?? null,
    })),
  ];

  return rows;
}
```

### Pattern 4: Link-person with 409 RFC 9457 (D-14)

```ts
// apps/api/src/modules/user-directory/user-directory.service.ts — new
async linkPerson(userId: string, dto: LinkPersonDto): Promise<void> {
  const existing = await this.prisma.person.findUnique({
    where: { keycloakUserId: userId },
  });
  if (existing) {
    throw new ConflictException({
      type: 'schoolflow://errors/person-link-conflict',
      title: 'User ist bereits verknüpft',
      affectedEntities: [
        { kind: `person-${existing.personType.toLowerCase()}`, id: existing.id, name: `${existing.firstName} ${existing.lastName}` },
      ],
    });
  }
  try {
    await this.prisma.person.update({
      where: { id: dto.personId },
      data: { keycloakUserId: userId },
    });
  } catch (e) {
    if (e.code === 'P2002') {
      const conflicting = await this.prisma.person.findUnique({ where: { id: dto.personId } });
      throw new ConflictException({
        type: 'schoolflow://errors/person-link-conflict',
        title: 'Person ist bereits verknüpft',
        affectedEntities: [
          { kind: 'user', id: conflicting!.keycloakUserId, email: null, name: `${conflicting!.firstName} ${conflicting!.lastName}` },
        ],
      });
    }
    throw e;
  }
}
```

---

## Architecture Patterns

### Recommended Project Structure (Phase 13 delta)

```
apps/api/src/modules/
├── user-directory/              # NEW — Plan 13-01 task 2
│   ├── user-directory.module.ts
│   ├── user-directory.service.ts
│   ├── user-directory.controller.ts
│   └── dto/
│       └── user-directory-query.dto.ts
├── role-management/             # NEW — Plan 13-01 task 3
│   ├── role-management.module.ts
│   ├── role-management.service.ts
│   ├── role-management.service.spec.ts
│   └── role-management.controller.ts
├── permission-override/         # NEW — Plan 13-01 task 4
│   ├── permission-override.module.ts
│   ├── permission-override.service.ts
│   ├── permission-override.service.spec.ts
│   └── permission-override.controller.ts
├── effective-permissions/       # NEW — Plan 13-01 task 5
│   ├── effective-permissions.module.ts
│   └── effective-permissions.service.ts
├── keycloak-admin/              # EXTEND — Plan 13-01 task 1
│   └── keycloak-admin.service.ts  (add findUsers/countUsers/setEnabled/roleMappings)
├── student/                     # EXTEND — Plan 13-01 task 6a
│   └── student.service.ts         (add linkKeycloakUser/unlinkKeycloakUser)
└── parent/                      # EXTEND — Plan 13-01 task 6b
    └── parent.service.ts          (add linkKeycloakUser/unlinkKeycloakUser)

apps/api/prisma/migrations/
└── <timestamp>_add_override_updated_at_and_reason/   # NEW — Wave 0 schema delta
    └── migration.sql

apps/web/src/routes/_authenticated/admin/
├── users.index.tsx              # NEW — list + filter bar
└── users.$userId.tsx            # NEW — 4-tab detail page

apps/web/src/features/users/     # NEW — Plan 13-02
├── hooks/
│   ├── use-users.ts
│   ├── use-user-roles.ts
│   ├── use-effective-permissions.ts
│   ├── use-permission-overrides.ts
│   └── use-user-person-link.ts
├── components/
│   ├── UserListTable.tsx
│   ├── UserFilterBar.tsx
│   ├── RolesTab.tsx
│   ├── PermissionsTab.tsx
│   ├── OverridesEditor.tsx
│   └── PersonLinkTab.tsx
└── types.ts

packages/shared/src/
├── validation/
│   ├── user-role.ts             # NEW — roleNames: string[]
│   ├── permission-override.ts   # NEW — action/subject/granted/conditions/reason
│   ├── person-link.ts           # NEW — personType enum + personId uuid
│   └── keycloak-user-query.ts   # NEW — extends SchoolPaginationQueryDto
└── permissions/
    └── interpolate-conditions.ts # NEW — shared util (factory + effective-perm)
```

### Anti-Patterns to Avoid
- **Don't reinvent permission storage.** Use `PermissionOverride` as-is (+ migration for `updatedAt`/`reason`); do NOT introduce a new ACL table.
- **Don't replace-all `PermissionOverride` on save.** D-10 explicitly mandates individual CRUD so audit action-types stay granular. (Role update DOES replace-all — that's the difference.)
- **Don't cache effective-permissions server-side yet.** Deferred per decisions. Compute on-demand; if perf suffers, revisit.
- **Don't write a new Keycloak HTTP client.** `@keycloak/keycloak-admin-client@26.6.1` is already installed and wrapped. Adding methods to the existing service is the pattern.
- **Don't silently 4xx.** Every `useMutation` gets an explicit `onError` (Phase 10 SILENT-4XX-Invariante). This is non-negotiable.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Keycloak HTTP client | Raw axios to `/admin/realms/...` | `@keycloak/keycloak-admin-client@26.6.1` (already installed) | Handles auth-token refresh, error translation, type safety |
| JWT validation | Custom RS256 verifier | `passport-jwt` + `jwks-rsa` (already wired in `keycloak-jwt.strategy.ts`) | JWKS rotation, caching |
| CASL ability building | Manual permission-check switch-case | `@casl/ability` `AbilityBuilder` + `createMongoAbility` | Handles condition interpolation, `manage` subsumption, `inverted`/deny |
| Pagination DTO | New query-param class | Extend `SchoolPaginationQueryDto` | Battle-tested across 6 controllers; consistent skip/limit computation |
| 409 error shape | Ad-hoc JSON | RFC 9457 + `affectedEntities` extension (Phase 1 D-12) | Frontend parser + `AffectedEntitiesList` reusable |
| Audit-log wiring | Manual `prisma.auditEntry.create` calls | Existing `AuditInterceptor` (Phase 1 D-07) | Auto-captures actor/action/subject from decorator metadata |
| Person-search autocomplete | Custom dropdown | `shadcn/ui` `Command` popover (Phase 11 D-08 pattern) | Keyboard nav, a11y, min-length gating already validated |
| Migration management | `prisma db push` | `prisma migrate dev --name <descriptive>` (CLAUDE.md hard rule) | Reproducible, CI-enforced, shadow-DB validated |

---

## Implementation Order Recommendation

**Plan 13-01 → 13-02 → 13-03** is locked (D-15). Within 13-01, the recommended task order:

1. **Task 1 (Wave 0, foundation):** Prisma migration `add_override_updated_at_and_reason` + `prisma migrate reset` verification. **Must be first** because Tasks 4 and 5 rely on new columns.
2. **Task 2 (shared utility):** Extract `interpolateConditions` into `packages/shared/src/permissions/interpolate-conditions.ts` + unit tests. Both `casl-ability.factory.ts` (refactor import) and `effective-permissions.service.ts` (new use) depend on it.
3. **Task 3 (KeycloakAdminService extension):** Add `findUsers`/`countUsers`/`setEnabled`/role-mapping methods + service-account role docs. **Unblocks USER-01.**
4. **Task 4 (UserDirectoryService + controller):** Hybrid KC + DB query. **Unblocks USER-01.**
5. **Task 5 (RoleManagementService + mirror-write):** Last-admin guard + replace-all tx + KC mirror-write. **Unblocks USER-02.** — THIS IS THE RISKY ONE; include an integration test that actually hits a Keycloak dev instance (or Testcontainers KC image).
6. **Task 6 (PermissionOverride CRUD):** Individual-row CRUD controller. Depends on Task 1 migration. **Unblocks USER-04.**
7. **Task 7 (EffectivePermissionsService):** Mirror CASL factory logic with source attribution. Depends on Tasks 2+5. **Unblocks USER-03.**
8. **Task 8 (Student + Parent linkKeycloak mirror):** Symmetric methods + endpoints. **Unblocks USER-05.**
9. **Task 9 (UserDirectoryService.linkPerson / unlinkPerson):** Orchestration on top of Task 8. **Unblocks USER-05.**

**Why USER-01 first in the implementation:** it's a read-only wrapper with the highest surface-area risk (Keycloak auth + pagination + hybrid DB join). Get it rock-solid before any mutation lands. Then USER-02/04 in parallel (independent services), then USER-03 (depends on USER-02 mirror-write), then USER-05 (depends on extended link endpoints).

**Plan 13-02 can start Tasks 3 (hooks + list page) in parallel with Plan 13-01 Task 4** once the API contract is frozen via the shared Zod schemas. This is the efficiency win from Plan 13-01 Task 2 landing the schemas first.

**Plan 13-03 starts after Plan 13-02 has a usable `/admin/users/$userId` route** — E2E specs need the UI to click. Per Phase 10.5 pattern, specs are pre-planned as `it.todo()` in Wave 0 and filled incrementally.

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Keycloak 25.x `users.find({ email })` only | Keycloak 26.x `users.find({ search })` — matches firstName/lastName/email/username | KC 26.x | Simplifies filter bar — single search param replaces multiple |
| Prisma 6 Rust engine | Prisma 7 pure-TypeScript | Prisma 7 (late 2025) | Faster cold-starts, no Rust binary in Docker image |
| `@casl/ability` v5 | `@casl/ability` v6 `createMongoAbility` | CASL v6 | Factory already uses `createMongoAbility` — we're current |
| Custom auth middleware | `@nestjs/passport` + `keycloak-jwt` strategy | repo baseline | We're current |

**Deprecated/outdated in this domain:**
- `keycloak-connect` (official but Java-first, Node wrapper is minimal) — NOT USED in repo. Confirmed via grep.
- `node-keycloak-connect` (unmaintained) — NOT USED in repo.

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Keycloak 26.5 `/users/count?search=` returns the same filtered count as `/users?search=` (no divergence bug) | Q6, Pitfall 5 | [CITED: KC 26.x release notes — but always-verify-once policy] — pagination meta would show wrong total; easy contract-test covers this |
| A2 | `manage-users` role is the minimum Keycloak role needed for `PUT /users/{id} { enabled }` AND role-mapping writes | Q1, Q6 | [ASSUMED from KC docs] — if `realm-admin` is actually needed, deployment docs need update |
| A3 | Option 1 (mirror-write to Keycloak realm roles) is the right decision over Option 2 (DB-only + factory refactor) | Summary, Open Q1 | [RECOMMENDED — needs user confirmation] — if Option 2 is preferred, Plan 13-01 Task 5 changes shape and we touch `casl-ability.factory.ts` |
| A4 | Keycloak realm role names in production exactly match the Prisma `Role.name` values (`admin`, `schulleitung`, `lehrer`, `eltern`, `schueler`) — all lowercase | Q6 | [ASSUMED from seed] — a mismatch breaks mirror-write silently; need deploy-time validation script |
| A5 | `PermissionOverride` adding `reason` column vs. relying on AuditEntry is the right tradeoff | Q3 | [RECOMMENDED — could defer] — if user prefers no migration, we ship without `reason` in the row and surface it from audit-log joins (more complex UI) |
| A6 | `totalIsApproximate: true` flag is the right approach when post-filtering (role/linked/enabled) happens in Node after KC count | Q5, Pitfall 5 | [ASSUMED] — alternative: compute count via DB `UserRole` table for role-filtered cases; UX tradeoff |
| A7 | 11-spec E2E scope (D-16) will fit in Plan 13-03's budget; nothing hidden in Playwright auth-harness that breaks for 12-tab-switching | D-16 | [ASSUMED — harness verified for Phase 12] — if harness needs extension, Plan 13-03 grows |

---

## Open Questions (RESOLVED)

1. **[CRITICAL] Role propagation strategy — mirror-write to Keycloak or refactor CASL factory?** (Pitfall 1 / A3)
   - What we know: `UserRole` table is currently unused by any service; JWT roles come straight from Keycloak realm roles.
   - What's unclear: does the user/team prefer (a) mirror-write each `PUT /admin/users/:userId/roles` to Keycloak via admin API (simpler, KC stays authoritative for JWT), or (b) refactor `casl-ability.factory.ts` to load `user.roles` from Prisma `UserRole` on every request (DB becomes authoritative, bypass JWT roles)?
   - Recommendation: **Option (a) — mirror-write.** Reasons: zero changes to `PermissionsGuard`/`CaslAbilityFactory` call sites; Keycloak stays authoritative for JWT (consistent with every other auth decision in the codebase); DB `UserRole` becomes a denormalized cache for admin-list filtering. **Planner must lock this before Plan 13-01 Task 5 starts.**
   - **RESOLVED:** Locked as Option (a) mirror-write in `13-01-PLAN.md` frontmatter `decisions.LOCK-01`. Role-management service writes Keycloak realm-role-mappings AND mirrors to Prisma `UserRole` inside a single `$transaction({ isolationLevel: 'Serializable' })`. CASL factory stays untouched — continues reading from JWT `realm_access.roles`. No changes to PermissionsGuard call sites.

2. **Admin self-verification UI.** When an admin assigns themselves a role, should the UI force a re-login to pick up the new JWT, or just show an InfoBanner?
   - What we know: D-05 copy says "Änderungen wirken spätestens nach erneutem Login vollständig" (banner). No forced logout.
   - What's unclear: is the 15-min-stale-JWT window acceptable for self-changes?
   - Recommendation: **Stick with D-05 banner approach.** No forced logout. But log `security-sensitive` audit-event when admin self-modifies roles (flag for Phase 15 audit viewer).
   - **RESOLVED:** Pinned to `13-CONTEXT.md` D-05 — banner only, no forced logout. `security-sensitive` audit event is covered by the generic `AuditInterceptor` (Phase 1 D-07) and deferred to Phase 15 audit viewer. Plan 13-02 Task 2 renders the InfoBanner via `UserRolesTab`.

3. **`totalIsApproximate` semantics.** (A6) When role-filter applies in the backend after KC paging, do we show user "Page 4 of 12 (approx.)", or redesign the filter flow so role filter pushes into a DB query first?
   - Recommendation: **Show `(approx.)` suffix in meta** when any post-filter is active. Accept that paging may end short of page N+1. UX tweak only.
   - **RESOLVED:** Implemented in `13-01-PLAN.md` Task 2 step 6 — UserDirectoryService returns `meta.totalIsApproximate: true` whenever a post-filter (role) reduces the KC page count. UI meta row renders "(approx.)" suffix per UI-SPEC.

4. **Conflict-dialog copy when AffectedEntity `kind: 'user'` has no detail route.** (D-14)
   - What we know: Teacher/Student/Parent detail routes exist post Phase 11-12.
   - What's unclear: when Person B already points to user X, the AffectedEntity displays a user. Do we deep-link to `/admin/users/$userId` (circular) or just show read-only email?
   - Recommendation: **Show read-only email + "bereits verknüpft mit"**, no deep-link (circular UX is confusing).
   - **RESOLVED:** Pinned to `13-CONTEXT.md` D-06 + implemented in `13-02-PLAN.md` Task 1 Step 2 — `AffectedEntitiesList` renders `kind: 'user'` rows as read-only email + "bereits verknüpft mit" copy; no deep-link back to `/admin/users/$id`.

5. **Override `reason` migration backfill strategy.** (A5)
   - Existing overrides have no reason. Backfill as `'Phase 13 pre-migration'`? NULL? Require admin to fill on next edit?
   - Recommendation: **NULL column; UI shows "— (Grund fehlt)" badge**; next edit forces fill.
   - **RESOLVED:** Implemented in `13-01-PLAN.md` Task 1 migration `20260424120000_add_override_updated_at_and_reason` — `reason TEXT NULL` (no backfill value); Plan 13-02 Task 2 `OverrideRow` renders the "— (Grund fehlt)" badge when `reason === null`, and the edit dialog requires a non-empty `reason` on save.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | API + web | ✓ (assumed from repo) | 24 LTS (per CLAUDE.md pin) | — |
| PostgreSQL 17 | Prisma | ✓ (assumed from prior phases) | 17 | — |
| Keycloak 26.5 | KC admin client + JWT | ✓ (assumed from prior phases) | 26.5.x | — |
| Redis 7 | BullMQ + cache | ✓ (assumed from prior phases) | 7.x | — |
| `@keycloak/keycloak-admin-client` | KeycloakAdminService | ✓ (verified in `apps/api/node_modules/`) | 26.6.1 | — |
| `@casl/ability` | CaslAbilityFactory | ✓ (verified in factory import) | v6 API | — |
| `@nestjs/testing` | Unit tests | ✓ (repo baseline) | latest | — |
| Playwright | E2E | ✓ (repo baseline at `apps/web/e2e/`) | 1.x | — |
| pnpm + Turborepo | Build | ✓ (repo baseline) | 10.x + 2.8.x | — |
| `scripts/check-migration-hygiene.sh` | CI enforcement | ✓ (per CLAUDE.md) | — | — |

**Missing dependencies with no fallback:** None.
**Missing dependencies with fallback:** None.

---

## Sources

### Primary (HIGH confidence — codebase verification)
- `apps/api/src/modules/keycloak-admin/keycloak-admin.service.ts` — verified current state of KC admin client integration
- `apps/api/src/modules/keycloak-admin/keycloak-admin.controller.ts` — verified existing endpoint surface
- `apps/api/src/modules/auth/casl/casl-ability.factory.ts` — verified factory input/output shape and interpolation logic
- `apps/api/src/modules/auth/strategies/keycloak-jwt.strategy.ts` — verified JWT roles come from `realm_access.roles`, not Prisma
- `apps/api/src/modules/auth/types/authenticated-user.ts` — verified `AuthenticatedUser` shape
- `apps/api/src/modules/teacher/teacher.service.ts` §285-312 — verified Teacher linkKeycloak pattern for mirror
- `apps/api/src/modules/teacher/teacher.controller.ts` §85-110 — verified HTTP endpoint pattern
- `apps/api/src/common/dto/pagination.dto.ts` — verified pagination DTO convention
- `apps/api/prisma/schema.prisma` §171-219 — verified Role / Permission / PermissionOverride / UserRole models
- `apps/api/prisma/schema.prisma` §311-334 — verified Person.keycloakUserId @unique
- `apps/api/prisma/seed.ts` — verified 5 seeded roles + permission structure
- `apps/api/node_modules/@keycloak/keycloak-admin-client/lib/resources/users.d.ts` — verified method signatures for v26.6.1
- `apps/api/node_modules/@keycloak/keycloak-admin-client/package.json` — verified version pin
- `.planning/phases/13-user-und-rechteverwaltung/13-CONTEXT.md` — verified all 16 locked decisions
- `.planning/phases/13-user-und-rechteverwaltung/13-UI-SPEC.md` (headings scan) — verified UI contract matches research scope
- `.planning/REQUIREMENTS.md` lines 60-64, 184-188 — verified USER-01..05 phrasing
- `.planning/ROADMAP.md` §Phase 13 lines 255-271 — verified scope and known risks
- `CLAUDE.md` — verified migration-hygiene hard rule
- `/Users/vid/.claude/projects/...-school-flow/memory/MEMORY.md` — verified auto-memory directives (E2E-first, restart-API-after-migrate)

### Secondary (MEDIUM confidence — cross-referenced docs)
- [Keycloak 26.5 Admin REST API docs (CITED)](https://www.keycloak.org/docs-api/26.5/rest-api/) — endpoint paths, role-mapping shapes
- [`@keycloak/keycloak-admin-client` GitHub (CITED)](https://github.com/keycloak/keycloak) — method signatures + v26.x examples
- [Prisma 7 `$transaction` isolation level (CITED)](https://www.prisma.io/docs/orm/prisma-client/queries/transactions) — Serializable semantics
- [CASL v6 `createMongoAbility` + interpolation (CITED)](https://casl.js.org/v6/en/) — factory usage pattern
- [RFC 9457 Problem Details (CITED)](https://www.rfc-editor.org/rfc/rfc9457) — already in use per Phase 1 D-12

### Tertiary (LOW confidence — flagged)
- Keycloak service-account exact role matrix for 26.5: generally `manage-users` suffices for user+role-mapping writes, but some deployments require `realm-admin`. **Flag: deploy-time verification.**

---

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — every library and version confirmed in `node_modules` / `schema.prisma` / `package.json`
- Architecture patterns: **HIGH** — existing code precedent for every new module (Teacher/Student mirror, PaginationDTO extension, CASL factory mirror-pattern)
- Pitfalls: **HIGH** — Pitfall 1 (UserRole vs KC roles) is evidence-based (zero `prisma.userRole` refs in app code) and is the single biggest planning risk
- ACL overrides data model: **HIGH** — schema verified, tiny migration needed (not a new table)
- Keycloak adapter surface: **HIGH** — method signatures verified against the actual d.ts on disk
- Effective-permissions resolver design: **MEDIUM** — theoretical; will need contract-test when implemented
- Role-propagation strategy: **MEDIUM** — recommended direction but needs user confirmation (Open Q1)

**Research date:** 2026-04-24
**Valid until:** 2026-05-24 (30 days — stack is stable; CASL + Keycloak + Prisma are all in maintenance posture, not fast-moving)
