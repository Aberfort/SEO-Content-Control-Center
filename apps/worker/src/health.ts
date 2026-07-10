import http from "node:http";

export type QueueJobCounts = {
  waiting: number;
  active: number;
  delayed: number;
  failed: number;
  completed: number;
};

export type QueueMetrics = {
  name: string;
  counts: QueueJobCounts;
  oldestWaitingMs: number | null;
};

export type WorkerHealthSnapshot = {
  status: "ok";
  workerId: string;
  startedAt: string;
  uptimeSeconds: number;
  processedJobs: number;
  failedJobs: number;
  queues: QueueMetrics[];
};

export type QueueMetricsSource = {
  name: string;
  getJobCounts(...types: string[]): Promise<Record<string, number>>;
  getJobs(
    types: string[],
    start: number,
    end: number,
    asc: boolean
  ): Promise<Array<{ timestamp?: number } | null | undefined>>;
};

export function computeOldestWaitingMs(
  oldestTimestamp: number | null | undefined,
  now: Date
): number | null {
  if (typeof oldestTimestamp !== "number" || !Number.isFinite(oldestTimestamp)) {
    return null;
  }

  return Math.max(0, now.getTime() - oldestTimestamp);
}

/**
 * Reads BullMQ job counts plus the age of the oldest waiting job (queue lag)
 * for each active queue. Metrics collection is read-only and never mutates
 * queue state.
 */
export async function collectQueueMetrics(
  queues: QueueMetricsSource[],
  now = new Date()
): Promise<QueueMetrics[]> {
  const metrics: QueueMetrics[] = [];

  for (const queue of queues) {
    const counts = await queue.getJobCounts("waiting", "active", "delayed", "failed", "completed");
    const oldestWaiting = (await queue.getJobs(["waiting"], 0, 0, true))[0];

    metrics.push({
      name: queue.name,
      counts: {
        waiting: counts.waiting ?? 0,
        active: counts.active ?? 0,
        delayed: counts.delayed ?? 0,
        failed: counts.failed ?? 0,
        completed: counts.completed ?? 0
      },
      oldestWaitingMs: computeOldestWaitingMs(oldestWaiting?.timestamp ?? null, now)
    });
  }

  return metrics;
}

export function buildWorkerHealthSnapshot(input: {
  workerId: string;
  startedAt: Date;
  now: Date;
  counters: { processedJobs: number; failedJobs: number };
  queues: QueueMetrics[];
}): WorkerHealthSnapshot {
  return {
    status: "ok",
    workerId: input.workerId,
    startedAt: input.startedAt.toISOString(),
    uptimeSeconds: Math.max(
      0,
      Math.floor((input.now.getTime() - input.startedAt.getTime()) / 1000)
    ),
    processedJobs: input.counters.processedJobs,
    failedJobs: input.counters.failedJobs,
    queues: input.queues
  };
}

export function parseWorkerHealthPort(value: string | undefined): number | null {
  const parsed = Number.parseInt(value?.trim() ?? "", 10);

  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    return null;
  }

  return parsed;
}

export type WorkerHealthServer = {
  port: number;
  close(): Promise<void>;
};

/**
 * Starts the read-only worker health endpoint. `GET /healthz` returns the
 * current snapshot with queue counters and lag; snapshot failures return 503
 * instead of crashing the worker.
 */
export function startWorkerHealthServer(input: {
  port: number;
  collectSnapshot: () => Promise<WorkerHealthSnapshot>;
}): Promise<WorkerHealthServer> {
  const server = http.createServer((request, response) => {
    if (request.method !== "GET" || request.url?.split("?")[0] !== "/healthz") {
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ status: "not_found" }));
      return;
    }

    void input
      .collectSnapshot()
      .then((snapshot) => {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify(snapshot));
      })
      .catch(() => {
        response.writeHead(503, { "content-type": "application/json" });
        response.end(JSON.stringify({ status: "unavailable" }));
      });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(input.port, () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : input.port;

      resolve({
        port,
        close: () =>
          new Promise((closeResolve, closeReject) => {
            server.close((error) => (error ? closeReject(error) : closeResolve()));
          })
      });
    });
  });
}
