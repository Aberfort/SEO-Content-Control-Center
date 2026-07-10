#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required." >&2
  exit 1
fi

if [[ -z "${SCCC_RESTORE_TEST_DATABASE_URL:-}" ]]; then
  echo "SCCC_RESTORE_TEST_DATABASE_URL must point at a disposable restore-test database." >&2
  exit 1
fi

dump_file="$(mktemp "${TMPDIR:-/tmp}/sccc-db-backup.XXXXXX.dump")"
trap 'rm -f "$dump_file"' EXIT

pg_dump --format=custom --no-owner --no-privileges --file="$dump_file" "$DATABASE_URL"
pg_restore --clean --if-exists --no-owner --no-privileges --dbname="$SCCC_RESTORE_TEST_DATABASE_URL" "$dump_file"
psql "$SCCC_RESTORE_TEST_DATABASE_URL" --set=ON_ERROR_STOP=1 --command='SELECT COUNT(*) AS applied_migrations FROM "_prisma_migrations";'

echo "Backup restore smoke test completed."
