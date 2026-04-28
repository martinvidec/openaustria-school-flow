---
phase: 16
slug: admin-dashboard-mobile-h-rtung
status: ready
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-28
updated: 2026-04-29
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

> Populated 2026-04-29 by gsd-planner during revision iteration 1 (WARNING W1 fix).
> Each row maps a task to its requirement(s), threat refs, test type, and the automated command from the task's `<automated>` block.

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| **Plan 01 — Backend Dashboard Endpoint** | | | | | | | | | |
| 01-T1 | 01 | 1 | ADMIN-01 | T-16-1, T-16-5 | DTO/module skeleton; AppModule boots cleanly; @IsUUID validation gate | unit + tsc | `pnpm --filter @schoolflow/api exec tsc --noEmit && pnpm --filter @schoolflow/api test --run dashboard` | ⬜ pending | ⬜ pending |
| 01-T2 | 01 | 1 | ADMIN-01, ADMIN-03 | T-16-2 | 10-category aggregator (D-06/D-23/D-24); tenant scoping; resolveAdminSchoolId via Person.findFirst | unit | `pnpm --filter @schoolflow/api test --run dashboard.service.spec` | ⬜ pending | ⬜ pending |
| 01-T3 | 01 | 1 | ADMIN-01 | T-16-1, T-16-2, T-16-3, T-16-5 | Admin-only @CheckPermissions; cross-tenant 403 via resolveAdminSchoolId mismatch; behavior-asserted (not source-shape) | integration (e2e-spec) | `pnpm --filter @schoolflow/api test --run dashboard.controller.spec dashboard.e2e-spec` | ⬜ pending | ⬜ pending |
| **Plan 02 — Frontend Foundation (hooks + DataList + Checklist)** | | | | | | | | | |
| 02-T1 | 02 | 1 | ADMIN-01, MOBILE-ADM-01 | T-16-2 (FE) | useIsMobile extracted (D-13); useDashboardStatus accepts string\|null\|undefined (D-07/08/09) | unit | `pnpm --filter @schoolflow/web test --run useIsMobile.test useDashboardStatus.test` | ⬜ pending | ⬜ pending |
| 02-T2 | 02 | 1 | MOBILE-ADM-01 | T-16-8 | DataList dual-render via Tailwind (D-12); data-testid on both render paths (D-14) | unit | `pnpm --filter @schoolflow/web test --run DataList.test` | ⬜ pending | ⬜ pending |
| 02-T3 | 02 | 1 | ADMIN-01 | T-16-9 | ChecklistItem locked anatomy + status colors; DashboardChecklistProps locked as { schoolId: string \| null \| undefined } | unit | `pnpm --filter @schoolflow/web test --run ChecklistItem.test DashboardChecklist.test` | ⬜ pending | ⬜ pending |
| **Plan 03 — Route + Sidebar Wiring** | | | | | | | | | |
| 03-T1 | 03 | 2 | ADMIN-01, ADMIN-02, MOBILE-ADM-03 | T-16-1 (race), T-16-4 | Role-aware /index.tsx redirect (D-02 + Pitfall #1); MobileSidebar parity with AppSidebar (Phase 15 gap close) | tsc + grep | `pnpm --filter @schoolflow/web exec tsc --noEmit && grep -c "Dashboard" apps/web/src/components/layout/AppSidebar.tsx \| grep -v '^#' && grep -c "Dashboard\|DSGVO-Verwaltung\|Audit-Log" apps/web/src/components/layout/MobileSidebar.tsx \| grep -v '^#'` | ⬜ pending | ⬜ pending |
| 03-T2 | 03 | 2 | ADMIN-01 | T-16-10 | /admin route renders DashboardChecklist via PageShell; admin-gate fallback for non-admin; passes useSchoolContext schoolId verbatim per Plan 02 locked contract | tsc | `pnpm --filter @schoolflow/web exec tsc --noEmit` | ⬜ pending | ⬜ pending |
| **Plan 04 — Touch-Target Primitive Lift** | | | | | | | | | |
| 04-T1 | 04 | 1 | MOBILE-ADM-02 | T-16-11 | Button/Input/Select height ≥ 44px (D-17); textarea audit; no per-form patches | unit + tsc | `pnpm --filter @schoolflow/web test --run button.test input.test select.test && pnpm --filter @schoolflow/web exec tsc --noEmit` | ⬜ pending | ⬜ pending |
| **Plan 05 — Mobile-Sweep + Table Migrations** | | | | | | | | | |
| 05-T1 | 05 | 3 | MOBILE-ADM-01, MOBILE-ADM-02 | T-16-13 | Audit-first mobile-sweep at 375px across 16 admin routes (D-16) | E2E (Playwright mobile-375) | `cd apps/web && pnpm exec playwright test admin-mobile-sweep.mobile.spec.ts --project=mobile-375 --reporter=list 2>&1 \| head -200 \|\| true` | ⬜ pending | ⬜ pending |
| 05-T2 | 05 | 3 | MOBILE-ADM-01 | T-16-2 (carry), T-16-12, T-16-13 | Migrate 6 Phase 15 surfaces (3 dedicated *Table.tsx + 3 inline *Tab.tsx) to DataList; preserve E2E testids | unit + tsc | `pnpm --filter @schoolflow/web exec tsc --noEmit && pnpm --filter @schoolflow/web test --run dsgvo audit 2>&1 \| tail -30` | ⬜ pending | ⬜ pending |
| 05-T3 | 05 | 3 | MOBILE-ADM-01 | T-16-2 (carry), T-16-12, T-16-13 | Migrate 5 Phase 14 solver-tuning surfaces to DataList; preserve Pitfall #7 desktop slider density | unit + tsc | `pnpm --filter @schoolflow/web exec tsc --noEmit && pnpm --filter @schoolflow/web test --run solver-tuning 2>&1 \| tail -30` | ⬜ pending | ⬜ pending |
| **Plan 06 — Cross-Mutation Invalidation Fan-Out (split per WARNING W2)** | | | | | | | | | |
| 06-T1a | 06 | 3 | ADMIN-03 | T-16-14, T-16-15 | Phase 10–13 hooks: 7 files / ~38 mutations invalidate ['dashboard-status']; onError untouched | tsc | `pnpm --filter @schoolflow/web exec tsc --noEmit` | ⬜ pending | ⬜ pending |
| 06-T1b | 06 | 3 | ADMIN-03 | T-16-14, T-16-15 | Phase 14–15 hooks: 6 files / ~19 mutations invalidate ['dashboard-status']; onError untouched | tsc | `pnpm --filter @schoolflow/web exec tsc --noEmit` | ⬜ pending | ⬜ pending |
| 06-T2 | 06 | 3 | ADMIN-03 | T-16-14 | Regression unit tests on representative hooks (one Task 1a + one Task 1b coverage) | unit | `pnpm --filter @schoolflow/web test --run useTeachers.test useDsfa.test` | ⬜ pending | ⬜ pending |
| **Plan 07 — End-to-End Verification** | | | | | | | | | |
| 07-T1 | 07 | 4 | ADMIN-01, ADMIN-02 | T-16-1, T-16-4 | login-redirect.spec.ts: per-role redirect (admin→/admin, non-admin→/timetable) | E2E (Playwright desktop) | per Plan 07 task automated block | ⬜ pending | ⬜ pending |
| 07-T2 | 07 | 4 | ADMIN-01, ADMIN-02, ADMIN-03 | T-16-1, T-16-2, T-16-15 | admin-dashboard.spec.ts: desktop happy-path + deep-link + live invalidation after mutation | E2E (Playwright desktop) | per Plan 07 task automated block | ⬜ pending | ⬜ pending |
| 07-T3 | 07 | 4 | MOBILE-ADM-01, MOBILE-ADM-02, MOBILE-ADM-03 | T-16-13 | admin-dashboard.mobile.spec.ts + mobile-sweep green at 375px | E2E (Playwright mobile-375) | per Plan 07 task automated block | ⬜ pending | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

### Requirement Coverage Audit

| Requirement | Tasks Covering It |
|-------------|-------------------|
| ADMIN-01 | 01-T1, 01-T2, 01-T3, 02-T1, 02-T3, 03-T1, 03-T2, 07-T1, 07-T2 |
| ADMIN-02 | 03-T1, 07-T1, 07-T2 |
| ADMIN-03 | 01-T2, 06-T1a, 06-T1b, 06-T2, 07-T2 |
| MOBILE-ADM-01 | 02-T1, 02-T2, 05-T1, 05-T2, 05-T3, 07-T3 |
| MOBILE-ADM-02 | 04-T1, 05-T1, 07-T3 |
| MOBILE-ADM-03 | 03-T1, 07-T3 |

All 6 requirements covered by ≥ 1 task with an automated verify command. Nyquist compliant.

### Threat Coverage Audit

| Threat ID | Plan(s) Addressing | Type |
|-----------|---------------------|------|
| T-16-1 | 01, 03, 07 | Elevation of Privilege (admin-only guard) |
| T-16-2 | 01, 02 (FE carry), 05 (carry) | Information Disclosure (tenant isolation) |
| T-16-3 | 01 | Information Disclosure (response shape) |
| T-16-4 | 03 | Elevation of Privilege (beforeLoad role read) |
| T-16-5 | 01 | Tampering (UUID validation) |
| T-16-6 | 01 | DoS (deduplication budget) |
| T-16-7 | 01 | Repudiation (read-only) |
| T-16-8 | 02 | Tampering / XSS (mobileCard slot) |
| T-16-9 | 02 | Information Disclosure (cache leak across logout) |
| T-16-10 | 03 | Elevation of Privilege (direct URL gate) |
| T-16-11 | 04 | (touch-target floor regression — primitive lift) |
| T-16-12 | 05 | Tampering / XSS (DataList mobileCard slot) |
| T-16-13 | 05, 07 | Regression (E2E selector preservation) |
| T-16-14 | 06 | Regression (silent-4xx invariant) |
| T-16-15 | 06 | DoS (cache thrashing) |

All 15 threats addressed with explicit mitigation plan + acceptance criteria.

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/dashboard/dashboard.service.spec.ts` — DashboardService aggregator stubs covering ADMIN-01 (10 categories) + ADMIN-03 (3-state heuristics per D-06/D-23/D-24) + resolveAdminSchoolId
- [ ] `apps/api/test/dashboard.e2e-spec.ts` — `GET /admin/dashboard/status` integration spec (admin-only auth, JSON contract per D-10, cross-tenant 403 by behavior, no-Person 403 edge case)
- [ ] `apps/web/src/hooks/useDashboardStatus.test.ts` — TanStack Query hook spec (refetchInterval D-08, staleTime D-09, invalidation key D-07, accepts string\|null\|undefined parameter shape)
- [ ] `apps/web/src/components/shared/DataList.test.tsx` — desktop table + mobile card render branch (D-12), data-testid wiring (D-14)
- [ ] `apps/web/src/hooks/useIsMobile.test.ts` — extracted hook spec (D-13, 640px default + override)
- [ ] `apps/web/src/components/admin/dashboard/DashboardChecklist.test.tsx` — locked DashboardChecklistProps contract (renders OK with null / undefined / string)
- [ ] `apps/web/e2e/admin-mobile-sweep.mobile.spec.ts` — Playwright `mobile-375` project sweep over all admin routes; assertion: visible card alternative + no horizontal overflow + interactive elements ≥ 44px (MOBILE-ADM-01/02/03)
- [ ] `apps/web/e2e/admin-dashboard.spec.ts` (Plan 07) — E2E: admin login → /admin redirect (D-02 + ADMIN-01); deep-link click → target surface (ADMIN-02); mutation invalidates dashboard live (ADMIN-03)
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

- [x] All plan tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (especially `admin-mobile-sweep.mobile.spec.ts` and `admin-dashboard.spec.ts`)
- [ ] No watch-mode flags in committed `package.json` test scripts (verify before /gsd-verify-work)
- [x] Feedback latency < 60s for per-package quick run
- [x] `nyquist_compliant: true` set in frontmatter (planner populated map 2026-04-29)

**Approval:** ready (planner sign-off 2026-04-29 iteration 1; pending executor wave-by-wave green ticks during implementation)
