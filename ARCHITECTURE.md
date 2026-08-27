# Architecture

## System Components

- SaaS application: Next.js, TypeScript, React, Tailwind CSS, API routes/server actions, Auth.js-compatible authentication, PostgreSQL, Redis-backed rate limits and queues, BullMQ workers, S3-compatible storage (planned), Stripe billing.
- WordPress plugin: PHP 8.1+, PSR-4 autoloading, WP REST API, Action Scheduler for background work, nonce/capability checks, sanitized inputs, escaped outputs.
- Marketing site: public Next.js app with SEO metadata, lead/demo/trial forms, product content, status and legal pages.
- Workers: BullMQ worker process foundation with heartbeat, handler registry, graceful shutdown, scheduled Google Search Console sync, recurring workspace deliverables, and safe bulk operation execution.

## Current Implementation Status

The core MVP architecture is implemented, while production cutover and some post-launch/enterprise capabilities remain. As of Iteration 112 the codebase stands as follows:

- A worker foundation exists: `apps/worker` runs BullMQ workers on the `sccc-maintenance`, `sccc-gsc-sync`, `sccc-bulk-operations`, and `sccc-deliverables` queues when configured, with a Redis heartbeat, a job handler registry, tenant payload validation helpers, and graceful shutdown. The deliverables scheduler runs Monday at 08:00 UTC, fans out deterministic prior-week organization jobs, and persists idempotent delivery runs. The `sccc-plugin-sync` queue name remains reserved.
- Rate limits use Redis-backed fixed windows when `REDIS_URL` is configured and fall back to process-local in-memory windows otherwise (or when Redis is unavailable).
- Audits complete synchronously inside the HTTP request from already-synced metadata; no crawling or queued audit jobs exist.
- Google Search Console metric and insight syncs run on a daily repeatable worker schedule for every active connection, and can still be triggered manually from the dashboard. The shared Google API client lives in `packages/gsc`.
- Safe content operations now have state capture, executable SEO title/meta description payload generation plus self-canonical and individual noindex/nofollow removal repairs from synced content evidence, queue execution, a signed WordPress apply endpoint, worker result persistence, worker-backed rollback restore for completed items with captured previous SEO values, and queue-backed retry for failed execution or rollback items.
- Observability is env-gated and dependency-free: Sentry error reporting (`SENTRY_DSN`) covers SaaS unhandled request errors via `instrumentation.ts` and worker job failures, PostHog server analytics (`POSTHOG_KEY`) captures tenant-scoped events from the shared taxonomy, and the worker exposes `GET /healthz` with BullMQ queue counts and oldest-waiting lag when `SCCC_WORKER_HEALTH_PORT` is set. Telemetry payloads carry explicit fields only and never include secrets.
- SaaS account security includes opt-in TOTP two-factor authentication with encrypted secrets, pending enrollment state, login enforcement before session issuance, and replay protection through the last accepted TOTP counter.
- The marketing app now owns the public home, features, product, integrations, agency/editorial/publisher solutions, knowledge base, SEO briefings, changelog, contact, service information, pricing, security, demo, trial, and legal routes, plus route metadata, sitemap/robots discovery, a webhook-delivered demo lead flow, and a trial handoff to SaaS registration. Public pricing imports plan limits from `@sccc/shared` so marketing and application gates share one contract. The homepage has received Vercel-inspired monochrome redesign, mega-menu navigation, and launch-readiness viewport/overflow passes.
- The WordPress plugin now has a version-verified, runtime-only release archive build. CI runs its package smoke test, uploads the versioned zip as an installation-test artifact, and runs Docker-based certification across current/previous WordPress images and PHP 8.1/8.2/8.3. `npm run plugin:release:certify` is the final local artifact gate, emitting checksum/size metadata and running the matrix against the exact zip; public release still requires recording the real staging SaaS challenge exchange, paginated sync, and Action Scheduler evidence in `docs/FINAL_PLUGIN_RELEASE_CERTIFICATION.md`.
- Production deployment descriptors now exist for a portable first-server path: one shared multi-target `Dockerfile`, `docker-compose.production.example.yml` for SaaS/marketing/worker/migrations plus local Postgres/Redis, `.env.production.example`, `npm run deploy:env:check`, `docs/PRODUCTION_ENV.md`, `npm run deploy:smoke`, `npm run deploy:server:smoke`, and `docs/SERVER_SMOKE_ROLLBACK.md`. A platform-specific deployment can still replace this with managed services or provider-native configuration.
- Staging release rehearsal is codified as `npm run deploy:staging:rehearse` plus `docs/STAGING_REHEARSAL.md`, covering automated staging env/package/smoke preflight and manual evidence capture for plugin challenge exchange, paginated sync, GSC OAuth/sync, demo webhook, Stripe webhook, and safe-operation worker execution.
- S3-compatible storage is provisioned in Docker but unused by application code.
- A URL monitoring and change-timeline module has been added alongside the existing content-audit/backlog engine (a separate, complementary capability, not a replacement): users can add monitored URLs per site (capped at `SCCC_MAX_MONITORED_URLS_PER_SITE`, default 10), each addition enqueues an SSRF-guarded crawl on the `sccc-monitoring` queue (`packages/monitoring` owns the crawler, HTML signal extraction, and pure snapshot-diff logic; `apps/worker/src/monitoring` owns the job handler), and every crawl beyond the first baseline is diffed against the prior snapshot into normalized `Event` rows (title/H1/meta description/canonical/robots/X-Robots-Tag changes, HTTP status transitions including 200→404, GA4/GTM disappearance, structured-data removal, content changes, response-time degradation). The Monitoring nav view surfaces monitored URLs plus a chronological site timeline.
- A deterministic regression-correlation engine now runs inline at the end of the same monitoring worker job, immediately after new events are persisted: `packages/monitoring`'s rule-based `detectRegressions` correlates the newly detected events (noindex, HTTP 200→404, GA4/GTM loss, and canonical changes) against a `computeTrafficSignal` read from the site's existing Search Console daily metrics (7-day window-over-window click comparison). A match creates a `Regression` row (deduplicated by a stable fingerprint so job retries stay idempotent), links the contributing `Event` rows through `RegressionEvent`, writes an in-app `Notification`, and — for `CRITICAL` regressions — sends an email alert through the existing `deliverWorkspaceAlert` path gated by the `trafficDropAlerts` delivery preference. Regression summaries always hedge with "possible cause," never confirmed causation. Open regressions surface in the Monitoring nav view above the timeline.
- Monitored URLs are rescanned automatically, not only on manual add/rescan: a repeatable BullMQ job (`monitoring.schedule-scan`, cron `0 */6 * * *`, mirroring the existing GSC/deliverables schedule-job pattern) fans out one `monitoring.create-snapshot` job per active monitored URL whose latest snapshot is older than the rescan interval (or that has none yet), with a time-bucketed deterministic job id so re-running the scheduler within the same window deduplicates instead of stacking up scans.
- The WordPress plugin now reports its own lifecycle changes — plugin installed/activated/deactivated/updated/deleted, theme activated/updated, and WordPress core updated — as `Event` rows with `source: "WORDPRESS"` on the same unified timeline as crawler-detected changes. `SystemEventReporter` (`wordpress-plugin/includes/SystemEventReporter.php`) hooks the relevant WordPress core actions (`activated_plugin`, `deactivated_plugin`, `deleted_plugin`, `switch_theme`, `upgrader_process_complete`, `_core_updated_successfully`), keeps its own persisted version baseline (seeded once on `init` so the first observed change has a real "old value" to diff against — the same baseline-then-diff pattern used for monitored URLs) so a plugin/theme update is only reported when the version actually changed, and delivers each event asynchronously (Action Scheduler, WP-Cron fallback) over the same signed-request channel as content sync, to a new `POST /api/plugin/system-events` endpoint.
- The regression engine's rule 4 (brief section 15: "plugin/theme update followed shortly by a regression") is now implemented: whenever the monitoring worker job detects a new regression-worthy crawler event (canonical/robots/noindex/HTTP-status/GA4/GTM), it also looks back `wordPressChangeLookbackDays` (3 days, matching the brief's own example window) for the most recent preceding `source: WORDPRESS` event on the same site and, if one exists, links both events into one `Possible SEO regression` with the WordPress change named in the summary.
- Every regression rule the brief specifies (noindex, HTTP 200→404, GA4/GTM loss, canonical+traffic decline, and the WordPress-change correlation above) is implemented, and a member with `monitoring:manage` can move a regression through its full lifecycle (`OPEN` → `ACKNOWLEDGED`/`RESOLVED`/`DISMISSED`, and back) from the Monitoring nav view or `PATCH /api/organizations/:organizationId/sites/:siteId/regressions/:regressionId`. The Monitoring nav view's Regressions panel defaults to `OPEN` but includes a status filter (a `regressionStatus` query param, same GET-form pattern as the Backlog status filter) so acknowledged, resolved, and dismissed regressions remain visible as a simple history rather than disappearing once actioned. Correlation for rule 1 (canonical change vs. traffic decline) now compares the monitored URL's own Search Console page-level insights (current vs. 7 days earlier, matched by a protocol/`www.`/trailing-slash-insensitive URL comparison — `normalizeUrl` in `packages/monitoring/src/url-matching.ts`) rather than the whole site's aggregate metrics, whenever a matching page-level history exists; it falls back to the site-wide daily-metrics signal only when no page-level baseline is available yet (e.g. right after connecting Search Console, before the daily insight sync has accumulated a week of history). `TrafficSignal.scope` (`"page"` or `"site"`) records which one produced a given regression's evidence, and the regression summary text says so explicitly.
- The primary Overview dashboard (`DashboardCommandCenter`) now surfaces monitoring state instead of requiring a separate visit to the Monitoring nav view: a "Regressions" row sits second in the priority queue (right after the WordPress connection row), toned danger/attention/success by whether any open regression is `CRITICAL`, and the "Site signals" sidebar lists "Monitored URLs" and "Open regressions" counts alongside the existing WordPress/Search Console/content signals. The open-regression count shown here always reflects `OPEN` regardless of whatever status filter the Monitoring view itself is currently showing. This closes the brief's full end-to-end MVP success-criteria scenario (add a monitored URL → detect a change → correlate it with a traffic/WordPress signal → surface it as a regression → act on it from the dashboard) as code-complete.

## Monorepo Boundaries

- `apps/saas` owns authenticated product surfaces and SaaS API endpoints.
- `apps/marketing` owns public acquisition pages.
- `apps/worker` owns the background worker process.
- `packages/shared` owns framework-agnostic types, RBAC, plan limits, event names, and validation contracts.
- `packages/queue` owns queue names, job contracts, deterministic job ids, and BullMQ connection/producer helpers shared by the SaaS app and the worker.
- `packages/gsc` owns the framework-agnostic Google Search Console client: OAuth token exchange/refresh, Search Analytics queries, property matching, token encryption, and date-range helpers.
- `packages/monitoring` owns the framework-agnostic URL monitoring toolkit: the SSRF guard, the HTTP crawler, HTML signal extraction, and the pure snapshot-diff-to-events logic. It has no dependency on Prisma or BullMQ so it can be unit-tested and reused from both the worker and (if ever needed) the SaaS app directly.
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
