---
phase: 1
slug: project-scaffolding-auth
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | apps/api/vitest.config.ts (Wave 0 installs) |
| **Quick run command** | `pnpm --filter @schoolflow/api test` |
| **Full suite command** | `pnpm --filter @schoolflow/api test -- --run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @schoolflow/api test`
- **After every plan wave:** Run `pnpm --filter @schoolflow/api test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 01-01-01 | 01 | 1 | FOUND-01 | integration | `pnpm --filter @schoolflow/api test` | ❌ W0 | ⬜ pending |
| 01-02-01 | 02 | 1 | DEPLOY-01 | smoke | `docker compose up -d && curl localhost:3000/health` | ❌ W0 | ⬜ pending |
| 01-03-01 | 03 | 2 | AUTH-01 | integration | `pnpm --filter @schoolflow/api test -- auth` | ❌ W0 | ⬜ pending |
| 01-04-01 | 04 | 2 | AUTH-02, AUTH-03 | integration | `pnpm --filter @schoolflow/api test -- rbac` | ❌ W0 | ⬜ pending |
| 01-05-01 | 05 | 2 | AUTH-04, AUTH-05, AUTH-06 | integration | `pnpm --filter @schoolflow/api test -- acl` | ❌ W0 | ⬜ pending |
| 01-06-01 | 06 | 3 | API-01, API-02, API-03 | e2e | `pnpm --filter @schoolflow/api test -- api` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/vitest.config.ts` — vitest configuration
- [ ] `apps/api/test/setup.ts` — shared test fixtures (Prisma test client, Keycloak token helper)
- [ ] `apps/api/test/helpers/` — reusable test helpers for auth, DB seeding
- [ ] vitest + supertest + @testcontainers/postgresql — install as devDependencies

*Wave 0 is handled by the first plan (project scaffolding) which sets up the test infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keycloak login UI flow | AUTH-01 | Browser-based OIDC redirect | Navigate to /login, verify Keycloak redirect, log in, verify JWT returned |
| Session survives browser refresh | AUTH-01 | Browser session persistence | Log in, refresh page, verify still authenticated |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
