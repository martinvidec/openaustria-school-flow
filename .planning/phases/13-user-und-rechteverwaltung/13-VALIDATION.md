---
phase: 13
slug: user-und-rechteverwaltung
status: approved
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-24
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (API + shared)** | vitest 4.x |
| **Framework (E2E)** | @playwright/test 1.x |
| **Config (api)** | `apps/api/vitest.config.ts` |
| **Config (shared)** | `packages/shared/vitest.config.ts` |
| **Config (e2e)** | `apps/web/playwright.config.ts` |
| **Quick run (api unit/int — per task)** | `pnpm --filter @schoolflow/api test -- --run <spec-glob>` |
| **Quick run (shared unit — per task)** | `pnpm --filter @schoolflow/shared test --run` |
| **Quick run (web typecheck — per frontend task)** | `pnpm --filter @schoolflow/web typecheck` |
| **Quick run (e2e — per spec)** | `pnpm --filter @schoolflow/web exec playwright test e2e/<spec>.spec.ts --project=desktop --reporter=line` |
| **Full suite (api + shared)** | `pnpm -w test` |
| **Full suite (e2e desktop + mobile-375)** | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-user-*.spec.ts e2e/admin-users-list.spec.ts --reporter=line` |
| **Migration hygiene gate** | `bash scripts/check-migration-hygiene.sh` |
| **Estimated runtime (quick)** | ~30-90s per task |
| **Estimated runtime (full)** | ~8-12 min (api + shared + 22 Playwright tests + mobile specs) |

---

## Sampling Rate

- **After every task commit:** Run the task's `<verify><automated>` command (per map below). No 3-task streak without automated verify — Nyquist sampling guarantee.
- **After every plan wave:** Run the corresponding full-suite command:
  - Wave 1 (13-01): `pnpm --filter @schoolflow/api test --run && pnpm --filter @schoolflow/shared test --run && bash scripts/check-migration-hygiene.sh && pnpm --filter @schoolflow/api build`
  - Wave 2 (13-02): `pnpm --filter @schoolflow/web typecheck && pnpm --filter @schoolflow/web build`
  - Wave 3 (13-03): `pnpm --filter @schoolflow/web exec playwright test e2e/admin-user-*.spec.ts e2e/admin-users-list.spec.ts --reporter=line` (includes mobile-375 project for mobile spec)
- **Before `/gsd:verify-work`:** All three wave suites green; `scripts/check-migration-hygiene.sh` exits 0.
- **Max feedback latency:** 90 seconds for unit/integration tasks; 4 minutes for E2E tasks.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | USER-04 | unit+migration | `pnpm --filter @schoolflow/api exec prisma migrate reset --force --skip-seed && bash scripts/check-migration-hygiene.sh` | ❌ W0 (new migration) | ⬜ pending |
| 13-01-02 | 01 | 1 | USER-01, USER-02, USER-03, USER-04, USER-05 | unit (shared) | `pnpm --filter @schoolflow/shared test --run` | ✅ | ⬜ pending |
| 13-01-03 | 01 | 1 | USER-01, USER-02, USER-03, USER-04, USER-05 | unit+integration (api) | `pnpm --filter @schoolflow/api test -- --run keycloak-admin.service.spec user-directory.service.spec role-management.service.spec permission-override.service.spec effective-permissions.service.spec casl-ability.factory.spec` | ❌ W0 (new specs) | ⬜ pending |
| 13-02-01 | 02 | 2 | USER-01 | typecheck + manual smoke | `pnpm --filter @schoolflow/web typecheck && pnpm --filter @schoolflow/web exec tsr generate` | ✅ | ⬜ pending |
| 13-02-02 | 02 | 2 | USER-02, USER-03, USER-04 | typecheck + manual smoke | `pnpm --filter @schoolflow/web typecheck` | ✅ | ⬜ pending |
| 13-02-03 | 02 | 2 | USER-05 | typecheck + manual smoke | `pnpm --filter @schoolflow/web typecheck && pnpm --filter @schoolflow/web build` | ✅ | ⬜ pending |
| 13-03-01 | 03 | 3 | (helper — all USER-XX) | typecheck | `cd apps/web && pnpm exec tsc --noEmit` | ❌ W0 (new helper) | ⬜ pending |
| 13-03-02 | 03 | 3 | USER-01 | E2E | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-users-list.spec.ts --project=desktop --reporter=line` | ❌ W0 (new spec) | ⬜ pending |
| 13-03-03 | 03 | 3 | USER-02 | E2E | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-user-roles.spec.ts --project=desktop --reporter=line` | ❌ W0 (new spec) | ⬜ pending |
| 13-03-04 | 03 | 3 | USER-03 | E2E | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-user-permissions.spec.ts --project=desktop --reporter=line` | ❌ W0 (new spec) | ⬜ pending |
| 13-03-05 | 03 | 3 | USER-04 | E2E | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-user-overrides.spec.ts --project=desktop --reporter=line` | ❌ W0 (new spec) | ⬜ pending |
| 13-03-06 | 03 | 3 | USER-05 | E2E | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-user-person-link.spec.ts --project=desktop --reporter=line` | ❌ W0 (new spec) | ⬜ pending |
| 13-03-07 | 03 | 3 | (non-admin guard — USER-01/02/03/04/05 surface) | E2E | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-user-access-guard.spec.ts --project=desktop --reporter=line` | ❌ W0 (new spec) | ⬜ pending |
| 13-03-08 | 03 | 3 | (silent-4xx regression invariant) | E2E | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-user-silent-4xx.spec.ts --project=desktop --reporter=line` | ❌ W0 (new spec) | ⬜ pending |
| 13-03-09 | 03 | 3 | USER-01, USER-05 (mobile-375 invariant — MOBILE-ADM-01/02, D-16) | E2E | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-user-mobile.spec.ts --project=mobile-375 --reporter=line` | ❌ W0 (new spec) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

**Nyquist sampling check:** 15 tasks total, every task has an automated verify command. No 3-task streak without automated verification. ✓

---

## Wave 0 Requirements

No new test infrastructure install needed:
- vitest 4.x is already the API + shared framework baseline.
- Playwright 1.x is already installed at `apps/web/e2e/`.
- `scripts/check-migration-hygiene.sh` is already in place (CLAUDE.md hard rule).
- Playwright `mobile-375` project is already configured in `apps/web/playwright.config.ts` (verify at execution start; if missing, add project definition in Task 13-03-09's read_first step).

Wave 0 stubs (files that don't yet exist but are listed as target paths in the plans — executor creates them as Task 1 of each respective plan):
- Plan 13-01 Task 1: `apps/api/prisma/migrations/20260424120000_add_override_updated_at_and_reason/migration.sql`
- Plan 13-01 Task 2: shared schema spec stubs under `packages/shared/src/permissions/` and `packages/shared/src/schemas/`
- Plan 13-01 Task 3: api service spec stubs under `apps/api/src/modules/{keycloak-admin,user-directory,role-management,permission-override}/*.spec.ts`
- Plan 13-03 Tasks 1-9: new Playwright specs under `apps/web/e2e/` + shared helper `apps/web/e2e/helpers/users.ts`

---

## Manual-Only Verifications

All phase behaviors have automated verification. No manual UAT asks — honors the 2026-04-21 E2E-first feedback directive.

One exception: the initial *mobile-375 Playwright project configuration check* (Task 13-03-09 Step 1 read_first) — if the project is missing from `playwright.config.ts`, the executor adds it inline with the other projects. This is a trivial config audit, not a manual UAT, and is verified automatically by running the spec against `--project=mobile-375`.

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (stubs enumerated above)
- [x] No watch-mode flags (all commands use `--run` / non-watch equivalents)
- [x] Feedback latency < 90s per task (E2E specs up to 4 min per spec)
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** approved 2026-04-24
