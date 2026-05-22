#!/usr/bin/env bash
set -euo pipefail

APP_NAME="iptv-rsdk"
BRANCH="${DEPLOY_BRANCH:-master}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:9000/login}"
FAILED_INDEX_MIGRATION="20260523021000_add_production_indexes"

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

require_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

require_env_key() {
  local key="$1"
  if [[ ! -f .env ]] || ! grep -Eq "^[[:space:]]*${key}=" .env; then
    echo "Missing ${key} in .env" >&2
    exit 1
  fi
}

run_migrate_deploy() {
  local output
  set +e
  output="$(npx prisma migrate deploy 2>&1)"
  local status=$?
  set -e

  printf '%s\n' "$output"

  if [[ $status -eq 0 ]]; then
    return 0
  fi

  if grep -q "$FAILED_INDEX_MIGRATION" <<<"$output"; then
    log "Recovering failed migration ${FAILED_INDEX_MIGRATION}"
    npx prisma migrate resolve --rolled-back "$FAILED_INDEX_MIGRATION"
    npx prisma migrate deploy
    return 0
  fi

  return "$status"
}

require_command git
require_command npm
require_command npx
require_command pm2

require_env_key DATABASE_URL
require_env_key SESSION_SECRET

log "Deploying ${APP_NAME} from branch ${BRANCH}"

if [[ "${SKIP_GIT_PULL:-0}" != "1" ]]; then
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
fi

log "Installing dependencies"
npm ci

log "Generating Prisma Client"
npx prisma generate

if [[ "${SKIP_MIGRATE:-0}" != "1" ]]; then
  log "Applying database migrations"
  run_migrate_deploy
else
  log "Skipping database migrations"
fi

log "Building Next.js app"
npm run build

log "Starting or reloading PM2 app"
mkdir -p logs
pm2 startOrReload ecosystem.config.cjs --update-env
pm2 save

log "Health check: ${HEALTH_URL}"
if command -v curl >/dev/null 2>&1; then
  curl --fail --silent --show-error --max-time 15 "$HEALTH_URL" >/dev/null
  log "Health check passed"
else
  log "curl not found, skipping health check"
fi

log "Deploy complete"
