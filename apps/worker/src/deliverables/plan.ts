import { buildJobId, jobNames, type WorkspaceWeeklyDigestJobData } from "@sccc/queue";

export type PlannedWorkspaceDigestJob = {
  name: typeof jobNames.workspaceWeeklyDigest;
  data: WorkspaceWeeklyDigestJobData;
  jobId: string;
};

export function planWorkspaceDigestJobs(
  organizationIds: string[],
  referenceDate: Date
): PlannedWorkspaceDigestJob[] {
  const end = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate() - 1
    )
  );
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);

  return [...new Set(organizationIds)].sort().map((organizationId) => ({
    name: jobNames.workspaceWeeklyDigest,
    data: { organizationId, startDate, endDate },
    jobId: buildJobId(["weekly-digest", organizationId, startDate, endDate])
  }));
}
