import type { Metadata } from "next";
import { ArrowRight, FileSearch, ListChecks, PlugZap, ShieldCheck } from "lucide-react";
import Link from "next/link";

import { CtaBand } from "../../components/cta-band";
import { PageIntro } from "../../components/page-intro";
import { ProductPreview } from "../../components/product-preview";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Product Overview",
  description:
    "See how SEO Content Control Center connects WordPress metadata and Search Console evidence to a review-first SEO workflow.",
  path: "/product"
});

const stages = [
  {
    icon: PlugZap,
    marker: "Context",
    title: "Connect the operating context",
    body: "Signed WordPress metadata sync and Google Search Console access bring the page, its SEO state, and its performance evidence into one tenant-scoped view."
  },
  {
    icon: FileSearch,
    marker: "Evidence",
    title: "Find work worth doing",
    body: "Audits, traffic-loss checks, and opportunity detection expose affected URLs with the evidence needed to decide whether a task deserves attention."
  },
  {
    icon: ListChecks,
    marker: "Backlog",
    title: "Run one accountable backlog",
    body: "Impact, effort, owner, due date, status, comments, and source records stay attached as work moves from triage to completion."
  },
  {
    icon: ShieldCheck,
    marker: "Safety",
    title: "Apply supported changes carefully",
    body: "Bounded SEO operations use a visible preview, dry run, explicit confirmation, signed worker execution, and recorded result or restoration state."
  }
];

export default function ProductPage() {
  return (
    <main>
      <PageIntro
        eyebrow="The product"
        title="An operating system for WordPress SEO work, not another disconnected audit."
        body="SEO Content Control Center holds the context around a page, turns evidence into accountable work, and keeps supported changes inside a review-first process."
        actions={
          <>
            <Link className="button" href="/trial">
              Start free trial <ArrowRight size={17} />
            </Link>
            <Link className="button button-secondary" href="/demo">
              Request a demo
            </Link>
          </>
        }
      />

      <section className="feature-preview-band product-preview-band">
        <ProductPreview />
      </section>

      <section className="section product-spine-section">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">One connected loop</span>
            <h2>Bring evidence, decisions, and execution into the same operational view.</h2>
          </div>
          <p>
            The product keeps each stage bounded: integrations provide defined metadata and metrics,
            teams decide what to act on, and supported writes require human approval before
            WordPress changes.
          </p>
        </div>
        <div className="product-spine">
          {stages.map(({ icon: Icon, marker, title, body }) => (
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

      <section className="product-boundaries">
        <div>
          <span className="eyebrow">Designed with boundaries</span>
          <h2>Useful automation without hidden publishing.</h2>
        </div>
        <div className="product-boundary-list">
          <p>
            <strong>Evidence stays visible.</strong> Recommendations retain their audit, synced
            content, or Search Console source instead of presenting an unexplained score.
          </p>
          <p>
            <strong>Permissions stay scoped.</strong> Organizations, sites, members, credentials,
            and operation records are separated by tenant and role.
          </p>
          <p>
            <strong>Writes stay controlled.</strong> The product does not auto-publish content;
            supported SEO metadata operations are deliberately constrained and review-first.
          </p>
        </div>
      </section>

      <CtaBand
        eyebrow="See the operating view"
        title="Use one real WordPress site to test the workflow end to end."
        body="Start a scoped trial, or request a guided walkthrough that follows the work your team actually needs to manage."
      />
    </main>
  );
}
