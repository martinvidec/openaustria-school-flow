---
phase: 12
slug: sch-ler-klassen-und-gruppenverwaltung
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-24
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x (api + web unit) · supertest 7.x (api integration) · Playwright 1.x (e2e) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts`, `apps/web/playwright.config.ts` |
| **Quick run command** | `pnpm --filter @schoolflow/api test -- --run` |
| **Full suite command** | `pnpm -w test && pnpm --filter @schoolflow/web exec playwright test` |
| **Estimated runtime** | ~180 seconds (unit+integration ~60s, Playwright ~120s) |

---

## Sampling Rate

- **After every task commit:** Run quick command scoped to the touched package
- **After every plan wave:** Run full suite command
- **Before `/gsd:verify-work`:** Full suite must be green, Playwright E2E green on Desktop + Mobile-375
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

> Populated by planner/executor. Each task row links REQ-ID → test command → status.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD-12-01-01 | 01 | 1 | CLASS-01/-02 | unit | `pnpm --filter @schoolflow/api test -- classes.service` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/students/students.service.spec.ts` — orphan-guard unit coverage (STUDENT-04)
- [ ] `apps/api/src/classes/classes.service.spec.ts` — orphan-guard unit coverage (CLASS-05)
- [ ] `apps/api/src/parents/parents.module.ts` + controller/service scaffolding (STUDENT-02)
- [ ] `apps/api/src/group-derivation-rules/` — new module scaffold (CLASS-04)
- [ ] `apps/api/test/students.e2e-spec.ts` — supertest Elternlink + archive flows
- [ ] `apps/api/test/classes.e2e-spec.ts` — supertest Stundentafel-apply + delete-conflict
- [ ] `apps/web/e2e/students-crud.spec.ts` — Playwright Schüler Happy/Error × Desktop + Mobile-375
- [ ] `apps/web/e2e/classes-crud.spec.ts` — Playwright Klassen Happy/Error × Desktop + Mobile-375
- [ ] `apps/web/e2e/classes-stundentafel.spec.ts` — Vorlage anwenden + SUBJECT-04 Wochenstunden-Editor
- [ ] `apps/web/e2e/classes-group-rules.spec.ts` — Regelpflege + manueller Override

*Migrations required (hard rule — CLAUDE.md):*
- `apps/api/prisma/migrations/<ts>_student_archive_flag/` — `Student.isArchived`, `archivedAt`
- `apps/api/prisma/migrations/<ts>_group_derivation_rule/` — new GroupDerivationRule model + FK

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| German copy accuracy in forms | UX | Pure copy/translation QA | Screenshot review durch zweisprachigen Reviewer |

*Every other behavior is automatable via Vitest/Supertest/Playwright.*

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references (see list above)
- [ ] No Playwright `.only` / watch-mode flags
- [ ] Feedback latency < 60s on quick command
- [ ] `nyquist_compliant: true` set in frontmatter after planner finalizes map

**Approval:** pending
