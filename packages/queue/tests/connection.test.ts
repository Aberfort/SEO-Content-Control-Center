import { describe, expect, it } from "vitest";

import { resolveQueueRedisUrl } from "../src/connection";

describe("resolveQueueRedisUrl", () => {
  it("prefers a dedicated queue Redis URL over the shared one", () => {
    expect(
      resolveQueueRedisUrl({
        SCCC_QUEUE_REDIS_URL: "redis://queue:6379",
        REDIS_URL: "redis://shared:6379"
      })
    ).toBe("redis://queue:6379");
  });

  it("falls back to REDIS_URL when no dedicated queue Redis URL is set", () => {
    expect(resolveQueueRedisUrl({ REDIS_URL: "redis://shared:6379" })).toBe(
      "redis://shared:6379"
    );
  });

  it("trims whitespace and ignores a blank dedicated URL", () => {
    expect(
      resolveQueueRedisUrl({
        SCCC_QUEUE_REDIS_URL: "   ",
        REDIS_URL: " redis://shared:6379 "
      })
    ).toBe("redis://shared:6379");
  });

  it("returns undefined when neither variable is set", () => {
    expect(resolveQueueRedisUrl({})).toBeUndefined();
  });
});
