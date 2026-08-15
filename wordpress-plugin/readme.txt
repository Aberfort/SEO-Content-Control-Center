=== SEO Content Control Center ===
Contributors: serhiivasyliev
Tags: seo, search-console, content-audit, workflow
Requires at least: 6.4
Tested up to: 7.0
Requires PHP: 8.1
Stable tag: 0.4.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Audit WordPress posts and pages for missing SEO metadata, risky index settings, thin or stale content, and internal-link gaps. Runs locally. No account required.

== Description ==

SEO Content Control Center is a read-only WordPress content health audit that works alongside Yoast SEO and Rank Math. Run it locally without an account, API key, URL quota, or external request.

The free local audit can:

* scan published posts and pages in bounded background batches;
* find published content marked noindex;
* find missing SEO titles and meta descriptions;
* flag canonicals that point to another URL;
* identify thin content, content without internal links, and stale content;
* identify orphan content and pages with only one inbound internal link;
* compare the latest scan with the previous result to show new and resolved findings;
* schedule daily or weekly local audits, disabled by default;
* ignore intentional findings and restore them later;
* search and filter findings by issue, severity, content type, change, and active/ignored state;
* link directly to Edit and View actions for every affected URL;
* export the complete latest audit to CSV;
* show critical content health status in the WordPress Dashboard and Site Health.

The optional SEO Content Control Center platform connection can:

* exchange a one-time connection challenge for a site-scoped connection;
* sync bounded content metadata for posts and pages in paginated batches;
* combine local evidence with Google Search Console traffic loss and opportunity data;
* deep-link connected findings into matching platform Content and Audit views;
* identify findings that can gain Search Console evidence and supported Yoast/Rank Math fields that can enter the safe-preview workflow;
* prioritize work in a multi-site team backlog with audit history;
* schedule recurring sync through Action Scheduler, with an hourly WP-Cron fallback;
* show sanitized sync history in the WordPress admin;
* receive signed, review-first SEO title/meta-description operations plus bounded self-canonical and individual noindex/nofollow repairs from the SaaS worker.

The local audit does not contact an external service or change content. When the optional platform is connected, the plugin does not send post bodies during sync. Risky SEO changes are never made from the platform without a preview, dry run, explicit confirmation, signed request, and recorded result.

== Installation ==

1. Download the `seo-content-control-center-<version>.zip` release artifact.
2. In WordPress, go to Plugins > Add New > Upload Plugin and select the archive.
3. Activate SEO Content Control Center.
4. Open Content Health in the WordPress admin menu.
5. Select Run content audit.
6. Review or export the local findings.

No platform connection is required for the local audit. To add Search Console evidence, team workflow, audit history, and review-first metadata operations, open the Platform tab and connect the site with a challenge created in the SaaS workspace.

== Frequently Asked Questions ==

= Does this replace my SEO plugin? =

No. SEO Content Control Center is an operations layer that connects WordPress metadata, Search Console evidence, audits, and a trackable backlog. It works with supported Yoast and Rank Math metadata fields for bounded operations.

= Does the free audit require an account or send data elsewhere? =

No. The content health audit runs locally in WordPress and does not require an account, API key, URL quota, or external request. External communication starts only after an administrator explicitly connects the optional platform.

= Does the local audit modify posts or SEO metadata? =

No. The local audit is read-only. It explains findings and links to the normal WordPress editor. Connected platform writes remain protected by preview, dry run, explicit confirmation, signed requests, and rollback support.

= Does the plugin publish or edit content automatically? =

No. The plugin syncs bounded metadata and accepts only signed, supported operations after the SaaS has completed its preview, dry run, and explicit confirmation workflow.

= What does the plugin sync? =

It syncs bounded posts/pages inventory and metadata, including URL, title, status, modified time, author, publish date, featured-image presence, taxonomies, word count, link counts, and supported SEO metadata signals. It does not sync post bodies.

= What happens when I deactivate the plugin? =

Recurring and queued local sync jobs are removed. Disconnect the site from the settings page before deleting the plugin when you also need to invalidate its SaaS connection token.

= What happens when I delete the plugin? =

WordPress removes the plugin's local audit results, sync log, stored connection token, and scheduled jobs. Disconnect first when you also need to invalidate the connection remotely on the platform.

== External services ==

This plugin connects your WordPress site to the SEO Content Control Center SaaS workspace, an account-based service you sign up for separately. No SaaS endpoint is contacted until an administrator enters one on the settings screen and completes the one-time connection exchange.

Once connected, the plugin sends requests to the SaaS endpoint you configured in these cases:

* **Connecting the site** &mdash; the one-time connection challenge you paste in is exchanged for a signed, site-scoped connection token.
* **Scheduled and manual sync** &mdash; bounded post/page metadata (URL, title, status, modified time, author, publish date, featured-image presence, taxonomies, word count, link counts, and supported SEO metadata signals) is sent in paginated batches. Full post/page content bodies are never sent.
* **Receiving SEO operations** &mdash; the SaaS worker sends signed, review-first title/meta-description/canonical/noindex-nofollow proposals for an administrator to preview and confirm before anything is written back to WordPress.
* **Disconnecting the site** &mdash; a request invalidates the stored connection token on the SaaS side.

Every outbound request is signed with a per-site secret and rejected by the SaaS if tampered with. No data is sent to any third party besides the SaaS endpoint you explicitly configure.

See the [SEO Content Control Center Terms of Service](https://seo-content-control-center-marketin.vercel.app/terms) and [Privacy Policy](https://seo-content-control-center-marketin.vercel.app/privacy) for how the connected SaaS handles data.

== Changelog ==

= 0.4.0 =

* Added connected deep links from every local finding to matching platform Content and Audit views.
* Added clear Search Console enrichment context for connected findings.
* Added conservative safe-preview availability hints only for supported Yoast or Rank Math metadata fields.

= 0.3.0 =

* Added local inbound-link mapping with orphan and weak-link findings.
* Added new, resolved, and unchanged comparisons against the previous audit without retaining unlimited history.
* Added daily or weekly local audit scheduling through Action Scheduler or WP-Cron.
* Added bounded ignore rules with active/ignored filtering and inline restore actions.

= 0.2.0 =

* Added a standalone local content health audit with no account or platform connection required.
* Added deterministic checks for published noindex, missing SEO metadata, canonical mismatches, thin content, missing internal links, and stale content.
* Added background batched scanning, latest-result persistence, summary counts, search, filters, edit/view actions, and CSV export.
* Added WordPress Dashboard and Site Health surfaces for local audit status.
* Moved the optional SaaS connection and sync controls to a secondary Platform tab.

= 0.1.0 =

* First packaged release with secure SaaS connection exchange, paginated metadata sync, recurring scheduling, sync logs, and signed review-first SEO metadata operations.
