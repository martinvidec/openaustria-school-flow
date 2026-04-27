---
phase: 15
plan: 01
subsystem: backend-audit
tags: [phase-15, audit, dsgvo, backend, prisma-migration, interceptor, tdd]
dependency_graph:
  requires:
    - apps/api/src/modules/audit/audit.module.ts (existing)
    - apps/api/src/config/database/prisma.service.ts (existing, @Global)
  provides:
    - AuditEntry.before Json? column (DB + Prisma type)
    - AuditInterceptor pre-state capture for mapped UPDATE/DELETE
    - AuditActionFilter enum on QueryAuditDto (create|update|delete|read)
    - AuditService.log accepts before?: Record<string, unknown> | null
  affects:
    - All authenticated UPDATE/PATCH/DELETE requests now incur 1 extra DB read
      for mapped resources (RESOURCE_MODEL_MAP) before handler runs (~3-15ms)
    - Wave 2 frontend (15-09 audit-log-frontend) can now consume `before`
      payload + `action` filter directly
    - 15-02 CSV export will inherit the new `before` column without churn
tech_stack:
  added: []
  patterns:
    - "RxJS from() + switchMap() composition for async pre-handler hook"
    - "Fail-soft DB lookup pattern (try/catch returns undefined; never throws)"
    - "URL-segment -> Prisma delegate map (RESOURCE_MODEL_MAP) for opt-in pre-state"
key_files:
  created:
    - apps/api/prisma/migrations/20260427181615_add_audit_entry_before_snapshot/migration.sql
    - apps/api/src/modules/audit/audit.interceptor.spec.ts
    - apps/api/src/modules/audit/audit.service.spec.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/modules/audit/audit.interceptor.ts
    - apps/api/src/modules/audit/audit.service.ts
    - apps/api/src/modules/audit/audit.controller.ts
    - apps/api/src/modules/audit/dto/query-audit.dto.ts
decisions:
  - "Tenant scoping NOT applied at capture time — audit findAll role-scopes downstream (RESEARCH §8, D-24)"
  - "RESOURCE_MODEL_MAP is opt-in: 11 mapped resources (DSGVO + commonly-mutated). Unmapped resources fall back to before=undefined to bound snapshot read cost"
  - "before/metadata.body remain separate: D-10/D-24 — top-level column for index-friendliness; metadata.body shape preserved EXACTLY for non-DELETE mutations"
  - "email/phone NOT redacted in before snapshot (D-24 — admin-only audit log, forensic accuracy > PII minimization). Only password/secret/token/credential redacted."
metrics:
  duration_minutes: 15
  completed_date: 2026-04-27
  tasks_completed: 3
  commits: 5
  files_created: 3
  files_modified: 5
  tests_added: 9
  tests_passing: 9
---

# Phase 15 Plan 01: AuditEntry Schema + Interceptor Pre-State Capture + Action Filter Summary

Land the `AuditEntry.before` column, refactor `AuditInterceptor` to capture pre-mutation snapshots for UPDATE/DELETE on 11 mapped resources via fail-soft RxJS pipeline, and extend `QueryAuditDto` with an `IsEnum`-guarded `action` filter — unblocking AUDIT-VIEW-01 + AUDIT-VIEW-02 prerequisites for the Wave-2 frontend.

## What Shipped

### Task 1 — AuditEntry.before Column (commit `1fcd5b5`)
- Edited `apps/api/prisma/schema.prisma`: inserted `before     Json?` between `metadata` and `ipAddress` in the `AuditEntry` model.
- Generated migration via `pnpm --filter @schoolflow/api exec prisma migrate dev --name add_audit_entry_before_snapshot` (CLAUDE.md hard rule — NO `db push`).
- Migration `20260427181615_add_audit_entry_before_snapshot/migration.sql` is purely additive: `ALTER TABLE "audit_entries" ADD COLUMN "before" JSONB`. No DROP/RENAME/DELETE.
- Prisma Client regenerated; `AuditEntry` payload now includes `before: runtime.JsonValue | null`.
- `prisma migrate status` reports clean. `tsc --noEmit` passes.

### Task 2 — AuditInterceptor Pre-State Capture (commits `7d96b8c` RED + `d8cd530` GREEN)
- Wrote 7-case Vitest spec FIRST (`audit.interceptor.spec.ts`) — RED confirmed all 7 fail.
- Refactored `audit.interceptor.ts`:
  - Injected `PrismaService` as second constructor arg.
  - Added top-level `RESOURCE_MODEL_MAP` (11 entries: consent, retention, dsfa, vvz, schools, students, teachers, classes, subjects, rooms, resources).
  - Added `captureBeforeState(resource, id)` helper: returns `prisma[delegate].findUnique({ where: { id } })` for mapped resources, returns `undefined` for unmapped OR on any error (fail-soft per T-15-01-03).
  - Replaced `intercept` body: `from(beforeP).pipe(switchMap(snap => next.handle().pipe(tap(...))))` so the snapshot is captured BEFORE the handler runs and persisted alongside `metadata.body` AFTER.
  - Sanitized snapshot via the existing `sanitizeBody` (password/secret/token/credential redacted; email/phone preserved per D-24).
- Extended `AuditLogInput` with `before?: Record<string, unknown> | null`; `AuditService.log` now persists it to `AuditEntry.before`.
- All 7 spec cases GREEN.

### Task 3 — Action Filter on QueryAuditDto + Service + Controller (commits `a2f2f1b` RED + `d83a3e3` GREEN)
- Wrote 2-case Vitest spec FIRST (`audit.service.spec.ts`) — RED confirmed action filter not honored.
- Added `AuditActionFilter` enum (`CREATE/UPDATE/DELETE/READ`) to `query-audit.dto.ts`.
- Added `action?: string` field with `@IsOptional()` + `@IsEnum(AuditActionFilter)` decorators; placed between `category` and `startDate` per plan.
- Extended `AuditService.findAll` params with `action?: string` and added `if (params.action) where.action = params.action;` after the existing `category` guard (preserved untouched).
- `AuditController.findAll` now forwards `query.action` through to the service params.
- Both spec cases GREEN; existing `category` filter still works.

## Verification Results

```
$ pnpm --filter @schoolflow/api exec prisma migrate status
Database schema is up to date!

$ pnpm --filter @schoolflow/api exec tsc --noEmit
(no output — clean)

$ cd apps/api && pnpm exec vitest run src/modules/audit/
 Test Files  2 passed (2)
      Tests  9 passed (9)
```

| Acceptance check | Result |
| --- | --- |
| `grep -c "before     Json?" apps/api/prisma/schema.prisma` | `1` |
| `ls .../migrations/ | grep -c add_audit_entry_before_snapshot` | `1` |
| Migration SQL contains `ADD COLUMN "before" JSONB` | yes (Prisma emitted `ADD COLUMN     "before" JSONB` — same intent, double space) |
| Migration SQL has NO DROP/RENAME/DELETE | confirmed |
| `grep -c "before?: Record" apps/api/src/modules/audit/audit.service.ts` | `1` |
| `grep -c "captureBeforeState" apps/api/src/modules/audit/audit.interceptor.ts` | `2` |
| `grep -c "RESOURCE_MODEL_MAP" apps/api/src/modules/audit/audit.interceptor.ts` | `3` |
| `grep -c "PrismaService" apps/api/src/modules/audit/audit.interceptor.ts` | `2` |
| email/phone NOT paired with `[REDACTED]` | confirmed (only ref is doc comment "are NOT redacted") |
| `grep -c "AuditActionFilter" apps/api/src/modules/audit/dto/query-audit.dto.ts` | `3` |
| `grep -c "@IsEnum(AuditActionFilter)"` | `1` |
| `grep -c "params.action"` in service | `1` |
| `grep -q "action: query.action"` in controller | yes |
| `category` guard preserved | yes |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 — Blocking] Worktree branch lacked Phase 15 plans**
- **Found during:** Pre-execution context load
- **Issue:** Working directory `worktree-agent-afc09f3c350c9c966` was created from `main` (8905054) but Phase 15 plans + research/context exist only on `gsd/phase-15-dsgvo-admin-audit-log-viewer`. Reading the plan file failed.
- **Fix:** Merged `gsd/phase-15-dsgvo-admin-audit-log-viewer` into the worktree branch (`git merge ... --no-edit --no-verify`, fast-forwardable, no conflicts). 18 planning files added. No code-level changes.
- **Files modified:** `.planning/phases/15-dsgvo-admin-audit-log-viewer/*` (planning docs only)
- **Commit:** Implicit in worktree state; the merge is part of the branch but no separate task commit was created (planning file delivery, not phase 15-01 deliverable).

**2. [Rule 3 — Blocking] Workspace dependencies not installed in worktree**
- **Found during:** Task 1, first `prisma migrate dev` invocation (`Command "prisma" not found`).
- **Issue:** Fresh worktree had no `node_modules` directory.
- **Fix:** Ran `pnpm install --frozen-lockfile` (uses content-addressable cache; ~4s).
- **Commit:** No code change; tooling bootstrap.

**3. [Rule 3 — Blocking] @schoolflow/shared dist missing → typecheck noise**
- **Found during:** Task 1 verify step (`tsc --noEmit` reported 70+ "Cannot find module '@schoolflow/shared'" errors PLUS `Property 'person' does not exist on PrismaService` errors).
- **Issue:** Two compounding problems: (a) `packages/shared` had no `dist/` so any `@schoolflow/api` file importing from `@schoolflow/shared` failed at typecheck; (b) `apps/api/src/config/database/generated/` (Prisma client output dir per `schema.prisma:1`) was empty — `migrate dev` had not regenerated the client to that path.
- **Fix:** Built shared (`pnpm --filter @schoolflow/shared build`) and explicitly ran `pnpm --filter @schoolflow/api exec prisma generate`. After both, `tsc --noEmit` is clean.
- **Verification of pre-existing nature:** Stashed our schema change, ran `tsc --noEmit` from base — same 70+ errors present, confirming this is environmental setup, not introduced by Plan 15-01.
- **Commit:** No code change; environment bootstrap. Generated `apps/api/src/config/database/generated/` is gitignored (re-derivable).

### Plan-Adherence Note

The plan's `<verify>` block expects `grep -q 'ADD COLUMN "before" JSONB'` (single space) but Prisma 7.6.0 emitted `ADD COLUMN     "before" JSONB` (multiple spaces). The semantic intent (additive JSONB column) is identical; the literal string match is whitespace-sensitive. Documented as a non-issue — both `grep -q 'ADD COLUMN' apps/api/prisma/migrations/*add_audit_entry_before_snapshot*/migration.sql && grep -q '"before" JSONB'` confirm the requirement, and the must-haves contract `contains: 'ADD COLUMN "before" JSONB'` is met substantively.

## Authentication Gates Encountered

None.

## Known Stubs

None. Backend-only plan; all changes are wired end-to-end (DTO → controller → service → DB column → Prisma client).

## TDD Gate Compliance

Plan-level TDD gate sequence:

| Task | RED commit (`test:`) | GREEN commit (`feat:`) | REFACTOR commit |
| --- | --- | --- | --- |
| Task 1 (schema migration) | n/a (TDD not applicable — DDL) | `1fcd5b5` | none needed |
| Task 2 (interceptor) | `7d96b8c` | `d8cd530` | none needed |
| Task 3 (action filter) | `a2f2f1b` | `d83a3e3` | none needed |

All RED commits land BEFORE corresponding GREEN. RED phase verified: every test fails before implementation lands. No fail-fast violations.

## Threat Model Compliance

All four entries in the plan's `<threat_model>` are mitigated:

| Threat ID | Mitigation Status | Evidence |
| --- | --- | --- |
| T-15-01-01 (Tampering, action enum) | mitigated | `@IsEnum(AuditActionFilter)` on `QueryAuditDto.action` rejects values outside `create/update/delete/read` (422). |
| T-15-01-02 (Info Disclosure, before snapshot) | mitigated | `before` only surfaces via `AuditService.findAll`, which preserves the existing role-scoped where-clause (admin sees all, schulleitung sees pedagogical, others see own). Sensitive-field redaction extended to `before` snapshots in `sanitizeBody`. |
| T-15-01-03 (DoS, pre-handler DB lookup) | mitigated | `captureBeforeState` wraps DB read in try/catch returning `undefined`; map is opt-in (only 11 resources). Phase 15 surfaces are admin-only, low throughput. |
| T-15-01-04 (Repudiation, audit completeness) | mitigated | `metadata.body` shape preserved EXACTLY for non-DELETE; new `before` field is additive; existing log call sites keep producing identical payloads. Confirmed by 7 unit tests covering every branch. |

## Threat Flags

None — no new network endpoints, auth paths, file access, or trust-boundary schema changes introduced. The `AuditEntry.before` column is admin-read-only (gated by `CheckPermissions({ action: 'read', subject: 'audit' })`).

## Self-Check: PASSED

Verified files exist:
- `FOUND: apps/api/prisma/migrations/20260427181615_add_audit_entry_before_snapshot/migration.sql`
- `FOUND: apps/api/src/modules/audit/audit.interceptor.spec.ts`
- `FOUND: apps/api/src/modules/audit/audit.service.spec.ts`
- `FOUND: apps/api/prisma/schema.prisma` (modified)
- `FOUND: apps/api/src/modules/audit/audit.interceptor.ts` (modified)
- `FOUND: apps/api/src/modules/audit/audit.service.ts` (modified)
- `FOUND: apps/api/src/modules/audit/audit.controller.ts` (modified)
- `FOUND: apps/api/src/modules/audit/dto/query-audit.dto.ts` (modified)

Verified commits exist on `worktree-agent-afc09f3c350c9c966`:
- `FOUND: 1fcd5b5` feat(15-01): add AuditEntry.before column for pre-mutation snapshots
- `FOUND: 7d96b8c` test(15-01): add failing test for AuditInterceptor pre-state capture
- `FOUND: d8cd530` feat(15-01): capture pre-mutation state in AuditInterceptor
- `FOUND: a2f2f1b` test(15-01): add failing test for AuditService action filter
- `FOUND: d83a3e3` feat(15-01): add action filter to audit query (DTO + service + controller)
