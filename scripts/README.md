# Scripts

This directory contains operational scripts used by CI, local development, and release automation.

- `build-wordpress-plugin.sh` validates plugin version parity, validates Composer metadata, stages runtime plugin files, builds `dist/seo-content-control-center-<version>.zip`, and verifies the archive.
- `verify-wordpress-plugin-version.sh` checks that `VERSION`, the WordPress plugin header/runtime constant, `readme.txt`, and Composer release metadata agree on a `MAJOR.MINOR.PATCH` version.
- `verify-wordpress-plugin-package.sh [archive]` checks zip integrity, required files, a single plugin root, and excluded development-only files. Without an argument it checks the default versioned archive under `dist/`.
- `test-wordpress-plugin-package.sh` runs a disposable package build and archive verification for `npm test`.
- `verify-db-backup-restore.sh` runs a `pg_dump`/`pg_restore` smoke test against a disposable restore database via `npm run verify:backup-restore`.
- `verify-production-env.mjs` validates production/staging env files before deployment; run it through `npm run deploy:env:check`.
- `rehearse-staging-release.sh` orchestrates the staging release preflight: env check, plugin package build, staging HTTP smoke, and the manual evidence checklist in `docs/STAGING_REHEARSAL.md`.
- `smoke-production.sh` checks a deployed stack by requesting SaaS `/api/health`, key marketing routes, and worker `/healthz`; configure URLs with `SCCC_SMOKE_SAAS_URL`, `SCCC_SMOKE_MARKETING_URL`, and `SCCC_SMOKE_WORKER_HEALTH_URL`.
- `check-redis-url.mjs` sends a dependency-free Redis/Redis TLS `PING` for server smoke checks.
- `smoke-server-release.sh` orchestrates the production server smoke gate: env check, migration status, Redis ping, plugin archive verification, HTTP smoke, and optional restore drill.

Run from the repository root:

```bash
npm run plugin:package
npm run plugin:package:verify
npm run deploy:env:check -- --env-file .env.production.example --allow-placeholders
npm run deploy:staging:rehearse
npm run deploy:smoke
npm run deploy:server:smoke
```
