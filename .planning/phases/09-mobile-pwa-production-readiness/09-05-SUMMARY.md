---
phase: 09-mobile-pwa-production-readiness
plan: 05
subsystem: infra
tags: [docker, docker-compose, postgres, redis, keycloak, nginx, pnpm, nestjs, healthcheck, backup, restore, vapid, pwa, deploy]

requires:
  - phase: 01-foundation
    provides: PrismaService, ConfigService, @Public decorator, JwtAuthGuard
  - phase: 09-mobile-pwa-production-readiness (Plan 03)
    provides: VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env vars, PushSubscription model
provides:
  - GET /health (pure liveness) + GET /health/ready (DB/Redis/Keycloak probe) with 200/503 semantics
  - Backup script (pg_dump + Redis BGSAVE + uploads tarball) with manifest-based integrity verification
  - Restore script with --latest and --file modes, Redis restart, manifest row-count comparison
  - Multi-stage Dockerfile.api (node:24-alpine -> pruned runtime with tini and non-root user)
  - Multi-stage Dockerfile.web (node build -> nginx:alpine runtime with SPA fallback and API/socket.io proxy)
  - Production docker-compose.prod.yml override with resource limits, restart policies, health checks
  - Dev docker-compose.yml now has Keycloak healthcheck
  - .env.example covering POSTGRES, KEYCLOAK, VAPID, and backup vars
affects: [milestone deployment, operations runbook, CI/CD, future Kubernetes migration]

tech-stack:
  added:
    - tini (PID 1 signal supervisor in API runtime image)
    - nginx:alpine (static + reverse proxy for web)
  patterns:
    - "Readiness vs liveness split: /health is Docker HEALTHCHECK target, /health/ready is orchestrator gate"
    - "Dedicated ioredis client per consumer (health vs BullMQ) with lazyConnect + maxRetriesPerRequest=1 for fast failure"
    - "Multi-stage pnpm monorepo Docker build: copy lockfile -> install -> copy source -> prisma generate -> build -> pnpm deploy --prod"
    - "Backup manifest pattern: JSON with expected table row counts, compared post-restore for integrity verification"
    - "Docker Compose override file for production tuning (build, restart, deploy.resources, healthcheck) without duplicating volumes/networks"
    - "nginx SPA fallback + explicit no-cache for sw.js / manifest.webmanifest to keep PWA service worker updates snappy"

key-files:
  created:
    - docker/scripts/backup.sh
    - docker/scripts/restore.sh
    - docker/Dockerfile.api
    - docker/Dockerfile.web
    - docker/nginx.conf
    - docker/docker-compose.prod.yml
    - docker/.env.example
  modified:
    - apps/api/src/modules/health/health.controller.ts
    - apps/api/src/modules/health/health.controller.spec.ts
    - apps/api/src/modules/health/health.module.ts
    - apps/api/test/app.e2e-spec.ts
    - docker/docker-compose.yml

key-decisions:
  - "Dedicated ioredis client in HealthController (lazyConnect + maxRetriesPerRequest=1 + enableOfflineQueue=false) so /ready fails fast instead of hanging while BullMQ retries"
  - "FastifyLikeReply inline interface instead of importing from fastify (Phase 01 strict pnpm hoisting convention, matches ProblemDetailFilter)"
  - "Backup script precheck via `docker compose ps postgres --format '{{.State}}' | grep -q running` (Pitfall 5) -- cron-safe, silent failures prevented"
  - "Backup manifest as hand-rolled JSON (no jq dependency) with 10 key tables tracked for integrity verification post-restore"
  - "Restore script supports --latest (auto-detect newest postgres_*.sql.gz) in addition to explicit --file, for unattended recovery"
  - "Dockerfile.api uses pnpm deploy --prod for pruning with fallback to pnpm install --prod if deploy is unavailable"
  - "Dockerfile.web nginx conf mounts via COPY docker/nginx.conf (not a volume) so the image is self-contained"
  - "docker-compose.prod.yml keeps volumes/networks inherited from dev compose -- override only the services that need production tuning"
  - "Keycloak healthcheck probes /realms/master on 8080 (always available) instead of /health/ready (requires management interface config)"
  - "e2e test uses a local PrismaStubModule (@Global) instead of overrideProvider -- overrideProvider requires the provider to already exist in the module tree"
  - "Nginx sw.js / manifest.webmanifest / workbox-*.js are explicitly served with Cache-Control: no-cache to keep Phase 09 PWA updates snappy"
  - "Dockerfile.api runs as unprivileged built-in `node` user with tini as PID 1 for signal-safe shutdown under docker stop"

patterns-established:
  - "Liveness vs readiness split at the controller level (Pattern 3 from 09-RESEARCH)"
  - "pnpm monorepo multi-stage Docker build with Prisma generate step (Pattern 4 from 09-RESEARCH)"
  - "Manifest-driven backup integrity verification"

requirements-completed: [DEPLOY-02, DEPLOY-03]

duration: 8min
completed: 2026-04-09
---

# Phase 09 Plan 05: Health Checks + Backup/Restore + Production Docker Profile Summary

**Liveness/readiness split (GET /health vs GET /health/ready with DB/Redis/Keycloak probes), pg_dump+Redis+uploads backup/restore scripts with manifest integrity verification, and multi-stage Dockerfiles with resource-limited docker-compose.prod.yml override.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-09T10:40:26Z
- **Completed:** 2026-04-09T10:48:55Z
- **Tasks:** 2 (1 TDD feature + 1 infra batch)
- **Files created:** 7
- **Files modified:** 5

## Accomplishments

- **DEPLOY-03 readiness endpoint:** HealthController now exposes `/health/ready` that probes PostgreSQL (`$queryRaw SELECT 1`), Redis (`ioredis.ping`), and Keycloak (`fetch /realms/schoolflow`) in parallel, returning 200 with `status: "ready"` when all three are reachable and 503 with `status: "degraded"` plus a per-check boolean map when any fail. Both `/health` and `/health/ready` carry `@Public()` to bypass the global `JwtAuthGuard` (Pitfall 6).
- **DEPLOY-02 backup script:** `docker/scripts/backup.sh` dumps PostgreSQL (gzipped), snapshots Redis via `BGSAVE`, archives optional uploads, and writes `manifest_<ts>.json` containing row counts for 10 key tables (schools, persons, teachers, students, school_classes, subjects, rooms, notifications, class_book_entries, substitutions). Supports `--dry-run`, respects `BACKUP_DIR` / `RETAIN_DAYS` / `UPLOAD_DIR` env vars, and prechecks that the postgres container is running before touching `docker compose exec` (Pitfall 5). Retention pruning via `find -mtime +$RETAIN_DAYS -delete` for all backup file types.
- **DEPLOY-02 restore script:** `docker/scripts/restore.sh` accepts `--file <prefix>` or `--latest`, restores PG via `gunzip | psql`, copies the RDB snapshot back and restarts Redis to load it, extracts the uploads tarball, then compares live row counts against the manifest. Exits 3 on any divergence.
- **DEPLOY-03 production images:** `Dockerfile.api` and `Dockerfile.web` are multi-stage builds with pnpm corepack activation, workspace-aware dependency install, Prisma generate, and pruned runtime images. API runs as unprivileged `node` user under tini; web serves via `nginx:alpine` with SPA fallback and reverse proxy for `/api/*` and `/socket.io/*`.
- **DEPLOY-03 production compose profile:** `docker-compose.prod.yml` overrides the dev compose with `build:` directives, `restart: unless-stopped`, per-service `deploy.resources.limits` + `reservations`, and Docker healthchecks targeting the new liveness endpoint. Zero-downtime rolling update procedure (docker-rollout + manual blue/green) documented in the file header.

## Task Commits

Each task was committed atomically:

1. **Task 1 (TDD RED): failing health tests** — `e070be6` (test)
2. **Task 1 (TDD GREEN): extend health controller with /ready** — `b87ec81` (feat)
3. **Task 2: production Docker profile + backup/restore scripts** — `fe387fc` (feat)

_TDD REFACTOR was skipped — implementation was already minimal and clean._

## Files Created/Modified

**Created:**

- `docker/scripts/backup.sh` — pg_dump + Redis BGSAVE + uploads tarball with manifest and retention
- `docker/scripts/restore.sh` — gunzip+psql, Redis restart, tar extract, manifest comparison
- `docker/Dockerfile.api` — multi-stage node:24-alpine API build with prisma generate, tini, non-root user
- `docker/Dockerfile.web` — multi-stage build with nginx:alpine runtime and SPA fallback
- `docker/nginx.conf` — SPA fallback, API/socket.io reverse proxy, immutable asset cache, no-cache for SW/manifest
- `docker/docker-compose.prod.yml` — production override with build, restart, resource limits, healthchecks
- `docker/.env.example` — POSTGRES / KEYCLOAK / VAPID / backup env vars with generation instructions

**Modified:**

- `apps/api/src/modules/health/health.controller.ts` — dedicated ioredis client, /ready endpoint with 200/503 branching
- `apps/api/src/modules/health/health.controller.spec.ts` — vi.hoisted ioredis class mock + global fetch mock + reflector @Public() assertion
- `apps/api/src/modules/health/health.module.ts` — docblock noting global PrismaModule / ConfigModule dependencies
- `apps/api/test/app.e2e-spec.ts` — local PrismaStubModule (@Global) so HealthController DI resolves without live PG
- `docker/docker-compose.yml` — Keycloak healthcheck probing /realms/master

## Decisions Made

See frontmatter `key-decisions` for the full list. Notable highlights:

- **Dedicated ioredis client for health checks** so /ready fails fast (lazyConnect + maxRetriesPerRequest=1 + enableOfflineQueue=false) instead of getting trapped in BullMQ's reconnect loop.
- **FastifyLikeReply inline interface** instead of importing from `fastify` directly, matching the Phase 01 `ProblemDetailFilter` convention under pnpm strict hoisting.
- **Manifest-driven backup integrity verification** as hand-rolled JSON without a jq dependency — simpler to parse in a restore script that must run on minimal shell environments.
- **Restore script supports `--latest`** so cron-triggered disaster recovery does not need the timestamp to be known upfront.
- **Keycloak healthcheck probes `/realms/master`** (always available on 8080) rather than `/health/ready` (requires `KC_HEALTH_ENABLED=true` + management interface exposure), keeping the dev compose file minimal.
- **Nginx explicit no-cache for SW/manifest/workbox** so Phase 09 PWA updates propagate immediately when users reopen the app — complements the Phase 09-01 `navigateFallbackDenylist /api/*` decision.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] e2e test had no PrismaService in DI graph**

- **Found during:** Task 1 (GREEN phase)
- **Issue:** `apps/api/test/app.e2e-spec.ts` built a minimal TestingModule containing only `ConfigModule.forRoot({ isGlobal: true })` and `HealthModule`. Adding `PrismaService` as a HealthController constructor dependency broke DI: `Nest can't resolve dependencies of the HealthController (?, ConfigService). PrismaService at index [0] is not available in the HealthModule module.`
- **Fix:** Added a local `PrismaStubModule` decorated with `@Global()` that provides a stub `PrismaService` with a minimal `$queryRaw` / lifecycle API, then imported it into the e2e TestingModule. `.overrideProvider()` was tried first but requires the provider to already exist in the module tree.
- **Files modified:** apps/api/test/app.e2e-spec.ts
- **Verification:** `pnpm vitest run test/app.e2e-spec.ts` → 1 passed. Full API suite: 413 passed, 0 failed.
- **Committed in:** b87ec81 (GREEN phase commit)

**2. [Rule 1 - Bug] ioredis spec mock was not constructable**

- **Found during:** Task 1 (GREEN phase)
- **Issue:** First-pass `vi.hoisted` mock used `vi.fn(() => ({ ping, quit, on }))` as the Redis constructor, which fails `new Redis(...)` with `TypeError: ... is not a constructor` because arrow-function-wrapped `vi.fn()` is not a proper constructor target.
- **Fix:** Switched to a `class RedisCtor` with instance fields wired to the hoisted `pingFn` / `quitFn` / `onFn`, keeping the shared-mock pattern for per-test overrides.
- **Files modified:** apps/api/src/modules/health/health.controller.spec.ts
- **Verification:** All 7 spec tests pass.
- **Committed in:** b87ec81 (GREEN phase commit)

---

**Total deviations:** 2 auto-fixed (1 blocking, 1 bug)
**Impact on plan:** Both fixes were required for the GREEN phase to run. No scope creep -- both are self-contained in the test infrastructure.

## Issues Encountered

None beyond the two auto-fixed items above.

## Authentication Gates

None -- plan is purely infrastructure and backend code, no external service credentials needed at execution time.

## User Setup Required

None at execution time. **For production deployment**, operators must:

1. Copy `docker/.env.example` to `docker/.env` and fill in `POSTGRES_PASSWORD`, `KEYCLOAK_ADMIN_PASSWORD`, `KEYCLOAK_DB_PASSWORD`.
2. Run `npx web-push generate-vapid-keys --json` to generate `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` (reused from Phase 09-03).
3. Ensure the host has `/backups` (or the chosen `BACKUP_DIR`) with write permission before scheduling `backup.sh` in cron.

No `09-USER-SETUP.md` was generated because the plan has no `user_setup:` frontmatter field.

## Known Stubs

None. All new code paths are wired end-to-end:

- Health readiness checks call real `PrismaService`, `ioredis`, and `fetch` against live services.
- Backup/restore scripts operate on real `docker compose exec` commands (dry-run mode exists for unit-style validation only).
- Dockerfiles build real images; no placeholder `CMD` or empty stages.
- `nginx.conf` proxies to the real `api` service on the Docker network.

## Next Phase Readiness

- Phase 09 Plan 04 (mobile polish / deferred items) is still outstanding. **Execute 09-04 before calling Phase 09 complete.**
- With this plan landed, an operator can now build and deploy the production stack end-to-end:
  `docker compose -f docker/docker-compose.yml -f docker/docker-compose.prod.yml up -d`
- Rolling updates per D-10 documented inline; Socket.IO clients reconnect automatically across the brief cutover gap (Pitfall 8).
- `DEPLOY-02` and `DEPLOY-03` are satisfied by this plan. Phase 09 close-out should mark both as complete in `REQUIREMENTS.md`.

## Self-Check: PASSED

All 8 created files present on disk. All 5 modified files present. All 3 task commits (`e070be6`, `b87ec81`, `fe387fc`) found in git log. Health controller tests: 7/7 passing. Full API suite: 413 passing, 0 failing. Production docker-compose config validates (`docker compose ... config --quiet` exit 0). Backup and restore scripts pass `bash -n` syntax check and execute correctly in `--dry-run` mode.

---

*Phase: 09-mobile-pwa-production-readiness*
*Plan: 05*
*Completed: 2026-04-09*
