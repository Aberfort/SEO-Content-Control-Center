import type {
  SyncedContentBacklogCandidate,
  SyncedContentHealthSignal,
  SyncedContentItem
} from "./types";

const staleSyncDays = 7;
const staleModifiedDays = 180;
const thinContentWordThreshold = 300;

export function buildSyncedContentHealthSignals(
  item: SyncedContentItem,
  referenceDate = new Date()
): SyncedContentHealthSignal[] {
  const title = item.title?.trim() ?? "";
  const status = item.status.trim().toLowerCase();
  const lastSeenAgeDays = ageInDays(item.lastSeenAt, referenceDate);
  const modifiedAgeDays = ageInDays(item.modifiedAt, referenceDate);

  return [
    title
      ? {
          id: "title-present",
          label: "Title detected",
          severity: "success",
          message: "The synced item has a WordPress title."
        }
      : {
          id: "title-missing",
          label: "Missing title",
          severity: "warning",
          message: "The synced item does not include a title yet."
        },
    status === "publish"
      ? {
          id: "published",
          label: "Published",
          severity: "success",
          message: "WordPress reports this item as published."
        }
      : {
          id: "not-published",
          label: "Not published",
          severity: status === "trash" ? "critical" : "warning",
          message: `WordPress status is ${item.status}.`
        },
    lastSeenAgeDays > staleSyncDays
      ? {
          id: "sync-stale",
          label: "Sync stale",
          severity: "critical",
          message: `This item has not appeared in sync for ${lastSeenAgeDays} days.`
        }
      : {
          id: "sync-fresh",
          label: "Recently synced",
          severity: "success",
          message: "This item appeared in a recent plugin sync."
        },
    modifiedAgeDays > staleModifiedDays
      ? {
          id: "content-stale",
          label: "Old modification date",
          severity: "info",
          message: `WordPress modified timestamp is ${modifiedAgeDays} days old.`
        }
      : {
          id: "content-current",
          label: "Recently modified",
          severity: "info",
          message: "WordPress modified timestamp is within the recent content window."
        },
    typeof item.metadata.wordCount === "number"
      ? item.metadata.wordCount < thinContentWordThreshold
        ? {
            id: "thin-content",
            label: "Thin content",
            severity: "warning",
            message: `WordPress content has ${item.metadata.wordCount} words.`
          }
        : {
            id: "word-count-ok",
            label: "Word count available",
            severity: "success",
            message: `WordPress content has ${item.metadata.wordCount} words.`
          }
      : {
          id: "word-count-unknown",
          label: "Word count unavailable",
          severity: "info",
          message: "Run the latest plugin sync to include word count metadata."
        },
    buildSeoTitleSignal(item),
    buildMetaDescriptionSignal(item),
    ...buildRobotsSignals(item),
    buildCanonicalSignal(item),
    buildInternalLinkSignal(item),
    buildExternalLinkSignal(item)
  ];
}

export function buildSyncedContentBacklogCandidates(
  item: SyncedContentItem,
  signals: SyncedContentHealthSignal[] = buildSyncedContentHealthSignals(item)
): SyncedContentBacklogCandidate[] {
  return signals
    .map((signal) => buildCandidateFromSignal(item, signal))
    .filter((candidate): candidate is SyncedContentBacklogCandidate => candidate !== null);
}

function buildCandidateFromSignal(
  item: SyncedContentItem,
  signal: SyncedContentHealthSignal
): SyncedContentBacklogCandidate | null {
  const contentLabel = item.title?.trim() || item.externalId;

  switch (signal.id) {
    case "title-missing":
      return {
        id: `${item.id}:title`,
        title: `Add a WordPress title for ${contentLabel}`,
        priority: "medium",
        sourceSignalId: signal.id,
        rationale: "Pages without titles are harder to triage and often need metadata review.",
        nextStep: "Open the WordPress editor, add a descriptive title, then run plugin sync again."
      };
    case "not-published":
      return {
        id: `${item.id}:status`,
        title: `Review publication status for ${contentLabel}`,
        priority: signal.severity === "critical" ? "high" : "medium",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep: "Confirm whether this URL should be indexable, restored, redirected, or excluded."
      };
    case "sync-stale":
      return {
        id: `${item.id}:sync`,
        title: `Refresh plugin sync for ${contentLabel}`,
        priority: "high",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep: "Run manual sync from the WordPress plugin and verify this item appears again."
      };
    case "content-stale":
      return {
        id: `${item.id}:refresh`,
        title: `Review freshness of ${contentLabel}`,
        priority: "low",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep: "Check whether the page still matches search intent and update it if needed."
      };
    case "thin-content":
      return {
        id: `${item.id}:thin-content`,
        title: `Review thin content on ${contentLabel}`,
        priority: "medium",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep:
          "Review the page depth, search intent coverage, and whether it needs expansion or consolidation."
      };
    case "seo-title-missing":
      return {
        id: `${item.id}:seo-title`,
        title: `Add an SEO title for ${contentLabel}`,
        priority: "medium",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep:
          "Add or confirm the SEO title in the WordPress SEO plugin, then run plugin sync again."
      };
    case "meta-description-missing":
      return {
        id: `${item.id}:meta-description`,
        title: `Add a meta description for ${contentLabel}`,
        priority: "medium",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep:
          "Add a concise meta description in the WordPress SEO plugin, then run plugin sync again."
      };
    case "robots-noindex":
      return {
        id: `${item.id}:robots-noindex`,
        title: `Review noindex directive on ${contentLabel}`,
        priority: "high",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep:
          "Confirm whether this published URL should stay noindex; if not, review the safe operation preview before removing only that directive."
      };
    case "canonical-different":
      return {
        id: `${item.id}:canonical`,
        title: `Review canonical target for ${contentLabel}`,
        priority: "medium",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep:
          "Confirm this URL should be self-canonical, then review the safe operation preview before changing the canonical target."
      };
    case "robots-nofollow":
      return {
        id: `${item.id}:robots-nofollow`,
        title: `Review nofollow directive on ${contentLabel}`,
        priority: "medium",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep:
          "Confirm this published URL should allow links to be followed, then review the safe operation preview before removing only that directive."
      };
    case "internal-links-missing":
      return {
        id: `${item.id}:internal-links`,
        title: `Add internal links on ${contentLabel}`,
        priority: "medium",
        sourceSignalId: signal.id,
        rationale: signal.message,
        nextStep:
          "Add relevant internal links to related pages or hub content, then run plugin sync again."
      };
    default:
      return null;
  }
}

function buildSeoTitleSignal(item: SyncedContentItem): SyncedContentHealthSignal {
  const seoTitle = item.metadata.seoTitle?.trim() ?? "";

  return seoTitle
    ? {
        id: "seo-title-present",
        label: "SEO title detected",
        severity: "success",
        message: "Plugin sync included an SEO title."
      }
    : {
        id: "seo-title-missing",
        label: "Missing SEO title",
        severity: "warning",
        message: "Plugin sync did not include an SEO title for this item."
      };
}

function buildMetaDescriptionSignal(item: SyncedContentItem): SyncedContentHealthSignal {
  const metaDescription = item.metadata.metaDescription?.trim() ?? "";

  return metaDescription
    ? {
        id: "meta-description-present",
        label: "Meta description detected",
        severity: "success",
        message: "Plugin sync included a meta description."
      }
    : {
        id: "meta-description-missing",
        label: "Missing meta description",
        severity: "warning",
        message: "Plugin sync did not include a meta description for this item."
      };
}

function buildRobotsSignals(item: SyncedContentItem): SyncedContentHealthSignal[] {
  const noindexSignal: SyncedContentHealthSignal =
    item.metadata.robotsNoindex === true
      ? {
          id: "robots-noindex",
          label: "Noindex detected",
          severity: "critical",
          message: "Robots metadata marks this item as noindex."
        }
      : item.metadata.robotsNoindex === false
        ? {
            id: "robots-indexable",
            label: "Indexable",
            severity: "success",
            message: "Robots metadata does not mark this item as noindex."
          }
        : {
            id: "robots-unknown",
            label: "Robots unavailable",
            severity: "info",
            message: "Run the latest plugin sync to include robots metadata."
          };

  if (item.metadata.robotsNofollow !== true) {
    return [noindexSignal];
  }

  return [
    noindexSignal,
    {
      id: "robots-nofollow",
      label: "Nofollow detected",
      severity: "warning",
      message: "Robots metadata marks this item as nofollow."
    }
  ];
}

function buildCanonicalSignal(item: SyncedContentItem): SyncedContentHealthSignal {
  const canonicalUrl = item.metadata.canonicalUrl?.trim() ?? "";

  if (!canonicalUrl) {
    return {
      id: "canonical-unknown",
      label: "Canonical unavailable",
      severity: "info",
      message: "Plugin sync did not include a canonical URL for this item."
    };
  }

  if (canonicalMatchesItem(canonicalUrl, item.url)) {
    return {
      id: "canonical-self",
      label: "Canonical self-reference",
      severity: "success",
      message: "Canonical URL matches this synced URL."
    };
  }

  return {
    id: "canonical-different",
    label: "Canonical differs",
    severity: "warning",
    message: `Canonical URL points to ${canonicalUrl}.`
  };
}

function buildInternalLinkSignal(item: SyncedContentItem): SyncedContentHealthSignal {
  if (typeof item.metadata.internalLinkCount !== "number") {
    return {
      id: "internal-links-unknown",
      label: "Internal links unavailable",
      severity: "info",
      message: "Run the latest plugin sync to include internal link counts."
    };
  }

  if (item.metadata.internalLinkCount > 0) {
    return {
      id: "internal-links-present",
      label: "Internal links detected",
      severity: "success",
      message: `Plugin sync found ${item.metadata.internalLinkCount} internal links.`
    };
  }

  return {
    id: "internal-links-missing",
    label: "No internal links",
    severity: "warning",
    message: "Plugin sync did not find internal links in this content item."
  };
}

function buildExternalLinkSignal(item: SyncedContentItem): SyncedContentHealthSignal {
  if (typeof item.metadata.externalLinkCount !== "number") {
    return {
      id: "external-links-unknown",
      label: "Outbound links unavailable",
      severity: "info",
      message: "Run the latest plugin sync to include outbound link counts."
    };
  }

  if (item.metadata.externalLinkCount > 0) {
    return {
      id: "external-links-present",
      label: "Outbound links detected",
      severity: "info",
      message: `Plugin sync found ${item.metadata.externalLinkCount} outbound links.`
    };
  }

  return {
    id: "external-links-missing",
    label: "No outbound links",
    severity: "info",
    message: "Plugin sync did not find outbound links in this content item."
  };
}

export function canonicalMatchesItem(canonicalUrl: string, itemUrl: string): boolean {
  try {
    return normalizeUrlForComparison(canonicalUrl) === normalizeUrlForComparison(itemUrl);
  } catch {
    return false;
  }
}

function normalizeUrlForComparison(value: string): string {
  const url = new URL(value);
  const pathname = url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");

  return `${url.protocol}//${url.host.toLowerCase()}${pathname}${url.search}`;
}

function ageInDays(value: string, referenceDate: Date): number {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((referenceDate.getTime() - timestamp) / 86_400_000));
}
