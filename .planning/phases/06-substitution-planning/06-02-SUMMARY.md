---
phase: 06-substitution-planning
plan: 02
subsystem: backend
tags: [nestjs, prisma, substitution, tdd, serializable-tx, range-expansion]

# Dependency graph
requires:
  - phase: 06-substitution-planning
    plan: 01
    provides: Prisma models (TeacherAbsence, Substitution, HandoverNote, Notification), shared DTOs, Wave 0 it.todo stubs, empty SubstitutionModule scaffold
  - phase: 04-timetable-viewing-editing
    provides: TimetableRun.isActive + abWeekEnabled flags, TimetableLesson denormalized identity source
  - phase: 05-digital-class-book
    provides: ClassBookEntry model with Phase 6 substitutionId FK (@unique, SetNull cascade)
provides:
  - TeacherAbsenceService.create() with transactional range expansion across calendar days, A/B week cycles, and period bounds
  - TeacherAbsenceService.cancel() that preserves CONFIRMED/OFFERED/DECLINED Substitution rows for the audit trail
  - TeacherAbsenceController at /schools/:schoolId/absences (POST/GET/GET-one/DELETE) with @CheckPermissions
  - SubstitutionService lifecycle (assignSubstitute, respondToOffer, setEntfall, setStillarbeit) with Pitfall 2 Serializable re-check and D-14 ClassBookEntry linkage
  - SubstitutionController at /schools/:schoolId/substitutions (list, getOne, assign, respond, entfall, stillarbeit)
  - ab-week.util.ts pure helpers (isWeekCompatible, resolveWeekType) resolving 06-RESEARCH Open Question 3
  - 24 real Vitest cases replacing 16 it.todo stubs across teacher-absence + substitution spec files
affects: [06-03, 06-04, 06-05, 06-06]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Prisma $transaction (async (tx) => {...}) pattern with isolationLevel: 'Serializable' option for Pitfall 2 stale-candidate guard"
    - "date-fns eachDayOfInterval + getDay JS-index-to-DayOfWeek enum mapping (MONDAY..SUNDAY) for calendar range expansion"
    - "ClassBookEntry upsert keyed on @unique substitutionId FK for idempotent D-14 linkage across state transitions"
    - "Nested teacherAbsence.findUniqueOrThrow inside helper upserts to resolve schoolId for ClassBookEntry FK (tenant isolation)"
    - "PrismaService buildMockPrisma helper pattern — captures __lastTransactionOptions for isolationLevel assertion in tests"

key-files:
  created:
    - apps/api/src/modules/timetable/ab-week.util.ts
    - apps/api/src/modules/substitution/dto/teacher-absence.dto.ts
    - apps/api/src/modules/substitution/dto/substitution.dto.ts
    - apps/api/src/modules/substitution/absence/teacher-absence.service.ts
    - apps/api/src/modules/substitution/absence/teacher-absence.controller.ts
    - apps/api/src/modules/substitution/substitution/substitution.service.ts
    - apps/api/src/modules/substitution/substitution/substitution.controller.ts
  modified:
    - apps/api/src/modules/substitution/substitution.module.ts
    - apps/api/src/modules/substitution/absence/teacher-absence.service.spec.ts
    - apps/api/src/modules/substitution/substitution/substitution.service.spec.ts

key-decisions:
  - "[Phase 06]: Controllers use schools/:schoolId/... URL pattern (not req.user.schoolId) because AuthenticatedUser does not carry schoolId and all existing controllers in the codebase follow this school-scoped mounting convention"
  - "[Phase 06]: ClassBookEntry.teacherId fallback on Stillarbeit without supervisor → originalTeacherId (FK is required, not nullable); preserves audit trail that the lesson was 'owned' by the originally scheduled teacher with only a Stillarbeit marker"
  - "[Phase 06]: Pitfall 2 stale-candidate re-check inlined in SubstitutionService.assignSubstitute (not delegated to RankingService) because RankingService arrives in Plan 06-03; the minimal check (conflicting TimetableLesson + conflicting OFFERED/CONFIRMED Substitution) satisfies the correctness contract and is the exact query RankingService.passesHardFilters will reuse"
  - "[Phase 06]: CBE upserts resolve schoolId via teacherAbsence.findUniqueOrThrow lookup inside the same transaction rather than threading it through the Substitution row; avoids schema denormalization at the cost of one extra indexed lookup per state transition"
  - "[Phase 06]: Vitest mock $transaction implementation `vi.fn((cb, opts) => { mock.__lastTransactionOptions = opts; return cb(mock); })` captures the options arg so tests can assert isolationLevel='Serializable' was requested"

patterns-established:
  - "Substitution lifecycle transition functions always wrap in prisma.$transaction even for single-table updates — ensures CBE side-effects (D-14) are atomic with the status change"
  - "DTO layer uses string-literal union types (ABSENCE_REASON_VALUES as const) fed to @IsEnum(...) so validation and TypeScript types stay in lockstep"
  - "Controllers match school-scoped URL convention (/schools/:schoolId/<resource>) inherited from Phase 2+ — never uses user.schoolId off AuthenticatedUser"

requirements-completed:
  - SUBST-01
  # SUBST-05 mutation side satisfied here; read side (overlay view) lands in Plan 06-04

# Metrics
duration: 10min
completed: 2026-04-05
---

# Phase 06 Plan 02: Absence + Substitution Lifecycle Summary

**TeacherAbsence range expansion with A/B week + period-bound support and the full Substitution lifecycle (assign with Serializable re-check, respond, entfall, stillarbeit) with D-14 ClassBookEntry linkage, shipping SUBST-01 + the mutation side of SUBST-05.**

## Performance

- **Duration:** 10 min
- **Started:** 2026-04-05T09:17:00Z
- **Completed:** 2026-04-05T09:27:00Z
- **Tasks:** 2 (both TDD-style: RED commit, then GREEN commit)
- **Files modified/created:** 10 (2 modified, 8 created)

## Accomplishments

- **Range expansion implementation** — `TeacherAbsenceService.create()` validates `dateFrom<=dateTo` and `periodFrom<=periodTo`, then opens a Prisma `$transaction`. Inside the transaction it fetches the school's active `TimetableRun`, loads `SchoolDay.isActive` into a `Set<DayOfWeek>`, creates the `TeacherAbsence` row, and iterates `eachDayOfInterval({start: dateFrom, end: dateTo})`. For each calendar day the JS index (0=Sunday) is mapped to the Prisma `DayOfWeek` enum via a fixed 7-element array; non-school days are skipped via the set lookup. For each active day, `tx.timetableLesson.findMany({runId, teacherId, dayOfWeek})` returns the teacher's scheduled lessons, which are filtered by (a) `isWeekCompatible(date, lesson.weekType, activeRun.abWeekEnabled)` from the new ab-week util (Open Question 3 resolution) and (b) period bounds when provided. Matching rows are batched into a single `tx.substitution.createMany({data})` call and `affectedLessonCount` is returned from the insert result. Zero-match is handled cleanly — the absence is still persisted, createMany is skipped, `affectedLessonCount=0`.

- **Pitfall 2 Serializable guard** — `SubstitutionService.assignSubstitute()` wraps its state transition in `prisma.$transaction(fn, { isolationLevel: 'Serializable' })`. Inside the transaction it (1) re-fetches the substitution with `findUniqueOrThrow`, (2) refuses to reassign if current status is not `PENDING` or `DECLINED` (idempotency guard), (3) fetches `TeacherAbsence.schoolId` → the active `TimetableRun[]` for that school, (4) re-runs the minimal hard-filter check: a conflicting `TimetableLesson` for the candidate at the same `(dayOfWeek, periodNumber)` in any active run, OR a conflicting `Substitution` row for the candidate at the same `date + periodNumber` with status `OFFERED|CONFIRMED` (excluding the current row). Either conflict throws `ConflictException('… ist nicht mehr verfügbar.')` which the client sees as HTTP 409. If both checks pass, the row is updated to `status='OFFERED', type='SUBSTITUTED'` with `substituteTeacherId` and `offeredAt`. Two admins racing to assign the same candidate will have one succeed and one get 409.

- **D-14 ClassBookEntry linkage** — `respondToOffer(accept=true)` on a `SUBSTITUTED` row calls `upsertClassBookEntryForSubstitution(tx, sub)` which looks up `schoolId` from the linked `TeacherAbsence` and upserts a `ClassBookEntry` keyed on `substitutionId` (the `@unique` FK from Plan 01). The CBE's `teacherId` points to the substitute, and the row carries all denormalized lesson identity fields (`classSubjectId`, `dayOfWeek`, `periodNumber`, `weekType`, `date`). `setEntfall()` explicitly calls `tx.classBookEntry.deleteMany({where: {substitutionId}})` so flipping `STILLARBEIT → ENTFALL` cleans up any previously-linked CBE (ENTFALL has no classbook footprint). `setStillarbeit()` upserts a CBE with `thema='Stillarbeit'` and `lehrstoff=null`, resolving Open Question 4. Because `ClassBookEntry.teacherId` is a required FK, when no supervisor is supplied the helper falls back to `sub.originalTeacherId` — the "owning" teacher stays the originally scheduled one, just with a Stillarbeit marker.

- **ab-week.util.ts** — Pure functions, no DI, only `date-fns.getISOWeek` as an import. `isWeekCompatible(date, lessonWeekType, abWeekEnabled)` short-circuits to `true` when `abWeekEnabled=false` or `lessonWeekType='BOTH'`, then compares the ISO-week parity (odd→A, even→B) to the lesson's stored weekType. `resolveWeekType(date, abWeekEnabled)` returns the active A/B/BOTH literal for a given calendar date. This resolves 06-RESEARCH Open Question 3 and is reusable by Plan 06-04's overlay renderer.

- **DTO layer with class-validator** — `CreateTeacherAbsenceDto`, `ListAbsencesQueryDto`, `AssignSubstituteDto`, `RespondToOfferDto`, `SetStillarbeitDto` all use definite assignment assertions (`!`) matching the Phase 1/2/4 TS 6.0 strict-mode pattern. `@Type(() => Number)` applied to numeric query params to handle string→number coercion for `?limit=10` style requests. String-literal union types exported as `const` arrays (`ABSENCE_REASON_VALUES`) feed both `@IsEnum()` and the derived TypeScript literal type.

- **24 real Vitest cases** replace 16 `it.todo()` stubs from Plan 06-01:
  - `teacher-absence.service.spec.ts`: 11 real tests (3-day fan-out, period bounds, A/B week filter, transaction rollback, zero-match edge case, 2 validation errors, missing-run NotFoundException, cancel audit-trail preservation, cancel NotFound, findManyForSchool with _count join).
  - `substitution.service.spec.ts`: 13 real tests (PENDING→OFFERED transition, Serializable isolation assertion via `__lastTransactionOptions`, conflicting-lesson 409, conflicting-substitution 409, CONFIRMED-state idempotency, accept→CONFIRMED+CBE, decline→DECLINED+no-CBE, ForbiddenException for wrong user, non-OFFERED state conflict, setEntfall deletes CBE, setStillarbeit with supervisor thema='Stillarbeit', setStillarbeit fallback to originalTeacherId, findManyPending where-clause assertion).

## Task Commits

1. **Task 1 RED (failing tests)** — `217a874` (test): 10 absence service tests + ab-week.util.ts + CreateTeacherAbsenceDto
2. **Task 1 GREEN (implementation)** — `3c17241` (feat): TeacherAbsenceService + TeacherAbsenceController + SubstitutionModule wiring
3. **Task 2 RED (failing tests)** — `4de695f` (test): 13 substitution service tests + 3 substitution DTOs
4. **Task 2 GREEN (implementation)** — `3696f21` (feat): SubstitutionService + SubstitutionController + module expansion

## Files Created/Modified

### Created
- `apps/api/src/modules/timetable/ab-week.util.ts` — Pure functions `isWeekCompatible` + `resolveWeekType` (Open Question 3)
- `apps/api/src/modules/substitution/dto/teacher-absence.dto.ts` — `CreateTeacherAbsenceDto`, `ListAbsencesQueryDto`, exported literal unions
- `apps/api/src/modules/substitution/dto/substitution.dto.ts` — `AssignSubstituteDto`, `RespondToOfferDto`, `SetStillarbeitDto`
- `apps/api/src/modules/substitution/absence/teacher-absence.service.ts` — CRUD + range expansion (225 lines)
- `apps/api/src/modules/substitution/absence/teacher-absence.controller.ts` — REST endpoints with @CheckPermissions
- `apps/api/src/modules/substitution/substitution/substitution.service.ts` — Lifecycle methods + CBE helpers (330 lines)
- `apps/api/src/modules/substitution/substitution/substitution.controller.ts` — REST endpoints (5 routes)

### Modified
- `apps/api/src/modules/substitution/substitution.module.ts` — Registered TeacherAbsenceService, TeacherAbsenceController, SubstitutionService, SubstitutionController (previously empty scaffold from Plan 01)
- `apps/api/src/modules/substitution/absence/teacher-absence.service.spec.ts` — 8 it.todo → 11 real it() assertions
- `apps/api/src/modules/substitution/substitution/substitution.service.spec.ts` — 8 it.todo → 13 real it() assertions

## Decisions Made

1. **Controllers mount at `/schools/:schoolId/<resource>`** (not the plan's suggested `@Controller('absences')` with `req.user.schoolId`). The `AuthenticatedUser` interface in this codebase does NOT carry `schoolId`; all existing controllers (`classbook/excuses`, `rooms`, `resources`, `timetable`) use the school-scoped URL pattern. This keeps CASL guard parity with Phase 2-5 and avoids threading a new field through the JWT strategy.

2. **Stillarbeit without supervisor → fallback to `originalTeacherId` for CBE FK.** `ClassBookEntry.teacherId` is a required (non-nullable) field in the schema. When an admin sets a lesson to Stillarbeit without naming a supervising teacher (D-04 permits this), the CBE still needs a valid teacher FK. The originally scheduled teacher is the authoritative "owner" for the audit trail — the substitution's Stillarbeit marker records the policy decision, while the CBE keeps the lesson attributed to whoever was supposed to teach it. An alternative (a placeholder "system" teacher row) was rejected as schema pollution.

3. **Pitfall 2 re-check is inlined in `SubstitutionService.assignSubstitute`, not delegated to a RankingService method.** Plan 06-03 owns the full `RankingService.passesHardFilters()` implementation. To avoid a circular plan dependency, Plan 06-02 re-implements the minimal hard-filter check directly: (a) conflicting TimetableLesson at the slot in an active run, (b) conflicting OFFERED/CONFIRMED Substitution at the same date+period. This is exactly the check RankingService will formalize in 06-03 — no logic is duplicated, only the surface.

4. **CBE helpers look up `schoolId` via `TeacherAbsence.findUniqueOrThrow` inside the transaction** rather than denormalizing schoolId onto the Substitution row. The extra lookup is indexed (`@@index([schoolId, teacherId])` on TeacherAbsence) and runs inside the same `$transaction` so it's consistent with the update. The alternative (adding `schoolId` to Substitution) was rejected because the schema has already been pushed (Plan 06-01) and the lookup cost is negligible compared to the constraint-checking queries surrounding it.

5. **Vitest `$transaction` mock captures options in `mock.__lastTransactionOptions`** so tests can assert `isolationLevel: 'Serializable'` was passed. This is a deliberate extension to the `teacher.service.spec.ts` pattern for Pitfall 2 coverage.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Controller URL pattern corrected from `@Controller('absences')` with `req.user.schoolId` to `@Controller('schools/:schoolId/absences')`**

- **Found during:** Task 1 Step E (controller creation)
- **Issue:** The plan's example code read `req.user.schoolId`, but `AuthenticatedUser` in this codebase only has `id/email/username/roles` — no `schoolId`. A grep for `request.user.schoolId` / `req.user.schoolId` / `user.schoolId` across `apps/api/src` returned zero matches, confirming the field does not exist. The plan's controller would fail at runtime with `undefined` as the tenant id.
- **Fix:** Mounted both controllers under `/schools/:schoolId/<resource>` matching the established pattern in `classbook/excuses`, `rooms`, `resources`, `timetable`, etc. `schoolId` is now a `@Param('schoolId')` on every handler, consistent with Phase 2-5 controllers.
- **Files modified:** `apps/api/src/modules/substitution/absence/teacher-absence.controller.ts`, `apps/api/src/modules/substitution/substitution/substitution.controller.ts`
- **Commits:** `3c17241` (absence), `3696f21` (substitution)
- **Impact on acceptance criteria:** The plan's acceptance criterion `grep "@Controller('absences')"` is technically not satisfied — but the spirit of the criterion (NON-prefixed, no `api/` leak, CheckPermissions guard) is fully satisfied. The `grep "@Controller('api/"` check for double-prefix still returns 0. This deviation keeps the controller consistent with the rest of the codebase instead of drifting.

**2. [Rule 1 - Bug] Substitution spec tests needed a `teacherAbsence.findUniqueOrThrow` mock**

- **Found during:** Task 2 Step D (first spec run)
- **Issue:** The CBE upsert helpers look up `schoolId` via a nested `teacherAbsence.findUniqueOrThrow` call so the created ClassBookEntry has a valid tenant FK. The initial spec mocks did not stub that lookup and 3 tests failed with `TypeError: Cannot read properties of undefined (reading 'schoolId')`.
- **Fix:** Added `prisma.teacherAbsence.findUniqueOrThrow.mockResolvedValue({ schoolId: 'school-1' })` to the 3 affected test cases (`respondToOffer(accept=true)`, `setStillarbeit` with supervisor, `setStillarbeit` without supervisor).
- **Files modified:** `apps/api/src/modules/substitution/substitution/substitution.service.spec.ts`
- **Commit:** folded into `3696f21` (this was a test-side fix to match the implementation, not a separate behavioral change)

## Authentication Gates

None — no external services touched, no auth flows changed.

## Issues Encountered

**1. Parallel plan 06-03 running in the same worktree.** Plan 06-03 was actively editing `ranking.service.spec.ts`, `notification.service.spec.ts`, etc. while this plan ran. When I executed `pnpm --filter @schoolflow/api test` (without a file filter), Vitest picked up the in-flight 06-03 spec files and reported transient failures from their partially-written state. **Resolution:** ran tests via `pnpm exec vitest run <exact-spec-files>` to scope test discovery strictly to Plan 06-02's files. Production build (`pnpm exec nest build`) was always clean because the parallel agent's new files had no type errors of their own. No coordination conflict on shared files — `substitution.module.ts` was touched append-only per the parallel safety note.

## Known Stubs

None — every new file ships with real implementation. All 24 Plan 06-02 Vitest cases assert concrete behavior. The following spec files from Plan 01 intentionally remain as `it.todo()` entries (Plan 06-03/06-04 territory, explicitly scoped out in Plan 06-02):

- `apps/api/src/modules/substitution/substitution/ranking.service.spec.ts` — Plan 06-03
- `apps/api/src/modules/substitution/substitution/substitution-stats.service.spec.ts` — Plan 06-04
- `apps/api/src/modules/substitution/notification/notification.service.spec.ts` — Plan 06-03
- `apps/api/src/modules/substitution/notification/notification.gateway.spec.ts` — Plan 06-03
- `apps/api/src/modules/substitution/handover/handover.service.spec.ts` — Plan 06-04
- `apps/api/src/modules/substitution/substitution.module.spec.ts` — Plan 06-03/04 (final wiring tests)
- `apps/api/src/modules/timetable/__tests__/view-overlay.spec.ts` — Plan 06-04
- Three web-side spec files — Plan 06-05/06

## Self-Check

- [x] `apps/api/src/modules/timetable/ab-week.util.ts` exists and exports `isWeekCompatible` + `resolveWeekType`
- [x] `apps/api/src/modules/substitution/dto/teacher-absence.dto.ts` exists with `teacherId!:` (definite assignment)
- [x] `apps/api/src/modules/substitution/dto/substitution.dto.ts` exists with all 3 DTOs
- [x] `apps/api/src/modules/substitution/absence/teacher-absence.service.ts` exports `TeacherAbsenceService`
- [x] Service file contains `eachDayOfInterval`, `isWeekCompatible`, `$transaction`, `createMany`
- [x] `apps/api/src/modules/substitution/absence/teacher-absence.controller.ts` exists with 4 `@CheckPermissions` decorators
- [x] `apps/api/src/modules/substitution/substitution/substitution.service.ts` exports `SubstitutionService`
- [x] Substitution service contains `isolationLevel: 'Serializable'`, `ConflictException`, `classBookEntry.upsert`, `'Stillarbeit'`, `deleteMany`
- [x] Substitution controller exists with 6 `@CheckPermissions` decorators
- [x] `SubstitutionModule` registers both services + both controllers (grep shows all 4 symbols x2 each)
- [x] No `@Controller('api/...')` anywhere in `apps/api/src/modules/substitution/` (grep returns 0)
- [x] Absence spec has 0 `it.todo` and 11 real `it()` cases
- [x] Substitution spec has 0 `it.todo` and 13 real `it()` cases
- [x] `ranking.service.spec.ts` + 4 other scoped-out spec files still contain `it.todo` entries (Plan 06-03/04 work)
- [x] Commit `217a874` (test RED absence) exists
- [x] Commit `3c17241` (feat GREEN absence) exists
- [x] Commit `4de695f` (test RED substitution) exists
- [x] Commit `3696f21` (feat GREEN substitution) exists
- [x] `pnpm exec vitest run <both spec files>` exits 0 — 24 tests passed
- [x] `pnpm exec nest build` exits 0 — TSC 0 issues, 278 files compiled

## Self-Check: PASSED

---
*Phase: 06-substitution-planning*
*Completed: 2026-04-05*
