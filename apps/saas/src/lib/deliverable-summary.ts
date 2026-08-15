import type { SiteDeliverableSummary } from "@sccc/shared";

import { readSearchImpact } from "./gsc-impact";

type IssueRecord = {
  issueType: string;
  status: string;
  severity: string;
  evidence: unknown;
  createdAt: Date | string;
  updatedAt: Date | string;
};

type TaskRecord = {
  status: string;
  dueDate: Date | string | null;
  updatedAt: Date | string;
  outcomeStatus: string | null;
  outcomeVerifiedAt: Date | string | null;
};

type OperationRecord = {
  status: string;
  updatedAt: Date | string;
};

export function buildSiteDeliverableSummary(input: {
  siteId: string;
  siteName: string;
  siteUrl: string;
  start: Date;
  endExclusive: Date;
  generatedAt: Date;
  issues: IssueRecord[];
  tasks: TaskRecord[];
  operations: OperationRecord[];
}): SiteDeliverableSummary {
  const issuesInPeriod = input.issues.filter((issue) =>
    isInsidePeriod(issue.createdAt, input.start, input.endExclusive)
  );
  const updatedIssues = input.issues.filter((issue) =>
    isInsidePeriod(issue.updatedAt, input.start, input.endExclusive)
  );
  const outcomes: SiteDeliverableSummary["outcomes"] = {
    improved: 0,
    declined: 0,
    stable: 0,
    awaitingFollowup: 0
  };

  for (const issue of updatedIssues) {
    const impact = readSearchImpact(issue.evidence);

    if (!impact) {
      continue;
    }

    if (impact.outcome.status === "awaiting_followup") {
      outcomes.awaitingFollowup += 1;
    } else {
      outcomes[impact.outcome.status] += 1;
    }
  }

  const taskOutcomes: SiteDeliverableSummary["taskOutcomes"] = {
    improved: 0,
    stable: 0,
    declined: 0,
    inconclusive: 0,
    awaitingVerification: 0
  };

  for (const task of input.tasks) {
    if (
      task.outcomeStatus &&
      task.outcomeVerifiedAt &&
      isInsidePeriod(task.outcomeVerifiedAt, input.start, input.endExclusive)
    ) {
      const key = task.outcomeStatus.toLowerCase() as keyof Omit<
        SiteDeliverableSummary["taskOutcomes"],
        "awaitingVerification"
      >;
      if (key in taskOutcomes) taskOutcomes[key] += 1;
    } else if (
      task.status === "DONE" &&
      isInsidePeriod(task.updatedAt, input.start, input.endExclusive)
    ) {
      taskOutcomes.awaitingVerification += 1;
    }
  }

  return {
    siteId: input.siteId,
    siteName: input.siteName,
    siteUrl: input.siteUrl,
    newCriticalFindings: issuesInPeriod.filter((issue) => issue.severity === "CRITICAL").length,
    significantTrafficDrops: issuesInPeriod.filter(
      (issue) => issue.issueType === "gsc.traffic-loss" && issue.severity === "HIGH"
    ).length,
    completedTasks: input.tasks.filter(
      (task) =>
        task.status === "DONE" && isInsidePeriod(task.updatedAt, input.start, input.endExclusive)
    ).length,
    unresolvedRisks: input.issues.filter((issue) => issue.status === "OPEN").length,
    overdueTasks: input.tasks.filter(
      (task) =>
        task.dueDate !== null &&
        new Date(task.dueDate) < input.generatedAt &&
        !["DONE", "IGNORED"].includes(task.status)
    ).length,
    failedOperations: input.operations.filter(
      (operation) =>
        operation.status === "FAILED" &&
        isInsidePeriod(operation.updatedAt, input.start, input.endExclusive)
    ).length,
    outcomes,
    taskOutcomes
  };
}

function isInsidePeriod(value: Date | string, start: Date, endExclusive: Date): boolean {
  const date = new Date(value);
  return date >= start && date < endExclusive;
}
