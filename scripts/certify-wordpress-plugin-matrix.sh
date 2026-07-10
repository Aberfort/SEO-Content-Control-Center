#!/usr/bin/env bash
#
# Runs the WordPress plugin certification across the supported WordPress/PHP
# matrix. The zip is built once and reused for every combination.
#
# Override the matrix with SCCC_WP_MATRIX="image1 image2 ...".

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

default_matrix="wordpress:php8.1-apache wordpress:php8.2-apache wordpress:php8.3-apache wordpress:6.8-php8.2-apache"
matrix="${SCCC_WP_MATRIX:-${default_matrix}}"

echo "[certify-matrix] Building the plugin release zip once."
"${repository_root}/scripts/build-wordpress-plugin.sh" >/dev/null

for image in ${matrix}; do
  echo "[certify-matrix] Certifying against ${image}."
  SCCC_SKIP_PACKAGE=1 SCCC_WP_IMAGE="${image}" "${repository_root}/scripts/certify-wordpress-plugin.sh"
done

echo "[certify-matrix] All combinations passed: ${matrix}"
