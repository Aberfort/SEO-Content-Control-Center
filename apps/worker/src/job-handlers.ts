import { maintenancePingJobDataSchema, tenantJobDataSchema } from "@sccc/queue";

export type WorkerJob = {
  id: string | undefined;
  name: string;
  data: unknown;
};

export type JobHandler = (job: WorkerJob) => Promise<unknown>;

export type JobHandlerRegistry = {
  register(jobName: string, handler: JobHandler): void;
  resolve(jobName: string): JobHandler;
  registeredJobNames(): string[];
};

export function createJobHandlerRegistry(): JobHandlerRegistry {
  const handlers = new Map<string, JobHandler>();

  return {
    register(jobName, handler) {
      const normalized = jobName.trim();

      if (!normalized) {
        throw new Error("JOB_NAME_REQUIRED");
      }

      if (handlers.has(normalized)) {
        throw new Error("JOB_HANDLER_DUPLICATE");
      }

      handlers.set(normalized, handler);
    },
    resolve(jobName) {
      const handler = handlers.get(jobName);

      if (!handler) {
        throw new Error("JOB_HANDLER_NOT_FOUND");
      }

      return handler;
    },
    registeredJobNames() {
      return [...handlers.keys()].sort();
    }
  };
}

/**
 * Wraps a handler so tenant-scoped payloads are validated before any work
 * happens. Jobs without organization/site scope fail fast instead of running
 * with missing tenant context.
 */
export function withTenantScope(handler: JobHandler): JobHandler {
  return async (job) => {
    tenantJobDataSchema.parse(job.data);
    return handler(job);
  };
}

export function createMaintenancePingHandler(): JobHandler {
  return async (job) => {
    const data = maintenancePingJobDataSchema.parse(job.data ?? {});

    return {
      pong: true,
      requestedBy: data.requestedBy,
      echo: data.echo ?? null,
      respondedAt: new Date().toISOString()
    };
  };
}
