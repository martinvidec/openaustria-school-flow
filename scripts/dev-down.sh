#!/usr/bin/env bash
# Stop the SchoolFlow dev stack started by scripts/dev-up.sh.
# Leaves docker infra running by default — pass --infra to also stop docker.

set -euo pipefail

step() { printf "\033[1;34m▶ %s\033[0m\n" "$*"; }
ok()   { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

step "Stop API on :3000"
if lsof -ti:3000 >/dev/null 2>&1; then
  kill $(lsof -ti:3000) 2>/dev/null || true; ok "killed"
else
  ok "nothing listening"
fi

step "Stop Vite on :5173"
if lsof -ti:5173 >/dev/null 2>&1; then
  kill $(lsof -ti:5173) 2>/dev/null || true; ok "killed"
else
  ok "nothing listening"
fi

if [[ "${1:-}" == "--infra" ]]; then
  step "Stop docker infra"
  docker compose -f "$ROOT/docker/docker-compose.yml" down >/dev/null && ok "docker stopped"
fi
