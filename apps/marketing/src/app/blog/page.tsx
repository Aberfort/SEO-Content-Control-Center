import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import Link from "next/link";

import { PageIntro } from "../../components/page-intro";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "SEO Operations Briefings",
  description:
    "Read concise SEO operations briefings on turning WordPress and Search Console signals into accountable, review-first work.",
  path: "/blog"
});

const briefings = [
  {
    category: "Workflow design",
    title: "An SEO backlog is useful only when the page evidence survives the handoff.",
    summary:
      "A task title alone cannot explain why a page became important. The operational record needs the URL, source signal, impact, effort, owner, and the decision that changed its state.",
    detail:
      "The practical test is simple: can an editor, strategist, or stakeholder understand the next action without reopening three different tools? If not, the workflow still has a context gap. A connected backlog should make the page, the observed change, and the intended work legible together.",
    readingTime: "4 min read"
  },
  {
    category: "Search Console",
    title: "Traffic movement is evidence, not an instruction to rewrite every page.",
    summary:
      "A drop in clicks can be caused by demand, rankings, CTR, indexability, competitors, or an unrelated site change. Good operations preserve the observation before recommending the response.",
    detail:
      "Period comparison is the beginning of triage, not the end. Teams need to connect a trend to a managed URL, inspect the available content context, and decide whether the next step is research, editing, technical review, or no action. That distinction avoids mechanically chasing every chart movement.",
    readingTime: "5 min read"
  },
  {
    category: "Change control",
    title: "Review-first SEO operations make automation more usable, not slower.",
    summary:
      "The goal of a safety chain is not to add ceremony. It is to give teams a reliable point to inspect a planned change, confirm its scope, and keep an outcome record.",
    detail:
      "For supported metadata changes, a bounded preview and dry run narrow uncertainty before an action reaches WordPress. Explicit confirmation protects the decision, while signed execution and captured previous values preserve a route to accountability and restoration when the field supports it.",
    readingTime: "4 min read"
  }
];

export default function BlogPage() {
  return (
    <main>
      <PageIntro
        eyebrow="SEO operations briefings"
        title="Practical notes for teams turning search signals into finished work."
        body="Short, implementation-grounded reading on the operational decisions behind WordPress SEO: evidence, prioritization, handoffs, and controlled change."
      />

      <section className="editorial-list" aria-label="SEO operations briefings">
        {briefings.map((briefing) => (
          <article key={briefing.title}>
            <div className="editorial-meta">
              <span>{briefing.category}</span>
              <small>
                <Clock3 size={14} /> {briefing.readingTime}
              </small>
            </div>
            <h2>{briefing.title}</h2>
            <p>{briefing.summary}</p>
            <details>
              <summary>Read briefing</summary>
              <p>{briefing.detail}</p>
            </details>
          </article>
        ))}
      </section>

      <section className="editorial-cta">
        <CalendarDays size={23} />
        <div>
          <strong>Apply the ideas to a real site.</strong>
          <p>
            The trial starts with one WordPress site. A guided demo can map the workflow to a larger
            content portfolio or agency process.
          </p>
        </div>
        <Link className="button button-secondary" href="/demo">
          Request a demo <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
