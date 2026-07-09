import {
  buildWorkerHeartbeatKey,
  workerHeartbeatSchema,
  workerHeartbeatTtlSeconds,
  type WorkerHeartbeat
} from "@sccc/queue";

export type HeartbeatRedis = {
  set(key: string, value: string, mode: "EX", ttlSeconds: number): Promise<unknown>;
};

export type HeartbeatCounters = {
  processedJobs: number;
  failedJobs: number;
};

export type HeartbeatRecorder = {
  start(): void;
  stop(): void;
  recordOnce(now?: Date): Promise<WorkerHeartbeat>;
};

type HeartbeatRecorderInput = {
  redis: HeartbeatRedis;
  workerId: string;
  startedAt: Date;
  counters: HeartbeatCounters;
  intervalMs?: number;
  onError?: (error: unknown) => void;
};

export const defaultHeartbeatIntervalMs = 30000;

/**
 * Periodically writes a bounded worker heartbeat into Redis with a TTL so
 * monitoring can detect stalled or dead workers when the key expires.
 */
export function createHeartbeatRecorder(input: HeartbeatRecorderInput): HeartbeatRecorder {
  const intervalMs = input.intervalMs ?? defaultHeartbeatIntervalMs;
  const key = buildWorkerHeartbeatKey(input.workerId);
  let timer: ReturnType<typeof setInterval> | null = null;

  const recordOnce = async (now = new Date()): Promise<WorkerHeartbeat> => {
    const heartbeat = workerHeartbeatSchema.parse({
      workerId: input.workerId,
      startedAt: input.startedAt.toISOString(),
      recordedAt: now.toISOString(),
      processedJobs: input.counters.processedJobs,
      failedJobs: input.counters.failedJobs
    });

    await input.redis.set(key, JSON.stringify(heartbeat), "EX", workerHeartbeatTtlSeconds);
    return heartbeat;
  };

  return {
    start() {
      if (timer) {
        return;
      }

      timer = setInterval(() => {
        void recordOnce().catch((error) => {
          input.onError?.(error);
        });
      }, intervalMs);
    },
    stop() {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    },
    recordOnce
  };
}
