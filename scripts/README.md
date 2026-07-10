# Scripts

This directory contains operational scripts used by CI, local development, and release automation.

- `build-wordpress-plugin.sh` validates plugin version parity, validates Composer metadata, stages runtime plugin files, builds `dist/seo-content-control-center-<version>.zip`, and verifies the archive.
- `verify-wordpress-plugin-version.sh` checks that `VERSION`, the WordPress plugin header/runtime constant, `readme.txt`, and Composer release metadata agree on a `MAJOR.MINOR.PATCH` version.
- `verify-wordpress-plugin-package.sh [archive]` checks zip integrity, required files, a single plugin root, and excluded development-only files. Without an argument it checks the default versioned archive under `dist/`.
- `test-wordpress-plugin-package.sh` runs a disposable package build and archive verification for `npm test`.
- `verify-db-backup-restore.sh` runs a `pg_dump`/`pg_restore` smoke test against a disposable restore database via `npm run verify:backup-restore`.

Run from the repository root:

```bash
npm run plugin:package
npm run plugin:package:verify
```
