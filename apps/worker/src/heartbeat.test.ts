import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createHeartbeatRecorder } from "./heartbeat";

type RecordedSet = {
  key: string;
  value: string;
  mode: string;
  ttlSeconds: number;
};

function createFakeRedis(shouldFail = false) {
  const sets: RecordedSet[] = [];

  return {
    sets,
    set(key: string, value: string, mode: "EX", ttlSeconds: number) {
      if (shouldFail) {
        return Promise.reject(new Error("REDIS_DOWN"));
      }

      sets.push({ key, value, mode, ttlSeconds });
      return Promise.resolve("OK");
    }
  };
}

describe("worker heartbeat", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("writes namespaced heartbeats with a ttl", async () => {
    const redis = createFakeRedis();
    const recorder = createHeartbeatRecorder({
      redis,
      workerId: "host:42",
      startedAt: new Date("2026-07-09T10:00:00.000Z"),
      counters: { processedJobs: 2, failedJobs: 1 }
    });

    const heartbeat = await recorder.recordOnce(new Date("2026-07-09T10:00:30.000Z"));

    expect(heartbeat).toMatchObject({
      workerId: "host:42",
      processedJobs: 2,
      failedJobs: 1
    });
    expect(redis.sets).toHaveLength(1);
    expect(redis.sets[0]?.key).toBe("sccc:worker:heartbeat:host:42");
    expect(redis.sets[0]?.mode).toBe("EX");
    expect(redis.sets[0]?.ttlSeconds).toBe(90);
    expect(JSON.parse(redis.sets[0]?.value ?? "{}")).toMatchObject({
      recordedAt: "2026-07-09T10:00:30.000Z"
    });
  });

  it("records heartbeats on the configured interval until stopped", async () => {
    const redis = createFakeRedis();
    const recorder = createHeartbeatRecorder({
      redis,
      workerId: "host:42",
      startedAt: new Date(),
      counters: { processedJobs: 0, failedJobs: 0 },
      intervalMs: 1000
    });

    recorder.start();
    await vi.advanceTimersByTimeAsync(3000);
    recorder.stop();
    await vi.advanceTimersByTimeAsync(3000);

    expect(redis.sets).toHaveLength(3);
  });

  it("reports heartbeat write failures without throwing", async () => {
    const failures: unknown[] = [];
    const recorder = createHeartbeatRecorder({
      redis: createFakeRedis(true),
      workerId: "host:42",
      startedAt: new Date(),
      counters: { processedJobs: 0, failedJobs: 0 },
      intervalMs: 1000,
      onError: (error) => {
        failures.push(error);
      }
    });

    recorder.start();
    await vi.advanceTimersByTimeAsync(2000);
    recorder.stop();

    expect(failures).toHaveLength(2);
  });
});
