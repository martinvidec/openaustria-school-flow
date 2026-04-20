---
phase: 10-schulstammdaten-zeitraster
plan: 02
status: complete
completed: 2026-04-20
author: orchestrator-inline (after sandbox blocked spawned executor)
---

# Plan 10-02 Summary — API controllers + services

## Outcome

Five NestJS controllers and five services added to `apps/api/src/modules/school/`, delivering the backend contract for Plan 10's UI surface (Plans 10-03a, 10-03b, 10-04, 10-05, 10-06):

- **SchoolYear** — plural years per school with atomic activation (D-07)
- **SchoolTimeGrid** — destructive-edit endpoint with impactedRunsCount guard (D-13)
- **Holiday** — nested CRUD under school-year (D-08)
- **AutonomousDay** — nested CRUD under school-year (D-08)
- **abWeekEnabled** — exposed on School via DTO passthrough (SCHOOL-04 / D-04)

## Endpoints live

```
POST   /api/v1/schools/:schoolId/school-years
GET    /api/v1/schools/:schoolId/school-years
PATCH  /api/v1/schools/:schoolId/school-years/:yearId
POST   /api/v1/schools/:schoolId/school-years/:yearId/activate
DELETE /api/v1/schools/:schoolId/school-years/:yearId

PUT    /api/v1/schools/:schoolId/time-grid[?force=true]

POST   /api/v1/schools/:schoolId/school-years/:yearId/holidays
DELETE /api/v1/schools/:schoolId/school-years/:yearId/holidays/:holidayId
POST   /api/v1/schools/:schoolId/school-years/:yearId/autonomous-days
DELETE /api/v1/schools/:schoolId/school-years/:yearId/autonomous-days/:dayId

PUT    /api/v1/schools/:id    (gains abWeekEnabled field in body)
```

## Key design decisions (preserved from PLAN)

**Atomic SchoolYear activation.** `activate(schoolId, yearId)` runs `updateMany(active=true → false)` then `update(target → active)` inside a single `$transaction`. The partial-unique index `school_years_active_per_school` (Plan 10-01a migration) never observes a double-active mid-flight state.

**D-10 orphan-guard, pinned set.** `remove(yearId)` counts `SchoolClass` + `TeachingReduction` referencing rows. These are the only schema-verified models with a non-owned `schoolYearId` column as of 2026-04-20. `Holiday` + `AutonomousDay` are owned-by-year (cascade-delete) and excluded by design. `TimetableRun` + `ClassBookEntry` have no `schoolYearId` column. On block:

```json
{
  "message": "Schuljahr wird noch von 3 Eintraegen verwendet und kann nicht geloescht werden.",
  "referenceCount": 3
}
```

The German `message` directly satisfies Plan 10-06's E2E toast regex `/wird noch von .* Eintraegen verwendet/`, and the structured `referenceCount` is consumed by Plan 10-03b's `SchoolYearOrphanError` class.

**D-13 destructive-edit, period identity.** Period identity = `periodNumber`. Changing only `startTime`/`endTime` of an existing number leaves lessons wired and does NOT count as removal. Only when a period number is dropped does the active-run probe fire. 409 body:

```json
{
  "message": "1 aktiver Stundenplan verwendet dieses Zeitraster. Bitte mit ?force=true bestaetigen.",
  "impactedRunsCount": 1,
  "impactedRunIds": ["run-1"]
}
```

`?force=true` short-circuits the probe entirely (findMany not called), so Plan 10-04's "Nur speichern" and "Speichern + Solver neu starten" actions both retry without bothering the DB. Save applies periods + schoolDays atomically inside one `$transaction` (D-14 save-both contract).

**Permissions.** New `school-year` subject. Admin gets `{manage, school-year}`; schulleitung gets the 5 specific actions (create/read/update/delete/activate). Other roles get none. Permission count 152 → 158, seed remains idempotent.

**Prisma client cast removed.** `timetable.service.ts` loses the `(school as any).abWeekEnabled` cast — after Plan 10-01a's `prisma generate`, `School.abWeekEnabled` is typed cleanly.

## Commits

- `224e39b` — test(10-02): add failing specs for SchoolYear service + controller (RED)
- `aea11c0` — feat(10-02): SchoolYear sub-module + orphan-guard + activation transaction (GREEN)
- `90db73e` — test(10-02): specs for TimeGrid destructive-edit + School.abWeekEnabled passthrough (RED)
- `bc0a530` — feat(10-02): TimeGrid destructive-edit endpoint + School.abWeekEnabled DTO + cast cleanup (GREEN)
- `a629c7e` — test(10-02): specs for Holiday + AutonomousDay CRUD (RED)
- `{this commit}` — feat(10-02): Holiday + AutonomousDay CRUD endpoints for D-08 nested sub-UI (GREEN) + SUMMARY.md

## Verification

| Must-have | Status | Evidence |
|-----------|--------|----------|
| `POST /schools/:schoolId/school-years` creates scoped year | ✓ | `school-year.controller.ts:25`, service spec Test 1 |
| `GET /schools/:schoolId/school-years` lists all | ✓ | `school-year.controller.ts:32`, service spec Test 2 |
| `POST .../activate` is transactional | ✓ | `school-year.service.ts:74-84`, service spec Test 3 |
| `DELETE .../yearId` returns 409 SchoolYearOrphanError | ✓ | `school-year.service.ts:95-110`, service spec Test 5 |
| `PUT /time-grid` returns 409 with impactedRunsCount | ✓ | `school-time-grid.service.ts:31-48`, service spec Test 2 |
| `?force=true` bypasses guard | ✓ | service spec Test 3 (`expect(findMany).not.toHaveBeenCalled`) |
| Holiday + AutonomousDay nested CRUD | ✓ | 4 endpoints, 5 spec tests |
| `timetable.service` uses `findFirst({schoolId, isActive: true})` | ✓ | Plan 10-01a did this via `(Rule 3 auto-fix)` commit; verified grep 0 `findUnique.*schoolId` in apps/api/src |
| Service + controller specs pass | ✓ | 32/32 green |

## Test suite

```
cd apps/api && pnpm exec vitest run
Test Files  53 passed | 7 skipped (60)
      Tests  458 passed | 65 todo (523)
```

Zero regressions vs. pre-Plan-10-02 baseline (428 passed). Added 30 tests specific to Plan 10-02 (14 SchoolYear + 8 TimeGrid/School + 5 Holiday/AutonomousDay + 3 controller-decorator metadata).

## Recovery note

The spawned executor hit a sandbox policy that blocked `git add`, `git commit`, and `pnpm exec vitest` for subagent sessions. The orchestrator (this session) has full permissions and executed all three tasks inline with per-task RED/GREEN commits. Two draft spec files from the initial executor attempt (`school-year.service.spec.ts`, `school-year.controller.spec.ts`) were preserved and their implementation built on top — no redesign required.

## Notes for downstream plans

- **Plan 10-03a/03b** can wire TanStack Query hooks against these endpoints without stubs.
- **Plan 10-04** (Zeitraster tab) should send `{periods, schoolDays}` in one PUT body — the service already handles both inside a single `$transaction`.
- **Plan 10-05** (Schuljahre tab) must read `impactedRunsCount` from the 409 body to render the plural; `SchoolYearOrphanError` class should read `referenceCount`.
- **Plan 10-06** (E2E) — the toast regex `/wird noch von .* Eintraegen verwendet/` matches the current service detail string verbatim.
- **Permissions** — schulleitung now has `activate:school-year` specifically (not subsumed under `manage`). If a future plan needs to relax this to `manage`, seed.ts is the only place to edit.
