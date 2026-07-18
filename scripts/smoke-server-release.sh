#!/usr/bin/env bash

set -euo pipefail

env_file="${SCCC_SERVER_ENV_FILE:-.env.production.local}"
environment="${SCCC_SERVER_ENVIRONMENT:-production}"
timeout_seconds="${SCCC_SERVER_TIMEOUT_SECONDS:-8}"
skip_env_check="${SCCC_SERVER_SKIP_ENV_CHECK:-false}"
skip_db_check="${SCCC_SERVER_SKIP_DB_CHECK:-false}"
skip_redis_check="${SCCC_SERVER_SKIP_REDIS_CHECK:-false}"
skip_http_smoke="${SCCC_SERVER_SKIP_HTTP_SMOKE:-false}"
skip_worker_smoke="${SCCC_SERVER_SKIP_WORKER_SMOKE:-false}"
skip_plugin_check="${SCCC_SERVER_SKIP_PLUGIN_CHECK:-false}"
run_restore_drill="${SCCC_SERVER_RUN_RESTORE_DRILL:-false}"

log() {
  echo "[server-smoke] $*"
}

fail() {
  echo "[server-smoke] FAIL $*" >&2
  exit 1
}

read_env_value() {
  local key="$1"
  local line
  local value

  if [[ ! -f "${env_file}" ]]; then
    return 1
  fi

  line="$(grep -E "^[[:space:]]*${key}=" "${env_file}" | tail -n 1 || true)"
  if [[ -z "${line}" ]]; then
    return 1
  fi

  value="${line#*=}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"

  if [[ "${value}" == \"*\" && "${value}" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "${value}" == \'*\' && "${value}" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  printf "%s" "${value}"
}

if [[ "${skip_env_check}" == "true" ]]; then
  log "SKIP env check: SCCC_SERVER_SKIP_ENV_CHECK=true"
else
  if [[ ! -f "${env_file}" ]]; then
    fail "missing ${env_file}. Set SCCC_SERVER_ENV_FILE or create an untracked production env file."
  fi

  log "checking ${environment} env file ${env_file}"
  npm run deploy:env:check -- --env-file "${env_file}" --environment "${environment}"
fi

database_url="${SCCC_SERVER_DATABASE_URL:-$(read_env_value DATABASE_URL || true)}"
redis_url="${SCCC_SERVER_REDIS_URL:-$(read_env_value REDIS_URL || true)}"
saas_url="${SCCC_SERVER_SAAS_URL:-$(read_env_value NEXT_PUBLIC_APP_URL || true)}"
marketing_url="${SCCC_SERVER_MARKETING_URL:-$(read_env_value NEXT_PUBLIC_MARKETING_URL || true)}"
worker_health_url="${SCCC_SERVER_WORKER_HEALTH_URL:-${SCCC_SMOKE_WORKER_HEALTH_URL:-}}"

if [[ "${skip_db_check}" == "true" ]]; then
  log "SKIP database migration status: SCCC_SERVER_SKIP_DB_CHECK=true"
else
  if [[ -z "${database_url}" ]]; then
    fail "missing DATABASE_URL. Set SCCC_SERVER_DATABASE_URL or DATABASE_URL in ${env_file}."
  fi

  log "checking database migration status"
  DATABASE_URL="${database_url}" ./node_modules/.bin/prisma migrate status --schema packages/database/prisma/schema.prisma
fi

if [[ "${skip_redis_check}" == "true" ]]; then
  log "SKIP Redis ping: SCCC_SERVER_SKIP_REDIS_CHECK=true"
else
  if [[ -z "${redis_url}" ]]; then
    fail "missing REDIS_URL. Set SCCC_SERVER_REDIS_URL or REDIS_URL in ${env_file}."
  fi

  log "checking Redis PING"
  node scripts/check-redis-url.mjs "${redis_url}"
fi

if [[ "${skip_plugin_check}" == "true" ]]; then
  log "SKIP plugin archive verification: SCCC_SERVER_SKIP_PLUGIN_CHECK=true"
else
  plugin_version="$(tr -d '\r\n' < wordpress-plugin/VERSION)"
  plugin_archive="${SCCC_SERVER_PLUGIN_ARCHIVE:-dist/seo-content-control-center-${plugin_version}.zip}"

  log "checking WordPress plugin archive ${plugin_archive}"
  scripts/verify-wordpress-plugin-package.sh "${plugin_archive}"
fi

if [[ "${skip_http_smoke}" == "true" ]]; then
  log "SKIP HTTP smoke: SCCC_SERVER_SKIP_HTTP_SMOKE=true"
else
  if [[ -z "${saas_url}" ]]; then
    fail "missing SaaS URL. Set SCCC_SERVER_SAAS_URL or NEXT_PUBLIC_APP_URL in ${env_file}."
  fi

  if [[ -z "${marketing_url}" ]]; then
    fail "missing marketing URL. Set SCCC_SERVER_MARKETING_URL or NEXT_PUBLIC_MARKETING_URL in ${env_file}."
  fi

  if [[ -z "${worker_health_url}" && "${skip_worker_smoke}" != "true" ]]; then
    fail "missing worker health URL. Set SCCC_SERVER_WORKER_HEALTH_URL from the private server network or SCCC_SERVER_SKIP_WORKER_SMOKE=true."
  fi

  log "running HTTP smoke"
  SCCC_SMOKE_SAAS_URL="${saas_url}" \
    SCCC_SMOKE_MARKETING_URL="${marketing_url}" \
    SCCC_SMOKE_WORKER_HEALTH_URL="${worker_health_url:-http://127.0.0.1:8080/healthz}" \
    SCCC_SMOKE_SKIP_WORKER="${skip_worker_smoke}" \
    SCCC_SMOKE_TIMEOUT_SECONDS="${timeout_seconds}" \
    npm run deploy:smoke
fi

if [[ "${run_restore_drill}" == "true" ]]; then
  restore_database_url="${SCCC_SERVER_RESTORE_TEST_DATABASE_URL:-$(read_env_value SCCC_RESTORE_TEST_DATABASE_URL || true)}"

  if [[ -z "${database_url}" ]]; then
    fail "DATABASE_URL is required for backup restore drill."
  fi

  if [[ -z "${restore_database_url}" ]]; then
    fail "SCCC_RESTORE_TEST_DATABASE_URL is required for backup restore drill and must be disposable."
  fi

  log "running backup restore drill against disposable target"
  DATABASE_URL="${database_url}" \
    SCCC_RESTORE_TEST_DATABASE_URL="${restore_database_url}" \
    npm run verify:backup-restore
else
  log "SKIP backup restore drill: set SCCC_SERVER_RUN_RESTORE_DRILL=true with a disposable restore DB to run it."
fi

log "Server smoke checks passed."
