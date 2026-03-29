---
phase: 2
slug: school-data-model-dsgvo
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-29
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x |
| **Config file** | `apps/api/vitest.config.ts` |
| **Quick run command** | `pnpm --filter @schoolflow/api test -- --run` |
| **Full suite command** | `pnpm --filter @schoolflow/api test -- --run --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter @schoolflow/api test -- --run`
- **After every plan wave:** Run `pnpm --filter @schoolflow/api test -- --run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 02-01-01 | 01 | 1 | FOUND-02 | unit | `pnpm --filter @schoolflow/api test -- --run -t "Teacher"` | ❌ W0 | ⬜ pending |
| 02-01-02 | 01 | 1 | FOUND-03 | unit | `pnpm --filter @schoolflow/api test -- --run -t "Student"` | ❌ W0 | ⬜ pending |
| 02-02-01 | 02 | 1 | FOUND-04 | unit | `pnpm --filter @schoolflow/api test -- --run -t "Class"` | ❌ W0 | ⬜ pending |
| 02-02-02 | 02 | 1 | FOUND-05 | unit | `pnpm --filter @schoolflow/api test -- --run -t "Subject"` | ❌ W0 | ⬜ pending |
| 02-03-01 | 03 | 2 | FOUND-05 | unit | `pnpm --filter @schoolflow/api test -- --run -t "SchoolType"` | ❌ W0 | ⬜ pending |
| 02-04-01 | 04 | 2 | DSGVO-01 | unit | `pnpm --filter @schoolflow/api test -- --run -t "Consent"` | ❌ W0 | ⬜ pending |
| 02-05-01 | 05 | 3 | DSGVO-02 | unit | `pnpm --filter @schoolflow/api test -- --run -t "Encryption"` | ❌ W0 | ⬜ pending |
| 02-06-01 | 06 | 3 | DSGVO-03, DSGVO-04 | integration | `pnpm --filter @schoolflow/api test -- --run -t "DataExport"` | ❌ W0 | ⬜ pending |
| 02-07-01 | 07 | 3 | DSGVO-05, DSGVO-06 | integration | `pnpm --filter @schoolflow/api test -- --run -t "DataDeletion"` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/teacher/teacher.service.spec.ts` — stubs for FOUND-02
- [ ] `apps/api/src/modules/student/student.service.spec.ts` — stubs for FOUND-03
- [ ] `apps/api/src/modules/class/class.service.spec.ts` — stubs for FOUND-04
- [ ] `apps/api/src/modules/subject/subject.service.spec.ts` — stubs for FOUND-05
- [ ] `apps/api/src/modules/dsgvo/consent.service.spec.ts` — stubs for DSGVO-01
- [ ] `apps/api/src/modules/dsgvo/encryption.service.spec.ts` — stubs for DSGVO-02
- [ ] `apps/api/src/modules/dsgvo/data-export.service.spec.ts` — stubs for DSGVO-03, DSGVO-04
- [ ] `apps/api/src/modules/dsgvo/data-deletion.service.spec.ts` — stubs for DSGVO-05, DSGVO-06
- [ ] `apps/api/src/test/prisma-mock.helper.ts` — shared Prisma mock fixtures

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| DSGVO data export contains all personal data fields | DSGVO-03 | Requires real database with test data to verify completeness | Seed test user, trigger export, verify JSON contains all expected fields |
| Anonymization prevents re-identification | DSGVO-05 | Statistical verification of anonymization quality | Review anonymized records manually, verify no PII remains |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
