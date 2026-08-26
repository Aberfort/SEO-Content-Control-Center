import type { Metadata } from "next";
import { CheckCircle2, Download, KeyRound, Link2, Power, Puzzle, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { CtaBand } from "../../components/cta-band";
import { PageIntro } from "../../components/page-intro";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Download the WordPress Plugin",
  description:
    "Download and install the Content Signal WordPress plugin to sync bounded content metadata and receive signed, review-first SEO operations.",
  path: "/download"
});

const capabilities = [
  "Exchanges a one-time connection challenge for a site-scoped connection",
  "Syncs bounded post and page metadata in paginated batches, never post bodies",
  "Schedules recurring sync through Action Scheduler, with an hourly WP-Cron fallback",
  "Shows sanitized sync history in the WordPress admin",
  "Receives signed, review-first SEO title, meta description, and canonical repairs"
];

const installSteps = [
  {
    icon: Download,
    marker: "1",
    title: "Download and upload",
    body: "Download the plugin archive, then upload it from Plugins > Add New > Upload Plugin in WordPress."
  },
  {
    icon: Power,
    marker: "2",
    title: "Activate the plugin",
    body: "Activate Content Signal from your Plugins list, then open Content Health in the WordPress admin menu."
  },
  {
    icon: KeyRound,
    marker: "3",
    title: "Create a connection challenge",
    body: "In your SaaS workspace, create a one-time WordPress connection challenge for this site."
  },
  {
    icon: Link2,
    marker: "4",
    title: "Connect the site",
    body: "Paste the SaaS endpoint and challenge into the plugin settings and select Connect site."
  }
];

export default function DownloadPage() {
  return (
    <main>
      <PageIntro
        eyebrow="WordPress plugin"
        title="Connect your WordPress site in minutes."
        body="Install the Content Signal plugin to sync bounded content metadata, schedule recurring sync, and receive signed, review-first SEO operations."
        actions={
          <Link className="button button-secondary" href="/demo">
            Talk to us first
          </Link>
        }
      />

      <section className="plugin-download">
        <div className="plugin-download-card">
          <span className="plugin-download-icon" aria-hidden="true">
            <Puzzle size={26} />
          </span>
          <div className="plugin-download-info">
            <strong>Content Signal</strong>
            <div className="plugin-meta-row">
              <span className="plugin-meta">Version 0.8.1</span>
              <span className="plugin-meta">WordPress 6.4+</span>
              <span className="plugin-meta">PHP 8.1+</span>
              <span className="plugin-meta">55 KB</span>
            </div>
          </div>
          <a
            className="button button-dark"
            href="/downloads/content-signal-seo-content-audit-0.8.1.zip"
            download
          >
            Download plugin
            <Download size={17} />
          </a>
        </div>
        <p className="plugin-download-note">
          Manual install only for now &mdash; the plugin is under review for the WordPress.org
          directory, so install it by uploading the archive directly until it&apos;s listed.
        </p>
      </section>

      <section className="section">
        <div className="section-heading">
          <span className="eyebrow">What the plugin does</span>
          <h2>A bounded, signed bridge between WordPress and your SaaS workspace.</h2>
        </div>
        <ul className="check-list">
          {capabilities.map((point) => (
            <li key={point}>
              <CheckCircle2 size={17} />
              {point}
            </li>
          ))}
        </ul>
      </section>

      <section className="section section-tint product-spine-section">
        <div className="section-heading">
          <span className="eyebrow">Installation</span>
          <h2>Four steps from upload to a working connection.</h2>
        </div>
        <div className="product-spine">
          {installSteps.map(({ icon: Icon, marker, title, body }) => (
            <article key={marker}>
              <div>
                <span>{marker}</span>
                <Icon size={22} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section integration-guardrails">
        <div>
          <span className="eyebrow">Review-first by design</span>
          <h2>The plugin never publishes a change on its own.</h2>
        </div>
        <div>
          <p>
            Every supported SEO operation the SaaS worker sends is signed, previewed, and requires
            explicit confirmation before it reaches WordPress. The plugin does not send post bodies
            during sync, and connection secrets are stored with autoload disabled.
          </p>
          <Link className="inline-link" href="/security">
            Review the implemented safeguards <ShieldCheck size={16} />
          </Link>
        </div>
      </section>

      <CtaBand
        eyebrow="Ready to connect a site?"
        title="Pair the plugin with a SaaS workspace."
        body="Start a trial to create your account and generate a connection challenge, or request a demo to see the full workflow first."
      />
    </main>
  );
}
