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
