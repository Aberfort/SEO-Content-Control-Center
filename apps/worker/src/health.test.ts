import { describe, expect, it } from "vitest";

import {
  buildWorkerHealthSnapshot,
  collectQueueMetrics,
  computeOldestWaitingMs,
  parseWorkerHealthPort,
  startWorkerHealthServer,
  type QueueMetricsSource
} from "./health";

const now = new Date("2026-07-10T00:00:10.000Z");

function queueSource(input: {
  name: string;
  counts?: Record<string, number>;
  oldestTimestamp?: number | null;
}): QueueMetricsSource {
  return {
    name: input.name,
    getJobCounts: async () => input.counts ?? {},
    getJobs: async () =>
      input.oldestTimestamp == null ? [] : [{ timestamp: input.oldestTimestamp }]
  };
}

describe("computeOldestWaitingMs", () => {
  it("returns the age of the oldest waiting job", () => {
    expect(computeOldestWaitingMs(now.getTime() - 2500, now)).toBe(2500);
  });

  it("never returns negative lag and handles missing timestamps", () => {
    expect(computeOldestWaitingMs(now.getTime() + 1000, now)).toBe(0);
    expect(computeOldestWaitingMs(null, now)).toBeNull();
    expect(computeOldestWaitingMs(Number.NaN, now)).toBeNull();
  });
});

describe("parseWorkerHealthPort", () => {
  it("parses valid ports and rejects everything else", () => {
    expect(parseWorkerHealthPort("8081")).toBe(8081);
    expect(parseWorkerHealthPort("0")).toBe(0);
    expect(parseWorkerHealthPort(undefined)).toBeNull();
    expect(parseWorkerHealthPort("")).toBeNull();
    expect(parseWorkerHealthPort("not-a-port")).toBeNull();
    expect(parseWorkerHealthPort("70000")).toBeNull();
    expect(parseWorkerHealthPort("-1")).toBeNull();
  });
});

describe("collectQueueMetrics", () => {
  it("collects counts and waiting lag per queue", async () => {
    const metrics = await collectQueueMetrics(
      [
        queueSource({
          name: "sccc-maintenance",
          counts: { waiting: 2, active: 1, delayed: 0, failed: 3, completed: 40 },
          oldestTimestamp: now.getTime() - 5000
        }),
        queueSource({ name: "sccc-bulk-operations" })
      ],
      now
    );

    expect(metrics).toEqual([
      {
        name: "sccc-maintenance",
        counts: { waiting: 2, active: 1, delayed: 0, failed: 3, completed: 40 },
        oldestWaitingMs: 5000
      },
      {
        name: "sccc-bulk-operations",
        counts: { waiting: 0, active: 0, delayed: 0, failed: 0, completed: 0 },
        oldestWaitingMs: null
      }
    ]);
  });
});

describe("buildWorkerHealthSnapshot", () => {
  it("builds the snapshot with uptime and counters", () => {
    const snapshot = buildWorkerHealthSnapshot({
      workerId: "host:1",
      startedAt: new Date("2026-07-10T00:00:00.000Z"),
      now,
      counters: { processedJobs: 12, failedJobs: 2 },
      queues: []
    });

    expect(snapshot).toEqual({
      status: "ok",
      workerId: "host:1",
      startedAt: "2026-07-10T00:00:00.000Z",
      uptimeSeconds: 10,
      processedJobs: 12,
      failedJobs: 2,
      queues: []
    });
  });
});

describe("startWorkerHealthServer", () => {
  it("serves the snapshot on /healthz and 404s elsewhere", async () => {
    const server = await startWorkerHealthServer({
      port: 0,
      collectSnapshot: async () =>
        buildWorkerHealthSnapshot({
          workerId: "host:1",
          startedAt: new Date("2026-07-10T00:00:00.000Z"),
          now,
          counters: { processedJobs: 1, failedJobs: 0 },
          queues: await collectQueueMetrics(
            [queueSource({ name: "sccc-maintenance", counts: { waiting: 1 } })],
            now
          )
        })
    });

    try {
      const healthResponse = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(healthResponse.status).toBe(200);
      const body = (await healthResponse.json()) as { status: string; queues: unknown[] };
      expect(body.status).toBe("ok");
      expect(body.queues).toHaveLength(1);

      const missingResponse = await fetch(`http://127.0.0.1:${server.port}/other`);
      expect(missingResponse.status).toBe(404);
    } finally {
      await server.close();
    }
  });

  it("returns 503 when the snapshot cannot be collected", async () => {
    const server = await startWorkerHealthServer({
      port: 0,
      collectSnapshot: async () => {
        throw new Error("redis unavailable");
      }
    });

    try {
      const response = await fetch(`http://127.0.0.1:${server.port}/healthz`);
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ status: "unavailable" });
    } finally {
      await server.close();
    }
  });
});
