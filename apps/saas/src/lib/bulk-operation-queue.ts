import {
  buildJobId,
  createQueueProducer,
  createQueueRedisConnection,
  jobNames,
  queueNames
} from "@sccc/queue";

export type BulkOperationExecutionEnqueueResult =
  | {
      enqueued: true;
      jobId: string;
    }
  | {
      enqueued: false;
      reason: "redis_not_configured";
    };

export async function enqueueBulkOperationExecutionJob(input: {
  organizationId: string;
  siteId: string;
  operationId: string;
  env?: NodeJS.ProcessEnv;
}): Promise<BulkOperationExecutionEnqueueResult> {
  const redisUrl = input.env?.REDIS_URL?.trim() ?? process.env.REDIS_URL?.trim();

  if (!redisUrl) {
    return {
      enqueued: false,
      reason: "redis_not_configured"
    };
  }

  const connection = createQueueRedisConnection(redisUrl);
  const queue = createQueueProducer(queueNames.bulkOperations, connection);
  const jobId = buildJobId([
    "bulk-operation",
    "execute",
    input.organizationId,
    input.siteId,
    input.operationId
  ]);

  let enqueueError: unknown;

  try {
    await queue.add(
      jobNames.bulkOperationExecute,
      {
        organizationId: input.organizationId,
        siteId: input.siteId,
        operationId: input.operationId
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
