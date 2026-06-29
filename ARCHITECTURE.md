# Architecture

## System Components

- SaaS application: Next.js, TypeScript, React, Tailwind CSS, API routes/server actions, Auth.js-compatible authentication, PostgreSQL, Redis, BullMQ workers, S3-compatible storage, Stripe/Paddle billing.
- WordPress plugin: PHP 8.1+, PSR-4 autoloading, WP REST API, Action Scheduler for background work, nonce/capability checks, sanitized inputs, escaped outputs.
- Marketing site: public Next.js app with SEO metadata, lead/demo/trial forms, product content, status and legal pages.
- Workers: background jobs for sync ingestion, audits, GSC pulls, exports, bulk operations, retries, dead-letter handling.

## Monorepo Boundaries

- `apps/saas` owns authenticated product surfaces and SaaS API endpoints.
- `apps/marketing` owns public acquisition pages.
- `packages/shared` owns framework-agnostic types, RBAC, plan limits, event names, and validation contracts.
- `packages/database` owns Prisma schema and migrations.
- `wordpress-plugin` owns all WordPress code.

## Multi-Tenancy

All SaaS data is scoped to an `organizationId`. Site-level data additionally carries `siteId`. API handlers, worker jobs, cache keys, storage paths, logs, and analytics events must include tenant context.

Tenant isolation requirements:

- never trust client-supplied organization/site IDs without membership checks;
- prevent IDOR by querying through membership-scoped accessors;
- prefix cache keys with organization and site identifiers;
- store files under `organizations/{organizationId}/sites/{siteId}/...`;
- include organization/site IDs in worker payloads;
- redact tokens, passwords, authorization headers, and personal data from logs.

## WordPress Connection Flow

1. SaaS creates a one-time connection challenge.
2. Admin installs the plugin and enters or opens the connection flow.
3. Plugin verifies nonce/capability locally.
4. Plugin exchanges the challenge for a site token.
5. SaaS stores hashed token metadata and returns only the needed secret once.
6. Plugin stores the secret in WordPress options with autoload disabled.
7. All plugin-to-SaaS requests are signed.
8. Token rotation and disconnect are supported.

## Background Processing

Heavy work must not run inside a single HTTP request. SaaS uses Redis-backed queues; WordPress uses Action Scheduler. Every job is idempotent, retryable, and carries organization/site context.

## Safety Model

The system may recommend SEO changes, prepare previews, and queue dry runs. It must not mutate risky WordPress SEO state without an explicit confirmed operation with audit logging and rollback support.
