import { beforeEach, describe, expect, it } from "vitest";

import {
  assertRateLimit,
  checkRateLimit,
  rateLimitKeyFromHeaders,
  RateLimitError,
  resetRateLimitStore
} from "./rate-limit";

describe("rate limit", () => {
  beforeEach(() => {
    resetRateLimitStore();
  });

  it("allows requests inside the fixed window limit", () => {
    expect(checkRateLimit("auth-register", "ip:email", 1000)).toMatchObject({
      allowed: true,
      remaining: 4
    });
  });

  it("blocks requests after the policy limit", () => {
    for (let index = 0; index < 5; index += 1) {
      assertRateLimit("auth-register", "ip:email", 1000);
    }

    expect(() => assertRateLimit("auth-register", "ip:email", 1000)).toThrow(RateLimitError);
  });

  it("rate limits password reset requests independently", () => {
    for (let index = 0; index < 5; index += 1) {
      assertRateLimit("auth-password-reset", "ip:email", 1000);
    }

    expect(() => assertRateLimit("auth-password-reset", "ip:email", 1000)).toThrow(RateLimitError);
    expect(checkRateLimit("auth-login", "ip:email", 1000)).toMatchObject({
      allowed: true,
      remaining: 9
    });
  });

  it("rate limits bulk operation mutations independently", () => {
    for (let index = 0; index < 120; index += 1) {
      assertRateLimit("bulk-operation", "ip:user:org:site:start:operation", 1000);
    }

    expect(() =>
      assertRateLimit("bulk-operation", "ip:user:org:site:start:operation", 1000)
    ).toThrow(RateLimitError);
    expect(
      checkRateLimit("bulk-operation", "ip:user:org:site:confirm:operation", 1000)
    ).toMatchObject({
      allowed: true,
      remaining: 119
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
