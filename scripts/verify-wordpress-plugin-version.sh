#!/usr/bin/env bash

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_dir="${repository_root}/wordpress-plugin"
version_file="${plugin_dir}/VERSION"
plugin_file="${plugin_dir}/seo-content-control-center.php"
readme_file="${plugin_dir}/readme.txt"
composer_file="${plugin_dir}/composer.json"

for required_file in "${version_file}" "${plugin_file}" "${readme_file}" "${composer_file}"; do
  if [[ ! -f "${required_file}" ]]; then
    echo "Missing required plugin release file: ${required_file}" >&2
    exit 1
  fi
done

version="$(tr -d '\r\n' < "${version_file}")"

if [[ ! "${version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo "Plugin version must use MAJOR.MINOR.PATCH format: ${version}" >&2
  exit 1
fi

header_version="$(sed -n 's/^ \* Version: //p' "${plugin_file}")"
runtime_version="$(sed -n "s/^define('SCCC_PLUGIN_VERSION', '\([^']*\)');$/\1/p" "${plugin_file}")"
stable_tag="$(sed -n 's/^Stable tag: //p' "${readme_file}")"
composer_version="$(php -r '$manifest = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR); echo $manifest["extra"]["sccc-plugin-version"] ?? "";' "${composer_file}")"

for value in "${header_version}" "${runtime_version}" "${stable_tag}" "${composer_version}"; do
  if [[ "${value}" != "${version}" ]]; then
    echo "Plugin version mismatch: expected ${version}, found ${value}" >&2
    exit 1
  fi
done

echo "WordPress plugin version ${version} is synchronized."
