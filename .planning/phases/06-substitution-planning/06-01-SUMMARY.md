---
phase: 06-substitution-planning
plan: 01
subsystem: database
tags: [prisma, nestjs, typescript, vitest, nyquist-wave-0]

# Dependency graph
requires:
  - phase: 04-timetable-viewing-editing
    provides: TimetableRun/TimetableLesson for denormalized lesson identity, ChangeIndicator component to extend
  - phase: 05-digital-class-book
    provides: ClassBookEntry model to extend with substitutionId FK, MAGIC_BYTES constant for handover attachments
provides:
  - 5 new Prisma models (TeacherAbsence, Substitution, HandoverNote, HandoverAttachment, Notification)
  - 5 new Prisma enums (AbsenceReason, AbsenceStatus, SubstitutionType, SubstitutionStatus, NotificationType)
  - ClassBookEntry.substitutionId FK with SetNull cascade (audit trail preservation)
  - Phase 6 shared DTO types and event payloads in @schoolflow/shared
  - Empty SubstitutionModule scaffold registered in AppModule
  - 12 Wave 0 spec stubs with it.todo() mapped 1:1 to SUBST-01..06 acceptance criteria
affects: [06-02, 06-03, 06-04, 06-05, 06-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nyquist Wave 0 it.todo() stubs before any implementation (inherited from Phase 4 precedent)"
    - "Denormalized lesson identity on Substitution (classSubjectId/dayOfWeek/periodNumber/weekType) — soft reference to TimetableLesson survives TimetableRun churn (Pitfall 1)"
    - "SetNull cascade for ClassBookEntry.substitutionId (mirrors Phase 4 TimetableLessonEdit audit-trail pattern)"
    - "String union literals in shared DTOs match Prisma enum values verbatim for clean API-side casts"

key-files:
  created:
    - apps/api/src/modules/substitution/substitution.module.ts
    - apps/api/src/modules/substitution/absence/teacher-absence.service.spec.ts
    - apps/api/src/modules/substitution/substitution/ranking.service.spec.ts
    - apps/api/src/modules/substitution/substitution/substitution.service.spec.ts
    - apps/api/src/modules/substitution/substitution/substitution-stats.service.spec.ts
    - apps/api/src/modules/substitution/notification/notification.service.spec.ts
    - apps/api/src/modules/substitution/notification/notification.gateway.spec.ts
    - apps/api/src/modules/substitution/handover/handover.service.spec.ts
    - apps/api/src/modules/substitution/substitution.module.spec.ts
    - apps/api/src/modules/timetable/__tests__/view-overlay.spec.ts
    - apps/web/src/components/timetable/__tests__/ChangeIndicator.test.tsx
    - apps/web/src/components/notifications/__tests__/NotificationBell.test.tsx
    - apps/web/src/hooks/__tests__/useNotificationSocket.test.ts
    - packages/shared/src/types/substitution.ts
    - packages/shared/src/types/notification.ts
  modified:
    - apps/api/prisma/schema.prisma
    - apps/api/src/app.module.ts
    - packages/shared/src/index.ts

key-decisions:
  - "[Phase 06]: Followed Phase 4 Nyquist Wave 0 pattern — all 12 it.todo() stubs created before any business logic"
  - "[Phase 06]: Denormalized lesson identity on Substitution (classSubjectId + dayOfWeek + periodNumber + weekType) so rows survive TimetableRun churn without lessonId FK cascade (Pitfall 1)"
  - "[Phase 06]: ClassBookEntry.substitutionId uses SetNull cascade (not Cascade) to preserve audit trail of past substitutions if Substitution row is deleted"
  - "[Phase 06]: HandoverNote.substitutionId is @unique so exactly one note per substitution is enforced at the DB layer (D-20)"
  - "[Phase 06]: Substitution.lessonId has no @relation block (deliberate soft reference) — denormalized fields preserve identity across TimetableRun regeneration"
  - "[Phase 06]: AbsenceReason taxonomy uses Austrian-specific values (KRANK|FORTBILDUNG|DIENSTREISE|SCHULVERANSTALTUNG|ARZTTERMIN|SONSTIGES) matching Lehrverpflichtungsgesetz wording"

patterns-established:
  - "Wave 0 stubs: every spec file starts with `import { describe, it } from 'vitest';` and uses `it.todo(...)` only — compiles cleanly, reports as pending"
  - "Phase 6 schema extensions appended at end of schema.prisma below a banner comment block delineating phase ownership"
  - "Shared types grouped per-domain (substitution.ts, notification.ts) with enums + DTOs + event payloads co-located per file"

requirements-completed: []
# Requirements SUBST-01..SUBST-06 are scaffolded via Wave 0 stubs but NOT satisfied yet;
# they are completed incrementally by Plans 06-02..06-06 as the it.todo() entries are replaced
# with real assertions + implementation.

# Metrics
duration: 7min
completed: 2026-04-05
---

# Phase 06 Plan 01: Schema Foundation + Wave 0 Test Stubs Summary

**Prisma schema extended with 5 Substitution-Planning models + 5 enums, @schoolflow/shared DTOs/events for api+web, empty SubstitutionModule scaffold, and 12 Wave 0 it.todo() spec stubs unblocking parallel implementation of Plans 06-02..06-06.**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-05T09:02:14Z
- **Completed:** 2026-04-05T09:10:00Z
- **Tasks:** 3
- **Files modified/created:** 18 (3 modified, 15 created)

## Accomplishments

- **Prisma schema foundation:** 5 new models (TeacherAbsence, Substitution, HandoverNote, HandoverAttachment, Notification) and 5 new enums (AbsenceReason, AbsenceStatus, SubstitutionType, SubstitutionStatus, NotificationType) pushed to Postgres via `db push`. ClassBookEntry.substitutionId FK added with SetNull cascade for audit trail preservation.
- **Shared types:** @schoolflow/shared now exports TeacherAbsenceDto, SubstitutionDto, RankedCandidateDto, ScoreBreakdown, HandoverNoteDto, HandoverAttachmentDto, FairnessStatRow, SubstitutionCreatedEvent, NotificationDto, NotificationNewEvent, NotificationBadgeEvent. String unions match Prisma enum values verbatim so API-side casts from prisma.teacherAbsence.findMany() results type-check cleanly.
- **SubstitutionModule scaffold:** Empty NestJS module registered in AppModule (alphabetical position between StudentModule and ClassModule); providers/controllers to be added by Plans 02-04.
- **12 Wave 0 spec stubs:** 72 it.todo() entries across 12 spec files map 1:1 to SUBST-01..06 acceptance criteria. All spec files compile; Vitest reports them as pending (passing build).

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend Prisma schema with Phase 6 entities and push to database** — `8d45f06` (feat)
2. **Task 2: Add Phase 6 shared types to @schoolflow/shared package** — `b20443a` (feat)
3. **Task 3: Create SubstitutionModule scaffold and 12 Wave 0 test stubs** — `03b60d6` (test)

## Files Created/Modified

### Modified
- `apps/api/prisma/schema.prisma` — Added Phase 6 enums + models + back-relations, plus ClassBookEntry.substitutionId FK (344 additions, 191 changes/reformat from `prisma format`)
- `apps/api/src/app.module.ts` — Import + register `SubstitutionModule`
- `packages/shared/src/index.ts` — Re-export substitution + notification modules (alphabetical)

### Created
- `packages/shared/src/types/substitution.ts` — Enums, DTOs, SubstitutionCreatedEvent
- `packages/shared/src/types/notification.ts` — NotificationType, NotificationDto, NotificationNewEvent, NotificationBadgeEvent
- `apps/api/src/modules/substitution/substitution.module.ts` — Empty module scaffold
- `apps/api/src/modules/substitution/absence/teacher-absence.service.spec.ts` — 8 it.todo (SUBST-01)
- `apps/api/src/modules/substitution/substitution/ranking.service.spec.ts` — 14 it.todo (SUBST-02)
- `apps/api/src/modules/substitution/substitution/substitution.service.spec.ts` — 8 it.todo (SUBST-03/05, D-04/D-14)
- `apps/api/src/modules/substitution/substitution/substitution-stats.service.spec.ts` — 8 it.todo (SUBST-06)
- `apps/api/src/modules/substitution/notification/notification.service.spec.ts` — 8 it.todo (SUBST-03)
- `apps/api/src/modules/substitution/notification/notification.gateway.spec.ts` — 6 it.todo (SUBST-03)
- `apps/api/src/modules/substitution/handover/handover.service.spec.ts` — 9 it.todo (SUBST-04)
- `apps/api/src/modules/substitution/substitution.module.spec.ts` — 3 it.todo (module wiring)
- `apps/api/src/modules/timetable/__tests__/view-overlay.spec.ts` — 8 it.todo (SUBST-05, timetable overlay)
- `apps/web/src/components/timetable/__tests__/ChangeIndicator.test.tsx` — 5 it.todo (SUBST-05, stillarbeit variant)
- `apps/web/src/components/notifications/__tests__/NotificationBell.test.tsx` — 6 it.todo (SUBST-03)
- `apps/web/src/hooks/__tests__/useNotificationSocket.test.ts` — 5 it.todo (SUBST-03)

## Decisions Made

1. **Denormalized lesson identity on Substitution.** Substitution.lessonId is a soft reference (no @relation block). The denormalized columns classSubjectId/dayOfWeek/periodNumber/weekType preserve lesson identity across TimetableRun regeneration, per 06-RESEARCH.md Pitfall 1.

2. **ClassBookEntry.substitutionId cascade = SetNull.** Consistent with Phase 4's TimetableLessonEdit audit-trail pattern (STATE.md decision). Deleting a Substitution row must not destroy the ClassBookEntry history.

3. **HandoverNote.substitutionId @unique.** DB-level enforcement of D-20 ("exactly one handover note per substitution"), matching Phase 5 ExcuseAttachment unique-per-excuse precedent.

4. **Appended Phase 6 block at end of schema.prisma.** Under a banner comment block, keeping phase ownership clear for future archaeology. `prisma format` reformatted ~191 existing lines for alignment (cosmetic only, no semantic changes).

5. **Module registered alphabetically between StudentModule and ClassModule.** Follows existing ordering in app.module.ts (alphabetical within logical groups).

## Deviations from Plan

None — plan executed exactly as written. All three tasks completed without any auto-fixes triggering (Rules 1-3) and no architectural decisions needing escalation (Rule 4). The plan's `<interfaces>` block provided verbatim schema and TypeScript, so no interpretation was required.

## Issues Encountered

**1. `pnpm --filter @schoolflow/api prisma` script name mismatch (minor).**
- The plan's verification command `pnpm --filter @schoolflow/api prisma format` assumed a `prisma` npm script in apps/api/package.json. apps/api/package.json has no such script (Prisma is invoked via `pnpm exec prisma` convention).
- Resolved by running `cd apps/api && pnpm exec prisma format && pnpm exec prisma db push --accept-data-loss && pnpm exec prisma generate` — same end result, different invocation.
- Not a deviation; not in scope to add a script.

## Next Phase Readiness

**Ready for Plan 06-02 onward (parallel waves):**
- All 5 Prisma models queryable via `prisma.teacherAbsence`, `prisma.substitution`, `prisma.handoverNote`, `prisma.handoverAttachment`, `prisma.notification`.
- @schoolflow/shared exports all Phase 6 DTOs + event payloads; both api and web consume cleanly (tsc --noEmit exits 0 on both sides).
- SubstitutionModule is registered in AppModule — subsequent plans only need to add providers/controllers to the module definition.
- All 12 Wave 0 spec files exist with it.todo() stubs. Vitest reports 123 todo tests in the api test run (72 from Phase 6 Wave 0 + existing from prior phases) and 47 in the web test run. Plans 06-02..06-06 will replace these stubs with real assertions + implementation per Nyquist pattern.

**Verification summary:**
- `apps/api/prisma/schema.prisma`: 5 new models present, 5 new enums present, ClassBookEntry.substitutionId unique FK present, both ClassBookSubstitution relation sides present, School.teacherAbsences + Teacher.absences back-relations present.
- `prisma db push --accept-data-loss` exit code 0, "Your database is now in sync with your Prisma schema".
- `prisma generate` exit code 0, "Generated Prisma Client (7.6.0)".
- `pnpm --filter @schoolflow/api test -- --run substitution` exit code 0: 22 test files, 189 passed + 123 todo.
- `pnpm --filter @schoolflow/web test -- --run ChangeIndicator NotificationBell useNotificationSocket` exit code 0: 9 files (3 new + 6 existing) all todo/pending.
- `cd apps/api && pnpm exec nest build` exit code 0: 264 files compiled, 0 TS issues.
- `cd apps/web && pnpm exec tsc --noEmit` exit code 0: no errors.
- `grep -rc it.todo apps/api/src/modules/substitution/` sums to 64 (+ 8 in timetable view-overlay = 72 API total).

## Known Stubs

All 12 spec files contain only `it.todo()` entries by design. This is the entire deliverable of a Nyquist Wave 0 plan — stubs are intentional and will be filled in by Plans 06-02 through 06-06. No business logic was written in this plan, and the empty SubstitutionModule scaffold is documented as such in `apps/api/src/modules/substitution/substitution.module.ts` with a comment block explaining that providers/controllers arrive in later plans.

## Self-Check: PASSED

- [x] apps/api/prisma/schema.prisma modified (verified via git log)
- [x] apps/api/src/app.module.ts modified (SubstitutionModule registered)
- [x] packages/shared/src/types/substitution.ts exists
- [x] packages/shared/src/types/notification.ts exists
- [x] packages/shared/src/index.ts modified
- [x] All 12 spec files exist on disk (ls confirmed)
- [x] apps/api/src/modules/substitution/substitution.module.ts exists
- [x] Commit 8d45f06 present in git log
- [x] Commit b20443a present in git log
- [x] Commit 03b60d6 present in git log
- [x] prisma db push succeeded (verified via command exit)
- [x] prisma generate succeeded
- [x] API tsc/build clean
- [x] Web tsc clean
- [x] Test files discoverable by Vitest (22 API + 9 web test files picked up)
- [x] 72 it.todo entries added across Phase 6 Wave 0 specs (>= 50 requirement)

---
*Phase: 06-substitution-planning*
*Completed: 2026-04-05*
