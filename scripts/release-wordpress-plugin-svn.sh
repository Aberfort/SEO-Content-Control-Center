#!/usr/bin/env bash
#
# Stages a WordPress.org release in a Subversion working copy.
#
# The script never publishes on its own. It syncs trunk, mirrors the directory
# assets, creates the version tag, and then prints the `svn commit` command for
# a human to review and run. Pass --commit to publish in the same step.
#
# Usage:
#   scripts/release-wordpress-plugin-svn.sh [--commit] [--dry-run]
#
# Environment:
#   SCCC_SVN_DIR   Working-copy path (default: ../content-signal-svn)
#   SCCC_SVN_URL   Repository URL, used only for the initial checkout

set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
plugin_dir="${repository_root}/wordpress-plugin"
svn_dir="${SCCC_SVN_DIR:-$(dirname "${repository_root}")/content-signal-svn}"
svn_url="${SCCC_SVN_URL:-https://plugins.svn.wordpress.org/content-signal-seo-content-audit/}"

do_commit=0
dry_run=0

for argument in "$@"; do
  case "${argument}" in
    --commit) do_commit=1 ;;
    --dry-run) dry_run=1 ;;
    *) echo "Unknown argument: ${argument}" >&2; exit 1 ;;
  esac
done

for tool in svn rsync; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "Releasing to WordPress.org requires ${tool}." >&2
    exit 1
  fi
done

# The four version fields must already agree before anything is staged.
"${repository_root}/scripts/verify-wordpress-plugin-version.sh"
version="$(tr -d '\r\n' < "${plugin_dir}/VERSION")"

if [[ ! -d "${svn_dir}/.svn" ]]; then
  echo "Checking out ${svn_url} into ${svn_dir}"
  svn checkout "${svn_url}" --depth immediates "${svn_dir}" --non-interactive
  svn update --set-depth infinity "${svn_dir}/trunk" "${svn_dir}/assets" --non-interactive
else
  svn update "${svn_dir}" --non-interactive >/dev/null
fi

if svn ls "${svn_url}tags/${version}" --non-interactive >/dev/null 2>&1; then
  echo "Tag ${version} already exists on WordPress.org. Bump the version before releasing." >&2
  exit 1
fi

# Trunk contents must match what scripts/build-wordpress-plugin.sh packages.
# Anything not listed here is deliberately kept out of the distributed plugin
# (tests, composer.lock, phpcs config, vendor, certification fixtures).
trunk="${svn_dir}/trunk"
mkdir -p "${trunk}"

for file in content-signal-seo-content-audit.php uninstall.php readme.txt LICENSE.txt VERSION composer.json; do
  rsync -c "${plugin_dir}/${file}" "${trunk}/${file}"
done

for directory in includes assets; do
  rsync -rc --delete "${plugin_dir}/${directory}/" "${trunk}/${directory}/"
done

# Directory-page artwork lives outside trunk, in the repository's assets root.
rsync -rc --delete --exclude ".svn" "${plugin_dir}/.wordpress-org/" "${svn_dir}/assets/"

# Reconcile additions and deletions with Subversion, which does not detect them.
svn add --force "${trunk}" "${svn_dir}/assets" --auto-props --parents --depth infinity -q
svn status "${svn_dir}" | awk '/^!/ {print $2}' | while read -r missing; do
  svn rm --force "${missing}" -q
done

svn copy "${trunk}" "${svn_dir}/tags/${version}" -q
svn propset svn:ignore ".svn" "${svn_dir}/tags/${version}" -q 2>/dev/null || true

echo
echo "Staged release ${version} in ${svn_dir}"
echo
svn status "${svn_dir}" | grep -v "^?" | head -40
echo

if [[ "${dry_run}" -eq 1 ]]; then
  echo "Dry run: reverting staged changes."
  svn revert -R "${svn_dir}" -q
  rm -rf "${svn_dir}/tags/${version}"
  exit 0
fi

commit_message="Release ${version}"

if [[ "${do_commit}" -eq 1 ]]; then
  svn commit "${svn_dir}" -m "${commit_message}"
  echo "Published ${version} to WordPress.org."
else
  echo "Nothing has been published. Review the staged changes, then run:"
  echo
  echo "  svn commit \"${svn_dir}\" -m \"${commit_message}\""
  echo
  echo "Subversion will ask for the WordPress.org username and password."
fi
