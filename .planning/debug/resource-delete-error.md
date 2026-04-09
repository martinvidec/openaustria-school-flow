---
status: investigating
trigger: "Investigate why clicking the delete button on a resource shows an error"
created: 2026-04-02T00:00:00Z
updated: 2026-04-02T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED - apiFetch sets Content-Type: application/json on DELETE requests with no body, causing Fastify 5.x to reject with FST_ERR_CTP_EMPTY_JSON_BODY (400)
test: Traced full code path from frontend to backend
expecting: N/A - root cause confirmed
next_action: Document root cause and return diagnosis

## Symptoms

expected: Clicking Delete on a resource should delete it successfully
actual: Clicking Delete triggers an error message ("Loeschen fehlgeschlagen")
errors: Fastify FST_ERR_CTP_EMPTY_JSON_BODY -> 400 Bad Request -> ProblemDetailFilter catches -> apiFetch sees !res.ok -> throws Error -> toast.error
reproduction: Navigate to resource management, click delete on any resource, confirm in dialog
started: Since resource CRUD was implemented (Phase 4)

## Eliminated

- hypothesis: Double API prefix routing mismatch (controller has api/v1/ AND global prefix adds api/v1/)
  evidence: Vite proxy rewrite in vite.config.ts line 31 already compensates by prepending /api/v1 to school-scoped paths. GET, POST, PATCH all work through same proxy, confirming routes resolve correctly.
  timestamp: 2026-04-02

- hypothesis: CASL permission issue (delete action not granted)
  evidence: Seed data at prisma/seed.ts:101 grants { action: 'manage', subject: 'resource' } to admin. CASL 'manage' matches all actions including 'delete'. POST/PATCH work with same guard pattern.
  timestamp: 2026-04-02

- hypothesis: NestJS route conflict between @Delete(':id') and @Delete('bookings/:bookingId')
  evidence: These are different path segments. UUID resource IDs won't match the literal 'bookings' prefix. Fastify's radix tree handles this correctly.
  timestamp: 2026-04-02

## Evidence

- timestamp: 2026-04-02
  checked: apps/web/src/lib/api.ts (apiFetch helper)
  found: Lines 19-22 set Content-Type: application/json for ALL non-GET requests, including DELETE. DELETE requests from useDeleteResource have no body.
  implication: Fastify receives Content-Type: application/json with empty body

- timestamp: 2026-04-02
  checked: Fastify 5.8.2 behavior with empty JSON body
  found: Fastify 5.x throws FST_ERR_CTP_EMPTY_JSON_BODY (400 Bad Request) when Content-Type is application/json but request body is empty
  implication: This is the direct cause of the error

- timestamp: 2026-04-02
  checked: apps/web/src/hooks/useResources.ts lines 88-95 (useDeleteResource)
  found: Calls apiFetch with { method: 'DELETE' } and no body. apiFetch adds Content-Type: application/json. On !res.ok, throws Error('Loeschen fehlgeschlagen'). onError shows toast.error.
  implication: Error toast message shown to user is "Loeschen fehlgeschlagen"

- timestamp: 2026-04-02
  checked: POST and PATCH mutations in same file
  found: Both POST and PATCH pass body: JSON.stringify(dto), so Content-Type: application/json is appropriate and Fastify parses the body successfully.
  implication: Only DELETE is affected because it's the only mutation without a request body

- timestamp: 2026-04-02
  checked: apps/web/src/hooks/useRoomAvailability.ts line 94
  found: Another DELETE call (room booking cancellation) also goes through apiFetch with no body - same bug, but untested in UAT because blocked by other issues.
  implication: Fix needs to handle all DELETE calls, not just resource delete

## Resolution

root_cause: The apiFetch helper in apps/web/src/lib/api.ts unconditionally sets Content-Type: application/json for all non-GET requests (lines 19-22). DELETE requests for resource deletion have no request body. Fastify 5.x (the HTTP adapter used by NestJS) rejects requests with Content-Type: application/json but an empty body, throwing FST_ERR_CTP_EMPTY_JSON_BODY which results in a 400 Bad Request. The frontend sees the non-OK response and shows a toast error "Loeschen fehlgeschlagen".
fix: Modify apiFetch to only set Content-Type: application/json when the request has a body (options?.body exists). This ensures DELETE and other body-less requests don't trigger Fastify's empty JSON body rejection.
verification:
files_changed: []
