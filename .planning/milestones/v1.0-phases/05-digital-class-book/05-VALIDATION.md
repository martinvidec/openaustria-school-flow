---
phase: 5
slug: digital-class-book
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.x |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` |
| **Quick run command** | `pnpm --filter api test -- --run` |
| **Full suite command** | `pnpm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter api test -- --run`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 05-01-01 | 01 | 1 | BOOK-01 | unit | `pnpm --filter api test -- --run` | W0 stubs | pending |
| 05-02-01 | 02 | 1 | BOOK-02 | unit | `pnpm --filter api test -- --run` | W0 stubs | pending |
| 05-03-01 | 03 | 1 | BOOK-03 | unit | `pnpm --filter api test -- --run` | W0 stubs | pending |
| 05-04-01 | 04 | 2 | BOOK-04 | unit | `pnpm --filter api test -- --run` | W0 stubs | pending |
| 05-05-01 | 05 | 2 | BOOK-05 | unit | `pnpm --filter api test -- --run` | W0 stubs | pending |
| 05-06-01 | 06 | 3 | BOOK-06 | integration | `pnpm --filter web test -- --run` | W0 stubs | pending |
| 05-07-01 | 07 | 3 | BOOK-07 | integration | `pnpm --filter web test -- --run` | W0 stubs | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Plan 01 Task 2 creates all Wave 0 test stubs:

- [ ] `apps/api/src/modules/classbook/__tests__/attendance.service.spec.ts` — BOOK-01 attendance stubs (7 it.todo)
- [ ] `apps/api/src/modules/classbook/__tests__/grade.service.spec.ts` — BOOK-03 grade stubs (9 it.todo)
- [ ] `apps/api/src/modules/classbook/__tests__/grade-average.util.spec.ts` — grade average utility stubs (8 it.todo)
- [ ] `apps/api/src/modules/classbook/__tests__/excuse.service.spec.ts` — BOOK-06 excuse stubs (8 it.todo)
- [ ] `apps/api/src/modules/classbook/__tests__/statistics.service.spec.ts` — BOOK-05 statistics stubs (5 it.todo)
- [ ] `apps/web/src/components/classbook/__tests__/AttendanceGrid.test.tsx` — BOOK-01/BOOK-07 frontend stubs (5 it.todo)
- [ ] `apps/web/src/components/classbook/__tests__/ExcuseForm.test.tsx` — BOOK-06 frontend stubs (5 it.todo)

*Existing vitest infrastructure covers framework needs — no new install required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quick-tap attendance grid touch responsiveness | BOOK-07 | Touch interaction on real device | Open lesson page on tablet, tap attendance icons, verify cycle works |
| Responsive layout across breakpoints | BOOK-07 | Visual layout validation | Resize browser through mobile/tablet/desktop breakpoints |
| File upload with real PDF/JPG | BOOK-06 | Binary file handling | Submit excuse form with Arztbestaetigung attachment |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
