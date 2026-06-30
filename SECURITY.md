# Security

## Core Requirements

- Organization-scoped authorization on every SaaS data access.
- RBAC for Owner, Admin, SEO Manager, Editor, Writer, Viewer, Billing Manager.
- Owner role changes require a dedicated ownership transfer flow.
- Generic member role management must not allow self-demotion.
- CSRF protection for browser mutations.
- Password hashes use `scrypt`; plaintext passwords must never be stored.
- Session cookies must be HTTP-only, same-site, and secure in production.
- Session tokens must be stored as hashes in the database.
- Rate limiting for auth, plugin API, forms, webhooks, and bulk operations.
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
