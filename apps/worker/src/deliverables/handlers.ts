import { workspaceWeeklyDigestJobDataSchema } from "@sccc/queue";

import type { JobHandler } from "../job-handlers";
import { planWorkspaceDigestJobs, type PlannedWorkspaceDigestJob } from "./plan";

export type DeliverablesScheduleDeps = {
  listOrganizationIds(): Promise<string[]>;
  enqueue(job: PlannedWorkspaceDigestJob): Promise<void>;
  now?: () => Date;
};

export type WorkspaceDigestDeps = {
  run(input: { organizationId: string; startDate: string; endDate: string }): Promise<unknown>;
};

export function createDeliverablesScheduleHandler(deps: DeliverablesScheduleDeps): JobHandler {
  return async () => {
    const organizationIds = await deps.listOrganizationIds();
    const jobs = planWorkspaceDigestJobs(organizationIds, deps.now?.() ?? new Date());

    for (const job of jobs) await deps.enqueue(job);

    return { organizations: organizationIds.length, scheduledJobs: jobs.length };
  };
}

export function createWorkspaceWeeklyDigestHandler(deps: WorkspaceDigestDeps): JobHandler {
  return async (job) => deps.run(workspaceWeeklyDigestJobDataSchema.parse(job.data));
}
