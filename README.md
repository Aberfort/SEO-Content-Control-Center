# SEO Content Control Center for WordPress

Find the WordPress pages costing you traffic and turn them into an actionable SEO backlog.

## Repository Layout

- `apps/saas` - authenticated SaaS application and API built with Next.js.
- `apps/marketing` - public website for acquisition, demo, trial, and content.
- `packages/shared` - shared TypeScript domain types, RBAC, plans, and validation helpers.
- `packages/database` - Prisma schema, migrations, and seed entry points.
- `wordpress-plugin` - production WordPress plugin skeleton.
- `docs` - product, architecture, API, security, QA, deployment, and content documents.

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

## Current Iteration

This repository currently contains the Phase 0 foundation and the first SaaS MVP slice:

- product and architecture documents;
- monorepo package boundaries;
- Prisma data model draft for multi-tenant SaaS;
- initial database migration and plan seed script;
- health endpoint;
- shared RBAC/plan utilities with tests;
- DB-backed credentials auth and hashed session cookies;
- tenant-scoped organization and site access layer backed by Prisma/PostgreSQL when configured;
- organization bootstrap UI/API;
- site creation UI/API;
- member invite UI/API with hashed invite tokens, accept, resend, and cancel flows;
- SMTP invite email delivery with local Mailpit support;
- same-origin CSRF guard and MVP rate limits for auth, invite, and safe content operation mutations;
- WordPress plugin challenge/exchange and signed sync API foundation;
- WordPress plugin admin challenge exchange and signed manual sync request;
- WordPress plugin posts/pages inventory payload for signed sync;
- SaaS persistence and dashboard inventory for synced WordPress content;
- SaaS synced content inventory with search, filters, and cursor pagination;
- SaaS synced content detail panel and tenant-scoped detail API;
- computed synced content health signals from WordPress sync metadata;
- computed backlog candidate tasks from synced content health signals;
- tenant-scoped audit run queueing and listing;
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
- SaaS backlog task listing for persisted candidate-created tasks;
- backlog text search and status/severity filtering with summary counts;
- backlog task status updates with audit logging;
- backlog assignment and due date updates with audit logging;
- backlog task comments with audit logging;
- backlog task change history for creation, status, assignment, due date, and comments;
- backlog CSV export for filtered site tasks;
- preview-only safe content operations created from scoped backlog tasks;
- dry run support for previewed safe content operations without WordPress writes;
- explicit confirmation for dry-run-passed safe content operations;
- controlled start state for confirmed safe content operations without inline WordPress writes;
- execution result recording for running safe content operations with per-item outcomes;
- rollback state capture for completed or failed safe content operations;
- retry state capture for failed safe content operation items;
- organization notifications for safe content operation lifecycle outcomes;
- read and unread state management for organization notifications;
- bulk mark-read support for organization notifications;
- read-only assistant recommendations with source evidence;
- assistant AI-credit usage envelopes for recommendation responses;
- basic activity log writes;
- WordPress plugin skeleton with secure defaults;
- Docker local dependencies;
- CI workflow.

No destructive SEO automation is implemented in this iteration.

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

Passwords are hashed with `scrypt`. Session cookies are HTTP-only, same-site, and store only an opaque token while the database stores the token hash.

## Email Delivery

Invite emails use `noop` delivery by default. To send invites to local Mailpit:

```bash
SCCC_EMAIL_TRANSPORT=smtp
SCCC_SMTP_HOST=localhost
SCCC_SMTP_PORT=1025
SCCC_EMAIL_FROM="SEO Content Control Center <no-reply@localhost>"
```

Mailpit's inbox is available at `http://localhost:8025`.
