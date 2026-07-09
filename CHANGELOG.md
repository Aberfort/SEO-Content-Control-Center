# Changelog

## 0.1.0 - Foundation Iterations

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
