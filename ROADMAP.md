# Roadmap

## Phase 0 - Product Foundation

- Monorepo structure.
- README and local setup.
- Environment examples.
- Docker local dependencies.
- CI.
- Linting, formatting, tests, build scripts.
- Database schema draft.
- Health checks.
- Structured logging plan.
- Development seed strategy.
- Staging/production deployment plan.

## Phase 1 - SaaS MVP Foundation

- Register, login, logout. Status: DB-backed credentials/session foundation implemented.
- Password reset and email verification.
- Organization creation. Status: Prisma-backed foundation implemented.
- PostgreSQL persistence. Status: initial Prisma migration, seed, and repository implemented.
- Invitations. Status: member invite foundation implemented without email delivery.
- Roles and permissions. Status: RBAC utility, tenant access checks, and member role management implemented.
- Site creation. Status: Prisma-backed foundation implemented.
- Dashboard empty states. Status: implemented for no-org/no-site/no-audit states.
- Onboarding checklist.
- Basic audit log. Status: organization/site activity writes implemented through repository layer.
- Trial plan without real charges.
- Plugin API documentation.

## Phase 2 - WordPress Plugin MVP

- Settings page.
- Connection flow.
- Connection status.
- Secure token storage.
- Manual sync.
- Action Scheduler sync.
- Incremental content metadata sync.
- Yoast and Rank Math extraction.
- Disconnect flow.
- Sync logs.

## Phase 3 - SEO Audit MVP

- Metadata checks.
- Content freshness and thin content checks.
- Indexability checks.
- Link checks.
- Issue deduplication.
- Issue lifecycle: open, ignored, resolved, snoozed.

## Phase 4 - Google Search Console

- OAuth.
- Property selection.
- Encrypted refresh token storage.
- Historical metric sync.
- Page/query insights.

## Phase 5 - SEO Backlog

- Audit issue to task conversion.
- Deduplication.
- Filters and search.
- Assignment and status workflows.
- Comments and change history.
- CSV export.

## Phase 6 - Safe Content Operations

- Preview, dry run, validation, confirmation. Status: preview, dry run, explicit confirmation, and controlled start implemented.
- Per-item processing results. Status: running operation result capture implemented without inline WordPress writes.
- Rollback.
- Audit logs.
- Rate limits and notifications.

## Phase 7 - AI Assistant

- Recommendations only.
- Manual confirmation.
- Source display.
- Usage limits and AI credits.
- Disable controls.

## Phase 8 - Billing

- Trial, Starter, Pro, Agency, Enterprise.
- Checkout and subscriptions.
- Billing portal.
- Feature gating.
- Usage tracking and notifications.
