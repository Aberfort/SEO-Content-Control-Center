import type { Metadata } from "next";
import { ArrowRight, Building2, LockKeyhole, MessagesSquare } from "lucide-react";
import Link from "next/link";

import { PageIntro } from "../../components/page-intro";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Contact",
  description:
    "Choose the right conversation for a SEO Content Control Center demo, workflow evaluation, or security review.",
  path: "/contact"
});

const routes = [
  {
    icon: MessagesSquare,
    title: "Product and workflow demo",
    body: "Walk through WordPress sync, Search Console evidence, the backlog, roles, and review-first operations with your team.",
    href: "/demo",
    label: "Request a demo"
  },
  {
    icon: Building2,
    title: "Portfolio or agency evaluation",
    body: "Use the demo form to share the number of sites, working roles, and the delivery questions that matter for a multi-site workflow.",
    href: "/demo",
    label: "Discuss your portfolio"
  },
  {
    icon: LockKeyhole,
    title: "Security review",
    body: "Use the dedicated security topic for questions about tenant isolation, credentials, approvals, audit history, and implemented controls.",
    href: "/demo?topic=security",
    label: "Contact security"
  }
];

export default function ContactPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Contact"
        title="Start with the conversation that fits the decision in front of you."
        body="The public contact path uses the same validated demo workflow already used across the site, so product and security questions arrive with enough context for a useful response."
      />

      <section className="section contact-routes">
        {routes.map(({ icon: Icon, title, body, href, label }) => (
          <article key={title}>
            <Icon size={23} />
            <h2>{title}</h2>
            <p>{body}</p>
            <Link className="inline-link" href={href}>
              {label} <ArrowRight size={16} />
            </Link>
          </article>
        ))}
      </section>

      <section className="contact-note">
        <strong>Existing workspace question?</strong>
        <p>
          Use the organization and activity context inside the SaaS workspace when you need to trace
          a site connection, task, or safe-operation event. The public form is for product,
          evaluation, and security conversations.
        </p>
      </section>
    </main>
  );
}
