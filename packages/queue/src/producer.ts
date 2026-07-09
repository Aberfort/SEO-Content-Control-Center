import { Queue } from "bullmq";

import type { QueueRedisConnection } from "./connection";
import { defaultJobOptions, type QueueName } from "./contract";

export type QueueProducer = Queue;

/**
 * Creates a BullMQ queue producer with the shared default job options so
 * every enqueue path gets the same retry and retention behavior.
 */
export function createQueueProducer(
  name: QueueName,
  connection: QueueRedisConnection
): QueueProducer {
  return new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: defaultJobOptions.attempts,
      backoff: {
        type: defaultJobOptions.backoff.type,
        delay: defaultJobOptions.backoff.delay
      },
      removeOnComplete: { count: defaultJobOptions.removeOnComplete },
      removeOnFail: { count: defaultJobOptions.removeOnFail }
    }
  });
}
