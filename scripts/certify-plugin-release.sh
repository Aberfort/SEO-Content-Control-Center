#!/usr/bin/env bash
#
# Final local release gate for the WordPress plugin artifact.
#
# This command regenerates or verifies the installable zip, records immutable
# artifact metadata, then certifies the exact archive across the supported
# WordPress/PHP Docker matrix. It intentionally leaves real staging UI evidence
# to docs/FINAL_PLUGIN_RELEASE_CERTIFICATION.md because that requires live SaaS
# and WordPress credentials.

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_dir="${repository_root}/wordpress-plugin"
version="$(tr -d '\r\n' < "${plugin_dir}/VERSION")"
dist_dir="${SCCC_PLUGIN_DIST_DIR:-${repository_root}/dist}"
archive="${dist_dir}/seo-content-control-center-${version}.zip"
skip_package="${SCCC_FINAL_PLUGIN_SKIP_PACKAGE:-0}"
skip_matrix="${SCCC_FINAL_PLUGIN_SKIP_MATRIX:-0}"

log() {
  printf '[plugin-release] %s\n' "$1"
}

fail() {
  printf '[plugin-release] %s\n' "$1" >&2
  exit 1
}

checksum_for() {
  local target="$1"

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "${target}" | awk '{print $1}'
    return
  fi

  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "${target}" | awk '{print $1}'
    return
  fi

  fail "Neither shasum nor sha256sum is available for artifact checksum."
}

log "Verifying plugin version contract."
"${repository_root}/scripts/verify-wordpress-plugin-version.sh" >/dev/null

if [[ "${skip_package}" == "1" ]]; then
  log "Reusing existing plugin archive because SCCC_FINAL_PLUGIN_SKIP_PACKAGE=1."
  [[ -f "${archive}" ]] || fail "Expected plugin archive was not found: ${archive}"
else
  log "Building fresh plugin archive."
  "${repository_root}/scripts/build-wordpress-plugin.sh" >/dev/null
fi

log "Verifying plugin archive contents."
"${repository_root}/scripts/verify-wordpress-plugin-package.sh" "${archive}" >/dev/null

size_bytes="$(wc -c < "${archive}" | tr -d '[:space:]')"
entry_count="$(unzip -Z1 "${archive}" | wc -l | tr -d '[:space:]')"
checksum="$(checksum_for "${archive}")"

cat <<EOF
[plugin-release] Artifact metadata
  Version: ${version}
  Archive: ${archive}
  SHA256: ${checksum}
  Size bytes: ${size_bytes}
  Zip entries: ${entry_count}
EOF

if [[ "${skip_matrix}" == "1" ]]; then
  log "Skipping WordPress/PHP matrix because SCCC_FINAL_PLUGIN_SKIP_MATRIX=1."
  cat <<EOF
[plugin-release] Packaging preflight passed.
[plugin-release] Full release certification still requires the default WordPress/PHP matrix.
EOF
else
  log "Running WordPress/PHP certification matrix against this archive."
  SCCC_SKIP_PACKAGE=1 "${repository_root}/scripts/certify-wordpress-plugin-matrix.sh"

  cat <<EOF
[plugin-release] Automated certification gate passed.
[plugin-release] Record the metadata above and complete the staging Action Scheduler evidence in:
  docs/FINAL_PLUGIN_RELEASE_CERTIFICATION.md
EOF
fi
