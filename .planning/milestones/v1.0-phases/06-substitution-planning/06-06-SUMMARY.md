---
phase: 06-substitution-planning
plan: 06
subsystem: frontend
status: awaiting_human_verification
tags: [react, radix-ui, popover, socket-io, notifications, tanstack-query, tanstack-router, shadcn, tdd, lehrer-view, handover]

# Dependency graph
requires:
  - phase: 06-substitution-planning
    plan: 01
    provides: Wave 0 it.todo stubs for ChangeIndicator + NotificationBell + useNotificationSocket, notification/substitution shared DTOs
  - phase: 06-substitution-planning
    plan: 02
    provides: SubstitutionService lifecycle (respond endpoint consumed by useRespondToOffer)
  - phase: 06-substitution-planning
    plan: 03
    provides: NotificationService + NotificationGateway + HandoverService + HandoverController endpoints consumed by the new hooks
  - phase: 06-substitution-planning
    plan: 04
    provides: SubstitutionModule final assembly, NotificationController at /me/notifications, overlay-aware getView() with 'stillarbeit' wire value
  - phase: 06-substitution-planning
    plan: 05
    provides: Admin /admin/substitutions page + AbsenceForm/AbsenceList/CandidateList/etc. (runs in parallel; consumed indirectly via shared sidebar and route tree)
  - phase: 05-digital-class-book
    provides: FileUploadField component reused verbatim by HandoverNoteEditor (D-16)
  - phase: 04-timetable-viewing-editing
    provides: ChangeIndicator container (extended here with new 'stillarbeit' variant)
provides:
  - @radix-ui/react-popover installed + hand-authored shadcn wrapper at components/ui/popover.tsx
  - ChangeIndicator extended with 'stillarbeit' variant reusing the substitution orange palette + optional supervisingTeacher prop rendering "Aufsicht: {name}"
  - createNotificationSocket / disconnectNotificationSocket / getNotificationSocket factories for the /notifications namespace with JWT handshake auth + polling fallback
  - useNotifications TanStack Query hook (list, markRead, markAllRead) against /me/notifications
  - useNotificationSocket hook (single mount per auth session in _authenticated layout) with toast + cache-invalidation handlers for notification:new and notification:badge
  - NotificationBell + NotificationList shadcn Popover UI with "99+" unread cap, "Neu" badge, "Alle als gelesen markieren", empty state, German relative-time formatter, deep-link routing
  - useOfferedSubstitutions hook (client-side filter of existing school-scoped substitutions endpoint to { status: OFFERED, substituteTeacherId: currentUser })
  - useRespondToOffer mutation (PATCH :id/respond) with full substitutions query invalidation
  - useHandoverNote / useCreateOrUpdateHandoverNote / useUploadHandoverAttachment hooks with FormData multipart upload path
  - HandoverNoteView read-only card + HandoverNoteEditor Dialog reusing Phase 5 FileUploadField
  - SubstituteOfferCard with 44px min touch targets, Accept/Decline dialogs, inline HandoverNoteView
  - /teacher/substitutions route ("Meine Vertretungen") + AppSidebar lehrer entry with UserCheck icon
  - AppHeader + _authenticated layout wired with NotificationBell and useNotificationSocket (single mount)
  - Shared TimetableViewLesson type: changeType union extended with 'stillarbeit' literal
affects: [07-*, all Phase 6+ frontend work that consumes the notification center]

# Tech tracking
tech-stack:
  added:
    - "@radix-ui/react-popover@^1.1.15 (Popover primitive for the notification dropdown)"
  patterns:
    - "Single-mount socket lifecycle: useNotificationSocket is invoked exactly once in _authenticated layout (never in page components) so /notifications events are not duplicated by concurrent client sockets. Per 06-RESEARCH Pattern 4 anti-pattern guidance."
    - "Client-side filter over admin endpoint: useOfferedSubstitutions reuses the existing /schools/:schoolId/substitutions list endpoint and filters client-side to (status=OFFERED, substituteTeacherId=currentUser). Avoids backend change; extension point documented for future ?mine=true query param."
    - "Hand-authored shadcn wrapper via radix primitive: Popover follows the Phase 5 Textarea/Input/Label/ScrollArea convention of installing the @radix-ui primitive directly via pnpm and hand-authoring the components/ui/ wrapper using shadcn canonical source (shadcn CLI incompatible with current components.json)."
    - "JWT in Socket.IO handshake auth (not query string): createNotificationSocket passes the Keycloak token via `auth: { token: \"Bearer ${jwt}\" }` so tokens never land in server access logs. Mirrors Phase 3 + Phase 4 socket factory conventions."
    - "Deep-link routing via notification.type switch: NotificationList.resolveTarget() maps SUBSTITUTION_* → /teacher/substitutions, ABSENCE_RECORDED → /admin/substitutions. Keeps routing decisions co-located with the component that renders the row."
    - "FormData multipart upload via apiFetch (Pitfall 5 reuse): useUploadHandoverAttachment builds a FormData body and passes it through apiFetch, which detects FormData via instanceof and skips Content-Type auto-set so the browser populates the multipart boundary. Identical to the Phase 5 excuse attachment upload pathway."

key-files:
  created:
    - apps/web/src/components/ui/popover.tsx
    - apps/web/src/hooks/useNotifications.ts
    - apps/web/src/hooks/useNotificationSocket.ts
    - apps/web/src/hooks/useOfferedSubstitutions.ts
    - apps/web/src/hooks/useHandoverNote.ts
    - apps/web/src/components/notifications/NotificationBell.tsx
    - apps/web/src/components/notifications/NotificationList.tsx
    - apps/web/src/components/substitution/SubstituteOfferCard.tsx
    - apps/web/src/components/substitution/HandoverNoteEditor.tsx
    - apps/web/src/components/substitution/HandoverNoteView.tsx
    - apps/web/src/routes/_authenticated/teacher/substitutions.tsx
  modified:
    - apps/web/src/components/timetable/ChangeIndicator.tsx
    - apps/web/src/components/timetable/__tests__/ChangeIndicator.test.tsx
    - apps/web/src/hooks/__tests__/useNotificationSocket.test.ts
    - apps/web/src/components/notifications/__tests__/NotificationBell.test.tsx
    - apps/web/src/lib/socket.ts
    - apps/web/src/components/layout/AppHeader.tsx
    - apps/web/src/components/layout/AppSidebar.tsx
    - apps/web/src/routes/_authenticated.tsx
    - apps/web/src/routeTree.gen.ts
    - apps/web/package.json
    - packages/shared/src/types/timetable.ts

key-decisions:
  - "[Phase 06]: ChangeIndicator stillarbeit variant shares the substitution orange palette per 06-UI-SPEC D-11 rationale — Stillarbeit is a class of substitution (D-04), so inventing a new color would violate the 60/30/10 contract. Differentiation happens via the 'Stillarbeit' text label + optional 'Aufsicht: {name}' line."
  - "[Phase 06]: useNotificationSocket mounted exactly once at the _authenticated layout level — never in page components. Per 06-RESEARCH Pattern 4 anti-pattern guidance, multiple mounts would open concurrent sockets and duplicate every notification event."
  - "[Phase 06]: useOfferedSubstitutions filters the admin-facing /schools/:schoolId/substitutions endpoint client-side instead of adding a backend ?mine=true query param. The per-teacher subset is bounded by the number of open substitutions for the whole school (typically <50), so an O(n) filter is cheaper than a new endpoint + DTO. The hook comment documents the extension point for a future backend change if the result set grows."
  - "[Phase 06]: JWT accessor for useNotificationSocket is keycloak.token (read directly from the keycloak-js singleton in _authenticated.tsx) because useAuth does not expose the raw token — it only surfaces parsed claims. Keycloak auto-refreshes the token every 30s via apiFetch's updateToken call, and the useEffect dep array re-binds the socket only when the first-load token transitions from null to present."
  - "[Phase 06]: Popover installed via pnpm + hand-authored shadcn wrapper (not CLI) — follows the Phase 5 precedent for Textarea/Input/Label/ScrollArea (shadcn CLI is incompatible with the current components.json format). This keeps the installation path deterministic and avoids the \"Plan X installed component Y, Plan Z can't reproduce\" pattern."
  - "[Phase 06]: SubstituteOfferCard Accept/Decline buttons have min-h-[44px] per 06-UI-SPEC D-22 and BOOK-07 touch-target principle inherited from Phase 5. On mobile the button row stacks vertically (flex-wrap sm:flex-nowrap) so each button gets the full width + 44px height."
  - "[Phase 06]: HandoverNoteEditor reuses Phase 5 FileUploadField verbatim (not a forked copy) per D-16. Magic-byte + size validation lives on the server side (HandoverService); the client component only enforces type/size hints for UX. Single source of truth for the attachment upload pipeline."
  - "[Phase 06]: NotificationList deep-link routing uses a switch on notification.type rather than a server-provided targetUrl. Rationale: the notification payload schema is narrow (type + payload dict), and routing decisions are a frontend concern that should not leak into the backend notification DTO. Extension point: future notification types add one case in resolveTarget()."

patterns-established:
  - "Notification center composition: Bell trigger → Popover anchor → NotificationList (scrollable) → row click → markRead + deep-link. Reusable for any future real-time notification feed (messaging, timetable changes, grade published, etc.)"
  - "Single mount point for auth-scoped Socket.IO connections: both useTimetableSocket and useNotificationSocket are mounted in _authenticated.tsx. Any future real-time namespace (e.g. /messaging) should follow the same pattern to avoid duplicate event delivery."
  - "Client-side filter as a backend-change-avoidance technique: when the frontend needs a subset of an existing list endpoint and the superset is bounded, filter client-side first and add the backend param later if the bound grows."

# Requirements traceability
requirements-completed:
  - "SUBST-03 (frontend): Lehrer notification center + Accept/Decline flow — NotificationBell, NotificationList, useNotificationSocket, SubstituteOfferCard, useRespondToOffer, /teacher/substitutions route"
  - "SUBST-04 (frontend): HandoverNote UI — HandoverNoteView + HandoverNoteEditor components with Phase 5 FileUploadField reuse, useHandoverNote + useCreateOrUpdateHandoverNote + useUploadHandoverAttachment hooks"
  - "SUBST-05 (frontend): ChangeIndicator stillarbeit variant — extends the Phase 4 container with the new orange 'Stillarbeit' label + 'Aufsicht:' supervisor line, shared TimetableViewLesson type updated with the new literal"

# Metrics
duration: 17min
completed: 2026-04-06
---

# Phase 06 Plan 06: Lehrer Notification Center + Handover UI + Stillarbeit Variant Summary

**Lehrer substitution response flow with real-time notification bell, ChangeIndicator stillarbeit variant, and Handover note components — Phase 6 frontend feature-complete, awaiting human verification of the end-to-end flow.**

## Performance

- **Duration:** ~17 min
- **Started:** 2026-04-05T21:24:00Z
- **Completed:** 2026-04-05T21:40:35Z
- **Tasks:** 2 autonomous tasks complete, 1 human-verify checkpoint pending
- **Files created/modified:** 21 (11 created, 10 modified, +1 package.json dependency add)
- **Commits:** 4 atomic commits (RED, GREEN Task 1 foundation, GREEN Task 1 mount, Task 2)

## Accomplishments

### Task 1 — Popover primitive + ChangeIndicator stillarbeit variant + notification hooks + NotificationBell + socket client

- **@radix-ui/react-popover 1.1.15** installed via pnpm (Phase 5 precedent, not CLI).
- **`components/ui/popover.tsx`** hand-authored with the shadcn canonical source — exports `Popover`, `PopoverTrigger`, `PopoverAnchor`, `PopoverContent` with portal mounting, z-50 overlay, and default border/shadow tokens.
- **`ChangeIndicator` extended** with a new `'stillarbeit'` variant. The variant shares the substitution orange palette per 06-UI-SPEC D-11 rationale (Stillarbeit is a class of substitution, not a new color category) and adds an optional `supervisingTeacher` prop that renders the "Aufsicht: {name}" line below the "Stillarbeit" label. All existing variants (`substitution`, `cancelled`, `room-swap`) left untouched — backward compatible with the Phase 4 `TimetableCell` caller.
- **`lib/socket.ts` extended** with `createNotificationSocket(jwt)`, `getNotificationSocket()`, and `disconnectNotificationSocket(socket?)`. The factory connects to the `/notifications` namespace with `auth: { token: "Bearer ${jwt}" }` in the handshake (Pitfall 6: never in query string), enables websocket + polling transports for school-network proxy fallback, and reconnects up to 5 times with a 1s backoff.
- **`useNotifications` hook** — TanStack Query bindings for `GET /me/notifications` (list + unread count), `PATCH /me/notifications/:id/read`, and `POST /me/notifications/mark-all-read`. All three invalidate the notificationKeys.all query key on success.
- **`useNotificationSocket(jwt | null)` hook** — real-time side of the notification center. Connects when jwt is present, listens for `notification:new` + `notification:badge` events, invalidates `['notifications']` on both, and toasts the title + body on `notification:new`. Warns via `toast.warning('Live-Updates nicht verfuegbar - Seite manuell aktualisieren')` on `connect_error`. Mounted exactly once in `_authenticated.tsx`.
- **`NotificationBell`** — header trigger component with `aria-label="Benachrichtigungen"`, `Bell`/`BellRing` icon toggle based on unreadCount, destructive-colored unread badge capped at "99+", and a 44x44px minimum touch target (BOOK-07). Opens a Popover anchored right + 8px offset containing the NotificationList.
- **`NotificationList`** — scrollable list inside the popover with "Neu" badge on unread rows, "Alle als gelesen markieren" action when unread > 0, empty state copy ("Keine Benachrichtigungen" + "Sie werden hier ueber neue Vertretungsanfragen und Aenderungen informiert."), German relative-time formatter (Gerade eben / vor N Min. / vor N Std. / Gestern / vor N Tagen / absolute date), and deep-link routing via `notification.type` → `/teacher/substitutions` for SUBSTITUTION_*, `/admin/substitutions` for ABSENCE_RECORDED.
- **`AppHeader`** — mounts `<NotificationBell />` in the right-side controls row next to the user display name + logout button. Present for every authenticated role.
- **`_authenticated.tsx` layout** — adds `useNotificationSocket(keycloak.token ?? null)` alongside the existing `useTimetableSocket(schoolId)`. Single mount point for the lifetime of the authenticated session.
- **Shared type update** — `TimetableViewLesson.changeType` extended with `'stillarbeit'` literal to match the backend Plan 04 DTO. `@schoolflow/shared` rebuilt.
- **3 test files** replaced 16 `it.todo()` stubs with 14 real Vitest cases (5 ChangeIndicator variant tests, 5 useNotificationSocket tests, 4 NotificationBell tests). All pass on the first green run.

### Task 2 — Lehrer /teacher/substitutions page + SubstituteOfferCard + handover components + sidebar

- **`useOfferedSubstitutions(schoolId, teacherId)`** — TanStack Query over the existing school-scoped substitutions list endpoint, client-side filtered to `{ status: 'OFFERED', substituteTeacherId: currentTeacherId }`. Disabled when either ID is null. Query key scoped per user to avoid cross-teacher cache pollution.
- **`useRespondToOffer()`** — mutation calling `PATCH /schools/:schoolId/substitutions/:id/respond`. On success invalidates the full `['substitutions', schoolId]` family so the admin `/admin/substitutions` tab and the lehrer `/teacher/substitutions` page stay consistent.
- **`useHandoverNote(substitutionId)`** — fetches the note via `GET /handover-notes/substitutions/:substitutionId`. Returns `null` on 404 or empty response body (backend may return 200 with no body when no note exists).
- **`useCreateOrUpdateHandoverNote()`** — JSON `POST /handover-notes/substitutions/:substitutionId`.
- **`useUploadHandoverAttachment()`** — multipart `POST /handover-notes/:noteId/attachments` using FormData through apiFetch (which skips Content-Type auto-set for FormData per the Phase 5 convention so the browser populates the multipart boundary).
- **`HandoverNoteView`** — read-only card rendering author name + localized timestamp (de-AT), content with `whitespace-pre-wrap`, and attachment list with inline download buttons pointing at `/api/v1/handover-notes/attachments/:id`. Empty state copy verbatim from 06-UI-SPEC (two variants based on `emptyContext='substitute' | 'author'`).
- **`HandoverNoteEditor`** — shadcn Dialog for the absent teacher to author/edit a handover note. Reuses Phase 5 `FileUploadField` verbatim for the optional attachment upload (single file, PDF/JPG/PNG max 5 MB). On save, creates/updates the JSON note first, then uploads the attachment to the returned `note.id` (two-step per Pitfall 5 because JSON and multipart live on separate backend handlers). Success toast "Uebergabenotiz gespeichert".
- **`SubstituteOfferCard`** — single offer card with date (de-AT weekday + long month), period/subject/class line, "Vertretung fuer: {originalTeacher}" line, inline HandoverNoteView, and two CTAs with `min-h-[44px]` touch targets. Accept dialog body: "Moechten Sie die Vertretung fuer {subject} / {class} am {date} annehmen?" with "Annehmen" confirm button. Decline dialog has an optional reason textarea ("Begruendung (optional)") and a destructive "Ablehnen" confirm button. Success toasts "Vertretung angenommen" / "Vertretung abgelehnt".
- **`/teacher/substitutions` route** — page title "Meine Vertretungen", subtitle "Offene Anfragen", empty state "Keine Vertretungsanfragen" + body "Sie haben derzeit keine offenen Vertretungsanfragen.". Pulls schoolId + teacherId from the zustand school-context-store. Listed in the auto-generated routeTree.
- **`AppSidebar`** — added "Meine Vertretungen" entry with the `UserCheck` lucide icon, scoped to the `lehrer` role only. Plan 05's admin "Vertretungsplanung" entry left untouched (parallel-safe edit per the shared-file protocol).

## Task Commits

| # | Task | Commit | Type | Files |
|---|------|--------|------|-------|
| 1 | RED: ChangeIndicator + NotificationBell + useNotificationSocket tests | `6beed39` | test | 3 modified |
| 1 | GREEN Foundation: Popover + stillarbeit variant + hooks + NotificationBell | `c9a5581` | feat | 7 created, 2 modified, 1 dep |
| 1 | GREEN Mount: NotificationBell in AppHeader + useNotificationSocket in _authenticated layout | `7cb4be1` | feat | 2 modified |
| 2 | Lehrer page + SubstituteOfferCard + HandoverNote components + sidebar + package.json re-add | `fb0434e` | feat | 6 created, 3 modified |

All commits made with `--no-verify` due to parallel execution with Plan 05 (shared pre-commit hook contention protocol).

## Files Created/Modified

### Created (11)

- `apps/web/src/components/ui/popover.tsx` — Hand-authored shadcn Popover wrapper around @radix-ui/react-popover (~37 LOC)
- `apps/web/src/hooks/useNotifications.ts` — TanStack Query bindings for /me/notifications (~84 LOC)
- `apps/web/src/hooks/useNotificationSocket.ts` — Centralized /notifications Socket.IO hook with JWT auth + invalidation (~83 LOC)
- `apps/web/src/hooks/useOfferedSubstitutions.ts` — Lehrer-filtered substitutions list + respond mutation (~80 LOC)
- `apps/web/src/hooks/useHandoverNote.ts` — Note fetch + create/update + attachment upload (~110 LOC)
- `apps/web/src/components/notifications/NotificationBell.tsx` — Header trigger with Popover anchor (~65 LOC)
- `apps/web/src/components/notifications/NotificationList.tsx` — Scrollable list with mark-read + deep-link (~122 LOC)
- `apps/web/src/components/substitution/SubstituteOfferCard.tsx` — Accept/Decline card with dialogs (~210 LOC)
- `apps/web/src/components/substitution/HandoverNoteEditor.tsx` — Dialog for authoring handover notes (~105 LOC)
- `apps/web/src/components/substitution/HandoverNoteView.tsx` — Read-only note rendering (~80 LOC)
- `apps/web/src/routes/_authenticated/teacher/substitutions.tsx` — Lehrer "Meine Vertretungen" page (~70 LOC)

### Modified (10)

- `apps/web/src/components/timetable/ChangeIndicator.tsx` — Added `stillarbeit` variant with `supervisingTeacher` prop
- `apps/web/src/components/timetable/__tests__/ChangeIndicator.test.tsx` — 5 it.todo → 5 real Testing Library tests
- `apps/web/src/hooks/__tests__/useNotificationSocket.test.ts` — 5 it.todo → 5 real Vitest hook tests with socket mock
- `apps/web/src/components/notifications/__tests__/NotificationBell.test.tsx` — 6 it.todo → 4 real Testing Library tests
- `apps/web/src/lib/socket.ts` — Added createNotificationSocket / getNotificationSocket / disconnectNotificationSocket factories
- `apps/web/src/components/layout/AppHeader.tsx` — NotificationBell mounted in right-side controls
- `apps/web/src/components/layout/AppSidebar.tsx` — Added "Meine Vertretungen" lehrer entry (parallel-safe edit, left Plan 05's admin entry untouched)
- `apps/web/src/routes/_authenticated.tsx` — useNotificationSocket(keycloak.token) mounted alongside useTimetableSocket
- `apps/web/src/routeTree.gen.ts` — Auto-regenerated to include /_authenticated/teacher/substitutions
- `apps/web/package.json` — Added @radix-ui/react-popover dependency

### Shared package (1)

- `packages/shared/src/types/timetable.ts` — `TimetableViewLesson.changeType` union extended with `'stillarbeit'` literal

## Decisions Made

See the frontmatter `key-decisions` block for the canonical list. Summary:

1. **Stillarbeit reuses substitution orange** — color palette decision per 06-UI-SPEC D-11; differentiation is via text label, not new color token.
2. **Single mount point for notification socket** — in `_authenticated.tsx`, never in page components. Prevents duplicate event delivery per 06-RESEARCH Pattern 4.
3. **Client-side filter for offered substitutions** — avoids backend change; documented extension point for future `?mine=true` query param.
4. **JWT accessor via `keycloak.token`** (not via `useAuth`) — useAuth only exposes parsed claims, and keycloak-js handles auto-refresh.
5. **Popover via pnpm + hand-authored wrapper** — Phase 5 precedent; shadcn CLI incompatible with current components.json.
6. **44px min touch targets on Accept/Decline** — BOOK-07 inherited principle, stacks vertically on mobile.
7. **HandoverNoteEditor reuses Phase 5 FileUploadField** — single source of truth for attachment upload UX.
8. **NotificationList deep-link routing via type switch** — keeps routing decisions on the frontend, not in notification DTO.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 — Bug] ChangeIndicator test expectations aligned with real Phase 4 API**

- **Found during:** Task 1 RED phase
- **Issue:** The plan's test skeleton referenced `'room-change'` as the changeType and `<ChangeIndicator changeType="substitution" originalTeacherSurname="Mueller" teacherSurname="Schmidt" />` (no children, different prop names). The real Phase 4 ChangeIndicator component takes `children` (it wraps a cell) + `originalValue` / `newValue` + a `'room-swap'` variant (not `'room-change'`). The shared DTO union also uses `'room-swap'`.
- **Fix:** Wrote the tests against the actual component API — children wrapper, `originalValue` / `newValue` props, `'room-swap'` literal. Added a fifth test case for "stillarbeit without supervisor" (edge case not in plan but valuable for coverage).
- **Files modified:** `apps/web/src/components/timetable/__tests__/ChangeIndicator.test.tsx`
- **Verification:** All 5 tests pass. TimetableCell (the only caller of ChangeIndicator) continues to render unchanged because the existing variants still work exactly as before.
- **Committed in:** `6beed39` (RED), `c9a5581` (GREEN)

**2. [Rule 2 — Missing Critical] ChangeIndicator `supervisingTeacher` prop added to type signature**

- **Found during:** Task 1 GREEN phase
- **Issue:** The plan specified a new "stillarbeit" variant rendering the supervisor name, but the existing ChangeIndicator did not have a supervisor prop. Simply checking the shared type's `teacherSurname` field would not work because TimetableCell does not forward it directly, and the semantics of "who is the supervising teacher" are different from "who is the teacher of record".
- **Fix:** Added `supervisingTeacher?: string` as an optional prop on `ChangeIndicatorProps`. Rendered as a dedicated "Aufsicht: {name}" line inside the stillarbeit variant branch.
- **Files modified:** `apps/web/src/components/timetable/ChangeIndicator.tsx`
- **Verification:** Test "renders orange border + Stillarbeit label + Aufsicht: prefix" passes; TimetableCell continues to work unchanged (it does not yet pass supervisingTeacher, which is a future enhancement when TimetableCell learns to read the supervisor name from the overlay).
- **Committed in:** `c9a5581`

**3. [Rule 3 — Blocking] @schoolflow/shared timetable type needed `'stillarbeit'` literal**

- **Found during:** Task 1 GREEN phase
- **Issue:** Backend Plan 04 added `'stillarbeit'` to the backend `TimetableViewLessonDto.changeType` union but the shared `TimetableViewLesson` type in `packages/shared/src/types/timetable.ts` was still on the Phase 4 union `'substitution' | 'cancelled' | 'room-swap' | null`. Passing `changeType='stillarbeit'` from the backend to the frontend cell renderer would have been a silent type-narrowing at the shared type boundary.
- **Fix:** Extended the shared union to include `'stillarbeit'`, rebuilt `@schoolflow/shared`.
- **Files modified:** `packages/shared/src/types/timetable.ts`
- **Verification:** `tsc --noEmit` clean on the web app with the new literal; `TimetableCell` does not need an update because it already guards on existing variants and renders the default cell content for unknown `changeType` values (the ChangeIndicator handles the stillarbeit rendering).
- **Committed in:** `c9a5581`

**4. [Rule 3 — Blocking] package.json race with parallel Plan 05 pnpm install**

- **Found during:** Task 1 GREEN commit step
- **Issue:** After running `pnpm --filter @schoolflow/web add @radix-ui/react-popover`, the package was installed in node_modules but the `apps/web/package.json` entry was transiently dropped by a concurrent Plan 05 pnpm operation (the two plans share the same workspace lockfile). The first GREEN commit attempted to stage `apps/web/package.json` but git reported no diff at commit time, so the dependency was only present in node_modules but not in the manifest.
- **Fix:** In Task 2 I explicitly re-added the `@radix-ui/react-popover` entry to `apps/web/package.json` by direct edit, verified node_modules had the package, and staged + committed it alongside the Task 2 changes.
- **Files modified:** `apps/web/package.json`
- **Verification:** `grep "@radix-ui/react-popover" apps/web/package.json` returns 1; the Popover component compiles and all tests pass.
- **Committed in:** `fb0434e`

---

**Total deviations:** 4 auto-fixed (1 bug, 1 missing critical, 2 blocking)
**Impact on plan:** All four auto-fixes were necessary for correctness. No scope creep — the plan's intent (test the component, add the variant, land the dependency) was preserved in every case; only the surface-level details (prop names, union literal, manifest race condition) were adjusted to match reality.

## Issues Encountered

**1. Parallel execution with Plan 05 caused two transient file reverts.** The first edit pass to `apps/web/src/lib/socket.ts` and `packages/shared/src/types/timetable.ts` was reverted by a concurrent Plan 05 operation (visible via two linter/file-update notifications during Task 1). I re-applied both edits on the second pass and they persisted. No files were lost because my changes were additive (new function, new union literal). The `--no-verify` flag on all commits avoided pre-commit hook contention as specified in the parallel-safety protocol.

**2. routeTree.gen.ts was pre-populated by Plan 05 before my route file was created.** Plan 05 had already regenerated the route tree with both `/admin/substitutions` (its own) and `/teacher/substitutions` (mine) by the time I came to regenerate. I verified the entry was correct and committed the file in Task 2 alongside the new route source file. No conflict occurred because the TanStack router generator is deterministic — both agents produced identical output for their respective routes.

**3. Plan 05's "Vertretungsplanung" admin sidebar entry arrived via an unstaged working-copy edit.** When I read AppSidebar.tsx fresh at Task 2 time, Plan 05's admin entry was already in place but not yet committed. I added my lehrer entry via a surgical `Edit` call (import + nav item only), staged only the AppSidebar file individually, and verified the diff showed only my additions + no removal of Plan 05's admin entry.

## Known Stubs

None in Plan 06 scope. Every component renders real data flowing from real hooks connected to real backend endpoints. The plan's `it.todo` stubs for other phases (Attendance, ExcuseForm, PerspectiveSelector, TimetableGrid, useSocket) are out of scope and remain untouched — those are Phase 4/5 artifacts that will be filled in by their owning phases.

Two code paths that could look like stubs on a casual read but are intentional:

- **`SubstituteOfferCard` `REASON_LABELS` constant** — currently only used in an `sr-only` helper for the absence reason label. The substitution DTO does not currently carry the absence reason (it's on the parent TeacherAbsence row which is not joined into the SubstitutionDto). If a future Plan wants the absence reason visible on the card, the card already has the label dictionary — the data wiring is the only missing piece.
- **`useHandoverNote` 200-with-empty-body handling** — the backend `HandoverService.getNoteForSubstitution` returns `null` if no note exists, which Nest serializes as an empty 200. The hook defensively handles this via `res.text()` + try/parse so `useHandoverNote(sub.id).data` is reliably `null | HandoverNoteDto`. Not a stub; an intentional serialization quirk.

## Authentication Gates

None in the autonomous portion of this plan. The human-verification checkpoint (Task 3) involves the user logging in as admin + lehrer to exercise the end-to-end flow; those are not auth gates in the Rule-set sense, they are expected UAT steps.

## Acceptance Criteria Verification

**Task 1 (grep-based):**

- `@radix-ui/react-popover` in apps/web/package.json → 1 match
- `PopoverPrimitive.Root | PopoverPrimitive.Trigger | PopoverPrimitive.Content` in popover.tsx → 6 matches (3 primitives × 2 references each)
- `'stillarbeit'` in ChangeIndicator.tsx → 4 matches (type union + 3 usages)
- `Stillarbeit` text in ChangeIndicator.tsx → 3 matches (comment + label + style)
- `Aufsicht:` prefix in ChangeIndicator.tsx → 2 matches
- `createNotificationSocket` + `disconnectNotificationSocket` + `getNotificationSocket` in socket.ts → 3 function definitions
- `/notifications` namespace literal in socket.ts → 2 matches (comment + io call)
- `auth: { token ... }` in socket.ts → 3 matches (notification + timetable + classbook factories)
- `/me/notifications` endpoint in useNotifications.ts → 6 matches (3 endpoints × 2 refs)
- `notification:new` in useNotificationSocket.ts → 2 matches (event binding)
- `invalidateQueries` in useNotificationSocket.ts → 2 matches (new + badge handlers)
- `aria-label="Benachrichtigungen"` in NotificationBell.tsx → 1 match
- `'99+'` in NotificationBell.tsx → 1 match
- `BellRing` in NotificationBell.tsx → 3 matches (import + JSX)
- `Keine Benachrichtigungen` in NotificationList.tsx → 1 match
- `Alle als gelesen markieren` in NotificationList.tsx → 1 match
- `Neu` in NotificationList.tsx → 2 matches (label + badge)
- `NotificationBell` in AppHeader.tsx → 2 matches (import + JSX)
- `useNotificationSocket` in _authenticated.tsx → 2 matches (import + call)
- ChangeIndicator.test.tsx: 0 `it.todo`, 5 `it(`
- NotificationBell.test.tsx: 0 `it.todo`, 4 `it(`
- useNotificationSocket.test.ts: 0 `it.todo`, 5 `it(`
- `pnpm --filter @schoolflow/web test` → 14 passed, 31 unrelated pre-existing it.todo stubs
- `pnpm --filter @schoolflow/web exec vite build` → 2744 modules compiled, 792 KB / 233 KB gzip

**Task 2 (grep-based):**

- useOfferedSubstitutions.ts exports useOfferedSubstitutions + useRespondToOffer → 2 matches
- useHandoverNote.ts `FormData` → 4 matches (appendFile + body + comment)
- SubstituteOfferCard.tsx `Akzeptieren|Ablehnen` → 4 matches
- SubstituteOfferCard.tsx `Vertretung annehmen|Vertretung ablehnen` → 2 dialog titles
- SubstituteOfferCard.tsx `Moechten Sie die Vertretung fuer` → 1 match (accept dialog body)
- SubstituteOfferCard.tsx `Begruendung (optional)` → 1 match (decline placeholder)
- SubstituteOfferCard.tsx `min-h-[44px]` → 2 matches (both CTAs)
- HandoverNoteEditor.tsx `Uebergabenotiz verfassen|Uebergabenotiz speichern` → 3 matches
- HandoverNoteEditor.tsx `Was der Vertretungslehrer wissen muss` → 2 matches (comment + placeholder)
- HandoverNoteEditor.tsx `FileUploadField` → 3 matches (import + type hint + JSX)
- HandoverNoteEditor.tsx `PDF, JPG oder PNG` → 1 match
- HandoverNoteView.tsx `Keine Uebergabenotiz vorhanden` → 1 match
- HandoverNoteView.tsx `Der abwesende Lehrer hat keine Notiz hinterlegt` → 1 match
- /teacher/substitutions route: `Meine Vertretungen|Keine Vertretungsanfragen` → 3 matches
- AppSidebar.tsx `Meine Vertretungen` → 1 match (new entry)
- AppSidebar.tsx `UserCheck` → 2 matches (import + icon reference)
- `pnpm --filter @schoolflow/web exec tsc --noEmit` → exits 0

## Self-Check: PASSED

All 11 created files exist on disk (verified via ls). All 4 Plan 06-06 commits exist in git log (6beed39, c9a5581, 7cb4be1, fb0434e). `tsc --noEmit` exits 0. `vite build` exits 0 with 2744 modules. All 14 Phase 6 Plan 06 tests pass (3 test files, 14 real cases, 0 it.todo in scope).

## Next Steps — Human Verification Checkpoint

Task 3 is a `checkpoint:human-verify` gate that cannot be auto-approved. The end-to-end substitution flow requires manual UAT across two browser tabs (admin + lehrer) to validate the 13 verification steps enumerated in the plan's `<how-to-verify>` block.

**Before marking this plan complete, the user must:**

1. Start the full stack per `memory/reference_app_startup.md` (docker compose → prisma db push → seed → @schoolflow/shared build → api build + node dist/main.js → web dev).
2. Login as two test users in side-by-side tabs: `admin-user / admin123` and `lehrer-user / lehrer123`.
3. Walk through the 13 verification steps documented in `06-06-PLAN.md <how-to-verify>`:
   - Admin records absence → pending substitutions populate
   - Admin offers substitute → candidate list + "Anbieten" flow
   - Lehrer receives real-time bell + deep-links to /teacher/substitutions → Accept flow
   - Admin sees SUBSTITUTION_CONFIRMED notification + status update
   - Timetable view shows orange substitution indicator on affected cell
   - Entfall flow → red border Entfall variant
   - Stillarbeit flow → orange "Stillarbeit" + "Aufsicht:" variant (NEW Phase 6)
   - Handover note author + attachment upload + view as substitute
   - Fairness stats table window switching + color-coded Abweichung column
   - Responsive check (< 640px) for tabs + SubstituteOfferCard + FairnessStatsPanel + NotificationBell
   - Double-prefix bug check in DevTools Network tab (no /api/v1/api/ URLs)

Once all 13 steps pass, the user signals "approved" and the plan is marked complete. If any step fails, a gap-closure plan will be drafted via `/gsd:plan-phase --gaps`.

---
*Phase: 06-substitution-planning*
*Plan: 06*
*Completed: 2026-04-06 (autonomous tasks); awaiting human verification*
