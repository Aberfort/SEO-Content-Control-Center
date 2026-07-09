import { beforeEach, describe, expect, it } from "vitest";

import {
  assertRateLimit,
  checkRateLimit,
  createRedisRateLimitStore,
  rateLimitKeyFromHeaders,
  RateLimitError,
  resetRateLimitStore,
  type RedisEvalClient
} from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests inside the fixed window limit", async () => {
    await expect(checkRateLimit("auth-register", "ip:email", 1000)).resolves.toMatchObject({
      allowed: true,
      remaining: 4
    });
  });

  it("blocks requests after the policy limit", async () => {
    for (let index = 0; index < 5; index += 1) {
      await assertRateLimit("auth-register", "ip:email", 1000);
    }

    await expect(assertRateLimit("auth-register", "ip:email", 1000)).rejects.toThrow(
      RateLimitError
    );
  });

  it("rate limits password reset requests independently", async () => {
    for (let index = 0; index < 5; index += 1) {
      await assertRateLimit("auth-password-reset", "ip:email", 1000);
    }

    await expect(assertRateLimit("auth-password-reset", "ip:email", 1000)).rejects.toThrow(
      RateLimitError
    );
    await expect(checkRateLimit("auth-login", "ip:email", 1000)).resolves.toMatchObject({
      allowed: true,
      remaining: 9
    });
  });

  it("rate limits bulk operation mutations independently", async () => {
    for (let index = 0; index < 120; index += 1) {
      await assertRateLimit("bulk-operation", "ip:user:org:site:start:operation", 1000);
    }

    await expect(
      assertRateLimit("bulk-operation", "ip:user:org:site:start:operation", 1000)
    ).rejects.toThrow(RateLimitError);
    await expect(
      checkRateLimit("bulk-operation", "ip:user:org:site:confirm:operation", 1000)
    ).resolves.toMatchObject({
      allowed: true,
      remaining: 119
    });
  });

  it("rate limits plugin challenge exchanges after the policy limit", async () => {
    for (let index = 0; index < 10; index += 1) {
      await assertRateLimit("plugin-exchange", "ip:global", 1000);
    }

    await expect(assertRateLimit("plugin-exchange", "ip:global", 1000)).rejects.toThrow(
      RateLimitError
    );
  });

  it("rate limits plugin sync batches independently of disconnects", async () => {
    for (let index = 0; index < 120; index += 1) {
      await assertRateLimit("plugin-sync", "ip:global", 1000);
    }

    await expect(assertRateLimit("plugin-sync", "ip:global", 1000)).rejects.toThrow(RateLimitError);
    await expect(checkRateLimit("plugin-disconnect", "ip:global", 1000)).resolves.toMatchObject({
      allowed: true,
      remaining: 9
    });
  });

  it("rate limits billing webhook deliveries after the policy limit", async () => {
    for (let index = 0; index < 300; index += 1) {
      await assertRateLimit("billing-webhook", "ip:global", 1000);
    }

    await expect(assertRateLimit("billing-webhook", "ip:global", 1000)).rejects.toThrow(
      RateLimitError
    );
  });

  it("resets fixed windows after the window expires", async () => {
    for (let index = 0; index < 5; index += 1) {
      await assertRateLimit("auth-register", "ip:email", 1000);
    }

    await expect(
      checkRateLimit("auth-register", "ip:email", 1000 + 1000 * 60 * 60 + 1)
    ).resolves.toMatchObject({
      allowed: true,
      remaining: 4
    });
  });

  it("builds keys from forwarded client IP and discriminator", () => {
    const headers = new Headers({
      "x-forwarded-for": "203.0.113.10, 10.0.0.1"
    });

    expect(rateLimitKeyFromHeaders(headers, "USER@EXAMPLE.COM")).toBe(
      "203.0.113.10:user@example.com"
    );
  });
});

describe("redis rate limit store", () => {
  it("increments namespaced fixed-window buckets through the redis client", async () => {
    const calls: Array<{ script: string; numKeys: number; args: Array<string | number> }> = [];
    const counters = new Map<string, number>();
    const client: RedisEvalClient = {
      eval(script, numKeys, ...args) {
        calls.push({ script, numKeys, args });
        const key = String(args[0]);
        const next = (counters.get(key) ?? 0) + 1;
        counters.set(key, next);
        return Promise.resolve([next, 900000]);
      }
    };
    const store = createRedisRateLimitStore(client);

    await expect(store.increment("auth-login:ip:email", 900000, 1000)).resolves.toEqual({
      count: 1,
      resetAt: 901000
    });
    await expect(store.increment("auth-login:ip:email", 900000, 1000)).resolves.toEqual({
      count: 2,
      resetAt: 901000
    });
    expect(calls[0]?.args[0]).toBe("sccc:rate:auth-login:ip:email");
    expect(calls[0]?.args[1]).toBe(900000);
    expect(calls[0]?.numKeys).toBe(1);
  });

  it("falls back to the window size when redis reports no ttl", async () => {
    const client: RedisEvalClient = {
      eval() {
        return Promise.resolve([1, -1]);
      }
    };
    const store = createRedisRateLimitStore(client);

    await expect(store.increment("plugin-sync:ip:global", 60000, 5000)).resolves.toEqual({
      count: 1,
      resetAt: 65000
    });
  });

  it("rejects malformed redis results", async () => {
    const client: RedisEvalClient = {
      eval() {
        return Promise.resolve("nonsense");
      }
    };
    const store = createRedisRateLimitStore(client);

    await expect(store.increment("plugin-sync:ip:global", 60000, 5000)).rejects.toThrow(
      "RATE_LIMIT_REDIS_RESULT_INVALID"
    );
  });
});
