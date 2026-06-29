# Product Requirements

## Product

SEO Content Control Center for WordPress is a commercial SaaS product that helps SEO teams find WordPress pages losing organic traffic, understand why, prioritize the work, and turn the result into a measurable SEO backlog.

## Core Offer

Find the WordPress pages costing you traffic - and turn them into an actionable SEO backlog.

Ukrainian version: знаходить сторінки WordPress, які втрачають органічний трафік, і перетворює проблеми на готові SEO-задачі.

## Target Users

- SEO agencies managing many WordPress sites.
- Affiliate teams.
- Content site owners.
- Media publishers.
- In-house SEO teams.
- Editorial teams with hundreds or thousands of URLs.
- WordPress agencies.

## Product Principles

- The product is an SEO operations hub, not another title/meta field plugin.
- The first MVP must prioritize trust, safety, and tenant isolation over automation breadth.
- The product should explain problems, not only list them.
- SEO fixes must become trackable tasks with before/after metrics.
- AI is an assistant only, introduced after the non-AI MVP is stable.

## Non-Negotiable Safety Rules

AI or SaaS must not perform the following without explicit user confirmation:

- edit content;
- publish posts;
- change canonical URLs;
- change noindex;
- change robots.txt;
- delete posts;
- mass-change title/meta;
- mass-insert internal links.

Every bulk operation must include preview, validation, dry run, explicit confirmation, audit log, and rollback or value restoration.

## MVP Scope

Phase 0 creates the repository, documentation, development environment, CI, core contracts, data model, and plugin skeleton.

Phase 1 implements SaaS authentication, organizations, roles, sites, invitations, audit log, trial logic, dashboard empty states, and API documentation for the plugin.

Phase 2 implements the WordPress plugin connection flow, secure token storage, manual sync, Action Scheduler background sync, incremental content metadata sync, and sync logs.

Phase 3 implements the first SEO audit checks across metadata, links, and indexability.

## Definition of Done

A feature is complete only when it has frontend and backend implementation, validation, error/loading/empty states, access control, logging, tests, tenant isolation, documentation, and passing lint/tests/build.
