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
- Password reset and email verification. Status: hashed token flows implemented for email verification and password reset.
- Organization creation. Status: Prisma-backed foundation implemented.
- PostgreSQL persistence. Status: initial Prisma migration, seed, and repository implemented.
- Invitations. Status: member invite foundation implemented without email delivery.
- Roles and permissions. Status: RBAC utility, tenant access checks, and member role management implemented.
- Site creation. Status: Prisma-backed foundation implemented.
- Dashboard empty states. Status: implemented for no-org/no-site/no-audit states.
- Onboarding checklist. Status: computed workspace setup checklist is shown on the main app and dashboard.
- Basic audit log. Status: organization/site activity writes implemented through repository layer.
- Trial plan without real charges.
- Plugin API documentation. Status: dedicated connection, signing, sync, disconnect, and metadata contract documented.

## Phase 2 - WordPress Plugin MVP

- Settings page.
- Connection flow.
- Connection status.
- Secure token storage.
- Manual sync.
- Action Scheduler sync.
- Incremental content metadata sync. Status: author, publish date, featured image, taxonomy, word count, link counts, and SEO metadata sync implemented for current posts/pages inventory.
- Yoast and Rank Math extraction. Status: SEO title, meta description, canonical URL, and robots directive extraction implemented with fallback WordPress title metadata.
- Disconnect flow. Status: SaaS dashboard and signed WordPress admin disconnect invalidate server-side plugin connections.
- Sync logs. Status: plugin-local recent sync log with queued/success/error entries and sanitized failure details implemented.

## Phase 3 - SEO Audit MVP

- Metadata checks. Status: synced metadata issues are materialized into completed metadata audit runs.
- Content freshness and thin content checks. Status: synced content freshness/thin content signals are materialized into completed metadata audit runs.
- Indexability checks. Status: synced noindex and canonical mismatch signals are materialized into completed metadata audit runs.
- Link checks. Status: synced internal/outbound link counts are materialized into content health signals and missing-internal-link audit issues.
- Issue deduplication. Status: synced-content issue fingerprints are deduplicated by organization/site/fingerprint.
- Issue lifecycle: open, ignored, resolved, snoozed. Status: audit run listings expose scoped issue summary counts.

## Phase 4 - Google Search Console

- OAuth.
- Property selection.
- Encrypted refresh token storage.
- Historical metric sync.
- Page/query insights.

## Phase 5 - SEO Backlog

- Audit issue to task conversion. Status: single issue and bulk open-issue conversion implemented.
- Deduplication. Status: candidate, single audit issue, and bulk audit conversions reuse existing tasks.
- Filters and search.
- Assignment and status workflows.
- Comments and change history.
- CSV export.

## Phase 6 - Safe Content Operations

- Preview, dry run, validation, confirmation. Status: preview, dry run, explicit confirmation, and controlled start implemented.
- Per-item processing results. Status: running operation result capture implemented without inline WordPress writes.
- Rollback. Status: rollback state capture implemented for completed or failed operations without inline WordPress writes.
- Retry failed items. Status: failed item retry state capture implemented without inline WordPress writes.
- Audit logs.
- Rate limits and notifications. Status: safe content operation mutation rate limits, lifecycle notifications, notification read state, and bulk mark-read implemented.

## Phase 7 - AI Assistant

- Recommendations only. Status: deterministic read-only recommendations implemented from backlog and synced content evidence.
- Manual confirmation. Status: assistant controls prepare safe previews only and keep dry run, confirmation, and execution separate.
- Source display. Status: assistant recommendation sources are included in API and dashboard output.
- Usage limits and AI credits. Status: recommendation responses include unmetered monthly AI-credit usage envelopes from plan limits and usage metrics.
- Disable controls. Status: unsupported assistant actions return disabled controls with reasons.

## Phase 8 - Billing

- Trial, Starter, Pro, Agency, Enterprise. Status: read-only plan catalog and current plan overview implemented.
- Checkout and subscriptions. Status: Stripe checkout session creation and signed, idempotent webhook-backed subscription reconciliation added.
- Billing portal. Status: Stripe billing portal session creation added for configured connected subscriptions.
- Feature gating. Status: site and user plan limits are exposed in billing overview and enforced for site creation/member invites.
- Usage tracking and notifications. Status: site/user usage is tracked in billing overview and finite limit-reached notifications are emitted.
