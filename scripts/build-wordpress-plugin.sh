#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_dir="${repository_root}/wordpress-plugin"
output_dir="${SCCC_PLUGIN_DIST_DIR:-${repository_root}/dist}"
archive_root="seo-content-control-center"

if ! command -v zip >/dev/null 2>&1 || ! command -v unzip >/dev/null 2>&1; then
  echo "Plugin packaging requires both zip and unzip commands." >&2
  exit 1
fi

if ! command -v composer >/dev/null 2>&1; then
  echo "Plugin packaging requires Composer to validate wordpress-plugin/composer.json." >&2
  exit 1
fi

"${repository_root}/scripts/verify-wordpress-plugin-version.sh"
composer validate --no-check-publish --working-dir="${plugin_dir}" >/dev/null

version="$(tr -d '\r\n' < "${plugin_dir}/VERSION")"
archive_name="${archive_root}-${version}.zip"
archive_path="${output_dir}/${archive_name}"
staging_dir="$(mktemp -d "${TMPDIR:-/tmp}/sccc-plugin-package.XXXXXX")"
release_dir="${staging_dir}/${archive_root}"

cleanup() {
  rm -rf "${staging_dir}"
}

trap cleanup EXIT

mkdir -p "${release_dir}" "${output_dir}"
cp "${plugin_dir}/seo-content-control-center.php" "${release_dir}/"
cp "${plugin_dir}/readme.txt" "${release_dir}/"
cp "${plugin_dir}/VERSION" "${release_dir}/"
cp "${plugin_dir}/composer.json" "${release_dir}/"
cp -R "${plugin_dir}/includes" "${release_dir}/includes"

rm -f "${archive_path}"

(
  cd "${staging_dir}"
  zip -X -q -r "${archive_path}" "${archive_root}"
)

"${repository_root}/scripts/verify-wordpress-plugin-package.sh" "${archive_path}"
echo "Built WordPress plugin release: ${archive_path}"
