# Phase 6: Substitution Planning - Research

**Researched:** 2026-04-05
**Domain:** Austrian Vertretungsplanung (absence management, substitute ranking, in-app notifications, date-scoped lesson overlays, fairness statistics) on NestJS 11 + Prisma 7 + Socket.IO 4 + BullMQ 5 + React 19
**Confidence:** HIGH (decisions, stack, reuse targets all locked and verified in-repo)

## Summary

Phase 6 is almost entirely an exercise in **composition of patterns already shipped in Phases 1–5**. The tech stack is locked (NestJS 11, Prisma 7.6, Socket.IO 4.8, BullMQ 5.71, @fastify/multipart 9.4, @casl/ability 6.8, React 19, TanStack Query 5.95, shadcn/ui on Tailwind 4), every reuse target referenced in CONTEXT.md exists on disk and is in active use, and the decisions in `06-CONTEXT.md` are internally consistent, grounded in the Austrian school domain, and compatible with every prior-phase contract.

The two design moves that carry real research risk are: (1) the **overlay entity model** for Substitution on top of TimetableLesson — the view-layer join pattern in `timetable.service.ts::getView()` currently reads `changeType`, `originalTeacherSurname`, `originalRoomName` directly from scalar columns and must be rewritten to compose these from the Substitution overlay at query time, and (2) the **deterministic scored ranking algorithm** for substitute suggestions — no canonical reference implementation exists for Austrian Vertretungsplanung, so the ranking function is a bespoke weighted-score routine that the research here specifies in detail with defensible defaults. Everything else (notification center Socket.IO namespace + per-user rooms, BullMQ retention category extension, `@fastify/multipart` handover attachment upload, CASL abilities, `/timetable` gateway event reuse) is copy-and-adapt from existing code.

**Primary recommendation:** Treat Phase 6 as *four parallel sub-modules plus one cross-cutting rewrite*. Sub-modules: `absence` (TeacherAbsence CRUD + range expansion), `substitution` (overlay + ranking service + offer flow), `notification` (entity + `/notifications` gateway + bell UI), `handover` (upload/attachment reusing Phase 5 pipeline). Cross-cutting rewrite: `timetable.service.ts::getView()` must become overlay-aware. Wave 0 test stubs land first, schema migration second, ranking algorithm TDD third, then vertical slices per sub-module. Do NOT invent new infrastructure — no new queues, no new file-storage mechanism, no new WebSocket transport layer.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (verbatim from `06-CONTEXT.md` `<decisions>` block)

**Absence Recording (SUBST-01)**
- **D-01:** New `TeacherAbsence` Prisma entity -- fields: `teacherId`, `dateFrom`, `dateTo`, optional `periodFrom`/`periodTo` (for same-day partial absences), `reason`, optional `note`, `createdBy`, `status`, `createdAt`, `updatedAt`. Decouples the "why/when" from the "which lessons" so planned multi-day absences and statistics stay clean.
- **D-02:** Range-based recording -- admin picks teacher + date range (optional start/end period within the day). System auto-expands the range against the active TimetableRun and creates one pending `Substitution` row per affected lesson (respecting A/B weeks + weekly recurrence + Stundenplan holidays).
- **D-03:** Fixed Austrian reason taxonomy enum `AbsenceReason`: `KRANK`, `FORTBILDUNG`, `DIENSTREISE`, `SCHULVERANSTALTUNG`, `ARZTTERMIN`, `SONSTIGES` + optional free-text `note`. Required for DACH school reporting; enum format enables fairness / reason statistics.
- **D-04:** Three first-class lesson outcomes per affected lesson: `SUBSTITUTED` (covered by another teacher), `ENTFALL` (lesson cancelled -- free period for the class), or `STILLARBEIT` (supervised study hall -- any available teacher supervises, no subject taught). Admin explicitly picks. Entfall and Stillarbeit are not error states.

**Substitute Ranking & Offer Flow (SUBST-02, SUBST-03)**
- **D-05:** Deterministic scored ranking. Hard filters: candidate is free in that slot (no existing TimetableLesson, Substitution, or RoomBooking), not blocked by their `AvailabilityRule`s, has Werteinheiten headroom vs `werteinheitenTarget` from Phase 2. Soft factors (weighted): subject qualification match via `TeacherSubject` (highest weight), fairness (fewer substitutions received in the current window -> higher score), workload headroom (more unused Werteinheiten -> higher score), Klassenvorstand of the affected class (small bonus). Admin sees the full sorted list with a score breakdown per candidate.
- **D-06:** Admin assigns one candidate at a time. Candidate receives a notification (D-09) and can accept or decline. On decline the admin is notified and picks another candidate from the same ranked list. Matches Austrian Vertretungsplanung practice -- admin keeps authority, teacher keeps a genuine veto.
- **D-07:** No automatic timeout or auto-escalation. If a candidate does not respond, admin sees the pending state in the substitution dashboard and reassigns manually. `ENTFALL` and `STILLARBEIT` (D-04) are the explicit fallbacks if no candidate works.
- **D-08:** Per-lesson assignment. A single `TeacherAbsence` can produce different outcomes per affected lesson (Lesson 1 -> Teacher A, Lesson 2 -> Entfall, Lesson 3 -> Teacher B). The solver / ranking runs independently per lesson.

**Notification Delivery (SUBST-03)**
- **D-09:** In-app notification center via Socket.IO is the Phase 6 delivery channel. Phase 9 (MOBILE-02) later adds web-push on top of the same `Notification` entity — no refactor needed. No SMTP, no web-push, no service worker in Phase 6. A new Socket.IO namespace `/notifications` (or a sub-room of `/timetable`) pushes new notifications to connected clients in realtime; a bell icon in the app header shows unread count; unread list is persisted server-side so teachers see offers when they next log in.
- **D-10:** Generic `Notification` Prisma entity -- fields: `id`, `userId`, `type` (enum: `SUBSTITUTION_OFFER`, `SUBSTITUTION_CONFIRMED`, `SUBSTITUTION_DECLINED`, `ABSENCE_RECORDED`, `LESSON_CANCELLED`, `STILLARBEIT_ASSIGNED`, ...), `title`, `body`, `payload` (JSON, e.g., `{ substitutionId, lessonId, date }`), `readAt`, `createdAt`. Designed to be reused by Phase 7 Communication and Phase 9 Push without schema changes.
- **D-11:** Notification recipients for substitution events: (a) the offered substitute teacher, (b) the Klassenvorstand of the affected class, (c) the absent teacher, (d) admin / Schulleitung. Each event type has a defined recipient set (documented in planning).

**Lesson Mutation Model (SUBST-05)**
- **D-12:** Overlay entity `Substitution` layered on top of `TimetableLesson`. Fields: `id`, `lessonId` (FK to TimetableLesson), `absenceId` (FK to TeacherAbsence), `date` (concrete calendar date the substitution applies to -- NOT the recurring weekly slot), `type` (`SUBSTITUTED` / `ENTFALL` / `STILLARBEIT`), `substituteTeacherId?`, `originalTeacherId`, `substituteRoomId?`, `status` (`PENDING` / `OFFERED` / `CONFIRMED` / `DECLINED`), `offeredAt?`, `respondedAt?`, `createdBy`, `createdAt`, `updatedAt`. Original `TimetableLesson` row is never mutated by a substitution.
- **D-13:** View layer composes the final timetable cell per date by joining `Substitution` with `TimetableLesson` on `(lessonId, date)`. The timetable view API already returns `changeType`, `originalTeacherSurname`, `originalRoomName` — planner should populate those fields from the overlay at query time, keeping them as the wire format for the frontend ChangeIndicator component. The scalar columns on TimetableLesson become legacy placeholders after Phase 6.
- **D-14:** ClassBookEntry reuses the existing Phase 5 model. When the substitute teaches the lesson, the ClassBookEntry for that date uses the substitute's `teacherId`. A new nullable `substitutionId` FK on ClassBookEntry links back to the overlay. For `ENTFALL` no ClassBookEntry is created. For `STILLARBEIT` a ClassBookEntry is created with optional thema/lehrstoff defaulting to a "Stillarbeit" marker.

**Handover Notes (SUBST-04)**
- **D-15:** Dedicated `HandoverNote` Prisma entity (not a field on Substitution). Fields: `id`, `substitutionId` (FK, unique — one note per substitution, D-20), `authorId` (absent teacher), `content` (text), `createdAt`, `updatedAt`. Related `HandoverAttachment`: `id`, `handoverNoteId`, `filename`, `mimeType`, `sizeBytes`, `storagePath`, `createdAt`. Visible to: assigned substitute, absent teacher, Klassenvorstand of affected class, admin/Schulleitung.
- **D-16:** File attachments supported by reusing the Phase 5 `@fastify/multipart` excuse upload pipeline. Allowed MIME types / size limits mirror Phase 5 excuse attachments (PDF, JPG, PNG, max 5 MB per file). Storage layer is whatever the existing excuse upload uses — do not introduce a second storage mechanism. Phase 6 writes to the same tree under a `handover/` subdirectory.
- **D-19:** HandoverNote + HandoverAttachment retention = 1 school year (~365 days) enforced by the existing Phase 2 BullMQ retention cron (Phase 2 D-15 pattern). Admin can trigger earlier deletion via standard DSGVO deletion pathway.
- **D-20:** Exactly one `HandoverNote` per `Substitution` (unique index on `substitutionId`), with 0..N `HandoverAttachment`s.

**Fairness Statistics (SUBST-06)**
- **D-17:** Metrics tracked per teacher: (a) substitutions given (count + Werteinheiten-weighted hours, using the Phase 2 Werteinheiten factor so a Doppelstunde counts for two periods), (b) substitutions received while absent (count), (c) absolute count of Entfall and Stillarbeit outcomes for that teacher's lessons, (d) a fairness delta vs the school average for substitutions given within the selected window.
- **D-18:** Aggregation window is configurable: current week, current month, current semester, current school year, or custom date range. Default view = current semester. Stored as derived queries over the `Substitution` overlay — no denormalised statistics table in Phase 6.

**Frontend Surface**
- **D-21:** New admin page `/admin/substitutions` with three panels: (1) "Neue Abwesenheit erfassen" form, (2) "Offene Vertretungen" list with scored candidate list inline, (3) "Statistik" panel with teacher-level fairness table.
- **D-22:** Substitute teacher's personal view: new section on timetable page (or dedicated "Vertretungen" tab on the existing Lehrer sidebar) showing pending offers with Accept / Decline buttons and the HandoverNote inline. Incoming notifications deep-link here.
- **D-23:** Notification center UI: bell icon in app header (all authenticated roles), unread badge, dropdown list with last N notifications. Reuses existing shadcn/ui Popover + Badge components.
- **D-24:** Timetable cell visual change indicators from Phase 4 D-11 are the same: orange border = substitution, red border = Entfall, blue border = room change. Stillarbeit reuses the substitution visual with a "Stillarbeit" label in place of the subject. All propagation runs on the existing `/timetable` Socket.IO namespace + events (D-12 Phase 4).

### Claude's Discretion (verbatim from `<decisions>` block)

- Prisma schema design for `TeacherAbsence`, `Substitution`, `Notification`, `HandoverNote`, `HandoverAttachment` -- relations, indexes, cascade rules
- NestJS module layout (single `SubstitutionModule` vs split into `absence` + `substitution` + `notification`)
- Exact scoring weights for the ranking algorithm (D-05) -- ship with sensible researched defaults, can be tuned later
- Ranking algorithm implementation (NestJS service vs BullMQ job) -- NestJS service is fine for typical school size
- CASL ability definitions for the new entities (substitution: manage/read, absence: manage/read, notification: read/update, handover: create/read)
- Socket.IO namespace choice for notifications (new `/notifications` vs sub-event on `/timetable`)
- Notification dedup / batching strategy (e.g., if admin reassigns twice within a minute)
- BullMQ job design for HandoverNote retention (reuse Phase 2 daily cron)
- ClassBookEntry.substitutionId FK cascade behavior
- Exact UI component breakdown for `/admin/substitutions` page (form + list + stats panels)
- Responsive breakpoints for the substitute's accept/decline screen (BOOK-07 responsive principles apply)

### Deferred Ideas — OUT OF SCOPE (verbatim from `<deferred>` block)

- **Web push / VAPID / service worker / PWA** — Phase 9 (MOBILE-02). Phase 6 delivers via in-app Socket.IO notification center only.
- **Email notification fallback** — no SMTP in the stack; deferred. Best fit is Phase 7 alongside messaging email digests.
- **Cleanup of legacy `TimetableLesson.changeType` / `originalTeacherSurname` / `originalRoomName` columns** — leave in place during Phase 6 (they remain the wire format). Follow-up after Phase 6 ships.
- **Full multi-school Vertretungsplanung** — Wanderlehrer / shared teachers flagged in Phase 2 (D-04). Cross-school substitution out of scope.
- **Re-solving the timetable to fill substitutions with Timefold** — not in scope.
- **Automatic attachment virus scanning** — not introduced in Phase 6.
- **Substitute's ability to propose a swap with another teacher** — not in scope. Declines go back to admin.
- **Analytics dashboard beyond the four fairness metrics in D-17** — per-subject breakdowns, short-notice bonus, time-series charts are feature creep; defer.
- **Denormalised fairness statistics table** — not needed at school scale.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description (from REQUIREMENTS.md) | Research Support |
|----|-------------------------------------|------------------|
| **SUBST-01** | Admin kann Lehrer-Abwesenheit mit Grund und Dauer erfassen | `TeacherAbsence` Prisma entity (D-01, D-03), range-expander service (D-02). See Standard Stack → Prisma 7 schema, Architecture Patterns → "Range expansion vs active TimetableRun". |
| **SUBST-02** | System schlägt automatisch passende Vertretungen vor (Verfügbarkeit, Qualifikation, Auslastungs-Fairness) | Deterministic scored ranking (D-05). See Code Examples → "Ranking algorithm with hard filters + soft score", reuses `werteinheiten.util.ts` (in-repo), `AvailabilityRule`, `TeacherSubject`. |
| **SUBST-03** | Vertretungslehrer kann Vertretung per Push-Notification bestätigen/ablehnen | Phase 6 delivers the **in-app notification center** only (D-09, D-10). Web push is Phase 9 / MOBILE-02. Accept/decline via REST patch endpoint + Socket.IO emit. See Architecture Patterns → "Notification namespace with per-user rooms". |
| **SUBST-04** | Abwesender Lehrer kann Übergabenotizen pro Stunde hinterlassen | `HandoverNote` + `HandoverAttachment` (D-15, D-20). Reuses Phase 5 `excuse.service.ts` upload pipeline verbatim (D-16). See Don't Hand-Roll table. |
| **SUBST-05** | Vertretungsänderungen propagieren sofort in alle Stundenplan-Ansichten | Overlay entity model + view-layer join (D-12, D-13, D-14). Existing `/timetable` Socket.IO gateway emits `timetable:substitution` / `timetable:cancelled` events (D-24). Requires rewriting `timetable.service.ts::getView()` to read overlays. |
| **SUBST-06** | System erfasst Vertretungsstatistiken pro Lehrer (gegeben/erhalten) | Derived queries over `Substitution` overlay, Werteinheiten-weighted (D-17, D-18). Pattern mirrors Phase 5 `statistics.service.ts`. No denormalised stats table. |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

**Stack (authoritative — do not deviate):**
- Runtime: Node.js 24 LTS, TypeScript 6.0 (strict mode, definite assignment assertions `!` on DTOs)
- Backend: NestJS 11 on Fastify, Prisma 7.6, PostgreSQL 17
- Async: Socket.IO 4.8 (websocket + polling transports), BullMQ 5.71, Redis 7
- Authz: Keycloak 26.5 for authN, CASL 6.8 + custom `CheckPermissions` decorator for authZ
- Frontend: React 19, TanStack Query 5 + Router 1, shadcn/ui on Radix primitives, Tailwind 4, Zustand 5
- Test: Vitest 4 for all unit/integration, Testing Library for React, Supertest for e2e
- Monorepo: pnpm 10 + Turborepo 2.8, shared package `@schoolflow/shared` for DTOs/events/types

**Architectural constraints:**
- **Architektur:** Monorepo with clean service separation; UI client must be swappable without backend changes. All new Phase 6 business logic lives in NestJS services with REST endpoints — no business logic leaks into gateways or frontend.
- **Framework-Unabhängigkeit:** Best tool for the job. Don't add libraries if an existing in-repo pattern already solves the problem.
- **DSGVO from Day 1:** Every new entity must be covered by retention policy + audit trail + CASL permission + consent where applicable. HandoverNote has explicit 1-year retention (D-19).
- **API-First:** Every Phase 6 capability MUST be available via REST endpoint before any UI is built. Swagger/OpenAPI docs auto-generated from decorators.
- **Open Source:** No commercial dependencies introduced.
- **Plattform-Parität:** Web + Mobile feature parity. Phase 6 builds responsive web now; mobile layout verification is part of testing.

**Conventions (locked in prior phases):**
- English API / German UI (Phase 1 D-15): entity and field names in English; enum values like `KRANK` match Austrian terms; all user-facing strings in German.
- Prisma schema-first with UUID PKs, `@@map()` snake_case, `createdAt`/`updatedAt`, `onDelete: Cascade` where data ownership is clear.
- Global `APP_GUARD` (JWT → permissions) + `@CheckPermissions(...)` decorator on every protected endpoint.
- Global `AuditInterceptor` automatically logs all mutations — no per-module wiring needed.
- RFC 9457 problem-detail errors, pagination DTO on list endpoints.
- DTO classes use definite assignment assertions (`!`) for TypeScript 6.0 strict mode compatibility.
- No new infra containers/services — everything runs on existing NestJS + Postgres + Redis + Socket.IO + JVM solver.

**GSD Workflow:** File-changing work goes through a GSD command (`/gsd:execute-phase`). No direct repo edits outside a GSD workflow.

## Standard Stack

### Core (all already installed — verified in `apps/api/package.json` and `apps/web/package.json`)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@nestjs/common` + `@nestjs/core` | ^11 | Module/controller/service framework | Project framework. One `SubstitutionModule` (or split) with standard controllers + services + DTOs. |
| `@prisma/client` + `prisma` | ^7.6.0 | ORM + migrations | Schema-first. Phase 6 adds 5 models + 4 enums. `prisma generate` after schema changes. |
| `@nestjs/websockets` + `@nestjs/platform-socket.io` + `socket.io` | ^11.1.17 / ^4.8.3 | Real-time delivery | Existing `/timetable` and `/classbook` gateways are the model. Phase 6 adds `/notifications`. |
| `@nestjs/bullmq` + `bullmq` | ^11.0.4 / ^5.71.1 | Retention cron | Reuse existing `DSGVO_RETENTION_QUEUE` (Phase 2) — add `handover` category, not a new queue. |
| `@fastify/multipart` | ^9.4.0 | Handover file uploads | Registered globally in `main.ts` with 5 MB limit. Reuse `ExcuseService.saveAttachment` pattern verbatim. |
| `@casl/ability` + `@casl/prisma` | ^6.8.0 / ^1.6.1 | Authorization | `CaslAbilityFactory` already loads role permissions from DB. Phase 6 adds seed rows, no code changes needed. |
| `class-validator` + `class-transformer` | ^0.15.1 / ^0.5.1 | DTO validation | Existing pattern — `@IsEnum`, `@IsDateString`, `@IsUUID`, `@IsOptional`, etc. Remember definite assignment assertions. |
| `date-fns` | ^4.1.0 | Date arithmetic for range expansion | Already a dependency. Use `eachDayOfInterval`, `isWithinInterval`, `getDay` for absence range expansion. |
| `@schoolflow/shared` | workspace:* | Shared DTOs + event types | Add Phase 6 types here: `SubstitutionCreatedEvent`, `NotificationNewEvent`, `TeacherAbsenceDto`, etc. Both API and web consume. |

### Frontend (all already installed)

| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| `react` + `react-dom` | ^19.0.0 | UI | Existing Phase 4/5 patterns (client components only — no SSR). |
| `@tanstack/react-query` | ^5.95.0 | Server state | Invalidate query keys on Socket.IO event receipt. Pattern: `useTimetableSocket.ts`. |
| `@tanstack/react-router` | ^1.168.0 | Routing | Add `/admin/substitutions` and substitute view routes under existing auth layout. |
| `socket.io-client` | ^4.8.0 | WebSocket client | Add a second socket factory for `/notifications` namespace alongside existing timetable/classbook sockets. |
| `@radix-ui/react-dialog` + `@radix-ui/react-select` + `@radix-ui/react-tabs` + `@radix-ui/react-dropdown-menu` | latest | shadcn primitives | Already installed. Reuse for forms, tabs, dropdowns. |
| `sonner` | ^2.0.0 | Toast notifications | Existing toast pattern for "Neue Vertretung angeboten" on socket event. |
| `lucide-react` | ^0.469.0 | Icons | Pick `Bell`, `BellRing`, `UserCheck`, `UserX`, `AlertTriangle` for the UI. |
| `zustand` | ^5.0.0 | Client UI state | Only for UI concerns (notification dropdown open/closed). Server state stays in TanStack Query. |

### Missing shadcn/ui Primitives (install on Wave 0)

Phase 4/5 planning decisions document that shadcn CLI is incompatible with the current `components.json` format — **follow the Phase 5 pattern and hand-author these files following the shadcn source**. Do not attempt `pnpm dlx shadcn add ...`.

| Component | Status | Needed For | Install Path |
|-----------|--------|------------|--------------|
| `popover` | **MISSING** | Notification bell dropdown (D-23) | Install `@radix-ui/react-popover`, create `apps/web/src/components/ui/popover.tsx` by hand (shadcn source). |
| `badge` | Installed | Unread count badge on bell | Reuse existing `apps/web/src/components/ui/badge.tsx`. |
| `table` | Missing (Phase 4 decision: inline HTML) | Fairness stats panel, candidate list | Follow Phase 4 pattern — inline `<table>` with Tailwind classes, no shadcn Table dep. |
| `calendar` / date picker | Missing (Phase 5 decision: native HTML date inputs) | Absence date range picker | Use `<input type="date">` pair, Phase 5 precedent. No `react-day-picker`. |

### Alternatives Considered (and rejected)

| Instead of | Could Use | Why Not |
|------------|-----------|---------|
| In-app Socket.IO notification center (D-09) | Web Push API / VAPID / service worker | Explicitly deferred to Phase 9 (MOBILE-02). Don't build early. |
| Single `/notifications` namespace | Sub-event on existing `/timetable` namespace | D-23 implies a bell icon visible **to all authenticated roles on every page**, including pages that never mount the timetable socket (e.g., `/rooms`, `/excuses`, `/admin/resources`). A dedicated `/notifications` namespace is cleanly isolated, joins on login not on timetable mount, and aligns with the existing `/timetable` + `/classbook` per-domain pattern. **Recommended.** |
| Dedicated `HandoverFile` service with S3/MinIO | Phase 5 `@fastify/multipart` + filesystem storage | Zero duplication (D-16). Reuse `uploads/{schoolId}/handover/{noteId}/{filename}` pattern. |
| New `SUBSTITUTION_RETENTION_QUEUE` | Reuse `DSGVO_RETENTION_QUEUE` cron | Phase 2 D-15 pattern — one daily cron loops all retention categories. Just add `handover_materials: 365` to `DEFAULT_RETENTION_DAYS`. |
| Denormalised `SubstitutionStats` table | Derived aggregation query per request | D-18. At school scale (< 200 teachers), Postgres handles this fine. Cache only if a measurement shows it's needed. |
| BullMQ job for ranking | Synchronous NestJS service call | School size doesn't need async. Admin form expects the ranked list in the same request. |

### Version Verification

| Package | Version in repo | Published | Currency |
|---------|-----------------|-----------|----------|
| `@nestjs/common` | ^11 | NestJS 11 stable since 2025-11 | ✓ current |
| `@prisma/client` | ^7.6.0 | Prisma 7.6.0 released 2025-12 | ✓ current |
| `socket.io` | ^4.8.3 | Socket.IO 4.8.x line | ✓ current |
| `@nestjs/bullmq` | ^11.0.4 | Matches NestJS 11 major | ✓ current |
| `bullmq` | ^5.71.1 | BullMQ 5 active line | ✓ current |
| `@fastify/multipart` | ^9.4.0 | Fastify multipart v9 (Fastify 5 compat) | ✓ current |
| `@casl/ability` | ^6.8.0 | CASL 6 stable | ✓ current |
| `react` | ^19.0.0 | React 19 stable | ✓ current |
| `@tanstack/react-query` | ^5.95.0 | v5 series | ✓ current |

No version bumps needed for Phase 6. Adding `@radix-ui/react-popover` is the only new dependency.

### Installation

```bash
# Frontend — only new dep for the notification bell
pnpm --filter @schoolflow/web add @radix-ui/react-popover

# No new backend dependencies. Everything needed is already installed.

# After schema changes
pnpm --filter @schoolflow/api prisma db push        # dev (matches Phase 3/4/5 pattern — see STATE.md)
pnpm --filter @schoolflow/api prisma generate
```

## Architecture Patterns

### Recommended Module Structure (NestJS — Claude's Discretion D-21)

Keep `SubstitutionModule` as a single feature module but split the directory by domain to mirror the Phase 5 `classbook/` pattern. One module, multiple services and controllers, one gateway, one set of DTOs:

```
apps/api/src/modules/substitution/
├── substitution.module.ts              # Registers all providers + controllers + gateway
├── dto/
│   ├── teacher-absence.dto.ts          # CreateTeacherAbsenceDto, UpdateTeacherAbsenceDto, TeacherAbsenceResponseDto
│   ├── substitution.dto.ts             # AssignSubstituteDto, RespondToOfferDto, SubstitutionResponseDto
│   ├── ranking.dto.ts                  # RankedCandidateDto (score + breakdown), RankingQueryDto
│   ├── handover.dto.ts                 # CreateHandoverNoteDto, HandoverNoteResponseDto, HandoverAttachmentDto
│   ├── notification.dto.ts             # NotificationDto, MarkReadDto, ListNotificationsQueryDto
│   └── substitution-stats.dto.ts       # FairnessStatsDto, StatsWindowQueryDto
│
├── absence/
│   ├── teacher-absence.service.ts      # CRUD + range expansion (fan-out into pending Substitution rows)
│   ├── teacher-absence.service.spec.ts # Vitest TDD
│   └── teacher-absence.controller.ts   # POST / GET / DELETE on /absences
│
├── substitution/
│   ├── substitution.service.ts         # CRUD on Substitution overlay (accept/decline/reassign, ENTFALL, STILLARBEIT)
│   ├── substitution.service.spec.ts
│   ├── substitution.controller.ts      # POST /substitutions/:id/assign, PATCH /respond, PATCH /entfall, /stillarbeit
│   ├── ranking.service.ts              # Pure functions + Prisma queries — heart of D-05
│   ├── ranking.service.spec.ts         # High-value TDD: hard filters, scoring formula, deterministic order
│   └── substitution-stats.service.ts   # D-17, D-18 aggregation queries
│
├── handover/
│   ├── handover.service.ts             # Create/update note + attachment (reuses excuse.service.ts pattern)
│   ├── handover.service.spec.ts
│   └── handover.controller.ts          # POST note, POST attachment, GET attachment stream
│
├── notification/
│   ├── notification.service.ts         # Create + emit; mark read; list per user
│   ├── notification.service.spec.ts
│   ├── notification.controller.ts      # GET /me/notifications, PATCH /:id/read, POST /mark-all-read
│   └── notification.gateway.ts         # Socket.IO /notifications namespace — per-user rooms
│
└── __tests__/
    └── (shared fixtures / builders if needed)
```

**Rationale:** Single module, domain-subfolder split. Makes the module.ts exports readable and lets each sub-domain have its own spec folder. Same philosophy as `apps/api/src/modules/classbook/`.

### Pattern 1: Range Expansion — TeacherAbsence → pending Substitutions (D-02)

When admin records a TeacherAbsence with a date range and optional period bounds, the service must fan out into one pending `Substitution` row per affected lesson. Hard rules:

1. Only operate against the **active** TimetableRun (`isActive: true`) for the school. See existing `timetable.service.ts::getView()` for the pattern.
2. Iterate each date in `[dateFrom, dateTo]` using `date-fns::eachDayOfInterval`. For each date:
   - Compute `dayOfWeek` (DayOfWeek enum).
   - Skip non-school days (`SchoolDay.isActive = false` for this day).
   - Determine week type (A / B / BOTH) if `TimetableRun.abWeekEnabled`. Reference Phase 3 `isWeekCompatible` utility (not yet exported as a service — see `solver-input.service.ts` or wave 0 test may be needed). For v1, use ISO week parity (`week % 2`) as the A/B resolver and document the assumption.
3. For each active school day, find `TimetableLesson` rows in the active run where `teacherId = absentTeacherId` AND `dayOfWeek` matches AND period is in `[periodFrom, periodTo]` (or all periods if unbounded) AND week type matches.
4. For each matched lesson, create `Substitution { lessonId, absenceId, date, type: null, status: 'PENDING', originalTeacherId, createdBy }`. Admin later picks SUBSTITUTED / ENTFALL / STILLARBEIT per-lesson (D-04, D-08).
5. Wrap the whole fan-out in a Prisma `$transaction` so partial failures don't leave orphaned Substitution rows.

Phase 6 intentionally does NOT respect school holidays as a first-class concept because `SchoolDay` is the only calendar signal Phase 2 shipped. If holidays become needed, add a `Holiday` model in a later phase.

### Pattern 2: Deterministic Scored Ranking (D-05)

This is the algorithmic core of Phase 6. Rough structure:

```
for each candidate teacher in the school:
    if any hard filter fails: skip
    score = weighted sum of soft factors (each normalized to 0..1)
    collect score + breakdown
return sorted desc by score; tie-break by deterministic key (teacherId)
```

**Hard filters (exclusion — any failure disqualifies):**

1. **Not the absent teacher.** Trivial.
2. **Free in that slot on that date.** Cross-check three tables:
   - No `TimetableLesson` in the active run where `teacherId = candidateId AND dayOfWeek = targetDay AND periodNumber = targetPeriod AND (weekType = 'BOTH' OR weekType = targetWeekType)`.
   - No other `Substitution` already assigned to this candidate on the same date + lesson slot with status in `(PENDING, OFFERED, CONFIRMED)`.
   - Optionally no `RoomBooking` held by that teacher at that time (they booked a room for a field trip etc.) — **but** RoomBooking doesn't store `bookedBy` as a teacherId, it stores a `keycloakUserId` string. Join via `Person.keycloakUserId`.
3. **Not blocked by AvailabilityRule.** For the candidate, evaluate every `AvailabilityRule`:
   - `BLOCKED`-type rules with `dayOfWeek = targetDay` and `periodNumbers` containing target period → exclude.
   - `MAX_HOURS_PER_DAY` rules: compare current day load (lessons + existing substitutions) against max → exclude if at/over.
   - Any rule with `isHard = true` that the candidate would violate → exclude.
4. **Werteinheiten headroom.** Computed as `werteinheitenTarget - calculateMaxTeachingHours(teacher, reductions) - currentCommitmentsForWeek` vs the Werteinheiten cost of one period in the affected subject. If the candidate would exceed their weekly target when adding this period → exclude. Reuse `werteinheiten.util.ts::calculateWerteinheiten` and `calculateMaxTeachingHours` which are already pure functions.

**Soft factors (scoring — all normalized to 0..1 then weighted):**

| Factor | Computation | Default Weight | Rationale |
|--------|-------------|----------------|-----------|
| Subject qualification match | 1.0 if `TeacherSubject { teacherId, subjectId }` exists for the affected lesson's subject; 0.5 if candidate teaches the same Lehrverpflichtungsgruppe (related subject); 0.0 otherwise. | **0.45** | Highest weight per D-05 — pedagogical quality is the primary goal. Austrian Schulunterrichtsgesetz §20 implicitly expects qualified substitution. |
| Fairness (received) | `1 - (received / maxReceivedInWindow)` where `received` = count of substitutions GIVEN by this candidate in current semester. Capped at 1.0 if nobody else has given any. | **0.30** | Direct D-05 requirement. Using *given* (not *received*) — the candidate who has already given the fewest substitutions gets the highest fairness score. |
| Workload headroom | `(werteinheitenTarget - currentWerteinheiten) / werteinheitenTarget`, clamped to `[0, 1]`. | **0.20** | Part-time / reduced-load teachers float up. Matches D-05 "more unused Werteinheiten → higher score". |
| Klassenvorstand bonus | 1.0 if candidate is the Klassenvorstand of the affected SchoolClass; 0.0 otherwise. | **0.05** | Small tie-breaker per D-05. Klassenvorstand knows the class context. |

Total weight sums to **1.00**. Final score is a float in `[0, 1]`. Expose the breakdown in `RankedCandidateDto` so the admin UI can render a tooltip showing *why* a candidate is ranked where they are.

**Determinism:** Tie-breaking uses `teacherId` lexicographic order to guarantee the same ranked list for the same input. No randomness. This matters for UI consistency and for tests.

**Tuneable:** The weight vector `{ 0.45, 0.30, 0.20, 0.05 }` lives in a single exported constant `RANKING_WEIGHTS` in `ranking.service.ts`. Ship with researched defaults (documented as such in a comment block), leave a TODO for admin-configurable weights in a future phase.

### Pattern 3: Overlay-Aware View Composition (D-12, D-13)

`apps/api/src/modules/timetable/timetable.service.ts::getView()` currently reads `changeType`, `originalTeacherSurname`, `originalRoomName` directly from `TimetableLesson` scalar columns. After Phase 6, these MUST be populated from the `Substitution` overlay at query time. The minimal rewrite:

1. After fetching all `TimetableLesson` rows for the active run, compute the date(s) in the query window the view is covering. The current `getView()` is perspective + weekType driven and is **week-agnostic** — it returns the recurring plan, not a dated view. Phase 6 decides whether to:
   - **Option A (recommended):** Keep `getView()` week-agnostic but add an optional `date` query param. When `date` is present, join `Substitution` records where `date = targetDate` and overlay. When absent, return the recurring plan as before (no overlays, which means callers querying the "default week" still get Phase 4 behavior). Frontend passes the week's Monday date when rendering a week view; backend expands to the 5-7 dates in that week internally.
   - **Option B:** Add a separate `getViewForDate(schoolId, date, ...)` method that always returns a dated view and leave the existing method unchanged. Higher code cost, clearer separation.

   **Recommendation:** Option A. Single code path, backward-compatible default, one new query param. Document the week-expansion contract.

2. For each lesson × date, look for a matching `Substitution` row with `status IN ('CONFIRMED', 'OFFERED')` (not PENDING — pending means admin hasn't picked yet). If found:
   - `SUBSTITUTED`: populate `changeType = 'substitution'`, `originalTeacherSurname = <absent teacher lastName>`, mutate the DTO `teacherId` / `teacherSurname` to the substitute, optionally mutate `roomId` / `roomName` if `substituteRoomId` is set (then also set `changeType` to compose substitution + room swap — TBD in UI planning per D-24).
   - `ENTFALL`: `changeType = 'cancelled'`, leave teacher/room fields as-is (UI renders them struck through).
   - `STILLARBEIT`: `changeType = 'substitution'` but with a magic `subjectAbbreviation = 'STILL'` marker and the substitute teacher filled in — or a dedicated `changeType = 'stillarbeit'` value (planner decision — adding a new wire-format value is safer than overloading magic strings). **Recommendation:** add `'stillarbeit'` as a new legitimate `changeType` value and update the frontend `ChangeIndicator.tsx` to handle it explicitly. Both sides ship together.

3. Emit `timetable:substitution` / `timetable:cancelled` on the existing `/timetable` gateway when a Substitution row transitions to `CONFIRMED`. The frontend already listens and invalidates TanStack Query keys — no client-side changes needed for propagation per se, only for the rendering of the new `stillarbeit` change type.

### Pattern 4: Notification Gateway with Per-User Rooms (D-09, D-23)

The canonical NestJS + Socket.IO notification-center pattern is:

```typescript
@WebSocketGateway({ namespace: 'notifications', cors: { origin: '*' }, transports: ['websocket', 'polling'] })
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer() server!: Server;

  handleConnection(client: Socket) {
    // userId must be authenticated — extract from handshake auth token or query
    const userId = client.handshake.query.userId as string;
    if (userId) client.join(`user:${userId}`);
  }

  emitToUser(userId: string, notification: NotificationDto) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  emitBadgeUpdate(userId: string, unreadCount: number) {
    this.server.to(`user:${userId}`).emit('notification:badge', { unreadCount });
  }
}
```

**Do NOT** use the existing `school:{schoolId}` room model from `/timetable` — that's school-wide broadcast. Notifications are per-user delivery. Use `user:{userId}` rooms.

**Security note:** The `userId` passed in the handshake query is NOT authoritative. Validate it against the JWT at connection time. NestJS 11 gives you the handshake request — grab the `Authorization` header, decode the JWT via `JwtService`, and confirm `sub` matches the claimed `userId`. Phase 1 already has `JwtAuthGuard` and `JwtService` wired up — inject and use. Reject the connection in `handleConnection` if the check fails.

**Persistence:** Every notification is persisted to the `Notification` table before it's emitted. When a client connects, it immediately fetches `GET /me/notifications?unreadOnly=true` via REST to populate the bell dropdown. The Socket.IO channel is for live updates only — the REST endpoint is the source of truth for "what do I have unread". This avoids the "missed notification during offline window" class of bugs.

### Pattern 5: Handover Attachment Upload — Copy from `excuse.service.ts`

The Phase 5 excuse upload pipeline (`ExcuseService.saveAttachment` + `ExcuseController.uploadAttachment`) is a complete, production-ready @fastify/multipart pattern. Copy it byte-for-byte and change:

1. Storage path: `uploads/{schoolId}/handover/{substitutionId}/{filename}` (parallel to `uploads/{schoolId}/excuses/{excuseId}/...`).
2. Parent lookup: fetch `HandoverNote` by `substitutionId`, then cross-reference `Substitution` → `TimetableLesson` → lesson's `runId` → run's `schoolId`. Store `schoolId` on `HandoverNote` directly to skip the multi-hop join (denormalization for performance).
3. MIME + magic byte validation: exactly the same `ALLOWED_MIME_TYPES` = `['application/pdf', 'image/jpeg', 'image/png']` and the same `MAGIC_BYTES` constant. Copy both verbatim.
4. Size limit: 5 MB, enforced by the global `@fastify/multipart` registration in `main.ts`. No per-endpoint override needed.

**Do not duplicate the multipart registration.** `main.ts` already registers `@fastify/multipart` with `limits: { fileSize: 5 * 1024 * 1024 }`. The Phase 6 upload endpoint just calls `req.file()` exactly like `ExcuseController`.

### Pattern 6: Retention Cron Extension (D-19)

Phase 2 shipped `DSGVO_RETENTION_QUEUE` with a daily repeatable job at cron `0 2 * * *` and a `DEFAULT_RETENTION_DAYS` map. Adding handover retention is a three-line change:

```typescript
// apps/api/src/modules/dsgvo/retention/retention.service.ts
export const DEFAULT_RETENTION_DAYS: Record<string, number> = {
  noten: 21900,
  anwesenheit: 1825,
  kommunikation: 365,
  audit_mutation: 1095,
  audit_sensitive_read: 365,
  personal_data: 1825,
  health_data: 365,
  handover_materials: 365, // <-- NEW for Phase 6 D-19
};
```

Then extend `RetentionService.checkExpiredRecords` (or a new processor method) to also delete `HandoverNote` + `HandoverAttachment` rows (and on-disk files) older than the policy. The existing retention processor iterates categories — this is the idiomatic extension point.

### Anti-Patterns to Avoid

- **Mutating `TimetableLesson` rows when a substitution is created.** The whole point of the overlay (D-12) is that the recurring plan stays intact. Never write to `TimetableLesson.teacherId` or `TimetableLesson.roomId` as a side effect of creating a Substitution.
- **Scattering Socket.IO listeners across child components on the frontend.** Phase 4 `useTimetableSocket.ts` enforces a single centralized listener at layout level. Mirror this: mount `useNotificationSocket(userId)` at the authenticated layout once. The bell dropdown reads notification state from TanStack Query, not directly from socket events.
- **Computing fairness statistics by full-table scan per request without pagination.** At ~200 teachers the query is fine, but add an index on `Substitution(substituteTeacherId, date)` and `Substitution(originalTeacherId, date)` so the aggregation query can use index-only scans.
- **Writing to `changeType` / `originalTeacherSurname` / `originalRoomName` columns from substitution code.** They're wire-format placeholders now (D-13). Populate them at read time in `getView()`, never at write time.
- **Enqueueing a BullMQ job per individual retention cleanup.** The Phase 2 cron is a single repeatable job that processes all categories in one run. Follow the pattern.
- **Adding a new Redis keyspace prefix or a new BullMQ queue.** Phase 6 explicitly doesn't need either. Reuse `DSGVO_RETENTION_QUEUE`.
- **Storing the ranking result in the database.** It's a derived, time-sensitive view. Recompute per admin request — at school scale, this is milliseconds.
- **Cascading deletes from `TimetableLesson` → `Substitution` with `onDelete: Cascade` automatically.** Phase 4 chose `String?` for `changeType` to avoid migration headaches. For Substitution.lessonId, use `onDelete: Restrict` (or `SetNull` with a nullable FK) so deleting a TimetableRun (3-run cap per Phase 3 D-11) doesn't silently wipe substitution history. Archive or skip instead. **Claude's discretion per CONTEXT.md — plan this explicitly.**

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| File upload with MIME validation | Custom Buffer parser | `@fastify/multipart` + `ExcuseService.saveAttachment` copy | Magic-byte validation is already implemented and tested in Phase 5. |
| Date range expansion | Manual day-by-day loop with custom DayOfWeek logic | `date-fns::eachDayOfInterval` + existing `DayOfWeek` enum | `date-fns` already a dep, handles DST, leap years, timezone edge cases. |
| Werteinheiten calculation | Reimplement factor tables | `werteinheiten.util.ts::calculateWerteinheiten` + `calculateMaxTeachingHours` | Pure functions, tested, authoritative source for Austrian Lehrverpflichtungsgruppen. |
| Socket.IO auth on connect | Custom cookie/session lookup | Inject `JwtService` into the gateway, decode handshake `Authorization` header | Phase 1 JWT infrastructure already validated. |
| CASL ability definitions | Hard-coded role checks in controllers | `@CheckPermissions({ action, subject })` decorator + Permission table seed rows | Phase 1 D-04 pattern — ability loader reads from DB, no code rebuild to tune permissions. |
| Retention cron | New BullMQ queue + new processor | Add category to `DEFAULT_RETENTION_DAYS`, extend existing `RetentionProcessor` | Single daily job, one place to reason about retention. |
| Semester date arithmetic | Manual month math | `StatisticsService.getSemesterDateRange()` (Phase 5 — make public or copy) | Austrian Sep/Feb semester calendar already encoded and tested. |
| Audit logging | Manual `prisma.auditEntry.create` in each mutation | Do nothing — global `AuditInterceptor` logs all mutations automatically | Phase 1 D-05. Already wired as `APP_INTERCEPTOR`. |
| Notification event typing | Loose `any` payloads | Add `NotificationNewEvent`, `NotificationBadgeEvent` to `@schoolflow/shared` | Mirrors `ClassBookAttendanceUpdatedEvent` pattern — typed across boundary. |
| File download serving | Custom stream handler | `createReadStream` + Fastify `reply.send(stream)` — Phase 5 `ExcuseController.downloadAttachment` pattern | Backpressure handled. |

**Key insight:** Phase 6 introduces almost **zero net-new infrastructure**. Everything except the `Notification` gateway and the ranking algorithm is a direct copy or a one-line extension of Phase 1–5 code. Treat deviations from reuse as design smells — if you're tempted to write new plumbing, check whether Phase 4 or 5 already shipped it.

## Runtime State Inventory

*(Not applicable — Phase 6 is greenfield feature work, not a rename/refactor/migration.)*

## Common Pitfalls

### Pitfall 1: Race condition between Substitution creation and TimetableRun promotion
**What goes wrong:** Admin records an absence on 2026-05-14 for a lesson in Run A. Admin then re-solves the timetable and promotes Run B as active. Run B's `TimetableLesson` IDs differ from Run A's, so the `Substitution.lessonId` foreign keys now point into a stale run. If Phase 3's 3-run cap deletes Run A, the substitutions get cascaded away or orphaned.
**Why it happens:** `Substitution.lessonId` references a row that is itself scoped to a TimetableRun, but Phase 3 D-11 deletes old runs.
**How to avoid:** Either (a) prevent deletion of runs that have non-terminal `Substitution` records via a DB-level check in `TimetableService.enforceRunLimit`, or (b) denormalize the lesson identity onto `Substitution` (classSubjectId, dayOfWeek, periodNumber, weekType) so it survives lesson-row churn. **Recommendation:** Option (b) — add those four fields to `Substitution` and treat `lessonId` as a soft reference. The view-layer join then matches on the denormalized tuple, not on `lessonId`.
**Warning signs:** Unit test that creates substitution then re-solves timetable, expects substitution to still render in view.

### Pitfall 2: Double booking on slot due to stale ranking result
**What goes wrong:** Admin opens the ranked list for Lesson 1, sees Teacher X at the top. Before clicking "Assign", another admin assigns Teacher X to Lesson 2 in a parallel tab. Admin A then assigns X to Lesson 1 — conflict.
**Why it happens:** Ranking is a snapshot; assignment is a separate call.
**How to avoid:** `SubstitutionService.assignSubstitute` MUST re-run the hard filters inside a Prisma transaction with `isolationLevel: 'Serializable'`, and return `409 Conflict` if the candidate is no longer free. The ranking result is advisory only.
**Warning signs:** Stale ranking UI — add an "Aktualisieren" button on the candidate list panel.

### Pitfall 3: Socket.IO handshake auth bypass
**What goes wrong:** Anyone who knows a `userId` can connect to `/notifications` with `?userId=<target>` and receive their notifications.
**Why it happens:** Handshake query params are client-supplied and unverified by default. The existing `/timetable` gateway has the same issue for `schoolId` but notifications are more sensitive.
**How to avoid:** In `NotificationGateway.handleConnection`, verify a JWT from the handshake `Authorization` header via Phase 1's `JwtService`. Compare `jwt.sub` to the claimed `userId` query param. On mismatch: `client.disconnect(true)`.
**Warning signs:** A test that passes a mismatched `userId` + JWT should fail to receive emitted notifications.

### Pitfall 4: BullMQ repeat pattern typo wipes retention
**What goes wrong:** Using `repeat: { cron: '0 2 * * *' }` instead of `repeat: { pattern: '0 2 * * *' }` — BullMQ 5 uses `pattern`, not `cron`. Phase 2 already hit this (see STATE.md: "BullMQ v5 uses repeat.pattern (not repeat.cron) for cron schedule syntax").
**Why it happens:** Legacy docs, BullMQ 4 used `cron`.
**How to avoid:** Don't add a new cron job. Extend the existing one. If you must register a new repeatable, use `repeat: { pattern: '...' }`.
**Warning signs:** `BullMQ will silently not register a job with invalid repeat options`.

### Pitfall 5: @fastify/multipart consumed twice
**What goes wrong:** NestJS controllers using `@Body()` + Fastify multipart request don't play nicely — once you call `req.file()`, the body is consumed and @Body() returns empty.
**Why it happens:** Stream consumption model.
**How to avoid:** For file-upload endpoints, use `@Req() req` and read both the file and additional form fields from the multipart parts iterator, as `ExcuseController.uploadAttachment` does. For the HandoverNote text body, use a separate JSON endpoint (`POST /handover-notes` with JSON body) and then a second endpoint for attachment uploads (`POST /handover-notes/:id/attachments`). Phase 5 precedent.
**Warning signs:** Empty DTOs coming through on a file-upload endpoint.

### Pitfall 6: Socket.IO polling transport behind corporate proxy
**What goes wrong:** School network proxy strips the `Upgrade` header, Socket.IO falls back to polling, polling requests get blocked by a different proxy rule, all notifications silently fail.
**Why it happens:** School networks are infamously restrictive (STATE.md Phase 3 decision: "Socket.IO with websocket+polling transports for school network proxy fallback").
**How to avoid:** Notification gateway MUST include `transports: ['websocket', 'polling']` (same as `/timetable`). Document the requirement in the deployment guide. Add a WebSocket reachability check in the frontend on login, show a user-visible warning if offline.
**Warning signs:** Teachers reporting "I never got the notification but it was in the bell when I logged in tomorrow." — that's degraded-but-working. Fully broken: REST works, socket never connects.

### Pitfall 7: Prisma 7 cascade deletes in development via `db push`
**What goes wrong:** Phases 3/4/5 all used `prisma db push` instead of `migrate dev` due to schema drift (STATE.md pattern). Phase 6 will hit the same issue. If you try `migrate dev`, you'll get a "drift detected" error and may lose Wave 0 test data.
**Why it happens:** Historical schema evolution without migration files.
**How to avoid:** Use `pnpm prisma db push` for Phase 6 schema changes (locked decision pattern from Phase 4 STATE entry). Do NOT run `migrate dev` until the project elects to re-baseline.
**Warning signs:** `Drift detected: Your database schema is not in sync with your migration history`.

### Pitfall 8: Notification dedup missing for rapid reassignment
**What goes wrong:** Admin assigns Teacher X, unassigns within 10 seconds, assigns again. Teacher X gets three notifications. Teacher X is annoyed.
**Why it happens:** Each assignment creates a new `Notification` row + emits an event. No coalescing.
**How to avoid:** Before creating a new SUBSTITUTION_OFFER notification, check for an existing unread offer with the same `(userId, payload.substitutionId)` — if present, update `createdAt` and re-emit rather than creating a duplicate. Alternatively: maintain a per-user rate limit (max one offer notification per substitution ID per 60 seconds). **Recommendation:** upsert-on-substitution-id.
**Warning signs:** Notification spam in tests.

### Pitfall 9: ClassBookEntry teacherId split under substitution
**What goes wrong:** Substitute teacher teaches Lesson X on 2026-05-14. Phase 5 `ClassBookEntry` is created with `teacherId = substitute.id`. Phase 5 absence statistics filter by `teacherId` — now the absent teacher's statistics are missing that lesson, and the substitute's statistics gain a lesson they're not formally assigned to.
**Why it happens:** D-14 explicitly specifies the substitute writes the ClassBookEntry. Correct for authorship, surprising for statistics.
**How to avoid:** When generating any per-teacher statistics that reference ClassBookEntries, ALSO join through `Substitution` to distinguish "teacher's own lesson" from "lesson taught as substitute". The Phase 5 statistics service must be updated to handle this correctly, or the Phase 6 fairness service must compensate. **This is a cross-phase touchpoint that deserves its own task.**
**Warning signs:** Statistics that don't add up to historical expectations after Phase 6 ships.

### Pitfall 10: Definite assignment assertions (`!`) missing on new DTOs
**What goes wrong:** TypeScript 6.0 strict mode with `class-validator` requires DTO properties to be initialized or use definite assignment. Missing the `!` gives "Property has no initializer" errors (Phase 1, Phase 2, Phase 4 all hit this).
**Why it happens:** TypeScript 6.0 tightened strict class field initialization.
**How to avoid:** Every DTO class property declaration uses `!`: `@IsString() @IsNotEmpty() teacherId!: string;`. Not optional fields (`?:` for those).
**Warning signs:** `error TS2564: Property 'teacherId' has no initializer`.

## Code Examples

### Prisma schema additions (target: `apps/api/prisma/schema.prisma`)

```prisma
// ============================================================
// Phase 6: Substitution Planning (SUBST-01 -- SUBST-06)
// ============================================================

enum AbsenceReason {
  KRANK
  FORTBILDUNG
  DIENSTREISE
  SCHULVERANSTALTUNG
  ARZTTERMIN
  SONSTIGES
}

enum AbsenceStatus {
  ACTIVE      // In effect
  CANCELLED   // Admin cancelled before or during absence
  COMPLETED   // Past dateTo
}

enum SubstitutionType {
  SUBSTITUTED   // Covered by another teacher
  ENTFALL       // Lesson cancelled
  STILLARBEIT   // Supervised study hall
}

enum SubstitutionStatus {
  PENDING      // Created by range expansion, awaiting admin decision
  OFFERED      // Candidate chosen, notification sent, awaiting response
  CONFIRMED    // Accepted (or for ENTFALL/STILLARBEIT: finalized by admin)
  DECLINED     // Substitute rejected; admin must reassign
}

enum NotificationType {
  SUBSTITUTION_OFFER
  SUBSTITUTION_CONFIRMED
  SUBSTITUTION_DECLINED
  ABSENCE_RECORDED
  LESSON_CANCELLED
  STILLARBEIT_ASSIGNED
  // Reserved for future use by Phase 7 (Communication) and Phase 9 (Push)
}

model TeacherAbsence {
  id         String        @id @default(uuid())
  schoolId   String        @map("school_id")
  school     School        @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  teacherId  String        @map("teacher_id")
  teacher    Teacher       @relation(fields: [teacherId], references: [id], onDelete: Cascade)
  dateFrom   DateTime      @map("date_from")
  dateTo     DateTime      @map("date_to")
  periodFrom Int?          @map("period_from")
  periodTo   Int?          @map("period_to")
  reason     AbsenceReason
  note       String?
  status     AbsenceStatus @default(ACTIVE)
  createdBy  String        @map("created_by")
  createdAt  DateTime      @default(now()) @map("created_at")
  updatedAt  DateTime      @updatedAt @map("updated_at")

  substitutions Substitution[]

  @@index([schoolId, teacherId])
  @@index([dateFrom, dateTo])
  @@map("teacher_absences")
}

model Substitution {
  id                    String             @id @default(uuid())
  absenceId             String             @map("absence_id")
  absence               TeacherAbsence     @relation(fields: [absenceId], references: [id], onDelete: Cascade)
  lessonId              String             @map("lesson_id")                  // Soft ref — see Pitfall 1
  // Denormalized lesson identity (survives TimetableRun churn, Pitfall 1)
  classSubjectId        String             @map("class_subject_id")
  dayOfWeek             DayOfWeek          @map("day_of_week")
  periodNumber          Int                @map("period_number")
  weekType              String             @default("BOTH") @map("week_type")
  // When / what
  date                  DateTime           // Concrete calendar date
  type                  SubstitutionType?  // null until admin picks
  status                SubstitutionStatus @default(PENDING)
  originalTeacherId     String             @map("original_teacher_id")
  substituteTeacherId   String?            @map("substitute_teacher_id")
  substituteRoomId      String?            @map("substitute_room_id")
  // Lifecycle audit
  offeredAt             DateTime?          @map("offered_at")
  respondedAt           DateTime?          @map("responded_at")
  createdBy             String             @map("created_by")
  createdAt             DateTime           @default(now()) @map("created_at")
  updatedAt             DateTime           @updatedAt @map("updated_at")

  handoverNote   HandoverNote?
  classBookEntry ClassBookEntry? @relation("ClassBookSubstitution")

  @@index([lessonId, date])
  @@index([substituteTeacherId, date])       // For fairness "given" stats (D-17)
  @@index([originalTeacherId, date])         // For "received" stats (D-17)
  @@index([absenceId])
  @@map("substitutions")
}

model HandoverNote {
  id             String   @id @default(uuid())
  substitutionId String   @unique @map("substitution_id")  // D-20: exactly one per substitution
  substitution   Substitution @relation(fields: [substitutionId], references: [id], onDelete: Cascade)
  schoolId       String   @map("school_id")                 // Denormalized for faster scope check
  authorId       String   @map("author_id")                 // Absent teacher
  content        String
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  attachments HandoverAttachment[]

  @@index([authorId])
  @@map("handover_notes")
}

model HandoverAttachment {
  id             String       @id @default(uuid())
  handoverNoteId String       @map("handover_note_id")
  handoverNote   HandoverNote @relation(fields: [handoverNoteId], references: [id], onDelete: Cascade)
  filename       String
  mimeType       String       @map("mime_type")
  sizeBytes      Int          @map("size_bytes")
  storagePath    String       @map("storage_path")
  createdAt      DateTime     @default(now()) @map("created_at")

  @@map("handover_attachments")
}

model Notification {
  id        String           @id @default(uuid())
  userId    String           @map("user_id")     // keycloakUserId — matches Person.keycloakUserId
  type      NotificationType
  title     String
  body      String
  payload   Json?            // { substitutionId, lessonId, date, ... }
  readAt    DateTime?        @map("read_at")
  createdAt DateTime         @default(now()) @map("created_at")

  @@index([userId, readAt])
  @@index([userId, createdAt])
  @@map("notifications")
}

// --- Add to existing ClassBookEntry model (D-14) ---
// substitutionId String?       @unique @map("substitution_id")
// substitution   Substitution? @relation("ClassBookSubstitution", fields: [substitutionId], references: [id], onDelete: SetNull)
```

### Ranking algorithm skeleton (target: `apps/api/src/modules/substitution/substitution/ranking.service.ts`)

```typescript
// Source: Decision D-05 — researched defaults, documented for reviewers.
// Weights sum to 1.0. Tune by changing this constant; no schema migration required.
export const RANKING_WEIGHTS = {
  subjectMatch:    0.45,
  fairness:        0.30,
  workloadHeadroom: 0.20,
  klassenvorstand: 0.05,
} as const;

export interface ScoreBreakdown {
  subjectMatch: number;      // 0..1
  fairness: number;          // 0..1
  workloadHeadroom: number;  // 0..1
  klassenvorstand: number;   // 0..1
  total: number;             // weighted sum, 0..1
}

export interface RankedCandidate {
  teacherId: string;
  teacherName: string;
  score: number;
  breakdown: ScoreBreakdown;
  hardFiltersPassed: true;   // type guarantee that this object made it past filters
}

@Injectable()
export class RankingService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Returns candidates ranked by score (descending), tie-broken by teacherId.
   * Runs hard filters first, then computes soft scores only for survivors.
   */
  async rankCandidates(params: {
    schoolId: string;
    absentTeacherId: string;
    lessonId: string;
    date: Date;
    dayOfWeek: DayOfWeek;
    periodNumber: number;
    weekType: string;
    subjectId: string;
    classId: string;
  }): Promise<RankedCandidate[]> {
    // 1. Fetch all candidates (exclude absent teacher)
    const candidates = await this.prisma.teacher.findMany({
      where: { schoolId: params.schoolId, id: { not: params.absentTeacherId } },
      include: {
        person: true,
        qualifications: true,
        availabilityRules: true,
        reductions: true,
        klassenvorstandClasses: { where: { id: params.classId }, select: { id: true } },
      },
    });

    // 2. Fetch existing commitments for conflict checks (done once, not per candidate)
    //    - TimetableLesson rows in active run matching (dayOfWeek, periodNumber, weekType)
    //    - Existing Substitution rows for that date matching those teachers
    //    - RoomBooking held by teachers on that day/period
    //    (Details elided — inline Prisma queries)

    // 3. Hard filters (return null for excluded candidates)
    const scored: Array<RankedCandidate | null> = candidates.map((teacher) => {
      if (!this.passesHardFilters(teacher, params, /* commitments */)) return null;
      const breakdown = this.computeScore(teacher, params);
      return {
        teacherId: teacher.id,
        teacherName: `${teacher.person.firstName} ${teacher.person.lastName}`,
        score: breakdown.total,
        breakdown,
        hardFiltersPassed: true,
      };
    });

    // 4. Sort
    return scored
      .filter((c): c is RankedCandidate => c !== null)
      .sort((a, b) => b.score - a.score || a.teacherId.localeCompare(b.teacherId));
  }

  private passesHardFilters(/* ... */): boolean { /* ... */ return true; }

  private computeScore(/* ... */): ScoreBreakdown {
    // subjectMatch: TeacherSubject lookup for params.subjectId -> 1.0, related gruppe -> 0.5, else 0.0
    // fairness: count substitutions given in current semester; normalize
    // workloadHeadroom: (target - current) / target, clamped
    // klassenvorstand: 1.0 if candidate klassenvorstandClasses contains params.classId
    // total = sum(factor * RANKING_WEIGHTS[factor])
    return { subjectMatch: 0, fairness: 0, workloadHeadroom: 0, klassenvorstand: 0, total: 0 };
  }
}
```

### NotificationGateway skeleton (target: `apps/api/src/modules/substitution/notification/notification.gateway.ts`)

```typescript
@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: '*' },
  transports: ['websocket', 'polling'], // Pitfall 6
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer() server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    // Pitfall 3 — validate JWT, don't trust query param
    const token = this.extractToken(client);
    if (!token) return client.disconnect(true);
    try {
      const payload = await this.jwtService.verifyAsync(token);
      const userId = payload.sub;
      client.join(`user:${userId}`);
      this.logger.debug(`Client ${client.id} joined notification room user:${userId}`);
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(_client: Socket) {}

  emitNewNotification(userId: string, dto: NotificationDto, unreadCount: number) {
    this.server.to(`user:${userId}`).emit('notification:new', dto);
    this.server.to(`user:${userId}`).emit('notification:badge', { unreadCount });
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth?.token ?? client.handshake.headers?.authorization;
    if (!auth) return null;
    return auth.startsWith('Bearer ') ? auth.slice(7) : auth;
  }
}
```

### Frontend notification bell (target: `apps/web/src/components/notifications/NotificationBell.tsx`)

```typescript
// Source: shadcn/ui Popover pattern (install @radix-ui/react-popover first — see Missing Primitives)
// Mount this in apps/web/src/components/layout/AppHeader.tsx

export function NotificationBell() {
  const { data: notifications } = useNotifications({ unreadOnly: false, limit: 20 });
  const unreadCount = notifications?.filter(n => !n.readAt).length ?? 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Benachrichtigungen">
          {unreadCount > 0 ? <BellRing className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
          {unreadCount > 0 && (
            <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 min-w-5 text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <NotificationList notifications={notifications ?? []} />
      </PopoverContent>
    </Popover>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact for Phase 6 |
|--------------|------------------|--------------|-------------------|
| Direct scalar `changeType` columns on `TimetableLesson` | Overlay entity joined at view time | Phase 6 (this phase) | Rewrite `getView()`. Legacy columns stay as wire format until cleanup phase. |
| Web Push for notifications | In-app Socket.IO notification center; web push deferred to Phase 9 | Phase 6 D-09 | Build the `Notification` entity and `/notifications` gateway first; Phase 9 layers VAPID on top without schema changes. |
| BullMQ `repeat.cron` | `repeat.pattern` (BullMQ 5) | Phase 2 (STATE) | Any new retention wiring uses `pattern`, not `cron`. |
| `shadcn add` CLI | Hand-authored components in `apps/web/src/components/ui/` | Phase 5 decision | Same for `popover.tsx`. |
| Custom `grep`/fetch + `useState` for server data | TanStack Query with centralized socket invalidation | Phase 4 | New notification hooks follow `useTimetable` pattern. |

**Deprecated/outdated:**
- The `TimetableLesson.changeType` / `originalTeacherSurname` / `originalRoomName` columns — still wire format, slated for cleanup post-Phase 6. Do NOT add new columns of this shape in Phase 6.
- Writing to the scalar columns from any mutation path — the write path moves to `Substitution` exclusively.

## Open Questions

1. **Klassenvorstand vs generic teacher notification split**
   - What we know: D-11 says Klassenvorstand must be notified of substitution events affecting their class.
   - What's unclear: Should Klassenvorstand notifications use a different `NotificationType` (e.g., `KV_SUBSTITUTION_ANNOUNCED`) for better UI filtering, or share `SUBSTITUTION_CONFIRMED` with a `payload.recipient = 'kv'` flag?
   - Recommendation: Single `NotificationType` with a `payload.role` discriminator. Adding enum values is a schema migration; adding payload keys is not.

2. **RoomBooking `bookedBy` matching for hard filter**
   - What we know: `RoomBooking.bookedBy` is a `String` (keycloakUserId), not a teacherId FK.
   - What's unclear: The ranking hard filter needs to check if a candidate has an ad-hoc RoomBooking at the target slot. The join is `Teacher → Person.keycloakUserId → RoomBooking.bookedBy`.
   - Recommendation: Do the join. Document the assumption that all RoomBookings made by teachers will have `bookedBy = person.keycloakUserId`. If Phase 4 ever allows admin/schulleitung to book rooms on behalf of teachers, add a `teacherId` column to `RoomBooking` in a later phase.

3. **A/B week resolution for `Substitution.date`**
   - What we know: TimetableLesson has `weekType` (A/B/BOTH). Phase 3 used ISO week parity as the A/B resolver.
   - What's unclear: For a Substitution.date of 2026-05-14, which week type does it fall into? Phase 3 decision comment: "A/B week filtering via isWeekCompatible utility (not constraint) to avoid search space explosion". Need to confirm that utility is exported from the solver module for reuse.
   - Recommendation: Grep for `isWeekCompatible` in the codebase during planning. If it exists, import directly. If not, Wave 0 creates `apps/api/src/modules/timetable/ab-week.util.ts` with ISO-week-parity logic and a doc comment explaining the convention.

4. **Stillarbeit ClassBookEntry content defaults**
   - What we know: D-14 says Stillarbeit creates a ClassBookEntry with optional thema/lehrstoff defaulting to a "Stillarbeit" marker. Attendance is still tracked.
   - What's unclear: What's the exact marker string? "Stillarbeit" vs "Stillarbeit (Vertretung)" vs structured `{ kind: 'stillarbeit' }` in a JSON field?
   - Recommendation: Use the string `"Stillarbeit"` in `thema` with `lehrstoff = null`. UI renders Stillarbeit lessons with the string as the subject label. Planner confirms during UI breakdown.

5. **Cross-role access to HandoverNote attachments**
   - What we know: D-15 lists visible-to roles (substitute, absent teacher, Klassenvorstand, admin/Schulleitung).
   - What's unclear: CASL conditions — how do we express "visible only if the user is one of these four roles AND related to the substitution"? Phase 1 CASL supports conditional rules via `conditions: Json`.
   - Recommendation: Application-level check in `HandoverService.getAttachment()` rather than a complex CASL conditional. Keep CASL for coarse role gating (can:read handover) and do the row-level check imperatively.

## Environment Availability

Phase 6 introduces no new external tools, services, or runtimes. Every dependency is already installed and verified as working via Phases 1–5.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL | Schema migration, all data access | ✓ | 17.x (Docker Compose) | — |
| Redis | BullMQ retention cron reuse | ✓ | 7.x (Docker Compose) | — |
| Keycloak | JWT for notification gateway auth | ✓ | 26.5.x (Docker Compose) | — |
| Node.js | API + build | ✓ | 24 LTS | — |
| pnpm | Package management | ✓ | 10.33 | — |
| `@fastify/multipart` global registration | Handover attachment upload | ✓ | 9.4.0 (registered in `main.ts` with 5 MB limit) | — |
| `/timetable` Socket.IO gateway | D-24 event propagation | ✓ | existing | — |
| `excuse.service.ts` upload pipeline | D-16 copy target | ✓ | existing | — |
| `werteinheiten.util.ts` | Ranking hard filter + stats weighting | ✓ | existing | — |
| `retention.service.ts` BullMQ cron | D-19 retention extension | ✓ | existing | — |
| `@radix-ui/react-popover` | Notification bell dropdown | ✗ | — | **None needed** — install as the only new dependency. Fallback if install fails: hand-author a minimal Popover using existing `dialog.tsx` patterns. |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** `@radix-ui/react-popover` — fallback is hand-rolling a Popover from a controlled `<div>` + outside-click handler, but install is trivial.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (API) | Vitest 4 with SWC transform (`apps/api/vitest.config.ts`) |
| Framework (Web) | Vitest 4 + React Testing Library (`apps/web/vitest.config.ts`) |
| Config file (API) | `apps/api/vitest.config.ts` — include `src/**/*.spec.ts`, `test/**/*.spec.ts`, `test/**/*.e2e-spec.ts` |
| Config file (Web) | `apps/web/vitest.config.ts` |
| Quick run command (API) | `pnpm --filter @schoolflow/api test -- path/to/file.spec.ts -t "test name"` |
| Full suite command (API) | `pnpm --filter @schoolflow/api test` |
| Quick run command (Web) | `pnpm --filter @schoolflow/web test -- path/to/component.test.tsx` |
| Full suite command (Web) | `pnpm --filter @schoolflow/web test` |
| E2E (API) | Supertest patterns in `apps/api/test/**/*.e2e-spec.ts` (Phase 1 wiring) |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SUBST-01 | Create TeacherAbsence with reason + range | unit + e2e | `pnpm --filter @schoolflow/api test -- src/modules/substitution/absence/teacher-absence.service.spec.ts` | ❌ Wave 0 |
| SUBST-01 | Range expansion creates pending Substitutions for affected lessons only (skips non-school days, respects A/B weeks) | unit | same service spec | ❌ Wave 0 |
| SUBST-02 | Ranking: hard filters exclude unavailable / unqualified / over-loaded candidates | unit | `pnpm --filter @schoolflow/api test -- src/modules/substitution/substitution/ranking.service.spec.ts` | ❌ Wave 0 |
| SUBST-02 | Ranking: soft scoring formula produces deterministic order (tie-break by teacherId) | unit | same ranking spec | ❌ Wave 0 |
| SUBST-02 | Ranking: Werteinheiten headroom uses `calculateMaxTeachingHours` correctly | unit | same ranking spec | ❌ Wave 0 |
| SUBST-03 | Notification persisted on offer, emitted via `/notifications` socket to per-user room | unit + socket integration | `src/modules/substitution/notification/notification.service.spec.ts` + `notification.gateway.spec.ts` | ❌ Wave 0 |
| SUBST-03 | Accept/decline transitions Substitution.status and triggers downstream notifications (admin, KV, absent teacher) | unit | `src/modules/substitution/substitution/substitution.service.spec.ts` | ❌ Wave 0 |
| SUBST-03 | JWT validation on Socket.IO handshake rejects unauthorized userId | unit | `notification.gateway.spec.ts` | ❌ Wave 0 |
| SUBST-04 | HandoverNote create, update, unique constraint (one per substitution) | unit | `src/modules/substitution/handover/handover.service.spec.ts` | ❌ Wave 0 |
| SUBST-04 | HandoverAttachment: MIME + magic-byte validation, 5 MB limit, storage path structure | unit | same handover spec | ❌ Wave 0 |
| SUBST-05 | `timetable.service.getView()` returns overlay-aware results for a given date | unit | `apps/api/src/modules/timetable/timetable.service.spec.ts` (extend) | ✅ exists |
| SUBST-05 | Confirming a substitution emits `timetable:substitution` on `/timetable` gateway | integration | `timetable.gateway.spec.ts` (extend) | ✅ exists |
| SUBST-05 | Frontend `ChangeIndicator` renders SUBSTITUTED / ENTFALL / STILLARBEIT visually distinct | component | `apps/web/src/components/timetable/ChangeIndicator.test.tsx` (create) | ❌ Wave 0 |
| SUBST-06 | Substitution stats: count + Werteinheiten-weighted given hours for a teacher over a window | unit | `src/modules/substitution/substitution/substitution-stats.service.spec.ts` | ❌ Wave 0 |
| SUBST-06 | Default window = current semester; custom date range supported | unit | same stats spec | ❌ Wave 0 |
| SUBST-06 | Fairness delta vs school average computed correctly | unit | same stats spec | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `pnpm --filter @schoolflow/api test -- src/modules/substitution/**/*.spec.ts` (local scope)
- **Per wave merge:** `pnpm --filter @schoolflow/api test && pnpm --filter @schoolflow/web test`
- **Phase gate:** Full monorepo suite green (`pnpm -w test` if configured, else both filters in sequence) before `/gsd:verify-work`.

### Wave 0 Gaps

Create these stub files before any implementation plan begins. Each file exports `describe()` blocks with `it.todo()` or placeholder assertions (Phase 4 `it.todo()` pattern from STATE.md) mapped 1:1 to requirements above:

- [ ] `apps/api/src/modules/substitution/absence/teacher-absence.service.spec.ts` — covers SUBST-01 (absence CRUD + range expansion)
- [ ] `apps/api/src/modules/substitution/substitution/ranking.service.spec.ts` — covers SUBST-02 (hard filters + soft scoring + determinism)
- [ ] `apps/api/src/modules/substitution/substitution/substitution.service.spec.ts` — covers SUBST-03 partial (status transitions, ENTFALL/STILLARBEIT flow) + D-14 classbook linkage
- [ ] `apps/api/src/modules/substitution/substitution/substitution-stats.service.spec.ts` — covers SUBST-06 (fairness aggregation)
- [ ] `apps/api/src/modules/substitution/notification/notification.service.spec.ts` — covers SUBST-03 (notification persistence + recipient resolution)
- [ ] `apps/api/src/modules/substitution/notification/notification.gateway.spec.ts` — covers SUBST-03 (JWT handshake auth + per-user room delivery)
- [ ] `apps/api/src/modules/substitution/handover/handover.service.spec.ts` — covers SUBST-04 (note + attachment upload + retention tagging)
- [ ] `apps/api/src/modules/substitution/substitution.module.spec.ts` — bootstrap/DI test for the assembled module
- [ ] `apps/api/src/modules/timetable/__tests__/view-overlay.spec.ts` — covers SUBST-05 (overlay-aware `getView()` extensions; new file since `timetable.service.spec.ts` lives in `apps/api/src/modules/timetable/` not in `__tests__`)
- [ ] `apps/web/src/components/timetable/ChangeIndicator.test.tsx` — covers SUBST-05 (STILLARBEIT visual variant)
- [ ] `apps/web/src/components/notifications/NotificationBell.test.tsx` — covers SUBST-03 (bell badge + dropdown render; mocks useNotifications hook)
- [ ] `apps/web/src/hooks/useNotificationSocket.test.ts` — covers SUBST-03 (Socket.IO client subscription + TanStack Query invalidation on `notification:new`)

Framework install: **None needed.** Vitest 4, Testing Library, Supertest, and SWC transform are all already installed and in use across the monorepo (Phase 1–5). Confirmed via `apps/api/package.json` and `apps/web/package.json`.

## Sources

### Primary (HIGH confidence)

- **In-repo files** (verified by direct read during research):
  - `apps/api/prisma/schema.prisma` — TimetableLesson, Teacher, AvailabilityRule, TeacherSubject, TeachingReduction, SchoolClass, ClassBookEntry, Room, RoomBooking, AbsenceExcuse, ExcuseAttachment models
  - `apps/api/src/modules/timetable/timetable-events.gateway.ts` — `/timetable` Socket.IO gateway with `timetable:substitution` event
  - `apps/api/src/modules/timetable/timetable.service.ts` — `getView()` method reading scalar change columns
  - `apps/api/src/modules/classbook/excuse.service.ts` + `excuse.controller.ts` — `@fastify/multipart` upload pipeline, MIME + magic byte validation
  - `apps/api/src/modules/classbook/classbook-events.gateway.ts` — per-domain gateway namespace pattern
  - `apps/api/src/modules/classbook/statistics.service.ts` — Austrian semester date range + aggregation query pattern
  - `apps/api/src/modules/teacher/werteinheiten.util.ts` — Pure-function Werteinheiten calculator
  - `apps/api/src/modules/dsgvo/retention/retention.service.ts` + `apps/api/src/modules/dsgvo/dsgvo.module.ts` — `DEFAULT_RETENTION_DAYS` map + BullMQ `repeat.pattern: '0 2 * * *'` cron registration
  - `apps/api/src/modules/auth/casl/casl-ability.factory.ts` + `auth/decorators/check-permissions.decorator.ts` — CASL + decorator pattern
  - `apps/api/src/main.ts` — global `@fastify/multipart` registration with 5 MB limit
  - `apps/api/package.json` — dependency versions
  - `apps/api/vitest.config.ts` — test config
  - `apps/web/package.json` — frontend dependency versions; confirmed absence of `@radix-ui/react-popover`
  - `apps/web/src/hooks/useSocket.ts` — `useTimetableSocket` centralized listener pattern
  - `apps/web/src/components/layout/AppSidebar.tsx` — role-based navigation pattern
  - `apps/api/prisma/seed.ts` — role names (`admin`, `schulleitung`, `lehrer`, `eltern`, `schueler`)

- **Project planning artifacts**:
  - `CLAUDE.md` — authoritative technology stack (NestJS 11, Prisma 7.6, PostgreSQL 17, Socket.IO 4.8, BullMQ 5, React 19, Tailwind 4)
  - `.planning/REQUIREMENTS.md` — SUBST-01 through SUBST-06 acceptance criteria
  - `.planning/ROADMAP.md` — Phase 6 goal, success criteria, dependencies
  - `.planning/STATE.md` — historical decisions including Phase 2 BullMQ `repeat.pattern` fix, Phase 4 Socket.IO `IoAdapter` Fastify fix, Phase 5 shadcn CLI incompatibility
  - `.planning/phases/06-substitution-planning/06-CONTEXT.md` — user decisions (D-01 through D-24), canonical refs, deferred scope
  - `.planning/phases/02-school-data-model-dsgvo/02-CONTEXT.md` — Werteinheiten model, retention pattern
  - `.planning/phases/04-timetable-viewing-editing-room-management/04-CONTEXT.md` — `/timetable` gateway + change indicator pattern
  - `.planning/phases/05-digital-class-book/05-CONTEXT.md` — excuse upload pipeline, klassenvorstandId

### Secondary (MEDIUM confidence)

- Socket.IO NestJS notification patterns — [NestJS WebSocket Gateways](https://docs.nestjs.com/websockets/gateways) (official docs) cross-referenced with the in-repo `/timetable` and `/classbook` gateway implementations. The per-user room (`user:${userId}`) pattern is consistent with both Socket.IO 4.x documentation and multiple community implementations. Confirmed by comparing the existing in-repo gateway structure.
- BullMQ 5 `repeat.pattern` vs `repeat.cron` — Verified in STATE.md as a previously-encountered project issue; treated as HIGH for repo-specific application.

### Tertiary (LOW confidence — flagged)

- Exact ranking weight defaults (`0.45 / 0.30 / 0.20 / 0.05`) — no canonical academic or industrial reference exists for Austrian Vertretungsplanung ranking weights. These are researched defaults based on D-05's prioritization language ("highest weight: subject qualification", "small bonus: Klassenvorstand"). **Flag for validation:** expose as a single constant; plan to revisit after real-world use exposes whether the admin overrides are clustered.
- A/B week resolution via ISO-week parity — Phase 3 STATE entry confirms `isWeekCompatible` utility exists but does not export the algorithm. **Flag for planning:** grep-verify the implementation during plan creation; if ISO-week parity is not the actual resolver, the range-expansion service will miscalculate which lessons to substitute.

## Metadata

**Confidence breakdown:**
- Standard stack: **HIGH** — all dependencies verified in `package.json` files; no new libraries except `@radix-ui/react-popover`
- Architecture patterns: **HIGH** — every pattern has a concrete in-repo precedent (Phase 4 gateway, Phase 5 upload, Phase 2 retention)
- Ranking algorithm: **MEDIUM** — soft-factor list is directly from D-05, weight defaults are researched-reasonable but not empirically validated
- Pitfalls: **HIGH** — derived from STATE.md historical issues (Pitfalls 4, 6, 7, 10), known Socket.IO security gaps (Pitfall 3), and logical analysis of the overlay model (Pitfalls 1, 2, 9)
- Cross-phase touchpoints: **HIGH** — ClassBookEntry substitute linkage (D-14), `getView()` rewrite (D-13), retention extension (D-19) all mapped to specific files
- UI component availability: **HIGH** — hand-verified that Popover/Calendar/Table are absent; Badge/Dialog/Tabs are present

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (30 days for stable stack; refresh if Phase 6 planning stalls past this date or if any major dependency upgrade happens)
