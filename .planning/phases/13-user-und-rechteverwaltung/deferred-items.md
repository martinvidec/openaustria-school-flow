# Phase 13 Deferred Items

## Pre-existing web build / typecheck failures (Plan 13-02)

The plan's `<verify>` block requires `pnpm --filter @schoolflow/web typecheck` and `pnpm --filter @schoolflow/web build` to exit 0. Both fail on the main branch with errors in files **not touched by Plan 13-02**:

| File | Error | Origin |
|------|-------|--------|
| `src/lib/keycloak.ts` (lines 3-5) | `TS2339 Property 'env' does not exist on type 'ImportMeta'` | Phase 04-02 (no `vite-env.d.ts`) |
| `src/lib/socket.ts:4` | same `ImportMeta.env` | Phase 04 |
| `src/hooks/useImportSocket.ts:9` | same `ImportMeta.env` | Phase 04 |
| `src/main.tsx:1` | `TS2882 Cannot find module './app.css'` | Phase 04 |
| `src/components/admin/school-settings/CreateSchoolYearDialog.tsx` | `react-hook-form` resolver type drift | pre-existing |
| `src/components/admin/student/StudentDetailTabs.tsx:71` | `StudentStammdatenFormValues` not assignable | Phase 12 |
| `src/hooks/usePushSubscription.ts:170` | DOM `Uint8Array<ArrayBufferLike>` mismatch | Phase 04 |
| `src/routes/_authenticated/classbook/$lessonId.tsx:95` | TanStack Router search params drift | Phase 09 |
| `src/routes/_authenticated/messages/$conversationId.tsx:34` | TanStack Router search params drift | Phase 06 |
| `src/routes/_authenticated/teacher/substitutions.tsx:28` | `string | null` not assignable | Phase 08 |
| `src/hooks/useStudents.ts:220` | `vite build` rolldown ILLEGAL_REASSIGNMENT (`const failed` reassigned) | Phase 12-01 |

**Verification approach used by Plan 13-02:**
- `pnpm exec tsc --noEmit -p tsconfig.app.json` filtered to **only files created/modified in Plan 13-02** → 0 errors.
- New files (`features/users/**`, `components/ui/accordion.tsx`, `components/ui/radio-group.tsx`, `components/admin/user/**`, `components/admin/shared/AffectedEntitiesList.tsx`, `hooks/useStudentSearch.ts`, `hooks/useParentSearch.ts`, `routes/_authenticated/admin/users.*`) all type-check.
- The TanStack Router plugin successfully regenerated `apps/web/src/routeTree.gen.ts` with the two new `/admin/users` routes (verified via `grep`).

These pre-existing failures are out-of-scope per the GSD scope-boundary rule. They MUST be fixed in a follow-up plan (recommendation: Phase 13 Plan 04 — "Web build hygiene") so future phases can rely on a green `pnpm --filter @schoolflow/web build` again.

**Plan 13-03 (E2E) impact:** Playwright executes the dev server, which uses `vite` directly (not the rolled-up production build). The `useStudents.ts:220` rolldown error does not affect dev mode, so E2E coverage is not blocked.
