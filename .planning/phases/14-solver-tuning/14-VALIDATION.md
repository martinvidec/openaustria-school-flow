---
phase: 14
slug: solver-tuning
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-25
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (api + web units), Playwright 1.x (web e2e) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts` |
| **Quick run command** | `pnpm --filter @schoolflow/api test -- --run` (≤ 30s for changed files) |
| **Full suite command** | `pnpm -r test -- --run && pnpm --filter @schoolflow/web exec playwright test --project=desktop` |
| **Estimated runtime** | unit ~30s, full incl. e2e ~3-5min |

---

## Sampling Rate

- **After every task commit:** Run targeted unit tests for the touched module(s) (`pnpm --filter @schoolflow/api test -- --run <file>` or `pnpm --filter @schoolflow/web test -- --run <file>`)
- **After every plan wave:** Run full unit suite for both apps + the e2e specs added in this phase
- **Before `/gsd:verify-work`:** Full unit + Playwright suite green; no `E2E_RUN_SOLVER`-gated specs needed (Phase 14 covers CRUD + persistence, not solve execution)
- **Max feedback latency:** 60 seconds for unit changes

---

## Per-Task Verification Map

To be filled by `gsd-planner` once plans are written. Skeleton:

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-XX | 01 | N | SOLVER-01..05 | unit/e2e | `{command}` | ✅ / ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

To be confirmed during planning. Likely:

- [ ] Prisma migration for `ConstraintWeightOverride` (and any other gap models surfaced by RESEARCH.md §Schema Reality Check) committed via `prisma migrate dev` (per CLAUDE.md hard rule)
- [ ] Service-spec stubs for new constraint-weight-override service in `apps/api/src/modules/timetable/`
- [ ] E2E spec stubs in `apps/web/e2e/admin-solver-tuning.*.spec.ts` reusing `helpers/login.ts` + `helpers/card.ts`

*If none after planning: replace with "Existing infrastructure covers all phase requirements."*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Re-run of timetable solver reflects changed weights nachvollziehbar gegen Pre-Change-Baseline | Roadmap §Phase 14 success criterion #5 | Requires Timefold sidecar (Java) running with `E2E_RUN_SOLVER=1`; sidecar has known thread-count + duplicate planningId bugs (see `.planning/phases/10.5-e2e-admin-ops-operations/deferred-items.md` §6-§7) | 1) Trigger baseline solve via `POST /schools/:id/timetable/solve` 2) PUT new weight overrides 3) Re-trigger solve 4) Compare scoring breakdowns / generated lessons against baseline |

---

## Dimensions Covered (from RESEARCH.md §Validation Architecture)

The 7 Nyquist dimensions surfaced by research must each map to at least one task in the per-task map above:

1. ConstraintTemplate weights override — CRUD happy path (unit + e2e)
2. Weight bounds validation (Min/Max/Type) — class-validator unit + zod form unit + e2e error toast
3. Multi-school isolation — schoolId leakage tests (unit + e2e fixture per school)
4. Restriction lifecycle (create + list + delete) — service unit + e2e
5. Preference lifecycle (create + list + delete) — service unit + e2e
6. Solver re-run reflects changed weights — manual verification (see above)
7. Playwright E2E per UI swimlane from UI-SPEC — e2e

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 60s for unit changes
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
