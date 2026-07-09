import { buildJobId, jobNames, type GscSyncJobData } from "@sccc/queue";

export type GscSyncConnection = {
  organizationId: string;
  siteId: string;
};

export type PlannedGscSyncJob = {
  name: string;
  jobId: string;
  data: GscSyncJobData;
};

/**
 * Plans one daily-metrics job and one search-insights job per connected site.
 * Job ids include the UTC date so re-running the scheduler on the same day
 * deduplicates instead of enqueueing duplicate work.
 */
export function planGscSyncJobs(
  connections: GscSyncConnection[],
  now: Date = new Date()
): PlannedGscSyncJob[] {
  const day = now.toISOString().slice(0, 10);
  const seen = new Set<string>();
  const jobs: PlannedGscSyncJob[] = [];

  for (const connection of connections) {
    const scopeKey = `${connection.organizationId}:${connection.siteId}`;

    if (seen.has(scopeKey)) {
      continue;
    }

    seen.add(scopeKey);

    const data: GscSyncJobData = {
      organizationId: connection.organizationId,
      siteId: connection.siteId
    };

    jobs.push({
      name: jobNames.gscDailyMetricsSync,
      jobId: buildJobId(["gsc-metrics", connection.organizationId, connection.siteId, day]),
      data
    });
    jobs.push({
      name: jobNames.gscSearchInsightsSync,
      jobId: buildJobId(["gsc-insights", connection.organizationId, connection.siteId, day]),
      data
    });
  }

  return jobs;
}
