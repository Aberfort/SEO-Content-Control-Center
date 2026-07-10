#!/usr/bin/env bash
#
# Certifies the packaged WordPress plugin zip against a real WordPress
# container: activation, version contract, REST route registration,
# connection storage, WP-Cron sync scheduling, signed safe-operation apply,
# signature rejection, deactivation cleanup, and clean deletion.
#
# Configuration:
#   SCCC_WP_IMAGE        WordPress image tag (default wordpress:php8.3-apache)
#   SCCC_WP_CLI_IMAGE    wp-cli image tag (default wordpress:cli)
#   SCCC_WP_DB_IMAGE     database image tag (default mariadb:10.11)
#   SCCC_PLUGIN_DIST_DIR zip output directory (default <repo>/dist)
#   SCCC_SKIP_PACKAGE=1  reuse an already-built zip instead of rebuilding

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_dir="${repository_root}/wordpress-plugin"
dist_dir="${SCCC_PLUGIN_DIST_DIR:-${repository_root}/dist}"

wp_image="${SCCC_WP_IMAGE:-wordpress:php8.3-apache}"
cli_image="${SCCC_WP_CLI_IMAGE:-wordpress:cli}"
db_image="${SCCC_WP_DB_IMAGE:-mariadb:10.11}"

plugin_slug="seo-content-control-center"
cert_org_id="cert-org-11111111"
cert_site_id="cert-site-22222222"
cert_token="cert-token-0123456789abcdef0123456789abcdef"
cert_endpoint="https://saas.certification.invalid"
signed_path="/wp-json/sccc/v1/operations/apply"

suffix="$(date +%s)-$$"
db_container="sccc-cert-db-${suffix}"
wp_container="sccc-cert-wp-${suffix}"
network_name="sccc-cert-net-${suffix}"
volume_name="sccc-cert-wp-${suffix}"

log() {
  printf '[certify][%s] %s\n' "${wp_image}" "$1"
}

fail() {
  printf '[certify][%s] FAILED: %s\n' "${wp_image}" "$1" >&2
  exit 1
}

cleanup() {
  docker rm -f "${wp_container}" "${db_container}" >/dev/null 2>&1 || true
  docker volume rm "${volume_name}" >/dev/null 2>&1 || true
  docker network rm "${network_name}" >/dev/null 2>&1 || true
}

trap cleanup EXIT

if ! command -v docker >/dev/null 2>&1; then
  fail "Docker is required for plugin certification."
fi

if ! command -v curl >/dev/null 2>&1 || ! command -v openssl >/dev/null 2>&1; then
  fail "curl and openssl are required for plugin certification."
fi

if [ "${SCCC_SKIP_PACKAGE:-0}" != "1" ]; then
  log "Building the plugin release zip."
  "${repository_root}/scripts/build-wordpress-plugin.sh" >/dev/null
fi

plugin_version="$(tr -d '\r\n' < "${plugin_dir}/VERSION")"
archive_path="${dist_dir}/${plugin_slug}-${plugin_version}.zip"

if [ ! -f "${archive_path}" ]; then
  fail "Plugin archive ${archive_path} was not found."
fi

log "Starting database and WordPress containers."
docker network create "${network_name}" >/dev/null
docker volume create "${volume_name}" >/dev/null

docker run -d --name "${db_container}" --network "${network_name}" \
  -e MARIADB_DATABASE=wordpress \
  -e MARIADB_USER=wordpress \
  -e MARIADB_PASSWORD=wordpress \
  -e MARIADB_ROOT_PASSWORD=root \
  "${db_image}" >/dev/null

docker run -d --name "${wp_container}" --network "${network_name}" \
  -v "${volume_name}:/var/www/html" \
  -p 127.0.0.1::80 \
  -e WORDPRESS_DB_HOST="${db_container}" \
  -e WORDPRESS_DB_USER=wordpress \
  -e WORDPRESS_DB_PASSWORD=wordpress \
  -e WORDPRESS_DB_NAME=wordpress \
  "${wp_image}" >/dev/null

wp_port="$(docker port "${wp_container}" 80 | head -n 1 | sed 's/.*://')"

if [ -z "${wp_port}" ]; then
  fail "Could not resolve the published WordPress port."
fi

site_url="http://127.0.0.1:${wp_port}"
# Fresh installs have no pretty permalinks, so the REST API is reached through
# the rest_route query form. The plugin signs the canonical REST path from
# rest_get_url_prefix(), which stays /wp-json/... regardless of permalinks.
rest_url="${site_url}/index.php?rest_route=/sccc/v1/operations/apply"

wp_cli() {
  # The Debian WordPress images own /var/www/html as uid 33 while the Alpine
  # cli image maps www-data to uid 82, so the cli container runs as uid 33
  # with a writable HOME for the wp-cli cache.
  docker run --rm --network "${network_name}" \
    --user 33:33 \
    -v "${volume_name}:/var/www/html" \
    -v "${dist_dir}:/tmp/sccc-dist:ro" \
    -v "${plugin_dir}/certification:/tmp/sccc-cert:ro" \
    -e HOME=/tmp \
    -e WORDPRESS_DB_HOST="${db_container}" \
    -e WORDPRESS_DB_USER=wordpress \
    -e WORDPRESS_DB_PASSWORD=wordpress \
    -e WORDPRESS_DB_NAME=wordpress \
    "${cli_image}" wp "$@"
}

log "Waiting for WordPress core installation to succeed."
core_installed=0
attempt=0
while [ "${attempt}" -lt 30 ]; do
  attempt=$((attempt + 1))

  if wp_cli core install \
    --url="${site_url}" \
    --title="SCCC Certification" \
    --admin_user=admin \
    --admin_password="certify-admin-password" \
    --admin_email="admin@certification.invalid" \
    --skip-email >/dev/null 2>&1; then
    core_installed=1
    break
  fi

  sleep 4
done

if [ "${core_installed}" != "1" ]; then
  fail "WordPress core install did not succeed after 30 attempts."
fi

wp_cli core version >/dev/null || fail "wp-cli cannot reach the installed site."
# The serving PHP version comes from the WordPress container, not the cli
# container: REST requests (and therefore the plugin code) run under it.
wp_version="$(wp_cli core version | tr -d '\r')"
php_version="$(docker exec "${wp_container}" php -r 'echo PHP_VERSION;')"
log "WordPress ${wp_version} on PHP ${php_version} is ready at ${site_url}."

log "Installing and activating the packaged plugin zip."
wp_cli plugin install "/tmp/sccc-dist/${plugin_slug}-${plugin_version}.zip" --activate >/dev/null

wp_cli plugin is-active "${plugin_slug}" || fail "Plugin is not active after installation."

installed_version="$(wp_cli plugin get "${plugin_slug}" --field=version | tr -d '\r')"

if [ "${installed_version}" != "${plugin_version}" ]; then
  fail "Installed plugin version ${installed_version} does not match VERSION ${plugin_version}."
fi
log "Plugin ${plugin_version} is active."

log "Checking the signed apply route before a connection exists."
pre_connection_response="$(curl -s -X POST "${rest_url}" \
  -H 'content-type: application/json' \
  -d '{}')"

case "${pre_connection_response}" in
  *PLUGIN_CONNECTION_NOT_FOUND*) ;;
  *) fail "Apply route did not return PLUGIN_CONNECTION_NOT_FOUND before connection: ${pre_connection_response}" ;;
esac
log "Apply route is registered and refuses unconnected requests."

log "Seeding the certification connection."
wp_cli eval-file /tmp/sccc-cert/seed-connection.php \
  "${cert_org_id}" "${cert_site_id}" "${cert_token}" "${cert_endpoint}" >/dev/null

connection_option="$(wp_cli option get sccc_connection --format=json | tr -d '\r')"

case "${connection_option}" in
  *"${cert_site_id}"*) ;;
  *) fail "Connection option does not contain the seeded site id." ;;
esac

log "Checking recurring sync scheduling through the WP-Cron fallback."
cron_hooks="$(wp_cli cron event list --fields=hook | tr -d '\r')"

case "${cron_hooks}" in
  *sccc_run_incremental_sync*) ;;
  *) fail "Recurring sync hook sccc_run_incremental_sync is not scheduled after connection." ;;
esac
log "Recurring sync is scheduled."

log "Creating a certification target post."
post_id="$(wp_cli post create --post_title="Certification target" --post_status=publish --porcelain | tr -d '\r')"

case "${post_id}" in
  ''|*[!0-9]*) fail "Could not create a certification post." ;;
esac

sign_payload() {
  local timestamp="$1"
  local body="$2"
  local body_hash
  body_hash="$(printf '%s' "${body}" | openssl dgst -sha256 | sed 's/^.*= //')"
  printf 'POST\n%s\n%s\n%s' "${signed_path}" "${timestamp}" "${body_hash}" |
    openssl dgst -sha256 -hmac "${cert_token}" | sed 's/^.*= //'
}

apply_body="{\"organizationId\":\"${cert_org_id}\",\"siteId\":\"${cert_site_id}\",\"operationId\":\"cert-operation-1\",\"items\":[{\"itemId\":\"cert-item-1\",\"externalId\":\"post:${post_id}\",\"afterValue\":{\"seoPlugin\":\"yoast\",\"seoTitle\":\"Certified SEO Title\",\"canonicalUrl\":\"https://example.com/certified\",\"robotsNoindex\":true}}]}"
timestamp="$(date +%s)"
signature="$(sign_payload "${timestamp}" "${apply_body}")"

log "Sending a signed safe-operation apply request."
apply_response="$(curl -s -X POST "${rest_url}" \
  -H 'content-type: application/json' \
  -H "x-sccc-site-id: ${cert_site_id}" \
  -H "x-sccc-token: ${cert_token}" \
  -H "x-sccc-timestamp: ${timestamp}" \
  -H "x-sccc-signature: ${signature}" \
  -d "${apply_body}")"

case "${apply_response}" in
  *'"appliedCount":1'*) ;;
  *) fail "Signed apply did not report one applied item: ${apply_response}" ;;
esac

case "${apply_response}" in
  *'"failedCount":0'*) ;;
  *) fail "Signed apply reported failed items: ${apply_response}" ;;
esac

applied_title="$(wp_cli post meta get "${post_id}" _yoast_wpseo_title | tr -d '\r')"
applied_canonical="$(wp_cli post meta get "${post_id}" _yoast_wpseo_canonical | tr -d '\r')"
applied_noindex="$(wp_cli post meta get "${post_id}" _yoast_wpseo_meta-robots-noindex | tr -d '\r')"

[ "${applied_title}" = "Certified SEO Title" ] || fail "SEO title meta was not written: ${applied_title}"
[ "${applied_canonical}" = "https://example.com/certified" ] || fail "Canonical meta was not written: ${applied_canonical}"
[ "${applied_noindex}" = "1" ] || fail "Robots noindex meta was not written: ${applied_noindex}"
log "Signed apply wrote the bounded SEO title, canonical, and robots fields."

log "Checking that a tampered signature is rejected."
bad_response="$(curl -s -X POST "${rest_url}" \
  -H 'content-type: application/json' \
  -H "x-sccc-site-id: ${cert_site_id}" \
  -H "x-sccc-token: ${cert_token}" \
  -H "x-sccc-timestamp: ${timestamp}" \
  -H "x-sccc-signature: 0000000000000000000000000000000000000000000000000000000000000000" \
  -d "${apply_body}")"

case "${bad_response}" in
  *PLUGIN_APPLY_SIGNATURE_INVALID*) ;;
  *) fail "Tampered signature was not rejected: ${bad_response}" ;;
esac
log "Tampered signatures are rejected."

log "Deactivating the plugin and checking cron cleanup."
wp_cli plugin deactivate "${plugin_slug}" >/dev/null

post_deactivation_hooks="$(wp_cli cron event list --fields=hook | tr -d '\r')"

case "${post_deactivation_hooks}" in
  *sccc_run_incremental_sync*) fail "Recurring sync hook is still scheduled after deactivation." ;;
  *) ;;
esac
log "Deactivation removed the scheduled sync."

log "Deleting the plugin cleanly."
wp_cli plugin delete "${plugin_slug}" >/dev/null

if wp_cli plugin is-installed "${plugin_slug}" >/dev/null 2>&1; then
  fail "Plugin is still installed after deletion."
fi

log "Certification passed for ${wp_image}."
