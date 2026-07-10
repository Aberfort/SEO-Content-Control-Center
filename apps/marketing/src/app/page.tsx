import type { Metadata } from "next";
import {
  ArrowRight,
  Blocks,
  Bot,
  Check,
  FileSearch,
  Gauge,
  History,
  ListChecks,
  PlugZap,
  ShieldCheck,
  UsersRound,
  Workflow
} from "lucide-react";
import Link from "next/link";

import { CtaBand } from "../components/cta-band";
import { ProductPreview } from "../components/product-preview";
import { pageMetadata } from "../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "SEO Content Control Center for WordPress",
  description:
    "Find WordPress pages losing organic traffic, prioritize fixes with Search Console evidence, and run review-first SEO operations.",
  path: "/"
});

const workflow = [
  {
    number: "01",
    title: "Connect the evidence",
    body: "Bring WordPress content metadata and Google Search Console performance into one tenant-isolated workspace."
  },
  {
    number: "02",
    title: "Prioritize what matters",
    body: "Turn traffic losses and technical findings into scored tasks with evidence, effort, owner, and status."
  },
  {
    number: "03",
    title: "Review, apply, verify",
    body: "Preview supported changes, run a dry check, confirm explicitly, and preserve the audit trail and rollback state."
  }
];

const capabilities = [
  {
    icon: Gauge,
    title: "Traffic-loss detection",
    body: "Compare Search Console periods and surface pages where clicks, impressions, CTR, or position are moving the wrong way."
  },
  {
    icon: FileSearch,
    title: "Explainable site audits",
    body: "See the affected URL, the rule that fired, supporting evidence, and a recommended next step."
  },
  {
    icon: ListChecks,
    title: "Prioritized SEO backlog",
    body: "Move findings into an operational queue with impact, effort, assignment, due date, and before/after evidence."
  },
  {
    icon: ShieldCheck,
    title: "Review-first operations",
    body: "Keep risky changes behind preview, validation, dry run, confirmation, logging, and restoration controls."
  },
  {
    icon: History,
    title: "Measurable follow-through",
    body: "Track what changed, who approved it, and whether the page recovered after the work was completed."
  },
  {
    icon: Bot,
    title: "Evidence-grounded assistant",
    body: "Get recommendations derived from your backlog, synced content, and GSC signals, with sources kept visible."
  }
];

const audiences = [
  {
    icon: Blocks,
    title: "SEO agencies",
    body: "Separate client organizations, standardize audits, and keep owners and approvals visible across many sites."
  },
  {
    icon: UsersRound,
    title: "Content and editorial teams",
    body: "Give writers and editors a clear queue of pages to improve without exposing every technical control."
  },
  {
    icon: Workflow,
    title: "In-house SEO teams",
    body: "Connect analysis to execution and show stakeholders which high-impact work actually reached done."
  }
];

const faqs = [
  {
    question: "Does the product change WordPress content automatically?",
    answer:
      "No. Supported write operations require a preview, validation, a dry run, and explicit confirmation. The system records the action and captures restoration state where rollback is supported."
  },
  {
    question: "Do I need to replace my existing SEO plugin?",
    answer:
      "No. SEO Content Control Center is an operations layer. It connects performance evidence, audit findings, tasks, and controlled changes rather than trying to become another title-and-meta plugin."
  },
  {
    question: "Can agencies keep client data separated?",
    answer:
      "Yes. Organizations, sites, memberships, jobs, and audit records are tenant-scoped, with role-based permissions around sensitive actions."
  },
  {
    question: "What happens during the trial?",
    answer:
      "The 14-day trial supports one site, up to 500 URLs, and two users so your team can validate the workflow with a real WordPress property."
  }
];

export default function MarketingHomePage() {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">WordPress SEO operations</span>
          <h1>SEO Content Control Center</h1>
          <p>
            Find the WordPress pages costing you traffic, understand why, and turn the evidence into
            a prioritized backlog your team can execute safely.
          </p>
          <div className="hero-actions">
            <Link className="button" href="/trial">
              Start free trial
              <ArrowRight size={17} />
            </Link>
            <Link className="button button-secondary" href="/demo">
              See the workflow
            </Link>
          </div>
          <p className="hero-note">
            <Check size={15} /> 14 days, one site, no automatic publishing
          </p>
        </div>
        <ProductPreview />
      </section>

      <section className="proof-strip" aria-label="Product principles">
        <span>WordPress-native</span>
        <span>Search Console evidence</span>
        <span>Human-approved changes</span>
        <span>Tenant-isolated workspaces</span>
      </section>

      <section className="section problem-section">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">From signals to shipped work</span>
            <h2>Your SEO tools find problems. Your team still has to operationalize them.</h2>
          </div>
          <p>
            Search Console, spreadsheets, audit exports, tickets, and WordPress all hold one piece
            of the story. The control center brings that story into a single workflow with evidence
            and accountability attached.
          </p>
        </div>
        <div className="workflow-grid">
          {workflow.map((step) => (
            <article className="workflow-step" key={step.number}>
              <span>{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-tint">
        <div className="section-heading">
          <span className="eyebrow">A connected operations layer</span>
          <h2>Every finding stays attached to the context needed to act.</h2>
          <p>
            Analysis is only useful when someone can decide, assign, execute, and verify the work
            without reconstructing the evidence from scratch.
          </p>
        </div>
        <div className="capability-grid">
          {capabilities.map(({ icon: Icon, title, body }) => (
            <article className="capability" key={title}>
              <span className="icon-box">
                <Icon size={20} />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
        <Link className="inline-link" href="/features">
          Explore all product capabilities <ArrowRight size={16} />
        </Link>
      </section>

      <section className="section">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">Built around the team</span>
            <h2>One backlog, with the right controls for every role.</h2>
          </div>
          <p>
            Owners and administrators control connections and operations. Members move work forward.
            Viewers can follow progress without gaining write access.
          </p>
        </div>
        <div className="audience-grid">
          {audiences.map(({ icon: Icon, title, body }) => (
            <article className="audience" key={title}>
              <Icon size={23} />
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="integration-band">
        <div>
          <span className="eyebrow">Two sources, one operating view</span>
          <h2>WordPress content context meets Search Console performance.</h2>
          <p>
            The plugin syncs content metadata in bounded batches. Google Search Console adds query,
            page, and period evidence. The backlog connects both without hiding where a
            recommendation came from.
          </p>
        </div>
        <div className="integration-map" aria-label="WordPress and Search Console integration flow">
          <div>
            <PlugZap size={22} />
            <strong>WordPress</strong>
            <span>Content, metadata, links</span>
          </div>
          <span className="connector-line">+</span>
          <div>
            <Gauge size={22} />
            <strong>Search Console</strong>
            <span>Clicks, CTR, queries</span>
          </div>
          <span className="connector-line">=</span>
          <div className="map-result">
            <ListChecks size={22} />
            <strong>Prioritized backlog</strong>
            <span>Evidence, owner, outcome</span>
          </div>
        </div>
      </section>

      <section className="section pricing-preview">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">Start with one live site</span>
            <h2>A 14-day trial that lets the workflow prove itself.</h2>
          </div>
          <div>
            <p>
              Connect one WordPress property, sync up to 500 URLs, invite a teammate, and see
              whether the backlog surfaces work worth doing.
            </p>
            <Link className="inline-link" href="/pricing">
              Compare plans <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section faq-section">
        <div className="section-heading">
          <span className="eyebrow">Questions before you connect a site</span>
          <h2>Clear answers for review-first teams.</h2>
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}</summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <CtaBand />
    </main>
  );
}
