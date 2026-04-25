#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "Usage: $0 <database_name> <backup_file.sql.gz>"
  exit 1
fi

DB_NAME="$1"
BACKUP_FILE="$2"

if [[ ! -f "$BACKUP_FILE" ]]; then
  echo "Backup file not found: ${BACKUP_FILE}"
  exit 1
fi

echo "Restoring ${DB_NAME} from ${BACKUP_FILE} ..."

gzip -dc "$BACKUP_FILE" | docker compose exec -T db psql -U postgres -d "$DB_NAME"

echo "Restore complete for ${DB_NAME}"
