import type { MatchedContentSummary, MatchedPageTrafficLossEntry } from "./gsc-content-matching";
import type { AuditIssue } from "./types";

export const trafficLossIssueType = "gsc.traffic-loss";

export type TrafficLossIssueEvidence = {
  source: "gsc_traffic_loss";
  contentItemId: string;
  externalId: string;
  propertyUrl: string | null;
  currentRange: { startDate: string; endDate: string };
  baselineRange: { startDate: string; endDate: string };
  currentClicks: number;
  baselineClicks: number;
  clicksDelta: number;
  dropRatio: number;
  currentPosition: number | null;
  baselinePosition: number | null;
};

export type GeneratedTrafficLossAuditIssueInput = {
  issueType: typeof trafficLossIssueType;
  severity: AuditIssue["severity"];
  affectedUrl: string;
  evidence: TrafficLossIssueEvidence;
  explanation: string;
  recommendedAction: string;
  potentialImpact: string;
  fingerprint: string;
};

export type TrafficLossAuditIssueOptions = {
  highDropRatio?: number;
};

type MatchedDrop = MatchedPageTrafficLossEntry & {
  content: MatchedContentSummary;
};

// Mirrors the high-severity click-drop threshold used by site-level detection
// in gsc-traffic-loss.ts so severities stay consistent across surfaces.
const defaultHighDropRatio = 0.5;

export function buildTrafficLossIssueFingerprint(externalId: string): string {
  return `gsc:traffic-loss:${externalId}`;
}

export function mapDropRatioToAuditSeverity(
  dropRatio: number,
  highDropRatio = defaultHighDropRatio
): AuditIssue["severity"] {
  return dropRatio >= highDropRatio ? "HIGH" : "MEDIUM";
}

/**
 * Materializes matched page-level traffic loss drops as audit issue inputs.
 * Only drops matched to a synced WordPress content item become issues, because
 * the fingerprint dedupes on the synced external id and downstream backlog
 * conversion needs a content target. When several dropping page URLs match the
 * same content item, the drop losing the most clicks wins deterministically.
 */
export function buildAuditIssueInputsFromTrafficLoss(input: {
  drops: MatchedPageTrafficLossEntry[];
  currentRange: { startDate: string; endDate: string } | null;
  baselineRange: { startDate: string; endDate: string } | null;
  propertyUrl: string | null;
  options?: TrafficLossAuditIssueOptions;
}): GeneratedTrafficLossAuditIssueInput[] {
  const { currentRange, baselineRange } = input;

  if (!currentRange || !baselineRange) {
    return [];
  }

  const highDropRatio = input.options?.highDropRatio ?? defaultHighDropRatio;
  const matchedDrops = input.drops
    .filter((drop): drop is MatchedDrop => drop.content !== null)
    .sort(
      (left, right) => left.clicksDelta - right.clicksDelta || left.page.localeCompare(right.page)
    );
  const seenExternalIds = new Set<string>();
  const issues: GeneratedTrafficLossAuditIssueInput[] = [];

  for (const drop of matchedDrops) {
    if (seenExternalIds.has(drop.content.externalId)) {
      continue;
    }

    seenExternalIds.add(drop.content.externalId);
    issues.push(
      buildIssueInput(drop, currentRange, baselineRange, input.propertyUrl, highDropRatio)
    );
  }

  return issues;
}

function buildIssueInput(
  drop: MatchedDrop,
  currentRange: { startDate: string; endDate: string },
  baselineRange: { startDate: string; endDate: string },
  propertyUrl: string | null,
  highDropRatio: number
): GeneratedTrafficLossAuditIssueInput {
  const dropPercent = Math.round(drop.dropRatio * 100);
  const title = drop.content.title?.trim() || drop.page;

  return {
    issueType: trafficLossIssueType,
    severity: mapDropRatioToAuditSeverity(drop.dropRatio, highDropRatio),
    affectedUrl: drop.page,
    evidence: {
      source: "gsc_traffic_loss",
      contentItemId: drop.content.contentItemId,
      externalId: drop.content.externalId,
      propertyUrl,
      currentRange,
      baselineRange,
      currentClicks: drop.currentClicks,
      baselineClicks: drop.baselineClicks,
      clicksDelta: drop.clicksDelta,
      dropRatio: drop.dropRatio,
      currentPosition: drop.currentPosition,
      baselinePosition: drop.baselinePosition
    },
    explanation: `Search clicks for "${title}" dropped ${dropPercent}% (${drop.baselineClicks} to ${drop.currentClicks}) between the ${baselineRange.startDate} to ${baselineRange.endDate} baseline and the ${currentRange.startDate} to ${currentRange.endDate} window.`,
    recommendedAction:
      "Review recent content, metadata, and ranking changes for this page and restore what previously earned its search clicks.",
    potentialImpact: `Losing about ${Math.abs(drop.clicksDelta)} clicks per reporting window while the drop persists.`,
    fingerprint: buildTrafficLossIssueFingerprint(drop.content.externalId)
  };
}
