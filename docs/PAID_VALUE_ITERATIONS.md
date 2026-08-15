# Paid Platform Value Iterations

## Product Boundary

The free WordPress plugin answers which current content-health problems are visible inside one
WordPress site. The paid platform must answer which work matters commercially, coordinate who fixes
it, retain evidence over time, and execute supported changes through a controlled workflow.

Plugin findings remain available locally. Connecting the platform adds persisted history, Search
Console evidence, cross-site operations, team accountability, recurring reporting, and review-first
execution. Paid value must come from better decisions and operational leverage, not hiding local
finding details.

## Iteration 123 - Local Evidence Continuity

Status: implemented.

- Sync active findings only from the latest completed local audit.
- Enforce an allow-list, short evidence, stable fingerprints, and a maximum of 32 findings per URL.
- Replace duplicate metadata-derived issues with direct WordPress evidence.
- Add orphan and weak-link issues without syncing the complete internal-link graph.

## Iteration 124 - Search Impact Prioritization

Status: implemented.

- Join each eligible issue to recent GSC clicks, impressions, CTR, position, traffic-loss, and
  opportunity evidence.
- Show explicit impact bands with the measurements and thresholds that produced them.
- Capture a fixed first-observed issue baseline and compare later audit windows without claiming
  causality where the evidence only shows correlation.
- Prioritize the audit and backlog by expected operational value, confidence, and urgency.

## Iteration 125 - Recurring Deliverables

Status: implemented.

- Notify teams about new critical findings, significant traffic drops, overdue work, and failed safe
  operations.
- Produce a weekly workspace digest with changes, completed work, unresolved risks, and measurable
  outcomes.
- Add an exportable client report for agencies with site scope, evidence period, and transparent
  methodology.
- Provide tenant-scoped delivery preferences and unsubscribe controls.

## Iteration 126 - Operations Workflow

Status: implemented.

- Make the full issue to task to safe-operation path visible as one lifecycle.
- Add bulk review for compatible findings while preserving per-item evidence and confirmation.
- Improve partial-failure and non-restorable guidance, retry eligibility, and rollback visibility.
- Record outcome state after work is completed so reports distinguish activity from verified change.

## Iteration 127 - Content Trust Evidence

This is a paid platform-only capability. It is informed by Google's E-E-A-T guidance but is not a
Google score, ranking factor score, or ranking guarantee. Google explicitly says E-E-A-T itself is
not a specific ranking factor and describes trust as the most important part of the concept.

The platform will organize observable evidence into four review dimensions:

- **Experience:** first-hand process, examples, original media/data, and demonstrated use.
- **Expertise:** named author, relevant qualifications or review, technical accuracy signals, and
  topic-specific supporting sources.
- **Authoritativeness:** publisher/author identity, reputation references, citations, and consistent
  topical ownership.
- **Trust:** clear ownership/contact information, dates and correction/review policy, source
  transparency, secure/accurate transactional context, and heightened YMYL review needs.

The result will show present evidence, missing evidence, insufficient evidence, and recommended
human review. It will not collapse these dimensions into a mysterious universal number. Starter and
higher paid plans can receive deterministic evidence checks; AI-assisted narrative or remediation
uses plan AI credits and never substitutes for the underlying evidence.

Primary guidance: [Google Search Central: Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content).

## Iteration 128 - Commercial Enforcement

- Define named entitlements for GSC impact, recurring reports, Content Trust Evidence, AI summaries,
  safe operations, API access, sites, users, and synced URL limits.
- Enforce URL and feature limits server-side, including worker and API paths.
- Align in-product upgrade states and public pricing with the actual gates.
- Test trials, upgrades, downgrades, expired subscriptions, and retained read-only access.

## Success Criteria

- A paid workspace can explain why one issue should be fixed before another using current evidence.
- A team can assign, execute, verify, and report work without a spreadsheet handoff.
- An agency can deliver a recurring report across sites with reproducible calculations.
- Content Trust Evidence always exposes source evidence and uncertainty.
- Free plugin users never lose local findings because they did not subscribe.
