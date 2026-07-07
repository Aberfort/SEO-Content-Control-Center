import {
  buildSyncedContentBacklogCandidates,
  buildSyncedContentHealthSignals
} from "./content-health";
import type {
  AuditIssue,
  SyncedContentBacklogCandidate,
  SyncedContentHealthSignal,
  SyncedContentItem
} from "./types";

export type GeneratedAuditIssueInput = {
  issueType: string;
  severity: AuditIssue["severity"];
  affectedUrl: string;
  evidence: {
    source: "synced_content_health";
    contentItemId: string;
    externalId: string;
    signalId: string;
    signalSeverity: SyncedContentHealthSignal["severity"];
    signalMessage: string;
  };
  explanation: string;
  recommendedAction: string;
  potentialImpact: string;
  fingerprint: string;
};

export function buildAuditIssueInputsFromSyncedContent(
  item: SyncedContentItem
): GeneratedAuditIssueInput[] {
  const signals = buildSyncedContentHealthSignals(item);
  const signalsById = new Map(signals.map((signal) => [signal.id, signal]));

  return buildSyncedContentBacklogCandidates(item, signals).map((candidate) =>
    buildGeneratedAuditIssueInput(item, candidate, signalsById.get(candidate.sourceSignalId))
  );
}

function buildGeneratedAuditIssueInput(
  item: SyncedContentItem,
  candidate: SyncedContentBacklogCandidate,
  signal: SyncedContentHealthSignal | undefined
): GeneratedAuditIssueInput {
  return {
    issueType: `synced_content.${candidate.sourceSignalId}`,
    severity: mapCandidatePriorityToAuditSeverity(candidate.priority),
    affectedUrl: item.url,
    evidence: {
      source: "synced_content_health",
      contentItemId: item.id,
      externalId: item.externalId,
      signalId: candidate.sourceSignalId,
      signalSeverity: signal?.severity ?? "warning",
      signalMessage: signal?.message ?? candidate.rationale
    },
    explanation: candidate.rationale,
    recommendedAction: candidate.title,
    potentialImpact: candidate.rationale,
    fingerprint: buildSyncedContentIssueFingerprint(item, candidate.sourceSignalId)
  };
}

function mapCandidatePriorityToAuditSeverity(
  priority: SyncedContentBacklogCandidate["priority"]
): AuditIssue["severity"] {
  if (priority === "high") {
    return "HIGH";
  }

  if (priority === "medium") {
    return "MEDIUM";
  }

  return "LOW";
}

function buildSyncedContentIssueFingerprint(item: SyncedContentItem, signalId: string): string {
  return `synced_content:${item.externalId}:${signalId}`;
}
