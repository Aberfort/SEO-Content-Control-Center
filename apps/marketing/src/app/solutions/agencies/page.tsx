import type { Metadata } from "next";
import { ClipboardList, FileSearch, ShieldCheck } from "lucide-react";

import { SolutionPage, type SolutionPageContent } from "../../../components/solution-page";
import { pageMetadata } from "../../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "SEO Operations for Agencies",
  description:
    "Give every client site an evidence-backed SEO backlog, scoped permissions, and review-first WordPress operations.",
  path: "/solutions/agencies"
});

const content: SolutionPageContent = {
  eyebrow: "For SEO agencies",
  title: "Run every client SEO workflow with evidence, ownership, and boundaries intact.",
  body: "Separate organizations and sites without separating the work from its context. Give account, strategy, and delivery teams one structured place to decide and move client SEO work forward.",
  proof: [
    { value: "Client-scoped", label: "Organizations, sites, and records" },
    { value: "Role-aware", label: "Controls for sensitive actions" },
    { value: "Evidence-led", label: "Audit and GSC sources stay attached" }
  ],
  workflow: [
    {
      icon: FileSearch,
      label: "Portfolio triage",
      title: "Find the pages that deserve a client conversation.",
      body: "Surface traffic losses, metadata signals, and content gaps with the affected URL and supporting detail before work enters the plan."
    },
    {
      icon: ClipboardList,
      label: "Delivery queue",
      title: "Assign work with a shared operational record.",
      body: "Keep impact, effort, status, due date, comments, and source issue together so handoffs do not erase the reason behind a task."
    },
    {
      icon: ShieldCheck,
      label: "Client-safe execution",
      title: "Review supported changes before they reach WordPress.",
      body: "Use preview, dry run, confirmation, signed execution, and activity history when a supported metadata change is ready for approval."
    }
  ],
  outcomes: [
    "A different operational view for each client organization and site",
    "A clear answer to which pages were prioritized and why",
    "A delivery record that does not depend on a separate spreadsheet",
    "Review-first controls for the subset of supported SEO metadata changes"
  ],
  cta: {
    eyebrow: "Bring your client workflow",
    title:
      "See how a portfolio of WordPress sites stays organized without losing tenant boundaries.",
    body: "Request a demo to walk through permissions, site connections, audit evidence, and the delivery backlog with your agency team."
  }
};

export default function AgenciesSolutionPage() {
  return <SolutionPage content={content} />;
}
