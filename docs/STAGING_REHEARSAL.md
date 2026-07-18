# Staging End-To-End Release Rehearsal

This runbook is the Iteration 110 launch gate. It proves that the packaged
WordPress plugin, staging SaaS, staging marketing site, worker process, Google
Search Console OAuth, billing webhooks, and review-first safe operation flow all
work together before production cutover.

Use a real staging SaaS origin, a real staging WordPress site, Stripe test mode,
a Search Console property owned by the test Google account, and non-production
credentials only.

## Automated Preflight

Create an untracked staging env file from the production template:

```bash
cp .env.production.example .env.staging.local
```

Fill it with real staging values, then run:

```bash
npm run deploy:staging:rehearse
```

The script performs:

- `npm run deploy:env:check -- --env-file .env.staging.local --environment staging`
- `npm run plugin:package`
- `npm run deploy:smoke` against staging SaaS and marketing URLs

If the worker health endpoint is reachable only from a private network, connect
to that network and set:

```bash
SCCC_STAGING_WORKER_HEALTH_URL=https://worker-health.staging.example.com/healthz \
npm run deploy:staging:rehearse
```

Useful overrides:

| Variable                           | Purpose                                                    |
| ---------------------------------- | ---------------------------------------------------------- |
| `SCCC_STAGING_ENV_FILE`            | Env file path, default `.env.staging.local`.               |
| `SCCC_STAGING_SAAS_URL`            | Override SaaS smoke URL.                                   |
| `SCCC_STAGING_MARKETING_URL`       | Override marketing smoke URL.                              |
| `SCCC_STAGING_WORKER_HEALTH_URL`   | Enable worker `/healthz` smoke from a private network.     |
| `SCCC_STAGING_TIMEOUT_SECONDS`     | HTTP smoke timeout, default `8`.                           |
| `SCCC_STAGING_SKIP_ENV_CHECK`      | Skip env gate only when it already passed in the same run. |
| `SCCC_STAGING_SKIP_PLUGIN_PACKAGE` | Skip plugin package only when installing an existing zip.  |
| `SCCC_STAGING_SKIP_SMOKE`          | Skip HTTP smoke only during a targeted manual rerun.       |

## Evidence Header

Record this before manual checks:

| Field                    | Value |
| ------------------------ | ----- |
| Rehearsal date           |       |
| Git commit SHA           |       |
| Staging SaaS URL         |       |
| Staging marketing URL    |       |
| Staging WordPress URL    |       |
| Plugin zip path/version  |       |
| Staging env check result |       |
| Smoke result             |       |
| Operator                 |       |

## 1. Plugin Challenge Exchange

Goal: a real staging WordPress admin connects to the staging SaaS through the
normal challenge flow, without seeding credentials directly.

Steps:

1. Create or select a staging organization and staging site in the SaaS app.
2. Start the plugin connection flow from the SaaS dashboard.
3. Install the zip built by `npm run plugin:package` on the staging WordPress
   site.
4. Complete the challenge exchange from the WordPress admin UI.
5. Confirm the WordPress settings page shows connected organization/site scope.
6. Confirm the SaaS dashboard shows the site as connected.
7. Confirm an activity log entry exists for `plugin.connected`.

Pass criteria:

- Challenge can be used once only.
- WordPress stores connection credentials with no visible raw token.
- SaaS never displays token secrets after exchange.
- No plugin token, signature, authorization header, or endpoint secret appears
  in logs.

Evidence:

| Check                        | Result | Notes |
| ---------------------------- | ------ | ----- |
| SaaS challenge created       |        |       |
| WordPress exchange completed |        |       |
| SaaS connection visible      |        |       |
| Activity log checked         |        |       |
| Secret-free logs checked     |        |       |

## 2. Paginated WordPress Sync

Goal: real plugin sync moves more than one inventory batch into the staging SaaS.

Fixture requirement: the staging WordPress site should have at least 250
published/draft posts or pages so pagination crosses the 200-item batch size.

Steps:

1. Trigger manual sync from the WordPress plugin settings page.
2. Let Action Scheduler process jobs if installed; otherwise let the WP-Cron
   fallback run or trigger it once through the staging admin.
3. Open the plugin sync log and confirm multiple batches were sent.
4. Open SaaS synced content inventory and confirm item count exceeds one batch.
5. Open a synced content detail panel and confirm title, status, modified date,
   word count, links, SEO metadata, canonical, and robots fields are present.

Pass criteria:

- Sync batches are ordered and continue past the first 200 items.
- Posts without permalinks do not end pagination early.
- SaaS inventory remains scoped to the selected organization/site.
- Sync logs redact tokens, signatures, authorization values, and full endpoint
  secrets.

Evidence:

| Check                     | Result | Notes |
| ------------------------- | ------ | ----- |
| Fixture count over 200    |        |       |
| Multiple batches observed |        |       |
| SaaS inventory count      |        |       |
| Metadata detail checked   |        |       |
| Redacted logs checked     |        |       |

## 3. Google Search Console OAuth And Sync

Goal: staging OAuth connects a real Search Console account, selects a property,
stores encrypted refresh tokens, and syncs persisted metrics/insights.

Steps:

1. Confirm `SCCC_GSC_REDIRECT_URI` exactly matches the staging SaaS callback.
2. Start the GSC connect flow from the staging site dashboard.
3. Complete OAuth with the staging Google account.
4. Confirm the selected property is the exact URL-prefix or matching
   `sc-domain:` property.
5. Trigger manual metric sync and insight sync from the dashboard.
6. Confirm the worker scheduled sync is enabled and can enqueue daily jobs.
7. Confirm traffic loss and opportunity panels read persisted data only.

Pass criteria:

- OAuth state is accepted once and scoped to the correct user/org/site.
- API responses never expose raw or encrypted refresh tokens.
- Metrics and insights are stored with the selected property URL.
- GSC sync failures are visible without leaking tokens.

Evidence:

| Check                             | Result | Notes |
| --------------------------------- | ------ | ----- |
| OAuth callback completed          |        |       |
| Property selected                 |        |       |
| Metrics persisted                 |        |       |
| Insights persisted                |        |       |
| Scheduled worker sync checked     |        |       |
| Token-free responses/logs checked |        |       |

## 4. Marketing Demo Webhook

Goal: the public staging marketing site delivers validated demo leads to the
configured webhook and fails visibly when delivery is unavailable.

Steps:

1. Submit a valid demo form on the staging marketing site.
2. Confirm the webhook receives a `marketing.demo_requested` event.
3. Confirm the `Authorization: Bearer ...` header is present when the secret is
   configured.
4. Submit an invalid email/URL and confirm validation blocks delivery.
5. Submit a honeypot-filled request through a controlled test and confirm no
   webhook delivery.

Pass criteria:

- Valid demo lead reaches the webhook once.
- Validation and honeypot checks stop bad deliveries.
- Production-like missing/unhealthy webhook behavior shows an explicit error.

Evidence:

| Check                 | Result | Notes |
| --------------------- | ------ | ----- |
| Valid lead delivered  |        |       |
| Bearer secret checked |        |       |
| Invalid form blocked  |        |       |
| Honeypot blocked      |        |       |

## 5. Stripe Billing Webhook

Goal: Stripe test mode can reconcile subscription state through the signed
staging webhook endpoint, and replayed provider events are idempotent.

Steps:

1. Confirm checkout opens with staging/test Stripe prices.
2. Complete a test checkout session.
3. Send a signed Stripe webhook event to
   `/api/billing/webhooks/stripe`.
4. Confirm local subscription state updates in the staging SaaS.
5. Replay the same event and confirm it is acknowledged as already handled
   without duplicate mutation.
6. Send an unsigned or stale event and confirm it is rejected.

Pass criteria:

- Only signed, fresh Stripe test-mode events mutate billing state.
- Provider event ids are recorded before subscription mutation.
- Replay does not duplicate subscription updates.

Evidence:

| Check                     | Result | Notes |
| ------------------------- | ------ | ----- |
| Checkout test completed   |        |       |
| Signed webhook reconciled |        |       |
| Replay ignored/idempotent |        |       |
| Invalid webhook rejected  |        |       |

## 6. Safe Operation Worker Flow

Goal: a real synced item can move from evidence to safe operation execution only
through preview, dry run, explicit confirmation, worker execution, and visible
per-item results.

Use a disposable staging WordPress page whose SEO metadata can be changed and
restored.

Steps:

1. Create or find an audit/backlog issue backed by synced content and supported
   Yoast or Rank Math metadata.
2. Create a safe operation preview.
3. Run dry run and confirm no WordPress metadata changed.
4. Type `CONFIRM` and start the operation.
5. Confirm the worker enqueues and processes `bulk-operation.execute`.
6. Confirm the WordPress plugin receives a signed apply request and records
   bounded before/after values.
7. Start rollback for the completed item and confirm
   `bulk-operation.rollback` restores captured previous metadata.
8. Trigger one controlled failure, then confirm retry mode and per-item status
   summaries are visible.

Pass criteria:

- No WordPress write happens before worker execution.
- Signed apply writes only bounded Yoast/Rank Math fields.
- Rollback restores captured previous values through the worker.
- Activity logs and notifications exist for lifecycle outcomes.
- Retry path remains queue-backed and does not perform inline writes.

Evidence:

| Check                           | Result | Notes |
| ------------------------------- | ------ | ----- |
| Preview created                 |        |       |
| Dry run passed/no WP write      |        |       |
| Confirm/start accepted          |        |       |
| Worker execution completed      |        |       |
| Plugin before/after captured    |        |       |
| Rollback restored value         |        |       |
| Retry/status visibility checked |        |       |

## Exit Criteria

The rehearsal is complete only when every section above has recorded evidence
and no launch-blocking issue remains open.

Block launch if any of these occur:

- Env check fails without `--allow-placeholders`.
- Staging smoke fails for SaaS or marketing.
- Plugin challenge exchange cannot complete through the real UI flow.
- Paginated sync cannot cross the first batch.
- GSC OAuth stores no usable connection or exposes token data.
- Demo webhook delivery is unavailable.
- Stripe webhook signature/idempotency checks fail.
- Safe operation writes before confirmation/worker execution.
- Rollback cannot restore a restorable completed item.

Carry non-blocking notes into Iteration 111's server smoke and rollback runbook.
