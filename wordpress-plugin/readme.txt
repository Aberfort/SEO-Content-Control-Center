=== SEO Content Control Center ===
Contributors: seo-content-control-center
Tags: seo, search-console, content-audit, workflow
Requires at least: 6.4
Tested up to: 6.4
Requires PHP: 8.1
Stable tag: 0.1.0
License: Proprietary

Connect WordPress to SEO Content Control Center for evidence-backed SEO audits, a prioritized backlog, and review-first SEO metadata operations.

== Description ==

SEO Content Control Center connects a WordPress site to the SEO Content Control Center SaaS workspace.

The plugin can:

* exchange a one-time connection challenge for a site-scoped connection;
* sync bounded content metadata for posts and pages in paginated batches;
* schedule recurring sync through Action Scheduler, with an hourly WP-Cron fallback;
* show sanitized sync history in the WordPress admin;
* receive signed, review-first SEO title/meta-description operations plus bounded self-canonical and individual noindex/nofollow repairs from the SaaS worker.

The plugin does not send post bodies during content sync. Risky SEO changes are never made from the SaaS without a preview, dry run, explicit confirmation, signed request, and recorded result.

== Installation ==

1. Download the `seo-content-control-center-<version>.zip` release artifact.
2. In WordPress, go to Plugins > Add New > Upload Plugin and select the archive.
3. Activate SEO Content Control Center.
4. Open Settings > SEO Content Control Center.
5. In the SaaS workspace, create a WordPress connection challenge for the target site.
6. Paste the SaaS endpoint and connection challenge into the plugin settings, then select Connect site.

After a successful connection, the plugin schedules automatic sync and allows an administrator to queue a manual sync.

== Frequently Asked Questions ==

= Does this replace my SEO plugin? =

No. SEO Content Control Center is an operations layer that connects WordPress metadata, Search Console evidence, audits, and a trackable backlog. It works with supported Yoast and Rank Math metadata fields for bounded operations.

= Does the plugin publish or edit content automatically? =

No. The plugin syncs bounded metadata and accepts only signed, supported operations after the SaaS has completed its preview, dry run, and explicit confirmation workflow.

= What does the plugin sync? =

It syncs bounded posts/pages inventory and metadata, including URL, title, status, modified time, author, publish date, featured-image presence, taxonomies, word count, link counts, and supported SEO metadata signals. It does not sync post bodies.

= What happens when I deactivate the plugin? =

Recurring and queued local sync jobs are removed. Disconnect the site from the settings page before deleting the plugin when you also need to invalidate its SaaS connection token.

== Changelog ==

= 0.1.0 =

* First packaged release with secure SaaS connection exchange, paginated metadata sync, recurring scheduling, sync logs, and signed review-first SEO metadata operations.
