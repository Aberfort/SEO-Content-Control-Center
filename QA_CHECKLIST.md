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
- Safe content operation mutations are rate limited by client, user, organization, site, action, and operation.
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
- Onboarding checklist reflects workspace, site, plugin connection, synced content, audit, and backlog setup progress.

## Database

- Prisma client generation succeeds.
- Initial migration applies to local PostgreSQL.
- Plan seed completes.
- Billing overview lists the seeded plan catalog and falls back to Trial when no subscription exists.
- Billing overview enables checkout actions only when Stripe provider credentials and target plan price IDs are configured.
- Billing checkout API requires same-origin requests and `billing:manage`, rejects current/Trial/Enterprise plan changes, and does not mutate local subscriptions.
- Billing portal actions enable only for Stripe subscriptions with provider customer ids and configured provider credentials.
- Billing portal API requires same-origin requests and `billing:manage`, rejects organizations without connected subscriptions, and does not mutate local subscriptions.
- Billing webhook API rejects unsigned, stale, or unconfigured requests, reconciles signed Stripe subscription events into local subscription state, and ignores replayed provider event ids without repeating mutations.
- Billing feature gates block site creation and member invites when plan limits are reached.
- Billing limit notifications are created when successful site creation or member invite reaches a finite plan limit.
- Prisma repository creates organization and Owner membership transactionally.
- Prisma repository creates site and activity log transactionally.
- Duplicate site URLs are rejected by the database unique constraint and mapped to a safe API error.
- Password reset request returns a generic accepted response, creates only hashed reset tokens, and does not reveal account existence.
- Password reset confirmation updates the password, marks email verified, invalidates outstanding reset tokens, and deletes existing sessions.
- Registration creates a hashed email verification token and attempts verification email delivery without returning the raw token in API responses.
- Opening a valid email verification link marks the user email as verified and invalidates outstanding verification tokens.

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
- Plugin admin disconnect sends a signed disconnect request before clearing local credentials.
- SaaS users with integration permission can disconnect a connected WordPress site and invalidate the server-side connection.
- Manual sync queues work and sends a signed sync request when the scheduled job runs.
- Manual sync sends posts/pages inventory items with external ID, type, URL, title, status, modified timestamp, and bounded metadata for author, publish date, featured image, taxonomies, word count, internal/outbound link counts, SEO title, meta description, canonical URL, robots directives, and SEO plugin source.
- Plugin sync log records queued, successful, and failed sync attempts with bounded recent history.
- Plugin sync log failure details redact tokens, signatures, authorization values, and endpoint URLs.
- Plugin sync rejects missing, expired, mismatched, or invalid signatures.
- Plugin sync accepts a valid signed batch, upserts synced content items, and records `lastSyncAt`.
- SaaS users can list only synced content for sites inside their organization.
- SaaS synced content inventory supports search, type/status filters, and cursor pagination without leaking cross-tenant data.
- SaaS synced content detail opens only for an item inside the requested organization and site.
- SaaS synced content detail shows computed health signals for title, publish status, sync freshness, modified-date freshness, thin content word count, missing SEO title/meta description, noindex, canonical mismatch, and link counts.
- SaaS synced content detail shows computed backlog candidate tasks for actionable warning/critical/info signals.
- SaaS users with audit run permission can create a site metadata audit and generate an activity log entry.
- Creating a site metadata audit materializes scoped audit issues from synced content health signals, including missing internal links, marks the audit completed, and does not crawl external URLs.
- SaaS users with audit read permission can list only audit runs for a site inside their organization.
- SaaS dashboard users can create an audit for the selected site and see the recent completed metadata run.
- SaaS audit run listing includes total, open, resolved, high, and critical issue summary counts scoped to each audit.
- SaaS users with audit read permission can list only issues for an audit inside the requested organization and site.
- SaaS dashboard users can inspect audit issues for a selected audit run.
- SaaS audit issue listing supports tenant-scoped text search plus status and severity filters.
- SaaS dashboard audit issue triage supports text search plus status and severity filters.
- SaaS dashboard audit issue summary counts stay scoped to the selected audit run.
- SaaS dashboard audit issue CSV export preserves the selected audit run and current issue filters.
- SaaS users with audit read permission can export only audit issues for an audit inside the requested organization and site.
- SaaS users with audit run permission can change audit issue status and generate an activity log entry.
- SaaS dashboard users can create a backlog task from an audit issue.
- SaaS users with backlog update permission can persist a backlog task from a synced content candidate.
- Persisting the same synced content candidate again returns the existing backlog task instead of creating duplicates.
- SaaS users with backlog update permission can persist a backlog task from a scoped audit issue without duplicates.
- SaaS users with backlog update permission can create backlog tasks in bulk from open issues in a scoped audit run without duplicates.
- SaaS users with backlog read permission can list persisted backlog tasks for a site inside their organization.
- SaaS backlog listing supports tenant-scoped text search plus status and severity filters.
- SaaS backlog dashboard shows site-wide summary counts while displaying filtered task rows.
- SaaS users with backlog update permission can change backlog task status and generate an activity log entry.
- SaaS users with backlog update permission can assign backlog tasks to active organization members and set or clear due dates.
- SaaS users with backlog update permission can comment on scoped backlog tasks and see recent comments in the dashboard.
- SaaS users with backlog read permission can view scoped backlog task change history in the dashboard and API.
- SaaS users with backlog read permission can export filtered site backlog tasks as CSV.
- SaaS users with content operation preview permission can create preview-only bulk operations from scoped backlog tasks.
- SaaS dashboard users can see recent safe operation previews without triggering WordPress writes.
- SaaS users with content operation preview permission can dry run previewed bulk operations without triggering WordPress writes.
- SaaS users with content operation confirm permission must type `CONFIRM` before confirming dry-run-passed bulk operations.
- SaaS users with content operation confirm permission can start confirmed bulk operations into `RUNNING` without inline WordPress writes.
- SaaS users with content operation confirm permission can record completed or failed results for running bulk operations without inline WordPress writes.
- SaaS users with content operation confirm permission can roll back completed or failed bulk operations without inline WordPress writes.
- SaaS users with content operation confirm permission can retry failed bulk operation items without inline WordPress writes.
- SaaS safe content operation mutation limits return `429 RATE_LIMITED` with `Retry-After`.
- SaaS users with organization read permission can list organization notifications for safe operation lifecycle events.
- Safe operation completion, failure, rollback, and retry state changes create organization notifications.
- SaaS users with organization read permission can filter notifications by read or unread state.
- SaaS users with organization read permission can mark organization notifications read or unread.
- SaaS users with organization read permission can mark all unread organization notifications read.
- SaaS users with backlog read permission can list read-only assistant recommendations for a scoped site.
- SaaS assistant recommendations show source evidence and do not mutate WordPress or SaaS records.
- SaaS assistant recommendation responses include AI-credit usage envelopes without charging deterministic recommendations.
- SaaS assistant recommendations expose enabled safe-preview controls only for backlog-sourced recommendations.
- SaaS assistant recommendations disable unsupported controls for synced-content evidence until a backlog task exists.
- Manual sync does not run a large sync inline.

## SEO Safety

- No risky mutation happens without preview.
- Preview-only bulk operations persist planned values and explicitly avoid WordPress writes.
- No risky mutation happens without dry run.
- Dry runs persist result metadata and keep confirmation as the next required step.
- No risky mutation happens without explicit confirmation.
- Confirmed bulk operations remain pending execution and still do not write to WordPress.
- Starting confirmed bulk operations records the running state and still does not write to WordPress inline.
- Running bulk operation result capture records per-item outcomes and still does not write to WordPress inline.
- Rollback state capture records restored operation state and still does not write to WordPress inline.
- Retry state capture records failed item retry state and still does not write to WordPress inline.
- Every risky mutation writes an audit log.
- Safe operation lifecycle outcomes create tenant-scoped notifications.
- Notification read state updates stay scoped to the authenticated member's organization.
- Bulk notification read updates stay scoped to the authenticated member's organization and are idempotent.
- Assistant recommendations stay scoped to organization/site evidence and remain recommendation-only.
- Assistant recommendation usage reads stay scoped to the organization and remain unmetered for deterministic recommendations.
- Assistant recommendation controls prepare previews only and preserve the separate dry run, confirmation, and execution steps.
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
