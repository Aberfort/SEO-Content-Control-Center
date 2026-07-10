#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="$(mktemp -d "${TMPDIR:-/tmp}/sccc-plugin-package-test.XXXXXX")"

cleanup() {
  rm -rf "${output_dir}"
}

trap cleanup EXIT

SCCC_PLUGIN_DIST_DIR="${output_dir}" "${repository_root}/scripts/build-wordpress-plugin.sh"
