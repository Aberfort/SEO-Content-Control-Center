import {
  buildJobId,
  createQueueProducer,
  createQueueRedisConnection,
  jobNames,
  queueNames
} from "@sccc/queue";

export type MonitoringSnapshotEnqueueResult =
  | {
      enqueued: true;
      jobId: string;
    }
  | {
      enqueued: false;
      reason: "redis_not_configured";
    };

type Environment = Record<string, string | undefined>;

export async function enqueueMonitoringCreateSnapshotJob(input: {
  organizationId: string;
  siteId: string;
  monitoredUrlId: string;
  env?: Environment;
}): Promise<MonitoringSnapshotEnqueueResult> {
  const redisUrl = input.env?.REDIS_URL?.trim() ?? process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    return {
      enqueued: false,
      reason: "redis_not_configured"
    };
  }

  const connection = createQueueRedisConnection(redisUrl);
  const queue = createQueueProducer(queueNames.monitoring, connection);
  const jobId = buildJobId([
    "monitoring",
    "create-snapshot",
    input.organizationId,
    input.siteId,
    input.monitoredUrlId,
    Date.now()
  ]);

  let enqueueError: unknown;

  try {
    await queue.add(
      jobNames.monitoringCreateSnapshot,
      {
        organizationId: input.organizationId,
        siteId: input.siteId,
        monitoredUrlId: input.monitoredUrlId
      },
      {
        jobId
      }
    );
  } catch (error) {
    enqueueError = error;
  }

  await Promise.allSettled([queue.close(), connection.quit()]);

  if (enqueueError) {
    throw enqueueError;
  }

  return {
    enqueued: true,
    jobId
  };
}
