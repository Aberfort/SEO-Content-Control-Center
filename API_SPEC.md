# API Specification

## Conventions

- Base path: `/api`.
- Authentication: secure user session for browser APIs, signed token authentication for WordPress plugin APIs.
- Format: JSON.
- Validation: Zod schemas in the SaaS application and shared packages.
- Errors: structured JSON with `code`, `message`, and optional `details`.
- Tenant scope: every organization/site resource is checked against the authenticated principal.

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

## WordPress Connection

`POST /api/plugin/connections/challenges`

Creates a one-time challenge for a site connection.

`POST /api/plugin/connections/exchange`

Exchanges a challenge for plugin credentials. The challenge is one-time use and short-lived.

`POST /api/plugin/sync`

Receives signed sync batches from WordPress.

Required headers:

- `X-SCCC-Site-Id`
- `X-SCCC-Timestamp`
- `X-SCCC-Signature`

Signature input:

```text
METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + SHA256(BODY)
```

## Audits

`POST /api/organizations/:organizationId/sites/:siteId/audits`

Queues an audit.

`GET /api/organizations/:organizationId/sites/:siteId/audits/:auditId/issues`

Lists issues for an audit.

## Backlog

`GET /api/organizations/:organizationId/sites/:siteId/tasks`

Lists backlog tasks.

`PATCH /api/organizations/:organizationId/sites/:siteId/tasks/:taskId`

Updates a task if the member has permission.

## Analytics Events

Events must include organization/site context when available and must not contain sensitive tokens.
