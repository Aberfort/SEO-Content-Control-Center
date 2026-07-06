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
        }
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
    default:
      return null;
  }
}

function ageInDays(value: string, referenceDate: Date): number {
  const timestamp = new Date(value).getTime();

  if (!Number.isFinite(timestamp)) {
    return 0;
  }

  return Math.max(0, Math.floor((referenceDate.getTime() - timestamp) / 86_400_000));
}
