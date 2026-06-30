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
