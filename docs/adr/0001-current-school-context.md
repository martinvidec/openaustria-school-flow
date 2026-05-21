# ADR 0001 — Current School Context Resolution

- Status: Accepted
- Date: 2026-05-21
- Authors: Implementation of issue #135 (Phase 3 throwaway-school architecture, sub-task of #123)
- Related: #123, #133 (composite unique), #134 (callsite refactor), #136 (throwaway-school fixture)

## Context

Issue #133 relaxed `Person.keycloakUserId` from `@unique` to `@@unique([keycloakUserId, schoolId])`, opening the door for a single Keycloak user to map to multiple `Person` rows (one per school). The schema and TypeScript types now permit multi-school memberships; what is missing is a deterministic, server-validated mechanism that tells the backend **which school a given request is acting on**.

Without that mechanism:

- `prisma.person.findFirst({ where: { keycloakUserId } })` returns the first row in undefined order; behavior depends on insertion sequence.
- Tenant-scoping logic that derives `schoolId` from "the user's Person row" silently aliases to a single school, defeating the multi-school model.
- The throwaway-school fixture (#136) and any future production multi-school deployments cannot reliably isolate per-school state.

## Decision

Adopt **HTTP request header `X-School-Id`** as the primary current-school-context signal, with **server-side validation** against the authenticated user's Person memberships.

### Resolution algorithm (executed on every authenticated request via `CurrentSchoolInterceptor`)

1. JWT auth runs first (existing `JwtAuthGuard` + Keycloak strategy). `req.user.id` is the KC `sub`.
2. The interceptor loads all `Person` rows for `req.user.id` (`Person.findMany({ where: { keycloakUserId } })`, indexed lookup post-#133).
3. If the request carries an `X-School-Id` header:
   - The header value MUST appear in the memberships list. Otherwise → `403 Forbidden`.
   - `req.currentSchoolId` is set to the header value.
4. If the request has no `X-School-Id` header:
   - `req.currentSchoolId` falls back to the first membership's `schoolId` (today: the user's only school).
   - Users with no Person row (e.g., admin-only KC accounts in seed) get `req.currentSchoolId = null`. Admin endpoints derive `schoolId` from request bodies / path params as they do today.
5. `@Public()` routes are skipped entirely.

### Why header over JWT custom claim or DB-backed session

| Option | Pro | Con | Verdict |
| --- | --- | --- | --- |
| JWT custom claim | Stateless, single source of truth, no extra header | Schul-Switch = full Keycloak round-trip (re-auth or token-exchange); Keycloak Mapper SPI config; users not currently tied to schools in KC | Rejected — operational complexity outweighs purity |
| Session / DB-backed | Token bleibt schmal, switching = one PATCH | Stateful backend (project goal is stateless), session storage to maintain, multi-instance sync | Rejected — violates stateless invariant |
| **Header `X-School-Id`** | Simplest, stateless, easy to validate, easy to test, matches existing `schoolId` query-param pattern | Client-supplied (but validated against memberships → no leak) | **Chosen** |

### Why not a full migration of existing endpoints

Today most resource endpoints derive `schoolId` either from a query parameter, a URL path segment, or from the authenticated user's single Person row via `findFirst({ keycloakUserId })`. Migrating every endpoint to consume `req.currentSchoolId` is a large blast-radius refactor that is **not required** to unblock #136 (throwaway-school fixture). The interceptor sets the value; new code (and refactors when convenient) consumes it. Existing code continues to work under the single-school invariant.

This is an explicit YAGNI choice — when a real multi-school user surfaces, the refactor of existing endpoints is straightforward (replace `findFirst({keycloakUserId}).schoolId` with `req.currentSchoolId`).

## Consequences

### Positive

- Every authenticated request has a deterministic `req.currentSchoolId` (either header-derived or default-membership-derived).
- 403 on invalid `X-School-Id` is a hard tenant-isolation guarantee, surfaced as an actionable client error rather than a silent cross-tenant leak.
- Frontend changes localize cleanly: `apiFetch` injects the header from `useSchoolContext.currentSchoolId`; the store gains `availableSchools[]` and `setCurrentSchool(id)`.
- E2E coverage is straightforward: send a valid header → 200; send a foreign UUID → 403; omit header → defaults to single membership (today's behavior).

### Negative

- One additional indexed DB lookup per authenticated request (`Person.findMany({ keycloakUserId })`). Acceptable; can be cached later via Redis or in-process LRU.
- Client must send the header on every request. Forgetting it silently falls back to the default membership — fine today, risky once multi-school users exist. Mitigation: `apiFetch` is the single chokepoint that adds it automatically.
- Admin / Schulleitung users without a Person row get `req.currentSchoolId = null`. Endpoints that today derive schoolId from those users do so via query params or path segments — no behavior change.

### Out of scope (future work)

- Schools-Switch UI in the application header. Tracked separately as a #135 follow-up sub-issue once a real multi-school user exists.
- Migrating all existing endpoints to consume `req.currentSchoolId`. Done opportunistically when callsites are touched for other reasons.
- JWT-claim hybrid (header overrides, JWT default-school) — defer until Keycloak Mapper SPI work becomes valuable.

## Compliance with project directives

- **D3 (clean main / green CI)**: This ADR ships in the same PR as the interceptor + frontend wiring; the PR contains its own regression-lock E2E (`current-school-context.spec.ts`).
- **D4 (deterministic E2E)**: Header-based context simplifies #136 (throwaway-school fixture) — every spec sends its throwaway `schoolId` and the backend honors it without any per-spec lock contention.
- **D5 / D6 (issue relationships)**: PR closes #135; #136 is unblocked once #135 closes.
- **Migration policy**: No schema changes in this ADR. The composite-unique landed in #133.
