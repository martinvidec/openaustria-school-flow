#!/usr/bin/env bash
# check-migration-hygiene.sh
#
# Guardrail: fail if `apps/api/prisma/schema.prisma` was changed without a
# matching new migration in `apps/api/prisma/migrations/`.
#
# Intended for CI and pre-commit. Compares the last committed schema to the
# current one; if they differ, require at least one new migration folder
# staged or committed in the same range.
#
# Rationale: during Phases 3-9, schema changes were applied to the dev DB
# via `prisma db push` without being captured as migration files. This left
# `prisma migrate reset` unable to reproduce the live schema state. This
# check prevents that regression.

set -euo pipefail

BASE_REF="${BASE_REF:-origin/main}"
SCHEMA="apps/api/prisma/schema.prisma"
MIGRATIONS_DIR="apps/api/prisma/migrations"

# If comparing against nothing (first commit), skip
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "[migration-hygiene] $BASE_REF not reachable, skipping check"
  exit 0
fi

if ! git diff --quiet "$BASE_REF" -- "$SCHEMA"; then
  NEW_MIGRATIONS=$(git diff --name-only --diff-filter=A "$BASE_REF" -- "$MIGRATIONS_DIR" | grep -c "migration.sql$" || true)
  if [ "$NEW_MIGRATIONS" -eq 0 ]; then
    echo
    echo "MIGRATION HYGIENE VIOLATION"
    echo
    echo "  $SCHEMA changed vs $BASE_REF but no new migration.sql"
    echo "  was added under $MIGRATIONS_DIR."
    echo
    echo "  This project does NOT use 'prisma db push' -- every schema change"
    echo "  MUST ship as a migration file so the DB is reproducible from git."
    echo
    echo "  Fix: run 'pnpm --filter @schoolflow/api exec prisma migrate dev --name <descriptive>'"
    echo "  and commit the generated migration folder."
    echo
    echo "  See apps/api/prisma/README.md for the policy."
    exit 1
  fi
  echo "[migration-hygiene] schema changed, $NEW_MIGRATIONS new migration(s) -- OK"
else
  echo "[migration-hygiene] schema unchanged vs $BASE_REF -- OK"
fi
