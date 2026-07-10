import type { Metadata } from "next";
import { Check, Clock3, SearchCheck, ShieldCheck } from "lucide-react";

import { DemoForm } from "../../components/demo-form";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Request a Demo",
  description:
    "Request a guided walkthrough of WordPress sync, Search Console insights, the prioritized SEO backlog, and review-first operations.",
  path: "/demo"
});

type DemoPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

const demoAgenda = [
  "How WordPress and Search Console evidence comes together",
  "How audits become prioritized, assigned backlog tasks",
  "How preview, confirmation, audit logs, and restoration protect changes",
  "Which plan fits your site portfolio and team structure"
];

export default async function DemoPage({ searchParams }: DemoPageProps) {
  const params = (await searchParams) ?? {};
  const defaultTopic = mapTopic(readParam(params.topic), readParam(params.plan));

  return (
    <main className="form-page">
      <section className="form-page-copy">
        <span className="eyebrow">Guided product walkthrough</span>
        <h1>See your SEO workflow in one operating view.</h1>
        <p>
          Tell us how your team manages WordPress sites today. We will focus the conversation on the
          evidence, backlog, permissions, and safety controls that matter to your setup.
        </p>
        <div className="demo-meta">
          <span>
            <Clock3 size={18} /> 30-minute working session
          </span>
          <span>
            <SearchCheck size={18} /> Product workflow, not a slide deck
          </span>
          <span>
            <ShieldCheck size={18} /> Security questions welcome
          </span>
        </div>
        <div className="demo-agenda">
          <strong>What we can cover</strong>
          <ul>
            {demoAgenda.map((item) => (
              <li key={item}>
                <Check size={16} /> {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
      <section className="form-panel" aria-label="Demo request form">
        <div className="form-panel-heading">
          <span>Request a demo</span>
          <p>We will reply to your work email with scheduling options.</p>
        </div>
        <DemoForm defaultTopic={defaultTopic} />
      </section>
    </main>
  );
}

function readParam(value: string | string[] | undefined): string {
  return Array.isArray(value) ? (value[0] ?? "") : (value ?? "");
}

function mapTopic(topic: string, plan: string): string {
  if (topic === "security") {
    return "Security review";
  }

  if (plan === "enterprise") {
    return "Enterprise plan";
  }

  return "Product demo";
}
