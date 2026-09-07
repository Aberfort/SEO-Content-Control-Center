import { Redis } from "ioredis";

export type QueueRedisConnection = Redis;

type QueueRedisEnv = Record<string, string | undefined>;

/**
 * Resolves which Redis URL BullMQ queues/workers should connect to.
 *
 * BullMQ keeps a persistent, constantly-polling connection open (job
 * fetching, stalled-job checks, lock renewal, heartbeats), which racks up a
 * large, steady command volume even with little real job traffic. That is a
 * poor fit for a per-command-billed/limited Redis (e.g. Upstash's free
 * tier), which `REDIS_URL` may also be used for elsewhere (e.g. rate
 * limiting, where the chatter is negligible). `SCCC_QUEUE_REDIS_URL` lets
 * queues point at a separate, flat-rate Redis instance without touching
 * `REDIS_URL`'s other consumers. When unset, this falls back to `REDIS_URL`
 * so existing single-Redis deployments keep working unchanged.
 */
export function resolveQueueRedisUrl(env: QueueRedisEnv = process.env): string | undefined {
  const dedicated = env.SCCC_QUEUE_REDIS_URL?.trim();

  if (dedicated) {
    return dedicated;
  }

  return env.REDIS_URL?.trim() || undefined;
}

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
