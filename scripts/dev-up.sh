#!/usr/bin/env bash
# One-command local dev startup for SchoolFlow.
#
# Brings up docker infra (postgres / keycloak / redis / solver), applies
# migrations, builds shared + api, runs the self-healing seed, then starts
# the API and Vite dev server in the background.
#
# Logs:  /tmp/schoolflow-api.log  /tmp/schoolflow-web.log
# Stop:  scripts/dev-down.sh   (or: kill $(lsof -ti:3000) $(lsof -ti:5173))

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

DATABASE_URL="${DATABASE_URL:-postgresql://schoolflow:schoolflow_dev@localhost:5432/schoolflow}"
export DATABASE_URL

API_LOG=/tmp/schoolflow-api.log
WEB_LOG=/tmp/schoolflow-web.log

step() { printf "\033[1;34m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
warn() { printf "\033[1;33m! %s\033[0m\n" "$*"; }

# ---------------------------------------------------------------------------
step "Docker infra (postgres, keycloak, redis, solver)"
docker compose -f docker/docker-compose.yml up -d >/dev/null

step "Wait for postgres"
for i in {1..30}; do
  if docker exec docker-postgres-1 pg_isready -U schoolflow >/dev/null 2>&1; then
    ok "postgres ready"; break
  fi
  sleep 1
  [[ $i -eq 30 ]] && { echo "postgres did not become ready"; exit 1; }
done

step "Wait for Keycloak realm endpoint"
for i in {1..60}; do
  if curl -sf "http://localhost:8080/realms/schoolflow/.well-known/openid-configuration" >/dev/null 2>&1; then
    ok "keycloak ready"; break
  fi
  sleep 2
  [[ $i -eq 60 ]] && warn "keycloak not responding after 120s — seed will fall back to fixed UUIDs"
done

# ---------------------------------------------------------------------------
step "Apply prisma migrations"
(cd apps/api && npx prisma migrate deploy >/dev/null) && ok "migrations applied"

step "Build @schoolflow/shared"
pnpm --filter @schoolflow/shared build >/dev/null && ok "shared built"

step "Generate prisma client"
(cd apps/api && npx prisma generate >/dev/null 2>&1) && ok "prisma client generated"

step "Seed (self-heals Keycloak UUID drift)"
npx --prefix apps/api tsx apps/api/prisma/seed.ts 2>&1 | grep -E "Resolved|Linked|Seeded sample|Keycloak lookup failed" || true

step "Build api"
pnpm --filter api build >/dev/null 2>&1 && ok "api built"

# ---------------------------------------------------------------------------
step "Stop any existing API on :3000"
if lsof -ti:3000 >/dev/null 2>&1; then
  kill $(lsof -ti:3000) 2>/dev/null || true
  sleep 1
fi

step "Start API (background)"
# API_INTERNAL_URL is the address the Solver container uses to call back into
# the API. The solver runs in docker, the API runs on the host — host.docker.internal
# resolves to the host gateway via the extra_hosts entry in docker-compose.yml.
export API_INTERNAL_URL="${API_INTERNAL_URL:-http://host.docker.internal:3000}"
(cd apps/api && nohup node dist/main.js > "$API_LOG" 2>&1 < /dev/null &) >/dev/null 2>&1
for i in {1..20}; do
  if curl -sf http://localhost:3000/api/v1/health >/dev/null 2>&1; then
    ok "API on :3000"; break
  fi
  sleep 1
  [[ $i -eq 20 ]] && { echo "API failed to start — see $API_LOG"; tail -20 "$API_LOG"; exit 1; }
done

step "Stop any existing Vite on :5173"
if lsof -ti:5173 >/dev/null 2>&1; then
  kill $(lsof -ti:5173) 2>/dev/null || true
  sleep 1
fi

step "Start Vite (background)"
(nohup pnpm --filter web dev > "$WEB_LOG" 2>&1 < /dev/null &) >/dev/null 2>&1
for i in {1..20}; do
  if curl -sf http://localhost:5173 >/dev/null 2>&1; then
    ok "Vite on :5173"; break
  fi
  sleep 1
  [[ $i -eq 20 ]] && { echo "Vite failed to start — see $WEB_LOG"; tail -20 "$WEB_LOG"; exit 1; }
done

# ---------------------------------------------------------------------------
printf "\n\033[1;32m✓ SchoolFlow dev stack up\033[0m\n\n"
cat <<EOF
  Web         http://localhost:5173
  API         http://localhost:3000/api/v1
  Swagger     http://localhost:3000/api/docs
  Keycloak    http://localhost:8080  (admin/admin)

  API log     $API_LOG
  Web log     $WEB_LOG

  Test users  admin-user/admin123, schulleitung-user/direktor123,
              lehrer-user/lehrer123, eltern-user/eltern123, schueler-user/schueler123
EOF
