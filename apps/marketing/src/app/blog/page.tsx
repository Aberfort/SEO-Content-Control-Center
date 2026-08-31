import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Clock3 } from "lucide-react";
import Link from "next/link";

import { PageIntro } from "../../components/page-intro";
import { StructuredData } from "../../components/structured-data";
import { briefings } from "../../lib/briefings";
import { breadcrumbSchema } from "../../lib/schema";
import { marketingOrigin, pageMetadata } from "../../lib/site";

export const metadata: Metadata = pageMetadata({
  title: "WordPress SEO Operations Briefings",
  description:
    "Practical guides on auditing WordPress content, diagnosing Search Console traffic drops, fixing orphan pages, and turning findings into a prioritized SEO backlog.",
  path: "/blog"
});

export default function BlogPage() {
  return (
    <main>
      <StructuredData
        id="blog-schema"
        data={[
          {
            "@context": "https://schema.org",
            "@type": "Blog",
            name: "SEO operations briefings",
            url: `${marketingOrigin}/blog`,
            blogPost: briefings.map((briefing) => ({
              "@type": "BlogPosting",
              headline: briefing.title,
              description: briefing.metaDescription,
              datePublished: briefing.published,
              dateModified: briefing.updated,
              url: `${marketingOrigin}/blog/${briefing.slug}`
            }))
          },
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "SEO operations briefings", path: "/blog" }
          ])
        ]}
      />

      <PageIntro
        eyebrow="SEO operations briefings"
        title="Practical notes for teams turning search signals into finished work."
        body="Short, implementation-grounded reading on the operational decisions behind WordPress SEO: auditing content, reading Search Console evidence, prioritizing the backlog, and shipping controlled change."
      />

      <section className="editorial-list" aria-label="SEO operations briefings">
        {briefings.map((briefing) => (
          <article key={briefing.slug}>
            <div className="editorial-meta">
              <span>{briefing.category}</span>
              <small>
                <Clock3 size={14} /> {briefing.readingTime}
              </small>
            </div>
            <h2>
              <Link href={`/blog/${briefing.slug}`}>{briefing.title}</Link>
            </h2>
            <p>{briefing.summary}</p>
            <Link className="text-action" href={`/blog/${briefing.slug}`}>
              Read briefing <ArrowRight size={15} />
            </Link>
          </article>
        ))}
      </section>

      <section className="editorial-cta">
        <CalendarDays size={23} />
        <div>
          <strong>Apply the ideas to a real site.</strong>
          <p>
            The free WordPress plugin runs the content checks locally. The trial starts with one
            connected site, and a guided demo can map the workflow to a larger content portfolio or
            agency process.
          </p>
        </div>
        <Link className="button button-secondary" href="/download">
          Get the free plugin <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}
