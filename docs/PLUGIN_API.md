# WordPress Plugin API

This document is the implementation contract for connecting a WordPress site to the SaaS app,
syncing bounded content inventory metadata, and disconnecting a plugin connection.

The current MVP intentionally syncs inventory metadata only. It does not send WordPress post bodies,
does not crawl external URLs from the SaaS app, and does not mutate WordPress content inline.

## Base URL

Use the SaaS app origin as the endpoint base, for example:

```text
https://app.example.com
```

The local development default is:

```text
http://localhost:3000
```

## Connection Flow

### 1. Create a connection challenge

`POST /api/plugin/connections/challenges`

This is a browser-authenticated SaaS endpoint. The current user must be an active organization
member with integration management permission, and the request must pass the same-origin browser
guard.

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
    "siteId": "22222222-2222-4222-8222-222222222222",
    "challenge": "opaque-challenge-token",
    "expiresAt": "2026-07-08T10:10:00.000Z"
  }
}
```

Challenge tokens are stored hashed by the SaaS app, expire after 10 minutes, and are one-time use.

### 2. Exchange the challenge from WordPress

`POST /api/plugin/connections/exchange`

The WordPress plugin sends the one-time challenge and the endpoint it will use for future signed
requests.

Request:

```json
{
  "challenge": "opaque-challenge-token",
  "endpoint": "https://app.example.com"
}
```

Response:

```json
{
  "data": {
    "siteId": "22222222-2222-4222-8222-222222222222",
    "organizationId": "11111111-1111-4111-8111-111111111111",
    "token": "opaque-plugin-token",
    "tokenVersion": 1,
    "endpoint": "https://app.example.com"
  }
}
```

The plugin token is returned only once. The SaaS app stores only its hash. The WordPress plugin stores
the raw token in local options with autoload disabled.

## Signed Requests

The sync and plugin-initiated disconnect endpoints require HMAC signatures.

Required headers:

- `X-SCCC-Site-Id`: connected SaaS site ID.
- `X-SCCC-Timestamp`: Unix timestamp in seconds.
- `X-SCCC-Signature`: lowercase hex HMAC-SHA256 signature.
- `X-SCCC-Token`: raw plugin token received during challenge exchange.

Signature payload:

```text
METHOD + "\n" + PATH + "\n" + TIMESTAMP + "\n" + SHA256(BODY)
```

Then sign that payload with HMAC-SHA256 using the raw plugin token.

Example:

```text
POST
/api/plugin/sync
1783524000
4e46e8f2e8f5...
```

The timestamp tolerance is 300 seconds. The SaaS app rejects missing, expired, malformed, mismatched,
disconnected, or invalid-token signatures with `401`.

## Content Sync

`POST /api/plugin/sync`

The plugin sends a signed batch of content inventory items for the connected site.

Request:

```json
{
  "organizationId": "11111111-1111-4111-8111-111111111111",
  "siteId": "22222222-2222-4222-8222-222222222222",
  "cursor": null,
  "items": [
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
  ]
}
```

Response:

```json
{
  "data": {
    "accepted": 1,
    "cursor": null
  }
}
```

Payload rules:

- `items` accepts up to 250 items per request.
- `externalId` is unique per connected site.
- `type` is one of `post`, `page`, `custom_post_type`, or `taxonomy`.
- `metadata` is optional for backward compatibility.
- Unknown metadata keys are rejected.
- WordPress post bodies, secrets, signatures, and endpoint URLs must not be included in item
  metadata.

The SaaS app upserts synced items by `siteId + externalId`, updates `lastSeenAt`, stores bounded
metadata as JSON, and records `lastSyncAt` on the connection.

## Metadata Contract

Supported metadata keys:

- `authorId`: non-negative integer or `null`.
- `authorName`: string up to 255 characters or `null`.
- `publishedAt`: ISO datetime string or `null`.
- `featuredImagePresent`: boolean.
- `featuredImageId`: non-negative integer or `null`.
- `featuredImageUrl`: URL up to 2048 characters or `null`.
- `taxonomies`: up to 32 taxonomy groups, each with up to 100 term names.
- `wordCount`: non-negative integer up to 1,000,000 or `null`.
- `internalLinkCount`: non-negative integer up to 1,000,000 or `null`.
- `externalLinkCount`: non-negative integer up to 1,000,000 or `null`.
- `seoPlugin`: `yoast`, `rank_math`, or `fallback`.
- `seoTitle`: string up to 512 characters or `null`.
- `metaDescription`: string up to 1024 characters or `null`.
- `canonicalUrl`: URL up to 2048 characters or `null`.
- `robotsNoindex`: boolean or `null`.
- `robotsNofollow`: boolean or `null`.

The official WordPress plugin computes word count and link counts locally from post content, extracts
bounded Yoast/Rank Math/fallback SEO metadata, then sends only the resulting metadata.

## Plugin-Initiated Disconnect

`POST /api/plugin/connections/disconnect`

The plugin sends a signed disconnect request before clearing local credentials.

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

Disconnecting marks the SaaS site as `DISCONNECTED`, increments the token version, invalidates unused
connection challenges, and writes an activity log. Replayed disconnects are safe and return
`alreadyDisconnected: true` after the first successful disconnect.

## Error Codes

Connection challenge:

- `401 AUTH_REQUIRED`
- `403 CSRF_INVALID`
- `403 FORBIDDEN`
- `404 ORGANIZATION_NOT_FOUND`
- `404 SITE_NOT_FOUND`
- `422 VALIDATION_ERROR`

Challenge exchange:

- `404 CONNECTION_CHALLENGE_NOT_FOUND`
- `400 CONNECTION_EXCHANGE_FAILED`
- `409 CONNECTION_CHALLENGE_USED`
- `410 CONNECTION_CHALLENGE_EXPIRED`
- `422 VALIDATION_ERROR`

Signed sync:

- `400 INVALID_JSON`
- `401 PLUGIN_SIGNATURE_MISSING`
- `401 PLUGIN_SIGNATURE_INVALID`
- `401 PLUGIN_SIGNATURE_EXPIRED`
- `401 PLUGIN_TOKEN_INVALID`
- `401 PLUGIN_CONNECTION_NOT_FOUND`
- `403 PLUGIN_SYNC_SCOPE_MISMATCH`
- `400 PLUGIN_SYNC_FAILED`
- `422 VALIDATION_ERROR`

Signed disconnect:

- `400 INVALID_JSON`
- `401 PLUGIN_SIGNATURE_MISSING`
- `401 PLUGIN_SIGNATURE_INVALID`
- `401 PLUGIN_SIGNATURE_EXPIRED`
- `401 PLUGIN_TOKEN_INVALID`
- `401 PLUGIN_CONNECTION_NOT_FOUND`
- `403 PLUGIN_DISCONNECT_SCOPE_MISMATCH`
- `404 SITE_NOT_FOUND`
- `400 PLUGIN_DISCONNECT_FAILED`
- `422 VALIDATION_ERROR`

## Operational Notes

- Keep plugin servers time-synchronized. Signed requests outside the 300-second tolerance fail.
- Treat the raw plugin token as a secret. Never log it and never send it inside synced metadata.
- Retry sync batches safely. The SaaS app upserts by site and external ID.
- Clear local credentials only after a successful plugin-initiated disconnect response.
- Use the API specification for broader SaaS endpoint details: [API_SPEC.md](../API_SPEC.md).
