import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";

import { HomeReveals } from "../components/home-reveals";
import { pageMetadata } from "../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "SEO Content Control Center for WordPress",
  description:
    "Find WordPress pages losing organic traffic, prioritize fixes with Search Console evidence, and run review-first SEO operations.",
  path: "/"
});

type HomeIconName =
  | "approval"
  | "arrow"
  | "blocks"
  | "chart"
  | "check"
  | "eye"
  | "file"
  | "filter"
  | "flask"
  | "history"
  | "key"
  | "list"
  | "lock"
  | "plug"
  | "restore"
  | "search";

type HomeIconProps = {
  name: HomeIconName;
  size?: number;
  className?: string;
};

function HomeIcon({ name, size = 18, className }: HomeIconProps) {
  const commonProps = {
    "aria-hidden": true,
    className,
    focusable: false,
    height: size,
    viewBox: "0 0 24 24",
    width: size
  };

  switch (name) {
    case "approval":
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" strokeWidth="2.4" />
          <path
            d="m8.4 12.2 2.4 2.4 4.9-5.2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.6"
          />
        </svg>
      );
    case "arrow":
      return (
        <svg {...commonProps}>
          <path
            d="M5 12h13m-5.2-5.2L18 12l-5.2 5.2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        </svg>
      );
    case "blocks":
      return (
        <svg {...commonProps}>
          <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4z" fill="currentColor" />
          <path d="M14 14h5v5h-5z" fill="none" stroke="currentColor" strokeWidth="2.2" />
        </svg>
      );
    case "chart":
      return (
        <svg {...commonProps}>
          <path d="M5 19V9h3v10H5Zm5.5 0V5h3v14h-3Zm5.5 0v-7h3v7h-3Z" fill="currentColor" />
        </svg>
      );
    case "check":
      return (
        <svg {...commonProps}>
          <path
            d="m5 12.6 4.3 4.1L19 7"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.8"
          />
        </svg>
      );
    case "eye":
      return (
        <svg {...commonProps}>
          <path
            d="M3.8 12s3-5.4 8.2-5.4 8.2 5.4 8.2 5.4-3 5.4-8.2 5.4S3.8 12 3.8 12Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );
    case "file":
      return (
        <svg {...commonProps}>
          <path
            d="M6 3.8h8.2L18 7.6v12.6H6V3.8Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <path
            d="M14 4v4h4M9 12h6M9 16h5"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.2"
          />
        </svg>
      );
    case "filter":
      return (
        <svg {...commonProps}>
          <path
            d="M4 7h16M7 12h10M10 17h4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.6"
          />
        </svg>
      );
    case "flask":
      return (
        <svg {...commonProps}>
          <path
            d="M9 3.8h6M10 4v5.2l-4.6 8A2 2 0 0 0 7.1 20h9.8a2 2 0 0 0 1.7-2.8l-4.6-8V4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <path d="M8.2 15h7.6" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" />
        </svg>
      );
    case "history":
      return (
        <svg {...commonProps}>
          <path
            d="M7.2 8.3H3.8V4.9M4.4 8.3A8.2 8.2 0 1 1 5.9 17"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
          <path d="M12 8v5l3 1.7" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
        </svg>
      );
    case "key":
      return (
        <svg {...commonProps}>
          <circle cx="8.3" cy="12" r="3.5" fill="none" stroke="currentColor" strokeWidth="2.3" />
          <path
            d="M11.8 12H20m-3 0v3m-3-3v2"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.3"
          />
        </svg>
      );
    case "list":
      return (
        <svg {...commonProps}>
          <path
            d="M8 6h12M8 12h12M8 18h12"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="2.6"
          />
          <path
            d="M4 6h.1M4 12h.1M4 18h.1"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="4"
          />
        </svg>
      );
    case "lock":
      return (
        <svg {...commonProps}>
          <path
            d="M7 10V8a5 5 0 0 1 10 0v2M6 10h12v10H6V10Z"
            fill="none"
            stroke="currentColor"
            strokeLinejoin="round"
            strokeWidth="2.2"
          />
          <path d="M12 14v2.5" stroke="currentColor" strokeLinecap="round" strokeWidth="2.4" />
        </svg>
      );
    case "plug":
      return (
        <svg {...commonProps}>
          <path
            d="M8 3v5m8-5v5M6.5 8h11v3.5a5.5 5.5 0 0 1-11 0V8Zm5.5 9v4"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        </svg>
      );
    case "restore":
      return (
        <svg {...commonProps}>
          <path
            d="M7 8H3.8V4.8M4.4 8A8 8 0 1 1 5.8 17.3"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
          <path
            d="M10 11.8 12 14l4-4.4"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2.4"
          />
        </svg>
      );
    case "search":
      return (
        <svg {...commonProps}>
          <circle cx="10.8" cy="10.8" r="5.8" fill="none" stroke="currentColor" strokeWidth="2.3" />
          <path d="m15.2 15.2 4 4" stroke="currentColor" strokeLinecap="round" strokeWidth="2.5" />
        </svg>
      );
  }
}

const workflow = [
  {
    number: "01",
    icon: "plug",
    tag: "Evidence",
    title: "Connect the source data",
    body: "Bring bounded WordPress metadata and Google Search Console performance into one tenant-scoped workspace."
  },
  {
    number: "02",
    icon: "list",
    tag: "Backlog",
    title: "Rank the next pages",
    body: "Turn traffic losses, indexability findings, and content opportunities into work with impact, effort, owner, and status."
  },
  {
    number: "03",
    icon: "check",
    tag: "Approval",
    title: "Review before anything ships",
    body: "Preview supported changes, run a dry check, confirm explicitly, and preserve the activity and restoration record."
  }
] satisfies Array<{
  number: string;
  icon: HomeIconName;
  tag: string;
  title: string;
  body: string;
}>;

const audiences = [
  {
    icon: "blocks",
    label: "SEO agencies",
    body: "Separate client organizations, standardize delivery, and keep ownership and approvals visible across many WordPress sites.",
    href: "/solutions/agencies"
  },
  {
    icon: "file",
    label: "Content teams",
    body: "Give writers and editors a focused queue of pages to improve without exposing unnecessary integration or execution controls.",
    href: "/solutions/content-teams"
  },
  {
    icon: "chart",
    label: "Publishers",
    body: "Connect a large WordPress inventory to Search Console evidence and prioritize the pages where attention can matter most.",
    href: "/solutions/publishers"
  }
] satisfies Array<{
  icon: HomeIconName;
  label: string;
  body: string;
  href: string;
}>;

const safeguards = [
  { icon: "eye", label: "Preview before supported writes" },
  { icon: "flask", label: "Dry run before confirmation" },
  { icon: "approval", label: "Explicit human approval" },
  { icon: "key", label: "Signed WordPress execution" },
  { icon: "restore", label: "Captured restoration values" },
  { icon: "history", label: "Per-item result and activity history" }
] satisfies Array<{ icon: HomeIconName; label: string }>;

const platformFacts = [
  { label: "WordPress-native inventory", tone: "green" },
  { label: "Search Console evidence", tone: "blue" },
  { label: "Human-approved execution", tone: "yellow" },
  { label: "Tenant-isolated workspaces", tone: "red" }
];

const previewRows = [
  {
    page: "/wordpress-seo-guide",
    signal: "Clicks down 31%",
    issue: "CTR decline",
    impact: "+18",
    state: "Review"
  },
  {
    page: "/enterprise-content-audit",
    signal: "Missing title metadata",
    issue: "Title gap",
    impact: "+13",
    state: "Draft"
  },
  {
    page: "/publisher-archive",
    signal: "Noindex detected",
    issue: "Robots review",
    impact: "+09",
    state: "Open"
  }
];

export default function MarketingHomePage() {
  return (
    <>
      <main className="home-redesign">
        <section className="home-hero">
          <div className="home-hero-inner">
            <div className="home-hero-copy" data-reveal>
              <span className="home-hero-kicker">WordPress SEO operations</span>
              <h1>Find traffic leaks before they become backlog noise.</h1>
              <p>
                SEO Content Control Center connects WordPress, Search Console, and review notes so
                teams can decide what to fix, who owns it, and when a supported change is allowed to
                publish.
              </p>
              <div className="hero-actions">
                <Link className="button button-dark" href="/trial">
                  Start trial
                  <HomeIcon name="arrow" size={17} />
                </Link>
                <Link className="button button-secondary" href="/demo">
                  See the workflow
                </Link>
              </div>
              <p className="home-hero-note">
                <HomeIcon name="lock" size={15} />
                <span>14 days</span>
                <i aria-hidden="true" />
                <span>One WordPress site</span>
                <i aria-hidden="true" />
                <span>No automatic publishing</span>
              </p>
            </div>

            <div className="home-hero-scene" data-reveal>
              <div className="home-window" aria-label="Product backlog preview">
                <div className="home-window-bar">
                  <span className="home-window-controls" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>Review queue</span>
                  <kbd>GSC</kbd>
                </div>

                <div className="home-window-body">
                  <aside className="home-window-rail" aria-label="Workflow steps">
                    <span className="is-active">01</span>
                    <span>02</span>
                    <span>03</span>
                  </aside>

                  <div className="home-window-main">
                    <div className="home-window-toolbar">
                      <div>
                        <span>Search Console connected</span>
                        <strong>Pages waiting for review</strong>
                      </div>
                      <div className="home-window-search">
                        <HomeIcon name="search" size={14} />
                        Filter evidence
                      </div>
                    </div>

                    <div className="home-window-metrics">
                      <div>
                        <span>Ready</span>
                        <strong>24</strong>
                        <small>7 need owner review</small>
                      </div>
                      <div>
                        <span>Clicks at risk</span>
                        <strong>3.8k</strong>
                        <small>18.4% vs prior period</small>
                      </div>
                      <div>
                        <span>Approved</span>
                        <strong>11</strong>
                        <small>6 verified this week</small>
                      </div>
                    </div>

                    <div className="home-window-table">
                      <div className="home-window-head">
                        <span>Page and evidence</span>
                        <span>Issue</span>
                        <span>Impact</span>
                        <span>Status</span>
                        <HomeIcon name="filter" size={15} />
                      </div>
                      {previewRows.map((row) => (
                        <div className="home-window-row" key={row.page}>
                          <div>
                            <strong>{row.page}</strong>
                            <span>{row.signal}</span>
                          </div>
                          <span>{row.issue}</span>
                          <b>{row.impact}</b>
                          <em>{row.state}</em>
                          <span aria-hidden="true">...</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="home-proof-strip" aria-label="Product principles" data-reveal>
            {platformFacts.map((fact) => (
              <span className={`home-proof-pill home-proof-pill-${fact.tone}`} key={fact.label}>
                {fact.label}
              </span>
            ))}
          </div>
        </section>

        <section className="home-workflow-section">
          <div className="home-section-intro" data-reveal>
            <div>
              <span className="eyebrow">From signals to shipped work</span>
              <h2>Search data is only useful when the next action is obvious.</h2>
            </div>
            <p>
              Search Console, audit exports, spreadsheets, tickets, and WordPress normally hold
              separate parts of the same story. This workflow keeps the page, evidence, decision,
              and outcome together.
            </p>
          </div>

          <div className="home-workflow-grid">
            {workflow.map(({ number, icon, tag, title, body }, index) => (
              <article data-reveal key={number} style={{ "--index": index } as CSSProperties}>
                <div className="home-step-heading">
                  <span>{number}</span>
                  <HomeIcon name={icon} size={22} />
                </div>
                {number === "01" ? (
                  <div className="home-evidence-stack" aria-hidden="true">
                    <span>
                      <b>WordPress</b>
                      <i>Metadata bounded</i>
                    </span>
                    <span>
                      <b>Search Console</b>
                      <i>Queries and traffic</i>
                    </span>
                    <span>
                      <b>Review notes</b>
                      <i>Owner and decision</i>
                    </span>
                  </div>
                ) : null}
                <span className={`home-card-tag home-card-tag-${index + 1}`}>{tag}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </article>
            ))}
          </div>

          <div className="home-integration-ledger" aria-label="Connected SEO workflow" data-reveal>
            <div>
              <span className="home-source-icon home-source-icon-green">
                <HomeIcon name="plug" size={19} />
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
              <span className="home-source-icon home-source-icon-blue">
                <HomeIcon name="chart" size={19} />
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
              <span className="home-source-icon home-source-icon-yellow">
                <HomeIcon name="list" size={19} />
              </span>
              <div>
                <strong>Prioritized SEO backlog</strong>
                <small>Evidence, owner, decision, outcome</small>
              </div>
            </div>
          </div>
        </section>

        <section className="home-team-section">
          <div className="home-section-intro" data-reveal>
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
            {audiences.map(({ icon, label, body, href }, index) => (
              <Link
                data-reveal
                href={href}
                key={label}
                style={{ "--index": index } as CSSProperties}
              >
                <span className="home-audience-index">0{index + 1}</span>
                <span className="home-audience-icon">
                  <HomeIcon name={icon} size={21} />
                </span>
                <span className="home-audience-copy">
                  <strong>{label}</strong>
                  <small>{body}</small>
                </span>
                <HomeIcon name="arrow" size={19} />
              </Link>
            ))}
          </div>

          <div className="home-safety-band" data-reveal>
            <div className="home-safety-copy">
              <span className="eyebrow">Review-first by design</span>
              <h2>Automation stops where judgment starts.</h2>
              <p>
                Supported SEO metadata changes stay bounded from the first preview through the final
                WordPress result.
              </p>
              <Link className="inline-link" href="/security">
                Review the safeguards <HomeIcon name="arrow" size={16} />
              </Link>
            </div>
            <div className="home-safeguard-grid">
              {safeguards.map(({ icon, label }) => (
                <div key={label}>
                  <HomeIcon name={icon} size={18} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>

          <section className="cta-band" data-reveal>
            <div>
              <span className="eyebrow">Start with one site</span>
              <h2>Turn the next audit into work your team can approve.</h2>
              <p>
                Connect WordPress and Search Console, build a prioritized backlog, and keep every
                supported write review-first.
              </p>
            </div>
            <div className="cta-band-actions">
              <Link className="button button-light" href="/trial">
                Start free trial
                <HomeIcon name="arrow" size={17} />
              </Link>
              <Link className="button button-ghost-light" href="/demo">
                Request a demo
              </Link>
            </div>
          </section>
        </section>
      </main>
      <HomeReveals />
    </>
  );
}
