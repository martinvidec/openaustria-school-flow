---
task: 260426-gtr
type: quick
title: apiFetch Content-Type header regression guards
completed: 2026-04-25
commit: 860b545
files_added: 1
loc: ~110
---

# 260426-gtr: apiFetch Content-Type Header Regression Guards

## What landed

A new Vitest spec at `apps/web/src/lib/__tests__/api.spec.ts` with three test
cases that lock down the canonical Content-Type behavior of `apiFetch`
(`apps/web/src/lib/api.ts`), the cross-cutting authenticated fetch wrapper
used by every mutation hook in the web app.

The three guards:

1. **Body-less DELETE has no Content-Type header.** Pins the fix from commit
   `1fb7abf` (2026-04-02). A regression re-triggers Fastify
   `FST_ERR_CTP_EMPTY_JSON_BODY` (400) on every DELETE in the app — the
   original "Loeschen fehlgeschlagen" bug forensically traced in
   `.planning/debug/resolved/resource-delete-error.md`.
2. **POST with JSON-string body sets `Content-Type: application/json`.** The
   canonical happy path. A regression silently breaks every POST/PATCH/PUT
   mutation.
3. **POST with FormData body has no Content-Type set by apiFetch.** Pins the
   fix from commit `c70c134` (Phase 5.06). The browser must set the multipart
   boundary itself; forcing `application/json` breaks every file upload
   feature (excuse attachments, etc.).

## Test results

- `pnpm --filter @schoolflow/web exec vitest run src/lib/__tests__/api.spec.ts`
  → **3 passed**, 747 ms.
- `pnpm --filter @schoolflow/web exec vitest run src/hooks/__tests__/useTimetable.spec.ts`
  (sibling spec, no-regression check) → **9 passed**.
- Full web vitest suite → **108 passed**, 22 test files (14 skipped pre-existing,
  no new skips/failures), 8.34 s.
- `pnpm --filter @schoolflow/web exec tsc --noEmit` → clean.

## Commit

- `860b545 test(web): apiFetch Content-Type header regression guards`
  - 1 file changed, 109 insertions(+).

## Deviations from inline plan

**Headers assertion shape — used `Headers.get()` not `toHaveProperty()`.**

The inline plan suggested `expect(headers).not.toHaveProperty('Content-Type')`,
but also called out the caveat: *"apiFetch might pass headers as a plain
object OR a Headers instance — read the source to determine which."*
`apiFetch` constructs headers via `new Headers(options?.headers)` and passes
that `Headers` instance to `fetch`. Property-existence checks like
`toHaveProperty` test instance own-properties, which a `Headers` instance
does not expose for header values. Used `headers.get('Content-Type')` with
`toBeNull()` / `toBe('application/json')` instead — the correct shape for the
type `apiFetch` actually emits. This matches the plan's explicit guidance:
*"The test should match what apiFetch ACTUALLY does, not assume."*

**Keycloak mock added.** `apiFetch` calls `keycloak.updateToken(30)` and
reads `keycloak.token` before the fetch. Mocked the `@/lib/keycloak` module
with a stub `updateToken` resolving to `true` and a stub `token`. Without
this, the real Keycloak instance from `keycloak-js` would attempt initialization
in jsdom and fail. Pattern is minimal and parallels the `apiFetchMock`
hoisting approach in `useTimetable.spec.ts`.

**Used `vi.stubGlobal('fetch', ...)` + `vi.unstubAllGlobals()`** for the
fetch stub lifecycle (cleaner than reassigning `globalThis.fetch` directly
and Vitest-native).

No other deviations. No production code touched. ROADMAP not updated (per
constraints).

## Self-Check: PASSED

- File `apps/web/src/lib/__tests__/api.spec.ts` exists.
- Commit `860b545` exists in git log (`git log --oneline | grep 860b545` → present).
- All three test cases pass.
- No regressions in sibling specs or full web suite.
- TypeScript compilation clean.
