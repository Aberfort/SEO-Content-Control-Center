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
DATABASE_URL=postgresql://sccc:sccc@localhost:5432/sccc?schema=public npm run db:migrate:deploy
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
- same-origin CSRF guard and MVP rate limits for auth/invite mutations;
- WordPress plugin challenge/exchange and signed sync API foundation;
- WordPress plugin admin challenge exchange and signed manual sync request;
- WordPress plugin posts/pages inventory payload for signed sync;
- SaaS persistence and dashboard inventory for synced WordPress content;
- SaaS synced content inventory with search, filters, and cursor pagination;
- SaaS synced content detail panel and tenant-scoped detail API;
- computed synced content health signals from WordPress sync metadata;
- computed backlog candidate tasks from synced content health signals;
- persisted backlog task creation from synced content candidates;
- SaaS backlog task listing for persisted candidate-created tasks;
- backlog status/severity filtering with summary counts;
- backlog task status updates with audit logging;
- backlog assignment and due date updates with audit logging;
- backlog task comments with audit logging;
- backlog CSV export for filtered site tasks;
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
