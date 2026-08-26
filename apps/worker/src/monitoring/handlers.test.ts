import { describe, expect, it } from "vitest";

import { createMonitoringCreateSnapshotHandler, type MonitoringSnapshotDeps } from "./handlers";

function createDeps(overrides: Partial<MonitoringSnapshotDeps> = {}): {
  deps: MonitoringSnapshotDeps;
  calls: { savedSnapshots: unknown[]; savedEvents: unknown[] };
} {
  const calls = { savedSnapshots: [] as unknown[], savedEvents: [] as unknown[] };
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

    expect(result).toEqual({ isBaseline: true, eventCount: 0 });
    expect(calls.savedSnapshots).toHaveLength(1);
    expect(calls.savedSnapshots[0]).toMatchObject({ isBaseline: true, monitoredUrlId: jobData.monitoredUrlId });
    expect(calls.savedEvents).toHaveLength(0);
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

    expect(result).toEqual({ isBaseline: false, eventCount: 2 });
    expect(calls.savedSnapshots[0]).toMatchObject({ isBaseline: false });
    expect(calls.savedEvents).toHaveLength(1);
    const savedEventsCall = calls.savedEvents[0] as { events: Array<{ type: string }> };
    expect(savedEventsCall.events.map((event) => event.type).sort()).toEqual([
      "content_changed",
      "title_changed"
    ]);
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
