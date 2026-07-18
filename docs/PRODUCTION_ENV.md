# Production Environment And Secrets

This matrix is the launch gate for staging and production environments. Copy
`.env.production.example` to an untracked environment file, fill real values from
the secret manager, then run the verifier before building or starting the stack.

```bash
npm run deploy:env:check -- --env-file .env.production.local --environment production
```

To validate the committed template shape without real secrets:

```bash
npm run deploy:env:check -- --env-file .env.production.example --allow-placeholders
```

`--allow-placeholders` is only for templates and documentation checks. Real
staging and production runs must fail if required values are empty, local-only,
or still contain placeholders.

## Core Runtime

| Variable                    | Required | Owner    | Notes                                                                                          |
| --------------------------- | -------- | -------- | ---------------------------------------------------------------------------------------------- |
| `NODE_ENV`                  | Yes      | Platform | Must be `production` for staging and production builds.                                        |
| `NEXT_PUBLIC_APP_URL`       | Yes      | Platform | Public SaaS HTTPS origin, no path. Also a Docker build arg.                                    |
| `NEXT_PUBLIC_MARKETING_URL` | Yes      | Platform | Public marketing HTTPS origin, no path. Must differ from SaaS origin. Also a Docker build arg. |
| `DATABASE_URL`              | Yes      | Platform | PostgreSQL URL used by SaaS, worker, and migration runner. Use managed Postgres in production. |
| `REDIS_URL`                 | Yes      | Platform | Redis or TLS Redis URL for BullMQ queues and multi-instance rate limits.                       |
| `SCCC_DATA_STORE`           | Yes      | Platform | Must be `prisma`; production must not use the in-memory store.                                 |
| `SCCC_RATE_LIMIT_STORE`     | Optional | Platform | Leave empty for Redis-backed limits. `memory` is local/single-instance only.                   |
| `SCCC_WORKER_HEALTH_PORT`   | Yes      | Platform | Private worker health listener port. Keep behind localhost, VPN, or private load balancer.     |

## Application Secrets

| Variable                     | Required | Owner    | Notes                                                                                                                                                                           |
| ---------------------------- | -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AUTH_SECRET`                | Yes      | Security | Session/state signing secret, at least 32 characters. Rotate by forcing session re-login.                                                                                       |
| `SCCC_PLUGIN_SIGNING_SECRET` | Yes      | Security | Server-side plugin challenge/signing secret, at least 32 characters. Rotating may require plugin reconnects depending on active flows.                                          |
| `SCCC_TOKEN_ENCRYPTION_KEY`  | Yes      | Security | Encryption key for recoverable tokens and TOTP/GSC/plugin apply secrets, at least 32 characters. Back it up before launch; losing it makes encrypted credentials unrecoverable. |

Generate new secrets with a cryptographically secure source, for example:

```bash
openssl rand -base64 48
```

## Email

| Variable               | Required           | Owner         | Notes                                                                                                  |
| ---------------------- | ------------------ | ------------- | ------------------------------------------------------------------------------------------------------ |
| `SCCC_EMAIL_TRANSPORT` | Yes                | Platform      | Must be `smtp` outside tests/local UI work.                                                            |
| `SCCC_EMAIL_FROM`      | Yes                | Marketing/Ops | Verified sender address used for invites, password reset, and email verification.                      |
| `SCCC_SMTP_HOST`       | Yes                | Platform      | Managed SMTP host.                                                                                     |
| `SCCC_SMTP_PORT`       | Yes                | Platform      | Integer port, commonly `587` or `465`.                                                                 |
| `SCCC_SMTP_SECURE`     | Optional           | Platform      | `true` for implicit TLS providers.                                                                     |
| `SCCC_SMTP_USER`       | Provider-dependent | Platform      | Set together with `SCCC_SMTP_PASSWORD`, or leave both empty only if the provider explicitly allows it. |
| `SCCC_SMTP_PASSWORD`   | Provider-dependent | Security      | Store only in the secret manager.                                                                      |

## Marketing Lead Webhook

| Variable                             | Required    | Owner         | Notes                                                                                                        |
| ------------------------------------ | ----------- | ------------- | ------------------------------------------------------------------------------------------------------------ |
| `SCCC_MARKETING_LEAD_WEBHOOK_URL`    | Yes         | Marketing/Ops | HTTPS endpoint for demo lead events. Production demo requests fail visibly when this is absent or unhealthy. |
| `SCCC_MARKETING_LEAD_WEBHOOK_SECRET` | Recommended | Security      | Bearer token sent to the webhook. Required unless the endpoint has another authentication layer.             |

## Billing

| Variable                         | Required | Owner        | Notes                                                                                                                   |
| -------------------------------- | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `SCCC_BILLING_PROVIDER`          | Yes      | Finance/Ops  | Must be `stripe` for production checkout and portal flows.                                                              |
| `SCCC_STRIPE_SECRET_KEY`         | Yes      | Finance/Ops  | Stripe restricted secret key with checkout, billing portal, customer, subscription, and price access needed by the app. |
| `SCCC_STRIPE_PRICE_STARTER`      | Yes      | Finance/Ops  | Starter recurring price id.                                                                                             |
| `SCCC_STRIPE_PRICE_PRO`          | Yes      | Finance/Ops  | Pro recurring price id.                                                                                                 |
| `SCCC_STRIPE_PRICE_AGENCY`       | Yes      | Finance/Ops  | Agency recurring price id.                                                                                              |
| `SCCC_BILLING_SUCCESS_URL`       | Yes      | Product/Ops  | HTTPS return URL after checkout success.                                                                                |
| `SCCC_BILLING_CANCEL_URL`        | Yes      | Product/Ops  | HTTPS return URL after checkout cancel.                                                                                 |
| `SCCC_BILLING_PORTAL_RETURN_URL` | Yes      | Product/Ops  | HTTPS return URL from the customer portal.                                                                              |
| `STRIPE_WEBHOOK_SECRET`          | Yes      | Security/Ops | Stripe endpoint signing secret, at least 32 characters.                                                                 |

Before launch, send one signed Stripe webhook event to staging and confirm
idempotent reconciliation in the SaaS database.

## Google Search Console

| Variable                 | Required | Owner        | Notes                                                                                   |
| ------------------------ | -------- | ------------ | --------------------------------------------------------------------------------------- |
| `SCCC_GSC_CLIENT_ID`     | Yes      | Platform/Ops | OAuth client id for the SaaS public origin.                                             |
| `SCCC_GSC_CLIENT_SECRET` | Yes      | Security/Ops | OAuth client secret, stored only in the secret manager.                                 |
| `SCCC_GSC_REDIRECT_URI`  | Yes      | Platform/Ops | Must be `https://<NEXT_PUBLIC_APP_URL>/api/integrations/gsc/callback`.                  |
| `SCCC_GSC_STATE_SECRET`  | Yes      | Security/Ops | OAuth state signing secret. Use a dedicated secret instead of relying on `AUTH_SECRET`. |

The verifier checks that the redirect URI uses the same origin as
`NEXT_PUBLIC_APP_URL` and the exact callback path used by the SaaS app.

## Observability

| Variable             | Required | Owner        | Notes                                                                     |
| -------------------- | -------- | ------------ | ------------------------------------------------------------------------- |
| `SENTRY_DSN`         | Yes      | Platform/Ops | HTTPS DSN for SaaS request errors and worker job failures.                |
| `SENTRY_ENVIRONMENT` | Yes      | Platform/Ops | `staging` or `production`; keep names consistent with release dashboards. |
| `POSTHOG_KEY`        | Yes      | Product/Ops  | Server analytics project key.                                             |
| `POSTHOG_HOST`       | Optional | Product/Ops  | HTTPS ingestion host override; leave empty for the default PostHog cloud. |

Telemetry payloads are explicit and secret-free by contract. Do not add request
bodies, headers, cookies, prompts, tokens, or raw env values to telemetry.

## Optional Assistant AI

| Variable           | Required                   | Owner        | Notes                                                                             |
| ------------------ | -------------------------- | ------------ | --------------------------------------------------------------------------------- |
| `SCCC_AI_PROVIDER` | Optional                   | Product/Ops  | Supported value: `anthropic`. Leave empty for deterministic-only recommendations. |
| `SCCC_AI_API_KEY`  | Required when provider set | Security/Ops | Provider API key, at least 32 characters.                                         |
| `SCCC_AI_MODEL`    | Optional                   | Product/Ops  | Override the default assistant model.                                             |

The AI provider is not part of the minimum launch gate. If enabled, verify
AI-credit metering and plan-limit behavior in staging.

## Backup Restore Smoke

| Variable                         | Required          | Owner        | Notes                                                                                               |
| -------------------------------- | ----------------- | ------------ | --------------------------------------------------------------------------------------------------- |
| `SCCC_RESTORE_TEST_DATABASE_URL` | Staging/rehearsal | Platform/Ops | Disposable restore target for `npm run verify:backup-restore`. Never point this at production data. |

Run restore verification before final cutover and then quarterly:

```bash
DATABASE_URL=postgresql://... \
SCCC_RESTORE_TEST_DATABASE_URL=postgresql://... \
npm run verify:backup-restore
```

## Rotation Notes

- Store production values in the deployment secret manager, not in git, shell
  history, screenshots, or shared docs.
- Rotate provider credentials in staging first, then production.
- Rotating `SCCC_TOKEN_ENCRYPTION_KEY` requires a planned re-encryption or
  reconnect path for encrypted GSC/plugin/TOTP values.
- Rotating plugin-related secrets can require affected WordPress sites to
  reconnect before worker apply/rollback can sign outbound requests.
- After any `NEXT_PUBLIC_*` origin change, rebuild SaaS and marketing images
  because these values are embedded into Next.js public output.
