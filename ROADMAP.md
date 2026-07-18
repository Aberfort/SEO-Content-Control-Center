# Roadmap

## Phase 0 - Product Foundation

- Monorepo structure.
- README and local setup.
- Environment examples. Status: local and production examples exist, with `docs/PRODUCTION_ENV.md` plus `npm run deploy:env:check` validating staging/production values before deployment.
- Docker local dependencies.
- CI. Status: lint/test/build workflow includes dependency audit and CodeQL SAST.
- Linting, formatting, tests, build scripts.
- Database schema draft.
- Health checks.
- Structured logging plan.
- Development seed strategy.
- Staging/production deployment plan. Status: portable Docker Compose packaging and production env/secrets verification are implemented; staging end-to-end release rehearsal remains next.

## Phase 1 - SaaS MVP Foundation

- Register, login, logout. Status: DB-backed credentials/session foundation implemented with opt-in TOTP 2FA before session issuance.
- Password reset and email verification. Status: hashed token flows implemented for email verification and password reset.
- Organization creation. Status: Prisma-backed foundation implemented.
- PostgreSQL persistence. Status: initial Prisma migration, seed, and repository implemented.
- Invitations. Status: member invite foundation implemented without email delivery.
- Roles and permissions. Status: RBAC utility, tenant access checks, and member role management implemented.
- Site creation. Status: Prisma-backed foundation implemented.
- Dashboard empty states. Status: implemented for no-org/no-site/no-audit states.
- Onboarding checklist. Status: computed workspace setup checklist is shown on the main app and dashboard.
- Basic audit log. Status: organization/site activity writes implemented through repository layer.
- Trial plan without real charges. Status: local no-charge Trial subscriptions are created for new workspaces and expiry blocks gated mutations.
- Plugin API documentation. Status: dedicated connection, signing, sync, disconnect, and metadata contract documented.

## Phase 2 - WordPress Plugin MVP

- Settings page. Status: WordPress admin settings page shows connection controls, sync controls, automatic sync status, sync logs, and redirect feedback notices.
- Connection flow. Status: challenge exchange stores SaaS connection credentials and reports success/failure through admin notices.
- Connection status. Status: connected site id and automatic sync scheduler state are shown in the WordPress admin page.
- Secure token storage. Status: plugin connection credentials are stored in a non-autoloaded WordPress option.
- Manual sync. Status: admin manual sync queues signed sync work and reports queued status through an admin notice.
- Action Scheduler sync. Status: connected plugins schedule recurring sync through Action Scheduler with hourly WP-Cron fallback.
- Incremental content metadata sync. Status: author, publish date, featured image, taxonomy, word count, link counts, and SEO metadata sync implemented for current posts/pages inventory.
- Sync pagination. Status: the plugin paginates the full posts/pages inventory in ID-ordered batches of 200 with offset cursors and a 50-batch per-run safety bound.
- Yoast and Rank Math extraction. Status: SEO title, meta description, canonical URL, and robots directive extraction implemented with fallback WordPress title metadata.
- Disconnect flow. Status: SaaS dashboard and signed WordPress admin disconnect invalidate server-side plugin connections.
- Sync logs. Status: plugin-local recent sync log with queued/success/error entries and sanitized failure details implemented.

## Phase 3 - SEO Audit MVP

- Metadata checks. Status: synced metadata issues are materialized into completed metadata audit runs.
- Content freshness and thin content checks. Status: synced content freshness/thin content signals are materialized into completed metadata audit runs.
- Indexability checks. Status: synced noindex/nofollow and canonical mismatch signals are materialized into completed metadata audit runs.
- Link checks. Status: synced internal/outbound link counts are materialized into content health signals and missing-internal-link audit issues.
- Issue deduplication. Status: synced-content and GSC traffic-loss issue fingerprints are deduplicated by organization/site/fingerprint.
- Issue lifecycle: open, ignored, resolved, snoozed. Status: audit run listings expose scoped issue summary counts.

## Phase 4 - Google Search Console

- OAuth. Status: OAuth start/callback, signed state, token exchange, and connected Google account email lookup implemented.
- Property selection. Status: OAuth callback auto-selects an exact URL-prefix or matching `sc-domain:` property, and the dashboard can load available Google properties on demand and switch the active property after server-side verification.
- Encrypted refresh token storage. Status: refresh tokens are encrypted before storage and are never returned by read APIs.
- Historical metric sync. Status: persisted daily property-level Search Analytics sync implemented for clicks, impressions, CTR, and average position.
- Page/query insights. Status: persisted top page/query Search Analytics sync implemented for the active property and shown on the dashboard.
- Scheduled sync. Status: the worker process schedules daily metric and insight sync jobs for every active connection through a repeatable queue job, in addition to the manual dashboard sync.
- Traffic loss detection. Status: deterministic read-only site-level window comparison (14 vs previous 14 days) and page-level insight snapshot comparison (latest vs 7 days earlier) implemented with severity thresholds, a dashboard panel, and a scoped API endpoint.
- Content matching. Status: traffic loss pages are matched to synced WordPress inventory items through normalized URLs (protocol, www, trailing slash, query, and fragment insensitive) in the API and dashboard.
- Traffic loss audit issues. Status: matched dropping pages are materialized as deduplicated `gsc.traffic-loss` audit issues during audit runs, with detection-derived severity and comparison evidence, and convert to backlog tasks through the existing issue mechanisms.
- Search opportunities. Status: deterministic CTR-opportunity (high impressions, CTR below half of a position benchmark in the top 10) and striking-distance (positions 5-15 with traffic) detection from the latest insight snapshot, with a scoped read-only endpoint and a dashboard panel.

## Phase 5 - SEO Backlog

- Audit issue to task conversion. Status: single issue and bulk open-issue conversion implemented.
- GSC opportunity to task conversion. Status: matched CTR-opportunity and striking-distance pages convert to persisted backlog tasks through the existing candidate mechanism with `gsc.<type>` issue types.
- Deduplication. Status: candidate, GSC opportunity, single audit issue, and bulk audit conversions reuse existing tasks.
- Filters and search. Status: backlog text search and status/severity filtering with summary counts implemented.
- Assignment and status workflows. Status: task status transitions plus assignee/due date updates with same-organization assignee validation implemented.
- Comments and change history. Status: task comments and change history for creation, status, assignment, due date, and comment events implemented.
- CSV export. Status: filtered site backlog task CSV export implemented.

## Phase 6 - Safe Content Operations

- Preview, dry run, validation, confirmation. Status: preview, dry run, explicit confirmation, and controlled start implemented.
- Per-item processing results. Status: running operation result capture implemented without inline WordPress writes.
- Rollback. Status: worker-backed rollback restore implemented for completed operation items with captured previous WordPress SEO values.
- Retry failed items. Status: queue-backed retry implemented for failed execution items and failed rollback restore items without inline WordPress writes.
- Partial outcome visibility. Status: bulk operation responses and dashboard previews expose per-status item summaries and retry mode.
- Executable SEO payloads. Status: missing SEO title/meta description tasks, reviewed canonical mismatch tasks, and reviewed noindex/nofollow tasks can produce bounded Yoast/Rank Math apply payloads when backed by scoped synced content evidence. Canonical repairs use only the item's own URL, and robots repairs clear only the reviewed enabled directive on published content.
- Signed WordPress apply endpoint. Status: plugin-hosted endpoint implemented for bounded Yoast/Rank Math SEO metadata writes with signed request validation and per-item results.
- Worker execution. Status: bulk operation execution jobs, worker handler, signed plugin apply calls, and per-item result persistence implemented for executable SEO metadata payloads.
- Audit logs. Status: lifecycle activity logs implemented for preview, dry run, confirmation, start, result, rollback, and retry transitions.
- Rate limits and notifications. Status: safe content operation mutation rate limits, lifecycle notifications, notification read state, and bulk mark-read implemented.

Phase 6 execution status: the SaaS state machine, executable SEO title/meta description, self-canonical, and individual noindex/nofollow removal payload creation, worker foundation, signed WordPress plugin apply endpoint, execution queue, worker result persistence, rollback restore for restorable completed items, retry queueing for failed execution/rollback items, and partial outcome visibility are implemented. Preview creation remains conservative: unsupported issue types, missing synced content, fallback SEO metadata, invalid WordPress targets, non-published content for canonical/robots repairs, and stale already-correct metadata stay `noMutation`. Remaining work is deeper operator guidance for partial/non-restorable failures; any additional mutation field needs its own bounded safety model.

## Phase 7 - AI Assistant

- Recommendations only. Status: deterministic read-only recommendations implemented from backlog, synced content, and persisted GSC traffic-loss/opportunity evidence.
- GSC evidence. Status: traffic loss drops and search opportunities from the latest insight snapshot surface as `gsc_traffic_loss`/`gsc_opportunity` recommendations with metric detail, matched-content labels, and audit/backlog conversion next steps.
- Manual confirmation. Status: assistant controls prepare safe previews only and keep dry run, confirmation, and execution separate; GSC-sourced recommendations always return disabled preview controls.
- Source display. Status: assistant recommendation sources are included in API and dashboard output.
- AI provider. Status: optional env-configured Anthropic provider (`SCCC_AI_PROVIDER`, `SCCC_AI_API_KEY`, `SCCC_AI_MODEL`) adds an AI summary to Prisma-backed assistant responses, with a deterministic fallback whenever the provider is unconfigured or fails.
- Usage limits and AI credits. Status: each successful AI summary records one `ai_credits` usage metric and marks the response `metered: true`; exhausted plan credits block provider calls before they happen and raise a per-period deduplicated billing-limit notification, while deterministic responses stay unmetered.
- Disable controls. Status: unsupported assistant actions return disabled controls with reasons.

## Phase 8 - Billing

- Trial, Starter, Pro, Agency, Enterprise. Status: read-only plan catalog and current plan overview implemented.
- Checkout and subscriptions. Status: Stripe checkout session creation and signed, idempotent webhook-backed subscription reconciliation added.
- Billing portal. Status: Stripe billing portal session creation added for configured connected subscriptions.
- Feature gating. Status: site/user plan limits and expired local Trial access are exposed in billing overview and enforced for site creation/member invites.
- Usage tracking and notifications. Status: site/user usage is tracked in billing overview and finite limit-reached notifications are emitted.

## Phase 9 - Observability

- Error tracking. Status: env-gated Sentry error reporting (`SENTRY_DSN`) implemented for SaaS unhandled request errors (via `instrumentation.ts`) and worker job failures through a dependency-free envelope reporter that fails open.
- Server analytics. Status: env-gated PostHog server events (`POSTHOG_KEY`, optional `POSTHOG_HOST`) implemented with tenant context using the shared event taxonomy: organization_created, site_added, plugin_connected, GSC_connected, bulk_operation_started, bulk_operation_completed, AI_feature_used.
- Queue metrics and worker health. Status: the worker exposes `GET /healthz` on `SCCC_WORKER_HEALTH_PORT` with per-queue BullMQ job counts and oldest-waiting lag plus processed/failed counters and uptime.
- Telemetry hygiene. Status: telemetry payloads carry explicit fields only; prompts, request bodies, headers, tokens, and environment values are never sent or logged.

## Phase 10 - Security Hardening

- TOTP 2FA. Status: opt-in authenticator setup implemented with encrypted pending/active secrets and replay-protected login verification.
- Dependency scanning. Status: `npm audit --audit-level=low` runs in CI and local external verification.
- SAST. Status: CodeQL JavaScript/TypeScript analysis runs in CI.
- Restore testing. Status: disposable database restore smoke script implemented as `npm run verify:backup-restore`.
- Enterprise security checklist. Status: planned.

## Phase 11 - Public Marketing

- Acquisition site. Status: responsive three-section product homepage plus Features, Product, Integrations, Pricing, Security, agency/editorial/publisher solution, Knowledge Base, SEO briefings, Changelog, Contact, and service-information routes implemented from the product requirements and landing-content guardrails.
- Demo acquisition. Status: validated, honeypot-protected, per-client rate-limited demo form with env-configured webhook delivery and explicit unavailable states.
- Trial acquisition. Status: 14-day trial page hands work email into the existing SaaS registration flow; SaaS validates the prefill before rendering it.
- Legal and SEO discovery. Status: Privacy, Terms, and Cookie pages, canonical/Open Graph metadata, `robots.txt`, and `sitemap.xml` implemented.
- Public service information. Status: static page documents implemented service surfaces and explicitly states that it is not a real-time monitor or uptime commitment.

## Phase 12 - Plugin Release Operations

- Version contract. Status: `VERSION`, WordPress header, `readme.txt`, and Composer release metadata are checked for exact semantic-version parity.
- Installable artifact. Status: `npm run plugin:package` and `composer run package --working-dir=wordpress-plugin` create a single-root, runtime-only versioned zip under `dist/` and verify its contents.
- CI release artifact. Status: CI packages the plugin after build and uploads `seo-content-control-center-plugin` for installation testing.
- Staging certification. Status: `npm run plugin:certify:matrix` certifies the packaged zip against real WordPress containers across latest-WordPress PHP 8.1/8.2/8.3 plus the previous WordPress branch, covering activation, the version contract, REST route registration, connection storage, WP-Cron sync scheduling, signed apply writes with tampered-signature rejection, deactivation cron cleanup, and clean deletion; CI runs the same matrix per combination. Full SaaS challenge-exchange and Action Scheduler coverage still requires a staging site with the SaaS reachable and Action Scheduler installed.
