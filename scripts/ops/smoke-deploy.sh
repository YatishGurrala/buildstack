#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
PROJECT_ID="${PROJECT_ID:-}"
PROJECT_KEY="${PROJECT_KEY:-}"
API_KEY="${API_KEY:-}"

log() {
  echo "[smoke] $*"
}

require_status() {
  local path="$1"
  local expected="$2"
  local code
  code=$(curl -sS -o /tmp/buildstack_smoke_body.txt -w "%{http_code}" "${BASE_URL}${path}")
  if [[ ! "$code" =~ $expected ]]; then
    echo "[smoke] FAIL ${path}: got ${code}, expected pattern ${expected}"
    echo "[smoke] Response body:"
    cat /tmp/buildstack_smoke_body.txt
    exit 1
  fi
  log "PASS ${path} -> ${code}"
}

log "Using BASE_URL=${BASE_URL}"
require_status "/api/health" "^200$"
require_status "/" "^(200|302|307)$"

if [[ -n "$PROJECT_ID" ]]; then
  for service in auth database api analytics; do
    require_status "/projects/${PROJECT_ID}/${service}" "^(200|302|307)$"
  done
else
  log "PROJECT_ID not set, skipping service page route checks"
fi

if [[ -n "$PROJECT_KEY" && -n "$API_KEY" ]]; then
  log "Running external API checks for project key ${PROJECT_KEY}"
  require_status "/api/v1/${PROJECT_KEY}/records?collection=smoke" "^200$"

  invalid_code=$(curl -sS -o /tmp/buildstack_smoke_invalid.txt -w "%{http_code}" \
    -H "x-api-key: invalid" \
    "${BASE_URL}/api/v1/${PROJECT_KEY}/records?collection=smoke")
  if [[ "$invalid_code" != "401" ]]; then
    echo "[smoke] FAIL invalid API key check: got ${invalid_code}, expected 401"
    cat /tmp/buildstack_smoke_invalid.txt
    exit 1
  fi
  log "PASS invalid API key returns 401"
else
  log "PROJECT_KEY/API_KEY not set, skipping external API key checks"
fi

log "Smoke checks completed successfully"
