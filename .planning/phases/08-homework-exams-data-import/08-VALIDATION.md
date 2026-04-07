---
phase: 08
slug: homework-exams-data-import
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-07
---

# Phase 08 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (backend + frontend) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` |
| **Quick run command** | `cd apps/api && pnpm test` |
| **Full suite command** | `pnpm test` (root — runs all workspace tests) |
| **Estimated runtime** | ~35 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 35 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 1 | HW-*, IMPORT-* | schema + stubs | `cd apps/api && pnpm test` | W0 stubs | pending |
| 08-01-02 | 01 | 1 | HW-*, IMPORT-* | unit stubs | `cd apps/api && pnpm test` | W0 stubs | pending |
| 08-02-01 | 02 | 2 | HW-01, HW-02 | unit | `cd apps/api && pnpm test` | W0 stubs | pending |
| 08-02-02 | 02 | 2 | HW-01, HW-02, HW-03 | unit | `cd apps/api && pnpm test` | W0 stubs | pending |
| 08-03-01 | 03 | 3 | IMPORT-01, IMPORT-02 | unit | `cd apps/api && pnpm test` | W0 stubs | pending |
| 08-03-02 | 03 | 3 | IMPORT-01, IMPORT-02 | unit | `cd apps/api && pnpm test` | W0 stubs | pending |
| 08-04-01 | 04 | 4 | IMPORT-03, IMPORT-04 | unit | `cd apps/api && pnpm test` | W0 stubs | pending |
| 08-04-02 | 04 | 4 | IMPORT-03, IMPORT-04 | unit | `cd apps/api && pnpm test` | W0 stubs | pending |
| 08-05-01 | 05 | 5 | HW-01, HW-02, HW-03 | TSC | `npx tsc --noEmit -p apps/web/tsconfig.json` | new files | pending |
| 08-05-02 | 05 | 5 | HW-01, HW-02 | TSC | `npx tsc --noEmit -p apps/web/tsconfig.json` | new files | pending |
| 08-06-01 | 06 | 6 | IMPORT-01, IMPORT-02 | TSC | `npx tsc --noEmit -p apps/web/tsconfig.json` | new files | pending |
| 08-06-02 | 06 | 6 | IMPORT-01-04 | manual | Human verification | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/homework/**/*.spec.ts` — stubs for HW-01 through HW-03
- [ ] `apps/api/src/modules/import/**/*.spec.ts` — stubs for IMPORT-01 through IMPORT-04
- [ ] `apps/api/src/modules/calendar/**/*.spec.ts` — stubs for IMPORT-03
- [ ] Existing test infrastructure covers framework install

*Existing Vitest infrastructure from Phases 1-7 is reused.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Homework badge on timetable cell | HW-01 | Requires rendered timetable grid | Open timetable, verify homework icon on lesson cell |
| Exam collision warning dialog | HW-02 | Requires UI interaction | Schedule two exams same day, verify warning appears |
| Untis XML import end-to-end | IMPORT-01 | Requires real Untis export file | Upload Untis XML, verify dry-run preview, commit import |
| CSV column mapping | IMPORT-02 | Requires UI interaction | Upload CSV, verify column detection, map fields |
| iCal subscription in calendar app | IMPORT-03 | Requires external calendar app | Copy URL, paste in Google Calendar, verify events appear |
| SIS API key auth | IMPORT-04 | Requires API client with API key | Create key, use in curl, verify data returned |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 35s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
