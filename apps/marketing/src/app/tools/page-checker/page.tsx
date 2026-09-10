import type { Metadata } from "next";
import { Braces, EyeOff, FileText, Heading1, Link2, FileWarning } from "lucide-react";
import Link from "next/link";

import { CtaBand } from "../../../components/cta-band";
import { PageCheckerForm } from "../../../components/page-checker-form";
import { PageIntro } from "../../../components/page-intro";
import { StructuredData } from "../../../components/structured-data";
import { breadcrumbSchema, faqSchema } from "../../../lib/schema";
import { pageMetadata } from "../../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Free WordPress Page SEO Checker",
  description:
    "Check any URL for noindex risk, missing title or meta description, thin content, and a missing canonical tag. Free, instant, no signup.",
  path: "/tools/page-checker"
});

const checks = [
  {
    icon: EyeOff,
    title: "Accidental noindex",
    body: "The single most common way a published page silently disappears from search results."
  },
  {
    icon: FileText,
    title: "Title & meta description",
    body: "Missing, too long, or too short — the fields that actually show up in a search result."
  },
  {
    icon: Heading1,
    title: "H1 presence",
    body: "Whether the page states a clear topic for both readers and search engines."
  },
  {
    icon: Link2,
    title: "Canonical tag",
    body: "Flags a missing canonical, a common cause of duplicate-content confusion."
  },
  {
    icon: FileWarning,
    title: "Thin content",
    body: "A rough word count against the ~300-word floor informational pages usually need to rank."
  },
  {
    icon: Braces,
    title: "Structured data",
    body: "Whether the page carries any JSON-LD that could earn richer search result presentation."
  }
];

const faqEntries = [
  {
    question: "Is this the same audit as the WordPress plugin?",
    answer:
      "No. This is a single on-demand fetch of one URL, useful for a quick check. The free Content Signal WordPress plugin audits every published post and page on your site in bounded background batches and keeps a history of what changed over time."
  },
  {
    question: "Do you store the URLs people check?",
    answer:
      "We capture only the hostname and a count of issues found, for our own product analytics — never the full URL, query string, or the page content itself."
  },
  {
    question: "Does this work on any website, not just WordPress?",
    answer:
      "Yes. The checks here (title, meta description, canonical, meta robots, structured data) apply to any page on the open web, regardless of what built it."
  },
  {
    question: "Why can't it check a localhost or staging URL behind a login?",
    answer:
      "The checker only fetches public, internet-reachable URLs and refuses anything that resolves to a private or internal network address, the same safeguard used for every URL our systems fetch."
  }
];

export default function PageCheckerPage() {
  return (
    <main>
      <StructuredData
        id="page-checker-schema"
        data={[
          faqSchema(faqEntries),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Free page checker", path: "/tools/page-checker" }
          ])
        ]}
      />

      <PageIntro
        eyebrow="Free tool, no signup"
        title="Check one page for the SEO issues that quietly cost you rankings."
        body="Paste a URL. We fetch it once and check for accidental noindex, title and meta description problems, a missing canonical, thin content, and structured data — the same signals Content Signal's WordPress plugin tracks across a whole site."
      />

      <section className="section">
        <PageCheckerForm />
      </section>

      <section className="section section-tint">
        <div className="section-heading">
          <span className="eyebrow">What it checks</span>
          <h2>Six signals, read straight from the live page.</h2>
        </div>
        <div className="capability-grid">
          {checks.map(({ icon: Icon, title, body }) => (
            <article className="capability" key={title}>
              <span className="icon-box">
                <Icon size={20} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section faq-section">
        <div className="section-heading">
          <span className="eyebrow">Common questions</span>
          <h2>What this tool does, and where it stops.</h2>
          <p>Straight answers about scope, privacy, and how this relates to the WordPress plugin.</p>
        </div>
        <div className="faq-list">
          {faqEntries.map((entry) => (
            <details key={entry.question}>
              <summary>{entry.question}</summary>
              <p>{entry.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="section">
        <p className="section-note">
          Want every post and page checked automatically, with a prioritized backlog instead of a
          one-off result? <Link href="/download">Install the free WordPress plugin</Link> or{" "}
          <Link href="/product">see how the full audit works</Link>.
        </p>
      </section>

      <CtaBand
        eyebrow="Beyond one page"
        title="Audit an entire WordPress site, not just one URL at a time."
        body="Connect a site and Search Console to turn findings like these into a prioritized, trackable backlog."
      />
    </main>
  );
}
