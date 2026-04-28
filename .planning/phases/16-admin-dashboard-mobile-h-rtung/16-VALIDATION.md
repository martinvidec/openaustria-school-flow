---
phase: 16
slug: admin-dashboard-mobile-h-rtung
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-28
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (apps/web + apps/api unit/integration) + Playwright 1.x (apps/web E2E, mobile-375 project) |
| **Config file** | `apps/web/vitest.config.ts`, `apps/api/vitest.config.ts`, `apps/web/playwright.config.ts` |
| **Quick run command** | `pnpm --filter @schoolflow/api test --run && pnpm --filter @schoolflow/web test --run` |
| **Full suite command** | `pnpm -w test --run && pnpm --filter @schoolflow/web exec playwright test --project=chromium-desktop --project=mobile-375` |
| **Estimated runtime** | ~180 seconds (unit + integration) + ~240 seconds (Playwright two projects) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter <package> test --run` for the modified package only
- **After every plan wave:** Run `pnpm -w test --run` (all unit/integration suites)
- **Before `/gsd-verify-work`:** Full suite (unit + integration + Playwright `chromium-desktop` + `mobile-375`) must be green
- **Max feedback latency:** 60 seconds (per-package quick run)

---

## Per-Task Verification Map

> Filled by gsd-planner during plan creation. Each plan task with `type: tdd` or `<automated>` block must register a row here. All requirement IDs (ADMIN-01/02/03, MOBILE-ADM-01/02/03) must appear at least once.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| _to be populated by planner_ | | | | | | | | | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/dashboard/dashboard.service.spec.ts` — DashboardService aggregator stubs covering ADMIN-01 (10 categories) + ADMIN-03 (3-state heuristics per D-06)
- [ ] `apps/api/test/dashboard.e2e-spec.ts` — `GET /admin/dashboard/status` integration spec (admin-only auth, JSON contract per D-10)
- [ ] `apps/web/src/hooks/useDashboardStatus.test.ts` — TanStack Query hook spec (refetchInterval D-08, staleTime D-09, invalidation key D-07)
- [ ] `apps/web/src/components/data-list/DataList.test.tsx` — desktop table + mobile card render branch (D-12), data-testid wiring (D-14)
- [ ] `apps/web/src/hooks/useIsMobile.test.ts` — extracted hook spec (D-13, 640px default + override)
- [ ] `apps/web/e2e/admin-dashboard.spec.ts` — E2E: admin login → /admin redirect (D-02 + ADMIN-01); deep-link click → target surface (ADMIN-02); mutation invalidates dashboard live (ADMIN-03)
- [ ] `apps/web/e2e/mobile-admin-sweep.spec.ts` — Playwright `mobile-375` project sweep over all admin routes; assertion: visible card alternative + no horizontal overflow + interactive elements ≥ 44px (MOBILE-ADM-01/02/03)
- [ ] `apps/web/playwright.config.ts` — verify `mobile-375` project entry exists (375×667 viewport, touch enabled); add if missing

*All other phase artefacts can rely on existing Vitest + Playwright infrastructure.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual regression of shadcn input/button height lift to `min-h-11` (D-17) — global change risk | MOBILE-ADM-02 | Visual review of touch-target consistency across all admin forms is faster eyeballed than enforced via screenshot diff in v1.0 | After D-17 lands, admin opens 3 representative forms (school.settings, teachers.$id, dsgvo.tsx) at 375 px and confirms inputs/buttons are visually consistent and reach 44 px tap-target. Document outcome in PR description. |

*All requirement-defining behaviors (ADMIN-01/02/03, MOBILE-ADM-01/02/03) have automated verification via the Wave 0 specs above. Visual polish review remains the only manual gate.*

---

## Validation Sign-Off

- [ ] All plan tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (especially `mobile-admin-sweep.spec.ts` and `admin-dashboard.spec.ts`)
- [ ] No watch-mode flags in committed `package.json` test scripts
- [ ] Feedback latency < 60s for per-package quick run
- [ ] `nyquist_compliant: true` set in frontmatter once planner populates the verification map

**Approval:** pending
