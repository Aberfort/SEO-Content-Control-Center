import {
  contentTrustDimensions,
  type ContentTrustDimension,
  type ContentTrustDimensionResult,
  type ContentTrustEvidence,
  type ContentTrustEvidenceStatus,
  type ContentTrustSignal,
  type PlanCode
} from "@sccc/shared";

import type { SyncedContentBacklogCandidate, SyncedContentItem } from "./types";

const guidanceUrl =
  "https://developers.google.com/search/docs/fundamentals/creating-helpful-content";

const dimensionDetails: Record<
  ContentTrustDimension,
  Pick<ContentTrustDimensionResult, "label" | "description">
> = {
  experience: {
    label: "Experience",
    description:
      "Observable signs of first-hand work, examples, original media, or demonstrated use."
  },
  expertise: {
    label: "Expertise",
    description:
      "Authorship, supporting sources, and evidence that qualified people shaped the content."
  },
  authoritativeness: {
    label: "Authoritativeness",
    description:
      "Publisher and author identity, topical ownership, citations, and reputation evidence."
  },
  trust: {
    label: "Trust",
    description:
      "Ownership, dates, source transparency, secure delivery, and heightened-risk review."
  }
};

export function buildContentTrustEvidence(input: {
  item: SyncedContentItem;
  planCode: PlanCode;
}): ContentTrustEvidence {
  const allowed = input.planCode !== "TRIAL";
  const access: ContentTrustEvidence["access"] = {
    allowed,
    planCode: input.planCode,
    minimumPlan: "STARTER",
    reason: allowed ? null : "Content Trust Evidence is available on Starter and higher plans."
  };

  if (!allowed) {
    return buildResult(input.item, access, []);
  }

  const metadata = input.item.metadata;
  const externalLinks = metadata.externalLinkCount ?? null;
  const wordCount = metadata.wordCount ?? null;
  const hasAuthor = Boolean(metadata.authorName?.trim());
  const hasTaxonomy = Boolean(metadata.taxonomies?.some((taxonomy) => taxonomy.terms.length > 0));
  const potentialYmylTerms = findPotentialYmylTerms(metadata.taxonomies ?? []);
  const signals: Record<ContentTrustDimension, ContentTrustSignal[]> = {
    experience: [
      signal(
        "original-media",
        "Original media",
        metadata.featuredImagePresent ? "present" : "missing",
        metadata.featuredImagePresent
          ? "The WordPress record includes a featured image."
          : "No featured image is present in the synced WordPress record.",
        metadata.featuredImagePresent
          ? null
          : "Add original, useful media when it helps readers verify the work or subject.",
        ["metadata.featuredImagePresent", "metadata.featuredImageUrl"]
      ),
      signal(
        "substantive-depth",
        "Substantive depth",
        wordCount === null
          ? "insufficient"
          : wordCount >= 600
            ? "present"
            : wordCount >= 250
              ? "insufficient"
              : "missing",
        wordCount === null
          ? "Word count was not supplied by the WordPress sync."
          : `The synced content contains ${wordCount.toLocaleString("en")} words.`,
        wordCount !== null && wordCount >= 600
          ? null
          : "Review whether the page answers its purpose completely; length alone is not a quality target.",
        ["metadata.wordCount"]
      ),
      signal(
        "first-hand-demonstration",
        "First-hand demonstration",
        "human_review",
        "First-hand use, testing, process, or original data cannot be verified from inventory metadata.",
        "Confirm that the page shows how the author knows, tested, visited, or experienced the subject.",
        []
      )
    ],
    expertise: [
      signal(
        "named-author",
        "Named author",
        hasAuthor ? "present" : "missing",
        hasAuthor
          ? `The synced byline identifies ${metadata.authorName}.`
          : "The synced WordPress record does not identify a named author.",
        hasAuthor ? null : "Add an accurate byline where readers would expect one.",
        ["metadata.authorName", "metadata.authorId"]
      ),
      signal(
        "supporting-sources",
        "Supporting sources",
        externalLinks === null
          ? "insufficient"
          : externalLinks >= 2
            ? "present"
            : externalLinks === 1
              ? "insufficient"
              : "missing",
        externalLinks === null
          ? "Outbound-link evidence was not supplied by the WordPress sync."
          : `The page contains ${externalLinks.toLocaleString("en")} outbound link${externalLinks === 1 ? "" : "s"}.`,
        externalLinks !== null && externalLinks >= 2
          ? null
          : "Review factual claims and cite primary, topic-appropriate sources where useful.",
        ["metadata.externalLinkCount"]
      ),
      signal(
        "qualifications-review",
        "Qualifications or expert review",
        "human_review",
        "Credentials, reviewer identity, and technical accuracy are not available in inventory metadata.",
        "Verify relevant qualifications or document an appropriate expert review for consequential topics.",
        ["metadata.authorName"]
      )
    ],
    authoritativeness: [
      signal(
        "author-identity-depth",
        "Author identity depth",
        hasAuthor ? "insufficient" : "missing",
        hasAuthor
          ? "A named author is present, but biography and topical credentials are not synced."
          : "No author identity is available for further authority review.",
        "Link the byline to an author profile that explains relevant background and topic coverage.",
        ["metadata.authorName", "metadata.authorId"]
      ),
      signal(
        "topical-ownership",
        "Topical ownership",
        hasTaxonomy ? "insufficient" : "missing",
        hasTaxonomy
          ? "WordPress taxonomy terms provide topic classification, but not site-wide authority evidence."
          : "No taxonomy evidence is available to establish the page's topic context.",
        "Review consistent, useful coverage of this topic across the publisher and its named authors.",
        ["metadata.taxonomies"]
      ),
      signal(
        "reputation-evidence",
        "Independent reputation",
        "human_review",
        "External recognition, citations to this publisher, and reputation references require off-page review.",
        "Check independent references and reputation evidence; do not infer authority from self-description.",
        []
      )
    ],
    trust: [
      signal(
        "secure-delivery",
        "Secure delivery",
        input.item.url.startsWith("https://") ? "present" : "missing",
        input.item.url.startsWith("https://")
          ? "The canonical inventory URL uses HTTPS."
          : "The canonical inventory URL does not use HTTPS.",
        input.item.url.startsWith("https://") ? null : "Serve the public page over HTTPS.",
        ["url"]
      ),
      signal(
        "publication-dates",
        "Publication and update dates",
        metadata.publishedAt && input.item.modifiedAt
          ? "present"
          : metadata.publishedAt || input.item.modifiedAt
            ? "insufficient"
            : "missing",
        metadata.publishedAt
          ? `Published ${formatEvidenceDate(metadata.publishedAt)} and last modified ${formatEvidenceDate(input.item.modifiedAt)}.`
          : `A modified date exists (${formatEvidenceDate(input.item.modifiedAt)}), but no publication date was synced.`,
        metadata.publishedAt
          ? null
          : "Expose an accurate publication date when it helps readers assess freshness.",
        ["metadata.publishedAt", "modifiedAt"]
      ),
      signal(
        "canonical-identity",
        "Canonical identity",
        metadata.canonicalUrl
          ? canonicalMatches(metadata.canonicalUrl, input.item.url)
            ? "present"
            : "human_review"
          : "missing",
        metadata.canonicalUrl
          ? `The synced canonical is ${metadata.canonicalUrl}.`
          : "No canonical URL was supplied by the WordPress SEO metadata.",
        metadata.canonicalUrl && canonicalMatches(metadata.canonicalUrl, input.item.url)
          ? null
          : "Review whether the canonical accurately identifies the preferred public page.",
        ["metadata.canonicalUrl", "url"]
      ),
      signal(
        "source-transparency",
        "Source transparency",
        externalLinks === null ? "insufficient" : externalLinks > 0 ? "present" : "missing",
        externalLinks === null
          ? "Source-link evidence was not supplied by the WordPress sync."
          : externalLinks > 0
            ? "The page links to at least one external source."
            : "The page contains no outbound source links.",
        externalLinks !== null && externalLinks > 0
          ? null
          : "Identify important sources and explain how key claims were established.",
        ["metadata.externalLinkCount"]
      ),
      signal(
        "ownership-contact",
        "Ownership and contact clarity",
        hasAuthor ? "insufficient" : "missing",
        hasAuthor
          ? "A byline is present, but organization ownership and contact details are not part of content sync."
          : "Neither a byline nor site ownership/contact evidence is available here.",
        "Confirm that readers can identify the responsible publisher and reach an appropriate contact.",
        ["metadata.authorName"]
      ),
      signal(
        "heightened-risk-review",
        "Heightened-risk topic review",
        "human_review",
        potentialYmylTerms.length > 0
          ? `Taxonomy terms may indicate a consequential topic: ${potentialYmylTerms.join(", ")}.`
          : "Health, financial, legal, safety, and civic impact cannot be reliably classified from this metadata alone.",
        "Classify whether the page could significantly affect health, financial stability, safety, or public welfare and apply stricter review when needed.",
        ["metadata.taxonomies"]
      )
    ]
  };

  return buildResult(
    input.item,
    access,
    contentTrustDimensions.map((dimension) => ({
      dimension,
      ...dimensionDetails[dimension],
      signals: signals[dimension],
      counts: countStatuses(signals[dimension])
    }))
  );
}

export function buildContentTrustBacklogCandidates(
  evidence: ContentTrustEvidence
): SyncedContentBacklogCandidate[] {
  if (!evidence.access.allowed) return [];

  return evidence.dimensions.flatMap((dimension) =>
    dimension.signals.flatMap((signal) => {
      if (signal.status === "present" || !signal.recommendation) return [];
      const highPriority =
        dimension.dimension === "trust" &&
        (signal.status === "missing" || signal.id === "heightened-risk-review");

      return [
        {
          id: `content-trust:${dimension.dimension}:${signal.id}`,
          title: signal.recommendation,
          priority: highPriority ? "high" : "medium",
          sourceSignalId: `content-trust.${dimension.dimension}.${signal.id}`,
          rationale: signal.evidence,
          nextStep: signal.recommendation
        } satisfies SyncedContentBacklogCandidate
      ];
    })
  );
}

function buildResult(
  item: SyncedContentItem,
  access: ContentTrustEvidence["access"],
  dimensions: ContentTrustDimensionResult[]
): ContentTrustEvidence {
  return {
    contentItemId: item.id,
    contentUrl: item.url,
    access,
    dimensions,
    summary: countStatuses(dimensions.flatMap((dimension) => dimension.signals)),
    methodology: {
      title: "Observable Content Trust Evidence",
      statements: [
        "This is not a Google score, ranking-factor score, or ranking guarantee.",
        "Signals come from synced WordPress inventory and expose missing or uncertain evidence.",
        "Human review remains required for first-hand experience, qualifications, reputation, and consequential topics."
      ],
      guidanceUrl
    }
  };
}

function signal(
  id: string,
  label: string,
  status: ContentTrustEvidenceStatus,
  evidence: string,
  recommendation: string | null,
  sourceFields: string[]
): ContentTrustSignal {
  return { id, label, status, evidence, recommendation, sourceFields };
}

function countStatuses(signals: ContentTrustSignal[]) {
  return signals.reduce<Record<ContentTrustEvidenceStatus, number>>(
    (counts, signal) => {
      counts[signal.status] += 1;
      return counts;
    },
    { present: 0, missing: 0, insufficient: 0, human_review: 0 }
  );
}

function canonicalMatches(canonicalUrl: string, itemUrl: string): boolean {
  return normalizeUrl(canonicalUrl) === normalizeUrl(itemUrl);
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").toLowerCase();
}

function formatEvidenceDate(value: string): string {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString().slice(0, 10);
}

function findPotentialYmylTerms(
  taxonomies: Array<{ taxonomy: string; terms: string[] }>
): string[] {
  const pattern =
    /health|medical|medicine|finance|financial|money|invest|legal|law|safety|civic|election|insurance|loan|tax/i;
  return [
    ...new Set(
      taxonomies.flatMap((taxonomy) => taxonomy.terms).filter((term) => pattern.test(term))
    )
  ];
}
