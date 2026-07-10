import type { Metadata } from "next";
import { ArrowRight, CheckCircle2, PackageCheck } from "lucide-react";
import Link from "next/link";

import { PageIntro } from "../../components/page-intro";
import { pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "Product Changelog",
  description:
    "Follow implemented SEO Content Control Center product updates across WordPress integration, security, operations, and public website releases.",
  path: "/changelog"
});

const releases = [
  {
    iteration: "100",
    title: "Safe-operation payload expansion",
    date: "July 2026",
    items: [
      "Added review-scoped canonical repair previews that only target the synced item URL.",
      "Added individual noindex and nofollow removal previews for published content when the synced directive is still enabled.",
      "Kept stale, unsupported, incomplete, or unsafe evidence preview-only and covered the worker and plugin contract with tests."
    ]
  },
  {
    iteration: "99",
    title: "WordPress plugin release packaging",
    date: "July 2026",
    items: [
      "Added a version-verified, runtime-only WordPress plugin archive with package validation.",
      "Added a WordPress-compatible readme and CI upload for the installation-test artifact.",
      "Kept a live WordPress/PHP staging matrix as a separate certification milestone."
    ]
  },
  {
    iteration: "98",
    title: "Marketing website foundation",
    date: "July 2026",
    items: [
      "Added the public product, pricing, security, demo, trial, legal, robots, and sitemap routes.",
      "Added a validated, rate-limited demo webhook flow and a direct SaaS trial-registration handoff.",
      "Aligned public pricing with the shared plan limits used by the application."
    ]
  },
  {
    iteration: "97",
    title: "Account security hardening",
    date: "July 2026",
    items: [
      "Added optional TOTP two-factor authentication with encrypted secrets and replay protection.",
      "Added dependency audit and CodeQL checks in CI, plus a disposable database restore smoke workflow.",
      "Extended product documentation around the implemented security controls."
    ]
  }
];

export default function ChangelogPage() {
  return (
    <main>
      <PageIntro
        eyebrow="Product changelog"
        title="A public record of implemented product work."
        body="This page tracks shipped changes in the working product. It distinguishes completed controls from planned certification, integrations, and roadmap work."
        actions={
          <Link className="button button-secondary" href="/status">
            View service information <ArrowRight size={17} />
          </Link>
        }
      />

      <section className="release-timeline" aria-label="Product releases">
        {releases.map((release, index) => (
          <article key={release.iteration}>
            <div className="release-marker" aria-hidden="true">
              {index === 0 ? <CheckCircle2 size={19} /> : <span />}
            </div>
            <div className="release-meta">
              <span>Iteration {release.iteration}</span>
              <small>{release.date}</small>
            </div>
            <div>
              <h2>{release.title}</h2>
              <ul>
                {release.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </article>
        ))}
      </section>

      <section className="changelog-note">
        <PackageCheck size={22} />
        <div>
          <strong>Release language stays deliberate.</strong>
          <p>
            The public changelog describes behavior present in the codebase today. Items that need
            external certification or a new provider integration remain explicitly planned.
          </p>
        </div>
      </section>
    </main>
  );
}
