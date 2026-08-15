# WordPress Plugin Free Value Strategy

## Decision

Ship the WordPress.org plugin as a standalone, read-only **WordPress Content Health Audit**.
It must produce useful results without an account, API key, SaaS connection, quota, or trial period.

The free plugin answers:

> What is visibly wrong across my WordPress content right now?

The connected platform answers:

> Which problems are costing search traffic, what should the team fix first, and how can approved
> metadata changes be executed safely?

This keeps the plugin useful on its own while making the SaaS upgrade a natural continuation of the
same workflow rather than an unlock screen.

## Target User And Job

Primary user: a WordPress site owner, content manager, freelancer, or small agency that already uses
Yoast, Rank Math, AIOSEO, SEOPress, or native WordPress metadata.

Job to be done:

> Show me every post or page that needs SEO/content maintenance, explain why, and give me a list I
> can work through without opening every editor screen.

The plugin complements existing SEO plugins. It must not become another sitemap, schema, or metadata
suite.

## Free MVP

### 1. One-click local audit

- Runs inside WordPress without an account or external request.
- Audits published posts and pages in bounded background batches.
- Supports the metadata already read from Yoast and Rank Math, with WordPress fallbacks.
- Stores only the latest local result and scan timestamp.
- Can be rerun manually after changes.

### 2. Content health summary

Show actionable counts rather than a mysterious grade:

- Critical: published content marked `noindex`.
- Needs attention: missing SEO title or meta description.
- Needs attention: canonical points to a different URL.
- Opportunity: content below the transparent thin-content threshold.
- Opportunity: no internal links in the post body.
- Maintenance: content not modified within the freshness threshold.
- Complete: audited URLs with no detected issue.

If a percentage is shown for directory screenshots, label it **Checks passed** and expose the exact
formula. Do not present it as a ranking prediction.

### 3. Actionable content table

- Search by title or URL.
- Filter by issue, severity, post type, and status.
- Sort by severity and modification date.
- Show the evidence that triggered each issue.
- Link directly to Edit Post and View Page.
- Export the complete current audit to CSV.

### 4. Lightweight WordPress surfaces

- A dedicated `Content Health` admin page, not a connection settings page as the first experience.
- A small Dashboard widget with issue counts and the last scan time.
- A Site Health test only for the highest-confidence technical risks, such as published `noindex`
  content or a failed audit job.

### 5. Optional platform connection

Keep connection setup secondary and explain the additional outcome:

- connect Google Search Console evidence to audited URLs;
- rank issues by traffic loss and opportunity;
- keep audit history instead of only the latest local result;
- collaborate through assignments, comments, and backlog state;
- preview, dry-run, confirm, execute, and roll back supported metadata changes;
- monitor multiple WordPress sites from one workspace.

The local audit remains available after disconnecting the platform.

## Free Versus Platform Boundary

| Capability                              | Free WordPress plugin | Connected platform           |
| --------------------------------------- | --------------------- | ---------------------------- |
| Local content inventory                 | Full                  | Synced copy                  |
| Current content health checks           | Full                  | Full with persisted evidence |
| Search/filter/edit links                | Full                  | Full                         |
| CSV export                              | Full                  | Full                         |
| Account required                        | No                    | Yes                          |
| Google Search Console evidence          | No                    | Yes                          |
| Traffic-loss/opportunity prioritization | No                    | Yes                          |
| Audit history and trend                 | Latest scan only      | Yes                          |
| Team backlog and assignment             | No                    | Yes                          |
| Multi-site workspace                    | No                    | Yes                          |
| Safe metadata execution and rollback    | No                    | Yes                          |
| E-E-A-T-informed trust evidence         | No                    | Planned paid platform only   |

Do not impose a local URL quota or time-limited scan. WordPress.org does not permit trialware; paid
service functionality is acceptable when the service provides substantive functionality and is
clearly disclosed.

## Explicit Non-goals For The First Release

- Do not replace Yoast, Rank Math, AIOSEO, or SEOPress.
- Do not generate XML sitemaps, schema, breadcrumbs, or social metadata.
- Do not add an SEO editor or automatically rewrite content.
- Do not crawl arbitrary external links in the first release.
- Do not add AI copy generation as the acquisition hook.
- Do not hide issue details behind account creation.

These areas are crowded, increase support and compatibility risk, and weaken the product's
review-first positioning.

## WordPress.org Positioning

### Working directory title

**SEO Content Control Center - Content Health Audit**

### Short description

Audit WordPress posts and pages for missing SEO metadata, risky index settings, thin or stale
content, and internal-link gaps. Runs locally. No account required.

### Primary tags

Use only the five most relevant tags:

- `content-audit`
- `seo-audit`
- `on-page-seo`
- `meta-description`
- `internal-links`

### Message hierarchy

1. Find every WordPress page that needs SEO/content maintenance.
2. Run locally with no account and no content sent elsewhere.
3. Work alongside the SEO plugin already installed.
4. Connect the optional platform when traffic evidence, teamwork, and safe execution are needed.

### Screenshot story

1. Content health summary with real issue counts.
2. Filtered issue table with evidence and Edit links.
3. A single URL's checks and recommended next action.
4. CSV export and WordPress Dashboard widget.
5. Optional platform connection and the additional Search Console/backlog workflow.

## Activation Funnel

1. Install and activate.
2. Land on Content Health, not connection settings.
3. Click `Run content audit`.
4. See the first result as soon as the first batch completes.
5. Filter an issue and open a post for editing.
6. After value is visible, offer `Prioritize with Search Console` as the platform CTA.

No signup modal should appear before the first local result.

## Success Metrics

Measure the funnel without hidden tracking. Any telemetry must be explicit opt-in.

- Activation to first audit started.
- First audit completion rate.
- Percentage of installations with at least one second audit.
- Edit-link clicks per completed audit.
- CSV exports per completed audit.
- Platform connection starts after a completed local audit.
- Connection completion rate.
- WordPress.org review rating, support response time, and active-install retention.

Initial product target: the plugin should deliver a useful first result in under two minutes on a
typical site and require zero configuration.

## Implementation Order

### Release A: standalone value (implemented in Iteration 120)

1. Extract a local audit result model from the metadata already collected by `ContentCollector`.
2. Add deterministic checks and unit coverage.
3. Add batched audit execution, persistence, and safe reruns.
4. Replace the connection-first admin screen with Content Health summary and results.
5. Keep platform connection in a secondary tab or section.
6. Add CSV export, Dashboard widget, and updated WordPress.org copy/screenshots.

### Release B: retention (implemented in Iteration 121)

1. Add inbound-link mapping and orphan/weakly linked content detection.
2. Add scheduled local scans with an explicit user-controlled interval.
3. Show changes since the previous scan without turning history into an unlimited local database.
4. Add dismiss/ignore rules for intentional findings.

### Release C: platform conversion (implemented in Iteration 122)

1. Deep-link local findings into the matching connected content/audit view.
2. Explain which findings gain Search Console evidence after connection.
3. Show safe-operation availability only for supported, connected metadata fields.

### Release D: evidence continuity (implemented in Iteration 123)

1. Sync only active findings from the latest completed local audit through a strict bounded schema.
2. Materialize those findings as platform audit issues without duplicating metadata-derived issues.
3. Preserve privacy by excluding post bodies, the complete link graph, ignored findings, and
   incomplete snapshots.

## Market Rationale

- Major SEO suites already give away metadata editing, sitemaps, schema, and content analysis, so
  competing on breadth would make the plugin interchangeable.
- New audit plugins increasingly lead with local, no-account scans and actionable issue lists. That
  establishes the minimum trust bar for a WordPress.org acquisition product.
- The existing code already collects most of the evidence required for the proposed MVP: word
  count, internal/external link counts, SEO title, meta description, canonical, robots directives,
  dates, status, and featured-image state.
- The platform has a defensible continuation competitors cannot reproduce with a local checklist:
  Search Console evidence, multi-site operations, team workflow, review-first execution, and
  rollback.

## Research References

- [WordPress.org detailed plugin guidelines](https://developer.wordpress.org/plugins/wordpress-org/detailed-plugin-guidelines/)
- [Yoast SEO](https://wordpress.org/plugins/wordpress-seo/)
- [Rank Math SEO](https://wordpress.org/plugins/seo-by-rank-math/)
- [All in One SEO](https://wordpress.org/plugins/all-in-one-seo-pack/)
- [SEOPress](https://wordpress.org/plugins/wp-seopress/)
- [AutoBoostSEO connector](https://wordpress.org/plugins/autoboostseo-connector/)
- [SEO Content Audit](https://wordpress.org/plugins/seo-content-audit/)
- [OrphanPages](https://wordpress.org/plugins/orphanpages/)
