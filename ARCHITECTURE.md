# Architecture

## System Components

- SaaS application: Next.js, TypeScript, React, Tailwind CSS, API routes/server actions, Auth.js-compatible authentication, PostgreSQL, Redis-backed rate limits and queues, BullMQ workers, S3-compatible storage (planned), Stripe billing.
- WordPress plugin: PHP 8.1+, PSR-4 autoloading, WP REST API, Action Scheduler for background work, nonce/capability checks, sanitized inputs, escaped outputs.
- Marketing site: public Next.js app with SEO metadata, lead/demo/trial forms, product content, status and legal pages.
- Workers: BullMQ worker process foundation with heartbeat, handler registry, graceful shutdown, scheduled Google Search Console sync, and safe bulk operation execution.

## Current Implementation Status

The target architecture above is not fully built yet. As of Iteration 103 the codebase deviates as follows:

- A worker foundation exists: `apps/worker` runs BullMQ workers on the `sccc-maintenance`, `sccc-gsc-sync`, and `sccc-bulk-operations` queues when configured, with a Redis heartbeat, a job handler registry, tenant payload validation helpers, and graceful shutdown. The `sccc-plugin-sync` queue name remains reserved.
- Rate limits use Redis-backed fixed windows when `REDIS_URL` is configured and fall back to process-local in-memory windows otherwise (or when Redis is unavailable).
- Audits complete synchronously inside the HTTP request from already-synced metadata; no crawling or queued audit jobs exist.
- Google Search Console metric and insight syncs run on a daily repeatable worker schedule for every active connection, and can still be triggered manually from the dashboard. The shared Google API client lives in `packages/gsc`.
- Safe content operations now have state capture, executable SEO title/meta description payload generation plus self-canonical and individual noindex/nofollow removal repairs from synced content evidence, queue execution, a signed WordPress apply endpoint, worker result persistence, worker-backed rollback restore for completed items with captured previous SEO values, and queue-backed retry for failed execution or rollback items.
- Observability is env-gated and dependency-free: Sentry error reporting (`SENTRY_DSN`) covers SaaS unhandled request errors via `instrumentation.ts` and worker job failures, PostHog server analytics (`POSTHOG_KEY`) captures tenant-scoped events from the shared taxonomy, and the worker exposes `GET /healthz` with BullMQ queue counts and oldest-waiting lag when `SCCC_WORKER_HEALTH_PORT` is set. Telemetry payloads carry explicit fields only and never include secrets.
- SaaS account security includes opt-in TOTP two-factor authentication with encrypted secrets, pending enrollment state, login enforcement before session issuance, and replay protection through the last accepted TOTP counter.
- The marketing app now owns the public home, features, product, integrations, agency/editorial/publisher solutions, knowledge base, SEO briefings, changelog, contact, service information, pricing, security, demo, trial, and legal routes, plus route metadata, sitemap/robots discovery, a webhook-delivered demo lead flow, and a trial handoff to SaaS registration. Public pricing imports plan limits from `@sccc/shared` so marketing and application gates share one contract. The service-information page is static and explicitly does not represent a real-time public monitor.
- The WordPress plugin now has a version-verified, runtime-only release archive build. CI runs its package smoke test and uploads the versioned zip as an installation-test artifact; live WordPress/PHP matrix certification remains pending.
- S3-compatible storage is provisioned in Docker but unused by application code.

## Monorepo Boundaries

- `apps/saas` owns authenticated product surfaces and SaaS API endpoints.
- `apps/marketing` owns public acquisition pages.
- `apps/worker` owns the background worker process.
- `packages/shared` owns framework-agnostic types, RBAC, plan limits, event names, and validation contracts.
- `packages/queue` owns queue names, job contracts, deterministic job ids, and BullMQ connection/producer helpers shared by the SaaS app and the worker.
- `packages/gsc` owns the framework-agnostic Google Search Console client: OAuth token exchange/refresh, Search Analytics queries, property matching, token encryption, and date-range helpers.
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

Heavy work must not run inside a single HTTP request. SaaS uses Redis-backed BullMQ queues processed by the `apps/worker` process; WordPress uses Action Scheduler. Every job is idempotent (deterministic job ids), retryable (bounded exponential backoff), and tenant-scoped jobs must carry organization/site context validated before the handler runs. Failed jobs remain in the BullMQ failed set for inspection until a dedicated dead-letter flow ships.

## Safety Model

The system may recommend SEO changes, prepare previews, and queue dry runs. It must not mutate risky WordPress SEO state without an explicit confirmed operation with audit logging and rollback support.
