#!/bin/bash
#
# SchoolFlow restore script (D-09, DEPLOY-02)
#
# Restores a backup produced by backup.sh: PostgreSQL dump, Redis RDB snapshot,
# file uploads archive (if present), and verifies integrity by comparing post-
# restore row counts against the manifest captured at backup time.
#
# Usage:
#   ./restore.sh --file 20260406_093000
#   ./restore.sh --file 20260406_093000 --dry-run
#   ./restore.sh --latest
#   ./restore.sh --latest --dry-run
#
# Environment variables (all optional):
#   BACKUP_DIR    Source directory            (default: /backups)
#   COMPOSE_FILE  docker-compose file path    (default: ../docker-compose.yml)
#   UPLOAD_DIR    Host directory for uploads  (default: unset -- skipped)
#   POSTGRES_USER PostgreSQL user             (default: schoolflow)
#   POSTGRES_DB   PostgreSQL database name    (default: schoolflow)
#
# Exit codes:
#   0  success, integrity verified
#   1  pre-check failed / missing files
#   2  restore failed
#   3  integrity mismatch (post-restore row counts diverge from manifest)
#
set -euo pipefail

# ------------------------------------------------------------------------------
# Argument parsing
# ------------------------------------------------------------------------------
DRY_RUN=0
BACKUP_PREFIX=""
USE_LATEST=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run) DRY_RUN=1; shift ;;
    --file)    BACKUP_PREFIX="$2"; shift 2 ;;
    --latest)  USE_LATEST=1; shift ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
BACKUP_DIR="${BACKUP_DIR:-/backups}"
COMPOSE_FILE="${COMPOSE_FILE:-$(dirname "$0")/../docker-compose.yml}"
POSTGRES_USER="${POSTGRES_USER:-schoolflow}"
POSTGRES_DB="${POSTGRES_DB:-schoolflow}"

# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------
log() {
  echo "[$(date -u +%H:%M:%S)] $*"
}

run() {
  if [[ "$DRY_RUN" -eq 1 ]]; then
    echo "DRY-RUN: $*"
  else
    eval "$@"
  fi
}

compose() {
  docker compose -f "$COMPOSE_FILE" "$@"
}

# ------------------------------------------------------------------------------
# Pre-checks
# ------------------------------------------------------------------------------
if [[ -z "$BACKUP_PREFIX" && "$USE_LATEST" -eq 0 ]]; then
  echo "ERROR: --file <prefix> or --latest is required" >&2
  exit 1
fi

if [[ "$USE_LATEST" -eq 1 ]]; then
  BACKUP_PREFIX="$(ls -1 "${BACKUP_DIR}"/postgres_*.sql.gz 2>/dev/null \
    | sed -E 's|.*postgres_(.+)\.sql\.gz|\1|' \
    | sort -r \
    | head -n1)"
  if [[ -z "$BACKUP_PREFIX" ]]; then
    echo "ERROR: no backups found in ${BACKUP_DIR}" >&2
    exit 1
  fi
  log "Using latest backup: ${BACKUP_PREFIX}"
fi

PG_DUMP_FILE="${BACKUP_DIR}/postgres_${BACKUP_PREFIX}.sql.gz"
REDIS_FILE="${BACKUP_DIR}/redis_${BACKUP_PREFIX}.rdb"
UPLOADS_FILE="${BACKUP_DIR}/uploads_${BACKUP_PREFIX}.tar.gz"
MANIFEST_FILE="${BACKUP_DIR}/manifest_${BACKUP_PREFIX}.json"

if [[ ! -f "$PG_DUMP_FILE" ]]; then
  echo "ERROR: PostgreSQL dump not found: ${PG_DUMP_FILE}" >&2
  exit 1
fi

log "SchoolFlow restore starting (prefix=${BACKUP_PREFIX}, dry-run=${DRY_RUN})"

# Pitfall 5: verify postgres container is running before attempting restore.
if ! compose ps postgres --format '{{.State}}' 2>/dev/null | grep -q "running"; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "DRY-RUN: would verify postgres container is running"
  else
    echo "ERROR: postgres container is not running. Aborting restore." >&2
    exit 1
  fi
fi

# ------------------------------------------------------------------------------
# 1) PostgreSQL restore
# ------------------------------------------------------------------------------
log "Restoring PostgreSQL from ${PG_DUMP_FILE}"
run "gunzip -c '${PG_DUMP_FILE}' | compose exec -T postgres psql -U '${POSTGRES_USER}' '${POSTGRES_DB}'"

# ------------------------------------------------------------------------------
# 2) Redis restore (copy snapshot, restart redis to load it)
# ------------------------------------------------------------------------------
if [[ -f "$REDIS_FILE" ]]; then
  log "Restoring Redis snapshot from ${REDIS_FILE}"
  run "compose cp '${REDIS_FILE}' redis:/data/dump.rdb"
  log "Restarting redis container to load dump.rdb"
  run "compose restart redis"
else
  log "Skipping Redis restore (${REDIS_FILE} not found)"
fi

# ------------------------------------------------------------------------------
# 3) File uploads restore (optional)
# ------------------------------------------------------------------------------
if [[ -f "$UPLOADS_FILE" && -n "${UPLOAD_DIR:-}" ]]; then
  log "Restoring uploads archive ${UPLOADS_FILE} -> $(dirname "${UPLOAD_DIR}")"
  run "tar -xzf '${UPLOADS_FILE}' -C '$(dirname "${UPLOAD_DIR}")'"
else
  log "Skipping uploads restore (archive or UPLOAD_DIR missing)"
fi

# ------------------------------------------------------------------------------
# 4) Integrity verification vs manifest (D-09)
# ------------------------------------------------------------------------------
INTEGRITY_OK=1
if [[ -f "$MANIFEST_FILE" ]]; then
  log "Verifying integrity against ${MANIFEST_FILE}"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "DRY-RUN: would compare manifest row counts against live DB"
  else
    # Extract table->expected-count pairs from the manifest JSON without
    # requiring jq. The manifest is written line-by-line by backup.sh so a
    # simple sed/grep parse is safe.
    while IFS= read -r line; do
      tbl="$(echo "$line" | sed -E 's/^\s*"([^"]+)"\s*:\s*([0-9]+).*/\1/')"
      expected="$(echo "$line" | sed -E 's/^\s*"([^"]+)"\s*:\s*([0-9]+).*/\2/')"
      if [[ -z "$tbl" || -z "$expected" || "$tbl" == "$line" ]]; then
        continue
      fi
      actual="$(compose exec -T postgres psql -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
        -tAc "SELECT count(*) FROM \"${tbl}\"" 2>/dev/null || echo 'missing')"
      actual="$(echo "${actual}" | tr -d '[:space:]')"
      if [[ "$actual" == "missing" || -z "$actual" ]]; then
        log "  [WARN] table ${tbl} not present post-restore (manifest expected ${expected})"
        INTEGRITY_OK=0
        continue
      fi
      if [[ "$actual" == "$expected" ]]; then
        log "  [OK]   ${tbl}: ${actual}"
      else
        log "  [FAIL] ${tbl}: expected ${expected}, got ${actual}"
        INTEGRITY_OK=0
      fi
    done < <(grep -E '^\s*"[a-zA-Z_]+"\s*:\s*[0-9]+' "$MANIFEST_FILE")
  fi
else
  log "No manifest file found -- skipping integrity verification"
fi

if [[ "$INTEGRITY_OK" -eq 0 ]]; then
  echo "ERROR: integrity verification failed -- some table counts diverged" >&2
  exit 3
fi

log "SchoolFlow restore complete (prefix=${BACKUP_PREFIX})"
