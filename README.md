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
- development auth context;
- tenant-scoped organization and site access layer backed by Prisma/PostgreSQL when configured;
- organization bootstrap UI/API;
- site creation UI/API;
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

## Development Auth

The SaaS app currently uses a local development auth context while the real Auth.js flow is not wired yet.

Optional environment variables:

```bash
SCCC_DEV_USER_ID=00000000-0000-4000-8000-000000000001
SCCC_DEV_USER_EMAIL=owner@example.com
SCCC_DEV_USER_NAME="Dev Owner"
```

This is intentionally limited to local MVP development and must be replaced by real authentication before production use.
