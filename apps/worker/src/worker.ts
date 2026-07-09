import os from "node:os";

import { createQueueRedisConnection, jobNames, queueNames } from "@sccc/queue";
import { Worker } from "bullmq";

import { createHeartbeatRecorder, type HeartbeatCounters } from "./heartbeat";
import {
  createJobHandlerRegistry,
  createMaintenancePingHandler,
  type JobHandlerRegistry
} from "./job-handlers";
import { logWorkerEvent, serializeError } from "./logger";

export type WorkerProcess = {
  workerId: string;
  registry: JobHandlerRegistry;
  shutdown(): Promise<void>;
};

type StartWorkerInput = {
  redisUrl: string;
  workerId?: string;
  heartbeatIntervalMs?: number;
  concurrency?: number;
};

export function buildWorkerId(hostname = os.hostname(), pid = process.pid): string {
  return `${hostname}:${pid}`;
}

/**
 * Registers the handlers processed by the worker foundation. Future
 * iterations extend this registry with GSC sync and bulk operation handlers.
 */
export function registerFoundationHandlers(registry: JobHandlerRegistry): void {
  registry.register(jobNames.maintenancePing, createMaintenancePingHandler());
}

export async function startWorker(input: StartWorkerInput): Promise<WorkerProcess> {
  const workerId = input.workerId ?? buildWorkerId();
  const startedAt = new Date();
  const counters: HeartbeatCounters = {
    processedJobs: 0,
    failedJobs: 0
  };

  const registry = createJobHandlerRegistry();
  registerFoundationHandlers(registry);

  const connection = createQueueRedisConnection(input.redisUrl);
  const heartbeat = createHeartbeatRecorder({
    redis: connection,
    workerId,
    startedAt,
    counters,
    intervalMs: input.heartbeatIntervalMs,
    onError: (error) => {
      logWorkerEvent("warn", "worker.heartbeat_failed", {
        workerId,
        reason: serializeError(error)
      });
    }
  });

  const worker = new Worker(
    queueNames.maintenance,
    async (job) => {
      const handler = registry.resolve(job.name);

      return handler({
        id: job.id,
        name: job.name,
        data: job.data as unknown
      });
    },
    {
      connection,
      concurrency: input.concurrency ?? 5
    }
  );

  worker.on("completed", (job) => {
    counters.processedJobs += 1;
    logWorkerEvent("info", "worker.job_completed", {
      workerId,
      queue: queueNames.maintenance,
      jobId: job.id ?? null,
      jobName: job.name
    });
  });

  worker.on("failed", (job, error) => {
    counters.failedJobs += 1;
    logWorkerEvent("error", "worker.job_failed", {
      workerId,
      queue: queueNames.maintenance,
      jobId: job?.id ?? null,
      jobName: job?.name ?? null,
      attemptsMade: job?.attemptsMade ?? null,
      reason: serializeError(error)
    });
  });

  worker.on("error", (error) => {
    logWorkerEvent("error", "worker.error", {
      workerId,
      reason: serializeError(error)
    });
  });

  await heartbeat.recordOnce();
  heartbeat.start();

  logWorkerEvent("info", "worker.started", {
    workerId,
    queue: queueNames.maintenance,
    handlers: registry.registeredJobNames().join(",")
  });

  return {
    workerId,
    registry,
    async shutdown() {
      heartbeat.stop();
      await worker.close();
      await connection.quit();
      logWorkerEvent("info", "worker.stopped", {
        workerId,
        processedJobs: counters.processedJobs,
        failedJobs: counters.failedJobs
      });
    }
  };
}
