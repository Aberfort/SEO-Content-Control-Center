#!/usr/bin/env bash

set -euo pipefail

timeout_seconds="${SCCC_SMOKE_TIMEOUT_SECONDS:-8}"
saas_url="${SCCC_SMOKE_SAAS_URL:-http://127.0.0.1:3000}"
marketing_url="${SCCC_SMOKE_MARKETING_URL:-http://127.0.0.1:3001}"
worker_health_url="${SCCC_SMOKE_WORKER_HEALTH_URL:-http://127.0.0.1:8080/healthz}"
skip_worker="${SCCC_SMOKE_SKIP_WORKER:-false}"

check_url() {
  local label="$1"
  local url="$2"
  local expected_status="${3:-200}"
  local status

  status="$(curl --silent --show-error --output /dev/null --write-out "%{http_code}" --max-time "${timeout_seconds}" "${url}")" || {
    echo "[smoke] FAIL ${label}: request failed (${url})" >&2
    return 1
  }

  if [[ "${status}" != "${expected_status}" ]]; then
    echo "[smoke] FAIL ${label}: expected ${expected_status}, got ${status} (${url})" >&2
    return 1
  fi

  echo "[smoke] OK ${label}: ${status} ${url}"
}

check_url "saas health" "${saas_url%/}/api/health"

marketing_paths=(
  "/"
  "/pricing"
  "/security"
  "/demo"
  "/trial"
  "/robots.txt"
  "/sitemap.xml"
)

for path in "${marketing_paths[@]}"; do
  check_url "marketing ${path}" "${marketing_url%/}${path}"
done

if [[ "${skip_worker}" == "true" ]]; then
  echo "[smoke] SKIP worker health: SCCC_SMOKE_SKIP_WORKER=true"
else
  check_url "worker health" "${worker_health_url}"
fi

echo "[smoke] Production smoke checks passed."
