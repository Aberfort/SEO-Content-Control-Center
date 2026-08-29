import { buildJobId, jobNames, type MonitoringCreateSnapshotJobData } from "@sccc/queue";

/**
 * A monitored URL is rescanned automatically once it has gone this long
 * without a snapshot. Matches the `monitoringScheduleCronPattern` cadence
 * (every 6 hours) in packages/queue/src/contract.ts.
 */
export const monitoringRescanIntervalHours = 6;

export type MonitoringScanCandidate = {
  organizationId: string;
  siteId: string;
  monitoredUrlId: string;
};

export type PlannedMonitoringScanJob = {
  name: string;
  jobId: string;
  data: MonitoringCreateSnapshotJobData;
};

/**
 * Plans one create-snapshot job per candidate. Job ids are bucketed by a
 * window matching the scan cadence so re-running the scheduler within the
 * same window deduplicates instead of stacking up duplicate scans.
 */
export function planMonitoringScanJobs(
  candidates: MonitoringScanCandidate[],
  now: Date = new Date()
): PlannedMonitoringScanJob[] {
  const bucket = scanWindowBucket(now);
  const seen = new Set<string>();
  const jobs: PlannedMonitoringScanJob[] = [];

  for (const candidate of candidates) {
    const scopeKey = candidate.monitoredUrlId;

    if (seen.has(scopeKey)) {
      continue;
    }

    seen.add(scopeKey);

    const data: MonitoringCreateSnapshotJobData = {
      organizationId: candidate.organizationId,
      siteId: candidate.siteId,
      monitoredUrlId: candidate.monitoredUrlId
    };

    jobs.push({
      name: jobNames.monitoringCreateSnapshot,
      jobId: buildJobId(["monitoring-scan", candidate.organizationId, candidate.siteId, candidate.monitoredUrlId, bucket]),
      data
    });
  }

  return jobs;
}

function scanWindowBucket(now: Date): string {
  const day = now.toISOString().slice(0, 10);
  const window = Math.floor(now.getUTCHours() / monitoringRescanIntervalHours);
  return `${day}-${window}`;
}
