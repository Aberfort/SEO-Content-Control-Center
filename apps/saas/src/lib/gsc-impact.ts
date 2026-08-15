import {
  buildContentUrlIndex,
  matchContentByUrl,
  type SyncedContentUrlEntry
} from "./gsc-content-matching";
import { aggregateInsightsByPage } from "./gsc-traffic-loss";
import type { AuditIssue, BacklogTask, GscSearchInsight } from "./types";

export type SearchImpactBand = "none" | "low" | "medium" | "high";
export type SearchImpactOutcomeStatus = "awaiting_followup" | "improved" | "declined" | "stable";

export type SearchImpactSnapshot = {
  range: { startDate: string; endDate: string };
  clicks: number;
  impressions: number;
  ctr: number;
  position: number | null;
};

export type SearchImpactAssessment = {
  source: "gsc_search_impact";
  band: SearchImpactBand;
  basis: string;
  thresholds: {
    mediumClicks: 10;
    mediumImpressions: 200;
    highClicks: 50;
    highImpressions: 1000;
    outcomeMinClicksDelta: 5;
    outcomeRatio: 0.25;
  };
  current: SearchImpactSnapshot;
  comparison: SearchImpactSnapshot | null;
  trackingBaseline: SearchImpactSnapshot;
  outcome: {
    status: SearchImpactOutcomeStatus;
    clicksDelta: number | null;
    clicksDeltaRatio: number | null;
    impressionsDelta: number | null;
    disclaimer: "Period comparison shows correlation, not causation.";
  };
};

export type SearchImpactIssue = Pick<AuditIssue, "evidence" | "potentialImpact">;
export type SearchImpactTask = Pick<BacklogTask, "tags">;

const searchImpactTagPrefix = "search-impact:";
const searchImpactRank: Record<SearchImpactBand, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3
};

export const searchImpactThresholds = {
  mediumClicks: 10,
  mediumImpressions: 200,
  highClicks: 50,
  highImpressions: 1000,
  outcomeMinClicksDelta: 5,
  outcomeRatio: 0.25
} as const;

export function buildSearchImpactAssessments(input: {
  currentInsights: GscSearchInsight[];
  comparisonInsights: GscSearchInsight[];
  contentEntries: SyncedContentUrlEntry[];
}): Map<string, SearchImpactAssessment> {
  if (input.currentInsights.length === 0 || input.contentEntries.length === 0) {
    return new Map();
  }

  const index = buildContentUrlIndex(input.contentEntries);
  const currentByExternalId = matchPageAggregates(input.currentInsights, index);
  const comparisonByExternalId = matchPageAggregates(input.comparisonInsights, index);
  const currentRange = insightRange(input.currentInsights);
  const comparisonRange = insightRange(input.comparisonInsights);
  const assessments = new Map<string, SearchImpactAssessment>();

  for (const [externalId, current] of currentByExternalId) {
    const comparison = comparisonByExternalId.get(externalId) ?? null;
    const currentSnapshot = toSnapshot(currentRange, current);
    const comparisonSnapshot =
      comparisonRange && comparison ? toSnapshot(comparisonRange, comparison) : null;
    const band = classifySearchImpact(currentSnapshot, comparisonSnapshot);

    assessments.set(externalId, {
      source: "gsc_search_impact",
      band,
      basis: impactBasis(band, currentSnapshot, comparisonSnapshot),
      thresholds: searchImpactThresholds,
      current: currentSnapshot,
      comparison: comparisonSnapshot,
      trackingBaseline: currentSnapshot,
      outcome: buildOutcome(currentSnapshot, currentSnapshot)
    });
  }

  return assessments;
}

export function attachSearchImpact<T extends SearchImpactIssue>(
  issue: T,
  impact: SearchImpactAssessment | undefined
): T {
  if (!impact || typeof issue.evidence !== "object" || issue.evidence === null) {
    return issue;
  }

  return {
    ...issue,
    evidence: {
      ...(issue.evidence as Record<string, unknown>),
      searchImpact: impact
    },
    potentialImpact: formatPotentialImpact(impact)
  };
}

export function preserveSearchImpactBaseline<T extends SearchImpactIssue>(
  issue: T,
  existingEvidence: unknown
): T {
  const impact = readSearchImpact(issue.evidence);

  if (!impact || typeof issue.evidence !== "object" || issue.evidence === null) {
    return issue;
  }

  const previousImpact = readSearchImpact(existingEvidence);
  const trackingBaseline =
    previousImpact?.trackingBaseline ?? previousImpact?.current ?? impact.current;

  return {
    ...issue,
    evidence: {
      ...(issue.evidence as Record<string, unknown>),
      searchImpact: {
        ...impact,
        trackingBaseline,
        outcome: buildOutcome(impact.current, trackingBaseline)
      }
    }
  };
}

export function readSearchImpact(evidence: unknown): SearchImpactAssessment | null {
  if (typeof evidence !== "object" || evidence === null || Array.isArray(evidence)) {
    return null;
  }

  const impact = (evidence as Record<string, unknown>).searchImpact;

  if (typeof impact !== "object" || impact === null || Array.isArray(impact)) {
    return null;
  }

  const candidate = impact as Partial<SearchImpactAssessment>;

  return candidate.source === "gsc_search_impact" &&
    ["none", "low", "medium", "high"].includes(candidate.band ?? "") &&
    typeof candidate.current === "object"
    ? (candidate as SearchImpactAssessment)
    : null;
}

export function compareIssuesBySearchImpact(left: AuditIssue, right: AuditIssue): number {
  const leftImpact = readSearchImpact(left.evidence);
  const rightImpact = readSearchImpact(right.evidence);

  return (
    searchImpactRank[rightImpact?.band ?? "none"] - searchImpactRank[leftImpact?.band ?? "none"]
  );
}

export function withSearchImpactTag(tags: string[], evidence: unknown): string[] {
  const impact = readSearchImpact(evidence);

  if (!impact) {
    return tags;
  }

  return [
    ...tags.filter((tag) => !tag.startsWith(searchImpactTagPrefix)),
    `${searchImpactTagPrefix}${impact.band}`
  ];
}

export function readSearchImpactBandFromTags(tags: string[]): SearchImpactBand | null {
  const value = tags
    .find((tag) => tag.startsWith(searchImpactTagPrefix))
    ?.slice(searchImpactTagPrefix.length);

  return value && ["none", "low", "medium", "high"].includes(value)
    ? (value as SearchImpactBand)
    : null;
}

export function compareTasksBySearchImpact(
  left: SearchImpactTask,
  right: SearchImpactTask
): number {
  const leftBand = readSearchImpactBandFromTags(left.tags) ?? "none";
  const rightBand = readSearchImpactBandFromTags(right.tags) ?? "none";

  return searchImpactRank[rightBand] - searchImpactRank[leftBand];
}

function matchPageAggregates(
  insights: GscSearchInsight[],
  index: ReturnType<typeof buildContentUrlIndex>
): Map<
  string,
  ReturnType<typeof aggregateInsightsByPage> extends Map<string, infer T> ? T : never
> {
  const matched = new Map<
    string,
    ReturnType<typeof aggregateInsightsByPage> extends Map<string, infer T> ? T : never
  >();

  for (const [page, aggregate] of aggregateInsightsByPage(insights)) {
    const content = matchContentByUrl(page, index);

    if (!content) {
      continue;
    }

    const existing = matched.get(content.externalId);

    if (!existing || aggregate.impressions > existing.impressions) {
      matched.set(content.externalId, aggregate);
    }
  }

  return matched;
}

function insightRange(insights: GscSearchInsight[]): { startDate: string; endDate: string } | null {
  return insights.length > 0
    ? { startDate: insights[0]!.startDate, endDate: insights[0]!.endDate }
    : null;
}

function toSnapshot(
  range: { startDate: string; endDate: string } | null,
  metrics: { clicks: number; impressions: number; position: number | null }
): SearchImpactSnapshot {
  if (!range) {
    throw new Error("SEARCH_IMPACT_RANGE_REQUIRED");
  }

  return {
    range,
    clicks: metrics.clicks,
    impressions: metrics.impressions,
    ctr: metrics.impressions > 0 ? roundRatio(metrics.clicks / metrics.impressions) : 0,
    position: metrics.position
  };
}

function classifySearchImpact(
  current: SearchImpactSnapshot,
  comparison: SearchImpactSnapshot | null
): SearchImpactBand {
  const clicks = Math.max(current.clicks, comparison?.clicks ?? 0);
  const impressions = Math.max(current.impressions, comparison?.impressions ?? 0);

  if (
    clicks >= searchImpactThresholds.highClicks ||
    impressions >= searchImpactThresholds.highImpressions
  ) {
    return "high";
  }

  if (
    clicks >= searchImpactThresholds.mediumClicks ||
    impressions >= searchImpactThresholds.mediumImpressions
  ) {
    return "medium";
  }

  return clicks > 0 || impressions > 0 ? "low" : "none";
}

function impactBasis(
  band: SearchImpactBand,
  current: SearchImpactSnapshot,
  comparison: SearchImpactSnapshot | null
): string {
  const observedClicks = Math.max(current.clicks, comparison?.clicks ?? 0);
  const observedImpressions = Math.max(current.impressions, comparison?.impressions ?? 0);

  return `${band} impact: observed up to ${observedClicks} clicks and ${observedImpressions} impressions; medium starts at 10 clicks or 200 impressions, high at 50 clicks or 1,000 impressions.`;
}

function buildOutcome(
  current: SearchImpactSnapshot,
  trackingBaseline: SearchImpactSnapshot
): SearchImpactAssessment["outcome"] {
  if (
    current.range.startDate === trackingBaseline.range.startDate &&
    current.range.endDate === trackingBaseline.range.endDate
  ) {
    return {
      status: "awaiting_followup",
      clicksDelta: null,
      clicksDeltaRatio: null,
      impressionsDelta: null,
      disclaimer: "Period comparison shows correlation, not causation."
    };
  }

  const clicksDelta = current.clicks - trackingBaseline.clicks;
  const impressionsDelta = current.impressions - trackingBaseline.impressions;
  const clicksDeltaRatio =
    trackingBaseline.clicks > 0 ? clicksDelta / trackingBaseline.clicks : null;
  let status: SearchImpactOutcomeStatus = "stable";

  if (
    clicksDelta >= searchImpactThresholds.outcomeMinClicksDelta &&
    (clicksDeltaRatio === null || clicksDeltaRatio >= searchImpactThresholds.outcomeRatio)
  ) {
    status = "improved";
  } else if (
    clicksDelta <= -searchImpactThresholds.outcomeMinClicksDelta &&
    clicksDeltaRatio !== null &&
    clicksDeltaRatio <= -searchImpactThresholds.outcomeRatio
  ) {
    status = "declined";
  }

  return {
    status,
    clicksDelta,
    clicksDeltaRatio: clicksDeltaRatio === null ? null : roundRatio(clicksDeltaRatio),
    impressionsDelta,
    disclaimer: "Period comparison shows correlation, not causation."
  };
}

function formatPotentialImpact(impact: SearchImpactAssessment): string {
  const position = impact.current.position === null ? "unknown" : impact.current.position;

  return `${impact.band.toUpperCase()} search impact: ${impact.current.clicks} clicks, ${impact.current.impressions} impressions, ${(impact.current.ctr * 100).toFixed(1)}% CTR, position ${position} in ${impact.current.range.startDate} to ${impact.current.range.endDate}. ${impact.basis}`;
}

function roundRatio(value: number): number {
  return Math.round(value * 10_000) / 10_000;
}
