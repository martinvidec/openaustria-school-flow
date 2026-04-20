# Phase 10.1 — Deferred Items

Issues discovered during Plan 10.1-01 execution that are OUT OF SCOPE of the current plan's
file list (audit of useSchool.ts, useSchoolYears.ts, useTimeGrid.ts, OptionsTab.tsx).
These are pre-existing TypeScript errors surfaced by `pnpm --filter @schoolflow/web build`
but unrelated to the silent-4xx-toast audit scope.

## Pre-existing `pnpm --filter @schoolflow/web build` (tsc -b) errors — unrelated to 10.1-01

Discovered 2026-04-20 while running the verify gate. These errors exist on commit `2af50ad`
BEFORE any audit work and therefore are NOT regressions caused by Plan 10.1-01:

1. `src/components/admin/school-settings/CreateSchoolYearDialog.tsx` — `Resolver` type mismatch
   between zod-inferred schema and react-hook-form generic params (TS2322, TS2345). Likely
   introduced earlier in Phase 10-05.
2. `src/hooks/useImportSocket.ts:9` — `Property 'env' does not exist on type 'ImportMeta'`
   (TS2339). Missing `vite/client` triple-slash reference or `vite-env.d.ts` entry.
3. `src/hooks/usePushSubscription.ts:170` — `Uint8Array<ArrayBufferLike>` vs `BufferSource`
   overload mismatch. Likely TS 6.0 strictness on the typed-array generic parameter.
4. `src/lib/keycloak.ts:3-5`, `src/lib/socket.ts:4` — same `ImportMeta.env` TS2339 as (2).
5. `src/main.tsx:1` — `Cannot find module or type declarations for side-effect import of './app.css'`
   (TS2882). Missing `*.css` shim in env.d.ts.
6. `src/routes/_authenticated/classbook/$lessonId.tsx:95` — TanStack Router search param
   shape drift (TS2353) — pre-existing per Phase 06 decision log.
7. `src/routes/_authenticated/messages/$conversationId.tsx:34` — missing `search` param in
   `{ to: "/messages" }` Navigate options (TS2345).
8. `src/routes/_authenticated/teacher/substitutions.tsx:28` — `string | null` vs
   `string | undefined` narrowing (TS2345).

**Scope note:** Plan 10.1-01 touches only `apps/web/src/hooks/useSchool.ts`,
`apps/web/src/hooks/useSchoolYears.ts`, `apps/web/src/hooks/useTimeGrid.ts`, and
`apps/web/src/components/admin/school-settings/OptionsTab.tsx` (plus 4 new spec files).
None of the above 8 errors originates from those files. Per the executor Scope Boundary
rule, these are out-of-scope and logged here rather than fixed in this plan.

**Recommended follow-up:** A dedicated `web-typecheck-gap-closure` plan should triage
these (likely 1–2 hours) — many appear to be missing `vite-env.d.ts` declarations plus
one react-hook-form zod-resolver generic-narrowing issue.

The Vitest suite (the relevant gate for 10.1-01 Task 2) passes: 53 tests green,
36 `it.todo` stubs, 7 skipped suites at baseline (pre-10.1-01 work).
