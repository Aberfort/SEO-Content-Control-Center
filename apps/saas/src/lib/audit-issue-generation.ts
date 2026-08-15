import {
  buildSyncedContentBacklogCandidates,
  buildSyncedContentHealthSignals
} from "./content-health";
import type {
  AuditIssue,
  SyncedContentBacklogCandidate,
  SyncedContentHealthSignal,
  SyncedContentItem,
  SyncedLocalFinding
} from "./types";

type GeneratedAuditIssueEvidence =
  | {
      source: "synced_content_health";
      contentItemId: string;
      externalId: string;
      signalId: string;
      signalSeverity: SyncedContentHealthSignal["severity"];
      signalMessage: string;
    }
  | {
      source: "wordpress_local_audit";
      contentItemId: string;
      externalId: string;
      findingCode: SyncedLocalFinding["code"];
      findingSeverity: SyncedLocalFinding["severity"];
      findingEvidence: string;
      localFingerprint: string;
    };

export type GeneratedAuditIssueInput = {
  issueType: string;
  severity: AuditIssue["severity"];
  affectedUrl: string;
  evidence: GeneratedAuditIssueEvidence;
  explanation: string;
  recommendedAction: string;
  potentialImpact: string;
  fingerprint: string;
};

export function buildAuditIssueInputsFromSyncedContent(
  item: SyncedContentItem,
  referenceDate = new Date()
): GeneratedAuditIssueInput[] {
  const signals = buildSyncedContentHealthSignals(item, referenceDate);
  const signalsById = new Map(signals.map((signal) => [signal.id, signal]));
  const issues = new Map(
    buildSyncedContentBacklogCandidates(item, signals).map((candidate) => {
      const issue = buildGeneratedAuditIssueInput(
        item,
        candidate,
        signalsById.get(candidate.sourceSignalId)
      );

      return [issue.fingerprint, issue] as const;
    })
  );

  for (const finding of item.metadata.localFindings ?? []) {
    const issue = buildLocalAuditIssueInput(item, finding);
    issues.set(issue.fingerprint, issue);
  }

  return [...issues.values()];
}

const localFindingSignalIds: Record<SyncedLocalFinding["code"], string> = {
  "published-noindex": "robots-noindex",
  "seo-title-missing": "seo-title-missing",
  "meta-description-missing": "meta-description-missing",
  "canonical-different": "canonical-different",
  "thin-content": "thin-content",
  "internal-links-missing": "internal-links-missing",
  "orphan-content": "orphan-content",
  "weakly-linked-content": "weakly-linked-content",
  "content-stale": "content-stale"
};

const localFindingActions: Record<SyncedLocalFinding["code"], string> = {
  "published-noindex": "Review and remove the unintended noindex directive",
  "seo-title-missing": "Add a specific SEO title",
  "meta-description-missing": "Add a useful meta description",
  "canonical-different": "Review the canonical target",
  "thin-content": "Review whether the page needs more useful content",
  "internal-links-missing": "Add relevant internal links from this page",
  "orphan-content": "Add relevant inbound internal links to this page",
  "weakly-linked-content": "Strengthen inbound internal linking to this page",
  "content-stale": "Review the page for freshness and accuracy"
};

function buildLocalAuditIssueInput(
  item: SyncedContentItem,
  finding: SyncedLocalFinding
): GeneratedAuditIssueInput {
  const signalId = localFindingSignalIds[finding.code];
  const sharedSignal = !["orphan-content", "weakly-linked-content"].includes(finding.code);

  return {
    issueType: sharedSignal ? `synced_content.${signalId}` : `local_audit.${signalId}`,
    severity: mapLocalFindingSeverity(finding.severity),
    affectedUrl: item.url,
    evidence: {
      source: "wordpress_local_audit",
      contentItemId: item.id,
      externalId: item.externalId,
      findingCode: finding.code,
      findingSeverity: finding.severity,
      findingEvidence: finding.evidence,
      localFingerprint: finding.fingerprint
    },
    explanation: finding.evidence,
    recommendedAction: localFindingActions[finding.code],
    potentialImpact: `WordPress local audit: ${finding.label}`,
    fingerprint: sharedSignal
      ? buildSyncedContentIssueFingerprint(item, signalId)
      : `local_audit:${item.externalId}:${signalId}`
  };
}

function mapLocalFindingSeverity(severity: SyncedLocalFinding["severity"]): AuditIssue["severity"] {
  if (severity === "critical") {
    return "CRITICAL";
  }

  if (severity === "maintenance") {
    return "LOW";
  }

  return "MEDIUM";
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
