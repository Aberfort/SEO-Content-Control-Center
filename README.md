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
npm run db:validate
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

This repository currently contains the Phase 0 foundation:

- product and architecture documents;
- monorepo package boundaries;
- Prisma data model draft for multi-tenant SaaS;
- health endpoint;
- shared RBAC/plan utilities with tests;
- WordPress plugin skeleton with secure defaults;
- Docker local dependencies;
- CI workflow.

No destructive SEO automation is implemented in this iteration.
