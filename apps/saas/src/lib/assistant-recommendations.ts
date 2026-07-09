import { buildSyncedContentBacklogCandidates } from "./content-health";
import type { MatchedPageTrafficLossEntry } from "./gsc-content-matching";
import {
  buildGscOpportunityBacklogCandidates,
  type MatchedGscOpportunityEntry
} from "./gsc-opportunities";
import type {
  AssistantRecommendation,
  AssistantRecommendationAction,
  AssistantRecommendationPriority,
  BacklogTask,
  SyncedContentItem
} from "./types";

const assistantSafeguards = [
  "recommendation_only",
  "manual_confirmation_required",
  "no_wordpress_write"
];

// Mirrors the high-severity click-drop threshold used by traffic loss
// detection so assistant priorities match audit issue severities.
const trafficLossHighPriorityDropRatio = 0.5;

export function buildAssistantRecommendationFromBacklogTask(
  task: BacklogTask
): AssistantRecommendation {
  return {
    id: `backlog:${task.id}`,
    organizationId: task.organizationId,
    siteId: task.siteId,
    title: task.title,
    rationale: task.potentialImpact ?? `Backlog task severity is ${task.severity.toLowerCase()}.`,
    nextStep: buildBacklogNextStep(task),
    priority: mapSeverityToPriority(task.severity),
    source: {
      type: "backlog_task",
      id: task.id,
      label: "Backlog task",
      url: task.url,
      detail: `${task.status.replaceAll("_", " ").toLowerCase()} / ${task.severity.toLowerCase()}`
    },
    action: buildSafePreviewAction({
      enabled: true,
      targetTaskId: task.id
    }),
    noMutation: true,
    safeguards: assistantSafeguards
  };
}

export function buildAssistantRecommendationsFromSyncedContent(
  item: SyncedContentItem
): AssistantRecommendation[] {
  return buildSyncedContentBacklogCandidates(item).map((candidate) => ({
    id: `content:${candidate.id}`,
    organizationId: item.organizationId,
    siteId: item.siteId,
    title: candidate.title,
    rationale: candidate.rationale,
    nextStep: candidate.nextStep,
    priority: candidate.priority,
    source: {
      type: "synced_content",
      id: item.id,
      label: item.title ?? item.externalId,
      url: item.url,
      detail: `Signal ${candidate.sourceSignalId.replaceAll("-", " ")}`
    },
    action: buildSafePreviewAction({
      enabled: false,
      targetTaskId: null,
      disabledReason: "Create a backlog task before preparing a safe preview."
    }),
    noMutation: true,
    safeguards: assistantSafeguards
  }));
}

/**
 * Builds read-only recommendations from matched page-level traffic loss
 * evidence. GSC-sourced recommendations never enable safe preview controls;
 * the operator first converts the evidence into a backlog task.
 */
export function buildAssistantRecommendationsFromTrafficLoss(input: {
  organizationId: string;
  siteId: string;
  drops: MatchedPageTrafficLossEntry[];
  currentRange: { startDate: string; endDate: string } | null;
  baselineRange: { startDate: string; endDate: string } | null;
}): AssistantRecommendation[] {
  const { currentRange, baselineRange } = input;

  if (!currentRange || !baselineRange) {
    return [];
  }

  return input.drops.map((drop) => {
    const label = drop.content?.title?.trim() || drop.page;
    const dropPercent = Math.round(drop.dropRatio * 100);

    return {
      id: `gsc-loss:${drop.page}`,
      organizationId: input.organizationId,
      siteId: input.siteId,
      title: `Investigate the click drop on ${label}`,
      rationale: `Search clicks dropped ${dropPercent}% (${drop.baselineClicks} to ${drop.currentClicks}) between the ${baselineRange.startDate} to ${baselineRange.endDate} baseline and the ${currentRange.startDate} to ${currentRange.endDate} window.`,
      nextStep: drop.content
        ? "Run a metadata audit to materialize this drop as an audit issue, then convert it into a backlog task."
        : "Sync this page from WordPress so the drop can join audits and backlog work.",
      priority: drop.dropRatio >= trafficLossHighPriorityDropRatio ? "high" : "medium",
      source: {
        type: "gsc_traffic_loss",
        id: drop.page,
        label,
        url: drop.page,
        detail: `Clicks ${drop.baselineClicks} to ${drop.currentClicks} (${dropPercent}% drop)`
      },
      action: buildSafePreviewAction({
        enabled: false,
        targetTaskId: null,
        disabledReason: "Create a backlog task for this drop before preparing a safe preview."
      }),
      noMutation: true,
      safeguards: assistantSafeguards
    };
  });
}

/**
 * Builds read-only recommendations from search opportunity evidence. Matched
 * entries reuse the opportunity candidate copy so the assistant and the
 * Search opportunities panel describe the same work; unmatched entries point
 * the operator at plugin sync first.
 */
export function buildAssistantRecommendationsFromGscOpportunities(input: {
  organizationId: string;
  siteId: string;
  entries: MatchedGscOpportunityEntry[];
}): AssistantRecommendation[] {
  const matchedCandidates = buildGscOpportunityBacklogCandidates(input.entries);
  const matchedRecommendations = matchedCandidates.map((candidate) => {
    const entry = input.entries.find(
      (candidateEntry) =>
        candidateEntry.type === candidate.type && candidateEntry.page === candidate.page
    );

    return {
      id: `gsc-opportunity:${candidate.id}`,
      organizationId: input.organizationId,
      siteId: input.siteId,
      title: candidate.title,
      rationale: candidate.rationale,
      nextStep: candidate.nextStep,
      priority: candidate.priority,
      source: {
        type: "gsc_opportunity" as const,
        id: candidate.id,
        label: candidate.content.title?.trim() || candidate.page,
        url: candidate.page,
        detail: entry ? buildOpportunityDetail(entry) : candidate.type
      },
      action: buildSafePreviewAction({
        enabled: false,
        targetTaskId: null,
        disabledReason:
          "Create a backlog task from this opportunity before preparing a safe preview."
      }),
      noMutation: true,
      safeguards: assistantSafeguards
    } satisfies AssistantRecommendation;
  });
  const unmatchedRecommendations = input.entries
    .filter((entry) => entry.content === null)
    .map(
      (entry) =>
        ({
          id: `gsc-opportunity:${entry.type}:${entry.page}`,
          organizationId: input.organizationId,
          siteId: input.siteId,
          title:
            entry.type === "ctr-opportunity"
              ? `Improve search snippet for ${entry.page}`
              : `Push ${entry.page} into top positions`,
          rationale: `${buildOpportunityDetail(entry)} in the latest insight snapshot.`,
          nextStep: "Sync this page from WordPress so the opportunity can become a backlog task.",
          priority: "medium",
          source: {
            type: "gsc_opportunity",
            id: `${entry.type}:${entry.page}`,
            label: entry.page,
            url: entry.page,
            detail: buildOpportunityDetail(entry)
          },
          action: buildSafePreviewAction({
            enabled: false,
            targetTaskId: null,
            disabledReason:
              "Sync this page from WordPress before converting it into a backlog task."
          }),
          noMutation: true,
          safeguards: assistantSafeguards
        }) satisfies AssistantRecommendation
    );

  return [...matchedRecommendations, ...unmatchedRecommendations];
}

function buildOpportunityDetail(entry: MatchedGscOpportunityEntry): string {
  const position = entry.position.toLocaleString("en", { maximumFractionDigits: 1 });
  const impressions = entry.impressions.toLocaleString("en");
  const ctrPercent = `${(entry.ctr * 100).toLocaleString("en", { maximumFractionDigits: 1 })}%`;

  if (entry.type === "ctr-opportunity" && entry.expectedCtr !== null) {
    const expectedPercent = `${(entry.expectedCtr * 100).toLocaleString("en", {
      maximumFractionDigits: 1
    })}%`;

    return `Position ${position} / CTR ${ctrPercent} vs ${expectedPercent} benchmark / ${impressions} impressions`;
  }

  return `Position ${position} / ${impressions} impressions`;
}

export function sortAssistantRecommendations(
  recommendations: AssistantRecommendation[]
): AssistantRecommendation[] {
  return [...recommendations].sort((left, right) => {
    const priorityDelta = priorityRank(right.priority) - priorityRank(left.priority);

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const sourceDelta = sourceRank(left.source.type) - sourceRank(right.source.type);

    if (sourceDelta !== 0) {
      return sourceDelta;
    }

    return left.title.localeCompare(right.title);
  });
}

function buildBacklogNextStep(task: BacklogTask): string {
  if (task.status === "TODO") {
    return "Assign or schedule this task before preparing a safe operation preview.";
  }

  if (task.status === "IN_PROGRESS") {
    return "Review the current owner notes and confirm whether the task is ready for safe operation preview.";
  }

  return "Review the task evidence before deciding whether a safe operation preview is needed.";
}

function buildSafePreviewAction(input: {
  enabled: boolean;
  targetTaskId: string | null;
  disabledReason?: string;
}): AssistantRecommendationAction {
  return {
    type: "safe_preview",
    label: "Prepare preview",
    enabled: input.enabled,
    requiresManualConfirmation: true,
    targetTaskId: input.targetTaskId,
    disabledReason: input.enabled ? null : (input.disabledReason ?? "Preview is not available.")
  };
}

function mapSeverityToPriority(severity: BacklogTask["severity"]): AssistantRecommendationPriority {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return "high";
  }

  if (severity === "MEDIUM") {
    return "medium";
  }

  return "low";
}

function priorityRank(priority: AssistantRecommendationPriority): number {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

function sourceRank(source: AssistantRecommendation["source"]["type"]): number {
  switch (source) {
    case "backlog_task":
      return 0;
    case "synced_content":
      return 1;
    case "gsc_traffic_loss":
      return 2;
    default:
      return 3;
  }
}
