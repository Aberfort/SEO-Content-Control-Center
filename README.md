# SEO Content Control Center for WordPress

Find the WordPress pages costing you traffic and turn them into an actionable SEO backlog.

## Repository Layout

- `apps/saas` - authenticated SaaS application and API built with Next.js.
- `apps/marketing` - public website for acquisition, demo, trial, and content.
- `apps/worker` - background BullMQ worker process for queued jobs.
- `packages/shared` - shared TypeScript domain types, RBAC, plans, and validation helpers.
- `packages/queue` - queue names, job contracts, and BullMQ connection helpers.
- `packages/gsc` - framework-agnostic Google Search Console client and token encryption helpers.
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

The background worker is started separately and requires Redis:

```bash
REDIS_URL=redis://localhost:6379 npm run start -w @sccc/worker
```

## Current Iteration

This repository currently contains the Phase 0 foundation and the first SaaS MVP slice:

- product and architecture documents;
- monorepo package boundaries;
- Prisma data model draft for multi-tenant SaaS;
- initial database migration and plan seed script;
- health endpoint;
- shared RBAC/plan utilities with tests;
- DB-backed credentials auth and hashed session cookies;
- password reset emails with hashed one-time tokens and session invalidation after reset;
- email verification emails with hashed one-time tokens and a browser confirmation page;
- computed SaaS onboarding checklist for workspace, site, plugin sync, audit, and backlog setup;
- local no-charge Trial subscriptions for new workspaces with expiry enforcement;
- tenant-scoped organization and site access layer backed by Prisma/PostgreSQL when configured;
- organization bootstrap UI/API;
- site creation UI/API;
- member invite UI/API with hashed invite tokens, accept, resend, and cancel flows;
- SMTP invite email delivery with local Mailpit support;
- same-origin CSRF guard and rate limits for auth, invite, safe content operation, WordPress plugin, and billing webhook endpoints, backed by Redis when `REDIS_URL` is configured with a process-local in-memory fallback;
- WordPress plugin challenge/exchange and signed sync API foundation;
- dedicated WordPress plugin API documentation for connection, signing, sync, disconnect, and metadata contracts;
- WordPress plugin admin challenge exchange and signed manual sync request;
- WordPress plugin admin feedback notices for connection, manual sync, and disconnect outcomes;
- WordPress plugin recurring sync through Action Scheduler with hourly WP-Cron fallback;
- WordPress plugin and SaaS dashboard disconnect flow with server-side token invalidation;
- WordPress plugin posts/pages inventory payload for signed sync;
- WordPress plugin paginated inventory sync in ID-ordered batches of 200 with offset cursors and a per-run batch safety bound;
- WordPress plugin content metadata sync for author, publish date, featured image, taxonomies, word count, and internal/outbound link counts;
- WordPress plugin SEO metadata sync for Yoast, Rank Math, and fallback title/canonical/robots signals;
- WordPress plugin sync logs for queued, successful, and failed sync attempts with sanitized failure details;
- WordPress plugin signed safe operation apply endpoint for bounded Yoast/Rank Math SEO metadata batches;
- SaaS persistence and dashboard inventory for synced WordPress content;
- Google Search Console connection overview scaffold with tenant-scoped property state and OAuth readiness guardrails;
- Google Search Console OAuth start/callback with signed state and encrypted refresh token storage;
- Google Search Console property discovery with automatic URL-prefix or domain-property matching;
- Google Search Console manual property picker for connected accounts;
- Google Search Console daily metric sync for property-level clicks, impressions, CTR, and average position;
- Google Search Console page/query insight sync for top Search Analytics rows;
- deterministic Search Console traffic loss detection with site-level window comparison, page-level baseline snapshot comparison, severity thresholds, a dashboard panel, and a scoped read-only API endpoint;
- normalized URL matching between Search Console traffic loss pages and synced WordPress content items in the traffic loss API and dashboard;
- audit runs materialize matched Search Console traffic loss drops as deduplicated `gsc.traffic-loss` audit issues with detection-derived severity and comparison evidence;
- deterministic Search Console opportunity detection (CTR below a position benchmark, striking distance positions 5-15) with a read-only endpoint, a dashboard panel, and one-click conversion of matched pages into backlog tasks through the existing candidate mechanism;
- assistant recommendations sourced from Search Console traffic loss and opportunity evidence with metric details, read-only safeguards, and safe-preview controls enabled only for backlog-sourced recommendations;
- optional env-configured Anthropic AI provider (`SCCC_AI_PROVIDER`, `SCCC_AI_API_KEY`, `SCCC_AI_MODEL`) that adds an AI summary to assistant responses, meters one `ai_credits` usage metric per successful summary, blocks calls once plan credits are exhausted with a deduplicated notification, and falls back to deterministic responses without charging on provider failures;
- env-gated observability: Sentry error reporting for SaaS request errors and worker job failures, PostHog server analytics with tenant context from the shared event taxonomy, and a worker `GET /healthz` endpoint with BullMQ queue counts and oldest-waiting lag;
- SaaS synced content inventory with search, filters, and cursor pagination;
- SaaS synced content detail panel and tenant-scoped detail API;
- computed synced content health signals from WordPress sync metadata, including thin content, missing SEO title/meta description, noindex, canonical mismatch, and link-count signals;
- computed backlog candidate tasks from synced content health signals;
- tenant-scoped metadata audit run creation, completion, listing, and issue summaries with synced-content issue materialization from existing plugin metadata;
- SaaS dashboard audit panel with queue action and recent run status;
- SaaS dashboard audit issue triage with status updates and backlog task creation;
- SaaS dashboard audit issue summary counts for selected audit runs;
- SaaS dashboard audit issue search and status/severity filtering;
- SaaS dashboard audit issue CSV export with current filters;
- tenant-scoped audit issue listing with status, severity, and text filters;
- tenant-scoped audit issue CSV export;
- tenant-scoped audit issue status updates with audit logging;
- persisted backlog task creation from synced content candidates;
- persisted backlog task creation from scoped audit issues;
- bulk backlog task creation from open issues in a scoped audit run;
- SaaS backlog task listing for persisted candidate-created tasks;
- backlog text search and status/severity filtering with summary counts;
- backlog task status updates with audit logging;
- backlog assignment and due date updates with audit logging;
- backlog task comments with audit logging;
- backlog task change history for creation, status, assignment, due date, and comments;
- backlog CSV export for filtered site tasks;
- safe content operation previews created from scoped backlog tasks, with executable Yoast/Rank Math SEO title and meta description payloads when scoped synced content evidence exists;
- dry run support for previewed safe content operations without WordPress writes;
- explicit confirmation for dry-run-passed safe content operations;
- controlled start state for confirmed safe content operations without inline WordPress writes;
- execution result recording for running safe content operations with per-item outcomes;
- queued safe content operation execution through the worker for executable signed WordPress apply payloads;
- queued rollback restore for completed safe content operation items with captured previous WordPress SEO values;
- queue-backed retry for failed safe content operation execution and rollback restore items;
- item status summaries and retry-mode visibility for inspecting partial execution and rollback outcomes;
- activity logs for safe content operation preview, dry run, confirmation, start, result, rollback, and retry transitions;
- organization notifications for safe content operation lifecycle outcomes;
- read and unread state management for organization notifications;
- bulk mark-read support for organization notifications;
- read-only assistant recommendations with source evidence;
- assistant AI-credit usage envelopes for recommendation responses;
- assistant safe-preview controls with manual confirmation guardrails;
- read-only billing overview with plan catalog, local Trial subscription state, and current plan state;
- provider-gated billing controls with Stripe checkout and billing portal session creation when billing credentials and subscription linkage are configured;
- signed and idempotent Stripe webhook reconciliation for local subscription state;
- billing feature gates for site/user plan limits and expired local Trial access;
- billing notifications when finite site or user limits are reached;
- basic activity log writes;
- BullMQ worker process foundation with maintenance queue processing, Redis heartbeat, job handler registry, tenant job payload validation, and graceful shutdown;
- shared queue contract package with reserved queue/job names, deterministic job ids, and bounded retry defaults;
- scheduled daily Google Search Console metric and insight sync through repeatable worker jobs for every active connection;
- bulk operation execution queue processing with signed WordPress plugin apply calls and per-item result persistence;
- shared framework-agnostic Google Search Console client package used by both the SaaS app and the worker;
- WordPress plugin skeleton with secure defaults;
- Docker local dependencies;
- CI workflow with dependency audit and CodeQL SAST.

No automatic SEO write path is allowed without preview, dry run, explicit confirmation, worker execution, and per-item result capture.

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
SCCC_EMAIL_FROM="SEO Content Control Center <no-reply@localhost>"
```

Mailpit's inbox is available at `http://localhost:8025`.
