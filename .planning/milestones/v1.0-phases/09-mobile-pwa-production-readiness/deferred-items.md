# Deferred Items - Phase 09 Mobile PWA Production Readiness

## Pre-existing TypeScript Errors (Out of Scope for Plan 09-01)

Verified via `git stash && pnpm tsc --noEmit -p apps/web/tsconfig.app.json` before any Plan 09-01 changes. These errors existed prior to this plan and are not caused by responsive fixes.

### Vite Environment Types Missing (`import.meta.env`)
- `apps/web/src/hooks/useImportSocket.ts(9,29)` — `Property 'env' does not exist on type 'ImportMeta'`
- `apps/web/src/lib/keycloak.ts(3,33)` — `Property 'env' does not exist on type 'ImportMeta'`
- `apps/web/src/lib/keycloak.ts(4,35)` — `Property 'env' does not exist on type 'ImportMeta'`
- `apps/web/src/lib/keycloak.ts(5,38)` — `Property 'env' does not exist on type 'ImportMeta'`
- `apps/web/src/lib/socket.ts(4,29)` — `Property 'env' does not exist on type 'ImportMeta'`

**Root cause:** Missing `vite/client` reference in `tsconfig.app.json` or `env.d.ts`.

### CSS Module Declaration Missing
- `apps/web/src/main.tsx(1,8)` — `Cannot find module or type declarations for side-effect import of './app.css'`

**Root cause:** Missing CSS module declaration in ambient types.

### TanStack Router Type Inference Issues
- `apps/web/src/routes/_authenticated/classbook/$lessonId.tsx(95,17)` — `'tab' does not exist in type 'ParamsReducerFn'` — Phase 06 Decision documents this as a pre-existing TanStack Router type inference issue.
- `apps/web/src/routes/_authenticated/messages/$conversationId.tsx(34,35)` — `Argument of type '{ to: "/messages"; }' is not assignable to parameter of type 'NavigateOptions'`
- `apps/web/src/routes/_authenticated/teacher/substitutions.tsx(28,33)` — `Argument of type 'string | null' is not assignable to parameter of type 'string | undefined'`

**Root cause:** TanStack Router v1 type strictness around search params and nullable strings in routing calls.

## Resolution Ownership

These errors should be fixed in a dedicated cleanup plan (e.g., `09-XX-tsc-hygiene`) or as part of a Phase 10 technical debt sweep. They do NOT block Phase 09 responsive work because:
1. None are caused by responsive fixes
2. Vite dev server continues to build successfully (Vite uses esbuild, not TSC)
3. Runtime behavior is unaffected (all are type-only errors)
