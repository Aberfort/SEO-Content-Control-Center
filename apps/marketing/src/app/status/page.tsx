import type { Metadata } from "next";
import { ArrowRight, CircleCheck, Eye, ServerCog } from "lucide-react";
import Link from "next/link";

import { PageIntro } from "../../components/page-intro";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Service Information",
  description:
    "Read the public service information and operational visibility scope for SEO Content Control Center.",
  path: "/status"
});

const services = [
  {
    name: "Public marketing website",
    detail: "Product, legal, demo, trial, and public information routes.",
    status: "Public route"
  },
  {
    name: "SaaS workspace",
    detail: "Authenticated organizations, sites, backlog, audits, integrations, and operations.",
    status: "Authenticated service"
  },
  {
    name: "WordPress plugin",
    detail:
      "Connection exchange, bounded metadata sync, scheduled sync, and signed supported operations.",
    status: "Packaged release"
  },
  {
    name: "Background workers",
    detail:
      "Queue processing with internal health, lag, processed, and failed-job signals when configured.",
    status: "Internal observability"
  }
];

export default function StatusPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Service information"
        title="Public visibility with clear limits on what is monitored here."
        body="This page describes the currently implemented service surfaces and operational visibility. It is not a real-time public monitoring feed or an availability commitment."
      />

      <section className="status-overview">
        <div>
          <CircleCheck size={22} />
          <div>
            <strong>Product service surfaces are documented.</strong>
            <p>
              The public website and packaged plugin expose the current product contract; the SaaS
              workspace and worker monitoring remain access-controlled operational services.
            </p>
          </div>
        </div>
        <span>Manually maintained public information</span>
      </section>

      <section className="status-list" aria-label="Service components">
        {services.map((service) => (
          <article key={service.name}>
            <ServerCog size={20} />
            <div>
              <h2>{service.name}</h2>
              <p>{service.detail}</p>
            </div>
            <span>{service.status}</span>
          </article>
        ))}
      </section>

      <section className="status-boundary">
        <Eye size={22} />
        <div>
          <h2>What this page does and does not report.</h2>
          <p>
            The product has internal worker health and queue-lag signals, but no public status
            monitor or incident subscription is configured in this release. A public monitoring
            integration should be added before publishing real-time uptime claims.
          </p>
        </div>
        <Link className="button button-secondary" href="/contact">
          Contact the team <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
