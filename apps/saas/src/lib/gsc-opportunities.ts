import {
  buildContentUrlIndex,
  matchContentByUrl,
  type MatchedContentSummary,
  type SyncedContentUrlEntry
} from "./gsc-content-matching";
import { aggregateInsightsByPage } from "./gsc-traffic-loss";
import type { GscSearchInsight } from "./types";

export type GscOpportunityType = "ctr-opportunity" | "striking-distance";

export type GscOpportunityEntry = {
  type: GscOpportunityType;
  page: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
  expectedCtr: number | null;
};

export type GscOpportunities = {
  available: boolean;
  reason: string | null;
  range: { startDate: string; endDate: string } | null;
  entries: GscOpportunityEntry[];
};

export type MatchedGscOpportunityEntry = GscOpportunityEntry & {
  content: MatchedContentSummary | null;
};

export type GscOpportunityBacklogCandidate = {
  id: string;
  type: GscOpportunityType;
  title: string;
  priority: "medium";
  rationale: string;
  nextStep: string;
  page: string;
  content: MatchedContentSummary;
};

export type GscOpportunityOptions = {
  minCtrOpportunityImpressions?: number;
  maxCtrOpportunityPosition?: number;
  ctrShortfallRatio?: number;
  minStrikingDistanceImpressions?: number;
  strikingDistanceMinPosition?: number;
  strikingDistanceMaxPosition?: number;
  limitPerType?: number;
};

const defaultMinCtrOpportunityImpressions = 200;
const defaultMaxCtrOpportunityPosition = 10;
const defaultCtrShortfallRatio = 0.5;
const defaultMinStrikingDistanceImpressions = 100;
const defaultStrikingDistanceMinPosition = 5;
const defaultStrikingDistanceMaxPosition = 15;
const defaultLimitPerType = 10;

// Deterministic average-CTR-by-position benchmark used to spot pages whose
// snippet underperforms the position they already rank at. Values are a
// conservative industry-style curve, not live Google data, so detection stays
// reproducible from persisted insights alone.
const expectedCtrByPosition = [0.25, 0.15, 0.11, 0.08, 0.07, 0.05, 0.04, 0.03, 0.025, 0.02];
const expectedCtrBeyondTable = 0.015;

export function expectedCtrForPosition(position: number): number {
  if (!Number.isFinite(position) || position < 1) {
    return expectedCtrByPosition[0]!;
  }

  const index = Math.round(position) - 1;

  return expectedCtrByPosition[index] ?? expectedCtrBeyondTable;
}

/**
 * Detects backlog-worthy opportunities from the latest persisted page/query
 * insight snapshot. Two deterministic detectors run over per-page aggregates:
 *
 * - `ctr-opportunity`: the page already ranks near the top but earns
 *   substantially less CTR than the position benchmark despite meaningful
 *   impression volume, so the snippet is the likely bottleneck.
 * - `striking-distance`: the page ranks just outside the top results with
 *   meaningful impression volume, so content or internal-link work can move it
 *   into positions that earn clicks.
 *
 * A page can surface both opportunity types; each type is bounded and sorted
 * by impressions so the biggest opportunities always come first.
 */
export function buildGscOpportunities(
  insights: GscSearchInsight[],
  options: GscOpportunityOptions = {}
): GscOpportunities {
  if (insights.length === 0) {
    return {
      available: false,
      reason: "No Search Console page insights are synced yet.",
      range: null,
      entries: []
    };
  }

  const minCtrImpressions =
    options.minCtrOpportunityImpressions ?? defaultMinCtrOpportunityImpressions;
  const maxCtrPosition = options.maxCtrOpportunityPosition ?? defaultMaxCtrOpportunityPosition;
  const ctrShortfallRatio = options.ctrShortfallRatio ?? defaultCtrShortfallRatio;
  const minStrikingImpressions =
    options.minStrikingDistanceImpressions ?? defaultMinStrikingDistanceImpressions;
  const strikingMinPosition =
    options.strikingDistanceMinPosition ?? defaultStrikingDistanceMinPosition;
  const strikingMaxPosition =
    options.strikingDistanceMaxPosition ?? defaultStrikingDistanceMaxPosition;
  const limitPerType = Math.max(1, options.limitPerType ?? defaultLimitPerType);

  const range = {
    startDate: insights[0]!.startDate,
    endDate: insights[0]!.endDate
  };
  const ctrOpportunities: GscOpportunityEntry[] = [];
  const strikingDistance: GscOpportunityEntry[] = [];

  for (const [page, aggregate] of aggregateInsightsByPage(insights)) {
    if (aggregate.position === null) {
      continue;
    }

    const ctr = aggregate.impressions > 0 ? aggregate.clicks / aggregate.impressions : 0;
    const expectedCtr = expectedCtrForPosition(aggregate.position);

    if (
      aggregate.impressions >= minCtrImpressions &&
      aggregate.position <= maxCtrPosition &&
      ctr < expectedCtr * ctrShortfallRatio
    ) {
      ctrOpportunities.push({
        type: "ctr-opportunity",
        page,
        clicks: aggregate.clicks,
        impressions: aggregate.impressions,
        ctr: roundRatio(ctr),
        position: aggregate.position,
        expectedCtr: roundRatio(expectedCtr)
      });
    }

    if (
      aggregate.impressions >= minStrikingImpressions &&
      aggregate.position >= strikingMinPosition &&
      aggregate.position <= strikingMaxPosition
    ) {
      strikingDistance.push({
        type: "striking-distance",
        page,
        clicks: aggregate.clicks,
        impressions: aggregate.impressions,
        ctr: roundRatio(ctr),
        position: aggregate.position,
        expectedCtr: null
      });
    }
  }

  const entries = [
    ...sortOpportunityEntries(ctrOpportunities).slice(0, limitPerType),
    ...sortOpportunityEntries(strikingDistance).slice(0, limitPerType)
  ];

  return {
    available: true,
    reason: null,
    range,
    entries: sortOpportunityEntries(entries)
  };
}

export function matchGscOpportunityEntries(
  entries: GscOpportunityEntry[],
  items: SyncedContentUrlEntry[]
): MatchedGscOpportunityEntry[] {
  const index = buildContentUrlIndex(items);

  return entries.map((entry) => ({
    ...entry,
    content: matchContentByUrl(entry.page, index)
  }));
}

export function buildGscOpportunityCandidateId(
  contentItemId: string,
  type: GscOpportunityType
): string {
  return `${contentItemId}:gsc-${type}`;
}

/**
 * Converts matched opportunity entries into backlog candidates shaped like the
 * synced-content health candidates, so the existing candidate conversion
 * endpoint and dedup persist them. Only entries matched to synced WordPress
 * content become candidates, and each content item yields at most one
 * candidate per opportunity type (biggest impressions first).
 */
export function buildGscOpportunityBacklogCandidates(
  entries: MatchedGscOpportunityEntry[]
): GscOpportunityBacklogCandidate[] {
  const seen = new Set<string>();
  const candidates: GscOpportunityBacklogCandidate[] = [];

  for (const entry of sortOpportunityEntries(entries)) {
    if (!entry.content) {
      continue;
    }

    const id = buildGscOpportunityCandidateId(entry.content.contentItemId, entry.type);

    if (seen.has(id)) {
      continue;
    }

    seen.add(id);
    candidates.push(buildCandidate(id, entry, entry.content));
  }

  return candidates;
}

function buildCandidate(
  id: string,
  entry: MatchedGscOpportunityEntry,
  content: MatchedContentSummary
): GscOpportunityBacklogCandidate {
  const label = content.title?.trim() || entry.page;
  const ctrPercent = formatPercent(entry.ctr);
  const impressions = entry.impressions.toLocaleString("en");
  const position = entry.position.toLocaleString("en", { maximumFractionDigits: 1 });

  if (entry.type === "ctr-opportunity") {
    const expectedPercent = formatPercent(entry.expectedCtr ?? 0);

    return {
      id,
      type: entry.type,
      title: `Improve search snippet for ${label}`,
      priority: "medium",
      rationale: `The page ranks around position ${position} but earns a ${ctrPercent} CTR versus a ${expectedPercent} benchmark across ${impressions} impressions.`,
      nextStep:
        "Rewrite the SEO title and meta description to match the query intent, then compare CTR after the next insight sync.",
      page: entry.page,
      content
    };
  }

  return {
    id,
    type: entry.type,
    title: `Push ${label} into top positions`,
    priority: "medium",
    rationale: `The page sits at position ${position} with ${impressions} impressions, close enough to reach the top results with focused improvements.`,
    nextStep:
      "Expand the content coverage and add internal links pointing at this page, then compare position after the next insight sync.",
    page: entry.page,
    content
  };
}

function sortOpportunityEntries<Entry extends GscOpportunityEntry>(entries: Entry[]): Entry[] {
  return [...entries].sort(
    (left, right) =>
      right.impressions - left.impressions ||
      left.page.localeCompare(right.page) ||
      left.type.localeCompare(right.type)
  );
}

function formatPercent(ratio: number): string {
  return `${(ratio * 100).toLocaleString("en", { maximumFractionDigits: 1 })}%`;
}

function roundRatio(value: number): number {
  return Math.round(value * 10000) / 10000;
}
