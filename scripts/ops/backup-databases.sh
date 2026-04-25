#!/usr/bin/env bash
set -euo pipefail

BACKUP_DIR=${1:-/opt/buildstack/backups}
STAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

for DB in core_db project1_db project2_db; do
  echo "Backing up ${DB}..."
  docker compose exec -T db pg_dump -U postgres "$DB" | gzip > "${BACKUP_DIR}/${DB}_${STAMP}.sql.gz"
done

echo "Backups written to ${BACKUP_DIR}"
ls -lh "$BACKUP_DIR"/*"${STAMP}".sql.gz
