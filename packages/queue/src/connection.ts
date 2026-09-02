import { Redis } from "ioredis";

export type QueueRedisConnection = Redis;

/**
 * Creates a Redis connection suitable for BullMQ queues and workers.
 * BullMQ requires `maxRetriesPerRequest: null` on blocking connections.
 * Managed Redis providers (e.g. Upstash) reset idle TCP connections, which
 * ioredis otherwise surfaces as a fatal `ECONNRESET` instead of reconnecting;
 * `retryStrategy` and `enableReadyCheck: false` make that reconnect automatic.
 */
export function createQueueRedisConnection(redisUrl: string): QueueRedisConnection {
  const normalized = redisUrl.trim();

  if (!normalized) {
    throw new Error("REDIS_URL_REQUIRED");
  }

  return new Redis(normalized, {
    maxRetriesPerRequest: null,
    enableOfflineQueue: true,
    enableReadyCheck: false,
    retryStrategy: (times) => Math.min(times * 200, 5000)
  });
}
