import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  ChartNoAxesCombined,
  Check,
  ClipboardCheck,
  Eye,
  FileText,
  FlaskConical,
  History,
  KeyRound,
  ListChecks,
  PlugZap,
  RotateCcw
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
    icon: PlugZap,
    title: "Connect the evidence",
    body: "Bring bounded WordPress metadata and Google Search Console performance into one tenant-scoped workspace."
  },
  {
    number: "02",
    icon: ListChecks,
    title: "Prioritize what matters",
    body: "Turn traffic losses, indexability findings, and content opportunities into tasks with impact, effort, owner, and status."
  },
  {
    number: "03",
    icon: ClipboardCheck,
    title: "Review, apply, verify",
    body: "Preview supported changes, run a dry check, confirm explicitly, and preserve the activity and restoration record."
  }
];

const audiences = [
  {
    icon: Blocks,
    label: "SEO agencies",
    body: "Separate client organizations, standardize delivery, and keep ownership and approvals visible across many WordPress sites.",
    href: "/solutions/agencies"
  },
  {
    icon: FileText,
    label: "Content teams",
    body: "Give writers and editors a focused queue of pages to improve without exposing unnecessary integration or execution controls.",
    href: "/solutions/content-teams"
  },
  {
    icon: ChartNoAxesCombined,
    label: "Publishers",
    body: "Connect a large WordPress inventory to Search Console evidence and prioritize the pages where attention can matter most.",
    href: "/solutions/publishers"
  }
];

const safeguards = [
  { icon: Eye, label: "Preview before supported writes" },
  { icon: FlaskConical, label: "Dry run before confirmation" },
  { icon: BadgeCheck, label: "Explicit human approval" },
  { icon: KeyRound, label: "Signed WordPress execution" },
  { icon: RotateCcw, label: "Captured restoration values" },
  { icon: History, label: "Per-item result and activity history" }
];

export default function MarketingHomePage() {
  return (
    <main className="home-redesign">
      <section className="home-hero">
        <div className="home-hero-inner">
          <div className="home-hero-copy">
            <span className="eyebrow">WordPress SEO operations</span>
            <h1>SEO Content Control Center</h1>
            <p>
              Find the WordPress pages costing you traffic, understand why, and turn the evidence
              into a prioritized backlog your team can execute safely.
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
            <p className="home-hero-note">
              <Check size={16} />
              <span>14 days</span>
              <i aria-hidden="true" />
              <span>One WordPress site</span>
              <i aria-hidden="true" />
              <span>No automatic publishing</span>
            </p>
          </div>

          <div className="home-hero-scene">
            <div className="home-scene-label">
              <span>Live operating view</span>
              <strong>Evidence → backlog → verified work</strong>
            </div>
            <ProductPreview />
          </div>
        </div>

        <div className="home-proof-strip" aria-label="Product principles">
          <span>WordPress-native</span>
          <span>Search Console evidence</span>
          <span>Human-approved changes</span>
          <span>Tenant-isolated workspaces</span>
        </div>
      </section>

      <section className="home-workflow-section">
        <div className="home-section-intro">
          <div>
            <span className="eyebrow">From signals to shipped work</span>
            <h2>
              Your SEO tools find problems. The control center turns them into accountable work.
            </h2>
          </div>
          <p>
            Search Console, audit exports, spreadsheets, tickets, and WordPress normally hold
            separate parts of the same story. This workflow keeps the page, evidence, decision, and
            outcome together.
          </p>
        </div>

        <div className="home-workflow-grid">
          {workflow.map(({ number, icon: Icon, title, body }) => (
            <article key={number}>
              <div className="home-step-heading">
                <span>{number}</span>
                <Icon size={21} />
              </div>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>

        <div className="home-integration-ledger" aria-label="Connected SEO workflow">
          <div>
            <span className="home-source-icon">
              <PlugZap size={20} />
            </span>
            <div>
              <strong>WordPress</strong>
              <small>Content, metadata, links</small>
            </div>
          </div>
          <span className="home-operator" aria-hidden="true">
            +
          </span>
          <div>
            <span className="home-source-icon home-source-icon-coral">
              <ChartNoAxesCombined size={20} />
            </span>
            <div>
              <strong>Google Search Console</strong>
              <small>Clicks, impressions, CTR, queries</small>
            </div>
          </div>
          <span className="home-operator" aria-hidden="true">
            =
          </span>
          <div className="home-ledger-result">
            <span className="home-source-icon">
              <ListChecks size={20} />
            </span>
            <div>
              <strong>Prioritized SEO backlog</strong>
              <small>Evidence, owner, decision, outcome</small>
            </div>
          </div>
        </div>
      </section>

      <section className="home-team-section">
        <div className="home-section-intro">
          <div>
            <span className="eyebrow">Built around the team</span>
            <h2>One backlog, with the right context and controls for every role.</h2>
          </div>
          <p>
            Owners and administrators manage connections and sensitive operations. Delivery teams
            move prioritized work forward. Stakeholders can follow progress without gaining write
            access.
          </p>
        </div>

        <div className="home-audience-list">
          {audiences.map(({ icon: Icon, label, body, href }, index) => (
            <Link href={href} key={label}>
              <span className="home-audience-index">0{index + 1}</span>
              <span className="home-audience-icon">
                <Icon size={22} />
              </span>
              <span className="home-audience-copy">
                <strong>{label}</strong>
                <small>{body}</small>
              </span>
              <ArrowRight size={19} />
            </Link>
          ))}
        </div>

        <div className="home-safety-band">
          <div className="home-safety-copy">
            <span className="eyebrow">Review-first by design</span>
            <h2>Useful automation with a visible safety chain.</h2>
            <p>
              Supported SEO metadata changes stay bounded from the first preview through the final
              WordPress result.
            </p>
            <Link className="inline-link" href="/security">
              Review the safeguards <ArrowRight size={16} />
            </Link>
          </div>
          <div className="home-safeguard-grid">
            {safeguards.map(({ icon: Icon, label }) => (
              <div key={label}>
                <Icon size={18} />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>

        <CtaBand
          eyebrow="See it with a real site"
          title="Use one WordPress site to test the workflow end to end."
          body="Start a scoped trial, or request a guided walkthrough for a larger site portfolio or agency process."
        />
      </section>
    </main>
  );
}
