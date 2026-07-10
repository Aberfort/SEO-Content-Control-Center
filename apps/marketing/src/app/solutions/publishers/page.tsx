import type { Metadata } from "next";
import { BarChart3, History, Layers3 } from "lucide-react";

import { SolutionPage, type SolutionPageContent } from "../../../components/solution-page";
import { pageMetadata } from "../../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "SEO Operations for Publishers",
  description:
    "Prioritize high-impact publishing SEO work from WordPress and Search Console evidence while keeping review controls visible.",
  path: "/solutions/publishers"
});

const content: SolutionPageContent = {
  eyebrow: "For publishers",
  title: "Keep high-volume publishing SEO work tied to traffic evidence and accountable decisions.",
  body: "A growing WordPress inventory needs more than a periodic audit. Connect content context, performance signals, and a practical queue so the team can decide which pages deserve attention now.",
  proof: [
    { value: "Inventory-aware", label: "Bounded sync across posts and pages" },
    { value: "Performance-led", label: "Search Console trends beside content" },
    { value: "History-preserving", label: "Task and operation activity stays visible" }
  ],
  workflow: [
    {
      icon: Layers3,
      label: "Content inventory",
      title: "Keep the operational view grounded in the current WordPress estate.",
      body: "Paginated metadata sync gives teams a consistent page inventory with SEO, freshness, taxonomy, and link signals without copying post bodies."
    },
    {
      icon: BarChart3,
      label: "Traffic context",
      title: "Spot declining or underperforming pages with their performance evidence nearby.",
      body: "Persisted Search Console metrics and insights help prioritize traffic-loss and opportunity work against the content inventory."
    },
    {
      icon: History,
      label: "Operating memory",
      title: "Keep the change story alongside the page, not inside a forgotten handoff.",
      body: "Backlog activity and supported operation records preserve who reviewed, approved, executed, or restored a change."
    }
  ],
  outcomes: [
    "A consistent view across a large posts/pages inventory",
    "Evidence that connects performance movement to an internal page record",
    "A prioritized queue instead of a flat list of audit findings",
    "Review-first controls that protect supported production metadata changes"
  ],
  cta: {
    eyebrow: "Operate the inventory deliberately",
    title: "Bring the content volume and traffic questions into one working session.",
    body: "Request a demo to map your publishing workflow to the control center before connecting a production site."
  }
};

export default function PublishersSolutionPage() {
  return <SolutionPage content={content} />;
}
