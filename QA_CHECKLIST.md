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
- Current user can create an organization.
- Organization creator becomes Owner.
- Current user can list only their organizations.
- Owner/Admin can invite members.
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
