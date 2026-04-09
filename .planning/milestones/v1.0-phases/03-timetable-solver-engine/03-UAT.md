---
status: testing
phase: 03-timetable-solver-engine
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md, 03-03-SUMMARY.md, 03-04-SUMMARY.md, 03-05-SUMMARY.md, 03-06-SUMMARY.md]
started: 2026-03-30T20:40:00Z
updated: 2026-03-30T20:40:00Z
---

## Current Test

number: 1
name: Cold Start Smoke Test
expected: |
  Kill any running services. Run `docker compose -f docker/docker-compose.yml up -d` to start postgres, redis, keycloak, and the new solver service. Run `pnpm --filter api prisma db push` and `pnpm --filter api start:dev`. Server boots without errors. Solver sidecar health check at http://localhost:8081/health returns 200 OK.
awaiting: user response

## Tests

### 1. Cold Start Smoke Test
expected: Kill any running services. Run `docker compose -f docker/docker-compose.yml up -d` to start all infra including the solver sidecar. Run `pnpm --filter api prisma db push` and `pnpm --filter api start:dev`. Server boots without errors. Solver health check at http://localhost:8081/health returns 200 OK.
result: [pending]

### 2. Room CRUD — Create Room
expected: POST `/api/v1/schools/:schoolId/rooms` with `{ "name": "Turnsaal 1", "type": "TURNSAAL", "capacity": 30, "equipment": ["Matten"] }` returns 201 with room ID, type enum, and equipment array. Room is persisted in database.
result: [pending]

### 3. Room CRUD — List & Filter Rooms
expected: GET `/api/v1/schools/:schoolId/rooms` returns paginated list of rooms. Rooms show name, type, capacity, and equipment. Creating multiple rooms of different types and listing returns all of them.
result: [pending]

### 4. Room CRUD — Update & Delete Room
expected: PATCH `/api/v1/schools/:schoolId/rooms/:id` with changed capacity updates the room. DELETE `/api/v1/schools/:schoolId/rooms/:id` removes the room. Subsequent GET for deleted room returns 404.
result: [pending]

### 5. Solver Sidecar — Start Solve
expected: POST to solver sidecar `/solve` with a valid SolveRequest payload (timeslots, rooms, lessons with teachers/subjects/student groups) returns 202 with a solve ID. GET `/status/:id` shows the solve is running with score data.
result: [pending]

### 6. Solver Sidecar — Hard Constraints Hold
expected: Submit a solve request with conflicting lessons (same teacher, same timeslot). After solving, the result has hard score = 0 (no violations) — the solver separates conflicting lessons into different timeslots. No teacher teaches two classes simultaneously.
result: [pending]

### 7. Constraint Template CRUD
expected: POST `/api/v1/schools/:schoolId/constraint-templates` with `{ "type": "BLOCK_TIMESLOT", "parameters": {...}, "isActive": true }` creates a constraint template. GET returns it. PATCH toggles isActive. Templates are available for solver input aggregation.
result: [pending]

### 8. Start Timetable Solve via NestJS API
expected: POST `/api/v1/schools/:schoolId/timetable/solve` (with JWT auth) creates a TimetableRun in PENDING state, enqueues a BullMQ job, and returns the run ID. GET `/api/v1/schools/:schoolId/timetable/runs` lists the run.
result: [pending]

### 9. Solve Progress via WebSocket
expected: Connect to Socket.IO namespace `/solver` with `?schoolId=...`. Start a solve. Receive `solve:progress` events with hardScore, softScore, elapsedSeconds, and improvementRate. After solving completes, receive `solve:complete` event.
result: [pending]

### 10. Stop Solve Early
expected: While a solve is running, DELETE `/api/v1/schools/:schoolId/timetable/runs/:id/stop` terminates the solver. The run transitions to COMPLETED status with the best-so-far result. WebSocket emits `solve:complete`.
result: [pending]

### 11. Conflict Explanation for Infeasible Timetable
expected: After a solve run completes (especially one with remaining hard violations), GET `/api/v1/schools/:schoolId/timetable/runs/:id/violations` returns grouped constraint violations with type, count, and entity references (e.g., "Teacher Mueller on Monday P3").
result: [pending]

### 12. Solve Run Lifecycle — Keep Last 3
expected: Create 4 solve runs for the same school. After the 4th completes, only the 3 most recent runs remain. The oldest run is auto-deleted. GET `/runs` confirms exactly 3 runs.
result: [pending]

## Summary

total: 12
passed: 0
issues: 0
pending: 12
skipped: 0
blocked: 0

## Gaps

[none yet]
