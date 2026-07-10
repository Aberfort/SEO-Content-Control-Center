import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowDown,
  BarChart3,
  CheckCircle2,
  Link2,
  PlugZap,
  ShieldCheck
} from "lucide-react";
import Link from "next/link";

import { CtaBand } from "../../components/cta-band";
import { PageIntro } from "../../components/page-intro";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "WordPress and Search Console Integrations",
  description:
    "Connect bounded WordPress metadata and Google Search Console performance evidence to one SEO operations workflow.",
  path: "/integrations"
});

const integrations = [
  {
    icon: PlugZap,
    name: "WordPress",
    eyebrow: "Content context",
    title: "Bring the page and its bounded SEO metadata into the workflow.",
    body: "The signed plugin connection syncs a paginated posts/pages inventory and supported metadata signals without sending post bodies.",
    points: [
      "Posts and pages with stable post_type:id targets",
      "Titles, canonical and robots signals, link counts, taxonomy, and content freshness metadata",
      "Yoast and Rank Math support with a fallback read-only title source",
      "Manual and scheduled sync with local logs and bounded batches"
    ]
  },
  {
    icon: BarChart3,
    name: "Google Search Console",
    eyebrow: "Performance evidence",
    title: "Connect trends, pages, and queries to the content your team manages.",
    body: "OAuth-backed property selection and scheduled snapshots make performance context available alongside the associated WordPress URL.",
    points: [
      "Property verification before a connection becomes active",
      "Clicks, impressions, CTR, and average position snapshots",
      "Traffic-loss and opportunity detection from persisted data",
      "Page-to-content matching that keeps the affected URL visible"
    ]
  }
];

export default function IntegrationsPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Integrations"
        title="Two source systems, one accountable SEO workflow."
        body="Connect the WordPress information your team can act on with the Search Console evidence that tells you where action is needed."
        actions={
          <>
            <Link className="button" href="/trial">
              Start free trial <ArrowRight size={17} />
            </Link>
            <Link className="button button-secondary" href="/demo">
              Discuss your stack
            </Link>
          </>
        }
      />

      <section className="integration-flow" aria-label="Integration flow">
        <div>
          <PlugZap size={24} />
          <strong>WordPress</strong>
          <span>Content and metadata context</span>
        </div>
        <ArrowDown className="flow-arrow" size={22} aria-hidden="true" />
        <div>
          <BarChart3 size={24} />
          <strong>Search Console</strong>
          <span>Performance evidence</span>
        </div>
        <ArrowDown className="flow-arrow" size={22} aria-hidden="true" />
        <div className="flow-result">
          <Link2 size={24} />
          <strong>Prioritized SEO backlog</strong>
          <span>Source, owner, decision, outcome</span>
        </div>
      </section>

      <section className="section integration-detail-list">
        {integrations.map(({ icon: Icon, name, eyebrow, title, body, points }) => (
          <article key={name}>
            <div className="integration-detail-mark">
              <Icon size={25} />
              <strong>{name}</strong>
            </div>
            <div>
              <span className="eyebrow">{eyebrow}</span>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
            <ul className="check-list">
              {points.map((point) => (
                <li key={point}>
                  <CheckCircle2 size={17} />
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="section section-tint integration-guardrails">
        <div>
          <span className="eyebrow">Connection guardrails</span>
          <h2>Integration access is intentional, scoped, and inspectable.</h2>
        </div>
        <div>
          <p>
            Credentials are encrypted at rest. Connection state is organization-scoped, and the
            product does not use either integration as permission to make uncontrolled content
            changes.
          </p>
          <Link className="inline-link" href="/security">
            Review the implemented safeguards <ShieldCheck size={16} />
          </Link>
        </div>
      </section>

      <CtaBand
        eyebrow="Bring the actual source systems"
        title="Validate the workflow against a WordPress site and its Search Console property."
        body="The trial starts with one scoped site, while a demo can cover a larger portfolio or security review."
      />
    </main>
  );
}
