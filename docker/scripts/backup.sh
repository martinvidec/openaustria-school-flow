#!/bin/bash
#
# SchoolFlow backup script (D-09, DEPLOY-02)
#
# Dumps PostgreSQL, snapshots Redis, archives file uploads, and writes a
# manifest with table row counts used by restore.sh for integrity verification.
#
# Usage:
#   ./backup.sh               Run a backup (full)
#   ./backup.sh --dry-run     Print what would be done without executing
#
# Environment variables (all optional):
#   BACKUP_DIR    Destination directory       (default: /backups)
#   RETAIN_DAYS   Retention window in days    (default: 7)
#   COMPOSE_FILE  docker-compose file path    (default: ../docker-compose.yml)
#   UPLOAD_DIR    Host directory with uploads (default: unset -- skipped)
#   POSTGRES_USER PostgreSQL user             (default: schoolflow)
#   POSTGRES_DB   PostgreSQL database name    (default: schoolflow)
#
# Pre-checks:
#   - postgres container must be running (Pitfall 5)
#   - BACKUP_DIR must be writable
#
# Exit codes:
#   0  success
#   1  pre-check failed / container not running
#   2  backup failed
#
set -euo pipefail

# ------------------------------------------------------------------------------
# Argument parsing
# ------------------------------------------------------------------------------
DRY_RUN=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    -h|--help)
      sed -n '2,30p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------
BACKUP_DIR="${BACKUP_DIR:-/backups}"
RETAIN_DAYS="${RETAIN_DAYS:-7}"
COMPOSE_FILE="${COMPOSE_FILE:-$(dirname "$0")/../docker-compose.yml}"
POSTGRES_USER="${POSTGRES_USER:-schoolflow}"
POSTGRES_DB="${POSTGRES_DB:-schoolflow}"
TIMESTAMP="$(date -u +%Y%m%d_%H%M%S)"

# Key tables tracked in the manifest for integrity verification.
# Adjust this list when new core tables are added that should be checked
# post-restore. schema drift is acceptable -- unknown tables are skipped.
MANIFEST_TABLES=(
  "schools"
  "persons"
  "teachers"
  "students"
  "school_classes"
  "subjects"
  "rooms"
  "notifications"
  "class_book_entries"
  "substitutions"
)

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
log "SchoolFlow backup starting (timestamp=${TIMESTAMP}, dry-run=${DRY_RUN})"

if [[ "$DRY_RUN" -eq 0 ]]; then
  if [[ ! -d "$BACKUP_DIR" ]]; then
    log "Creating backup directory: $BACKUP_DIR"
    mkdir -p "$BACKUP_DIR"
  fi
  if [[ ! -w "$BACKUP_DIR" ]]; then
    echo "ERROR: BACKUP_DIR ($BACKUP_DIR) is not writable" >&2
    exit 1
  fi
fi

# Pitfall 5: verify postgres container is running before attempting dump.
# Cron jobs silently fail against stopped containers otherwise.
if ! compose ps postgres --format '{{.State}}' 2>/dev/null | grep -q "running"; then
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log "DRY-RUN: would verify postgres container is running"
  else
    echo "ERROR: postgres container is not running. Aborting backup." >&2
    echo "       Run: docker compose -f ${COMPOSE_FILE} up -d postgres" >&2
    exit 1
  fi
fi

# ------------------------------------------------------------------------------
# 1) PostgreSQL dump (gzipped)
# ------------------------------------------------------------------------------
PG_DUMP_FILE="${BACKUP_DIR}/postgres_${TIMESTAMP}.sql.gz"
log "Dumping PostgreSQL -> ${PG_DUMP_FILE}"
run "compose exec -T postgres pg_dump -U '${POSTGRES_USER}' '${POSTGRES_DB}' | gzip > '${PG_DUMP_FILE}'"

# ------------------------------------------------------------------------------
# 2) Redis RDB snapshot
# ------------------------------------------------------------------------------
REDIS_FILE="${BACKUP_DIR}/redis_${TIMESTAMP}.rdb"
log "Triggering Redis BGSAVE and copying snapshot -> ${REDIS_FILE}"
run "compose exec -T redis redis-cli BGSAVE"
# BGSAVE is asynchronous -- brief settle wait so the dump.rdb file is flushed.
run "sleep 2"
run "compose cp redis:/data/dump.rdb '${REDIS_FILE}'"

# ------------------------------------------------------------------------------
# 3) File uploads archive (optional)
# ------------------------------------------------------------------------------
if [[ -n "${UPLOAD_DIR:-}" && -d "${UPLOAD_DIR:-}" ]]; then
  UPLOADS_FILE="${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz"
  log "Archiving uploads from ${UPLOAD_DIR} -> ${UPLOADS_FILE}"
  run "tar -czf '${UPLOADS_FILE}' -C '$(dirname "${UPLOAD_DIR}")' '$(basename "${UPLOAD_DIR}")'"
else
  log "Skipping uploads archive (UPLOAD_DIR not set or missing)"
fi

# ------------------------------------------------------------------------------
# 4) Manifest with table row counts (integrity verification data)
# ------------------------------------------------------------------------------
MANIFEST_FILE="${BACKUP_DIR}/manifest_${TIMESTAMP}.json"
log "Writing manifest -> ${MANIFEST_FILE}"

if [[ "$DRY_RUN" -eq 1 ]]; then
  echo "DRY-RUN: would query row counts for: ${MANIFEST_TABLES[*]}"
else
  {
    echo "{"
    echo "  \"timestamp\": \"${TIMESTAMP}\","
    echo "  \"postgres_file\": \"$(basename "${PG_DUMP_FILE}")\","
    echo "  \"redis_file\": \"$(basename "${REDIS_FILE}")\","
    echo "  \"tables\": {"
    first=1
    for tbl in "${MANIFEST_TABLES[@]}"; do
      # Use -t -A for unaligned tuple output. "|| echo 0" is the fallback for
      # tables that do not exist in the current schema.
      count="$(compose exec -T postgres psql -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
        -tAc "SELECT count(*) FROM \"${tbl}\"" 2>/dev/null || echo 0)"
      count="$(echo "${count}" | tr -d '[:space:]')"
      if [[ -z "${count}" ]]; then count=0; fi
      if [[ $first -eq 1 ]]; then
        first=0
      else
        echo ","
      fi
      printf '    "%s": %s' "${tbl}" "${count}"
    done
    echo ""
    echo "  }"
    echo "}"
  } > "${MANIFEST_FILE}"
fi

# ------------------------------------------------------------------------------
# 5) Retention cleanup
# ------------------------------------------------------------------------------
log "Enforcing retention: keeping last ${RETAIN_DAYS} days"
run "find '${BACKUP_DIR}' -maxdepth 1 -type f -name '*.sql.gz'  -mtime +${RETAIN_DAYS} -print -delete"
run "find '${BACKUP_DIR}' -maxdepth 1 -type f -name '*.rdb'     -mtime +${RETAIN_DAYS} -print -delete"
run "find '${BACKUP_DIR}' -maxdepth 1 -type f -name '*.tar.gz'  -mtime +${RETAIN_DAYS} -print -delete"
run "find '${BACKUP_DIR}' -maxdepth 1 -type f -name 'manifest_*.json' -mtime +${RETAIN_DAYS} -print -delete"

# ------------------------------------------------------------------------------
# 6) Summary
# ------------------------------------------------------------------------------
log "Backup summary:"
if [[ "$DRY_RUN" -eq 1 ]]; then
  log "  (dry run -- nothing written)"
else
  for f in "${PG_DUMP_FILE}" "${REDIS_FILE}" "${MANIFEST_FILE}"; do
    if [[ -f "$f" ]]; then
      size="$(du -h "$f" | cut -f1)"
      log "  ${size}\t$(basename "$f")"
    fi
  done
  if [[ -n "${UPLOAD_DIR:-}" && -f "${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz" ]]; then
    size="$(du -h "${BACKUP_DIR}/uploads_${TIMESTAMP}.tar.gz" | cut -f1)"
    log "  ${size}\tuploads_${TIMESTAMP}.tar.gz"
  fi
fi

log "SchoolFlow backup complete (timestamp=${TIMESTAMP})"
