import os from "node:os";

import {
  createQueueProducer,
  createQueueRedisConnection,
  defaultJobOptions,
  gscScheduleCronPattern,
  gscScheduleJobId,
  jobNames,
  queueNames,
  type QueueName
} from "@sccc/queue";
import { Worker } from "bullmq";

import {
  createBulkOperationExecuteHandler,
  createBulkOperationRollbackHandler
} from "./bulk-operations/handlers";
import {
  buildLiveBulkOperationExecutionDeps,
  buildLiveBulkOperationRollbackDeps,
  isBulkOperationWorkerConfigured
} from "./bulk-operations/live";
import {
  createGscDailyMetricsSyncHandler,
  createGscScheduleHandler,
  createGscSearchInsightsSyncHandler
} from "./gsc/handlers";
import { buildLiveGscScheduleDeps, buildLiveGscSyncDeps, isGscWorkerConfigured } from "./gsc/live";
import {
  buildWorkerHealthSnapshot,
  collectQueueMetrics,
  parseWorkerHealthPort,
  startWorkerHealthServer,
  type QueueMetricsSource
} from "./health";
import { createHeartbeatRecorder, type HeartbeatCounters } from "./heartbeat";
import {
  createJobHandlerRegistry,
  createMaintenancePingHandler,
  type JobHandlerRegistry
} from "./job-handlers";
import { logWorkerEvent, serializeError } from "./logger";
import { buildWorkerObservability } from "./observability";

export type WorkerProcess = {
  workerId: string;
  registry: JobHandlerRegistry;
  gscSyncEnabled: boolean;
  bulkOperationExecutionEnabled: boolean;
  sentryEnabled: boolean;
  analyticsEnabled: boolean;
  healthPort: number | null;
  shutdown(): Promise<void>;
};

type StartWorkerInput = {
  redisUrl: string;
  workerId?: string;
  heartbeatIntervalMs?: number;
  concurrency?: number;
  env?: NodeJS.ProcessEnv;
};

export function buildWorkerId(hostname = os.hostname(), pid = process.pid): string {
  return `${hostname}:${pid}`;
}

export function registerFoundationHandlers(registry: JobHandlerRegistry): void {
  registry.register(jobNames.maintenancePing, createMaintenancePingHandler());
}

export async function startWorker(input: StartWorkerInput): Promise<WorkerProcess> {
  const env = input.env ?? process.env;
  const workerId = input.workerId ?? buildWorkerId();
  const startedAt = new Date();
  const counters: HeartbeatCounters = {
    processedJobs: 0,
    failedJobs: 0
  };

  const registry = createJobHandlerRegistry();
  registerFoundationHandlers(registry);

  const observability = buildWorkerObservability(env);

  if (!observability.sentry.enabled) {
    logWorkerEvent("warn", "worker.sentry_disabled", {
      workerId,
      hint: "Set SENTRY_DSN to report worker job failures to Sentry."
    });
  }

  if (!observability.analytics.enabled) {
    logWorkerEvent("warn", "worker.analytics_disabled", {
      workerId,
      hint: "Set POSTHOG_KEY to capture server analytics events from the worker."
    });
  }

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

  const workers: Worker[] = [];
  const closers: Array<() => Promise<void>> = [];
  const startedQueueNames: QueueName[] = [];

  const createQueueWorker = (queueName: QueueName): Worker => {
    startedQueueNames.push(queueName);
    const queueWorker = new Worker(
      queueName,
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

    queueWorker.on("completed", (job) => {
      counters.processedJobs += 1;
      logWorkerEvent("info", "worker.job_completed", {
        workerId,
        queue: queueName,
        jobId: job.id ?? null,
        jobName: job.name
      });

      if (job.name === jobNames.bulkOperationExecute) {
        const data = job.data as {
          organizationId?: string;
          siteId?: string;
          operationId?: string;
        };

        if (data.organizationId) {
          void observability.analytics.capture({
            event: "bulk_operation_completed",
            distinctId: data.organizationId,
            organizationId: data.organizationId,
            siteId: data.siteId,
            properties: {
              operationId: data.operationId ?? null
            }
          });
        }
      }
    });

    queueWorker.on("failed", (job, error) => {
      counters.failedJobs += 1;
      logWorkerEvent("error", "worker.job_failed", {
        workerId,
        queue: queueName,
        jobId: job?.id ?? null,
        jobName: job?.name ?? null,
        attemptsMade: job?.attemptsMade ?? null,
        reason: serializeError(error)
      });
      void observability.sentry.captureException(error, {
        workerId,
        queue: queueName,
        jobId: job?.id ?? null,
        jobName: job?.name ?? null,
        attemptsMade: job?.attemptsMade ?? null
      });
    });

    queueWorker.on("error", (error) => {
      logWorkerEvent("error", "worker.error", {
        workerId,
        queue: queueName,
        reason: serializeError(error)
      });
    });

    workers.push(queueWorker);
    return queueWorker;
  };

  createQueueWorker(queueNames.maintenance);

  const gscSyncEnabled = isGscWorkerConfigured(env);

  if (gscSyncEnabled) {
    const gscQueue = createQueueProducer(queueNames.gscSync, connection);
    closers.push(() => gscQueue.close());

    const syncDeps = buildLiveGscSyncDeps();
    registry.register(jobNames.gscDailyMetricsSync, createGscDailyMetricsSyncHandler(syncDeps));
    registry.register(jobNames.gscSearchInsightsSync, createGscSearchInsightsSyncHandler(syncDeps));
    registry.register(
      jobNames.gscScheduleSync,
      createGscScheduleHandler(
        buildLiveGscScheduleDeps(async (job) => {
          await gscQueue.add(job.name, job.data, {
            jobId: job.jobId
          });
        })
      )
    );

    createQueueWorker(queueNames.gscSync);

    await gscQueue.add(
      jobNames.gscScheduleSync,
      {},
      {
        jobId: gscScheduleJobId,
        repeat: {
          pattern: gscScheduleCronPattern
        },
        attempts: defaultJobOptions.attempts
      }
    );
  } else {
    logWorkerEvent("warn", "worker.gsc_sync_disabled", {
      workerId,
      hint: "Set DATABASE_URL, SCCC_TOKEN_ENCRYPTION_KEY, SCCC_GSC_CLIENT_ID, and SCCC_GSC_CLIENT_SECRET to enable scheduled GSC sync."
    });
  }

  const bulkOperationExecutionEnabled = isBulkOperationWorkerConfigured(env);

  if (bulkOperationExecutionEnabled) {
    registry.register(
      jobNames.bulkOperationExecute,
      createBulkOperationExecuteHandler(buildLiveBulkOperationExecutionDeps())
    );
    registry.register(
      jobNames.bulkOperationRollback,
      createBulkOperationRollbackHandler(buildLiveBulkOperationRollbackDeps())
    );
    createQueueWorker(queueNames.bulkOperations);
  } else {
    logWorkerEvent("warn", "worker.bulk_operation_execution_disabled", {
      workerId,
      hint: "Set DATABASE_URL and SCCC_TOKEN_ENCRYPTION_KEY to enable bulk operation execution."
    });
  }

  const healthPort = parseWorkerHealthPort(env.SCCC_WORKER_HEALTH_PORT);
  let healthServer: Awaited<ReturnType<typeof startWorkerHealthServer>> | null = null;

  if (healthPort !== null) {
    const metricsQueues = startedQueueNames.map((name) => {
      const queue = createQueueProducer(name, connection);
      closers.push(() => queue.close());
      return queue as unknown as QueueMetricsSource;
    });

    healthServer = await startWorkerHealthServer({
      port: healthPort,
      collectSnapshot: async () =>
        buildWorkerHealthSnapshot({
          workerId,
          startedAt,
          now: new Date(),
          counters,
          queues: await collectQueueMetrics(metricsQueues)
        })
    });

    logWorkerEvent("info", "worker.health_enabled", {
      workerId,
      port: healthServer.port
    });
  } else {
    logWorkerEvent("warn", "worker.health_disabled", {
      workerId,
      hint: "Set SCCC_WORKER_HEALTH_PORT to expose the /healthz endpoint with queue metrics."
    });
  }

  await heartbeat.recordOnce();
  heartbeat.start();

  logWorkerEvent("info", "worker.started", {
    workerId,
    queues: workers.length,
    gscSyncEnabled,
    bulkOperationExecutionEnabled,
    sentryEnabled: observability.sentry.enabled,
    analyticsEnabled: observability.analytics.enabled,
    healthPort: healthServer?.port ?? null,
    handlers: registry.registeredJobNames().join(",")
  });

  return {
    workerId,
    registry,
    gscSyncEnabled,
    bulkOperationExecutionEnabled,
    sentryEnabled: observability.sentry.enabled,
    analyticsEnabled: observability.analytics.enabled,
    healthPort: healthServer?.port ?? null,
    async shutdown() {
      heartbeat.stop();

      if (healthServer) {
        await healthServer.close();
      }

      for (const queueWorker of workers) {
        await queueWorker.close();
      }

      for (const close of closers) {
        await close();
      }

      await connection.quit();
      logWorkerEvent("info", "worker.stopped", {
        workerId,
        processedJobs: counters.processedJobs,
        failedJobs: counters.failedJobs
      });
    }
  };
}
