#!/usr/bin/env bash

set -euo pipefail

env_file="${SCCC_STAGING_ENV_FILE:-.env.staging.local}"
skip_env_check="${SCCC_STAGING_SKIP_ENV_CHECK:-false}"
skip_smoke="${SCCC_STAGING_SKIP_SMOKE:-false}"
skip_plugin_package="${SCCC_STAGING_SKIP_PLUGIN_PACKAGE:-false}"
timeout_seconds="${SCCC_STAGING_TIMEOUT_SECONDS:-8}"

log() {
  echo "[staging-rehearsal] $*"
}

fail() {
  echo "[staging-rehearsal] FAIL $*" >&2
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
  log "SKIP env check: SCCC_STAGING_SKIP_ENV_CHECK=true"
else
  if [[ ! -f "${env_file}" ]]; then
    fail "missing ${env_file}. Set SCCC_STAGING_ENV_FILE or create an untracked staging env file."
  fi

  log "checking staging env file ${env_file}"
  npm run deploy:env:check -- --env-file "${env_file}" --environment staging
fi

if [[ "${skip_plugin_package}" == "true" ]]; then
  log "SKIP plugin package: SCCC_STAGING_SKIP_PLUGIN_PACKAGE=true"
else
  log "building and verifying WordPress plugin package for staging install"
  npm run plugin:package
fi

if [[ "${skip_smoke}" == "true" ]]; then
  log "SKIP HTTP smoke: SCCC_STAGING_SKIP_SMOKE=true"
else
  saas_url="${SCCC_STAGING_SAAS_URL:-$(read_env_value NEXT_PUBLIC_APP_URL || true)}"
  marketing_url="${SCCC_STAGING_MARKETING_URL:-$(read_env_value NEXT_PUBLIC_MARKETING_URL || true)}"
  worker_health_url="${SCCC_STAGING_WORKER_HEALTH_URL:-}"
  smoke_skip_worker="false"

  if [[ -z "${saas_url}" ]]; then
    fail "missing staging SaaS URL. Set SCCC_STAGING_SAAS_URL or NEXT_PUBLIC_APP_URL in ${env_file}."
  fi

  if [[ -z "${marketing_url}" ]]; then
    fail "missing staging marketing URL. Set SCCC_STAGING_MARKETING_URL or NEXT_PUBLIC_MARKETING_URL in ${env_file}."
  fi

  if [[ -z "${worker_health_url}" ]]; then
    smoke_skip_worker="true"
    log "SKIP worker HTTP smoke: set SCCC_STAGING_WORKER_HEALTH_URL when connected to the private staging network."
  fi

  log "running staging HTTP smoke"
  SCCC_SMOKE_SAAS_URL="${saas_url}" \
    SCCC_SMOKE_MARKETING_URL="${marketing_url}" \
    SCCC_SMOKE_WORKER_HEALTH_URL="${worker_health_url:-http://127.0.0.1:8080/healthz}" \
    SCCC_SMOKE_SKIP_WORKER="${smoke_skip_worker}" \
    SCCC_SMOKE_TIMEOUT_SECONDS="${timeout_seconds}" \
    npm run deploy:smoke
fi

cat <<'CHECKLIST'
[staging-rehearsal] Automated preflight passed.

[staging-rehearsal] Continue with docs/STAGING_REHEARSAL.md and capture evidence for:
[staging-rehearsal] 1. Real plugin challenge exchange against staging SaaS.
[staging-rehearsal] 2. Paginated WordPress sync with more than one 200-item batch.
[staging-rehearsal] 3. Google Search Console OAuth, property selection, metrics, and insights sync.
[staging-rehearsal] 4. Marketing demo webhook delivery.
[staging-rehearsal] 5. Signed Stripe billing webhook reconciliation and replay/idempotency.
[staging-rehearsal] 6. Safe-operation preview, dry run, CONFIRM, worker execution, and rollback/retry visibility.
CHECKLIST
