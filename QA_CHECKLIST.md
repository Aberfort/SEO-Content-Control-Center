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
