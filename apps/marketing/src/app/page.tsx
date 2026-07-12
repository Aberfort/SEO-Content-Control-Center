import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Blocks,
  ChartNoAxesCombined,
  ClipboardCheck,
  Eye,
  FileText,
  FlaskConical,
  History,
  KeyRound,
  ListChecks,
  LockKeyhole,
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

const platformFacts = [
  "WordPress-native inventory",
  "Search Console evidence",
  "Human-approved execution",
  "Tenant-isolated workspaces"
];

export default function MarketingHomePage() {
  return (
    <main className="home-redesign">
      <section className="home-hero">
        <div data-impeccable-carbonize="655161f3" style={{ display: "contents" }}>
          {/* impeccable-carbonize-start 655161f3 */}
          <style data-impeccable-css="655161f3">{`
          @scope ([data-impeccable-variant="1"]) {
          :scope[data-p-density="airy"] > .home-hero-inner {
          padding: clamp(100px, 12vh, 140px) 28px 90px;
          gap: 80px;
          }
          :scope[data-p-density="packed"] > .home-hero-inner {
          padding: clamp(60px, 8vh, 90px) 28px 50px;
          gap: 40px;
          }
          :scope > .home-hero-inner {
          display: grid;
          align-items: center;
          gap: clamp(42px, 4vw, 64px);
          grid-template-columns: minmax(0, 1.06fr) minmax(520px, 0.94fr);
          margin: 0 auto;
          max-width: 1240px;
          padding: clamp(78px, 10vh, 124px) 28px 70px;
          position: relative;
          z-index: 1;
          }
          :scope .home-hero-copy h1 {
          font-size: clamp(2.5rem, 4.5vw, 4.2rem);
          font-weight: 700;
          letter-spacing: -0.03em;
          line-height: 1.05;
          margin: 20px 0 0;
          }
          :scope .home-hero-copy > p:not(.home-hero-note) {
          color: var(--ink-soft);
          font-size: 16px;
          line-height: 1.6;
          max-width: 54ch;
          margin-top: 20px;
          }
          :scope .home-hero-scene {
          background: var(--surface);
          border: 1px solid var(--line-strong);
          border-radius: 6px;
          box-shadow: none;
          padding: 10px;
          overflow: hidden;
          position: relative;
          }
          :scope .home-scene-label {
          border-bottom: 1px solid var(--line);
          padding: 10px 12px 14px;
          display: flex;
          justify-content: space-between;
          }
          }
          
          @scope ([data-impeccable-variant="2"]) {
          :scope[data-p-column-ratio="wide-copy"] > .home-hero-inner {
          grid-template-columns: minmax(0, 1.2fr) minmax(500px, 0.8fr);
          }
          :scope[data-p-column-ratio="wide-scene"] > .home-hero-inner {
          grid-template-columns: minmax(0, 0.9fr) minmax(560px, 1.1fr);
          }
          :scope[data-p-sharpness] .home-hero-scene {
          border-radius: 0px !important;
          }
          :scope > .home-hero-inner {
          display: grid;
          align-items: center;
          gap: 48px;
          grid-template-columns: minmax(0, 1.06fr) minmax(520px, 0.94fr);
          margin: 0 auto;
          max-width: 1240px;
          padding: clamp(80px, 10vh, 120px) 28px 80px;
          border-left: 1px solid var(--line);
          border-right: 1px solid var(--line);
          }
          :scope .home-hero-copy h1 {
          font-size: clamp(2.4rem, 4.2vw, 3.8rem);
          font-weight: 700;
          letter-spacing: -0.02em;
          line-height: 1.1;
          }
          :scope .home-hero-scene {
          background: var(--surface);
          border: 1px solid var(--line-strong);
          border-radius: 4px;
          box-shadow: none;
          padding: 0;
          }
          :scope .home-scene-label {
          border-bottom: 1px solid var(--line);
          padding: 10px 12px 14px;
          display: flex;
          justify-content: space-between;
          }
          }
          
          @scope ([data-impeccable-variant="3"]) {
          :scope[data-p-monospace] .preview-metrics strong,
          :scope[data-p-monospace] .preview-row strong {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace !important;
          letter-spacing: -0.02em;
          }
          :scope[data-p-density="compact"] > .home-hero-inner {
          padding: 60px 28px 40px;
          gap: 32px;
          }
          :scope[data-p-density="compact"] h1 {
          font-size: clamp(2rem, 3.5vw, 3.2rem);
          }
          :scope > .home-hero-inner {
          display: grid;
          align-items: center;
          gap: 48px;
          grid-template-columns: 1fr 1fr;
          margin: 0 auto;
          max-width: 1240px;
          padding: 90px 28px 70px;
          }
          :scope .home-hero-copy h1 {
          font-size: clamp(2.2rem, 4vw, 3.6rem);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.05;
          }
          :scope .home-hero-scene {
          background: var(--surface-soft);
          border: 1px solid var(--line-strong);
          border-radius: 4px;
          box-shadow: none;
          padding: 12px;
          }
          :scope .home-scene-label {
          border-bottom: 1px solid var(--line);
          padding: 10px 12px 14px;
          display: flex;
          justify-content: space-between;
          }
          }
          `}</style>
          {/* impeccable-param-values 655161f3: {"density":"comfortable","monospace":false} */}
          {/* impeccable-carbonize-end 655161f3 */}
          <div data-impeccable-variant="3" style={{ display: 'contents' }}>
            <div className="home-hero-inner">
              <div className="home-hero-copy">
                <span className="home-hero-kicker">WordPress SEO operations</span>
                <h1>Find the pages costing you traffic. Approve every fix.</h1>
                <p>
                  SEO Content Control Center connects WordPress, Search Console, and your team review
                  process so high-impact SEO work moves from evidence to approval without spreadsheets
                  or hidden publishing.
                </p>
                <div className="hero-actions">
                  <Link className="button button-dark" href="/trial">
                    Start trial
                    <ArrowRight size={17} />
                  </Link>
                  <Link className="button button-secondary" href="/demo">
                    See the workflow
                  </Link>
                </div>
                <p className="home-hero-note">
                  <LockKeyhole size={15} />
                  <span>14 days</span>
                  <i aria-hidden="true" />
                  <span>One WordPress site</span>
                  <i aria-hidden="true" />
                  <span>No automatic publishing</span>
                </p>
              </div>

              <div className="home-hero-scene">
                <div className="home-scene-label">
                  <span>Live workflow</span>
                  <strong>Evidence → backlog → review → execution</strong>
                </div>
                <ProductPreview />
              </div>
            </div>
          </div>
        </div>

        <div className="home-proof-strip" aria-label="Product principles">
          {platformFacts.map((fact) => (
            <span key={fact}>{fact}</span>
          ))}
        </div>
      </section>

      <section className="home-workflow-section">
        <div className="home-section-intro">
          <div>
            <span className="eyebrow">From signals to shipped work</span>
            <h2>Search data is only useful when the next action is obvious.</h2>
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
            <h2>A shared queue for agencies, editors, and publishers.</h2>
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
            <h2>Automation that stops at the right moments.</h2>
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
          eyebrow="Start with one site"
          title="Turn the next audit into work your team can approve."
          body="Connect WordPress and Search Console, build a prioritized backlog, and keep every supported write review-first."
        />
      </section>
    </main>
  );
}
