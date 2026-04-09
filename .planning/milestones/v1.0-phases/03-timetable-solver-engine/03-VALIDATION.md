---
phase: 3
slug: timetable-solver-engine
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.x (NestJS API tests) + JUnit 5 / Quarkus @QuarkusTest (JVM sidecar) |
| **Config file** | `apps/api/vitest.config.ts` (NestJS), `solver/pom.xml` (Quarkus sidecar) |
| **Quick run command** | `pnpm --filter api test -- --run` + `cd solver && ./mvnw test -q` |
| **Full suite command** | `pnpm turbo test` + `cd solver && ./mvnw verify` |
| **Estimated runtime** | ~30 seconds (NestJS) + ~45 seconds (JVM sidecar with solver warm-up) |

---

## Sampling Rate

- **After every task commit:** Run `pnpm --filter api test -- --run`
- **After every plan wave:** Run `pnpm turbo test` + `cd solver && ./mvnw verify`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 75 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | ROOM-01 | unit | `pnpm --filter api test -- --run` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 1 | TIME-01 | integration | `cd solver && ./mvnw test -q` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 2 | TIME-02 | unit | `cd solver && ./mvnw test -q` | ❌ W0 | ⬜ pending |
| 03-04-01 | 04 | 2 | TIME-04, TIME-05 | unit | `cd solver && ./mvnw test -q` | ❌ W0 | ⬜ pending |
| 03-05-01 | 05 | 3 | TIME-03 | unit+integration | `cd solver && ./mvnw test -q` | ❌ W0 | ⬜ pending |
| 03-06-01 | 06 | 3 | TIME-01 | integration | `pnpm --filter api test -- --run` | ❌ W0 | ⬜ pending |
| 03-07-01 | 07 | 4 | TIME-06 | integration | `pnpm --filter api test -- --run` | ❌ W0 | ⬜ pending |
| 03-08-01 | 08 | 4 | TIME-07 | integration | `pnpm --filter api test -- --run` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `solver/` — Quarkus project scaffolding with Timefold dependency, JUnit 5 test harness
- [ ] `solver/src/test/java/.../SolverTest.java` — basic solver feasibility test stub
- [ ] `apps/api/src/modules/room/__tests__/` — Room CRUD unit test stubs
- [ ] `apps/api/src/modules/timetable/__tests__/` — Timetable module integration test stubs
- [ ] `apps/api/src/modules/solver/__tests__/` — Solver orchestration test stubs

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| WebSocket progress dashboard renders correctly | TIME-06 | Real-time UI rendering not testable in unit tests | Connect WS client, trigger solve, verify score/violation messages arrive |
| Docker Compose sidecar starts and connects | ROOM-02 | Requires full Docker stack | Run `docker compose up solver`, verify health endpoint responds |
| Solver terminates early on manual stop | TIME-06 | Requires real-time user interaction | Start solve, click stop, verify best-so-far result returned |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 75s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
