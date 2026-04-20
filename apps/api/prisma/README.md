# Prisma schema & migration policy

## Rule: no `prisma db push`

Every change to `schema.prisma` must ship as a **migration file** under
`apps/api/prisma/migrations/<timestamp>_<name>/migration.sql`.

### Why

Historically (Phases 3–9), schema changes were applied to the dev DB via
`prisma db push`. `db push` updates the live DB but does **not** write a
migration file. Result: `git clone && prisma migrate reset` produced a DB
that was **schema-incomplete** — every column added between the Phase-2
baseline and the current schema was missing, and `prisma/seed.ts` failed
on the first missing column.

That regression is now fixed via the consolidated baseline migration
`20260419000000_phases_3_to_9_consolidated`, but the underlying discipline
has to hold going forward.

### How

```bash
# After editing schema.prisma:
pnpm --filter @schoolflow/api exec prisma migrate dev --name <descriptive_name>
```

This creates a new `<timestamp>_<name>/migration.sql` that captures the
delta. Commit the folder in the same PR as the schema change.

### Enforcement

- `scripts/check-migration-hygiene.sh` runs locally and in CI.
- It fails any diff where `apps/api/prisma/schema.prisma` changed but no
  new `migration.sql` was added vs. the base branch.

### Exceptions

There are none. If you think you need one, you don't — use
`prisma migrate dev --create-only` to author the SQL by hand (useful for
partial unique indexes or other DDL Prisma's schema cannot express), but
the file still has to land in git.

### Shadow database

The shadow DB required by `prisma migrate diff` (and used by the
baseline-generation workflow) is configured in `prisma.config.ts` as
`schoolflow_shadow`. Create it once via:

```bash
docker exec docker-postgres-1 psql -U schoolflow -d postgres \
  -c "CREATE DATABASE schoolflow_shadow;"
```
