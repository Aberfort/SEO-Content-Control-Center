# Roadmap

## Phase 0 - Product Foundation

- Monorepo structure.
- README and local setup.
- Environment examples.
- Docker local dependencies.
- CI.
- Linting, formatting, tests, build scripts.
- Database schema draft.
- Health checks.
- Structured logging plan.
- Development seed strategy.
- Staging/production deployment plan.

## Phase 1 - SaaS MVP Foundation

- Register, login, logout. Status: DB-backed credentials/session foundation implemented.
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
- Indexability checks. Status: synced noindex and canonical mismatch signals are materialized into completed metadata audit runs.
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
- Executable SEO payloads. Status: missing SEO title and missing meta description backlog tasks can produce bounded Yoast/Rank Math apply payloads when backed by scoped synced content evidence.
- Signed WordPress apply endpoint. Status: plugin-hosted endpoint implemented for bounded Yoast/Rank Math SEO metadata writes with signed request validation and per-item results.
- Worker execution. Status: bulk operation execution jobs, worker handler, signed plugin apply calls, and per-item result persistence implemented for executable SEO metadata payloads.
- Audit logs. Status: lifecycle activity logs implemented for preview, dry run, confirmation, start, result, rollback, and retry transitions.
- Rate limits and notifications. Status: safe content operation mutation rate limits, lifecycle notifications, notification read state, and bulk mark-read implemented.

Phase 6 execution status: the SaaS state machine, executable SEO title/meta description payload creation, worker foundation, signed WordPress plugin apply endpoint, execution queue, worker result persistence, rollback restore for restorable completed items, retry queueing for failed execution/rollback items, and partial outcome visibility are implemented. Preview creation remains conservative: unsupported issue types, missing synced content, fallback SEO metadata, invalid WordPress targets, and stale already-present metadata stay `noMutation`. Remaining work is broader safe-operation payload coverage and deeper operator guidance for partial/non-restorable failures.

## Phase 7 - AI Assistant

- Recommendations only. Status: deterministic read-only recommendations implemented from backlog and synced content evidence.
- Manual confirmation. Status: assistant controls prepare safe previews only and keep dry run, confirmation, and execution separate.
- Source display. Status: assistant recommendation sources are included in API and dashboard output.
- Usage limits and AI credits. Status: recommendation responses include unmetered monthly AI-credit usage envelopes from plan limits and usage metrics.
- Disable controls. Status: unsupported assistant actions return disabled controls with reasons.

## Phase 8 - Billing

- Trial, Starter, Pro, Agency, Enterprise. Status: read-only plan catalog and current plan overview implemented.
- Checkout and subscriptions. Status: Stripe checkout session creation and signed, idempotent webhook-backed subscription reconciliation added.
- Billing portal. Status: Stripe billing portal session creation added for configured connected subscriptions.
- Feature gating. Status: site/user plan limits and expired local Trial access are exposed in billing overview and enforced for site creation/member invites.
- Usage tracking and notifications. Status: site/user usage is tracked in billing overview and finite limit-reached notifications are emitted.
