import { buildSyncedContentBacklogCandidates } from "./content-health";
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
  return source === "backlog_task" ? 0 : 1;
}
