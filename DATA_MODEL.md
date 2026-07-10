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
