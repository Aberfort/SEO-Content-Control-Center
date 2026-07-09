import { Redis } from "ioredis";

export type QueueRedisConnection = Redis;

/**
 * Creates a Redis connection suitable for BullMQ queues and workers.
 * BullMQ requires `maxRetriesPerRequest: null` on blocking connections.
 */
export function createQueueRedisConnection(redisUrl: string): QueueRedisConnection {
  const normalized = redisUrl.trim();

  if (!normalized) {
    throw new Error("REDIS_URL_REQUIRED");
  }

  return new Redis(normalized, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: true
  });
}
