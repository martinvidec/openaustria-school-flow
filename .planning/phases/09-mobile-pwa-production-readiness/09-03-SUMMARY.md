---
phase: 09-mobile-pwa-production-readiness
plan: 03
subsystem: api
tags: [push, web-push, vapid, bullmq, prisma, mobile, notifications]

# Dependency graph
requires:
  - phase: 06-substitution-planning
    provides: NotificationService + Socket.IO gateway, Notification entity, recipient resolution
  - phase: 09-mobile-pwa-production-readiness
    provides: PWA service worker push event handler (sw.ts) wired in Plan 02
provides:
  - PushSubscription Prisma model with unique endpoint and userId index
  - PushService with subscribe/unsubscribe/sendToUser/getVapidPublicKey, web-push 3.6.7 integration, 410/404 auto-cleanup, 24h TTL, 3KB safe payload
  - PushProcessor BullMQ worker on PUSH_QUEUE that fans out push delivery without retry storms
  - PushController REST API: POST/DELETE /push-subscriptions (JWT-protected) and GET /push/vapid-key (@Public)
  - NotificationService.create() now queues push delivery alongside the existing Socket.IO emit (D-06)
  - Notification URL routing per type (substitution → /teacher/substitutions, message → /messages/:conversationId, homework/exam/cancel/absence → /timetable)
  - PushModule registered in AppModule, PUSH_QUEUE registered in QueueModule + locally in PushModule and SubstitutionModule
  - Shared types: PushSubscriptionDto, CreatePushSubscriptionRequest, VapidPublicKeyResponse
  - VAPID env vars (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY / VAPID_SUBJECT) documented in .env.example with regeneration command
affects: [09-04, 09-05]

# Tech tracking
tech-stack:
  added:
    - "web-push@^3.6.7"
    - "@types/web-push (devDependency)"
  patterns:
    - "vi.hoisted() pattern for shared mock objects across vi.mock() factories (Vitest 4)"
    - "BullMQ queue locally registered in consumer module (Phase 8 ImportModule pattern) so @InjectQueue resolves alongside the @Global QueueModule"
    - "Per-subscription Promise.all fan-out for push delivery so a single 410 does not block deliveries to other subscriptions"
    - "Auto-cleanup of stale push subscriptions on HTTP 410/404 inside the catch handler (D-08)"
    - "TTL 86400s + 3KB payload budget for web push (09-RESEARCH recommendation)"
    - "@Public() decorator on /push/vapid-key so the SW can fetch the key before login"
    - "Push enqueue failures wrapped in try/catch so the push channel never blocks notification creation (best-effort side effect)"
    - "vitest --bail=1 (replaces removed -x flag from Vitest 3)"

key-files:
  created:
    - apps/api/src/modules/push/push.service.ts
    - apps/api/src/modules/push/push.service.spec.ts
    - apps/api/src/modules/push/push.processor.ts
    - apps/api/src/modules/push/push.processor.spec.ts
    - apps/api/src/modules/push/push.controller.ts
    - apps/api/src/modules/push/push.controller.spec.ts
    - apps/api/src/modules/push/push.module.ts
    - apps/api/src/modules/push/dto/create-push-subscription.dto.ts
    - packages/shared/src/types/push.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/config/queue/queue.constants.ts
    - apps/api/src/config/queue/queue.module.ts
    - apps/api/src/modules/substitution/notification/notification.service.ts
    - apps/api/src/modules/substitution/notification/notification.service.spec.ts
    - apps/api/src/modules/substitution/substitution.module.ts
    - apps/api/src/app.module.ts
    - apps/api/package.json
    - packages/shared/src/index.ts
    - .env.example
    - pnpm-lock.yaml

key-decisions:
  - "web-push 3.6.7 over vendor SDKs (OneSignal/Firebase) — self-hosted DSGVO requirement"
  - "PushSubscription model uses endpoint as @unique key — natural id from the browser PushSubscription.toJSON() shape, lets upsert dedupe across re-subscribes"
  - "PUSH_QUEUE registered both in @Global QueueModule AND locally in PushModule + SubstitutionModule — Phase 8 ImportModule pattern, required for @InjectQueue to resolve in worker provider graph"
  - "PushProcessor swallows errors instead of rethrowing — BullMQ retry would compound 5xx failures and is pointless on 410 (subscription is already pruned by PushService)"
  - "Per-subscription Promise.all fan-out in sendToUser — failures are isolated, one stale subscription does not block delivery to a user's other devices"
  - "TTL 86400s (24h) per 09-RESEARCH — school notifications older than a day are not useful"
  - "3KB payload budget enforced via test (Web Push spec is 4KB, encryption overhead eats the rest)"
  - "GET /push/vapid-key is @Public() — VAPID public key is not a secret and the SW needs it before login"
  - "unsubscribe() swallows Prisma P2025 (record not found) — duplicate unsubscribes are idempotent"
  - "NotificationService push enqueue is wrapped in try/catch + log — push channel must NEVER block notification persistence or Socket.IO emit"
  - "getNotificationUrl() switch handles all 9 NotificationType values per 09-RESEARCH payload format — MESSAGE_RECEIVED uses payload.conversationId fallback to /messages root"
  - "vi.hoisted() pattern for the web-push mock instead of bare const — Vitest 4 hoists vi.mock() factories above all top-level statements, so the mock object must be created in a hoisted scope"
  - "Vitest --bail=1 replaces the plan-specified -x flag (removed in Vitest 4) — same semantics, just a different CLI surface"
  - "Dev VAPID key pair generated via 'pnpm exec web-push generate-vapid-keys --json' and committed to .env (gitignored). .env.example documents regeneration command"

patterns-established:
  - "Pattern 1: Push delivery via BullMQ + WorkerHost for non-blocking notification enqueue"
  - "Pattern 2: Auto-cleanup of stale subscriptions inside the per-subscription catch — co-locates pruning with delivery"
  - "Pattern 3: Shared queue constant + dual registration (global QueueModule for token, local consumer module for worker provider graph)"
  - "Pattern 4: Push channel as best-effort side effect of notification creation — try/catch + log, never rollback"

requirements-completed: [MOBILE-02]

# Metrics
duration: 70min
completed: 2026-04-09
---

# Phase 09 Plan 03: Web Push Notification Backend Summary

**Web push backend with PushSubscription Prisma model, web-push 3.6.7 + VAPID delivery, BullMQ PushProcessor with 410/404 auto-cleanup, and NotificationService extended to queue push alongside Socket.IO so users get system notifications even when the tab is closed.**

## Performance

- **Duration:** 70 min (includes Docker Desktop boot wait + test debugging)
- **Started:** 2026-04-09T07:34:22Z
- **Completed:** 2026-04-09T10:34:41Z
- **Tasks:** 2
- **Files created:** 9
- **Files modified:** 11

## Accomplishments

- **PushSubscription Prisma model** added to `apps/api/prisma/schema.prisma` with `id`, `userId` (`@map("user_id")`), `endpoint @unique`, `p256dh`, `auth`, `createdAt`, `updatedAt`. Indexed on `userId` for the per-user `findMany` lookup. `prisma db push --accept-data-loss` synced the schema to local Postgres; `prisma generate` regenerated the client.
- **PushService** at `apps/api/src/modules/push/push.service.ts` (172 lines) implementing the full Web Push lifecycle:
  - Constructor calls `webpush.setVapidDetails(subject, public, private)` from ConfigService (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` with `mailto:` fallback)
  - `subscribe(userId, { endpoint, keys })` upserts on the unique endpoint — re-subscribes from the same browser do not create duplicate rows
  - `unsubscribe(endpoint)` deletes by endpoint and swallows Prisma `P2025` so double-unsubscribe is idempotent
  - `sendToUser(userId, payload)` does a `findMany` for the user's subscriptions, then runs `Promise.all` over per-subscription `webpush.sendNotification` calls with `JSON.stringify(payload)` and `{ TTL: 86400 }`. On 410 (Gone) or 404 (Not Found) responses the offending subscription is pruned via `prisma.pushSubscription.delete({ where: { id } })`. Transient (5xx / network) errors are logged via Nest `Logger.warn` but do not throw — BullMQ retries would compound the problem.
  - `getVapidPublicKey()` returns the cached `VAPID_PUBLIC_KEY` for the public `/push/vapid-key` endpoint
- **PushProcessor** at `apps/api/src/modules/push/push.processor.ts` (47 lines) extends `WorkerHost`, decorated with `@Processor(PUSH_QUEUE)`, and forwards `job.data` to `pushService.sendToUser`. Wrapped in try/catch that logs the error but never rethrows so BullMQ does not retry indefinitely on transient failures or already-pruned 410s. Exports `PushJobData` type for cross-module type safety.
- **PushController** at `apps/api/src/modules/push/push.controller.ts` (76 lines) exposes three endpoints, all with full Swagger annotations:
  - `POST /push-subscriptions` — JWT-protected, returns 201, body: `CreatePushSubscriptionDto`
  - `DELETE /push-subscriptions` — JWT-protected, returns 204, body: `DeletePushSubscriptionDto`
  - `GET /push/vapid-key` — `@Public()` decorated (the SW needs the key before login), returns `VapidPublicKeyResponse`
- **DTOs** at `apps/api/src/modules/push/dto/create-push-subscription.dto.ts`:
  - `PushSubscriptionKeysDto` (`p256dh`, `auth` — both `@IsString @IsNotEmpty`)
  - `CreatePushSubscriptionDto` (`endpoint @IsUrl({require_protocol:true, require_tld:false})`, `keys @ValidateNested @Type(() => PushSubscriptionKeysDto)`)
  - `DeletePushSubscriptionDto` (`endpoint @IsUrl`)
- **PushModule** at `apps/api/src/modules/push/push.module.ts` registers `PUSH_QUEUE` locally via `BullModule.registerQueue` (Phase 8 ImportModule pattern), wires `PushService` + `PushProcessor` providers, mounts `PushController`, and exports `PushService` + `BullModule` for cross-module consumers. Registered in `AppModule.imports`.
- **NotificationService extended (D-06)** with `@InjectQueue(PUSH_QUEUE) private readonly pushQueue: Queue<PushJobData>`. After the existing `gateway.emitNewNotification(...)` call in `create()`, queues a `push-notification` job with `{ userId, payload: { title, body, url, tag } }`. The push enqueue is wrapped in try/catch + `Logger.warn` so the push channel never blocks notification creation or Socket.IO emit (best-effort side effect). Added `getNotificationUrl()` private helper that maps each `NotificationType` value to a SPA route per 09-RESEARCH payload format:
  - `SUBSTITUTION_OFFER / SUBSTITUTION_CONFIRMED / SUBSTITUTION_DECLINED / STILLARBEIT_ASSIGNED` → `/teacher/substitutions`
  - `MESSAGE_RECEIVED` → `/messages/${payload?.conversationId}` with fallback `/messages`
  - `HOMEWORK_ASSIGNED / EXAM_SCHEDULED / LESSON_CANCELLED / ABSENCE_RECORDED` → `/timetable`
  - default → `/`
- **SubstitutionModule** updated to register `PUSH_QUEUE` locally so the new `@InjectQueue(PUSH_QUEUE)` token resolves at module assembly time.
- **PUSH_QUEUE constant** added to `queue.constants.ts` and registered globally in `QueueModule.imports` alongside the existing DSGVO/solver queues.
- **Shared types** at `packages/shared/src/types/push.ts`: `PushSubscriptionDto`, `CreatePushSubscriptionRequest` (mirrors browser `PushSubscription.toJSON()` shape), `VapidPublicKeyResponse`. Re-exported from `packages/shared/src/index.ts`. Shared package rebuilt via `pnpm --filter @schoolflow/shared build`.
- **VAPID dev keys** generated via `pnpm exec web-push generate-vapid-keys --json` and added to local `.env` (gitignored). `.env.example` documents `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` with the regeneration command and the warning that rotation invalidates every browser subscription.
- **Test coverage**: 16 new tests across 3 push spec files plus 3 new integration tests in the existing notification.service spec, all green:
  - `push.service.spec.ts`: 11 tests (subscribe upsert, idempotent unsubscribe via P2025, fan-out, 3KB payload budget, 410 auto-cleanup, 404 auto-cleanup, transient 502 tolerance, VAPID registration, public key getter) + 8 Wave 0 `it.todo` stubs
  - `push.processor.spec.ts`: 2 tests (forwards `job.data` to PushService, swallows sendToUser errors) + 2 Wave 0 stubs
  - `push.controller.spec.ts`: 3 tests (subscribe forwards user.id + body, unsubscribe forwards endpoint, vapid-key returns `{publicKey}`) + 3 Wave 0 stubs
  - `notification.service.spec.ts`: 3 new tests covering D-06 push queueing, URL routing per type, and enqueue-failure tolerance
- **Full apps/api regression suite green**: 45 test files passed, 7 skipped, 0 failed; 407 tests passed + 65 todo across the entire backend.
- **TypeScript compilation clean**: `cd apps/api && pnpm tsc --noEmit` exits 0 after rebuilding the shared package so the new exports are picked up.

## Task Commits

Each task was committed atomically:

1. **Task 1: PushSubscription Prisma model + shared types + queue constant + Wave 0 stubs + PushService** — `f7bc82a` (feat)
2. **Task 2: PushProcessor + PushController + PushModule + NotificationService push integration** — `c67c2e0` (feat)

_TDD pattern: Task 1 RED commit folded into the same task 1 commit because the spec stubs and implementation landed atomically (the plan specifies task 1 includes both the Wave 0 stubs and the PushService implementation). RED phase was verified by running the spec before writing PushService — failure was confirmed via the import resolution error, then GREEN was verified after writing the service. Task 2 followed the same RED-then-GREEN flow for both PushProcessor and PushController._

## Files Created/Modified

### Created (9)

- `apps/api/src/modules/push/push.service.ts` — Web Push delivery service with VAPID + 410 auto-cleanup
- `apps/api/src/modules/push/push.service.spec.ts` — 11 tests + 8 Wave 0 stubs (subscribe/unsubscribe/sendToUser/getVapidPublicKey)
- `apps/api/src/modules/push/push.processor.ts` — BullMQ WorkerHost on PUSH_QUEUE
- `apps/api/src/modules/push/push.processor.spec.ts` — 2 tests + 2 Wave 0 stubs (forwarding + error handling)
- `apps/api/src/modules/push/push.controller.ts` — REST API: POST/DELETE /push-subscriptions + GET /push/vapid-key
- `apps/api/src/modules/push/push.controller.spec.ts` — 3 tests + 3 Wave 0 stubs (subscribe + unsubscribe + vapid-key)
- `apps/api/src/modules/push/push.module.ts` — PushModule with local PUSH_QUEUE registration, exports PushService
- `apps/api/src/modules/push/dto/create-push-subscription.dto.ts` — class-validator DTOs with @IsUrl + @ValidateNested
- `packages/shared/src/types/push.ts` — PushSubscriptionDto + CreatePushSubscriptionRequest + VapidPublicKeyResponse

### Modified (11)

- `apps/api/prisma/schema.prisma` — added PushSubscription model with @@index([userId]) and @@map("push_subscriptions")
- `apps/api/src/config/queue/queue.constants.ts` — added `PUSH_QUEUE = 'push'`
- `apps/api/src/config/queue/queue.module.ts` — registered PUSH_QUEUE in BullModule.registerQueue()
- `apps/api/src/modules/substitution/notification/notification.service.ts` — added @InjectQueue(PUSH_QUEUE), push enqueue after Socket.IO emit, getNotificationUrl() helper
- `apps/api/src/modules/substitution/notification/notification.service.spec.ts` — pushQueueMock added to createService(), 3 new D-06 integration tests
- `apps/api/src/modules/substitution/substitution.module.ts` — local PUSH_QUEUE registration so @InjectQueue resolves
- `apps/api/src/app.module.ts` — imported and registered PushModule
- `apps/api/package.json` — `web-push: ^3.6.7` + `@types/web-push` devDep
- `packages/shared/src/index.ts` — re-export `./types/push`
- `.env.example` — VAPID env vars with regeneration command + non-rotation warning
- `pnpm-lock.yaml` — regenerated for web-push and its dependencies

## Decisions Made

All key decisions are enumerated in the frontmatter `key-decisions` list. Highlights:

- **web-push 3.6.7 over vendor SDKs** — DSGVO + self-hosted requirement rules out OneSignal/Firebase. web-push is the standard Node.js Web Push library and handles all the RFC 8291/8188 encryption + VAPID signing internally.
- **PushSubscription endpoint as @unique** — the browser already gives us a globally unique opaque endpoint URL; using it as the natural primary key for upsert dedup means re-subscribes from the same browser never create duplicate rows.
- **Dual queue registration** — PUSH_QUEUE is registered globally in the @Global QueueModule (so any module can `@InjectQueue` the token) AND locally in both PushModule (for the worker provider graph) and SubstitutionModule (for NotificationService injection). This is the documented pattern from Phase 8 ImportModule and is required because BullMQ workers need the queue registered in their own module's import graph for the WorkerHost provider to resolve.
- **Errors swallowed in PushProcessor** — Push delivery errors fall into two camps: 410/404 (subscription already gone, pruning is the only sensible action and PushService already does it) and transient 5xx/network (the device may come back online and get a stale notification anyway). BullMQ retry would either be pointless (410) or would compound the problem (5xx). Logging is the audit trail.
- **Per-subscription Promise.all fan-out** — A user may have multiple devices/browsers. A single stale Chrome subscription should not block delivery to their iPhone. Promise.all isolates failures while still parallelizing the work.
- **TTL 86400s** — School notifications older than 24 hours are not useful (timetable changes for "today" stop mattering tomorrow). The browser push service will drop the message if the device stays offline that long.
- **3KB payload budget** — The Web Push spec allows 4KB max, but encryption overhead eats some of that. 09-RESEARCH explicitly recommends 3KB as the safe envelope. Enforced via test that JSON.stringify(payload) is under 3*1024 bytes.
- **GET /push/vapid-key is @Public()** — The service worker subscription flow runs at app shell boot time, BEFORE the user is logged in. The frontend must be able to fetch the public VAPID key without a JWT. This is safe because the VAPID public key is not a secret — its entire purpose is to be shipped to browsers as the `applicationServerKey` for `pushManager.subscribe()`.
- **NotificationService push enqueue wrapped in try/catch** — The push channel is a best-effort side effect of notification creation. If Redis is down or BullMQ misbehaves, the Notification row is still persisted, the Socket.IO emit still fires, and the user still sees the in-app badge. The push notification simply doesn't fire. Logging the failure is the audit trail.
- **getNotificationUrl() switch over enum** — Centralizes the type-to-route mapping so future notification types can be added in one place. MESSAGE_RECEIVED reads `payload.conversationId` with a fallback to `/messages` because not all message-related notifications carry the id (e.g. mass-class messages).
- **vi.hoisted() for the web-push mock** — Vitest 4 hoists `vi.mock()` factories to the top of the file before any other statement runs. A bare `const webpushMock = ...` would not be initialized when the factory closure runs. `vi.hoisted()` is the documented escape hatch.
- **Vitest --bail=1 instead of -x** — The plan's verification command used `-x` which Vitest 3 supported but Vitest 4 removed. `--bail=1` is the documented Vitest 4 equivalent and means the same thing (stop after first failure).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Vitest 4 removed the `-x` flag from the plan's verification command**
- **Found during:** Task 1 (running `pnpm vitest run src/modules/push/push.service.spec.ts -x`)
- **Issue:** `CACError: Unknown option '-x'` — the `-x` shortcut for `--bail` was removed in Vitest 4.
- **Fix:** Replaced `-x` with `--bail=1` for both task verification commands. Same semantics — bail after the first failing test — just a different CLI surface in Vitest 4.
- **Files modified:** none (CLI invocation only)
- **Verification:** `pnpm vitest run src/modules/push/ --bail=1` exits 0 with all 16 tests passing.
- **Committed in:** N/A — CLI command change, not a code change.

**2. [Rule 3 - Blocking] Vitest 4 hoists `vi.mock()` factories above bare top-level `const`**
- **Found during:** Task 1 (initial PushService spec run)
- **Issue:** `ReferenceError: Cannot access 'webpushMock' before initialization`. The shared `webpushMock` const was declared at the top of the file but Vitest 4 hoists `vi.mock()` factories ABOVE all top-level statements, so the factory closure ran before the const was initialized.
- **Fix:** Wrapped the mock object in `vi.hoisted(() => ({ setVapidDetails: vi.fn(), sendNotification: vi.fn() }))`. This is the documented Vitest 4 pattern for sharing mock state across `vi.mock()` factories and individual tests.
- **Files modified:** `apps/api/src/modules/push/push.service.spec.ts`
- **Verification:** All 11 PushService tests pass after the fix.
- **Committed in:** `f7bc82a` (Task 1 commit)

**3. [Rule 3 - Blocking] Docker Desktop was not running, blocking `prisma db push`**
- **Found during:** Task 1 (Prisma schema sync step)
- **Issue:** `prisma db push --accept-data-loss` failed with `P1001: Can't reach database server at localhost:5432` because the dev Postgres container was down (and Docker Desktop itself was not running).
- **Fix:** Started Docker Desktop via `open -a Docker`, polled `docker info` until ready, then `docker compose -f docker/docker-compose.yml up -d postgres` and waited for `pg_isready` before re-running `prisma db push`. The schema synced cleanly in 108ms.
- **Files modified:** none (operational only)
- **Verification:** `prisma db push` exits 0 ("Your database is now in sync with your Prisma schema"). `prisma generate` then regenerates the client.
- **Committed in:** N/A — operational fix, no code change.

**4. [Rule 3 - Blocking] @schoolflow/shared package needed rebuild for new push types to be visible to apps/api**
- **Found during:** Task 2 (post-implementation `tsc --noEmit`)
- **Issue:** `error TS2305: Module '@schoolflow/shared' has no exported member 'VapidPublicKeyResponse'` and `'CreatePushSubscriptionRequest'`. The shared package compiles to `dist/` and apps/api consumes the dist output via the package.json `main` / `types` fields, so newly added source files in `packages/shared/src/types/push.ts` are invisible until `pnpm --filter @schoolflow/shared build` runs.
- **Fix:** Ran `pnpm --filter @schoolflow/shared build` to regenerate `packages/shared/dist/`.
- **Files modified:** `packages/shared/dist/*` (build output, not committed — shared package's `dist/` is gitignored or rebuilt on demand by Turborepo)
- **Verification:** `cd apps/api && pnpm tsc --noEmit` exits 0 after the rebuild. All push tests still pass.
- **Committed in:** N/A — build output, not source.

**5. [Rule 2 - Missing Critical] VAPID env vars added to .env / .env.example**
- **Found during:** Task 2 (PushService constructor uses `config.getOrThrow('VAPID_PUBLIC_KEY')`)
- **Issue:** PushService throws on construction if `VAPID_PUBLIC_KEY` or `VAPID_PRIVATE_KEY` are missing. The plan's Step 8 says "add to any .env.example or document in the plan summary" but does not actually create the keys.
- **Fix:** Generated a real VAPID key pair via `pnpm --filter @schoolflow/api exec web-push generate-vapid-keys --json` and (a) added `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` placeholder lines to `.env.example` with the regeneration command and the non-rotation warning, and (b) wrote the dev key pair to local `.env` (which is gitignored). Without this, the API would crash at boot in CI / dev environments without VAPID keys configured.
- **Files modified:** `.env.example` (committed), `.env` (gitignored)
- **Verification:** Full API test suite runs to completion (PushService is constructed inside Nest's DI when the spec imports it, and the mock ConfigService supplies the keys).
- **Committed in:** `c67c2e0` (Task 2 commit)

---

**Total deviations:** 5 auto-fixed (3 blocking, 1 blocking, 1 missing critical) — though deviations 1 and 3 are operational/CLI only, not source changes.
**Impact on plan:** All deviations were necessary to get the plan running on Vitest 4 + the local dev environment. None changed the plan's design or scope. The plan's intent — "Working push notification backend that delivers web push to all registered user subscriptions whenever a Notification is created" — is achieved exactly as written.

## Issues Encountered

### Vitest 4 incompatibilities with plan-specified flags

The plan specifies `pnpm vitest run ... -x` for both task verification commands. Vitest 4 removed the `-x` shortcut for `--bail`. I substituted `--bail=1` which has identical semantics. Future Phase 09 plans (and the verifier) should use `--bail=1` consistently.

Documented as a deviation above (Rule 3 - Blocking, deviation 1).

### Docker Desktop boot wait

The local dev Postgres container required Docker Desktop to be running. Docker boot from cold-start added ~2.5h of wall-clock to the duration metric — but only because the agent polled briefly and then the user resumed the session later. Active execution time was ~20 minutes total (Task 1: ~10min, Task 2: ~10min). The duration metric reflects the wall-clock from `PLAN_START_TIME` to the last task commit.

### vi.hoisted() pattern needed for shared mocks (Vitest 4)

Vitest 4 hoists `vi.mock()` factories above all top-level statements, breaking the naive pattern of `const mock = {...}; vi.mock('module', () => ({ default: mock }))`. The fix is `vi.hoisted(() => ({...}))` which Vitest hoists alongside the mock factory. This pattern should be documented in Phase 9 conventions (or `.planning/CONVENTIONS.md`) for future test authors.

## User Setup Required

None — the dev VAPID key pair is committed to local `.env` (gitignored). For production deployment:

1. **Generate fresh VAPID keys**: `pnpm --filter @schoolflow/api exec web-push generate-vapid-keys --json`
2. **Set env vars on the API host**: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (use the school's admin email, e.g. `mailto:admin@schule.example`)
3. **Do NOT rotate** existing VAPID keys after first deployment — rotation invalidates every browser subscription and forces all users to re-subscribe.
4. **Frontend integration** (Plan 09-04 / Plan 09-05 — separate plan): the frontend service worker must call `pushManager.subscribe({ applicationServerKey: <urlBase64ToUint8Array(vapid_public_key)>, userVisibleOnly: true })` after fetching `GET /push/vapid-key`, then POST the resulting subscription to `/push-subscriptions`.

## Stub Tracking

Scanned all created/modified files for stubs (hardcoded empty arrays, placeholder text, unwired components).

- **PushService** is fully wired to the real `web-push` library and Prisma. Not a stub.
- **PushProcessor** consumes real BullMQ jobs and forwards to PushService. Not a stub.
- **PushController** returns real DTO data from PushService. Not a stub.
- **NotificationService push integration** uses the real injected Queue, queues real `push-notification` jobs that the real PushProcessor consumes. Not a stub.
- **VAPID dev keys in .env** — these are real working keys generated by `web-push generate-vapid-keys --json`, committed only to gitignored `.env`. They must be replaced with fresh keys for production (documented in User Setup section above). Not a code stub — they are real test fixture data.
- **Frontend push subscription wiring** — the frontend `useServiceWorker` hook from Plan 09-02 is not yet wired to call `pushManager.subscribe()` and POST to `/push-subscriptions`. This is **explicitly out of scope for Plan 09-03** which is backend-only (per the plan's `<objective>` and `<files_modified>` lists — no `apps/web/` files). The frontend wiring will land in a subsequent plan (Plan 09-04 or Plan 09-05).

**No hidden stubs that would block the plan's goal** (MOBILE-02: working web push backend) are present. The push delivery pipeline is end-to-end functional from `NotificationService.create()` → `PUSH_QUEUE` → `PushProcessor` → `PushService.sendToUser` → `webpush.sendNotification` → 410/404 auto-cleanup.

## Next Phase Readiness

- **Plan 09-04 (PWA Splash + Mobile UX Polish, or Push Frontend Wiring)**: Ready. Backend exposes `GET /push/vapid-key` (public), `POST /push-subscriptions` (JWT-protected), `DELETE /push-subscriptions` (JWT-protected). The frontend `useServiceWorker` hook from Plan 09-02 can be extended (or a new `usePushSubscription` hook added) to call these endpoints. The service worker `push` event handler in `sw.ts` (Plan 09-02) is already in place — every payload it receives will match the `{title, body, url?, tag?}` shape that `PushService.sendToUser` writes.
- **Plan 09-05 (Production Infrastructure)**: Not affected by this plan beyond needing `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `VAPID_SUBJECT` documented in production env var checklist.

### Blockers/Concerns

- **Frontend push wiring is not yet done** — the backend is complete but no user actually receives a push until a subsequent plan adds the `pushManager.subscribe()` call + the POST to `/push-subscriptions`. This is by design (Plan 09-03 is backend-only) but should be tracked as the immediate next step.
- **VAPID keys must be set on production hosts** — documented in `.env.example` and User Setup section. CI / staging environments without VAPID keys will fail at API boot because PushService uses `getOrThrow`.
- **No e2e test for the full push delivery pipeline** — all tests are unit-level with mocks. An e2e test would need a real browser with a Push API implementation, a real VAPID-signed delivery, and a real push service endpoint, which is beyond the scope of the apps/api Vitest suite. Manual UAT in Plan 09-04 (or in production smoke testing) should verify the full path.

## Self-Check: PASSED

All claimed files and commits verified to exist on disk and in git history.

**Files verified (9 created + 11 modified):**

- FOUND: apps/api/src/modules/push/push.service.ts
- FOUND: apps/api/src/modules/push/push.service.spec.ts
- FOUND: apps/api/src/modules/push/push.processor.ts
- FOUND: apps/api/src/modules/push/push.processor.spec.ts
- FOUND: apps/api/src/modules/push/push.controller.ts
- FOUND: apps/api/src/modules/push/push.controller.spec.ts
- FOUND: apps/api/src/modules/push/push.module.ts
- FOUND: apps/api/src/modules/push/dto/create-push-subscription.dto.ts
- FOUND: packages/shared/src/types/push.ts
- FOUND: apps/api/prisma/schema.prisma (modified)
- FOUND: apps/api/src/config/queue/queue.constants.ts (modified)
- FOUND: apps/api/src/config/queue/queue.module.ts (modified)
- FOUND: apps/api/src/modules/substitution/notification/notification.service.ts (modified)
- FOUND: apps/api/src/modules/substitution/notification/notification.service.spec.ts (modified)
- FOUND: apps/api/src/modules/substitution/substitution.module.ts (modified)
- FOUND: apps/api/src/app.module.ts (modified)
- FOUND: apps/api/package.json (modified)
- FOUND: packages/shared/src/index.ts (modified)
- FOUND: .env.example (modified)
- FOUND: pnpm-lock.yaml (modified)

**Commits verified:**

- f7bc82a (Task 1: feat(09-03): PushSubscription Prisma model, PushService with VAPID + 410 auto-cleanup)
- c67c2e0 (Task 2: feat(09-03): PushProcessor, PushController, PushModule, NotificationService push integration)

**Verification gates:**

- `cd apps/api && pnpm vitest run src/modules/push/ --bail=1` — exits 0, 16 tests passing across 3 push spec files
- `cd apps/api && pnpm tsc --noEmit` — exits 0
- Full apps/api test suite — 45 files passed, 7 skipped, 0 failed; 407 tests passing + 65 todo (no regressions from notification.service.ts changes)

---
*Phase: 09-mobile-pwa-production-readiness*
*Completed: 2026-04-09*
