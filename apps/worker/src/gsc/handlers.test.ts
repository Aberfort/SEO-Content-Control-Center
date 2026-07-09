import { describe, expect, it } from "vitest";

import {
  createGscDailyMetricsSyncHandler,
  createGscScheduleHandler,
  createGscSearchInsightsSyncHandler,
  type GscSyncDeps
} from "./handlers";
import type { PlannedGscSyncJob } from "./plan";

const tenantData = {
  organizationId: "11111111-1111-4111-8111-111111111111",
  siteId: "22222222-2222-4222-8222-222222222222"
};

function createFakeSyncDeps() {
  const calls = {
    savedMetrics: [] as unknown[],
    replacedInsights: [] as unknown[],
    refreshedTokens: [] as string[]
  };
  const deps: GscSyncDeps = {
    loadConnection: (organizationId, siteId) =>
      Promise.resolve(
        organizationId === tenantData.organizationId && siteId === tenantData.siteId
          ? {
              propertyUrl: "https://example.com/",
              encryptedRefreshToken: "encrypted-token"
            }
          : null
      ),
    decryptSecret: (value) => `decrypted:${value}`,
    refreshAccessToken: (refreshToken) => {
      calls.refreshedTokens.push(refreshToken);
      return Promise.resolve("access-token");
    },
    queryDailyMetrics: () =>
      Promise.resolve([
        { date: "2026-07-01", clicks: 10, impressions: 100, ctr: 0.1, position: 4.2 }
      ]),
    saveDailyMetrics: (input) => {
      calls.savedMetrics.push(input);
      return Promise.resolve();
    },
    queryInsights: () =>
      Promise.resolve([
        {
          page: "https://example.com/post",
          query: "example",
          clicks: 5,
          impressions: 50,
          ctr: 0.1,
          position: 6.5
        }
      ]),
    replaceInsights: (input) => {
      calls.replacedInsights.push(input);
      return Promise.resolve();
    },
    now: () => new Date("2026-07-10T06:00:00.000Z")
  };

  return { deps, calls };
}

describe("gsc daily metrics sync handler", () => {
  it("refreshes the token with a decrypted secret and saves fetched metrics", async () => {
    const { deps, calls } = createFakeSyncDeps();
    const handler = createGscDailyMetricsSyncHandler(deps);

    const result = await handler({
      id: "1",
      name: "gsc.daily-metrics.sync",
      data: tenantData
    });

    expect(result).toMatchObject({
      propertyUrl: "https://example.com/",
      startDate: "2026-06-10",
      endDate: "2026-07-07",
      syncedRows: 1
    });
    expect(calls.refreshedTokens).toEqual(["decrypted:encrypted-token"]);
    expect(calls.savedMetrics[0]).toMatchObject({
      organizationId: tenantData.organizationId,
      siteId: tenantData.siteId,
      propertyUrl: "https://example.com/"
    });
  });

  it("rejects payloads without tenant scope", async () => {
    const { deps } = createFakeSyncDeps();
    const handler = createGscDailyMetricsSyncHandler(deps);

    await expect(
      handler({
        id: "1",
        name: "gsc.daily-metrics.sync",
        data: { siteId: tenantData.siteId }
      })
    ).rejects.toThrow();
  });

  it("fails when the site has no active connection", async () => {
    const { deps } = createFakeSyncDeps();
    const handler = createGscDailyMetricsSyncHandler(deps);

    await expect(
      handler({
        id: "1",
        name: "gsc.daily-metrics.sync",
        data: {
          organizationId: "33333333-3333-4333-8333-333333333333",
          siteId: tenantData.siteId
        }
      })
    ).rejects.toThrow("GSC_CONNECTION_NOT_FOUND");
  });
});

describe("gsc search insights sync handler", () => {
  it("replaces insight snapshots for the synced range", async () => {
    const { deps, calls } = createFakeSyncDeps();
    const handler = createGscSearchInsightsSyncHandler(deps);

    const result = await handler({
      id: "1",
      name: "gsc.search-insights.sync",
      data: tenantData
    });

    expect(result).toMatchObject({ syncedRows: 1 });
    expect(calls.replacedInsights[0]).toMatchObject({
      organizationId: tenantData.organizationId,
      siteId: tenantData.siteId,
      startDate: "2026-06-10",
      endDate: "2026-07-07"
    });
  });
});

describe("gsc schedule handler", () => {
  it("enqueues planned jobs for every active connection", async () => {
    const enqueued: PlannedGscSyncJob[] = [];
    const handler = createGscScheduleHandler({
      listActiveConnections: () =>
        Promise.resolve([
          tenantData,
          {
            organizationId: "33333333-3333-4333-8333-333333333333",
            siteId: "44444444-4444-4444-8444-444444444444"
          }
        ]),
      enqueue: (job) => {
        enqueued.push(job);
        return Promise.resolve();
      },
      now: () => new Date("2026-07-10T06:00:00.000Z")
    });

    const result = await handler({
      id: "1",
      name: "gsc.schedule-sync",
      data: {}
    });

    expect(result).toEqual({ connections: 2, scheduledJobs: 4 });
    expect(new Set(enqueued.map((job) => job.jobId)).size).toBe(4);
  });
});
