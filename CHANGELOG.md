# Changelog

## 0.1.0 - Foundation Iterations

### Iteration 4

- Added member invite validation and assignable role schemas.
- Added organization member listing, invite, and role update repository methods.
- Added members UI on the SaaS setup dashboard.
- Added protected members API routes.
- Added role update controls with owner/self-change guardrails.
- Added invited-user registration activation.
- Added tests for repository invite and role update behavior.

### Iteration 3

- Added `Session` data model and migration.
- Added credentials registration, login, and logout.
- Added `scrypt` password hashing and verification.
- Added HTTP-only session cookies backed by hashed DB tokens.
- Added auth pages and JSON auth API routes.
- Protected SaaS dashboard/setup pages behind session checks.
- Changed protected organization/site/activity APIs to return `401 AUTH_REQUIRED` without a session.
- Added password hashing tests.

### Iteration 2

- Added Prisma client workspace exports.
- Added initial SQL migration generated from the Prisma schema.
- Added plan seed script.
- Added Prisma-backed SaaS repository for organizations, memberships, sites, and activity logs.
- Switched SaaS pages, server actions, and API routes to the repository abstraction.
- Kept in-memory repository fallback for unit tests and no-DB local rendering.
- Added repository fallback tests.

### Iteration 1

- Added local development auth context.
- Added tenant-scoped development store for organizations, memberships, sites, and activity logs.
- Added organization bootstrap UI and API.
- Added site creation UI and API with URL deduplication.
- Added organization activity API.
- Added RBAC enforcement for tenant access.
- Added tests for tenant isolation, site creation, Viewer denial, duplicate URL handling, and shared schemas.

### Iteration 0

- Created product, architecture, API, security, data model, QA, deployment, and landing content documents.
- Added monorepo structure for SaaS, marketing, shared packages, database, and WordPress plugin.
- Added Prisma schema draft.
- Added health endpoint, Docker Compose, CI, lint, tests, build scripts, and WordPress plugin skeleton.
