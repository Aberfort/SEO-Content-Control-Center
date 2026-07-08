# Data Model

The canonical schema lives in `packages/database/prisma/schema.prisma`.
The first migration lives in `packages/database/prisma/migrations/20260630081500_iteration_2_foundation/migration.sql`.

## Core Entities

- User
- Session
- Organization
- OrganizationMember
- Role
- Subscription
- Plan
- Site
- WordPressConnection
- WordPressConnectionChallenge
- SyncedContentItem
- GscConnection
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
- Invite tokens are stored as hashes on `OrganizationMember`; raw invite tokens only appear in create/resend responses and accept-invite URLs.
- WordPress connection challenges and plugin tokens are stored as hashes. Raw challenge/token values are returned only at creation/exchange time.
- Synced content items are unique by `siteId + externalId` and scoped by `organizationId`.
- Synced content item metadata stores bounded plugin-derived SEO signals such as author, publish date, featured image presence, taxonomies, word count, SEO title, meta description, canonical URL, robots directives, and detected SEO plugin source; WordPress post bodies are not stored in this inventory.
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
