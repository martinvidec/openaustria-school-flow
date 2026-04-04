---
phase: 6
slug: substitution-planning
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (web + shared) / jest 29.x (api via @nestjs/testing) / Supertest 7 (API integration) |
| **Config file** | `apps/api/jest.config.js`, `apps/web/vitest.config.ts`, `packages/shared/vitest.config.ts` |
| **Quick run command** | `pnpm -w test --filter=@openaustria/api -- --testPathPattern=substitution` |
| **Full suite command** | `pnpm -w test` |
| **Estimated runtime** | ~90 seconds (quick) / ~4 minutes (full) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm -w test --filter=<package> -- <scoped-pattern>`
- **After every plan wave:** Run `pnpm -w test --filter=@openaustria/api && pnpm -w test --filter=@openaustria/web`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 90 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 6-00-01 | 00 | 0 | — | scaffold | `pnpm -w test --filter=@openaustria/api -- --testPathPattern=substitution` | ❌ W0 | ⬜ pending |

*Populated by gsd-planner during plan creation. Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/substitution/__tests__/teacher-absence.service.spec.ts` — stubs for SUBST-01
- [ ] `apps/api/src/modules/substitution/__tests__/ranking.service.spec.ts` — stubs for SUBST-01 (ranking weights)
- [ ] `apps/api/src/modules/substitution/__tests__/substitution.service.spec.ts` — stubs for SUBST-01, SUBST-04
- [ ] `apps/api/src/modules/substitution/__tests__/substitution-stats.service.spec.ts` — stubs for SUBST-06
- [ ] `apps/api/src/modules/notification/__tests__/notification.service.spec.ts` — stubs for SUBST-02
- [ ] `apps/api/src/modules/notification/__tests__/notification.gateway.spec.ts` — stubs for SUBST-02 (JWT handshake validation)
- [ ] `apps/api/src/modules/substitution/__tests__/handover.service.spec.ts` — stubs for SUBST-03
- [ ] `apps/api/src/modules/substitution/__tests__/substitution.module.spec.ts` — module wiring sanity
- [ ] `apps/api/src/modules/timetable/__tests__/view-overlay.spec.ts` — stubs for SUBST-04 (getView overlay)
- [ ] `apps/web/src/components/timetable/__tests__/ChangeIndicator.test.tsx` — STILLARBEIT variant for SUBST-04
- [ ] `apps/web/src/components/notification/__tests__/NotificationBell.test.tsx` — stubs for SUBST-02
- [ ] `apps/web/src/hooks/__tests__/useNotificationSocket.test.ts` — stubs for SUBST-02

*Framework install: none — Vitest 4 + @nestjs/testing + Supertest 7 + Testing Library pre-installed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Push notification visible on locked device screen | SUBST-02 | Requires native mobile runtime; not exercised by Vitest/Jest | Trigger absence with known substitute; confirm iOS/Android lock-screen banner fires via Expo dev client |
| Timetable overlay is visually distinct (color/icon) | SUBST-04 | Visual/accessibility regression | Compare rendered ChangeIndicator across `teacher_change`, `room_change`, `cancelled`, `stillarbeit` against UI-SPEC |

*All other phase behaviors have automated verification.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 90s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
