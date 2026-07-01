# QA Checklist

## Foundation

- `npm install` completes.
- `.env.example` documents required environment variables.
- Docker services start.
- Health endpoint responds.
- Lint passes.
- Tests pass.
- Build passes.
- CI runs lint, tests, and build.

## Tenant Isolation

- User cannot access another organization by changing IDs.
- Viewer cannot mutate organization, billing, site, or tasks.
- Editor cannot change billing or organization settings.
- Worker jobs include organization/site scope.
- Cache/storage/log patterns include organization/site scope.

## SaaS MVP Foundation

- User can register with email/password.
- User can log in with email/password.
- Logout clears the active session.
- Protected SaaS APIs return 401 without a session.
- Mutating SaaS APIs reject missing or cross-origin `Origin` headers.
- Login and registration are rate limited by client/IP and email.
- Current user can create an organization.
- Organization creator becomes Owner.
- Current user can list only their organizations.
- Owner/Admin can invite members.
- Invite creation returns a one-time URL while only the token hash is stored.
- Invite creation sends an email when SMTP delivery is enabled.
- Invite resend rotates the token and sends a new email when SMTP delivery is enabled.
- Invite creation, resend, and acceptance are rate limited.
- Invited user can register or log in and accept the invite with the token.
- User cannot accept an invite for a different email address.
- Expired, canceled, or already accepted invite tokens are rejected.
- Owner/Admin can resend a pending invite and rotate the token.
- Owner/Admin can cancel a pending invite.
- Viewer cannot invite members.
- Owner/Admin can update non-owner member roles.
- User cannot change their own role.
- Owner role cannot be changed through generic role management.
- Owner can create a site inside their organization.
- Viewer cannot create a site.
- Duplicate site URLs are rejected inside an organization.
- Organization and site creation write activity log entries.
- Empty dashboard states do not pretend audits or integrations are connected.

## Database

- Prisma client generation succeeds.
- Initial migration applies to local PostgreSQL.
- Plan seed completes.
- Prisma repository creates organization and Owner membership transactionally.
- Prisma repository creates site and activity log transactionally.
- Duplicate site URLs are rejected by the database unique constraint and mapped to a safe API error.

## WordPress Plugin

- PHP files pass syntax checks.
- Admin pages use capability checks.
- Forms/actions use nonce checks.
- Inputs are sanitized.
- Outputs are escaped.
- Secret options are not autoloaded.
- SaaS user with integration permission can create a short-lived plugin connection challenge.
- Plugin can exchange a valid challenge once for connection credentials.
- Plugin admin stores exchanged organization/site/token/endpoint connection data without autoloading the option.
- Used, expired, or unknown challenges are rejected.
- Manual sync queues work and sends a signed sync request when the scheduled job runs.
- Manual sync sends posts/pages inventory items with external ID, type, URL, title, status, and modified timestamp.
- Plugin sync rejects missing, expired, mismatched, or invalid signatures.
- Plugin sync accepts a valid signed batch, upserts synced content items, and records `lastSyncAt`.
- SaaS users can list only synced content for sites inside their organization.
- SaaS synced content inventory supports search, type/status filters, and cursor pagination without leaking cross-tenant data.
- SaaS synced content detail opens only for an item inside the requested organization and site.
- SaaS synced content detail shows computed health signals for title, publish status, sync freshness, and modified-date freshness.
- SaaS synced content detail shows computed backlog candidate tasks for actionable warning/critical/info signals.
- SaaS users with backlog update permission can persist a backlog task from a synced content candidate.
- Persisting the same synced content candidate again returns the existing backlog task instead of creating duplicates.
- Manual sync does not run a large sync inline.

## SEO Safety

- No risky mutation happens without preview.
- No risky mutation happens without dry run.
- No risky mutation happens without explicit confirmation.
- Every risky mutation writes an audit log.
- Rollback or previous values exist before execution.

## UX States

- Loading states.
- Empty states.
- Error states.
- Permission denied states.
- Success states.

## Release

- Database migrations reviewed.
- Dependency audit reviewed.
- Monitoring and Sentry configured.
- Backup and restore plan checked.
- Rollback plan documented.
