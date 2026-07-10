#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_dir="${repository_root}/wordpress-plugin"
version="$(tr -d '\r\n' < "${plugin_dir}/VERSION")"
archive="${1:-${repository_root}/dist/seo-content-control-center-${version}.zip}"
archive_root="seo-content-control-center/"

if [[ ! -f "${archive}" ]]; then
  echo "Plugin archive was not found: ${archive}" >&2
  exit 1
fi

if [[ "$(basename "${archive}")" != "seo-content-control-center-${version}.zip" ]]; then
  echo "Plugin archive name does not match version ${version}: ${archive}" >&2
  exit 1
fi

unzip -tqq "${archive}"
entries="$(unzip -Z1 "${archive}")"

for required_entry in \
  "${archive_root}seo-content-control-center.php" \
  "${archive_root}readme.txt" \
  "${archive_root}VERSION" \
  "${archive_root}composer.json" \
  "${archive_root}includes/Plugin.php" \
  "${archive_root}includes/SyncScheduler.php"; do
  if ! grep -Fqx "${required_entry}" <<< "${entries}"; then
    echo "Plugin archive is missing ${required_entry}" >&2
    exit 1
  fi
done

while IFS= read -r entry; do
  if [[ "${entry}" != "${archive_root}"* ]]; then
    echo "Plugin archive contains an unexpected top-level entry: ${entry}" >&2
    exit 1
  fi

  case "${entry}" in
    */tests/*|*/vendor/*|*/.git/*|*/phpcs.xml.dist|*/composer.lock)
      echo "Plugin archive contains a development-only entry: ${entry}" >&2
      exit 1
      ;;
  esac
done <<< "${entries}"

echo "WordPress plugin archive is valid: ${archive}"
