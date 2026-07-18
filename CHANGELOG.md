# Changelog

## 0.1.0 - Foundation Iterations

### Iteration 111

- Added `npm run deploy:server:smoke` / `scripts/smoke-server-release.sh` to run the production server smoke gate across env validation, database migration status, Redis `PING`, WordPress plugin archive verification, HTTP SaaS/marketing/worker checks, and an explicitly enabled disposable backup restore drill.
- Added `scripts/check-redis-url.mjs` for dependency-free Redis/Redis TLS smoke checks without requiring `redis-cli` on the server.
- Added `docs/SERVER_SMOKE_ROLLBACK.md` with the production smoke checklist, backup/restore drill procedure, app/worker/plugin/database/Redis rollback paths, and the post-deploy monitoring watch window.

### Iteration 110

- Added `npm run deploy:staging:rehearse` / `scripts/rehearse-staging-release.sh` to orchestrate the staging release preflight: real staging env validation, WordPress plugin package build, staging SaaS/marketing smoke checks, and optional private worker health smoke.
- Added `docs/STAGING_REHEARSAL.md` as the evidence runbook for the real staging flow: plugin challenge exchange, paginated sync over multiple batches, GSC OAuth/sync, marketing demo webhook, Stripe webhook idempotency, and safe-operation dry-run/confirm/worker execution plus rollback/retry visibility.
- Updated deployment, QA, README, and handoff documentation so staging rehearsal is the required launch gate before server smoke, final plugin certification, and production cutover.

### Iteration 109

- Added `npm run deploy:env:check` with a dependency-free production/staging environment verifier for public origins, PostgreSQL/Redis URLs, Prisma persistence, launch-critical secrets, SMTP delivery, Stripe checkout/webhooks, Google Search Console OAuth, observability, worker health, optional AI, and backup-restore smoke readiness.
- Added `docs/PRODUCTION_ENV.md` as the release-ready environment and secrets matrix, including ownership, required values, rotation notes, and staging/production verification commands.
- Updated `.env.production.example` and deployment documentation so the env gate runs before Docker builds or staging rehearsals, while the committed template stays checkable through `--allow-placeholders`.

### Iteration 108

- Added portable production Docker packaging with multi-target images for the SaaS app, marketing app, worker process, and Prisma migration runner.
- Added `docker-compose.production.example.yml` plus `.env.production.example` for a single-server deployment with private-loopback web/worker ports, local Postgres/Redis volumes, least-privilege service env mappings, health checks, and build-time public URL args.
- Hardened the Docker build context and base image by excluding nested build/dependency artifacts and installing CA certificates/OpenSSL for Prisma engine compatibility.
- Added `npm run deploy:smoke` / `scripts/smoke-production.sh` to verify SaaS health, key marketing routes, and worker `/healthz` after deployment.
- Documented the Docker Compose deployment flow, production URL build-time requirement, server smoke checks, and the remaining release queue after deployment packaging.

### Iteration 107

- Added a root Prettier ignore policy for generated Impeccable skill bundles and live-session artifacts so the repository-wide format gate checks source files instead of vendored/generated design tooling output.
- Synchronized continuation and architecture documentation from the stale Iteration 103 handoff state to the current Iteration 107 release-hygiene state.
- Reframed the next work queue around production deployment packaging, environment/secrets readiness, staging end-to-end certification, server smoke checks, final plugin release certification, and launch cutover.

### Iteration 106

- Completed a launch-readiness audit pass on the public homepage across desktop, tablet, mobile, and 320px narrow mobile viewports.
- Unified the homepage visual rhythm by lightening workflow and audience sections, tightening hero spacing, preserving the dark trust/CTA moments, and making the proof strip, footer, and product preview more compact on mobile.
- Fixed homepage product-preview internal overflow, added an SVG app icon to stop the `/favicon.ico` launch smoke 404, and verified the page has no document-level or internal overflow at audited breakpoints.

### Iteration 105

- Reworked the public marketing header into a compact command-style navigation with quick desktop links, a modern burger-triggered mega-menu, and grouped Platform, Solutions, and Resources paths.
- Added responsive mobile menu grouping, bounded panel scrolling, burger state motion, hover reveals, and reduced-motion coverage while preserving the existing login, demo, trial, and public route contracts.
- Lightened the closed header state by removing the boxed header shell, quick-nav pill, extra borders, and redundant icon chrome while keeping the mega-menu presentation intact.

### Iteration 104

- Rebuilt the public marketing presentation layer in a Vercel-inspired monochrome direction: compact glassy header, pill navigation, restrained buttons, sharper product preview framing, technical grid hero, and high-contrast safety section.
- Reworked the homepage copy and section hierarchy around a concise evidence-to-approval story while preserving the existing routes, demo/trial links, review-first claims, and real `ProductPreview` component.
- Added subtle CSS entrance animations, grid backgrounds, border-based visual rhythm, reduced-motion safeguards, and responsive homepage overrides for desktop, tablet, and mobile.
- Updated public marketing QA expectations for the new minimal design pass and added the Next.js smooth-scroll layout attribute.

### Iteration 103

- Rebuilt the marketing homepage as a three-section product narrative: an immersive backlog hero, an evidence-to-work workflow, and a team plus review-first safety section.
- Reused the real `ProductPreview`, existing solution routes, and current demo/trial contracts instead of introducing decorative shaders, stock media, or a parallel frontend stack.
- Refined the shared marketing header into a compact bordered surface and reordered navigation around Product, Features, Integrations, Pricing, and Resources.
- Added isolated responsive homepage styles and verified exact desktop/mobile viewports with zero document-level horizontal overflow and no hero trust-note/dashboard overlap.

### Iteration 102

- Added Docker-based staging certification for the packaged WordPress plugin zip: `npm run plugin:certify` boots a disposable MariaDB + WordPress container pair, installs the built archive with wp-cli, and runs the full lifecycle checks.
- Certification covers activation, the installed-version contract against `VERSION`, REST route registration, connection storage seeded the way a completed challenge exchange writes it, recurring sync scheduling through the WP-Cron fallback, a signed safe-operation apply that writes bounded SEO title/canonical/robots meta, tampered-signature rejection, deactivation cron cleanup, and clean deletion.
- Added `npm run plugin:certify:matrix`, which builds the zip once and certifies latest WordPress on PHP 8.1, 8.2, and 8.3 plus the previous WordPress branch (`wordpress:6.8-php8.2-apache`); the full matrix passed locally against WordPress 7.0.1 (PHP 8.2/8.3), WordPress 6.9 (PHP 8.1), and WordPress 6.8.3 (PHP 8.2).
- Added a `plugin-certification` CI job running the same per-combination certification on every push and pull request.
- Kept the certification helper (`wordpress-plugin/certification/`) out of the release archive and extended the package verifier to reject it.
- Documented the certification workflow and the remaining manual pre-release steps: one real challenge exchange against a staging SaaS, a paginated sync, and one run with Action Scheduler installed.

### Iteration 101

- Added public Product and Integrations routes explaining the bounded WordPress and Google Search Console workflow from evidence through review-first execution.
- Added dedicated public solution pages for SEO agencies, content/editorial teams, and publishers using a shared responsive component with the existing demo and trial CTAs.
- Added Knowledge Base, SEO briefings, Changelog, Contact, and transparent service-information routes, with contact intentionally reusing the existing validated demo flow.
- Expanded marketing navigation, footer, metadata sitemap, and responsive layout coverage; the sitemap now has a regression test for every new public route.
- Kept the service-information page explicit that it is not a live public monitor or uptime commitment, and documented the public-content completion across the roadmap, deployment, QA, architecture, and landing plan.

### Iteration 100

- Extended executable SaaS safe-operation previews from title/meta description to reviewed canonical mismatch and robots noindex/nofollow tasks.
- Constrained canonical repairs to the current synced item URL, and constrained robots repairs to clearing only the enabled directive named by the review task on published content.
- Added nofollow synced-content health signals and backlog candidates, plus stale-state safeguards that keep already-correct, non-published, unsupported, or incomplete evidence preview-only.
- Added SaaS preview, worker signed-payload, and WordPress plugin smoke coverage for the bounded canonical and robots fields.
- Updated API, security, roadmap, QA, plugin, architecture, and continuation documentation for the expanded review-first payload contract.

### Iteration 99

- Added a synchronized WordPress plugin version contract across `wordpress-plugin/VERSION`, the plugin header, `readme.txt` stable tag, and Composer release metadata, with a fail-fast verifier.
- Added a WordPress-compatible `readme.txt` covering installation, connection setup, sync boundaries, review-first operations, deactivation behavior, and the initial 0.1.0 changelog.
- Added `npm run plugin:package` and `composer run package --working-dir=wordpress-plugin` to build `dist/seo-content-control-center-<version>.zip` with one plugin-root directory and runtime files only.
- Added archive validation that checks integrity, required files, versioned filename, single top-level directory, and the exclusion of tests, development dependencies, Composer lockfiles, and coding-standard configuration.
- Added package smoke coverage to `npm test`, CI packaging, and an uploaded `seo-content-control-center-plugin` workflow artifact.

### Iteration 98

- Rebuilt the public marketing home page around the implemented WordPress, Search Console, audit, backlog, assistant, billing, and review-first operation workflows, with a responsive product backlog preview and audience-specific use cases.
- Added dedicated `/features`, `/pricing`, and `/security` pages with route-specific metadata; public pricing reads site, URL, user, AI-credit, and API limits from the shared billing contract.
- Added `/demo` with server-side validation, honeypot filtering, a bounded per-client rate limit, explicit delivery failures, and optional Bearer-authenticated webhook delivery through `SCCC_MARKETING_LEAD_WEBHOOK_URL`.
- Added `/trial` with a direct handoff to the SaaS registration route and safe email prefill on the account form.
- Added Privacy, Terms, and Cookie pages plus `robots.txt`, `sitemap.xml`, canonical metadata, Open Graph metadata, responsive navigation, and a shared public footer.
- Added focused demo-lead validation tests and documented production marketing URL, SaaS URL, and lead webhook configuration.

### Iteration 97

- Added opt-in TOTP two-factor authentication for SaaS users, with encrypted pending and active secrets, replay protection through the last accepted TOTP counter, and no session cookie issuance until the second factor is verified.
- Added dashboard security controls for starting authenticator enrollment, confirming setup, and disabling 2FA with a current authenticator code.
- Extended login server actions and the JSON login API to return explicit `TWO_FACTOR_REQUIRED` and `INVALID_TWO_FACTOR_CODE` errors.
- Added dependency scanning (`npm audit --audit-level=low`) and CodeQL JavaScript/TypeScript SAST to CI.
- Added a disposable database backup/restore smoke script (`npm run verify:backup-restore`) for quarterly restore testing.
- Updated security, API, deployment, QA, data model, roadmap, and README documentation for the hardening pack.

### Iteration 96

- Added env-gated, dependency-free observability shared by the SaaS app and the worker: a Sentry envelope reporter (`SENTRY_DSN`, optional `SENTRY_ENVIRONMENT`) and a PostHog server analytics client (`POSTHOG_KEY`, optional `POSTHOG_HOST`) in `@sccc/shared`, both failing open and validating against the shared event taxonomy.
- Added SaaS `instrumentation.ts` that logs observability status at startup and reports unhandled request errors to Sentry with route metadata only (no bodies, headers, cookies, or query strings).
- Added tenant-scoped server analytics captures: `organization_created`, `site_added`, `plugin_connected`, `GSC_connected`, `bulk_operation_started`, and `AI_feature_used` from the SaaS layer, plus `bulk_operation_completed` from the worker when a bulk execution job finishes.
- Added Sentry reporting for worker job failures with queue/job context and startup warnings when Sentry or analytics are unconfigured.
- Added a read-only worker health endpoint on `SCCC_WORKER_HEALTH_PORT`: `GET /healthz` returns worker uptime, processed/failed counters, and per-queue BullMQ job counts with oldest-waiting lag; snapshot failures return 503 and the server closes gracefully on shutdown.
- Kept telemetry payloads secret-free by contract: explicit fields only, with prompts, tokens, and environment values never sent, and transport failures logged without secrets.
- Added unit tests for DSN parsing, envelope building, reporter/analytics fail-open behavior, event validation, queue lag math, health snapshot building, port parsing, and the health server's 200/404/503 responses.

### Iteration 95

- Added an optional real AI provider for the assistant behind environment configuration: `SCCC_AI_PROVIDER=anthropic`, `SCCC_AI_API_KEY`, and optional `SCCC_AI_MODEL` (default `claude-opus-4-8`) using the official Anthropic SDK.
- Added an `aiSummary` field to assistant recommendation responses: a bounded plain-text summary of the top deterministic recommendations with provider/model attribution, shown on the dashboard assistant panel.
- Added real AI-credit metering: each successful AI summary persists one `ai_credits` usage metric and returns `usage.metered: true`; deterministic responses stay unmetered and free.
- Added plan-limit enforcement: exhausted monthly AI credits block the provider call before it happens, keep the response deterministic, and create a `billing.limit.ai_credits_reached` notification deduplicated per usage period.
- Added a deterministic fallback for provider failures: the response degrades to `aiSummary: null` without consuming a credit, logging only the error message.
- Built AI prompts from recommendation display fields only, with no credentials, tokens, or tenant secrets, and never persisted or logged prompts or the API key.
- Kept the dev store deterministic-only (`aiSummary: null`) because AI credits cannot be metered without persistent usage storage; documented the Prisma-backed requirement.
- Added unit tests for provider configuration parsing, prompt bounding and content, summary generation with an injected completer (trim/empty/oversize/failure paths), metered usage envelopes, and the AI-credit limit notification.

### Iteration 94

- Added read-only assistant recommendations sourced from persisted Google Search Console evidence without calling Google or an external AI provider.
- Added `gsc_traffic_loss` recommendations from page-level click drops between the latest insight snapshot and the snapshot from 7 days earlier, with `high` priority at a 50% drop or more (matching detection severity) and click metrics in the source detail.
- Added `gsc_opportunity` recommendations that reuse the CTR-opportunity and striking-distance candidate copy for content-matched entries and keep unmatched pages visible with sync-first next steps.
- Kept safe-preview controls enabled only for backlog-sourced recommendations; GSC-sourced recommendations always return disabled controls with a backlog-conversion or plugin-sync reason.
- Extended assistant sorting so equal-priority recommendations rank backlog tasks, synced content, traffic loss, and opportunities in that order.
- Reused the latest-snapshot loader plus content URL matching in the Prisma repository and mirrored the pipeline in the dev store, which now serves unmatched GSC recommendations from seeded insights.
- Added builder unit tests for priorities, source details, disabled controls, unmatched fallbacks, and source ordering, plus dev-store tests for seeded-insight recommendations and backlog-first sorting.

### Iteration 93

- Added deterministic Search Console opportunity detection from the latest persisted page/query insight snapshot without inline Google calls.
- Added the `ctr-opportunity` detector for pages with at least 200 impressions ranking at weighted position 10 or better whose CTR falls below half of a deterministic position CTR benchmark, and the `striking-distance` detector for pages with at least 100 impressions at weighted positions 5 through 15 inclusive.
- Added per-page aggregation across queries before thresholds apply, per-type bounds of 10 entries, and impressions-descending ordering; a page can surface both opportunity types.
- Added a read-only `GET /gsc/opportunities` endpoint scoped by organization/site with optional property filtering, returning matched synced content summaries and convertible `candidateId` values.
- Extended the existing backlog candidate conversion so `<contentItemId>:gsc-<type>` candidate ids revalidate against the latest insight snapshot and persist tasks with `gsc.ctr-opportunity`/`gsc.striking-distance` issue types, `["gsc", "<type>"]` tags, and the established URL plus issue-type dedup.
- Added a dashboard Search opportunities panel with per-entry metrics, benchmark CTR, matched content, and one-click Create task for matched pages.
- Shared the page insight aggregation helper between traffic loss and opportunity detection, and reused one latest-snapshot loader for traffic-loss audit issues and opportunity candidate revalidation in the Prisma repository.
- Added unit tests for the CTR benchmark table, both detector thresholds and boundaries, per-page aggregation, per-type bounds and ordering, content matching, candidate id format, and matched-only candidate generation.

### Iteration 92

- Added materialization of matched Search Console traffic loss drops as `gsc.traffic-loss` audit issues during metadata audit runs.
- Added deterministic traffic-loss issue generation: only drops matched to synced WordPress content become issues, severity follows the detection drop ratio (`HIGH` at a 50% click drop or more, otherwise `MEDIUM`), and multiple page URLs matching the same content item collapse into one issue keeping the biggest click loss.
- Added `gsc:traffic-loss:<externalId>` issue fingerprints so repeat audit runs update the existing issue through the established organization/site/fingerprint deduplication instead of duplicating it, preserving triaged status.
- Added issue evidence with the comparison ranges, current/baseline clicks, click delta, drop ratio, current/baseline positions, and property URL.
- Reused the traffic-loss endpoint snapshot selection in the Prisma audit path (latest insight snapshot vs the snapshot from 7 days earlier) without inline Google calls, and mirrored the pipeline plus a fingerprint upsert helper in the dev store.
- Kept backlog conversion untouched: `gsc.traffic-loss` issues convert to backlog tasks through the existing single and bulk issue mechanisms.
- Added unit tests for severity mapping, evidence and fingerprint shape, matched-only materialization, same-content dedup, missing-range guards, and dev-store fingerprint upsert semantics across repeated audit runs.

### Iteration 91

- Added normalized URL matching between Search Console traffic loss pages and synced WordPress content items.
- Normalization ignores protocol, a leading `www.` host prefix, trailing slashes, query strings, and fragments while keeping paths distinct; invalid and non-HTTP URLs never match.
- Added deterministic collision handling for synced items that normalize to the same URL (first by external id order wins).
- Added a scoped `listSyncedContentUrlsForSite` repository method returning bounded id/external id/url/title entries in both the Prisma repository and the dev store.
- Enriched traffic loss API drops with a `content` summary (`contentItemId`, `externalId`, `title`, or `null` when the page is not in the synced inventory) and added a Content column to the dashboard traffic loss table.
- Added unit tests for URL normalization, index collisions, bounded match summaries, and drop enrichment.

### Iteration 90

- Added deterministic Google Search Console traffic loss detection from persisted data without inline Google calls.
- Added site-level detection comparing the latest 14-day daily-metric window against the previous 14 days with `medium` (>= 25% click drop) and `high` (>= 50%) severities gated by a 50-click previous-window volume floor.
- Added page-level detection joining the latest page/query insight snapshot with the snapshot from 7 days earlier, aggregating rows per page and returning the top pages losing clicks against a bounded baseline.
- Added graceful `available: false` responses with human-readable reasons while metric history or baseline snapshots are still accumulating.
- Added a read-only `GET /gsc/traffic-loss` endpoint scoped by organization/site with optional property filtering.
- Added a dashboard traffic loss panel with the window comparison summary, severity, and top dropping pages table.
- Added focused unit tests for window math, severity thresholds, volume floors, page aggregation, missing-history reasons, and date shifting.

### Iteration 89

- Added derived bulk operation item status summaries to SaaS responses so partial execution and rollback outcomes are visible without re-counting items client-side.
- Exposed `retryMode` on bulk operation responses for failed operations and active retry/rollback restore work.
- Updated the dashboard recent previews panel to show per-status item counts and whether retry will execute failed items or restore failed rollback items.
- Kept Prisma and dev-store behavior aligned by deriving retry mode from operation activity logs and item statuses.
- Added regression coverage for retry summary visibility and documented the response contract updates.

### Iteration 88

- Made failed bulk operation retry queue-aware for both execution retries and rollback restore retries.
- Prisma-backed retry now detects prior rollback attempts from operation activity, resets only failed items to `RUNNING`, and enqueues either `bulk-operation.execute` or `bulk-operation.rollback`.
- Preserved captured rollback `beforeValue` on failed rollback result persistence so retry can still restore the original SEO metadata.
- Added retry metadata (`retryMode`, `noMutation: false`) to activity logs and kept retry notifications scoped to the existing lifecycle event.
- Added SaaS tests for retry metadata and queue producer fallback coverage for execution and rollback jobs without Redis.
- Updated API, roadmap, QA, and README documentation to reflect queue-backed retry behavior.

### Iteration 87

- Added queued rollback restore for completed safe operation items through the existing signed WordPress plugin apply endpoint.
- Added a `bulk-operation.rollback` job payload contract, SaaS rollback queue producer, and worker handler on the `sccc-bulk-operations` queue.
- Changed Prisma-backed rollback requests to start rollback work instead of immediately marking operations `ROLLED_BACK`; final `ROLLED_BACK` is recorded only after worker/plugin restore succeeds.
- Restored previous SEO metadata from stored item `beforeValue` and kept non-restorable items failing locally without calling WordPress.
- Added worker persistence for rollback results, activity logs, and rollback/failure notifications.
- Added tests for rollback job schema validation, signed rollback apply payloads, and local rollback validation failures.

### Iteration 86

- Added executable safe-operation preview payload generation for synced-content backed missing SEO title and missing meta description backlog tasks.
- Limited executable payloads to scoped synced content targets with valid `post_type:id` external IDs and Yoast or Rank Math SEO metadata evidence.
- Kept unsupported issue types, missing synced content, fallback SEO metadata, invalid targets, and stale already-present metadata as explicit preview-only/no-mutation operations.
- Updated dry-run metadata and dashboard copy so executable previews report deferred WordPress writes while still requiring confirmation and worker execution.
- Added focused tests for executable Yoast title payloads, executable Rank Math meta description payloads, preview-only fallback reasons, and executable dry-run checks.
- Documented that Phase 6 now has executable SEO title/meta description payload creation; true rollback restore on WordPress remains pending.

### Iteration 85

- Added bulk operation execution jobs on the `sccc-bulk-operations` queue with a strict `organizationId`, `siteId`, and `operationId` payload contract.
- Added a worker execution handler for `bulk-operation.execute` that loads scoped `RUNNING` operations, validates executable SEO apply items, signs WordPress apply requests, and records per-item results back to the database.
- Added worker fail-fast behavior for preview-only/no-mutation items, unavailable WordPress connections, and missing encrypted plugin apply secrets so operations do not stay indefinitely `RUNNING`.
- Added live worker persistence for actual WordPress `beforeValue`/`afterValue` apply results, lifecycle activity logs, and completion/failure notifications.
- Added optional encrypted WordPress plugin token storage for new plugin connections when `SCCC_TOKEN_ENCRYPTION_KEY` is configured; existing hash-only connections must reconnect before worker apply can sign outbound plugin requests.
- Added a SaaS queue producer that enqueues bulk operation execution after `start` when `REDIS_URL` is configured, while preserving local/manual behavior when Redis is not configured.
- Shared the plugin HMAC signing helper through `@sccc/shared` so SaaS and worker signing stay aligned.
- Documented worker execution requirements and the remaining Phase 6 gaps: executable SEO payload creation and true rollback restore.

### Iteration 84

- Added a WordPress-hosted signed safe operation apply endpoint at `/wp-json/sccc/v1/operations/apply`.
- Reused the plugin HMAC signing scheme for SaaS-to-plugin apply requests with token, timestamp, signature, site header, and body scope validation.
- Limited apply batches to bounded Yoast/Rank Math SEO metadata fields only: SEO title, meta description, canonical URL, and robots noindex/nofollow directives.
- Added per-item apply results with before/after SEO values, partial batch failure handling, unsupported-field rejection, and strict `post_type:id` target validation.
- Extended WordPress plugin smoke tests with REST request/response stubs, signed apply success coverage, unsupported-field rejection, and invalid-signature rejection.
- Documented the apply endpoint contract and updated Phase 6 status to show that the plugin apply surface now exists while SaaS worker execution remains pending.
- Corrected the safe operation audit-log documentation to reflect the existing lifecycle activity logs in the repository and dev store.

### Iteration 83

- Added paginated WordPress plugin sync: the full posts/pages inventory now syncs in batches of 200 items instead of a single capped batch of 100.
- Switched inventory batch ordering to post ID ascending so pagination stays stable while content is edited during a sync run.
- Added offset cursors to every sync batch request (`"0"`, `"200"`, ...) using the existing contract field; the SaaS response already echoes the cursor.
- Added a 50-batch per-run safety bound (10,000 items) with idempotent continuation on the next run through `siteId + externalId` upserts.
- Kept permalink-less posts skipped inside batches without terminating pagination early by deriving `hasMore` from raw query row counts.
- Added plugin test stubs for `WP_Query`, `get_permalink`, and `wp_remote_post` plus smoke tests for batch collection, cursor bodies, paginated sync requests, and sync log totals.
- Documented the pagination behavior in the plugin API contract, roadmap, README, and QA checklist, removing the Iteration 79 known limitation.

### Iteration 82

- Added scheduled Google Search Console sync: the worker registers a repeatable `gsc.schedule-sync` job (daily at 06:00 UTC) that enqueues one daily-metrics job and one search-insights job per active connection on the `sccc-gsc-sync` queue.
- Added date-scoped deterministic job ids so re-running the scheduler on the same day deduplicates sync work across worker instances.
- Added worker GSC sync handlers that validate tenant payload scope, load connections through organization/site-scoped queries, refresh Google access tokens from encrypted refresh tokens, and persist metrics/insights with the same upsert/replace semantics as the manual dashboard sync.
- Added system activity log entries (`gsc.metrics_synced`, `gsc.insights_synced`) with a `scheduled_sync` trigger and no user id for worker-driven syncs.
- Extracted the framework-agnostic Google Search Console client into `packages/gsc` (OAuth token exchange/refresh, Search Analytics queries, property matching, token encryption, date-range helpers); the SaaS app re-exports it so existing imports and tests keep working.
- Gated worker GSC sync behind `DATABASE_URL`, `SCCC_TOKEN_ENCRYPTION_KEY`, and Google client credentials with a clear startup log when disabled.
- Documented scheduled sync behavior, deployment requirements, security boundaries, and QA coverage.

### Iteration 81

- Added the `apps/worker` background process: a BullMQ worker on the `sccc-maintenance` queue with configurable concurrency, structured JSON logging, and graceful `SIGINT`/`SIGTERM` shutdown.
- Added a Redis worker heartbeat written every 30 seconds with a 90-second TTL under `sccc:worker:heartbeat:<hostname>:<pid>` so monitoring can detect stalled or dead workers.
- Added a job handler registry with fail-fast behavior for duplicate registrations and unknown job names, plus a tenant-scope wrapper that validates organization/site payload context before handlers run.
- Added the `packages/queue` contract package with namespaced queue names, reserved job names for upcoming GSC sync and bulk operation execution, deterministic job id building, bounded retry defaults, and BullMQ connection/producer helpers.
- Added a validated `maintenance.ping` job handler as the end-to-end smoke path for the queue pipeline.
- Documented the worker deployment unit, heartbeat-based health checks, worker security boundaries, and QA coverage.
- Fixed a time-dependent audit issue generation test by threading an optional `referenceDate` through `buildAuditIssueInputsFromSyncedContent` instead of always reading the current clock.

### Iteration 80

- Added a Redis-backed fixed-window rate limit store that activates when `REDIS_URL` is configured and keeps counting across multiple SaaS instances.
- Kept the process-local in-memory store as an explicit fallback for missing Redis configuration, `SCCC_RATE_LIMIT_STORE=memory`, and Redis runtime failures so rate limiting degrades instead of blocking traffic.
- Added dedicated per-IP rate limit policies for WordPress plugin challenge creation, challenge exchange, sync, and disconnect endpoints, applied before signature verification.
- Added a per-IP rate limit policy for the Stripe billing webhook endpoint.
- Converted rate limit checks to async across auth, invite, member, safe content operation, and server action call sites.
- Added `ioredis` to the SaaS application and documented the new `SCCC_RATE_LIMIT_STORE` environment variable.
- Documented Redis-backed rate limiting and the new plugin/webhook limits across the API specification, security, deployment, plugin API, and QA documents.

### Iteration 79

- Reconciled roadmap and documentation with the implemented codebase after a full technical audit.
- Added missing Phase 5 backlog statuses to the roadmap for filters/search, assignment/status workflows, comments/change history, and CSV export.
- Marked the Phase 6 audit log item as not implemented for bulk operations and documented that safe content operation execution still performs no real WordPress writes pending a worker process and a plugin apply endpoint.
- Added the missing `EmailVerificationToken`, `PasswordResetToken`, `BillingWebhookEvent`, `GscDailyMetric`, and `GscSearchInsight` entities to the data model document.
- Marked Redis, BullMQ workers, and S3 storage as planned in the architecture document and added a current implementation status section covering process-local rate limits, synchronous audits, manual GSC sync, and the absence of a worker package.
- Documented launch-blocking security gaps: missing plugin API and webhook rate limits, process-local rate limit windows, and missing bulk operation activity log writes.
- Documented the WordPress plugin sync limitation of a single unpaginated batch of at most 100 posts/pages against the 250-item cursor-based contract.

### Iteration 78

- Added persisted Google Search Console page/query insight snapshots for synced date ranges.
- Added Search Analytics querying grouped by `page` and `query` with bounded top-row sync.
- Added tenant-scoped GSC insights API endpoints for listing stored insights and syncing the current connected property.
- Added dashboard insight sync control and top page/query table for connected GSC properties.
- Documented insight sync behavior, data model, security boundaries, and QA coverage.

### Iteration 77

- Added manual Google Search Console property selection for connected sites.
- Added a tenant-scoped `POST /gsc/properties` endpoint that validates selected properties against the connected Google account before switching the active property.
- Added a dashboard property picker that loads Google properties on demand instead of calling Google during every page render.
- Added service coverage for successful property selection and inaccessible property rejection.
- Documented property selection API behavior, security boundaries, and QA coverage.

### Iteration 76

- Added persisted Google Search Console daily metrics storage for site/property/date snapshots.
- Added Search Analytics daily query support grouped by `date` with clicks, impressions, CTR, and average position.
- Added tenant-scoped GSC metrics API endpoints for listing stored rows and syncing the current connected property.
- Added a dashboard sync control and recent daily metrics table for connected GSC properties.
- Documented metric sync behavior, data model, security boundaries, and QA coverage.

### Iteration 75

- Added Search Console property discovery through the Google Sites API.
- Automatically match the OAuth-connected account to an exact URL-prefix or `sc-domain:` property before storing the GSC connection.
- Added a tenant-scoped GSC properties API endpoint that refreshes access server-side and returns property metadata without tokens.
- Added internal repository access for encrypted GSC refresh tokens without exposing them in overview responses.
- Extended GSC OAuth tests for refresh token exchange, property listing, and property matching.

### Iteration 74

- Added Google Search Console OAuth start and callback routes with signed tenant/site state.
- Added Google OAuth code exchange, connected Google account email lookup, and scoped GSC connection upsert.
- Added AES-GCM recoverable secret encryption for refresh token storage.
- Enabled the dashboard GSC connect action only when OAuth, state signing, and token encryption are configured.
- Documented GSC OAuth routes, required environment variables, security guardrails, and QA coverage.

### Iteration 73

- Added a tenant-scoped Google Search Console connection overview for each site.
- Added a read-only GSC API endpoint that exposes property/account metadata without refresh tokens.
- Added OAuth configuration readiness guardrails and a disabled connect action until the callback flow is implemented.
- Surfaced GSC property state on the SaaS dashboard for the selected site.
- Documented GSC scope, security boundaries, and QA coverage for the first Search Console foundation slice.

### Iteration 72

- Added WordPress admin success/error notices for connection, manual sync, and disconnect redirects.
- Kept admin notices on a whitelisted status/error code map instead of echoing raw query values.
- Added success copy for connected, sync queued, and disconnected states.
- Added safe error copy for missing connection fields, failed connection exchange, and failed disconnect attempts.
- Extended plugin smoke coverage for admin notice mapping and error precedence.

### Iteration 71

- Added automatic recurring WordPress plugin sync scheduling after a site is connected.
- Prefer Action Scheduler recurring actions when available and fall back to hourly WP-Cron events.
- Unschedule recurring and pending manual plugin sync jobs when the site disconnects or the plugin deactivates.
- Display automatic sync scheduler status and next run time on the WordPress settings page.
- Extended plugin smoke coverage for recurring sync scheduling, deduplication, and cleanup.

### Iteration 70

- Added local Trial expiry handling that derives expired no-provider Trial subscriptions as `PAST_DUE`.
- Blocked gated workspace mutations after local Trial expiry with `BILLING_TRIAL_EXPIRED`.
- Updated billing feature gates to expose billing-specific disabled codes and Trial expiry disabled reasons.
- Updated billing UI copy to show Trial end/expiry dates instead of renewal text for local Trial subscriptions.
- Documented Trial expiry behavior, API responses, and QA coverage.

### Iteration 69

- Added local no-charge Trial subscription creation when a workspace is created.
- Set Trial subscriptions to `TRIALING` with a 14-day local trial period and no billing provider.
- Updated billing overview and checkout context to use the local Trial subscription instead of fallback-only trial state.
- Recorded `billing.trial_started` activity logs for newly created workspaces.
- Documented Trial subscription behavior, billing guardrails, and QA coverage.

### Iteration 68

- Added dedicated WordPress plugin API documentation for the connection challenge and exchange flow.
- Documented signed plugin sync and plugin-initiated disconnect request authentication.
- Documented plugin sync metadata bounds, supported fields, and no-post-body guardrails.
- Added plugin API error-code and operational notes for integrators.
- Linked the plugin API guide from the API spec, README, roadmap, and QA checklist.

### Iteration 67

- Added local WordPress link counting for synced content inventory without sending post bodies.
- Accepted and stored bounded internal/outbound link count metadata in plugin sync payloads.
- Added synced content health signals for internal and outbound link counts.
- Materialized missing internal links into backlog candidates and metadata audit issues.
- Displayed link count evidence in the SaaS content detail panel and documented the link-check scope.

### Iteration 66

- Added a computed SaaS onboarding checklist for the MVP setup path.
- Surfaced checklist progress on the main workspace page and lightweight dashboard page.
- Updated dashboard metrics to use real audit and backlog counts for the active site.
- Added focused checklist state coverage for empty, site-created, and complete onboarding paths.
- Documented onboarding checklist behavior and QA coverage.

### Iteration 65

- Added password reset token persistence with hashed one-time tokens and 1-hour expiry.
- Added browser and JSON password reset request flows with generic non-enumerating responses.
- Added password reset confirmation flow that updates the password, marks email verified, invalidates reset tokens, and deletes existing sessions.
- Added password reset email copy, token helper tests, and rate-limit coverage.
- Documented password reset API behavior, data model notes, security guardrails, and QA coverage.

### Iteration 64

- Added email verification token persistence with hashed one-time tokens and 24-hour expiry.
- Sent verification emails after browser and JSON registration flows using the existing email transport.
- Added `/auth/verify-email` to confirm tokens, mark users verified, and invalidate outstanding verification tokens.
- Added verification email copy and token helper tests.
- Documented email verification behavior, data model notes, security guardrails, and QA coverage.

### Iteration 63

- Added SaaS-side WordPress plugin disconnect support for scoped sites.
- Added a signed plugin disconnect endpoint so WordPress admin disconnects can invalidate SaaS tokens before clearing local credentials.
- Marked disconnected sites as `DISCONNECTED`, recorded `disconnectedAt`, incremented token versions, and invalidated unused connection challenges.
- Added a dashboard disconnect action for connected WordPress sites.
- Documented plugin disconnect API behavior, data model notes, security guardrails, and QA coverage.

### Iteration 62

- Added bulk backlog task creation from open audit issues for a scoped audit run.
- Kept audit-to-task bulk creation idempotent by reusing existing `auditIssueId`-linked tasks.
- Added dashboard and server action support for creating tasks from all open issues in the selected audit.
- Added API result counts for total issues, created tasks, and existing tasks.
- Documented the bulk audit-to-backlog API behavior, security guardrails, data model notes, and QA coverage.

### Iteration 61

- Added computed audit issue summary counts to audit run API responses.
- Included total, open, resolved, high, and critical issue counts for each listed metadata audit.
- Displayed audit issue summary counts directly in the SaaS audit run table.
- Kept summaries derived from scoped audit issues without adding persisted aggregate columns.
- Documented audit summary API behavior, data model notes, security guardrails, and QA coverage.

### Iteration 60

- Changed synced-metadata audit creation to complete the deterministic metadata audit pass immediately after issue materialization.
- Added `startedAt` and `completedAt` timestamps to created metadata audit runs.
- Recorded the completed audit status in activity log metadata alongside generated issue counts.
- Updated dashboard copy, API examples, roadmap, data model, security notes, and QA coverage for completed metadata audits.

### Iteration 59

- Added deterministic audit issue generation from synced content health signals when a site audit is queued.
- Materialized thin content, missing SEO title/meta description, noindex, and canonical mismatch signals as scoped `AuditIssue` records.
- Deduplicated generated synced-content audit issues with stable organization/site fingerprints.
- Completed in-memory audit issue listing, status updates, and audit-issue-to-backlog task creation for the fallback repository.
- Updated dashboard copy and documentation for synced-metadata audit issue materialization.

### Iteration 58

- Added bounded SEO metadata sync fields for detected source, SEO title, meta description, canonical URL, and robots noindex/nofollow directives.
- Extended the WordPress content collector to read Yoast and Rank Math metadata with a fallback WordPress title source.
- Displayed SEO metadata in the SaaS synced content detail panel.
- Added synced content health signals and backlog candidates for missing SEO titles, missing meta descriptions, noindex directives, and canonical mismatches.
- Documented the expanded sync contract, data model, security guardrails, and QA coverage.

### Iteration 57

- Extended WordPress plugin content inventory metadata with author, publish date, featured image, taxonomies, and word count signals without sending post bodies.
- Added `SyncedContentItem.metadata` storage and sync upsert persistence for bounded plugin metadata.
- Added shared validation for optional plugin sync metadata while rejecting unexpected secret-like fields.
- Displayed synced metadata in the SaaS content detail panel.
- Added word-count-based thin content health signals and backlog candidates.
- Documented the expanded sync contract, data model, security guardrails, and QA coverage.

### Iteration 56

- Added a bounded local WordPress plugin sync log store for queued, successful, and failed sync attempts.
- Recorded manual sync queueing, successful signed sync completion, and sanitized sync failures without storing tokens, signatures, or endpoint URLs.
- Added a sync log table to the WordPress plugin settings page so admins can inspect recent sync status and item counts.
- Extended PHP smoke coverage for sync log recording, redaction, and recent-entry bounds.
- Documented WordPress sync log behavior, security guardrails, and QA coverage.

### Iteration 55

- Added persistent Stripe billing webhook event tracking with unique provider event ids.
- Made billing webhook subscription reconciliation idempotent so replayed Stripe events are acknowledged without repeating local subscription mutations.
- Wrapped webhook event recording and subscription changes in one transaction to avoid partial local billing updates.
- Documented webhook replay protection, migration coverage, security guardrails, and QA coverage.

### Iteration 54

- Added a Stripe billing webhook endpoint with raw-body signature verification.
- Added subscription reconciliation for checkout completion and Stripe subscription lifecycle events.
- Mapped Stripe subscription status and plan metadata into local billing subscription state.
- Kept unsigned, stale, or unconfigured webhook requests from mutating local billing data.
- Documented webhook API behavior, security guardrails, and QA coverage.

### Iteration 53

- Added a tenant-scoped billing portal session endpoint for Stripe-backed subscriptions with stored provider customer ids.
- Added a server-side portal service with Stripe REST session creation and safe provider/customer configuration errors.
- Enabled dashboard billing portal controls only when provider credentials and subscription customer linkage are present.
- Kept local subscription state unchanged until webhook-backed subscription reconciliation is implemented.
- Documented portal API behavior, environment variables, security guardrails, and QA coverage.

### Iteration 52

- Added a tenant-scoped billing checkout session endpoint for eligible Stripe-backed plan upgrades.
- Added a server-side checkout service with Stripe REST session creation, plan metadata, and safe provider/price configuration errors.
- Enabled dashboard checkout buttons only when provider, secret, and target plan price IDs are configured.
- Kept local subscription state unchanged until webhook-backed subscription updates are implemented.
- Documented checkout API behavior, environment variables, security guardrails, and QA coverage.

### Iteration 51

- Added billing limit notifications when site or user usage reaches the current plan limit.
- Created tenant-scoped notifications after successful site creation or member invite fills a finite plan gate.
- Kept blocked plan-limit attempts quiet to avoid duplicate notification noise.
- Documented billing usage notification types, security guardrails, and QA coverage.

### Iteration 50

- Added billing feature gate summaries for site and user limits.
- Enforced plan site limits when creating sites.
- Enforced plan user limits when inviting members.
- Documented plan-limit API errors, security guardrails, and QA coverage.

### Iteration 49

- Added provider-gated billing action descriptors for checkout and billing portal controls.
- Added disabled dashboard controls for plan selection and billing portal access with explicit reasons.
- Kept billing actions no-mutation until a real provider session flow is connected.
- Documented billing action guardrails and QA coverage.

### Iteration 48

- Added a tenant-scoped read-only billing overview API endpoint.
- Added billing plan catalog and current plan summaries for Trial, Starter, Pro, Agency, and Enterprise.
- Added a dashboard billing panel with current plan, subscription status, prices, and plan limits.
- Documented billing read permissions and no-checkout/no-portal guardrails.

### Iteration 47

- Added assistant recommendation action descriptors for safe preview preparation.
- Added dashboard controls that prepare existing safe previews from backlog-sourced recommendations.
- Disabled unsupported assistant controls for synced-content recommendations until a backlog task exists.
- Documented assistant manual confirmation and disabled-control guardrails.

### Iteration 46

- Added assistant recommendation usage envelopes with current monthly AI-credit limits and usage.
- Connected assistant usage limits to plan `aiCredits` and existing `UsageMetric` records.
- Kept deterministic assistant recommendations unmetered, read-only, and free of external AI calls.
- Documented assistant usage API behavior, security guardrails, and QA coverage.

### Iteration 45

- Added read-only assistant recommendations for tenant-scoped sites.
- Added an assistant recommendations API endpoint and dashboard panel.
- Derived recommendations from backlog tasks and synced content health evidence without external AI calls.
- Documented recommendation-only behavior, source display, security guardrails, and QA coverage.

### Iteration 44

- Added bulk mark-read support for organization notifications.
- Added a tenant-scoped collection notification update API endpoint.
- Added a dashboard `Mark all read` notification action.
- Documented bulk notification read behavior, security guardrails, and QA coverage.

### Iteration 43

- Added read and unread filtering for organization notifications.
- Added a tenant-scoped notification read state API endpoint.
- Added dashboard controls to mark notifications read or unread.
- Documented notification read state behavior, security guardrails, and QA coverage.

### Iteration 42

- Added organization-scoped notifications for safe content operation lifecycle events.
- Added a tenant-scoped notifications API endpoint and dashboard notification panel.
- Created notifications when bulk operations complete, fail, roll back, or retry failed items.
- Documented notification API behavior, security guardrails, and QA coverage.

### Iteration 41

- Added dedicated rate limiting for safe content operation mutations.
- Applied bulk operation mutation limits to API routes and dashboard server actions.
- Scoped bulk operation rate limit keys by user, organization, site, action, and operation.
- Documented rate limit behavior, security guardrails, and QA coverage.

### Iteration 40

- Added retry state capture for failed bulk operation items.
- Added a tenant-scoped retry API endpoint and dashboard retry action.
- Transitioned failed operations back to `RUNNING` while resetting only failed items.
- Documented retry behavior, permissions, and QA coverage.

### Iteration 39

- Added rollback state capture for completed or failed bulk operations.
- Added a tenant-scoped rollback API endpoint and dashboard rollback action.
- Transitioned operations and items to `ROLLED_BACK` without inline WordPress writes.
- Documented rollback behavior, permissions, and QA coverage.

### Iteration 38

- Added execution result recording for running bulk operations.
- Added a tenant-scoped result API endpoint and dashboard complete/fail actions.
- Persisted per-item `COMPLETED`/`FAILED` results without inline WordPress writes.
- Documented result behavior, permissions, and QA coverage.

### Iteration 37

- Added a controlled start step for confirmed bulk operations.
- Added a tenant-scoped start API endpoint and dashboard action.
- Transitioned confirmed operations and items to `RUNNING` without WordPress writes.
- Documented start behavior, permissions, and QA coverage.

### Iteration 36

- Added explicit confirmation for dry-run-passed bulk operations.
- Added a tenant-scoped confirmation API endpoint and dashboard confirmation form.
- Required the literal `CONFIRM` acknowledgement before marking a bulk operation confirmed.
- Documented confirmation behavior, permissions, and QA coverage.

### Iteration 35

- Added dry run support for previewed bulk operations.
- Added a tenant-scoped dry run API endpoint and dashboard action.
- Persisted dry run results without WordPress writes and kept confirmation as the next required step.
- Documented dry run behavior, permissions, and QA coverage.

### Iteration 34

- Added tenant-scoped safe operation previews created from backlog tasks.
- Added a bulk operation listing and preview creation API endpoint.
- Added dashboard preview actions and a recent previews panel for backlog tasks.
- Documented preview-only behavior, permissions, and QA coverage.

### Iteration 33

- Added tenant-scoped backlog task change history.
- Added a backlog task activity API endpoint for status, assignment, creation, and comment events.
- Added dashboard change history for visible backlog tasks.
- Documented backlog task activity API behavior and QA coverage.

### Iteration 32

- Added tenant-scoped CSV export for selected audit run issues.
- Preserved audit issue search, status, and severity filters in CSV exports.
- Added an "Export CSV" action to the dashboard audit issue filter bar.
- Documented audit issue CSV export behavior and QA coverage.

### Iteration 31

- Added dashboard summary counts for selected audit run issues.
- Added total, open, resolved, high, and critical audit issue counters.
- Kept audit issue summary counts scoped to the selected audit run.
- Documented dashboard QA coverage for audit issue summary counts.

### Iteration 30

- Added dashboard filters for selected audit run issues.
- Added audit issue search by issue text, URL, explanation, or recommended action.
- Added dashboard audit issue status and severity filters.
- Documented dashboard QA coverage for filtered audit issue triage.

### Iteration 29

- Added dashboard audit issue triage for the selected audit run.
- Added dashboard controls for audit issue status updates.
- Added dashboard backlog task creation from audit issues.
- Documented dashboard QA coverage for audit issue triage.

### Iteration 28

- Added a SaaS dashboard audit panel for the selected site.
- Added a dashboard action to queue a site audit run.
- Added recent audit run status display with created, started, and completed timestamps.
- Documented dashboard QA coverage for audit queue/list workflows.

### Iteration 27

- Added tenant-scoped audit queueing for site audit runs.
- Added tenant-scoped audit run listing with status and limit filters.
- Added in-memory repository support for queued audits.
- Documented audit queue/list API behavior and QA coverage.

### Iteration 26

- Added a tenant-scoped audit issue status update endpoint.
- Added shared validation for audit issue lifecycle transitions.
- Added activity log writes for changed audit issue statuses.
- Documented audit issue lifecycle permissions and QA coverage.

### Iteration 25

- Added a tenant-scoped audit issue listing endpoint for a specific audit.
- Added audit issue query validation for text search, status, severity, and bounded limits.
- Added repository mapping and fallback coverage for audit issue listing.
- Documented audit issue listing security and QA coverage.

### Iteration 24

- Added tenant-scoped audit issue to backlog task conversion through the repository and task creation endpoint.
- Added idempotent conversion by `auditIssueId`.
- Added activity log writes for backlog tasks created from audit issues.
- Added fallback repository coverage for missing audit issue conversion.

### Iteration 23

- Added tenant-scoped text search for backlog task listing by title, URL, and issue type.
- Added backlog search input to the SaaS dashboard filter bar.
- Preserved backlog search terms in filtered CSV exports.
- Documented backlog search API behavior and QA coverage.

### Iteration 22

- Added a tenant-scoped backlog CSV export endpoint with status and severity filters.
- Added an "Export CSV" action to the SaaS backlog filter bar.
- Extended backlog list options with a bounded export limit.
- Documented backlog CSV export behavior and QA coverage.

### Iteration 21

- Added tenant-scoped backlog task comments through repository methods and JSON endpoints.
- Added inline backlog comment display and creation controls to the SaaS dashboard.
- Added activity log writes for created backlog task comments.
- Added fallback repository coverage for missing-task comment operations.

### Iteration 20

- Added backlog task assignment and due date update support through the repository and task PATCH endpoint.
- Added inline assignee and due date controls to the SaaS backlog table.
- Added organization-scoped assignee validation and assignment activity log writes.
- Added fallback repository coverage for backlog assignment errors.

### Iteration 19

- Added backlog task status and severity filters to the tenant-scoped list repository and JSON endpoint.
- Changed backlog task listing responses to include filtered `items` plus site-wide status/severity summary counts.
- Added dashboard backlog summary pills and filter controls.
- Updated fallback repository coverage for the backlog list response contract.

### Iteration 18

- Added backlog task status update repository method, JSON endpoint, and server action.
- Added inline status controls to the SaaS backlog table.
- Added activity log writes for backlog task status transitions.
- Added fallback repository coverage for backlog status updates.

### Iteration 17

- Added tenant-scoped backlog task listing repository method and JSON endpoint.
- Added a backlog table to the SaaS dashboard for tasks created from synced content candidates.
- Added backlog list fallback coverage for the in-memory repository.
- Documented backlog task listing QA and API behavior.

### Iteration 16

- Added persisted backlog task creation from synced content backlog candidates.
- Added tenant-scoped JSON endpoint and server action for creating tasks from candidates.
- Added "Create task" controls to synced content candidate task rows.
- Added idempotent task creation behavior and activity log writes for candidate-created backlog tasks.

### Iteration 15

- Added computed backlog candidate tasks from synced content health signals.
- Added backlog candidates to the synced content detail API response.
- Added a candidate tasks section to the synced content detail panel with priority, rationale, and next step.
- Added unit coverage for health-signal-to-backlog-candidate mapping.

### Iteration 14

- Added computed synced content health signals for title coverage, publish status, sync freshness, and modified-date freshness.
- Added health signals to the synced content detail API response.
- Added health signal cards to the synced content detail panel.
- Added unit coverage for synced content health signal severity mapping.

### Iteration 13

- Added a tenant-scoped synced content detail repository method and JSON endpoint.
- Added a synced content detail panel to the SaaS inventory table with metadata, first/last seen timestamps, and visit URL action.
- Added inventory row deep links through the `content` query parameter while preserving active filters.
- Documented synced content detail lookup security and QA coverage.

### Iteration 12

- Changed synced content listing to return paginated inventory results with `items`, `nextCursor`, and `total`.
- Added search, type filter, status filter, site selector, and cursor pagination to the SaaS synced content dashboard section.
- Added query parameter support to the tenant-scoped synced content API endpoint.
- Kept synced content filters tenant-scoped through the repository access boundary.

### Iteration 11

- Added `SyncedContentItem` model and migration for plugin-synced WordPress inventory.
- Changed signed plugin sync to upsert content items and update `lastSyncAt` transactionally.
- Added tenant-scoped synced content repository method and JSON listing endpoint.
- Added synced content preview table to the SaaS setup dashboard.
- Added fallback repository coverage for synced content listing.

### Iteration 10

- Added WordPress `ContentCollector` for posts/pages inventory.
- Changed plugin manual sync to send collected content items instead of an empty batch.
- Normalized synced items to external ID, type, URL, title, status, and modified timestamp.
- Added PHP smoke coverage for content mapping and sync body item serialization.

### Iteration 9

- Added WordPress plugin API client for challenge exchange and signed sync requests.
- Changed plugin admin connection form to accept SaaS endpoint and connection challenge instead of raw site/token fields.
- Stored exchanged organization ID, site ID, token, endpoint, and connection timestamp in non-autoloaded options.
- Added queued manual sync execution that sends a signed minimal sync batch to SaaS.
- Added PHP smoke coverage for API URL building, sync body generation, and signed sync headers.

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
