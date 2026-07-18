# Server Smoke And Rollback Runbook

This is the Iteration 111 production launch gate. Run it after deployment units
are up and before declaring the release live.

Use it for production and production-like staging. Production smoke must be run
from a network that can reach the private worker health endpoint.

## Automated Server Smoke

Default production run:

```bash
npm run deploy:server:smoke
```

The command expects `.env.production.local` by default and runs:

- production env validation;
- database migration status check with `prisma migrate status`;
- Redis `PING` through the configured `REDIS_URL`;
- WordPress plugin archive verification;
- SaaS, marketing, and worker HTTP smoke checks;
- optional backup restore drill when explicitly enabled.

Important overrides:

| Variable                                | Purpose                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------- |
| `SCCC_SERVER_ENV_FILE`                  | Env file path, default `.env.production.local`.                         |
| `SCCC_SERVER_ENVIRONMENT`               | `production` or `staging`, default `production`.                        |
| `SCCC_SERVER_SAAS_URL`                  | Override SaaS smoke URL.                                                |
| `SCCC_SERVER_MARKETING_URL`             | Override marketing smoke URL.                                           |
| `SCCC_SERVER_WORKER_HEALTH_URL`         | Private worker `/healthz` URL. Required unless worker smoke is skipped. |
| `SCCC_SERVER_DATABASE_URL`              | Override database URL for migration status and restore drill.           |
| `SCCC_SERVER_REDIS_URL`                 | Override Redis URL for `PING`.                                          |
| `SCCC_SERVER_PLUGIN_ARCHIVE`            | Zip path to verify; defaults to the versioned zip under `dist/`.        |
| `SCCC_SERVER_TIMEOUT_SECONDS`           | HTTP smoke timeout, default `8`.                                        |
| `SCCC_SERVER_RUN_RESTORE_DRILL`         | Set to `true` to run `npm run verify:backup-restore`.                   |
| `SCCC_SERVER_RESTORE_TEST_DATABASE_URL` | Disposable restore target override.                                     |

Targeted rerun flags:

| Variable                        | Purpose                                          |
| ------------------------------- | ------------------------------------------------ |
| `SCCC_SERVER_SKIP_ENV_CHECK`    | Skip env validation after it passed in this run. |
| `SCCC_SERVER_SKIP_DB_CHECK`     | Skip database migration status.                  |
| `SCCC_SERVER_SKIP_REDIS_CHECK`  | Skip Redis `PING`.                               |
| `SCCC_SERVER_SKIP_PLUGIN_CHECK` | Skip plugin archive verification.                |
| `SCCC_SERVER_SKIP_HTTP_SMOKE`   | Skip SaaS/marketing/worker HTTP smoke.           |
| `SCCC_SERVER_SKIP_WORKER_SMOKE` | Skip only private worker `/healthz` HTTP smoke.  |

Example with private worker health and restore drill:

```bash
SCCC_SERVER_WORKER_HEALTH_URL=http://127.0.0.1:8080/healthz \
SCCC_SERVER_RUN_RESTORE_DRILL=true \
npm run deploy:server:smoke
```

## Evidence Header

Record this in the release notes:

| Field                                   | Value |
| --------------------------------------- | ----- |
| Release date/time                       |       |
| Git commit SHA                          |       |
| Previous release SHA/tag                |       |
| SaaS URL                                |       |
| Marketing URL                           |       |
| Worker health URL or private check host |       |
| Database migration status               |       |
| Redis ping result                       |       |
| Plugin archive/version                  |       |
| Backup restore drill result             |       |
| Operator                                |       |

## Manual Production Smoke Checklist

Run these after the automated command:

| Surface   | Check                                                                                | Pass criteria                                                                                                        | Evidence |
| --------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- | -------- |
| SaaS      | Open `/api/health`.                                                                  | HTTP 200 with `seo-content-control-center-saas`.                                                                     |          |
| SaaS      | Register/login with a test account or verify an existing operator session.           | Session cookie is issued and dashboard loads.                                                                        |          |
| SaaS      | Billing overview.                                                                    | Current plan and actions render without provider errors.                                                             |          |
| SaaS      | GSC overview.                                                                        | Connected/disconnected state renders without token exposure.                                                         |          |
| Marketing | Open `/`, `/pricing`, `/security`, `/demo`, `/trial`, `/robots.txt`, `/sitemap.xml`. | HTTP 200 and canonical URLs use production marketing origin.                                                         |          |
| Marketing | Submit one internal demo test if launch allows it.                                   | Webhook receives one event; bad validation remains blocked.                                                          |          |
| Worker    | Open private `/healthz`.                                                             | HTTP 200 with queue counts and oldest-waiting lag.                                                                   |          |
| Worker    | Inspect worker logs.                                                                 | No missing `REDIS_URL`, GSC, token encryption, or bulk-operation warnings except expected optional-disable warnings. |          |
| Database  | `prisma migrate status`.                                                             | Database schema is up to date; no pending migrations.                                                                |          |
| Redis     | `PING` and worker heartbeat.                                                         | `PONG`; recent `sccc:worker:heartbeat:*` key exists.                                                                 |          |
| Plugin    | Verify release zip.                                                                  | Versioned zip is valid and matches `wordpress-plugin/VERSION`.                                                       |          |
| Plugin    | First production WordPress install or staging install.                               | Activation, connection page, and scheduler state load.                                                               |          |

## Backup Restore Drill

Run before launch cutover, and then quarterly. The restore target must be
disposable because the script runs `pg_restore --clean --if-exists`.

```bash
DATABASE_URL=postgresql://production-or-staging-source \
SCCC_RESTORE_TEST_DATABASE_URL=postgresql://disposable-restore-target \
npm run verify:backup-restore
```

Or through the server smoke wrapper:

```bash
SCCC_SERVER_RUN_RESTORE_DRILL=true \
SCCC_SERVER_RESTORE_TEST_DATABASE_URL=postgresql://disposable-restore-target \
npm run deploy:server:smoke
```

Pass criteria:

- Backup dump completes.
- Restore target accepts `pg_restore`.
- `_prisma_migrations` is readable after restore.
- No command points `SCCC_RESTORE_TEST_DATABASE_URL` at production.

## Rollback Decision Tree

Prefer the smallest rollback that removes user impact.

| Symptom                                   | First action                                                                               | Rollback scope                                     |
| ----------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------- |
| Marketing-only page or form regression    | Revert marketing deployment.                                                               | Marketing app only.                                |
| SaaS route/API regression with healthy DB | Revert SaaS deployment to previous commit/image.                                           | SaaS app, then worker if shared contracts changed. |
| Worker queue failures only                | Stop worker, deploy previous worker, keep SaaS if compatible.                              | Worker process only.                               |
| Plugin apply/sync regression              | Roll back WordPress plugin zip or disable affected plugin action.                          | Plugin artifact/site install.                      |
| Migration incompatible with current code  | Roll forward with compatibility patch if possible.                                         | App patch, not DB restore.                         |
| Data corruption or destructive migration  | Freeze writes, restore from PITR/backup to a new database, cut traffic after verification. | Database disaster recovery.                        |
| Redis outage or corrupted queue state     | Fail over Redis or flush only explicitly approved transient queues.                        | Redis/queue layer.                                 |

Do not run destructive database rollback commands during an incident unless the
release owner explicitly approves the restore target and cutover plan.

## Docker Compose Rollback

For the portable single-server deployment:

```bash
# 1. Freeze background mutations first.
docker compose --env-file .env.production.local -f docker-compose.production.example.yml stop worker

# 2. Move source to the previous known-good release.
git fetch --tags
git checkout <previous-release-sha-or-tag>

# 3. Rebuild app images from that source state.
docker compose --env-file .env.production.local -f docker-compose.production.example.yml build saas marketing worker

# 4. Start web services first, then worker.
docker compose --env-file .env.production.local -f docker-compose.production.example.yml up -d saas marketing
docker compose --env-file .env.production.local -f docker-compose.production.example.yml up -d worker

# 5. Confirm health.
npm run deploy:server:smoke
```

Notes:

- Do not run `migrate` during rollback unless the previous release is confirmed
  compatible with the current schema.
- Prefer backward-compatible migrations so app rollback does not require DB
  rollback.
- If a rollback commit expects older public origins, rebuild after verifying
  `NEXT_PUBLIC_APP_URL` and `NEXT_PUBLIC_MARKETING_URL`.

## Managed Platform Rollback

For provider-native deployments, use the provider's previous deployment/image
promotion:

```bash
# Pseudocode. Replace with the provider command.
platform deployments promote <previous-saas-deployment>
platform deployments promote <previous-marketing-deployment>
platform jobs restart worker --image <previous-worker-image>
npm run deploy:server:smoke
```

Keep the worker stopped while web rollback is in progress if the worker shares a
changed queue or database contract with the SaaS release.

## WordPress Plugin Rollback

Keep the previous installable zip with release artifacts.

1. Download or locate `seo-content-control-center-<previous-version>.zip`.
2. In WordPress admin, upload the previous zip and replace the current plugin.
3. Confirm activation succeeds and connection settings remain present.
4. Trigger manual sync on one staging/production-safe page.
5. If connection secrets were rotated or invalidated, reconnect the plugin from
   SaaS.

Plugin rollback should not mutate content by itself. Safe operation writes still
require preview, dry run, confirmation, worker execution, and signed apply.

## Post-Deploy Monitoring Window

Watch for at least 60 minutes after production cutover.

| Signal           | Healthy                                                            |
| ---------------- | ------------------------------------------------------------------ |
| SaaS health      | `/api/health` stays 200.                                           |
| Marketing routes | Key public routes stay 200 and no unexpected 404/500 spikes.       |
| Worker health    | `/healthz` stays 200; queue lag does not trend upward.             |
| Worker heartbeat | Recent `sccc:worker:heartbeat:*` key exists.                       |
| Database         | Connection count and slow queries remain normal.                   |
| Redis            | Memory, evictions, and command latency remain normal.              |
| Sentry           | No new high-volume release errors.                                 |
| PostHog          | Expected server events continue without duplication spikes.        |
| Stripe webhook   | Test or low-risk event reconciles once; replay remains idempotent. |
| Demo webhook     | Lead delivery success rate remains normal.                         |
| Plugin sync      | First connected site sync succeeds without secret leakage.         |
| Safe operations  | No inline WordPress writes; worker-only execution remains visible. |

Escalate to rollback when one of these remains true after initial mitigation:

- SaaS authenticated flows fail for active users.
- Marketing demo/trial acquisition cannot submit or hand off.
- Worker queue lag grows and blocks safe operations or GSC sync.
- Stripe webhook reconciliation mutates incorrectly.
- Plugin sync or apply leaks secrets or writes unsupported fields.
- Database integrity is uncertain.

## After Rollback

1. Run `npm run deploy:server:smoke`.
2. Confirm Sentry/PostHog release markers identify the rolled-back version.
3. Record the incident window, affected services, and rollback SHA/artifact.
4. Create a fix-forward issue with logs and evidence.
5. Do not retry launch cutover until staging rehearsal and server smoke both
   pass again.
