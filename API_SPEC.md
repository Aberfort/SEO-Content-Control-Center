# API Specification

## Conventions

- Base path: `/api`.
- Authentication: secure user session for browser APIs, signed token authentication for WordPress plugin APIs.
- Format: JSON.
- Validation: Zod schemas in the SaaS application and shared packages.
- Errors: structured JSON with `code`, `message`, and optional `details`.
- Tenant scope: every organization/site resource is checked against the authenticated principal.
- Browser mutations require a same-origin `Origin` header that matches `Host`, `X-Forwarded-Host`, or `NEXT_PUBLIC_APP_URL`.
- Login, registration, invite creation/resend, and invite acceptance are rate limited. Rate limited responses return `429 RATE_LIMITED` with `Retry-After`.
- Persistence: organization, site, and activity APIs use the repository abstraction. Set `SCCC_DATA_STORE=prisma` with `DATABASE_URL` to use PostgreSQL.

## Health

`GET /api/health`

Returns service health for load balancers and monitoring.

Response:

```json
{
  "status": "ok",
  "service": "seo-content-control-center-saas"
}
```

## Authentication

`POST /api/auth/register`

Creates a user account, hashes the password, creates a DB-backed session, and sets an HTTP-only session cookie.

Request:

```json
{
  "name": "Serhii",
  "email": "serhii@example.com",
  "password": "very-secure-password"
}
```

`POST /api/auth/login`

Verifies credentials, creates a DB-backed session, and sets an HTTP-only session cookie.

Request:

```json
{
  "email": "serhii@example.com",
  "password": "very-secure-password"
}
```

`POST /api/auth/logout`

Deletes the current session token hash from the database and clears the session cookie.

Protected endpoints return `401 AUTH_REQUIRED` when the session is missing or expired.

## Organizations

`POST /api/organizations`

Creates an organization for the current user.

Request:

```json
{
  "name": "Acme SEO"
}
```

`GET /api/organizations/:organizationId`

Returns an organization only when the user is a member.

`GET /api/organizations`

Lists organizations for the current user. The response includes the current member role, tenant-scoped sites, and recent activity logs.

## Sites

`POST /api/organizations/:organizationId/sites`

Creates a WordPress site.

Request:

```json
{
  "name": "Main Blog",
  "url": "https://example.com"
}
```

`GET /api/organizations/:organizationId/sites`

Lists sites scoped to the organization.

## Activity Log

`GET /api/organizations/:organizationId/activity`

Lists activity log entries for an organization when the current user is an active member.

Current MVP activity actions:

- `organization.created`
- `site.created`
- `member.invited`
- `member.invite_resent`
- `member.invite_canceled`
- `member.role_updated`
- `member.accepted_invite`

## Members

`GET /api/organizations/:organizationId/members`

Lists active, invited, suspended, and canceled members for the organization.

`POST /api/organizations/:organizationId/members`

Invites a member. `OWNER` cannot be assigned through this endpoint. The response includes the member summary, a one-time invite URL, and email delivery status. Store or send the raw URL immediately because only the token hash is persisted.

Request:

```json
{
  "email": "editor@example.com",
  "role": "EDITOR"
}
```

`POST /api/organizations/:organizationId/members/:memberId/resend`

Rotates the token for a pending invite and returns a fresh invite URL. The response includes email delivery status for the resent invite.

`POST /api/organizations/:organizationId/members/:memberId/cancel`

Cancels a pending invite and clears the stored token hash.

`POST /api/invitations/accept`

Accepts an invite for the currently signed-in user. The signed-in email must match the invited email.

Request:

```json
{
  "token": "opaque-invite-token"
}
```

`PATCH /api/organizations/:organizationId/members/:memberId`

Updates a non-owner member role. Users cannot change their own role.

Request:

```json
{
  "role": "SEO_MANAGER"
}
```

## WordPress Connection

`POST /api/plugin/connections/challenges`

Creates a one-time challenge for a site connection. Requires a signed-in user with `integration:manage` permission for the organization.

Request:

```json
{
  "organizationId": "11111111-1111-4111-8111-111111111111",
  "siteId": "22222222-2222-4222-8222-222222222222"
}
```

`POST /api/plugin/connections/exchange`

Exchanges a challenge for plugin credentials. The challenge is one-time use and expires after 10 minutes. The response includes the raw plugin token once; the database stores only the token hash.

The WordPress plugin admin connection form posts the SaaS endpoint and challenge to this endpoint, then stores the returned organization ID, site ID, token, and endpoint locally.

Request:

```json
{
  "challenge": "opaque-challenge-token",
  "endpoint": "https://app.example.com"
}
```

`POST /api/plugin/sync`

Receives signed sync batches from WordPress. The plugin sends posts/pages inventory items with external ID, type, URL, title, status, and modified timestamp. The endpoint authenticates, validates, upserts synced content items, records `lastSyncAt`, and returns the accepted item count.

Required headers:

- `X-SCCC-Site-Id`
- `X-SCCC-Timestamp`
- `X-SCCC-Signature`
- `X-SCCC-Token`

Signature input:

```text
METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + SHA256(BODY)
```

`GET /api/organizations/:organizationId/sites/:siteId/content`

Lists synced WordPress content items for a tenant-scoped site.

Query parameters:

- `q` - optional case-insensitive search across title, URL, and external ID.
- `type` - optional exact content type filter, such as `post` or `page`.
- `status` - optional exact WordPress status filter, such as `publish` or `draft`.
- `cursor` - optional item ID cursor returned by the previous response.
- `limit` - optional page size from 1 to 100.

Response:

```json
{
  "data": {
    "items": [],
    "nextCursor": null,
    "total": 0
  }
}
```

`GET /api/organizations/:organizationId/sites/:siteId/content/:contentItemId`

Returns one synced WordPress content item when it belongs to the requested organization and site.

Response:

```json
{
  "data": {
    "id": "33333333-3333-4333-8333-333333333333",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "siteId": "22222222-2222-4222-8222-222222222222",
    "externalId": "post:123",
    "type": "post",
    "url": "https://example.com/post",
    "title": "Example post",
    "status": "publish",
    "modifiedAt": "2026-07-01T07:00:00.000Z",
    "firstSeenAt": "2026-07-01T07:05:00.000Z",
    "lastSeenAt": "2026-07-01T07:05:00.000Z",
    "healthSignals": [
      {
        "id": "published",
        "label": "Published",
        "severity": "success",
        "message": "WordPress reports this item as published."
      }
    ],
    "backlogCandidates": [
      {
        "id": "33333333-3333-4333-8333-333333333333:refresh",
        "title": "Review freshness of Example post",
        "priority": "low",
        "sourceSignalId": "content-stale",
        "rationale": "WordPress modified timestamp is 200 days old.",
        "nextStep": "Check whether the page still matches search intent and update it if needed."
      }
    ]
  }
}
```

`POST /api/organizations/:organizationId/sites/:siteId/backlog/tasks`

Creates a persisted backlog task from a synced content backlog candidate or scoped audit issue. The server recomputes candidate details from the scoped content item and ignores user-supplied task titles or priority. Repeated candidate requests for the same organization, site, URL, and issue type return the existing task. Repeated audit issue requests for the same `auditIssueId` return the existing task.

Candidate request:

```json
{
  "contentItemId": "33333333-3333-4333-8333-333333333333",
  "candidateId": "33333333-3333-4333-8333-333333333333:refresh"
}
```

Audit issue request:

```json
{
  "auditIssueId": "77777777-7777-4777-8777-777777777777"
}
```

Response:

```json
{
  "data": {
    "id": "44444444-4444-4444-8444-444444444444",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "siteId": "22222222-2222-4222-8222-222222222222",
    "title": "Review freshness of Example post",
    "url": "https://example.com/post",
    "issueType": "synced_content.content-stale",
    "status": "TODO",
    "severity": "LOW",
    "potentialImpact": "WordPress modified timestamp is 200 days old.",
    "effortEstimate": 1,
    "tags": ["synced-content", "content-stale"]
  }
}
```

`GET /api/organizations/:organizationId/sites/:siteId/backlog/tasks`

Lists the latest persisted backlog tasks for a tenant-scoped site. Optional query params:

- `q`: text search over title, URL, and issue type
- `status`: one of `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `SNOOZED`, `IGNORED`
- `severity`: one of `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`
- `limit`: number from `1` to `500`

Response:

```json
{
  "data": {
    "items": [
      {
        "id": "44444444-4444-4444-8444-444444444444",
        "organizationId": "11111111-1111-4111-8111-111111111111",
        "siteId": "22222222-2222-4222-8222-222222222222",
        "title": "Review freshness of Example post",
        "url": "https://example.com/post",
        "issueType": "synced_content.content-stale",
        "status": "TODO",
        "severity": "LOW",
        "potentialImpact": "WordPress modified timestamp is 200 days old.",
        "effortEstimate": 1,
        "tags": ["synced-content", "content-stale"],
        "createdAt": "2026-01-01T00:00:00.000Z",
        "updatedAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "summary": {
      "total": 1,
      "open": 1,
      "done": 0,
      "byStatus": {
        "TODO": 1,
        "IN_PROGRESS": 0,
        "IN_REVIEW": 0,
        "DONE": 0,
        "SNOOZED": 0,
        "IGNORED": 0
      },
      "bySeverity": {
        "LOW": 1,
        "MEDIUM": 0,
        "HIGH": 0,
        "CRITICAL": 0
      }
    }
  }
}
```

`GET /api/organizations/:organizationId/sites/:siteId/backlog/tasks/export`

Exports latest persisted backlog tasks for a tenant-scoped site as CSV. Optional query params:

- `q`: text search over title, URL, and issue type
- `status`: one of `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `SNOOZED`, `IGNORED`
- `severity`: one of `LOW`, `MEDIUM`, `HIGH`, `CRITICAL`

Response content type: `text/csv; charset=utf-8`.

`PATCH /api/organizations/:organizationId/sites/:siteId/backlog/tasks/:taskId`

Updates a persisted backlog task status or assignment metadata inside a tenant-scoped site.

Status request:

```json
{
  "status": "IN_PROGRESS"
}
```

Allowed statuses: `TODO`, `IN_PROGRESS`, `IN_REVIEW`, `DONE`, `SNOOZED`, `IGNORED`.

Assignment request:

```json
{
  "assigneeId": "55555555-5555-4555-8555-555555555555",
  "dueDate": "2026-07-10"
}
```

Set `assigneeId` or `dueDate` to `null` to clear the field. Assignees must be active members of the same organization.

`GET /api/organizations/:organizationId/sites/:siteId/backlog/tasks/:taskId/comments`

Lists latest comments for a tenant-scoped backlog task.

Response:

```json
{
  "data": [
    {
      "id": "66666666-6666-4666-8666-666666666666",
      "taskId": "44444444-4444-4444-8444-444444444444",
      "authorId": "55555555-5555-4555-8555-555555555555",
      "authorEmail": "owner@example.com",
      "authorName": "Owner",
      "body": "Check the SERP before rewriting the title.",
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

`GET /api/organizations/:organizationId/sites/:siteId/backlog/tasks/:taskId/activity`

Lists latest change history entries for a tenant-scoped backlog task when the member has `backlog:read`.
The response includes task creation, status updates, assignment or due-date updates, and comment-created events scoped to the requested organization, site, and task.

Response:

```json
{
  "data": [
    {
      "id": "99999999-9999-4999-8999-999999999999",
      "organizationId": "11111111-1111-4111-8111-111111111111",
      "userId": "33333333-3333-4333-8333-333333333333",
      "action": "backlog_task.status_updated",
      "entityType": "BacklogTask",
      "entityId": "88888888-8888-4888-8888-888888888888",
      "metadata": {
        "siteId": "22222222-2222-4222-8222-222222222222",
        "previousStatus": "TODO",
        "status": "IN_PROGRESS"
      },
      "createdAt": "2026-07-03T10:00:00.000Z"
    }
  ]
}
```

`POST /api/organizations/:organizationId/sites/:siteId/backlog/tasks/:taskId/comments`

Creates a comment on a tenant-scoped backlog task.

Request:

```json
{
  "body": "Check the SERP before rewriting the title."
}
```

## Safe Content Operations

`GET /api/organizations/:organizationId/sites/:siteId/bulk-operations`

Lists latest tenant-scoped bulk operations when the member has `content_operation:preview`.

Optional query params:

- `status`: one of `DRAFT`, `PREVIEWED`, `DRY_RUN_PASSED`, `CONFIRMED`, `RUNNING`, `COMPLETED`, `FAILED`, `ROLLED_BACK`
- `limit`: number from `1` to `100`

`POST /api/organizations/:organizationId/sites/:siteId/bulk-operations`

Creates a preview-only bulk operation from a scoped backlog task when the member has `content_operation:preview`.
This endpoint persists `PREVIEWED` operation metadata and planned item values, but does not write to WordPress or execute a dry run.

Request:

```json
{
  "taskId": "44444444-4444-4444-8444-444444444444"
}
```

Response:

```json
{
  "data": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "siteId": "22222222-2222-4222-8222-222222222222",
    "type": "BACKLOG_TASK_PREVIEW",
    "status": "PREVIEWED",
    "preview": {
      "noMutation": true,
      "summary": "Preview recommended SEO work for https://example.com/post.",
      "taskId": "44444444-4444-4444-8444-444444444444",
      "safeguards": [
        "preview_only",
        "no_wordpress_write",
        "dry_run_required",
        "confirmation_required"
      ]
    },
    "dryRunResult": null,
    "confirmedAt": null,
    "items": [
      {
        "externalId": "https://example.com/post",
        "status": "PREVIEWED",
        "error": null
      }
    ]
  }
}
```

`POST /api/organizations/:organizationId/sites/:siteId/bulk-operations/:operationId/dry-run`

Runs a dry run for a scoped `PREVIEWED` bulk operation when the member has `content_operation:preview`.
The dry run updates SaaS operation records to `DRY_RUN_PASSED`, persists a `dryRunResult`, and keeps WordPress writes disabled. Confirmation remains required before any future execution endpoint can run.

Response:

```json
{
  "data": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "DRY_RUN_PASSED",
    "dryRunResult": {
      "noMutation": true,
      "status": "passed",
      "itemCount": 1,
      "passedItems": 1,
      "failedItems": 0,
      "nextRequiredStep": "confirmation"
    },
    "items": [
      {
        "externalId": "https://example.com/post",
        "status": "DRY_RUN_PASSED",
        "error": null
      }
    ]
  }
}
```

`POST /api/organizations/:organizationId/sites/:siteId/bulk-operations/:operationId/confirm`

Confirms a scoped `DRY_RUN_PASSED` bulk operation when the member has `content_operation:confirm`.
The request must include the literal acknowledgement `CONFIRM`. Confirmation marks SaaS operation records as `CONFIRMED` and records `confirmedAt`, but still does not write to WordPress or execute the operation.

Request:

```json
{
  "confirmation": "CONFIRM"
}
```

Response:

```json
{
  "data": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "CONFIRMED",
    "confirmedAt": "2026-07-04T10:00:00.000Z",
    "items": [
      {
        "externalId": "https://example.com/post",
        "status": "CONFIRMED",
        "error": null
      }
    ]
  }
}
```

`POST /api/organizations/:organizationId/sites/:siteId/bulk-operations/:operationId/start`

Starts a scoped `CONFIRMED` bulk operation when the member has `content_operation:confirm`.
This moves the SaaS operation and items to `RUNNING` for future worker processing, records an activity log, and still does not write to WordPress inline.

Response:

```json
{
  "data": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "RUNNING",
    "confirmedAt": "2026-07-04T10:00:00.000Z",
    "items": [
      {
        "externalId": "https://example.com/post",
        "status": "RUNNING",
        "error": null
      }
    ]
  }
}
```

## Audits

`POST /api/organizations/:organizationId/sites/:siteId/audits`

Queues an audit when the member has `audit:run`. The MVP creates a tenant-scoped `QUEUED` audit record and activity log entry; it does not crawl or mutate WordPress content inline.

Response:

```json
{
  "data": {
    "id": "66666666-6666-4666-8666-666666666666",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "siteId": "22222222-2222-4222-8222-222222222222",
    "status": "QUEUED",
    "startedAt": null,
    "completedAt": null,
    "createdAt": "2026-07-02T10:00:00.000Z"
  }
}
```

`GET /api/organizations/:organizationId/sites/:siteId/audits`

Lists audit runs for a site when the member has `audit:read`.

Query parameters:

- `status` filters by `QUEUED`, `RUNNING`, `COMPLETED`, or `FAILED`.
- `limit` is bounded from 1 to 100 and defaults to 25.

Response:

```json
{
  "data": [
    {
      "id": "66666666-6666-4666-8666-666666666666",
      "organizationId": "11111111-1111-4111-8111-111111111111",
      "siteId": "22222222-2222-4222-8222-222222222222",
      "status": "QUEUED",
      "startedAt": null,
      "completedAt": null,
      "createdAt": "2026-07-02T10:00:00.000Z"
    }
  ]
}
```

`GET /api/organizations/:organizationId/sites/:siteId/audits/:auditId/issues`

Lists issues for an audit when the member has `audit:read`.

Query parameters:

- `q` searches issue type, affected URL, explanation, and recommended action.
- `status` filters by `OPEN`, `IGNORED`, `RESOLVED`, or `SNOOZED`.
- `severity` filters by `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.
- `limit` is bounded from 1 to 500 and defaults to 100.

Response:

```json
{
  "data": [
    {
      "id": "77777777-7777-4777-8777-777777777777",
      "auditId": "66666666-6666-4666-8666-666666666666",
      "organizationId": "11111111-1111-4111-8111-111111111111",
      "siteId": "22222222-2222-4222-8222-222222222222",
      "issueType": "meta_description_missing",
      "status": "OPEN",
      "severity": "HIGH",
      "affectedUrl": "https://example.com/page",
      "evidence": {
        "selector": "head meta[name=description]"
      },
      "explanation": "The page does not expose a meta description.",
      "recommendedAction": "Add a concise meta description.",
      "potentialImpact": "Search snippets may be less relevant.",
      "fingerprint": "meta-description-missing:https://example.com/page",
      "createdAt": "2026-07-01T10:00:00.000Z",
      "updatedAt": "2026-07-01T10:00:00.000Z"
    }
  ]
}
```

`GET /api/organizations/:organizationId/sites/:siteId/audits/:auditId/issues/export`

Exports issues for a tenant-scoped audit run as CSV when the member has `audit:read`.

Optional query params:

- `q` searches issue type, affected URL, explanation, and recommended action.
- `status` filters by `OPEN`, `IGNORED`, `RESOLVED`, or `SNOOZED`.
- `severity` filters by `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL`.

Response content type: `text/csv; charset=utf-8`.

`PATCH /api/organizations/:organizationId/sites/:siteId/audits/:auditId/issues/:issueId`

Updates an audit issue status when the member has `audit:run`. The issue is resolved through the requested organization, site, and audit before mutation. Repeating the same status returns the current issue without writing another activity log.

Request:

```json
{
  "status": "RESOLVED"
}
```

Allowed statuses:

- `OPEN`
- `IGNORED`
- `RESOLVED`
- `SNOOZED`

Response:

```json
{
  "data": {
    "id": "77777777-7777-4777-8777-777777777777",
    "auditId": "66666666-6666-4666-8666-666666666666",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "siteId": "22222222-2222-4222-8222-222222222222",
    "issueType": "meta_description_missing",
    "status": "RESOLVED",
    "severity": "HIGH",
    "affectedUrl": "https://example.com/page",
    "evidence": {
      "selector": "head meta[name=description]"
    },
    "explanation": "The page does not expose a meta description.",
    "recommendedAction": "Add a concise meta description.",
    "potentialImpact": "Search snippets may be less relevant.",
    "fingerprint": "meta-description-missing:https://example.com/page",
    "createdAt": "2026-07-01T10:00:00.000Z",
    "updatedAt": "2026-07-01T10:05:00.000Z"
  }
}
```

## Backlog

`GET /api/organizations/:organizationId/sites/:siteId/tasks`

Lists backlog tasks.

`PATCH /api/organizations/:organizationId/sites/:siteId/tasks/:taskId`

Updates a task if the member has permission.

## Analytics Events

Events must include organization/site context when available and must not contain sensitive tokens.
