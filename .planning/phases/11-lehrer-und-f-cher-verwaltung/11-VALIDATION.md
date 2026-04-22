---
phase: 11
slug: lehrer-und-faecher-verwaltung
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-22
---

# Phase 11 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
>
> **Source:** §Validation Architecture in `11-RESEARCH.md`. Adjusted for post-research descope (D-11 free hex picker rolled back — `wcag.test.ts` + `TimetableCellPreview.test.tsx` removed from Wave 0).

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework (FE unit)** | Vitest 4.x — `apps/web/vitest.config.ts` |
| **Framework (BE unit)** | Vitest 4.x — `apps/api/vitest.config.ts` |
| **Framework (E2E)** | Playwright 1.x — `apps/web/playwright.config.ts` |
| **Quick run command (FE)** | `pnpm --filter @schoolflow/web test:run -- <pattern>` |
| **Quick run command (BE)** | `pnpm --filter @schoolflow/api test:run -- <pattern>` |
| **Quick run command (shared)** | `pnpm --filter @schoolflow/shared test:run -- <pattern>` |
| **Full suite command** | `pnpm -r test:run && pnpm --filter @schoolflow/web e2e` |
| **Estimated runtime** | ~2 min Vitest · ~3-5 min Playwright desktop + mobile |

---

## Sampling Rate

- **After every task commit:** Run affected-package quick command (< 20s).
- **After every plan wave:** Run `pnpm -r test:run` (full Vitest, < 2 min).
- **Before `/gsd:verify-work`:** Full suite must be green (Vitest + Playwright desktop + mobile).
- **Max feedback latency:** 20 s per commit, 120 s per wave.

---

## Per-Task Verification Map

Planner fills this in during Plan 11-01 / 11-02 / 11-03 task breakdown. Reference source-of-truth: `11-RESEARCH.md §Validation Architecture` REQ → test map.

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | 11-01 | 0 | Wave-0 stubs | unit | `pnpm -r test:run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Per Phase 4/6/7/10 TDD-stub precedent — author `it.todo('...')` stubs BEFORE any implementation.

**Plan 11-01 (Teacher scope):**
- [ ] `packages/shared/tests/validation/teacher.test.ts` — Zod schema invariants
- [ ] `packages/shared/tests/validation/availability.test.ts` — rule schema + range invariants
- [ ] `packages/shared/tests/validation/teaching-reduction.test.ts` — reduction DTO invariants
- [ ] `packages/shared/tests/werteinheiten.test.ts` — pure util re-export, FE/BE identical
- [ ] `apps/web/src/components/admin/teacher/StammdatenTab.test.tsx`
- [ ] `apps/web/src/components/admin/teacher/LehrverpflichtungTab.test.tsx` (live-computed WE total)
- [ ] `apps/web/src/components/admin/teacher/VerfuegbarkeitsGrid.test.tsx` (toggle + keyboard)
- [ ] `apps/web/src/components/admin/teacher/ErmaessigungenList.test.tsx`
- [ ] `apps/web/src/components/admin/teacher/KeycloakLinkDialog.test.tsx`
- [ ] Extend `apps/api/src/modules/teacher/teacher.service.spec.ts` — Orphan-Guard describe

**Plan 11-02 (Subject scope, post-descope):**
- [ ] `packages/shared/tests/validation/subject.test.ts` — Zod schema invariants (Name + Kürzel only, no color/Schultyp)
- [ ] `apps/web/src/components/admin/subject/SubjectFormDialog.test.tsx` (Name + Kürzel fields, Kürzel uppercase-transform)
- [ ] `apps/web/src/components/admin/subject/StundentafelVorlagenSection.test.tsx` (read-only per-Schultyp render)
- [ ] Extend `apps/api/src/modules/subject/subject.service.spec.ts` — Orphan-Guard describe

**Plan 11-03 (E2E scope):**
- [ ] `apps/web/e2e/admin-teachers-crud.spec.ts` (desktop happy)
- [ ] `apps/web/e2e/admin-teachers-crud.error.spec.ts` (desktop error — Orphan 409 + validation)
- [ ] `apps/web/e2e/admin-teachers-crud.mobile.spec.ts` (mobile-375 happy)
- [ ] `apps/web/e2e/admin-teachers-werteinheiten.spec.ts` (WE live-compute + grid + Ermäßigungen + Keycloak)
- [ ] `apps/web/e2e/admin-subjects-crud.spec.ts` (desktop happy)
- [ ] `apps/web/e2e/admin-subjects-crud.error.spec.ts` (desktop error — Orphan 409 + Kürzel dupe)
- [ ] `apps/web/e2e/admin-subjects-crud.mobile.spec.ts` (mobile-375 happy)
- [ ] `apps/web/e2e/admin-subjects-stundentafel.spec.ts` (Stundentafel-Vorlagen section per Schultyp)

**Framework install:** None — Vitest 4.x and Playwright 1.x already configured in all target packages.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Visual fidelity of availability grid at 375px / day-picker fallback legibility | TEACHER-04 | Visual-regression not in Phase 11 scope (per UI-SPEC §9) | Open Chrome DevTools 375×812 viewport, navigate to `/admin/teachers/:id` Verfügbarkeit tab, verify day-picker Select renders and period list is tappable with 44px targets |
| Mobile WebKit Bus-Error-10 workaround confirmation | N/A | Environmental (Phase 10.5-02 precedent — frozen macOS 14.3 WebKit build) | Chromium-375 emulation acts as N/A coverage per 10.4-03 precedent |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references above
- [ ] No watch-mode flags
- [ ] Feedback latency < 20 s per task, < 120 s per wave
- [ ] `nyquist_compliant: true` set in frontmatter after Wave 0 complete

**Approval:** pending
