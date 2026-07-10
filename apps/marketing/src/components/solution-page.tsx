import { ArrowRight, Check, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { CtaBand } from "./cta-band";
import { PageIntro } from "./page-intro";

export type SolutionPageContent = {
  eyebrow: string;
  title: string;
  body: string;
  proof: Array<{
    value: string;
    label: string;
  }>;
  workflow: Array<{
    icon: LucideIcon;
    label: string;
    title: string;
    body: string;
  }>;
  outcomes: string[];
  cta: {
    eyebrow: string;
    title: string;
    body: string;
  };
};

export function SolutionPage({ content }: { content: SolutionPageContent }) {
  return (
    <main>
      <PageIntro
        eyebrow={content.eyebrow}
        title={content.title}
        body={content.body}
        actions={
          <>
            <Link className="button" href="/trial">
              Start free trial <ArrowRight size={17} />
            </Link>
            <Link className="button button-secondary" href="/demo">
              Discuss your workflow
            </Link>
          </>
        }
      />

      <section className="solution-proof" aria-label="Workflow outcomes">
        {content.proof.map((item) => (
          <div key={item.label}>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
          </div>
        ))}
      </section>

      <section className="section solution-workflow-section">
        <div className="section-heading split-heading">
          <div>
            <span className="eyebrow">An operating rhythm for the work</span>
            <h2>Make the next best SEO action obvious to the people who need to ship it.</h2>
          </div>
          <p>
            Keep the source evidence, current owner, decision history, and supported next action in
            the same place instead of rebuilding context every time the work changes hands.
          </p>
        </div>
        <div className="solution-workflow">
          {content.workflow.map(({ icon: Icon, label, title, body }) => (
            <article key={title}>
              <span className="solution-icon">
                <Icon size={21} />
              </span>
              <span className="eyebrow">{label}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-tint solution-outcomes">
        <div>
          <span className="eyebrow">What stays visible</span>
          <h2>A queue that preserves the decisions around the work.</h2>
        </div>
        <ul>
          {content.outcomes.map((outcome) => (
            <li key={outcome}>
              <Check size={18} />
              {outcome}
            </li>
          ))}
        </ul>
      </section>

      <CtaBand {...content.cta} />
    </main>
  );
}
