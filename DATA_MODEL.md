# Data Model

The canonical schema lives in `packages/database/prisma/schema.prisma`.
The first migration lives in `packages/database/prisma/migrations/20260630081500_iteration_2_foundation/migration.sql`.

## Core Entities

- User
- Session
- EmailVerificationToken
- PasswordResetToken
- Organization
- OrganizationMember
- Role
- Subscription
- Plan
- BillingWebhookEvent
- Site
- WordPressConnection
- WordPressConnectionChallenge
- SyncedContentItem
- GscConnection
- GscDailyMetric
- GscSearchInsight
- Audit
- AuditIssue
- BacklogTask
- TaskComment
- BulkOperation
- BulkOperationItem
- ActivityLog
- ApiKey
- Notification
- Integration
- UsageMetric
- MonitoredUrl
- UrlSnapshot
- Event
- Regression
- RegressionEvent

## Tenant Rules

- Organization is the root tenant.
- Site belongs to exactly one organization.
- Every operational entity references organization directly or indirectly through site.
- Worker jobs carry `organizationId` and `siteId`.
- Unique constraints prevent duplicate site URLs and duplicate issue/task records inside a tenant.
- SaaS repository access must query through membership-scoped methods before returning organization, site, or activity data.
- Session tokens are stored as hashes in the database. Raw session tokens exist only in HTTP-only cookies.
- TOTP two-factor secrets are stored encrypted on `User`; enrollment first writes `twoFactorPendingSecret`, confirmation promotes it to `twoFactorSecret`, and `twoFactorLastCounter` prevents replaying an already accepted authenticator code.
- Password reset tokens are stored as hashes, expire after 1 hour, and are invalidated along with existing sessions after a successful reset.
- Email verification tokens are stored as hashes, expire after 24 hours, and are invalidated when a user verifies their email.
- Invite tokens are stored as hashes on `OrganizationMember`; raw invite tokens only appear in create/resend responses and accept-invite URLs.
- WordPress connection challenges and plugin tokens are stored as hashes. New WordPress connections also store `encryptedToken` when token encryption is configured so the worker can sign outbound plugin apply requests; raw challenge/token values are returned only at creation/exchange time and are not exposed by read APIs.
- Disconnecting a WordPress connection sets `disconnectedAt`, moves the site to `DISCONNECTED`, increments the token version, and invalidates unused challenges.
- Google Search Console connections belong to a site; OAuth callback discovers available Search Console properties, upserts the selected URL-prefix or `sc-domain:` property by `siteId + propertyUrl`, stores refresh tokens encrypted in `encryptedRefreshToken`, and read APIs expose only account, property, connection, and disconnect timestamps. Manual property selection reuses the active encrypted refresh token after verifying the selected property against Google's property list for the connected account.
- Google Search Console daily metrics are unique by `siteId + propertyUrl + date` and store property-level clicks, impressions, CTR, and average position from Search Analytics.
- Google Search Console search insights are unique by `siteId + propertyUrl + startDate + endDate + page + query` and store top page/query Search Analytics rows for a synced date range.
- Synced content items are unique by `siteId + externalId` and scoped by `organizationId`.
- Synced content item metadata stores bounded plugin-derived SEO signals such as author, publish date, featured image presence, taxonomies, word count, internal/outbound link counts, SEO title, meta description, canonical URL, robots directives, and detected SEO plugin source; WordPress post bodies are not stored in this inventory.
- Synced content inventory queries must keep filters inside the organization/site scope before applying search or pagination.
- Synced content detail lookups must include organization, site, and item IDs in the same scoped query.
- Synced content health signals are computed from synced metadata; actionable signals can be materialized as deduplicated `AuditIssue` records when a site audit is queued.
- Backlog candidates generated from synced content signals are computed previews until a user creates a persisted `BacklogTask`.
- Metadata audit runs created from synced content signals are completed synchronously after issue materialization and are listed through organization and site scope before status filters are applied.
- Audit issue fingerprints generated from synced content include the content external ID and signal ID so repeated audits update the same tenant/site issue instead of creating duplicates.
- Audit run API responses include computed issue summary counts from scoped audit issues; the summary is not persisted separately.
- Audit issues are listed through the parent audit, organization, and site scope before any search or filters are applied.
- Audit issue status changes update the issue record and write organization-scoped activity logs.
- Backlog tasks created from synced content candidates use `synced_content.*` issue types and remain scoped by organization and site.
- Backlog tasks created from audit issues use `audit.*` issue types and retain the source `auditIssueId`.
- Bulk backlog creation from audits filters issues through organization/site/audit scope and creates only tasks missing for the selected source status.
- Backlog task lists must be queried by organization and site scope before display.
- Backlog task search, filters, and summary counts must be computed inside the same organization/site scope.
- Backlog task status transitions update the task record and write organization-scoped activity logs.
- Backlog task assignment changes must target active members of the same organization.
- Backlog task comments must be created only after resolving the parent task through organization/site scope.
- Backlog task exports must reuse organization/site-scoped task listing filters.
- New organizations receive a local `TRIALING` subscription on the Trial plan with `provider = null`; after `trialEndsAt` passes, application reads derive it as `PAST_DUE` for gating without opening a provider billing portal. Provider-backed subscription changes are reconciled separately through billing webhooks.
- `MonitoredUrl` records a URL a user has chosen to watch on a site; unique by `siteId + urlHash` (a SHA-256 hash of the trimmed URL). MVP enforces a per-site limit (`SCCC_MAX_MONITORED_URLS_PER_SITE`, default 10) on active monitored URLs. A member with `monitoring:manage` can pause (`isActive: false`) or resume (`isActive: true`) a monitored URL from the Monitoring nav view without deleting it, preserving its snapshot/event/regression history; pausing frees a slot against the per-site cap, and resuming re-checks the cap so it cannot be bypassed. The scheduled rescan job excludes paused URLs (`listMonitoredUrlsDueForScan` only considers `isActive: true`), and the snapshot worker handler rejects a scan job for a paused URL (`MONITORED_URL_INACTIVE`) even if one is enqueued directly; the UI only exposes the manual Rescan action while a URL is active. `label` can be edited after creation (`updateMonitoredUrlLabel`) or cleared back to `null`, independent of `isActive`.
- `UrlSnapshot` stores one point-in-time crawl result for a `MonitoredUrl` (HTTP status, final URL, response time, title/meta description/H1/canonical/robots/X-Robots-Tag, structured-data/GA4/GTM presence, content and HTML hashes). The first snapshot for a URL is flagged `isBaseline`; later snapshots are compared against the most recent prior snapshot to detect changes. Raw HTML is never persisted — only extracted signals and hashes.
- `Event` is the single normalized event model for everything that can appear on the site timeline (WordPress changes, crawler-detected changes, GSC signals, system events), discriminated by `source` (`WORDPRESS`, `CRAWLER`, `GSC`, `SYSTEM`) and a free-form `type` string (e.g. `canonical_changed`, `page_became_noindex`, `ga4_missing`) rather than a growing enum, so new event types do not require a migration. `severity` is `INFO` / `WARNING` / `CRITICAL`. `monitoredUrlId` is nullable for site-wide events that are not tied to a specific monitored URL. `source: WORDPRESS` rows (`plugin_installed`/`plugin_activated`/`plugin_deactivated`/`plugin_updated`/`plugin_deleted`/`theme_activated`/`theme_updated`/`wordpress_core_updated`) are written by `POST /api/plugin/system-events`, always with `monitoredUrlId: null` and `severity: INFO`, and are ingested with the same signed-request auth as `POST /api/plugin/sync`.
- `Regression` is populated by a deterministic rule engine that runs inline in the monitoring worker job right after new `Event` rows are persisted. It is unique by `organizationId + siteId + fingerprint` so a retried job does not create a duplicate or re-send an alert; `fingerprint` is derived from the triggering event id(s), so it is stable across retries but distinct for every new occurrence of the underlying change. `RegressionEvent` links a `Regression` to the one or more `Event` rows that triggered it. Rules implemented so far: a page becoming noindex, an HTTP 200→404 transition, GA4/GTM disappearing, a canonical URL change correlated with a Search Console click-drop on the site, and a WordPress plugin/theme/core change within the preceding 3 days of any of the other regression-worthy events (each a "possible cause," never presented as confirmed causation). The last rule links a `source: WORDPRESS` `Event` and the following `source: CRAWLER` `Event` into the same `Regression` via two `RegressionEvent` rows.
- Monitored URL scanning and snapshot/event creation run asynchronously on the `sccc-monitoring` BullMQ queue (`monitoring.create-snapshot` job), consistent with the rule that scanning must not block an HTTP request. The crawler enforces an SSRF guard (blocks loopback, private, link-local/cloud-metadata, and other reserved IP ranges, and re-validates every redirect hop) before fetching any monitored URL.

## Organization Member Lifecycle

- `INVITED`
- `ACTIVE`
- `SUSPENDED`
- `CANCELED`

## RBAC Roles

- Owner
- Admin
- SEO Manager
- Editor
- Writer
- Viewer
- Billing Manager

## Audit Issue Lifecycle

- `OPEN`
- `IGNORED`
- `RESOLVED`
- `SNOOZED`

## Backlog Task Lifecycle

- `TODO`
- `IN_PROGRESS`
- `IN_REVIEW`
- `DONE`
- `SNOOZED`
- `IGNORED`

## Bulk Operation Lifecycle

- `DRAFT`
- `PREVIEWED`
- `DRY_RUN_PASSED`
- `CONFIRMED`
- `RUNNING`
- `COMPLETED`
- `FAILED`
- `ROLLED_BACK`
