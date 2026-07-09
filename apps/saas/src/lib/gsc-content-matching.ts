import type { PageTrafficLossEntry } from "./gsc-traffic-loss";

export type SyncedContentUrlEntry = {
  id: string;
  externalId: string;
  url: string;
  title: string | null;
};

export type MatchedContentSummary = {
  contentItemId: string;
  externalId: string;
  title: string | null;
};

export type MatchedPageTrafficLossEntry = PageTrafficLossEntry & {
  content: MatchedContentSummary | null;
};

/**
 * Normalizes a page URL for matching Search Console pages against synced
 * WordPress permalinks. Matching intentionally ignores protocol, a leading
 * `www.` host prefix, trailing slashes, query strings, and fragments, because
 * GSC-reported page URLs and WordPress permalinks commonly disagree on those
 * while still describing the same document.
 */
export function normalizeContentUrl(url: string): string | null {
  const trimmed = url.trim();

  if (!trimmed) {
    return null;
  }

  let parsed: URL;

  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return null;
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const pathname = parsed.pathname.replace(/\/+$/, "") || "/";

  return `${host}${pathname}`;
}

/**
 * Builds a lookup index from normalized synced content URLs. When two synced
 * items normalize to the same URL, the first one wins deterministically by
 * external id sort order.
 */
export function buildContentUrlIndex(
  items: SyncedContentUrlEntry[]
): Map<string, SyncedContentUrlEntry> {
  const sorted = [...items].sort((left, right) => left.externalId.localeCompare(right.externalId));
  const index = new Map<string, SyncedContentUrlEntry>();

  for (const item of sorted) {
    const normalized = normalizeContentUrl(item.url);

    if (!normalized || index.has(normalized)) {
      continue;
    }

    index.set(normalized, item);
  }

  return index;
}

export function matchContentByUrl(
  pageUrl: string,
  index: Map<string, SyncedContentUrlEntry>
): MatchedContentSummary | null {
  const normalized = normalizeContentUrl(pageUrl);

  if (!normalized) {
    return null;
  }

  const item = index.get(normalized);

  if (!item) {
    return null;
  }

  return {
    contentItemId: item.id,
    externalId: item.externalId,
    title: item.title
  };
}

/**
 * Enriches page-level traffic loss entries with the synced WordPress content
 * item behind each page URL, so drops can become audit issues and backlog
 * tasks with content evidence in later iterations.
 */
export function matchTrafficLossPages(
  drops: PageTrafficLossEntry[],
  items: SyncedContentUrlEntry[]
): MatchedPageTrafficLossEntry[] {
  const index = buildContentUrlIndex(items);

  return drops.map((drop) => ({
    ...drop,
    content: matchContentByUrl(drop.page, index)
  }));
}
