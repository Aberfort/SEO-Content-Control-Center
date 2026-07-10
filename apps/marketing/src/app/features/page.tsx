import type { Metadata } from "next";
import {
  ArrowRight,
  Bot,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileSearch,
  History,
  ListTodo,
  Plug,
  RotateCcw,
  ShieldCheck,
  UsersRound
} from "lucide-react";
import Link from "next/link";

import { CtaBand } from "../../components/cta-band";
import { PageIntro } from "../../components/page-intro";
import { ProductPreview } from "../../components/product-preview";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "WordPress SEO Operations Features",
  description:
    "Connect WordPress and Search Console, detect SEO opportunities, prioritize a team backlog, and apply supported changes through review-first controls.",
  path: "/features"
});

const featureGroups = [
  {
    icon: Plug,
    label: "Connect",
    title: "Keep content and performance evidence in sync.",
    body: "Use the signed WordPress plugin connection and Google Search Console OAuth flow to create a reliable operating view for each site.",
    points: [
      "Bounded, paginated WordPress metadata sync",
      "Search Console properties, metrics, queries, and pages",
      "Connection health and sync logs",
      "Organization-scoped credentials and access"
    ]
  },
  {
    icon: FileSearch,
    label: "Diagnose",
    title: "See what changed and why it deserves attention.",
    body: "Audit rules and Search Console comparisons expose the affected URL, the observed signal, and the evidence behind each issue.",
    points: [
      "Metadata, link, and indexability checks",
      "Traffic-loss and opportunity detection",
      "Period-over-period evidence",
      "Issue exports for downstream analysis"
    ]
  },
  {
    icon: ListTodo,
    label: "Prioritize",
    title: "Turn findings into a backlog people can own.",
    body: "Rank work by impact and effort, assign it, move it through a clear status workflow, and keep the source finding attached.",
    points: [
      "Impact and effort scoring",
      "Owners, due dates, status, and notes",
      "Bulk task creation and exports",
      "Role-aware organization activity"
    ]
  },
  {
    icon: ShieldCheck,
    label: "Operate",
    title: "Make supported WordPress changes with a visible safety chain.",
    body: "SEO title and meta-description operations move through preview, validation, dry run, confirmation, execution, and recorded outcome.",
    points: [
      "Explicit confirmation before execution",
      "Signed requests to the WordPress apply endpoint",
      "Captured previous values for supported rollback",
      "Retry controls for failed execution or restoration"
    ]
  }
];

const operationalFeatures = [
  {
    icon: UsersRound,
    title: "Role-based collaboration",
    body: "Owner, Admin, Member, and Viewer permissions keep sensitive connections and operations appropriately scoped."
  },
  {
    icon: History,
    title: "Audit history",
    body: "Track membership, connection, backlog, billing, and operation events with tenant context and timestamps."
  },
  {
    icon: Bot,
    title: "Grounded recommendations",
    body: "Assistant output uses available backlog, synced content, and Search Console evidence, and keeps those sources visible."
  },
  {
    icon: RotateCcw,
    title: "Restoration workflow",
    body: "For supported operation fields, the worker can restore captured previous values and record the rollback result."
  },
  {
    icon: ChartNoAxesCombined,
    title: "Usage and plan controls",
    body: "Finite site, URL, user, and AI-credit limits are visible and enforced before a gated mutation runs."
  },
  {
    icon: ClipboardCheck,
    title: "Operational health",
    body: "Queue health, job lag, notifications, and error telemetry make failed background work discoverable."
  }
];

export default function FeaturesPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Product capabilities"
        title="From traffic signal to verified SEO work."
        body="SEO Content Control Center joins analysis, prioritization, collaboration, and controlled WordPress execution without hiding the evidence or skipping human approval."
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

      <section className="feature-preview-band">
        <ProductPreview />
      </section>

      <section className="section feature-story-list">
        {featureGroups.map(({ icon: Icon, label, title, body, points }, index) => (
          <article className="feature-story" key={label}>
            <div className="story-index">
              <span>0{index + 1}</span>
              <Icon size={22} />
            </div>
            <div>
              <span className="eyebrow">{label}</span>
              <h2>{title}</h2>
              <p>{body}</p>
            </div>
            <ul className="check-list">
              {points.map((point) => (
                <li key={point}>
                  <span aria-hidden="true">&#10003;</span>
                  {point}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="section section-tint">
        <div className="section-heading">
          <span className="eyebrow">The controls around the workflow</span>
          <h2>Built for the operational details that determine whether work ships.</h2>
        </div>
        <div className="capability-grid">
          {operationalFeatures.map(({ icon: Icon, title, body }) => (
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

      <CtaBand
        eyebrow="See it with your own site"
        title="Bring one real WordPress workflow into the control center."
        body="Use the trial for hands-on validation, or request a guided walkthrough for your team."
      />
    </main>
  );
}
