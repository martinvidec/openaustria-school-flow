---
phase: 06-substitution-planning
verified: 2026-04-06T12:25:48Z
status: passed
score: 7/7 must-haves verified
gaps: []
resolved:
  - truth: "ChangeIndicator web tests pass for all Phase 6 variants"
    status: resolved
    resolution: "Tests updated in d2a5dc9 to verify styling-only wrapper (border/bg classes per changeType + Entfall badge). All 14 web tests pass."
human_verification:
  - test: "End-to-end substitution flow: admin records absence, offers substitute, lehrer accepts via notification bell"
    expected: "Full lifecycle from PENDING -> OFFERED -> CONFIRMED with real-time notification delivery, timetable overlay showing substitution indicator"
    why_human: "Requires running full stack (Keycloak + API + web), two browser tabs with different roles, and real-time WebSocket verification"
  - test: "Entfall and Stillarbeit timetable overlay rendering"
    expected: "Entfall shows red cancelled indicator; Stillarbeit shows orange border with 'Stillarbeit' label and optional 'Aufsicht: {name}' in TimetableCell"
    why_human: "Visual rendering verification and overlay propagation require a running timetable view with seeded data"
  - test: "Handover note author + attachment upload + substitute view"
    expected: "Absent teacher can write note + upload PDF/JPG/PNG attachment; substitute teacher can view note + download attachment"
    why_human: "File upload pipeline requires running Fastify multipart and disk I/O; download requires authenticated blob fetch"
  - test: "Fairness statistics window switching and Abweichung column"
    expected: "Stats table shows Gegeben/Erhalten/Entfall/Stillarbeit counts with color-coded deviation; window selector changes date range"
    why_human: "Requires seeded substitution data across multiple teachers and visual verification of color coding"
  - test: "Responsive layout on mobile viewport (< 640px)"
    expected: "Tabs stack, SubstituteOfferCard buttons stack vertically with 44px min height, NotificationBell popover is usable"
    why_human: "Visual/interaction verification on narrow viewport"
---

# Phase 06: Substitution Planning Verification Report

**Phase Goal:** Substitution planning -- absence recording, ranked candidate assignment, teacher response flow, handover notes, timetable overlay, fairness statistics
**Verified:** 2026-04-06T12:25:48Z
**Status:** passed (ChangeIndicator gap resolved in d2a5dc9, 2026-04-06)
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Admin can record teacher absences with reason/duration and system creates pending Substitution rows | VERIFIED | `TeacherAbsenceService.create` (279 lines) fans out via `tx.substitution.createMany`, REST controller at POST /absences with `@CheckPermissions({ action: 'manage', subject: 'substitution' })`, `AbsenceForm.tsx` (296 lines) submits via `useCreateAbsence` mutation. 11 real tests in teacher-absence.service.spec.ts. |
| 2 | System ranks candidates by weighted formula (0.45 subject + 0.30 fairness + 0.20 workload + 0.05 KV) and admin can view ranked list | VERIFIED | `RankingService` (400 lines) exports `RANKING_WEIGHTS` constant with exact weights, uses `calculateWerteinheiten`/`calculateMaxTeachingHours` imports. `RankingController` at GET /substitutions/:id/candidates. `CandidateList.tsx` (161 lines) + `useRankedCandidates` hook consume the endpoint. 17 real tests in ranking.service.spec.ts. |
| 3 | Teacher receives real-time notification via Socket.IO, can accept/decline substitution offer | VERIFIED | `NotificationService` (234 lines) persists Notification + calls `gateway.emitNewNotification`. `NotificationGateway` (137 lines) uses JWKS-based JWT verification on handshake, per-user rooms (`user:{userId}`), transports `['websocket', 'polling']`. `NotificationBell.tsx` (74 lines) in AppHeader, `useNotificationSocket` (82 lines) mounted in `_authenticated.tsx`. `SubstituteOfferCard.tsx` (220 lines) with Accept/Decline flow. `/teacher/substitutions` route (130 lines). Dedup upsert for SUBSTITUTION_OFFER (Pitfall 8). 9 real tests in notification.gateway.spec.ts, 8 in notification.service.spec.ts. |
| 4 | Absent teacher can write handover notes with file attachments | VERIFIED | `HandoverService` (308 lines) with `MAGIC_BYTES`/`ALLOWED_MIME_TYPES` copied from Phase 5 excuse pattern. Unique constraint on `HandoverNote.substitutionId`. `HandoverController` with separate JSON (POST /substitutions/:substitutionId) and multipart (POST /:noteId/attachments) endpoints (Pitfall 5). `HandoverNoteEditor.tsx` (138 lines) reuses Phase 5 `FileUploadField`. `HandoverNoteView.tsx` (93 lines). 15 real tests in handover.service.spec.ts. |
| 5 | Substitution changes propagate to timetable overlay view with substitution/cancelled/stillarbeit indicators | VERIFIED | `TimetableService.getView()` joins Substitution overlay when `date` query param provided, produces `changeType` of `'substitution'`, `'cancelled'`, or `'stillarbeit'` from DB data. `SubstitutionService` lifecycle transitions emit events via `timetableGateway.emitSubstitutionCreated`/`emitSubstitutionCancelled`. `ChangeIndicator.tsx` renders correct border/bg styling per changeType. `TimetableCell.tsx` renders inline text (Stillarbeit label, Aufsicht: prefix, strikethrough). Shared type `TimetableViewLesson.changeType` includes `'stillarbeit'`. 7 real tests in view-overlay.spec.ts. |
| 6 | System tracks fairness statistics per teacher with configurable window | VERIFIED | `SubstitutionStatsService` (210 lines) with `week/month/semester/schoolYear/custom` windows, Werteinheiten-weighted hours. `SubstitutionStatsController` REST endpoint. `FairnessStatsPanel.tsx` (204 lines) with window selector. `useSubstitutionStats` hook. 8 real tests in substitution-stats.service.spec.ts. |
| 7 | All ChangeIndicator web tests pass for Phase 6 variants | VERIFIED | Tests fixed in commit d2a5dc9 (2026-04-06) -- ChangeIndicator now verifies styling-only wrapper (border/bg classes per changeType + Entfall badge) and text rendering is covered in TimetableCell tests. All 14 web tests pass. |

**Score:** 7/7 truths verified (Truth #7 resolved in d2a5dc9, 2026-04-06)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `apps/api/prisma/schema.prisma` | 5 new models + 5 enums | VERIFIED | 1114 lines, all models/enums present, cascade delete chain confirmed |
| `packages/shared/src/types/substitution.ts` | Typed DTOs + events | VERIFIED | 113 lines, 12 exports (types + interfaces) |
| `packages/shared/src/types/notification.ts` | Notification DTO + events | VERIFIED | 30 lines, 4 exports |
| `apps/api/src/modules/substitution/absence/teacher-absence.service.ts` | Absence CRUD + range expansion | VERIFIED | 279 lines, createMany fan-out in $transaction |
| `apps/api/src/modules/substitution/absence/teacher-absence.controller.ts` | REST endpoints with CheckPermissions | VERIFIED | 92 lines, 4 @CheckPermissions decorators |
| `apps/api/src/modules/substitution/substitution/substitution.service.ts` | Lifecycle + ClassBookEntry + notifications | VERIFIED | 667 lines, Serializable transaction, ConflictException guards, 7 notification calls, 4 timetable gateway calls |
| `apps/api/src/modules/substitution/substitution/substitution.controller.ts` | REST lifecycle endpoints | VERIFIED | 126 lines |
| `apps/api/src/modules/substitution/substitution/ranking.service.ts` | Weighted scoring formula | VERIFIED | 400 lines, RANKING_WEIGHTS constant, calculateWerteinheiten/calculateMaxTeachingHours imports |
| `apps/api/src/modules/substitution/substitution/ranking.controller.ts` | GET candidates endpoint | VERIFIED | 68 lines, @CheckPermissions manage/substitution |
| `apps/api/src/modules/substitution/substitution/substitution-stats.service.ts` | Fairness stats with windows | VERIFIED | 210 lines, 5 window types |
| `apps/api/src/modules/substitution/notification/notification.service.ts` | CRUD + dedup + emit | VERIFIED | 234 lines, Pitfall 8 dedup upsert, emitNewNotification call |
| `apps/api/src/modules/substitution/notification/notification.gateway.ts` | Socket.IO /notifications with JWT auth | VERIFIED | 137 lines, JWKS JWT verification, per-user rooms, websocket+polling transports |
| `apps/api/src/modules/substitution/handover/handover.service.ts` | Note CRUD + attachment pipeline | VERIFIED | 308 lines, MAGIC_BYTES/ALLOWED_MIME_TYPES, unique note constraint |
| `apps/api/src/modules/substitution/handover/handover.controller.ts` | Separate JSON + multipart endpoints | VERIFIED | 131 lines, 6 endpoints |
| `apps/api/src/modules/substitution/substitution.module.ts` | Fully assembled module | VERIFIED | 83 lines, all 7 services + 5 controllers + 1 gateway registered |
| `apps/api/src/modules/timetable/ab-week.util.ts` | A/B week resolver | VERIFIED | 43 lines, exports isWeekCompatible + resolveWeekType |
| `apps/api/src/modules/timetable/timetable.service.ts` | Overlay-aware getView() | VERIFIED | Joins substitution.findMany on (lessonId, date), produces substitution/cancelled/stillarbeit changeType |
| `apps/api/src/modules/dsgvo/retention/retention.service.ts` | handover_materials: 365 extension | VERIFIED | retention map includes handover_materials: 365, HandoverNote cleanup logic |
| `apps/web/src/routes/_authenticated/admin/substitutions.tsx` | 3-tab layout | VERIFIED | 188 lines, Tabs with Abwesenheiten/Offene Vertretungen/Statistik |
| `apps/web/src/components/substitution/AbsenceForm.tsx` | Absence recording form | VERIFIED | 296 lines, teacher select + date range + reason enum + note |
| `apps/web/src/components/substitution/OpenSubstitutionsPanel.tsx` | Substitution workflow panel | VERIFIED | 167 lines |
| `apps/web/src/components/substitution/CandidateList.tsx` | Ranked candidates with scores | VERIFIED | 161 lines |
| `apps/web/src/components/substitution/FairnessStatsPanel.tsx` | Stats table with window selector | VERIFIED | 204 lines |
| `apps/web/src/components/substitution/SubstituteOfferCard.tsx` | Accept/Decline card | VERIFIED | 220 lines, 44px min touch targets |
| `apps/web/src/components/substitution/HandoverNoteEditor.tsx` | Dialog with FileUploadField reuse | VERIFIED | 138 lines, imports FileUploadField |
| `apps/web/src/components/substitution/HandoverNoteView.tsx` | Read-only note display | VERIFIED | 93 lines |
| `apps/web/src/routes/_authenticated/teacher/substitutions.tsx` | Lehrer "Meine Vertretungen" page | VERIFIED | 130 lines |
| `apps/web/src/components/ui/popover.tsx` | Hand-authored shadcn Popover | VERIFIED | 38 lines, exports Popover/PopoverTrigger/PopoverAnchor/PopoverContent |
| `apps/web/src/components/notifications/NotificationBell.tsx` | Header bell with unread badge | VERIFIED | 74 lines, mounted in AppHeader |
| `apps/web/src/components/notifications/NotificationList.tsx` | Scrollable notification list | VERIFIED | 139 lines |
| `apps/web/src/hooks/useNotificationSocket.ts` | Socket.IO client with JWT auth | VERIFIED | 82 lines, createNotificationSocket, invalidates on notification:new |
| `apps/web/src/components/timetable/ChangeIndicator.tsx` | Extended with stillarbeit variant | VERIFIED | 92 lines, stillarbeit case in getChangeStyles |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| TeacherAbsenceService.create | prisma.substitution.createMany | range expansion in $transaction | WIRED | Line 186: `tx.substitution.createMany` |
| SubstitutionService.setStillarbeit | prisma.classBookEntry.upsert | substitutionId FK | WIRED | Lines 562, 592 |
| TeacherAbsenceController | @CheckPermissions | manage/substitution | WIRED | 4 decorators at lines 38, 62, 76, 84 |
| SubstitutionModule | All services + controllers | providers array | WIRED | Lines 65-71: all 7 services registered |
| SubstitutionModule | app.module.ts | import registration | WIRED | Line 41 in app.module.ts |
| NotificationService.create | NotificationGateway.emitNewNotification | DI injection | WIRED | Line 88 |
| NotificationGateway.handleConnection | JWKS JWT verification | jsonwebtoken + jwks-rsa | WIRED | Lines 69-76 |
| HandoverService.saveAttachment | MAGIC_BYTES/ALLOWED_MIME_TYPES | copied from Phase 5 | WIRED | Lines 24, 37, 164, 172 |
| RankingService.rankCandidates | werteinheiten.util | calculateWerteinheiten + calculateMaxTeachingHours | WIRED | Lines 4-5 |
| SubstitutionService.assignSubstitute | NotificationService.create | SUBSTITUTION_OFFER type | WIRED | Line 152 |
| SubstitutionService.setEntfall | TimetableEventsGateway.emitSubstitutionCancelled | school-scoped room emit | WIRED | Line 312 |
| TimetableService.getView | prisma.substitution.findMany | join on (lessonId, date) | WIRED | Line 375 |
| AbsenceForm.onSubmit | POST /api/v1/schools/:schoolId/absences | useCreateAbsence mutation | WIRED | Hook line 71 |
| CandidateList | GET /substitutions/:id/candidates | useRankedCandidates | WIRED | Hook line 33 |
| AppHeader | NotificationBell | JSX mount | WIRED | Line 31 in AppHeader |
| _authenticated layout | useNotificationSocket | hook call | WIRED | Line 31 in _authenticated.tsx |
| AppSidebar | /admin/substitutions | Link with admin/schulleitung role filter | WIRED | Lines 71-74 |
| AppSidebar | /teacher/substitutions | Link with lehrer/schulleitung role filter | WIRED | Lines 77-80 |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| AbsenceForm.tsx | useCreateAbsence mutation | POST /api/v1/schools/:schoolId/absences -> TeacherAbsenceService.create -> prisma.teacherAbsence.create + prisma.substitution.createMany | DB write via Prisma $transaction | FLOWING |
| OpenSubstitutionsPanel.tsx | usePendingSubstitutions query | GET /schools/:schoolId/substitutions -> SubstitutionService.findManyPending -> prisma.substitution.findMany | DB query with batch-resolved names | FLOWING |
| CandidateList.tsx | useRankedCandidates query | GET /substitutions/:id/candidates -> RankingController -> RankingService.rankCandidates -> multiple prisma queries (teachers, subjects, stats) | DB queries with weighted scoring | FLOWING |
| FairnessStatsPanel.tsx | useSubstitutionStats query | GET /substitution-stats -> SubstitutionStatsService.getStats -> prisma.substitution.groupBy + Werteinheiten calculation | DB aggregation with window resolver | FLOWING |
| NotificationBell.tsx | useNotifications query + useNotificationSocket | GET /me/notifications -> NotificationController -> NotificationService.list -> prisma.notification.findMany; Socket.IO notification:new events | DB query + real-time emit | FLOWING |
| TimetableCell (overlay) | TimetableService.getView with date param | prisma.substitution.findMany with overlay application | DB query with teacher/room batch-lookup | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| API test suite passes | `pnpm --filter @schoolflow/api test -- --run` | 285 passed, 0 failed, 51 todo | PASS |
| Web test suite passes | `pnpm --filter @schoolflow/web test -- --run` | 14 passed, 0 failed, 31 todo (resolved in d2a5dc9) | PASS |
| API TypeScript compiles cleanly | `pnpm --filter @schoolflow/api exec tsc --noEmit` | Exit 0, no errors | PASS |
| Schema contains all Phase 6 models | grep for model names in schema.prisma | All 5 models + 5 enums found | PASS |
| Shared package exports Phase 6 types | grep for exports in substitution.ts + notification.ts | 12 + 4 exports confirmed | PASS |
| SubstitutionModule registered in app.module.ts | grep SubstitutionModule app.module.ts | Lines 16, 41 | PASS |

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|----------|
| SUBST-01 | 01, 02, 05 | Admin kann Lehrer-Abwesenheit mit Grund und Dauer erfassen | SATISFIED | TeacherAbsenceService + controller + AbsenceForm + AbsenceList + CASL seeds (manage/absence) |
| SUBST-02 | 01, 03, 04, 05 | System schlaegt automatisch passende Vertretungen vor (Verfuegbarkeit, Qualifikation, Fairness) | SATISFIED | RankingService with 4-factor weighted formula + RankingController + CandidateList UI + ScoreBreakdownRow |
| SUBST-03 | 01, 03, 04, 06 | Vertretungslehrer kann Vertretung per Push-Notification bestaetigen/ablehnen | SATISFIED | NotificationService + NotificationGateway (Socket.IO /notifications with JWT auth) + NotificationBell + SubstituteOfferCard (Accept/Decline) + /teacher/substitutions route |
| SUBST-04 | 01, 03, 06 | Abwesender Lehrer kann Uebergabenotizen pro Stunde hinterlassen | SATISFIED | HandoverService (unique note + magic byte attachment validation) + HandoverController + HandoverNoteEditor (reuses Phase 5 FileUploadField) + HandoverNoteView + useHandoverNote hooks |
| SUBST-05 | 02, 04, 06 | Vertretungsaenderungen propagieren sofort in alle Stundenplan-Ansichten | SATISFIED | TimetableService.getView overlay join, SubstitutionService lifecycle emits timetable gateway events, ChangeIndicator stillarbeit variant, TimetableCell inline rendering, shared type extended with 'stillarbeit' |
| SUBST-06 | 01, 04, 05 | System erfasst Vertretungsstatistiken pro Lehrer (gegeben/erhalten) | SATISFIED | SubstitutionStatsService (configurable windows: week/month/semester/schoolYear/custom) + SubstitutionStatsController + FairnessStatsPanel + useSubstitutionStats |

No orphaned requirements found. All 6 SUBST-* IDs appear in both REQUIREMENTS.md and plan frontmatters.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| ranking.service.ts | 339 | TODO(v2): 0.5 for related Lehrverpflichtungsgruppe | Info | v2 enhancement note, not a blocker; current implementation uses full 1.0/0.0 subject match |
| ChangeIndicator.test.tsx | -- | Tests assert text that component no longer renders | Resolved | Fixed in commit d2a5dc9 (2026-04-06): tests rewritten to verify styling-only wrapper; text rendering covered in TimetableCell tests. |

### Human Verification Required

### 1. End-to-End Substitution Lifecycle

**Test:** Log in as admin and lehrer in side-by-side browser tabs. Admin records absence, offers substitute, lehrer accepts via notification bell.
**Expected:** Full lifecycle PENDING -> OFFERED -> CONFIRMED. Real-time notification delivery. Timetable overlay shows substitution indicator on affected cell.
**Why human:** Requires running full stack (Keycloak + API + web), two browser sessions with different roles, WebSocket real-time verification.

### 2. Entfall and Stillarbeit Timetable Overlay

**Test:** Admin marks substitutions as Entfall and Stillarbeit. Navigate to timetable view for the affected date.
**Expected:** Entfall shows red cancelled indicator. Stillarbeit shows orange border with "Stillarbeit" label and "Aufsicht: {name}" in TimetableCell.
**Why human:** Visual rendering verification requires a running timetable view with seeded data.

### 3. Handover Note Author + Attachment Pipeline

**Test:** As absent teacher, write handover note and upload PDF/JPG/PNG attachment. As substitute teacher, view note and download attachment.
**Expected:** Note saves, attachment uploads with MIME validation, substitute can view note and download attachment with authenticated blob fetch.
**Why human:** File upload pipeline requires running Fastify multipart + disk I/O; download requires auth header on blob fetch.

### 4. Fairness Statistics Window Switching

**Test:** Navigate to admin Statistik tab. Switch between window options (Woche, Monat, Semester, Schuljahr).
**Expected:** Stats table updates with correct date-bounded counts. Abweichung column shows color-coded deviation per teacher.
**Why human:** Requires seeded substitution data across multiple teachers and visual verification of computed stats.

### 5. Responsive Layout (< 640px)

**Test:** Open admin/substitutions and teacher/substitutions at mobile viewport width.
**Expected:** Tabs stack, SubstituteOfferCard buttons stack vertically with 44px min height, NotificationBell popover usable.
**Why human:** Visual/interaction verification on narrow viewport not testable via grep.

### Gaps Summary

**Resolved 2026-04-06 (commit d2a5dc9): No open gaps.**

The previously-identified ChangeIndicator web test misalignment has been resolved. The UAT fix commit (18a1b29) refactored ChangeIndicator from a text-rendering component to a pure styling wrapper, moving text labels ("Stillarbeit", originalValue/newValue strikethrough) into TimetableCell where they belong in the 3-line cell layout. Commit d2a5dc9 (2026-04-06) updated ChangeIndicator.test.tsx to verify the styling-only contract (border/bg classes per changeType + Entfall badge) and moved text-rendering assertions into TimetableCell tests. All 14 web tests pass.

All 6 SUBST-* requirements are satisfied at the implementation level. The 285 API tests pass with 0 failures and 14 web tests pass with 0 failures. Phase 6 verification is complete.

---

_Verified: 2026-04-06T12:25:48Z_
_Verifier: Claude (gsd-verifier)_
