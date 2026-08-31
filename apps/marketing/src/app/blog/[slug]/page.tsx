import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StructuredData } from "../../../components/structured-data";
import { briefings, findBriefing } from "../../../lib/briefings";
import { articleSchema, breadcrumbSchema, faqSchema } from "../../../lib/schema";
import { pageMetadata } from "../../../lib/site";

type BriefingPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return briefings.map((briefing) => ({ slug: briefing.slug }));
}

export async function generateMetadata({ params }: BriefingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const briefing = findBriefing(slug);

  if (!briefing) {
    return pageMetadata({
      title: "Briefing not found",
      description: "This SEO operations briefing is no longer available.",
      path: `/blog/${slug}`
    });
  }

  return {
    ...pageMetadata({
      title: briefing.metaTitle,
      description: briefing.metaDescription,
      path: `/blog/${briefing.slug}`
    }),
    openGraph: {
      type: "article",
      title: briefing.metaTitle,
      description: briefing.metaDescription,
      url: `/blog/${briefing.slug}`,
      publishedTime: briefing.published,
      modifiedTime: briefing.updated
    }
  };
}

export default async function BriefingPage({ params }: BriefingPageProps) {
  const { slug } = await params;
  const briefing = findBriefing(slug);

  if (!briefing) {
    notFound();
  }

  const related = briefing.related
    .map((relatedSlug) => findBriefing(relatedSlug))
    .filter((entry) => entry !== undefined);

  return (
    <main>
      <StructuredData
        id={`briefing-schema-${briefing.slug}`}
        data={[
          articleSchema({
            headline: briefing.title,
            description: briefing.metaDescription,
            path: `/blog/${briefing.slug}`,
            published: briefing.published,
            updated: briefing.updated
          }),
          faqSchema(briefing.faq),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "SEO operations briefings", path: "/blog" },
            { name: briefing.title, path: `/blog/${briefing.slug}` }
          ])
        ]}
      />

      <article className="briefing">
        <header className="briefing-head">
          <Link className="text-action" href="/blog">
            <ArrowLeft size={15} /> All briefings
          </Link>
          <span className="eyebrow">{briefing.category}</span>
          <h1>{briefing.title}</h1>
          <p className="briefing-summary">{briefing.summary}</p>
          <div className="briefing-meta">
            <time dateTime={briefing.updated}>Updated {formatDate(briefing.updated)}</time>
            <small>
              <Clock3 size={14} /> {briefing.readingTime}
            </small>
          </div>
        </header>

        <div className="briefing-body">
          {briefing.intro.map((paragraph) => (
            <p className="briefing-lede" key={paragraph}>
              {paragraph}
            </p>
          ))}

          {briefing.sections.map((section) => (
            <section key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
              {section.bullets ? (
                <ul>
                  {section.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}

          <section className="briefing-faq">
            <h2>Frequently asked questions</h2>
            {briefing.faq.map((entry) => (
              <div key={entry.question}>
                <h3>{entry.question}</h3>
                <p>{entry.answer}</p>
              </div>
            ))}
          </section>
        </div>
      </article>

      {related.length > 0 ? (
        <section className="briefing-related" aria-label="Related briefings">
          <h2>Keep reading</h2>
          <ul>
            {related.map((entry) => (
              <li key={entry.slug}>
                <Link href={`/blog/${entry.slug}`}>
                  {entry.title} <ArrowRight size={15} />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="editorial-cta">
        <div>
          <strong>Run the audit on your own site.</strong>
          <p>
            The free WordPress plugin runs the content checks locally, with no account and no
            external request. Connect Search Console later if you want traffic evidence attached.
          </p>
        </div>
        <Link className="button button-secondary" href="/download">
          Get the free plugin <ArrowRight size={17} />
        </Link>
      </section>
    </main>
  );
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
}
