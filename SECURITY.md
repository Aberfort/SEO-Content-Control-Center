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
- Invite tokens must be stored as hashes, expire, and be accepted only by the invited email.
- Pending invite resend must rotate the token; cancel must clear the stored token hash.
- Invite email bodies must not log raw tokens; raw invite URLs may appear only in the intended email/API response.
- WordPress connection challenges and plugin tokens must be stored as hashes; sync requests must be timestamped and HMAC-signed.
- Rate limiting for auth, invite flows, and safe content operation mutations; plugin API and webhooks need dedicated limits before launch.
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
- Plugin sync inventory contains bounded metadata only; content bodies are not sent in the MVP sync payload, word count is computed locally in the plugin, and SEO plugin metadata is limited to title, description, canonical URL, robots directives, and source.
- Plugin sync logs must be bounded and sanitize failure details so tokens, signatures, authorization values, and endpoint URLs are not stored.
- Synced WordPress content listings must stay tenant-scoped through organization/site membership checks.
- Synced content search, filters, and pagination must be applied only after organization/site scope is fixed.
- Synced content detail endpoints must not fetch by item ID alone; organization and site scope are required.
- Computed content health signals must use synced metadata only, including canonical and robots metadata, and must not fetch external URLs inline.
- Computed backlog candidate tasks are advisory only and must not trigger WordPress mutations without preview, dry run, and confirmation.
- Queueing audits requires audit run permission and organization/site scoping.
- Queueing audits may materialize issues only from scoped synced metadata already stored for the site; it must not crawl URLs, fetch external content, or mutate WordPress inline.
- Listing audits requires audit read permission and organization/site scoping before status filters are applied.
- Listing audit issues requires audit read permission and organization/site/audit scoping before filters are applied.
- Exporting audit issues requires audit read permission and organization/site/audit-scoped filters.
- Updating audit issue status requires audit run permission and organization/site/audit/issue scoping.
- Creating persisted backlog tasks from candidates requires backlog update permission and server-side candidate recomputation.
- Creating persisted backlog tasks from audit issues requires backlog update permission and organization/site/issue scoping.
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
- Billing checkout session creation requires same-origin requests, `billing:manage`, configured provider credentials, and allowed non-Enterprise target plans; local subscription state must not change until webhook verification is implemented.
- Billing portal session creation requires same-origin requests, `billing:manage`, configured provider credentials, and an active Stripe subscription with stored provider customer id; local subscription state must not change until webhook verification is implemented.
- Billing webhook processing must verify the Stripe signature over the raw request body and record provider event ids before reconciling local subscription state, so replayed events cannot repeat mutations.
- Billing feature gates must enforce current organization plan limits before creating sites or inviting members.
- Billing limit notifications must be tenant-scoped and created only after successful usage changes reach a finite plan limit.
- Background jobs validate connection state before execution.
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

## Roadmap Security Items

- 2FA.
- SSO for Enterprise.
- Dependency scanning.
- SAST.
- Restore testing.
- Security review checklist for Enterprise customers.
