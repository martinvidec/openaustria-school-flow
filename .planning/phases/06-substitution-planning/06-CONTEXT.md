# Phase 6: Substitution Planning - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

When a teacher is absent, admin records the absence, the system suggests ranked substitute teachers (availability + qualification + workload fairness), notifies candidates via an in-app notification center, lets the absent teacher leave handover notes (with attachments) per lesson, and propagates all substitution / cancellation / Stillarbeit changes in real time to every timetable view. Also tracks per-teacher substitution statistics (count + Werteinheiten-weighted hours) for fairness monitoring. Covers SUBST-01 through SUBST-06.

Full web-push / PWA / service-worker infrastructure is explicitly out of scope -- that is Phase 9 (MOBILE-02). Phase 6 ships an in-app notification center that Phase 9 later layers web-push on top of.

</domain>

<decisions>
## Implementation Decisions

### Absence Recording (SUBST-01)
- **D-01:** New `TeacherAbsence` Prisma entity -- fields: `teacherId`, `dateFrom`, `dateTo`, optional `periodFrom`/`periodTo` (for same-day partial absences), `reason`, optional `note`, `createdBy`, `status`, `createdAt`, `updatedAt`. Decouples the "why/when" from the "which lessons" so planned multi-day absences and statistics stay clean.
- **D-02:** Range-based recording -- admin picks teacher + date range (optional start/end period within the day). System auto-expands the range against the active TimetableRun and creates one pending `Substitution` row per affected lesson (respecting A/B weeks + weekly recurrence + Stundenplan holidays).
- **D-03:** Fixed Austrian reason taxonomy enum `AbsenceReason`: `KRANK`, `FORTBILDUNG`, `DIENSTREISE`, `SCHULVERANSTALTUNG`, `ARZTTERMIN`, `SONSTIGES` + optional free-text `note`. Required for DACH school reporting; enum format enables fairness / reason statistics.
- **D-04:** Three first-class lesson outcomes per affected lesson: `SUBSTITUTED` (covered by another teacher), `ENTFALL` (lesson cancelled -- free period for the class), or `STILLARBEIT` (supervised study hall -- any available teacher supervises, no subject taught). Admin explicitly picks. Entfall and Stillarbeit are not error states.

### Substitute Ranking & Offer Flow (SUBST-02, SUBST-03)
- **D-05:** Deterministic scored ranking. Hard filters: candidate is free in that slot (no existing TimetableLesson, Substitution, or RoomBooking), not blocked by their `AvailabilityRule`s, has Werteinheiten headroom vs `werteinheitenTarget` from Phase 2. Soft factors (weighted): subject qualification match via `TeacherSubject` (highest weight), fairness (fewer substitutions received in the current window -> higher score), workload headroom (more unused Werteinheiten -> higher score), Klassenvorstand of the affected class (small bonus). Admin sees the full sorted list with a score breakdown per candidate.
- **D-06:** Admin assigns one candidate at a time. Candidate receives a notification (D-09) and can accept or decline. On decline the admin is notified and picks another candidate from the same ranked list. Matches Austrian Vertretungsplanung practice -- admin keeps authority, teacher keeps a genuine veto.
- **D-07:** No automatic timeout or auto-escalation. If a candidate does not respond, admin sees the pending state in the substitution dashboard and reassigns manually. `ENTFALL` and `STILLARBEIT` (D-04) are the explicit fallbacks if no candidate works.
- **D-08:** Per-lesson assignment. A single `TeacherAbsence` can produce different outcomes per affected lesson (Lesson 1 -> Teacher A, Lesson 2 -> Entfall, Lesson 3 -> Teacher B). The solver / ranking runs independently per lesson.

### Notification Delivery (SUBST-03)
- **D-09:** **In-app notification center** via Socket.IO is the Phase 6 delivery channel. Phase 9 (MOBILE-02) later adds web-push on top of the same `Notification` entity -- no refactor needed. No SMTP, no web-push, no service worker in Phase 6. A new Socket.IO namespace `/notifications` (or a sub-room of `/timetable`) pushes new notifications to connected clients in realtime; a bell icon in the app header shows unread count; unread list is persisted server-side so teachers see offers when they next log in.
- **D-10:** Generic `Notification` Prisma entity -- fields: `id`, `userId`, `type` (enum: `SUBSTITUTION_OFFER`, `SUBSTITUTION_CONFIRMED`, `SUBSTITUTION_DECLINED`, `ABSENCE_RECORDED`, `LESSON_CANCELLED`, `STILLARBEIT_ASSIGNED`, ...), `title`, `body`, `payload` (JSON, e.g., `{ substitutionId, lessonId, date }`), `readAt`, `createdAt`. Designed to be reused by Phase 7 Communication and Phase 9 Push without schema changes.
- **D-11:** Notification recipients for substitution events: (a) the offered substitute teacher, (b) the Klassenvorstand of the affected class, (c) the absent teacher, (d) admin / Schulleitung. Each event type has a defined recipient set (documented in planning).

### Lesson Mutation Model (SUBST-05)
- **D-12:** **Overlay entity** `Substitution` layered on top of `TimetableLesson`. Fields: `id`, `lessonId` (FK to TimetableLesson), `absenceId` (FK to TeacherAbsence), `date` (concrete calendar date the substitution applies to -- NOT the recurring weekly slot), `type` (`SUBSTITUTED` / `ENTFALL` / `STILLARBEIT`), `substituteTeacherId?`, `originalTeacherId`, `substituteRoomId?` (for room changes), `status` (`PENDING` / `OFFERED` / `CONFIRMED` / `DECLINED`), `offeredAt?`, `respondedAt?`, `createdBy`, `createdAt`, `updatedAt`. Original `TimetableLesson` row is never mutated by a substitution -- the recurring weekly plan stays intact and only the overlay is date-scoped.
- **D-13:** View layer composes the final timetable cell per date by joining `Substitution` with `TimetableLesson` on `(lessonId, date)`. The timetable view API already returns `changeType`, `originalTeacherSurname`, `originalRoomName` (Phase 4 D-11 groundwork) -- planner should **populate those fields from the overlay at query time**, keeping them as the wire format for the frontend ChangeIndicator component. The scalar columns on `TimetableLesson` itself become legacy placeholders after Phase 6 -- planner should note this for future cleanup but does not need to remove them as part of Phase 6.
- **D-14:** ClassBookEntry reuses the existing Phase 5 model. When the substitute teaches the lesson, the `ClassBookEntry` for that date uses the substitute's `teacherId` (not the original teacher's). A new nullable `substitutionId` FK on `ClassBookEntry` links back to the overlay so the classbook view can render "Vertretung: Hr. Mayer" (and the lehrstoff is authored by the substitute). For `ENTFALL` no ClassBookEntry is created. For `STILLARBEIT` a ClassBookEntry is created (students are still present, attendance is still tracked), but `thema/lehrstoff/hausaufgabe` are optional and default to a "Stillarbeit" marker.

### Handover Notes (SUBST-04)
- **D-15:** Dedicated `HandoverNote` Prisma entity (not a field on Substitution). Fields: `id`, `substitutionId` (FK, unique -- one note per substitution, D-20), `authorId` (absent teacher), `content` (text), `createdAt`, `updatedAt`. Related entity `HandoverAttachment`: `id`, `handoverNoteId`, `filename`, `mimeType`, `sizeBytes`, `storagePath`, `createdAt`. Visible to: assigned substitute, absent teacher, Klassenvorstand of affected class, admin / Schulleitung.
- **D-16:** File attachments supported in Phase 6 by reusing the Phase 5 `@fastify/multipart` excuse upload pipeline. Allowed MIME types / size limits mirror Phase 5 excuse attachments (PDF, JPG, PNG, max 5 MB per file). Storage layer is whatever the existing excuse upload uses -- do not introduce a second storage mechanism. Zero duplication: if Phase 5 shipped with a filesystem store, Phase 6 writes to the same tree under a `handover/` subdirectory; if Phase 5 uses a service abstraction, Phase 6 reuses it.
- **D-19:** HandoverNote + HandoverAttachment retention = 1 school year (≈ 365 days) enforced by the existing Phase 2 BullMQ retention cron (Phase 2 D-15 pattern). Materials are instructional, not legal records; keeping them one year lets teachers reference last year's handover for a recurring absence. Admin can trigger earlier deletion via the standard DSGVO deletion pathway if needed. Retention policy added alongside existing per-category defaults.
- **D-20:** Exactly one `HandoverNote` per `Substitution` (unique index on `substitutionId`), with 0..N `HandoverAttachment`s. Keeps the UI model clean ("this is the handover for this lesson") and avoids fragmented multi-note handovers.

### Fairness Statistics (SUBST-06)
- **D-17:** Metrics tracked per teacher: (a) substitutions **given** (count + Werteinheiten-weighted hours, using the Phase 2 Werteinheiten factor so a Doppelstunde counts for two periods), (b) substitutions **received** while absent (count), (c) absolute count of Entfall and Stillarbeit outcomes for that teacher's lessons, (d) a **fairness delta** vs the school average for substitutions given within the selected window. Drives an admin dashboard showing who is carrying disproportionate substitution load.
- **D-18:** Aggregation window is **configurable**: current week, current month, current semester, current school year, or custom date range. Default view = **current semester** to align with Austrian Semesterbewertung rhythm. Stored as derived queries over the `Substitution` overlay -- no denormalised statistics table in Phase 6 (Postgres handles the aggregation fine at school scale).

### Frontend Surface
- **D-21:** New admin page `/admin/substitutions` with three panels: (1) "Neue Abwesenheit erfassen" form (SUBST-01), (2) "Offene Vertretungen" list of pending / needs-assignment substitutions with the scored candidate list inline, (3) "Statistik" panel (SUBST-06) with teacher-level fairness table.
- **D-22:** Substitute teacher's personal view: new section on the timetable page (or a dedicated "Vertretungen" tab on the existing Lehrer sidebar) showing pending offers with Accept / Decline buttons and the HandoverNote inline once it's linked. Incoming notifications deep-link here.
- **D-23:** Notification center UI: bell icon in the app header (visible to all authenticated roles), unread badge, dropdown list with last N notifications, click routes to the relevant page (substitution detail, classbook entry, etc.). Reuses existing shadcn/ui Popover + Badge components.
- **D-24:** Timetable cell visual change indicators from Phase 4 D-11 are the same: orange border = substitution (strikethrough original teacher + new below), red border = Entfall, blue border = room change. Stillarbeit reuses the substitution visual with a "Stillarbeit" label in place of the subject -- planner should confirm the exact pattern during UI planning. All propagation runs on the existing `/timetable` Socket.IO namespace + events (D-12 Phase 4).

### Claude's Discretion
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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 6 requirements
- `.planning/REQUIREMENTS.md` -- SUBST-01 through SUBST-06 acceptance criteria
- `.planning/ROADMAP.md` -- Phase 6 goal, success criteria, dependency on Phase 5

### Prior phase context (decisions that constrain Phase 6)
- `.planning/phases/02-school-data-model-dsgvo/02-CONTEXT.md` -- D-01 AvailabilityRule types, D-02 Werteinheiten/Lehrverpflichtung model (used for fairness statistics D-17), D-05 TeacherSubject qualifications (used for ranking D-05), D-13 DSGVO anonymize-and-retain policy, D-15 per-category retention + BullMQ daily cron (D-19 reuses this pattern), D-16/D-17 application-level PII encryption
- `.planning/phases/03-timetable-solver-engine/03-CONTEXT.md` -- D-07 A/B week mode (affects range expansion in D-02), D-11 3-run retention, D-12-D-15 room model (for substitution room swaps)
- `.planning/phases/04-timetable-viewing-editing-room-management/04-CONTEXT.md` -- D-09 edit-in-place model for TimetableLesson (D-12 overlay deliberately departs from this for date-scoped substitutions), D-10 persistent edit history (parallel audit trail concept for Substitution), D-11 timetable cell change indicators (reused in D-24), D-12 Socket.IO `/timetable` namespace + events (reused in D-9/D-24), D-16 WebSocket propagation for room changes
- `.planning/phases/05-digital-class-book/05-CONTEXT.md` -- D-13 excuse attachment upload pipeline @fastify/multipart (reused by HandoverNote D-16), D-02 lesson detail page tabs (substitute reuses classbook UI), whole classbook data model (D-14 ClassBookEntry reuse with substitutionId)
- `.planning/phases/01-project-scaffolding-auth/01-CONTEXT.md` -- RBAC+ACL + CheckPermissions decorator (new CASL abilities for substitution/absence/notification/handover), audit interceptor (logs all substitution mutations automatically), English API / German UI convention, RFC 9457 errors, pagination DTO

### Project foundation
- `.planning/PROJECT.md` -- Core value, Austrian school focus, Lehrverpflichtung model, DSGVO-from-day-1 principle
- `CLAUDE.md` -- Full technology stack: NestJS 11, Prisma 7, PostgreSQL 17, Socket.IO 4, BullMQ 5, React 19, TanStack Query 5, shadcn/ui + Tailwind 4, @fastify/multipart

### Existing codebase (Phase 6 builds on)
- `apps/api/prisma/schema.prisma` -- TimetableRun, TimetableLesson (with `changeType`, `originalTeacherSurname`, `originalRoomName` fields placeholder from Phase 4), Teacher, TeacherSubject, AvailabilityRule, TeachingReduction, SchoolClass (with `klassenvorstandId`), ClassBookEntry, AttendanceRecord, Room, RoomBooking, Resource, ResourceBooking
- `apps/api/src/modules/timetable/timetable-events.gateway.ts` -- Socket.IO `/timetable` namespace with `timetable:changed` / `timetable:cancelled` / `timetable:room-swap` / `timetable:substitution` events already defined; school-scoped rooms (`school:{schoolId}`); websocket + polling transports (reused unchanged)
- `apps/api/src/modules/timetable/timetable-edit.service.ts` -- manual edit pattern for TimetableLesson (reference for audit/history approach, not the mutation model used here)
- `apps/api/src/modules/teacher/werteinheiten.util.ts` -- pure-function Werteinheiten calculator (used by ranking D-05 for workload headroom + fairness D-17 for weighted hours)
- `apps/api/src/modules/classbook/excuse.service.ts` + `excuse.controller.ts` -- @fastify/multipart upload pipeline pattern (reused by HandoverNote D-16)
- `apps/api/src/modules/dsgvo/retention/retention.service.ts` -- BullMQ daily retention cron (extend with HandoverNote 1-year policy D-19)
- `apps/api/src/modules/classbook/statistics.service.ts` -- statistics aggregation pattern (reference for fairness statistics D-17/D-18 query style)
- `apps/api/src/modules/timetable/solver-input.service.ts` -- TimetableLesson aggregation (reference for view-layer overlay join D-13)
- `apps/web/src/components/layout/AppSidebar.tsx` -- role-based navigation (add "Vertretungen" entry for Lehrer + "Vertretungsplanung" entry for Admin/Schulleitung)
- `apps/web/src/components/timetable/ChangeIndicator.tsx` + `TimetableCell.tsx` -- Phase 4 change indicator components (reused by D-24)
- `apps/web/src/hooks/useSocket.ts` -- Socket.IO client pattern (extend for notification subscriptions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`TimetableLesson.changeType` / `originalTeacherSurname` / `originalRoomName`** -- already on the schema from Phase 4 as the wire format for the frontend `ChangeIndicator`. Phase 6 populates them from the Substitution overlay at query time (D-13) rather than writing to them as storage.
- **`timetable-events.gateway.ts`** -- `/timetable` Socket.IO namespace with `timetable:substitution` event already defined. Wire Substitution creation / confirmation to emit this event (no gateway changes needed for the event shape; may extend payload).
- **`werteinheiten.util.ts`** -- pure function for teacher workload math. Feeds into both ranking D-05 (workload headroom) and fairness D-17 (weighted given hours).
- **`AvailabilityRule` + `TeacherSubject`** -- primary inputs to the ranking hard filters (D-05). No new availability model needed.
- **`excuse.service.ts` upload pipeline** -- @fastify/multipart + storage / retention pattern. HandoverAttachment reuses this end-to-end (D-16).
- **`retention.service.ts` BullMQ daily cron** -- add a HandoverNote policy (D-19) as another retention category.
- **`ClassBookEntry`** -- reused with `teacherId = substitute` and new optional `substitutionId` FK (D-14). No new classbook model needed.
- **`AppSidebar.tsx` role-based nav** -- add `Vertretungen` / `Vertretungsplanung` entries behind the right CASL abilities.
- **`ChangeIndicator.tsx` + `TimetableCell.tsx`** -- substitution visual already supported via Phase 4 D-11 color-coding; extend with Stillarbeit variant (D-24).

### Established Patterns
- NestJS module-per-domain (one `SubstitutionModule` encompassing absence, substitution, handover, notification -- or split if it grows large; Claude's discretion)
- Prisma schema-first with UUID PKs, `@@map()` snake_case, `createdAt`/`updatedAt`, `onDelete: Cascade` where appropriate
- Global `APP_GUARD` + `@CheckPermissions` decorator for new CASL abilities on every endpoint
- Socket.IO namespaces with school-scoped rooms (`school:{schoolId}`), websocket + polling transports for school networks behind proxies
- `AuditInterceptor` global -- every mutation on new entities is logged automatically
- BullMQ for async jobs (retention cron, plus optional notification cleanup / dedup if needed)
- DTO definite assignment assertions (`!`) for TypeScript 6.0 strict mode
- RFC 9457 problem-detail errors, pagination DTO on list endpoints
- English API / German UI (Phase 1 D-15): entity/field names in English, enum values like `KRANK` match Austrian terms, UI strings in German

### Integration Points
- **Timetable view API** must become absence-aware: when returning lessons for a date, join `Substitution` and populate the view DTO's changeType/originalTeacher/originalRoom fields from the overlay.
- **ClassBookEntry creation** must check for an active Substitution on that date -- if `SUBSTITUTED`, use substitute's teacherId; if `STILLARBEIT`, create with Stillarbeit marker; if `ENTFALL`, skip creation entirely.
- **Notification gateway** is new territory -- new Socket.IO namespace (or sub-event on `/timetable`). Frontend bell icon must subscribe on login and update unread count in realtime.
- **Fairness statistics endpoint** runs aggregation queries over `Substitution` filtered by window -- reuse statistics aggregation patterns from Phase 5 `statistics.service.ts`.
- **Handover file upload** reuses the Phase 5 excuse upload controller pattern directly -- same multipart handler, same storage root with `handover/` subpath.
- **Retention cron** gains a new category for HandoverNote (1 year) alongside existing per-category defaults.
- **No new infra containers / services** -- everything runs on existing NestJS + Postgres + Redis + Socket.IO. Web-push / VAPID / service worker are explicitly Phase 9.

</code_context>

<specifics>
## Specific Ideas

- Admin retains authority in Vertretungsplanung -- ranking is a decision *aid*, not an automation. Matches Austrian school politics where "who gets which substitution" is sensitive.
- Austrian reason taxonomy (KRANK / FORTBILDUNG / DIENSTREISE / SCHULVERANSTALTUNG / ARZTTERMIN / SONSTIGES) is the real vocabulary schools use, and drives meaningful statistics.
- Stillarbeit is a first-class outcome, not a workaround. Austrian schools routinely assign supervised study hall when no qualified substitute is free -- the system must acknowledge this explicitly.
- The `Substitution` overlay is date-scoped, not recurrence-scoped. The weekly TimetableLesson represents "this is the plan", the dated Substitution represents "this is what happened on 2026-05-14". Loose coupling on purpose.
- `TimetableLesson.changeType` fields are wire format, not storage -- view layer populates them from the overlay. Planner should flag them for long-term cleanup but leave them in place during Phase 6.
- Werteinheiten-weighted fairness hours (not raw counts) because a Doppelstunde substitution is twice the load of a single period -- aligns with how Austrian teachers actually think about workload.
- In-app notification center via Socket.IO cleanly separates "delivery channel" from "notification content" so Phase 9 web-push slots in without a refactor. One `Notification` table, multiple channels over time.
- HandoverNote is dedicated (not a field on Substitution) because the user wants attachments and retention policy in Phase 6, and Phase 5's excuse upload pipeline is the right reuse target.
- One HandoverNote per Substitution with multiple attachments -- single coherent message, many materials.

</specifics>

<deferred>
## Deferred Ideas

- **Web push / VAPID / service worker / PWA** -- Phase 9 (MOBILE-02). Phase 6 delivers via in-app Socket.IO notification center only. Phase 9 layers web-push on top of the same `Notification` entity (D-10).
- **Email notification fallback** -- no SMTP in the stack; deferred. If desired, best fit is Phase 7 (Communication) alongside messaging email digests.
- **Cleanup of legacy `TimetableLesson.changeType` / `originalTeacherSurname` / `originalRoomName` columns** -- leave in place during Phase 6 (they remain the wire format). Schedule removal or repurposing as a small follow-up after Phase 6 ships, or fold into Phase 9 production hardening.
- **Full multi-school Vertretungsplanung** -- Wanderlehrer / shared teachers flagged in Phase 2 (D-04). Cross-school substitution is out of scope here.
- **Re-solving the timetable to fill substitutions with Timefold** -- not in scope; Phase 6 uses a lightweight scoring service, not the full constraint solver. Possible future optimization if schools hit scale.
- **Automatic attachment virus scanning** -- not introduced in Phase 6. HandoverAttachment reuses whatever Phase 5 excuses do.
- **Substitute's ability to propose a swap with another teacher** -- not in scope. Declines go back to admin.
- **Analytics dashboard beyond the four fairness metrics in D-17** -- per-subject breakdowns, short-notice bonus, time-series charts are explicit feature creep; defer.
- **Denormalised fairness statistics table** -- not needed at school scale; aggregation queries over Substitution are fine. Revisit if performance becomes an issue.

</deferred>

---

*Phase: 06-substitution-planning*
*Context gathered: 2026-04-04*
