# Security

## Core Requirements

- Organization-scoped authorization on every SaaS data access.
- RBAC for Owner, Admin, SEO Manager, Editor, Writer, Viewer, Billing Manager.
- Owner role changes require a dedicated ownership transfer flow.
- Generic member role management must not allow self-demotion.
- CSRF protection for browser mutations through same-origin `Origin` checks.
- Password hashes use `scrypt`; plaintext passwords must never be stored.
- Session cookies must be HTTP-only, same-site, and secure in production.
- Session tokens must be stored as hashes in the database.
- Password reset tokens must be stored as hashes, expire quickly, avoid account enumeration, and invalidate active sessions after use.
- Email verification tokens must be stored as hashes, expire quickly, and never appear in logs or API responses.
- Invite tokens must be stored as hashes, expire, and be accepted only by the invited email.
- Pending invite resend must rotate the token; cancel must clear the stored token hash.
- Invite email bodies must not log raw tokens; raw invite URLs may appear only in the intended email/API response.
- WordPress connection challenges and plugin tokens must be stored as hashes; sync requests must be timestamped and HMAC-signed.
- Rate limiting for auth, invite flows, safe content operation mutations, WordPress plugin endpoints (challenge creation, challenge exchange, sync, disconnect), and the Stripe billing webhook.
- Rate limit counters use Redis when `REDIS_URL` is configured so limits survive multiple SaaS instances; the in-memory fallback (no `REDIS_URL`, `SCCC_RATE_LIMIT_STORE=memory`, or a Redis outage) is process-local and acceptable only for a single instance.
- Plugin endpoint rate limits run before signature verification so unauthenticated brute force against plugin tokens and challenges is throttled by client IP.
- Signed plugin API requests.
- Token encryption at rest where secrets must be recoverable.
- Token hashing where secrets do not need to be recoverable.
- Token rotation and disconnect.
- Webhook signature validation.
- SQL injection protection through parameterized ORM queries.
- XSS protection through escaping and safe rendering.
- SSRF protection for URL fetchers.
- File upload validation.
- No sensitive values in logs.

## WordPress Plugin Security

- Capability checks for every admin action.
- Nonce checks for every form/action.
- `sanitize_*` for inputs.
- `esc_*` for outputs.
- Prepared queries if direct SQL is ever used.
- Options containing secrets use `autoload = false`.
- Plugin connection tokens are stored in WordPress options only after one-time challenge exchange.
- Plugin admin feedback notices must map only known redirect status/error codes and must not render arbitrary query-string messages.
- Plugin disconnect requests are signed with the active plugin token before local credentials are cleared, so SaaS can invalidate the server-side connection first.
- Plugin sync inventory contains bounded metadata only; content bodies are not sent in the MVP sync payload, word count and link counts are computed locally in the plugin, and SEO plugin metadata is limited to title, description, canonical URL, robots directives, and source.
- Plugin sync logs must be bounded and sanitize failure details so tokens, signatures, authorization values, and endpoint URLs are not stored.
- Plugin recurring sync jobs must use the same signed sync path as manual sync, and scheduled sync jobs must be unscheduled when the site disconnects or the plugin deactivates.
- Synced WordPress content listings must stay tenant-scoped through organization/site membership checks.
- Synced content search, filters, and pagination must be applied only after organization/site scope is fixed.
- Synced content detail endpoints must not fetch by item ID alone; organization and site scope are required.
- Computed content health signals must use synced metadata only, including canonical, robots, and link-count metadata, and must not fetch external URLs inline.
- Computed backlog candidate tasks are advisory only and must not trigger WordPress mutations without preview, dry run, and confirmation.
- Creating metadata audits requires audit run permission and organization/site scoping.
- Creating metadata audits may materialize issues only from scoped synced metadata already stored for the site; it must not crawl URLs, fetch external content, or mutate WordPress inline.
- Listing audits requires audit read permission and organization/site scoping before status filters are applied.
- Audit run issue summaries must be computed only from audit issues scoped to the requested organization, site, and audit IDs.
- Listing audit issues requires audit read permission and organization/site/audit scoping before filters are applied.
- Exporting audit issues requires audit read permission and organization/site/audit-scoped filters.
- Updating audit issue status requires audit run permission and organization/site/audit/issue scoping.
- Creating persisted backlog tasks from candidates requires backlog update permission and server-side candidate recomputation.
- Creating persisted backlog tasks from audit issues requires backlog update permission and organization/site/issue scoping.
- Creating backlog tasks in bulk from an audit requires backlog update permission and organization/site/audit scoping before issues are selected.
- Listing persisted backlog tasks requires backlog read permission and organization/site scoping.
- Backlog search, filters, and summary counts must be applied only after organization/site scope is fixed.
- Updating backlog task status requires backlog update permission and organization/site/task scoping.
- Updating backlog assignee or due date requires backlog update permission and active same-organization assignee validation.
- Creating or listing backlog comments requires resolving the parent task inside organization/site scope.
- Listing backlog task activity requires backlog read permission and organization/site/task scoping.
- Exporting backlog tasks requires backlog read permission and organization/site-scoped filters.
- Creating or listing bulk operation previews requires content operation preview permission and organization/site/task scoping.
- Bulk operation previews must persist planned values only and must not write to WordPress.
- Running bulk operation dry runs requires content operation preview permission and organization/site/operation scoping.
- Bulk operation dry runs must persist result metadata only and must not write to WordPress.
- Confirming bulk operations requires content operation confirm permission, organization/site/operation scoping, and the literal `CONFIRM` acknowledgement.
- Confirmed bulk operations must remain pending execution until a separate execution step validates confirmation state.
- Starting bulk operations requires content operation confirm permission and organization/site/operation scoping.
- Starting bulk operations must not perform inline WordPress writes; execution workers must re-check confirmation and connection state.
- Recording bulk operation results requires content operation confirm permission and organization/site/operation/item scoping.
- Bulk operation result capture must only accept `RUNNING` operations and must not perform inline WordPress writes.
- Rolling back bulk operations requires content operation confirm permission and organization/site/operation scoping.
- Rollback state capture must only accept `COMPLETED` or `FAILED` operations and must not perform inline WordPress writes.
- Retrying bulk operations requires content operation confirm permission and organization/site/operation scoping.
- Retry state capture must only accept `FAILED` operations with failed items and must not perform inline WordPress writes.
- Safe content operation mutations are rate limited by client, user, organization, site, action, and operation.
- Listing notifications requires organization read permission and must stay scoped to the authenticated member's organization.
- Updating notification read state requires organization read permission, same-origin browser checks, and notification scoping inside the organization.
- Bulk notification read updates require organization read permission, same-origin browser checks, and organization scoping.
- Safe content operation lifecycle notifications must be created only after the scoped operation transition is accepted.
- Assistant recommendations require backlog read permission and organization/site scoping before source evidence is loaded.
- Assistant recommendations must remain read-only, display source evidence, and must not call external AI providers or mutate WordPress content in the MVP.
- Assistant recommendation usage envelopes must read scoped plan and usage data without incrementing AI credits for deterministic recommendations.
- Assistant recommendation controls may prepare existing safe previews only for backlog-sourced recommendations and must keep later dry run, confirmation, and execution as separate user actions.
- Unsupported assistant controls must be disabled with a reason instead of silently attempting mutation or task creation.
- Billing overview reads require `billing:read`, stay scoped to the authenticated member's organization, and must not create checkout sessions or mutate subscriptions.
- Local Trial subscriptions are created without a billing provider or provider customer id, so they cannot open provider billing portals or charge users.
- Expired local Trial subscriptions must block gated site/member mutations with `BILLING_TRIAL_EXPIRED` without mutating provider state or creating charges.
- Billing checkout session creation requires same-origin requests, `billing:manage`, configured provider credentials, and allowed non-Enterprise target plans; local subscription state must not change until webhook verification is implemented.
- Billing portal session creation requires same-origin requests, `billing:manage`, configured provider credentials, and an active Stripe subscription with stored provider customer id; local subscription state must not change until webhook verification is implemented.
- Billing webhook processing must verify the Stripe signature over the raw request body and record provider event ids before reconciling local subscription state, so replayed events cannot repeat mutations.
- Billing feature gates must enforce current organization plan limits before creating sites or inviting members.
- Billing limit notifications must be tenant-scoped and created only after successful usage changes reach a finite plan limit.
- Google Search Console overview reads require organization/site scoping and `site:read`; responses must never expose raw or encrypted refresh tokens.
- Google Search Console OAuth start requires signed tenant/site/user state, integration management permission, read-only Search Console scope, and configured token encryption before the connect control is enabled.
- Google Search Console OAuth callback must verify state, match the current signed-in user, encrypt refresh tokens before storage, and upsert only through organization/site-scoped repository methods.
- Google Search Console property discovery requires integration management permission, decrypts refresh tokens only server-side, refreshes short-lived Google access tokens on demand, and returns property metadata only.
- Google Search Console property selection requires same-origin requests and integration management permission, verifies the selected property against Google's property list for the connected account, and never returns raw or encrypted refresh tokens.
- Google Search Console metric sync requires same-origin requests and integration management permission, decrypts refresh tokens only server-side, stores aggregate daily metrics only, and never returns tokens.
- Google Search Console insight sync requires same-origin requests and integration management permission, stores aggregate page/query Search Analytics rows only, and never returns tokens.
- Background jobs validate connection state before execution.
- Worker job handlers for tenant-scoped work must validate organization/site payload scope before running; jobs without tenant context fail fast.
- Scheduled GSC sync jobs load connections only through organization/site-scoped queries, decrypt refresh tokens in memory just before token refresh, and never place tokens in job payloads, job results, or logs.
- Scheduled GSC sync writes activity logs as system entries without a user id and with bounded metadata only.
- Worker logs are structured with primitive context values only and must never include tokens, signatures, or payload bodies.
- Worker heartbeat keys contain only worker identity, timestamps, and job counters.
- Frontend requests are not blocked by heavy sync operations.

## SaaS Tenant Isolation Checks

- Users cannot read or mutate another organization.
- Site IDs are always resolved through organization membership.
- Cache keys include organization/site scope.
- Worker payloads include organization/site scope.
- Storage paths include organization/site scope.
- Logs include stable IDs but never tokens or personal payloads.

## Bulk Operation Guardrails

Every risky bulk operation must have:

- preview;
- validation;
- dry run;
- explicit confirmation;
- background processing;
- per-item result;
- audit log;
- rollback or previous-value restore;
- retry strategy;
- rate limits.

Known gaps as of Iteration 79: bulk operation lifecycle transitions do not write activity log entries yet (notifications only), background processing and real WordPress writes are not implemented, and rollback captures state without restoring previous values on the WordPress site.

## Roadmap Security Items

- 2FA.
- SSO for Enterprise.
- Dependency scanning.
- SAST.
- Restore testing.
- Security review checklist for Enterprise customers.
