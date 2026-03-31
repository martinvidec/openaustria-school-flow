---
phase: 4
slug: timetable-viewing-editing-room-management
status: draft
nyquist_compliant: false
wave_0_complete: true
created: 2026-03-31
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.2 |
| **Config file (API)** | `apps/api/vitest.config.ts` (exists) |
| **Config file (Web)** | `apps/web/vitest.config.ts` (Wave 0 -- needs creation) |
| **Quick run command** | `pnpm --filter @schoolflow/web test && pnpm --filter @schoolflow/api test` |
| **Full suite command** | `pnpm test` (Turborepo runs all workspaces) |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @schoolflow/web test && pnpm --filter @schoolflow/api test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | VIEW-01 | component | `pnpm --filter @schoolflow/web vitest run src/components/timetable/TimetableGrid.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | VIEW-02 | component | Covered by TimetableGrid.test.tsx with class perspective prop | ❌ W0 | ⬜ pending |
| 04-01-03 | 01 | 0 | VIEW-03 | component | `pnpm --filter @schoolflow/web vitest run src/components/timetable/PerspectiveSelector.test.tsx` | ❌ W0 | ⬜ pending |
| 04-01-04 | 01 | 0 | VIEW-04 | integration | `pnpm --filter @schoolflow/web vitest run src/hooks/useSocket.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-05 | 01 | 0 | VIEW-05 | unit | `pnpm --filter @schoolflow/web vitest run src/lib/colors.test.ts` | ❌ W0 | ⬜ pending |
| 04-01-06 | 01 | 0 | TIME-08 | unit + component | `pnpm --filter @schoolflow/api vitest run src/modules/timetable/timetable.service.spec.ts -t "validateMove"` | ❌ W0 | ⬜ pending |
| 04-01-07 | 01 | 0 | VIEW-06 | unit | `pnpm --filter @schoolflow/api vitest run src/modules/timetable/timetable-export.service.spec.ts` | ❌ W0 | ⬜ pending |
| 04-01-08 | 01 | 0 | ROOM-03 | unit + API | `pnpm --filter @schoolflow/api vitest run src/modules/room/room-booking.service.spec.ts` | ❌ W0 | ⬜ pending |
| 04-01-09 | 01 | 0 | ROOM-04 | unit | `pnpm --filter @schoolflow/api vitest run src/modules/resource/resource.service.spec.ts` | ❌ W0 | ⬜ pending |
| 04-01-10 | 01 | 0 | ROOM-05 | integration | Covered by useSocket.test.ts timetable:room-swap event test | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/web/vitest.config.ts` -- Vitest config for web workspace (extends Vite config)
- [ ] `apps/web/src/test/setup.ts` -- Testing Library setup (jest-dom matchers, cleanup)
- [ ] `pnpm add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom @vitest/coverage-v8` (in apps/web)
- [ ] `apps/web/src/components/timetable/TimetableGrid.test.tsx` -- stubs for VIEW-01, VIEW-02
- [ ] `apps/web/src/components/timetable/PerspectiveSelector.test.tsx` -- stubs for VIEW-03
- [ ] `apps/web/src/hooks/useSocket.test.ts` -- stubs for VIEW-04, ROOM-05
- [ ] `apps/web/src/lib/colors.test.ts` -- stubs for VIEW-05
- [ ] `apps/api/src/modules/timetable/timetable-export.service.spec.ts` -- stubs for VIEW-06
- [ ] `apps/api/src/modules/room/room-booking.service.spec.ts` -- stubs for ROOM-03
- [ ] `apps/api/src/modules/resource/resource.service.spec.ts` -- stubs for ROOM-04

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Drag-and-drop visual feedback | TIME-08 | DnD overlay rendering requires browser context | 1. Drag a lesson cell 2. Verify overlay follows cursor 3. Verify drop target highlights valid slots 4. Verify invalid slots show red border |
| Subject color-coding visual | VIEW-05 | Color contrast and visual distinction | 1. View timetable with 5+ subjects 2. Verify each subject has distinct color 3. Verify text is readable on colored backgrounds |
| PDF export layout quality | VIEW-06 | PDF visual quality cannot be unit tested | 1. Export weekly timetable as PDF 2. Verify table alignment, fonts, and page breaks 3. Verify school name in header |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
