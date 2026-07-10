# Scripts

This directory contains operational scripts used by CI, local development, and release automation.

- `verify-db-backup-restore.sh` runs a `pg_dump`/`pg_restore` smoke test against a disposable restore database via `npm run verify:backup-restore`.
