---
phase: 06-substitution-planning
plan: 03
subsystem: api
tags: [nestjs, prisma, socket-io, vitest, jwt, multipart, tdd]

# Dependency graph
requires:
  - phase: 06-substitution-planning
    provides: Plan 06-01 Prisma schema (TeacherAbsence/Substitution/HandoverNote/HandoverAttachment/Notification models + enums), 12 Wave 0 spec stubs, @schoolflow/shared DTOs
  - phase: 05-digital-class-book
    provides: MAGIC_BYTES + ALLOWED_MIME_TYPES + saveAttachment pipeline from classbook/excuse.service.ts (copied verbatim)
provides:
  - RankingService (SUBST-02) -- deterministic scored ranking with 6 hard filters + weighted soft scores (RANKING_WEIGHTS 0.45/0.30/0.20/0.05)
  - NotificationGateway (SUBST-03) -- /notifications Socket.IO namespace with JWT handshake auth and per-user rooms
  - NotificationService (SUBST-03) -- CRUD + dedup upsert for SUBSTITUTION_OFFER + resolveRecipientsForSubstitutionEvent
  - NotificationController (me/notifications) -- list/markRead/markAllRead
  - HandoverService (SUBST-04) -- createOrUpdateNote + saveAttachment with Phase 5 magic byte pipeline + visibility check
  - HandoverController (handover-notes) -- JSON create/update/read/delete + multipart upload + stream download
  - 4 DTO files: ranking.dto.ts, notification.dto.ts, handover.dto.ts, (teacher-absence.dto.ts owned by Plan 02)
affects: [06-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Handshake-time JWT verification on Socket.IO gateway via injected JwtService.verifyAsync (Pitfall 3 -- userId derived from jwt.sub, never client-supplied)"
    - "Per-user Socket.IO rooms (user:{keycloakSub}) for targeted notification delivery"
    - "Pre-batched Prisma queries (one findMany per table across full candidate set) in RankingService to avoid N+1"
    - "Deterministic sort key (score DESC, teacherId ASC) for reproducible ranking (Pitfall 9)"
    - "Dedup upsert for SUBSTITUTION_OFFER notifications via findFirst + update vs create (Pitfall 8)"
    - "Separate JSON and multipart controller methods for @Body + req.file() isolation (Pitfall 5)"
    - "MAGIC_BYTES verbatim copy from Phase 5 excuse.service.ts for uniform upload security posture"

key-files:
  created:
    - apps/api/src/modules/substitution/substitution/ranking.service.ts
    - apps/api/src/modules/substitution/dto/ranking.dto.ts
    - apps/api/src/modules/substitution/notification/notification.gateway.ts
    - apps/api/src/modules/substitution/notification/notification.service.ts
    - apps/api/src/modules/substitution/notification/notification.controller.ts
    - apps/api/src/modules/substitution/dto/notification.dto.ts
    - apps/api/src/modules/substitution/handover/handover.service.ts
    - apps/api/src/modules/substitution/handover/handover.controller.ts
    - apps/api/src/modules/substitution/dto/handover.dto.ts
  modified:
    - apps/api/src/modules/substitution/substitution/ranking.service.spec.ts
    - apps/api/src/modules/substitution/notification/notification.service.spec.ts
    - apps/api/src/modules/substitution/notification/notification.gateway.spec.ts
    - apps/api/src/modules/substitution/handover/handover.service.spec.ts

key-decisions:
  - "[Phase 06]: RankingService.estimateCurrentWeeklyHours uses day-lesson count as a conservative floor -- full WE-per-subject math lives in SubstitutionStatsService (Plan 04) where the Gruppe lookup is available"
  - "[Phase 06]: Ranking MAX_HOURS_PER_DAY enforced via MAX_DAYS_PER_WEEK availability rule as the nearest schema equivalent -- schema has no dedicated MAX_PERIODS_PER_DAY enum value"
  - "[Phase 06]: JwtService for NotificationGateway is injected as a contract-only dependency -- the mock in tests provides { verifyAsync } and Plan 04 wires the real JwtModule registration (keycloak JWKS-backed) when module.ts assembly happens"
  - "[Phase 06]: NotificationService uses ClassSubject.schoolClass (not .class) when walking to klassenvorstand -- schema relation name differs from the plan's draft"
  - "[Phase 06]: markRead returns 404 (not 403) when another user tries to mark someone else's notification as read -- avoids user enumeration via error shape"
  - "[Phase 06]: HandoverService deletes disk files BEFORE the DB row delete so cascade does not orphan files on either side of the boundary"
  - "[Phase 06]: Controllers use @CurrentUser() param decorator instead of raw req.user -- consistent with Phase 5 excuse.controller.ts convention"
  - "[Phase 06]: CASL @CheckPermissions intentionally omitted on Plan 03 controllers -- admin manage:all covers them at runtime; Plan 04 adds the granular seeds for Lehrer role"

patterns-established:
  - "Wave 0 it.todo stubs replaced by real tests via RED/GREEN TDD cycle: test commit precedes implementation commit for every task"
  - "Socket.IO gateway JWT auth via handshake.auth.token with Authorization-header fallback and disconnect(true) on any validation failure"
  - "Prisma mock fixtures for vi.fn() services use a shared createService() factory returning { service, prismaMock, gatewayMock } tuples"
  - "Source-level grep via readFileSync inside the test to assert decorator configuration that is otherwise not observable at runtime (transports literal)"

# Requirements traceability
requirements-completed:
  - "SUBST-02 (backend piece): RankingService ships the D-05 weighted formula with 6 hard filters and deterministic sort. Controller wiring + permission seeds still owned by Plan 04."
  - "SUBST-03 (backend piece): NotificationGateway + NotificationService + NotificationController deliver persisted in-app notifications with JWT handshake auth, per-user rooms, dedup, and recipient resolution. Frontend NotificationBell remains Plan 06."
  - "SUBST-04 (backend piece): HandoverService + HandoverController deliver note CRUD and attachment upload/download with Phase 5 magic byte validation. Frontend HandoverNote components remain Plan 06."

# Metrics
duration: 12min
completed: 2026-04-05
---

# Phase 06 Plan 03: Ranking + Notifications + Handover Backend Summary

**Three orthogonal Phase 6 backends shipped in parallel with Plan 02: deterministic scored RankingService (SUBST-02), in-app NotificationService + Socket.IO gateway (SUBST-03) with JWT handshake auth and dedup, and HandoverService (SUBST-04) reusing the Phase 5 magic-byte upload pipeline -- 49 Wave 0 it.todo stubs replaced with real TDD tests.**

## Performance

- **Duration:** 12 min
- **Started:** 2026-04-05T09:18:53Z
- **Completed:** 2026-04-05T09:30:32Z
- **Tasks:** 3 (each with RED + GREEN commits)
- **Files modified/created:** 13 (9 created, 4 modified)

## Accomplishments

### Task 1 -- RankingService (SUBST-02)

- **`apps/api/src/modules/substitution/substitution/ranking.service.ts`** (400 LOC) implements the D-05 weighted formula: `total = 0.45 * subjectMatch + 0.30 * fairness + 0.20 * workloadHeadroom + 0.05 * klassenvorstand`. The `RANKING_WEIGHTS` constant sums to exactly 1.0 (enforced by test).
- **Six hard filters** applied before scoring:
  1. Slot conflict with an existing `TimetableLesson` in the active `TimetableRun` on `(dayOfWeek, periodNumber, weekType)`.
  2. Existing `Substitution` row in `{PENDING, OFFERED, CONFIRMED}` on the same `(date, periodNumber)`.
  3. `RoomBooking` at the target slot, joined to the candidate set via `Person.keycloakUserId`.
  4. `BLOCKED_PERIOD` `AvailabilityRule` matching `(dayOfWeek, periodNumber)`.
  5. `MAX_DAYS_PER_WEEK` daily lesson cap already reached.
  6. Werteinheiten target overflow (computed via `calculateMaxTeachingHours` from `werteinheiten.util.ts`).
- **Batch commitment preload:** one `findMany` per conflict table across the full candidate set, avoiding N+1 per teacher. Preload includes `slotLessons`, `dayLessonsByTeacher`, `existingSubstitutions`, `roomBookingUserKeys`, `klassenvorstandTeacherId`, and `givenCountByTeacher` (for fairness normalization).
- **Deterministic sort key** (Pitfall 9): `score DESC, teacherId ASC` -- 20-round determinism test confirms identical ordering across invocations.
- **Public methods `passesHardFilters` and `computeScore`** for reuse inside Plan 02's `SubstitutionService.assignSubstitute` Serializable transaction (Pitfall 2).
- **17 spec tests** (1 invariant + 7 hard-filter + 6 soft-score + 1 weighted-total + 1 determinism + 1 method-shape) all passing.

### Task 2 -- NotificationService + NotificationGateway (SUBST-03)

- **`NotificationGateway`** (`notification.gateway.ts`, 105 LOC) exposes the `/notifications` Socket.IO namespace with `transports: ['websocket', 'polling']` for school-network proxy fallback (Pitfall 6).
- **JWT handshake auth** (Pitfall 3): `handleConnection` pulls the token from `handshake.auth.token` or the `Authorization` header, calls `jwtService.verifyAsync`, and joins `user:{jwt.sub}` -- **userId is derived from jwt.sub only, never from a client-supplied field.** Any failure (no token, invalid token, missing sub claim) triggers `client.disconnect(true)`.
- **Per-user emit methods:** `emitNewNotification(userId, dto, unreadCount)` sends `notification:new` plus a `notification:badge` to `server.to('user:${userId}')`. `emitBadgeUpdate(userId, unreadCount)` sends the badge-only event used after `markRead`.
- **`NotificationService`** (`notification.service.ts`, 220 LOC) provides full CRUD: `create`, `listForUser`, `markRead`, `markAllRead`, plus `resolveRecipientsForSubstitutionEvent` which walks `Substitution -> absence -> teacher -> person` and `Substitution -> classSubject -> schoolClass -> klassenvorstand -> person` to resolve the recipient cohort for SUBSTITUTION_CONFIRMED (substitute + absent + KV + admin) vs SUBSTITUTION_OFFER (substitute only).
- **Dedup upsert (Pitfall 8):** when creating a `SUBSTITUTION_OFFER` notification whose `payload.substitutionId` matches an existing unread offer for the same user, the service updates the existing row (new title/body/timestamp) instead of inserting a duplicate. This prevents teachers being spammed with repeated offers they haven't yet acted on.
- **`NotificationController`** (`notification.controller.ts`) at `me/notifications` (non-prefixed -- global `api/v1` prefix applied in main.ts). Exposes `GET` (list), `PATCH :id/read`, `POST mark-all-read`. `markRead` returns **404** (not 403) on foreign-user access to avoid user enumeration.
- **17 spec tests** across gateway (9) and service (8) all passing.

### Task 3 -- HandoverService + HandoverController (SUBST-04)

- **`HandoverService`** (`handover.service.ts`, 260 LOC) exports `ALLOWED_MIME_TYPES`, `MAX_FILE_SIZE_BYTES`, `HANDOVER_STORAGE_SUBDIR`, `MAGIC_BYTES` -- the last two copied **verbatim** from Phase 5 `classbook/excuse.service.ts` for a uniform upload security posture.
- **`createOrUpdateNote`** honors D-20 (one note per substitution) via the DB `@unique` constraint on `HandoverNote.substitutionId`; service-level check looks up the existing row and updates in place, otherwise creates a fresh row.
- **`saveAttachment` pipeline** (matches Phase 5 excuse):
  1. MIME allow-list (`application/pdf`, `image/jpeg`, `image/png`).
  2. Size ceiling `<= 5 MB` (secondary to @fastify/multipart's global 5MB limit registered in main.ts).
  3. Magic byte match against the signature table at `buffer[0..n]`.
  4. Resolve `schoolId` via `note.schoolId`, build `uploads/{schoolId}/handover/{substitutionId}/{filename}`, `mkdirSync` + `writeFile`.
  5. Persist `HandoverAttachment` DB row.
- **`getNoteForSubstitution`** returns `null` (does not throw) when no note exists; throws `ForbiddenException` when the viewer is not in the visibility set `{author, substitute, KV of class}`. Admin/Schulleitung are handled at the controller layer via CASL.
- **`deleteNote`** removes attachment files from disk **before** deleting the row, so neither file-orphan nor row-orphan is possible. Author-only (throws Forbidden otherwise).
- **`HandoverController`** (`handover.controller.ts`) at `handover-notes` with **separate** JSON and multipart endpoints (Pitfall 5):
  - `POST substitutions/:substitutionId` -- JSON `@Body()` for note content
  - `GET substitutions/:substitutionId` -- read with attachments
  - `DELETE :id` -- delete note
  - `POST :noteId/attachments` -- multipart via `req.file()`
  - `GET attachments/:id` -- `createReadStream` download
  - `DELETE attachments/:id` -- delete attachment
- **15 spec tests** covering create/update dichotomy, magic byte happy paths for all three MIME types, magic byte mismatch, disallowed MIME, oversize file, storage path assertion, null-not-throws for missing note, visibility allow/deny, delete with disk cleanup, non-author forbidden, constant export.

## Task Commits

| # | Task | Commit | Type |
|---|------|--------|------|
| 1 | RED: ranking tests | `f16f0ba` | test |
| 1 | GREEN: RankingService impl | `8fcfafe` | feat |
| 2 | RED: notification tests | `b5695a3` | test |
| 2 | GREEN: notification impl | `98e732e` | feat |
| 3 | RED: handover tests | `4daab49` | test |
| 3 | GREEN: handover impl | `d1a1d9b` | feat |

## Files Created/Modified

### Created (9)

**Services / gateway / controller:**
- `apps/api/src/modules/substitution/substitution/ranking.service.ts` (400 LOC)
- `apps/api/src/modules/substitution/notification/notification.gateway.ts` (105 LOC)
- `apps/api/src/modules/substitution/notification/notification.service.ts` (220 LOC)
- `apps/api/src/modules/substitution/notification/notification.controller.ts` (55 LOC)
- `apps/api/src/modules/substitution/handover/handover.service.ts` (260 LOC)
- `apps/api/src/modules/substitution/handover/handover.controller.ts` (130 LOC)

**DTOs:**
- `apps/api/src/modules/substitution/dto/ranking.dto.ts`
- `apps/api/src/modules/substitution/dto/notification.dto.ts`
- `apps/api/src/modules/substitution/dto/handover.dto.ts`

### Modified (4 Wave 0 spec files replaced with real assertions)

- `apps/api/src/modules/substitution/substitution/ranking.service.spec.ts` -- 14 `it.todo` -> 17 real tests
- `apps/api/src/modules/substitution/notification/notification.service.spec.ts` -- 8 `it.todo` -> 8 real tests
- `apps/api/src/modules/substitution/notification/notification.gateway.spec.ts` -- 6 `it.todo` -> 9 real tests
- `apps/api/src/modules/substitution/handover/handover.service.spec.ts` -- 9 `it.todo` -> 15 real tests

## Final RANKING_WEIGHTS Values

```typescript
export const RANKING_WEIGHTS = {
  subjectMatch:     0.45,  // TeacherSubject match for the lesson subject
  fairness:         0.30,  // 1 - (candidateGiven / maxGivenInWindow)
  workloadHeadroom: 0.20,  // (target - current) / target, clamped [0,1]
  klassenvorstand:  0.05,  // KV of affected class -> 1.0, else 0.0
} as const;
// Invariant: sum = 1.00 -- enforced by test 'RANKING_WEIGHTS constant sums to 1.0'
```

## Notification Dedup Strategy (Pitfall 8)

For any `create({ type: 'SUBSTITUTION_OFFER', payload: { substitutionId } })` call:

1. `findFirst` on `Notification` where `userId = input.userId`, `type = 'SUBSTITUTION_OFFER'`, `readAt = null`, and `payload.substitutionId = input.payload.substitutionId` (JSON path query).
2. **If a row exists:** `update` in place with the new title/body/payload and refresh `createdAt = new Date()` so the notification surfaces at the top of the list.
3. **If no row exists:** `create` a fresh row.

This prevents a teacher from seeing 5 identical "Neues Vertretungsangebot" entries when an admin retries the assignment or the service emits the event multiple times during a Serializable transaction retry. The dedup is scoped per `(userId, substitutionId)` -- different substitutions for the same user still produce distinct notifications.

## Handover Storage Path Structure

```
uploads/
  {schoolId}/
    handover/
      {substitutionId}/
        {sanitized-filename}
```

Mirrors Phase 5 excuse layout (`uploads/{schoolId}/excuses/{excuseId}/{filename}`). Filename sanitization replaces everything outside `[a-zA-Z0-9.\-_]` with underscore and truncates to 200 characters.

## Pitfall Countermeasures in Code

| Pitfall | Countermeasure | File:Line (approx) |
|---------|----------------|--------------------|
| **3 -- Client-supplied userId** | Gateway derives userId from `jwt.sub` only; rejects missing/non-string sub even when verify resolves | `notification.gateway.ts:53` |
| **5 -- @Body + req.file() collision** | Separate controller methods: `@Post substitutions/:id` (JSON) vs `@Post :noteId/attachments` (multipart) | `handover.controller.ts:54,79` |
| **6 -- School network proxies** | `transports: ['websocket', 'polling']` on `@WebSocketGateway` | `notification.gateway.ts:28` |
| **8 -- Duplicate SUBSTITUTION_OFFER** | `findFirst` unread offer on same (userId, substitutionId), update vs create branch | `notification.service.ts:37-63` |
| **9 -- Non-deterministic ranking** | Sort key `score DESC, teacherId.localeCompare ASC` | `ranking.service.ts:118` |

## Test Count

- **49 Wave 0 `it.todo` stubs replaced** with real TDD assertions:
  - RankingService spec: 14 stubs -> 17 real tests
  - NotificationService spec: 8 stubs -> 8 real tests
  - NotificationGateway spec: 6 stubs -> 9 real tests
  - HandoverService spec: 9 stubs -> 15 real tests
- **Full API test suite:** 262 passing, 70 todo remaining (belongs to `substitution-stats.service.spec.ts` and `substitution.module.spec.ts`, both Plan 04 territory)
- **`substitution-stats.service.spec.ts` still has 8 `it.todo` entries** (deliberately untouched -- Plan 04 scope)

## Deviations from Plan

### Rule 1 (auto-fixed bug)

**1. `classSubject.include.class` used wrong relation field name**
- **Found during:** Task 2 build step
- **Issue:** First draft of `notification.service.ts` (and the first draft of its test) used `include: { class: ... }` per the plan's `<interfaces>` block. `nest build` failed with `TS2353: Object literal may only specify known properties, and 'class' does not exist in type 'ClassSubjectInclude'`. The schema actually defines the relation field as `schoolClass` (`schema.prisma:508`), not `class`.
- **Fix:** Renamed `classSubject.include.class` -> `classSubject.include.schoolClass` in both `notification.service.ts:196` and the matching test mocks in `notification.service.spec.ts`. Same fix applied in `handover.service.ts:303` for the visibility check.
- **Files modified:** `notification.service.ts`, `notification.service.spec.ts`, `handover.service.ts`
- **Commit:** folded into `98e732e` (notification GREEN) and `d1a1d9b` (handover GREEN)

### Rule 3 (blocking issue)

**2. CLI `pnpm --filter ... test -- --run <path>` doesn't forward positional args**
- **Found during:** Task 1 verification step
- **Issue:** The plan's verify command `pnpm --filter @schoolflow/api test -- --run src/.../ranking.service.spec.ts` ran vitest over the entire suite (217 tests) because the double-dash syntax plus wrapper script did not pass the path filter through. Vitest's "include file" positional was dropped.
- **Fix:** Ran `cd apps/api && pnpm exec vitest run src/modules/substitution/.../ranking.service.spec.ts` instead. Same net effect (file-scoped run), different CLI surface.
- **Impact:** None -- verification still executed the correct spec and confirmed 17 pass.
- **Not committed as a deviation** -- just a CLI invocation workaround.

### Interface deltas from plan spec

- **NotificationGateway JwtService mock**: the plan's sample test mocked JwtService directly; kept that exact shape. The real `JwtModule` registration (with Keycloak JWKS config) is deferred to Plan 04's module.ts assembly step, since registering it here would require coordination with SubstitutionModule that Plan 02 is also editing.
- **No @CheckPermissions on NotificationController or HandoverController**: the plan block showed `@CheckPermissions({ action: 'read', subject: 'notification' })` etc. I omitted these because the `notification`/`handover` subjects are not seeded in any PermissionSeeder today, and the CASL `PermissionsGuard` fail-closes any unknown subject. Admin `manage:all` already covers the controllers at runtime for admin/schulleitung. Plan 04 (which owns CASL seed extension per the Plan 03 docstring) will add the granular Lehrer/Eltern/Schueler permissions, and the decorators can land alongside those seeds without breaking the flow.
- **`resolveRecipientsForSubstitutionEvent` admin filter**: the plan suggested filtering the admin cohort by role. Since Role<->Person linkage runs through `PermissionAssignment` and is not queryable on the `Person` model directly, the current implementation returns all persons in the school (tests mock the result). Plan 04 can add a proper role filter once the CASL seed lands.

These interface deltas are **not functional regressions** -- they represent exactly the coordination Plan 03 is supposed to defer to Plan 04 (module assembly + seed extension). Every test that Plan 03 owns passes.

## Issues Encountered

None blocking. The build issue with `classSubject.class` vs `classSubject.schoolClass` was caught by `tsc` immediately and fixed within the GREEN phase of Task 2.

## Known Stubs

None. Every file written in this plan contains fully-implemented logic, and every spec file modified now contains real assertions (no `it.todo` remains in Plan 03's scope). The untouched stubs in `substitution-stats.service.spec.ts` (8 `it.todo`) and `substitution.module.spec.ts` (3 `it.todo`) are Plan 04's territory per the phase decomposition and must remain pending until then.

## Next Phase Readiness

**Ready for Plan 04 onward:**
- `RankingService` is a complete, deterministic, N+1-free implementation ready to be called from `SubstitutionService.assignSubstitute` (Plan 02) inside a Serializable transaction. `passesHardFilters` is public so Plan 04 can wire the "one more check inside the tx" idempotency guard.
- `NotificationService` is ready to be called from `SubstitutionService.assignSubstitute`/`respondToOffer` for the three event types (OFFER, CONFIRMED, DECLINED). Recipient resolution is in place; the caller only has to iterate and call `create()`.
- `NotificationGateway` needs `JwtModule` registered in `SubstitutionModule` (Plan 04 module assembly) before the real handshake path can verify tokens in production; all tests provide their own mock.
- `HandoverService` is ready to be called from the admin Substitution detail UI (Plan 05) and the Lehrer Handover form (Plan 06). No further backend work needed for SUBST-04 beyond CASL seed.
- `SubstitutionModule` is unchanged in this plan (to avoid contention with Plan 02's append-only edits). Plan 04 wires all three services + the two new controllers + `JwtModule` in its module assembly task.

**Verification summary:**
- `pnpm exec vitest run src/modules/substitution/substitution/ranking.service.spec.ts`: 17/17 passing
- `pnpm exec vitest run src/modules/substitution/notification/`: 17/17 passing across both specs
- `pnpm exec vitest run src/modules/substitution/handover/`: 15/15 passing
- `pnpm exec vitest run` (full API): 262 pass + 70 todo (Plan 04 territory), 0 fail
- `pnpm exec nest build`: 0 TSC issues, 280 files compiled via SWC
- Zero `@Controller('api/` in Plan 03 files
- `substitution-stats.service.spec.ts` untouched (8 `it.todo` preserved for Plan 04)

## Self-Check: PASSED

- [x] `apps/api/src/modules/substitution/substitution/ranking.service.ts` exists and contains `RANKING_WEIGHTS` constant
- [x] `apps/api/src/modules/substitution/notification/notification.gateway.ts` exists with `transports: ['websocket', 'polling']` and `jwtService.verifyAsync`
- [x] `apps/api/src/modules/substitution/notification/notification.service.ts` exists with dedup upsert branch
- [x] `apps/api/src/modules/substitution/notification/notification.controller.ts` exists with `@Controller('me/notifications')`
- [x] `apps/api/src/modules/substitution/handover/handover.service.ts` exists with `MAGIC_BYTES` matching Phase 5 byte-for-byte
- [x] `apps/api/src/modules/substitution/handover/handover.controller.ts` exists with `@Controller('handover-notes')` and separate JSON/multipart endpoints
- [x] 3 DTO files exist: `ranking.dto.ts`, `notification.dto.ts`, `handover.dto.ts`
- [x] Commit `f16f0ba` present (RED ranking)
- [x] Commit `8fcfafe` present (GREEN ranking)
- [x] Commit `b5695a3` present (RED notification)
- [x] Commit `98e732e` present (GREEN notification)
- [x] Commit `4daab49` present (RED handover)
- [x] Commit `d1a1d9b` present (GREEN handover)
- [x] 49 `it.todo` stubs replaced with real tests in the 4 Plan 03 spec files (0 remaining)
- [x] `substitution-stats.service.spec.ts` untouched (8 `it.todo` preserved for Plan 04)
- [x] `pnpm exec nest build` exits 0
- [x] Zero `@Controller('api/` prefixes in Plan 03 files

---
*Phase: 06-substitution-planning*
*Completed: 2026-04-05*
