# Changelog

## 0.1.0 - Foundation Iterations

### Iteration 8

- Added `WordPressConnectionChallenge` model and migration for short-lived one-time plugin connection challenges.
- Added authenticated challenge creation endpoint for tenant sites.
- Added public challenge exchange endpoint that returns plugin credentials once and stores only token hashes.
- Added signed plugin sync endpoint with timestamp tolerance, token hash verification, and HMAC signature verification.
- Added plugin connection and sync validation schemas plus signing tests.
- Documented plugin connection headers, challenge exchange, and sync QA checks.

### Iteration 7

- Added same-origin CSRF guard for mutating JSON API routes and server actions.
- Added fixed-window rate limiting for login, registration, invite creation/resend, and invite acceptance.
- Added structured `CSRF_INVALID` and `RATE_LIMITED` API errors with `Retry-After` for rate limits.
- Added tests for CSRF origin matching and rate-limit behavior.
- Documented browser mutation security checks and MVP rate-limit scope.

### Iteration 6

- Added invite email delivery boundary with noop and SMTP transports.
- Added Mailpit-compatible SMTP configuration for local invite testing.
- Connected invite creation and resend flows to email delivery.
- Added email delivery status to invite API responses.
- Added tests for email configuration, delivery fallback, and invite email rendering.
- Documented local Mailpit setup, email environment variables, and delivery QA checks.

### Iteration 5

- Added hashed invite tokens, invite expiry, accepted/canceled timestamps, and `CANCELED` member status.
- Added accept-invite flow at `/auth/accept-invite` with login/register return handling.
- Added repository and API methods for invite accept, resend, and cancel.
- Changed registration so pending invites require token acceptance instead of automatic activation.
- Added pending invite controls in the members UI.
- Added tests for invite token lifecycle behavior and shared accept-invite validation.

### Iteration 4

- Added member invite validation and assignable role schemas.
- Added organization member listing, invite, and role update repository methods.
- Added members UI on the SaaS setup dashboard.
- Added protected members API routes.
- Added role update controls with owner/self-change guardrails.
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
