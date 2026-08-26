=== Content Signal — SEO Content Audit ===
Contributors: serhiivasyliev
Tags: seo, search-console, content-audit, workflow
Requires at least: 6.4
Tested up to: 7.1
Requires PHP: 8.1
Stable tag: 0.8.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Audit posts and pages for missing SEO metadata, noindex risk, thin or stale content, and internal-link gaps. Runs locally, no account required.

== Description ==

Content Signal is a read-only WordPress content health audit that works alongside Yoast SEO and Rank Math. Run it locally without an account, API key, URL quota, or external request.

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

The optional Content Signal platform connection can:

* exchange a one-time connection challenge for a site-scoped connection;
* sync bounded content metadata and active findings from the latest completed local audit in paginated batches;
* materialize local findings as platform audit issues and combine them with Google Search Console traffic loss and opportunity data;
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
3. Activate Content Signal.
4. Open Content Health in the WordPress admin menu.
5. Select Run content audit.
6. Review or export the local findings.

No platform connection is required for the local audit. To add Search Console evidence, team workflow, audit history, and review-first metadata operations, open the Platform tab and connect the site with a challenge created in the SaaS workspace.

== Frequently Asked Questions ==

= Does this replace my SEO plugin? =

No. Content Signal is an operations layer that connects WordPress metadata, Search Console evidence, audits, and a trackable backlog. It works with supported Yoast and Rank Math metadata fields for bounded operations.

= Does the free audit require an account or send data elsewhere? =

No. The content health audit runs locally in WordPress and does not require an account, API key, URL quota, or external request. External communication starts only after an administrator explicitly connects the optional platform.

= Does the local audit modify posts or SEO metadata? =

No. The local audit is read-only. It explains findings and links to the normal WordPress editor. Connected platform writes remain protected by preview, dry run, explicit confirmation, signed requests, and rollback support.

= Does the plugin publish or edit content automatically? =

No. The plugin syncs bounded metadata and accepts only signed, supported operations after the SaaS has completed its preview, dry run, and explicit confirmation workflow.

= What does the plugin sync? =

It syncs bounded posts/pages inventory and metadata, including URL, title, status, modified time, author, publish date, featured-image presence, taxonomies, word count, link counts, supported SEO metadata signals, and active findings from the latest completed local audit. A finding contains only its allow-listed code, label, severity, short evidence, and fingerprint. It does not sync post bodies, the full link graph, or ignored findings.

= What happens when I deactivate the plugin? =

Recurring and queued local sync jobs are removed. Disconnect the site from the settings page before deleting the plugin when you also need to invalidate its SaaS connection token.

= What happens when I delete the plugin? =

WordPress removes the plugin's local audit results, sync log, stored connection token, and scheduled jobs. Disconnect first when you also need to invalidate the connection remotely on the platform.

== Screenshots ==

1. Content Health dashboard: audit summary, findings list with severity, evidence, and edit/view/ignore actions.

== External services ==

This plugin connects your WordPress site to the Content Signal SaaS workspace, an account-based service you sign up for separately. No SaaS endpoint is contacted until an administrator enters one on the settings screen and completes the one-time connection exchange.

Once connected, the plugin sends requests to the SaaS endpoint you configured in these cases:

* **Connecting the site** &mdash; the one-time connection challenge you paste in is exchanged for a signed, site-scoped connection token.
* **Scheduled and manual sync** &mdash; bounded post/page metadata (URL, title, status, modified time, author, publish date, featured-image presence, taxonomies, word count, link counts, supported SEO metadata signals, and active findings from the latest completed local audit) is sent in paginated batches. Each finding is limited to an allow-listed code, label, severity, short evidence, and fingerprint. Full post/page content bodies, the full internal-link graph, and ignored findings are never sent.
* **Receiving SEO operations** &mdash; the SaaS worker sends signed, review-first title/meta-description/canonical/noindex-nofollow proposals for an administrator to preview and confirm before anything is written back to WordPress.
* **Disconnecting the site** &mdash; a request invalidates the stored connection token on the SaaS side.

Every outbound request is signed with a per-site secret and rejected by the SaaS if tampered with. No data is sent to any third party besides the SaaS endpoint you explicitly configure.

See the [Content Signal Terms of Service](https://seo-content-control-center-marketin.vercel.app/terms) and [Privacy Policy](https://seo-content-control-center-marketin.vercel.app/privacy) for how the connected SaaS handles data.

== Changelog ==

= 0.8.1 =

* Set the text domain to match the plugin slug (`content-signal-seo-content-audit`).
* Updated Tested up to 7.1.
* Added nonce verification to the findings filter form; invalid or missing nonces fall back to the unfiltered view instead of trusting the input.
* Documented why the tab/status/error redirect-target readers do not use a nonce (server-generated values from this plugin's own already-verified redirects, matched against a fixed allow-list).

= 0.8.0 =

* Renamed the plugin to Content Signal — SEO Content Audit ahead of WordPress.org submission.
* Removed the self-hosted GitHub updater. The plugin now receives updates through the WordPress.org plugin directory.

= 0.6.0 =

* Rebuilt the plugin admin as a branded, responsive control surface with compact navigation and clear local/platform states.
* Reworked audit summaries, filters, findings, connection setup, sync activity, controls, and feedback states for faster scanning.
* Added a consistent accessible color system, keyboard focus treatment, responsive layouts, and reduced-motion support.

= 0.5.0 =

* Synced active, bounded findings from the latest completed local audit with matching content items.
* Materialized WordPress local findings as deduplicated platform audit issues, including orphan and weak-link evidence that metadata alone cannot reproduce.
* Kept post bodies, the full link graph, ignored findings, and incomplete audit state outside the SaaS sync payload.

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
