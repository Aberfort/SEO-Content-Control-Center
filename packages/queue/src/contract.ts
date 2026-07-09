import { z } from "zod";

/**
 * Queue names shared by the SaaS producer side and the worker consumer side.
 *
 * Only the maintenance queue is processed by the worker foundation. The other
 * queue names are reserved contracts for scheduled GSC sync jobs and bulk
 * operation execution so producers and consumers agree on naming before those
 * iterations land.
 */
export const queueNames = {
  maintenance: "sccc-maintenance",
  gscSync: "sccc-gsc-sync",
  bulkOperations: "sccc-bulk-operations",
  pluginSync: "sccc-plugin-sync"
} as const;

export type QueueName = (typeof queueNames)[keyof typeof queueNames];

export const jobNames = {
  maintenancePing: "maintenance.ping",
  gscDailyMetricsSync: "gsc.daily-metrics.sync",
  gscSearchInsightsSync: "gsc.search-insights.sync",
  bulkOperationExecute: "bulk-operation.execute",
  bulkOperationRollback: "bulk-operation.rollback"
} as const;

export type JobName = (typeof jobNames)[keyof typeof jobNames];

/**
 * Every tenant-scoped job payload must carry organization and site context.
 */
export const tenantJobDataSchema = z
  .object({
    organizationId: z.string().uuid(),
    siteId: z.string().uuid()
  })
  .passthrough();

export type TenantJobData = z.infer<typeof tenantJobDataSchema>;

export const maintenancePingJobDataSchema = z
  .object({
    requestedBy: z.string().trim().min(1).max(128).default("manual"),
    echo: z.string().trim().max(256).optional()
  })
  .strict();

export type MaintenancePingJobData = z.infer<typeof maintenancePingJobDataSchema>;

/**
 * Default retry strategy for queued jobs. Failed jobs stay in the failed set
 * after the final attempt, which acts as the dead-letter inspection surface
 * until a dedicated dead-letter flow ships.
 */
export const defaultJobOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5000
  },
  removeOnComplete: 1000,
  removeOnFail: 5000
} as const;

/**
 * Builds a deterministic job id so repeated enqueues of the same logical work
 * (same tenant, same job, same window) deduplicate instead of stacking up.
 */
export function buildJobId(parts: Array<string | number>): string {
  if (parts.length === 0) {
    throw new Error("JOB_ID_PARTS_REQUIRED");
  }

  return parts
    .map((part) => {
      const normalized = String(part).trim().toLowerCase();

      if (!normalized) {
        throw new Error("JOB_ID_PART_EMPTY");
      }

      return normalized.replaceAll(/[^a-z0-9._-]+/g, "-");
    })
    .join(":");
}

export const workerHeartbeatTtlSeconds = 90;

const workerHeartbeatKeyPrefix = "sccc:worker:heartbeat:";

export function buildWorkerHeartbeatKey(workerId: string): string {
  const normalized = workerId.trim();

  if (!normalized) {
    throw new Error("WORKER_ID_REQUIRED");
  }

  return `${workerHeartbeatKeyPrefix}${normalized}`;
}

export const workerHeartbeatSchema = z
  .object({
    workerId: z.string().min(1),
    startedAt: z.string().datetime(),
    recordedAt: z.string().datetime(),
    processedJobs: z.number().int().nonnegative(),
    failedJobs: z.number().int().nonnegative()
  })
  .strict();

export type WorkerHeartbeat = z.infer<typeof workerHeartbeatSchema>;
