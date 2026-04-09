---
phase: 09
slug: mobile-pwa-production-readiness
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-09
---

# Phase 09 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (backend + frontend) |
| **Config file** | `apps/api/vitest.config.ts`, `apps/web/vitest.config.ts` |
| **Quick run command** | `cd apps/api && pnpm test` |
| **Full suite command** | `pnpm test` (root -- runs all workspace tests) |
| **Estimated runtime** | ~40 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd apps/api && pnpm test`
- **After every plan wave:** Run `pnpm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 40 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 09-01-01 | 01 | 1 | MOBILE-01 | TSC | `pnpm --filter @schoolflow/web tsc --noEmit` | new files | pending |
| 09-01-02 | 01 | 1 | MOBILE-01 | TSC | `pnpm --filter @schoolflow/web tsc --noEmit` | new files | pending |
| 09-02-01 | 02 | 2 | MOBILE-03 | TSC | `pnpm --filter @schoolflow/web tsc --noEmit` | new files | pending |
| 09-02-02 | 02 | 2 | MOBILE-03 | TSC | `pnpm --filter @schoolflow/web tsc --noEmit` | new files | pending |
| 09-03-01 | 03 | 3 | MOBILE-02 | unit | `cd apps/api && pnpm test` | W0 stubs | pending |
| 09-03-02 | 03 | 3 | MOBILE-02 | unit | `cd apps/api && pnpm test` | W0 stubs | pending |
| 09-04-01 | 04 | 4 | MOBILE-02 | TSC | `pnpm --filter @schoolflow/web tsc --noEmit` | new files | pending |
| 09-04-02 | 04 | 4 | MOBILE-02 | TSC | `pnpm --filter @schoolflow/web tsc --noEmit` | new files | pending |
| 09-05-01 | 05 | 5 | DEPLOY-02, DEPLOY-03 | bash | `bash scripts/backup.sh --dry-run` | new files | pending |
| 09-05-02 | 05 | 5 | DEPLOY-02, DEPLOY-03 | bash | `docker compose -f docker/docker-compose.prod.yml config` | new files | pending |
| 09-05-03 | 05 | 5 | ALL | manual | Human verification | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

- [ ] `apps/api/src/modules/push/**/*.spec.ts` -- stubs for MOBILE-02 push notification backend
- [ ] Existing test infrastructure covers framework install

*Existing Vitest infrastructure from Phases 1-8 is reused.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Responsive layout on mobile device | MOBILE-01 | Requires real device or DevTools emulation | Open in Chrome DevTools mobile view, test all pages |
| Push notification delivery | MOBILE-02 | Requires browser permission + real push | Grant permission, trigger event, verify notification appears |
| Offline timetable | MOBILE-03 | Requires DevTools offline mode | Load timetable, go offline, verify cached data shows |
| PWA install from browser | MOBILE-01 | Requires HTTPS or localhost | Visit app, verify install prompt appears |
| Backup/restore round-trip | DEPLOY-02 | Requires running Docker stack | Run backup, wipe DB, restore, verify data |
| Zero-downtime update | DEPLOY-03 | Requires running Docker stack | Run rolling update while making requests |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 40s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
