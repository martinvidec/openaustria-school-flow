---
phase: 10
slug: schulstammdaten-zeitraster
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-19
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (API)** | Vitest 4.x (NestJS test config) |
| **Framework (Web)** | Vitest 4.x + @testing-library/react 16.x |
| **Framework (E2E)** | Playwright 1.x |
| **Framework (Shared)** | Vitest 4.x |
| **Config files** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts` (Wave 0 adds if missing), `packages/shared/vitest.config.ts` (Wave 0 adds if missing) |
| **Quick run command** | `pnpm -r test -- --run` (scoped) |
| **Full suite command** | `pnpm -r test && pnpm --filter @schoolflow/web exec playwright test` |
| **Estimated runtime** | ~90 seconds (unit + integration) + ~120 seconds (Playwright) |

---

## Sampling Rate

- **After every task commit:** Run the task's `<automated>` command (scoped unit/integration test).
- **After every plan wave:** Run `pnpm -r test -- --run` across all packages.
- **Before `/gsd-verify-work`:** Full suite (incl. Playwright) must be green.
- **Max feedback latency:** 45 seconds for Vitest unit tests; 120 seconds full.

---

## Per-Task Verification Map

> Populated by the planner when PLAN.md files are generated. Every task must either link to an `<automated>` command OR point to a Wave 0 infrastructure dependency.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-01-01 | 01 (migrations) | 1 | SCHOOL-04 | unit | `pnpm --filter @schoolflow/api exec vitest run prisma/__tests__/migration.spec.ts` | ❌ W0 | ⬜ pending |
| 10-01-02 | 01 (migrations) | 1 | SCHOOL-03 | unit | `pnpm --filter @schoolflow/api exec vitest run prisma/__tests__/school-year-multi-active.spec.ts` | ❌ W0 | ⬜ pending |
| 10-02-01 | 02 (shared schemas) | 1 | SCHOOL-01..05 (D-15) | unit | `pnpm --filter @schoolflow/shared exec vitest run src/schemas/school.schema.spec.ts` | ❌ W0 | ⬜ pending |
| 10-03-01 | 03 (API school-year module) | 2 | SCHOOL-03, SCHOOL-05 | integration | `pnpm --filter @schoolflow/api exec vitest run src/modules/school/school-year.controller.spec.ts` | ❌ W0 | ⬜ pending |
| 10-03-02 | 03 (API school-year module) | 2 | SCHOOL-05 (orphan-guard) | integration | `pnpm --filter @schoolflow/api exec vitest run src/modules/school/school-year.service.spec.ts` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 (API time-grid destructive guard) | 2 | SCHOOL-02 (D-13) | integration | `pnpm --filter @schoolflow/api exec vitest run src/modules/school/school-time-grid.service.spec.ts` | ❌ W0 | ⬜ pending |
| 10-04-02 | 04 (API school update incl. abWeekEnabled) | 2 | SCHOOL-04 | integration | `pnpm --filter @schoolflow/api exec vitest run src/modules/school/school.controller.spec.ts` | ❌ W0 | ⬜ pending |
| 10-05-01 | 05 (Web Tab shell + route) | 3 | SCHOOL-01 (D-01) | integration | `pnpm --filter @schoolflow/web exec vitest run src/routes/_authenticated/admin/__tests__/school.settings.spec.tsx` | ❌ W0 | ⬜ pending |
| 10-05-02 | 05 (Unsaved-Changes dialog) | 3 | D-02 | integration | `pnpm --filter @schoolflow/web exec vitest run src/components/admin/school-settings/__tests__/UnsavedChangesDialog.spec.tsx` | ❌ W0 | ⬜ pending |
| 10-06-01 | 06 (Stammdaten tab) | 3 | SCHOOL-01, D-03 | integration | `pnpm --filter @schoolflow/web exec vitest run src/components/admin/school-settings/__tests__/SchoolDetailsTab.spec.tsx` | ❌ W0 | ⬜ pending |
| 10-07-01 | 07 (Zeitraster tab) | 3 | SCHOOL-02, D-11, D-14 | integration | `pnpm --filter @schoolflow/web exec vitest run src/components/admin/school-settings/__tests__/TimeGridTab.spec.tsx` | ❌ W0 | ⬜ pending |
| 10-08-01 | 08 (Schuljahr tab) | 3 | SCHOOL-03, SCHOOL-05 | integration | `pnpm --filter @schoolflow/web exec vitest run src/components/admin/school-settings/__tests__/SchoolYearsTab.spec.tsx` | ❌ W0 | ⬜ pending |
| 10-09-01 | 09 (Optionen tab + A/B) | 3 | SCHOOL-04, D-05, D-06 | integration | `pnpm --filter @schoolflow/web exec vitest run src/components/admin/school-settings/__tests__/OptionsTab.spec.tsx` | ❌ W0 | ⬜ pending |
| 10-10-01 | 10 (E2E desktop happy path) | 4 | SCHOOL-01..05 | e2e | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-school-settings.spec.ts` | ❌ W0 | ⬜ pending |
| 10-10-02 | 10 (E2E mobile 375px) | 4 | MOBILE-ADM-02, D-12 | e2e | `pnpm --filter @schoolflow/web exec playwright test e2e/admin-school-settings-mobile.spec.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*
*File Exists: ❌ W0 = test infrastructure to be scaffolded in Wave 0 of the owning plan.*

---

## Wave 0 Requirements

Wave 0 (runs before feature code) installs missing deps and scaffolds test stubs:

- [ ] `pnpm --filter @schoolflow/shared add zod` — CONTEXT.md D-15 dependency
- [ ] `pnpm --filter @schoolflow/web add zod react-hook-form @hookform/resolvers` — form stack (see RESEARCH §3.1)
- [ ] `packages/shared/vitest.config.ts` — add if missing
- [ ] `packages/shared/src/schemas/school.schema.ts` — Zod source of truth
- [ ] `packages/shared/src/schemas/school.schema.spec.ts` — test stub
- [ ] `apps/api/prisma/__tests__/migration.spec.ts` — Prisma shadow DB assertion stubs
- [ ] `apps/api/src/modules/school/school-year.*.spec.ts` — service + controller stubs
- [ ] `apps/api/src/modules/school/school-time-grid.service.spec.ts` — destructive-guard stub
- [ ] `apps/web/playwright.config.ts` — add if missing (375px + desktop projects)
- [ ] `apps/web/e2e/admin-school-settings.spec.ts` + `.mobile.spec.ts` — E2E stubs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Admin-UI click-through evidence | SCHOOL-01..05 | Memory note `feedback_admin_requirements_need_ui_evidence.md` requires UI evidence for all "Admin kann X" requirements, not just backend/automated proofs | Capture 6 screenshots during manual UAT: (1) empty-state Stammdaten CTA; (2) filled Stammdaten; (3) TimeGrid editor desktop with drag-reorder; (4) TimeGrid at 375px mobile; (5) Schuljahr list with Aktiv-Badge; (6) Optionen tab with A/B toggle + info banner. Store under `.planning/phases/10-schulstammdaten-zeitraster/uat-screenshots/`. |
| iOS Safari time-input UX at 375px | MOBILE-ADM-02 | Native picker behavior can't be fully exercised by Playwright; real-device UX check required | Open `/admin/school/settings?tab=timegrid` on iOS Safari (or equivalent simulator); edit a period's start/end time; verify native time picker renders and 44px touch targets. |
| German-language error/UI string review | D-15 | Human language judgement (no automated check for tone) | Reviewer walks each error state and confirms strings are klar-deutsch and jargon-free. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 45s (quick) / < 210s (full)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
