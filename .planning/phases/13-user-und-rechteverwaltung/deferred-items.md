# Phase 13 deferred items

Issues discovered during execution that are NOT in scope for the plan being
worked on. Logged here per the GSD executor scope-boundary rule.

## Verification steps deferred to CI / human

### `prisma migrate reset --force` (AI-safety blocked)

- **Where:** Plan 13-01 Task 1 acceptance criterion
- **Symptom:** Prisma 7 blocks `migrate reset` when invoked by an AI agent
  (detects the Claude Code parent), requires
  `PRISMA_USER_CONSENT_FOR_DANGEROUS_AI_ACTION` set to a user consent
  message. Migration was applied via `prisma migrate deploy` and verified
  via `_prisma_migrations` table + `information_schema.columns`; full-reset
  replay check is deferred to CI (where the guard does not trigger) or a
  human-invoked run.

## Pre-existing test failures

### `apps/api/prisma/__tests__/school-year-multi-active.spec.ts > backfill invariant`

- **Where:** API integration-ish test that reads real DB state
- **When:** baseline on main (observed during `pnpm --filter @schoolflow/api test`)
- **Symptom:** `expected 1 to be 2` — seed data now has only 1 `SchoolYear`
  row with `isActive=true`, but the spec expects every existing row to be
  backfilled to active. Likely a seed/DB-state drift.
- **Disposition:** DEFERRED — unrelated to Phase 13 surface.

### `packages/shared/src/schemas/school-class.schema.spec.ts > SchoolClassCreateSchema > rejects invalid schoolYearId uuid`

- **Where:** shared package test suite
- **When:** on main, before Phase 13 execution started (baseline failure)
- **Symptom:** `expected true to be false` — `SchoolClassCreateSchema` no
  longer rejects non-UUID `schoolYearId` because Plan 12-03 Rule-1 relaxed
  the guard from `.uuid()` to `z.string().min(1, ...)` (see comment in the
  schema file). The spec was not updated to match.
- **Disposition:** DEFERRED — unrelated to Phase 13 surface. Either the
  schema needs a tighter guard, or the spec needs to drop the "rejects
  non-UUID" case. Handle in a dedicated quick-fix plan.
