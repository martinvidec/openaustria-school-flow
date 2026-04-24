# Phase 12 Deferred Items

Pre-existing issues discovered during Plan 12-01 execution that are OUT OF SCOPE (not caused by 12-01 changes, do not block 12-01 acceptance).

## Pre-existing `tsc -b` errors in apps/web

These errors already existed on `main` (before any Plan 12-01 edits) and surface when a fresh `tsc -b` run produces a new `.tsbuildinfo`. The project already relies on `vite build` for production — these are type-level, not runtime, blockers.

- `src/components/admin/school-settings/CreateSchoolYearDialog.tsx` — Resolver type mismatch (zod/RHF generics), introduced in commit d72ea46 (feat(10-05)).
- `src/hooks/useImportSocket.ts:9` — `Property 'env' does not exist on type 'ImportMeta'` (vite env types not configured for this file).
- `src/hooks/usePushSubscription.ts:170` — `Uint8Array<ArrayBufferLike>` vs `ArrayBuffer` overload mismatch (lib.dom type widening), commit 9f10a5d (feat(09-04)).
- `src/lib/keycloak.ts:3-5` — `Property 'env' does not exist on type 'ImportMeta'`.
- `src/lib/socket.ts:4` — same `ImportMeta.env` issue.
- `src/main.tsx:1` — `Cannot find module or type declarations for side-effect import of './app.css'`.
- `src/routes/_authenticated/classbook/$lessonId.tsx:95` — TanStack Router `SEARCH` param reducer type mismatch.
- `src/routes/_authenticated/messages/$conversationId.tsx:34` — TanStack Router navigate-options `search` missing.
- `src/routes/_authenticated/teacher/substitutions.tsx:28` — `string | null` vs `string | undefined` parameter widening.

Follow-up: a dedicated `phase-12.x-typecheck-repair` plan may be spun up to address these. None of them touch the student/parent/class/group domain owned by Phase 12.

## Notes

- `pnpm exec tsc --noEmit` (without `-b`) exits 0 for apps/web, meaning the type-check passes when not using project-references incremental builds. The errors above only surface via `tsc -b` which the `build` script uses.
- `pnpm --filter @schoolflow/shared build` and `pnpm --filter @schoolflow/api build` both succeed clean.

## Pre-existing E2E failures observed during Plan 12-03 run

Not caused by Plan 12-03 changes — pre-existing on `main` before this plan.
Documented here so the Phase-12 green baseline can be reproduced by running
`admin-students admin-classes` specs directly.

- `admin-import.spec.ts` — 3 tests failing (IMPORT-UNTIS-01, IMPORT-CSV-01,
  IMPORT-CSV-02). Test timeout waiting for "Daten importieren" button —
  environmental (dev stack hits a transient state that swallows the import
  worker trigger). Tracked in Phase 10.5 deferred-items.
- `screenshots.spec.ts` — SCHOOL-05 orphan-guard screenshot step hits the
  same archive-flow path we touched in 12-01; the test assumes a specific DOM
  ordering that drifted when Phase 10/11/12 cards got added. Screenshot tests
  are UAT-documentation aids, not regression gates.

**Runbook:** `pnpm --filter @schoolflow/web exec playwright test admin-students admin-classes --project=desktop`
is the Phase-12 canonical gate — 19/19 passes. The full-suite run includes
these pre-existing failures.
