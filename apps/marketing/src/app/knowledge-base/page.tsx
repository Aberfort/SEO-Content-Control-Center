import type { Metadata } from "next";
import { ArrowRight, BookOpenCheck, PlugZap, ShieldCheck, Workflow } from "lucide-react";
import Link from "next/link";

import { PageIntro } from "../../components/page-intro";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Knowledge Base",
  description:
    "Learn the operating model behind SEO Content Control Center: integrations, review-first changes, permissions, and evidence-backed SEO workflow design.",
  path: "/knowledge-base"
});

const guides = [
  {
    icon: PlugZap,
    category: "Integrations",
    title: "Connect WordPress and Search Console with clear boundaries.",
    body: "Understand the source data, connection lifecycle, bounded sync metadata, and the evidence each integration contributes.",
    href: "/integrations",
    label: "Explore integrations"
  },
  {
    icon: Workflow,
    category: "Workflow",
    title: "Move from a finding to completed SEO work without losing context.",
    body: "See how audit evidence, backlog ownership, status, review, and supported execution fit into one operating loop.",
    href: "/product",
    label: "Explore the product"
  },
  {
    icon: ShieldCheck,
    category: "Controls",
    title: "Understand the review-first safety model for supported changes.",
    body: "Review tenant boundaries, encrypted credentials, explicit confirmation, signed execution, rollback state, and audit history.",
    href: "/security",
    label: "Review safeguards"
  }
];

export default function KnowledgeBasePage() {
  return (
    <main>
      <PageIntro
        eyebrow="Knowledge base"
        title="The working model behind evidence-backed SEO operations."
        body="Start with the parts that help your team evaluate a real workflow: what connects, what gets prioritized, what can change, and which controls stay in view."
      />

      <section className="section knowledge-guides">
        {guides.map(({ icon: Icon, category, title, body, href, label }) => (
          <article key={title}>
            <span className="icon-box">
              <Icon size={21} />
            </span>
            <span className="eyebrow">{category}</span>
            <h2>{title}</h2>
            <p>{body}</p>
            <Link className="inline-link" href={href}>
              {label} <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </section>

      <section className="knowledge-disclosure">
        <BookOpenCheck size={23} />
        <div>
          <span className="eyebrow">Documentation scope</span>
          <h2>Public guidance follows the implementation.</h2>
          <p>
            The product pages explain current behavior in practical language. Contract-level API and
            plugin documentation live with the deployed software and are updated alongside the
            implementation.
          </p>
        </div>
        <Link className="button button-secondary" href="/changelog">
          Read product updates
        </Link>
      </section>
    </main>
  );
}
