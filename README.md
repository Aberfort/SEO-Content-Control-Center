# Content Signal

Find the WordPress pages costing you traffic and turn them into an actionable SEO backlog.

## Repository Layout

- `apps/saas` - authenticated SaaS application and API built with Next.js.
- `apps/marketing` - public website for acquisition, demo, trial, and content.
- `apps/worker` - background BullMQ worker process for queued jobs.
- `packages/shared` - shared TypeScript domain types, RBAC, plans, and validation helpers.
- `packages/queue` - queue names, job contracts, and BullMQ connection helpers.
- `packages/gsc` - framework-agnostic Google Search Console client and token encryption helpers.
- `packages/monitoring` - framework-agnostic URL monitoring toolkit: SSRF-guarded crawler, HTML signal extraction, and snapshot-diff-to-events logic.
- `packages/database` - Prisma schema, migrations, and seed entry points.
- `wordpress-plugin` - production WordPress plugin skeleton.
- `docs` - integration guides and product documentation.

## Local Requirements

- Node.js 22+
- npm 10+
- PHP 8.1+
- Composer 2+
- Docker 27+

## First Setup

```bash
npm install
cp .env.example .env
docker compose up -d postgres redis minio mailpit
npm run verify:db:migrate
DATABASE_URL=postgresql://sccc:sccc@localhost:5432/sccc?schema=public npm run db:seed
npm run lint
npm test
npm run build
```

## Development

```bash
npm run dev
```

The SaaS app runs on `http://localhost:3000`.
The marketing app runs on `http://localhost:3001`.

The marketing site includes public product, integrations, agency/editorial/publisher solution pages, knowledge base, SEO briefings, changelog, contact, service information, demo, trial, and legal routes. Set `NEXT_PUBLIC_MARKETING_URL` to its public origin and `NEXT_PUBLIC_APP_URL` to the SaaS origin. Demo requests post JSON events to `SCCC_MARKETING_LEAD_WEBHOOK_URL`; optional `SCCC_MARKETING_LEAD_WEBHOOK_SECRET` is sent as a Bearer token. An unset webhook logs accepted leads only in development and returns a delivery error in production.

The background worker is started separately and requires Redis:

```bash
REDIS_URL=redis://localhost:6379 npm run start -w @sccc/worker
```

## Production Packaging

For a portable first-server deployment, copy `.env.production.example` to `.env.production.local`, fill real secrets/origins, then use:

```bash
npm run deploy:env:check -- --env-file .env.production.local --environment production
docker compose --env-file .env.production.local -f docker-compose.production.example.yml build
docker compose --env-file .env.production.local -f docker-compose.production.example.yml up -d postgres redis
docker compose --env-file .env.production.local -f docker-compose.production.example.yml run --rm migrate
docker compose --env-file .env.production.local -f docker-compose.production.example.yml up -d saas marketing worker
npm run deploy:smoke
```

The required production/staging values are documented in [docs/PRODUCTION_ENV.md](docs/PRODUCTION_ENV.md). The checker can validate the committed template with `npm run deploy:env:check -- --env-file .env.production.example --allow-placeholders`, but real environments must pass without `--allow-placeholders`.

Before production cutover, use `npm run deploy:staging:rehearse` with [docs/STAGING_REHEARSAL.md](docs/STAGING_REHEARSAL.md) to capture the real staging evidence for plugin connection, paginated sync, GSC, demo leads, Stripe webhooks, and safe operations.

Before publishing the WordPress plugin zip, use `npm run plugin:release:certify` with [docs/FINAL_PLUGIN_RELEASE_CERTIFICATION.md](docs/FINAL_PLUGIN_RELEASE_CERTIFICATION.md) to capture artifact metadata, run the WordPress/PHP certification matrix, and record the real staging Action Scheduler evidence.

After production deployment, use `npm run deploy:server:smoke` with [docs/SERVER_SMOKE_ROLLBACK.md](docs/SERVER_SMOKE_ROLLBACK.md) for env, database migration status, Redis, plugin archive, HTTP smoke, optional restore drill, rollback commands, and post-deploy monitoring.

The Dockerfile has separate `saas`, `marketing`, `worker`, and `migrate` targets. Rebuild when `NEXT_PUBLIC_APP_URL` or `NEXT_PUBLIC_MARKETING_URL` changes because those values are used by Next.js public metadata and handoff URLs at build time.

## Features

**WordPress plugin**

- Standalone, no-account local content health audit: missing SEO metadata, published noindex, canonical mismatches, thin content, stale content, and internal-link health (orphan and weak-link detection).
- Optional daily/weekly scheduling, latest-run comparison, CSV export, and WordPress Dashboard/Site Health integration.
- Optional SaaS connection for Search Console evidence, a shared team backlog, and audit history.
- Signed, review-first metadata operations for Yoast/Rank Math (title, meta description, canonical, noindex/nofollow) with preview, dry run, explicit confirmation, and rollback.

**SaaS platform**

- Multi-tenant organizations with role-based access, invites, and full activity logging.
- Google Search Console integration: OAuth connection, property discovery, and traffic-loss/opportunity detection.
- Prioritized backlog generated from content health signals and Search Console evidence.
- URL monitoring with SSRF-guarded baseline/rescan crawls, a normalized change-event timeline (title, canonical, robots, GA4/GTM, HTTP status, content, and response-time changes), and a deterministic regression engine that correlates those changes with Search Console traffic drops into "possible cause" alerts.
- Review-first safe operations: preview, dry run, explicit confirmation, worker-executed WordPress write, and rollback.
- Stripe billing with checkout, customer portal, webhooks, and plan-based feature gates.
- Optional AI-assisted recommendation summaries with a deterministic fallback when unconfigured.
- Email notifications/digests and client-facing HTML/CSV reports.

**Infrastructure**

- Background worker (BullMQ) for scheduled sync, bulk operations, and deliverables.
- Docker Compose production packaging, an environment/secrets validation gate, and staging rehearsal/smoke-test tooling.
- CI with lint, test, build, dependency audit, and CodeQL.

No automatic SEO write path is allowed without preview, dry run, explicit confirmation, worker execution, and per-item result capture.

## WordPress Plugin Release

Build the installable archive from the repository root:

```bash
npm run plugin:package
```

The command verifies version synchronization and writes `dist/seo-content-control-center-<version>.zip`. The archive contains one `seo-content-control-center/` directory with only runtime plugin files. It is also available through Composer:

```bash
composer run package --working-dir=wordpress-plugin
```

Use `npm run plugin:package:verify` to validate an existing default artifact, or pass a specific archive path directly to `scripts/verify-wordpress-plugin-package.sh`.

## Database

Use Prisma-backed SaaS persistence by setting:

```bash
SCCC_DATA_STORE=prisma
DATABASE_URL=postgresql://sccc:sccc@localhost:5432/sccc?schema=public
```

Without those variables, the app falls back to the in-memory repository for tests and lightweight local UI work.

For local iteration verification, `npm run verify:db:migrate` runs the Prisma migration check against the default Docker Postgres URL.

## Authentication

The SaaS app uses DB-backed credentials auth.

- Register: `http://localhost:3000/auth/register`
- Login: `http://localhost:3000/auth/login`
- Accept invite: `http://localhost:3000/auth/accept-invite?token=...`
- Logout: available from the SaaS sidebar after login.

Passwords are hashed with `scrypt`. Session cookies are HTTP-only, same-site, and store only an opaque token while the database stores the token hash. Users can enable authenticator-app 2FA from the SaaS Security panel when `SCCC_TOKEN_ENCRYPTION_KEY` is configured; TOTP secrets are encrypted at rest and login sessions are created only after password and authenticator verification pass.

## Backup Restore Smoke

`npm run verify:backup-restore` validates that a database backup can be restored into a disposable target database:

```bash
DATABASE_URL=postgresql://... \
SCCC_RESTORE_TEST_DATABASE_URL=postgresql://... \
npm run verify:backup-restore
```

The restore target must be disposable because the script runs `pg_restore --clean --if-exists`.

## Email Delivery

Invite emails use `noop` delivery by default. To send invites to local Mailpit:

```bash
SCCC_EMAIL_TRANSPORT=smtp
SCCC_SMTP_HOST=localhost
SCCC_SMTP_PORT=1025
SCCC_EMAIL_FROM="Content Signal <no-reply@localhost>"
```

Mailpit's inbox is available at `http://localhost:8025`.
