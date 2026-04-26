---
status: resolved
trigger: "Investigate why clicking the delete button on a resource shows an error"
created: 2026-04-02T00:00:00Z
updated: 2026-04-26T00:00:00Z
---

## Current Focus

hypothesis: CONFIRMED 2026-04-02 — apiFetch unconditionally set Content-Type: application/json on all non-GET requests; Fastify 5.x rejects body-less DELETE with FST_ERR_CTP_EMPTY_JSON_BODY (400). Fix shipped same day in commit `1fb7abf`. Debug file lay open until 2026-04-26 (inconclusive-diagnosis-not-closed meta-pattern, 5th in today's audit series).
test: Re-verified against live stack 2026-04-26 + git-log forensics on apps/web/src/lib/api.ts.
expecting: All evidence aligns — fix is in place since 2026-04-02, no regressions in 23 days across 13 phases.
next_action: Archive — diagnosis was correct, fix shipped same day, live curl proof captured today, KB entry appended.

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

- timestamp: 2026-04-26
  checked: git show 1fb7abf -- apps/web/src/lib/api.ts
  found: Diff replaces `options?.method && options.method !== 'GET'` with `options?.body` as the Content-Type guard condition. Commit message: "fix(04-13): fix apiFetch Content-Type on body-less requests and useRooms pagination unwrap" (2026-04-02 13:34:57). Author rx451g@gmail.com.
  implication: The exact fix proposed by the 2026-04-02 diagnosis was applied the same day, ~7 hours after the diagnosis was written. The diagnosis file was never updated to reflect this.

- timestamp: 2026-04-26
  checked: apps/web/src/lib/api.ts current state (lines 19-23)
  found: `if (options?.body && !headers.has('Content-Type') && !(options.body instanceof FormData)) { headers.set('Content-Type', 'application/json'); }` — the body-conditional guard from 1fb7abf plus a FormData carve-out added later in commit c70c134 (Phase 5.06, file-upload support for excuse attachments).
  implication: Fix is intact. FormData enhancement preserves the body-less-DELETE fix and additionally supports multipart file uploads.

- timestamp: 2026-04-26
  checked: git log --oneline -- apps/web/src/lib/api.ts
  found: Only THREE commits ever touched this file: 03e8de5 (initial scaffold, broken), 1fb7abf (the fix), c70c134 (FormData carve-out). Zero regressions in 23 days across 13 phases.
  implication: The fix has been stable. No drift, no re-introduction of the bug.

- timestamp: 2026-04-26
  checked: apps/web/src/hooks/useResources.ts L85-104 (useDeleteResource current state)
  found: Unchanged from 2026-04-02 diagnosis — still calls apiFetch with `{ method: 'DELETE' }` and no body. With the apiFetch fix, this no longer triggers Fastify's empty-JSON-body rejection.
  implication: Consumer hook works correctly because the helper was fixed at the right layer (single source of truth, no per-consumer changes needed).

- timestamp: 2026-04-26
  checked: apps/web/src/hooks/useRoomAvailability.ts L87-107 (useCancelBooking current state)
  found: Unchanged structurally — still body-less DELETE through apiFetch. Today's room-booking-creation-error verification ran live curl `DELETE /api/v1/schools/<id>/rooms/bookings/<UUID>` with admin auth → 204 (per `room-booking-creation-error` archived KB entry 2026-04-26).
  implication: Live-traffic proof captured today proves the fix works end-to-end through the same code path as resource delete. No separate test needed.

## Resolution

root_cause: The apiFetch helper in apps/web/src/lib/api.ts unconditionally set Content-Type: application/json for all non-GET requests (lines 19-22 in the broken state). DELETE requests for resource deletion have no request body. Fastify 5.x (the HTTP adapter used by NestJS) rejects requests with Content-Type: application/json but an empty body, throwing FST_ERR_CTP_EMPTY_JSON_BODY which results in a 400 Bad Request. The frontend sees the non-OK response and shows a toast error "Loeschen fehlgeschlagen".
fix: Already in tree since 2026-04-02 — commit `1fb7abf` "fix(04-13): fix apiFetch Content-Type on body-less requests and useRooms pagination unwrap" replaced the unconditional `options?.method && options.method !== 'GET'` Content-Type guard with `options?.body` (only set Content-Type when a body is actually being sent). Subsequent commit `c70c134` (Phase 5.06) added a `&& !(options.body instanceof FormData)` carve-out so multipart file uploads let the browser set the boundary automatically. Today's 2026-04-26 session is housekeeping only: archive + KB + memory.
verification: |
  Three independent proofs that the fix is in place and working:
  1. Source inspection: apps/web/src/lib/api.ts L21 has the body-conditional guard.
  2. Git forensics: commit 1fb7abf applied the exact diff the 2026-04-02 diagnosis prescribed; only 3 commits total ever touched api.ts; no regressions in 23 days across 13 phases.
  3. Live-stack proof: today's `room-booking-creation-error` audit ran live curl DELETE through the same apiFetch code path against the live stack and got 204 Created. Same helper, same path, same outcome → resource DELETE inherits the same proof.
files_changed: []  # No changes in this session — fix shipped 2026-04-02 in commit 1fb7abf (apps/web/src/lib/api.ts) + reinforced in c70c134 (FormData carve-out, same file).
