import { normalizeDateRange, normalizeInsightRowLimit } from "@sccc/gsc";
import { gscSyncJobDataSchema } from "@sccc/queue";

import type { JobHandler } from "../job-handlers";
import { planGscSyncJobs, type GscSyncConnection, type PlannedGscSyncJob } from "./plan";

export type GscConnectionSecret = {
  propertyUrl: string;
  encryptedRefreshToken: string;
};

export type GscSyncDeps = {
  loadConnection(organizationId: string, siteId: string): Promise<GscConnectionSecret | null>;
  decryptSecret(value: string): string;
  refreshAccessToken(refreshToken: string): Promise<string>;
  queryDailyMetrics(input: {
    accessToken: string;
    propertyUrl: string;
    startDate: string;
    endDate: string;
  }): Promise<
    Array<{ date: string; clicks: number; impressions: number; ctr: number; position: number }>
  >;
  saveDailyMetrics(input: {
    organizationId: string;
    siteId: string;
    propertyUrl: string;
    startDate: string;
    endDate: string;
    metrics: Array<{
      date: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;
  }): Promise<void>;
  queryInsights(input: {
    accessToken: string;
    propertyUrl: string;
    startDate: string;
    endDate: string;
    rowLimit: number;
  }): Promise<
    Array<{
      page: string;
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>
  >;
  replaceInsights(input: {
    organizationId: string;
    siteId: string;
    propertyUrl: string;
    startDate: string;
    endDate: string;
    insights: Array<{
      page: string;
      query: string;
      clicks: number;
      impressions: number;
      ctr: number;
      position: number;
    }>;
  }): Promise<void>;
  now?: () => Date;
};

export type GscScheduleDeps = {
  listActiveConnections(): Promise<GscSyncConnection[]>;
  enqueue(job: PlannedGscSyncJob): Promise<void>;
  now?: () => Date;
};

export function createGscDailyMetricsSyncHandler(deps: GscSyncDeps): JobHandler {
  return async (job) => {
    const data = gscSyncJobDataSchema.parse(job.data);
    const connection = await loadConnectionOrFail(deps, data.organizationId, data.siteId);
    const range = normalizeDateRange({ now: deps.now?.() });
    const accessToken = await deps.refreshAccessToken(
      deps.decryptSecret(connection.encryptedRefreshToken)
    );
    const metrics = await deps.queryDailyMetrics({
      accessToken,
      propertyUrl: connection.propertyUrl,
      startDate: range.startDate,
      endDate: range.endDate
    });

    await deps.saveDailyMetrics({
      organizationId: data.organizationId,
      siteId: data.siteId,
      propertyUrl: connection.propertyUrl,
      startDate: range.startDate,
      endDate: range.endDate,
      metrics
    });

    return {
      siteId: data.siteId,
      propertyUrl: connection.propertyUrl,
      startDate: range.startDate,
      endDate: range.endDate,
      syncedRows: metrics.length
    };
  };
}

export function createGscSearchInsightsSyncHandler(deps: GscSyncDeps): JobHandler {
  return async (job) => {
    const data = gscSyncJobDataSchema.parse(job.data);
    const connection = await loadConnectionOrFail(deps, data.organizationId, data.siteId);
    const range = normalizeDateRange({ now: deps.now?.() });
    const rowLimit = normalizeInsightRowLimit(null);
    const accessToken = await deps.refreshAccessToken(
      deps.decryptSecret(connection.encryptedRefreshToken)
    );
    const insights = await deps.queryInsights({
      accessToken,
      propertyUrl: connection.propertyUrl,
      startDate: range.startDate,
      endDate: range.endDate,
      rowLimit
    });

    await deps.replaceInsights({
      organizationId: data.organizationId,
      siteId: data.siteId,
      propertyUrl: connection.propertyUrl,
      startDate: range.startDate,
      endDate: range.endDate,
      insights
    });

    return {
      siteId: data.siteId,
      propertyUrl: connection.propertyUrl,
      startDate: range.startDate,
      endDate: range.endDate,
      syncedRows: insights.length
    };
  };
}

export function createGscScheduleHandler(deps: GscScheduleDeps): JobHandler {
  return async () => {
    const connections = await deps.listActiveConnections();
    const jobs = planGscSyncJobs(connections, deps.now?.() ?? new Date());

    for (const job of jobs) {
      await deps.enqueue(job);
    }

    return {
      connections: connections.length,
      scheduledJobs: jobs.length
    };
  };
}

async function loadConnectionOrFail(
  deps: GscSyncDeps,
  organizationId: string,
  siteId: string
): Promise<GscConnectionSecret> {
  const connection = await deps.loadConnection(organizationId, siteId);

  if (!connection) {
    throw new Error("GSC_CONNECTION_NOT_FOUND");
  }

  return connection;
}
