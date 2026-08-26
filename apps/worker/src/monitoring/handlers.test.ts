import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createMonitoringCreateSnapshotHandler,
  createMonitoringScheduleScanHandler,
  type MonitoringScheduleDeps,
  type MonitoringSnapshotDeps
} from "./handlers";

function createDeps(overrides: Partial<MonitoringSnapshotDeps> = {}): {
  deps: MonitoringSnapshotDeps;
  calls: { savedSnapshots: unknown[]; savedEvents: unknown[]; savedRegressions: unknown[] };
} {
  const calls = {
    savedSnapshots: [] as unknown[],
    savedEvents: [] as unknown[],
    savedRegressions: [] as unknown[]
  };
  const deps: MonitoringSnapshotDeps = {
    async loadMonitoredUrl() {
      return { id: "url-1", url: "https://example.com/page/", isActive: true };
    },
    async getLatestSnapshot() {
      return null;
    },
    async crawl() {
      return {
        finalUrl: "https://example.com/page/",
        httpStatus: 200,
        responseTimeMs: 250,
        xRobotsTag: null,
        html: "<html><head><title>Hello</title></head><body>Hi</body></html>"
      };
    },
    extract() {
      return {
        title: "Hello",
        metaDescription: null,
        h1: null,
        canonical: "https://example.com/page/",
        metaRobots: "index,follow",
        hasStructuredData: false,
        hasGa4: true,
        hasGtm: true,
        contentHash: "hash-1",
        htmlHash: "html-1"
      };
    },
    async saveSnapshot(input) {
      calls.savedSnapshots.push(input);
    },
    async saveEvents(input) {
      calls.savedEvents.push(input);
      return input.events.map((event) => ({
        id: randomUUID(),
        type: event.type,
        severity: event.severity,
        title: event.title,
        occurredAt: "2026-08-26T12:00:00.000Z"
      }));
    },
    async getSiteTrafficSignal() {
      return null;
    },
    async getRecentWordPressEvents() {
      return [];
    },
    async saveRegressions(input) {
      calls.savedRegressions.push(input);
      return input.candidates.length;
    },
    ...overrides
  };

  return { deps, calls };
}

const jobData = {
  organizationId: "00000000-0000-4000-8000-000000000001",
  siteId: "00000000-0000-4000-8000-000000000002",
  monitoredUrlId: "00000000-0000-4000-8000-000000000003"
};

describe("createMonitoringCreateSnapshotHandler", () => {
  it("saves a baseline snapshot and produces no events when there is no previous snapshot", async () => {
    const { deps, calls } = createDeps();
    const handler = createMonitoringCreateSnapshotHandler(deps);

    const result = await handler({ id: "job-1", name: "monitoring.create-snapshot", data: jobData });

    expect(result).toEqual({ isBaseline: true, eventCount: 0, regressionCount: 0 });
    expect(calls.savedSnapshots).toHaveLength(1);
    expect(calls.savedSnapshots[0]).toMatchObject({ isBaseline: true, monitoredUrlId: jobData.monitoredUrlId });
    expect(calls.savedEvents).toHaveLength(0);
    expect(calls.savedRegressions).toHaveLength(0);
  });

  it("diffs against the previous snapshot and saves detected events", async () => {
    const { deps, calls } = createDeps({
      async getLatestSnapshot() {
        return {
          httpStatus: 200,
          finalUrl: "https://example.com/page/",
          responseTimeMs: 250,
          title: "Old title",
          metaDescription: null,
          h1: null,
          canonical: "https://example.com/page/",
          metaRobots: "index,follow",
          xRobotsTag: null,
          hasStructuredData: false,
          hasGa4: true,
          hasGtm: true,
          contentHash: "hash-0",
          htmlHash: "html-0"
        };
      }
    });
    const handler = createMonitoringCreateSnapshotHandler(deps);

    const result = await handler({ id: "job-2", name: "monitoring.create-snapshot", data: jobData });

    expect(result).toEqual({ isBaseline: false, eventCount: 2, regressionCount: 0 });
    expect(calls.savedSnapshots[0]).toMatchObject({ isBaseline: false });
    expect(calls.savedEvents).toHaveLength(1);
    const savedEventsCall = calls.savedEvents[0] as { events: Array<{ type: string }> };
    expect(savedEventsCall.events.map((event) => event.type).sort()).toEqual([
      "content_changed",
      "title_changed"
    ]);
    // Neither title_changed nor content_changed matches a regression rule, so
    // no candidates are generated and saveRegressions is never called.
    expect(calls.savedRegressions).toHaveLength(0);
  });

  it("runs the regression engine on persisted events and saves any candidates", async () => {
    const { deps, calls } = createDeps({
      async getLatestSnapshot() {
        return {
          httpStatus: 200,
          finalUrl: "https://example.com/page/",
          responseTimeMs: 250,
          title: "Hello",
          metaDescription: null,
          h1: null,
          canonical: "https://example.com/page/",
          metaRobots: "index,follow",
          xRobotsTag: null,
          hasStructuredData: false,
          hasGa4: true,
          hasGtm: true,
          contentHash: "hash-1",
          htmlHash: "html-0"
        };
      },
      async crawl() {
        return {
          finalUrl: "https://example.com/page/",
          httpStatus: 404,
          responseTimeMs: 250,
          xRobotsTag: null,
          html: "<html><head><title>Hello</title></head><body>Hi</body></html>"
        };
      }
    });
    const handler = createMonitoringCreateSnapshotHandler(deps);

    const result = await handler({ id: "job-6", name: "monitoring.create-snapshot", data: jobData });

    expect(result).toEqual({ isBaseline: false, eventCount: 1, regressionCount: 1 });
    expect(calls.savedRegressions).toHaveLength(1);
    const regressionCall = calls.savedRegressions[0] as {
      monitoredUrlId: string;
      candidates: Array<{ title: string }>;
    };
    expect(regressionCall.monitoredUrlId).toBe(jobData.monitoredUrlId);
    expect(regressionCall.candidates[0]?.title).toBe("Page started returning HTTP 404");
  });

  it("links a recent WordPress plugin update to a newly detected regression", async () => {
    const { deps, calls } = createDeps({
      async getLatestSnapshot() {
        return {
          httpStatus: 200,
          finalUrl: "https://example.com/page/",
          responseTimeMs: 250,
          title: "Hello",
          metaDescription: null,
          h1: null,
          canonical: "https://example.com/page/",
          metaRobots: "index,follow",
          xRobotsTag: null,
          hasStructuredData: false,
          hasGa4: true,
          hasGtm: true,
          contentHash: "hash-1",
          htmlHash: "html-0"
        };
      },
      async crawl() {
        return {
          finalUrl: "https://example.com/page/",
          httpStatus: 200,
          responseTimeMs: 250,
          xRobotsTag: null,
          html: '<html><head><title>Hello</title><link rel="canonical" href="https://example.com/other/"></head><body>Hi</body></html>'
        };
      },
      extract() {
        return {
          title: "Hello",
          metaDescription: null,
          h1: null,
          canonical: "https://example.com/other/",
          metaRobots: "index,follow",
          hasStructuredData: false,
          hasGa4: true,
          hasGtm: true,
          contentHash: "hash-1",
          htmlHash: "html-1"
        };
      },
      async getRecentWordPressEvents() {
        return [
          {
            id: "wp-evt-1",
            type: "plugin_updated",
            severity: "INFO",
            title: "Yoast SEO updated from 25.1 to 25.2",
            occurredAt: "2026-08-24T08:00:00.000Z"
          }
        ];
      }
    });
    const handler = createMonitoringCreateSnapshotHandler(deps);

    const result = await handler({ id: "job-11", name: "monitoring.create-snapshot", data: jobData });

    expect(result).toEqual({ isBaseline: false, eventCount: 1, regressionCount: 1 });
    const regressionCall = calls.savedRegressions[0] as {
      candidates: Array<{ fingerprint: string; eventIds: string[] }>;
    };
    expect(
      regressionCall.candidates.some((candidate) => candidate.fingerprint.includes("wordpress_change"))
    ).toBe(true);
  });

  it("does not call the traffic signal or regression save when no events were detected", async () => {
    let trafficSignalCalls = 0;
    const { deps, calls } = createDeps({
      async getSiteTrafficSignal() {
        trafficSignalCalls += 1;
        return null;
      }
    });
    const handler = createMonitoringCreateSnapshotHandler(deps);

    await handler({ id: "job-7", name: "monitoring.create-snapshot", data: jobData });

    expect(trafficSignalCalls).toBe(0);
    expect(calls.savedRegressions).toHaveLength(0);
  });

  it("throws when the monitored URL cannot be found", async () => {
    const { deps } = createDeps({
      async loadMonitoredUrl() {
        return null;
      }
    });
    const handler = createMonitoringCreateSnapshotHandler(deps);

    await expect(
      handler({ id: "job-3", name: "monitoring.create-snapshot", data: jobData })
    ).rejects.toThrow("MONITORED_URL_NOT_FOUND");
  });

  it("throws when the monitored URL has been deactivated", async () => {
    const { deps } = createDeps({
      async loadMonitoredUrl() {
        return { id: "url-1", url: "https://example.com/page/", isActive: false };
      }
    });
    const handler = createMonitoringCreateSnapshotHandler(deps);

    await expect(
      handler({ id: "job-4", name: "monitoring.create-snapshot", data: jobData })
    ).rejects.toThrow("MONITORED_URL_INACTIVE");
  });

  it("rejects a job payload missing tenant scope", async () => {
    const { deps } = createDeps();
    const handler = createMonitoringCreateSnapshotHandler(deps);

    await expect(
      handler({ id: "job-5", name: "monitoring.create-snapshot", data: { siteId: jobData.siteId } })
    ).rejects.toThrow();
  });
});

describe("createMonitoringScheduleScanHandler", () => {
  function createScheduleDeps(
    overrides: Partial<MonitoringScheduleDeps> = {}
  ): { deps: MonitoringScheduleDeps; enqueued: unknown[] } {
    const enqueued: unknown[] = [];
    const deps: MonitoringScheduleDeps = {
      async listMonitoredUrlsDueForScan() {
        return [];
      },
      async enqueue(job) {
        enqueued.push(job);
      },
      ...overrides
    };

    return { deps, enqueued };
  }

  it("enqueues a scan job for every candidate due for a rescan", async () => {
    const { deps, enqueued } = createScheduleDeps({
      async listMonitoredUrlsDueForScan() {
        return [
          { organizationId: jobData.organizationId, siteId: jobData.siteId, monitoredUrlId: jobData.monitoredUrlId }
        ];
      }
    });
    const handler = createMonitoringScheduleScanHandler(deps);

    const result = await handler({ id: "job-8", name: "monitoring.schedule-scan", data: {} });

    expect(result).toEqual({ candidates: 1, scheduledJobs: 1 });
    expect(enqueued).toHaveLength(1);
    expect(enqueued[0]).toMatchObject({
      name: "monitoring.create-snapshot",
      data: jobData
    });
  });

  it("passes a cutoff that reflects the rescan interval", async () => {
    const now = new Date("2026-08-26T18:00:00.000Z");
    let receivedCutoff: Date | undefined;
    const { deps } = createScheduleDeps({
      now: () => now,
      async listMonitoredUrlsDueForScan(cutoff) {
        receivedCutoff = cutoff;
        return [];
      }
    });
    const handler = createMonitoringScheduleScanHandler(deps);

    await handler({ id: "job-9", name: "monitoring.schedule-scan", data: {} });

    expect(receivedCutoff?.toISOString()).toBe("2026-08-26T12:00:00.000Z");
  });

  it("does nothing when no monitored URLs are due for a scan", async () => {
    const { deps, enqueued } = createScheduleDeps();
    const handler = createMonitoringScheduleScanHandler(deps);

    const result = await handler({ id: "job-10", name: "monitoring.schedule-scan", data: {} });

    expect(result).toEqual({ candidates: 0, scheduledJobs: 0 });
    expect(enqueued).toHaveLength(0);
  });
});
