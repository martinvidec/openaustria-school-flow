---
phase: 07
slug: communication
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-06
---

# Phase 07 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (backend + frontend) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` |
| **Quick run command** | `cd apps/api && pnpm test` |
| **Full suite command** | `pnpm test` (root — runs all workspace tests) |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 0 | COMM-* | unit stubs | `cd apps/api && pnpm test` | ❌ W0 | ⬜ pending |
| 07-02-01 | 02 | 1 | COMM-01, COMM-02 | unit | `cd apps/api && pnpm test` | ❌ W0 | ⬜ pending |
| 07-03-01 | 03 | 1 | COMM-03 | unit | `cd apps/api && pnpm test` | ❌ W0 | ⬜ pending |
| 07-04-01 | 04 | 2 | COMM-04 | unit | `cd apps/api && pnpm test` | ❌ W0 | ⬜ pending |
| 07-05-01 | 05 | 2 | COMM-06 | unit | `cd apps/api && pnpm test` | ❌ W0 | ⬜ pending |
| 07-06-01 | 06 | 3 | COMM-01-06 | integration | `cd apps/web && pnpm test` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/communication/**/*.spec.ts` — stubs for COMM-01 through COMM-06
- [ ] `apps/web/src/hooks/__tests__/useMessages.test.ts` — frontend hook stubs
- [ ] Existing test infrastructure covers framework install

*Existing Vitest infrastructure from Phases 1-6 is reused.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Real-time message delivery via Socket.IO | COMM-01/02 | Requires two browser sessions | Open two browsers, send message, verify instant delivery |
| Read receipt visual update | COMM-03 | Requires UI interaction | Send message, open as recipient, verify sender sees read status |
| File upload in message | COMM-04 | Requires multipart form interaction | Attach PDF, send, verify recipient can download |
| Absence quick-action flow | COMM-05 | Cross-module integration | Use quick-action in messaging, verify excuse created in classbook |
| Poll inline voting | COMM-06 | Requires UI interaction | Create poll, vote from different accounts, verify results |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
