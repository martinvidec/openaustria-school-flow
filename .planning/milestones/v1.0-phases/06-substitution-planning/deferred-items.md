# Phase 06 — Deferred Items

Out-of-scope issues discovered during plan execution that are NOT directly
caused by the current plan's changes. These are logged here per the scope
boundary rule and must NOT be fixed by the discovering plan.

## Pre-existing TypeScript errors in `apps/web` (discovered by 06-05)

Running `tsc --noEmit -p tsconfig.app.json` from `apps/web` surfaces the
following errors, ALL of which exist on `main` before Phase 06 Plan 05 made
any changes (verified by running the same command after `git stash`):

1. **`src/lib/keycloak.ts(3,33)`** — `TS2339: Property 'env' does not exist on type 'ImportMeta'`
   - Also hits lines 4 and 5 of the same file.
   - Root cause: `apps/web/tsconfig.app.json` is missing `"types": ["vite/client"]`.
   - Fix: Add `vite/client` to the `compilerOptions.types` array (one-line change).

2. **`src/lib/socket.ts(4,29)`** — same `import.meta.env` issue as above.

3. **`src/main.tsx(1,8)`** — `TS2882: Cannot find module or type declarations for side-effect import of './app.css'`
   - Root cause: same missing `vite/client` types reference which declares CSS modules.

4. **`src/routes/_authenticated/classbook/$lessonId.tsx(74,17)`** —
   `TS2353: Object literal may only specify known properties, and 'tab' does not exist in type 'ParamsReducerFn<...>'`
   - Introduced by Phase 05 Plan 07 (`feat(05-07): lesson detail route with tabs, lesson content form`).
   - Root cause: `navigate({ search: { tab: value } })` should use a function form
     `navigate({ search: (prev) => ({ ...prev, tab: value }) })` to match TanStack
     Router's `ParamsReducerFn` type — Phase 05 used the legacy object literal form
     which later TanStack Router upgrades tightened.

**Impact:** `pnpm --filter @schoolflow/web build` fails. `pnpm dev` still works
via Vite's esbuild transform which does not enforce these type checks.

**Recommended fix:** Single-task cleanup plan that:
- Adds `"types": ["vite/client"]` to `apps/web/tsconfig.app.json`
- Updates `classbook/$lessonId.tsx:73-76` to use the function-form search updater

Neither change belongs in a feature plan — they are tooling debt.

## Discovered during 06-05

- Plan 06-05 code (`apps/web/src/components/substitution/*`,
  `apps/web/src/hooks/{useAbsences,useSubstitutions,useRankedCandidates,
  useSubstitutionStats,useTeachers}.ts`, `apps/web/src/routes/_authenticated/
  admin/substitutions.tsx`, `apps/web/src/components/layout/AppSidebar.tsx`
  edits) introduces ZERO new TypeScript errors — verified by filtering
  `tsc --noEmit -p tsconfig.app.json` output for `substitutions`/`substitution/`.
