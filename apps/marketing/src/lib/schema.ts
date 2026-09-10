import { marketingOrigin, siteName } from "./site";

const organizationId = `${marketingOrigin}/#organization`;
const websiteId = `${marketingOrigin}/#website`;

/**
 * Other profiles that are unambiguously the same entity as this Organization.
 * Only add a URL here once it is live and actually represents this brand —
 * `sameAs` is a disambiguation signal to search engines, so a placeholder or
 * dead link does more harm than omitting it. Add the GitHub organization and
 * LinkedIn company page here once they exist.
 */
const sameAs = [
  "https://wordpress.org/plugins/content-signal-seo-content-audit/",
  "https://profiles.wordpress.org/serhiivasyliev/"
];

export function organizationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": organizationId,
    name: siteName,
    url: `${marketingOrigin}/`,
    logo: `${marketingOrigin}/icon.svg`,
    description:
      "Review-first SEO operations for WordPress: content audit evidence, Search Console signals, and a prioritized team backlog.",
    sameAs,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        url: `${marketingOrigin}/contact`
      }
    ]
  };
}

export function websiteSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": websiteId,
    name: siteName,
    url: `${marketingOrigin}/`,
    publisher: { "@id": organizationId }
  };
}

export function softwareApplicationSchema(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: `${siteName} — SEO Content Audit`,
    applicationCategory: "BusinessApplication",
    operatingSystem: "WordPress 6.4+, PHP 8.1+",
    url: `${marketingOrigin}/download`,
    publisher: { "@id": organizationId },
    description:
      "Read-only WordPress content health audit that finds noindex risk, missing SEO titles and meta descriptions, canonical conflicts, thin content, orphan pages, and stale posts. Runs locally with no account required.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free local WordPress audit, no account required."
    }
  };
}

export function breadcrumbSchema(
  trail: { name: string; path: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: `${marketingOrigin}${crumb.path}`
    }))
  };
}

export function faqSchema(
  entries: { question: string; answer: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer
      }
    }))
  };
}

export function articleSchema(input: {
  headline: string;
  description: string;
  path: string;
  published: string;
  updated: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: input.headline,
    description: input.description,
    datePublished: input.published,
    dateModified: input.updated,
    mainEntityOfPage: `${marketingOrigin}${input.path}`,
    author: { "@id": organizationId },
    publisher: { "@id": organizationId },
    isPartOf: { "@id": websiteId }
  };
}
