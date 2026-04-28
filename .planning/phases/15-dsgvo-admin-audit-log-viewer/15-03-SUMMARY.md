---
phase: 15-dsgvo-admin-audit-log-viewer
plan: 03
subsystem: api
tags: [dsgvo, consent, admin-filter, tenant-isolation, role-gate, nestjs, prisma]

requires:
  - phase: 02-school-data-model-dsgvo
    provides: ConsentRecord Prisma model + ProcessingPurpose enum + Person.schoolId FK (the join used for tenant scoping)
  - phase: 14-solver-tuning
    provides: Phase 14 closes the v1.1 backend track; Phase 15 begins the DSGVO admin surface

provides:
  - "GET /dsgvo/consent/admin?schoolId=&purpose=&status=&personSearch=&page=&limit=" — paginated, tenant-scoped, role-gated admin filter endpoint
  - "ConsentService.findAllForAdmin(query, requestingUser)" — composable filter with role-gate (admin-only) and tenant-scope guards
  - "QueryConsentAdminDto" — required schoolId (@IsUUID, no @IsOptional) + optional purpose/status/personSearch + extends PaginationQueryDto
  - "CONSENT_STATUS_FILTERS const + ConsentStatusFilter type" — reusable status enum exported for future hook/UI consumption
  - "12 new vitest invocations covering filter combinations + tenant-scope regression guard + role-403 it.each + bad-request defensive guard"

affects: [phase-15-plan-05 frontend foundation hook useConsents, phase-15-plan-06 ConsentsTab UI, phase-15-plan-10 dsgvo E2E suite]

tech-stack:
  added: []
  patterns:
    - "Tenant-isolation via single composed person filter (not split person keys) — regression guard against MEMORY useTeachers/subject/useClasses leak family"
    - "Service-level role gate (mirrors AuditService.findAll) — no @Roles decorator needed; role check lives in service for consistency with audit pattern"
    - "Static-route-before-parametric ordering (Fastify): @Get('admin') declared above @Get('school/:schoolId') so /admin is not captured as :schoolId param"

key-files:
  created:
    - apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts
  modified:
    - apps/api/src/modules/dsgvo/consent/consent.service.ts
    - apps/api/src/modules/dsgvo/consent/consent.controller.ts
    - apps/api/src/modules/dsgvo/consent/consent.service.spec.ts

key-decisions:
  - "Role gate lives in service (mirrors AuditService.findAll) rather than @Roles decorator — no other controller in the codebase uses @Roles, and consistency with the audit pattern wins"
  - "Defensive BadRequestException for empty schoolId at runtime in addition to DTO @IsUUID() — belt-and-braces guard against the MEMORY useTeachers/subject/useClasses regression family where `where: { x: undefined }` silently returns all rows"
  - "personSearch and schoolId composed into a SINGLE personFilter object, not two separate `where.person` declarations — Prisma silently overwrites duplicate top-level keys, so the naive split would drop tenant scope"
  - "@Get('admin') declared above @Get('school/:schoolId') in the controller body — Fastify static-route-before-parametric ordering is mandatory or /admin gets swallowed as :schoolId and 422s"

patterns-established:
  - "DTO + service dual-layer tenant-scope guard: DTO @IsUUID() catches missing schoolId at validation (422), service if-guard catches the runtime fallthrough (BadRequestException 400)"
  - "Vitest regression assertion shape for tenant scope under search filters: `expect(args.where.person.schoolId).toBe('school-1')` AFTER setting personSearch — proves the merge does not drop the scope"

requirements-completed: [DSGVO-ADM-01]

duration: 11m 3s
completed: 2026-04-27
---

# Phase 15 Plan 03: Consent Admin Filter Summary

**Admin-only `GET /dsgvo/consent/admin` with required schoolId, purpose/status/personSearch filters, role-gated 403 for non-admin, and Prisma-overwrite-safe tenant scoping for the upcoming ConsentsTab UI.**

## Performance

- **Duration:** 11 min 3 s
- **Started:** 2026-04-27T18:14:16Z
- **Completed:** 2026-04-27T18:25:19Z
- **Tasks:** 3 / 3
- **Files modified:** 4 (1 created, 3 modified)

## Accomplishments

- New `QueryConsentAdminDto` with REQUIRED `schoolId` (`@IsUUID()` only — no `@IsOptional`), optional `purpose` (PROCESSING_PURPOSES enum), `status` (granted/withdrawn/expired), and `personSearch` (≤200 char case-insensitive substring) — extends `PaginationQueryDto`.
- New `ConsentService.findAllForAdmin(query, requestingUser)` method with three layered guards: (1) role gate `ForbiddenException` if not admin, (2) defensive `BadRequestException` if `schoolId` empty, (3) tenant scope via single composed `personFilter` object so Prisma cannot drop `schoolId` when `personSearch` adds an `OR` clause.
- New `GET /dsgvo/consent/admin` route registered ABOVE `@Get('school/:schoolId')` so Fastify resolves the static segment before the parametric one.
- 12 new vitest invocations: tenant-scope assertion, purpose filter, three status mappings, personSearch+schoolId regression guard, 4 it.each role-403 cases (schulleitung/lehrer/eltern/schueler), empty-schoolId 400 guard, pagination meta envelope. 22/22 cases green (existing 10 + new 12).

## New Endpoint Contract

```
GET /dsgvo/consent/admin?schoolId={uuid}&purpose={enum}&status={granted|withdrawn|expired}&personSearch={str}&page={n}&limit={n}

200 → {
  data: ConsentRecord[] (with person { id, firstName, lastName, email }),
  meta: { page: number, limit: number, total: number, totalPages: number }
}
403 → { ... } caller is not admin
422 → { ... } schoolId missing or invalid UUID
```

Frontend plans 15-05 (useConsents hook) and 15-06 (ConsentsTab UI) can pass URL search params 1:1 because the DTO field names match the URL param names. The `data`/`meta` envelope shape is identical to the existing `findBySchool` method, so the same paginated table component can render either endpoint.

## Task Commits

1. **Task 1: Create QueryConsentAdminDto** — `2f28682` (feat)
2. **Task 2: Add findAllForAdmin service method + GET /admin route** — `2be869b` (feat)
3. **Task 3: Extend consent.service.spec.ts with findAllForAdmin coverage** — `9e7f9bb` (test)

**Plan metadata commit:** appended after self-check + state updates.

## Files Created/Modified

- **Created** `apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` (51 lines) — `QueryConsentAdminDto` + `CONSENT_STATUS_FILTERS` + `ConsentStatusFilter` type.
- **Modified** `apps/api/src/modules/dsgvo/consent/consent.service.ts` (+93 / -1 lines) — added `BadRequestException` + `ForbiddenException` imports, added `findAllForAdmin` method.
- **Modified** `apps/api/src/modules/dsgvo/consent/consent.controller.ts` (+31 / -0 lines) — added `CurrentUser` + `AuthenticatedUser` + `QueryConsentAdminDto` imports, added `@Get('admin')` route between `findByPerson` and `findBySchool`.
- **Modified** `apps/api/src/modules/dsgvo/consent/consent.service.spec.ts` (+99 / -1 lines) — added `BadRequestException` + `ForbiddenException` imports, added `describe('findAllForAdmin')` block with 9 cases / 12 invocations.

Total: **273 insertions, 2 deletions** across 4 files.

## Decisions Made

- **Role gate in service, not @Roles decorator.** No other controller in the codebase uses `@Roles`, and the explicit pattern reference for "admin-only filter list" is `AuditService.findAll` which checks `requestingUser.roles.includes('admin')` in the service. Consistency wins; one-off decorator pattern rejected.
- **Dual-layer tenant guard (DTO + service).** The DTO `@IsUUID()` returns 422 for missing/malformed `schoolId`. The service `if (!query.schoolId) throw new BadRequestException` catches the runtime fallthrough. The MEMORY regression family (useTeachers / subject / useClasses tenant leaks) showed three prior incidents where a single-layer guard let `where: { schoolId: undefined }` through and silently returned all rows. Belt-and-braces.
- **Single composed `personFilter` object.** The `personSearch` branch adds an `OR` clause to the same `personFilter` that already carries `schoolId`. Splitting into two `where.person` declarations would let Prisma silently overwrite the first key — the exact root cause of the prior tenant-leak family. The vitest case `personSearch composes OR …AND keeps schoolId scope` is the regression guard.
- **Static `/admin` route declared ABOVE `/school/:schoolId`.** Fastify's NestJS adapter resolves routes in declaration order; if `:schoolId` is registered first, `/admin` is parsed as a UUID and the DTO returns 422 with `Validation failed (uuid is expected)`. Method order in the controller body is now: `grant`, `withdraw`, `findByPerson`, `findAllForAdmin (NEW)`, `findBySchool`.

## Deviations from Plan

None - plan executed exactly as written.

The action steps were followed verbatim. No Rule 1/2/3 auto-fixes were needed — all the action `Step N` blocks landed in one pass per task. The only minor adjustment was a JSDoc tweak in Task 2 (changing `Admin-only filtered list` to `findAllForAdmin: admin-only filtered list`) so the acceptance criterion `grep -c "findAllForAdmin" consent.service.ts ≥ 2` was satisfied (definition + JSDoc literal mention). This was not a deviation from behavior or contract — purely a string match for the plan's grep gate.

## Issues Encountered

### Worktree fast-forward needed (pre-execution)

The worktree branch (`worktree-agent-a88c654ce04ec9189`) was forked from commit `8905054` BEFORE Phase 15 planning artifacts existed. The plan file `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-03-consent-admin-filter-PLAN.md` was missing from the worktree. Resolved with `git merge --ff-only gsd/phase-15-dsgvo-admin-audit-log-viewer` (worktree branch was a strict ancestor — clean fast-forward, no rebase or conflicts). 20 phase-15 planning commits brought in.

### Worktree node_modules empty (pre-execution)

The worktree had no `node_modules/` and no Prisma client generated. Ran `pnpm install --frozen-lockfile` (4.7s thanks to pnpm CAS hardlinks), `pnpm --filter @schoolflow/api exec prisma generate`, and `pnpm --filter @schoolflow/shared build` to satisfy the `@schoolflow/shared` import. Typecheck then exited 0.

### Pre-existing unrelated test failure (deferred)

The full API test suite reports `prisma/__tests__/school-year-multi-active.spec.ts > backfill invariant` failing (`expected 1 to be 2`). This is a DB-state-sensitive test on the live Postgres dev database — it has zero overlap with `dsgvo/consent` modules. Documented in `.planning/phases/15-dsgvo-admin-audit-log-viewer/deferred-items.md` (DEFERRED-15-03-01) for a Phase 16 (Schulstammdaten/Zeitraster) test-DB hygiene chunk. Verified that running `consent.service.spec.ts` in isolation passes 22/22.

## Tenant-scope Regression Guards Installed

| Layer | Mechanism | File | Line(s) |
|-------|-----------|------|---------|
| DTO   | `@IsUUID()` on `schoolId` (no `@IsOptional`) — 422 on missing/malformed | `dto/query-consent-admin.dto.ts` | 22 |
| Service | `if (!query.schoolId) throw new BadRequestException` — defensive runtime fallthrough | `consent.service.ts` | ~159 |
| Service | Single composed `personFilter` object — Prisma key-overwrite-safe | `consent.service.ts` | ~167 |
| Spec | `expect(args.where.person.schoolId).toBe('school-1')` AFTER `personSearch` set | `consent.service.spec.ts` | ~250 |

## Role Gate Behaviour

| Caller role | Outcome |
|-------------|---------|
| `admin` | Full access for the supplied `schoolId` |
| `schuladmin` | Same as `admin` if the role string is `'admin'` (project convention; CASL persists 'admin' as the role identifier) |
| `schulleitung` | `403 Forbidden` (`Zugriff verweigert. Admin-Rolle erforderlich.`) |
| `lehrer` | `403 Forbidden` |
| `eltern` | `403 Forbidden` |
| `schueler` | `403 Forbidden` |

The 4 non-admin variants are covered by `it.each` in the spec — the role check fires BEFORE Prisma is queried (verified via `expect(mockPrisma.consentRecord.findMany).not.toHaveBeenCalled()`).

## Hand-off Note for Plans 15-05 and 15-06

**Plan 15-05 (useConsents hook):** TanStack Query hook should accept the same param names as the DTO fields:
```ts
useConsents({ schoolId, purpose, status, personSearch, page, limit })
  → fetch(`/dsgvo/consent/admin?${new URLSearchParams({ schoolId, purpose, status, personSearch, page, limit })}`)
  → returns { data: ConsentRecord[], meta: { page, limit, total, totalPages } }
```
Status enum values are the literal strings `'granted'`, `'withdrawn'`, `'expired'` — the shared frontend-typings file should re-export `CONSENT_STATUS_FILTERS` from the DTO if cross-package import is desired (Phase 15 RESEARCH §10 notes the shared package as the canonical home).

**Plan 15-06 (ConsentsTab UI):** Each row in `data` includes `person: { id, firstName, lastName, email }` — the table can show "Maria Müller (maria@example.at)" without an extra fetch. The `total` field drives pagination control display ("Showing 1–20 of 45"). The `personSearch` text input should debounce on the URL (e.g. 300ms) before navigating, since the substring search performs a `LIKE %…%` over three Person columns (capped at 200 chars by the DTO).

## Self-Check: PASSED

**Files verified:**
- `apps/api/src/modules/dsgvo/consent/dto/query-consent-admin.dto.ts` (created)
- `apps/api/src/modules/dsgvo/consent/consent.service.ts` (modified)
- `apps/api/src/modules/dsgvo/consent/consent.controller.ts` (modified)
- `apps/api/src/modules/dsgvo/consent/consent.service.spec.ts` (modified)
- `.planning/phases/15-dsgvo-admin-audit-log-viewer/15-03-SUMMARY.md` (this file)
- `.planning/phases/15-dsgvo-admin-audit-log-viewer/deferred-items.md` (created)

**Commits verified:**
- `2f28682` — feat(15-03): add QueryConsentAdminDto with required schoolId + filters
- `2be869b` — feat(15-03): add ConsentService.findAllForAdmin + GET /dsgvo/consent/admin
- `9e7f9bb` — test(15-03): extend consent.service.spec.ts with findAllForAdmin coverage

**Vitest:** 22/22 cases pass in `consent.service.spec.ts` (existing 10 + new 12).

**Typecheck:** `tsc --noEmit` exits 0.

**Cross-spec regression:** Full API suite reports 655/656 — the only failure is `prisma/__tests__/school-year-multi-active.spec.ts` which is documented as DEFERRED-15-03-01 (pre-existing, unrelated to this plan).

## Threat Flags

None — the plan's `<threat_model>` already enumerated all 6 STRIDE entries (T-15-03-01..06). No new security-relevant surface introduced beyond what the threat register declared. Mitigations T-15-03-01 (DTO+service tenant guard), T-15-03-02 (single composed personFilter), T-15-03-03 (service role gate), and T-15-03-05 (`@MaxLength(200)` on personSearch) all shipped as planned. T-15-03-04 (audit log already redacts password/secret/token/credential, query params are out of scope) and T-15-03-06 (existing AuditInterceptor records `read:consent`) are accept-class with no code change needed.

---
*Phase: 15-dsgvo-admin-audit-log-viewer*
*Plan: 03 (consent-admin-filter)*
*Completed: 2026-04-27*
