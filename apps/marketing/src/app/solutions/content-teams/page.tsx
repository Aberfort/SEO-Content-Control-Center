import type { Metadata } from "next";
import { ClipboardCheck, FileText, ListTodo } from "lucide-react";

import { SolutionPage, type SolutionPageContent } from "../../../components/solution-page";
import { pageMetadata } from "../../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "SEO Operations for Content Teams",
  description:
    "Give editors and writers a clear, evidence-backed SEO queue without exposing unnecessary WordPress controls.",
  path: "/solutions/content-teams"
});

const content: SolutionPageContent = {
  eyebrow: "For content and editorial teams",
  title: "Give the people improving pages the context to make the next edit count.",
  body: "Move from an ambiguous audit export to a focused queue of pages, evidence, recommendations, owners, and completion states that editorial teams can work through together.",
  proof: [
    { value: "Page-level", label: "Evidence tied to the actual URL" },
    { value: "Prioritized", label: "Impact and effort in the same view" },
    { value: "Collaborative", label: "Owners, notes, dates, and status" }
  ],
  workflow: [
    {
      icon: FileText,
      label: "Editorial context",
      title: "Understand the page before deciding what to rewrite.",
      body: "Use synced title, metadata, freshness, link, and Search Console context to see why a page is being discussed."
    },
    {
      icon: ListTodo,
      label: "Focused queue",
      title: "Turn recommendations into work a writer can own.",
      body: "Backlog tasks preserve the source issue, expected impact, effort estimate, owner, due date, and team conversation."
    },
    {
      icon: ClipboardCheck,
      label: "Visible completion",
      title: "Close the loop without losing the evidence trail.",
      body: "Task transitions and activity history make it clear what changed, who moved the work, and what remains ready for review."
    }
  ],
  outcomes: [
    "A shared SEO queue that writers and editors can scan quickly",
    "Source evidence that remains present when task ownership changes",
    "Clear separation between editorial work and sensitive connection controls",
    "A documented path from finding to completed work"
  ],
  cta: {
    eyebrow: "Make the queue usable",
    title: "Test the evidence-to-backlog workflow with the people who improve your pages.",
    body: "Start with one site in the trial, then bring a broader editorial workflow to a guided demo."
  }
};

export default function ContentTeamsSolutionPage() {
  return <SolutionPage content={content} />;
}
