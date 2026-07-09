# API Specification

## Conventions

- Base path: `/api`.
- Authentication: secure user session for browser APIs, signed token authentication for WordPress plugin APIs.
- Format: JSON.
- Validation: Zod schemas in the SaaS application and shared packages.
- Errors: structured JSON with `code`, `message`, and optional `details`.
- Tenant scope: every organization/site resource is checked against the authenticated principal.
- Browser mutations require a same-origin `Origin` header that matches `Host`, `X-Forwarded-Host`, or `NEXT_PUBLIC_APP_URL`.
- Login, registration, password reset, invite creation/resend, invite acceptance, safe content operation mutations, WordPress plugin endpoints (`/api/plugin/*`), and the Stripe billing webhook are rate limited. Rate limited responses return `429 RATE_LIMITED` with `Retry-After`.
- Rate limit counters are stored in Redis when `REDIS_URL` is configured, so limits hold across multiple SaaS instances. Without `REDIS_URL` (or with `SCCC_RATE_LIMIT_STORE=memory`) counters fall back to a process-local in-memory store suitable only for a single instance. If Redis becomes unavailable at runtime, limits degrade to the per-process fallback instead of failing requests.
- Persistence: organization, site, and activity APIs use the repository abstraction. Set `SCCC_DATA_STORE=prisma` with `DATABASE_URL` to use PostgreSQL.
- WordPress plugin integration details are documented in [docs/PLUGIN_API.md](docs/PLUGIN_API.md).

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

Creates a user account, hashes the password, creates a DB-backed session, sets an HTTP-only session cookie, and creates a hashed email verification token. The endpoint attempts to send a verification email through the configured email transport; delivery failure does not expose the raw token in API responses.

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

`POST /api/auth/password-reset/request`

Creates a hashed one-time password reset token for an account when the email belongs to a password-backed user, then attempts email delivery through the configured transport. The response is intentionally generic and does not reveal whether the email exists.

Request:

```json
{
  "email": "serhii@example.com"
}
```

Response:

```json
{
  "data": {
    "accepted": true
  }
}
```

`POST /api/auth/password-reset/confirm`

Resets a password using a valid one-time token. Success updates the password hash, marks the email verified, invalidates outstanding reset tokens for the user, and deletes existing sessions so the user signs in again.

Request:

```json
{
  "token": "opaque-reset-token",
  "password": "new-secure-password"
}
```

`GET /auth/reset-password?token=:token`

Browser reset page for password reset email links.

`GET /auth/verify-email?token=:token`

Browser verification page for email links. A valid, unexpired token marks the user email as verified and invalidates outstanding verification tokens for the same user. Used tokens for already verified users return an already-verified state. Missing, unknown, used, or expired tokens render a safe failure message.

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

Creating a site is plan-gated by the current billing plan's `sites` limit and local Trial access state. When the limit is reached, the API returns `402 PLAN_SITE_LIMIT_REACHED`. When a local no-provider Trial has expired, the API returns `402 BILLING_TRIAL_EXPIRED`.

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
- `billing.trial_started`
- `plugin.connected`
- `plugin.disconnected`

## Google Search Console

`GET /api/organizations/:organizationId/sites/:siteId/gsc`

Returns the Google Search Console connection overview for a site when the current user has `site:read` access to the organization/site scope. The response is read-only and exposes property/account metadata only; encrypted refresh tokens are never returned. The connect action remains disabled until the OAuth callback and token exchange flow is implemented.

OAuth readiness requires non-empty `SCCC_GSC_CLIENT_ID`, `SCCC_GSC_CLIENT_SECRET`, and `SCCC_GSC_REDIRECT_URI`.
The enabled connect flow also requires `SCCC_TOKEN_ENCRYPTION_KEY` and either `SCCC_GSC_STATE_SECRET` or `AUTH_SECRET`.

Response:

```json
{
  "data": {
    "siteId": "22222222-2222-4222-8222-222222222222",
    "connections": [
      {
        "id": "33333333-3333-4333-8333-333333333333",
        "siteId": "22222222-2222-4222-8222-222222222222",
        "googleAccountEmail": "search@example.com",
        "propertyUrl": "sc-domain:example.com",
        "connectedAt": "2026-07-08T10:00:00.000Z",
        "updatedAt": "2026-07-08T10:00:00.000Z",
        "disconnectedAt": null
      }
    ],
    "connected": true,
    "oauthConfigured": false,
    "action": {
      "type": "gsc_oauth",
      "label": "Connect Google Search Console",
      "enabled": false,
      "href": null,
      "disabledReason": "Google Search Console OAuth is not configured.",
      "requiresIntegrationManage": true,
      "noMutation": true
    }
  }
}
```

`GET /api/organizations/:organizationId/sites/:siteId/gsc/oauth/start?propertyUrl=:propertyUrl`

Starts the browser OAuth flow for an authenticated user who can manage integrations. The route verifies the selected site through the organization/site scope, signs a short-lived OAuth `state` containing the user, organization, site, and requested property URL, then redirects to Google's OAuth authorization endpoint with read-only Search Console scope and offline access. If configuration or permission checks fail, the route redirects back to the dashboard with a safe `gsc=error` status.

`GET /api/integrations/gsc/callback`

Completes the Google OAuth redirect. The route verifies the signed state, checks that the current signed-in user matches the state, exchanges the authorization code for Google tokens, fetches the connected Google account email, lists the Google account's Search Console properties, selects an exact URL-prefix property or matching `sc-domain:` property for the requested site, encrypts the refresh token, and upserts a `GscConnection` for the scoped site/property. The callback redirects back to the dashboard with `gsc=connected` or a safe `gsc=error` message. Raw and encrypted refresh tokens are never returned in API responses.

`GET /api/organizations/:organizationId/sites/:siteId/gsc/properties`

Lists available Google Search Console properties for a connected site when the current user can manage integrations. The endpoint resolves the active GSC connection through organization/site scope, decrypts the stored refresh token server-side, refreshes a short-lived Google access token, and calls the Search Console Sites API. The response includes property URLs, permission levels, and which property is currently selected; it never returns raw or encrypted tokens.

Response:

```json
{
  "data": {
    "siteId": "22222222-2222-4222-8222-222222222222",
    "connectedPropertyUrl": "sc-domain:example.com",
    "properties": [
      {
        "siteUrl": "sc-domain:example.com",
        "permissionLevel": "siteOwner",
        "selected": true
      }
    ]
  }
}
```

`POST /api/organizations/:organizationId/sites/:siteId/gsc/properties`

Selects the active Google Search Console property for a connected site when the current user can manage integrations and the request is same-origin. The endpoint resolves the active encrypted refresh token server-side, refreshes Google access, lists properties available to the connected Google account, verifies that `propertyUrl` exists in that list, then upserts the selected `GscConnection` by `siteId + propertyUrl`. The response returns connection and property metadata only; raw and encrypted refresh tokens are never returned.

Request:

```json
{
  "propertyUrl": "https://www.example.com/"
}
```

Response:

```json
{
  "data": {
    "siteId": "22222222-2222-4222-8222-222222222222",
    "connectedPropertyUrl": "https://www.example.com/",
    "connection": {
      "id": "55555555-5555-4555-8555-555555555555",
      "siteId": "22222222-2222-4222-8222-222222222222",
      "googleAccountEmail": "search@example.com",
      "propertyUrl": "https://www.example.com/",
      "connectedAt": "2026-07-09T10:00:00.000Z",
      "updatedAt": "2026-07-09T10:05:00.000Z",
      "disconnectedAt": null
    },
    "properties": [
      {
        "siteUrl": "https://www.example.com/",
        "permissionLevel": "siteFullUser",
        "selected": true
      }
    ]
  }
}
```

`GET /api/organizations/:organizationId/sites/:siteId/gsc/metrics`

Lists stored daily Google Search Console metrics for the scoped site. Optional `propertyUrl` filters rows to one connected property. The response is persisted SaaS data only and does not call Google.

Response:

```json
{
  "data": {
    "siteId": "22222222-2222-4222-8222-222222222222",
    "propertyUrl": "sc-domain:example.com",
    "metrics": [
      {
        "id": "44444444-4444-4444-8444-444444444444",
        "siteId": "22222222-2222-4222-8222-222222222222",
        "propertyUrl": "sc-domain:example.com",
        "date": "2026-07-01",
        "clicks": 12,
        "impressions": 120,
        "ctr": 0.1,
        "position": 4.2,
        "syncedAt": "2026-07-09T09:00:00.000Z"
      }
    ]
  }
}
```

`POST /api/organizations/:organizationId/sites/:siteId/gsc/metrics`

Syncs daily property-level Search Analytics metrics for a connected GSC property when the current user can manage integrations and the request is same-origin. The endpoint decrypts the refresh token server-side, refreshes a short-lived Google access token, queries Search Analytics grouped by `date`, and upserts rows by `siteId + propertyUrl + date`. Request body accepts optional `startDate` and `endDate` in `YYYY-MM-DD`; when omitted, the default range is the last finalized 30-to-3-day window. The response returns stored daily rows and never returns tokens.

`GET /api/organizations/:organizationId/sites/:siteId/gsc/insights`

Lists stored top page/query Google Search Console insights for the scoped site. Optional `propertyUrl` filters rows to one connected property. Optional `startDate` and `endDate` must be provided together in `YYYY-MM-DD`; when omitted, the response uses the latest synced range for the selected property. Optional `limit` bounds the number of returned rows. This endpoint reads persisted SaaS data only and does not call Google.

Response:

```json
{
  "data": {
    "siteId": "22222222-2222-4222-8222-222222222222",
    "propertyUrl": "sc-domain:example.com",
    "startDate": null,
    "endDate": null,
    "insights": [
      {
        "id": "66666666-6666-4666-8666-666666666666",
        "siteId": "22222222-2222-4222-8222-222222222222",
        "propertyUrl": "sc-domain:example.com",
        "startDate": "2026-07-01",
        "endDate": "2026-07-06",
        "page": "https://www.example.com/post/",
        "query": "content audit",
        "clicks": 42,
        "impressions": 420,
        "ctr": 0.1,
        "position": 2.4,
        "syncedAt": "2026-07-09T10:30:00.000Z"
      }
    ]
  }
}
```

`POST /api/organizations/:organizationId/sites/:siteId/gsc/insights`

Syncs top Search Analytics page/query rows for a connected GSC property when the current user can manage integrations and the request is same-origin. The endpoint decrypts the refresh token server-side, refreshes a short-lived Google access token, queries Search Analytics grouped by `page` and `query`, and replaces the stored snapshot for `siteId + propertyUrl + startDate + endDate`. Request body accepts optional `startDate`, `endDate`, and numeric `rowLimit`; when dates are omitted, the default range is the last finalized 30-to-3-day window. The response returns stored insight rows and never returns tokens.

## Billing Overview

`GET /api/organizations/:organizationId/billing`

Returns the tenant-scoped billing overview when the current user has `billing:read`. This read-only response includes the active plan catalog, current plan, current non-canceled subscription when one exists, feature gate usage, and provider-gated billing actions. New workspaces receive a local no-charge `TRIALING` subscription with no billing provider. Expired local no-provider Trial subscriptions are exposed as `PAST_DUE`, and gated feature usage returns `BILLING_TRIAL_EXPIRED` in `disabledCode`. The overview does not create checkout sessions, change subscriptions, or open a billing portal. Checkout actions are enabled only when a billing provider, secret, and target plan price ID are configured. Portal actions are enabled only for Stripe-backed subscriptions with a stored provider customer id and configured provider secret.

Response:

```json
{
  "data": {
    "currentPlan": {
      "id": "plan_pro",
      "code": "PRO",
      "name": "Pro",
      "monthlyPrice": 14900,
      "limits": {
        "sites": 5,
        "urlsPerSite": 50000,
        "users": 10,
        "aiCredits": 500,
        "apiAccess": false
      },
      "isActive": true
    },
    "subscription": {
      "id": "sub_11111111-1111-4111-8111-111111111111",
      "organizationId": "11111111-1111-4111-8111-111111111111",
      "status": "ACTIVE",
      "plan": {
        "id": "plan_pro",
        "code": "PRO",
        "name": "Pro",
        "monthlyPrice": 14900,
        "limits": {
          "sites": 5,
          "urlsPerSite": 50000,
          "users": 10,
          "aiCredits": 500,
          "apiAccess": false
        },
        "isActive": true
      },
      "trialEndsAt": null,
      "currentPeriodEnd": "2026-08-01T00:00:00.000Z",
      "provider": "stripe",
      "createdAt": "2026-07-01T00:00:00.000Z",
      "updatedAt": "2026-07-01T00:00:00.000Z"
    },
    "isFallbackTrial": false,
    "featureGates": [
      {
        "key": "sites",
        "label": "Sites",
        "used": 1,
        "limit": 5,
        "remaining": 4,
        "allowed": true,
        "disabledReason": null,
        "disabledCode": null
      },
      {
        "key": "users",
        "label": "Users",
        "used": 2,
        "limit": 10,
        "remaining": 8,
        "allowed": true,
        "disabledReason": null,
        "disabledCode": null
      }
    ],
    "actions": {
      "checkout": [
        {
          "type": "checkout",
          "label": "Current plan",
          "enabled": false,
          "provider": "none",
          "targetPlanCode": "PRO",
          "disabledReason": "Current plan.",
          "requiresBillingManage": true,
          "noMutation": true
        }
      ],
      "portal": {
        "type": "billing_portal",
        "label": "Manage billing",
        "enabled": false,
        "provider": "none",
        "targetPlanCode": null,
        "disabledReason": "Billing provider is not configured.",
        "requiresBillingManage": true,
        "noMutation": true
      }
    },
    "plans": [
      {
        "id": "plan_trial",
        "code": "TRIAL",
        "name": "Trial",
        "monthlyPrice": 0,
        "limits": {
          "sites": 1,
          "urlsPerSite": 500,
          "users": 2,
          "aiCredits": 0,
          "apiAccess": false
        },
        "isActive": true
      }
    ]
  }
}
```

`POST /api/organizations/:organizationId/billing/checkout`

Creates a provider-backed checkout session when the current user has `billing:manage`, the request is same-origin, and Stripe checkout is configured with `SCCC_BILLING_PROVIDER=stripe`, `SCCC_STRIPE_SECRET_KEY`, and the target plan price ID (`SCCC_STRIPE_PRICE_STARTER`, `SCCC_STRIPE_PRICE_PRO`, or `SCCC_STRIPE_PRICE_AGENCY`). The endpoint does not mutate local subscriptions; Stripe webhooks will own subscription state changes in a later iteration.

Request:

```json
{
  "planCode": "PRO"
}
```

Response:

```json
{
  "data": {
    "provider": "stripe",
    "targetPlanCode": "PRO",
    "sessionId": "cs_test_123",
    "url": "https://checkout.stripe.com/c/pay/cs_test_123"
  }
}
```

Checkout rejects current plan selections, Trial downgrades, and Enterprise sales-assisted plan changes with structured `409` errors. Missing provider or price configuration returns `503`.

`POST /api/organizations/:organizationId/billing/portal`

Creates a provider-backed billing portal session when the current user has `billing:manage`, the request is same-origin, the organization has an active Stripe subscription with a stored provider customer id, and Stripe is configured with `SCCC_BILLING_PROVIDER=stripe` and `SCCC_STRIPE_SECRET_KEY`. The endpoint does not mutate local subscriptions; Stripe webhooks will own subscription state changes in a later iteration.

Response:

```json
{
  "data": {
    "provider": "stripe",
    "sessionId": "bps_test_123",
    "url": "https://billing.stripe.com/p/session/bps_test_123"
  }
}
```

Portal creation returns `409 BILLING_SUBSCRIPTION_NOT_FOUND` when no paid subscription is connected. Missing provider configuration or missing provider customer id returns `503`.

`POST /api/billing/webhooks/stripe`

Receives Stripe billing webhooks and reconciles local subscription state after verifying the `Stripe-Signature` header against the raw request body with `STRIPE_WEBHOOK_SECRET`. This endpoint is provider-to-server only; it does not use the browser session cookie or same-origin CSRF checks. Unsigned, stale, invalid, or unconfigured requests are rejected before local billing state is mutated. Verified provider event ids are stored before subscription updates, and replayed event ids are acknowledged as `ignored` without repeating local mutations.

Handled event types:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Checkout and subscription events require tenant metadata (`organizationId`, `targetPlanCode`) or a configured price-id-to-plan mapping (`SCCC_STRIPE_PRICE_STARTER`, `SCCC_STRIPE_PRICE_PRO`, `SCCC_STRIPE_PRICE_AGENCY`). Unsupported or incomplete signed events are acknowledged as ignored.

Response:

```json
{
  "data": {
    "eventId": "evt_123",
    "eventType": "checkout.session.completed",
    "action": "subscription_created",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "planCode": "PRO"
  }
}
```

## Notifications

`GET /api/organizations/:organizationId/notifications`

Lists recent organization-scoped notifications when the current user is an active member with `organization:read`.

Current MVP notification types:

- `billing.limit.sites_reached`
- `billing.limit.users_reached`
- `bulk_operation.completed`
- `bulk_operation.failed`
- `bulk_operation.rolled_back`
- `bulk_operation.retry_started`

Optional query params:

- `read`: optional `read` or `unread`
- `limit`: number from `1` to `100`

Response:

```json
{
  "data": [
    {
      "id": "99999999-9999-4999-8999-999999999999",
      "organizationId": "11111111-1111-4111-8111-111111111111",
      "type": "bulk_operation.failed",
      "title": "Safe operation failed",
      "body": "Safe content operation failed for 1 of 1 item. Worker validation failed before applying changes.",
      "readAt": null,
      "createdAt": "2026-07-05T10:00:00.000Z"
    }
  ]
}
```

`PATCH /api/organizations/:organizationId/notifications`

Marks all unread organization-scoped notifications as read when the current user is an active member with `organization:read`. This endpoint is idempotent and requires the same browser same-origin guard as other browser mutations.

Request:

```json
{
  "read": true
}
```

Response:

```json
{
  "data": {
    "updatedCount": 3
  }
}
```

`PATCH /api/organizations/:organizationId/notifications/:notificationId`

Updates the organization-scoped read state for a notification when the current user is an active member with `organization:read`. This endpoint requires the same browser same-origin guard as other browser mutations.

Request:

```json
{
  "read": true
}
```

Response:

```json
{
  "data": {
    "id": "99999999-9999-4999-8999-999999999999",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "type": "bulk_operation.failed",
    "title": "Safe operation failed",
    "body": "Safe content operation failed for 1 of 1 item. Worker validation failed before applying changes.",
    "readAt": "2026-07-05T10:05:00.000Z",
    "createdAt": "2026-07-05T10:00:00.000Z"
  }
}
```

## Members

`GET /api/organizations/:organizationId/members`

Lists active, invited, suspended, and canceled members for the organization.

`POST /api/organizations/:organizationId/members`

Invites a member. `OWNER` cannot be assigned through this endpoint. The response includes the member summary, a one-time invite URL, and email delivery status. Store or send the raw URL immediately because only the token hash is persisted.

Invites are plan-gated by the current billing plan's `users` limit and local Trial access state. Active, invited, and suspended members count toward the limit; canceled members do not. When the limit is reached, the API returns `402 PLAN_USER_LIMIT_REACHED`. When a local no-provider Trial has expired, the API returns `402 BILLING_TRIAL_EXPIRED`.

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

`POST /api/plugin/connections/disconnect`

Disconnects a WordPress plugin connection through a signed plugin request. The plugin sends the current organization and site IDs, signs the body with the stored plugin token, and clears its local credentials only after the SaaS endpoint confirms the disconnect. The SaaS marks the site `DISCONNECTED`, sets `disconnectedAt`, increments the connection token version, invalidates unused connection challenges, and writes a `plugin.disconnected` activity log.

Request:

```json
{
  "organizationId": "11111111-1111-4111-8111-111111111111",
  "siteId": "22222222-2222-4222-8222-222222222222"
}
```

Response:

```json
{
  "data": {
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "siteId": "22222222-2222-4222-8222-222222222222",
    "status": "DISCONNECTED",
    "disconnectedAt": "2026-07-08T10:00:00.000Z",
    "invalidatedChallenges": 0,
    "alreadyDisconnected": false
  }
}
```

`POST /api/plugin/sync`

Receives signed sync batches from WordPress. The plugin sends posts/pages inventory items with external ID, type, URL, title, status, modified timestamp, and optional bounded metadata for author, publish date, featured image, taxonomies, locally computed word count, internal/outbound link counts, and SEO metadata from Yoast, Rank Math, or fallback WordPress title/robots/canonical signals. The endpoint authenticates, validates, upserts synced content items, records `lastSyncAt`, and returns the accepted item count.

The sync payload must not include WordPress post bodies. Metadata is optional for backward compatibility with older plugin payloads.

Example item:

```json
{
  "externalId": "post:123",
  "type": "post",
  "url": "https://example.com/post",
  "title": "Example post",
  "status": "publish",
  "modifiedAt": "2026-07-01T07:00:00.000Z",
  "metadata": {
    "authorId": 7,
    "authorName": "Editor",
    "publishedAt": "2026-06-01T07:00:00.000Z",
    "featuredImagePresent": true,
    "featuredImageId": 44,
    "featuredImageUrl": "https://example.com/image.jpg",
    "taxonomies": [{ "taxonomy": "category", "terms": ["Guides"] }],
    "wordCount": 1200,
    "internalLinkCount": 3,
    "externalLinkCount": 1,
    "seoPlugin": "yoast",
    "seoTitle": "Example SEO title",
    "metaDescription": "Example meta description for search snippets.",
    "canonicalUrl": "https://example.com/post",
    "robotsNoindex": false,
    "robotsNofollow": false
  }
}
```

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
    "metadata": {
      "authorId": 7,
      "authorName": "Editor",
      "publishedAt": "2026-06-01T07:00:00.000Z",
      "featuredImagePresent": true,
      "featuredImageId": 44,
      "featuredImageUrl": "https://example.com/image.jpg",
      "taxonomies": [{ "taxonomy": "category", "terms": ["Guides"] }],
      "wordCount": 1200,
      "internalLinkCount": 3,
      "externalLinkCount": 1,
      "seoPlugin": "yoast",
      "seoTitle": "Example SEO title",
      "metaDescription": "Example meta description for search snippets.",
      "canonicalUrl": "https://example.com/post",
      "robotsNoindex": false,
      "robotsNofollow": false
    },
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

Creates persisted backlog tasks from a synced content backlog candidate, a scoped audit issue, or all issues matching a scoped audit run/status. The server recomputes candidate details from the scoped content item and ignores user-supplied task titles or priority. Repeated candidate requests for the same organization, site, URL, and issue type return the existing task. Repeated audit issue requests for the same `auditIssueId` return the existing task. Repeated audit run requests create only missing tasks and return existing tasks for already converted issues.

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

Audit run request:

```json
{
  "auditId": "66666666-6666-4666-8666-666666666666",
  "status": "OPEN"
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

Audit run response:

```json
{
  "data": {
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "siteId": "22222222-2222-4222-8222-222222222222",
    "auditId": "66666666-6666-4666-8666-666666666666",
    "sourceStatus": "OPEN",
    "totalIssues": 2,
    "createdCount": 2,
    "existingCount": 0,
    "tasks": [
      {
        "id": "44444444-4444-4444-8444-444444444444",
        "auditIssueId": "77777777-7777-4777-8777-777777777777",
        "title": "Add a concise meta description.",
        "url": "https://example.com/page",
        "issueType": "audit.meta_description_missing",
        "status": "TODO",
        "severity": "HIGH"
      }
    ]
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
This moves the SaaS operation and items to `RUNNING`, records an activity log, and still does not
write to WordPress inline. When `REDIS_URL` is configured, the SaaS app enqueues a deterministic
`bulk-operation.execute` job on `sccc-bulk-operations`; otherwise the operation remains running for
manual or later worker result capture.

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

`POST /api/organizations/:organizationId/sites/:siteId/bulk-operations/:operationId/result`

Records execution results for a scoped `RUNNING` bulk operation when the member has `content_operation:confirm`.
This endpoint is worker-safe state capture for `COMPLETED` or `FAILED` results. It updates SaaS operation items, records an activity log, creates an organization notification, and does not perform WordPress writes inline.

Request:

```json
{
  "status": "FAILED",
  "message": "Worker validation failed before applying changes.",
  "itemResults": [
    {
      "itemId": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      "status": "FAILED",
      "error": "Meta title target is no longer valid."
    }
  ]
}
```

If `itemResults` is omitted, all operation items inherit the top-level `status`.
If any item result is `FAILED`, the operation is recorded as `FAILED`.

Response:

```json
{
  "data": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "FAILED",
    "items": [
      {
        "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "externalId": "https://example.com/post",
        "status": "FAILED",
        "error": "Meta title target is no longer valid."
      }
    ]
  }
}
```

### WordPress Plugin Apply Target

`POST /wp-json/sccc/v1/operations/apply`

This endpoint is hosted by the connected WordPress plugin, not by the SaaS app. It is the worker
target for running safe operation items after SaaS confirmation/start. Requests use the same
HMAC header scheme as plugin sync, signed against the WordPress REST path
`/wp-json/sccc/v1/operations/apply`, and must include matching `organizationId`, `siteId`,
`operationId`, and operation items.

The plugin accepts only bounded Yoast/Rank Math SEO metadata fields (`seoTitle`,
`metaDescription`, `canonicalUrl`, `robotsNoindex`, `robotsNofollow`) for synced `post_type:id`
targets and returns per-item `COMPLETED`/`FAILED` results with before/after values. Unsupported
fields are rejected per item and are not written. The worker requires an encrypted plugin token on
the WordPress connection; older hash-only connections must reconnect before outbound apply can be
signed. See [docs/PLUGIN_API.md](docs/PLUGIN_API.md) for the full WordPress-hosted apply contract.

`POST /api/organizations/:organizationId/sites/:siteId/bulk-operations/:operationId/retry`

Retries failed items for a scoped `FAILED` bulk operation when the member has `content_operation:confirm`.
This endpoint moves the SaaS operation back to `RUNNING`, resets only failed items to `RUNNING`, records an activity log, creates an organization notification, and does not perform WordPress writes inline.

Request:

```json
{
  "reason": "Retry after correcting the WordPress connection."
}
```

Response:

```json
{
  "data": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "RUNNING",
    "items": [
      {
        "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "externalId": "https://example.com/post",
        "status": "RUNNING",
        "error": null
      }
    ]
  }
}
```

`POST /api/organizations/:organizationId/sites/:siteId/bulk-operations/:operationId/rollback`

Records rollback for a scoped `COMPLETED` or `FAILED` bulk operation when the member has `content_operation:confirm`.
This endpoint marks the SaaS operation and items as `ROLLED_BACK`, records an activity log with the previous status, creates an organization notification, and does not perform WordPress writes inline.

Request:

```json
{
  "reason": "Restore previous metadata values after validation."
}
```

Response:

```json
{
  "data": {
    "id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    "status": "ROLLED_BACK",
    "items": [
      {
        "id": "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "externalId": "https://example.com/post",
        "status": "ROLLED_BACK",
        "error": null
      }
    ]
  }
}
```

## Assistant Recommendations

`GET /api/organizations/:organizationId/sites/:siteId/assistant/recommendations`

Lists read-only assistant recommendations for a tenant-scoped site when the member has `backlog:read`. The MVP derives recommendations from existing backlog tasks and synced content health evidence. It does not call an external AI provider, does not mutate WordPress or SaaS records, and returns the current AI-credit usage envelope without charging credits for deterministic recommendations. Backlog-sourced recommendations may include an enabled safe-preview action; unsupported sources return disabled controls with a reason.

Optional query params:

- `limit`: number from `1` to `25`

Response:

```json
{
  "data": {
    "recommendations": [
      {
        "id": "backlog:44444444-4444-4444-8444-444444444444",
        "organizationId": "11111111-1111-4111-8111-111111111111",
        "siteId": "22222222-2222-4222-8222-222222222222",
        "title": "Update SEO title",
        "rationale": "Search snippets can underperform.",
        "nextStep": "Assign or schedule this task before preparing a safe operation preview.",
        "priority": "high",
        "source": {
          "type": "backlog_task",
          "id": "44444444-4444-4444-8444-444444444444",
          "label": "Backlog task",
          "url": "https://example.com/post",
          "detail": "todo / high"
        },
        "action": {
          "type": "safe_preview",
          "label": "Prepare preview",
          "enabled": true,
          "requiresManualConfirmation": true,
          "targetTaskId": "44444444-4444-4444-8444-444444444444",
          "disabledReason": null
        },
        "noMutation": true,
        "safeguards": ["recommendation_only", "manual_confirmation_required", "no_wordpress_write"]
      }
    ],
    "usage": {
      "metric": "ai_credits",
      "periodStart": "2026-07-01T00:00:00.000Z",
      "periodEnd": "2026-08-01T00:00:00.000Z",
      "used": 0,
      "limit": 500,
      "remaining": 500,
      "limited": false,
      "metered": false
    }
  }
}
```

## Audits

`POST /api/organizations/:organizationId/sites/:siteId/audits`

Creates a metadata audit when the member has `audit:run`. The MVP creates a tenant-scoped audit record, materializes issues from already-synced WordPress metadata health signals such as thin content, missing SEO title/meta description, noindex, canonical mismatch, and missing internal links, and marks that metadata audit pass as `COMPLETED` with start/completion timestamps. It does not crawl external URLs or mutate WordPress content inline.

Response:

```json
{
  "data": {
    "id": "66666666-6666-4666-8666-666666666666",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "siteId": "22222222-2222-4222-8222-222222222222",
    "status": "COMPLETED",
    "startedAt": "2026-07-02T10:00:00.000Z",
    "completedAt": "2026-07-02T10:00:00.000Z",
    "createdAt": "2026-07-02T10:00:00.000Z",
    "issueSummary": {
      "total": 5,
      "open": 5,
      "resolved": 0,
      "high": 1,
      "critical": 0
    }
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
      "status": "COMPLETED",
      "startedAt": "2026-07-02T10:00:00.000Z",
      "completedAt": "2026-07-02T10:00:00.000Z",
      "createdAt": "2026-07-02T10:00:00.000Z",
      "issueSummary": {
        "total": 5,
        "open": 5,
        "resolved": 0,
        "high": 1,
        "critical": 0
      }
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
